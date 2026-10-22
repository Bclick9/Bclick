# Q-006 — Provider specification fingerprint and contract review

**Review date:** 2026-10-22  
**Gate status:** **Q-006 OPEN / P0 — partially evidenced.** The provider specifications are fingerprinted and support-issued TND bet/win signature vectors are now retained and cryptographically verified by tests. Full event coverage and owner acceptance are still pending.  
**Scope boundary:** This review does not authorize production integration, Premium import, WinHouse Model B wallet endpoints, provider callbacks, wallet posting, wagers, or real-money operation.

## 1. Exact artifact register

Hashes were calculated from the raw bytes of the complete files supplied by the Project Owner—not from a browser excerpt, a rendered page, or a file with a similar name.

| Artifact | Version/date stated in file | Canonical source | Exact size | SHA-256 |
|---|---|---|---:|---|
| `BIGBANG_AGENT.md` | Docs v1.10; 2026-09-20 | https://api.bigbangcasino.bet/docs/agent.md | 20,552 bytes | `60b7b046dd1f56cbd4cf3577b349fe9f1ffbde3b2df1538d6ece7c2368b59b74` |
| `WINHOUSE_AGENT.md` | 2026-09-20 | https://iframe.winhouse.bet/docs/agent.md | 23,021 bytes | `00de9e66c76627eee31af1f9ccba93371432abfffebff39d026d512e53dc2d6b` |

**Review record:** source-to-code review by the AI coding agent on 2026-10-22 using the exact Project-Owner-supplied files. **Owner acceptance:** pending. The hashes identify the reviewed bytes even if either canonical URL later changes; any updated vendor brief must be treated as a new artifact and re-reviewed. No provider credentials or live account response was used in this review.

## 2. BigBang v1.10 — code/spec comparison

### Current Phase 6 implementation that matches the brief

- The catalog client uses the documented `https://api.bigbangcasino.bet/api/v1/` origin and sends `X-API-Key` server-side.
- It requests `GET /games?type=standard&limit=5000&offset=...`, validates the `success/data/pagination` envelope and documented game fields, checks offsets/totals/duplicate IDs, bounds retries and response size, and rejects Premium records under the Sandbox client.
- The existing success fixture is derived from the exact documented single-game example. Pagination, malformed-payload, HTTP failure, retry, duplicate, and incomplete-page cases are synthetic test doubles. They prove code behavior against our model of the documented schema; they are **not** captured provider responses or vendor-issued golden vectors. For non-2xx HTTP responses, the current client uses a safe local code derived from the HTTP status instead of parsing the documented `error.code`/`error.message` envelope; decide whether explicit status-to-local-error mapping is needed before later player/provider operations, and never log untrusted provider error bodies.
- The existing launch client sends `game_id`, `demo: true`, and a language using the Sandbox key. It has no real-mode/user-token input, consistent with the approved Sandbox-only boundary.

### Observed gaps / constraints

1. **Provider list identity:** the brief defines `GET /categories` as the list of provider/category entries and says each returned `slug` is the value for the vendor's `category`/`provider` query parameter and reported provider identity. The current sync does not call `GET /categories`; it builds local provider rows by slugifying each game's display `provider` name. Do not claim that local provider codes exactly match official provider slugs until this is reconciled with an approved fixture or implemented/tested. This is not a reason to contact the vendor during player browsing; browsing remains database-only.
2. **Language mapping:** the brief says locale inputs such as `pt-BR` resolve to `pt`; the current demo client accepts only two-letter lowercase values. The current caller uses `en`, so this is not a Sandbox blocker. Normalize allowed UI locales before supporting additional language inputs.
3. **Sandbox fence:** the client deliberately accepts only `ek_test_` keys and the code launches only `demo: true`. That does not implement the brief's seamless-wallet callbacks, managed wallet, player auto-provisioning, or Premium paths.
4. **Count/tier:** the brief says the visible catalog depends on the key/shop and that Sandbox is Standard-only; it does not prove that 3,639 and 3,802 were measured with the same key, filters, scope, and time. Nor does this brief explicitly establish numeric ID uniqueness across Standard and Premium. Q-005 remains open for the count and identity issues.

## 3. BigBang money contract — support clarification applied to sample bet/win shapes; full gate remains open

