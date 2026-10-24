# Restore drill record

- **Status:** OWNER-MACHINE LOCAL DOCKER REHEARSAL PASSED; FORMAL Q-011 ACCEPTANCE NOT RUN
- **Recorded:** 2026-10-24
- **Environment:** Owner's Windows workstation with Docker Desktop and disposable local PostgreSQL containers. No isolated staging VPS/private PostgreSQL target or approved off-host backup store has been provisioned.
- **Owner-machine local run:** Started 2026-10-24 17:23:46Z; final completion logged at 17:24:18Z. Run ID: `20261024T172346Z-ddd2db2b`. Recovery target: `q011_local_before_incident`.
- **Formal staging backup timestamp / recovery point:** Not available
- **Formal staging drill start/end time:** Not measured
- **Formal measured RPO / RTO:** Not measured. The local script passed its simulated marker-window and local restore-duration checks; these are not live archive-freshness or staging RPO/RTO measurements.
- **Independent WAL archive monitoring:** Not configured or verified
- **Local base backup / WAL / PITR:** PASSED. `pg_basebackup` completed, `pg_verifybackup` passed, WAL archive advanced, the restored server reached and promoted at the named recovery point, the pre-backup and target markers were present, and the post-target marker was absent.
- **Local journal/projection reconciliation:** PASSED in run `20261024T172346Z-ddd2db2b`: the disposable TND fixture was present; every journal balanced per currency; `account_balances` matched recomputed `ledger_entries`; all wallet accounts had balance projections; restored precision was EUR=2, TND=2, USD=2. This is local-fixture evidence only, not evidence of production financial postings.
- **Evidence location:** Local ignored path `.local/q011-restore-drill/20261024T172346Z-ddd2db2b/evidence.json`, with base-backup and WAL artifacts in the same run directory. Those artifacts were not committed.
- **Formal staging journal/projection reconciliation:** NOT RUN. The wallet/ledger schema exists from Migration 006; Migration 008 establishes the provider-compatible precision contract (TND 2dp, EUR/USD 2dp). Schema presence is not proof of financial postings or restored staging-data consistency.
- **Result:** The owner-machine disposable local base-backup + WAL/PITR rehearsal passed, including target-marker cutoff and ledger/projection reconciliation. This does not establish backup readiness or formal restore readiness. A real isolated staging restore from the approved off-host base backup plus WAL remains a Phase 3 acceptance blocker. Provider callbacks, payment integrations and real-money routes must remain disabled during the drill.
