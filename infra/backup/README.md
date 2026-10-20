# Backup foundation — not production-ready yet

The design requires encrypted PostgreSQL base backups plus continuous WAL archiving to an off-host failure domain. A SQL dump by itself is not an acceptable point-in-time-recovery plan. The encryption key must be recoverable independently of the backup store, and archive freshness/backlog alarms must not depend only on the source VPS.

## Before enabling backup jobs

- Select an off-host object-storage account and approved region/jurisdiction.
- Approve lifecycle/retention, deletion and legal-hold rules with counsel; current retention examples in planning documents are proposals only.
- Provision distinct, least-privilege credentials for writing and restoring; never store credentials in Git, image layers or the API database.
- Configure PostgreSQL base-backup scheduling, WAL archiving, encryption, checksum/size/freshness alerts and failed-upload tests.
- Exercise credential/key recovery and a point-in-time restore from an isolated host.

The Phase 3 code skeleton does not enable WAL archiving, select a vendor, create secrets, or claim that off-host backups exist. Record a timed restore and independent alert evidence in `../restore-drill/last-drill.md` only after the drill actually runs.
