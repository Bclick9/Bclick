# Local Development and Initial Admin Bootstrap Boundaries

- **Date:** 2026-10-20
- **Scope:** Record the owner's operating constraints without changing security contracts or closing any gate.
- **Status:** Context note only; authentication implementation remains blocked by Issue #55.

## Owner direction

- The Backoffice/CMS UI remains the existing `backend/` workspace. The initial operating model has one project-manager/admin account, not public admin self-registration.
- Development and integration work are local on `localhost` for now. A VPS deployment is a later stage after the project is ready and the deployment/security gates are satisfied.
- The intended initial administrator username is `admin`.
- The proposed fixed password `admin` is **not adopted as an application default**. The approved planning direction for Q-002 requires a documented, out-of-band, one-time first-admin bootstrap procedure and explicitly disallows a committed/default bootstrap secret. A local environment does not waive that control.
- Do not put credentials, bootstrap secrets, TOTP seeds, recovery codes, or private keys in Git, fixtures, logs, Docker image layers, or client-side code.

## What this note does not approve

This clarification records the number of initial accounts and the current development topology. It does not approve or replace the Q-001, Q-002, or Q-003 owner decisions:

- **Q-001:** Admin session/status semantics and server-derived authorization remain pending.
- **Q-002:** The one-time bootstrap procedure, mandatory MFA, challenge/enrollment binding, recovery codes and reset lifecycle remain pending.
- **Q-003:** CSRF cookie namespaces, allowed-origin topology, session binding, rotation and negative-test policy remain pending.

The API/Auth and Security owners must record explicit decisions on [Issue #55](https://github.com/Bclick9/Bclick/issues/55); the implementation gate remains closed until required approvals and contract/tests are recorded. No admin login/session/MFA/CSRF handler is authorized by this note.

## Local-to-VPS boundary

Until the later deployment gate is met:

- Keep the API bound to localhost/development configuration only; do not expose a development server to a public interface.
- Do not enable player/admin sensitive mutations, CMS uploads/publication, wallet movements, payment acceptance, provider callbacks, or real-money routes.
- Before VPS deployment, use explicit environment configuration, a reviewed production-origin/CSP/cookie policy, independent secret provisioning, and the required security and restore evidence. Never promote local demo credentials or data into a remote environment.

## Next authorized step

Resolve and record Q-001–Q-003 decisions in Issue #55. After approval, update the OpenAPI contract and acceptance fixtures as necessary, obtain a green contract/owner-approval PR, and only then implement the bootstrap and admin authentication lifecycle in roadmap order. The static Q-020 checks and the staging restore drill remain separately tracked; this note closes neither.
