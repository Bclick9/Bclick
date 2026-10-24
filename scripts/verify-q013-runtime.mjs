#!/usr/bin/env node
// Runtime Q-013 probe. Sends no cookies, credentials, or provider API keys.
// It deliberately records only an allowlist of response headers.
import assert from 'node:assert/strict';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';

const WINHOUSE_SCRIPT = 'https://iframe.winhouse.bet/embed.js';
const MIN_HSTS_SECONDS = 31536000;
const SAFE_HEADERS = new Set([
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'cache-control',
  'access-control-allow-origin',
  'location',
  'content-type',
]);

const checks = [];
const observations = [];

function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail: String(detail) });
}

function safeUrl(value) {
  const url = new URL(value);
  return url.origin + url.pathname;
}

function parseRequiredHttpsBase(name) {
  const raw = process.env[name];
  if (!raw) throw new Error(name + ' is required');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error(name + ' must use HTTPS');
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(name + ' must not contain credentials, query parameters, or a fragment');
  }
  return url;
}

function responseHeaders(rawHeaders, requestUrl) {
  const result = Object.create(null);
  for (let i = 0; i + 1 < rawHeaders.length; i += 2) {
    const name = String(rawHeaders[i]).toLowerCase();
    if (!SAFE_HEADERS.has(name)) continue;
    let value = String(rawHeaders[i + 1]).trim();
    if (name === 'content-security-policy') {
      // Preserve policy structure while ensuring a per-response nonce is never committed as evidence.
      value = value.replace(/'nonce-[^']+'/gi, "'nonce-[REDACTED]'");
      value = value.replace(/(https?:\/\/[^?\s;'"]+)\?[^;\s,'"]*/gi, '$1?[QUERY_REDACTED]');
      value = value.replace(/(https?:\/\/[^#\s;'"]+)#[^;\s,'"]*/gi, '$1#[FRAGMENT_REDACTED]');
    }
    if (name === 'location') {
      try {
        const location = new URL(value, requestUrl);
        value = location.origin + location.pathname; // Drop query and fragment.
      } catch {
        value = '[unparseable location redacted]';
      }
    }
    if (!result[name]) result[name] = [];
    result[name].push(value);
  }
  return result;
}

function requestOnce(input, options = {}) {
  const url = new URL(input);
  if (url.protocol !== 'https:') return Promise.reject(new Error('Only HTTPS probes are permitted'));
  return new Promise((resolve, reject) => {
    const headers = Object.assign({
      'user-agent': 'Bclick-Q013-runtime-verifier/1.0',
      accept: '*/*',
    }, options.headers || {});
    const request = https.request(url, {
      method: options.method || 'GET',
      headers,
      servername: url.hostname,
      rejectUnauthorized: true,
      timeout: 10000,
    }, (response) => {
      const snapshot = responseHeaders(response.rawHeaders || [], url.href);
      response.resume(); // Consume the response but never persist response bodies.
      response.on('end', () => resolve({
        statusCode: response.statusCode || 0,
        headers: snapshot,
      }));
    });
    request.setTimeout(10000, () => request.destroy(new Error('HTTPS request timed out')));
    request.on('error', reject);
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
}

async function capture(name, url, options) {
  try {
    const response = await requestOnce(url, options);
    const observation = {
      name,
      url: safeUrl(url),
      statusCode: response.statusCode,
      headers: response.headers,
    };
    observations.push(observation);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown request failure';
    check(name + ' request completed', false, message.replace(/https?:\/\/\S+/g, '[URL redacted]'));
    return null;
  }
}

function headerValues(response, name) {
  return response && response.headers[name.toLowerCase()] ? response.headers[name.toLowerCase()] : [];
}

function exactHeader(response, name, expected) {
  const values = headerValues(response, name);
  return values.length > 0 && values.every((value) => value.trim().toLowerCase() === expected.toLowerCase());
}

function secureReferrerPolicy(response) {
  const accepted = new Set([
    'no-referrer',
    'same-origin',
    'strict-origin',
    'strict-origin-when-cross-origin',
  ]);
  const values = headerValues(response, 'referrer-policy');
  return values.length > 0 && values.every((value) => accepted.has(value.trim().toLowerCase()));
}

function hstsIsStrong(response) {
  const values = headerValues(response, 'strict-transport-security');
  return values.length > 0 && values.every((value) => {
    const match = value.match(/(?:^|;)\s*max-age\s*=\s*(\d+)/i);
    return Boolean(match && Number(match[1]) >= MIN_HSTS_SECONDS);
  });
}

function parsePolicy(policy) {
  const directives = new Map();
  for (const rawDirective of policy.split(';')) {
    const parts = rawDirective.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    const name = parts[0].toLowerCase();
    // CSP ignores later duplicate directives; preserve that behavior for the check.
    if (!directives.has(name)) directives.set(name, parts.slice(1));
  }
  return directives;
}

function cspPolicies(response) {
  const headers = headerValues(response, 'content-security-policy');
  return headers.flatMap((value) => value.split(',')).map((value) => parsePolicy(value));
}

function sourceMatchesWinHouse(source) {
  try {
    const url = new URL(source);
    return url.protocol === 'https:'
      && url.hostname.toLowerCase() === 'iframe.winhouse.bet'
      && !url.username
      && !url.password
      && !url.port
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function hasBroadSource(source) {
  const normalized = source.toLowerCase();
  return normalized === '*'
    || normalized === 'http:'
    || normalized === 'https:'
    || normalized === 'data:'
    || normalized === 'blob:'
    || normalized === "'unsafe-inline'"
    || normalized === "'unsafe-eval'"
    || /^https?:\/\/\*\./.test(normalized)
    || /^\*\./.test(normalized);
}

function expectedAncestors() {
  const raw = process.env.BCLICK_EXPECTED_FRAME_ANCESTORS || "'none'";
  const values = raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (values.length === 0 || values.includes('*')) {
    throw new Error('BCLICK_EXPECTED_FRAME_ANCESTORS must be an explicit non-wildcard list; default is none');
  }
  return values.sort();
}

function checkCommonHeaders(name, response, expectedFrames) {
  if (!response) return;
  check(name + ': status 200', response.statusCode === 200, 'HTTP ' + response.statusCode);
  check(name + ': X-Content-Type-Options', exactHeader(response, 'x-content-type-options', 'nosniff'),
    JSON.stringify(headerValues(response, 'x-content-type-options')));
  check(name + ': Referrer-Policy is an explicit restrictive value', secureReferrerPolicy(response),
    JSON.stringify(headerValues(response, 'referrer-policy')));
  check(name + ': HSTS at HTTPS edge', hstsIsStrong(response),
    JSON.stringify(headerValues(response, 'strict-transport-security')));
  const policies = cspPolicies(response);
  check(name + ': Content-Security-Policy present', policies.length > 0, 'policy count=' + policies.length);
  const frameOptions = headerValues(response, 'x-frame-options').map((value) => value.trim().toLowerCase());
  let frameOptionsAccepted = false;
  if (JSON.stringify(expectedFrames) === JSON.stringify(["'none'"])) {
    frameOptionsAccepted = frameOptions.length > 0 && frameOptions.every((value) => value === 'deny');
  } else if (JSON.stringify(expectedFrames) === JSON.stringify(["'self'"])) {
    frameOptionsAccepted = frameOptions.length > 0 && frameOptions.every((value) => value === 'sameorigin');
  } else {
    // X-Frame-Options cannot express an arbitrary origin allow-list; DENY would conflict with CSP.
    frameOptionsAccepted = frameOptions.length === 0;
  }
  check(name + ': X-Frame-Options does not contradict approved ancestors', frameOptionsAccepted,
    JSON.stringify(frameOptions));
  if (policies.length > 0) {
    const ancestorChecks = policies.map((policy) => {
      const actual = (policy.get('frame-ancestors') || []).map((item) => item.toLowerCase()).sort();
      return JSON.stringify(actual) === JSON.stringify(expectedFrames);
    });
    check(name + ': frame-ancestors matches approved embedding requirement',
      ancestorChecks.every(Boolean),
      'expected=' + JSON.stringify(expectedFrames) + '; actual=' + JSON.stringify(
        policies.map((policy) => policy.get('frame-ancestors') || []),
      ));
    const wildcardFound = policies.some((policy) => [...policy.values()].flat().some((source) => {
      const value = source.toLowerCase();
      return value === '*' || /^\*\./.test(value) || /^https?:\/\/\*\./.test(value);
    }));
    check(name + ': no wildcard CSP source', !wildcardFound, 'wildcard source present=' + wildcardFound);
  }
}

function checkStorefrontCsp(name, response) {
  if (!response) return;
  const policies = cspPolicies(response);
  if (policies.length === 0) return;
  const scriptChecks = [];
  const scriptElementChecks = [];
  const frameChecks = [];
  const weakSourceChecks = [];
  for (const policy of policies) {
    const scriptSources = policy.get('script-src') || [];
    const scriptElementSources = policy.get('script-src-elem') || scriptSources;
    const scriptAttributeSources = policy.get('script-src-attr') || [];
    const frameSources = policy.get('frame-src') || [];
    scriptChecks.push(scriptSources.some(sourceMatchesWinHouse));
    // script-src-elem, when present, overrides script-src for external <script> elements.
    scriptElementChecks.push(scriptElementSources.some(sourceMatchesWinHouse));
    frameChecks.push(frameSources.some(sourceMatchesWinHouse));
    weakSourceChecks.push(
      !scriptSources.some(hasBroadSource)
      && !scriptElementSources.some(hasBroadSource)
      && !scriptAttributeSources.some(hasBroadSource)
      && !frameSources.some(hasBroadSource),
    );
  }
  check(name + ': explicit script-src permits official WinHouse loader origin',
    scriptChecks.every(Boolean), 'all effective policies must permit https://iframe.winhouse.bet');
  check(name + ': effective script-src-elem permits official loader',
    scriptElementChecks.every(Boolean), 'script-src-elem overrides script-src when present');
  check(name + ': explicit frame-src permits WinHouse frame origin',
    frameChecks.every(Boolean), 'all effective policies must permit https://iframe.winhouse.bet');
  check(name + ': no broad script/frame sources or unsafe-inline/unsafe-eval',
    weakSourceChecks.every(Boolean), 'checked script-src, script-src-elem, script-src-attr and frame-src in every effective policy');
}

function alternatePortOrigin(origin) {
  const url = new URL(origin);
  const currentPort = url.port || '443';
  const alternate = currentPort === '8443' ? '9443' : '8443';
  return url.protocol + '//' + url.hostname + ':' + alternate;
}

function apiAuthority(url) {
  return url.host; // Include an explicitly configured port: the allowlist is an exact authority.
}

async function run() {
  const environment = process.env.BCLICK_Q013_ENV;
  if (!['staging', 'production'].includes(environment || '')) {
    throw new Error('BCLICK_Q013_ENV must be staging or production');
  }
  const deployedCommit = process.env.BCLICK_DEPLOYED_COMMIT_SHA || '';
  if (!/^[0-9a-f]{40}$/i.test(deployedCommit)) {
    throw new Error('BCLICK_DEPLOYED_COMMIT_SHA must be the 40-character SHA reported by the deployment system');
  }

  const storefrontBase = parseRequiredHttpsBase('BCLICK_STOREFRONT_URL');
  const apiBase = parseRequiredHttpsBase('BCLICK_API_URL');
  const frames = expectedAncestors();
  const adminOrigin = process.env.BCLICK_ADMIN_ORIGIN
    ? parseRequiredHttpsBase('BCLICK_ADMIN_ORIGIN').origin
    : storefrontBase.origin;
  const rootUrl = new URL('/', storefrontBase).href;
  const sportsUrl = new URL('/sports', storefrontBase).href;
  const apiHealthUrl = new URL('/api/v1/health/live', apiBase).href;
  const privateSessionUrl = new URL('/api/v1/auth/session', apiBase).href;
  const spoofedOrigin = 'https://q013-untrusted.invalid';

  let sourceCommit = process.env.GITHUB_SHA || process.env.BCLICK_SOURCE_COMMIT_SHA || '';
  if (!/^[0-9a-f]{7,40}$/i.test(sourceCommit)) {
    try {
      sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      sourceCommit = 'not-available';
    }
  }

  const root = await capture('storefront-root', rootUrl);
  checkCommonHeaders('storefront-root', root, frames);
  checkStorefrontCsp('storefront-root', root);

  const sports = await capture('sports-page', sportsUrl);
  checkCommonHeaders('sports-page', sports, frames);
  checkStorefrontCsp('sports-page', sports);

  const provider = await capture('winhouse-loader-reachability', WINHOUSE_SCRIPT, {
    headers: { referer: rootUrl },
  });
  check('WinHouse embed.js reachable over HTTPS', Boolean(provider && provider.statusCode >= 200 && provider.statusCode < 300),
    provider ? 'HTTP ' + provider.statusCode : 'request failed');

  const health = await capture('api-health', apiHealthUrl);
  checkCommonHeaders('api-health', health, ["'none'"]);

  const session = await capture('private-session-cache-policy', privateSessionUrl);
  if (session) {
    check('private session route is implemented', [200, 401, 403].includes(session.statusCode),
      'HTTP ' + session.statusCode);
    const cacheValues = headerValues(session, 'cache-control');
    check('private session response is no-store',
      cacheValues.length > 0 && cacheValues.every((value) => /(?:^|,)\s*no-store(?:\s*(?:,|$))/i.test(value)),
      JSON.stringify(cacheValues));
  }

  const authority = apiAuthority(apiBase);
  const forwardedPositive = await capture('approved-host-with-spoofed-forwarded-headers', apiHealthUrl, {
    headers: {
      host: authority,
      'x-forwarded-host': 'q013-untrusted.invalid',
      forwarded: 'host="q013-untrusted.invalid";proto=http',
    },
  });
  check('untrusted Forwarded/X-Forwarded-Host cannot override approved Host',
    Boolean(forwardedPositive && forwardedPositive.statusCode === 200),
    forwardedPositive ? 'HTTP ' + forwardedPositive.statusCode : 'request failed');
  const forwardedLocation = headerValues(forwardedPositive, 'location').join(' ');
  check('forwarded spoof does not produce attacker-controlled redirect',
    !forwardedLocation.toLowerCase().includes('q013-untrusted.invalid'),
    forwardedLocation || 'no Location header');

  const wrongHost = await capture('unapproved-host-with-approved-forwarded-host', apiHealthUrl, {
    headers: {
      host: 'q013-untrusted.invalid',
      'x-forwarded-host': authority,
      forwarded: 'host="' + authority + '";proto=https',
    },
  });
  check('unapproved Host is rejected at app/proxy boundary',
    Boolean(wrongHost && wrongHost.statusCode >= 400 && wrongHost.statusCode < 500),
    wrongHost ? 'HTTP ' + wrongHost.statusCode + ' (expected 4xx, not a redirect)' : 'request failed');

  const alternatePort = apiBase.port === '1' ? '2' : '1';
  const wrongPortHost = apiBase.hostname + ':' + alternatePort;
  const wrongPort = await capture('unapproved-host-port', apiHealthUrl, {
    headers: { host: wrongPortHost },
  });
  check('unapproved Host port is rejected at app/proxy boundary',
    Boolean(wrongPort && wrongPort.statusCode >= 400 && wrongPort.statusCode < 500),
    wrongPort ? 'HTTP ' + wrongPort.statusCode + ' (expected 4xx, not a redirect)' : 'request failed');

  const originProbes = [
    { name: 'player-login-rejects-foreign-origin', url: new URL('/api/v1/auth/login', apiBase).href,
      origin: spoofedOrigin, body: JSON.stringify({ email: 'q013-runtime-probe@invalid.example', password: 'Q013-probe-not-a-credential' }) },
    { name: 'player-login-rejects-unapproved-origin-port', url: new URL('/api/v1/auth/login', apiBase).href,
      origin: alternatePortOrigin(storefrontBase.origin), body: JSON.stringify({ email: 'q013-runtime-probe@invalid.example', password: 'Q013-probe-not-a-credential' }) },
    { name: 'admin-login-rejects-foreign-origin', url: new URL('/api/v1/admin/auth/login', apiBase).href,
      origin: spoofedOrigin, body: JSON.stringify({ email: 'q013-runtime-probe@invalid.example', password: 'Q013-probe-not-a-credential' }) },
    { name: 'admin-login-rejects-unapproved-origin-port', url: new URL('/api/v1/admin/auth/login', apiBase).href,
      origin: alternatePortOrigin(adminOrigin), body: JSON.stringify({ email: 'q013-runtime-probe@invalid.example', password: 'Q013-probe-not-a-credential' }) },
  ];
  for (const item of originProbes) {
    const body = item.body;
    const response = await capture(item.name, item.url, {
      method: 'POST',
      headers: {
        host: authority,
        origin: item.origin,
        'content-type': 'application/json',
        'content-length': String(Buffer.byteLength(body)),
      },
      body,
    });
    check(item.name + ': returns 403 before credential processing',
      Boolean(response && response.statusCode === 403),
      response ? 'HTTP ' + response.statusCode : 'request failed; no credential or cookie supplied');
  }

  const failures = checks.filter((item) => !item.passed);
  const evidence = {
    schemaVersion: 1,
    task: 'Q-013 runtime header and trust-boundary probe',
    environment,
    capturedAt: new Date().toISOString(),
    deployedCommitSha: deployedCommit,
    sourceCommitSha: sourceCommit,
    targets: {
      storefront: storefrontBase.origin,
      api: apiBase.origin,
      approvedFrameAncestors: frames,
      adminOriginAssumption: adminOrigin,
    },
    observations,
    checks,
    failedCheckCount: failures.length,
    verdict: failures.length === 0
      ? 'RUNTIME_PROBES_PASS_BROWSER_CONFIRMATION_REQUIRED'
      : 'FAILED',
    browserConfirmationRequired: [
      'Open /sports in the approved supported browser and capture the Network entry showing embed.js loaded successfully from https://iframe.winhouse.bet.',
      'Confirm the generated WinHouse frame loads with no CSP violation in the browser console.',
      'Confirm the approved frame-ancestors behavior from the actual served response; do not infer it from source configuration.',
      'Check mobile navigation and Betslip reachability while WinHouse is loaded.',
    ],
    redaction: 'Response bodies, Set-Cookie, Cookie, Authorization, request bodies, query strings, and fragments are not recorded.',
  };

  const outputPath = process.env.BCLICK_Q013_EVIDENCE_PATH;
  if (outputPath) {
    const resolved = path.resolve(outputPath);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write('Evidence written to ' + resolved + '\n');
  }
  process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
  if (failures.length > 0) process.exitCode = 1;
}

function runSelfTests() {
  const captured = responseHeaders([
    'Content-Security-Policy',
    "default-src 'none'; base-uri 'none'; script-src 'self' https://iframe.winhouse.bet 'nonce-SHOULD_NOT_APPEAR'; script-src-elem 'self' https://iframe.winhouse.bet; frame-src https://iframe.winhouse.bet; frame-ancestors 'none'; report-uri https://report.example/security?token=QUERY_SECRET_SHOULD_NOT_APPEAR#fragment; form-action 'none'",
    'Set-Cookie',
    'session=SHOULD_NOT_APPEAR; HttpOnly',
    'Location',
    'https://bclick.example/sports?token=SHOULD_NOT_APPEAR#fragment',
  ], 'https://bclick.example/sports');

  assert.equal(captured['set-cookie'], undefined, 'Cookie headers are never captured');
  assert.match(captured['content-security-policy'][0], /'nonce-\[REDACTED\]'/);
  assert.equal(captured['content-security-policy'][0].includes('SHOULD_NOT_APPEAR'), false);
  assert.equal(captured['content-security-policy'][0].includes('QUERY_SECRET_SHOULD_NOT_APPEAR'), false);
  assert.deepEqual(captured.location, ['https://bclick.example/sports']);
  assert.equal(sourceMatchesWinHouse('https://iframe.winhouse.bet'), true);
  assert.equal(sourceMatchesWinHouse('https://eviliframe.winhouse.bet'), false);
  assert.equal(hasBroadSource('https:'), true);
  assert.equal(hasBroadSource("'unsafe-eval'"), true);

  const goodCsp = "default-src 'none'; base-uri 'none'; script-src 'self' https://iframe.winhouse.bet 'nonce-TEST'; script-src-elem 'self' https://iframe.winhouse.bet; frame-src https://iframe.winhouse.bet; frame-ancestors 'none'; form-action 'none'";
  const goodCspStart = checks.length;
  checkStorefrontCsp('self-test-valid-csp', { headers: { 'content-security-policy': [goodCsp] } });
  const goodCspChecks = checks.splice(goodCspStart);
  assert.ok(goodCspChecks.length > 0 && goodCspChecks.every((item) => item.passed),
    'exact WinHouse script/frame source should satisfy the policy check');

  const badCspStart = checks.length;
  checkStorefrontCsp('self-test-invalid-csp', {
    headers: {
      'content-security-policy': [
        "default-src 'none'; script-src https://*.winhouse.bet 'unsafe-eval'; script-src-elem 'self'; frame-src https:; frame-ancestors 'none'",
      ],
    },
  });
  const badCspChecks = checks.splice(badCspStart);
  assert.ok(badCspChecks.some((item) => !item.passed),
    'wildcard/broad sources and a denying script-src-elem must fail');

  const goodHeadersStart = checks.length;
  checkCommonHeaders('self-test-valid-headers', {
    statusCode: 200,
    headers: {
      'content-security-policy': ["default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"],
      'strict-transport-security': ['max-age=31536000'],
      'x-content-type-options': ['nosniff'],
      'x-frame-options': ['DENY'],
      'referrer-policy': ['strict-origin-when-cross-origin'],
    },
  }, ["'none'"]);
  const goodHeaderChecks = checks.splice(goodHeadersStart);
  assert.ok(goodHeaderChecks.length > 0 && goodHeaderChecks.every((item) => item.passed),
    'the documented secure response-header fixture should pass');

  process.stdout.write('Q-013 runtime verifier self-tests passed\n');
}

if (process.argv.includes('--self-test')) {
  try {
    runSelfTests();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Q-013 self-test failure';
    process.stderr.write('Q-013 runtime verifier self-test failed: ' + message + '\n');
    process.exitCode = 1;
  }
} else {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown Q-013 verifier failure';
    process.stderr.write('Q-013 runtime verifier could not start: ' + message + '\n');
    process.exitCode = 1;
  });
}
