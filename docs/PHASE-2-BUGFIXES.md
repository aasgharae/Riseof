# Rise-v9 Phase 2 — UI, Protection, Clans and Pathfinding

## Changes
1. Mobile HUD: resource bar reserves the upper-left controls; the bottom dock stays inside the viewport and scrolls horizontally on narrow screens.
2. Castle action panel: four clearly visible actions. Attack is disabled for allies; message/invite are disabled for NPC castles because the offline prototype has no real player account attached to those castles.
3. Protection: new raids are not generated while the shield is active; incoming raids are cancelled when protection is active; landing resolution checks protection again.
4. Shop: fixed duplicate gold deduction for protection purchases.
5. Clan applications: joining another clan creates a pending request. The clan founder can approve or reject pending requests from the clan panel. In this offline prototype, the request workflow is locally testable; real cross-player requests require the later online backend.
6. A*: water, mountains and snow are impassable; forest/pine are traversable with higher movement cost; hills and sand add movement cost. Player marches, NPC wars and NPC raids store and render route polylines.
7. Path validation occurs before troops or energy are consumed.

## Verification
- `node scripts/check-js.mjs`
- `npm test`
- Automated tests cover A* detours, sealed terrain, route interpolation, clan approval/rejection, protection purchase cost, and phase-1 state migration.

## Known limitations
- This is still the offline localStorage prototype, not the multiplayer server.
- Message and clan-invite actions are only available for castles that have a `playerId`; generated NPC castles do not have one.
- Visual verification on the user's exact Android device/browser has not been performed. Please verify the responsive HUD on the target phone after deployment.
