# Phase 2, Part A — The Verifiable World

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two shipped bugs whose correctness is structural, and collapse the level's per-cell scene graph — the three pieces of Phase 2 this environment can actually prove.

**Architecture:** Two small independent bug fixes first, each of which needs an existing test *rewritten* rather than deleted because that test currently encodes the bug. Then the geometry merge, which is larger, touches both trace fixtures, and must not change collision.

**Tech Stack:** Vite 6, TypeScript 5 (`strict`), Vitest 2, jsdom, madge, three 0.128.0 (pinned — KNOWN-14).

## Global Constraints

Every task's requirements implicitly include this section.

- **The game cannot be rendered here.** Measured 2026-08-31 on the real page under a real `vite` server with the pane open and `document.hidden === false`: 3.2 seconds, `setTimeout` fired 100 times, `requestAnimationFrame` fired **zero**. `Loop.ts` never runs and nothing is drawn. **No task in this plan may claim a green suite as evidence that something looks right** — every task here was chosen precisely because its criterion is structural instead.
- **`reference/sonsurum.html` is never edited.** Phase 2 changes behavior deliberately, so the reference stops being the oracle for what this plan changes — but it remains the oracle for everything else.
- **A test that encodes a bug is rewritten when the bug is fixed, never deleted.** Tasks 1 and 2 both depend on this: the assertions that currently pin the broken behavior become the proof the fix landed.
- **Every new assertion gets a recorded mutation that turns it red.** Four guards in this project have at some point reported success while examining nothing, and the tell was always a number nobody read.
- **Neither trace fixture may be regenerated without a written analysis in the same commit.** Task 3 is expected to change them; Tasks 1 and 2 are not.
- **No file in `src/` may exceed 400 lines.** Hard gate.
- **No import cycles.** Run as `madge --circular --extensions ts,js src/` — **the bare form scans zero files and still reports success** (KNOWN-12). The "Processed N files" line is the tell; expect ~90.
- **Use a cold cache for trace runs:** `npx vitest run --no-cache`.
- **`npm test` and `npm run typecheck` must pass before every commit.** Node is not on PATH in a fresh shell: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.

---

## Starting state

`master` at `aa00851`. 449 tests, `strict: true`.

Measured, not assumed:

| Area | Today |
|---|---|
| Casing spawn | `Overlay2D.ts:53` — `x:FW/2+rnd(4,12), y:FH*.62`, in **`FW`/`FH`** space (`FW=640`) |
| Casing cull | `Overlay2D.ts:93` — `c.y>VH+10`, in **`VW`/`VH`** space (`VW=320`) |
| Draw | `Overlay2D.ts:85` — 320-space, via `SF=FW/320` |
| Blood spawn | `Overlay2D.ts:58` — `rnd(0,FW), rnd(0,FH)`, drawn in 320-space |
| Mouse wheel | `Input.ts:102-103` — `for (let k = 0; k < 6; k++)` and `% 6`, against **8** weapons |
| Level geometry | Three grid loops in `LevelLoader.ts` at 187 (walls), 233 (height-map platforms), 250 (entities) |
| Scene size | fixtures record `scene.count` — prologue **237** at load / 249 peak; level 1 **295** / 322 |

### Why the casings have never been seen

At 16:9, `FH ≈ 360` and `VH ≈ 180`. A casing spawns at `y = FH*.62 ≈ 223` and is culled by `c.y > VH+10 ≈ 190` — **on its first tick, before its first draw.** Every casing, at every ordinary aspect ratio. The four `kind` colours, the shotgun shell's brass stripe, the spin and the gravity arc have never appeared on a screen.

Blood is the same mix-up without the cull: spawned across `0..FW × 0..FH`, drawn in 320-space, so roughly three quarters of each flash lands outside the canvas.

---

## File structure

