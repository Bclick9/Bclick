# Q-005 — Project Owner acceptance of the conservative legacy-alias disposition

**Decision date:** 2026-10-22  
**Decision basis:** Project Owner instruction to complete the Q-005 review and preserve correct game identity for legacy storefront URLs.  
**Scope:** This accepts the evidence-backed alias disposition for the current BigBang Standard Sandbox snapshot. It is not closure of Q-005 and does not authorize a frontend cutover, Premium import, live-key use, Production release, Phase 8, or real-money operation.

## Accepted disposition

- Preserve the 59 curated legacy game slugs from the old storefront as persistent aliases; do not reuse these strings for an unrelated canonical game.
- Keep the three proven mappings pinned to their current Bclick canonical UUIDs: `aviator`, `le-bandit`, and `wanted-dead-or-a-wild`.
- Keep the other 56 aliases unmatched unless authoritative provider/operator evidence proves a unique game identity. In the current API contract, unresolved aliases fail closed with 404 and ambiguous aliases return 409.
- Do not use title-only/fuzzy matching, provider-name synonyms, substring similarity, or implied Standard/Premium equivalence to fill gaps.
- Keep `crazy-time` unmatched: the Project Owner confirms BigBang does not provide Crazy Time.
- Treat “not found in this Standard snapshot” only as evidence about that snapshot, not proof that the game is unavailable in every provider plan or tier.

## What this decision does not settle

Q-005 remains **OPEN / P0** until the 3,802-versus-3,639 catalogue count discrepancy is supported by same-key/same-scope pagination evidence or explained by BigBang, and the tier/source selection and legacy-route semantics are tested and reviewed. The acceptance also does not close Q-006, Q-010, Q-011, Q-013, or Q-020.

The approved delivery order remains: finalize the Standard identity/category and legacy-route contract; define integration-tier and provider/game availability semantics; add database-backed settings, permission-protected APIs, audit history, and denial tests; connect the Admin UI to those APIs; then remove legacy title-based matching and verify exactly one canonical card per accepted identity with Demo remaining Sandbox-only.

## Implementation guardrails

- No Premium import, live provider key, real Play, wallet callback, money posting, or Phase 8 work.
- Provider or game disable must be enforced on server read/launch paths, not only represented in React state.
- A failed/incomplete sync must preserve the last known good catalogue.
- Never perform a schema-history edit or run guarded migrations against Neon/Production as part of this decision.
