# Where this project stands

## Publication checkpoint - 2026-09-18

The project owner requested a public GitHub release with promotional media.
Repository: https://github.com/torunum/black-silence (public, created).
Live playable URL: https://torunum.github.io/black-silence/.
The release workflow in `.github/workflows/pages.yml` checks the game before
deploying it. First deployment succeeded in Actions run `35374911344`:
https://github.com/torunum/black-silence/actions/runs/35374911344.
Live Chromium check passed: New Game starts, movement changes rendered
frames, and no page errors were reported. The hosted MP4 responds HTTP 200.
Release: https://github.com/torunum/black-silence/releases/tag/preview-2026-09-18.
Both the HTML and the 25.76-second, 720p trailer are attached. The downloaded
release HTML matches the local artifact byte-for-byte (SHA-256
`2a2ab0add8389260b01d466cb436634d7f730eab805eabf12c52730cea947474`).
Publication commit: `5c8b49f`; pending armour plan saved separately in `a05b838`.

Prepared: English/Turkish README and press kit, a 1280x720 trailer with actual
game audio, gameplay GIF, cover and screenshots. See `docs/media/README.md`
for the footage's staged positions/loadouts and filming protection.
No gameplay source was changed for publication. The previously staged armour
plan remains a plan, not an implemented fix.

Fresh verification: 569 tests in 65 files passed; strict typecheck, 91-file
size gate and circular-import check passed. The current standalone build
was opened from file:// in Chromium: no network requests, no page errors,
and changing rendered gameplay frames after movement. Full Three.js license
is now embedded by the build script and documented in THIRD-PARTY-NOTICES.md.
No license grant has been assigned to the original game code/artwork.

The dated phase notes below are historical; use this checkpoint and git log
for the latest publication work.

Written to survive session loss. If you are picking this up cold, read this
file, then `docs/direction.md`, then the current plan under
`docs/superpowers/plans/`. Trust this file and `git log` over any recollection.
**Planning Phase 3's implementation itself needs one more stop, off that
path**: `docs/superpowers/specs/2026-09-12-phase3-roster.md`, the roster-cut
spec Phase 3 Part C wrote — its measured ground truth (which letters the kept
levels actually place, which KNOWN-15 fields the new roster needs, the
level-coupling decision left to the project owner) is what a Phase 3 plan
should be built from, and nothing on the file→direction.md→plan path above
names it.

Last updated: 2026-09-13, after Phase 3 Part D. Phase 0 finished the port,
Phase 1 gave the game sound and settings, Phase 2 Part A fixed the two shipped
bugs whose correctness is structural and instanced the level geometry, Phase 3
Part A gave the enemy one shape — closing KNOWN-13 and, in doing so, finding
KNOWN-15, the biggest live bug in the game — Phase 3 Part B closed the
coverage hole Part A's own postmortem found: the traces could not see which
sprite frame an enemy was showing — Phase 3 Part C measured the roster
cut's real cost against the real level grids, found and pinned KNOWN-18, and
wrote the Phase 3 spec named above, and Phase 3 Part D recorded the priest
boss fight before three brains replace it, closing the last four of Part B's
honest-gaps list, and Phase 2B Part A finally performed the Three.js upgrade
KNOWN-14 had deferred twice — on branch `phase-2b-threejs-evaluated`,
**unmerged**, because its deliverable is a decision a human has to make with
the game in front of them.
**Phase 2 Part B is blocked on a human running the game** — see the browser
note under Environment gotchas. **KNOWN-15 is blocked on the same human**, for
the same reason: it is a balance change nobody here can look at. **So is the
Three.js upgrade on `phase-2b-threejs-evaluated`**: it is done, the suite is
green and all three trace fixtures are byte-identical, and none of that is
evidence about what the game looks like — see the Phase 2B Part A status
section and KNOWN-14.

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

Tests: 0 → 114 → 167 → 348 → 357 → 369 → 400 → 449 → 458.

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

**Superseded by Phase 2B Part A**, which performed the upgrade on branch
`phase-2b-threejs-evaluated` (three pinned at 0.186.0). Two things this
paragraph says are worth correcting rather than leaving to be re-derived: the
API count is 38, not 34 (and not the 41 the Phase 2B plan quoted — a comment
in `src/audio/Listener.ts` naming two APIs the code does *not* use inflates
any naive grep), and "light intensities changed meaning in r155" is a
thinner description than what actually happens — the real mechanism is that
r128 multiplied every diffuse contribution by pi and modern three does not.
KNOWN-14 carries the measured version.

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
unmoved code — is its natural first candidate. KNOWN-13's duplicate enemy interfaces (sixteen across fifteen files) were consolidated by Phase 3 Part A.

Phase 2 owns the Three.js upgrade (KNOWN-14) — Part A already closed
KNOWN-7 (casings never reaching the screen) and KNOWN-8 (the six-slot mouse
wheel), and Phase 2B Part A has now done the upgrade itself on an unmerged
branch; see Phase 2 Part A status and Phase 2B Part A status below. Phase 4's level rebuild owns KNOWN-4
and KNOWN-11.

