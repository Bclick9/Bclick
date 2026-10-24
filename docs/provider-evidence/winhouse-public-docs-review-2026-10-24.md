# WinHouse public integration documentation review — 2026-10-24

## Sources compared

| Source | Version/date context | Use in this review |
|---|---|---|
| Project Library `WINHOUSE_AGENT.md` | Embedded version string: `2026-09-20`; byte size 23,021; SHA-256 `00de9e66c76627eee31af1f9ccba93371432abfffebff39d026d512e53dc2d6b` | The project’s archived agent-oriented integration contract |
| Public integration guide | https://iframe.winhouse.bet/docs, reviewed 2026-10-24 | The current human-readable public guide, including loader, sizing, CSP, account models, SSO, seamless wallet, and troubleshooting |

The direct live URL https://iframe.winhouse.bet/docs/agent.md was not readable by the web retrieval interface in this run because it served `text/markdown`; the Library snapshot was read in full, and the public guide explicitly describes itself as the human-readable counterpart. Do not claim that this review re-fingerprinted the live markdown file or that the provider confirmed the Library bytes are its currently approved revision.

## Embed contract established by the two sources

- Use the official `https://iframe.winhouse.bet/embed.js` loader; it creates the cross-origin iframe internally. A frame appearing in browser developer tools is expected and is not a manually authored iframe integration.
- The loader owns phone-visible height calculation. `data-height` is the desktop height; `data-bottom-gap` subtracts the customer's fixed bottom navigation on phones. A fixed customer navigation must be accounted for so the provider tabs and betslip remain reachable.
- `data-embed=1` hides WinHouse's top bar and left rail.
- The documented public JavaScript surface is `window.WinHouseEmbed = { frame, refit(), setLaunch(token), logout() }`.
- The current public guide explicitly calls out `frame-src https://iframe.winhouse.bet`. Separately, because `embed.js` is loaded as an external script from that origin, any storefront CSP that restricts scripts must permit that origin under the applicable `script-src` directive too. The guide's example is not a complete site CSP.
- WinHouse's `frame-ancestors` policy is emitted by the provider book and is driven by its own Domain allow-list, with a documented exception for server-IP-locked keys. This is separate from Bclick's CSP and from Bclick's own `frame-src`.

## Material discrepancy between archived agent file and current guide

The current public guide documents `data-hide="favorites,clock,settings"` for removing the named **header** controls. The archived `WINHOUSE_AGENT.md` version dated 2026-09-20 does not include `data-hide` in its loader attribute table. Treat `data-hide` as a feature documented by the currently published human-readable guide, but keep a provenance/version confirmation open with WinHouse before treating it as guaranteed across loader deployments.

Neither the archived agent file nor the current public guide documents:
- `WinHouseEmbed.openBetslip()`;
- a public `selectionCount` or `totalOdds` field;
- a documented method to hide the provider's bottom tab navigation;
- Bclick's current `#...` route fragment convention for Live/My Bets/Favorites/Search.

Do not infer these as supported just because a frontend can feature-detect them or because a fragment appears to work in a local session. Preserve the existing UI only as best-effort/unverified compatibility until a provider-issued answer or documented public contract settles it. Do not manipulate cross-origin DOM or invent a `postMessage` command.

## Correct account-model sequencing for Bclick

Bclick intends to retain its own player identity and wallet, so the intended eventual model is **Model B (seamless wallet)**. This decision does not authorize implementing or enabling it before the identity, security, wallet ledger, provider evidence, reconciliation, and restore gates are accepted.

Follow the documented order:
1. Embed the loader, confirm the registered domain and the actual storefront CSP.
2. Only after identity/security gates authorize it, implement server-side launch-token minting; never expose the wallet API key to the browser.
3. Only after ledger/provider acceptance, implement server-to-server `user-data` and `balance-change` with separate callback token and wallet API key, exact HMAC construction, constant-time token/signature comparison, idempotent `transaction_id`, atomic posting, conflict refusal, and overdraft protection.
4. Self-test retries, conflicting duplicates, signature/token failures, overdraft refusal, and prompt replies. A local disposable fixture test is not a live-provider approval.

## Current implementation state

PR #164 (merged as `18d77ba903d5cfc098eb5024c9b6b3fc00974b6f`) measures Bclick's actual visible fixed sports navigation and feeds that size to the loader's `data-bottom-gap`. Tests cover visible, hidden, and invalid measurements. The live provider/domain/CSP browser check is still outstanding, so Q-013 remains open. Q-006 remains open for vendor provenance, the `data-hide` version difference, unsupported UI controls/routing, tenant settings, callback/reconciliation evidence, and authenticated provider responses.

No vendor correspondence is claimed to have been sent by this review.
