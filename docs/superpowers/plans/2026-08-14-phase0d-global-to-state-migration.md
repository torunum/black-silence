# Phase 0D — The Global-to-State Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every remaining cross-module mutable global out of `src/legacy.js` and onto an owning state object, so that Plan 0E can carve out whole systems without fighting the module system.

**Architecture:** ES module bindings are immutable across module boundaries — `export let px` cannot be assigned from another module. Every mutable global therefore becomes a **property on an exported state object** (`player.px`, not `getPx()/setPx()`), because the object binding never changes while its properties do. No logic moves in this plan; only where state *lives*. `legacy.js` keeps every function it has and reads them through the new objects.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 2, jsdom, madge, three 0.128.0 (pinned).

## Global Constraints

Every task's requirements implicitly include this section.

- **No gameplay changes. No balance changes. No new features.** Existing bugs are preserved.
- **No art changes. No audio changes.**
- **`reference/sonsurum.html` is never edited.**
- **Three.js is pinned to `0.128.0`.** The upgrade is Plan 0F.
- **No file in `src/` may exceed 400 lines**, except `src/legacy.js`. Hard gate.
- **No import cycles.** Hard gate.
- **Every task ends with a playable game.**
- **Every line number in this plan is advisory.** Confirm every range by reading its content. The line numbers below were measured at `48fbf5b` and every task that lands shifts them.
- **Burn-down and test-count figures are estimates.** Record the real ones; never edit a source file to make a count match a document.
- **`npm test`, `npm run typecheck` and `madge --circular src/` must pass before every commit.** Node is not on PATH in a fresh shell here: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.

---

## Starting state

`master` at `48fbf5b`. `src/legacy.js` is 1633 lines. 348 tests pass.

Plan 0C already migrated 44 of the spec's inventory. What remains, measured
rather than assumed — 62 declarations across 633 bare call sites in
`legacy.js`:

| Group | Vars | Call sites | Globals (declaration line) |
|---|---|---|---|
| SaveGame | 1 | 5 | `maxLevel`:1565 |
| Heads | 1 | 6 | `heads`:74 |
| Piano | 2 | 12 | `keyEls`:1454 `noteHist`:1454 |
| Projectiles | 2 | 15 | `nails`:238 `orbs`:238 |
| Ambience | 5 | 20 | `ambT` `heartT` `breathT`:362 `darkT` `savedAmb`:1426 |
| Shake | 3 | 25 | `trauma` `hitStop` `zoomT`:58 |
| Game | 4 | 31 | `started` `inputLock` `pianoOpen`:43 `last`:1605 |
| WeaponRuntime | 12 | 92 | `wstate` `wtime` `wCool` `pending` `reloadFlags` `recoilPitch`:105 `kickAmt` `kickRot` `muzzle` `zoomLerp`:106 `volleyHit`:201 `kickAnim`:207 |
| Renderer | 8 | 123 | `scene` `camera` `renderer` `lamp` `lampCore` `muzzleLight` `boomLight` `ambLight`:48 |
| WorldState | 13 | 126 | `grid` `GW` `GH` `doors` `enemies` `props` `items` `torches` `candles` `exitPos` `pianoPos`:383 `heightMap`:269 `wallSegs`:250 |
| PlayerState | 10 | 178 | `px` `pz` `vx` `vy` `vz` `pyy` `grounded` `bobT` `lastBobSin` `spawnGuard`:385 |

Regenerate this table at any time — the two scripts that produced it are
reproduced in Task 1, Step 1.

### Three decisions this plan locks in

**1. State objects, not accessors.** `src/player/Input.ts` (Plan 0C) used
`getYaw()/setYaw()` pairs. That was right for eight values behind an event
handler; at 633 call sites it would mean ~1266 edits and two exported
functions per field. The spec §3 says "a property on an owning state
object", and that is what every task below does:

```ts
export const shake = { trauma: 0, hitStop: 0 };
```

Call sites become `screenShake.trauma`, assignments become
`screenShake.trauma = ...`. Task 11 converts `Input.ts`'s accessors to the
same shape so the codebase has one pattern, not two.

Where the spec's §3 table and the files on disk disagree, **the files
win**. The spec names `player/InputState.ts`, `fx/DecalState.ts` and
`ui/Piano.ts`; Plan 0C actually built `player/Input.ts`, `fx/Decals.ts` +
`fx/Gibs.ts`, and left the piano untouched. This plan uses the real names
and adds `ui/PianoState.ts` for the piano's *state* only, because the
piano's logic belongs to Plan 0F and a file called `Piano.ts` should be
that.

**2. `const` declarations are not in scope.** The migration exists because
`let` bindings cannot be reassigned across modules. `const CELL`, `WALLH`,
`EYE`, `WEAPONS`, `EQUIP_T`, `UNEQUIP_T`, the shared materials and
geometries (`blobTex`, `crossMat`, `reapCoreMat`, `reapTailMat`, `orbGeo`,
`ringMatBase`), and the tables `WNAMES`/`KEYMAP`/`WHITE`/`BLACK` are all
`const` and export directly when their owning system moves in Plan 0E.
Leave them alone.

**3. `zoomT` is dead and gets deleted, not migrated.** `let trauma=0,hitStop=0,zoomT=0;`
declares it, and `zoomT` appears nowhere else — not in `src/`, not in
`reference/sonsurum.html` (line 911 is its only occurrence there too).
Deleting a binding that is never read is provably behavior-neutral, and
carrying dead state into a new module would outlive this plan. Task 2
deletes it and records the proof in the commit message.

---

## File structure

Eleven new files, all tiny — a state object plus the interface describing
it. None should exceed 60 lines.