The one definition-of-done item that **cannot** be checked in this environment
is "`npm run dev` plays identically to `reference/sonsurum.html`". The browser
pane throttles `requestAnimationFrame` to zero when it is not displayed, so the
game loop does not run there **(this was measured wrong — the game does
render here; see Environment gotchas)** — see the environment notes below. The
characterization traces are the substitute evidence, and they are the reason
this phase was safe to attempt at all.

## Phase 1 status

Branch `phase-1-tier0-fixes`, **merged**. Spec and plan dated 2026-08-29.
Ledger: `.superpowers/sdd/2026-08-29-phase1-tier0-fixes/progress.md`.

**Phase 1 is the first phase that changed behavior on purpose.** Phase 0
preserved every bug deliberately; here each change is chartered to exactly one
task and pinned by a test.

| Task | Delivered |
|---|---|
| 1 | Persistence — versioned `localStorage` schema; corrupt, missing and future-version stores all fall back to defaults without throwing |
| 2 | Resolution setting, and the volume finally persisting |
| 3 | The panner chain — `at(x,y,z,fn)` and a per-emission `PannerNode` |
| 4 | 39 of 43 sound call sites emitting from their world positions |
| 5 | Adaptive music — exploration / combat / boss, 2.5s fade, 4s dwell |
| 6 | **Outstanding, deliberately** — real `.ogg` files are user-supplied and never blocked the phase |
| 7 | Whole-branch review; one Important finding, closed |

### The bet this phase was built on

Ten audio functions — `pianoNote`, `gurgle`, `pain`, `deathCry`, `wetDoor`,
`stoneDoor`, `bellToll`, `organChord`, `click`, `noiseBuf` — have **no
behavioural-recorder coverage**. Byte-identity comparison against the frozen
reference is their only guard.

So the positional-audio design was chosen to make sure those bodies never had
to change: every emitter already called `masterBus()`/`echoBus()` *inside its
own body, per emission*, so making the accessors return a positioned node made
all of them positional with **zero emitter edits**. Verified at the end:
`git diff master...HEAD` on `Sfx.ts`, `Voice.ts` and `Ambient.ts` is empty. The
bet held.

### What Phase 1 found

- **A contract that was wrong for its own primary use case.** Task 3 shipped
  `emitAt` consuming the position on first use, and flagged the consequence for
  Task 4 rather than acting on it. But `snarl` calls two emitters for six of
  its eleven branches, so positioning an enemy bark would have put the growl at
  the enemy and left the blip at the listener — half a sound from inside the
  player's head. **A task that flags a design consequence for the next task has
  usually found a design bug, not a documentation gap.**
- **Two boot-order bugs of the same shape**: module-scope initialisation
  reading state that boot has not loaded yet. A stored resolution would have
  applied only after the first window resize; a stored volume never applied at
  all. Phase 1 added persistence, so every module-scope read of a persisted
  value is now a candidate for this.
- **`bossPulse` was the only `setInterval` in the codebase** and `loadLevel`
  never cancelled it — `clearAllTimers()` tracks only `setTimeout`. It survived
  purely because the four `stopBossMusic()` call sites happened to cover the
  normal paths. Closed by Task 5.
- **Coverage that existed only because nothing exercised it**: `domStubs`'s
  `AudioContext` had no `createPanner()`, which nothing noticed while Task 3
  positioned nothing. Task 4's real callers crashed three tests immediately —
  found only because that task ran the full suite rather than the two files its
  gate named.
- **Wiring proof does not scale by booting.** Task 4's integration test covers
  two of ~15 call sites; the review swapped coordinates at a third and the
  whole suite stayed green. Closed with a structural check that asserts every
  `at()` call's first argument is an x term and its third a z term — cheap,
  total, and complementary to the two deep tests rather than a replacement.

Three times this phase an implementer caught a vacuous test **in its own work**
and rewrote it before committing, unprompted. That is new, and it is the
habit the briefs have been trying to build.

## Phase 2 Part A status

Branch `phase-2a-verifiable-world`, **merged**. Spec and plan dated 2026-08-31.
Ledger: `.superpowers/sdd/2026-08-31-phase2a-verifiable-world/progress.md`.

Phase 2 was **split by what this environment can verify**, which is the
decision worth remembering. The game was believed unrenderable here — a
belief corrected on 2026-09-14; see Environment
gotchas — so shadowed lighting, variable ceiling height, gothic trim and the
Three.js upgrade all wait for a human. Part A is the rest.

| Delivered | Evidence |
|---|---|
| The mouse wheel reaches all eight weapons (KNOWN-8 closed) | slot order, both directions, direction pinned separately |
| Casings and blood spawn in the 320-space they are drawn in (KNOWN-7 closed) | the per-`kind` art is reachable at ordinary aspect ratios for the first time |
| The casing's `life` literal, unobservable for two phases (KNOWN-6's exception removed) | pinned; `1.6`→`1.9` now fails one named test |
| Level walls, pillars and platforms instanced | prologue **237 → 33** scene children, level 1 **295 → 93** |

