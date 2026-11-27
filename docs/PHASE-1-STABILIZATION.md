# Rise-v9 — Phase 1: Stabilize the existing offline client

This phase deliberately keeps the current browser game playable while preparing it for a gradual server migration. No online authority, PostgreSQL schema, or multi-world matchmaking is implemented in this phase.

## Changes in this phase

- `ensureDefaults()` now initializes missing collections without overwriting existing state.
- NPC marches survive reloads instead of being reset to an empty array.
- Shield state survives reloads; the existing first-day initialization flow in `clans.js` can now run only once.
- The season duration has one source of truth: `CONFIG.seasonLength` (45 days), consumed by `SEASON.days`.
- Node's built-in test runner covers fresh state, defaults, persistence, v8-to-v9 migration, season duration, and world configuration.

## Run checks

Requires Node.js 20 or newer (tested with Node.js 22).

```bash
npm test
```

Run the game locally as before:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Important migration boundary

The browser's `localStorage` remains the source of truth in this phase. The local account flow in `auth.js` is not secure multiplayer authentication and must not be used as server authentication. The next phase adds a separate Node.js API and PostgreSQL persistence; the browser UI will be migrated gradually, module by module.
