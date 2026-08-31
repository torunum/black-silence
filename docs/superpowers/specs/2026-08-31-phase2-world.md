# Phase 2 — The World

**Status:** spec. Written 2026-08-31, after Phase 1 merged (`4dd58f8`).

## 1. Purpose

`docs/direction.md`'s roadmap gives Phase 2 as *"World: shadowed lighting,
instanced/merged geometry, variable ceiling height, gothic trim"*, and
`docs/known-issues.md` assigns it three more: KNOWN-7 (spent casings never
reach the screen), KNOWN-8 (the mouse wheel reaches six of eight weapons) and
KNOWN-14 (the deferred Three.js upgrade).

**This spec reorders that work, and the reason is an environment fact rather
than a preference.**

## 2. The constraint that shapes this phase

**The game cannot be rendered in the development environment.** Measured
2026-08-31 on the real page under a real `vite` server, with the browser pane
open and `document.hidden === false`: over 3.2 seconds a `setTimeout` loop
fired 100 times and `requestAnimationFrame` fired **zero**. `src/core/Loop.ts`
therefore never runs, and nothing is ever drawn.

The test suite is unaffected — `tests/integration/gameplayTrace.ts` installs
its own rAF queue and drains it by hand, which is why 900-frame traces work.
But **no automated check in this repository samples a pixel.** `tests/behavior/`
compares canvas and WebAudio *call logs*; the traces digest the camera, a
scene-graph hash and HUD fields.

So the phase splits cleanly, and pretending otherwise is the main way it could
go wrong:

- **Part A is verifiable here.** Its correctness is structural — an object
  count, a call log, a reachable weapon slot — and a mutation can prove every
  assertion.
- **Part B is not.** Its correctness is what the game *looks like*, and the
  only instrument for that is a human running it. **A green suite is not
  evidence for anything in Part B**, and any task that claims it is has
  produced the most damaging output available.

Part A ships first and stands alone. Part B is specified in full so it is ready
the moment someone can look at the screen, and it does not block Part A.

## 3. Success criteria

**Part A**
- Spent casings appear on screen; the four `kind` colours and the brass stripe
  are reachable in a normal window
- Screen-blood splats land inside the canvas
- The mouse wheel reaches all eight weapons
- A level's scene-graph object count drops substantially, with the trace
  fixtures' change analysed and recorded rather than regenerated silently
- `npm test`, `npm run typecheck` and `madge --circular --extensions ts,js src/`
  stay green; no `src/` file over 400 lines

**Part B** — each item's criterion is a human comparing the running game
against `reference/sonsurum.html` and saying it is right. Nothing else counts.

## 4. Part A — what can be verified here

### 4.1 KNOWN-7: casings and blood are drawn in the wrong coordinate space

**Measured.** `src/render/Overlay2D.ts` keeps two spaces: `FW`/`FH` (the
upscaled framebuffer, `FW=640`) and `VW`/`VH` (the 320-wide draw space).
`fxTick` draws in 320-space via `SF=FW/320`.

- Line 53 spawns a casing at `x:FW/2+rnd(4,12), y:FH*.62` — **`FW`/`FH` space**
  — and the cull test is `c.y>VH+10`. At any normal aspect ratio the spawn `y`
  is already past the cull line, so **every casing is spliced away before its
  first draw.** The whole casing art path — four `kind` colours, the shotgun
  shell's brass stripe, the spin, the gravity arc — has never been seen.
- Line 58 spawns blood hits at `rnd(0,FW), rnd(0,FH)` and draws them in
  320-space, so roughly three quarters of each flash lands off-canvas.

This is a faithful port of a reference bug, which is why Phase 0 preserved it.
**Fixing it is a visible art change** — casings appear for the first time — so
it needs a decision, not just a patch. The default this spec takes: *make the
code do what the art plainly intends.* The casing artwork exists, is detailed,
and was written to be seen.

`tests/behavior/overlay2d.test.ts` already covers this module with 26 cases,
including one asserting the current broken behavior (a casing draws nothing)
and one that reaches the per-`kind` art only through a deliberately absurd
8000×1000 viewport. **Those two tests encode the bug and must be rewritten, not
deleted** — they become the proof that the fix works at ordinary aspect ratios.

The row also notes a literal that becomes testable only once this is fixed: the
casing's `life:1.6`, currently dead because the cull always wins. Closing
KNOWN-7 should close that gap too.

### 4.2 KNOWN-8: the mouse wheel reaches six of eight weapons

**Measured.** `src/player/Input.ts:103` is
`i = (i + (e.deltaY > 0 ? 1 : 5)) % 6`, run for six iterations. `S.weapons`,
`S.mag` and `WEAPON_STATS` all have **eight** entries and the keyboard's
`/^Digit[1-8]$/` reaches all eight, so the NAIL CANNON (slot 6) and SOUL REAPER
(slot 7) are wheel-unreachable. The reference's own section banner still reads
"WEAPONS — 6 slots": the roster grew and the wheel did not.

