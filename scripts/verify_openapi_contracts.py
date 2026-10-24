#!/usr/bin/env python3
"""Fail-closed static checks for Bclick's OpenAPI planning contracts.

Checks duplicate YAML keys, local JSON Pointer refs, unique operationIds and
per-scope parameter names, standard error envelopes, and callback fixtures.
This is not a substitute for runtime tests of routes that are not implemented.
"""
from __future__ import annotations

import copy
import sys
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator
from yaml.constructor import ConstructorError
from yaml.nodes import MappingNode

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/planning/openapi.yaml"
CALLBACK = ROOT / "docs/planning/openapi-aggregator-callbacks.yaml"
METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}


class UniqueKeyLoader(yaml.SafeLoader):
    """Reject duplicate YAML mapping keys instead of silently overriding them."""

    def construct_mapping(self, node: MappingNode, deep: bool = False) -> dict[Any, Any]:
        seen: dict[Any, Any] = {}
        for key_node, _ in node.value:
            key = self.construct_object(key_node, deep=deep)
            try:
                duplicate = key in seen
            except TypeError as exc:
                raise ConstructorError(
                    "while constructing a mapping", node.start_mark,
                    "found an unhashable mapping key", key_node.start_mark,
                ) from exc
            if duplicate:
                raise ConstructorError(
                    "while constructing a mapping", node.start_mark,
                    f"found duplicate key {key!r}", key_node.start_mark,
                )
            seen[key] = key_node.start_mark
        return super().construct_mapping(node, deep=deep)


