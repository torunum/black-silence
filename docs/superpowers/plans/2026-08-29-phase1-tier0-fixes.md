# Phase 1 — Tier 0 Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the game sound that comes from somewhere, a resolution the player can change, and progress that survives a reload.

**Architecture:** Three independent features. The save system lands first because the other two persist through it. Positional audio is a routing change inside `AudioEngine.ts` that leaves every emitter's body untouched — verified before this plan was written. Music is built against the existing procedural sources so the phase never blocks on asset delivery.

**Tech Stack:** Vite 6, TypeScript 5 (`strict`), Vitest 2, jsdom, madge, three 0.128.0 (pinned — KNOWN-14).

## Global Constraints

Every task's requirements implicitly include this section.

- **This phase changes behavior on purpose.** That is the difference from Phase 0. But a change is only sanctioned inside the task chartered for it; outside that, the old rule holds and a regression is still a regression.
- **`reference/sonsurum.html` is never edited.**
- **Retiring a byte-identity test requires replacing its coverage first**, in an earlier commit, so a reviewer can see the coverage land before the guard leaves. Ten functions — `pianoNote`, `gurgle`, `pain`, `deathCry`, `wetDoor`, `stoneDoor`, `bellToll`, `organChord`, `click`, `noiseBuf` — have **no behavioural-recorder coverage today**; byte identity in `tests/fidelity.test.ts` is their only guard.
- **Neither trace fixture may be regenerated without a written analysis in the same commit.** `WRITE_TRACE=1` is not a tool for turning a red build green.
- **No file in `src/` may exceed 400 lines.** Hard gate.
- **No import cycles.** Hard gate, and it must be run as `madge --circular --extensions ts,js src/`. **The bare form scans zero files and still reports success** — `src/` has no `.js` files. The "Processed N files" line is the tell; expect ~88.
- **Every new assertion gets a recorded mutation that turns it red.** A test that would pass under the bug is worse than no test.
- **Use a cold cache for trace runs:** `npx vitest run --no-cache`.
- **`npm test` and `npm run typecheck` must pass before every commit.** Node is not on PATH in a fresh shell: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.
- **Every third-party asset gets a row in `docs/assets.md`** — name, license, source URL, why chosen, what was modified. No row, no ship. None are needed to complete this plan; see Task 6.

---

## Starting state

`master` at `3533ea4`. 400 tests, `strict: true`, `src/legacy.js` gone.

Measured, not assumed:

| Area | Today |
|---|---|
| Audio routing | One graph: `masterG` → destination, plus an `echoG` → delay → feedback send. **No emitter takes a position.** |
| Emitter call sites | 10 real `masterBus()`/`echoBus()` calls across `Sfx.ts`, `Voice.ts`, `Ambient.ts` — **all inside function bodies, at emission time** |
| Music | `startBossMusic`/`stopBossMusic` only: a `setInterval` pulse |
| Resolution | `sizeRender()`'s `const a=innerWidth/innerHeight,w=400,h=Math.round(w/a)` |
| Persistence | **None.** No `localStorage` call in `src/` or in the reference |
| Settings UI | One row in `index.html`'s `#settings`, wired by `Menus.ts`'s volume IIFE |

### The finding that shapes the audio work

Every emitter calls `masterBus()` / `echoBus()` **per emission, inside its own body** — never captured at module scope. `blip` does `lp.connect(echo?echoBus():masterBus())` on every call; so do the other nine sites.

**So if the accessors return a per-emission `PannerNode` chained into the master gain instead of the master itself, every emitter becomes positional with zero body changes** — and the ten unguarded byte-identity tests stay valid. This was verified against the source before this plan was written; Task 3 re-verifies it before relying on it.

---

## File structure

