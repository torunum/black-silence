# Phase 2B — gothic trim

One task. The last of Phase 2 Part B's items, and the most open-ended: the spec
gives it one line.

> ### 5.3 Gothic trim
> Procedural, per the asset policy: no imported models. This is authoring work
> with no automated oracle at all.

"No automated oracle" was the reason this waited. It no longer has to: the game
renders in the Browser pane (`docs/STATUS.md`'s Environment gotchas), so the
look can be checked on screen, which is how the Three.js decision and the shadow
finding were both settled.

## What "trim" means here, concretely

The spec does not define it, so this plan does. Measured against what the level
loader builds today:

```
#  wall     BoxGeometry(CELL, WALLH, CELL)             a featureless box
W  window   the same box plus a flat textured plane
I  pillar   CylinderGeometry(.46, .55, WALLH, 8)       a tapered octagon, no base, no capital
```

Every wall is a plain box and every pillar is a plain tapered tube. Trim is the
stonework at the places the eye lands, and this task does the two that read
strongest for the least geometry:

1. **Pillar bases and capitals.** A cylinder with no base and no capital reads
   as a pipe. A plinth at the foot and a capital at the head read as a column.
2. **Wall courses** — a plinth where wall meets floor, and a cornice where it
   meets the ceiling. The horizontal lines that make a box read as masonry.

### Deliberately not in this task: pointed arches

Arches over doorways are the most distinctly gothic element and the obvious
next step. They are left out on purpose: doors sink into the floor when opened
(`doorTick`), so anything attached to a door moves with it, and an arch must
instead sit on the wall *above* the doorway — a placement question that deserves
its own task. Say so in the report; do not attempt it here.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **Instance everything.** Phase 2 Part A collapsed 202 per-cell objects into
  three `InstancedMesh`es (prologue 237 → 33 scene children, level 1 295 → 93).
  Trim that adds a mesh per pillar or per wall face undoes that work. Each trim
  type should be one `InstancedMesh` per level.
- **`src/world/LevelLoader.ts` is at 398 of 400 lines.** Trim goes in its own
  module. A two-line hook in the loader is the most it may grow — the shadow
  work set the pattern with `src/render/Shadows.ts`, and the ceiling work with
  `src/world/Ceiling.ts`.
- **The three trace fixtures will move**, because trim adds scene children and
  `digestScene` records the child count and a type hash. That is a sanctioned,
  deliberate visual change the traces exist to record. Follow each fixture's
  own regeneration procedure: read which frames diverge and why, confirm the
  divergence is trim and nothing else — **camera and HUD must be identical at
  every frame**, since trim cannot move the player — write the analysis into
  each test file's header, regenerate in the same commit.
- **Phase 3 Part D's structural guard** in `bossTrace.test.ts` has fired on the
  last two regenerations of the level-2 fixture and was right both times. If
  trim changes the boss fight's timing, expect it to fire again and treat it as
  signal.
- **Collision must not change.** Trim is visual. `src/world/Collision.ts` reads
  `world.grid` and `world.wallSegs`, never the scene graph — assert that trim
  leaves both untouched, and that nothing the player can walk into has moved.
- **Shadows**: trim meshes should carry the same cast/receive policy as the
  geometry they decorate, via `src/render/Shadows.ts`. Shadows default off, so
  this costs nothing unless the player turns them on.
- No import cycles: `npx madge --circular --extensions ts,js src/`, read the
  "Processed N files" line (~93). The bare form scans zero files and still
  reports success.
- `npm test` before committing; it runs `tsc --noEmit` first.
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **No `Co-Authored-By` in commit messages.** The owner is the sole author.

---

## Task 1 — pillars that read as columns, walls that read as masonry

### Step 1: design it from the renderer

This game renders a few hundred pixels wide, `NearestFilter` everywhere, no
antialiasing. **Trim that is thinner than a couple of rendered pixels at normal
viewing distance will shimmer or vanish.** Decide proportions against that, not
against how it would look at full resolution. State what you chose and why.

Reuse the existing wall and pillar textures, or procedural variants of them, per
the asset policy — no imported geometry or images.

### Step 2: where it goes

- **Pillars**: a base and a capital on every `I` cell.
- **Wall courses**: along wall faces that border walkable floor. A wall face
  against another wall is never seen — do not put trim there. Work out which
  faces are exposed from `world.grid`.
- **Doors and secret doors** (`+`, `D`, `S`): decide. A plinth running across a
  closed door that then stays behind when the door sinks would look wrong. Say
  what you decided.
- **Levels that opt into the ceiling map**: the cornice sits under the ceiling,
  and the ceiling is not at `WALLH` everywhere on those levels. Handle it or
  exclude it deliberately — do not let a cornice float in mid-air under a
  raised vault.

### Step 3: look at it

The half this task exists for. Matched before/after frames at a fixed camera —
at minimum a pillar hall and a plain corridor, on two different levels. Screenshots
force a frame; see `docs/STATUS.md` for the recipe, the stale-module warning,
and the framebuffer-height hazard (`drawingBufferHeight` sometimes reads 1 —
guard any pixel measurement on the buffer being a sane size).

Put what you saw in the report, **including if it looks worse**. Trim that makes
the game busier or muddier is a finding, not a failure.

### Step 4: prove it

Mutations, each turning a **named** test red:

- remove the pillar trim → a named test
- put wall trim on a face with no walkable neighbour → a named test
- have trim touch `world.grid` or `world.wallSegs` → the collision test

And the instancing claim: assert the number of trim scene children per level is
a small constant, not proportional to the number of pillars or wall faces.

### Commit

`git commit -m "feat: columns have bases and capitals, walls have courses"`

---

## Definition of done

- Every pillar has a base and a capital; exposed wall faces have a plinth and a
  cornice; all of it instanced.
- Proportions chosen for a low-resolution renderer, with the reasoning stated.
- Collision provably untouched.
- Matched before/after frames, and an honest verdict on the look.
- Three fixtures regenerated with written analysis; camera and HUD identical.
- Arches named as the next step, not attempted.
- `npm test` clean; `LevelLoader.ts` under 400; madge over ~93 files.
