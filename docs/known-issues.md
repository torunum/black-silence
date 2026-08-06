# Known Issues

Problems found during the port. Phase 0 preserves them deliberately — see the
non-goals in the Phase 0 spec. Each entry names the phase that owns the fix.

| ID | Issue | Owner |
|---|---|---|
| KNOWN-1 | Level 1 places a red key (`K`) and a Guardian miniboss guarding it, but the level contains no locked door (`D`) anywhere. The key is decorative. | Phase 4 — level rebuild |
| KNOWN-2 | `Context` is a service locator, used to make the mechanical port safe. Systems reach into each other through it instead of using `Events`. Each later phase migrates the systems it touches. | Phases 1–5 |
| KNOWN-3 | 17 non-gameplay `setTimeout` calls remain after Plan 0D. They must be cancelled on level unload. | Plan 0D |
| KNOWN-4 | In `loadLevel` (`src/legacy.js`, the `else if(EDEF[ch])spawnEnemy(...)` / `else if("xTCFVO".includes(ch))spawnProp(...)` dispatch), the enemy check runs *before* the prop check. Two characters exist in both `ENEMY_DEFS` and the prop set `"xTCFVO"`: `C` (Cacodemon enemy vs. "chair" prop) and `V` (THE FACTORY FOREMAN boss — 2600 hp, boss bar, 34 melee — vs. "pew" prop). Because enemy wins the dispatch, every `C`/`V` tile in a level grid spawns the enemy, never the prop. Concretely, `src/world/levels/level2.ts` has 8 `V` tiles (written under a "nave pews + altar + boss + cross launcher" comment, intended as pews) and 1 `C` tile (intended as a chair in the priest's chambers) — so Level 2 spawns eight Factory Foreman bosses and a Cacodemon that the level's own comments describe as furniture. (The `C` tiles in levels 6 and 7 are *not* affected by this issue — their comments confirm they are intentional Cacodemons.) This must not be casually "fixed": removing eight bosses from Level 2 is a major balance change, forbidden in Phase 0, and any fix requires deciding what Level 2's furniture should look like instead — a level design decision. Pinned by a characterization test in `tests/world/levels.test.ts`. Also see that test file for a note on `src/world/levels/index.ts`'s grid-legend docstring, inherited from the reference and inaccurate (omits `0`, `7`, `8`, `9`, which do appear in grids). | Phase 4 — level rebuild |
