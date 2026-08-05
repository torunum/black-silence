# Phase 0A — Scaffold and Level Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Vite + TypeScript build that runs the existing game offline, then extract the pure data layers (math helpers, monologue, level builder, level tables, weapon stats, enemy stats) out of the monolith with tests proving every level is completable.

**Architecture:** The entire 3700-line script body moves verbatim into `src/legacy.js` as a single ES module that imports Three.js from npm instead of a CDN. Nothing is rewritten. Each subsequent task *carves a slice out* of `legacy.js` into a focused module and imports it back, so the game stays playable after every single commit. `legacy.js` is exempt from the 400-line file gate and its shrinking line count is printed by the test run as a burn-down metric — when it reaches zero, the port is done.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 2, madge, three 0.128.0 (pinned — see Global Constraints).

## Global Constraints

Copied verbatim from `docs/superpowers/specs/2026-08-05-phase0-modular-port-design.md`. Every task's requirements implicitly include this section.

- **No gameplay changes. No balance changes. No new features.** Existing bugs are preserved unless a bug physically blocks the port.
- **No art changes.** No new textures, sprites, sounds, or music.
- **No level design changes.**
- **No performance optimization.**
- **`reference/sonsurum.html` is never edited.** It is the golden behavioral reference.
- **Three.js is pinned to `0.128.0`.** Do not upgrade in this plan. The modern release renames `outputEncoding`→`outputColorSpace` and `sRGBEncoding`→`SRGBColorSpace` and changes colour-management defaults, which would shift every colour in the game. The upgrade is a separate, isolated task in Plan 0D.
- **No file in `src/` may exceed 400 lines**, except `src/legacy.js`. Hard gate, enforced by `npm test`.
- **No import cycles.** Hard gate, enforced by `madge --circular src/` in `npm test`.
- **Every task ends with a playable game.** If the game does not run after a task, the task is not done.
- Anything tempting to fix that is out of scope goes in `docs/known-issues.md`, not in the code.

---

### Task 1: Scaffold the build

Stands up Vite/TypeScript/Vitest, moves the reference's markup into `index.html`, moves the reference's script body into `src/legacy.js`, and swaps the CDN Three.js for an npm dependency so the game runs with no network.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/legacy.js`
- Create: `scripts/check-file-size.mjs`
- Create: `docs/known-issues.md`
- Create: `docs/assets.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/legacy.js` — an ES module containing the whole game, importing `* as THREE from "three"`. Later tasks remove code from it and import replacements back in. `npm test` runs Vitest, then the file-size gate, then the circular-import check.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "black-silence",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run && node scripts/check-file-size.mjs && madge --circular src/"
  },
  "dependencies": {
    "three": "0.128.0"
  },
  "devDependencies": {
    "@types/three": "^0.128.0",
    "madge": "^8.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
```
Expected: installs without error. If `@types/three@^0.128.0` cannot be resolved, run `npm view @types/three versions --json` and pick the highest `0.128.x`, then re-run.

- [ ] **Step 3: Create `tsconfig.json`**

`strict` is off on purpose — the ported code is untyped JavaScript. Plan 0D turns it on.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": false,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src", "tests", "scripts", "*.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts` and `vitest.config.ts`**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create `index.html` from the reference markup**

Copy `reference/sonsurum.html` lines 1–205 verbatim (everything from `<!DOCTYPE html>` down to and including the closing `</div>` of `#piano`… through `<div id="win">…</div>`). Then replace the two `<script>` tags at lines 206–207 and the closing tags with:

```html
<script type="module" src="/src/main.ts"></script>
</body>
</html>
```

The CDN `<script src="https://cdnjs.cloudflare.com/...three.min.js">` tag must be **deleted**, not commented out. Do not change any CSS, any element id, or any DOM structure — the game reads these ids by name and the HUD layout is part of the art direction.

- [ ] **Step 6: Create `src/legacy.js` from the reference script body**

Copy `reference/sonsurum.html` lines 208–3964 verbatim (the contents of the second `<script>` tag, from the `/* ===...` banner comment down to `requestAnimationFrame(loop);`). Prepend exactly one line:

```js
import * as THREE from "three";
```

Make no other edit. Do not reformat, do not rename, do not "clean up while you're in there".

- [ ] **Step 7: Create `src/main.ts`**

```ts
import "./legacy.js";
```

- [ ] **Step 8: Create `scripts/check-file-size.mjs`**

```js
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const LIMIT = 400;
const ROOT = "src";

/** Exempt while the port is in progress. Its line count is the burn-down metric. */
const EXEMPT = new Set(["src/legacy.js"]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name).split("\\").join("/");
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|js)$/.test(name)) out.push(p);
  }
  return out;
}

const lineCount = (p) => readFileSync(p, "utf8").split("\n").length;

const files = walk(ROOT);
const offenders = files.filter((p) => !EXEMPT.has(p) && lineCount(p) > LIMIT);

for (const p of EXEMPT) {
  if (existsSync(p)) console.log(`port burn-down: ${p} = ${lineCount(p)} lines remaining`);
}

if (offenders.length > 0) {
  console.error(`\nFiles over ${LIMIT} lines:`);
  for (const p of offenders) console.error(`  ${lineCount(p)}\t${p}`);
  process.exit(1);
}

console.log(`file-size gate OK — ${files.length} files checked, limit ${LIMIT}`);
```

- [ ] **Step 9: Create `docs/known-issues.md`**

This is the pressure valve. Everything tempting to fix mid-port lands here instead of in the code.

```markdown
# Known Issues

Problems found during the port. Phase 0 preserves them deliberately — see the
non-goals in the Phase 0 spec. Each entry names the phase that owns the fix.

| ID | Issue | Owner |
|---|---|---|
| KNOWN-1 | Level 1 places a red key (`K`) and a Guardian miniboss guarding it, but the level contains no locked door (`D`) anywhere. The key is decorative. | Phase 4 — level rebuild |
| KNOWN-2 | `Context` is a service locator, used to make the mechanical port safe. Systems reach into each other through it instead of using `Events`. Each later phase migrates the systems it touches. | Phases 1–5 |
| KNOWN-3 | 17 non-gameplay `setTimeout` calls remain after Plan 0D. They must be cancelled on level unload. | Plan 0D |
```

