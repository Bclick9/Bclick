# Sole-administrator MFA break-glass procedure

**Status: proposed operator procedure. Do not use in a shared, staging, or production environment until this tool and runbook have been reviewed and the relevant identity and deployment gates explicitly authorize use.**  
**Related gate:** Issue #55 — Phase 4 Identity acceptance; Q-011 and all deployment/security gates remain independent.

## What the tool does

The non-HTTP command **pnpm api:admin:mfa:break-glass** is intended only for an independently approved sole-administrator lockout when the administrator has lost both TOTP and all recovery codes. It does not reset a password, reactivate an account, change roles, create an administrator, issue a session, or enable a financial route.

In one PostgreSQL transaction it requires exactly one row in admin_users and requires the target to be active with currently enrolled TOTP; serializes against concurrent MFA/recovery operations with bounded lock and statement timeouts; revokes every live admin session; consumes every active MFA challenge and unused recovery code; clears current and pending TOTP secret fields so the next password login requires TOTP enrollment; and writes an audit record with ticket/approval references, requester and independent approver identity labels, counts and safe outcome metadata.

If any mutation or the audit insert fails, the transaction rolls back. If the target is missing, inactive, not currently MFA-enrolled, or the environment has more or fewer than one administrator, the tool records a denied outcome where possible and refuses the reset. It does not support the normal multi-administrator reset flow.

## Preconditions before an operator runs it

- The incident/ticket is verified through the approved out-of-band process and the ticket reference is recorded.
- An independent requester/incident commander and an approver have verified and approved the sole-administrator exception. The requester, approver and target must be three distinct identities; the target is the subject of the incident, not the requester or approver for this reset.
- The tool and runbook have an explicit recorded identity/security review. The deployment gate (Q-011 and the target-environment approval) is independently recorded as approved. A GitHub merge or green CI alone does not satisfy either review.
- The operator has verified the target database through the approved operations inventory, is using a dedicated least-privilege break-glass database credential, and has an approved incident/backup procedure. Never print or paste DATABASE_URL.
- The CLI requires the canonical target `lowercase-host:port/database_name` twice and compares it with the host, port and database encoded in DATABASE_URL before connecting. After connecting, it also checks `current_database()` before any mutation. This catches accidental target mismatches; it does not replace independent verification of the approved operations inventory.
- The target email is independently confirmed. The command itself checks that the target is the only admin_users row.
- A separate secure channel is arranged for recovery instructions. The CLI does not display a recovery code or new credential.

The required environment variables are attestations, not cryptographic verification of an external ticketing service. The operator process remains responsible for confirming the references and identities. The command is staging-only in this release: the feature flag is off by default, the operator must explicitly enable it after review, and NODE_ENV=production is rejected unconditionally even if the feature flag is set. It also requires an explicit execution flag, both approval attestations, the target email typed twice, an incident ticket, two approval references, the sole-admin scope and an exact acknowledgement phrase.

## Required runtime environment

Set these variables only in the approved operator shell; do not include values in shell command history or a shared terminal recording:

- NODE_ENV: staging only. The command refuses NODE_ENV=production unconditionally in this release.
- BCLICK_ADMIN_MFA_BREAK_GLASS_ENABLED: true only in an approved staging rehearsal after the independent identity/security review; unset/false means the command is disabled. This flag does not authorize production use.
- DATABASE_URL: the approved target connection string supplied securely by the deployment system.
- BCLICK_BREAK_GLASS_EXECUTION: EXECUTE.
- BCLICK_BREAK_GLASS_APPROVAL_VERIFIED: YES, only after verifying independent out-of-band approval.
- BCLICK_BREAK_GLASS_DEPLOYMENT_GATE_VERIFIED: YES, only after verifying Q-011 and target-environment authorization.
- BCLICK_BREAK_GLASS_TARGET_EMAIL and BCLICK_BREAK_GLASS_CONFIRM_TARGET_EMAIL: the same exact administrator email.
- BCLICK_BREAK_GLASS_DATABASE_TARGET and BCLICK_BREAK_GLASS_CONFIRM_DATABASE_TARGET: the same canonical `lowercase-host:port/database_name` identifier copied independently from the approved target inventory and verified to match DATABASE_URL; do not paste the URL itself.
- BCLICK_BREAK_GLASS_REQUESTER_IDENTITY and BCLICK_BREAK_GLASS_APPROVER_IDENTITY: independently verified incident identities; requester and approver must differ and the target cannot approve their own recovery.
- BCLICK_BREAK_GLASS_INCIDENT_TICKET: verified incident reference.
- BCLICK_BREAK_GLASS_IDENTITY_APPROVAL_REF and BCLICK_BREAK_GLASS_DEPLOYMENT_APPROVAL_REF: references to the recorded identity/runbook review and deployment-gate approval.
- BCLICK_BREAK_GLASS_SCOPE: sole-admin-out-of-band.
- BCLICK_BREAK_GLASS_ACKNOWLEDGEMENT: RESET ADMIN MFA AND REVOKE ALL ADMIN SESSIONS.

Run the command once. Its output contains only status, counts, a correlation/request ID and the next verification step; it never prints database credentials, cookies, password hashes, recovery codes or TOTP seeds. Do not retry after an ambiguous connection failure: inspect the audit record and state first. The password stays unchanged.

## Verification after execution

1. Independently inspect the audit event by request ID and confirm its outcome, ticket and approver references. Verify that the non-secret `databaseTarget` host/port/database label matches the separately approved operations inventory. Never copy DATABASE_URL into audit metadata or incident notes. Ensure no other secret or free-form incident narrative is present.
2. Verify that all previous admin sessions are revoked, pending challenges consumed, recovery codes consumed, and old/pending TOTP fields cleared.
3. Sign in through the normal UI using the unchanged password. Confirm the login response is enrollment_required and no full admin session exists before fresh TOTP verification.
4. Complete fresh TOTP enrollment, verify the full session endpoint succeeds only after verification, then generate new recovery codes and store them via the approved separate channel.
5. Verify that an old browser session/challenge/recovery code cannot authenticate and a second reset attempt is refused.
6. Have a second reviewer compare database state and audit evidence with the incident ticket before resolving the incident.

## Refusal conditions and rollback

Stop if an approval reference is missing, either approval cannot be independently verified, the ticket is invalid, target confirmation differs, target is inactive or not MFA-enrolled, the admin count is not exactly one, or PostgreSQL lock/statement timeout occurs. Do not edit identity tables manually or weaken MFA to work around a refusal.

The Testcontainers integration test is a disposable-database rehearsal of mutation/invalidation logic, not proof of an operational rehearsal in a future staging/shared environment. A second operator must rehearse this runbook against a disposable copy with the same migration version and approved tooling before non-local use.

## Release boundary

This document and command do not close Issue #55 or Q-011, prove a production restore, authorize deployment, or enable wallet posting, callbacks, payments, FX, wagers, Premium or any real-money operation. The executable is unconditionally blocked in production in this release; any future production support requires a separate reviewed change and explicit gate approval.
