# Skin Games custom image upload — diagnosis checkpoint

**Date:** 2026-10-23  
**Scope:** Trace the generic `The Skin Games request could not be completed` error from the Edit Game UI through the API and persistent storage.

## Findings from `main`

- `backend/pages/cms/SkinGames.tsx` sends the selected file's raw bytes to `POST /api/v1/admin/casino/skin-games/{canonical UUID}/image`, with the selected file's `image/png`, `image/jpeg`, or `image/webp` content type and the existing CSRF header. The API helper preserves that explicit content type, same-origin credentials, and disables caching. The frontend request is consistent with the API contract.
- The API validates byte signature and dimensions, writes the file under the configured upload directory, then stores a server-generated relative key plus audit event in `casino_game_presentation`. Normal invalid-size/type cases return explicit 413/415 errors; a generic 500 therefore points at a thrown authorization/DB/filesystem/unexpected runtime error rather than proving the file type is the problem.
- The existing unit test proves a valid PNG upload and subsequent same-origin asset read in a temporary test directory. It does not prove that the Owner's actual Windows-host API process can write to its configured local path or that its local PostgreSQL migration/schema matches the test fixture.
- **Diagnostic defect found:** the upload handler's `catch` discarded the actual exception and passed a plain string to `unexpected()`. As a result, the request-correlated log emitted `UNKNOWN` and could not distinguish a PostgreSQL SQLSTATE from filesystem cases such as permission denial, read-only path, full disk, or an invalid path. The browser-safe response should remain generic, but the server log needs the actual safe error code and the stage that failed.
- **Runtime configuration discrepancy:** `infra/compose/compose.yaml` configures `BCLICK_UPLOAD_DIR=/var/lib/bclick/uploads` and a named `casino-game-uploads` volume for the Compose API service. However, `start-bclick-local.ps1` starts only the Compose PostgreSQL service and migration container, then runs the API on the host via `pnpm api:dev`. That host-run API defaults to a workspace-local `.local/uploads` path unless `BCLICK_UPLOAD_DIR` is explicitly set. The named Compose volume is therefore not the storage used by the current documented local startup path. This is a durability/configuration mismatch, not yet proven to be the reason for this particular 500.

## Narrow correction

Keep the browser-facing error safe and unchanged. Preserve the thrown exception for server logs, record the operation and the stage (`authorize_admin`, `validate_image`, `lookup_game`, `create_upload_directory`, `write_image_file`, or `persist_image_metadata_and_audit`), and record only allowlisted filesystem error codes or the database SQLSTATE. Do not log filesystem paths or return internal errors to the browser.

A regression test should keep the failure response generic when the upload path is unwritable. Then restart the local API and retry with a small supported PNG/JPEG/WebP. Use the request ID to read the new API terminal log. The actual failing stage/code must determine the next fix; do not manually rerun/roll back migrations based only on the generic error.

## Current boundaries

No schema/data migration is proposed by this diagnostic change. No change to Standard/Premium eligibility, provider keys, wallet, payments, wager, or real-money routes. The custom-image upload remains a local Sandbox feature, and backup/restore for uploaded files remains a separate Phase 3/Q-011 requirement.