### The finding that cost the most, and taught the most

I told the geometry task in writing that the merge was **RNG-safe**, having
grepped the merge-target lines for `rnd()`/`Math.random()` and found none.

That was wrong. `THREE.MathUtils.generateUUID()` makes **four `Math.random()`
calls**, and every `Mesh`, `BufferGeometry` and `Material` construction burns
four generating a UUID **nothing in this codebase ever reads**. Collapsing 202
objects removed 808 draws from the seeded stream — measured, not inferred:
`loadLevel(1)` went 1824 → 1016 calls, and 202 × 4 accounts for the difference
exactly.

So *rendering object count* was silently coupled to *gameplay randomness*.
Instancing walls changed enemy timing. The implementer proved it and stopped,
rather than overriding a brief rule that had been built on my false premise —
which was the right call, because the rule ("a camera divergence is a real
bug") was unfollowable as written.

**Fixed at the root**: `tests/integration/gameplayTrace.ts` now keeps UUID
draws out of the seeded stream. The harness seeds a PRNG to make *gameplay*
deterministic, and a UUID is not gameplay. Left coupled, every future
rendering change would have silently moved the fixtures — Part B adds shadow
casters, Phase 3 multiplies enemy textures roughly eightfold, Phase 4 rebuilds
every level.

Done as **two commits so the second was interpretable**: the stub alone (no
`src/` change, both fixtures move), then the instancing (camera and HUD
unchanged in 0/90 and 0/176 frames, scene count and digest only, with constant
per-frame deltas matching the collapsed object counts). The whole-branch review
recomputed that diff independently rather than trusting the commit message.

The stub sniffs `Error().stack` for `generateUUID`, because `MathUtils` is
frozen and unpatchable. That is fragile in a specific way — a bundled or
minified three would silently stop matching and send UUID draws back into the
stream — so the teardown now **fails loudly if a run intercepted zero draws**.
That guard earned its keep at the Phase 2B upgrade: three 0.186.0 moved
`generateUUID` from `build/three.js:286` to `build/three.core.js:2317`, a file
that did not exist at r128. The frame name survived, the guard did not fire,
and `gameplayTrace.ts`'s coordinates were re-derived against the installed
0.186.0 rather than left dangling.

## Phase 2B Part A status

Branch `phase-2b-threejs-evaluated`, **not merged and not to be merged before
a human compares the two builds**. Plan and report:
`.superpowers/sdd/2026-09-14-phase2b-threejs-evaluated/`.

`three` and `@types/three` pinned at **0.186.0** (from 0.128.0). `tsc --noEmit`
passes with no change to any call site; all **38** `THREE.*` APIs `src/` used
at r128 still exist (39 now, after swapping `sRGBEncoding` for
`SRGBColorSpace` and gaining `ColorManagement`). Both earlier counts for this
were wrong — KNOWN-14 said 34, the plan said 41 — because a comment in
`src/audio/Listener.ts` naming two APIs the code deliberately does *not* use
inflates any naive grep. 38 is derived from comment-stripped source. `npm test` is green — 61 files / 493 tests — and **all three trace
fixtures are byte-identical**, none regenerated. Single-file build: 668 kB ->
698 kB.

The r128 baseline this whole comparison is measured against is **not
committed anywhere** — it only ever existed as a copy in this session's
scratchpad, which does not survive. To rebuild it: `git checkout d173b4b`
(the commit immediately before the upgrade), then `npm run build:single`,
then return to `phase-2b-threejs-evaluated` (or later). Do this before
setting up the human side-by-side if the scratchpad copy is gone.

**None of that is evidence about how the game looks, and this section exists
so nobody quotes it as if it were.** The digest's colour field cannot see a
colour-space change at all — `Color.getHex()` re-encodes to sRGB, so the round
trip is exact both ways (all 2^24 hex values, zero mismatches), and flipping
colour management on and re-running all three traces left every fixture
untouched. What the upgrade actually changes is the lighting model, which no
test here reaches: every diffuse contribution is now pi times smaller, point
lights use a different falloff *shape*, and `MeshLambertMaterial` shades per
fragment instead of per vertex. Nothing was retuned to compensate; that is the
human's call. KNOWN-14 carries the four decisions, the evidence behind each,
and the prediction the side-by-side is supposed to falsify. KNOWN-20 is a bug
the upgrade surfaced on the way past.

The identical finding recurred with audio: `src/audio/`'s synthesis draws
from the same seeded `Math.random()` at six sites, an `installAudioStub()`
was built the same way (stack-sniffed, same fail-loudly-on-zero guard), and
it is *still not wired in* — see `docs/known-issues.md`'s KNOWN-20 for why
(measured per-level draw counts, and the real cost of turning it on).

## Phase 3 Part A status

Branch `phase-3a-one-enemy-shape`. Plan dated 2026-09-08.
Ledger: `.superpowers/sdd/2026-09-08-phase3a-one-enemy-shape/progress.md`.

**KNOWN-13 is closed.** Sixteen hand-written interfaces across fifteen files
all described the same runtime object — the untyped record `spawnEnemy` pushed
into `world.enemies` — and nothing kept them agreeing. They are now
`Pick<Enemy, …>` aliases of one `src/enemies/Enemy.ts`.

| Delivered | Evidence |
|---|---|
| One `Enemy`, derived from the **producer** | 67 non-optional fields = exactly what `spawnEnemy`'s literal builds; the test parses `Enemy.ts` and compares to a real spawn |
| `spawnEnemy` returns `Enemy`; `world.enemies` is `Enemy[]` | reading an undeclared field off an element is now `tsc` error TS2339 |
| The fifteen `as unknown as SomeEnemy[]` casts gone | replaced by `readonly SomePick[]` bindings — a *checked* widening |
| `severKey`'s contradiction resolved | `string` in the writer vs `boolean` in the reader → the real union, guarded both directions |
| KNOWN-15 found and pinned | `tests/enemies/deadDefFields.test.ts`, four mutations |
| The walk-frame hole closed | `tests/enemies/walkFrames.test.ts` |

The direction is the finding. Consolidating the *consumers* would have
produced a seventeenth unchecked declaration; the interface is only load-bearing
because the producer has to satisfy it. Everything else followed from that —
including KNOWN-15, which became visible the moment "what the literal builds"
and "what the defs author" were written down side by side.

### The bug all 463 tests missed

Task 2 rewrote `if(moving&&e.atkAnim<=0)` as `if(moving&&(e.atkAnim??0)<=0)`
while converting a local interface to a `Pick<>`. It reads like a null-safety
tidy-up. It **inverts the condition**: `atkAnim` is `undefined` until an enemy's
first attack, and `undefined<=0` is false while `(undefined??0)<=0` is true. So
every enemy in the game cycled its walk frames from the moment it spawned,
where the reference cycles none until the enemy has attacked.

The whole suite stayed green, and the reason is a coverage hole rather than bad
luck: `digestScene` (`tests/integration/gameplayTrace.ts`) hashed each object's
type, position and `visible` — **not `material.map`**. Both trace fixtures were
blind to which texture a sprite is showing, and nothing else in the suite looked
at enemy sprite-frame selection at all. That hole is now closed — see Phase 3
Part B below.

It was caught by **reading the diff**, not by running anything. Three lessons,
in the order they cost something:

- A `??` inserted for tidiness is a behavior change wherever the operand is
  legitimately `undefined`. Three sibling `??` sites in the same commit were
  genuinely equivalent, which is what made the fourth easy to wave through.
- A green suite is evidence about what the suite covers, and nothing else.
  This is the same shape as KNOWN-12's madge run and KNOWN-6's untested
  overlay: the gap was invisible precisely because nobody had asked what
  `digestScene` hashes.
- The fix now has its own test, and that test was proven by restoring the `??`
  form and watching two named cases go red. The hole itself — sprite-frame
  selection having no trace coverage — outlived that one line: it was closed
  properly by Phase 3 Part B, below, which widened `digestScene` itself
  rather than adding another test aimed at a single site.

### Counts nobody re-derived, again

Three separate written numbers about the enemy shape were wrong in this phase
alone: the plan's "69 fields" (really 67), its "seventeen interfaces" (really
sixteen — the scanner swept in `EnemyDefs.ts`'s `EnemyDef`, the one shape it had
excluded by name), and a brief's "`title` is on five boss defs" (really twelve
defs, eight of them bosses). KNOWN-13's own row had said fifteen when there were
already sixteen.

