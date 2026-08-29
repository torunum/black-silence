# Where this project stands

Written to survive session loss. If you are picking this up cold, read this
file, then `docs/direction.md`, then the current plan under
`docs/superpowers/plans/`. Trust this file and `git log` over any recollection.

Last updated: 2026-08-29, after Plan 0F merged. **Phase 0 is complete.**
`src/legacy.js` is deleted, the burn-down is zero, `strict: true` is on, and
every hardening item the spec listed is either done or recorded with a reason.
Next up is Phase 1.

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
| 0E | Systems: renderer, level loader, weapons, enemy AI, player, interaction | **merged** |
| 0F | UI, piano, loop and boot; then hardening — gameplay `setTimeout` removal, dispose registry, `strict: true`, the Three.js upgrade | **merged** |

The spec originally sized the remainder as two plans; the real shape is four.

### Progress metric

`src/legacy.js` holds whatever has not been carved out yet. Its line count is
printed by `npm test` as the port burn-down. When it reaches zero the port is
done.

```
3759 → 3040 (0A) → 2224 (0B) → 1633 (0C) → 1616 (0D) → 282 (0E) → 0 (0F)
```

**The port is complete.** `src/legacy.js` was deleted in Plan 0F Task 4
(`e56bc2f`); `src/` contains no `.js` file, and `tsconfig.json` has `strict:
true` with no `allowJs`/`checkJs`, so every line of the port is type-checked.

Tests: 0 → 114 → 167 → 348 → 357 → 369 → 400.

Within 0E: 1616 → 1573 (T3) → 1547 (T4) → 1322 (T5) → 1100 (T6) → 1009 (T7)
→ 901 (T8) → 712 (T9) → 326 (T10) → 292 (T11) → 278 (T12a, 81 dead imports).

0E removed 1334 lines from `legacy.js`, more than the previous four plans
combined. What is left is 282 lines holding exactly fourteen functions, all of
them Plan 0F's.

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

Branch `phase-0e-systems`, **all twelve tasks done, reviewed, ready to merge**.
Plan document:
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
| 9 — damage and death | complete; first dispatch correctly refused a circular split |
| 10 — enemy AI (largest section) | complete in three commits; recovered from a broken tree |
| 11 — random events and ambience | complete |
| 12 — branch review and merge | reviewed; 3 Important findings all closed |

**Task 2 was withdrawn before execution.** It created `Context.ts` with no
consumer: Tasks 3 and 4 import state objects directly, so the locator's first
real user is Task 5. Shipping a module nothing imports for three tasks is the
abstraction-with-no-user the plan's own Decision 2 rejects for `Events.ts`.
`Context.ts` is now born in Task 5. Task numbering was left alone.

`Context.ts` peaked at **six** entries in Task 9 and Task 10's Step 6 was the
first pass that **shrank** it, to three: `damagePlayer`, `damageEnemy` and
`wakeBoss` retired to direct imports once the AI extraction's four-way split
made every remaining cycle edge one-way, each confirmed against
`madge --circular` before being kept. The three that remain — `endLevel`,
`openPiano`, `showWin` — are a different kind of entry: they bridge to
functions that have not been extracted at all, all three belonging to Plan 0F.
Each is registered by whoever owns the function *at the time*, so when a later task extracts that
function the registration moves and **no call site changes**. That property is
what lets the remaining tasks land in order. It is deliberate debt, tracked as
KNOWN-2, not the end state.

### What has gone wrong in 0E, and what it teaches

Every one of these is recorded in full in the ledger.

1. **The plan document was corrected eight times mid-flight**, each time
   because a measurement contradicted it: Task 2's dead module, Task 4's
   resize listener firing against a null renderer, Context's placement (guessed
   wrong twice before being measured), Task 6's `damageEnemy` callers, Task 9's
   and Task 10's file splits — **both circular and neither could have built** —
   and Task 11's claim that `eventTick` calls the piano, which it does not.
   Measure the code before dispatching each task; never trust a plan's own
   dependency claims.
2. **A brief's line ranges ran long five times.** They are computed as "next
   function start minus 1", so trailing banners, blank lines and `const`
   declarations get swept in. Only the START line is reliable.
