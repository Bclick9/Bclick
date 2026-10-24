# Q-011 — staging and Backblaze B2 provisioning runbook

**Status: PREPARATION ONLY — no cloud resources are created by this document.**  
**Owner:** Project Owner / Infrastructure. **Gate:** Q-011 / Phase 3, Issue #57.  
**Financial boundary:** all provider callbacks, payments, wallet posting, wagers, deposits, withdrawals, FX and other real-money paths remain disabled in staging and production until their separate release gates pass.

This runbook turns the existing design checklist into an operator sequence. A runbook, a green CI job, a local Docker rehearsal, or a successful upload test is not formal restore acceptance.

## 1. Target design

- **Staging:** a separate VPS/compute instance and private PostgreSQL endpoint, isolated from production networking, credentials, DNS and data. Do not host staging on the same VPS intended to be production; that would not test the relevant host-failure boundary.
- **PostgreSQL:** use the same major version and extension set intended for the release under test. The repository's current local Compose image is `postgres:18.6-alpine`; confirm the eventual deployed PostgreSQL build before provisioning the formal target.
- **Off-host store:** a dedicated private Backblaze B2 bucket using its S3-compatible HTTPS endpoint. Choose the B2 account/bucket region and jurisdiction before creation; B2 currently associates an account with a single region.
- **Backup tool (proposed baseline):** a pinned, tested pgBackRest release using S3-compatible storage and client-side repository encryption. Validate B2 endpoint, credentials, retention/deletion and restore compatibility in the disposable staging prefix before accepting it.
- **Encryption:** pgBackRest repository encryption plus independent recovery of the repository passphrase. Provider-side storage encryption is additional protection, not a replacement for client-side encryption or key-recovery testing.
- **Monitoring:** a monitor/alert path that is not hosted solely on the source VPS and does not depend on the backup job's own process remaining alive.
- **Evidence:** sanitized output and checksums go in the approved evidence location; raw physical backups, WAL archives, credentials, player data and encryption keys do not go into Git or chat.

## 2. Before creating resources

Record the following in the restricted operations inventory (not in a public Git issue):

- [ ] Staging VPS provider, region, OS image, PostgreSQL major/build and extension list.
- [ ] Staging hostname/private access path, firewall rules, responsible operator and maintenance window.
- [ ] Backblaze B2 account/region, dedicated bucket name, endpoint and jurisdiction decision.
- [ ] Approved backup retention, lifecycle/deletion and legal-hold rules. Retention examples elsewhere in planning material are proposals until approved.
- [ ] Independent alert destination and a second way to recover access to it.
- [ ] Independent secret/key recovery location and the person authorized to retrieve it.
- [ ] Expected database size and projected growth; check upload, storage, restore-download and VPS disk costs against the project budget.
- [ ] The incident/canary method used to measure RPO and the definition of service-ready used to stop the RTO clock.

Do not create a production bucket or enable backup jobs until the retention and deletion policy is explicitly approved. For B2, deleting the current object version may leave older versions stored; a lifecycle policy is therefore part of retention and cost control. Do not enable Object Lock by default: first prove that retention, pgBackRest expiry and recovery behavior are compatible.

## 3. Provision isolated staging

1. Create a separate VPS and a private PostgreSQL endpoint. Use a supported OS and the release's actual PostgreSQL major version/extensions.
2. Restrict SSH/admin access to the approved operator path. Do not expose PostgreSQL directly to the public Internet; allow database access only from the staging application and authorized private administration network.
3. Use separate staging database credentials and secrets. Do not reuse production keys, session-signing material, provider credentials or backup credentials.
4. Do not copy live player or financial data into staging. Use sanitized or synthetic fixtures only.
5. Disable provider callbacks, payment routes, wallet posting, deposits, withdrawals, wagers and all real-money integration flags. Suppress outbound email at the application configuration **and** network/SMTP boundary. Staging must not be able to call a production callback URL.
6. Capture the deployed commit, OS version, PostgreSQL version, extension list and effective network rules in the restricted evidence record.

**Stop condition:** if staging shares production credentials, accepts provider callbacks, can reach production financial endpoints, or sends real email, do not proceed with the drill.

## 4. Provision the B2 bucket and credentials

