# Bclick provider evidence index — TND precision

## Accepted decision

- Bclick's accepted TND accounting/API scale is **2 decimal places**: `0.01 TND = 10 millimes`.
- **BigBang Casino:** an amount with more than two fractional digits is rounded half away from zero to `0.01 TND` before sending; a movement whose rounded amount is zero is not sent.
- **WinHouse Sportsbook:** a stake with more than two fractional digits is rejected as `invalid_stake_precision` and nothing is debited; payouts are rounded to `0.01 TND`.
- **Aggregator is not covered by this confirmation.** Its integer `amount`/`balance` wire scale remains a separate open gate; do not infer it from BigBang/WinHouse.

## Canonical evidence files

- Canonical vendor-supplied source JSON is preserved in the Project Library at `/Bclick/provider-evidence/tnd-2dp-vendor-fixtures.json` (SHA-256 `8f41e3c2336d1905241251f937d6b9cd548305922d439ebda3c67e15e60ccba0`, 4,793 bytes). Byte-identical repeated uploads are archived under `/Bclick/provider-evidence/archive/`.
- The canonical executable repository fixture is [`server/test/fixtures/tnd-wallet-provider-vectors.json`](../../server/test/fixtures/tnd-wallet-provider-vectors.json).
- Signature, balance, precision and refusal tests are in [`server/test/provider-tnd-fixtures.test.ts`](../../server/test/provider-tnd-fixtures.test.ts).
- Accepted decision: [`docs/notes/2026-10-22-Q009-tnd-precision-decision.md`](../notes/2026-10-22-Q009-tnd-precision-decision.md).
- Reconciliation checkpoint: [`docs/notes/2026-10-24-Q009-precision-and-phase11-reconciliation.md`](../notes/2026-10-24-Q009-precision-and-phase11-reconciliation.md).

The source JSON explicitly labels `dummy_secret` as a test fixture. Never use it in a real environment. Do not create another copy of the provider fixture in a new folder: update the canonical test fixture and its signature tests together when a vendor supplies a new authoritative vector, and record source date/revision plus review outcome in the Q-009 note.

## Aggregator compatibility rule

Do not assume Aggregator uses either 2dp or 3dp. Its integer `amount`/`balance` scale remains unknown until written vendor confirmation and exact wire fixtures are reviewed. Third-decimal inputs are boundary probes to learn acceptance/rounding/refusal, not a requirement that the provider preserve millimes. If Aggregator confirms a compatible 2dp wire contract, 2dp alone does not block compatibility with Bclick's accepted TND=2 ledger; every other provider/security/idempotency/reconciliation/release gate still applies.

## Evidence boundary

These vectors prove only the sample bet/win signatures, balances, and stated precision/rounding/refusal behavior. They do **not** settle every callback type, conflicting duplicate handling, idempotency, refunds/cashouts, player/session mapping, source/game eligibility, sandbox reconciliation, or production readiness.

Keep Q-006, Q-010, Q-011, Q-013, Q-004, applicable compliance, and deployment/release approval independent. Passing these fixtures must not enable a live callback, wager, payment, FX, wallet posting, or other real-money path.


## Versioned source artifacts recorded for Q-006

The following byte-level SHA-256 values were computed from the exact source files available in the Project Library on **2026-10-24**. They identify the archived local artifacts; they are **not** proof that a message was sent to a vendor, that a given vendor authored each byte, or that tenant-specific production settings have been confirmed.

| Artifact | Library version | Size (bytes) | SHA-256 | Provenance / status |
|---|---:|---:|---|---|
| `BIGBANG_AGENT.md` | 1 | 20,552 | `60b7b046dd1f56cbd4cf3577b349fe9f1ffbde3b2df1538d6ece7c2368b59b74` | Project Library artifact; match against vendor-issued revision/delivery record |
| `WINHOUSE_AGENT.md` | 1 | 23,021 | `00de9e66c76627eee31af1f9ccba93371432abfffebff39d026d512e53dc2d6b` | Project Library artifact; match against vendor-issued revision/delivery record |
| `tnd-2dp-vendor-fixtures.json` | 1 | 4,793 | `8f41e3c2336d1905241251f937d6b9cd548305922d439ebda3c67e15e60ccba0` | Source fixture in the Project Library; `dummy_secret` is test-only |