| File | Owns |
|---|---|
| `src/fx/ShakeState.ts` | `trauma`, `hitStop` |
| `src/save/SaveGame.ts` | `maxLevel` |
| `src/fx/Heads.ts` | `heads` |
| `src/ui/PianoState.ts` | `keyEls`, `noteHist` |
| `src/fx/Projectiles.ts` | `nails`, `orbs` |
| `src/world/AmbienceState.ts` | `ambT`, `heartT`, `breathT`, `darkT`, `savedAmb` |
| `src/core/Game.ts` | `started`, `inputLock`, `pianoOpen`, `last` |
| `src/weapons/WeaponRuntime.ts` | the 12 weapon-runtime values |
| `src/render/Renderer.ts` | `scene`, `camera`, `renderer` and the five lights |
| `src/world/WorldState.ts` | the 13 world values |
| `src/player/PlayerState.ts` | the 10 player values |
| `src/core/State.ts` | `S`, typed |

Plus, in tests: `tests/integration/gameplayTrace.ts` (the harness) and
`tests/integration/trace.test.ts` (the characterization test).

---

### Task 1: The gameplay trace oracle

Everything after this task edits `legacy.js` in bulk. `tests/behavior/*`
compares *modules* against the reference and will not notice a botched call
site; `tests/integration/wiring.test.ts` runs two frames and checks the
wiring, not the gameplay. Nothing today would catch `px` and `pz` being
swapped in a movement formula.

This task builds the net: boot the real game, drive it deterministically for
several hundred frames, and record observables that are **downstream of
everything and untouched by this plan** — the camera, the scene graph, the
HUD. `px` becomes `player.px` in Task 10, but the camera position it
produces does not change shape, so the same trace file keeps working.

**Files:**
- Create: `tests/integration/gameplayTrace.ts`
- Create: `tests/integration/trace.test.ts`
- Create: `tests/integration/__fixtures__/trace-level0.json`
- Modify: `tests/support/domStubs.ts` (deterministic timers)

**Interfaces:**
- Produces: `runTrace(options: TraceOptions): TraceFrame[]` and
  `TraceFrame = { frame: number; camera: number[]; hud: Record<string,string>; scene: SceneDigest }`.
  Later tasks call neither — they only run `npm test`.

- [ ] **Step 1: Regenerate the inventory, and confirm it against the file**

Two scripts. Run both, and paste their output into the task report — if the
numbers differ from the table above, the table is stale and yours is right.

```js
// scratch/globals.mjs — which of the spec's globals are still declared in legacy.js
import { readFileSync } from "node:fs";
const lines = readFileSync("src/legacy.js", "utf8").split(/\r?\n/);
const declared = new Map();
lines.forEach((line, i) => {
  const m = /^(?:let|const|var)\s+(.*)$/.exec(line);
  if (!m) return;
  let depth = 0, cur = "", parts = [];
  for (const ch of m[1]) {
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  parts.push(cur);
  for (const p of parts) {
    const n = /^\s*([A-Za-z_$][\w$]*)/.exec(p);
    if (n) declared.set(n[1], i + 1);
  }
});
console.log([...declared].map(([n, l]) => `${n}:${l}`).join("  "));
```

```js
// scratch/usage.mjs — how many bare call sites each name has
import { readFileSync } from "node:fs";
const code = readFileSync("src/legacy.js", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
  .replace(/`(?:\\.|[^`\\])*`/g, '""').replace(/"(?:\\.|[^"\\])*"/g, '""')
  .replace(/'(?:\\.|[^'\\])*'/g, '""');
const count = (name) => [...code.matchAll(new RegExp(`(?<![.\\w$])${name}(?![\\w$])`, "g"))]
  .filter((m) => !/^\s*:/.test(code.slice(m.index + name.length, m.index + name.length + 2))).length;
for (const n of process.argv.slice(2)) console.log(n, count(n));
```

- [ ] **Step 2: Make timers deterministic**

`legacy.js` schedules gameplay effects with `setTimeout` (KNOWN-3, 17 of
them). Real timers make a trace non-reproducible. Add a controllable
scheduler to `tests/support/domStubs.ts`:

```ts
/**
 * A deterministic setTimeout for trace runs: nothing fires on its own.
 * The caller drains due timers at a frame boundary, so a run replays
 * identically regardless of how fast the machine is. Returns a handle for
 * advancing and restoring.
 */
export function installFakeClock(): {
  advance(ms: number): void;
  restore(): void;
  pending(): number;
} {
  const real = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  let now = 0, seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  (globalThis as Record<string, unknown>).setTimeout = (fn: () => void, ms = 0) => {
    const id = ++seq;
    timers.set(id, { at: now + ms, fn });
    return id;
  };
  (globalThis as Record<string, unknown>).clearTimeout = (id: number) => { timers.delete(id); };
  return {
    advance(ms) {
      now += ms;
      // Re-scan after each callback: a timer may schedule another one.
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= now)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
        if (due.length === 0) break;
        const [id, t] = due[0];
        timers.delete(id);
        t.fn();
      }
    },
    restore() {
      (globalThis as Record<string, unknown>).setTimeout = real;
      (globalThis as Record<string, unknown>).clearTimeout = realClear;
    },
    pending: () => timers.size,
  };
}
```

- [ ] **Step 3: Write the trace harness**

`tests/integration/gameplayTrace.ts`. It reuses the boot sequence
`tests/integration/wiring.test.ts` already proved works — `installDomStubs()`,
`loadGameHtml()`, a captured `requestAnimationFrame`, a stubbed
`requestPointerLock`, then `import("../../src/legacy.js")` and a click on
NEW GAME.

```ts
import { installDomStubs, loadGameHtml, installFakeClock } from "../support/domStubs";
import { seedRandom } from "../support/seededRandom";

/** One scripted input event, delivered at the start of frame `frame`. */
export interface InputEvent { frame: number; type: string; init: Record<string, unknown>; target?: "window" | "document"; }

export interface TraceOptions {
  seed: number;
  frames: number;
  /** Fixed milliseconds per frame — never wall clock. */
  dtMs: number;
  input: InputEvent[];
  /** Frames to record. Recording every frame makes a 300KB fixture; every 10th is plenty. */
  every: number;
}