Fixing it means deciding the wheel's order across eight weapons. The default
this spec takes: **cycle all eight in slot order**, matching what the digit keys
already do, because any other order needs a feel justification this phase has
no way to test.

`tests/behavior/input.test.ts` covers the wheel and encodes the current
limit — same rule as above: rewrite, do not delete.

### 4.3 Merged level geometry

**Measured.** `src/world/LevelLoader.ts` builds level geometry per cell, in
three grid loops (lines 187, 233, 250), each producing its own `THREE.Mesh`.
The committed fixtures record the result directly:

```
trace-level0.json (prologue)  scene.count 237 at load, 249 peak
trace-level1.json (level 1)   scene.count 295 at load, 322 peak
```

Most of those are static walls and floors sharing a handful of materials.
Merging them per material — or instancing — collapses the count and cuts draw
calls, which is the point of the item.

**This is the one Part A task the traces verify directly**, because
`digestScene` records both a child count and a hash of every child's type. A
merge *will* change both, and that is expected — but the change must be
analysed and written down in the same commit, never regenerated silently. The
procedure Plan 0F Task 5 established applies: read which frames diverge,
confirm the divergence is consistent with the stated cause and nothing else,
write the analysis into the test's header, and only then regenerate.

**What must not change:** collision. `src/world/Collision.ts` reads
`world.grid` and `world.wallSegs`, not the scene graph, so merging meshes must
leave both untouched. If a merge changes where the player can walk, it has
changed the game, and the traces' camera track will say so.

## 5. Part B — what needs a human at the game

Specified now, executable when someone can watch the screen. **None of it
should be attempted on the strength of a green suite.**

### 5.1 Shadowed lighting

The game is lit by hand-tuned point lights (`renderState.lamp`, `lampCore`,
`muzzleLight`, `boomLight`) with no shadows. Adding shadow maps is a
`renderer.shadowMap` setting plus per-light and per-mesh flags — small in code,
entirely a matter of look in practice, and expensive enough that it interacts
with 4.3's merge.

Sequence it **after** the merge: shadow cost scales with the number of casters,
so measuring it against the pre-merge scene would measure the wrong thing.

### 5.2 Variable ceiling height

Levels currently use one wall height (`WALLH` in `src/world/Grid.ts`). The
level format already carries a height map (`hmap`) that the floor uses, so the
data path exists. This is partly structural — a grid can assert the geometry
matches the map — but whether the result *reads* as a cathedral is visual.

### 5.3 Gothic trim

Procedural, per the asset policy: no imported models. This is authoring work
with no automated oracle at all.

### 5.4 The Three.js upgrade (KNOWN-14)

Still blocked, for the reason that row records. `three` is pinned at 0.128.0
(2021); latest is 0.185.1. `src/render/RenderCore.ts`'s
`if (THREE.sRGBEncoding !== undefined)` guard reads as defensive coding and is
really a tripwire pointing the wrong way — on a modern Three that property is
`undefined`, so the line silently no-ops and sRGB output switches off, shifting
every colour with nothing able to see it. Colour management became default-on
in r152 and light intensities changed meaning in r155.

**Do it first within Part B, not last.** 5.1 and 5.3 are both tuned by eye, and
tuning them against r128 and then upgrading would mean tuning twice.

## 6. Testing

The existing mechanisms apply. Two rules this phase leans on especially:

- **A test that encodes a bug is rewritten when the bug is fixed, never
  deleted.** `overlay2d.test.ts` and `input.test.ts` both currently assert the
  broken behavior of 4.1 and 4.2. Those assertions are the proof the fix
  landed.
- **Every new assertion gets a recorded mutation that turns it red.** Four
  guards in this project have at some point reported success while examining
  nothing; the tell was always a number nobody read.

## 7. Risks

**Claiming a green suite as evidence for Part B (highest).** It is the most
damaging output this phase can produce, because it is indistinguishable from
success until someone finally looks. Mitigation: Part B tasks state their
evidence as "a human compared it" or they do not ship.

**The merge changing collision.** Mitigation: collision reads `world.grid` and
`world.wallSegs`, never the scene; assert that explicitly, and let the traces'
camera track catch a movement change.

**Fixing KNOWN-7 revealing that the casing art is wrong.** It has never been
seen; it may not look good. That is a legitimate outcome and belongs in
`docs/known-issues.md`, not in a silent revert of the fix.

**Scope creep into Phase 3.** The roster cut, 8-directional sprites and enemy
redesign are Phase 3's, per the 2026-08-29 direction amendment.

## 8. What this phase leaves broken

- Enemies remain single-facing billboards (Phase 3)
- No pathfinding — enemies still snag on corners (Phase 3)
- Levels 2-7 still share one copy-pasted layout (Phase 4)
- Six bosses still share `priestThink` (Phase 5)
- Enemy names still reference Doom/Hexen monsters (Phase 3)
- KNOWN-13's fifteen duplicate enemy interfaces (Phase 3)
