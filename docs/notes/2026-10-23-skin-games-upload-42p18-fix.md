# Skin Games image upload SQLSTATE 42P18 — 2026-10-23

## Evidence from the Owner's local API log

The request `POST /api/v1/admin/casino/skin-games/7dc9d028-ef68-4dbd-8f57-6c7b411a6bdc/image` failed at:

- `operation: skin_game_image_upload`
- `stage: persist_image_metadata_and_audit`
- PostgreSQL SQLSTATE: `42P18`
- Message: `could not determine data type of parameter $6`

The API log for `GET /api/v1/admin/session` subsequently shows HTTP 200; therefore the shown 502s in the browser console do not establish the cause of this image-upload failure. If they recur after a clean local restart, diagnose their request time and Vite proxy/API availability separately.

## Root cause and merged correction

The image handler wrote the validated image file, then executed an audit CTE containing:

```sql
jsonb_build_object('contentType',$6,'bytes',$7,'imageKey',changed.custom_image_key)
```

PostgreSQL could not infer the data type of the bind parameters used as values to the polymorphic `jsonb_build_object` function. PR #125 ([fix](https://github.com/Bclick9/Bclick/pull/125)) explicitly casts them:

```sql
jsonb_build_object('contentType',$6::text,'bytes',$7::integer,'imageKey',changed.custom_image_key)
```

The regression assertion checks both casts and the bound MIME/byte-length values. PR #125 was squash-merged into `main` as `ce30d1c1c8a16bd0aaea5d0a4ec6b7b48b76aed3`. CI passed API type/tests/migrations/health contract, OpenAPI/generated-client validation, application build, disposable PostgreSQL/local Compose bootstrap, and PowerShell syntax checks.

## Next local acceptance

After syncing `main` and restarting via `.\start-bclick-local.ps1`, retry a supported image upload. Confirm HTTP 201, reload Skin Games, verify the custom image persists, and check that the public same-origin image URL returns the image bytes. If it still fails, use the new request ID, stage, and safe failure code; the prior `42P18` should no longer occur. Do not manually rerun or roll back migrations.

The upload remains local Standard Sandbox functionality. This change adds no schema/money changes and does not waive Q-004's separate media-security/storage review or Q-011 upload backup/restore evidence. Premium and all real-money paths remain blocked.
