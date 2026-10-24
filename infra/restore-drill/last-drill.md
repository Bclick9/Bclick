# Restore drill record

- **Status:** NOT RUN
- **Recorded:** 2026-10-24
- **Environment:** No isolated staging VPS/private PostgreSQL target or approved off-host backup store has been provisioned for this drill.
- **Backup timestamp / target recovery point:** Not available
- **Start/end time:** Not measured
- **Measured RPO / RTO:** Not measured
- **Independent WAL archive monitoring:** Not configured or verified
- **Journal/projection reconciliation:** NOT RUN. The wallet/ledger schema exists from Migration 006; Migration 008 establishes the provider-compatible precision contract (TND 2dp, EUR/USD 2dp). Schema presence is not proof of financial postings or restored-data consistency. During the future isolated restore drill, inspect the restored database and use an approved disposable fixture to validate per-currency journal balance and recompute account_balances against ledger_entries. Do not assume financial rows exist, and do not mark reconciliation passed without retained test evidence.
- **Result:** No backup-readiness or restore-readiness claim can be made. A real isolated restore from an actual base backup plus WAL remains an explicit Phase 3 acceptance blocker. Provider callbacks, payment integrations and real-money routes must remain disabled during the drill.
