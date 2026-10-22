# Mobile LAN Authentication and Phase 6 Catalogue Acceptance

**Date:** 2026-10-22  
**Status:** Implementation proposed on `fix/mobile-lan-auth-phase6-acceptance`; local phone/browser acceptance still requires an operator run after the PR is applied.  
**Environment:** Local development and BigBang Sandbox only.

## 1. Phone login: root cause and safe remedy

Player identity checks the browser `Origin` against the exact `BCLICK_PLAYER_ALLOWED_ORIGINS` list. The local bootstrap now logs the allow-list read by the API process and refuses to start a second API listener on port 3000, because a stale process can retain an earlier `.env` value. In development, a rejected Origin is logged with its received origin and the configured player/admin list.

Player session and CSRF cookies deliberately remain `Secure; Path=/; no Domain`, with `__Host-` prefixes. Do **not** weaken that cookie policy for a plain HTTP LAN address. A phone should use trusted HTTPS.

### Setup

1. Install the official Windows `mkcert` executable and ensure `mkcert.exe` is on PATH.
2. Stop the existing API and Vite dev server (Ctrl+C in each terminal).
3. In PowerShell at the repository root, run:

   ```powershell
   .\scripts\setup-local-phone-https.ps1
   ```

4. Transfer only `frontend/.local-certs/mobile-rootCA.pem` to the phone, install it as a trusted CA using the phone OS trust settings, and enable full trust where the OS requires that. The certificate is for a private development LAN only.
5. Do **not** transfer or share `frontend/.local-certs/phone-key.pem` or mkcert's `rootCA-key.pem`. The local certificate directory is ignored by Git.
6. Rerun `.`start-bclick-local.ps1` after TLS setup so the API process loads the exact `https://<private-ip>:5173` Origin. The script refuses to continue when an old process is already listening on port 3000; stop that process first.
7. Restart the frontend with `npm run dev`; Vite enables HTTPS automatically when the local cert/key pair exists. Open the printed `https://<private-ip>:5173` URL on the phone.

If the phone does not trust the certificate, do not bypass browser warnings for any production credential or real-money use. Local Identity is development-only while Q-011 remains open.

## 2. Acceptance tests added

- HTTPS private-LAN Origin may complete the player register/login-session-cookie flow.
- Both player cookies retain the required `Secure` attribute and the `__Host-` names.
- Same-origin session GET, CSRF-protected profile update, and logout/revocation work with the LAN Origin.
- An unconfigured neighboring private IP is denied with `403 ORIGIN_INVALID`.
- Exact-Origin diagnostics are emitted only in development; the user-facing error remains generic.

A passing CI test does not prove a physical phone trusts the generated CA. After applying the PR, repeat registration/login/session/logout on the actual phone browser and record the result.

## 3. BigBang catalogue audit

### Evidence observed

- The operator's local Sandbox sync completed with `receivedCount=3639`, `createdCount=3639`, `updatedCount=0`, `totalReported=3639`; a subsequent sync updated the same 3,639 records without creating additional records.
- A direct Standard query with the `ek_test_` Sandbox key returned HTTP 200 and reported `pagination.total=3639`, matching the page's 3,639 data items for that response.
- The current BigBang adapter requests `type=standard`, validates `mode=standard` and `is_premium=false`, and stores `source_mode` and `is_premium` in `casino_game_sources`. The public Bclick catalogue DTO currently omits those tier fields.
- The adapter upserts source records using `(source_code, external_game_id)`. Before importing Premium, confirm in writing whether BigBang game IDs are unique across tiers and whether the same ID can identify different tier variants. Do not silently change this key or merge by title alone.

### Open discrepancy / release decision

The operator-reported Standard total of 3,802 differs by 163 from the 3,639 returned by the current Sandbox key. This evidence does **not** prove 163 missing local games: BigBang's current [API docs](https://api.bigbangcasino.bet/docs/) say catalogue results depend on key access, plan and shop configuration, and that Sandbox keys expose Standard only. The discrepancy remains **unresolved** until the 3,802 value is reproduced with the same account/key, `type=standard`, endpoint, and response `pagination.total`, or BigBang confirms why those scopes differ.

The operator-reported Premium count of 5,481 is not available through the current Sandbox key according to the published docs. Do not attempt to load Premium with this key or activate Premium launch mode as a shortcut.

### Canonical identity policy required before Premium

- Keep source identity (`source_code`, external ID, tier/mode, launch name and provider metadata) distinct from Bclick's canonical public game identity.
- One storefront card is allowed only after source records are verified as equivalent. Matching title is insufficient; compare provider/build/version, launch identifiers and relevant game configuration.
- If an ID is not unique across tiers, the source key must become tier-aware (or use another vendor-confirmed identity scope) with a reviewed data migration and collision report.
- Until this contract is confirmed and tested, keep the current Standard Sandbox catalogue; do not import Premium or merge candidates.

**Catalogue acceptance status:** partial. Current Standard sync is repeatable against the total returned by the Sandbox endpoint; the 3,802-vs-3,639 discrepancy and cross-tier identity policy remain open. Do not mark Q-005 or Q-006 closed based on this note.

## 4. Unchanged financial/recovery gates

- **Q-006:** exact versioned BigBang/WinHouse specs and provider-specific contract evidence remain required.
- **Q-010:** ledger idempotency, collision/replay, concurrency and no-overdraft evidence remains required before real-money provider posting.
- **Q-011:** isolated base-backup + WAL restore drill, measured RPO/RTO, and independent backup-freshness alerting remain required.
- No live keys, wallet callback activation, production launch, or real-money flow is enabled by this work.
