# Levels that feel full

The owner, 2026-09-28: "Let's adjust where the items and things are in the
game. The levels feel very empty." (And: "let's add new levels" — that is the
next plan, and it builds on what this one makes.)

The prologue was just rebuilt and dressed (headstones, graves, bones, braziers,
fire, a dressing module `src/world/Decor.ts` with merged per-level meshes and a
`DRESSTEX` texture registry). Levels 1-7 are still the frozen reference's grids:
walls, doors, a handful of props and pickups, and long bare corridors.

## Global Constraints

- `reference/sonsurum.html` is **never edited**. This is a deliberate
  divergence from the reference's level content; record it per level.
- **Do not renumber levels.** Saves and chapter select depend on the indices.
- **No gameplay stats change** — enemy stats, weapons, movement stay. Level
  *content* (props, decor, pickups, enemy placement) is what this plan
  changes, and every change is argued.
- **Trace fixtures.** `trace-level1.json` records level 1 and
  `trace-level2-boss.json` records level 2 from a seeded start. Dressing that
  adds scene objects moves their digests and counts; anything that touches
  collision, enemies or pickups on the traces' routes moves more. Both are
  sanctioned **only** with the procedure each test header sets out: prove what
  moved and why, field by field, write the analysis, regenerate. Camera and
  HUD should stay identical for pure dressing; if they move, find out why.
  Phase 3 Part D's structural guard in `bossTrace.test.ts` is signal.
- **Decor is visual; props are gameplay.** Decor (merged, non-colliding,
  cheap) can be dense. Breakable props, barrels and pickups change the game
  and must be placed deliberately. Collision reads the grid: decor must never
  block a path, hide a pickup, or sit inside a doorway.
- **Instance or merge everything.** A level must not gain hundreds of scene
  children; follow `Decor.ts`'s merged-mesh pattern and the shadow policy
  (small clutter does not cast).
- No `Math.random` at load — the trace harness seeds it. Use the grid-hash
  pattern `Decor.ts` uses.
- No `src/` file over 400 lines. No import cycles
  (`npx madge --circular --extensions ts,js src/`).
- `npm test` before every commit, exit code captured.
- Node: `export PATH="/c/Program Files/nodejs:$PATH"`.
- Browser pane: `docs/STATUS.md`'s Environment gotchas.
- Write tool for scripts (heredocs eat backslashes); never `git checkout --`;
  commit verified progress early; nothing untracked; **no `Co-Authored-By`**.

---

## Task 1 — measure the emptiness, and a dressing kit per theme

Measure every level: walkable cells, props, decor, pickups, enemies, lights,
the longest stretch of bare corridor, the biggest empty room. Put the table in
the report — it is the baseline the owner's "feels empty" is checked against.

Then extend the dressing kit so each theme has its own vocabulary, procedural
and cheap: dungeon (chains, shackles, cages, straw, barrels, crates, bones,
rats' nests, wall torches), church (pews, candelabra, lecterns, fallen
statues, rubble, banners, broken glass), necropolis (sarcophagi, urns, bone
niches, skulls), graveyard (headstones, crosses, dead trees, open graves,
fences), sewers (pipes, grates, sludge, debris, cages), factory (machinery
blocks, pipes, crates, chains, hooks, drums), womb (flesh growths, sinew,
pods). Reuse what `Decor.ts` already builds; add pieces as needed.

Commit: `feat: a dressing kit for every theme, and the emptiness measured`

## Task 2 — dress levels 1-4

Place decor to make every room and corridor read as a place: clutter along
walls and in corners, set-pieces in the big rooms, a reason for each room to
exist. Revisit pickup and prop placement where it is poor (a health pack in a
dead end nobody visits, ammo nowhere near the fight that needs it), argue each
move. Screenshots of before/after for every level, from the same spots.

Commit: `feat: levels 1-4 are furnished`

## Task 3 — dress levels 5-7

Same for the sewers, the factory and the womb.

Commit: `feat: levels 5-7 are furnished`

---

## Definition of done

- The emptiness table, before and after, for every level.
- Every level dressed in its theme's vocabulary, merged and cheap.
- Pickup and prop moves argued; fixtures regenerated only with analysis.
- Before/after screenshots. `npm test` clean. A build for the owner.