export interface TraceFrame {
  frame: number;
  /** x,y,z,rx,ry,rz,fov — rounded, because float noise is not the thing under test. */
  camera: number[];
  hud: Record<string, string>;
  /** Scene digest: child count plus each child's rounded position, so a moved enemy shows up. */
  scene: { count: number; digest: string };
}

const HUD_IDS = ["hp", "ar", "wname", "msg", "subt", "lvltitle", "bossname", "keys"];
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * The camera is the single best proxy for this whole plan: its position is
 * px/pyy/pz plus shake, its rotation is yaw/pitch plus recoil, and its fov
 * is zoomLerp. Six of the eleven groups being migrated are visible here,
 * and none of them by name — which is the point. The trace keeps working
 * when `px` becomes `player.px`.
 */
function readCamera(scene: { children: unknown[] }, camera: Record<string, any>): number[] {
  return [
    r6(camera.position.x), r6(camera.position.y), r6(camera.position.z),
    r6(camera.rotation.x), r6(camera.rotation.y), r6(camera.rotation.z),
    r6(camera.fov),
  ];
}

/** Every scene child's rounded position and visibility, joined — a moved, hidden or despawned entity all change it. */
function digestScene(scene: { children: Array<Record<string, any>> }): { count: number; digest: string } {
  const parts = scene.children.map((o) =>
    `${o.type}:${r6(o.position.x)},${r6(o.position.y)},${r6(o.position.z)}:${o.visible ? 1 : 0}`);
  return { count: scene.children.length, digest: parts.join("|") };
}

/** Every HUD element's text. Covers S — health, armour, weapon name, level title, messages. */
function readHud(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of HUD_IDS) out[id] = (document.getElementById(id)?.textContent ?? "").trim();
  return out;
}
```

Round every float to 6 decimal places before recording. The migration must
not perturb arithmetic at all, so 6 places is far stricter than needed while
staying immune to formatting-only float printing differences.

The run loop, which is the part that has to be exactly right:

```ts
export async function runTrace(o: TraceOptions): Promise<TraceFrame[]> {
  installDomStubs();
  loadGameHtml();
  const clock = installFakeClock();
  const raf: FrameRequestCallback[] = [];
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => raf.push(cb);
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};

  const restoreRandom = seedRandom(o.seed);
  try {
    await import("../../src/legacy.js");
    const newGame = [...document.querySelectorAll(".mbtn")]
      .find((b) => b.textContent?.includes("NEW GAME")) as HTMLElement;
    newGame.click();

    const out: TraceFrame[] = [];
    // The loop reads `t - last`; `last` was seeded from the real clock at
    // boot, so the first synthetic timestamp has to continue from there or
    // frame 1 gets a large negative dt. See wiring.test.ts, which hit this.
    const t0 = performance.now();
    for (let frame = 1; frame <= o.frames; frame++) {
      for (const ev of o.input.filter((e) => e.frame === frame)) {
        const target = ev.target === "document" ? document : window;
        target.dispatchEvent(buildEvent(ev));
      }
      raf[raf.length - 1](t0 + frame * o.dtMs);
      // Drain gameplay timers at the frame boundary, deterministically.
      clock.advance(o.dtMs);
      if (frame % o.every === 0) out.push(record(frame));
    }
    return out;
  } finally {
    restoreRandom();
    clock.restore();
  }
}
```

`readCamera` and `digestScene` need the live `camera` and `scene`, and both
are `legacy.js` internals with no export. Neither is reachable by import:
the camera is never added to the scene, so `getScene()` does not lead to
it.

Intercept the one call that already receives both. `legacy.js`'s loop ends
with `renderer.render(scene,camera)`, so patching three's prototype hands
the harness exactly what the frame rendered, with no source change and no
mock of any first-party module:

```ts
import * as THREE from "three";

/**
 * The loop's own `renderer.render(scene, camera)` is the only place both
 * objects are visible from outside legacy.js. Patching the prototype
 * captures them per frame without exporting anything, without mocking a
 * first-party module, and — because it records what was actually handed to
 * the renderer — without any chance of reading a stale copy.
 */
function captureRenderTargets(): { latest: () => { scene: any; camera: any } | null; restore: () => void } {
  const real = THREE.WebGLRenderer.prototype.render;
  let latest: { scene: any; camera: any } | null = null;
  THREE.WebGLRenderer.prototype.render = function (scene: any, camera: any) {
    latest = { scene, camera };
    // Deliberately NOT calling `real` — the WebGL stub cannot draw, and a
    // trace does not need pixels. This also makes the run much faster.
  } as typeof THREE.WebGLRenderer.prototype.render;
  return { latest: () => latest, restore: () => { THREE.WebGLRenderer.prototype.render = real; } };
}
```

Call `captureRenderTargets()` before importing `legacy.js`, and in the
per-frame recorder do:

```ts
const targets = capture.latest();
out.push({
  frame,
  camera: targets ? readCamera(targets.scene, targets.camera) : [],
  hud: readHud(),
  scene: targets ? digestScene(targets.scene) : { count: 0, digest: "" },
});
```

Assert in Step 5 that `targets` was non-null on every recorded frame — if
the loop stopped calling `render`, every trace row would be the same empty
placeholder and the test would pass forever.

- [ ] **Step 4: Write the characterization test**

`tests/integration/trace.test.ts` runs one trace and compares it to the
committed fixture. Drive real movement — a trace where the player stands
still exercises none of `px`/`pz`/`vx`/`vz`:

```ts
const INPUT: InputEvent[] = [
  { frame: 5,   type: "keydown", init: { code: "KeyW" } },
  { frame: 40,  type: "keydown", init: { code: "KeyD" } },
  { frame: 70,  type: "keyup",   init: { code: "KeyD" } },
  { frame: 90,  type: "mousedown", init: { button: 0 } },   // fire
  { frame: 96,  type: "mouseup",   init: { button: 0 } },
  { frame: 120, type: "mousedown", init: { button: 2 } },   // kick
  { frame: 150, type: "keydown", init: { code: "Space" } }, // jump
  { frame: 152, type: "keyup",   init: { code: "Space" } },
  { frame: 200, type: "keyup",   init: { code: "KeyW" } },
];
```

Mouse look needs pointer lock: dispatch `pointerlockchange` with
`document.pointerLockElement` set to the game canvas at frame 2, then
`mousemove` events with `movementX`/`movementY`, exactly as
`tests/behavior/input.test.ts` does.

- [ ] **Step 5: Generate the fixture, then prove the trace is not vacuous**

Run the test once with a `WRITE_TRACE=1` env guard that writes the fixture
instead of comparing. Then assert, in the test itself, that the trace
actually moved:

```ts
expect(trace.length).toBeGreaterThan(20);
expect(trace[0].camera).not.toEqual(trace.at(-1)!.camera);   // the player moved
expect(new Set(trace.map((f) => f.scene.digest)).size).toBeGreaterThan(5); // the world moved
```

A trace of a frozen game would compare equal forever and prove nothing.

- [ ] **Step 6: Prove it catches a migration-shaped mistake**

Temporarily swap `px` and `pz` in one movement formula in `legacy.js`, run
`npx vitest run tests/integration/trace.test.ts`, confirm FAIL, revert.
Then do the same with `vx`/`vz`. Record both in the task report. If either
passes, the trace's observables are too coarse — widen them before
continuing, because every task after this one depends on this net.

- [ ] **Step 7: Run the gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm run typecheck && npm test
git add tests/integration tests/support/domStubs.ts
git commit -m "test: add a deterministic gameplay trace oracle for Plan 0D"
```