| File | Owns | Task |
|---|---|---|
| `src/save/SaveGame.ts` | the `save` object, now backed by a versioned store | 1 |
| `src/save/persist.ts` | `load()` / `save()` against `localStorage`, schema version, migration | 1 |
| `src/render/RenderCore.ts` | `sizeRender` reads a setting instead of a literal | 2 |
| `src/ui/Menus.ts` | a resolution row beside the volume row | 2 |
| `index.html` | one new `.setrow` | 2 |
| `src/audio/AudioEngine.ts` | the panner chain and the emission-position accessors | 3 |
| `src/audio/Listener.ts` | keeps the WebAudio listener on the camera | 3 |
| callers in `enemies/`, `world/`, `weapons/` | pass a position where one is known | 4 |
| `src/audio/Music.ts` | layer selection and cross-fade | 5 |
| `docs/assets.md` | rows for real audio, when it arrives | 6 |

`src/audio/` already holds `AudioEngine.ts`, `Sfx.ts`, `Voice.ts`, `Ambient.ts`. `Music.ts` is the adaptive-layer *controller*; the drone/boss-pulse *sources* stay in `Ambient.ts`. Two files, one subject — the same split as `Projectiles.ts`/`ProjectileTick.ts`. Do not merge them.

---

### Task 1: Persistence

**Files:**
- Create: `src/save/persist.ts`, `tests/save/persist.test.ts`
- Modify: `src/save/SaveGame.ts`

**Interfaces:**
- Produces: `loadSave(): void`, `flushSave(): void`, `SAVE_VERSION` from `persist.ts`; `save` keeps its existing shape from `SaveGame.ts` and gains `masterVolume` and `renderWidth`.

- [ ] **Step 1: Read the constraint that governs this task**

`src/save/SaveGame.ts` is `export const save = { maxLevel: 0 }`. **It is a plain mutable object, and that is load-bearing for the test suite**: `tests/integration/combatTrace.test.ts` assigns `save.maxLevel = 1` to reach a level with enemies, which is the only reason the combat path has any coverage.

**Whatever you build must keep `save.maxLevel = 1` working synchronously, from a test, with no boot step.** Not a getter that reads storage. Not a promise. Not a frozen object. If your design cannot do that, stop and report.

- [ ] **Step 2: Write the failing tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { save } from "../../src/save/SaveGame";
import { loadSave, flushSave, SAVE_VERSION } from "../../src/save/persist";

const KEY = "blacksilence.save";

describe("persistence", () => {
  beforeEach(() => { localStorage.clear(); save.maxLevel = 0; });

  it("round-trips maxLevel through storage", () => {
    save.maxLevel = 3;
    flushSave();
    save.maxLevel = 0;
    loadSave();
    expect(save.maxLevel).toBe(3);
  });

  it("writes a version field", () => {
    flushSave();
    expect(JSON.parse(localStorage.getItem(KEY)!).v).toBe(SAVE_VERSION);
  });

  it("falls back to defaults on corrupt JSON without throwing", () => {
    localStorage.setItem(KEY, "{not json");
    expect(() => loadSave()).not.toThrow();
    expect(save.maxLevel).toBe(0);
  });

  it("falls back to defaults on an unknown future version", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION + 99, maxLevel: 7 }));
    loadSave();
    expect(save.maxLevel).toBe(0);
  });

  it("ignores a field the schema does not know", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, maxLevel: 2, wat: 1 }));
    loadSave();
    expect(save.maxLevel).toBe(2);
  });

  it("survives storage being unavailable", () => {
    const orig = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      get() { throw new Error("blocked"); }, configurable: true,
    });
    expect(() => loadSave()).not.toThrow();
    expect(() => flushSave()).not.toThrow();
    if (orig) Object.defineProperty(globalThis, "localStorage", orig);
  });
});
```

The file needs `// @vitest-environment jsdom` as its first line — `localStorage` does not exist in the default node environment.

- [ ] **Step 3: Run them and confirm they fail**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache tests/save/persist.test.ts
```

Expected: fail on the missing `persist` module.

- [ ] **Step 4: Implement**

```ts
export const SAVE_VERSION = 1;
const KEY = "blacksilence.save";

/** Reads persisted values into `save`. Never throws: a bad or absent store leaves defaults. */
export function loadSave(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.v !== SAVE_VERSION) return;
    if (typeof data.maxLevel === "number") save.maxLevel = data.maxLevel;
    if (typeof data.masterVolume === "number") save.masterVolume = data.masterVolume;
    if (typeof data.renderWidth === "number") save.renderWidth = data.renderWidth;
  } catch { /* corrupt, blocked, or full — defaults stand */ }
}

