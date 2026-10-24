# Q-013 application/proxy security baseline (2026-10-24)

This is an implementation baseline, not closure evidence for Q-013.

## Implemented in this change

- The Fastify API emits a restrictive JSON/API response policy: `default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`, plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`.
- Fastify `trustProxy` is explicitly `false`; security decisions use the incoming `Host` authority and never use client-supplied `X-Forwarded-Host` or `Forwarded`.
- `BCLICK_ALLOWED_HOSTS` is parsed as a comma-separated list of exact host authorities, optionally including a port. Wildcards, paths, userinfo, whitespace, malformed authorities, and invalid ports are rejected. The setting is mandatory in staging/production and remains optional for local/test compatibility.
- The example Caddy site adds the API-only baseline headers and HSTS at the TLS-terminating proxy. The Caddy file is an example, not evidence of the deployed values.

## Known acceptance gaps — keep Q-013 open

- This Caddy example currently proxies API paths only and does not serve the storefront or Backoffice. Therefore it cannot prove CSP on Bclick pages nor prove that the WinHouse `https://iframe.winhouse.bet/embed.js` loader and its generated iframe work under the effective storefront CSP.
- The storefront-serving layer must separately define and test the narrow `script-src` allowance for `https://iframe.winhouse.bet`, plus the actual `frame-src` requirement. The API `frame-ancestors 'none'` policy applies to API responses only and is not a substitute for a storefront policy.
- No staging/prod endpoint or proxy access was available for this static change. Effective response headers, raw redacted captures, proxy routing, HSTS delivery, unapproved Host behavior at Caddy, and browser-based embed loading remain unverified.
- HSTS deliberately omits `includeSubDomains` and `preload` until DNS/subdomain coverage and deployment ownership are confirmed.

## WinHouse embed.js review (2026-10-24)

Reviewed the current public integration guide at https://iframe.winhouse.bet/docs. The published guide says the `embed.js` loader creates and sizes its internal cross-origin iframe. That is the selected integration pattern; seeing an iframe in browser developer tools is expected and does not mean Bclick manually owns the iframe element.

The loader options relevant to Bclick are:
- `data-key`, `data-target`, `data-width`, and `data-height`.
- On phones the loader computes the visible height; `data-height` is the desktop height. The actual Bclick fixed navigation height must be subtracted using `data-bottom-gap`.
- `data-embed=1` removes WinHouse's top bar and left rail. The documented `data-hide` values (`favorites,clock,settings`) apply to header controls only.
- The documented `window.WinHouseEmbed` surface is `frame`, `refit()`, `setLaunch(token)`, and `logout()`.
- WinHouse's own page response supplies its `frame-ancestors` based on the vendor-side domain allow-list. This is separate from Bclick's own CSP and from Bclick's `frame-src`.

For a Bclick storefront-serving layer, merge the following narrow source allowances into the site's existing CSP rather than replacing unrelated policies:
```
script-src ... https://iframe.winhouse.bet
frame-src ... https://iframe.winhouse.bet
```
Do not infer a complete policy from these two directives. The API-only Caddy example and API's `frame-ancestors 'none'` do not configure or validate the frontend CSP.

### Unsupported provider controls to confirm

The public guide's `data-hide` option removes only the documented header controls `favorites`, `clock`, and `settings`. It does not document an option to hide the entire `.subbar` or its `.mainnav` links (`Sports`, `Live`, `My Bets`). It also does not document:
- a command to open the provider betslip,
- a public betslip selection-count property,
- a way to hide/remove the provider's bottom tab bar from inside its frame,
- or the current `#...` route-fragment convention used by Bclick's nav.

The frontend currently treats optional `openBetslip`/selection-count properties as best-effort compatibility only; they are not contract-backed and must not be claimed as accepted behavior. Until WinHouse confirms supported equivalents, do not manipulate cross-origin DOM or invent postMessage commands. Q-006 remains the appropriate evidence track for these questions.

### Verification still required

- CI verifies the static integration helper, app build, and tests; it cannot prove the live provider key/domain allow-list.
- A real browser check on the deployed storefront must confirm the loader script is allowed by the actual CSP, the generated frame is allowed by `frame-src`, and the vendor page accepts Bclick's registered domain. Verify the site bottom nav visually covers the provider bottom nav at phone sizes and explicitly test Betslip reachability. Because this is an overlay, a hidden provider control is not available through the iframe unless WinHouse exposes a supported action from the parent.
- Keep this note as implementation guidance, not proof that WinHouse delivered or approved the current public contract. No provider communication is claimed by this note.
