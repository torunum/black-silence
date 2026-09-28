# Player feedback, round 2 — out of the grave, through hell

The owner, 2026-09-24:

> Fix the start of the game. For the first chapter, the main character climbs
> out of a grave and passes through hell. That is what the prologue was.

## What exists, measured

`src/world/levels/prologue.ts` (21x27, copied from the reference): the player
**wakes deep in a hell cavern**, walks a corridor north, climbs an eight-step
staircase to a raised **tomb chamber**, and leaves through an exit `X` "out of
the grave" to Level 1. No enemies. Theme: `hell:true` for the whole level.
ADEM's opening lines (`src/content/monologue.ts`, `lvl0`) — "...I was in the
ground. In the fire. And now I am climbing." — describe grave → fire → climb,
but the map plays it backwards: fire first, the grave only as the exit.

So the owner is describing what the story always said and the level never did.

## The shape of the new prologue

1. **The grave.** Black screen; muffled breath and a heartbeat; earth shifting.
   ADEM is lying on his back in a grave, a coffin lid splitting above him.
   He claws up: the view rises out of the ground, dirt falling away, into a
   night churchyard — headstones, a dead tree, a ruined chapel or mausoleum,
   fog. Input is locked for the few seconds this takes, and **any key or click
   skips it**. Then the player has control, standing beside their own open
   grave.
2. **The way down.** Somewhere in the churchyard the ground gives way, or a
   crypt stair leads down — the only way on is down.
3. **Hell.** A crossing of the hell cavern: fire, the existing hell walls and
   floor, the red light, and some danger — a few of the weakest enemies and
   something to cross (a narrow bridge over a burning pit, a gauntlet between
   fires). It is the first level: it teaches moving, shooting and kicking,
   and it must not be hard.
4. **The way out.** At the far side of hell, the climb up and out — the exit
   to Level 1, the dungeon.

ADEM's `lvl0` lines are rewritten for this order, in his voice (dry, profane,
funny), with a line on waking in the grave and one on the descent.

## Global Constraints

- `reference/sonsurum.html` is **never edited**. This is a deliberate
  divergence from its prologue; record it in the level file's header.
- **Do not renumber the levels.** The prologue stays level 0 and Level 1
  stays level 1: save data (`maxLevel`), chapter select and the level-1 and
  level-2 trace fixtures depend on the indices. If the grave and hell need
  different looks, do it **inside level 0** (per-zone textures, lights, fog and
  reverb room), not by adding a level.
- **Trace fixtures.** `trace-level0.json` records the prologue and **will
  move** — the map, the opening and the script's meaning all change. That is
  sanctioned: follow `tests/integration/trace.test.ts`'s own regeneration
  procedure, rewrite its script so it still exercises what the header says it
  exercises (walking, turning, firing, the kick, the step-up the old
  staircase gave), update the header's measured claims (e.g. "zero enemies"
  is no longer true), and write the analysis. **`trace-level1.json` and
  `trace-level2-boss.json` must not move.**
- The opening cinematic must not break the traces' determinism: no
  `Math.random` in anything new at load or per tick (the trace harness seeds
  it; sound already draws none). A trace must be able to skip the cinematic.
- **Sound** goes through the named catalogue and the sound board
  (`src/soundboard/`), at the planned levels (`scripts/sound-levels.mjs`), with
  a reverb room per zone if the zones differ (Task 2 of the sound plan built
  rooms per theme).
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/` (~149 files).
- `npm test` before every commit, exit code captured
  (`npm test > log 2>&1; echo EXIT=$?`).
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game renders in the Browser pane** — `docs/STATUS.md`'s Environment
  gotchas. Look at every zone on screen.
- **Bash heredocs here eat backslashes** — Write tool for scripts. Never
  `git checkout --`. Commit verified progress early.
- Leave nothing untracked. **No `Co-Authored-By`.** The owner is the sole author.

---

## Task 1 — the map: churchyard, descent, hell, climb

Rebuild `buildPrologue` in the new order, with per-zone looks inside one level.
Decide how the churchyard reads as outdoors at night given the renderer (a
very high dark ceiling lost in fog, a sky treatment, or whatever the ceiling
code allows) and say what you chose. Place the few enemies and the crossing.
Rewrite ADEM's `lvl0` lines. Regenerate `trace-level0.json` per the procedure,
with a rewritten script (the opening cinematic does not exist yet — Task 2
adds it and moves this fixture once more, which is fine).

Look at every zone on screen and say honestly how it reads.

Commit: `feat: the prologue starts in a grave and goes down through hell`

## Task 2 — rising from the grave

The opening: black, breath, heartbeat, earth, the coffin lid splitting, the
view rising out of the ground through falling dirt into the churchyard, a
line from ADEM, then control. A few seconds; skippable by any key or click;
only on the prologue, and only when the level starts (not on a reload
mid-level if the game has one). Use the game's existing cinematic mechanisms
(`world.cine`, `game.inputLock`, `cineTick`) where they fit. New sounds go in
the catalogue and on the sound board.

Frames of the opening in the report, start to finish.

Commit: `feat: ADEM claws his way out of the grave`

## Task 3 — hell feels like hell

A polish pass over the hell crossing, played start to finish: fire and ember
particles, heat shimmer or flicker in the light, the room tone and reverb of
the cavern, distant screams, the enemies' placement and difficulty (the first
level — nobody should die here on a first try without trying to), and the
climb out reading as the way to Level 1. Then a full play of the prologue,
grave to exit, in the Browser pane, with screenshots.

Commit: `feat: the hell crossing burns`

---

## Definition of done

- The game starts in a grave, the player climbs out, goes down, crosses hell,
  and climbs out to Level 1.
- A skippable opening; ADEM's lines match the order.
- Level indices, saves and the level-1/level-2 fixtures untouched; the
  prologue fixture regenerated with analysis.
- Screenshots of every zone and the opening. `npm test` clean.
- Then a build for the owner to play.