/** Writes `save` to storage. Never throws. */
export function flushSave(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, ...save }));
  } catch { /* private mode, quota, blocked — losing a save beats crashing */ }
}
```

Add `masterVolume` and `renderWidth` to `save` with the values that are currently hardcoded (`0.5` in `AudioEngine.ts`, `400` in `RenderCore.ts`) so Tasks 2 and 3 have somewhere to write.

Per-field type checks, not a blanket assign: an old or hand-edited store must not be able to put a string into `maxLevel`.

- [ ] **Step 5: Call it**

`loadSave()` at `src/main.ts` module scope, **before** `startLoop()`. `flushSave()` wherever a persisted value changes — `endLevel`'s `save.maxLevel = Math.max(...)` is the one that exists today.

- [ ] **Step 6: Prove the tests are real**

For each of the six, apply a mutation that should break it (drop the version check, remove a `try`, assign without the type check) and confirm the right one goes red. Record each in the report.

- [ ] **Step 7: Gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache
npm run typecheck && npm test
git add src/save/ tests/save/ src/main.ts src/ui/LevelEnd.ts
git commit -m "feat: persist progress and settings across reloads"
```

`combatTrace.test.ts` must still pass. If it does not, Step 1's constraint was broken.

---

### Task 2: Resolution setting

**Files:**
- Modify: `src/render/RenderCore.ts`, `src/ui/Menus.ts`, `index.html`
- Test: `tests/render/resolution.test.ts`

**Interfaces:**
- Consumes: `save.renderWidth` from Task 1.
- Produces: `RENDER_WIDTHS` from `RenderCore.ts` — the named options.

- [ ] **Step 1: Replace the literal**

`sizeRender()` reads `const a=innerWidth/innerHeight,w=400,h=Math.round(w/a)`. The `400` becomes `save.renderWidth`.

Everything else in that function stays. It is called on boot and on every `resize`, and the setting must go through **that same function**, not a parallel path — a second resize path is how the aspect handling drifts.

```ts
/** Internal render widths, in pixels. 400 is the reference's hardcoded value and stays the default. */
export const RENDER_WIDTHS = [320, 400, 512, 640, 800] as const;
```

- [ ] **Step 2: Add the UI row**

`index.html`'s `#settings` has one `.setrow` for master volume. Add a second, matching its shape:

```html
<div class="setrow">
  <span class="setlabel">RESOLUTION</span>
  <input type="range" id="resSlider" min="0" max="4" value="1">
  <span class="setval" id="resVal">400</span>
</div>
```

A range over indices rather than a `<select>` keeps it consistent with the existing control and needs no new CSS.

- [ ] **Step 3: Wire it**

In `Menus.ts`'s `initMenus`, beside the volume IIFE and in the same shape — read the current value at registration time, paint the label, then listen. On input: set `save.renderWidth`, call `sizeRender()`, call `flushSave()`.

`src/ui/dom.ts`'s `el()` is the house lookup helper. Note `tests/smoke.test.ts` scans every literal `el("x")` argument against `index.html`, so a typo in the new ids fails there — that is the test doing its job.

- [ ] **Step 4: Persist the volume too, while you are in this file**

Task 1 added `save.masterVolume`, but nothing writes it yet: `AudioEngine.ts`
keeps `masterVol = 0.5` in memory and the existing volume IIFE calls
`setMasterVolume` without persisting. That is the same gap this task closes for
resolution, in the same file, so close both.

`setMasterVolume` should write through to `save.masterVolume` and `flushSave()`,
and `loadSave()` (Task 1, at `main.ts` scope) must run **before** `initMenus`
paints the slider — otherwise the slider shows the default and then overwrites
the stored value on first input. Check that ordering in `main.ts` and state it
in your report.

- [ ] **Step 5: Test**

