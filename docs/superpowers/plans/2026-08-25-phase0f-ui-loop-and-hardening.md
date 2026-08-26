# Phase 0F — UI, the Loop, and Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empty `src/legacy.js` completely, then harden what the mechanical port deliberately left soft — the four gameplay `setTimeout` calls, the missing dispose registry, `strict: true`, and the pinned Three.js.

**Architecture:** Tasks 1-4 finish the extraction the last five plans have been working through: the piano, level end/win/HUD, idle quips and menus, and finally the loop and boot. `src/legacy.js` is **deleted** in Task 4 and the port burn-down reaches zero. Tasks 5-11 then change behavior for the first time in Phase 0 — but only in the four ways the spec sanctions, each isolated in its own task with its own gate. Task 12 reviews and merges.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 2, jsdom, madge, three 0.128.0 (pinned until Task 11 decides otherwise).

## Global Constraints

Every task's requirements implicitly include this section.

- **No gameplay changes. No balance changes. No new features.** Existing bugs are preserved — *except* where Tasks 5-7 are explicitly chartered to change timing and memory behavior. Outside those three tasks the Phase 0 rule is unchanged.
- **No art changes. No audio changes.** This is the constraint Task 11 is most likely to break, and the reason it may end in a deferral rather than an upgrade.
- **`reference/sonsurum.html` is never edited.**
- **No file in `src/` may exceed 400 lines.** Hard gate. `legacy.js`'s exemption ends when the file does, in Task 4.
- **No import cycles.** Hard gate — and it must be run as
  `madge --circular --extensions ts,js src/`. **Bare `madge --circular src/` is
  a no-op on this codebase**: madge's default extensions are `js,jsx`, so it
  scans only `src/legacy.js` and prints "No circular dependency found!" having
  looked at nothing. That is how a real cycle survived all of Plan 0E. The
  `npm test` script was corrected in commit `0e1722b`; if you run madge by
  hand, pass the flag. The "Processed N files" line is the tell — if N is 1,
  it did not check anything.
- **Every task ends with a playable game.**
- **`src/legacy.js` has `checkJs: false`** until it is deleted. TypeScript will not catch a typo'd name there; only tests will. This bit Plans 0D and 0E repeatedly.
- **Every line number in this plan is advisory.** Ranges below were measured at `617988a` and every task that lands shifts them. Range *ends* are computed as "next declaration minus 1" and swept in trailing banners or `const`s five separate times during Plan 0E — **only the start line is reliable.** Confirm every range by reading its content.
- **Neither trace fixture may be regenerated.** `tests/integration/__fixtures__/trace-level0.json` and `trace-level1.json` are pre-migration recordings; that is their entire value. `WRITE_TRACE=1` is not a tool for turning a red build green.
- **Use a cold cache for trace runs:** `npx vitest run --no-cache`. During Plan 0E a stale vitest transform cache reported 364/364 green on a `legacy.js` containing a real duplicate-declaration syntax error.
- **`npm test` and `npm run typecheck` must pass before every commit** (`npm test` runs the corrected madge).** Node is not on PATH in a fresh shell: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.

---

## Starting state

`master` at `617988a`. `src/legacy.js` is **282 lines** holding **14 function declarations** and three `const`s. 369 tests pass.

Measured at dispatch time, not assumed:

| Section | Lines | Contents | Owner |
|---|---|---|---|
| banner + `Context` registration + `setInputHooks` | 1-97 | 42 imports, `svcCtx.*` wiring, the 12-entry input-hook block | Tasks 1-4 |
| PLAYABLE PIANO | 98-143 | `WHITE BLACK KEYMAP buildPiano pressKey pianoKeyDown openPiano closePiano` | **Task 1** |
| LEVEL END + WIN + HUD | 144-205 | `gradeOf statsHtml endLevel showWin hud` | **Task 2** |
| IDLE QUIPS | 206-214 | `chatterTick` | **Task 3** |
| MAIN LOOP + BOOT | 215-282 | `startGame showScreen loop` + six inline DOM listeners + the volume-slider IIFE | **Tasks 3, 4** |

### The dependency graph of what is left