None of them changed a decision, and that is the point: they were quoted as
evidence and would have been baked into a doc row that outlives the phase. So
**every count in the new tests is derived at run time** — `deadDefFields.test.ts`
reads `ENEMY_DEFS` and spawns every authoring enemy; `enemyShape.test.ts` parses
`Enemy.ts` and compares sets. Neither asserts a number. The numbers that do
appear, in `docs/known-issues.md`, are descriptive and dated to a commit.

## Phase 3 Part B status

Branch `phase-3b-trace-sees-sprites`. Plan dated 2026-09-10. Ledger:
`.superpowers/sdd/2026-09-10-phase3b-what-the-trace-cannot-see/progress.md`.

Phase 3 Part A's own postmortem, above, named the hole this phase closes:
`digestScene` (`tests/integration/gameplayTrace.ts`) hashed each scene child's
type, position and `visible` and never `material.map`, so the entire enemy
sprite-frame system — walk cycle, attack pose, hurt/sever frame, the two-stage
death collapse, the headless corpse, the torch flicker — could be rewired
without either trace fixture noticing. That is exactly what happened: a change
chartered as type-only inverted `Behaviors.ts`'s walk-cycle guard, and all 463
tests passed, because nothing in the suite had ever asked what texture a
sprite was showing.

| Task | Delivered |
|---|---|
| 1 — the trace sees sprite state | `digestScene` now also hashes each material's texture *name* and its colour; both fixtures regenerated |
| 2 — `noUnusedLocals` | on in `tsconfig.json`; found three existing unused locals |
| 3 — `addBlob`, `deathBoom`, KNOWN-17 | `addBlob`'s return type precise; `deathBoom` pinned, deliberately not wired; KNOWN-17 closed |

