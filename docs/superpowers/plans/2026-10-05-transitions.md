# Level transitions, and a quieter HUD

The owner, 2026-10-05:

> The level transitions are very bad. Not going into a pit — something else.
> The kick doesn't need a reload timer on screen; it's fast enough anyway.

(Also: "levels longer and a bit more complex; new levels can be added" — that
is the next plan, after this one.)

## What exists, measured

- **The exit** is the `X` grid tile: `LevelLoader.ts` records `world.exitPos`
  and builds a glowing pad with a light; `Player.ts`'s `playerTick` calls
  `endLevel()` (`src/ui/LevelEnd.ts`) when the player comes within 1.2 of it
  (unless a boss still lives: "SOMETHING STILL BREATHES HERE"). `endLevel`
  freezes the game, releases the pointer and shows `#levelend` — a grade, a
  stats block and a `[ DESCEND TO … ]` button; clicking it calls
  `loadLevel(S.level+1)`. So a level ends by walking onto a glowing hole in
  the floor and clicking a button on a static panel.
- **The kick meter** is `#kickwrap` (`index.html`) driven by `src/ui/Hud.ts`
  lines ~50-54: a fill bar and a label "KICK 1s" / "KICK [RMB]".

## Global Constraints

- `reference/sonsurum.html` is never edited; this is a deliberate divergence.
- No gameplay values change: the kick cooldown stays 1 s; the boss-alive rule
  at the exit stays; saves (`maxLevel`) and level indices stay.
- **Trace fixtures**: the HUD digest in the traces may include the kick label
  — removing it moves the HUD field in every fixture. That is sanctioned:
  follow each fixture's header procedure, prove only that field moved,
  write the analysis, regenerate. The exit change must not move camera or
  HUD before the exit is reached; scene digests move where the exit's mesh
  changes.
- No `Math.random` at load or per tick in anything new.
- No `src/` file over 400 lines; no import cycles; `npm test` green with the
  exit code captured; Write tool for scripts; never `git checkout --`; commit
  early; nothing untracked; **no `Co-Authored-By`**.

## Task 1 — no kick meter

Remove the kick meter from the HUD (markup, style, update code). Keep the
cooldown itself. Rewrite, not delete, tests that pin the meter.

Commit: `feat: the kick needs no meter on screen`

## Task 2 — leaving a level through a door

Replace the floor pad with an **exit that is a place**: a great door or gate
set in a wall, in the level's theme (iron-bound dungeon door, church doors,
tomb gate, cemetery gate, sewer hatch-and-ladder or sluice door, factory
freight door, a flesh sphincter in the womb; the prologue's climb ends at a
crypt door into the dungeon). It glows or is lit so the player knows it is
the way on. It is opened like other doors (walk up, press E or touch it —
match how the game's doors open), honouring the boss-alive rule.

Then the transition, all in-engine, no static panel first:

1. Input locks; the door swings or grinds open; the camera walks through
   into darkness over ~1.5 s while the world fades to black, with a sound.
2. A **chapter card** over black: the level's name struck through or marked
   done, the grade and stats (reuse `gradeOf`/`statsHtml`), and one ADEM line
   in his voice. Continue on any deliberate key or click (not the click that
   was already held; reuse the opening's deliberate-skip rules).
3. The next level loads behind black, and **fades in** with the player just
   inside an entrance door, the level title shown as it fades.

The win screen at the end of the game stays as it is unless it shares code.

Look at it in the Browser pane: frames of the door, the walk-through, the
card and the arrival, on at least two levels.

Commit: `feat: a level ends at a door, and the next begins through one`