| File | Change | Task |
|---|---|---|
| `src/player/Input.ts` | the wheel walks eight slots | 1 |
| `tests/behavior/input.test.ts` | its six-slot assertion becomes an eight-slot one | 1 |
| `src/render/Overlay2D.ts` | casings and blood spawn in the space they are drawn in | 2 |
| `tests/behavior/overlay2d.test.ts` | two assertions that encode the bug are rewritten | 2 |
| `src/world/LevelLoader.ts` | walls and platforms become instanced | 3 |
| `tests/integration/__fixtures__/*.json` | regenerated **with** a written analysis | 3 |

---

### Task 1: The mouse wheel reaches all eight weapons

**Files:**
- Modify: `src/player/Input.ts`, `tests/behavior/input.test.ts`

- [ ] **Step 1: The change is two numbers**

`src/player/Input.ts:102-103`:

```ts
let i = hooks.currentWeapon(); for (let k = 0; k < 6; k++) {
  i = (i + (e.deltaY > 0 ? 1 : 5)) % 6;
```

Both `6`s become `8`, and the backward step `5` becomes `7` — it is `n-1`, the modular predecessor, not a constant.

**Getting the backward step wrong is the whole risk in this task.** With `% 8` and a step of `5`, scrolling up walks *backwards three slots at a time* instead of one, which still reaches every weapon and so still looks fine in a naive test.

- [ ] **Step 2: Decide the order, and say so**

The default this plan takes: **cycle all eight in slot order**, matching what `/^Digit[1-8]$/` already does. Any other order needs a feel justification that cannot be tested in this environment.

- [ ] **Step 3: Rewrite the test that encodes the bug**

`tests/behavior/input.test.ts` currently proves the limit: owning *only* slots 6 and 7 makes the wheel do nothing while `Digit7`/`Digit8` still work. That assertion is now wrong and becomes its opposite — owning only 6 and 7, the wheel must reach them.

**Do not delete it.** Rewrite it, and add one that pins direction: from slot 0, one scroll-up must land on slot 7, not slot 5.

- [ ] **Step 4: Prove both**

Mutations, each turning a named test red:
- leave the loop bound at `6` → the reach test
- leave the backward step at `5` → the direction test

Record both.

- [ ] **Step 5: Update KNOWN-8 and commit**

Mark it closed, recording that the wheel now walks eight in slot order and why that order was chosen.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache
npm run typecheck && npm test
git add src/player/Input.ts tests/behavior/input.test.ts docs/known-issues.md
git commit -m "fix: let the mouse wheel reach all eight weapons"
```

The traces must **not** move — they never scroll.

---

### Task 2: Casings and blood are drawn where they are spawned

**Files:**
- Modify: `src/render/Overlay2D.ts`, `tests/behavior/overlay2d.test.ts`

**Charter:** this is a visible art change. Casings appear for the first time in the game's history.

- [ ] **Step 1: Spawn in the space the draw uses**

`fxTick` draws in 320-space. So `ejectCasing` and `screenBlood` must spawn there:

```ts
// was: x:FW/2+rnd(4,12), y:FH*.62
casings.push({x:VW/2+rnd(4,12),y:VH*.62, …});
// was: x:rnd(0,FW), y:rnd(0,FH)
bloodHits.push({x:rnd(0,VW),y:rnd(0,VH), …});
```

**Change the spawn coordinates and nothing else.** Velocities, gravity, `life`, radius and the per-`kind` art stay exactly as authored.

- [ ] **Step 2: Expect the motion tuning to be untested, and say so**

Those velocities have **never produced a visible frame**. They may well be wrong — too fast, too far, gone in a blink. **That is not this task's problem and must not be quietly "improved".** This task makes the code do what the art intends; whether the arc looks good is a visual judgement that belongs to Phase 2 Part B, when someone can watch it.

If you have a view, put it in `docs/known-issues.md` as a new row, not in the source.

- [ ] **Step 3: Rewrite the two assertions that encode the bug**

`tests/behavior/overlay2d.test.ts` has 26 cases, two of which pin the broken behavior:
- one asserts a casing draws **nothing** at an ordinary aspect ratio
- one reaches the per-`kind` art only through a deliberately absurd 8000×1000 viewport

Both invert. The first becomes "a casing draws at an ordinary aspect ratio"; the second no longer needs the absurd viewport. **Rewrite, do not delete** — they are the proof the fix landed.

- [ ] **Step 4: The literal this unblocks**

KNOWN-6 records that the casing's `life:1.6` is **unobservable** — the cull always wins first, so `1.6`→`1.9` passes the suite. Once casings survive, that literal becomes reachable. Add the assertion that pins it, and update KNOWN-6's row to say it is no longer an exception.

- [ ] **Step 5: Prove it**

Mutations, each turning a named test red: revert the casing spawn to `FW`/`FH`; revert the blood spawn; change `life` to `1.9`. Record all three.

- [ ] **Step 6: Update KNOWN-7 and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache
npm run typecheck && npm test
git add src/render/Overlay2D.ts tests/behavior/overlay2d.test.ts docs/known-issues.md
git commit -m "fix: spawn casings and blood in the space they are drawn in"
```

