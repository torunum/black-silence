# Phase 0C — Behavioral Oracle and the FX/Art Leaves

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fidelity oracle's source-text comparison with behavioral recording, then carve out the remaining low-coupling leaves — the FX layer, the weapon viewmodel art, subtitles and achievements, and input.

**Architecture:** Same carve-and-import-back method as 0A and 0B. What changes is the safety net. Until now the oracle compared *source text* against `reference/sonsurum.html`, which works only while code moves verbatim. Task 1 replaces it with a recorder: run the reference's drawing and audio code and the module's side by side against instrumented stubs, and compare the ordered call logs. That survives refactors text comparison cannot — which matters because Plan 0D rewrites every global read and write and is non-verbatim by definition.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 2, jsdom, madge, three 0.128.0 (pinned).

## Global Constraints

Every task's requirements implicitly include this section.

- **No gameplay changes. No balance changes. No new features.** Existing bugs are preserved.
- **No art changes. No audio changes.** Every drawing call, colour, sprite row, frequency and filter setting is art or sound design.
- **`reference/sonsurum.html` is never edited.** It is the golden behavioral reference.
- **Three.js is pinned to `0.128.0`.** The upgrade is Plan 0F.
- **No file in `src/` may exceed 400 lines**, except `src/legacy.js`. Hard gate.
- **No import cycles.** Hard gate.
- **Every task ends with a playable game.**
- **When a section is carved out of `src/legacy.js`, its banner comment goes with it.**
- **Every line number in this plan is advisory.** Six of them were wrong across the last two plans. Confirm every range by reading its content before deleting.
- **Burn-down and test-count figures are estimates.** Record the real ones; never edit a source file to make a count match a document.
- **Every carve needs oracle coverage.** After Task 1, prefer the behavioral oracle for anything it can reach.

## Starting state

`master`, commit `709d6da`. `src/legacy.js` is 2224 lines. 167 tests pass. Five known issues recorded in `docs/known-issues.md`; **KNOWN-5 is what Task 1 exists to resolve.**

Section map of what remains, verified against the current file:

| Section | Lines | Owner |
|---|---|---|
| GLOBAL STATE | 22–32 | Plan 0D |
| THREE CORE | 33–61 | Plan 0E |
| PARTICLES / DECALS / GIBS | 62–162 | **Task 2** |
| SUBTITLES + ACHIEVEMENTS | 163–185 | **Task 4** |
| INPUT | 186–219 | **Task 5** |
| HUD MESSAGES | 220–229 | **Task 4** |
| WEAPONS — FSM, fire, kick, hitscan | 230–500 | Plan 0E |
| WEAPON PIXEL SPRITES (viewmodel art) | 501–947 | **Task 3** |
| AMBIENT AUDIO + particle helper | 948–971 | **Task 2** (the helper) |
| WORLD STATE + LEVEL LOADER | 972–1212 | Plan 0E |
| DAMAGE / DEATH | 1213–1450 | Plan 0E |
| ENEMY AI | 1451–1802 | Plan 0E |
| PROJECTILES | 1803–1845 | Plan 0E |
| PLAYER | 1846–1950 | Plan 0E |
| INTERACTION + PICKUPS | 1951–2020 | Plan 0E |
| RANDOM EVENTS | 2021–2044 | Plan 0E |
| PLAYABLE PIANO | 2045–2091 | Plan 0F |
| LEVEL END + WIN + HUD | 2092–2150 | Plan 0F |
| IDLE QUIPS | 2151–2160 | Plan 0F |
| MAIN LOOP + BOOT | 2161–2224 | Plan 0F |

---

### Task 1: Replace the text oracle with a behavioral recorder

This is the most important task in the plan and everything after depends on it.

`tests/fidelity.test.ts` currently proves extraction fidelity by comparing source text against the reference. That works only while code moves verbatim. Plan 0D's global-to-state migration rewrites every global read and write, so text comparison cannot cover it — and text comparison is currently the *only* thing guarding the art, since the canvas under test is a no-op stub that rasterizes nothing.

The replacement: run the reference's code and the module's code side by side against **instrumented stubs that record what was done**, then compare the ordered logs. A recorder survives renames, reformatting, type annotations and state refactors, because it compares behavior rather than characters.