The Q-006 issue is the correspondence/evidence log: record the real recipient or authenticated support channel, sent timestamp, ticket/message identifier, exact attachment version/hash, and response artifact. As of this manifest update, **no send timestamp, recipient, or provider ticket has been evidenced here; do not mark correspondence sent**. Never store callback tokens, API keys, or production secrets in the repository or issue body.

## Documented contracts versus remaining provider gates

- The BigBang agent describes `balance_change` HMAC-SHA256 over `username + amount + game + game_category + transaction_id`, without separators, using the amount's shortest JavaScript-style decimal representation. It also documents stable `transaction_id` retries and atomic database posting. The optional raw-body `X-Body-Signature` requirement and tenant configuration need separate confirmation before implementing that check.
- The WinHouse agent describes a separate callback query token and wallet API key, HMAC-SHA256 over `username + amount + action + ticket_id + transaction_id` without separators, on-wire amount stringification, constant-time comparison, idempotent same-payload retries, conflicting-duplicate refusal, atomic posting, and overdraft refusal. Confirm the tenant's enabled seamless-wallet model, domain/IP allow-listing, key rotation, and reconciliation/support process from actual tenant/vendor evidence.
- The source docs and TND fixture are baselines, not blanket evidence that every callback variant, retry/out-of-order case, reversal/cashout, player/session mapping, sandbox reconciliation, or production release control is closed. Keep Q-006, Q-010, Q-011 and Q-013 as independent gates.


## WinHouse public docs reconciliation (2026-10-24)

The live human-readable guide was reviewed against the archived `WINHOUSE_AGENT.md` Library snapshot. The comparison records the loader/CSP/mobile sizing baseline, the `data-hide` documentation mismatch, and the unsupported betslip/count/bottom-nav/route hooks that require explicit provider evidence: [WinHouse public documentation review](./winhouse-public-docs-review-2026-10-24.md). This is a local evidence note only; no provider message is claimed sent.


## Current official agent documentation URLs (checked 2026-10-24)

The Project Owner identified these live, official machine-readable documents as the current integration sources; use them directly rather than asking either provider to resend generic agent specs:

- **WinHouse:** https://iframe.winhouse.bet/docs/agent.md (the official human-readable index at https://iframe.winhouse.bet/docs links to this machine-readable contract).
- **BigBang Casino:** https://api.bigbangcasino.bet/docs/agent.md (the official human-readable index at https://api.bigbangcasino.bet/docs/ links to this machine-readable contract; the current API guide lists changelog v1.11, Oct 2026).

The public guide retrieval exposed rendered contract text but the raw `text/markdown` file was not independently downloaded for exact-byte hashing in this review. Do not invent or reuse a SHA-256 for these live URLs; the old Library snapshots' hashes remain fingerprints of those archived bytes only. A future exact-byte hash may be recorded only after the URL is successfully downloaded and hashed.

The current WinHouse public JavaScript surface is `window.WinHouseEmbed = { frame, refit(), setLaunch(token), logout() }`. The official guide does not document `openBetslip` or `selectionCount`. Current Bclick code does not reference those legacy helpers, and frontend regression coverage now prevents reintroducing them. They are out of scope and are not questions to send to WinHouse.

The accepted Q-009 decision remains **TND=2dp, EUR=2dp and USD=2dp**. The Project Owner reconfirmed on 2026-10-24 that the TND decision is supported by a separate official legal document held by the Owner. The legal document has not been uploaded or byte-fingerprinted in this repository, so this note records the Owner's decision and does not claim an independent review of that unseen file. No code change to reopen the currency scale is required; historical migration 006 remains historical and migration 008 is the forward-only transition to the accepted two-decimal registry.