---

### Task 2: Shake state — the pattern, on the smallest group

**Files:**
- Create: `src/fx/ShakeState.ts`
- Modify: `src/legacy.js` (delete line 58's declaration; 25 call sites)

**Interfaces:**
- Produces: `export const screenShake: { trauma: number; hitStop: number }`.
  Named `screenShake`, not `shake`, because `legacy.js` already has
  `function shake(a)` — and in a `checkJs:false` file TypeScript will not
  warn about the shadow, it will just silently break the call.

- [ ] **Step 1: Write the state module**

```ts
/**
 * Screen shake and hit-stop — the two values every impact in the game
 * writes to and the main loop reads back.
 *
 * A property on an exported object, not an exported `let`: an ES module's
 * `let` export is read-only to importers, so `trauma = ...` from
 * src/legacy.js would not compile. The object binding never changes; its
 * properties do. See the Plan 0D header for why this pattern replaces the
 * getter/setter pairs src/player/Input.ts used.
 *
 * The reference declares these as `let trauma=0,hitStop=0,zoomT=0;`
 * (reference/sonsurum.html line 911). `zoomT` is not carried over: it is
 * read nowhere in the reference or the port, so it is dead state, and
 * deleting a binding nothing reads cannot change behavior.
 */
export const screenShake = {
  /** 0..1, decays at 1.6/s; the camera offset is trauma². */
  trauma: 0,
  /** Seconds of hit-stop remaining; while positive the loop scales dt to 8%. */
  hitStop: 0,
};
```

- [ ] **Step 2: Run the trace test to confirm it still passes**

Run: `npx vitest run tests/integration/trace.test.ts`
Expected: PASS. Adding an unused module changes nothing.

- [ ] **Step 3: Rewrite the call sites**

Delete `zoomT` from line 58 and the whole declaration with it. The 12
lines that mention `trauma`/`hitStop` (58, 59, 234, 344, 453, 715, 779,
1101, 1104, 1313, 1314, 1610 — confirm by reading) become:

```js
function shake(a){screenShake.trauma=Math.min(1,screenShake.trauma+a);}
// ...
if(hitAny){bang(.12,.4,500);shake(.15);screenShake.hitStop=Math.max(screenShake.hitStop,.03);}
// ...
screenShake.trauma=Math.max(0,screenShake.trauma-dt*1.6);
const sh=screenShake.trauma*screenShake.trauma,t=performance.now();
// ...
if(screenShake.hitStop>0){screenShake.hitStop-=dt;dt*=.08;}
```

Beware `w.trauma` at line 162 — that is a *weapon stat*, a different thing
with the same name. It must not be rewritten. Verify afterwards:

```bash
grep -n "trauma\|hitStop\|zoomT" src/legacy.js
```

Every hit must be either `screenShake.` prefixed or `w.trauma`.

- [ ] **Step 4: Run the full gate**

Run: `npm run typecheck && npm test`
Expected: 349+ tests pass, trace test included. If the trace test fails, a
call site was rewritten wrong — read the diff it prints; it names the first
frame that diverged.

- [ ] **Step 5: Commit**

```bash
git add src/fx/ShakeState.ts src/legacy.js
git commit -m "refactor: move screen shake and hit-stop onto a state object"
```

---

### Task 3: The four small pools

Four independent one- and two-value groups, 38 call sites total. They are
grouped into one task because each is too small to be worth its own review
cycle, and they share one pattern with no interaction between them.

**Files:**
- Create: `src/save/SaveGame.ts`, `src/fx/Heads.ts`, `src/ui/PianoState.ts`, `src/fx/Projectiles.ts`
- Modify: `src/legacy.js` (5 + 6 + 12 + 15 call sites)

**Interfaces:**
- Produces:
  - `export const save: { maxLevel: number }`
  - `export const headPool: { heads: Array<Record<string, unknown>> }`
  - `export const pianoState: { keyEls: HTMLElement[]; noteHist: number[] }`
  - `export const projectiles: { nails: Array<Record<string, unknown>>; orbs: Array<Record<string, unknown>> }`

- [ ] **Step 1: Write the four modules**

```ts
// src/save/SaveGame.ts
/** The highest chapter the player has unlocked. Persisted nowhere yet — the reference keeps it in memory only, and Plan 0F owns adding real persistence. */
export const save = { maxLevel: 0 };
```

```ts
// src/fx/Heads.ts
/**
 * Severed heads — kickable physics props spawned by decapitations. Declared
 * on the same `let` line as `gibs` in the reference (line 1596), which is
 * why REF.particlesDecalsGibs's doc comment disclaims it: its logic lives
 * with damage/death, not with the particle system, so it gets its own file
 * rather than joining src/fx/Gibs.ts.
 */
export const headPool: { heads: Array<Record<string, unknown>> } = { heads: [] };
```

```ts
// src/ui/PianoState.ts
/** The playable piano's key elements and the rolling note history the RECITAL achievement checks. The piano's logic is Plan 0F; only its state moves here. */
export const pianoState: { keyEls: HTMLElement[]; noteHist: number[] } = { keyEls: [], noteHist: [] };
```

```ts
// src/fx/Projectiles.ts
/** In-flight projectiles: nails from the nail cannon, orbs from the soul reaper and the flesh chunks bosses throw. */
export const projectiles: { nails: Array<Record<string, unknown>>; orbs: Array<Record<string, unknown>> } = { nails: [], orbs: [] };
```

`Array<Record<string, unknown>>` is deliberate: these arrays hold ad-hoc
object literals whose shapes Plan 0E will type properly when the systems
that build them move. Inventing a `Nail` interface now would be a guess.

- [ ] **Step 2: Rewrite the call sites, one group at a time**

Do them in this order, running `npm test` between each: `maxLevel` (5),
`heads` (6), `keyEls`/`noteHist` (12), `nails`/`orbs` (15). Four small
green runs localise a mistake far better than one large red one.

`heads` is reset in `loadLevel` alongside the other pools
(`...orbs=[];heads=[];`) — that line becomes `headPool.heads=[]` and
`projectiles.nails=[];projectiles.orbs=[]`. Assigning a fresh `[]` to a
property is fine; that is exactly what a property can do and an exported
`let` cannot.

- [ ] **Step 3: Run the full gate**

Run: `npm run typecheck && npm test`
Expected: all pass, trace unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/save src/fx/Heads.ts src/ui/PianoState.ts src/fx/Projectiles.ts src/legacy.js
git commit -m "refactor: move save, heads, piano and projectile state onto state objects"
```

---

### Task 4: Ambience state

**Files:**
- Create: `src/world/AmbienceState.ts`
- Modify: `src/legacy.js` (20 call sites; declarations at 362 and 1426)

**Interfaces:**
- Produces: `export const ambienceState: { ambT: number; heartT: number; breathT: number; darkT: number; savedAmb: number | null }`.
  Named `ambienceState`, not `ambience`, for the same reason Task 2's object
  is `screenShake`: `legacy.js` already has `function ambience(dt)`.

- [ ] **Step 1: Write the module**

```ts
/**
 * Timers for the ambient audio bed and the vitals layer — the drone, the
 * heartbeat that speeds up at low health, the breathing, and the darkness
 * event's saved ambient level.
 *
 * `savedAmb` is null when no darkness event is running; the reference uses
 * a bare `null` initialiser and restores the stored value when the event
 * ends, so the nullable type is the honest one.
 */
export const ambienceState = {
  ambT: 0,
  heartT: 0,
  breathT: 0,
  darkT: 0,
  savedAmb: null as number | null,
};
```

Confirm each initialiser against `legacy.js` lines 362 and 1426 before
writing — if any of the five starts at something other than 0/null, copy
the reference's value, not this plan's guess.

- [ ] **Step 2: Rewrite the 20 call sites**

They cluster in `ambience(dt)` and `vitalsAudio(dt)` — the function keeps
its name, the state object is `ambienceState`.

- [ ] **Step 3: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/world/AmbienceState.ts src/legacy.js
git commit -m "refactor: move ambient and vitals timers onto a state object"
```

---

### Task 5: Game flags

**Files:**
- Create: `src/core/Game.ts`
- Modify: `src/legacy.js` (31 call sites; declarations at 43 and 1605)
- Modify: `src/legacy.js`'s `setInputHooks({...})` block
- Modify: `tests/integration/wiring.test.ts`

**Interfaces:**
- Produces: `export const game: { started: boolean; inputLock: boolean; pianoOpen: boolean; last: number }`

- [ ] **Step 1: Write the module**

```ts
/**
 * The three flags that gate almost every system, plus the main loop's
 * previous-frame timestamp.
 *
 * - `started` — false while the menu is up; the loop returns immediately.
 * - `inputLock` — true during a cinematic; mouse look and firing are off
 *   but the world keeps simulating.
 * - `pianoOpen` — true while the playable piano has focus; pauses the world.
 * - `last` — the timestamp the loop diffs against for dt.
 */
export const game = { started: false, inputLock: false, pianoOpen: false, last: 0 };
```

- [ ] **Step 2: Rewrite the call sites**

`started` (11), `inputLock` (9), `pianoOpen` (8), `last` (3). Three of
these are read by the input hooks:

```js
setInputHooks({
  isPianoOpen:()=>game.pianoOpen, isStarted:()=>game.started, isInputLocked:()=>game.inputLock,
  // ...unchanged
});
```

- [ ] **Step 3: Keep the wiring test honest**

`tests/integration/wiring.test.ts` asserts `isStarted()` is false before
NEW GAME and true after. That assertion still holds and must keep holding —
it is precisely the check that catches a hook rewired to the wrong flag
during this task. Run it explicitly and say so in the task report:

Run: `npx vitest run tests/integration/wiring.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 4: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/core/Game.ts src/legacy.js
git commit -m "refactor: move the started/inputLock/pianoOpen flags onto a state object"
```

---

### Task 6: Weapon runtime

**Files:**
- Create: `src/weapons/WeaponRuntime.ts`
- Modify: `src/legacy.js` (92 call sites; declarations at 105, 106, 201, 207)
- Modify: `src/legacy.js`'s `drawViewmodel` frame literal and `fxTick` call
- Modify: `tests/integration/wiring.test.ts`

**Interfaces:**
- Produces: `export const weaponRuntime` with fields
  `wstate: string`, `wtime: number`, `wCool: number`, `pending: number | null`,
  `reloadFlags: Record<string, boolean>`, `recoilPitch: number`,
  `kickAmt: number`, `kickRot: number`, `muzzle: number`, `zoomLerp: number`,
  `kickAnim: number`, `volleyHit: boolean`.

- [ ] **Step 1: Write the module**

```ts
/**
 * The weapon state machine's live values — everything that changes between
 * frames while a weapon is equipped, fired, reloaded or holstered. The
 * per-weapon *stats* are src/weapons/definitions.ts's WEAPON_STATS and do
 * not belong here; this is only the runtime.
 *
 * `volleyHit` is the one field with a story. The reference declares
 * `let volleyHit=false` at line 2041, AFTER fire() reads it at line 2012 —
 * legal only because same-scope `let` hoists to the top of the script.
 * Split across modules that would be a real ordering bug, so moving it here
 * removes the hazard rather than preserving it. Its observable behavior is
 * unchanged: it is written before every read at runtime.
 */
export const weaponRuntime = {
  wstate: "idle",
  wtime: 0,
  wCool: 0,
  pending: null as number | null,
  reloadFlags: {} as Record<string, boolean>,
  recoilPitch: 0,
  kickAmt: 0,
  kickRot: 0,
  muzzle: 0,
  zoomLerp: 0,
  kickAnim: 0,
  volleyHit: false,
};
```

Confirm every initialiser against lines 105-106 before writing.

- [ ] **Step 2: Rewrite the call sites in dependency order**

92 sites, and the biggest are `wstate` (21) and `wtime` (16). Do
`wstate`/`wtime` first and run `npm test`; they drive the state machine and
a mistake there fails loudly. Then the rest.

- [ ] **Step 3: Update the two seams**

The viewmodel frame literal and the `fxTick` call both read these:

```js
fxTick(dt,t,weaponRuntime.zoomLerp,
  ()=>drawKickBoot(weaponRuntime.kickAnim),
  (fdt,ft)=>drawViewmodel(fdt,ft,{
    started:game.started,dead:S.dead,pianoOpen:game.pianoOpen,zoomLerp:weaponRuntime.zoomLerp,
    cur:S.cur,vx,vz,sprintKey:!!(keys.ShiftLeft||keys.ShiftRight),bobT,
    wstate:weaponRuntime.wstate,wtime:weaponRuntime.wtime,
    equipT:EQUIP_T,unequipT:UNEQUIP_T,
    kickAmt:weaponRuntime.kickAmt,kickRot:weaponRuntime.kickRot,
    swayX:getSwayX(),swayY:getSwayY(),muzzle:weaponRuntime.muzzle,
  },WEAPONS));
```

And the `zoomLerp` input hook: `zoomLerp:()=>weaponRuntime.zoomLerp`.

- [ ] **Step 4: Run the wiring test explicitly**

Run: `npx vitest run tests/integration/wiring.test.ts`
Expected: PASS. It pins the frame's field set and `drawKickBoot(kickAnim)`
being non-zero after a kick — the exact things this step can break.

- [ ] **Step 5: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/weapons/WeaponRuntime.ts src/legacy.js
git commit -m "refactor: move the weapon state machine's runtime onto a state object"
```

---

### Task 7: Renderer state

**Files:**
- Create: `src/render/Renderer.ts`
- Modify: `src/legacy.js` (123 call sites; declaration at 48)
- Modify: `src/render/SceneRef.ts`

**Interfaces:**
- Produces: `export const renderState` with `scene`, `camera`, `renderer`,
  `lamp`, `lampCore`, `muzzleLight`, `boomLight`, `ambLight`, each typed from
  three and nullable until `loadLevel` builds them.

- [ ] **Step 1: Decide what happens to SceneRef**

`src/render/SceneRef.ts` already owns `scene` for the FX modules, through
`setScene()`/`getScene()`. After this task two modules would hold it. Do
**not** delete SceneRef — `src/fx/{Particles,Decals,Gibs}.ts` call
`getScene()` at their point of use and changing them is Plan 0E's job.
Instead make `renderState.scene` the single writer and have `loadLevel`
keep calling `setScene(renderState.scene)` exactly where it calls
`setScene(scene)` today. Record this in the module's doc comment: one
owner, one mirror, and SceneRef disappears in 0E.

- [ ] **Step 2: Write the module**

```ts
import type * as THREE from "three";

/**
 * The Three.js core objects. All eight are null until loadLevel() builds
 * them, except `camera` and `renderer`, which are constructed once at boot
 * and outlive every level — the reference builds them at module scope and
 * only ever rebuilds `scene`.
 *
 * `scene` is mirrored into src/render/SceneRef.ts by loadLevel because the
 * FX modules read it through that accessor. This module is the owner; the
 * mirror is a Plan 0C artifact and goes away in Plan 0E when the FX modules
 * take the scene as a parameter.
 */
export const renderState = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  lamp: null as THREE.PointLight | null,
  lampCore: null as THREE.PointLight | null,
  muzzleLight: null as THREE.PointLight | null,
  boomLight: null as THREE.PointLight | null,
  ambLight: null as THREE.AmbientLight | null,
};
```

- [ ] **Step 3: Rewrite the call sites**

`scene` alone is 54 sites, almost all `scene.add(...)`. Do `scene` first,
run `npm test`, then `camera` (20), then the six lights.

The pointer-lock hook reads `renderer.domElement`:
`canvas:()=>renderState.renderer.domElement`.

- [ ] **Step 4: Run the wiring test explicitly**

Run: `npx vitest run tests/integration/wiring.test.ts`
Expected: PASS. Its `canvas()` assertion compares against
`document.getElementById("game")` and catches a wrong element here.

- [ ] **Step 5: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/render/Renderer.ts src/render/SceneRef.ts src/legacy.js
git commit -m "refactor: move the Three.js core objects onto a state object"
```