Measured with the same script Plan 0E used, corrected for its two known blind spots (it only scans `function` declarations, and its "in-task calls" list does not say which *file* a callee lands in — that second gap is what made two of Plan 0E's file splits circular):

```
buildPiano    105-117  -> pressKey            ; consts WHITE, BLACK
pressKey      118-132  -> nothing
pianoKeyDown  133      -> pressKey            ; const KEYMAP
openPiano     134-138  -> nothing
closePiano    139-143  -> nothing
gradeOf       147-153  -> nothing
statsHtml     154-159  -> nothing
endLevel      160-173  -> gradeOf, statsHtml
showWin       174-180  -> gradeOf, statsHtml
hud           181-205  -> nothing
chatterTick   206-214  -> nothing
startGame     215-226  -> buildPiano
showScreen    227-254  -> startGame
loop          255-282  -> chatterTick, hud
```

**Nothing left in `legacy.js` calls anything else still in `legacy.js` outside this list.** Every other callee is already a module. That is what makes this plan a clean finish rather than another cycle-breaking exercise.

### Three decisions this plan locks in

**1. `core/Context.ts` shrinks to one entry in Task 2, and that entry is permanent for Phase 0.**

*(This decision was rewritten during Task 1. It originally said the locator would reach zero entries and be deleted. That was wrong, for a reason worth reading.)*

The locator's entries are two different kinds of thing, and only one kind this plan can remove:

- **Bridges to unextracted code.** `endLevel`, `openPiano` and `showWin` exist only because their targets were still in `legacy.js`. Task 1 moved `openPiano` and retired it; Task 2 moves `endLevel` and `showWin` and retires both. These go away by extraction.
- **Genuine cycle breaks.** `wakeBoss` is one. `src/enemies/Damage.ts` cannot import it from `Boss.ts`, because that edge closes
  `Damage.ts -> Boss.ts -> ai/Attacks.ts -> world/Props.ts -> Damage.ts`. No amount of further extraction removes it; only breaking one of the other three edges would, and that is a redesign, not a port task.

Plan 0E Task 10 retired `wakeBoss` anyway, on a `madge` run that was scanning only `legacy.js`. Task 1 of this plan fixed the gate and restored the entry (commit `0e1722b`). **So `Context.ts` ends Phase 0 with exactly one entry, and KNOWN-2 stays open with a named cycle attached rather than being closed.**

The spec's long-term rule — systems talk over `core/Events.ts` and never reach into each other — is unaffected; `Events.ts` is still built when Phase 1 has a first real subscriber, exactly as Plan 0E Decision 2 said. `wakeBoss` is a natural first candidate for it.

**2. `setInputHooks` stays. Do not try to retire it alongside `Context`.**

It looks like the same pattern and it is not. `src/player/Input.ts` registers its own DOM listeners at module scope and is imported by `Player.ts`, `WeaponState.ts`, `Interact.ts` and `Boss.ts`. If `Input.ts` imported those back to call `interact()`, `doKick()` or `pianoKeyDown()` directly, every one of those edges closes a cycle and `madge` fails. The hook block is a genuine cycle-break with no alternative short of an event bus, which is Phase 1's job.

Task 4 moves the block, unchanged, into `main.ts`. **Do not edit its entries while moving it.** Plan 0D broke a neighbouring entry doing exactly that, and `checkJs: false` meant nothing caught it.

**3. Hardening changes behavior, and each change is chartered in exactly one task.**

Tasks 1-4 are mechanical and the Phase 0 verbatim rule applies in full. Tasks 5-7 are not: they deliberately change *when* things fire and *what* gets freed. That is sanctioned by spec steps 11 and 12 and tracked as KNOWN-3.

An implementer on Tasks 5-7 must not refuse a chartered change on Phase 0 grounds, and an implementer on any other task must not make one. If a task's charter is unclear, stop and ask rather than guessing — five implementers did that during Plan 0E and all five were right.

---

## File structure

Nine new modules, one deletion, one file emptied to nothing.

| File | Owns | From |
|---|---|---|
| `src/ui/Piano.ts` | `buildPiano pressKey pianoKeyDown openPiano closePiano` + `WHITE BLACK KEYMAP` | Task 1 |
| `src/ui/LevelEnd.ts` | `gradeOf statsHtml endLevel showWin` | Task 2 |
| `src/ui/Hud.ts` | `hud` | Task 2 |
| `src/ui/Chatter.ts` | `chatterTick` | Task 3 |
| `src/ui/Menus.ts` | `showScreen` + the six menu listeners + the volume slider | Task 3 |
| `src/core/Time.ts` | the scaled clock; `schedule()` added in Task 5 | Task 4 |
| `src/core/Loop.ts` | `loop` — the frame orchestrator | Task 4 |
| `src/core/Boot.ts` | `startGame` | Task 4 |
| `src/render/DisposeRegistry.ts` | per-level GPU resource tracking | Task 7 |
| `src/core/Context.ts` | reduced to one entry, `wakeBoss` — a real cycle break, see Decision 1 | Task 2 |
| ~~`src/legacy.js`~~ | **deleted** — zero lines once Task 4 lands | Task 4 |
| `src/main.ts` | boot wiring only: imports, `setInputHooks`, start the loop | Task 4 |

`src/ui/` already holds `HudMessages.ts`, `Subtitles.ts`, `Toasts.ts` and `PianoState.ts`. Note the near-collision this plan adds, the same shape as `Projectiles.ts`/`ProjectileTick.ts` and `WeaponRuntime.ts`/`WeaponState.ts` before it: **`PianoState.ts` (Plan 0D) holds the piano's state; `Piano.ts` (Task 1) holds its behavior.** Do not merge them. Likewise `HudMessages.ts` is the timed-message queue and `Hud.ts` is the per-frame HUD painter — different things with similar names.

### Two spec files this plan deliberately does not create

The spec's §5 layout lists `ui/BossBar.ts` and `ui/Cinematic.ts`. Neither gets its own file, and both are already covered:

- **The boss bar is eleven lines inside `hud`** (`legacy.js:195-205` — it finds the live boss, fills `#bossfill`, and hides `#bossbar` otherwise). Splitting it out would mean `Hud.ts` calling into `BossBar.ts` every frame to do something it already does inline, for no reader benefit at this size. It moves with `hud` in Task 2.
- **The cinematic — letterbox bars and boss titles — already moved**, in Plan 0E Task 10, as `cineTick` in `src/enemies/Boss.ts`. It sits with `wakeBoss`, which is what triggers it.

This follows the rule Plan 0D set and 0E kept: **where the spec's layout and the files on disk disagree, the files win.** Do not create either file to satisfy the spec's table.

---

## Part A — finish the port

### Task 1: The playable piano

**Files:**
- Create: `src/ui/Piano.ts`
- Modify: `src/legacy.js`, `src/core/Context.ts`, `src/player/Input.ts` consumers as needed

**Interfaces:**
- Produces: `buildPiano()`, `pressKey(midi: number)`, `pianoKeyDown(code: string)`, `openPiano()`, `closePiano()` from `Piano.ts`.
- Consumes: `pianoState` (`src/ui/PianoState.ts`), `game` (`src/core/Game.ts`), `renderState`, `world`, `pianoNote` (`src/audio/Ambient.ts`), plus THREE.

- [ ] **Step 1: Move all five functions and the three consts**

`legacy.js:101-143`. `WHITE`, `BLACK` and `KEYMAP` are read only by `buildPiano`, `pianoKeyDown` and `pressKey` respectively — confirm with `grep -n "WHITE\|BLACK\|KEYMAP" src/legacy.js` before moving. They do **not** need exporting; nothing outside the piano reads them.

Move the bodies verbatim. The only acceptable deltas are `export`, type annotations, and casts. Follow the cast style already in `src/enemies/Boss.ts` and `src/player/Player.ts` rather than inventing a second one.

- [ ] **Step 2: Retire the `openPiano` Context entry**

`src/player/Interact.ts` currently calls `ctx.openPiano?.()`. `openPiano` is now importable, so replace that with a direct import:

```ts
import { openPiano } from "../ui/Piano";
```

and the call site becomes `openPiano();`.

Then delete the `openPiano` field from `src/core/Context.ts` and drop `svcCtx.openPiano=openPiano;` from `legacy.js`'s registration line.

**Prove it does not create a cycle before keeping it:**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx madge --circular src/
```

If madge reports a cycle, revert to the locator, keep the entry, and record the exact cycle in your report — that is a legitimate outcome and Task 2 will re-evaluate it.

- [ ] **Step 3: The input hooks keep working without being edited**

`legacy.js`'s `setInputHooks({...})` block passes `pianoKeyDown:code=>pianoKeyDown(code)` and `closePiano:()=>closePiano()`. Once both are imports, those identifiers resolve to the imported bindings and **the block keeps working with no edit at all.** Add the import; do not touch the block.

- [ ] **Step 4: Run the gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache tests/integration/
npm run typecheck && npm test
git add src/ui/Piano.ts src/core/Context.ts src/player/Interact.ts src/legacy.js
git commit -m "refactor: extract the playable piano"
```

`tests/integration/contextWiring.test.ts` pins the locator's registrations and **will fail if you remove an entry without removing its assertion** — that is the test doing its job. Update it to match the new entry set, and say in your report which assertion you changed and why.

---

### Task 2: Level end, the win screen, the HUD — and `Context` down to one entry

**Files:**
- Create: `src/ui/LevelEnd.ts`, `src/ui/Hud.ts`
- Modify: `src/core/Context.ts`, `src/legacy.js`, `src/player/Player.ts`, `src/enemies/Death.ts`, `tests/integration/contextWiring.test.ts`

**Interfaces:**
- Produces: `gradeOf(): string`, `statsHtml(): string`, `endLevel()`, `showWin()` from `LevelEnd.ts`; `hud()` from `Hud.ts`.
- Consumes: `S` (`core/State.ts`), `save` (`save/SaveGame.ts`), `game`, `world`, `player`, `weaponRuntime`, `renderState`, `stopBossMusic` (`audio/Ambient.ts`), `WEAPONS` (`weapons/WeaponState.ts`).

- [ ] **Step 1: Split the section across two files, and check the split is acyclic**

`legacy.js:147-205`. `endLevel` and `showWin` both call `gradeOf` and `statsHtml`, so all four live together in `LevelEnd.ts`. `hud` calls none of them and nothing calls `hud` except `loop`, so it goes in `Hud.ts` alone.

**Check every in-task call against its target file before you start.** Two of Plan 0E's splits were circular and could not have built, both because that check was skipped. Here the expected graph is:

```
LevelEnd.ts -> (nothing in this task)
Hud.ts      -> (nothing in this task)
```

Two independent leaves. If your own reading disagrees, stop and report rather than improvising a third file.

- [ ] **Step 2: Retire the last two Context entries**

`src/player/Player.ts` calls `svcCtx.endLevel?.()` in `playerTick`'s exit-pad branch. `src/enemies/Death.ts` calls `ctx.showWin?.()` inside `bossDeath`'s `setTimeout`. Both targets are now importable.

Replace each with a direct import and a plain call, **one at a time**, running `npx madge --circular src/` after each so a cycle is attributable to the one that caused it. If either produces a cycle, keep that entry, revert that one change, and record madge's exact output.

Note `Player.ts` imports the locator aliased as `svcCtx` because it also binds `ctx` to AudioEngine's audio-context accessor. Removing the locator import there means the alias goes too — check whether `Player.ts` still uses `ctx()` before deciding what its import line should look like. A brief in Plan 0E asserted "no clash" without checking and was wrong.

- [ ] **Step 3: Reduce `Context.ts` to its one permanent entry**

After Task 1 and Step 2 here, the locator should hold exactly one field: `wakeBoss`. **Do not delete the file** — see Decision 1. `wakeBoss` breaks a real cycle and no further extraction removes it.

What does go: `legacy.js` no longer registers anything, so delete its `import { ctx as svcCtx } from "./core/Context";`, the whole `svcCtx.*` registration line, and the long comment above it. `Boss.ts` keeps its own `ctx.wakeBoss=wakeBoss;` registration at module scope.

Verify with `grep -rn "svcCtx" src/` (nothing) and `grep -c "?: (" src/core/Context.ts` (exactly 1).

- [ ] **Step 4: Update `contextWiring.test.ts`**

That file exists because a wrong locator registration silently no-ops through `?.()` — two sabotages of it left the whole suite green before it was written. With the locator gone, its three tests have no subject.

**Do not simply delete them.** The seams they covered still exist; only the mechanism changed. Convert each to assert the direct call now happens: the exit pad still unhides `#levelend`, the piano-proximity branch still opens the piano, `bossDeath` still reaches the win screen. Prove each converted test is real by breaking the corresponding import and confirming it fails.

If a seam genuinely has no observable left after the change, say so explicitly rather than leaving a test that passes for the wrong reason. A test that would pass under a wrong wiring is worse than no test, because it looks like coverage.

- [ ] **Step 5: Update KNOWN-2 and run the gate**

Rewrite KNOWN-2 in `docs/known-issues.md` to record the full arc — six entries at peak, three after Plan 0E Task 10's retirement pass, four again when Plan 0F Task 1 restored `wakeBoss` after finding the madge gate had never scanned TypeScript, and **one** here. It stays **open**, with its one remaining entry and the exact cycle that entry prevents written down. Keep the existing row's voice.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache tests/integration/
npm run typecheck && npm test
git add src/ui/LevelEnd.ts src/ui/Hud.ts src/legacy.js src/player/Player.ts src/enemies/Death.ts tests/integration/contextWiring.test.ts docs/known-issues.md
git commit -m "refactor: extract level end, the win screen and the HUD"
```

---

### Task 3: Idle quips and the menus

**Files:**
- Create: `src/ui/Chatter.ts`, `src/ui/Menus.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `chatterTick(dt: number, anyAware: boolean)` from `Chatter.ts`; `showScreen(id: string)` and `initMenus()` from `Menus.ts`.
- Consumes: `startGame` — **which does not move until Task 4.** See Step 2.

- [ ] **Step 1: `chatterTick` is a clean leaf**

`legacy.js:206-214`, nine lines, calls nothing still in `legacy.js`. Move it verbatim into `Chatter.ts`.

- [ ] **Step 2: The menus, and the one ordering problem in this plan**

`legacy.js:227-254` holds `showScreen` plus six `addEventListener` calls (`mNew`, `mSettings`, `setBack`, `chapBack`, `mChapter`) and an IIFE wiring the volume slider. All of it is boot-time DOM wiring.

`mNew` and the chapter rows call `startGame`, which is Task 4's. So `Menus.ts` cannot import it yet.

**Do not add a `Context` entry for this.** The locator is being deleted in Task 2 and reviving it for one task would undo that. Instead, export an initialiser that takes the callback:

```ts
export function initMenus(startGame: (idx: number) => void): void {
  // the six listeners and the volume-slider IIFE body, verbatim,
  // with startGame(...) resolving to the parameter
}
```

`legacy.js` then calls `initMenus(startGame)` at module scope, where `startGame` is still a local function declaration — declarations hoist, so the call may sit above the definition. In Task 4 the call moves to `main.ts` and the argument becomes an import. **No call site inside `Menus.ts` changes at either step**, which is the same property that let Plan 0E's locator entries migrate without churn.

Move the listener bodies verbatim. `showScreen` is called by three of them and stays in the same file.

- [ ] **Step 3: Run the gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache tests/integration/
npm run typecheck && npm test
git add src/ui/Chatter.ts src/ui/Menus.ts src/legacy.js
git commit -m "refactor: extract the idle quips and the menu wiring"
```

---

### Task 4: The loop, the clock, boot — and the end of `legacy.js`

**Files:**
- Create: `src/core/Time.ts`, `src/core/Loop.ts`, `src/core/Boot.ts`
- Delete: `src/legacy.js`
- Modify: `src/main.ts`, `tsconfig.json`

**Interfaces:**
- Produces: `startLoop()` from `Loop.ts`; `startGame(idx: number)` from `Boot.ts`; `time` (a state object, `{ dt: number; scaledDt: number }`) from `Time.ts`.
- Consumes: everything. `loop` calls roughly twenty-five module functions and `startGame` calls the five builders.

This is the largest task in the plan and the one that ends the port.

- [ ] **Step 1: `core/Time.ts` first, and keep it minimal**

Create it holding only what `loop` needs today — the frame clock. `game.last` currently lives on `src/core/Game.ts`; **leave it there and do not migrate it.** Moving state is Plan 0D's job and it is done; this task moves logic.

`Time.ts` in this task is a nearly-empty module that exists so Task 5 has somewhere to put `schedule()`. Give it a doc comment saying exactly that, so a reader does not mistake it for dead code:

```ts
/**
 * The scaled clock. Today this holds only the frame delta the loop computes;
 * `schedule()` arrives in Task 5, when the four gameplay `setTimeout` calls
 * that ignore hit-stop and pause (KNOWN-3) move onto it. It is created a task
 * early, with one field, so that task changes one file instead of two.
 */
export const time = { dt: 0, scaledDt: 0 };
```

Set both fields in `Loop.ts` where the existing code computes `dt` and applies hit-stop. Nothing reads them yet; Task 5 is the first consumer.

- [ ] **Step 2: `core/Loop.ts`**

Move `loop` (`legacy.js:255-282`) verbatim, and the trailing bare `requestAnimationFrame(loop);` becomes an exported `startLoop()` so boot order is explicit rather than an import side effect:

```ts
export function startLoop(): void { requestAnimationFrame(loop); }
```

Three details in this body that must survive unchanged:

1. **The `paused` expression.** `game.pianoOpen||overlayOpen()&&!game.pianoOpen` — `&&` binds tighter, so it reduces to `pianoOpen || overlayOpen()`. It is redundant, not wrong. **Do not simplify it.** Phase 0 moves code verbatim, and a reader who "cleans" this has changed the diff a future bisect has to read.
2. **The `fxTick` call and its 18-field viewmodel literal.** This is the seam KNOWN-9 documents and `tests/integration/wiring.test.ts` covers. Copy it field by field. A transposition here is invisible to `tsc` today and the wiring test is the only thing that catches it.
3. **`requestAnimationFrame(loop)` is the first statement in the body**, before the early `return` for `!game.started`. Keep it first; moving it below the return stops the loop dead on the title screen.

- [ ] **Step 3: `core/Boot.ts`**

Move `startGame` (`legacy.js:215-226`) verbatim. It calls `audioInit`, the five builders (`buildTextures`, `buildSprites`, `buildItemTex`, `buildWeaponSprites`, `buildPiano`), `loadLevel`, and `requestPointerLock` — all already modules after Task 1.

- [ ] **Step 4: `main.ts` becomes the boot wiring**

It currently reads `import "./legacy.js";` and nothing else. It becomes the file that owns boot order:

```ts
import { setInputHooks } from "./player/Input";
import { startGame } from "./core/Boot";
import { initMenus } from "./ui/Menus";
import { startLoop } from "./core/Loop";
// ...plus whatever the hook block's entries reference

setInputHooks({
  // the twelve entries, moved verbatim from legacy.js — DO NOT EDIT THEM
});

initMenus(startGame);
startLoop();
```

**Move the `setInputHooks` block without editing a single entry.** Plan 0D broke a neighbouring entry while editing this block and nothing caught it. If an entry's identifier is not in scope, add the import — do not rewrite the entry.

Watch module-evaluation order: `Input.ts` registers its DOM listeners at its own module scope, so those listeners exist before `main.ts`'s body runs. The hook block must therefore be installed before any event can be delivered — meaning at `main.ts` module scope, not inside a callback. That is what `legacy.js` did and why.

- [ ] **Step 5: Delete `legacy.js` and drop `allowJs`**

Once every function is out, `legacy.js` should hold nothing but imports. Delete it. Then `src/` has no `.js` file at all, so `tsconfig.json`'s `allowJs` and `checkJs` are dead settings — remove both.

This is a real strengthening: every line of the port becomes type-checked for the first time. Expect `tsc` to surface errors it previously could not see. **Fix them by adding types, never by weakening a call site.**

Confirm the burn-down script still works with the file gone — `npm test` prints it, and it will need to handle a missing file or be retired. Say which you did.

- [ ] **Step 6: Run the gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache
npm run typecheck && npm test
git add src/core/Time.ts src/core/Loop.ts src/core/Boot.ts src/main.ts tsconfig.json
git rm src/legacy.js
git commit -m "refactor: extract the loop, the clock and boot; delete legacy.js"
```

`tests/integration/wiring.test.ts` boots the real entry point under jsdom. It is the test most likely to break here and the one whose failure means the most — read what it says rather than adjusting it.

---

## Part B — hardening

### Task 5: `Time.schedule()` and the four gameplay `setTimeout` calls

**Charter: this task changes timing behavior deliberately.** KNOWN-3 and spec step 11 authorise it. The Phase 0 verbatim rule does not apply to these four call sites.

**Files:**
- Modify: `src/core/Time.ts`, `src/core/Loop.ts`, `src/weapons/WeaponState.ts`, `src/enemies/ai/Behaviors.ts`, `docs/known-issues.md`
- Test: `tests/core/time.test.ts` (create)

**Interfaces:**
- Produces: `schedule(fn: () => void, delaySeconds: number): void`, `tickScheduled(scaledDt: number): void`, `clearScheduled(): void` from `Time.ts`.

- [ ] **Step 1: Write the failing test first**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { schedule, tickScheduled, clearScheduled } from "../../src/core/Time";

describe("Time.schedule", () => {
  beforeEach(() => clearScheduled());

  it("fires after the delay has elapsed in scaled time", () => {
    let fired = 0;
    schedule(() => fired++, 0.11);
    tickScheduled(0.05); expect(fired).toBe(0);
    tickScheduled(0.05); expect(fired).toBe(0);
    tickScheduled(0.05); expect(fired).toBe(1);
  });

  it("does not fire while scaled time is stopped", () => {
    let fired = 0;
    schedule(() => fired++, 0.11);
    for (let i = 0; i < 100; i++) tickScheduled(0);
    expect(fired).toBe(0);
  });

  it("drops everything pending on clearScheduled", () => {
    let fired = 0;
    schedule(() => fired++, 0.01);
    clearScheduled();
    tickScheduled(1);
    expect(fired).toBe(0);
  });

  it("fires each callback exactly once", () => {
    let fired = 0;
    schedule(() => fired++, 0.05);
    tickScheduled(1); tickScheduled(1);
    expect(fired).toBe(1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run tests/core/time.test.ts
```

Expected: fail with `schedule is not exported` (or equivalent).

- [ ] **Step 3: Implement**

```ts
interface Scheduled { fn: () => void; left: number; }
const pending: Scheduled[] = [];

export function schedule(fn: () => void, delaySeconds: number): void {
  pending.push({ fn, left: delaySeconds });
}

export function tickScheduled(scaledDt: number): void {
  for (let i = pending.length - 1; i >= 0; i--) {
    pending[i].left -= scaledDt;
    if (pending[i].left <= 0) { const s = pending[i]; pending.splice(i, 1); s.fn(); }
  }
}

export function clearScheduled(): void { pending.length = 0; }
```

Iterating backwards means a callback that schedules another entry does not run it in the same tick, and splicing during the walk is safe. Say in your report why you kept or changed that.

- [ ] **Step 4: Drive it from the loop**

Call `tickScheduled(dt)` in `Loop.ts` **inside the `if(!paused&&!S.dead&&!S.won)` block, using the hit-stop-scaled `dt`**. That is the whole point: these callbacks must respect hit-stop and pause, which `setTimeout` cannot.

- [ ] **Step 5: Migrate exactly four call sites**

| File | Line (advisory) | What fires late |
|---|---|---|
| `src/weapons/WeaponState.ts` | 224 | power kick hit test, 110 ms |
| `src/enemies/ai/Behaviors.ts` | 249 | Mancubus second barrel, 220 ms |
| `src/enemies/ai/Behaviors.ts` | 251 | Slaughtaur second bolt, 180 ms |
| `src/enemies/ai/Behaviors.ts` | 269 | brute slam damage, 480 ms |

Each becomes `schedule(() => {...}, 0.110)` etc. — note `schedule` takes **seconds**, matching `dt`, while `setTimeout` takes milliseconds. Getting that conversion wrong is the most likely defect in this task.

Leave the callback bodies alone, including their `if(e.dead)return;` guards.

- [ ] **Step 6: Expect the combat trace to change, and handle it honestly**

`tests/integration/combatTrace.test.ts` records level 1 with 15 enemies and exercises all three `Behaviors.ts` sites. **This is the one task in Phase 0 where a fixture mismatch is the correct outcome**, because the timing genuinely changed.

**You still may not regenerate the fixture silently.** Instead:
1. Run it and read exactly which frames diverge and by what.
2. Confirm the divergence is consistent with the timing change and nothing else — a shifted enemy-attack frame is expected; a changed level layout or a different enemy count is not.
3. Write that analysis into the test file's header comment and into your report.
4. Only then regenerate, with `WRITE_TRACE=1`, and commit the new fixture in the **same** commit as the change that justifies it.

If the trace does **not** change, that is suspicious, not lucky — it likely means the scheduler is not being driven. Investigate before proceeding.

- [ ] **Step 7: Update KNOWN-3 and commit**

KNOWN-3 currently says 17 non-gameplay `setTimeout` calls remain and that they must be cancelled on level unload. Update the count (there are 23 across `src/` today; recount after your change) and record that the four gameplay ones are done and which task owns the rest — Task 6.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm run typecheck && npm test
git add src/core/Time.ts src/core/Loop.ts src/weapons/WeaponState.ts src/enemies/ai/Behaviors.ts tests/core/time.test.ts docs/known-issues.md tests/integration/
git commit -m "fix: move the four gameplay setTimeout calls onto the scaled clock"
```

---

### Task 6: Cancel the remaining timers on level unload

**Charter: this task changes timing behavior deliberately.** Spec step 11's second half.

**Files:**
- Create: `src/core/Timers.ts`
- Modify: every file with a surviving `setTimeout`, `src/world/LevelLoader.ts`
- Test: `tests/core/timers.test.ts`

**Interfaces:**
- Produces: `after(fn: () => void, ms: number): void` and `clearAllTimers(): void` from `Timers.ts`.

- [ ] **Step 1: Inventory the survivors**

```bash
grep -rn "setTimeout" src/ --include=*.ts
```

At `617988a` there are 23 across 13 files, four of which Task 5 removed. Every remaining one is an audio tail or a UI fade. **List them all in your report with file, line and what they do** — the spec's claim of 17 was measured against the reference, not the port, and has already drifted.

- [ ] **Step 2: A tracked wrapper, not a rewrite**

```ts
const live = new Set<ReturnType<typeof setTimeout>>();

/** setTimeout that a level unload can cancel. Wall-clock, unlike Time.schedule. */
export function after(fn: () => void, ms: number): void {
  const id = setTimeout(() => { live.delete(id); fn(); }, ms);
  live.add(id);
}

export function clearAllTimers(): void {
  for (const id of live) clearTimeout(id);
  live.clear();
}
```

These stay wall-clock on purpose. An audio tail or a UI fade should not stop when the game hit-stops — only the four gameplay callbacks needed scaled time, and Task 5 already moved those.

- [ ] **Step 3: Swap the call sites**

Replace each surviving `setTimeout(fn, ms)` with `after(fn, ms)`. Nothing else about them changes.

- [ ] **Step 4: Cancel on level load**

`loadLevel` replaces the scene wholesale. Call `clearAllTimers()` and `clearScheduled()` at its top, before any new state is built. That is what stops a boss attacking from a level that no longer exists.

- [ ] **Step 5: Test it**

```ts
import { describe, expect, it, vi } from "vitest";
import { after, clearAllTimers } from "../../src/core/Timers";

describe("Timers.after", () => {
  it("fires normally when nothing cancels it", () => {
    vi.useFakeTimers();
    let fired = 0;
    after(() => fired++, 100);
    vi.advanceTimersByTime(150);
    expect(fired).toBe(1);
    vi.useRealTimers();
  });

  it("does not fire once clearAllTimers has run", () => {
    vi.useFakeTimers();
    let fired = 0;
    after(() => fired++, 100);
    clearAllTimers();
    vi.advanceTimersByTime(1000);
    expect(fired).toBe(0);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 6: Gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm run typecheck && npm test
git commit -am "fix: cancel pending timers on level load"
```

If a trace fixture changes here, apply Task 5 Step 6's procedure — analyse first, regenerate only with the analysis written down.

---

### Task 7: The dispose registry

**Charter: this task changes memory behavior deliberately.** Spec step 12.

**Files:**
- Create: `src/render/DisposeRegistry.ts`
- Modify: `src/world/LevelLoader.ts`, and the FX/prop modules that create per-level resources
- Test: `tests/render/disposeRegistry.test.ts`

**Interfaces:**
- Produces: `track<T>(resource: T): T`, `disposeAll(): void` from `DisposeRegistry.ts`.

- [ ] **Step 1: Understand what is actually leaking**

Measured: **there are zero `.dispose()` calls in the entire codebase**, and `unloadLevel` does not exist. `loadLevel` simply assigns `renderState.scene=new THREE.Scene()`, orphaning every geometry, material and texture the previous level created. Eight levels in one session leaks eight levels of GPU resources.

- [ ] **Step 2: The distinction that makes this task dangerous**

Some THREE resources are **created once at module scope and reused for every level**. Disposing those breaks the *next* level, and the failure will look like a rendering bug far from this change.

Confirmed module-level, **must NOT be tracked or disposed**:

```
src/fx/Gibs.ts           gibGeo          (module const)
src/enemies/ai/Attacks.ts orbGeo, ringMatBase (module consts)
src/fx/Decals.ts         scorchMat and the other shared materials
src/fx/Particles.ts      pGeo
src/render/ProcTextures.ts  TEX          (built once by buildTextures)
src/render/ItemTextures.ts  ITEMTEX
src/enemies/SpriteBaker.ts  PX
```

Everything created **inside** `loadLevel`, `spawnProp`, `spawnEnemy` or a per-level FX path with `new THREE.*Geometry(...)` / `new THREE.*Material(...)` **is** per-level and should be tracked.

Re-derive this list yourself with `grep -rn "new THREE\." src/` before writing any code. If a resource is ambiguous, **leave it untracked** — a leak is a known, survivable bug; a disposed shared resource is a new one, and Phase 0 does not introduce new bugs.

- [ ] **Step 3: Implement**

```ts
interface Disposable { dispose(): void; }
const tracked: Disposable[] = [];

/** Register a per-level GPU resource. Returns it, so it can wrap a constructor. */
export function track<T>(resource: T): T {
  if (resource && typeof (resource as unknown as Disposable).dispose === "function") {
    tracked.push(resource as unknown as Disposable);
  }
  return resource;
}

export function disposeAll(): void {
  for (const r of tracked) r.dispose();
  tracked.length = 0;
}
```

- [ ] **Step 4: Wrap per-level constructors and call `disposeAll()` on load**

`track(new THREE.BoxGeometry(...))` at each per-level site. Then call `disposeAll()` at the top of `loadLevel`, next to Task 6's `clearAllTimers()`.

- [ ] **Step 5: Test**

```ts
import { describe, expect, it } from "vitest";
import { track, disposeAll } from "../../src/render/DisposeRegistry";

describe("DisposeRegistry", () => {
  it("disposes everything tracked, exactly once", () => {
    let a = 0, b = 0;
    track({ dispose: () => a++ });
    track({ dispose: () => b++ });
    disposeAll();
    disposeAll();
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it("ignores values with no dispose method and returns what it was given", () => {
    const obj = { name: "not disposable" };
    expect(track(obj)).toBe(obj);
    expect(() => disposeAll()).not.toThrow();
  });
});
```

Also add a level-cycle test: load level 1, load level 2, and assert the registry is empty afterwards rather than growing without bound.

- [ ] **Step 6: Gate and commit**

Both traces load levels, so they exercise this. A red trace here most likely means a **shared** resource was tracked. Read the frame it names before changing anything.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache tests/integration/
npm run typecheck && npm test
git commit -am "fix: free per-level GPU resources on level load"
```

---

### Task 8: `noImplicitAny`

**Files:** `tsconfig.json` plus every file it flags.

Measured at `617988a` with `strict: true`: **309 errors**. This task takes the 95 that are implicit-any (`TS7006` ×90, `TS7005` ×2, `TS7034` ×1, `TS7053` ×3); Tasks 9-10 take the null-safety remainder. Splitting on the flag rather than the file is what makes each half independently reviewable.

- [ ] **Step 1: Turn the single flag on**

```json
"noImplicitAny": true,
```

Leave `strict` at `false`. Then `npx tsc --noEmit 2>&1 | grep -c "error TS"` to get your real starting number — it will differ from 95 once Tasks 1-7 have landed.

- [ ] **Step 2: Annotate, never widen**

Every fix is a real parameter type. `function f(e)` becomes `function f(e: Enemy)`, not `function f(e: any)`. Where a shape is genuinely loose, use the interfaces the port already defines (`src/world/Props.ts`'s exported `Prop`, `src/world/Collision.ts`'s `Seg`) rather than inventing parallel ones — Plan 0E's Task 3 review flagged duplicate ad-hoc shapes as a defect.

**An `any` added to silence an error is a defect in this task.** If a type is genuinely unknowable, use `unknown` and cast at the point of use, which is the pattern `Context.ts` used and `Death.ts` and `Player.ts` follow.

- [ ] **Step 3: Gate and commit**

Types are erased at runtime, so **the traces must not change**. If a fixture moves, you changed behavior — find out how before doing anything else.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache
npm run typecheck && npm test
git commit -am "types: enable noImplicitAny"
```

---

### Task 9: `strictNullChecks` — the audio layer

**Files:** `tsconfig.json`, `src/audio/*.ts`

The audio layer is 82 of the 309 errors (`Voice.ts` 29, `Sfx.ts` 29, `Ambient.ts` 24) and they share one root cause: the WebAudio graph's nodes are declared nullable because they do not exist until `audioInit()` runs, and every function then uses them without narrowing. Ten of the errors are the same overload failure — `GainNode | null` passed where `AudioNode` is expected.

It is one coherent fix, which is why it is its own task.

- [ ] **Step 1: Turn the flag on and measure**

```json
"strictNullChecks": true,
```

`npx tsc --noEmit 2>&1 | grep "src/audio" | wc -l` for your real audio count.

- [ ] **Step 2: Narrow once, at the boundary**

Every audio function already begins `if(!ctx())return;`. Extend that existing guard to narrow the nodes too, rather than adding a non-null assertion (`!`) at each of the 82 use sites. One guard per function is honest; 82 assertions is the same `any` problem wearing a different hat.

Do not change what any function *does*. `tests/behavior/audio.test.ts` compares the port's WebAudio call log against the reference's, node for node and parameter for parameter — it will catch a reordering immediately, which is exactly what you want here.

- [ ] **Step 3: Gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm run typecheck 2>&1 | grep -c "error TS"   # expect only non-audio errors left
npm test
git commit -am "types: make the audio graph null-safe under strictNullChecks"
```

`npm run typecheck` will still fail overall at this point, because Task 10 owns the rest. **That is expected** — state the remaining count in your report and confirm none of them is in `src/audio/`.

---

### Task 10: `strictNullChecks` everywhere else, then `strict: true`

**Files:** `tsconfig.json` plus the remainder.

Roughly 131 errors after Tasks 8-9, dominated by `document.getElementById(...)` returning `HTMLElement | null` and by `renderState.scene` being nullable between levels.

- [ ] **Step 1: The DOM lookups**

The port calls `document.getElementById("x").style...` in dozens of places, faithfully copying the reference. Add one narrowing helper rather than 99 assertions:

```ts
/** getElementById that throws instead of returning null — every id here is in index.html. */
export function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing element #${id}`);
  return e;
}
```

Put it in `src/ui/dom.ts`. This **does** change behavior in one narrow way — a missing element now throws instead of failing with `Cannot read property 'style' of null`. Both crash; this one names the id. Say so in your report; it is an improvement in a diagnostic, not a gameplay change.

- [ ] **Step 2: `renderState.scene`**

It is legitimately null before the first `loadLevel`. `Loop.ts` already guards with `if(renderState.scene){...}`. Where a module cannot guard, follow the existing cast style in `LevelLoader.ts` (`renderState.scene as THREE.Scene`) rather than inventing a new one.

- [ ] **Step 3: Flip `strict: true` and delete the individual flags**

```json
"strict": true,
```

Remove `noImplicitAny` and `strictNullChecks` — `strict` implies both, plus `strictFunctionTypes`, `strictBindCallApply`, `alwaysStrict` and `noImplicitThis`. Re-run and fix whatever the additional flags surface; expect few, since the two big ones are done.

Confirm `allowJs` and `checkJs` are already gone (Task 4 removed them).

- [ ] **Step 4: Gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx tsc --noEmit && echo "STRICT CLEAN"
npx vitest run --no-cache
npm test
git commit -am "types: enable strict mode"
```

---

### Task 11: Three.js — evaluate, then upgrade or defer with a record

**This task's deliverable is a decision backed by evidence, not necessarily an upgrade.** Spec §9 names this the highest risk in Phase 0 and explicitly permits deferring it to Phase 2, "where lighting is being reworked anyway".

**Files:** `package.json`, `src/render/RenderCore.ts`, `docs/known-issues.md`

- [ ] **Step 1: Establish what would actually break**

The port uses 34 distinct `THREE.*` APIs, and all the geometry, material and light classes it touches still exist in modern Three. The breakage is concentrated elsewhere:

1. **`src/render/RenderCore.ts:46`** — `if (THREE.sRGBEncoding !== undefined) renderState.renderer.outputEncoding = THREE.sRGBEncoding;`. Both names were removed; the modern spelling is `outputColorSpace = THREE.SRGBColorSpace`. Note the existing `!== undefined` guard means this line already *silently does nothing* on a modern Three rather than throwing — which is precisely the kind of failure that passes a test suite and changes the picture.
2. **Colour management is on by default since r152.** Every colour in the game shifts. This is an art change and Phase 0 forbids art changes.
3. **Light intensities changed meaning in r155** (`useLegacyLights` defaulting off). The game's lighting is hand-tuned point lights; they will not look the same.

Verify each of these against the actual Three migration guide for the version you are considering rather than trusting this list — it was written from the API surface, not from running the upgrade.

- [ ] **Step 2: Be honest about what can be verified here**

The characterization traces pin the **camera, a scene-graph digest and HUD fields**. They do not sample pixels. A colour-management change is therefore **invisible to every test in this repo** — the suite would stay green while the game looked different.

The browser pane cannot substitute: it throttles `requestAnimationFrame` to zero when not displayed, so the game loop does not run there. See `docs/STATUS.md`'s environment notes.

**State this plainly in your report.** A green suite is not evidence for this particular change, and claiming it is would be the most damaging thing this task could produce.

- [ ] **Step 3: Decide, on the evidence**

**Upgrade only if** you can show the render output is unchanged — which in practice needs a human running the game side by side with `reference/sonsurum.html`. If you cannot, **defer**.

The expected outcome is deferral. That is not a failure; it is the spec's own mitigation working.

- [ ] **Step 4: Whichever you choose, leave a record**

If deferring, add a KNOWN row (next free number) covering: that Three is pinned at 0.128.0 (2021); the three specific breakages above with their file and line; that `RenderCore.ts:46`'s guard makes the encoding change silent rather than loud; that no test in this repo can see a colour shift; and that Phase 2 owns it because lighting is being reworked there anyway. Match the existing rows' voice and level of detail.

Fix the dead `sRGBEncoding` guard's **comment** either way, so the next reader knows it is conditional on purpose.

- [ ] **Step 5: Commit**

```bash
git commit -am "docs: record the Three.js upgrade decision and what blocks it"
```

---

### Task 12: Whole-branch review and merge

- [ ] **Step 1: Confirm the port is actually finished**

`src/legacy.js` must not exist. `src/` must contain no `.js` file. `tsconfig.json` must have `strict: true` and no `allowJs`/`checkJs`. Say so with the commands that prove each.

- [ ] **Step 2: Audit what the hardening changed**

List every behavioral change Tasks 5-7 made, and for each, the test that pins it. A chartered change with no test is the same gap KNOWN-3 described in the first place.

If any trace fixture was regenerated in Tasks 5-7, quote the analysis that justified it and confirm the divergence was consistent with the stated cause.

- [ ] **Step 3: Sabotage the new seams — choose your own**

This project's method is explicit that reviewers must choose their own sabotages rather than repeating the implementer's; that practice found KNOWN-6, KNOWN-9 and KNOWN-10, and during Plan 0E it found that the `Context` locator's registrations had no coverage at all. Cover at least:

- a `Time.schedule` delay converted with the wrong unit (ms passed where seconds are expected)
- a shared THREE resource wrongly added to the dispose registry
- one `setInputHooks` entry pointing at the wrong function
- one field of `Loop.ts`'s 18-field viewmodel literal transposed

Any sabotage that leaves the suite green is a finding. Record the exact mutation.

- [ ] **Step 4: Check the definition of done, and say what cannot be checked**

Be explicit about the browser limitation rather than glossing it.

- [ ] **Step 5: Update the docs and merge**

`docs/STATUS.md`: 0F to **merged**, the burn-down reaching **zero**, real test counts, and the next action (Phase 1). `docs/known-issues.md`: close KNOWN-3, and confirm KNOWN-2 was closed in Task 2.

Merge with `--no-ff` and a descriptive body, matching the convention of the 0C, 0D and 0E merge commits:

```bash
git add docs/STATUS.md docs/known-issues.md
git commit -m "docs: record Plan 0F's outcome"
git checkout master
git merge --no-ff phase-0f-ui-and-hardening -F <path-to-message-file>
```

Write the merge message to a file and pass it with `-F <file>`. **`git merge` does not read `-F -` from stdin** the way `git commit` does — it fails with `could not read file '-'`. That cost a retry at the end of Plan 0E.

Then re-run the full gate **on `master`** with a cold cache before calling it done.

---

## Definition of done for Plan 0F

- [ ] `src/legacy.js` does not exist; `src/` contains no `.js` file; the port burn-down is zero
- [ ] `src/core/Context.ts` holds exactly one entry, `wakeBoss`, and KNOWN-2 records the cycle it prevents
- [ ] The four gameplay `setTimeout` calls run on `Time.schedule()` and respect hit-stop and pause
- [ ] Every remaining timer is cancelled on level load
- [ ] `loadLevel` frees the previous level's per-level GPU resources, and no shared resource is disposed
- [ ] `tsconfig.json` has `strict: true`, no `allowJs`, no `checkJs`, and `npx tsc --noEmit` is clean
- [ ] The Three.js decision is made and recorded, with its evidence or its stated absence
- [ ] `npm test` passes; no import cycles; no `src/` file over 400 lines
- [ ] Any regenerated trace fixture has a written analysis in the same commit
- [ ] `docs/STATUS.md` and `docs/known-issues.md` reflect reality

## What comes next

**Phase 1.** The spec's `core/Events.ts` gets built when the first system actually needs a subscriber — deliberately not before, per Plan 0E Decision 2. Phase 2 reworks combat feel and lighting and owns the deferred Three.js upgrade, KNOWN-7 (casings never reaching the screen) and KNOWN-8 (the six-slot mouse wheel). Phase 4's level rebuild owns KNOWN-4 and KNOWN-11.
