# Q-011 — local disposable Docker restore rehearsal

**Prepared:** 2026-10-24  
**Status:** script and CI validation in progress; no Owner-machine drill result has been recorded.

## Purpose and limit

The local harness at `infra/restore-drill/run-local-restore-drill.ps1` provides a repeatable rehearsal of a physical PostgreSQL base backup, archived WAL and point-in-time recovery, then checks the restored wallet ledger. It creates a fresh disposable database and independent restore data volume; it does not reuse the normal local Compose database.

This is **not** closure evidence for Issue #57. It does not prove off-host backup durability, encryption-key recovery, independent alert delivery, production archive freshness, or a restore on a staging target. The simulated RPO interval is the gap between two deliberately inserted local markers, not a measurement of the live WAL archive lag. The timed local restore duration is not a staging RTO result. Keep `infra/restore-drill/last-drill.md` as `NOT RUN` for the Q-011 acceptance gate until the full required environment and checks are exercised.

## Windows 10/11 — run the local rehearsal

Prerequisites: Docker Desktop is running with Linux containers enabled; the Bclick repository is checked out; Node.js and pnpm versions match the repository; the PostgreSQL image can be downloaded; and there is enough disk space for a disposable physical base backup and WAL archive.

Open PowerShell in the repository root (`C:\Projects\Bclick`, or your actual checkout path), then run:

```powershell
git switch main
git pull origin main
pnpm install --frozen-lockfile

docker info
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\infra\restore-drill\run-local-restore-drill.ps1
```

The script uses the same PostgreSQL image as the current repository Compose/CI setup by default (`postgres:18.6-alpine`). This is a local test choice; the eventual formal drill must use the same PostgreSQL major version and extension set as the target deployment.

### What the script does

1. Makes uniquely named Docker volumes and containers, generates a random disposable database password and exposes the source database only on a random loopback port.
2. Temporarily sets `DATABASE_URL` for the migration subprocess and applies the repository's checked-in migrations to that newly created database. It restores the previous environment value afterward.
3. Inserts one labelled balanced TND ledger fixture (1,234 minor units = TND 12.34 under the accepted TND 2dp contract) and a marker table, then takes a physical `pg_basebackup` and runs `pg_verifybackup`.
4. Creates a named recovery point, commits a marker after that point, forces WAL switching and waits for an archived segment.
5. Restores to a second, independent data volume using `restore_command` and `recovery_target_name`.
6. Confirms the restored database contains pre-backup and target markers but **not** the deliberately post-target marker; verifies migration history, per-currency journal balance, every `account_balances` projection against `ledger_entries`, required projection rows and the TND/EUR/USD precision contract.
7. Writes a JSON result and SHA-256 file manifests, then removes its temporary Docker containers and volumes on success.

On a failed run, use `-KeepDockerResourcesOnFailure` only when you need to investigate the disposable containers/volumes:

```powershell
.\infra\restore-drill\run-local-restore-drill.ps1 -KeepDockerResourcesOnFailure
```

If you keep resources for diagnosis, remove only the containers and volume names printed/created by that run after you finish. Do not run `docker compose down -v` for this drill; it could remove unrelated local project data.

## Artifacts and redaction

The script saves files to:

```text
.local/q011-restore-drill/<run-id>/
  evidence.json
  basebackup/
  wal-archive/
```

This directory is git-ignored because a physical backup contains database material. Do not commit or upload the base backup/WAL files. The JSON summary records only the test metrics and check results; the generated database password and connection string are not included.

Share only the non-secret output if a run fails: the final status, failed stage/check, error text after any local review for redaction, and selected non-sensitive fields from `evidence.json`. Do not share backup files or database dumps.

## Result interpretation

A successful local run should state `LOCAL_REHEARSAL_PASSED` and contain passing checks for base-backup verification, archived WAL, named-target recovery, marker cutoff and ledger reconciliation. It must still set `q011Acceptance.accepted=false`.

Do not update the formal measured RPO/RTO fields in `infra/restore-drill/last-drill.md` based on the simulated local interval or CI timing. Record only the actual environment run there, and keep the issue open until off-host encrypted backups, independent key recovery, independent archive alerts, the real base+WAL restore and the actual measured RPO ≤15 minutes / RTO ≤8 hours have been evidenced.
