# BigBang and WinHouse fixture provenance

## Pinned source artifacts

The exact complete Project-Owner-supplied artifacts were fingerprinted and reviewed on 2026-10-22. See [Q-006 Provider Specification Review](../../../docs/notes/2026-10-22-Q006-provider-spec-review.md) for scope, reviewer status, code comparison, and unresolved vendor questions.

- BigBang `BIGBANG_AGENT.md`, docs v1.10 (2026-09-20), https://api.bigbangcasino.bet/docs/agent.md, 20,552 bytes, SHA-256 `60b7b046dd1f56cbd4cf3577b349fe9f1ffbde3b2df1538d6ece7c2368b59b74`.
- WinHouse `WINHOUSE_AGENT.md` (2026-09-20), https://iframe.winhouse.bet/docs/agent.md, 23,021 bytes, SHA-256 `00de9e66c76627eee31af1f9ccba93371432abfffebff39d026d512e53dc2d6b`.

## BigBang test fixture

- `bigbang-games-page-1.json` is based on the single-game `GET /api/v1/games?type=standard` example in the pinned BigBang brief.
- It is a documentation-derived fixture, **not** a response captured from a live or Sandbox provider account. Its pagination total is set to `1` so it agrees with the one game in the example.
- Multi-page behavior, HTTP failures, malformed envelopes, duplicate IDs, Premium rejection, and recovery behavior in `bigbang.test.ts` use synthetic test doubles derived from the documented shape. They are not vendor-originated golden fixtures.
- No API key, player identity, callback token, wallet credential, or real-money payload is included.

## WinHouse fixture status

The current WinHouse integration is the frontend embed loader only. There are no Model B launch-token or wallet callback handlers, and no vendor-originated WinHouse payload/signature fixtures are committed. Do not fabricate vendor goldens or enable wallet callbacks before Q-006/Q-009/Q-010/Q-011 acceptance.