The provider-support response supplied on 2026-10-22 states that the callback body `signature` is HMAC-SHA256 over the separator-free concatenation `username + amount + game + game_category + transaction_id`, with `amount` represented as its shortest decimal string. The attached support fixture also defines `X-Body-Signature` as HMAC-SHA256 over the exact raw JSON body. Both signatures for the supplied bet and win vectors have been recomputed successfully using the fixture-only dummy secret; automated regression tests now verify these vectors. The fixture is in `server/test/fixtures/tnd-wallet-provider-vectors.json`, and its source hash and limitations are recorded in the fixture README.

This resolves the signing algorithms for the two supplied request examples and provides evidence for the earlier P-04 discrepancy. It does **not** yet establish whether `X-Body-Signature` is mandatory for every callback/event shape, or cover all the cases required before implementation: zero-amount round close, `sandbox` callback behavior, same-ID replay, conflicting same-ID payload, and a fully paired insufficient-balance request/response. The supplied refusal fixture contains the expected `400 { error: "insufficient balance" }` response but not its associated request. Keep the BigBang callback disabled until those remaining contract cases are confirmed and tested. Never use the dummy fixture secret outside these fixture tests.

## 4. WinHouse 2026-09-20 — code/spec comparison

### Public documentation reviewed on 2026-10-22

