# Deeper levels

The owner, 2026-10-05: "Make the levels longer and a bit more complex. New
levels can be added too."

## What exists, measured (`docs/level-density.md`)

- Every level is ~590-690 walkable cells of the frozen reference's grids,
  now furnished. Levels 4-7 share one template: their emptiest regions sat at
  the same coordinates (x 9-23, z 7-17), their longest runs on the same row.
  They are the same building with different wallpaper.
- `tests/fidelity.test.ts` pins every level's grid cell for cell to the
  reference (with a documented diff list). Rebuilding a level is a deliberate
  divergence: rewrite that pin for the rebuilt level, record why, keep it for
  the levels not yet rebuilt.
- **Death reloads the page** and the level starts over. Longer levels make
  that punishing — so checkpoints come first.

## Global Constraints

- `reference/sonsurum.html` is never edited.
- **Level indices**: rebuilding levels keeps their index. New levels are a
  later plan; do not renumber here.
- No weapon, enemy-stat or movement value changes. Level content and
  structure is what changes.
- **Trace fixtures**: `combatTrace` records level 1 and `bossTrace` level 2
  from scripted/seeded starts. Rebuilding those levels invalidates them.
  Follow each header's procedure: the trace's *purpose* (what it exercises —
  combat resolution, armour absorb, the priest's three phases, the sprite
  frames) must survive; rewrite the script/seed positions for the new layout,
  re-derive every measured claim in the header, regenerate with analysis.
  Phase 3 Part D's structural guard is signal. The prologue fixture must not
  move.
- Every level must pass the validation suite Task 2 builds (reachability,
  key order, no softlock, budgets) and the enemy stuck check.
- No `Math.random` at load. No `src/` file over 400 lines. No import cycles.
  `npm test` green with exit code captured. Write tool for scripts; never
  `git checkout --`; commit early; nothing untracked; no `Co-Authored-By`.

## Task 1 — checkpoints

Mid-level checkpoints: a themed, visible marker (a shrine, a lantern, a
candle that lights) the player passes; on death the level restarts from the
last checkpoint reached with what the player had *when they reached it*
(health, armour, weapons, ammo), and the world as it was then (enemies killed
before the checkpoint stay dead, pickups taken stay taken, doors opened stay
open) — or, if snapshotting the world is too invasive, a clearly argued
simpler rule (e.g. enemies after the checkpoint respawn, before it stay dead).
No page reload on death. The death screen offers "rise again at the last
shrine" and "restart the level". Levels without checkpoints behave as today
except that death restarts the level without reloading the page.

Commit: `feat: checkpoints — death returns you to the last shrine`

## Task 2 — a level-design toolkit, and what "deeper" means in numbers

An authoring layer above the raw grid (rooms, corridors, doors, keys, height,
secrets, set-pieces placed by name) and a validation + metrics suite every
level runs through: reachability; key-before-door ordering (no softlock);
every enemy and pickup reachable; secrets reachable and hidden; path length
spawn→exit; rooms; loops (cycles in the room graph); branches; vertical
changes; ammo and health per encounter. Measure today's levels and set the
targets for a rebuilt level: roughly **twice the critical-path length**, at
least one loop, one key hunt behind a locked door, two secrets, one arena,
real verticality, and checkpoints at the halfway point(s).

Commit: `feat: a level-design toolkit, and every level measured`

## Task 3 — level 1 rebuilt (the template)

The Gothic Dungeon, rebuilt with the toolkit to the targets: a longer, branching
dungeon — cell blocks, the torture hall, a flooded undercroft or an oubliette
below, a key hunt, a loop back to an earlier area, secrets, a checkpoint. Keep
its furnishing quality (the decor kit), its lighting budget, its exit and
entrance doors. Re-record `combatTrace` per its header.

Commit: `feat: the dungeon goes deeper`

## Tasks 4-9 — levels 2-7 rebuilt, one per task

Each to the same targets, each with its own layout — levels 4-7 must stop
sharing a template. Level 2 re-records `bossTrace` (the priest's three phases
must still be reached).

Commits: `feat: the church goes deeper`, `… necropolis …`, `… graveyard …`,
`… sewers …`, `… factory …`, `… womb …`.

## Definition of done

Checkpoints; a toolkit with metrics; every level rebuilt to roughly twice the
length with loops, keys, secrets and verticality; fixtures re-recorded with
analysis; screenshots and a play-through per level; `npm test` clean; a build.
