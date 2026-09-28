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

The identical finding recurred with audio: `src/audio/`'s synthesis drew
from the same seeded `Math.random()`, and an `installAudioStub()` was built
the same way and never wired in. **Fixed at the cause in player feedback
round 2 Task 1** (`docs/known-issues.md` KNOWN-22, which is that audio row
restored — the KNOWN-20 above is a different, later row that reused the
number): sound has its own generator and shared noise buffers and draws
nothing from the game's dice; the stub is gone and every trace now fails if
a sound ever draws again.

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

## Phase 2 Part B — the world, finished

All four Part B items are done, and three of them were settled by looking at
the game rather than by argument, because the game turned out to render in the
browser pane after all (see Environment gotchas).

| Item | Outcome |
|---|---|
| Three.js upgrade (KNOWN-14) | three **0.164.1** with `useLegacyLights`. 0.186.0 was compared on screen and renders the game nearly black; 0.164.1 restores the r128 look. Pinned there until the ten lights are retuned for the modern model. |
| Variable ceiling height | Opt-in per-cell ceiling map, instanced, demonstrated on level 3. Opting a level in relights its whole ceiling (Gouraud on many vertices instead of four). |
| Shadowed lighting | One caster, the player's lamp — and it is **measured invisible**, because a light at the eye casts shadows the eye cannot see. It costs +12 draw calls and +16,608 triangles on level 1, so it ships **off**, behind SETTINGS → SHADOWS. Raising or offsetting the lamp would make it mean something; that is an art decision. |
| Gothic trim | Pillar bases and capitals, and wall plinth and cornice courses, instanced (at most 2 scene children a level). A clear improvement on pillars and lit corridors; first shipped busy on the prologue's hell walls and near-invisible on the flesh level, because the courses reused the wall texture. **Finished on branch `trim-finished`:** the courses now carry a dressed-stone band of their own per theme (`src/render/BandTextures.ts`, deterministic integer-hash grain, built outside `buildTextures`, named registry `BANDTEX`). |
| Pointed arches | `src/world/Arches.ts`, branch `trim-finished`. There is no wall above a door — a door is a full-cell box that sinks into the floor — so the arch head is built *inside* the door cell, inset 0.04 from the passage faces, and the closed door hides it by depth test alone (0 bytes differed arch on/off across 94 closed-door views on levels 1 and 2). Plain and locked doors only; secret doors get none, since an arch would mark the secret. One `InstancedMesh` a level; collision untouched. Shots pass through the arch stone as they already pass through the ceiling — only an upward shot notices. Honest negatives: the spandrel stone is one plain slab, and no moulding frames the arch. |

`src/world/LevelLoader.ts` has headroom again: `spawnProp` moved verbatim to
`src/world/PropSpawn.ts`, and the loader is at about 370 of its 400-line gate.

## Player feedback round 2 — the hands

Branch `feedback-2-hands`, plan
`docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md`. The owner said
the weapons did not read as weapons and asked for more animation. Nothing
here changes gameplay, and no trace fixture moved.

| Item | Outcome |
|---|---|
| Parametric weapons | The eight baked pixel grids are gone. Each weapon is a draw function of a pose, built in 3D from boxes and prisms and rasterized into a 320x200 indexed buffer (`src/render/viewmodel/`). Hammers, pumps, bolts, drums and break-opens move because the pose says so, and each reload is choreographed with the left hand. The model is re-rendered only when the pose changes. At rest only the reaper's rune ring redraws, on about an eighth of the frames. |
| Running | Sprint pose, figure-eight stride locked to the footsteps, weight against turns and strafes, a lift on take-off and a dip on landing (`motion.ts`). Screen-space motion may lower the weapon but never lift it into the line of fire. |
| The kick | A modelled leg in trousers and a hobnailed boot with a wind-up, a strike and a recovery (`kick.ts`). Full extension lands on the frame the game resolves the hit. The view leans into it for the render only, and the camera is restored straight after, so gameplay never sees the lean. A kick frozen by death or a win is not shown. |
| Reactions | A flinch on a hit, a jerk and cant on a dry click, a nod at a pickup, an idle fidget that any input cancels (and none behind an overlay), and a switch that arcs and turns over (`react.ts`, cues in `src/core/AnimCues.ts`). |
| Stride tempo (fix, branch `stride-cadence`) | The owner played it: the weapon swayed left and right very fast, and so did the footsteps. `Player.ts`'s `bobT` rate went 1.6 -> 0.45, so steps go from 7.1/10.7 a second (walk/sprint) to 2.0/3.0 and the sway from 3.6/5.3 Hz to 1.0/1.5 Hz; speed untouched, stride a little larger at the slower tempo (`STRIDE_X`/`Y` 7/5 -> 9/6), step sounds unchanged; all three trace fixtures moved by the camera bob's height alone (proof in their headers). |