**Files:**
- Create: `tests/support/recordingCanvas.ts`
- Create: `tests/support/recordingAudio.ts`
- Create: `tests/support/seededRandom.ts`
- Create: `tests/behavior/textures.test.ts`
- Create: `tests/behavior/audio.test.ts`
- Modify: `tests/fidelity.test.ts` — keep the data comparisons, retire the body-identity ones the recorder now covers
- Modify: `docs/known-issues.md` — close KNOWN-5

**Interfaces:**
- `export interface DrawCall { method: string; args: unknown[] }`
- `export function recordingCanvas(): { ctx: unknown; calls: DrawCall[] }` — a 2D context stub logging every method call and every property assignment in order.
- `export interface AudioEvent { kind: "create" | "connect" | "param" | "start" | "stop"; detail: Record<string, unknown> }`
- `export function recordingAudioContext(): { ctx: unknown; events: AudioEvent[] }`
- `export function seedRandom(seed: number): () => void` — installs a deterministic `Math.random`, returns a restore function.

- [ ] **Step 1: The determinism problem — read this before writing anything**

The drawing code is **not deterministic**. `noiseFill` alone calls `Math.random()` hundreds of times per texture, and `makeTex`'s callbacks use `rnd()` throughout. Two runs of the same function produce different call logs.

So a recorder that does not control randomness can never match, and the natural but wrong fix is to loosen the comparison until it passes — which produces a test that proves nothing.

**The right fix is to make both sides deterministic.** `seedRandom(seed)` replaces `Math.random` with a small seeded PRNG (a 32-bit xorshift or mulberry32 is plenty), so the reference run and the module run draw identical sequences. Install it, run both sides, restore it.

Note that `src/utils/math.ts`'s `rnd` and `pick` call `Math.random()` internally, so seeding the global covers them without touching production code. **Do not add a seed parameter to production functions** — that is a source change, and this plan forbids them.

Write and test `seededRandom.ts` first, on its own, before building either recorder. Prove that seeding, running a sequence, restoring, re-seeding with the same value and re-running produces identical output.

- [ ] **Step 2: Write the failing test for the canvas recorder**

`tests/support/recordingCanvas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { recordingCanvas } from "./recordingCanvas";

describe("recordingCanvas", () => {
  it("records method calls in order with their arguments", () => {
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    c.fillRect(1, 2, 3, 4);
    c.beginPath();
    c.arc(5, 6, 7, 0, 7);
    expect(calls).toEqual([
      { method: "fillRect", args: [1, 2, 3, 4] },
      { method: "beginPath", args: [] },
      { method: "arc", args: [5, 6, 7, 0, 7] },
    ]);
  });

  it("records property assignments, because colour is set that way", () => {
    // g.fillStyle = "#262a2e" is how every colour in this codebase is chosen.
    // A recorder that ignores assignments would miss every art change.
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    c.fillStyle = "#262a2e";
    c.fillRect(0, 0, 1, 1);
    expect(calls).toEqual([
      { method: "set:fillStyle", args: ["#262a2e"] },
      { method: "fillRect", args: [0, 0, 1, 1] },
    ]);
  });

  it("returns a gradient object that also records", () => {
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    const g = c.createLinearGradient(0, 0, 10, 0);
    g.addColorStop(0, "#fff");
    expect(calls).toContainEqual({ method: "createLinearGradient", args: [0, 0, 10, 0] });
    expect(calls).toContainEqual({ method: "gradient.addColorStop", args: [0, "#fff"] });
  });
});
```

- [ ] **Step 3: Run it, confirm it fails, then write `recordingCanvas.ts`**

Run: `npx vitest run tests/support/recordingCanvas.test.ts` — expect FAIL, module not found.

Implement with a `Proxy` so unknown methods are recorded rather than throwing. Property *assignments* must be recorded too — `fillStyle`, `strokeStyle`, `lineWidth` and `globalAlpha` are how this codebase chooses colours, and a recorder blind to them would miss the most likely kind of art defect.

Gradient objects returned by `createLinearGradient` / `createRadialGradient` must record their own `addColorStop` calls into the same log, prefixed so they cannot be confused with context calls.

