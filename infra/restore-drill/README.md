# Isolated PostgreSQL restore drill

This runbook is a checklist, not evidence that recovery has been tested. Do not run restore experiments against production. Use an isolated staging host/database with outbound email suppressed and provider callbacks disabled.

## Preconditions

- An encrypted base backup and a continuous WAL archive from the same PostgreSQL cluster are available off-host.
- Restore credentials and encryption keys have been recovered using the documented independent recovery procedure.
- The exact PostgreSQL major version and compatible extension set are installed.
- The drill owner, time window, expected backup timestamp and selected recovery target are recorded.

## Procedure

1. Record drill start time and the newest successfully archived WAL segment/backup timestamp.
2. Restore the base backup into an isolated empty data directory; configure archive retrieval and a point-in-time recovery target.
3. Start the restored instance on an isolated/private port. Confirm recovery reaches the requested target and record any missing WAL, upload lag or key/retrieval error.
4. Apply ordered migrations in the expected deployment sequence and compare schema version to the release under test.
5. Run data consistency checks. The wallet/ledger schema was introduced by Migration 006, and Migration 008 establishes TND 2dp (EUR/USD remain 2dp). Verify every posted journal in the restored dataset balances per currency and recompute each account_balances projection from ledger_entries. In the isolated restored staging clone, also use an approved disposable fixture to exercise the reconciliation check when the dataset has no suitable journal rows. Retain fixture provenance and query/test results; do not infer success from schema existence or treat an empty query as proof of financial integrity.
6. Verify email/provider side effects remain suppressed in the drill environment. Test stale archive, invalid key, missing WAL, disk full and restore failure alert paths.
7. Record measured RPO and RTO, evidence locations, discrepancies, owner and remediation. Do not convert targets into claims unless the timed result meets them.
8. Destroy the isolated restored data only after evidence is stored under the approved retention policy.

## Acceptance

Target launch objectives in the source plan are RPO ≤15 minutes and RTO ≤8 hours, measured in an actual drill. These are not achieved by writing a cron job. Off-host archive health and a successful restore are required before real-money launch.


## Local Docker rehearsal (preparatory only)

A Windows PowerShell harness is available at `infra/restore-drill/run-local-restore-drill.ps1`. From the repository root, with Docker Desktop running and the locked pnpm workspace installed:

```powershell
pnpm install --frozen-lockfile
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\infra\restore-drill\run-local-restore-drill.ps1
```

The script creates uniquely named, disposable PostgreSQL containers and volumes; it does not reuse the normal local Compose database. It applies the current checked-in migrations to the fresh test database, creates one balanced disposable TND 2dp ledger journal, takes a physical `pg_basebackup`, verifies the backup manifest, archives WAL, and restores a separate database to a named recovery point. It verifies that the post-target marker is absent, validates per-currency journal balance and `account_balances` against `ledger_entries`, and records local timings and SHA-256 manifests.

Backup, WAL and the redacted JSON summary are retained under `.local/q011-restore-drill/<run-id>/`; that path is git-ignored because backup contents are database material. Do not upload the backup directory to chat or commit it. The script generates a random disposable password and does not write it into the evidence JSON. On successful completion, it removes its containers and named volumes. To preserve containers/volumes after a failure for local debugging, run with `-KeepDockerResourcesOnFailure` and remove them manually when done.

**Evidence boundary:** this rehearsal intentionally reports a simulated local recovery-point interval, not live archive freshness or an achieved production RPO. The measured local restore duration is not a staging RTO result. It does not test off-host durability, encryption-key recovery, independent alert delivery or real staging. Keep `infra/restore-drill/last-drill.md` as `NOT RUN` for Q-011 acceptance until an actual isolated base-backup + WAL recovery and independent monitoring checks meet the full gate. Use a PostgreSQL major version matching the eventual target deployment for the formal drill; the default `postgres:18.6-alpine` matches the current repository Compose/CI image for local rehearsal.
