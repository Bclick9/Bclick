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