**Open points, honestly:**

- The small mechanisms (hammers, bolts, the rune ring) are hard to see with the weapon at about 30% of the screen height.
- The HUD's weapon label overlaps the lowered weapons.
- The boot is large at the moment of impact, deliberately. The knob is `BK` in `kick.ts`.
- Nobody has felt any of it at 60 fps with a real mouse. The browser pane cannot run rAF, so the owner has to play it.

**Next:** the sound plan (done — see below), then the prologue plan (the grave → hell opening).

## Player feedback round 2 — the sound

Branch `feedback-2-sound`, plan
`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`. The owner:
"The sounds are still very bad." Five tasks; **all five are done** — nobody
here has heard any of it, and the owner is the judge. **The sound board is
where to judge it:** `soundboard.html` beside `index.html` —
`http://localhost:5173/soundboard.html` under `npm run dev`, and
`https://torunum.github.io/black-silence/soundboard.html` once the branch
reaches master (Pages deploys `dist/`, which `npm run build` fills with both
pages). 270 rows; every rebuilt sound has **Old** and **New** buttons, and the
board's Old mix / New mix switch and room picker apply to all of them.

| Task 1 | Outcome |
|---|---|
| Every sound has a name | Each inline `blip`/`bang`/`click` at a call site is a named function in `src/audio/sounds/` (weapons, monsters, world, ui, explosions). A pure refactor: `tests/behavior/soundCatalogue.test.ts` runs each one against the reference's own call-site text; the three traces' full audio logs (82,401 events) came out byte-identical. |
| Sound draws no dice (KNOWN-22) | `src/audio/SoundRandom.ts` and `src/audio/Noise.ts`. The trace fixtures moved once — 79 / 264 / 3,433 draws removed — proven to be only that; the boss trace's cutoff went 6012 -> 2808. Every trace now fails if a sound draws from `Math.random()`. |
| The sound board | `soundboard.html`, 111 sounds in five groups at Task 1 (Weapons 18, Monsters 58, World 29, UI 3, Explosions 3; 270 rows by Task 5), each playing the game's own code; old/new pairs from Task 2 on (`src/soundboard/previous.ts`). Built separately (`vite.soundboard.config.ts`) into `dist/`, so it is on the published site at `/soundboard.html`; the game bundle does not contain it. `window.soundboard.render(id)` renders a sound offline and reports its peak, RMS, length, clipping and DC offset. |

| Task 2 | Outcome |
|---|---|
| A room per level | `src/audio/Room.ts`: a convolution reverb whose impulse response is built from seeded noise (never `Math.random`) — pre-delay, a damped exponential tail, early reflections, unit energy, two channels. Six rooms: stone hall (dungeon, church, necropolis), hell, flesh, graveyard, sewer, factory; `loadLevel` picks one from the level's theme. The old "echo bus" (a 340 ms feedback delay with no dry path — an echo sound was heard only as its repeats) is gone; sounds send to the room by an amount. |
| A master chain | `src/audio/Mix.ts`: glue compressor, limiter, a soft clip that cannot exceed -0.3 dBFS, then the master volume clamped to 0-1. The worst case measured (three explosions, three shotguns, a sniper, a boss death and eight monsters at once, volume 1) peaks at -0.6 dBFS, 0 clipped samples; the old mix put 945 samples past full scale. |
| Planned levels | `src/audio/Levels.ts`: every catalogue sound plays at a category target and a trim; `scripts/sound-levels.mjs` measures (headless Chrome) and writes `docs/sound-levels.md`. At Task 2 the weapons were peak-bound at -17 to -20 LK against a -14 target; Task 3's redesign lifted all eight to -14. |
| Old mix / New mix | The board plays every row through the pre-Task-2 graph (`src/soundboard/previous/mix.ts`) or the game's — Task 2 changed no sound's synthesis, so it is one switch, not 111 rows. The tests that compare sound bodies with the reference run on that old mix. |