Re-run, expect PASS.

- [ ] **Step 4: Write the texture behavior test**

`tests/behavior/textures.test.ts` compares the reference's `buildTextures` against the module's, by call log.

Use `tests/support/reference.ts`'s existing `evalReference` to run the reference's code in a `vm` sandbox — it already supports injecting globals, which is how you hand it the recording canvas and the seeded `Math.random`.

The assertion is `expect(moduleCalls).toEqual(referenceCalls)`. Assert the log is non-trivially long first (a few thousand calls) so an empty log can never pass silently.

Do the same for `texFromPx` on one representative sprite and for `buildItemTex`.

- [ ] **Step 5: Prove the behavioral oracle bites — three ways**

A recorder that cannot fail is worse than no test. Sabotage each of these in a separate run, confirm the failure, and revert:

1. **A colour**: change one hex literal in `ProcTextures.ts`. Must fail on a `set:fillStyle` mismatch.
2. **A call order**: swap two adjacent drawing calls. Must fail on ordering even though the set of calls is unchanged.
3. **A loop bound**: change an iteration count. Must fail on log length.

Record the actual failure output for each in your report.

- [ ] **Step 6: Write the audio recorder and its behavior test**

`recordingAudio.ts` logs node creation, `connect` edges, parameter assignments and scheduled automation (`setValueAtTime`, `exponentialRampToValueAtTime`), plus `start`/`stop`.

`tests/behavior/audio.test.ts` compares reference against module for `audioInit`, `blip`, `bang`, `boom`, `growl` and `snarl`. `audioInit` is the highest-value one — it builds the four detuned drone oscillators that are the game's ambient bed, and nothing currently verifies the graph they form.

Prove it bites by changing one frequency and one `connect` target, separately.

- [ ] **Step 7: Retire the body-identity tests the recorder now covers**

The text comparisons for `buildTextures`, `texFromPx`, `buildItemTex`, `audioInit`, `blip`, `bang`, `boom`, and the Voice/Ambient functions are now redundant — the recorder covers the same ground and is refactor-proof. Remove them.

**Keep every data comparison** — `PXDEF`, `ENEMY_DEFS`, `WEAPON_STATS`, `MONOLOGUE`, the level grids. Those are pure data; byte-identity is exactly right for them and no recorder improves on it.

If removing a text test leaves something with no coverage at all, say so in your report rather than removing it.

- [ ] **Step 8: Close KNOWN-5 and note what the recorder still cannot reach**

Update the KNOWN-5 row in `docs/known-issues.md` to record that the behavioral oracle now exists, and state plainly what remains uncovered — for example, code paths that run only during gameplay rather than at construction. An honest limits note is worth more than a claim of completeness.

- [ ] **Step 9: Gates and commit**

Run `npm run typecheck && npm test && npm run build`. Commit with explicit paths.

---

### Task 2: Extract the FX layer

**Files:**
- Create: `src/fx/Particles.ts` — the pooled point system and its spawners
- Create: `src/fx/Decals.ts` — blood pools, wall decals
- Create: `src/fx/Gibs.ts` — gib spawning and tick
- Modify: `src/legacy.js` — remove lines 62–162 plus the `woodP` helper near 948–971
- Modify: the behavior tests — add coverage where the recorder can reach

**Interfaces:**
- `Particles.ts`: `buildParticles()`, `spawnP(...)`, `blood`, `sparks`, `smoke3d`, `fireP`, `holyP`, `toxicP`, `emberP`, `woodP`, `partTick(dt)`, and `particleCount(): number` — a read-only accessor the pool test needs; it reports how many pool slots exist, not how many are alive
- `Decals.ts`: `addPool(x,z,s)`, `poolTick(dt)`, `addWallDecal(...)`, `resetDecals()`, and the shared materials
- `Gibs.ts`: `spawnGibs(...)`, `gibTick(dt)`, `resetGibs()`

**These modules own live mutable state** — the particle pool arrays and geometry, and the `pools` / `wallDecals` / `gibs` arrays which `loadLevel` resets per level. Follow the pattern `AudioEngine` established in Plan 0B: the module owns the state and exposes functions. In particular `loadLevel` currently does `pools=[];wallDecals=[];gibs=[]` directly — that becomes a `resetDecals()` / `resetGibs()` call.

