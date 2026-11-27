# Rise — Persian Clan Strategy Game Prototype

Rise currently runs as a browser-based offline prototype. The v9 stabilization work preserves the existing client while preparing a gradual migration to a Node.js + PostgreSQL backend and multiple independent worlds.

## Play locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Run tests

Requires Node.js 20 or newer.

```bash
npm test
```

## Migration status

- Phase 1: offline state stabilization and regression tests.
- Phase 2: Node.js API, PostgreSQL schema, server-side authentication.
- Phase 3: migrate economy, construction, training, marches and combat to server-authoritative services.
- Phase 4: multiple worlds, each with its own seed, season, players and NPC simulation.

See `ONLINE_ROADMAP.md` and `docs/PHASE-1-STABILIZATION.md`.

**Important:** the current local authentication and localStorage save are for prototyping only. They are not secure or shared across devices.