- [ ] **Step 10: Create `docs/assets.md`**

```markdown
# Third-Party Assets

Per `docs/direction.md`, the world stays procedural; audio and typography use real
files. Every third-party asset ships with a row here. No row, no ship.

| Asset | Type | License | Source | Why chosen | Modifications |
|---|---|---|---|---|---|
| _(none yet — Phase 1 adds the first audio)_ | | | | | |
```

- [ ] **Step 11: Verify the game runs offline**

Run:
```bash
npm run dev
```
Then in the browser: open DevTools → Network → check "Offline" → reload the page.

Expected: the main menu renders, New Game starts the prologue, the player can move and shoot. Zero requests to `cdnjs.cloudflare.com`. Zero console errors.

If Three.js fails to resolve, confirm `src/legacy.js` line 1 is exactly `import * as THREE from "three";` and that no `THREE` global reference remains from the deleted CDN tag.

- [ ] **Step 12: Verify build and gates pass**

Run:
```bash
npm run build && npm run typecheck && npm test
```
Expected: `build` writes `dist/`; `typecheck` reports no errors; `test` prints `file-size gate OK` and a `port burn-down: src/legacy.js = <N> lines remaining` line where N is around 3759. Vitest will report "No test files found" — that is expected, Task 3 adds the first tests.

**Every burn-down figure in this plan is an estimate.** If the number you get differs, the number in the plan is wrong — record the real one and move on. Never edit a source file to make it match a figure in a document. A faithful extraction is the requirement; the line count is only a progress readout.

If Vitest exits non-zero on an empty suite, add `passWithNoTests: true` to `vitest.config.ts` under `test`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
build: Vite + TypeScript scaffold, game running offline

Moves the reference markup into index.html and the reference script body
verbatim into src/legacy.js as a single ES module. Three.js now comes from
npm pinned at 0.128.0 instead of the cdnjs CDN, so the game runs with no
network. No game code was changed.

Adds the file-size gate, which exempts src/legacy.js and prints its line
count as the port burn-down metric.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extract math helpers and monologue content

The smallest possible slice, taken first to prove the carve-and-import-back mechanic works before anything risky is touched.

**Files:**
- Create: `src/utils/math.ts`
- Create: `src/content/monologue.ts`
- Create: `tests/utils/math.test.ts`
- Modify: `src/legacy.js` — remove lines corresponding to reference 214–216 (`rnd`, `clamp`, `pick`) and 781–885 (the `M` object); add imports

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function rnd(a: number, b: number): number`
  - `export function clamp(v: number, a: number, b: number): number`
  - `export function pick<T>(a: readonly T[]): T`
  - `export const MONOLOGUE: Record<string, string[]>` — the reference's `M` object, unchanged.

- [ ] **Step 1: Write the failing test**

`tests/utils/math.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { clamp, pick, rnd } from "../../src/utils/math";