1. Create a dedicated private bucket for database backups only; do not mix it with CMS uploads, media or general application files.
2. Confirm the bucket region and record the exact S3 endpoint (`https://s3.<region>.backblazeb2.com`). Use HTTPS and Signature Version 4.
3. Create narrowly scoped B2 application keys for the bucket/prefix:
   - **Writer/maintenance key:** only the capabilities required by pgBackRest to upload, list/read its own repository metadata, and expire objects under the approved retention policy.
   - **Restore key:** read/list-only access sufficient to retrieve the selected base backup and WAL. Test this with the actual pgBackRest version; do not give the restore identity delete/write permissions.
4. Never use the B2 master application key. Keep B2 credentials separate from the pgBackRest encryption passphrase and application secrets.
5. Store credentials only in a root-owned configuration/secret file or secret mechanism on the relevant host. Restrict the file to the dedicated backup operator/service (normally mode `0600`); never commit it, bake it into an image, print it in command output, or put it in shell history.
6. Apply and test the approved lifecycle/retention policy, including how old B2 object versions are removed. Keep the bucket private, with no public access or CORS requirement for PostgreSQL backups.
7. Upload and retrieve a disposable non-sensitive test object, verify its checksum and confirm that the read-only restore identity cannot upload or delete. Remove test data according to the approved lifecycle.

## 5. Configure encrypted base backups and continuous WAL

Use a pinned pgBackRest release compatible with the target PostgreSQL and the chosen B2 endpoint. Test the exact package and configuration before enabling the schedule.

The generated host-side pgBackRest configuration should include values equivalent to the following. This is a **non-runnable template**; do not commit a populated configuration or substitute the placeholders on a shared/public system.

```ini
[global]
repo1-type=s3
repo1-path=/bclick/staging
repo1-s3-bucket=<dedicated-bucket-name>
repo1-s3-endpoint=s3.<region>.backblazeb2.com
repo1-s3-region=<region>
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=<injected-from-independent-secret-store>
repo1-retention-full=<approved-integer>
process-max=2
start-fast=y

[bclick-staging]
pg1-path=<actual-postgresql-data-directory>
```

Populate `repo1-s3-key` and `repo1-s3-key-secret` from the scoped B2 application key on the host, not from Git. Use a separate generated configuration/credential identity for restore access. Validate pgBackRest's supported B2 endpoint options against the pinned version; do not blindly deploy a config copied from a generic AWS S3 example.

Configure PostgreSQL and pgBackRest together. The PostgreSQL archiver should call the matching stanza's `archive-push`, for example:

```conf
archive_mode = on
archive_timeout = '300s'
archive_command = 'pgbackrest --stanza=bclick-staging archive-push %p'
```

The stanza name and data directory must match the actual configuration. Reload/restart only as required by the verified PostgreSQL settings. Verify archive-mode state and the exit status of every check; a configured `archive_command` is not proof of durable WAL in B2.

Before scheduling, from the staging host:

1. Create the stanza with the pinned pgBackRest version.
2. Run pgBackRest's configuration/archive check and confirm an object actually appears in the intended B2 prefix.
3. Run a full base backup; verify its completion and repository metadata.
4. Generate staging-only write activity, confirm at least one new WAL segment is archived and retrievable, and test a disposable restore into a separate empty data directory/host.
5. Verify the restored system reaches the selected recovery target and run the current schema, readiness and ledger reconciliation checks.

**Schedule/retention:** a candidate starting schedule for capacity testing is one full backup weekly, differential backups daily, and continuous WAL archiving. This is not yet an approved policy. Choose full-backup retention only after the owner approves legal retention, B2 version lifecycle, database growth, restore-time evidence and cost. The schedule must be validated against an actual restore before it can be called operational.

## 6. Independent monitoring and alerts

The monitor must continue to operate if the source VPS, its disk, its backup process or its alerting agent fails. Prefer a separate provider/failure domain or another independently managed monitor; do not treat a log written only on the source host as an alert.

Required signals:

- Latest successful base backup age and most recent successful WAL archive age, checked against the chosen policy.
- Backup command failure, archive-push failure, upload failure, storage/authentication error, unexpected repository growth, and unavailable B2 endpoint.
- Failure to retrieve/verify the encryption key, missing WAL during restore, checksum/manifest failure and restore/readiness failure.
- Loss of the source host/heartbeat and failure to deliver an alert to the agreed destination.

