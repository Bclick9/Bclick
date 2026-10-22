# Temporary local admin credential exception and global dashboard authentication

**Date:** 2026-10-22  
**Requested by:** Project Owner  
**Status:** Approved exception for local development only; Phase 4 security acceptance remains partial.

## Owner request and explicit exception

The Project Owner requested a convenient initial local administrator account:

- Email: `admin@admin.com`
- Temporary password: `admin`

This is an intentionally weak default credential and is a temporary owner-requested exception to the normal administrator bootstrap rule (which continues to reject default/short passwords). Record this exception so it is not mistaken for accepted production policy or lost during future planning synchronization.

**Scope is strictly local development**: the bootstrap is available only when `NODE_ENV=development`, and is invoked by `start-bclick-local.ps1` after local PostgreSQL migrations. The bootstrap is not an HTTP endpoint and refuses test/staging/production configurations. Do not carry this credential into a shared environment, staging or Production.

## What was changed

1. `backend/components/AdminAuthGate.tsx` checks `GET /api/v1/admin/session` before mounting any Backoffice or CMS content. When there is no active administrator session with MFA, the sidebar, topbar, page navigation, demo rows and CMS controls are not rendered; only the sign-in/MFA flow is shown.
2. Admin login uses the existing server endpoints, session cookies, TOTP enrollment on first login, authenticator/recovery-code verification and server-side logout. The header shows the authenticated administrator rather than the old `Admin Demo` placeholder.
3. `CmsProvidersPage` uses the global admin session and retains the `casino.provider-settings.manage` permission check. Server-side MFA/session/CSRF/RBAC checks and audit events remain authoritative for persisted provider/game controls.
4. `IdentityService.bootstrapLocalDefaultAdmin()` is separate from the normal strong-password bootstrap. It serializes first-admin creation, hashes the requested temporary password with the existing password hasher, grants the existing `project-admin` role and writes an audit event noting the owner-requested exception.
5. The local bootstrap creates the default account only when no admin exists. If `admin@admin.com` already exists, it never resets the password or re-enables the account. If another administrator exists, it does not silently add a second privileged user. A changed/inactive default account is reported without destructive repair.
6. The local startup script does not delete containers, volumes or database rows. No schema migration was added for this change.

## Required local acceptance

After pulling the reviewed change, run `./start-bclick-local.ps1`. It will apply already-pending local migrations and attempt the guarded bootstrap. When the table has no admins, it creates `admin@admin.com`; the first login must complete TOTP enrollment before the dashboard appears.

Verify that anonymous access to every Backoffice and CMS route shows only the auth gate, then sign in and confirm the dashboard renders. Test sign-out and refresh: signing out or having no valid session must hide the full dashboard again. Confirm provider management still denies accounts without `casino.provider-settings.manage`.

## Security and roadmap boundary

The weak password must not be accepted for any shared environment. Before any staging/Production planning, replace this temporary setup with an explicitly provisioned administrator credential and the approved deployment/recovery procedure; no default-admin bootstrap is allowed outside local development.

This note does **not** close Phase 4, Q-001/Q-002/Q-003, Q-011, Q-020 or any release/security gate. It does not authorize a staging/Production deployment, Premium source, wallet posting, callbacks, payments, wagers, real-money play, or Phase 8. Any broader password-change/recovery or administrative lifecycle work must follow the security plan rather than being inferred complete from local sign-in.