---

### Task 8: World state

**Files:**
- Create: `src/world/WorldState.ts`
- Modify: `src/legacy.js` (126 call sites; declarations at 250, 269, 383)

**Interfaces:**
- Produces: `export const world` with `grid`, `GW`, `GH`, `heightMap`,
  `wallSegs`, `doors`, `enemies`, `props`, `items`, `torches`, `candles`,
  `exitPos`, `pianoPos`.

- [ ] **Step 1: Write the module**

```ts
/**
 * Everything loadLevel() builds and the systems read for the rest of the
 * level: the tile grid and its dimensions, the height map and wall
 * segments used by collision, and the live entity lists.
 *
 * The spec's inventory also assigns challenge/bossRef/poisonZones/rings/
 * strikes/cine/eventT/idleT to this owner. They are NOT here: Plan 0C
 * already moved them, or they are `const`. Confirm against the file before
 * adding anything to this list.
 *
 * Element types are deliberately loose. These arrays hold object literals
 * built inline by loadLevel and mutated by half a dozen systems; typing
 * them properly is Plan 0E's job, once the systems that own them have
 * moved and their real shapes are settled.
 */
export const world = {
  grid: [] as string[][],
  GW: 0,
  GH: 0,
  heightMap: null as number[][] | null,
  wallSegs: [] as Array<Record<string, unknown>>,
  doors: {} as Record<string, Record<string, unknown>>,
  enemies: [] as Array<Record<string, unknown>>,
  props: [] as Array<Record<string, unknown>>,
  items: [] as Array<Record<string, unknown>>,
  torches: [] as Array<Record<string, unknown>>,
  candles: [] as Array<Record<string, unknown>>,
  exitPos: null as Record<string, unknown> | null,
  pianoPos: null as Record<string, unknown> | null,
};
```