def load_spec(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as stream:
            value = yaml.load(stream, Loader=UniqueKeyLoader)
    except (OSError, yaml.YAMLError) as exc:
        raise AssertionError(f"{path.relative_to(ROOT)}: YAML parse failed: {exc}") from exc
    assert isinstance(value, dict), f"{path.relative_to(ROOT)}: root must be a mapping"
    assert str(value.get("openapi", "")).startswith("3.1."), (
        f"{path.relative_to(ROOT)}: expected OpenAPI 3.1.x"
    )
    assert isinstance(value.get("paths"), dict) and value["paths"], (
        f"{path.relative_to(ROOT)}: paths must be non-empty"
    )
    return value


def pointer(document: dict[str, Any], ref: str, source: str) -> Any:
    assert ref.startswith("#/"), f"{source}: external/invalid $ref is not allowed: {ref}"
    value: Any = document
    for raw in ref[2:].split("/"):
        part = raw.replace("~1", "/").replace("~0", "~")
        if isinstance(value, dict) and part in value:
            value = value[part]
        elif isinstance(value, list) and part.isdigit() and int(part) < len(value):
            value = value[int(part)]
        else:
            raise AssertionError(f"{source}: unresolved $ref {ref} at {part!r}")
    return value


def refs_in(value: Any, document: dict[str, Any], source: str, location: str = "$") -> int:
    count = 0
    if isinstance(value, dict):
        if "$ref" in value:
            assert isinstance(value["$ref"], str), f"{source}:{location}: $ref must be text"
            pointer(document, value["$ref"], f"{source}:{location}")
            count += 1
        for key, child in value.items():
            count += refs_in(child, document, source, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            count += refs_in(child, document, source, f"{location}[{index}]")
    return count


def operations(spec: dict[str, Any], source: str):
    for path, path_item in spec["paths"].items():
        assert isinstance(path_item, dict), f"{source}: invalid path item {path!r}"
        for method, operation in path_item.items():
            if method.lower() in METHODS:
                assert isinstance(operation, dict), f"{source}: {method.upper()} {path} must be a mapping"
                yield path, method.lower(), operation, path_item


def verify_operations(specs: list[tuple[str, dict[str, Any]]]) -> int:
    ids: dict[str, str] = {}
    total = 0
    for source, spec in specs:
        for path, method, op, path_item in operations(spec, source):
            total += 1
            op_id = op.get("operationId")
            assert isinstance(op_id, str) and op_id.strip(), (
                f"{source}: {method.upper()} {path}: missing operationId"
            )
            assert op_id not in ids, (
                f"duplicate operationId {op_id!r}: {ids.get(op_id)} and {source} {method.upper()} {path}"
            )
            ids[op_id] = f"{source} {method.upper()} {path}"
            # Operation-level parameters may override a path-level parameter, so check
            # uniqueness independently at each legal scope.
            for scope, owner in (("path", path_item), ("operation", op)):
                seen: set[tuple[str, str]] = set()
                params = owner.get("parameters", []) or []
                assert isinstance(params, list), f"{source}: {scope} parameters on {path} must be a list"
                for item in params:
                    if isinstance(item, dict) and "$ref" in item:
                        item = pointer(spec, item["$ref"], f"{source}:{method.upper()} {path}")
                    assert isinstance(item, dict) and "name" in item and "in" in item, (
                        f"{source}: malformed {scope} parameter on {method.upper()} {path}"
                    )
                    key = (str(item["name"]).lower(), str(item["in"]).lower())
                    assert key not in seen, (
                        f"{source}: duplicate {scope} parameter {key} on {method.upper()} {path}"
                    )
                    seen.add(key)
    return total


def check_response_ref(spec: dict[str, Any], path: str, method: str, status: str, expected: str) -> dict[str, Any]:
    op = spec["paths"][path][method]
    responses = op.get("responses", {})
    assert status in responses, f"{method.upper()} {path}: missing {status} response"
    value = responses[status]
    assert isinstance(value, dict) and value.get("$ref") == expected, (
        f"{method.upper()} {path} {status}: expected $ref {expected}"
    )
    return pointer(spec, expected, f"{method.upper()} {path} {status}")


def verify_error_fixtures(spec: dict[str, Any]) -> int:
    # Representative contract mappings. These are schema/fixture checks, not route execution.
    cases = [
        ("/api/v1/auth/register", "post", "400", "#/components/responses/ValidationError"),
        # These sensitive session/auth operations intentionally use no-store error variants.
        # Keep exact response-ref checks so they cannot silently regress to cacheable responses.
        ("/api/v1/auth/login", "post", "401", "#/components/responses/NoStoreUnauthorized"),
        ("/api/v1/admin/session", "get", "401", "#/components/responses/NoStoreUnauthorized"),
        ("/api/v1/admin/session", "get", "403", "#/components/responses/NoStoreForbidden"),
        ("/api/v1/wallets/fx-executions", "post", "422", "#/components/responses/BusinessRefusal"),
    ]
    for path, method, status, response_ref in cases:
        response = check_response_ref(spec, path, method, status, response_ref)
        schema_ref = response.get("content", {}).get("application/json", {}).get("schema", {}).get("$ref")
        assert schema_ref == "#/components/schemas/ErrorResponse", (
            f"{method.upper()} {path} {status}: expected standardized ErrorResponse"
        )

    schema = spec["components"]["schemas"]["ErrorResponse"]
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    fixture = {
        "error": {
            "code": "INVALID_REQUEST",
            "message": "Request could not be processed",
            "details": {"field": "email"},
        },
        "requestId": "0123456789abcdef0123456789abcdef",
    }
    assert validator.is_valid(fixture), "valid standard error fixture was rejected"
    assert not validator.is_valid({"error": fixture["error"]}), "requestId must be required"
    assert not validator.is_valid({
        "error": {"message": "Missing code"},
        "requestId": fixture["requestId"],
    }), "error.code must be required"
    return len(cases) + 3


def verify_callback_fixtures(spec: dict[str, Any]) -> int:
    path = "/callbacks/aggregator"
    op = spec["paths"][path]["get"]
    assert op.get("operationId") == "handleAggregatorWalletCallback"
    params = {(p.get("name"), p.get("in")): p for p in op.get("parameters", [])}
    for name in ("username", "currency", "action", "call_id", "timestamp", "key"):
        assert params.get((name, "query"), {}).get("required") is True, (
            f"{path}: required callback parameter missing: {name}"
        )
    response = op["responses"]["200"]
    schema_ref = response["content"]["application/json"]["schema"]["$ref"]
    assert schema_ref == "#/components/schemas/AggregatorCallbackResponse"
    schema = pointer(spec, schema_ref, "Aggregator callback response")
    validator = Draft202012Validator(schema)
    fixtures = [
        {"error": 0, "balance": 250},
        {"error": 1, "balance": 250},
        {"error": 2, "balance": 0},
    ]
    for fixture in fixtures:
        assert validator.is_valid(fixture), f"invalid Aggregator response fixture: {fixture}"
    assert not validator.is_valid({"error": 9, "balance": 250}), (
        "unexpected Aggregator callback error code must fail fixture validation"
    )
    return len(fixtures) + 1



def _assert_csrf_cookie_policy(spec: dict[str, Any]) -> int:
    """Validate the normative per-context CSRF cookie names and lifecycle in OpenAPI."""
    policy = spec.get("x-csrf-policy")
    assert isinstance(policy, dict), "x-csrf-policy extension must be a mapping"
    cookies = policy.get("cookies")
    assert isinstance(cookies, dict), "x-csrf-policy.cookies must be a mapping"

    expected = {
        "player": "__Host-bclick_player_csrf",
        "admin": "__Host-bclick_admin_csrf",
        "enrollment": "__Host-bclick_admin_enrollment_csrf",
    }
    assert set(cookies) == set(expected), "CSRF cookie contexts must be exactly player/admin/enrollment"
    names = [cookies[context].get("name") for context in expected]
    assert len(set(names)) == 3, "CSRF cookie names must be unique across security contexts"
    checks = 3

    for context, name in expected.items():
        entry = cookies[context]
        assert entry.get("name") == name, f"{context}: incorrect CSRF cookie name"
        assert isinstance(entry.get("issuedOn"), str) and entry["issuedOn"], f"{context}: missing issue lifecycle"
        assert isinstance(entry.get("rotateOn"), list) and entry["rotateOn"], f"{context}: missing rotation lifecycle"
        assert isinstance(entry.get("deletedOn"), list) and entry["deletedOn"], f"{context}: missing deletion lifecycle"
        attrs = str(entry.get("attributes", "")).lower()
        for required in ("secure", "samesite=strict", "path=/", "no domain", "javascript-readable", "not httponly"):
            assert required in attrs, f"{context}: missing required cookie attribute {required!r}"
        checks += 5

    mechanism = str(policy.get("mechanism", "")).lower()
    origin = str(policy.get("origin", "")).lower()
    rotation = str(policy.get("rotation", "")).lower()
    assert "host-based, not port-based" in mechanism, "policy must document host/port cookie scope"
    assert "secure" in mechanism and "path=/" in mechanism and "no domain" in mechanism, (
        "__Host- cookie requirements must be explicit"
    )
    assert "exact" in origin and "no wildcard" in origin, "strict exact Origin allowlist must be explicit"
    assert "logout in one context must not clear another" in rotation, "logout isolation must be explicit"
    checks += 4

    token_param = str(spec["components"]["parameters"]["CsrfToken"].get("description", ""))
    for name in expected.values():
        assert name in token_param, f"CsrfToken parameter omits context cookie {name}"
        checks += 1

    header_expectations = {
        "SessionCookie": "__Host-bclick_player_csrf",
        "AdminSessionCookie": "__Host-bclick_admin_csrf",
        "AdminEnrollmentCookie": "__Host-bclick_admin_enrollment_csrf",
        "ExpiredSessionCookie": "__Host-bclick_player_csrf",
        "ExpiredAdminSessionCookie": "__Host-bclick_admin_csrf",
    }
    for header_name, cookie_name in header_expectations.items():
        description = str(spec["components"]["headers"][header_name].get("description", ""))
        assert cookie_name in description, f"{header_name}: missing context cookie {cookie_name}"
        checks += 1

    enrollment_header = str(spec["components"]["headers"]["AdminEnrollmentCookie"].get("description", ""))
    assert "enrollment_required" in enrollment_header, "enrollment cookies must be conditional on enrollment_required"
    assert "expires" in enrollment_header.lower() or "10 minutes" in enrollment_header.lower(), (
        "enrollment cookie expiry must be documented"
    )
    totp_verify = spec["paths"]["/api/v1/admin/auth/mfa/totp/verify"]["post"]["responses"]["204"]
    assert totp_verify.get("headers", {}).get("Set-Cookie", {}).get("$ref") == (
        "#/components/headers/AdminSessionCookie"
    ), "TOTP enrollment verification must exchange enrollment CSRF for full admin session/CSRF cookies"
    checks += 3

    # Fail if any old shared CSRF name remains anywhere in the OpenAPI contract.
    def collect_strings(value: Any):
        if isinstance(value, str):
            yield value
        elif isinstance(value, dict):
            for key, child in value.items():
                yield from collect_strings(key)
                yield from collect_strings(child)
        elif isinstance(value, list):
            for child in value:
                yield from collect_strings(child)

    all_text = "\n".join(collect_strings(spec))
    assert "__Host-bclick_csrf" not in all_text, "stale shared CSRF cookie name remains in OpenAPI"
    checks += 1

    # Negative canary: the guard must reject a deliberate cross-context name collision.
    malformed = copy.deepcopy(spec)
    malformed["x-csrf-policy"]["cookies"]["admin"]["name"] = expected["player"]
    try:
        _assert_csrf_cookie_policy_core(malformed, check_legacy_name=False)
    except AssertionError:
        pass
    else:
        raise AssertionError("cross-context CSRF cookie collision canary was not rejected")
    checks += 1
    return checks


def _assert_csrf_cookie_policy_core(spec: dict[str, Any], check_legacy_name: bool = True) -> None:
    """Minimal reusable invariants for the collision negative canary."""
    cookies = spec["x-csrf-policy"]["cookies"]
    names = [cookies[name]["name"] for name in ("player", "admin", "enrollment")]
    assert len(set(names)) == 3, "CSRF cookie names must be unique across security contexts"
    if check_legacy_name:
        assert "__Host-bclick_csrf" not in str(spec), "stale shared CSRF cookie name remains"


def verify_csrf_cookie_policy(spec: dict[str, Any]) -> int:
    """Run static CSRF contract checks; these are not runtime route tests."""
    # The core check is separate so the canary tests the invariant without mutating source data.
    checks = _assert_csrf_cookie_policy(spec)
    print(f"PASS: {checks} CSRF cookie-name, lifecycle, __Host-, Origin and collision contract checks")
    return checks



def verify_admin_identity_contract(spec: dict[str, Any]) -> int:
    """Enforce accepted Q-001/Q-002 semantics before authentication handlers exist."""
    session_schema = spec["components"]["schemas"]["AdminSessionResponse"]
    data_schema = session_schema["properties"]["data"]["properties"]
    admin_schema = data_schema["admin"]
    assert {"id", "email", "displayName", "status"}.issubset(set(admin_schema.get("required", []))), (
        "Q-001: AdminSessionResponse.admin must require id/email/displayName/status"
    )
    admin_props = admin_schema["properties"]
    assert admin_props["status"].get("const") == "active", (
        "Q-001: successful admin sessions may represent active admins only; locked/disabled is 403"
    )
    assert admin_props["displayName"].get("type") == "string", "Q-001: displayName must be non-null text"
    mfa_props = data_schema["mfa"]["properties"]
    assert mfa_props["enabled"].get("const") is True, "Q-001: successful admin session must require enabled MFA"
    assert mfa_props["method"].get("const") == "totp", "Q-001: successful admin session must require TOTP"
    checks = 5

    login = spec["paths"]["/api/v1/admin/auth/login"]["post"]
    assert "202" in login["responses"], "Q-002: password step must return only a challenge"
    cookie_contract = spec["components"]["headers"]["AdminEnrollmentCookie"]["description"]
    for phrase in ("__Host-bclick_admin_challenge", "browser-binding secret", "mfa_required",
                   "neither enrollment cookie is emitted", "expires within 5 minutes"):
        assert phrase in cookie_contract, f"Q-002: challenge/cookie contract is missing {phrase!r}"
        checks += 1
    challenge_desc = spec["components"]["schemas"]["AdminLoginResponse"]["properties"]["data"]["properties"]["challengeId"].get("description", "").lower()
    assert "locator only" in challenge_desc and "not a bearer secret" in challenge_desc, (
        "Q-002: challengeId must be a locator, never bearer authorization"
    )
    verify_desc = spec["components"]["schemas"]["AdminMfaVerifyRequest"].get("description", "").lower()
    assert "__host-bclick_admin_challenge" in verify_desc and "hash" in verify_desc, (
        "Q-002: MFA verification must require browser-bound challenge proof"
    )
    checks += 2

    validator = Draft202012Validator(session_schema)
    good = {
        "data": {
            "admin": {"id": "4c9f69fb-f22b-44c6-85b1-8b7b36eacdea", "email": "admin@example.test",
                      "displayName": "Project Admin", "status": "active"},
            "roles": ["project-admin"], "permissions": ["admin.session.read"],
            "mfa": {"enabled": True, "method": "totp"},
            "session": {"authenticatedAt": "2026-10-20T00:00:00Z", "expiresAt": "2026-10-20T01:00:00Z"},
        },
        "requestId": "0123456789abcdef0123456789abcdef",
    }
    assert validator.is_valid(good), "Q-001: valid fully authenticated session fixture must validate"
    locked = copy.deepcopy(good)
    locked["data"]["admin"]["status"] = "locked"
    assert not validator.is_valid(locked), "Q-001: locked admin must not validate as a successful session"
    no_mfa = copy.deepcopy(good)
    no_mfa["data"]["mfa"] = {"enabled": False, "method": None}
    assert not validator.is_valid(no_mfa), "Q-001: incomplete MFA must not validate as a successful session"
    missing_name = copy.deepcopy(good)
    del missing_name["data"]["admin"]["displayName"]
    assert not validator.is_valid(missing_name), "Q-001: displayName must be required"
    checks += 4
    print(f"PASS: {checks} Q-001/Q-002 admin identity contract checks and negative fixtures")
    return checks


def verify_guard_negative_canaries() -> int:
    """Prove each important guard rejects a deliberately malformed miniature input."""
    try:
        yaml.load("version: 1\nversion: 2\n", Loader=UniqueKeyLoader)
    except yaml.YAMLError:
        pass
    else:
        raise AssertionError("duplicate-key canary was not rejected")

    try:
        pointer({}, "#/missing", "negative-ref-canary")
    except AssertionError:
        pass
    else:
        raise AssertionError("unresolved-reference canary was not rejected")

    duplicate_ids = {"paths": {
        "/one": {"get": {"operationId": "duplicate"}},
        "/two": {"get": {"operationId": "duplicate"}},
    }}
    try:
        verify_operations([("negative-operationId-canary", duplicate_ids)])
    except AssertionError:
        pass
    else:
        raise AssertionError("duplicate operationId canary was not rejected")

    duplicate_parameters = {"paths": {
        "/one": {"get": {"operationId": "uniqueParameterCanary", "parameters": [
            {"name": "lang", "in": "query"},
            {"name": "lang", "in": "query"},
        ]}},
    }}
    try:
        verify_operations([("negative-parameter-canary", duplicate_parameters)])
    except AssertionError:
        pass
    else:
        raise AssertionError("duplicate parameter canary was not rejected")
    return 4


def main() -> int:
    canaries = verify_guard_negative_canaries()
    base = load_spec(BASE)
    callback = load_spec(CALLBACK)
    base_name, callback_name = str(BASE.relative_to(ROOT)), str(CALLBACK.relative_to(ROOT))
    base_refs = refs_in(base, base, base_name)
    callback_refs = refs_in(callback, callback, callback_name)
    op_count = verify_operations([(base_name, base), (callback_name, callback)])
    error_count = verify_error_fixtures(base)
    callback_fixture_count = verify_callback_fixtures(callback)
    csrf_check_count = verify_csrf_cookie_policy(base)
    identity_check_count = verify_admin_identity_contract(base)
    print(f"PASS: {canaries} negative canaries for duplicate keys, unresolved refs, operationIds and parameters")
    print(f"PASS: duplicate-key-safe YAML parse ({base_name}; {callback_name})")
    print(f"PASS: resolved {base_refs + callback_refs} internal $refs")
    print(f"PASS: {op_count} unique operationIds and per-scope parameter names")
    print(f"PASS: {error_count} standardized 400/401/403/422 contract fixtures")
    print(f"PASS: {callback_fixture_count} Aggregator callback response fixtures")
    print(f"PASS: {csrf_check_count} context-specific CSRF contract checks (static only; no auth routes exercised)")
    print(f"PASS: {identity_check_count} Q-001/Q-002 pre-implementation contract checks")
    print("NOTE: static contract fixtures do not prove runtime behavior for unimplemented routes")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"OPENAPI CONTRACT GATE FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
