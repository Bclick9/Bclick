[CmdletBinding()]
param(
  [string]$PostgresImage = 'postgres:18.6-alpine',
  [switch]$KeepDockerResourcesOnFailure
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:RunId = '{0}-{1}' -f (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'), ([Guid]::NewGuid().ToString('N').Substring(0, 8))
$script:DbUser = 'q011_drill'
$script:DbName = 'bclick_q011'
$script:Source = "bclick-q011-source-$($script:RunId)"
$script:Restore = "bclick-q011-restore-$($script:RunId)"
$script:SourceVol = "bclick-q011-src-$($script:RunId)"
$script:RestoreVol = "bclick-q011-restore-$($script:RunId)"
$script:WalVol = "bclick-q011-wal-$($script:RunId)"
$script:BackupVol = "bclick-q011-backup-$($script:RunId)"
$script:AllVolumes = @($script:SourceVol, $script:RestoreVol, $script:WalVol, $script:BackupVol)
$script:CreatedVolumes = @()
$script:CreatedContainers = @()
$script:Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$script:ArtifactRoot = Join-Path $script:Root ('.local/q011-restore-drill/' + $script:RunId)
$script:BaseOut = Join-Path $script:ArtifactRoot 'basebackup'
$script:WalOut = Join-Path $script:ArtifactRoot 'wal-archive'
$script:EvidencePath = Join-Path $script:ArtifactRoot 'evidence.json'
$script:Checks = New-Object 'System.Collections.Generic.List[object]'
$script:Stage = 'preflight'
$script:StartedAt = (Get-Date).ToUniversalTime()
$script:DbPassword = $null
$script:ImageId = $null
$script:SourcePort = $null
$script:MigrationCount = $null
$script:LatestMigration = $null
$script:BackupStarted = $null
$script:BackupCompleted = $null
$script:RestoreStarted = $null
$script:RestoreCompleted = $null
$script:SimulatedRpoSeconds = $null
$script:LocalRtoSeconds = $null
$script:Markers = $null
$script:JournalCount = $null
$script:EntryCount = $null
$script:UnbalancedGroups = $null
$script:ProjectionMismatches = $null
$script:MissingProjections = $null
$script:Precision = $null
$script:BaseManifest = $null
$script:WalManifest = $null
$script:Failure = $null
$script:Passed = $false
$script:Exported = $false
$script:Promoted = $false

function Say([string]$Message) {
  Write-Host ('[{0:u}] {1}' -f (Get-Date).ToUniversalTime(), $Message)
}

function Invoke-DockerCmd([string[]]$DockerArguments, [switch]$AllowFailure) {
  $raw = & docker @DockerArguments 2>&1
  $code = $LASTEXITCODE
  $out = ($raw | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
  if ($code -ne 0 -and -not $AllowFailure) {
    $out = $out -replace '(?i)postgres(?:ql)?://\S+', '[DATABASE_URL_REDACTED]'
    throw ("Docker command failed (exit {0}): {1}{2}{3}" -f $code, $DockerArguments[0], [Environment]::NewLine, $out)
  }
  return $out.Trim()
}

function DbSql([string]$Container, [string]$Sql, [switch]$Quiet) {
  $a = @('exec', '--env', ("PGPASSWORD=" + $script:DbPassword), $Container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', $script:DbUser, '-d', $script:DbName)
  if ($Quiet) { $a += @('-q', '-t', '-A') }
  $a += @('-c', $Sql)
  return Invoke-DockerCmd $a
}

function Scalar([string]$Container, [string]$Sql) {
  return (DbSql $Container $Sql -Quiet).Trim()
}

function Assert-Pass([string]$Name, [bool]$Passed, [string]$Detail) {
  $script:Checks.Add([ordered]@{ name = $Name; passed = $Passed; detail = $Detail }) | Out-Null
  if (-not $Passed) { throw ("Check failed: {0}. {1}" -f $Name, $Detail) }
  Write-Host ("PASS: " + $Name)
}

function Wait-Ready([string]$Container) {
  for ($i = 0; $i -lt 90; $i++) {
    $null = & docker exec $Container pg_isready -U $script:DbUser -d $script:DbName 2>$null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  $logs = Invoke-DockerCmd @('logs', '--tail', '50', $Container) -AllowFailure
  throw ("PostgreSQL did not become ready. Sanitized logs: " + $logs)
}

function Export-Volume([string]$Volume, [string]$Destination, [string]$Subdirectory = '.') {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  $copyFrom = if ($Subdirectory -eq 'base') { '/source/base/.' } else { '/source/.' }
  $sourceCheck = if ($Subdirectory -eq 'base') { 'test -d /source/base' } else { 'test -d /source' }
  $exportScript = 'set -eu; ' + $sourceCheck + '; cp -R ' + $copyFrom + ' /out/; chmod -R a+rX /out; test -d /out'
  $null = Invoke-DockerCmd @(
    'run', '--rm', '--user', '0',
    '--mount', ("type=volume,source=" + $Volume + ",target=/source,readonly"),
    '--mount', ("type=bind,source=" + $Destination + ",target=/out"),
    '--entrypoint', 'sh', $PostgresImage, '-ec', $exportScript
  )
}

function File-Manifest([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    return [ordered]@{ fileCount = 0; bytes = 0; manifestSha256 = $null }
  }
  $files = @(Get-ChildItem -LiteralPath $Path -File -Recurse | Where-Object { $_.Name -ne 'checksums.sha256' } | Sort-Object FullName)
  $rows = New-Object 'System.Collections.Generic.List[string]'
  [long]$total = 0
  foreach ($f in $files) {
    $hash = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $rel = $f.FullName.Substring($Path.TrimEnd('\','/').Length).TrimStart('\','/').Replace('\','/')
    $rows.Add(("{0}|{1}|{2}" -f $rel, $f.Length, $hash)) | Out-Null
    $total += $f.Length
  }
  $joined = [string]::Join([Environment]::NewLine, $rows.ToArray())
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $sum = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($joined)))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
  $manifestName = (Split-Path -Leaf $Path) + '.checksums.sha256'
  $manifestPath = Join-Path (Split-Path -Parent $Path) $manifestName
  $rows | Set-Content -LiteralPath $manifestPath -Encoding ASCII
  return [ordered]@{ fileCount = $files.Count; bytes = $total; manifestSha256 = $sum }
}

function Export-Artifacts {
  if ($script:Exported) { return }
  if ($script:CreatedContainers -contains $script:Source) {
    $null = & docker exec $script:Source sh -ec 'test -f /q011-backup/base/backup_manifest' 2>$null
    if ($LASTEXITCODE -eq 0) { Export-Volume $script:BackupVol $script:BaseOut 'base' }
    $null = & docker exec $script:Source sh -ec 'test -d /q011-wal' 2>$null
    if ($LASTEXITCODE -eq 0) { Export-Volume $script:WalVol $script:WalOut }
  }
  $script:Exported = $true
}

function Cleanup([bool]$Keep) {
  if ($Keep) { Say 'Keeping disposable Docker resources after failure because -KeepDockerResourcesOnFailure was supplied.'; return }
  foreach ($c in $script:CreatedContainers) { $null = Invoke-DockerCmd @('rm', '--force', $c) -AllowFailure }
  foreach ($v in $script:CreatedVolumes) { $null = Invoke-DockerCmd @('volume', 'rm', '--force', $v) -AllowFailure }
}

function UtcText($Value) {
  if ($null -eq $Value) { return $null }
  if ($Value -is [DateTime]) { return $Value.ToUniversalTime().ToString('o') }
  return [string]$Value
}

try {
  $script:Stage = 'preflight'
  Say "Starting disposable local PITR rehearsal $($script:RunId)."
  New-Item -ItemType Directory -Force -Path $script:ArtifactRoot | Out-Null
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker CLI is not installed or is not on PATH.' }
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'pnpm is not installed or is not on PATH.' }
  if (-not (Test-Path -LiteralPath (Join-Path $script:Root 'pnpm-lock.yaml'))) { throw 'Repository pnpm-lock.yaml is missing.' }
  $null = Invoke-DockerCmd @('info', '--format', '{{.ServerVersion}}')
  $null = Invoke-DockerCmd @('image', 'pull', $PostgresImage)
  $script:ImageId = Invoke-DockerCmd @('image', 'inspect', '--format', '{{.Id}}', $PostgresImage)
  New-Item -ItemType Directory -Force -Path $script:ArtifactRoot | Out-Null

  foreach ($v in $script:AllVolumes) {
    $null = Invoke-DockerCmd @('volume', 'create', $v)
    $script:CreatedVolumes += $v
  }
  $script:Stage = 'prepare-volumes'
  $null = Invoke-DockerCmd @(
    'run', '--rm', '--user', '0',
    '--mount', ("type=volume,source=" + $script:WalVol + ",target=/wal"),
    '--mount', ("type=volume,source=" + $script:BackupVol + ",target=/backup"),
    '--entrypoint', 'sh', $PostgresImage, '-ec', 'chown -R postgres:postgres /wal /backup'
  )

  $randomBytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
  $script:DbPassword = ([BitConverter]::ToString($randomBytes)).Replace('-', '').ToLowerInvariant()
  [Array]::Clear($randomBytes, 0, $randomBytes.Length)

  $script:Stage = 'start-source'
  Say 'Starting disposable PostgreSQL with archive_mode on and loopback-only port publication.'
  $null = Invoke-DockerCmd @(
    'run', '--detach', '--name', $script:Source,
    '--env', ("POSTGRES_USER=" + $script:DbUser),
    '--env', ("POSTGRES_PASSWORD=" + $script:DbPassword),
    '--env', ("POSTGRES_DB=" + $script:DbName),
    '--publish', '127.0.0.1::5432',
    '--mount', ("type=volume,source=" + $script:SourceVol + ",target=/var/lib/postgresql"),
    '--mount', ("type=volume,source=" + $script:WalVol + ",target=/q011-wal"),
    '--mount', ("type=volume,source=" + $script:BackupVol + ",target=/q011-backup"),
    $PostgresImage,
    '-c', 'wal_level=replica',
    '-c', 'archive_mode=on',
    '-c', 'archive_timeout=30s',
    '-c', 'archive_command=test -f /q011-wal/%f || cp %p /q011-wal/%f',
    '-c', 'max_wal_senders=5',
    '-c', 'listen_addresses=*'
  )
  $script:CreatedContainers += $script:Source
  Wait-Ready $script:Source
  $portText = Invoke-DockerCmd @('port', $script:Source, '5432/tcp')
  $m = [regex]::Match($portText, ':(\d+)\s*$')
  if (-not $m.Success) { throw 'Could not determine the random local host port.' }
  $script:SourcePort = [int]$m.Groups[1].Value
  $connectionString = "postgresql://$($script:DbUser):$($script:DbPassword)@127.0.0.1:$($script:SourcePort)/$($script:DbName)"

  $script:Stage = 'apply-migrations'
  Say 'Applying all checked-in migrations to this brand-new disposable database.'
  $oldDbUrl = $env:DATABASE_URL
  try {
    $env:DATABASE_URL = $connectionString
    $cmdOutput = & pnpm --filter @bclick/server migrate:up 2>&1
    if ($LASTEXITCODE -ne 0) {
      $safe = (($cmdOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine) -replace '(?i)postgres(?:ql)?://\S+', '[DATABASE_URL_REDACTED]'
      throw ("Repository migrations failed: " + $safe)
    }
  } finally {
    if ($null -eq $oldDbUrl) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
    else { $env:DATABASE_URL = $oldDbUrl }
  }

  $ms = (Scalar $script:Source "SELECT count(*)::text || '|' || max(name)::text FROM public.pgmigrations;").Split('|')
  if ($ms.Count -ne 2) { throw 'Could not parse current migration inventory.' }
  $script:MigrationCount = [int]$ms[0]
  $script:LatestMigration = $ms[1]
  Assert-Pass 'All 19 checked-in migrations are applied' ($script:MigrationCount -eq 19) ("count=" + $script:MigrationCount + "; latest=" + $script:LatestMigration)
  Assert-Pass 'Latest migration is scope 017' ($script:LatestMigration -eq '1793966400000_casino_display_category_scope_017') $script:LatestMigration

  $script:Stage = 'seed-fixture'
  Say 'Inserting an explicitly disposable balanced TND 2dp ledger journal and PITR markers.'
  $sql = @'
CREATE TABLE public.q011_restore_markers(marker text PRIMARY KEY, inserted_at timestamptz NOT NULL DEFAULT clock_timestamp());
INSERT INTO public.q011_restore_markers(marker) VALUES ('before_basebackup');
DO $q011_fixture$
DECLARE
  payment_account uuid;
  equity_account uuid;
  journal_id uuid;
BEGIN
  SELECT id INTO payment_account FROM public.wallet_accounts
   WHERE owner_type='system' AND account_code='payments' AND account_kind='payment-clearing' AND currency_code='TND';
  SELECT id INTO equity_account FROM public.wallet_accounts
   WHERE owner_type='system' AND account_code='operator-equity' AND account_kind='operator-equity' AND currency_code='TND';
  IF payment_account IS NULL OR equity_account IS NULL OR payment_account=equity_account THEN
    RAISE EXCEPTION 'Q011 fixture requires both TND system accounts';
  END IF;
  INSERT INTO public.journal_transactions(movement_type,source_type,source_id,reference,metadata)
  VALUES ('wallet_adjustment','q011-local-restore-drill','__RUN_ID__','Q011 local disposable PITR fixture',
          jsonb_build_object('purpose','local_restore_drill_fixture','runId','__RUN_ID__'))
  RETURNING id INTO journal_id;
  INSERT INTO public.ledger_entries(journal_id,wallet_account_id,currency_code,amount_minor,entry_sequence)
  VALUES (journal_id,payment_account,'TND',1234,1),(journal_id,equity_account,'TND',-1234,2);
END
$q011_fixture$;
'@
  $sql = $sql.Replace('__RUN_ID__', $script:RunId)
  $null = DbSql $script:Source $sql
  $jid = Scalar $script:Source ("SELECT id::text FROM public.journal_transactions WHERE source_type='q011-local-restore-drill' AND source_id='" + $script:RunId + "';")
  Assert-Pass 'Disposable balanced TND ledger journal exists before backup' (-not [string]::IsNullOrWhiteSpace($jid)) ("journalId=" + $jid)

  $sourceUnbalanced = [int](Scalar $script:Source "SELECT count(*) FROM (SELECT jt.id, le.currency_code, count(le.id) AS n, sum(le.amount_minor) AS total FROM public.journal_transactions jt LEFT JOIN public.ledger_entries le ON le.journal_id=jt.id GROUP BY jt.id,le.currency_code HAVING count(le.id)<2 OR (le.currency_code IS NOT NULL AND sum(le.amount_minor)<>0)) x;")
  $sourceProjectionMismatch = [int](Scalar $script:Source "SELECT count(*) FROM public.wallet_accounts wa JOIN public.account_balances ab ON ab.wallet_account_id=wa.id LEFT JOIN LATERAL (SELECT COALESCE(sum(le.amount_minor),0)::bigint AS balance, count(le.id)::bigint AS n FROM public.ledger_entries le WHERE le.wallet_account_id=wa.id AND le.currency_code=wa.currency_code) l ON true WHERE ab.balance_minor<>l.balance OR ab.ledger_sequence<>l.n;")
  Assert-Pass 'Source journals balance per currency' ($sourceUnbalanced -eq 0) ("unbalancedGroups=" + $sourceUnbalanced)
  Assert-Pass 'Source account balance projection matches ledger entries' ($sourceProjectionMismatch -eq 0) ("mismatches=" + $sourceProjectionMismatch)

  $script:Stage = 'basebackup'
  Say 'Taking physical pg_basebackup with streamed WAL and validating it with pg_verifybackup.'
  $script:BackupStarted = (Get-Date).ToUniversalTime()
  $null = Invoke-DockerCmd @('exec', $script:Source, 'sh', '-ec', 'mkdir -p /q011-backup/base && test -z "$(ls -A /q011-backup/base)"')
  $null = Invoke-DockerCmd @('exec', '--env', ("PGPASSWORD=" + $script:DbPassword), $script:Source, 'pg_basebackup', '-h', '127.0.0.1', '-U', $script:DbUser, '-D', '/q011-backup/base', '-Fp', '-Xs', '-P', '--checkpoint=fast')
  $script:BackupCompleted = (Get-Date).ToUniversalTime()
  $null = Invoke-DockerCmd @('exec', $script:Source, 'pg_verifybackup', '/q011-backup/base')
  Assert-Pass 'pg_basebackup manifest passed pg_verifybackup' $true 'pg_verifybackup exited with code zero.'

  $script:Stage = 'archive-target'
  Say 'Creating a named recovery point, a marker after it, and forcing WAL archiving.'
  $previousWal = Scalar $script:Source "SELECT COALESCE(last_archived_wal,'') FROM pg_stat_archiver;"
  $targetText = Scalar $script:Source "INSERT INTO public.q011_restore_markers(marker) VALUES ('recovery_target') RETURNING extract(epoch FROM inserted_at)::text;"
  $null = Scalar $script:Source "SELECT pg_create_restore_point('q011_local_before_incident')::text;"
  $incidentText = Scalar $script:Source "INSERT INTO public.q011_restore_markers(marker) VALUES ('after_recovery_target') RETURNING extract(epoch FROM inserted_at)::text;"
  $targetEpoch = [double]$targetText
  $incidentEpoch = [double]$incidentText
  $null = Scalar $script:Source 'SELECT pg_switch_wal()::text;'
  $archivedWal = ''
  for ($i = 0; $i -lt 120; $i++) {
    $latest = Scalar $script:Source "SELECT COALESCE(last_archived_wal,'') FROM pg_stat_archiver;"
    if ($latest -and $latest -ne $previousWal) {
      $null = & docker exec $script:Source sh -ec ("test -s /q011-wal/" + $latest) 2>$null
      if ($LASTEXITCODE -eq 0) { $archivedWal = $latest; break }
    }
    Start-Sleep -Seconds 2
  }
  Assert-Pass 'WAL archive advanced after WAL segment switch' (-not [string]::IsNullOrWhiteSpace($archivedWal)) ("lastArchivedWal=" + $archivedWal)
  $script:SimulatedRpoSeconds = [Math]::Round(($incidentEpoch - $targetEpoch), 3)
  Assert-Pass 'Simulated local PITR window is within 15 minutes' ($script:SimulatedRpoSeconds -ge 0 -and $script:SimulatedRpoSeconds -le 900) ("seconds=" + $script:SimulatedRpoSeconds + "; simulated marker interval only, not live archive freshness.")

  $script:Stage = 'restore'
  Say 'Preparing a separate data volume and restoring to the named WAL recovery point.'
  $script:RestoreStarted = (Get-Date).ToUniversalTime()
  $watch = [Diagnostics.Stopwatch]::StartNew()
  $dataDir = Scalar $script:Source 'SHOW data_directory;'
  $prefix = '/var/lib/postgresql/'
  if (-not $dataDir.StartsWith($prefix, [StringComparison]::Ordinal)) { throw ("Unexpected data directory in pinned image: " + $dataDir) }
  $relativeDir = $dataDir.Substring($prefix.Length).Trim('/')
  if ([string]::IsNullOrWhiteSpace($relativeDir)) { throw 'Expected versioned data directory under /var/lib/postgresql.' }
  $restoreDir = '/restore-root/' + $relativeDir
  $prepare = @'
set -eu
mkdir -p "__RESTORE_DIR__"
cp -a /q011-backup/base/. "__RESTORE_DIR__/"
cat >> "__RESTORE_DIR__/postgresql.auto.conf" <<'Q011_RECOVERY'
restore_command = 'cp /q011-wal/%f %p'
recovery_target_name = 'q011_local_before_incident'
recovery_target_action = 'promote'
recovery_target_timeline = 'latest'
Q011_RECOVERY
touch "__RESTORE_DIR__/recovery.signal"
chown -R postgres:postgres /restore-root
'@
  $prepare = $prepare.Replace('__RESTORE_DIR__', $restoreDir)
  $null = Invoke-DockerCmd @(
    'run', '--rm', '--user', '0',
    '--mount', ("type=volume,source=" + $script:BackupVol + ",target=/q011-backup,readonly"),
    '--mount', ("type=volume,source=" + $script:WalVol + ",target=/q011-wal,readonly"),
    '--mount', ("type=volume,source=" + $script:RestoreVol + ",target=/restore-root"),
    '--entrypoint', 'sh', $PostgresImage, '-ec', $prepare
  )
  $null = Invoke-DockerCmd @(
    'run', '--detach', '--name', $script:Restore,
    '--mount', ("type=volume,source=" + $script:RestoreVol + ",target=/var/lib/postgresql"),
    '--mount', ("type=volume,source=" + $script:WalVol + ",target=/q011-wal,readonly"),
    $PostgresImage
  )
  $script:CreatedContainers += $script:Restore
  Wait-Ready $script:Restore

  $promoted = $false
  for ($i = 0; $i -lt 90; $i++) {
    $state = Scalar $script:Restore "SELECT CASE WHEN pg_is_in_recovery() THEN 'recovering' ELSE 'promoted' END;"
    if ($state -eq 'promoted') { $promoted = $true; break }
    Start-Sleep -Seconds 2
  }
  $script:Promoted = $promoted
  Assert-Pass 'Restored server completed named-point recovery and promoted' $promoted ("pg_is_in_recovery=" + (-not $promoted))

  $script:Stage = 'validate-restored-data'
  Say 'Rechecking the migration version, target markers, double-entry balances, projections and precision.'
  $script:Markers = Scalar $script:Restore "SELECT COALESCE(string_agg(marker, ',' ORDER BY marker),'') FROM public.q011_restore_markers;"
  Assert-Pass 'Restore contains pre-backup and target markers' (($script:Markers -like '*before_basebackup*') -and ($script:Markers -like '*recovery_target*')) $script:Markers
  Assert-Pass 'Restore excludes the post-target transaction' ($script:Markers -notlike '*after_recovery_target*') $script:Markers

  $restoredMigrations = (Scalar $script:Restore "SELECT count(*)::text || '|' || max(name)::text FROM public.pgmigrations;").Split('|')
  $restoreMigrationCount = if ($restoredMigrations.Count -eq 2) { [int]$restoredMigrations[0] } else { -1 }
  $restoreLatest = if ($restoredMigrations.Count -eq 2) { $restoredMigrations[1] } else { '' }
  Assert-Pass 'Restored migration inventory is complete' (($restoreMigrationCount -eq 19) -and ($restoreLatest -eq '1793966400000_casino_display_category_scope_017')) ("count=" + $restoreMigrationCount + "; latest=" + $restoreLatest)

  $script:JournalCount = [int](Scalar $script:Restore 'SELECT count(*) FROM public.journal_transactions;')
  $script:EntryCount = [int](Scalar $script:Restore 'SELECT count(*) FROM public.ledger_entries;')
  $script:UnbalancedGroups = [int](Scalar $script:Restore "SELECT count(*) FROM (SELECT jt.id,le.currency_code,count(le.id) AS n,sum(le.amount_minor) AS total FROM public.journal_transactions jt LEFT JOIN public.ledger_entries le ON le.journal_id=jt.id GROUP BY jt.id,le.currency_code HAVING count(le.id)<2 OR (le.currency_code IS NOT NULL AND sum(le.amount_minor)<>0)) x;")
  $script:ProjectionMismatches = [int](Scalar $script:Restore "SELECT count(*) FROM public.wallet_accounts wa JOIN public.account_balances ab ON ab.wallet_account_id=wa.id LEFT JOIN LATERAL (SELECT COALESCE(sum(le.amount_minor),0)::bigint AS balance,count(le.id)::bigint AS n FROM public.ledger_entries le WHERE le.wallet_account_id=wa.id AND le.currency_code=wa.currency_code) l ON true WHERE ab.balance_minor<>l.balance OR ab.ledger_sequence<>l.n;")
  $script:MissingProjections = [int](Scalar $script:Restore 'SELECT count(*) FROM public.wallet_accounts wa LEFT JOIN public.account_balances ab ON ab.wallet_account_id=wa.id WHERE ab.wallet_account_id IS NULL;')
  $script:Precision = Scalar $script:Restore "SELECT string_agg(code || ':' || decimal_places::text, ',' ORDER BY code) FROM public.currencies WHERE code IN ('TND','EUR','USD');"
  $fixtureCount = [int](Scalar $script:Restore ("SELECT count(*) FROM public.journal_transactions WHERE source_type='q011-local-restore-drill' AND source_id='" + $script:RunId + "';"))
  Assert-Pass 'Restored copy contains the disposable TND ledger fixture' ($fixtureCount -eq 1) ("fixtureJournals=" + $fixtureCount + "; journals=" + $script:JournalCount + "; entries=" + $script:EntryCount)
  Assert-Pass 'Every journal balances within each currency' ($script:UnbalancedGroups -eq 0) ("unbalancedJournalCurrencyGroups=" + $script:UnbalancedGroups)
  Assert-Pass 'account_balances matches recomputed ledger balances and counts' ($script:ProjectionMismatches -eq 0) ("mismatches=" + $script:ProjectionMismatches)
  Assert-Pass 'Every wallet account has a balance projection' ($script:MissingProjections -eq 0) ("missingProjections=" + $script:MissingProjections)
  Assert-Pass 'Restored currency precision is EUR=2, TND=2, USD=2' ($script:Precision -eq 'EUR:2,TND:2,USD:2') $script:Precision

  $watch.Stop()
  $script:RestoreCompleted = (Get-Date).ToUniversalTime()
  $script:LocalRtoSeconds = [Math]::Round($watch.Elapsed.TotalSeconds, 3)
  Assert-Pass 'Local restore and data validation completed within 8 hours' ($script:LocalRtoSeconds -le 28800) ("seconds=" + $script:LocalRtoSeconds + "; local rehearsal duration, not staging RTO.")

  $script:Stage = 'export-and-checksums'
  Say 'Exporting base backup and archived WAL into the ignored local evidence directory.'
  Export-Artifacts
  $baseSummary = File-Manifest $script:BaseOut
  $walSummary = File-Manifest $script:WalOut
  $script:BaseManifest = $baseSummary
  $script:WalManifest = $walSummary
  Assert-Pass 'Exported base backup has backup_manifest' (Test-Path -LiteralPath (Join-Path $script:BaseOut 'backup_manifest') -PathType Leaf) ("files=" + $baseSummary.fileCount + "; bytes=" + $baseSummary.bytes)
  Assert-Pass 'Exported WAL archive contains files' ($walSummary.fileCount -gt 0) ("files=" + $walSummary.fileCount + "; bytes=" + $walSummary.bytes)
  $script:Passed = $true
  $script:Stage = 'completed'
  Say 'Local PITR rehearsal completed. It does not satisfy Q-011 staging/off-host acceptance.'
} catch {
  $script:Failure = $_.Exception.Message
  $script:Passed = $false
  Write-Host ("FAILED at stage {0}: {1}" -f $script:Stage, $script:Failure) -ForegroundColor Red
} finally {
  try { Export-Artifacts } catch {
    Write-Host ("WARNING: failed to export local backup artifacts: " + $_.Exception.Message) -ForegroundColor Yellow
    if ($null -eq $script:Failure) { $script:Failure = 'Local backup artifact export failed.'; $script:Passed = $false }
  }

  $baseFinal = File-Manifest $script:BaseOut
  $walFinal = File-Manifest $script:WalOut
  $evidence = [ordered]@{
    schemaVersion = 1
    drillId = $script:RunId
    classification = 'LOCAL_DISPOSABLE_REHEARSAL_NOT_Q011_ACCEPTANCE'
    status = if ($script:Passed) { 'LOCAL_REHEARSAL_PASSED' } else { 'LOCAL_REHEARSAL_FAILED_OR_INCOMPLETE' }
    failedStage = if ($script:Passed) { $null } else { $script:Stage }
    failure = $script:Failure
    startedAtUtc = UtcText $script:StartedAt
    finishedAtUtc = UtcText ((Get-Date).ToUniversalTime())
    postgresImage = $PostgresImage
    postgresImageId = $script:ImageId
    migrationCount = $script:MigrationCount
    latestMigration = $script:LatestMigration
    baseBackupStartedAtUtc = UtcText $script:BackupStarted
    baseBackupCompletedAtUtc = UtcText $script:BackupCompleted
    baseBackup = $baseFinal
    walArchive = $walFinal
    recoveryTargetName = 'q011_local_before_incident'
    localSimulatedRpoSeconds = $script:SimulatedRpoSeconds
    restoreStartedAtUtc = UtcText $script:RestoreStarted
    restoreCompletedAtUtc = UtcText $script:RestoreCompleted
    localRestoreAndValidationSeconds = $script:LocalRtoSeconds
    restoredRecoveryPromoted = $script:Promoted
    restoredMarkers = $script:Markers
    restoredJournalCount = $script:JournalCount
    restoredLedgerEntryCount = $script:EntryCount
    unbalancedJournalCurrencyGroups = $script:UnbalancedGroups
    accountBalanceProjectionMismatches = $script:ProjectionMismatches
    missingAccountBalanceProjections = $script:MissingProjections
    restoredCurrencyPrecision = $script:Precision
    checks = @($script:Checks.ToArray())
    q011Acceptance = [ordered]@{
      accepted = $false
      offHostBackupVerified = $false
      independentWalMonitoringVerified = $false
      independentEncryptionKeyRecoveryVerified = $false
      realStagingRestoreVerified = $false
      reason = 'A local Docker rehearsal validates a disposable physical base backup, archived WAL, named-point recovery and ledger reconciliation only. It does not prove off-host durability, alert delivery, encryption-key recovery or staging RPO/RTO.'
    }
    artifactsDirectory = $script:ArtifactRoot
  }
  try {
    $evidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $script:EvidencePath -Encoding UTF8
    Write-Host ("Evidence JSON: " + $script:EvidencePath)
  } catch { Write-Host ("WARNING: evidence JSON write failed: " + $_.Exception.Message) -ForegroundColor Yellow }

  $keep = (-not $script:Passed) -and $KeepDockerResourcesOnFailure.IsPresent
  Cleanup $keep
  if (-not $keep) { Say 'Temporary containers and volumes removed. Local backup, WAL archive and evidence files remain under .local/q011-restore-drill.' }
}

if (-not $script:Passed) {
  Write-Host 'Local restore rehearsal failed or is incomplete. Review the failure stage and evidence.json. Q-011 remains OPEN.' -ForegroundColor Red
  exit 1
}
Write-Host 'Local restore rehearsal passed. Q-011 remains OPEN until approved staging/off-host/monitoring acceptance is evidenced.' -ForegroundColor Green