Confirm `grid`'s real element type by reading `src/world/levels/index.ts` —
if the level builders produce an array of strings rather than a 2D char
array, use that type instead. Do not guess.

- [ ] **Step 2: Rewrite the call sites in three passes**

Pass 1: `enemies` (19), `props` (14), `items` (8) — the entity lists.
Pass 2: `GW`/`GH` (22), `grid` (7), `heightMap` (7), `wallSegs` (9) — the
collision inputs, where a mistake shows up immediately in the trace test as
the player walking through a wall.
Pass 3: `doors` (7), `torches` (6), `candles` (4), `exitPos` (12),
`pianoPos` (11).

`npm test` after each pass.

- [ ] **Step 3: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/world/WorldState.ts src/legacy.js
git commit -m "refactor: move the level's grid and entity lists onto a state object"
```

---

### Task 9: Player state

The largest group: 178 call sites, `px` and `pz` alone accounting for 104.

**Files:**
- Create: `src/player/PlayerState.ts`
- Modify: `src/legacy.js` (178 call sites; declaration at 385)

**Interfaces:**
- Produces: `export const player` with `px`, `pz`, `vx`, `vy`, `vz`, `pyy`,
  `grounded`, `bobT`, `lastBobSin`, `spawnGuard`.

- [ ] **Step 1: Write the module**

```ts
/**
 * The player's position, velocity and gait.
 *
 * `px`/`pz` are the world position on the floor plane; `pyy` is eye height,
 * not feet — the reference's camera reads it directly. There is no `py`:
 * vertical position is `pyy` and vertical velocity is `vy`, an asymmetry
 * inherited from the reference and left alone.
 *
 * `bobT` and `lastBobSin` drive the walk bob and the footstep trigger;
 * `spawnGuard` is the brief invulnerability on level entry (2.0s, set by
 * loadLevel).
 */