The traces record the 3D scene and the HUD, not the 2D overlay, so they should **not** move. If one does, stop and find out why.

---

### Task 3: Instance the level geometry

**Files:**
- Modify: `src/world/LevelLoader.ts`
- Test: `tests/world/geometry.test.ts` (create)
- Regenerate, with analysis: both trace fixtures

- [ ] **Step 1: Know what you are merging, and what you are not**

```
LevelLoader.ts:187  walls — new THREE.Mesh(wallGeo, matWall) per visible cell.
                    Geometry AND material are already shared; only the Mesh
                    objects multiply. This is the clean InstancedMesh target.
LevelLoader.ts:233  height-map platforms — new BoxGeometry(CELL,hgt,CELL) per
                    cell, varying height, shared material. Instanceable as a
                    unit box with a per-instance scale.
LevelLoader.ts:250  entities — player start, exit pad, items, props, enemies.
                    NOT merge targets; they move, animate and get removed.
```

Note the wall loop already skips cells with no open neighbour (`if(!open)continue;`), so it is not building interior walls nobody can see.

- [ ] **Step 2: The thing that must not change**

**Collision does not read the scene graph.** `src/world/Collision.ts` reads `world.grid` and `world.wallSegs`. So this task must leave both untouched, and merging meshes must not change where the player can walk.

Assert that directly: a test that builds a level and checks `world.grid` and `world.wallSegs` are identical before and after the change is worth more than any scene assertion. And the traces' camera track is the backstop — if movement changed, the camera diverges.

- [ ] **Step 3: Check the dispose registry still holds**

`disposeAll()` frees per-level GPU resources and **must never free a shared one** (Plan 0F Task 7). Instancing changes what is created per level: verify which of `wallGeo`, `matWall` and the platform geometries are `track()`ed today, and keep the same rule — per-level tracked, shared untracked. An `InstancedMesh`'s own geometry is per-level and should be tracked; a geometry it shares with anything else must not be.

- [ ] **Step 4: Expect the fixtures to change, and analyse before regenerating**

`digestScene` records a child count **and** a hash of every child's type. Instancing collapses hundreds of `Mesh` children into a handful of `InstancedMesh` children, so **both will change, substantially** — prologue from 237, level 1 from 295.

**This is the one sanctioned fixture change in this plan**, and the procedure from Plan 0F Task 5 applies exactly:

1. Run and read **which** frames diverge and by how much.
2. Confirm the divergence is consistent with the merge and nothing else. A falling `scene.count` and changed type hash are expected. **A changed camera track is not** — that would mean movement changed, which is Step 2's failure.
3. Write the analysis into each test file's header **and** your report, with the before/after counts.
4. Only then regenerate with `WRITE_TRACE=1`, in the **same commit** as the change.

- [ ] **Step 5: Pin the win**

A test that asserts the collapse, so a future change that silently un-merges the level fails:

```ts
// tests/world/geometry.test.ts
// @vitest-environment jsdom

/**
 * The prologue's scene held 237 children before this merge (recorded in
 * trace-level0.json) and <N> after. The ceiling below is <N> plus headroom —
 * it exists to fail if a future change silently un-merges the level, not to
 * pin an exact number.
 */
const PROLOGUE_CHILD_CEILING = /* measured post-merge + headroom */ 0;

it("builds the prologue's walls as instanced meshes, not hundreds of Mesh children", async () => {
  // installDomStubs(); loadGameHtml(); then boot and loadLevel(0), the way
  // tests/integration/gpuDisposeWiring.test.ts already does.
  const scene = renderState.scene!;
  expect(scene.children.length).toBeLessThan(PROLOGUE_CHILD_CEILING);
  expect(scene.children.some((c) => (c as THREE.InstancedMesh).isInstancedMesh)).toBe(true);
});

it("leaves collision data untouched — the merge changes rendering, not the map", () => {
  // world.grid and world.wallSegs, captured before and after loadLevel, are
  // deep-equal to what the level definition produced. Collision.ts reads these
  // and never the scene graph, so this is the assertion that proves the player
  // can still walk exactly where they could.
});
```

Fill `PROLOGUE_CHILD_CEILING` from your own measurement and **record the pre- and post-merge numbers in the comment** — a bare magic number in a test is the thing that goes stale silently. `tests/integration/gpuDisposeWiring.test.ts` is the closest existing model for booting far enough to inspect a loaded level.

- [ ] **Step 6: Gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npx vitest run --no-cache
npm run typecheck && npm test
git add src/world/LevelLoader.ts tests/world/geometry.test.ts tests/integration/
git commit -m "perf: instance the level's wall and platform geometry"
```

---

### Task 4: Review and merge

- [ ] **Step 1: Confirm the charters**

Three behavior changes, one per task. Anything else is a finding.

- [ ] **Step 2: Confirm the rewritten tests actually inverted**

Tasks 1 and 2 each rewrote an assertion that encoded a bug. Check each is now asserting the fixed behavior and would fail if the fix were reverted — do not take the reports' word for it.

- [ ] **Step 3: Sabotage the new seams, choosing your own**

Cover at least: the wheel's backward step; a casing spawn coordinate; the collision-unchanged assertion; the instanced-mesh ceiling.

Any sabotage that leaves the suite green is a finding.

- [ ] **Step 4: Confirm the fixture analysis is real**

Task 3 regenerated both fixtures. Read its analysis and check it against the diff: the scene counts should fall by roughly what it claims, and the camera track should be unchanged. **A fixture regenerated without its camera track being verified is the most dangerous thing in this plan.**

- [ ] **Step 5: Update the docs and merge**

`docs/STATUS.md`: Phase 2 Part A merged, test count, next action. `docs/known-issues.md`: KNOWN-7 and KNOWN-8 closed, KNOWN-6's exception removed.

Merge with `--no-ff`, message in a file passed with `-F <file>` — **`git merge` does not read `-F -` from stdin.**

---

## Definition of done for Phase 2 Part A

- [ ] The mouse wheel reaches all eight weapons, in slot order, one step at a time in both directions
- [ ] Casings draw at ordinary aspect ratios; the per-`kind` art no longer needs an absurd viewport to reach
- [ ] Blood splats land inside the canvas
- [ ] The casing's `life` literal is pinned, and KNOWN-6's exception is removed
- [ ] A level's scene-graph child count falls substantially, with the fixture change analysed in the same commit
- [ ] `world.grid` and `world.wallSegs` are unchanged by the merge, asserted directly
- [ ] The traces' camera track is unchanged
- [ ] KNOWN-7 and KNOWN-8 closed
- [ ] `npm test` passes, `npx tsc --noEmit` clean, no cycles, no `src/` file over 400 lines
- [ ] Every new assertion has a recorded mutation proving it fails

## What comes next

**Phase 2 Part B**, when someone can watch the game run: the Three.js upgrade first (KNOWN-14 — tuning lighting against r128 and then upgrading would mean tuning twice), then shadowed lighting, variable ceiling height and gothic trim. None of it is verifiable in this environment; its criterion is a human comparing the running game against `reference/sonsurum.html`.