| Task 3 | Outcome |
|---|---|
| The weapons | All eight reports rebuilt as layered sounds (`src/audio/Layers.ts`, `src/audio/sounds/weapons.ts`): a saturated transient, a body with each weapon's character, a thump, a mechanical tail, the whole report saturated together, and a bigger send to the room. The automatic weapons jitter pitch and filters every shot from sound's own dice and end each shot inside one period. All eight measure -14.0 LK (the automatic ones as a one-second burst) at -2.0 to -6.6 dBFS peak — the loudest category, where round 1's reports were peak-bound at -17 to -20. |
| The mechanisms | 38 foley sounds (`src/audio/sounds/foley.ts`): break-opens, shells, magazines, bolts, the drum, the knob, the hopper, the reliquary's roof, the reaper's soul, the switch, the dry click, and the nail cannon's motor (`src/audio/Spin.ts`, following the animation's spin law). They replace the generic 18% / 62% / 100% reload clicks. `weaponTick` plays each at the phase the viewmodel draws it (`src/weapons/Foley.ts`, reading `src/render/viewmodel/phases.ts`, which the art now draws from) — no timer, so a reload cut short by a switch or by firing leaves nothing pending. No reload or fire timing changed; no fixture moved. |
| Old / new | Every replaced sound is on the board as Old (`src/soundboard/previous/weapons.ts`: round 1's `gunshot()`, the reference's cross and reaper, the clicks), at the level it had; each weapon's whole reload is a row too. |

| Task 4 | Outcome |
|---|---|
| The voices | Every enemy's alert, pain, attack and death — and the lunge, the charge, the wind-up, the scream, the orbs' bark, the flesh throw, a boss's waking, roar, summons and death — is the monster's own voice (`src/audio/VoiceTable.ts`, built by `src/audio/Speak.ts`): a saw or square cord plus seeded-noise breath, WaveShaper grit, three formant bandpasses gliding between two vowels, a 30-80 Hz amplitude growl, a jittered pitch walk and vibrato, an envelope from silence to -80 dB. Five families by type (skitter, moan, bellow, hiss, titan), the fundamental falling with sprite size from 420 Hz (lost soul) to 36 Hz (the Living Heart). Bosses add a second voice an octave down and speak through `echoBus()` (more room). 19 nodes a voice, 21 for a boss, about 7 more for a layer under it (a gurgle, a rake, a crash); one panner. |
| Same moments | The enemy call sites changed only the sound call's arguments (the enemy's letter; for pain and orbs, the enemy itself as the "throat", so eight pellets make one yelp but a blast through three zombies makes three). No fixture moved. |
| Levels | Each vocal event has one trim at the monster target (-21 LK); each voice has a measured `gain` that `scripts/sound-levels.mjs --apply` writes into the voice table (2 dB louder per doubling of size, by design). Weapons stay the loudest. Ten alerts at once cost 99.5 ms per second of audio offline against 80.3 for the old barks and 20.4 for the mix alone. |
| Old / new | 128 monster rows now have Old and New: one per enemy per event (plus the orbs, the lunge, the charge, the scream), each with the sound that enemy made before as Old (`src/soundboard/previous/monsters.ts`). |

