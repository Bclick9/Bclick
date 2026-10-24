# Q-013 deployed runtime evidence procedure

Date prepared: 2026-10-24  
Status: **procedure and test coverage only — not deployment acceptance**

This adds a repeatable probe for the still-missing evidence in Issue #159. It does not claim that a staging or production server was reachable from this change, and it must not be used to close Q-013 before its output and a real-browser check are reviewed.

## Work already present on main (do not repeat)

- PR #163 added API-only response headers, explicit Fastify `trustProxy: false`, exact `BCLICK_ALLOWED_HOSTS` validation, application Host rejection, related tests and an API-only Caddy example.
- PRs #164, #165, #166, #167 and #168 document or adjust the WinHouse `embed.js` integration. They do not prove the browser loaded the script under the effective storefront CSP.
- The example at `infra/caddy/Caddyfile.example` serves API paths only. It is not the storefront-serving layer and is not evidence of storefront headers.

This change adds tests for exact Host authority/port matching and exact-Origin port/hostname rejection, plus a runtime probe for the deployed storefront/API path.

## Run against the actual deployment

Use the canonical HTTPS storefront and API URLs from the staging/production deployment record. Do not use localhost, a Vite development server, or the API-only Caddy example as a substitute for the deployed storefront.

PowerShell example (replace the values before executing):

~~~powershell
$env:BCLICK_Q013_ENV = "staging"
$env:BCLICK_DEPLOYED_COMMIT_SHA = "40_CHARACTER_SHA_FROM_THE_DEPLOYMENT_RECORD"
$env:BCLICK_STOREFRONT_URL = "https://STAGING_STOREFRONT_HOST"
$env:BCLICK_API_URL = "https://STAGING_API_HOST"
# Set this only when the approved admin browser origin differs from the storefront origin:
$env:BCLICK_ADMIN_ORIGIN = "https://STAGING_ADMIN_ORIGIN"
# Leave unset when Bclick pages must not be framed; this defaults to 'none'.
$env:BCLICK_EXPECTED_FRAME_ANCESTORS = "'none'"
$env:BCLICK_Q013_EVIDENCE_PATH = "docs/evidence/q013-staging-2026-10-24-SHORTSHA.json"
node scripts/verify-q013-runtime.mjs
~~~

Choose a new, non-existing evidence filename because the probe refuses to overwrite existing files. Use the deployment system's recorded deployed commit SHA; the script cannot independently prove which commit a remote server is serving. Cross-check that SHA with the release/deployment record before accepting the evidence.

The probe requests the storefront root, `/sports`, the API health route and private player session route. It captures only a small allowlist of security/cache headers. It does not record response bodies, cookies, Authorization, request bodies, query strings or fragments. CSP nonce values are redacted before evidence is written. It also tests:

- HTTP response CSP, including explicit `script-src`, effective `script-src-elem`, `frame-src`, and the separately scoped `frame-ancestors` directive;
- HTTPS HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and framing headers;
- fetch reachability for `https://iframe.winhouse.bet/embed.js`;
- rejection of a forged Host and unexpected Host port even when forwarded headers claim an approved Host;
- the effect of spoofed `X-Forwarded-Host` / `Forwarded` with an approved original Host;
- rejection of unapproved Origin values and Origin ports on player/admin login before any credential processing, using synthetic values only;
- `Cache-Control: no-store` on the private session route.

A successful script run reports `RUNTIME_PROBES_PASS_BROWSER_CONFIRMATION_REQUIRED`, **not Q-013 accepted**. The `frame-ancestors` expectation defaults to `'none'`; only change it when the project's approved embedding requirement is written down and reviewed. Wildcard ancestors are prohibited.

## Required browser evidence before acceptance

From a supported browser against the same deployment and commit, inspect `/sports` and retain a redacted screenshot or network/console export showing:

1. The actual storefront response CSP and the successful Network request for `embed.js` from `https://iframe.winhouse.bet`.
2. The generated cross-origin WinHouse frame loads and there are no CSP violations in the console.
3. The effective `frame-src` and `frame-ancestors` behavior matches the approved requirements.
4. The fixed Bclick mobile navigation does not make the provider Betslip unreachable.

Redact all cookie headers, session material, provider tokens and query strings before attaching evidence. Do not attach browser storage dumps. Record the browser/version, timestamp, environment, deployed commit, checked URLs (without query strings), raw relevant response-header values (with any CSP nonce redacted), exact test outcomes and any proxy-generated differences.

## Acceptance boundary

Keep Issue #159 open until the evidence artifact is reviewed and a real-browser check is attached. If no approved staging/production endpoint or deployment commit can be supplied, report the deployment portion as **BLOCKED / NOT RUN** rather than accepting source tests as runtime proof. This note does not enable provider wallet callbacks or any real-money operations.
