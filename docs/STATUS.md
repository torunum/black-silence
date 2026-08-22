# Where this project stands

Written to survive session loss. If you are picking this up cold, read this
file, then `docs/direction.md`, then the current plan under
`docs/superpowers/plans/`. Trust this file and `git log` over any recollection.

Last updated: 2026-08-15, after Plan 0D merged. Plan 0E is next.

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
| 0E | Systems: renderer, level loader, weapons, enemy AI, player, interaction | not started |
| 0F | UI, piano, loop and boot; then hardening — gameplay `setTimeout` removal, dispose registry, `strict: true`, the Three.js upgrade | not started |

The spec originally sized the remainder as two plans; the real shape is four.

### Progress metric

`src/legacy.js` holds whatever has not been carved out yet. Its line count is
printed by `npm test` as the port burn-down. When it reaches zero the port is
done.

```
3759 → 3040 (0A) → 2224 (0B) → 1633 (0C) → 1616 (0D)
```

Tests: 0 → 114 → 167 → 348 → 357.

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

**The immediate next action** is Plan 0E — systems: renderer, level loader,
weapons, enemies and AI, player, interaction, projectiles, damage. Every one of
them now has its state already extracted, so 0E moves *functions* only.
`src/render/SceneRef.ts` disappears there, and the loose
`Record<string, unknown>` element types in `WorldState`/`Projectiles`/`Heads`
get their real interfaces.

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

## Four bugs a player will actually hit

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
