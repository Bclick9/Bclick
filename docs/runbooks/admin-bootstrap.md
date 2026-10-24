# Administrator bootstrap runbook

**Status:** local-development procedure; not a production or shared-environment approval.  
**Owner:** Project Owner / API-Auth / Security.  
**Related gates:** Issue #55, Q-011, Q-013, and deployment/compliance review.

## Preconditions

1. Confirm this is an isolated local development environment on loopback (localhost / 127.0.0.1) with a disposable or backed-up development database. Do not use real player data.
2. Use the repository's local start script so required migrations, local secret creation, exact player/admin Origin configuration, and the guarded bootstrap occur in the intended order: ./start-bclick-local.ps1.
3. Confirm NODE_ENV=development, BCLICK_IDENTITY_ENABLED=true, the session hash key, CSRF signing key and TOTP encryption key are configured locally and never committed. Origin values must be exact origins, with no wildcard or path.
4. Do not expose the local API port on a public interface. Do not copy the local environment file, database volume, logs or credentials into a shared environment.

## Local-only bootstrap options

- **Owner-requested temporary default:** the local start script invokes pnpm api:admin:bootstrap-local-default. In development only, it may create admin@admin.com with the temporary password admin if no administrator exists. First sign-in must complete TOTP enrollment. This weak credential is a documented owner exception for local development only; never use it for CI secrets, staging or production.
- **Strong one-time local bootstrap:** set IDENTITY_BOOTSTRAP_EMAIL, IDENTITY_BOOTSTRAP_DISPLAY_NAME and a unique IDENTITY_BOOTSTRAP_PASSWORD (at least 16 characters) as process environment variables without echoing them, then run pnpm --filter @bclick/server admin:bootstrap. The script refuses production, requires Identity configuration and only provisions when the administrator table is empty. First sign-in must complete TOTP enrollment.

Do not pass passwords as command-line arguments, paste them in chat, commit them, add them to shell history, or log them. The bootstrap script intentionally prints only a generic success/failure message.

## Verify the first sign-in

1. Start the application locally and open the admin UI on the configured admin origin.
2. Authenticate with the provisioned credential. Password success alone must not issue a full admin session.
3. Complete TOTP enrollment using a trusted authenticator. Verify that the full admin dashboard appears only after TOTP verification.
4. Sign out and verify that refresh/revisit returns to the login gate. Confirm an expired, revoked or MFA-incomplete session cannot read the admin session endpoint.
5. Generate recovery codes only after TOTP enrollment and follow the administrator MFA recovery runbook. Save codes offline in an approved password manager; they are shown only at issuance.

## If bootstrap does not complete

- Stop and inspect generic exit status and migration diagnostics; do not paste secrets or full environment files into logs or tickets.
- If an administrator already exists, the script must not reset its password, re-enable it or add a second privileged account automatically. Resolve the state deliberately.
- Never delete a user, rewrite password/MFA columns, disable MFA, or change roles directly in SQL as a workaround.
- If the local database is genuinely disposable and the administrator is unrecoverable, create a fresh isolated local database, apply migrations, and rerun the guarded bootstrap only after confirming no needed data will be destroyed.
- An out-of-band recovery of a sole administrator in a shared or production environment is **not approved by this local runbook**. Do not deploy such an environment while that procedure is unavailable and unrehearsed.

## Release boundary

This runbook is operational guidance for local development only. It does not close Phase 4, prove off-host backup/restore, authorize deployment, or enable wallets, callbacks, deposits/withdrawals, wagers, FX, Premium, or any real-money route.
