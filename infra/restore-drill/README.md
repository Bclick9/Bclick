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
4. Run ordered migrations in the expected deployment sequence and compare schema version to the release under test.
5. Run data consistency checks. Once ledger tables exist, verify each posted journal balances per currency and recompute every `account_balances` projection against ledger entries. Reconcile delayed/in-doubt provider movements before any financial route could be opened.
6. Verify email/provider side effects remain suppressed in the drill environment. Test stale archive, invalid key, missing WAL, disk full and restore failure alert paths.
7. Record measured RPO and RTO, evidence locations, discrepancies, owner and remediation. Do not convert targets into claims unless the timed result meets them.
8. Destroy the isolated restored data only after evidence is stored under the approved retention policy.

## Acceptance

Target launch objectives in the source plan are RPO ≤15 minutes and RTO ≤8 hours, measured in an actual drill. These are not achieved by writing a cron job. Off-host archive health and a successful restore are required before real-money launch.
