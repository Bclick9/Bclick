[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
Set-Location -LiteralPath $repoRoot

$envFile = Join-Path $repoRoot '.env'
$envExample = Join-Path $repoRoot '.env.example'
$composeFile = Join-Path $repoRoot 'infra/compose/compose.yaml'

if (-not (Test-Path -LiteralPath $envExample)) {
    throw 'Cannot find .env.example at the repository root.'
}
if (-not (Test-Path -LiteralPath $composeFile)) {
    throw 'Cannot find infra/compose/compose.yaml.'
}
if (-not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath $envExample -Destination $envFile
    Write-Host 'Created local .env from .env.example.'
}

$script:EnvLines = [System.Collections.Generic.List[string]]::new()
foreach ($line in (Get-Content -LiteralPath $envFile)) {
    [void]$script:EnvLines.Add([string]$line)
}

function ConvertFrom-LocalEnvValue {
    param([string]$RawValue)

    $value = $RawValue.Trim()
    if ($value.Length -ge 2 -and
        (($value.StartsWith('"') -and $value.EndsWith('"')) -or
         ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        return $value.Substring(1, $value.Length - 2)
    }
    return ($value -replace '\s+#.*$', '').Trim()
}

function Get-LocalEnvValue {
    param([string]$Name)

    $pattern = '^\s*(?:export\s+)?' + [regex]::Escape($Name) + '\s*=\s*(.*)$'
    foreach ($line in $script:EnvLines) {
        if ($line -match $pattern) {
            return ConvertFrom-LocalEnvValue -RawValue $Matches[1]
        }
    }
    return ''
}

function Set-LocalEnvValue {
    param([string]$Name, [string]$Value)

    $pattern = '^\s*(?:export\s+)?' + [regex]::Escape($Name) + '\s*='
    $found = $false
    for ($i = 0; $i -lt $script:EnvLines.Count; $i++) {
        if ($script:EnvLines[$i] -match $pattern) {
            $script:EnvLines[$i] = $Name + '=' + $Value
            $found = $true
        }
    }
    if (-not $found) {
        [void]$script:EnvLines.Add($Name + '=' + $Value)
    }
}

function New-LocalHexSecret {
    # Use Node crypto for consistent cryptographic randomness across Windows PowerShell 5.1 and PowerShell 7.
    $value = & node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))'
    $nodeExit = $LASTEXITCODE
    $secret = ([string]($value -join '')).Trim()
    if ($nodeExit -ne 0 -or $secret -notmatch '^[a-fA-F0-9]{64}$') {
        throw 'Node.js could not generate a valid local Identity secret.'
    }
    return $secret.ToLowerInvariant()
}

# Identity must remain restricted to local development while the production gate is open.
$configuredEnvironment = Get-LocalEnvValue -Name 'NODE_ENV'
if ($configuredEnvironment -in @('production', 'staging')) {
    throw 'Refusing to run the local bootstrap while .env declares NODE_ENV=production or staging.'
}
Set-LocalEnvValue -Name 'NODE_ENV' -Value 'development'
Set-LocalEnvValue -Name 'BCLICK_IDENTITY_ENABLED' -Value 'true'

$defaultSettings = [ordered]@{
    BCLICK_PLAYER_ALLOWED_ORIGINS = 'http://localhost:5173'
    BCLICK_ADMIN_ALLOWED_ORIGINS = 'http://localhost:5174'
    BCLICK_LOCAL_MAIL_SINK_PATH = '.local-mail-sink.jsonl'
    BCLICK_TERMS_VERSION = 'local-terms-v1'
    BCLICK_AGE_POLICY_VERSION = 'local-age-policy-v1'
}
foreach ($name in $defaultSettings.Keys) {
    if ([string]::IsNullOrWhiteSpace((Get-LocalEnvValue -Name $name))) {
        Set-LocalEnvValue -Name $name -Value $defaultSettings[$name]
    }
}

# Ensure the exact local frontend/admin origins exist, while preserving additional explicit origins.
foreach ($pair in @(
    @{ Name = 'BCLICK_PLAYER_ALLOWED_ORIGINS'; Origin = 'http://localhost:5173' },
    @{ Name = 'BCLICK_ADMIN_ALLOWED_ORIGINS'; Origin = 'http://localhost:5174' }
)) {
    $currentValue = Get-LocalEnvValue -Name $pair.Name
    $current = @($currentValue -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($current -notcontains $pair.Origin) { $current += $pair.Origin }
    Set-LocalEnvValue -Name $pair.Name -Value (($current | Select-Object -Unique) -join ',')
}

# Permit phone testing through the Vite LAN address without using wildcards.
# Only private IPv4 addresses assigned to active physical adapters are added as exact origins.
$script:MobileOrigins = @()
if (Get-Command Get-NetAdapter -ErrorAction SilentlyContinue) {
    $physicalAdapters = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue |
        Where-Object { $_.Status -eq 'Up' })
    foreach ($adapter in $physicalAdapters) {
        $privateAddresses = @(Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.AddressState -eq 'Preferred' -and
                $_.IPAddress -match '^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$'
            })
        foreach ($address in $privateAddresses) {
            $origin = 'http://' + $address.IPAddress + ':5173'
            $currentValue = Get-LocalEnvValue -Name 'BCLICK_PLAYER_ALLOWED_ORIGINS'
            $current = @($currentValue -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
            if ($current -notcontains $origin) {
                $current += $origin
                Set-LocalEnvValue -Name 'BCLICK_PLAYER_ALLOWED_ORIGINS' -Value (($current | Select-Object -Unique) -join ',')
            }
            if ($script:MobileOrigins -notcontains $origin) {
                $script:MobileOrigins += $origin
            }
        }
    }
}
if ($script:MobileOrigins.Count -gt 0) {
    Write-Host ('Added exact phone-testing origin(s): ' + ($script:MobileOrigins -join ', '))
} else {
    Write-Host 'No private IPv4 address found on an active physical adapter. Add the exact phone origin to BCLICK_PLAYER_ALLOWED_ORIGINS in .env if testing over LAN.'
}