For the staging acceptance setup, start with a warning when archive freshness reaches 5 minutes and a critical alert by 10 minutes, then validate thresholds under the actual WAL-generation pattern. The hard acceptance ceiling remains RPO ≤15 minutes; thresholds are not themselves proof of RPO. Use a staging-only canary transaction/heartbeat if needed to make freshness measurable during otherwise idle periods.

Perform controlled tests for stale/missing archive, failed upload, invalid test credential, missing WAL and failed restore. Prove that alerts arrive at the independent destination with useful timestamps and without secrets. Run negative tests against a disposable test prefix or staging environment; do not corrupt the only usable backup repository to test an alarm.

## 7. Independent encryption-key recovery

- Store the pgBackRest repository passphrase in a secure location independent of the B2 bucket, staging VPS and application database, with a separately protected recovery path.
- Keep a separately scoped restore credential; do not assume possession of the B2 key alone decrypts the repository.
- From a clean, isolated restore environment, retrieve the approved key copy through the documented recovery procedure and decrypt/restore the staging backup.
- Record the recovery method, access-control check, timestamp, operator and pass/fail result. Never record the passphrase, B2 secret or raw credentials in the evidence log.
- Verify that key revocation/rotation procedures preserve access to retained backups, or explicitly document the migration strategy before rotating the key.

If the independent key cannot be recovered, the backup is not considered recoverable.

## 8. Formal staging restore drill and measurements

Run only after Sections 2–7 are complete. Do not run the test against production.

1. Confirm the approved window, operator, release commit, staging isolation and disabled side effects. Confirm the backup and WAL files are present off-host and record checksums, sizes and timestamps.
2. Start the RTO clock at the recorded incident declaration. Record the latest confirmed committed staging canary sequence/timestamp immediately before the simulated incident.
3. Recover the encryption key using the independent recovery procedure. Restore an actual B2-hosted base backup plus its continuous WAL into a fresh isolated data directory/host. Record the requested and actual recovery targets and all manual steps.
4. Determine the RPO from the difference between the simulated incident time and the timestamp of the latest confirmed canary transaction present after recovery. Do not use the local marker-window simulation or an object's upload timestamp alone as RPO.
5. After recovery, verify schema/migration version, application readiness, required tables and extension availability. Inspect restored ledger rows; verify every tested posted journal balances per currency and recompute `account_balances` from `ledger_entries`. If the restore has no suitable journal rows, use a documented approved disposable fixture; an empty query is not a pass. The currency baseline is TND 2dp, EUR 2dp and USD 2dp.
6. Stop the RTO clock only when the isolated staging service has passed the agreed readiness and data-integrity checks. Include key recovery, provisioning, transfer, WAL replay and validation time.
7. Verify the independent monitor raised and delivered each required test alert. Store sanitized logs, command transcript, checksums, monitor screenshots/events and test results in the approved evidence location.
8. Update `infra/restore-drill/last-drill.md` with actual measured RPO/RTO, owner, environment, UTC timestamps, evidence references, pass/fail, discrepancies and remediation. Do not overwrite this record with targets or estimates.

### Acceptance gate

- [ ] Isolated staging and private PostgreSQL target verified.
- [ ] Encrypted off-host base backup and continuous WAL archiving verified against the approved B2 bucket.
- [ ] Writer and restore credentials tested with least privilege.
- [ ] Independent encryption-key recovery completed.
- [ ] Independent archive/backup/restore monitoring and actual alert delivery verified.
- [ ] Real base backup + WAL restore completed on isolated staging.
- [ ] Data integrity, schema, readiness and required ledger reconciliation checks passed.
- [ ] **Measured RPO ≤15 minutes.**
- [ ] **Measured RTO ≤8 hours.**
- [ ] Sanitized evidence retained and all failure findings assigned.

Until every mandatory line passes with evidence, Q-011 remains open and recovery readiness must not be claimed.

## References

- [Backblaze B2 S3-Compatible API](https://www.backblaze.com/apidocs/introduction-to-the-s3-compatible-api)
- [pgBackRest configuration reference](https://pgbackrest.org/configuration.html)
- [PostgreSQL 18 backup and continuous-archiving documentation](https://www.postgresql.org/docs/18/backup.html)