| Task 5 | Outcome |
|---|---|
| Footsteps | A step is a heel, the body's weight (a falling sine), the toe 22-44 ms later, and what is underfoot — seven floors by the level's theme (`src/audio/Surface.ts`, read through the room `loadLevel` already sets): ash in the prologue's hell, marble on level 1, stone in the church and necropolis, dirt and grass in the graveyard, water in the sewers, metal grating in the factory, flesh in the womb. Every step draws its own stride from sound's dice (pitch, filters, heel-to-toe gap, grit; the feet alternate). Running is heavier — a lower, stronger thud, 2.4-4.3 dB louder (measured) — on the same cadence. Each floor has its own entry, so the floors sit at one level (Task 2's 9 dB stone/marble gap is gone). |
| Landing | Its own sound where a running footstep used to play (`playerTick`, same frame), scaled by the fall: -33 LK stepping off a ledge, -29 from a jump, -25 from a 12 m/s drop, lower and longer the harder. |
| The kick | A whoosh as the leg goes out; on the frame `doKick`'s 110 ms check resolves, a meaty thud and wet slap in a monster, a sole on stone with grit for a prop **or a wall** (the check now looks a boot's length ahead with `solidAt`, a read), nothing more into the air. |
| Bullets | A wall hit is heard at its spark: stone cracks and chips, the factory's metal rings, the womb's flesh slaps. A monster hit is a wet thwack at the blood (one per monster per 30 ms: eight pellets are one thwack). A crate knocks like wood. The ricochet (3 in 10, sound's dice) is a falling whine. Wall hits are capped at three per 20 ms. A prop breaking cracks, thuds hollow, and its splinters land for a third of a second. |
| Doors | A stone door grinds for exactly `DOOR_SINK_SECONDS` (`src/world/Grid.ts`, 1.27 s — the real `doorTick` is checked against it) and settles with a thud as it stops; a secret door breaks free and grinds heavier; the red-key gate unbolts first; a locked door rattles three times and a low muted tone says no. The flesh doors keep their wet tear. The exit opens with a 1.6 s grind and a low chord. |
| Pickups | Each family its own short sound: a vial's clink and a warm fifth (health), straps and a plate (armour), a box of rounds, two shells, one slug, gold crosses with a thread of bell, nails pouring, a breath of souls (ammo, balanced to one level), an iron key and a warm hum, a weapon lifted and settled. All in the UI category, the quietest. |
| Explosions | Layered and saturated together: a crack, a body whose corner collapses from 4 kHz, an FM sub, gravel and stones landing for most of a second, and a brown-noise tail rolling over two seconds, with 2.2x the room send. Worst cases at volume 1, including an explosion + three monsters + a shotgun + running footsteps: -1.0, -0.6 and -0.9 dBFS peak, 0 clipped samples. |
| UI and menus | A felt brush on hovering a menu row and a low thock with a faint bell on choosing one (the menus had no sound; on the title screen there is no audio until the click that starts the game). The achievement is a small bell, kick-ready a boot set down, the scrap SMG parts clacking together. |
| Music and ambience | Judged, not assumed: the drone bed is a sub-bass hum through a 170 Hz lowpass and stays. The organ chord was four square waves — the most chiptune sound in the game — and is now detuned saws and octave sines through a lowpass, with a tremulant, wind and a slow swell. The bells are a bell peal (the cross launcher's partials). The boss pulse keeps its 300 ms interval, guard and bar (`src/audio/Music.ts` untouched) but each beat is a drum — kick, off-beat knock, a filtered detuned bass on the fourth — at a level of its own: nothing the game plays is outside a level any more. |
| Same moments | Gameplay files changed only sound calls: `footstep(true)` → `land(-player.vy)` on the landing frame; `kickImpact()` → `kickImpact(kickTarget(...))` on the same scheduled frame; `itemPickup()` → `itemPickup(it.kind)`; `doorOpens(!!d.flesh)` → the door's kind; a wall and a flesh impact added at the spark and the blood; the menus' hover/select. No fixture moved. |
| Old / new | `src/soundboard/previous/world.ts` holds every replaced sound as it was at `e34815c`, at its old trim, including the reference's boss pulse body (which `tests/fidelity.test.ts` now pins there). |

**For later rounds:** no fixture may move. Register the old version of a sound
in `src/soundboard/previous.ts` *before* changing it. Every new catalogue
sound goes inside `lv(...)` with an entry in `src/audio/Levels.ts`
(`tests/audio/levels.test.ts` fails otherwise); re-run
`node scripts/sound-levels.mjs --apply` until it changes nothing, then once
more without `--apply`. Measure a single sound with `soundboard.render(...)`
in the Browser pane — it renders; rAF does not.

## Player feedback round 2 — the prologue

Branch `feedback-2-prologue`, plan
`docs/superpowers/plans/2026-09-27-player-feedback-2-prologue.md`. The owner:
the prologue climbs out of a grave and passes through hell — the reference's
map did the reverse.

| Task | Outcome |
|---|---|
| 1 — the map | `src/world/levels/prologue.ts` is a new 30x36 map (a recorded divergence from the frozen reference, pinned in `tests/fidelity.test.ts`): a **churchyard at night** open to the sky (raised ground at 4.2, no ceiling built, a moon and stars past the fog), ADEM's open grave beside the spawn, headstones, crosses, tombs, two dead trees; a **mausoleum** with a crypt stair five steps down; **hell** — a burning pit between two banks crossed by a stone bridge, four zombies and four crawlers, braziers, bones, chains, two health and two ammo; a **climb out** to the exit to Level 1. **Zones:** `BuiltLevel.zones` gives regions of one level their own walls, floor, ceiling, trim, fog, ambient light, reverb room and footsteps (`src/world/ZoneLook.ts` reads, `src/world/Zones.ts` eases fog/light and switches the room as the player crosses, and says a zone's line once). The loader extracted rather than grew (`LevelMeshes.ts`, `Decor.ts`; 358 lines). ADEM's `lvl0` rewritten; `p0_down`/`p0_hell`/`p0_out` new. `trace-level0.json` regenerated with a new route (down the crypt stair), with the proof in its header; the level-1 and level-2 fixtures did not move. Screenshots and the report in `.superpowers/sdd/2026-09-27-feedback-2-prologue/`. |
| 2 — rising from the grave | `src/world/Opening.ts`: the prologue opens in the dark (a muffled breath and heartbeat, the earth shifting), the coffin lid splits with moonlight in the crack and bursts apart, and the camera rises from lying in the coffin looking up at the sky, to sitting, to clawing over the rim, to standing on the spawn beside the grave, with earth falling past; ADEM's `lvl0` line, then the weapon's equip and the HUD fade in, and control at 5.5 s. Space, Enter, E or a click skips it — never in its first 0.6 s, never on a key's auto-repeat, and not on the click that only regains the pointer lock (review round); the skip neither fires nor kicks. Uses `game.inputLock` and the weapon's own equip; not `world.cine` (the boss slot, which also sinks enemies on raised ground). Only a level whose `BuiltLevel` names a `grave` has one — the prologue. Five new sounds (`src/audio/sounds/grave.ts`) on the board, levelled. The `lvl0` line is now said by the opening, so nothing overwrites `p0_down` (Task 1's concern). `trace-level0.json` regenerated (tenth): the script skips the opening at frame 5 (`drive` calls `skipOpening()` since the review round; the fixture did not move); proven to move only by the line's timing. |
| 3 — hell burns | Hell's pit and braziers burn with pooled flames and embers (`src/fx/HellFire.ts`: two `Points`, 240 + 120 particles, fixed buffers, positions a pure function of a clock and the integer hash — no allocation per frame, no `Math.random`) and the pit's glow lights flicker. Each zone has a **room tone** in place of the level's random stingers (`src/world/ZoneBed.ts`, `src/audio/sounds/hell.ts`): hell's roar, screams and crackle, the churchyard's wind; on the board and levelled. The churchyard stands on **earth** (`src/render/DressTextures.ts`, a named registry `DRESSTEX` beside `TEX`/`BANDTEX`, because `TEX`'s key set is pinned to the reference), with dead grass, filled graves, hands clawing out and a shovel. The bridge is dressed stone lit from the fire below; the climb's first step wears the climb's stone. Enemies re-placed by playing (`tests/support/prologueBot.ts`, `tests/integration/prologuePlay.test.ts`): 8 (4 zombies, 4 crawlers), stats untouched. `trace-level0.json` regenerated (eleventh), proven to move only with the map. |
| Review round | Skipping the opening is deliberate (Space/Enter/E or a click, not in the first 0.6 s, not on a repeat, Esc or a modifier, not on the pointer-lock click). A zone's room tone keeps its timers across a quick exit and re-entry (`ZoneBed.ts`, `KEEP`) and a roar never plays within one swell's interval of the last. `Zones.ts` allocates nothing per frame and stops easing once settled. The grass is its own mesh (`decorGrass`) and casts no shadow. Three unpinned guards are pinned (the `!world.zones` lift guard, the blackout guard, the riser's lower-cell texture). `prologuePlay.test.ts` stops when the bot wins or dies (about a third of the time) and prints its numbers only under `BOT_LOG=1`. |

**Worth knowing:** on a zoned level torches, candles and items are lifted onto
raised ground (`Decor.ts`); breakable props are not, because a shot finds a
prop between y=0 and its height — keep props on floor-0 cells. Level 3's
torches and props on its raised tomb are still at the reference's heights
(buried), untouched because it is unzoned. The rAF note above no longer held
in this session: the game ran live in the Browser pane.

## Levels that feel full — Task 1, the kit and the measure

Branch `levels-feel-full`, plan `docs/superpowers/plans/2026-09-29-levels-feel-full.md`.
The owner said the levels feel very empty. Task 1 builds the tools and changes
**no level**: levels 1-7 are exactly what they were, and no trace fixture moved
(`git diff bafb49c -- tests/integration/__fixtures__` is empty).

| Part | Outcome |
|---|---|
| A — the measure | `src/world/density.ts` (pure), `scripts/level-density.ts` (`npx vite-node scripts/level-density.ts`), `docs/level-density.md` (generated; re-run after dressing a level). Per level: walkable cells, props by type, decor, pickups by type, enemies, lights, bare cells (nothing on or beside them), the longest straight bare run, the largest bare region, and the grid drawn with the bare regions marked. Held to a grid counted by hand (`tests/world/density.test.ts`) and to what `loadLevel` really builds (`tests/world/densityLoad.test.ts` loads all eight levels and compares enemies, props, items by kind, torches, candles and point lights). |
| B — the kit | `Decor.ts` split: it keeps the scene half (`dressLevel`); `src/world/decor/` holds the pieces per theme (`dungeon.ts`, `sacred.ts` for church/necropolis/graveyard, `pipes.ts` for sewers/factory, `womb.ts`, the prologue's own moved unchanged into `prologue.ts`), `registry.ts` (every piece's mode and shadow class, and each theme's weighted vocabulary), `parts.ts` (specs to merged geometry), `place.ts` (the rules and the API), `gallery.ts` (every piece of a theme in a hall). 59 pieces (the prologue's 16, five of their shapes re-sized or re-classed for levels, 38 new); four new `DRESSTEX` surfaces (`straw`, `rust`, `sludge`, `banner`). Small clutter merges into `decorClutter`, which does not cast (`Shadows.ts`); the masses (crate piles, sarcophagi, machines, conveyors, fallen statues) stay `decor` and cast. The prologue's scene is byte-for-byte what it was. |

**The API a level's builder uses** (`src/world/decor/place.ts`): `new Decorator(L, theme)`, then
`place(kind, x, z, {side?, r?, s?, h?})` (throws if the piece breaks a rule),
`layer(rows, legend)` (a glyph layer over the grid), `clutter({density, seed, kinds?, where?})` (fills the
wall-adjacent floor from the theme's vocabulary by grid hash), and `L.decor = dress.specs`.
`validateDecor(L)` re-checks a finished level from scratch. The rules: never on a door cell, a pickup, the spawn or
the exit; bulky pieces (`edge`, `free`) only on plain floor, never beside a door or pickup, one to a cell, and never
where blocking the cell would cut the way through (a 1-wide corridor, a bend, a junction's arm); `edge` and `wall`
pieces need a plain `#` wall behind them. Decor still takes no shot and blocks no step: a piece sits in a wall-side
strip of its cell so the way stays clear, but a player who walks into it walks through it.

**Look at it:** the dev server, then in the console (after NEW GAME)
`LEVELS[8] = galleryDef("dungeon"); loadLevel(8)` with `LEVELS` from `/src/world/levels/index.ts`, `galleryDef` from
`/src/world/decor/gallery.ts` and `loadLevel` from `/src/world/LevelLoader.ts`. The Browser pane's `rAF` does not run
while it is hidden: to photograph, set `player.px/pz/pyy` and `input.yaw/pitch`, render by hand
(`renderState.renderer.render`), and read the pixels with `gl.readPixels` in the same task. Screenshots
taken after a page edit lag one frame behind.

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
  explained updates only. Note it plays the prologue, which had zero enemies
  until the prologue was rebuilt (round 2, below); its rewritten script now
  meets two and the player is hurt (`damagePlayer` runs), but no shot lands,
  so the shot-resolution path is still unexercised by it; the file says so
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

- **Chrome's `DynamicsCompressorNode` is not transparent at the start of an
  offline render.** A sound played at frame 0 of an `OfflineAudioContext`
  comes out 11-14 dB down even through a ratio-1 compressor (the shotgun:
  -6.8 dBFS without one, -20.8 with); played 1 s in, it is untouched.
  `src/soundboard/offline.ts` renders 0.5 s of silence first for that
  reason. Found in player feedback round 2 Task 2, where it first made the
  new mix look 15 dB quieter than the old.
- **Headless Chrome works for audio measurement.** `scripts/sound-levels.mjs`
  starts Vite, launches Chrome (or Edge) with `--headless=new
  --remote-debugging-port=0`, and drives the sound board over the DevTools
  protocol with Node 24's built-in `WebSocket` — no dependency. ~25 s a run.
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

**Re-derived 2026-09-20, after KNOWN-11 closed — and the count did not move,
which is the point of re-deriving it rather than decrementing it.** Walking
every open row of `docs/known-issues.md` and asking "would a player see
this": KNOWN-1, KNOWN-4, KNOWN-15 and **KNOWN-20** qualify; KNOWN-2 (a
service locator), KNOWN-16's remaining half (a dead *def* field whose
behaviour happens anyway) and KNOWN-18 (three roster letters no level
places) do not. KNOWN-11 left the list, and KNOWN-20 — `9` (nails) and `0`
(souls) building pickups with `map: undefined`, so they draw as flat
untextured colour — turns out to have belonged on it since it was filed and
was simply never added. A decrement would have written "three" and kept the
omission.

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
  KNOWN-11, below, was the same mechanism against the *item* table and is now
  closed the same way, which changes nothing about this row.
- **KNOWN-20** — `loadLevel`'s item map names sixteen `ITEMTEX` keys and
  `src/render/ItemTextures.ts` builds ten, so the `9` (nails) and `0` (souls)
  pickups are constructed with `map: undefined` and draw as a flat untextured
  colour instead of an item icon. They still work; they just do not look like
  anything. Faithful to the frozen reference, which builds the same ten.
  **Added to this list 2026-09-20** — it had been filed since the Three.js
  upgrade surfaced it and was never listed here, which is what re-deriving
  the count found.

**KNOWN-11 was the fourth entry here and is now closed** (player feedback
round 2, 2026-09-20). All twenty `A` tiles the level authors wrote as armour
are now `r`, an item-only glyph, so armour appears on the floor for the first
time in the game's life and `S.armor` stops being structurally 0 —
`tests/integration/armourPickup.test.ts` proves it reaches 50 through the real
pickup path, in every level that authors one, with nothing seeded. The
Mancubus leaves the game with it (`A` was its only glyph); its def is kept and
recorded UNREACHABLE beside KNOWN-18's `B` and `q`. The *mechanism* is
untouched, exactly as in KNOWN-4 above.

Three more used to be listed here and are now closed, kept for continuity:
**KNOWN-7** (spent casings spawned in `FW`/`FH` space but culled and drawn in
`VW`/`VH` space, so every casing was spliced away before its first draw) —
**closed by Phase 2 Part A Task 2**; **KNOWN-8** (the mouse wheel cycling only
six of the game's eight weapon slots) — **closed by Phase 2 Part A Task 1**;
and **KNOWN-11**, described just above. See `docs/known-issues.md` for all
three in full.
