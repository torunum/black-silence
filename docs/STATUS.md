# Where this project stands

Written to survive session loss. If you are picking this up cold, read this
file, then `docs/direction.md`, then the current plan under
`docs/superpowers/plans/`. Trust this file and `git log` over any recollection.

Last updated: 2026-08-25, mid Plan 0E (Tasks 1 and 3-8 landed; Task 9 in flight).

---

## What this is

`THE BLACK SILENCE — The Hollow Parish`, a retro FPS that existed as a single
3967-line HTML file with an inline `<script>` and a CDN Three.js tag. It is
being turned into a professional indie retro FPS. The original is frozen at
`reference/sonsurum.html` and is **never edited** — it is the golden master
every fidelity test compares against.

`docs/direction.md` holds the approved creative decisions: five hand-carved
levels instead of eight, an enemy roster cut from 25 to 9 plus 3 bosses with
distinct brains, and a hybrid asset policy (procedural world, real audio and
type files).

## Phase 0 — the mechanical port

The whole of Phase 0 changes **no behavior at all**. It exists so that every
later phase has a foundation. Existing bugs are preserved deliberately and
pinned by characterization tests.

| Plan | Scope | Status |
|---|---|---|
| 0A | Vite + TypeScript scaffold, pure data layers, level tables | **merged** |
| 0B | Procedural textures, sprite baker, item textures, the whole audio layer | **merged** |
| 0C | Behavioral oracle, FX layer, weapon viewmodel art, subtitles, input | **merged** |
| 0D | The global-to-state migration (70 globals, ~700 call sites) | **merged** |
| 0E | Systems: renderer, level loader, weapons, enemy AI, player, interaction | **in progress** — branch `phase-0e-systems` |
| 0F | UI, piano, loop and boot; then hardening — gameplay `setTimeout` removal, dispose registry, `strict: true`, the Three.js upgrade | not started |

The spec originally sized the remainder as two plans; the real shape is four.

### Progress metric

`src/legacy.js` holds whatever has not been carved out yet. Its line count is
printed by `npm test` as the port burn-down. When it reaches zero the port is
done.

```
3759 → 3040 (0A) → 2224 (0B) → 1633 (0C) → 1616 (0D) → 901 (0E, through Task 8)
```

Tests: 0 → 114 → 167 → 348 → 357 → 364 (0E Task 1).

Within 0E: 1616 → 1573 (T3) → 1547 (T4) → 1322 (T5) → 1100 (T6) → 1009 (T7)
→ 901 (T8).

## Plan 0C status

Branch: `phase-0c-oracle-and-fx`, merged from `master`. All five tasks
committed; nothing is stranded.

| Task | State |
|---|---|
| 1 — behavioral oracle | complete, reviewed clean |
| 2 — FX layer (particles, decals, gibs) | complete, reviewed clean |
| 3 — weapon viewmodel art (447 lines) | complete, reviewed; KNOWN-6 closed |
| 4 — subtitles, achievements, HUD messages | complete, sabotage-verified |
| 5 — input | complete, sabotage-verified |

KNOWN-6 (Overlay2D untested) is closed by `tests/behavior/overlay2d.test.ts`
— 26 cases, no source changes, verified by re-running the seven sabotages
that originally exposed the gap plus five chosen independently. One literal,
the casing's `life:1.6`, is provably unobservable, and finding out why turned
up **KNOWN-7: spent casings never reach the screen at all** (spawned in
`FW`/`FH` space, culled in `VW`/`VH` space), with most blood splats drawn
off-canvas for the same reason.

Task 4 built `src/content/achievements.ts` — deferred since Plan 0A because
the reference has no achievements table; all 20 were inline literals at their
trigger sites. Since there is no reference range to compare it against,
`tests/content/achievements.test.ts` re-extracts all 20 triples from the
frozen reference by regex and asserts the table reproduces them, and that
every `ach(ACHIEVEMENTS.x, S.ach)` call site names an id the table defines.

Plan 0C sized the end state as "roughly 1550 lines"; the real figure is 1633,
because Task 5 could not simply delete its section — the input handlers call
back into gameplay code that is still in legacy.js, so a 12-line
`setInputHooks({...})` block replaced the 32 lines that left.