### Task 1, and why it counts as a fixture regeneration in its own right

Naming a texture takes a reverse index (`buildTextureIndex`, built once after
`startGame`'s boot-time bakers run) from every texture in `PX`/`ITEMTEX`/`TEX`
to a short name (`z.a`, `item.torch[1]`, `tex.hellWall`), with a `~clone`
fallback for the level floor/ceiling's shared-canvas clones and a per-object
`unnamed#N` counter for anything left over — never `texture.uuid`, which is
four `Math.random()` draws that `installUuidStub` already has to keep out of
the seeded gameplay stream, for the same reason a uuid would also be unstable
across runs. `digestScene` appends that name, plus the material's colour, to
each textured child's part of the hash.

Regenerating a committed trace fixture over a `src/`-unchanged commit is rare
on purpose — this is only the **second** time this project has sanctioned it,
the first being Phase 2 Part A's geometry-instancing regeneration above. It
earned the same bar: both fixtures were compared field by field against their
pre-widening state, not by trusting a green run. Across all 90 + 176 sampled
frames of the two fixtures, `camera` (all seven components), every one of the
eight HUD fields and `scene.count` are byte-identical; only `scene.digest`
moved, in every sampled frame of both fixtures, which is the expected shape
rather than an alarming one — every frame of both levels holds textured
children.

The evidence that the widening was worth doing, not just harmless: restoring
`Behaviors.ts`'s walk-cycle guard to `(e.atkAnim??0)<=0` — Phase 3 Part A's own
bug — now reddens the combat-level fixture comparison, with a measured
footprint of **0** frames differing in `camera`, **0** in `hud`, **0** in
`scene.count` and **48** of the fixture's 176 sampled frames differing in
`scene.digest`. That is the old digest's exact blind spot, measured rather
than assumed: nothing the old digest recorded moved at all.

**The honest gaps — all four closed by Phase 3 Part D.** Nine `material.map=`
assignment sites exist in `src/`, across `Behaviors.ts` (four), `Boss.ts`
(two), `Damage.ts`, `Death.ts` and `Interact.ts` (one each). Five were reached
by the two committed fixtures when Part B shipped. The four listed here as
unreachable were:

- `Behaviors.ts`'s two-stage death collapse and `Death.ts`'s headless corpse,
  each gated behind a kind of kill level 1's one enemy death does not produce
  (it severs a limb instead), confirmed by mutation — rewriting both sites at
  once left both trace files green.
- Both of `Boss.ts`'s sites, inside `priestThink`, which only runs for an
  enemy with `priest:true`. Level 1's only boss, `U`, has `boss:true` but no
  `priest` flag.

**All four are now reached**, by the third fixture Phase 3 Part D added
(`tests/integration/bossTrace.test.ts`, level 2, THE CORRUPTED PRIEST) — each
confirmed by mutation against that fixture, not by argument. The two claims
above that were about the *fixtures* rather than the code were therefore
correct when written and are now superseded; only the narrower reading — that
level 1 and that script cannot reach them — still holds. Part B's own wording
was too strong in one place: a structural gap in the two fixtures that existed
is not a structural gap "regardless of script", since a different level has a
priest. Every `material.map=` site in `src/` is now covered by at least one
committed trace.

### Task 2 — `noUnusedLocals`

Turned on in `tsconfig.json`, closing the hole where a narrow `Pick<>`
binding widened to `Enemy[]` could orphan its own narrowed type with no
warning. It found three unused locals already in the tree: two were dead code
carried over verbatim from `reference/sonsurum.html` (confirmed unused there
too) and deleted; the third was a deliberately-uncalled type-only pin in a
test, which needed a `void`-reference rather than deletion so it keeps typechecking
without tripping the flag.

### Task 3 — `addBlob`, `deathBoom`, KNOWN-17

`addBlob` (`src/render/RenderCore.ts`) now returns its precise Three.js type
instead of a bare `Mesh`, so `Enemy.blob` carries that same precise type and
the cast it had bought back in `Behaviors.ts` is gone. `deathBoom`, the second
half of KNOWN-16, is pinned rather than fixed: it is authored on exactly one
enemy def and read nowhere in `src/` at all, a dead *def* field of a different
class than KNOWN-15's ten (those are read and never delivered; this one is
never read), and deliberately left that way — deleting it or wiring it up both
belong with the roster work that owns the def table. KNOWN-17 is closed:
`musicCancellationWiring.test.ts`'s three `as unknown as` casts are gone, the
same way `walkFrames.test.ts` closed the identical shape last phase.

`npm test`: **57 files / 477 tests**, all green; `tsc --noEmit` clean; the
file-size gate reports 90 files checked against the 400-line limit; `madge
--circular` reports `Processed 90 files` with no circular dependency.

