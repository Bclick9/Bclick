# BigBang fixture provenance

- `bigbang-games-page-1.json` is based on the single-game `GET /api/v1/games?type=standard` example in the public BigBang API documentation: https://api.bigbangcasino.bet/docs/ (reviewed 2026-10-22).
- It is a documentation-derived fixture, **not** a response captured from a live or sandbox provider account. Its pagination total is set to `1` so it agrees with the one game included in the example.
- Multi-page behavior, HTTP failures, malformed envelopes, duplicate IDs, Premium rejection, and recovery behavior in `bigbang.test.ts` use synthetic test doubles derived from the documented shape. They do not constitute vendor golden evidence.
- No API key, player identity, callback token, wallet credential, or real-money payload is included.
- Q-006 remains open until the exact complete versioned `BIGBANG_AGENT.md` file, SHA-256, and reviewer record are captured. Do not promote this fixture to Production contract evidence.