describe("clamp", () => {
  it("returns the value when it is inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below the low bound", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it("clamps above the high bound", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("rnd", () => {
  it("stays within the half-open range across many samples", () => {
    for (let i = 0; i < 500; i++) {
      const v = rnd(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe("pick", () => {
  it("always returns an element of the array", () => {
    const xs = ["a", "b", "c"] as const;
    for (let i = 0; i < 200; i++) expect(xs).toContain(pick(xs));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/utils/math.test.ts
```
Expected: FAIL — cannot resolve `../../src/utils/math`.

- [ ] **Step 3: Create `src/utils/math.ts`**

Bodies are copied verbatim from reference lines 214–216. Types added; behavior identical.

```ts
/** Random float in [a, b). */
export function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Constrain v to [a, b]. */
export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

/** A uniformly random element of a. */
export function pick<T>(a: readonly T[]): T {
  return a[(Math.random() * a.length) | 0];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/utils/math.test.ts
```
Expected: PASS, 5 tests.

- [ ] **Step 5: Create `src/content/monologue.ts`**

Copy reference lines 781–885 — the entire `const M={…};` object — into this file, renaming the binding and exporting it. Change nothing inside: every line of ADEM's dialogue is preserved character for character, including the typographic quotes.

```ts
/**
 * ADEM's monologue lines, keyed by trigger id.
 * Keys: lvl<N>, boss_<K>, boss_<K>2, boss_<K>3, see_<K>, and named events.
 * Copied verbatim from reference/sonsurum.html lines 781-885.
 */
export const MONOLOGUE: Record<string, string[]> = {
  lvl0: ["...I was in the ground. In the fire. And now I am climbing.",
    "Hell spat me back out. Rude. I was just getting comfortable.",
    "There's a stairway. Up is up. Up is better than this."],
  // ... continue verbatim through the final `dead:` entry
};
```

- [ ] **Step 6: Carve the code out of `src/legacy.js`**

Delete the three arrow-function consts `rnd`, `clamp`, `pick` (reference lines 214–216) and the whole `const M={…};` block (reference lines 781–885). Add these imports immediately after the `import * as THREE` line:

```js
import { clamp, pick, rnd } from "./utils/math";
import { MONOLOGUE as M } from "./content/monologue";
```

The `as M` alias means the ~40 existing `M.something` call sites need no edit. That is the point — an alias is a zero-risk change, a rename is not.

- [ ] **Step 7: Verify the game still plays**

Run:
```bash
npm run dev
```
In the browser: New Game → the prologue loads → after ~1.4 s ADEM's opening line appears in the subtitle area → move and fire. Zero console errors.

`say()` reading from `M` is the specific thing being verified here; if the subtitle never appears, the monologue import is wrong.

- [ ] **Step 8: Run all gates**

Run:
```bash
npm run typecheck && npm test
```
Expected: PASS. Burn-down should now read roughly `3650 lines remaining`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: extract math helpers and monologue from legacy blob

First carve-out, taken deliberately small to prove the extract-and-import-back
mechanic before touching anything stateful. MONOLOGUE is imported under the
alias M so none of the ~40 existing call sites change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extract the level builder and add grid analysis

Extracts the pure grid-carving DSL and adds the analysis primitives the connectivity tests need. The reference already marks these functions pure with `/*BUILDER-BEGIN*/` and `/*BUILDER-END*/` comments — the original author knew.

**Files:**
- Create: `src/world/LevelBuilder.ts`
- Create: `src/world/analysis.ts`
- Create: `tests/world/LevelBuilder.test.ts`
- Create: `tests/world/analysis.test.ts`
- Modify: `src/legacy.js` — remove reference lines 229–273 and 375; add import

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export type Grid = string[][]`
  - `export interface WallSeg { x1: number; z1: number; x2: number; z2: number }`
  - `export interface BuiltLevel { g: Grid; W: number; H: number; hmap?: number[][]; segs?: WallSeg[] }`
  - `export interface RoomLayout extends BuiltLevel { rw: number; rh: number; C: number; R: number }`
  - `export function emptyGrid(C: number, R: number, rw: number, rh: number): RoomLayout`
  - `export function blankGrid(W: number, H: number): { g: Grid; W: number; H: number }`
  - `export function link(L: RoomLayout, a: [number, number], b: [number, number], kind: "open" | "door" | "locked" | "secret"): void`
  - `export function put(L: RoomLayout, rc: number, rr: number, dx: number, dz: number, ch: string): void`
  - `export function putAbs(L: { g: Grid }, x: number, z: number, ch: string): void`
  - `export function put1(g: Grid, x: number, z: number, ch: string): void`
  - `export function carve(g: Grid, x0: number, z0: number, x1: number, z1: number, ch?: string): void`
  - `export function hall(g: Grid, x0: number, z0: number, x1: number, z1: number, wdt?: number): void`
  - `export function aperture(g: Grid, x: number, z: number, ch?: string): void`
  - `export function pillarsRing(g: Grid, x0: number, z0: number, x1: number, z1: number, step?: number): void`
  - `export function roomXZ(L: RoomLayout, rc: number, rr: number, dx: number, dz: number): { x: number; z: number }`
  - From `analysis.ts`: `findAll`, `isWalkable`, `isOpen`, `floodFill` (signatures in Step 5).

- [ ] **Step 1: Write the failing builder test**

`tests/world/LevelBuilder.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { blankGrid, carve, emptyGrid, hall, link, pillarsRing } from "../../src/world/LevelBuilder";

describe("blankGrid", () => {
  it("produces a solid grid of the requested size", () => {
    const { g, W, H } = blankGrid(5, 3);
    expect(W).toBe(5);
    expect(H).toBe(3);
    expect(g).toHaveLength(3);
    expect(g[0]).toHaveLength(5);
    expect(g.every((row) => row.every((c) => c === "#"))).toBe(true);
  });
});

describe("carve", () => {
  it("fills the rectangle with floor and leaves the rest solid", () => {
    const { g } = blankGrid(6, 6);
    carve(g, 1, 1, 3, 2);
    expect(g[1][1]).toBe(".");
    expect(g[2][3]).toBe(".");
    expect(g[0][0]).toBe("#");
    expect(g[3][3]).toBe("#");
  });

  it("accepts reversed coordinates", () => {
    const { g } = blankGrid(6, 6);
    carve(g, 3, 2, 1, 1);
    expect(g[1][1]).toBe(".");
    expect(g[2][3]).toBe(".");
  });

  it("writes a custom character when given one", () => {
    const { g } = blankGrid(4, 4);
    carve(g, 1, 1, 1, 1, "I");
    expect(g[1][1]).toBe("I");
  });
});

describe("hall", () => {
  it("carves an L-shaped corridor connecting both endpoints", () => {
    const { g } = blankGrid(10, 10);
    hall(g, 1, 1, 8, 8, 1);
    expect(g[1][1]).toBe(".");
    expect(g[8][8]).toBe(".");
  });
});

describe("emptyGrid", () => {
  it("sizes the grid from room count and room size", () => {
    const L = emptyGrid(2, 2, 3, 3);
    expect(L.W).toBe(2 * (3 + 1) + 1);
    expect(L.H).toBe(2 * (3 + 1) + 1);
  });

  it("leaves a solid wall between adjacent rooms", () => {
    const L = emptyGrid(2, 1, 3, 3);
    expect(L.g[1][4]).toBe("#");
  });
});

describe("link", () => {
  it("'open' removes the whole wall between two rooms", () => {
    const L = emptyGrid(2, 1, 3, 3);
    link(L, [0, 0], [1, 0], "open");
    for (let z = 1; z <= 3; z++) expect(L.g[z][4]).toBe(".");
  });

  it("'door' places a single + in the shared wall", () => {
    const L = emptyGrid(2, 1, 3, 3);
    link(L, [0, 0], [1, 0], "door");
    expect(L.g[1 + (3 >> 1)][4]).toBe("+");
  });

  it("'locked' places D and 'secret' places S", () => {
    const a = emptyGrid(2, 1, 3, 3);
    link(a, [0, 0], [1, 0], "locked");
    expect(a.g[1 + (3 >> 1)][4]).toBe("D");

    const b = emptyGrid(2, 1, 3, 3);
    link(b, [0, 0], [1, 0], "secret");
    expect(b.g[1 + (3 >> 1)][4]).toBe("S");
  });
});

describe("pillarsRing", () => {
  it("places pillars along the rectangle edges", () => {
    const { g } = blankGrid(12, 12);
    carve(g, 1, 1, 10, 10);
    pillarsRing(g, 2, 2, 8, 8, 3);
    expect(g[2][2]).toBe("I");
    expect(g[8][8]).toBe("I");
    expect(g[5][5]).toBe(".");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/world/LevelBuilder.test.ts
```
Expected: FAIL — cannot resolve `../../src/world/LevelBuilder`.

- [ ] **Step 3: Create `src/world/LevelBuilder.ts`**

Copy the function bodies verbatim from reference lines 229–273 plus `put1` from line 375. Add the type annotations from the Interfaces block above and an `export` on each. Change no logic.

```ts
export type Grid = string[][];

export interface WallSeg { x1: number; z1: number; x2: number; z2: number; }

/** What every buildX() function returns. Some carry a height map or wall segments. */
export interface BuiltLevel {
  g: Grid;
  W: number;
  H: number;
  hmap?: number[][];
  segs?: WallSeg[];
}

/** A BuiltLevel that also remembers its room lattice, so link()/put() can address rooms. */
export interface RoomLayout extends BuiltLevel {
  rw: number;
  rh: number;
  C: number;
  R: number;
}

/** A C×R lattice of rw×rh rooms separated by one-cell walls. */
export function emptyGrid(C: number, R: number, rw: number, rh: number): RoomLayout {
  const W = C * (rw + 1) + 1, H = R * (rh + 1) + 1;
  const g: Grid = Array.from({ length: H }, () => Array(W).fill("#"));
  for (let rr = 0; rr < R; rr++) for (let rc = 0; rc < C; rc++) {
    const x0 = rc * (rw + 1) + 1, z0 = rr * (rh + 1) + 1;
    for (let z = 0; z < rh; z++) for (let x = 0; x < rw; x++) g[z0 + z][x0 + x] = ".";
  }
  return { g, W, H, rw, rh, C, R };
}
```

Continue in the same style for `link`, `put`, `putAbs`, `blankGrid`, `carve`, `hall`, `aperture`, `pillarsRing`, `roomXZ`, `put1`, each body copied exactly from the reference lines given above.

- [ ] **Step 4: Run the builder test to verify it passes**

Run:
```bash
npx vitest run tests/world/LevelBuilder.test.ts
```
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the failing analysis test**

`tests/world/analysis.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { blankGrid, carve } from "../../src/world/LevelBuilder";
import { findAll, floodFill, isOpen, isWalkable } from "../../src/world/analysis";

describe("isWalkable", () => {
  it("treats walls, pillars and windows as solid", () => {
    for (const ch of ["#", "I", "W"]) expect(isWalkable(ch, true)).toBe(false);
  });
  it("treats floor, doors, secrets and content chars as passable", () => {
    for (const ch of [".", "+", "S", "P", "X", "K", "z", "h"]) {
      expect(isWalkable(ch, false)).toBe(true);
    }
  });
  it("gates locked doors on the throughLocked flag", () => {
    expect(isWalkable("D", false)).toBe(false);
    expect(isWalkable("D", true)).toBe(true);
  });
});

describe("findAll", () => {
  it("returns every coordinate holding the character", () => {
    const { g } = blankGrid(5, 5);
    g[1][1] = "K";
    g[3][4] = "K";
    expect(findAll(g, "K")).toEqual([{ x: 1, z: 1 }, { x: 4, z: 3 }]);
  });
  it("returns an empty array when the character is absent", () => {
    expect(findAll(blankGrid(4, 4).g, "K")).toEqual([]);
  });
});

describe("floodFill", () => {
  it("reaches every connected floor cell", () => {
    const { g } = blankGrid(6, 6);
    carve(g, 1, 1, 4, 4);
    const seen = floodFill(g, { x: 1, z: 1 }, false);
    expect(seen[4][4]).toBe(true);
    expect(seen[0][0]).toBe(false);
  });

  it("stops at a locked door when throughLocked is false", () => {
    const { g } = blankGrid(7, 3);
    carve(g, 1, 1, 5, 1);
    g[1][3] = "D";
    const seen = floodFill(g, { x: 1, z: 1 }, false);
    expect(seen[1][2]).toBe(true);
    expect(seen[1][4]).toBe(false);
  });

  it("passes the locked door when throughLocked is true", () => {
    const { g } = blankGrid(7, 3);
    carve(g, 1, 1, 5, 1);
    g[1][3] = "D";
    const seen = floodFill(g, { x: 1, z: 1 }, true);
    expect(seen[1][5]).toBe(true);
  });

  it("passes secret doors, which are never locked", () => {
    const { g } = blankGrid(7, 3);
    carve(g, 1, 1, 5, 1);
    g[1][3] = "S";
    expect(floodFill(g, { x: 1, z: 1 }, false)[1][5]).toBe(true);
  });
});

describe("isOpen", () => {
  it("is false outside the grid", () => {
    const { g } = blankGrid(4, 4);
    expect(isOpen(g, -1, 0)).toBe(false);
    expect(isOpen(g, 0, 99)).toBe(false);
  });
});
```

- [ ] **Step 6: Run the analysis test to verify it fails**

Run:
```bash
npx vitest run tests/world/analysis.test.ts
```
Expected: FAIL — cannot resolve `../../src/world/analysis`.

- [ ] **Step 7: Create `src/world/analysis.ts`**

New code — this has no counterpart in the reference. It exists only to make levels testable.

```ts
import type { Grid } from "./LevelBuilder";

export interface Cell { x: number; z: number; }

/** Characters the player can never walk through. Mirrors solidAt() in legacy.js. */
const SOLID = new Set(["#", "I", "W"]);

/** The red-key door. Passable only once the key is held. */
const LOCKED = "D";

/** True if ch can be walked through. Doors (+) and secrets (S) always can. */
export function isWalkable(ch: string | undefined, throughLocked: boolean): boolean {
  if (ch === undefined) return false;
  if (SOLID.has(ch)) return false;
  if (ch === LOCKED) return throughLocked;
  return true;
}

/** True if (x,z) is inside the grid and is not a solid wall. */
export function isOpen(g: Grid, x: number, z: number): boolean {
  const row = g[z];
  if (!row) return false;
  const ch = row[x];
  if (ch === undefined) return false;
  return !SOLID.has(ch);
}

/** Every cell holding ch, in row-major order. */
export function findAll(g: Grid, ch: string): Cell[] {
  const out: Cell[] = [];
  for (let z = 0; z < g.length; z++) {
    for (let x = 0; x < g[z].length; x++) {
      if (g[z][x] === ch) out.push({ x, z });
    }
  }
  return out;
}

/**
 * Four-way flood fill from `start`.
 * Returns a same-shaped boolean grid of reachable cells.
 */
export function floodFill(g: Grid, start: Cell, throughLocked: boolean): boolean[][] {
  const seen: boolean[][] = g.map((row) => row.map(() => false));
  if (!isWalkable(g[start.z]?.[start.x], throughLocked)) return seen;

  const stack: Cell[] = [start];
  seen[start.z][start.x] = true;

  while (stack.length > 0) {
    const { x, z } = stack.pop()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (!g[nz] || g[nz][nx] === undefined) continue;
      if (seen[nz][nx]) continue;
      if (!isWalkable(g[nz][nx], throughLocked)) continue;
      seen[nz][nx] = true;
      stack.push({ x: nx, z: nz });
    }
  }
  return seen;
}
```

- [ ] **Step 8: Run the analysis test to verify it passes**

Run:
```bash
npx vitest run tests/world/analysis.test.ts
```
Expected: PASS, 10 tests.

- [ ] **Step 9: Carve the builder out of `src/legacy.js`**

Delete reference lines 229–273 (`emptyGrid` through `roomXZ`, including the `/*BUILDER-BEGIN*/` marker comment) and line 375 (`put1`). Keep the `/*BUILDER-END*/` comment position irrelevant — delete it too. Add:

```js
import { aperture, blankGrid, carve, emptyGrid, hall, link, pillarsRing, put, put1, putAbs, roomXZ } from "./world/LevelBuilder";
```

The `buildLevelN()` functions stay in `legacy.js` for now — Task 4 moves them.

- [ ] **Step 10: Verify the game still plays**

Run:
```bash
npm run dev
```
In the browser: New Game → prologue loads with its staircase → reach the exit → **Level 1 loads and its rooms, doors and pillars are all present**. Level 1 is the level that exercises `carve`, `hall`, `pillarsRing` and `aperture` hardest, so it is the one that proves the extraction.

- [ ] **Step 11: Run all gates**

Run:
```bash
npm run typecheck && npm test
```
Expected: PASS, 26 tests (5 from Task 2, 11 builder, 10 analysis).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: extract level builder DSL, add grid analysis

Moves the pure grid-carving helpers out of the blob. The reference already
marked them pure with BUILDER-BEGIN/BUILDER-END comments.

Adds src/world/analysis.ts — flood fill and cell queries with no counterpart
in the reference. It exists so the next task can prove every level is
actually completable, which nothing validates today.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Extract the level tables and prove every level is completable

The highest-value task in this plan. Moves all eight level definitions into their own files and adds the connectivity suite that guards them.

**Files:**
- Create: `src/world/levels/prologue.ts`
- Create: `src/world/levels/level1.ts` … `src/world/levels/level7.ts`
- Create: `src/world/levels/index.ts`
- Create: `tests/world/levels.test.ts`
- Modify: `src/legacy.js` — remove reference lines 275–776; add import

**Interfaces:**
- Consumes: `BuiltLevel`, `Grid` and the carving helpers from `src/world/LevelBuilder.ts`; `findAll`, `floodFill`, `isOpen` from `src/world/analysis.ts` (both Task 3).
- Produces:
  ```ts
  export interface LevelDef {
    name: string;
    build: () => BuiltLevel;   // BuiltLevel is defined in LevelBuilder.ts, Task 3
    fog: number;
    fogD: number;
    amb: number;
    ambI: number;
    floor: string;
    sub: string;
    hell?: boolean;
    dungeon?: boolean;
    flesh?: boolean;
  }
  export const LEVELS: LevelDef[];
  ```

- [ ] **Step 1: Write the failing test**

`tests/world/levels.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels";
import { findAll, floodFill, isOpen } from "../../src/world/analysis";

const built = LEVELS.map((def) => ({ name: def.name, grid: def.build().g }));

it("builds every declared level", () => {
  expect(built).toHaveLength(8);
});

describe.each(built)("$name", ({ grid }) => {
  it("has exactly one player spawn", () => {
    expect(findAll(grid, "P")).toHaveLength(1);
  });

  it("has at least one exit", () => {
    expect(findAll(grid, "X").length).toBeGreaterThan(0);
  });

  it("every exit is reachable from the spawn", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, true);
    for (const exit of findAll(grid, "X")) {
      expect(seen[exit.z][exit.x], `exit at ${exit.x},${exit.z}`).toBe(true);
    }
  });

  it("every key is reachable without passing a locked door", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, false);
    for (const key of findAll(grid, "K")) {
      expect(seen[key.z][key.x], `key at ${key.x},${key.z}`).toBe(true);
    }
  });

  it("every locked door is reachable without passing another locked door", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, false);
    const doors = findAll(grid, "D");
    if (doors.length === 0) return;
    const anyReachable = doors.some(
      (d) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen[d.z + dz]?.[d.x + dx]),
    );
    expect(anyReachable).toBe(true);
  });

  it("every secret door has open floor on both sides", () => {
    for (const s of findAll(grid, "S")) {
      const horizontal = isOpen(grid, s.x - 1, s.z) && isOpen(grid, s.x + 1, s.z);
      const vertical = isOpen(grid, s.x, s.z - 1) && isOpen(grid, s.x, s.z + 1);
      expect(horizontal || vertical, `secret at ${s.x},${s.z} opens onto solid rock`).toBe(true);
    }
  });

  it("every enemy, item and prop stands on reachable floor", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, true);
    const structural = new Set([".", "#", "I", "W", "+", "D", "S", "P"]);
    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        const ch = grid[z][x];
        if (structural.has(ch)) continue;
        expect(seen[z][x], `'${ch}' stranded at ${x},${z}`).toBe(true);
      }
    }
  });
});

/**
 * Characterization test for KNOWN-1. Level 1 places a red key and a Guardian
 * miniboss guarding it, but contains no locked door at all — the key does
 * nothing. Phase 0 preserves the bug; this pins it so it cannot spread
 * unnoticed and fails loudly when Phase 4 fixes it.
 */
it("records levels that place a key with no locked door (KNOWN-1)", () => {
  const offenders = built
    .filter(({ grid }) => findAll(grid, "K").length > 0 && findAll(grid, "D").length === 0)
    .map(({ name }) => name);
  expect(offenders).toEqual(["LEVEL 1 — THE GOTHIC DUNGEON"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run tests/world/levels.test.ts
```
Expected: FAIL — cannot resolve `../../src/world/levels`.

- [ ] **Step 3: Create one level file per level**

One file each, function body copied verbatim from the reference at the line range below, with `export` added and the needed builder helpers imported.

| File | Reference lines | Exports |
|---|---|---|
| `src/world/levels/prologue.ts` | 275–313 | `buildPrologue` |
| `src/world/levels/level1.ts` | 314–374 | `buildLevel1` |
| `src/world/levels/level2.ts` | 376–434 | `buildLevel2` |
| `src/world/levels/level3.ts` | 437–518 | `buildLevel3` |
| `src/world/levels/level4.ts` | 520–578 | `buildLevel4` |
| `src/world/levels/level5.ts` | 579–639 | `buildLevel5` |
| `src/world/levels/level6.ts` | 640–700 | `buildLevel6` |
| `src/world/levels/level7.ts` | 701–758 | `buildLevel7` |

`src/world/levels/level1.ts` shows the pattern:

```ts
import { aperture, blankGrid, carve, hall, pillarsRing, put1 } from "../LevelBuilder";
import type { Grid } from "../LevelBuilder";

/**
 * Simple, flat, single-level layout. Asymmetric room shapes and sizes,
 * but ONE floor height everywhere.
 * Copied verbatim from reference/sonsurum.html lines 314-374.
 */
export function buildLevel1(): { g: Grid; W: number; H: number } {
  const W = 44, H = 36;
  const L = blankGrid(W, H);
  const g = L.g;

  // --- START CHAMBER (small, southwest) ---
  carve(g, 3, 28, 11, 33);
  g[31][5] = "P";
  put1(g, 6, 29, "i"); put1(g, 10, 29, "i"); put1(g, 4, 32, "a"); put1(g, 9, 32, "h");

  // ... continue verbatim to the end of the reference function

  return L;
}
```

`buildPrologue` returns `{ g, W, H, hmap }`; `buildLevel3` sets `L.hmap` before returning. Preserve both exactly.

- [ ] **Step 4: Create `src/world/levels/index.ts`**

`LEVELS` copied verbatim from reference lines 759–776, with the `LevelDef` type added.

```ts
import type { BuiltLevel } from "../LevelBuilder";
import { buildPrologue } from "./prologue";
import { buildLevel1 } from "./level1";
import { buildLevel2 } from "./level2";
import { buildLevel3 } from "./level3";
import { buildLevel4 } from "./level4";
import { buildLevel5 } from "./level5";
import { buildLevel6 } from "./level6";
import { buildLevel7 } from "./level7";

export interface LevelDef {
  name: string;
  build: () => BuiltLevel;
  /** Scene fog colour, hex. */
  fog: number;
  /** FogExp2 density. */
  fogD: number;
  /** Ambient light colour, hex. */
  amb: number;
  /** Ambient light intensity. */
  ambI: number;
  floor: string;
  sub: string;
  hell?: boolean;
  dungeon?: boolean;
  flesh?: boolean;
}

export const LEVELS: LevelDef[] = [
  { name: "PROLOGUE — OUT OF THE PIT", build: buildPrologue,
    fog: 0x180604, fogD: 0.07, amb: 0x6e2a14, ambI: 0.6, floor: "hell", sub: "hell", hell: true },
  // ... continue verbatim through LEVEL 7 — THE WOMB
];
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
npx vitest run tests/world/levels.test.ts
```
Expected: PASS, 58 tests (1 + 8 levels × 7 + 1).

If the "stranded content" test fails on a level, do **not** move the item. Record it in `docs/known-issues.md` as a new KNOWN-n, relax the assertion to a characterization test naming that level exactly as KNOWN-1 does, and let Phase 4 fix it. Moving an item is a level design change, which §1 forbids.

- [ ] **Step 6: Carve the levels out of `src/legacy.js`**

Delete reference lines 275–374, 376–434, 437–776 — every `buildX()` function and the `LEVELS` array. Add:

```js
import { LEVELS } from "./world/levels/index";
```

The builder helper import added in Task 3 stays: `legacy.js` no longer calls the helpers, but leaving an unused import is a lint concern, not a behavior one — remove any helper name that is now unreferenced.

- [ ] **Step 7: Verify the game still plays**

Run:
```bash
npm run dev
```
In the browser, verify **all eight levels load** via the chapter select menu, since the levels are now the thing most likely to have broken:

1. Main menu → SELECT CHAPTER → only the Prologue is unlocked
2. Start the prologue, walk to the exit → Level 1 loads
3. Quit and reload, chapter select now offers CH 1
4. In the browser console run `startGame(2)` through `startGame(7)` in turn; each must load with no error, with its own fog colour and floor texture

- [ ] **Step 8: Run all gates**

Run:
```bash
npm run typecheck && npm test
```
Expected: PASS, 84 tests (26 + 58). Burn-down should read roughly `3100 lines remaining`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: extract level tables, add connectivity test suite

Each level moves to its own file under src/world/levels/, and LEVELS becomes
a typed table.

Adds the connectivity suite: every level must have exactly one spawn, a
reachable exit, keys reachable without passing a locked door, secret doors
that open onto real floor, and no enemy or item stranded in solid rock.
Nothing validated any of this before, so an unfinishable level could have
shipped silently.

The suite immediately found KNOWN-1: Level 1 places a red key and a Guardian
miniboss guarding it, but has no locked door anywhere, so the key is
decorative. Preserved per the Phase 0 non-goals and pinned by a
characterization test.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Extract weapon and enemy stat tables

The last pure-data slice. `EDEF` is plain data and moves whole. The `WEAPONS` table is not pure — each entry carries a `snd` closure calling the audio layer — so the stats split from the sound functions, which stay in `legacy.js` until Plan 0B moves the audio.

**Files:**
- Create: `src/weapons/definitions.ts`
- Create: `src/enemies/EnemyDefs.ts`
- Create: `tests/weapons/definitions.test.ts`
- Create: `tests/enemies/EnemyDefs.test.ts`
- Modify: `src/legacy.js` — replace reference lines 1919–1944 with a merge; remove lines 2678–2716; add imports

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface WeaponStats {
    name: string;
    ammo: "bullets" | "shells" | "slugs" | "crosses" | "nails" | "souls";
    dmg: number; rate: number; pellets: number; spread: number;
    kind: "hit" | "cross" | "reap";
    magSize: number; reload: number; trauma: number; kick: number;
    pump?: boolean; pierce?: number;
  }
  export const WEAPON_STATS: WeaponStats[];   // length 8, slot order preserved

  export interface EnemyDef {
    hp: number; sp: number; mel: number; w: number; h: number; pain: number;
    name?: string; title?: string;
    range?: number; plate?: number; kbRes?: number; flyH?: number; orb?: string;
    boss?: boolean; fly?: boolean; fling?: boolean; dodge?: boolean; lunge?: boolean;
    toxic?: boolean; scream?: boolean; slam?: boolean; charge?: boolean;
    stone?: boolean; priest?: boolean; sovereign?: boolean; shield?: boolean;
    twin?: boolean; burst?: boolean; charger?: boolean; deathBoom?: boolean;
  }
  export const ENEMY_DEFS: Record<string, EnemyDef>;
  ```

- [ ] **Step 1: Write the failing tests**

`tests/weapons/definitions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { WEAPON_STATS } from "../../src/weapons/definitions";

describe("WEAPON_STATS", () => {
  it("has eight slots in the reference order", () => {
    expect(WEAPON_STATS.map((w) => w.name)).toEqual([
      "FLARE PISTOL",
      "SAWED-OFF SHOTGUN",
      "COMBAT RIFLE",
      "TOMMY GUN",
      "BMG SNIPER",
      "HOLY CROSS LAUNCHER",
      "NAIL CANNON",
      "SOUL REAPER",
    ]);
  });

  it("gives every weapon a positive magazine, rate and reload", () => {
    for (const w of WEAPON_STATS) {
      expect(w.magSize, w.name).toBeGreaterThan(0);
      expect(w.rate, w.name).toBeGreaterThan(0);
      expect(w.reload, w.name).toBeGreaterThan(0);
      expect(w.pellets, w.name).toBeGreaterThan(0);
    }
  });

  it("draws every ammo type from the player's pool", () => {
    const pools = new Set(["bullets", "shells", "slugs", "crosses", "nails", "souls"]);
    for (const w of WEAPON_STATS) expect(pools.has(w.ammo), w.name).toBe(true);
  });

  it("preserves the reference stats for the shotgun", () => {
    const shotgun = WEAPON_STATS[1];
    expect(shotgun.dmg).toBe(9);
    expect(shotgun.pellets).toBe(8);
    expect(shotgun.magSize).toBe(5);
    expect(shotgun.pump).toBe(true);
  });
});
```

`tests/enemies/EnemyDefs.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

describe("ENEMY_DEFS", () => {
  it("defines the full reference roster", () => {
    expect(Object.keys(ENEMY_DEFS)).toHaveLength(25);
  });

  it("gives every entry positive hp, speed, size and pain threshold", () => {
    for (const [key, d] of Object.entries(ENEMY_DEFS)) {
      expect(d.hp, key).toBeGreaterThan(0);
      expect(d.sp, key).toBeGreaterThan(0);
      expect(d.w, key).toBeGreaterThan(0);
      expect(d.h, key).toBeGreaterThan(0);
      expect(d.pain, key).toBeGreaterThan(0);
    }
  });

  it("gives every boss a name and a title for the boss bar", () => {
    for (const [key, d] of Object.entries(ENEMY_DEFS)) {
      if (!d.boss) continue;
      expect(d.name, key).toBeTruthy();
      expect(d.title, key).toBeTruthy();
    }
  });

  it("gives every flying enemy a hover height", () => {
    for (const [key, d] of Object.entries(ENEMY_DEFS)) {
      if (d.fly) expect(d.flyH, key).toBeGreaterThan(0);
    }
  });

  it("preserves the reference stats for the rotting ghoul", () => {
    expect(ENEMY_DEFS.z).toMatchObject({ hp: 50, sp: 2.4, mel: 12, pain: 170, fling: true });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npx vitest run tests/weapons tests/enemies
```
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Create `src/weapons/definitions.ts`**

Every field except `snd` is copied verbatim from reference lines 1919–1944, slot order unchanged. Slot order **is** gameplay: it is the 1–8 hotkey binding and the index into `S.mag` and `S.weapons`.

```ts
export interface WeaponStats {
  name: string;
  ammo: "bullets" | "shells" | "slugs" | "crosses" | "nails" | "souls";
  dmg: number;
  /** Seconds between shots. */
  rate: number;
  pellets: number;
  spread: number;
  kind: "hit" | "cross" | "reap";
  magSize: number;
  /** Seconds for a full reload. */
  reload: number;
  /** Screen-shake trauma added per shot. */
  trauma: number;
  /** Viewmodel kick, pixels. */
  kick: number;
  pump?: boolean;
  /** How many extra enemies a shot passes through. */
  pierce?: number;
}

/**
 * Slot order is gameplay: it is the 1-8 hotkey binding and the index into
 * S.mag and S.weapons. Do not reorder.
 * Copied from reference/sonsurum.html lines 1919-1944, minus the snd closures.
 */
export const WEAPON_STATS: WeaponStats[] = [
  { name: "FLARE PISTOL", ammo: "bullets", dmg: 34, rate: 0.42, pellets: 1, spread: 0.004,
    kind: "hit", magSize: 6, reload: 2.0, trauma: 0.15, kick: 14 },
  { name: "SAWED-OFF SHOTGUN", ammo: "shells", dmg: 9, rate: 0.85, pellets: 8, spread: 0.075,
    kind: "hit", magSize: 5, reload: 2.1, trauma: 0.42, kick: 26, pump: true },
  // ... continue verbatim through SOUL REAPER
];
```

- [ ] **Step 4: Create `src/enemies/EnemyDefs.ts`**

`EDEF` is pure data. Copy reference lines 2678–2716 whole, keeping the single-letter keys and the trailing comments naming each creature.

```ts
export interface EnemyDef {
  hp: number;
  /** Move speed, world units per second. */
  sp: number;
  /** Melee damage. */
  mel: number;
  /** Sprite width and height, world units. */
  w: number;
  h: number;
  /** Damage threshold that triggers a pain stagger. */
  pain: number;
  name?: string;
  title?: string;
  range?: number;
  /** Frontal armour that absorbs damage. */
  plate?: number;
  /** Knockback resistance, 0-1. */
  kbRes?: number;
  flyH?: number;
  orb?: string;
  boss?: boolean; fly?: boolean; fling?: boolean; dodge?: boolean; lunge?: boolean;
  toxic?: boolean; scream?: boolean; slam?: boolean; charge?: boolean;
  stone?: boolean; priest?: boolean; sovereign?: boolean; shield?: boolean;
  twin?: boolean; burst?: boolean; charger?: boolean; deathBoom?: boolean;
}

/**
 * Keyed by the level-grid character that spawns the enemy.
 * Copied verbatim from reference/sonsurum.html lines 2678-2716.
 */
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  z: { hp: 50, sp: 2.4, mel: 12, w: 1.0, h: 1.4, pain: 170, fling: true },
  f: { hp: 35, sp: 5.2, mel: 10, w: 0.9, h: 1.25, pain: 260, dodge: true },
  // ... continue verbatim through y (STONE GARGOYLE)
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:
```bash
npx vitest run tests/weapons tests/enemies
```
Expected: PASS, 9 tests.

If the roster-length test reports a number other than 25, count the keys in reference lines 2678–2716 and correct the expectation to the real number — the test must match the reference, not the other way round.

- [ ] **Step 6: Carve the tables out of `src/legacy.js`**

Delete `const EDEF={…};` (reference lines 2678–2716) and add to the import block:

```js
import { ENEMY_DEFS as EDEF } from "./enemies/EnemyDefs";
import { WEAPON_STATS } from "./weapons/definitions";
```

Replace `const WEAPONS=[…];` (reference lines 1919–1944) with the stats merged back onto their sound closures. The array literal below holds only the `snd` functions, in slot order, exactly as they appear in the reference:

```js
/* Sound closures stay here until Plan 0B extracts the audio layer. */
const WEAPON_SOUNDS = [
  () => { bang(.13,.42,2400); blip(180,.08,"square",.1,60,true); },
  () => { bang(.24,.65,1400); bang(.1,.3,500); },
  () => { bang(.07,.34,2600); blip(140,.05,"square",.06,70); },
  () => { bang(.055,.26,3000); },
  () => { bang(.3,.6,1900); blip(90,.3,"sawtooth",.12,40,true); },
  () => { blip(520,.3,"sine",.12,780,true); bang(.1,.2,800); },
  () => { bang(.04,.22,3200); blip(260,.04,"square",.05,120); },
  () => { blip(70,.5,"sawtooth",.16,360,true); bang(.28,.45,500); growl(90,.4,.3,true); },
];
const WEAPONS = WEAPON_STATS.map((w, i) => ({ ...w, snd: WEAPON_SOUNDS[i] }));
```

Every existing `WEAPONS[S.cur].dmg` and `w.snd()` call site keeps working unchanged.

- [ ] **Step 7: Verify the game still plays**

Run:
```bash
npm run dev
```
In the browser, verify weapons and enemies specifically:

1. New Game → prologue → fire the Flare Pistol. **The report must sound identical to the reference** — this is what proves the stats/sound merge worked.
2. Fire six shots to empty the magazine → the auto-reload triggers
3. Reach Level 1 → enemies spawn, chase, and take damage
4. Find the shotgun in the secret alcove → press 2 → the pump sound plays after each shot
5. Open `reference/sonsurum.html` directly in a second tab and A/B the pistol and shotgun audio

- [ ] **Step 8: Run all gates**

Run:
```bash
npm run typecheck && npm test
```
Expected: PASS, 93 tests (84 + 9). Burn-down should read roughly `3040 lines remaining`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: extract weapon and enemy stat tables

EDEF is pure data and moves whole as ENEMY_DEFS. WEAPONS is not pure — each
entry carried a snd closure calling the audio layer — so the stats move to
WEAPON_STATS and the eight sound closures stay in legacy.js as WEAPON_SOUNDS
until Plan 0B extracts the audio. The two are merged back at module init, so
every WEAPONS[i].dmg and w.snd() call site is unchanged.

Weapon slot order is preserved and documented: it is the 1-8 hotkey binding
and the index into S.mag and S.weapons.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Definition of done for Plan 0A

- [ ] `npm run dev` serves the game; it plays identically to `reference/sonsurum.html`
- [ ] `npm run build` produces a working `dist/`
- [ ] `npm run typecheck` is clean
- [ ] `npm test` passes: 93 tests, file-size gate, no circular imports
- [ ] The game runs with DevTools set to Offline
- [ ] `src/legacy.js` is down from ~3759 to roughly 3040 lines
- [ ] `docs/known-issues.md` records KNOWN-1 with Phase 4 as owner

## What comes next

**`src/content/achievements.ts` is deliberately not in this plan.** The spec lists it
under "pure leaves", but the reference has no achievements table — all 20 are inline
literals at their trigger sites, e.g. `ach("punt","FIELD GOAL","Kick an enemy into a
wall")`. Building the table means editing 20 call sites across systems that have not
been extracted yet, so it moves to Plan 0C with those systems.

- **Plan 0B** — procedural textures, sprite baker, pixel definitions, the audio layer (spec §6 steps 4–5)
- **Plan 0C** — FX, the global-to-state migration, systems, UI, the loop (spec §6 steps 6–10)
- **Plan 0D** — kill gameplay `setTimeout`, dispose registry, `strict: true`, Three.js upgrade (spec §6 steps 11–14)
