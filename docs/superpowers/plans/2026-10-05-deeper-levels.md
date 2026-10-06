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

**Built (Task 2).** `src/world/authoring/Plan.ts` (`LevelPlan`: rooms with a size and a floor,
corridors straight or bent and graded between floors, `stairs`/`ramp`, plain/locked/secret doors,
`spawn`/`exit`/`key`/`enemy`/`pickup`/`prop`/`light`/`plate`, `checkpoint`, named set-pieces and the
kit's `Decorator`; `build()` returns the `BuiltLevel` the loader takes) with guard rails against
the known glyph traps (KNOWN-4, KNOWN-11). `src/world/structure/` (`analyse(level)`: the hard
validation and the metrics; `targets.ts`: `REBUILT`, `TARGETS`, `checkTargets`).
`scripts/level-structure.ts` writes `docs/level-structure.md`. A small level (`tests/support/sampleLevel.ts`,
THE WELL) shows the API; a level written to meet every target (`tests/support/proofLevel.ts`) proves the
targets can be met together. Hard-validation failures levels 1 and 3 already had are pinned in
`LEGACY_PROBLEMS`; a rebuilt level may have none.

## Task 3 — level 1 rebuilt (the template)

The Gothic Dungeon, rebuilt with the toolkit to the targets: a longer, branching
dungeon — cell blocks, the torture hall, a flooded undercroft or an oubliette
below, a key hunt, a loop back to an earlier area, secrets, a checkpoint. Keep
its furnishing quality (the decor kit), its lighting budget, its exit and
entrance doors. Re-record `combatTrace` per its header.

### Targets for every rebuilt level (set by Task 2, enforced by `REBUILT`)

Measured on levels 1-7 as they were built (`docs/level-structure.md`): critical path 42, 66, 44, 44, 44, 44, 32
steps (levels 4-6 exactly the same 44: one building, three wallpapers); one floor height everywhere but level 3's
tomb; one secret each; a key on the way on level 2 only; and no checkpoint that every route passes between 40-60%
(levels 3-6 have theirs at 84-91%, level 7's nearest is 53% and a route can miss it).
A level's index goes into `REBUILT` (`src/world/structure/targets.ts`) in the task that rebuilds it, and from then on
`tests/world/structureLevels.test.ts` holds it to `checkTargets` and to the hard validation with no waiver:

| target | number | why |
|---|---|---|
| critical path | 1.8-3x the old level's, and at least 80 steps: level 1 80-126, level 2 119-198, levels 3-6 80-132, level 7 80-96 | "about 2x"; the 80 floor keeps levels 1 and 7 (42, 32) from being rebuilt short; the cap keeps a level from growing past playable |
| loops | at least 1 loop (independent cycle in the room graph) | the lattice levels have 3-4 by accident, level 1 has none |
| key hunt | a key, a locked door on the way, the key at least 20 steps off the way | level 2 has it (32); levels 3-7 lock a side room, which is not a hunt |
| secrets | at least 2 secrets, each with at least 2 pickups behind it | every level has exactly 1 today, with 3-5 pickups |
| arena | at least 1 arena (a room of 60+ cells with 8+ of enemy weight, a boss weighing 4) | six of the seven have one today by accident; level 3 has none |
| verticality | at least 3 floor heights and 2 vertical transitions | of levels 1-7 only level 3 (the tomb) has any |
| rooms, branches | at least 8 rooms and 2 branch points (a region with 3+ neighbours) | level 1 has 4 rooms and 0 branches; "branching dungeon" |
| checkpoint | one that every route passes, between 40-60% of the critical path | no level has one (level 2's is at 61%, level 7's at 53% and avoidable) |
| ammunition | every fight: ammunition found on the way worth 2x the rank-and-file hit points; before a boss, 0.6x all of them, with 50 health and 50 armour on the way | the worst rank-and-file fight today is 2.6x, the worst boss room 0.67x; levels 1, 4, 5 and 7 reach a boss with no armour or no health |

"Ammunition worth" is damage on paper at 50% accuracy, counting the first weapon that fires each kind and the 60 bullets
the player starts with, and not what enemies drop. Doors cut into a wall (`LevelPlan.door`) take the higher of the two
floors and may not join floors more than a step (1.2) apart; a player cannot climb what a jump alone would.

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