foreach ($name in @(
    'BCLICK_SESSION_HASH_KEY',
    'BCLICK_CSRF_SIGNING_KEY',
    'BCLICK_TOTP_ENCRYPTION_KEY'
)) {
    $current = Get-LocalEnvValue -Name $name
    if ($current -notmatch '^[a-fA-F0-9]{64}$') {
        Set-LocalEnvValue -Name $name -Value (New-LocalHexSecret)
    }
}

$dbPassword = Get-LocalEnvValue -Name 'POSTGRES_PASSWORD'
if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    throw 'POSTGRES_PASSWORD is blank in .env. Restore the password for the existing local database; this script will not reset it or delete its volume.'
}
if ($dbPassword -notmatch '^[A-Za-z0-9._~-]+$') {
    throw 'For Compose DATABASE_URL interpolation, POSTGRES_PASSWORD must use URL-safe characters only (letters, numbers, dot, underscore, tilde, hyphen). The script will not rewrite an existing database password.'
}

$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllLines($envFile, $script:EnvLines.ToArray(), $encoding)

# Validate local prerequisites before changing/running services.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required. Install the repository-supported Node.js 22 runtime first.' }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'pnpm is not available in PATH. Enable Corepack or install the repository-pinned pnpm 10.4.1.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker CLI is not available in PATH.' }
& docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not running or the Docker daemon is unavailable.' }

$script:ComposeBase = @('compose', '--env-file', '.env', '-f', 'infra/compose/compose.yaml')
function Invoke-LocalCompose {
    param([string[]]$ComposeArguments, [string]$FailureMessage)
    $allArguments = $script:ComposeBase + $ComposeArguments
    & docker @allArguments
    $commandExit = $LASTEXITCODE
    if ($commandExit -ne 0) {
        throw ($FailureMessage + ' (exit code ' + $commandExit + '). No containers or volumes were automatically deleted.')
    }
}

Write-Host '[1/3] Validating Docker Compose configuration...'
Invoke-LocalCompose -ComposeArguments @('config', '--quiet') -FailureMessage 'Docker Compose configuration is invalid'
Write-Host '[2/3] Starting local PostgreSQL and applying pending migrations...'
Invoke-LocalCompose -ComposeArguments @('up', '-d', 'postgres') -FailureMessage 'Could not start PostgreSQL'
Invoke-LocalCompose -ComposeArguments @('--profile', 'tools', 'run', '--build', '--rm', 'migrate') -FailureMessage 'Migrations failed; review the database/migration error above before retrying'

# Load non-secret and secret values into this process so pnpm/api inherits them; never print values.
foreach ($line in $script:EnvLines) {
    if ($line -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $name = $Matches[1]
        $value = ConvertFrom-LocalEnvValue -RawValue $Matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

$pgUser = Get-LocalEnvValue -Name 'POSTGRES_USER'
if ([string]::IsNullOrWhiteSpace($pgUser)) { $pgUser = 'bclick_dev' }
$pgDatabase = Get-LocalEnvValue -Name 'POSTGRES_DB'
if ([string]::IsNullOrWhiteSpace($pgDatabase)) { $pgDatabase = 'bclick' }
$pgPort = Get-LocalEnvValue -Name 'POSTGRES_PORT'
if ([string]::IsNullOrWhiteSpace($pgPort)) { $pgPort = '5432' }
$userPart = [uri]::EscapeDataString($pgUser)
$passwordPart = [uri]::EscapeDataString($dbPassword)
$databasePart = [uri]::EscapeDataString($pgDatabase)
$env:DATABASE_URL = "postgresql://${userPart}:${passwordPart}@127.0.0.1:${pgPort}/${databasePart}"
$env:NODE_ENV = 'development'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'

Write-Host '[3/3] Database migrations are complete. Starting the API with local Identity enabled.'
Write-Host 'Keep this terminal open. Start the frontend in a second terminal with: npm run dev'
Write-Host 'The script does not delete containers, volumes, or database data.'
& pnpm api:dev
$apiExitCode = $LASTEXITCODE
if ($apiExitCode -ne 0) { exit $apiExitCode }

            })
        foreach ($address in $privateAddresses) {
            $origin = 'http://' + $address.IPAddress + ':5173'
            $currentValue = Get-LocalEnvValue -Name 'BCLICK_PLAYER_ALLOWED_ORIGINS'
            $current = @($currentValue -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
            if ($current -notcontains $origin) {
                $current += $origin
                Set-LocalEnvValue -Name 'BCLICK_PLAYER_ALLOWED_ORIGINS' -Value (($current | Select-Object -Unique) -join ',')
            }
            if ($script:MobileOrigins -notcontains $origin) {
                $script:MobileOrigins += $origin
            }
        }
    }
}
if ($script:MobileOrigins.Count -gt 0) {
    Write-Host ('Added exact phone-testing origin(s): ' + ($script:MobileOrigins -join ', '))
} else {
    Write-Host 'No private IPv4 address found on an active physical adapter. Add the exact phone origin to BCLICK_PLAYER_ALLOWED_ORIGINS in .env if testing over LAN.'
}