They also reference `scene`, which stays in `legacy.js` until Plan 0E. Take the same approach: a `setScene(s)` injection or an accessor, decided once and applied consistently. State which you chose and why in your report.

- [ ] **Step 1: Write the failing tests**

Assert what is cheap and real under a stubbed renderer: that the particle pool has the documented capacity, that `spawnP` wraps around rather than growing unboundedly, that a spawner emits the expected count, and that `partTick` decrements life and retires dead particles.

```ts
import { describe, expect, it } from "vitest";
import { buildParticles, spawnP, partTick, particleCount } from "../../src/fx/Particles";

describe("particle pool", () => {
  it("recycles rather than growing without bound", () => {
    buildParticles();
    // PMAX is 1100 in the reference; spawning more must wrap, not allocate.
    for (let i = 0; i < 2000; i++) spawnP(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0);
    expect(particleCount()).toBe(1100);
  });
});
```

Export whatever small accessor the assertion needs; do not change the pool's behavior to suit the test.

- [ ] **Step 2: Run, confirm failure, extract, confirm pass**

Copy the bodies verbatim from `legacy.js` lines 62–162 and the `woodP` helper. Add types, `export`, and the state-ownership API. Change no numeric literal — particle counts, velocities, lifetimes and colours are all art.

- [ ] **Step 3: Behavioral coverage**

Add the FX spawners to the recorder-based tests where they touch the canvas or construct Three objects with fixed parameters. Where the recorder cannot reach — pure math on a buffer — the unit tests from Step 1 are the coverage. Say which is which in your report.

- [ ] **Step 4: Verify in-game, gate, and commit**

Fire a weapon and confirm blood, sparks, smoke and wall decals still appear; kill an enemy and confirm gibs fly. Then `npm run typecheck && npm test && npm run build`, and commit with explicit paths.

---

### Task 3: Extract the weapon viewmodel art

At ~447 lines this is the largest single block left in `legacy.js`, and it is pure canvas drawing — the hand-pixeled weapon sprites drawn to the 2D overlay each frame.

**Files:**
- Create: `src/render/viewmodel/kit.ts` — the `VM` palette and the `vRect`/`vBarrel`/`vTube`/`vWood`/`vScrew`/`vHole`/`vTrigger` drawing helpers
- Create: `src/render/viewmodel/sprites.ts` — the per-weapon pixel definitions and `buildWeaponSprites`
- Create: `src/render/viewmodel/draw.ts` — `frameFor`, `drawViewmodel`, `drawKickBoot`
- Create: `src/render/Overlay2D.ts` — the `fx2d` canvas, `sizeFx`, `ejectCasing`, `screenBlood`, and the casing/puff/blood-hit arrays
- Modify: `src/legacy.js` — remove lines 501–947, add imports

Split by responsibility so no file approaches 400 lines. If a file would exceed it, split further along a natural seam and say where.

**Interfaces:** derive them from what `legacy.js` actually calls after the carve; the shape is not prescribed here beyond the file split above. `Overlay2D` owns the `fx2d` context and the three effect arrays as module state.

- [ ] **Step 1: Behavioral test first**

This is the ideal case for the Task 1 recorder: the viewmodel is drawn entirely through 2D canvas calls. Write the reference-vs-module call-log comparison for `drawViewmodel` across every weapon slot and every animation frame (`idle`, `fire`, `reloadA`, `reloadB`), and for `drawKickBoot`.

Seed the RNG, since the draw path uses `rnd()` for muzzle flash and shake.

- [ ] **Step 2: Run, confirm failure, extract, confirm pass**

Copy verbatim. Every coordinate, colour and gradient stop is art.

- [ ] **Step 3: Prove the oracle bites on this block specifically**

Sabotage one weapon's silhouette — move a single `vRect` by one pixel — and confirm the call-log comparison fails for that weapon and only that weapon. Revert.

- [ ] **Step 4: Verify in-game, gate, and commit**

Cycle through every weapon the player can hold and confirm each renders and animates. Firing, reloading and the kick animation all need a look. Then gate and commit.