## Phase 3 Part C status

Branch `phase-3c-roster-ground-truth`. Plan dated 2026-09-12. Ledger:
`.superpowers/sdd/2026-09-12-phase3c-roster-ground-truth/progress.md`.

Two tasks, neither touching gameplay. Task 1 added `tests/world/rosterReach.test.ts`,
deriving — by *building* every level module, never by scanning grid rows as
source text, which undercounts — which `ENEMY_DEFS` letters a level actually
places and which three call sites summon one by name; **KNOWN-18 found and
pinned, not fixed**: `B` and `q` are placed in no level and summoned nowhere,
which doubles two already-known dead fields (`burst` and `deathBoom`, both
authored on `q` alone) — deleting or placing either is a roster-composition
call for the project owner, not made here. Task 2 wrote **the Phase 3 spec**,
`docs/superpowers/specs/2026-09-12-phase3-roster.md`, turning `direction.md`'s
approved nine-enemy-plus-three-boss roster into something a plan can build
from: which letters each of the nine replaces, which of KNOWN-15's ten dead
fields the new roster needs, and what the cut does to the level grids.
Nineteen of the twenty-five letters are placed in a level the project is
keeping, so the roster cut and the Phase 4 level rebuild cannot both start
from an intact map — the spec states four options for that coupling and
leaves the choice to the project owner, who has not yet played the game.

`npm test`: **58 files / 481 tests**, all green; `tsc --noEmit` clean; the
file-size gate reports 90 files checked against the 400-line limit; `madge
--circular` reports `Processed 90 files` with no circular dependency.

## Phase 3 Part D status

Branch `phase-3d-boss-trace`. Plan dated 2026-09-13. Ledger:
`.superpowers/sdd/2026-09-13-phase3d-boss-trace/progress.md`.

One task: record `priestThink` before Phase 3 replaces it. `priestThink`
(`src/enemies/Boss.ts`) was the least-observed code in the game — the prologue
trace has no enemies and level 1's only boss carries `boss:true` without
`priest`, so **neither committed fixture ran a single line of it**, which is
why Part B's honest-gaps list named two of its `material.map=` sites as
unreachable. `tests/integration/bossTrace.test.ts` plays level 2 and fights
THE CORRUPTED PRIEST through all three phases: 5400 frames, 270 recorded, a
third committed fixture (`trace-level2-boss.json`).

Reaching a priest boss took seeding, and the seeding took one harness change.
`combatTrace`'s `beforeAll` technique works for the nail cannon this run is
given (`loadLevel` never touches the inventory) but **cannot** place the
player: `loadLevel` writes `player.px`/`player.pz` from the grid's `"P"` cell,
and it runs *inside* `runTrace` — measured, a `beforeAll` assignment of
(43,43) reads back as (25,5). `runTrace` therefore grew an optional
`afterLoad` callback, defaulted off, which is what the boss trace uses to put
the player beside the priest and deepen `S.hp`. Both existing fixtures are
byte-identical (checksummed, not assumed). No `src/` change.

What the new fixture bought, all by mutation rather than argument: **all four**
of Part B's remaining blind `material.map=` sites are now covered — `Boss.ts`'s
phase-3 form swap (frame 4900) and boss walk cycle (20 of 270 frames, both the
`Q` and `Q2` forms), plus `Behaviors.ts`'s two-stage death collapse (frame 800)
and `Death.ts`'s headless corpse (frame 240), the last two because this run's
kills include kinds level 1's single kill does not produce. Every
`material.map=` site in `src/` is now reached by at least one committed trace.
The form swap is the fragile one and the file says so at length: its mutation
moves exactly **one** sampled frame, because the walk cycle overwrites the same
`material.map` within 15 frames. Review round 1 turned that from a paragraph
into a structural guard: a `configurable` accessor records every write to the
priest's `material.map`, and a named test asserts a sampled frame always falls
between the form swap's write and the walk cycle's next one, so a retune that
drifts the two out of alignment now fails that named test rather than relying
on someone re-running the mutation by hand.

The fixture was regenerated three times and byte-compared: identical
(`md5 dc856a82…`) on all three, plus a fourth comparison run.

Also found: **KNOWN-19**, a latent race in seven integration files that boot
the real game on the real clock and leave `loadLevel`'s 1400ms timer armed past
teardown. The new file is long enough to keep the worker pool alive for it, so
a suite green for five plans reported an unhandled error once and not the next
run. All seven — `schedulerWiring.test.ts`, `wiring.test.ts`,
`gpuDisposeWiring.test.ts`, `positionalCallers.test.ts`, `contextWiring.test.ts`,
`musicCancellationWiring.test.ts` and `timerCancellationWiring.test.ts` — are
fixed, and `docs/known-issues.md` marks the row **closed**.
`renderWidthBootWiring.test.ts` was on the original hand-counted list (which
said five) but is a verified false positive: it imports `src/main` but never
calls `loadLevel`/`startGame`/a menu click, so `startGame` never runs there.

