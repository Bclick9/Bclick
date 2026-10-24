# Administrator MFA and recovery-code runbook

**Status:** normal recovery-code use is covered by PostgreSQL-backed tests. Sole-administrator break-glass recovery in a shared environment remains **BLOCKED** until the operator tool and runbook are reviewed and rehearsed with applicable deployment approval.  
**Related gate:** Issue #55 — Phase 4 Identity acceptance.

## Normal recovery-code use

1. Recovery codes are available only after the administrator has completed TOTP enrollment and has a full active admin session.
2. Use the admin UI's recovery-code regeneration action, which requires the current TOTP code and a reason. The API response displays ten codes once. Do not write them to application logs, database plaintext, tickets, chat, email, screenshots or source control.
3. Store the codes offline in an approved password manager or equivalent access-controlled secret store. Limit access to the account owner and record storage location in the approved operations inventory, never the code values.
4. A recovery code is single-use. On successful redemption it is atomically marked consumed as part of the real database transaction that creates a full MFA-verified admin session. If a code is rejected or may have been exposed, do not retry it indefinitely; sign in with TOTP or a different unused code and regenerate a fresh set.
5. Regeneration consumes all older codes before saving the new hashed set. Treat every prior code as invalid once regeneration succeeds. The plaintext codes cannot be recovered from PostgreSQL; they must be regenerated from an authenticated session with current TOTP.
6. After successful recovery, confirm the admin session endpoint returns an active MFA-verified session, confirm the consumed code fails in a fresh login challenge, and verify the audit record reports the factor/outcome without storing the code or reason text.

## Loss of TOTP and all recovery codes

### Local development only

- Stop the local application and decide explicitly whether the database is disposable. If any data must be preserved, do not reset it.
- For a disposable local database, create a fresh isolated local database, run the supported migrations, and use the administrator bootstrap runbook. This is a development reset, not recovery of the old principal.
- Do not run the local default bootstrap against a database containing users or needed data. Its implementation deliberately does not change an existing administrator's password or status.

### Shared, staging or production environment

**STOP. Do not attempt self-approval or direct SQL edits.** The accepted policy requires requester, approver and target to be distinct in the normal multi-administrator flow. A sole administrator cannot approve their own reset. The repository now contains a proposed guarded operator command described in [the sole-administrator break-glass procedure](./admin-mfa-break-glass.md), but it must not be used until that procedure is reviewed, rehearsed and the relevant deployment/security gates explicitly authorize it.

Before any shared environment is authorized, the project must approve and rehearse a one-time out-of-band recovery mechanism: a verified incident/ticket and reason; independent out-of-band approval; a controlled least-privilege database credential and narrowly scoped reviewed command; atomic revocation of sessions and invalidation of challenges/recovery codes; forced TOTP re-enrollment; secret-free audit evidence with ticket and request IDs; and a second-person review plus disposable-database rehearsal.

Do not call admin:bootstrap an MFA reset: it refuses to run if any administrator already exists.

## Audit and log handling

Durable audit_events records must describe actions and safe metadata only. For recovery events, acceptable metadata includes factor, outcome, count of codes, reason length, ticket reference, actor/subject and timestamps. Never persist a recovery code, password, TOTP seed or code, session/challenge/CSRF cookie value, reset token, or free-form reason text when it may contain sensitive information.

Application request logging must continue to omit query strings and request bodies and redact authorization, cookie and provider-secret headers. If sensitive values appear in audit or application logs, treat it as a security incident: restrict access, preserve evidence safely, rotate/revoke affected credentials, fix the defect and rerun the redaction acceptance tests.

## Release boundary

This runbook does not by itself close Issue #55. Acceptance additionally requires the real PostgreSQL-backed single-use/replay test, audit-redaction evidence, bootstrap evidence review, and a rehearsed approved out-of-band recovery path. No deployment, provider callback, wallet posting, payment, FX, wager, Premium or real-money capability is authorized by this document.