---

### Task 4: Extract subtitles, achievements and HUD messages

**Files:**
- Create: `src/ui/Subtitles.ts` — `say`, the `onceSaid` registry, `subT`/`lastSayT` state
- Create: `src/ui/Toasts.ts` — `ach`
- Create: `src/ui/HudMessages.ts` — `showMsg`, `flashDmg`, `flashHoly`, the `msgEl`/`msgT` state
- Create: `src/content/achievements.ts` — **the table deferred from Plan 0A**
- Modify: `src/legacy.js` — remove lines 163–185 and 220–229

Plan 0A deferred `content/achievements.ts` because the reference has no achievements table: all 20 are inline literals at their trigger sites, like `ach("punt","FIELD GOAL","Kick an enemy into a wall")`. Building the table means touching those 20 call sites, which is why it waited for the UI carve.

**Build the table now.** Each entry keeps its exact id, title and description text — those strings are content. The call sites become `ach(ACHIEVEMENTS.punt)` or equivalent. Verify all 20 by grepping the reference; the ids are `behead boot curious deadeye digger exec first foreman gauntlet guard heart leviathan organ pianist priest punt recital redec sixty sovereign`.

- [ ] **Step 1: Write the failing tests**

Assert the table has all 20 entries with non-empty titles and descriptions, that ids are unique, and that every `ach(...)` call site in `legacy.js` references an id the table defines — that last one is the real protection, since a typo'd id would silently produce a toast with no text.

- [ ] **Step 2: Run, confirm failure, extract, confirm pass**

Copy the achievement strings from the reference exactly.

- [ ] **Step 3: Verify in-game, gate, and commit**

Trigger at least one achievement — breaking 15 props earns REDECORATOR — and confirm the toast still shows its title and description. Confirm ADEM's subtitles still appear.

---

### Task 5: Extract input

**Files:**
- Create: `src/player/Input.ts` — the `keys` map, pointer-lock handling, mouse look, the `yaw`/`pitch`/`swayX`/`swayY`/`firing`/`zoomOn`/`locked` state, and `overlayOpen`
- Modify: `src/legacy.js` — remove lines 186–219

This module owns state that Plan 0D will migrate again, so keep the API narrow and obvious. Everything the rest of the game reads becomes an accessor.

The event listeners are registered at module scope in the reference. Preserve that — moving registration into an `initInput()` called from boot would change *when* listeners attach, which is a behavior change this plan forbids.

- [ ] **Step 1: Write the failing tests**

Under jsdom you can dispatch real `KeyboardEvent`s and `MouseEvent`s. Assert that a keydown sets the corresponding entry in the key map and keyup clears it, that mouse movement updates yaw and pitch by the documented sensitivity, and that **pitch is clamped** — the reference limits it, and an unclamped pitch lets the player look past vertical and invert the view.

- [ ] **Step 2: Run, confirm failure, extract, confirm pass**

- [ ] **Step 3: Verify in-game, gate, and commit**

Movement, mouse look, firing, weapon switching on the number keys and the mouse wheel, and the sniper zoom on `Z`.

---

## Definition of done for Plan 0C

- [ ] The behavioral oracle exists, is proven to fail on colour, order and count changes, and KNOWN-5 is closed with an honest limits note
- [ ] `npm run dev` serves the game; it looks, sounds and plays exactly as `reference/sonsurum.html`
- [ ] `npm run build` produces a working `dist/`
- [ ] `npm run typecheck` clean; `npm test` passes; no import cycles; no `src/` file over 400 lines except `legacy.js`
- [ ] `src/legacy.js` is down from 2224 to roughly 1550 lines
- [ ] `docs/known-issues.md` reflects reality

## What comes next

The spec sized the remainder as two plans; the real shape is four.

- **Plan 0D** — the global-to-state migration. Touches every system at once; the reason Task 1 exists.
- **Plan 0E** — systems: renderer, level loader, weapons, enemies and AI, player, interaction, projectiles, damage.
- **Plan 0F** — UI, piano, loop and boot, then hardening: gameplay `setTimeout` removal, the dispose registry, `strict: true`, and the Three.js upgrade.
