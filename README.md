# Rise — Offline Clan Strategy Prototype (v3)

Persian RTL single-device strategy game prototype. Static site, no server; saves live in the browser (localStorage).

## Play locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## What's in v3

- World map **800×560** with **600 castles** across **5 NPC factions** (territory, flag colors, names).
- Every castle shows its **level above it** and its **troop power + wall level** below it; the player's castle shows keep level and army power.
- Castles farther from home are higher level with stronger garrisons (real garrison compositions).
- **Map search** (🔍): live search by castle/faction name, faction filter chips, camera jump with a highlight ring.
- **Minimap**: whole world at a glance, faction-colored castle dots, viewport rectangle, tap-to-jump.
- Zoom buttons, go-home button, progress bars on upgrades/training, battle reports log, empire screen with per-faction conquest progress.
- Huge starting resources for testing (billions). Gold is only for speed-ups.

- **Leaderboard** 🏆: power ranking, kill ranking, faction table.
- Vector forests/mountains over a smooth painted terrain.

## Tests

```bash
node --test
```

## Online migration

See ONLINE_ROADMAP.md — server-authoritative logic, DB, auth, sync, real players on the shared seed map, security. The browser is untrusted; never ship this client logic as-is for multiplayer.