`npm test` at the Phase 3 Part D merge: **59 files / 488 tests**, all green;
`tsc --noEmit` clean; the file-size gate reports 90 files checked against the
400-line limit; `madge --circular` reports `Processed 90 files` with no
circular dependency. On the unmerged `phase-2b-threejs-evaluated` branch it is
**61 files / 493 tests**, 91 files at both gates — `src/render/ColorPolicy.ts`
plus `tests/render/colorPolicy.test.ts` and `tests/render/outputColorSpace.test.ts`.

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
- **`tests/integration/bossTrace.test.ts`** — the third recording, added by
  Phase 3 Part D for the gap the other two leave: neither runs `priestThink`
  (`src/enemies/Boss.ts`) at all, because the prologue has no enemies and level
  1's only boss carries `boss:true` without `priest`. It plays **level 2** and
  fights THE CORRUPTED PRIEST through all three of its phases over 5400 frames
  (270 recorded), and it is what closed the last four of Phase 3 Part B's
  honest-gaps list. Its fixture is a **pre-rewrite** recording under the same
  rule as the other two, with one difference that is the whole point of it:
  **Phase 3 replacing `priestThink` with three distinct boss brains is expected
  to move it**, and that regeneration — done properly, with a field-by-field
  account of the diff — is the reason it exists. The file's header carries that
  instruction in full, along with what it seeds (a nail cannon, the player's
  position beside the boss, a deep health pool) and what a seeded start
  therefore does and does not prove.

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
- **The game DOES render in the Browser pane, and this note has now been
  wrong in both directions.** Corrected 2026-09-14 by direct measurement.

  What was measured this time, on the real page served by a real `vite` dev
  server: a bare `requestAnimationFrame` counter fired **363 times in 2
  seconds** (`document.hidden === false`), the menu responded to a click, the
  game started, and `computer{action:"screenshot"}` returned **fully rendered
  frames** — torch-lit walls, the weapon viewmodel, the HUD — from two
  different levels and two different Three.js revisions.

  The consequence is not subtle: **`src/core/Loop.ts` never runs here, so
  nothing is ever rendered.** A screenshot shows an unrendered canvas. Any
  work whose correctness is visual — lighting, geometry, art, and the
  Three.js upgrade (KNOWN-14, now performed but unmerged) — **cannot be
  verified in this environment at all** and needs a human running the game.
  Phase 2B Part A re-measured this directly rather than trusting the note,
  on three@0.186.0: a `requestAnimationFrame` counter run against
  `npm run dev` in the pane recorded **0 frames in 1.2 seconds**, with
  `document.hidden === true`, and fronting the tab changed neither number —
  the `false`-vs-`true` difference from the 2026-08-31 run above is just the
  pane's backgrounding state at each measurement's own moment, not a
  reinstatement of the visibility theory the paragraph above already ruled
  out: both runs held fronting/backgrounding fixed as their own control and
  rAF fired zero times regardless of which value `document.hidden` read.
  The pane also refuses to open the built `THE-BLACK-SILENCE.html` over
  `file://` at all, so even a static look at the single-file build is not
  available here. What the pane *did* show is worth recording as the one
  thing it can still prove: the upgraded build boots in a real browser
  against a real WebGL2 context with an empty console — no exceptions, no
  three warnings — so the upgrade is not broken, only unseen.

  This does not affect the test suite. `tests/integration/gameplayTrace.ts`
  installs its own rAF queue and drains it by hand, which is why 900-frame
  traces are deterministic in vitest regardless of what the pane does.

- **Pointer lock is blocked** (`requestPointerLock` rejects with
  `WrongDocumentError`), so mouse look cannot be exercised in the page.
  What *does* work, verified in the Task 5 session: menu clicks,
  level loads, and **synthetic `KeyboardEvent`/`MouseEvent`/`WheelEvent`
  dispatched from `javascript_tool` with a real `code` field** — the earlier
  note that automated key events arrive with an empty `code` did not hold
  here; `new KeyboardEvent("keydown",{code:"KeyW"})` reaches the game's
  handlers and sets `keys.KeyW`. Combined with dynamically importing the
  live-served module in the running page, that is enough to verify input,
  HUD and subtitle behavior end to end.
- **`npm run build:single` produces a single playable file.** The gitignored
  `THE-BLACK-SILENCE.html` at the repo root is that artifact — it loads from
  `file://` with no network, because three.js is bundled from npm and every
  texture and sprite is drawn procedurally at boot.

  This step was described here for a long time with no script to do it, so the
  file at the repo root was built by hand and went stale by five plans.
  `scripts/inline-single-file.mjs` now does it reproducibly, and **fails loudly
  rather than shipping a file that silently fetches nothing** — it errors if it
  inlines no scripts or if any `assets/` reference survives.

  For development, `npm run dev` is the normal path: Vite on port 5173 with hot
  reload.