The live [WinHouse Integration Docs](https://iframe.winhouse.bet/docs) were reviewed in addition to the pinned `WINHOUSE_AGENT.md`. The public page explicitly documents the Model B launch-token formula `HMAC-SHA256(player_id|expiry|session, wallet_api_key)`, with `expiry` in epoch milliseconds and no more than ten minutes ahead; it distinguishes the callback token from the server-only wallet API key. It also specifies `balance-change` HMAC-SHA256 over `username + amount + action + ticket_id + transaction_id` with no separators, stringifying `amount` as sent on the wire, and says a missing field contributes an empty string. Its duplicate policy is same `transaction_id` + same payload => replay original result; same ID with different payload => `409`. It requires atomic row locking, `422` for overdraft, and expects retries that may arrive more than once and out of order. These published rules agree with the two WinHouse bet/win HMACs verified from support's test fixture.

The published ticket API exposes states including `cashed_out` and `cancelled`; its read-side `payout` may describe a win, cash-out amount, or refunded stake. However, the wallet callback schema still only specifies `action: bet | win`. The public docs do **not** define a distinct callback/event shape or transaction mapping for cash-out, cancellation, or refund. A ticket's final status or read-side `payout` must not be converted into a wallet movement without the corresponding written event contract and fixtures.

### Current implementation

- `frontend/pages/Sports.tsx` uses the documented `https://iframe.winhouse.bet/embed.js` loader, `data-key`, `data-target`, and `data-embed=1`. The brief describes the embed key as public by construction; it is not the wallet API key.
- The current frontend has no WinHouse Model B launch-token endpoint, no `POST /tenant/session` implementation, and no `user-data` / `balance-change` endpoints. The embed itself therefore does not establish seamless-wallet integration.
- The code intentionally omits `data-bottom-gap` because the site's fixed navigation overlays the provider's bottom navigation. The brief explicitly provides `data-bottom-gap` for customers with their own fixed phone navigation. This is a product/layout decision to validate on actual mobile screens before deployment, not proof that the provider's internal tab/sheet remains reachable at all viewport sizes.
- Domain allow-list, optional server-IP behavior, tenant suspension/config, and CSP are account/environment settings. Source review cannot prove that the live tenant's allow-list is correct; verify the registered origin, `GET /tenant/config`, and actual `frame-ancestors`/customer `frame-src` behavior before release.

### Model B contract that must govern any future implementation

- The callback token and wallet API key are distinct secrets. The callback token arrives in `?token=`; the wallet API key is a server-only HMAC key and Bearer credential. Never swap them or expose the wallet API key in the frontend/logs.
- Launch tokens use HMAC-SHA256 over `player_id|expiry|session`; expiry is epoch milliseconds and no more than ten minutes ahead.
- The documented `balance-change` signature is HMAC-SHA256 over `username + amount + action + ticket_id + transaction_id`, no separators, using the amount exactly as sent on the wire. This canonicalization differs from BigBang's documented callback signature and must not share a generic stringifier.
- WinHouse specifies duplicate same-ID/same-payload replay as an unchanged result, same-ID/different-payload as `409`, row locking and atomic ledger update, and `422` for overdraft. BigBang's brief instead documents `400` for an insufficient-funds callback; keep provider-specific response contracts separate.

### Remaining WinHouse questions

The public docs and support examples now establish the ordinary launch-token and bet/win HMAC algorithms, sample payload signatures, idempotency outcomes, atomicity, overdraft refusal, and retry expectations. Do not reopen those as generic questions unless a live tenant produces contrary evidence. Before implementing Model B, obtain written event semantics and sanitized vectors for cash-out, cancellation, refund/rollback, and any multiple-movement settlement; define transaction IDs, ticket linkage, amounts and replay rules. Also request out-of-order examples that demonstrate the intended behavior across related events, plus tenant-accepted vectors for callback variants beyond the two supplied samples. Do not use ticket status alone as a wallet instruction.

## 5. Currency precision — owner decision recorded; implementation is forward-only

Provider support confirmed in writing on 2026-10-22 that both platforms carry TND at **two decimal places only**: `0.01 TND = 10 millimes`; neither transports a true third fractional digit. The Project Owner has now chosen to align Bclick's supported TND money scale to the providers: TND will use exponent 2, matching EUR/USD precision in the shared money contract. The parser must reject a third fractional digit rather than silently round it; provider-specific rounding remains the provider's behavior, not a generic Bclick parser behavior.

- **WinHouse:** the tenant is TND-only. A stake with more than two decimal places is rejected with `invalid_stake_precision` and nothing is debited; a payout is rounded to 0.01 TND.
- **BigBang:** the Dedicated TND shop supports slots and other games but not live-dealer tables in TND. Amounts with more than two decimal places are rounded half away from zero to 0.01 TND; rounded-zero movements are not sent. Support will set a TND bet ladder.
- **Meaning:** one Bclick TND minor unit is now intended to mean 0.01 TND (10 millimes), not 0.001 TND. A value such as `12.345` is invalid for supported platform TND paths and must be rejected; `12.34` is represented as 1,234 minor units. Do not implement hidden rounding or truncation at the platform boundary.
- **Migration safety:** the proposed forward migration updates `currencies.decimal_places` from 3 to 2 only if no TND ledger entries exist and every TND projected wallet balance is zero. It refuses to change the interpretation of any existing financial history. The historical baseline/wallet migrations remain unchanged.

Q-009 is no longer an open product-choice question. Its implementation gate stays open until the precision migration, parser/API/statement tests, and CI migration rehearsal pass; any database containing TND ledger entries or a non-zero TND balance must be handled by a separately reviewed balance-preserving migration, not by bypassing the guard. Production TND play remains blocked by the other independent gates (including Q-006, Q-010 and Q-011).

## 6. Fixture/evidence matrix

| Evidence area | Present in repository | Quality / remaining need |
|---|---|---|
| BigBang catalog success envelope | `server/test/fixtures/bigbang-games-page-1.json` | Documentation-derived from the pinned example; not a tenant response |
| BigBang page traversal / total drift / duplicate IDs / malformed response / HTTP and retry paths | `server/test/bigbang.test.ts` | Synthetic test doubles; useful regression tests, not vendor golden evidence |
| BigBang demo launch | `server/test/bigbang.test.ts` | Synthetic response and URL-safety checks |
| WinHouse embed | `frontend/pages/Sports.tsx` | Code exists; tenant allow-list/CSP/mobile behavior requires environment acceptance |
| WinHouse launch token and wallet callbacks | No server routes currently exist | Correctly out of scope; create contract fixtures and tests only after the owner authorizes the wallet phase and vendor questions are resolved |
| Support-issued BigBang/WinHouse TND bet/win signature vectors | `server/test/fixtures/tnd-wallet-provider-vectors.json` plus `server/test/provider-tnd-fixtures.test.ts` | Supplied by provider support; HMACs, BigBang raw-body HMACs, and sample balance arithmetic verify using a dummy test-only secret. Not a production endpoint test; no replay/conflict/cashout/refund/round-close vectors yet |

## 7. Gate decision and next actions

**Q-006 stays OPEN/P0.** Exact specification fingerprints are recorded and test signatures for the support-issued bet/win examples verify. Remaining evidence includes BigBang's full callback matrix (header requirement, zero-amount close, sandbox flag, replay/conflicting payload), WinHouse cashout/cancellation/refund and out-of-order semantics, and recorded owner acceptance. Do not claim a production-ready wallet contract from the supplied examples alone.

**Q-009 decision: ACCEPTED; implementation verification pending.** The Owner has explicitly selected two-decimal TND precision for platform compatibility. The new code and guarded Migration 008 are being reviewed in a separate change set; do not apply the code/schema pair incompletely, and do not bypass Migration 008 if historical TND ledger data exists. Phase 8 remains blocked by Q-006's remaining event evidence, Q-010, Q-011, and other applicable security/production gates. No wallet posting, callback endpoint, wager, payment, or Production activation is added by this review.