The whole-branch review found no behavioral defect — every extracted seam
was checked field-by-field against the globals the reference actually reads
— but it did find one systemic gap, KNOWN-9: the *wiring* in legacy.js had
no coverage at all. Three sabotages of it (`swayX:getSwayY()`,
`drawKickBoot(0)`, `currentWeapon:()=>S.cur+1`) each left all 331 tests
green while visibly breaking the game.

**KNOWN-9 is now closed** by `tests/integration/wiring.test.ts`, which boots
the real legacy.js under jsdom, starts a real level and runs real frames
with only the modules under test swapped for recorders. That file is also
the pattern to copy whenever a later plan parameterises another carve. See
`docs/known-issues.md` for the two residual seams it documents rather than
closes.

## Plan 0D status

Branch `phase-0d-global-to-state`, **merged**. Twelve tasks, each with its own
implementer and its own scoped review.

Every remaining mutable cross-module global is now a property on an owning
state object — `player.px`, not `getPx()/setPx()` — because an ES module's
`let` export is read-only to importers while an object's properties are not.
Twelve state modules were created (`ShakeState`, `SaveGame`, `Heads`,
`PianoState`, `Projectiles`, `AmbienceState`, `Game`, `WeaponRuntime`,
`Renderer`, `WorldState`, `PlayerState`, `State`), and Task 11 converted
`src/player/Input.ts`'s fourteen getter/setter pairs to the same shape, so the
codebase has one pattern rather than two. `legacy.js` burned down 1633 → 1616;
it only drops 17 lines because most of the work was rewriting ~700 call sites,
not deleting code.

Verified empty at the end: a corrected inventory script reports zero migrated
globals still declared in `legacy.js`. The 19 remaining top-level declarations
are all `const`, which the plan deliberately left out of scope — only `let`
bindings cannot cross a module boundary.

Three things worth carrying forward:

1. **The plan's own inventory script was wrong**, and it took until Task 8 to
   notice. It only read declaration names from lines *starting* with
   `let`/`const`/`var`, so the continuation line of a two-line declaration was
   invisible and its eight globals were reported as already migrated. They
   were not. That became Task 8b. The plan document carries the full
   correction; **fix the script before trusting it again.**
2. **Task 5's implementer worked from a stale copy** and silently reverted
   Task 4's already-approved migration while believing it was only adding
   code. The test suite could not see it — a bare `let ambT` and
   `ambienceState.ambT` behave identically at runtime — and only the scoped
   diff review caught it. This is why every task gets a review even when the
   suite is green.
3. **Commit `8d916ce` (Task 1) was the one commit that never got a scoped
   review**, because it was written inline before the subagent loop started
   and Task 2's review range began at it. Both Important findings in the final
   whole-branch review were in it. Work done outside the loop still needs the
   loop's gate.

## Plan 0E status

Branch `phase-0e-systems`, **in progress**. Plan document:
`docs/superpowers/plans/2026-08-15-phase0e-systems.md`. Full task-by-task
ledger, including every correction and deviation:
`.superpowers/sdd/2026-08-15-phase0e-systems/progress.md` (gitignored — read it
before dispatching anything).

0E moves *functions*, not state. Its central problem is that some of them call
each other **both ways** (enemy AI damages the player; the weapon FSM asks
collision for a hit and collision asks the weapon table for stats).
`madge --circular` is a hard gate, so those cycles get broken as the systems
move, via the service locator `src/core/Context.ts`.

| Task | State |
|---|---|
| 1 — combat characterization trace | complete; KNOWN-10 closed, 357 → 364 tests |
| 2 — Context.ts | **withdrawn** (see below) |
| 3 — collision | complete, reviewed clean |
| 4 — renderer core | complete, reviewed clean |
| 5 — level loader + props | complete; recovered from an interrupted session |
| 6 — weapons FSM + hitscan | complete; broke 2 of the 3 cycles |
| 7 — player | complete |
| 8 — interaction, pickups, projectiles | complete |
| 9 — damage and death | in flight |
| 10-12 — enemy AI, events/ambience, branch review + merge | not started |

**Task 2 was withdrawn before execution.** It created `Context.ts` with no
consumer: Tasks 3 and 4 import state objects directly, so the locator's first
real user is Task 5. Shipping a module nothing imports for three tasks is the
abstraction-with-no-user the plan's own Decision 2 rejects for `Events.ts`.
`Context.ts` is now born in Task 5. Task numbering was left alone.