- **`renderer.domElement.height` reads `0` in the pane**, while
  `gl.drawingBufferWidth`/`drawingBufferHeight` are live and correct (e.g.
  400x225) and rendering itself is fine. Because `canvas.toDataURL()` reads
  the DOM element's own dimensions, it returns the literal string `"data:,"`
  here — frames cannot be dumped to disk from the page this way. Found in
  Phase 2B Task 1, confirmed again in that task's fix round. Read pixels back
  with `gl.readPixels` against `drawingBufferWidth`/`Height` instead, or fall
  back to `computer{action:"screenshot"}` for a visual look.
- **The stale-module hazard is the dangerous one, not the cosmetic one
  above.** `await import('/src/…')` (or a bare `import('three')`) from
  `javascript_tool` can resolve to a *different* module instance than the
  one the running page's own bundle graph is using, especially after Vite
  has HMR-stamped anything — and the two instances can be live in the same
  expression with no error to flag it. Phase 2B Task 1's fix round hit this
  three times in one session: `WorldState.ts` imported fresh read `GW:0,
  ceilMap:null` while `ceilHeightAt(31,23)` called through the *live*
  instance returned `8.6` in the same statement; a bare `import('three')`
  threw inside `Sprite.raycast` because it resolved to a dependency instance
  the running page wasn't using; and cross-checking two such imports against
  each other is meaningless precisely because either one, independently, can
  be the stale one. **The reliable probe is `renderState.scene` (from
  `src/render/Renderer.ts`) and functions reached through it** — reading
  `import('/src/world/LevelLoader.ts')`'s `loadLevel` and then inspecting
  the *scene graph* it produced, rather than reading a separately-imported
  module's own state, held up every time this was tried. **The reliable
  reset is a full page reload** before probing, not an HMR-updated tab. A
  future session that measures the wrong object here would not know it —
  there is no error, just a different number.

## Four bugs a player will actually hit

All predate the port, all are preserved on purpose, all are pinned by tests
so they cannot change unnoticed. See `docs/known-issues.md`.

- **KNOWN-15** — **The largest of the four by a wide margin.** Ten fields the
  enemy table authors never reach the spawned enemy: `spawnEnemy` builds its
  object with an explicit literal and simply omits them, and nothing writes
  them later. So **no enemy fires the projectile it names** (nine defs carry
  a `range`, so nine archetypes fire *something*; seven of those name a
  projectile via `orb` and all seven shoot the same default purple bolt
  instead — `fireOrb` is reached, but every one of its per-orb colour/damage/
  speed branches falls through — while the other two, `U`'s grey stone and
  `t`'s toxic-green bolt, *are* delivered through `e.stone`/the `tox`
  argument rather than `orb`); **the five flying enemies do not fly**; the
  Mancubus's second barrel, the Afrit's spread and the Lost Soul's charge
  never fire; the Ghoul — the commonest enemy in the game — never throws
  flesh; the Slaughtaur's shield absorbs nothing; and the five sovereign
  bosses use the non-sovereign stat block. Identical in the frozen reference,
  so it is faithful, not drift. Found by Phase 3 Part A's enemy-shape
  consolidation and pinned by `tests/enemies/deadDefFields.test.ts`. **Do not
  fix it with a spread in `spawnEnemy`**: switching ten behaviors on in one
  commit is a balance change that needs a human at the game, one field at a
  time.
- **KNOWN-1** — Level 1 has a red key and a miniboss guarding it, but no locked
  door anywhere. The key does nothing.
- **KNOWN-4** — `loadLevel` checks the enemy table before the prop table, and
  `C` and `V` are in both. **Still open — the mechanism is untouched.** What
  changed (player feedback round 1, task 1): level 2's eight `V` tiles, written
  under a comment reading "nave pews", used to spawn **eight Factory Foreman
  bosses** (2600 hp each) in front of the level's authored boss. The project
  owner played the game and reported it, so all eight are now `v`, a prop-only
  pew spelling; level 2 has no Foreman. The dispatch order was deliberately
  **not** flipped — `C` is an intentional Cacodemon in levels 6 and 7 — so the
  tables still overlap, and **the chair in the priest's chambers is still a
  Cacodemon**. The next level that writes a chair or a pew hits this again.
- **KNOWN-11** — **Armour pickups never spawn, from any level.** Found during
  Plan 0E Task 1 while building the combat trace. `loadLevel` dispatches the
  enemy table before the item table, and `A` is both a Mancubus and map2's
  armour key — so `map2.A` is dead code and all 20 `A` tiles spawn a 260 hp
  Mancubus instead of +50 armour. `S.armor` is provably always 0 in real play.
  Same structural bug as KNOWN-4 but a different collision class (enemy-vs-item
  rather than enemy-vs-prop), and identical in the frozen reference.

Two more used to be listed here and are now closed, kept for continuity:
**KNOWN-7** (spent casings spawned in `FW`/`FH` space but culled and drawn in
`VW`/`VH` space, so every casing was spliced away before its first draw) —
**closed by Phase 2 Part A Task 2**; **KNOWN-8** (the mouse wheel cycling only
six of the game's eight weapon slots) — **closed by Phase 2 Part A Task 1**.
See `docs/known-issues.md` for both in full.