```ts
import { describe, expect, it } from "vitest";
import { RENDER_WIDTHS } from "../../src/render/RenderCore";
import { save } from "../../src/save/SaveGame";

describe("render widths", () => {
  it("includes the reference's 400 and keeps it the default", () => {
    expect(RENDER_WIDTHS).toContain(400);
    expect(save.renderWidth).toBe(400);
  });

  it("is sorted ascending and has no duplicates", () => {
    const a = [...RENDER_WIDTHS];
    expect(a).toEqual([...new Set(a)].sort((x, y) => x - y));
  });
});
```

Then a jsdom test that moving the slider changes `save.renderWidth` and calls through to `sizeRender` — mutate the listener to write the index instead of the width and confirm it goes red.

- [ ] **Step 6: Gate and commit**

Both traces must stay green: they run at the default width, which is unchanged.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache
npm run typecheck && npm test
git commit -am "feat: make the internal render resolution a setting"
```

---

### Task 3: The panner chain

**Charter: this task changes audio behavior deliberately.** Everything a caller does not give a position to must sound exactly as before.

**Files:**
- Modify: `src/audio/AudioEngine.ts`
- Create: `src/audio/Listener.ts`, `tests/audio/positional.test.ts`

**Interfaces:**
- Produces: `emitAt(x, y, z)`, `emitHere()` from `AudioEngine.ts`; `updateListener()` from `Listener.ts`.

- [ ] **Step 1: Re-verify the routing property before relying on it**

This whole task rests on one measured fact: **every emitter calls `masterBus()`/`echoBus()` inside its own body, per emission.** Confirm it yourself:

```bash
grep -rn "masterBus()\|echoBus()" src/audio/*.ts | grep -v "^\S*: \*"
```

Ten call sites, all inside function bodies. If any emitter captured the bus at module scope, this design would silently send every sound to one panner and the task would need the other shape — say so and stop.

- [ ] **Step 2: Build the chain**

`audioInit` currently ends with `masterG` → destination and an `echoG` → delay → feedback → `masterG` send. Add a per-emission panner that the accessors hand out:

- `emitAt(x, y, z)` sets the position the **next** emission uses.
- `emitHere()` resets to non-positional (the current behavior).
- `masterBus()` returns a `PannerNode` positioned there and connected to `masterG`, or `masterG` itself when no position is set.
- `echoBus()` does the same into `echoG`.

Use `panningModel: "HRTF"`, `distanceModel: "inverse"`, and a `refDistance` tuned so a sound at the player is unchanged in level. **State the values you picked and why in your report** — they are the whole feel of this feature.

**A new panner per emission is correct, not wasteful.** Sounds are short and the nodes are garbage after they stop; a shared panner would make every simultaneous sound come from the same place.

- [ ] **Step 3: Keep the listener on the camera**

`src/audio/Listener.ts` sets the WebAudio listener's position and orientation from `renderState.camera`, called once per frame from `src/core/Loop.ts` inside the existing `if(renderState.scene){...}` block.

Use the modern `positionX.value = …` accessors where available and fall back to the deprecated `setPosition`/`setOrientation`, which is what jsdom and older Safari expose. Guard, do not assume.

**Do not use `THREE.PositionalAudio`.** It routes game audio through Three's audio layer, which `tests/behavior/audio.test.ts`'s recorder does not observe, and couples audio to a renderer version this project has pinned (KNOWN-14).

- [ ] **Step 4: Prove the emitters did not change**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
git diff --stat HEAD -- src/audio/Sfx.ts src/audio/Voice.ts src/audio/Ambient.ts
```

**Must be empty.** If any of those three changed, the design slipped and the ten unguarded byte-identity tests are at risk. `npx vitest run --no-cache tests/fidelity.test.ts` must pass untouched.

- [ ] **Step 5: Test**

`tests/support/recordingAudio.ts` already logs node creation, `connect` edges and parameter assignments. Assert:

- with no position set, the graph a `blip` builds is **identical** to today's — this is the "nothing regressed" guard and it is the important one
- with `emitAt(10, 0, 0)`, a `PannerNode` appears in the chain carrying that position
- `emitAt` affects one emission and does not leak into the next

Mutate each: drop the reset in `emitHere`, connect the panner to the destination instead of `masterG`, swap the x and z you write. Confirm the right assertion goes red for each.

- [ ] **Step 6: Gate and commit**

The traces do not record audio, so they should be unaffected — **if either moves, find out why before continuing.**

```bash
npx vitest run --no-cache
npm run typecheck && npm test
git commit -am "feat: route sound through a per-emission panner"
```

---

### Task 4: Give the callers positions

**Charter: this is where the feature becomes audible.** Sounds that have a world position start using it.

**Files:** callers in `src/enemies/`, `src/world/`, `src/weapons/`, `src/player/`

- [ ] **Step 1: Inventory the emitters that know where they are**

Find every call to a sound function from code that has a world position in hand — enemy barks (`snarl`, `growl`, `pain`, `deathCry` in `Behaviors.ts`, `Damage.ts`, `Death.ts`), door sounds (`wetDoor`/`stoneDoor` in `Interact.ts`, which already has the door's grid cell), prop breaks (`Props.ts`), impacts (`Hitscan.ts`).

**List them all in your report with file, line and the position expression you will pass.** Do not guess at a position: if the emitting code does not already have one, leave that call non-positional and say so. A wrong position is worse than none.

- [ ] **Step 2: Wrap, do not rewrite**

```ts
emitAt(e.x, e.h * 0.6, e.z);
snarl(e.key);
```

The emitter's own signature and body are untouched — that is the property Task 3 bought and it must survive this task.

Player-relative sounds (weapon fire, the HUD, the piano) stay non-positional. Reload noises coming from three metres to the left would be a bug, not a feature.

- [ ] **Step 3: Test the wiring, not the mechanism**

Task 3 proved the panner works. This task must prove the **right positions reach it**, in the style of `tests/integration/schedulerWiring.test.ts`: boot, start a level, trigger a real enemy sound, assert the recorded graph carries that enemy's coordinates.

Sabotage it by swapping an `e.x` for an `e.z` at one call site and confirming the test names it.

- [ ] **Step 4: Gate and commit**

```bash
npx vitest run --no-cache
npm run typecheck && npm test
git commit -am "feat: emit world sounds from their world positions"
```

---

### Task 5: Adaptive music

**Files:**
- Create: `src/audio/Music.ts`, `tests/audio/music.test.ts`
- Modify: `src/core/Loop.ts`, `src/world/LevelLoader.ts`

**Interfaces:**
- Produces: `musicTick(dt: number, anyAware: boolean)`, `stopMusic()` from `Music.ts`.

- [ ] **Step 1: Build the state machine, not the sound**

Three layers — exploration, combat, boss. **Real `.ogg` files are a user-supplied dependency and this task does not block on them.** Build against the procedural sources that already exist; `startBossMusic`/`stopBossMusic` in `Ambient.ts` prove the shape.

What is fully specifiable now, and is the actual work:

- **Combat means `anyAware`** — `enemyTick` already returns it and `Loop.ts` already threads it into `chatterTick`. Reuse it; do not invent a second definition.
- **Boss beats combat**, and is detected the way `Hud.ts` already does it: a live, non-dormant `e.boss` in `world.enemies`.
- **A cross-fade takes time and hysteresis.** Snapping layers the instant the last enemy loses track of you is worse than no music. Pick a fade length and a minimum dwell time, state both, and justify them.
- **Death and win stop the music**, via the exported `stopMusic()` — call it
  from where `stopBossMusic()` is already called on death (`damagePlayer`'s
  `S.hp<=0` branch in `Player.ts`) and on win (`showWin` in `LevelEnd.ts`), so
  there is one place per outcome rather than a new lifecycle to keep in sync. Level load already cancels timers (`clearAllTimers`/`clearScheduled` run at the top of `loadLevel`) — **verify that covers whatever you build rather than assuming it**, and if you use an interval, make sure it is cancellable the same way.

- [ ] **Step 2: Drive it from the loop**

`musicTick(dt, anyAware)` beside `chatterTick(dt, anyAware)` in `Loop.ts`, inside the same `!paused && !S.dead && !S.won` block, so music pauses with the game.

- [ ] **Step 3: Test the transitions**

Pure state-machine tests: exploration → combat on `anyAware`, combat → boss when a live boss exists, boss → exploration when it dies, no flapping when `anyAware` oscillates within the dwell time, silence on death.

Mutate: remove the hysteresis, invert the boss check, drop the death stop. Each must turn a named test red.

- [ ] **Step 4: Gate and commit**

```bash
npx vitest run --no-cache
npm run typecheck && npm test
git commit -m "feat: adaptive music layers driven by combat state"
```

---

### Task 6: Real audio files — only when they arrive

**This task has no start date and does not block the phase.** The user supplies CC0 audio; until then Tasks 3-5 run on procedural sources and the game is complete without it.

- [ ] **Step 1: Add the rows first**

For each file, a row in `docs/assets.md`: name, type, license, source URL, why chosen, what was modified. **No row, no ship** — that is `docs/direction.md`'s rule, and the row goes in the same commit as the file.

- [ ] **Step 2: Swap the sources, not the routing**

A real file becomes an `AudioBufferSourceNode` where a procedural oscillator is today. **It connects to the same bus accessor**, so it inherits positioning for free — that is the point of Task 3's shape.

- [ ] **Step 3: Verify nothing else moved**

`npx vitest run --no-cache`, both traces green, and `tests/behavior/audio.test.ts` still passing for every emitter you did **not** replace.

---

### Task 7: Whole-branch review and merge

- [ ] **Step 1: Confirm the charters held**

List every behavioral change and the task that chartered it. Anything outside Tasks 1-5's charters is a finding.

- [ ] **Step 2: Confirm no byte-identity test was retired**

`git diff master...HEAD -- tests/fidelity.test.ts` should be **empty**. This plan is designed so none is needed. If one was retired, verify its replacement coverage landed in an earlier commit, and say which.

- [ ] **Step 3: Sabotage the new seams — choose your own**

Reviewers pick their own mutations rather than repeating the implementer's; that practice found the vacuous madge gate, the unpinned delays and three narrowed guards in earlier phases. Cover at least: a save-schema version check, a panner connected to the wrong destination, a swapped coordinate at a Task 4 call site, and a music transition.

Any sabotage that leaves the suite green is a finding.

- [ ] **Step 4: Check the guards have not narrowed**

The recurring failure in this project is a guard that keeps reporting success while covering less. Confirm `tests/smoke.test.ts`'s lookup count did not drop, `madge` still processes ~88 files, and `vitest.config.ts` still has `passWithNoTests: false`.

- [ ] **Step 5: Update the docs and merge**

`docs/STATUS.md`: Phase 1 merged, real test count, next action. `docs/known-issues.md`: anything found. `docs/assets.md`: rows for whatever shipped.

Merge with `--no-ff` and a descriptive body, matching 0C-0F. Write the message to a file and pass `-F <file>` — **`git merge` does not read `-F -` from stdin** the way `git commit` does.

Then re-run the full gate **on `master`** with a cold cache.

---

## Definition of done for Phase 1

- [ ] Progress and settings survive a reload; a corrupt, absent or future-versioned store falls back to defaults without throwing
- [ ] `save.maxLevel = 1` still works synchronously from a test — `combatTrace.test.ts` passes
- [ ] The player can change render resolution in Settings and it persists
- [ ] Sounds with a world position are audibly directional; player-relative sounds are unchanged
- [ ] `src/audio/Sfx.ts`, `Voice.ts` and `Ambient.ts` are **unmodified** by Tasks 3-5
- [ ] Music changes with combat state and stops on death
- [ ] `npm test` passes, `npx tsc --noEmit` clean, no cycles, no `src/` file over 400 lines
- [ ] Every new assertion has a recorded mutation proving it fails
- [ ] Neither trace fixture regenerated
- [ ] `docs/assets.md` has a row for every third-party file shipped

## What comes next

**Phase 2** — the world: shadowed lighting, instanced/merged geometry, variable ceiling height, gothic trim. It also owns the deferred Three.js upgrade (KNOWN-14), KNOWN-7 (casings never reaching the screen) and KNOWN-8 (the six-slot mouse wheel).

**Phase 3** inherits 8-directional sprites, per the 2026-08-29 direction amendment, alongside the roster cut and KNOWN-13's fifteen duplicate enemy interfaces.
