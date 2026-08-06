# Phase 0B — Asset Generation and Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carve the procedural texture generator, the pixel-sprite baker with its sprite data, and the whole WebAudio layer out of `src/legacy.js` into modules — without changing a pixel or a sample.

**Architecture:** Same carve-and-import-back method that Plan 0A proved. Each task removes one slice from `src/legacy.js` and imports it back under its original name, so the game stays playable after every commit. Two things differ from 0A: this plan opens with a jsdom smoke test, because everything it moves runs at startup and an init-order mistake would otherwise only surface by hand; and the audio layer owns real mutable state, so it gets an explicit module API rather than bare exported bindings.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 2, jsdom, madge, three 0.128.0 (pinned).

## Global Constraints

Inherited from `docs/superpowers/specs/2026-08-05-phase0-modular-port-design.md` and carried forward from Plan 0A. Every task's requirements implicitly include this section.

- **No gameplay changes. No balance changes. No new features.** Existing bugs are preserved.
- **No art changes.** Not one drawing call, colour, palette entry, or sprite row may change. This plan moves the code that *generates* the art; the art itself must come out bit-identical.
- **No audio changes.** Not one frequency, duration, gain, filter setting, or envelope.
- **`reference/sonsurum.html` is never edited.** It is the golden behavioral reference.
- **Three.js is pinned to `0.128.0`.** Do not upgrade. That is Plan 0D.
- **No file in `src/` may exceed 400 lines**, except `src/legacy.js`. Hard gate, enforced by `npm test`.
- **No import cycles.** Hard gate, enforced by `madge --circular src/`.
- **Every task ends with a playable game.**
- **When a section is carved out of `src/legacy.js`, its banner comment goes with it.** Move the header's intent into the new module's doc comment; never leave a banner describing nothing.
- **Burn-down and test-count figures are estimates.** If your number differs, the plan is wrong — record the real one and move on. Never edit a source file to make a count match a document.
- **Extend `tests/fidelity.test.ts` for everything you move.** The reference is a golden master; the oracle is what makes "extracted verbatim" a CI property instead of a claim. A carve without an oracle entry is not finished.
- Anything tempting to fix that is out of scope goes in `docs/known-issues.md`.

## Starting state

`master`, commit `4d9d14f`. `src/legacy.js` is 3040 lines. 114 tests pass.

Line numbers below are **current `src/legacy.js` line numbers**, not reference line numbers — four blocks were already carved out in Plan 0A, so no fixed offset maps between the two files. Always confirm a range by reading its content before deleting it.

| Section | `legacy.js` lines | Destination |
|---|---|---|
| `makeTex`, `noiseFill`, `TEX`, `buildTextures` | 44–215 | `render/ProcTextures.ts` |
| `texFromPx` | 216–252 | `enemies/SpriteBaker.ts` |
| `PXDEF` | 253–613 | `enemies/pixels/*.ts` |
| `PX`, `buildSprites` | 614–643 | `enemies/SpriteBaker.ts` |
| `pickupTex`, `ITEMTEX`, `buildItemTex` | 644–663 | `render/ItemTextures.ts` |
| audio state + `audioInit` | 776–791 | `audio/AudioEngine.ts` |
| `blip`, `bang`, `click`, `boom` | 792–839 | `audio/Sfx.ts` |
| `noiseBuf`, `growl`, `gurgle`, `pain`, `deathCry`, `snarl` | 840–920 | `audio/Voice.ts` |
| `wetDoor` … `stopBossMusic` | 921–978 | `audio/Ambient.ts` |

`addSprite` and `addBlob` (664–668) stay — they touch the live `scene` and belong to Plan 0C.

---

### Task 1: A jsdom smoke test for `src/legacy.js`

The final review of Plan 0A asked for this before 0B, and it was right: `legacy.js` has zero automated coverage across 3040 lines, "the game runs" rests on manual browser checks, and the browser harness in this environment cannot reliably drive input or composite frames. Every remaining task in Plans 0B–0D moves code that runs during startup, where the failure mode is a `ReferenceError` at import time or a wrong initialization order — exactly what a smoke test catches for free.

**Files:**
- Create: `tests/support/domStubs.ts`
- Create: `tests/smoke.test.ts`
- Modify: `package.json` — add `jsdom` to devDependencies

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function installDomStubs(): void` — installs canvas 2D, WebGL, and AudioContext stubs onto the current jsdom global. Idempotent.
  - `export function loadGameHtml(): void` — parses `index.html` and installs its `<body>` markup into `document.body`, so every element id the game looks up exists.

- [ ] **Step 1: Install jsdom**

Run:
```bash
npm install -D jsdom
```

- [ ] **Step 2: Write the failing test**

`tests/smoke.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "./support/domStubs";