`Context.ts` holds **four** entries as of Task 8 (`damagePlayer`, `damageEnemy`,
`endLevel`, `openPiano`), rising to six in Task 9. Each is registered by
whoever owns the function *at the time*, so when a later task extracts that
function the registration moves and **no call site changes**. That property is
what lets the remaining tasks land in order. It is deliberate debt, tracked as
KNOWN-2, not the end state.

### What has gone wrong in 0E, and what it teaches

Every one of these is recorded in full in the ledger.

1. **The plan document has been corrected five times mid-flight**, each time
   because a measurement contradicted it: Task 2's dead module, Task 4's
   resize listener firing against a null renderer, Context's placement (guessed
   wrong twice before being measured), Task 6's `damageEnemy` callers, and Task
   9's file split, which was **circular and could not have built**. Measure the
   code before dispatching each task; do not trust the plan's own dependency
   claims.
2. **A brief's line ranges have run long three times.** They are computed as
   "next function start minus 1", so trailing banners, blank lines and `const`
   declarations get swept in. Treat every range end as approximate.
3. **The dependency script only scans `function` declarations.** It missed
   shared `const` data twice (`WEAPONS`/`EQUIP_T` in Task 6, and it reported
   in-task calls as one list without marking which target *file* each landed
   in, which is what made Task 9's split look acyclic when it was not).
4. **Two implementers pushed back and were right** — Task 7's caught a brief
   that asserted "no naming clash" without checking (`footstep` calls
   AudioEngine's `ctx()`), and Task 9's first refused to build a circular
   split and returned NEEDS_CONTEXT with evidence rather than guessing. Briefs
   should tell implementers to verify inherited claims, not just follow them.
5. **Task 5 was recovered from a session that died mid-task**, leaving four
   uncommitted leaf modules with `legacy.js` untouched. The tree was *green* in
   that state, because nothing imported the new files yet. **A green suite does
   not mean a task finished** — check `git status` for stranded work before
   assuming a clean baseline.

### The next action

Finish Task 9, then Tasks 10-12. Task 10 (enemy AI, ~352 lines) is the largest
and most coupled section and moves last on purpose, when everything it calls is
already a module. Its `damageEnemy`/`damagePlayer`/`wakeBoss` edges are already
wired through `Context` by Tasks 7 and 9, so it should need no new entries —
verify that rather than assuming it.

## How fidelity is guarded

Five mechanisms, and they are **not** interchangeable:

- **`tests/behavior/`** — a recorder. Runs the reference's code and the ported
  module's side by side against instrumented canvas and WebAudio stubs, under a
  seeded PRNG, and compares ordered call logs. Survives renames, reformatting,
  type annotations and state refactors. This is what makes Plan 0D possible.
- **`tests/fidelity.test.ts`** — byte-identical comparison. Correct for pure
  **data** only. It was once written as the rule for code too, which was
  incoherent for code the port necessarily annotates.
- **Ordinary unit tests** — for math over state that draws nothing.
- **`tests/integration/wiring.test.ts`** — the one the three above are blind
  to. They all test a *module* against the reference; none tests whether
  `legacy.js` hands that module the right values, because each supplies its
  own inputs. This one boots the real `legacy.js`, starts a real level and
  runs real frames. Add to it whenever a carve is parameterised — that is
  exactly when a new seam appears.
- **`tests/integration/trace.test.ts`** — a characterization recording, added
  for Plan 0D. It plays 900 scripted frames of the real game and compares the
  camera, a scene-graph hash and the HUD against a committed fixture. It is
  what makes a mass call-site rewrite safe: it caught `px`/`pz` and `vx`/`vz`
  transpositions, `sin`/`cos` in the heading, and constant drift in gravity
  and shake decay. **Its fixture was recorded before Plan 0D's first
  migration and must not be regenerated casually** — its whole value is being
  a pre-migration recording. `WRITE_TRACE=1` exists for deliberate,
  explained updates only. Note it plays the prologue, which has zero enemies,
  so the entire combat-resolution path is unexercised by it; the file says so
  at length.
- **`tests/integration/combatTrace.test.ts`** — the same mechanism aimed at the
  gap the prologue trace leaves. Added by Plan 0E Task 1 and the reason 0E was
  allowed to move combat code at all. It plays **level 1** (15 enemies) for 168
  frames: hp falls 100 → 55 and the scene count drops three times. That was
  only possible because Plan 0D made `save.maxLevel` a writable exported
  property a test can assign. Its fixture is a pre-migration recording under
  the same rule — **never regenerate it to turn a red build green.** Task 1's
  review independently re-derived why each observable is combat-specific:
  casings and muzzle flashes live on the 2D overlay rather than the 3D scene,
  and decals are recycled via `shift()` rather than removed, so the zero-enemy
  prologue never produces a single scene-count decrease across 900 frames.

KNOWN-5 in `docs/known-issues.md` documents the recorder in full, including an
honest list of what it still cannot reach.

## Method

Work goes through `superpowers:subagent-driven-development`: a fresh
implementer subagent per task, a task review after each, and a whole-branch
review before merge. Reviews have repeatedly caught real defects, so the loop
earns its cost.

Two practices that have mattered most:

1. **Reviewers must sabotage with their own choices, not repeat the
   implementer's.** This is what caught a string-blind normalizer rule, a
   torch frame-order bug, gib velocities with no coverage, and the whole of
   KNOWN-6.
2. **Every line number in every plan has been wrong at least once.** Confirm
   ranges by reading content, never by arithmetic on a documented number.

## Environment gotchas

- **Node is not on PATH in a fresh shell here.** It is installed at
  `C:\Program Files\nodejs` (v24.19.0 / npm 11.17.0) and the machine PATH in
  the registry contains it, but shells started before the install carry a
  stale environment. Prefix every command:
  - Bash: `export PATH="/c/Program Files/nodejs:$PATH"`
  - PowerShell: `$env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"; `
  A restart of the session fixes it properly.
- **The browser harness only partly drives this game.** Pointer lock is
  blocked (`requestPointerLock` rejects with `WrongDocumentError`), so mouse
  look cannot be exercised in the page at all; screenshots fail whenever the
  Browser pane is not displayed, because a hidden pane composites no frames;
  and the animation-frame pipeline has frozen entirely on several sessions (a
  bare `requestAnimationFrame` counter with no game code involved gets zero
  callbacks). What *does* work, verified in the Task 5 session: menu clicks,
  level loads, and **synthetic `KeyboardEvent`/`MouseEvent`/`WheelEvent`
  dispatched from `javascript_tool` with a real `code` field** — the earlier
  note that automated key events arrive with an empty `code` did not hold
  here; `new KeyboardEvent("keydown",{code:"KeyW"})` reaches the game's
  handlers and sets `keys.KeyW`. Combined with dynamically importing the
  live-served module in the running page, that is enough to verify input,
  HUD and subtitle behavior end to end.
- **`npm run build` plus inlining produces a single playable file.** The
  gitignored `THE-BLACK-SILENCE.html` at the repo root is that artifact — it
  loads from `file://` with no network.

## Five bugs a player will actually hit

All predate the port, all are preserved on purpose, all are pinned by tests
so they cannot change unnoticed. See `docs/known-issues.md`.

- **KNOWN-1** — Level 1 has a red key and a miniboss guarding it, but no locked
  door anywhere. The key does nothing.
- **KNOWN-4** — `loadLevel` checks the enemy table before the prop table, and
  `C` and `V` are in both. Level 2's eight `V` tiles, written under a comment
  reading "nave pews", spawn **eight Factory Foreman bosses** (2600 hp each).
  The chair in the priest's chambers is a Cacodemon. Do not "fix" the character
  collision without deciding what Level 2's furniture should be — removing
  eight bosses is a balance change.
- **KNOWN-7** — Spent shell casings are spawned in `FW`/`FH` coordinates but
  culled and drawn in `VW`/`VH` space, so every casing is spliced away before
  its first draw. The whole casing art path is unreachable in a real window.
  Screen-blood splats share the mix-up without the cull: about three quarters
  of each flash lands off-canvas.
- **KNOWN-8** — The mouse wheel cycles six weapon slots (`%6`) while the game
  has eight. The nail cannon and soul reaper are reachable only with `7` and
  `8`. The reference's own banner still reads "WEAPONS — 6 slots".
- **KNOWN-11** — **Armour pickups never spawn, from any level.** Found during
  Plan 0E Task 1 while building the combat trace. `loadLevel` dispatches the
  enemy table before the item table, and `A` is both a Mancubus and map2's
  armour key — so `map2.A` is dead code and all 20 `A` tiles spawn a 260 hp
  Mancubus instead of +50 armour. `S.armor` is provably always 0 in real play.
  Same structural bug as KNOWN-4 but a different collision class (enemy-vs-item
  rather than enemy-vs-prop), and identical in the frozen reference.