export const player = {
  px: 0, pz: 0,
  vx: 0, vy: 0, vz: 0,
  pyy: 0,
  grounded: true,
  bobT: 0,
  lastBobSin: 0,
  spawnGuard: 0,
};
```

Confirm the initialisers against line 385.

- [ ] **Step 2: Rewrite `px` and `pz` first, alone**

104 of the 178 sites, and the highest-risk pair in the whole plan: they are
interchangeable in type and adjacent in almost every expression, so a
transposition compiles, runs, and produces a subtly wrong game. This is the
exact mistake Task 1 Step 6 proved the trace oracle catches.

Run `npx vitest run tests/integration/trace.test.ts` immediately after this
step, before touching anything else.

- [ ] **Step 3: Rewrite the remaining eight**

`pyy` (22), `grounded` (12), `vx` (11), `vz` (11), `vy` (6), `spawnGuard`
(5), `bobT` (4), `lastBobSin` (3). `vx`/`vz` carry the same transposition
risk as `px`/`pz`; run the trace test after them too.

- [ ] **Step 4: Update the viewmodel frame seam**

The frame literal passes `vx`, `vz` and `bobT`:

```js
cur:S.cur,vx:player.vx,vz:player.vz,
sprintKey:!!(keys.ShiftLeft||keys.ShiftRight),bobT:player.bobT,
```

- [ ] **Step 5: Run the wiring test and the gate, then commit**

```bash
npx vitest run tests/integration/wiring.test.ts
npm run typecheck && npm test
git add src/player/PlayerState.ts src/legacy.js
git commit -m "refactor: move player position, velocity and gait onto a state object"
```

---

### Task 10: `S` becomes a typed state object

**Files:**
- Create: `src/core/State.ts`
- Modify: `src/legacy.js` (the `const S={...}` at line 37 and every `S.` read)
- Modify: `tests/integration/wiring.test.ts` if it names `killsTotal`

**Interfaces:**
- Produces: `export const S: GameState`, and `export interface GameState`.

`S` is already an object, so no call site changes shape — this task is a
move plus a type plus one rename.

- [ ] **Step 1: Write the interface from the real initialiser**

Read `legacy.js` line 37 onward and transcribe every field. Do not invent
fields and do not omit any; the initialiser is the specification.

- [ ] **Step 2: Rename `killsTotal` to `enemiesTotal`**

`spawnEnemy` does `S.killsTotal=(S.killsTotal||0)+1` — it counts enemies
*spawned*, not killed, and feeds the end-of-level grade. The behavior is
right and the name lies. A rename with no behavior change is the only
cleanup Phase 0 allows, and the spec calls for this one specifically.

```bash
grep -n "killsTotal" src/legacy.js tests/
```

Every hit changes, including any in tests and in the level-end summary
string. Confirm the summary still reads the same on screen — the label text
is UI copy and must not change, only the property name behind it.

- [ ] **Step 3: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/core/State.ts src/legacy.js
git commit -m "refactor: move S into core/State.ts, typed, and rename killsTotal to enemiesTotal"
```