foreach ($name in @(
    'BCLICK_SESSION_HASH_KEY',
    'BCLICK_CSRF_SIGNING_KEY',
    'BCLICK_TOTP_ENCRYPTION_KEY'
)) {
    $current = Get-LocalEnvValue -Name $name
    if ($current -notmatch '^[a-fA-F0-9]{64}$') {
        Set-LocalEnvValue -Name $name -Value (New-LocalHexSecret)
    }
}

$dbPassword = Get-LocalEnvValue -Name 'POSTGRES_PASSWORD'
if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    throw 'POSTGRES_PASSWORD is blank in .env. Restore the password for the existing local database; this script will not reset it or delete its volume.'
}
if ($dbPassword -notmatch '^[A-Za-z0-9._~-]+$') {
    throw 'For Compose DATABASE_URL interpolation, POSTGRES_PASSWORD must use URL-safe characters only (letters, numbers, dot, underscore, tilde, hyphen). The script will not rewrite an existing database password.'
}

$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllLines($envFile, $script:EnvLines.ToArray(), $encoding)

# Validate local prerequisites before changing/running services.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required. Install the repository-supported Node.js 22 runtime first.' }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'pnpm is not available in PATH. Enable Corepack or install the repository-pinned pnpm 10.4.1.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker CLI is not available in PATH.' }
& docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not running or the Docker daemon is unavailable.' }

$script:ComposeBase = @('compose', '--env-file', '.env', '-f', 'infra/compose/compose.yaml')
function Invoke-LocalCompose {
    param([string[]]$ComposeArguments, [string]$FailureMessage)
    $allArguments = $script:ComposeBase + $ComposeArguments
    & docker @allArguments
    $commandExit = $LASTEXITCODE
    if ($commandExit -ne 0) {
        throw ($FailureMessage + ' (exit code ' + $commandExit + '). No containers or volumes were automatically deleted.')
    }
}

Write-Host '[1/3] Validating Docker Compose configuration...'
Invoke-LocalCompose -ComposeArguments @('config', '--quiet') -FailureMessage 'Docker Compose configuration is invalid'
Write-Host '[2/3] Starting local PostgreSQL and applying pending migrations...'
Invoke-LocalCompose -ComposeArguments @('up', '-d', 'postgres') -FailureMessage 'Could not start PostgreSQL'
Invoke-LocalCompose -ComposeArguments @('--profile', 'tools', 'run', '--build', '--rm', 'migrate') -FailureMessage 'Migrations failed; review the database/migration error above before retrying'

# Load non-secret and secret values into this process so pnpm/api inherits them; never print values.
foreach ($line in $script:EnvLines) {
    if ($line -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $name = $Matches[1]
        $value = ConvertFrom-LocalEnvValue -RawValue $Matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

$pgUser = Get-LocalEnvValue -Name 'POSTGRES_USER'
if ([string]::IsNullOrWhiteSpace($pgUser)) { $pgUser = 'bclick_dev' }
$pgDatabase = Get-LocalEnvValue -Name 'POSTGRES_DB'
if ([string]::IsNullOrWhiteSpace($pgDatabase)) { $pgDatabase = 'bclick' }
$pgPort = Get-LocalEnvValue -Name 'POSTGRES_PORT'
if ([string]::IsNullOrWhiteSpace($pgPort)) { $pgPort = '5432' }
$userPart = [uri]::EscapeDataString($pgUser)
$passwordPart = [uri]::EscapeDataString($dbPassword)
$databasePart = [uri]::EscapeDataString($pgDatabase)
$env:DATABASE_URL = "postgresql://${userPart}:${passwordPart}@127.0.0.1:${pgPort}/${databasePart}"
$env:NODE_ENV = 'development'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'

Write-Host '[3/3] Database migrations are complete. Starting the API with local Identity enabled.'
Write-Host 'Keep this terminal open. Start the frontend in a second terminal with: npm run dev'
Write-Host 'The script does not delete containers, volumes, or database data.'
& pnpm api:dev
$apiExitCode = $LASTEXITCODE
if ($apiExitCode -ne 0) { exit $apiExitCode }
