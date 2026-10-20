#!/usr/bin/env python3
"""Fail-closed static checks for Bclick's OpenAPI planning contracts.

Checks duplicate YAML keys, local JSON Pointer refs, unique operationIds and
per-scope parameter names, standard error envelopes, and callback fixtures.
This is not a substitute for runtime tests of routes that are not implemented.
"""
from __future__ import annotations

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
        ("/api/v1/auth/login", "post", "401", "#/components/responses/Unauthorized"),
        ("/api/v1/admin/session", "get", "401", "#/components/responses/Unauthorized"),
        ("/api/v1/admin/session", "get", "403", "#/components/responses/Forbidden"),
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


def main() -> int:
    base = load_spec(BASE)
    callback = load_spec(CALLBACK)
    base_name, callback_name = str(BASE.relative_to(ROOT)), str(CALLBACK.relative_to(ROOT))
    base_refs = refs_in(base, base, base_name)
    callback_refs = refs_in(callback, callback, callback_name)
    op_count = verify_operations([(base_name, base), (callback_name, callback)])
    error_count = verify_error_fixtures(base)
    callback_fixture_count = verify_callback_fixtures(callback)
    print(f"PASS: duplicate-key-safe YAML parse ({base_name}; {callback_name})")
    print(f"PASS: resolved {base_refs + callback_refs} internal $refs")
    print(f"PASS: {op_count} unique operationIds and per-scope parameter names")
    print(f"PASS: {error_count} standardized 400/401/403/422 contract fixtures")
    print(f"PASS: {callback_fixture_count} Aggregator callback response fixtures")
    print("NOTE: static contract fixtures do not prove runtime behavior for unimplemented routes")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"OPENAPI CONTRACT GATE FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