---

### Task 11: Unify Input.ts on the state-object pattern

Plan 0C gave `src/player/Input.ts` fourteen getter/setter functions. Every
other piece of state in the codebase now lives on an object. Two patterns
for the same job is the kind of thing that survives for years.

**Files:**
- Modify: `src/player/Input.ts` (delete 14 accessors, add one state object)
- Modify: `src/legacy.js` (the 15 accessor call sites from Plan 0C)
- Modify: `tests/behavior/input.test.ts`
- Modify: `tests/integration/wiring.test.ts` (the sentinel mock)

**Interfaces:**
- Produces: `export const input: { yaw: number; pitch: number; locked: boolean; swayX: number; swayY: number; firing: boolean; zoomOn: boolean }`.
  `keys` stays exactly as it is — a plain exported `const` object, already
  the right pattern.
- Removes: `getYaw setYaw getPitch setPitch getSwayX setSwayX getSwayY setSwayY isFiring setFiring isZoomOn setZoomOn isPointerLocked`.

- [ ] **Step 1: Rewrite the module's internals**

The event handlers currently close over module-private `let` bindings.
They become property writes:

```ts
export const input = {
  yaw: Math.PI, pitch: 0, locked: false,
  swayX: 0, swayY: 0, firing: false, zoomOn: false,
};

document.addEventListener("mousemove", e => {
  if (!hooks) return;
  if (!input.locked || hooks.isInputLocked()) return;
  const sens = .0022 * (1 - .68 * hooks.zoomLerp());
  input.yaw -= e.movementX * sens; input.pitch -= e.movementY * sens;
  input.pitch = clamp(input.pitch, -1.45, 1.45);
  input.swayX = clamp(input.swayX + e.movementX * .035, -10, 10);
  input.swayY = clamp(input.swayY + e.movementY * .035, -7, 7);
});
```

- [ ] **Step 2: Update `tests/behavior/input.test.ts`**

Its `moduleSide()` reads state through the accessors and resets it through
the setters. Both become property access. **The reference side does not
change at all** — it still evaluates `REF.input` and reads its own bare
globals, which is what keeps this a real comparison rather than the port
being compared to itself.

- [ ] **Step 3: Update the wiring test's sentinel mock**

`tests/integration/wiring.test.ts` mocks `getSwayX`/`getSwayY` to return
distinct sentinels. With properties, mock the object instead:

```ts
vi.mock("../../src/player/Input", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/player/Input")>();
  return {
    ...actual,
    setInputHooks: (h) => { captured.hooks = h; },
    input: { ...actual.input, swayX: SENTINEL.swayX, swayY: SENTINEL.swayY, yaw: SENTINEL.yaw, pitch: SENTINEL.pitch },
  };
});
```

Re-run the swap sabotage from KNOWN-9 (`swayX:input.swayY`) and confirm it
still fails. If the sentinels stopped working, this task silently destroyed
the only test that guards that seam.

- [ ] **Step 4: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/player/Input.ts src/legacy.js tests/behavior/input.test.ts tests/integration/wiring.test.ts
git commit -m "refactor: unify Input.ts on the state-object pattern"
```

---

### Task 12: Whole-branch review and merge

- [ ] **Step 1: Confirm the inventory is empty**

Re-run Task 1 Step 1's `globals.mjs`. Every name in this plan's starting
table must be gone from `legacy.js`'s top-level declarations. Anything left
is either an oversight or a `const` that was never in scope — say which, in
the task report.

- [ ] **Step 2: Sabotage the new seams**

For each state object, transpose two of its fields in one `legacy.js` call
site and confirm `npm test` fails. `player.px`/`player.pz` and
`world.GW`/`world.GH` are the two that matter most. Revert each.

- [ ] **Step 3: Verify in the served game**

`npm run dev`, load the prologue, walk, fire, kick, reload, switch weapons
with the number keys, open the piano if the level has one. The trace oracle
covers a scripted 200 frames; a human covers what the script does not.

- [ ] **Step 4: Update the docs and merge**

Update `docs/STATUS.md`: the 0D row to **merged**, the burn-down and test
counts to their real values, and the next action to Plan 0E. Record any new
findings in `docs/known-issues.md`.

---

## Definition of done for Plan 0D

- [ ] No mutable cross-module global remains declared in `src/legacy.js`
- [ ] Every state object is one file under 60 lines with a doc comment saying what it owns and why it is an object rather than accessors
- [ ] `src/player/Input.ts` has no getter/setter pairs left
- [ ] The gameplay trace oracle exists, is proven to fail on a `px`/`pz` transposition, and passes
- [ ] `npm run typecheck` clean; `npm test` passes; no import cycles; no `src/` file over 400 lines except `legacy.js`
- [ ] `npm run dev` plays identically to `reference/sonsurum.html`
- [ ] `docs/STATUS.md` and `docs/known-issues.md` reflect reality

## What comes next

**Plan 0E** — systems: renderer, level loader, weapons, enemies and AI,
player, interaction, projectiles, damage. Every one of them now has its
state already extracted, so 0E moves *functions* only. `src/render/SceneRef.ts`
disappears there, and the loose `Record<string, unknown>` element types in
`WorldState`/`Projectiles`/`Heads` get their real interfaces.