3. **The dependency script only scans `function` declarations.** It missed
   shared `const` data twice (`WEAPONS`/`EQUIP_T` in Task 6, and it reported
   in-task calls as one list without marking which target *file* each landed
   in, which is what made Task 9's split look acyclic when it was not).
4. **Implementers pushed back four times and were right every time** — Task
   7's caught a brief asserting "no naming clash" without checking (`footstep`
   calls AudioEngine's `ctx()`); Task 9's first refused to build a circular
   split and returned NEEDS_CONTEXT with evidence; Task 10a refused to commit a
   diff containing another agent's half-finished work; and Task 12a found two
   real bugs in a throwaway analysis script it had been told to verify rather
   than trust. **Briefs must tell implementers to verify inherited claims, and
   must make stopping an acceptable outcome.**
5. **Two tasks were recovered from sessions that died mid-task.** Task 5's left
   four uncommitted leaf modules with `legacy.js` untouched, and the tree was
   *green* in that state because nothing imported the new files yet. Task 10's
   was worse: it had written `Boss.ts` and added the import but not removed the
   old definitions, leaving a duplicate-declaration syntax error — **and the
   suite still reported green**, from a stale vitest transform cache. **A green
   suite proves nothing about a recovered tree.** Check `git status` for
   stranded work, parse-check `legacy.js` with esbuild, and re-run with
   `npx vitest run --no-cache`.
6. **`checkJs: false` on `legacy.js` hides more than typos.** It also hides
   dead imports: 81 of its 145 imported names were unused by the end, each one
   left behind when a later task moved a caller out. Nothing in the toolchain
   flags them.

## Plan 0F status

Branch `phase-0f-ui-and-hardening`, **merged**. Twelve tasks. Ledger:
`.superpowers/sdd/2026-08-25-phase0f-ui-loop-and-hardening/progress.md`.

Tasks 1-4 finished the port: the piano, level end/win/HUD, idle quips and
menus, then the loop, the clock and boot. **`src/legacy.js` was deleted** and
`allowJs`/`checkJs` went with it, so every line is now type-checked. Tasks 5-11
then changed behavior deliberately — the first time Phase 0 did — in exactly
the four ways the spec sanctions:

| Change | Where | Pinned by |
|---|---|---|
| four gameplay `setTimeout`s onto a hit-stop-scaled, pausable clock | `core/Time.ts` | `core/time.test.ts`, `integration/schedulerWiring.test.ts`, `core/scheduleDelays.test.ts` |
| every remaining timer cancellable on level load | `core/Timers.ts` | `core/timers.test.ts`, `integration/timerCancellationWiring.test.ts` |
| per-level GPU resources freed on level load | `render/DisposeRegistry.ts` | `render/disposeRegistry.test.ts`, `integration/gpuDisposeWiring.test.ts` |
| `strict: true` | `tsconfig.json` | the compiler |

KNOWN-3 closed. KNOWN-12, KNOWN-13 and KNOWN-14 opened.

**The Three.js upgrade was evaluated and deferred**, which the spec §9
pre-authorised. Not because it breaks — the port's 34 `THREE.*` APIs all still
exist — but because it is **unverifiable here**. `RenderCore.ts`'s
`if (THREE.sRGBEncoding !== undefined)` guard reads as defensive coding and is
really a tripwire pointing the wrong way: on modern Three that property is
`undefined`, so the line would silently no-op and sRGB output would switch off,
shifting every colour with nothing able to see it. Colour management went
default-on in r152 and light intensities changed meaning in r155. No test here
samples pixels. See KNOWN-14.

### What Plan 0F found, and what it teaches

The recurring theme of this branch was **guards that kept reporting success
while covering less**, and it turned up four:

1. **`madge --circular src/` had been scanning one file since Plan 0A.** madge's
   default extensions exclude `.ts`, so the "no import cycles" hard gate looked
   at `legacy.js` and nothing else, for five plans. The `Processed 1 file` line
   said so every run and nobody read it. It was hiding a real cycle
   (`Damage -> Boss -> ai/Attacks -> world/Props -> Damage`) that Plan 0E had
   introduced while citing a clean madge run as proof. KNOWN-12.
2. **`smoke.test.ts` scanned only `legacy.js`** for DOM lookups, so every
   extraction quietly shrank its reach. Widened to all of `src/`: 11 checked
   lookups became 55.
3. **`vitest.config.ts` had `passWithNoTests: true`** — a glob that matched
   nothing would have exited 0 having run nothing.
4. **The four migrated delays had no test at their real call sites.** A
   thousandfold ms-for-seconds error passed 391 tests, because no fixture
   reaches those sites. This is the subtle one: `time.test.ts` proves the
   mechanism and `schedulerWiring.test.ts` proves the loop drives it, and
   neither touches a real call site.

The lesson, stated once: **when a tool prints how much work it did, read that
number** — and when a task moves code out of a file some test scans by name,
check that test's scope, not just its result.

Two more worth carrying:

- **A green suite proves nothing about a recovered tree.** Two tasks here were
  recovered from sessions that died mid-task; the second had left a real
  duplicate-declaration syntax error in `legacy.js` and the suite *still*
  reported green, from a stale vitest transform cache. Recovery means
  `git status`, an esbuild parse check, and `npx vitest run --no-cache`.
- **Implementers who stop are usually right.** Six did across 0E and 0F, and
  all six were. One refused a circular file split, one refused to commit
  another agent's half-finished work, one found two real bugs in a throwaway
  script it had been told to verify rather than trust, and one stopped rather
  than guess at a `strictFunctionTypes` fix that would have broken a
  byte-compared body. Briefs should make stopping an acceptable outcome.

### The next action

**Phase 1.** `core/Events.ts` gets built when the first system actually needs a
subscriber, deliberately not before (Plan 0E Decision 2); `wakeBoss` — the one
entry left in `Context.ts`, and a genuine cycle break rather than a bridge to
unmoved code — is its natural first candidate. KNOWN-13's fifteen duplicate
enemy interfaces are also Phase 1's.

Phase 2 owns the deferred Three.js upgrade (KNOWN-14), KNOWN-7 (casings never
reaching the screen) and KNOWN-8 (the six-slot mouse wheel). Phase 4's level
rebuild owns KNOWN-4 and KNOWN-11.

The one definition-of-done item that **cannot** be checked in this environment
is "`npm run dev` plays identically to `reference/sonsurum.html`". The browser
pane throttles `requestAnimationFrame` to zero when it is not displayed, so the
game loop does not run there — see the environment notes below. The
characterization traces are the substitute evidence, and they are the reason
this phase was safe to attempt at all.

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