describe("legacy.js boot", () => {
  beforeAll(() => {
    installDomStubs();
    loadGameHtml();
  });

  it("imports without throwing", async () => {
    await expect(import("../src/legacy.js")).resolves.toBeDefined();
  });

  it("finds every element id it looks up", () => {
    // The game reads these by id at module scope or during boot. A missing id
    // is a null dereference at runtime, which no other test would catch.
    for (const id of ["game", "fx2d", "msg", "hud", "hp", "ar", "am", "wname", "cross"]) {
      expect(document.getElementById(id), `#${id} missing from index.html`).not.toBeNull();
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/smoke.test.ts
```
Expected: FAIL — cannot resolve `./support/domStubs`.

- [ ] **Step 4: Write `tests/support/domStubs.ts`**

The goal is the narrowest set of stubs that lets `legacy.js` reach the end of its module body. `legacy.js` creates canvases for textures, constructs a `THREE.WebGLRenderer`, and declares (but does not start) an `AudioContext`. jsdom provides no canvas contexts and no WebAudio.

```ts
import { readFileSync } from "node:fs";

/** A 2D context stub: every method the texture generators call, all no-ops. */
function make2dContext(): Record<string, unknown> {
  const noop = () => {};
  return {
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, globalAlpha: 1,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fill: noop, stroke: noop, clip: noop, save: noop, restore: noop,
    translate: noop, scale: noop, rotate: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, drawImage: noop,
  };
}

/**
 * Minimal WebGL context. Three.js r128 probes a long list of methods and
 * extensions during WebGLRenderer construction; a Proxy answering every
 * unknown property with a no-op function is far more robust than enumerating
 * them, and this stub exists only to let construction succeed.
 */
function makeGlContext(): unknown {
  const noop = () => {};
  const base: Record<string, unknown> = {
    getExtension: () => null,
    getParameter: () => 0,
    getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
    getContextAttributes: () => ({}),
    createTexture: () => ({}), createBuffer: () => ({}),
    createProgram: () => ({}), createShader: () => ({}),
    getProgramParameter: () => true, getShaderParameter: () => true,
    canvas: { width: 400, height: 300 },
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      return noop;
    },
  });
}

let installed = false;

/** Install canvas/WebGL/AudioContext stubs onto the jsdom globals. Idempotent. */
export function installDomStubs(): void {
  if (installed) return;
  installed = true;

  HTMLCanvasElement.prototype.getContext = function (kind: string) {
    if (kind === "2d") return make2dContext();
    return makeGlContext();
  } as typeof HTMLCanvasElement.prototype.getContext;

  // The game declares AudioContext support but only constructs one on
  // audioInit(), which boot does not call. A constructor stub is enough.
  (globalThis as Record<string, unknown>).AudioContext = class {
    destination = {};
    currentTime = 0;
    sampleRate = 44100;
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    createDelay() { return { delayTime: { value: 0 }, connect() {} }; }
    createBiquadFilter() { return { type: "", frequency: { value: 0 }, Q: { value: 0 }, connect() {} }; }
    createOscillator() { return { type: "", frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
    createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
  };

  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 0;
  (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};
}

/** Install index.html's body markup so every element id the game reads exists. */
export function loadGameHtml(): void {
  const html = readFileSync("index.html", "utf8");
  const body = html.slice(html.indexOf("<body>") + "<body>".length, html.indexOf("</body>"));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");
}
```

- [ ] **Step 5: Point Vitest at jsdom for this file**

`vitest.config.ts` currently sets `environment: "node"`. Keep that default and opt this one file in, so the pure data tests stay fast:

Add at the top of `tests/smoke.test.ts`, above the imports:
```ts
// @vitest-environment jsdom
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/smoke.test.ts
```
Expected: PASS, 2 tests.

If importing `legacy.js` throws, **read the error before adding stubs**. A genuine bug in the port is a finding worth reporting, not something to stub around. Only add a stub when the failure is clearly jsdom lacking a browser API.

- [ ] **Step 7: Run all gates**

Run:
```bash
npm run typecheck && npm test
```
Expected: PASS, around 116 tests.

- [ ] **Step 8: Commit**

```bash
git add tests/smoke.test.ts tests/support/domStubs.ts vitest.config.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
test: add a jsdom smoke test for legacy.js boot

legacy.js has had zero automated coverage across 3040 lines; "the game runs"
rested entirely on manual browser checks, which this environment cannot drive
reliably. Every remaining carve in Plans 0B-0D moves startup code, where the
failure mode is an import-time ReferenceError or a wrong init order.

Stubs canvas 2D, WebGL and AudioContext, installs index.html's body markup,
and asserts the module imports clean and every element id it reads exists.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extract the procedural texture generator

**Files:**
- Create: `src/render/ProcTextures.ts`
- Modify: `src/legacy.js` — remove lines 44–215, add import
- Modify: `tests/fidelity.test.ts` — add a texture-generation oracle entry

**Interfaces:**
- Consumes: `rnd`, `pick` from `src/utils/math`.
- Produces:
  - `export function makeTex(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w?: number, h?: number): THREE.CanvasTexture`
  - `export function noiseFill(g: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], vary: number, n: number): void`
  - `export const TEX: Record<string, THREE.CanvasTexture>`
  - `export function buildTextures(): void` — populates `TEX`. Called once at game start.

- [ ] **Step 1: Write the failing test**

`tests/render/ProcTextures.test.ts`:
```ts
// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { TEX, buildTextures } from "../../src/render/ProcTextures";

describe("buildTextures", () => {
  beforeAll(() => {
    installDomStubs();
    buildTextures();
  });

  it("produces every texture the game looks up by name", () => {
    // Every key read off TEX anywhere in the codebase. A missing one is a
    // material with an undefined map — an invisible or black surface.
    const expected = [
      "dungeonWall", "churchWall", "window", "dungeonFloor", "churchFloor",
      "ceil", "door", "doorLocked", "pillar", "wood", "barrel",
      "fleshWall", "fleshFloor", "fleshCeil", "fleshDoor",
      "hellWall", "hellFloor", "hellCeil", "stair",
    ];
    for (const key of expected) {
      expect(TEX[key], `TEX.${key} missing`).toBeDefined();
    }
  });

  it("gives every texture nearest-neighbour filtering and repeat wrapping", () => {
    // The pixelated look is art direction, not a default. Linear filtering
    // here would silently blur every surface in the game.
    for (const [key, tex] of Object.entries(TEX)) {
      expect(tex.magFilter, `${key} magFilter`).toBe(1003); // THREE.NearestFilter
      expect(tex.minFilter, `${key} minFilter`).toBe(1003);
      expect(tex.wrapS, `${key} wrapS`).toBe(1000);         // THREE.RepeatWrapping
      expect(tex.wrapT, `${key} wrapT`).toBe(1000);
    }
  });
});
```

If those numeric constants do not match this Three.js version, import `THREE` and compare against `THREE.NearestFilter` / `THREE.RepeatWrapping` instead. Prefer the named constants if the import works cleanly under jsdom.

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/render/ProcTextures.test.ts
```
Expected: FAIL — cannot resolve `../../src/render/ProcTextures`.

- [ ] **Step 3: Create `src/render/ProcTextures.ts`**

Copy `src/legacy.js` lines 44–215 verbatim. Add `import * as THREE from "three";` and `import { rnd, pick } from "../utils/math";` at the top, `export` on `makeTex`, `noiseFill`, `TEX` and `buildTextures`, and type annotations from the Interfaces block. The banner comment above the section moves into this file's doc comment.

**Change no drawing call, no colour, no numeric literal.** Every `fillRect`, every hex string, every loop bound is art direction.

```ts
import * as THREE from "three";
import { pick, rnd } from "../utils/math";

/**
 * Gothic textures, generated procedurally at startup — the project ships no
 * image files. Moved verbatim from the "TEXTURES (gothic, procedural)" section
 * of the reference.
 */
export function makeTex(
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 64,
  h = 64,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
```

Continue with `noiseFill`, `TEX`, and the whole of `buildTextures`, bodies copied exactly.

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/render/ProcTextures.test.ts
```
Expected: PASS, 2 tests.

- [ ] **Step 5: Carve the section out of `src/legacy.js`**

Delete lines 44–215 including the section banner, and add to the import block:

```js
import { TEX, buildTextures, makeTex, noiseFill } from "./render/ProcTextures";
```

Check whether `makeTex` and `noiseFill` are still called anywhere in `legacy.js`; if not, drop them from the import.

- [ ] **Step 6: Add the fidelity oracle entry**

Extend `tests/fidelity.test.ts` so the reference's own `buildTextures` runs in the `vm` sandbox alongside the module's, and the resulting `TEX` key sets are compared. Comparing rendered pixels is not possible under a stubbed canvas — compare the **set of keys** and each texture's filter and wrap settings, and assert the reference's `buildTextures` source text is byte-identical to the module's function bodies.

Follow the structure already in that file for reading a line range out of the reference.

- [ ] **Step 7: Verify the game still runs**

Run:
```bash
npm run dev
```
The game must render with all its textures. **This is a visual check that matters** — a broken texture extraction shows up as black or missing surfaces, which no test catches. Compare against `reference/sonsurum.html` opened in a second tab if you can.

If the browser pane cannot composite frames in your environment, say so plainly in your report and substitute: import the live-served module in the page, call `buildTextures()`, and dump each texture's canvas to a data URL to confirm non-empty, non-uniform output.

- [ ] **Step 8: Run all gates and commit**

```bash
npm run typecheck && npm test && npm run build
```

```bash
git add src/render/ProcTextures.ts src/legacy.js tests/render/ProcTextures.test.ts tests/fidelity.test.ts
git commit -m "$(cat <<'EOF'
refactor: extract the procedural texture generator

Moves makeTex, noiseFill, TEX and buildTextures into src/render/ProcTextures.ts
verbatim — every drawing call, colour and literal is art direction and none of
them changed.

Tests assert every texture key the game looks up exists and that all of them
keep nearest-neighbour filtering and repeat wrapping; linear filtering here
would silently blur every surface in the game.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extract the sprite baker and the pixel definitions

`PXDEF` is 361 lines of ASCII sprite data for 31 creatures. It splits into three files at **contiguous** boundaries so key order is preserved exactly — `buildSprites` iterates `for (const k in PXDEF)`, and while order does not affect behavior, preserving it keeps the diff honest.

**Files:**
- Create: `src/enemies/SpriteBaker.ts` — `texFromPx`, `PX`, `buildSprites`
- Create: `src/enemies/pixels/grunts.ts` — `z f g m t w s` (legacy.js 254–423)
- Create: `src/enemies/pixels/demons.ts` — `C A L j n` (424–509)
- Create: `src/enemies/pixels/bosses.ts` — `V V2 G G2 k q R y B E U Q Q2 Z Z2 N N2 H H2` (510–613)
- Create: `src/enemies/pixels/index.ts` — assembles `PXDEF`
- Modify: `src/legacy.js` — remove 216–643, add imports
- Modify: `tests/fidelity.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces:
  - `export interface PixelDef { head?: number; px: string[]; pal: Record<string, string>; atk?: string[]; die1?: string[]; die2?: string[] }`
  - `export const PXDEF: Record<string, PixelDef>` (from `pixels/index.ts`)
  - `export function texFromPx(px: string[], pal: Record<string, string>, opts?: TexOpts): THREE.CanvasTexture`
  - `export interface TexOpts { mirror?: boolean; blankTop?: number; masks?: number[][]; stumps?: boolean }`
  - `export interface BakedSprite {`
    `  a: THREE.CanvasTexture; b: THREE.CanvasTexture;`
    `  hl: THREE.CanvasTexture; hlb: THREE.CanvasTexture; head: number;`
    `  noHead: THREE.CanvasTexture | null; noHeadB: THREE.CanvasTexture | null;`
    `  noLArm: THREE.CanvasTexture; noLArmB: THREE.CanvasTexture;`
    `  noRArm: THREE.CanvasTexture; noRArmB: THREE.CanvasTexture;`
    `  noLegs: THREE.CanvasTexture; noLegsB: THREE.CanvasTexture;`
    `  gibbed: THREE.CanvasTexture; gibbedB: THREE.CanvasTexture;`
    `  atk: THREE.CanvasTexture | null;`
    `  die1: THREE.CanvasTexture | null; die2: THREE.CanvasTexture | null;`
    `  regions: { W: number; H: number; head: number; armTop: number; armBot: number };`
    `}`
    Derive the exact field list from what `buildSprites` actually assigns in `src/legacy.js` lines 614–643 — the shape above is what the reference builds, but confirm it rather than trusting this block.
  - `export const PX: Record<string, BakedSprite>`
  - `export function buildSprites(): void`

- [ ] **Step 1: Write the failing test**

`tests/enemies/SpriteBaker.test.ts`:
```ts
// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { PX, buildSprites } from "../../src/enemies/SpriteBaker";
import { PXDEF } from "../../src/enemies/pixels";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

describe("PXDEF", () => {
  it("defines sprite rows and a palette for every creature", () => {
    for (const [key, d] of Object.entries(PXDEF)) {
      expect(d.px.length, `${key} has no rows`).toBeGreaterThan(0);
      expect(Object.keys(d.pal).length, `${key} has no palette`).toBeGreaterThan(0);
    }
  });

  it("covers every enemy that can be spawned", () => {
    // spawnEnemy does PX[ch].a with no guard — a stat entry with no sprite
    // throws at spawn time, mid-level.
    for (const key of Object.keys(ENEMY_DEFS)) {
      expect(PXDEF[key], `ENEMY_DEFS.${key} has no sprite definition`).toBeDefined();
    }
  });

  it("uses only palette keys that the rows reference", () => {
    for (const [key, d] of Object.entries(PXDEF)) {
      const used = new Set<string>();
      for (const row of d.px) for (const ch of row) if (ch !== " ") used.add(ch);
      for (const ch of used) {
        expect(d.pal[ch], `${key}: row character '${ch}' has no palette entry`).toBeDefined();
      }
    }
  });
});

describe("buildSprites", () => {
  beforeAll(() => {
    installDomStubs();
    buildSprites();
  });

  it("bakes a walk pair and dismemberment frames for every creature", () => {
    for (const key of Object.keys(PXDEF)) {
      expect(PX[key].a, `${key}.a`).toBeDefined();
      expect(PX[key].b, `${key}.b`).toBeDefined();
      expect(PX[key].noLArm, `${key}.noLArm`).toBeDefined();
      expect(PX[key].noRArm, `${key}.noRArm`).toBeDefined();
      expect(PX[key].noLegs, `${key}.noLegs`).toBeDefined();
    }
  });

  it("bakes a headless frame only for creatures that declare a head", () => {
    for (const [key, d] of Object.entries(PXDEF)) {
      if (d.head && d.head > 0) expect(PX[key].noHead, `${key}.noHead`).not.toBeNull();
      else expect(PX[key].noHead, `${key}.noHead`).toBeNull();
    }
  });
});
```

The third `PXDEF` test may fail on real data — several sprites could reference a palette key that does not exist, which renders as a transparent hole. **If it fails, that is a finding: stop and report it.** Do not edit the sprite data; record it as a KNOWN issue and convert the assertion to a characterization test naming the offenders, in the KNOWN-1 pattern.

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/enemies/SpriteBaker.test.ts
```
Expected: FAIL — cannot resolve the new modules.

- [ ] **Step 3: Create the three pixel-definition files**

Split `src/legacy.js` lines 253–613 at the boundaries in the Files list, copying each range **verbatim**. Every row string, every palette hex, every trailing comment naming the creature is preserved. Each file exports a plain object; `pixels/index.ts` merges them:

```ts
import type { PixelDef } from "./types";
import { GRUNTS } from "./grunts";
import { DEMONS } from "./demons";
import { BOSSES } from "./bosses";

/**
 * Pixel-art sprite definitions, keyed by the grid character that spawns the
 * creature. Rows are ASCII; each character indexes into that creature's
 * palette. Split into three files purely for size — the ranges are contiguous
 * and key order matches the reference exactly.
 */
export const PXDEF: Record<string, PixelDef> = { ...GRUNTS, ...DEMONS, ...BOSSES };
export type { PixelDef };
```

Put `PixelDef` in `src/enemies/pixels/types.ts` so the three data files and `index.ts` can all import it without a cycle.

- [ ] **Step 4: Create `src/enemies/SpriteBaker.ts`**

Copy `legacy.js` lines 216–252 (`texFromPx`) and 614–643 (`PX`, `buildSprites`) verbatim. The dismemberment mask arithmetic in `buildSprites` — `armTop`, `armBot`, the region rectangles — must not be touched; it is what produces the severed-limb frames.

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/enemies/SpriteBaker.test.ts
```
Expected: PASS. Report the real count.

- [ ] **Step 6: Carve the sections out of `src/legacy.js`**

Delete lines 216–643 and add:

```js
import { PX, buildSprites, texFromPx } from "./enemies/SpriteBaker";
```

`texFromPx` is called by `buildItemTex`, which is still in `legacy.js` until Task 4 — keep it imported until then.

- [ ] **Step 7: Add the fidelity oracle entry**

Extend `tests/fidelity.test.ts` to deep-compare the module's `PXDEF` against the reference's, key for key, row for row, palette entry for palette entry. This is the single largest body of art in the project and the oracle is what guarantees it survived the move.

- [ ] **Step 8: Verify the game still runs**

Run:
```bash
npm run dev
```
Reach Level 1 and confirm enemies are visible and animate. Kill one and confirm the death frames and dismemberment still work — that exercises `noHead`/`noLArm`/`gibbed`, which is the part of this task most likely to break silently.

- [ ] **Step 9: Run all gates and commit**

```bash
npm run typecheck && npm test && npm run build
```

```bash
git add src/enemies/SpriteBaker.ts src/enemies/pixels src/legacy.js tests/enemies/SpriteBaker.test.ts tests/fidelity.test.ts
git commit -m "$(cat <<'EOF'
refactor: extract the sprite baker and pixel definitions

texFromPx and buildSprites move to src/enemies/SpriteBaker.ts; PXDEF's 361
lines of ASCII sprite data split into three contiguous files under
src/enemies/pixels/, preserving key order exactly.

Tests assert every spawnable enemy has a sprite (spawnEnemy does PX[ch].a with
no guard), that every row character has a palette entry, and that the
dismemberment frames bake for all of them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Extract the item textures

**Files:**
- Create: `src/render/ItemTextures.ts`
- Modify: `src/legacy.js` — remove lines 644–663, add import
- Modify: `tests/fidelity.test.ts`

**Interfaces:**
- Consumes: `texFromPx` from `src/enemies/SpriteBaker`.
- Produces:
  - `export const ITEMTEX: Record<string, THREE.CanvasTexture | THREE.CanvasTexture[]>`
  - `export function buildItemTex(): void`

Note `ITEMTEX.torch` is an **array** of two frames (the flicker animation), while every other entry is a single texture. Preserve that shape.

- [ ] **Step 1: Write the failing test**

`tests/render/ItemTextures.test.ts`:
```ts
// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { ITEMTEX, buildItemTex } from "../../src/render/ItemTextures";

describe("buildItemTex", () => {
  beforeAll(() => {
    installDomStubs();
    buildItemTex();
  });

  it("produces a texture for every pickup kind the game can drop", () => {
    // These strings come from loadLevel's map2 table and dropAmmo. A missing
    // one is an invisible pickup the player can never find.
    for (const kind of ["health", "bullets", "shells", "slugs", "crosses", "armor", "key", "gun"]) {
      expect(ITEMTEX[kind], `ITEMTEX.${kind} missing`).toBeDefined();
    }
  });

  it("gives the torch two frames and the candle one", () => {
    expect(Array.isArray(ITEMTEX.torch)).toBe(true);
    expect((ITEMTEX.torch as unknown[]).length).toBe(2);
    expect(Array.isArray(ITEMTEX.candle)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/render/ItemTextures.test.ts
```
Expected: FAIL — cannot resolve `../../src/render/ItemTextures`.

- [ ] **Step 3: Create `src/render/ItemTextures.ts`**

Copy `legacy.js` lines 644–663 verbatim. Every pixel row and hex is art.

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/render/ItemTextures.test.ts
```
Expected: PASS, 2 tests.

- [ ] **Step 5: Carve the section out and add the oracle entry**

Delete lines 644–663 from `legacy.js`, add `import { ITEMTEX, buildItemTex } from "./render/ItemTextures";`, and drop `texFromPx` from the SpriteBaker import if nothing else in `legacy.js` calls it. Extend `tests/fidelity.test.ts` to compare the pixel row data against the reference.

- [ ] **Step 6: Verify, gate, and commit**

Run the game, confirm pickups and torches render and torches still flicker. Then:

```bash
npm run typecheck && npm test && npm run build
```

```bash
git add src/render/ItemTextures.ts src/legacy.js tests/render/ItemTextures.test.ts tests/fidelity.test.ts
git commit -m "$(cat <<'EOF'
refactor: extract item and pickup textures

Preserves ITEMTEX.torch's two-frame array shape, which differs from every
other entry and drives the torch flicker.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Extract the audio engine and sound effects

This is the first module in the port that owns **live mutable state**. `AC`, `masterG`, `echoG` and `masterVol` are assigned after construction and read from several places, including the settings slider. Bare exported bindings cannot work — the module owns the state and exposes functions.

**Files:**
- Create: `src/audio/AudioEngine.ts`
- Create: `src/audio/Sfx.ts`
- Modify: `src/legacy.js` — remove lines 776–839, add imports, rewire the volume slider
- Modify: `tests/fidelity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `AudioEngine.ts`:
  - `export function audioInit(): void` — builds the graph and starts the drone oscillators. Called once on game start.
  - `export function isReady(): boolean` — false before `audioInit`.
  - `export function ctx(): AudioContext | null`
  - `export function masterBus(): GainNode | null`
  - `export function echoBus(): GainNode | null`
  - `export function getMasterVolume(): number`
  - `export function setMasterVolume(v: number): void` — sets the stored value and, if the graph exists, `masterG.gain.value`.
- Produces, from `Sfx.ts`: `blip`, `bang`, `click`, `boom` with the reference's exact signatures.

Every function must keep its `if (!AC) return;` early exit — the game calls sound functions before `audioInit` in some paths and relies on them being no-ops.

- [ ] **Step 1: Write the failing test**

`tests/audio/AudioEngine.test.ts`:
```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { audioInit, getMasterVolume, isReady, setMasterVolume } from "../../src/audio/AudioEngine";
import { bang, blip, boom, click } from "../../src/audio/Sfx";

describe("AudioEngine", () => {
  beforeEach(() => installDomStubs());

  it("starts at the reference's default volume", () => {
    expect(getMasterVolume()).toBe(0.5);
  });

  it("stores volume changes made before the graph exists", () => {
    setMasterVolume(0.25);
    expect(getMasterVolume()).toBe(0.25);
    setMasterVolume(0.5);
  });

  it("reports ready only after audioInit", () => {
    audioInit();
    expect(isReady()).toBe(true);
  });
});

describe("Sfx before audioInit", () => {
  it("every sound function is a silent no-op, never a throw", () => {
    // The game calls these on paths that can run before the user has
    // interacted, and relies on them doing nothing rather than crashing.
    expect(() => blip(440, 0.1, "sine", 0.2)).not.toThrow();
    expect(() => bang(0.1, 0.3, 1000)).not.toThrow();
    expect(() => click(0.2)).not.toThrow();
    expect(() => boom(1)).not.toThrow();
  });
});
```

The two describes must not share an `AudioContext` — the second relies on the engine being uninitialized. If Vitest's module caching makes that awkward, split them into two files rather than weakening the assertion.

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/audio
```
Expected: FAIL — cannot resolve the new modules.

- [ ] **Step 3: Create `src/audio/AudioEngine.ts`**

The graph construction in `audioInit` — the delay/feedback echo loop, the lowpass, and the four detuned drone oscillators with their LFOs — is copied **verbatim from `legacy.js` lines 777–791**. Those four oscillators are the game's ambient bed; their frequencies, types, gains and LFO rates are sound design.

```ts
let AC: AudioContext | null = null;
let masterG: GainNode | null = null;
let echoG: GainNode | null = null;
let masterVol = 0.5;

export function ctx(): AudioContext | null { return AC; }
export function masterBus(): GainNode | null { return masterG; }
export function echoBus(): GainNode | null { return echoG; }
export function isReady(): boolean { return AC !== null; }
export function getMasterVolume(): number { return masterVol; }

export function setMasterVolume(v: number): void {
  masterVol = v;
  if (masterG) masterG.gain.value = masterVol;
}

/** Build the audio graph and start the ambient drone bed. Call once. */
export function audioInit(): void {
  // body copied verbatim from legacy.js lines 777-791
}
```

- [ ] **Step 4: Create `src/audio/Sfx.ts`**

Copy `legacy.js` lines 792–839 (`blip`, `bang`, `click`, `boom`) verbatim, replacing bare `AC`/`masterG`/`echoG` references with calls to the engine's accessors. Keep every frequency, duration, gain and filter setting exactly.

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/audio
```
Expected: PASS.

- [ ] **Step 6: Carve the sections out of `src/legacy.js`**

Delete lines 776–839 and add:

```js
import { audioInit, ctx, echoBus, getMasterVolume, isReady, masterBus, setMasterVolume } from "./audio/AudioEngine";
import { bang, blip, boom, click } from "./audio/Sfx";
```

Then rewire the volume slider (currently around line 3013), which reads and writes `masterVol` and `masterG` directly:

```js
sl.value = Math.round(getMasterVolume() * 100);
vv.textContent = sl.value;
sl.addEventListener("input", () => {
  setMasterVolume(sl.value / 100);
  vv.textContent = sl.value;
});
```

`Voice` and `Ambient` are still in `legacy.js` until Task 6 and reference `AC`, `masterG` and `echoG` directly. Give them the accessors too — a local `const AC = ctx()` at the top of each function will not work, because the graph does not exist until `audioInit` runs. Call the accessor inside each function.

- [ ] **Step 7: Verify the game still runs — audio specifically**

Start the game, fire the pistol, fire the shotgun, and confirm the sounds are unchanged. Then move the volume slider in Settings and confirm it still takes effect. **The slider is the specific thing this task is most likely to break.** If your environment cannot produce audible sound, say so plainly and instead assert in the browser console that `getMasterVolume()` tracks the slider and that `masterBus().gain.value` follows it.

- [ ] **Step 8: Run all gates and commit**

```bash
npm run typecheck && npm test && npm run build
```

```bash
git add src/audio src/legacy.js tests/audio tests/fidelity.test.ts
git commit -m "$(cat <<'EOF'
refactor: extract the audio engine and sound effects

First module in the port owning live mutable state: AC, masterG, echoG and
masterVol are assigned after construction and read from several places, so the
module owns them and exposes accessors instead of bare bindings. The settings
volume slider is rewired onto setMasterVolume.

Every sound function keeps its `if (!AC) return` early exit — the game calls
them on paths that run before audioInit and relies on them being no-ops.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Extract the monster voices and ambient audio

The last carve in this plan. `growl`, `gurgle`, `pain`, `deathCry` and `snarl` are the guttural monster voices — filtered noise plus detuned oscillators through a formant bandpass. `docs/direction.md` names them as one of the five things worth preserving from the original, so they move with particular care.

**Files:**
- Create: `src/audio/Voice.ts` — `noiseBuf`, `growl`, `gurgle`, `pain`, `deathCry`, `snarl`
- Create: `src/audio/Ambient.ts` — `wetDoor`, `stoneDoor`, `bellToll`, `organChord`, `pianoNote`, `startBossMusic`, `stopBossMusic`
- Modify: `src/legacy.js` — remove lines 840–978, add imports
- Modify: `tests/fidelity.test.ts`

**Interfaces:**
- Consumes: `ctx`, `masterBus`, `echoBus` from `AudioEngine`; `bang`, `blip` from `Sfx`.
- Produces: each function with the reference's exact signature. `startBossMusic` and `stopBossMusic` share a module-level `bossPulse` interval handle, which `Ambient.ts` owns.

- [ ] **Step 1: Write the failing test**

`tests/audio/Voice.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { deathCry, growl, gurgle, pain, snarl } from "../../src/audio/Voice";
import { bellToll, organChord, pianoNote, startBossMusic, stopBossMusic, stoneDoor, wetDoor } from "../../src/audio/Ambient";

describe("audio functions before audioInit", () => {
  it("are all silent no-ops rather than throwing", () => {
    expect(() => growl(60, 1, 0.5, true)).not.toThrow();
    expect(() => gurgle(0.2, 0.3)).not.toThrow();
    expect(() => pain(120, 0.4)).not.toThrow();
    expect(() => deathCry(80)).not.toThrow();
    expect(() => snarl("z")).not.toThrow();
    expect(() => wetDoor()).not.toThrow();
    expect(() => stoneDoor()).not.toThrow();
    expect(() => bellToll()).not.toThrow();
    expect(() => organChord()).not.toThrow();
    expect(() => pianoNote(60)).not.toThrow();
  });
});

describe("boss music", () => {
  it("stopping without starting is safe, and starting twice does not stack", () => {
    // startBossMusic guards on bossPulse; without that guard a second boss
    // would layer a second interval and the pulse would double in tempo.
    expect(() => stopBossMusic()).not.toThrow();
    startBossMusic();
    startBossMusic();
    expect(() => stopBossMusic()).not.toThrow();
  });
});

describe("snarl", () => {
  it("accepts every enemy key without throwing", () => {
    for (const key of ["z", "f", "g", "m", "t", "w", "s", "C", "A", "L", "j", "n", "B", "E", "U", "Q"]) {
      expect(() => snarl(key)).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/audio/Voice.test.ts
```
Expected: FAIL — cannot resolve the new modules.

- [ ] **Step 3: Create `src/audio/Voice.ts` and `src/audio/Ambient.ts`**

Copy `legacy.js` lines 840–920 and 921–978 verbatim, swapping bare `AC`/`masterG`/`echoG` for the engine accessors called inside each function. **Every frequency, detune ratio, filter Q, envelope time and gain is sound design and must not change.** The section banner about guttural voices moves into `Voice.ts`'s doc comment.

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/audio/Voice.test.ts
```
Expected: PASS.

- [ ] **Step 5: Carve the sections out and add the oracle entry**

Delete lines 840–978 from `legacy.js` and add the imports. Extend `tests/fidelity.test.ts` to assert the moved function bodies are textually identical to the reference's, modulo the accessor substitution — document in a comment exactly which substitutions are expected, so the oracle stays honest rather than being loosened until it passes.

- [ ] **Step 6: Verify the game still runs — monster voices specifically**

Start the game, reach Level 1, and let an enemy notice you. Confirm the snarl, the pain sounds when you hit it, and the death cry. Trigger a boss and confirm the boss music pulse starts and stops. Same fallback rule as before: if you cannot hear audio, say so plainly and substitute structural evidence.

- [ ] **Step 7: Run all gates and commit**

```bash
npm run typecheck && npm test && npm run build
```

```bash
git add src/audio src/legacy.js tests/audio tests/fidelity.test.ts
git commit -m "$(cat <<'EOF'
refactor: extract monster voices and ambient audio

Voice.ts carries the guttural synthesis — filtered noise plus detuned
oscillators through a formant bandpass — which docs/direction.md names as one
of the five things worth preserving from the original. Every frequency,
detune ratio, filter Q and envelope time moved unchanged.

Ambient.ts owns the bossPulse interval handle shared by startBossMusic and
stopBossMusic; a test pins that starting twice does not stack a second
interval and double the tempo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Definition of done for Plan 0B

- [ ] `npm run dev` serves the game; textures, sprites and audio are indistinguishable from `reference/sonsurum.html`
- [ ] `npm run build` produces a working `dist/`
- [ ] `npm run typecheck` is clean
- [ ] `npm test` passes, including the jsdom smoke test and every new oracle entry
- [ ] `src/legacy.js` is down from 3040 to roughly 2280 lines
- [ ] No `src/` file over 400 lines except `legacy.js`; no import cycles

## What comes next

- **Plan 0C** — FX, the global-to-state migration, systems, UI, the loop (spec §6 steps 6–10). The largest and riskiest of the four.
- **Plan 0D** — kill gameplay `setTimeout`, dispose registry, `strict: true`, the Three.js upgrade (spec §6 steps 11–14).
