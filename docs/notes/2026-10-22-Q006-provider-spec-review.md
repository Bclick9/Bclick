# Q-006 — Provider specification fingerprint and contract review

**Review date:** 2026-10-22  
**Gate status:** **Q-006 OPEN / P0 — partially evidenced.** Exact source-artifact identification is complete for the two files listed below. Provider-contract acceptance, owner approval, and required golden fixture evidence are not complete.  
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

## 3. BigBang money contract — unresolved P0 clarification

The supplied v1.10 brief specifies a body field `signature` using HMAC-SHA256 with the API key over the separator-free concatenation `username + amount + game + game_category + transaction_id`; `amount` uses shortest JavaScript-number string form. It explicitly treats fields such as `round_id`, `type`, `round_end`, `bet_amount`, `win_amount`, `game_id`, `provider_id`, and `sandbox` as outside that signature. It also documents `amount: 0`, a `400 { error: "insufficient balance" }` refusal for BigBang, and duplicate movement retries with the same `transaction_id`.

However, the canonical planning record `docs/planning/03-provider-integrations.md` notes earlier HTML documentation describing an optional `X-Body-Signature` and different coverage of `bet_amount`/`win_amount` (P-04). The files are not enough to conclude whether the delivered v1.10 brief supersedes that earlier header contract for the actual tenant/key. Before implementing a BigBang wallet callback, obtain a written vendor answer and test-only signed vectors that cover every enabled callback shape, zero-amount round close, same-ID replay, conflicting same-ID payload, and insufficient balance. Do not silently choose one signature contract.

## 4. WinHouse 2026-09-20 — code/spec comparison

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

The brief's wallet callback schema lists `action: bet | win`, while its read-side ticket fields describe payouts including cash-out amounts or refunded stakes. It does not fully define in the callback section how cashout, cancellation, and refund movements are distinguished and linked to tickets/transactions, nor does the file supply tenant-generated signature vectors. Get written answers plus sanitized fixtures for cashout, cancellation, refund, out-of-order delivery, duplicate/conflicting IDs, session end/account switch, and ticket ownership before implementing Model B. Do not use ticket status alone as a wallet instruction.

## 5. Currency precision — Q-009 remains a separate hard gate

Both supplied briefs describe money as **two-decimal** amounts. That is not evidence of TND millime (three-decimal) fidelity. Until each provider confirms TND precision in writing and supplies test-only balance/stake/debit/win/refund/ticket/reconciliation fixtures containing a third fractional digit, **do not route TND real-money play to that provider**. No rounding or truncation assumption is accepted.

## 6. Fixture/evidence matrix

| Evidence area | Present in repository | Quality / remaining need |
|---|---|---|
| BigBang catalog success envelope | `server/test/fixtures/bigbang-games-page-1.json` | Documentation-derived from the pinned example; not a tenant response |
| BigBang page traversal / total drift / duplicate IDs / malformed response / HTTP and retry paths | `server/test/bigbang.test.ts` | Synthetic test doubles; useful regression tests, not vendor golden evidence |
| BigBang demo launch | `server/test/bigbang.test.ts` | Synthetic response and URL-safety checks |
| WinHouse embed | `frontend/pages/Sports.tsx` | Code exists; tenant allow-list/CSP/mobile behavior requires environment acceptance |
| WinHouse launch token and wallet callbacks | No server routes currently exist | Correctly out of scope; create contract fixtures and tests only after the owner authorizes the wallet phase and vendor questions are resolved |
| Provider-originated signed vectors for either provider | Not present | Required before any real-money callback implementation |

## 7. Gate decision and next actions

**Q-006 stays OPEN/P0.** The exact artifact filenames, versions, source URLs, and SHA-256 fingerprints are now recorded, and the source-to-code review is documented. Do not mark the gate closed yet because owner approval, provider-originated fixtures, and the signature/currency/event clarifications listed above are missing.

Next safe actions are documentation/fixture work and written vendor due diligence only. Phase 8 remains blocked by Q-010 and Q-011 in addition to Q-006 and Q-009. No wallet posting, callback endpoint, wager, payment, or Production activation is added by this review.
