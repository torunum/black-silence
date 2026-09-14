# Phase 2B — variable ceiling height

One task. The first piece of Phase 2 Part B, and the only one of its three that
does not have to wait for the Three.js decision.

## Why this one, and why now

`docs/superpowers/specs/2026-08-31-phase2-world.md` §5 lists Part B as shadowed
lighting (5.1), variable ceiling height (5.2), gothic trim (5.3), and the
Three.js upgrade (5.4) — and it says plainly: **do 5.4 first**, because 5.1 and
5.3 are tuned by eye and tuning them against r128 and then upgrading means
tuning twice.

5.4 is now a decision sitting with the project owner (branch
`phase-2b-threejs-evaluated`, three options, all compared on screen). So 5.1 and
5.3 wait.

**5.2 does not.** Ceiling height is geometry, not light. It survives a renderer
swap unchanged, so building it now costs nothing if the upgrade lands later.
And the spec calls it "partly structural — a grid can assert the geometry
matches the map", which is the half this environment has always been able to
check.

`docs/direction.md` makes it the signature requirement: level 2 is *"the
signature level — cathedral, vertical, nave"*, and a cathedral is a cathedral
because of its ceiling.

## What exists today, measured

```
src/world/Grid.ts        WALLH = 3.4          one wall height, whole game
src/world/LevelLoader.ts ceiling = ONE PlaneGeometry(GW*CELL, GH*CELL) at y=WALLH
                         floor   = ONE PlaneGeometry, same size, y=0
                         walls / pillars / platforms — already InstancedMesh (Phase 2A)
src/world/LevelBuilder.ts hmap?: number[][]   carried to world.heightMap
src/world/Collision.ts    floorHeightAt()     reads world.heightMap
```

So the level format already carries a per-cell height map, and it drives the
**floor** — raised platforms and collision. There is no ceiling equivalent; the
ceiling is one flat plane and nothing can vary it.

## The design, and the one constraint that shapes it

**Ceiling height is opt-in per level.** A level that carries no ceiling map
builds exactly the single plane it builds today, with the same geometry, the
same material and the same scene-child count.

That is not a stylistic choice. Three committed trace fixtures record the scene
graph of the prologue, level 1 and level 2, and **none of them may move in this
task.** Opt-in makes that automatic rather than something to verify frame by
frame: if the levels those fixtures record carry no ceiling map, their scene
graphs are untouched by construction.

Demonstrate on **level 3 — THE NECROPOLIS**, which no fixture records, and
which `direction.md` already singles out: *"its `hmap` tiering is the best
vertical work in the reference; build on it."* Verticality is that level's
existing theme, so a raised ceiling belongs there rather than being imposed.

**Do not touch level 2.** It is the cathedral, and it is also the level
`trace-level2-boss.json` records. Phase 4 rebuilds it by hand; this task builds
the mechanism that rebuild will use.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **No trace fixture may be regenerated.** If one moves, the opt-in default has
  leaked — stop and find out why rather than regenerating.
- No `src/` file over 400 lines. `LevelLoader.ts` is the largest at ~352 and
  this task adds to it — **check before and after, and extract rather than let
  the gate fail.**
- No import cycles: `npx madge --circular --extensions ts,js src/`, and read the
  "Processed N files" line (~90). **The bare form scans zero files and still
  reports success** (KNOWN-12).
- `npm test` before committing — it runs `tsc --noEmit` first. Final run cold.
- Node is not on PATH: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game renders in the Browser pane** — see `docs/STATUS.md`'s corrected
  Environment note. Screenshots reliably force a frame; sustained rAF does not.
  So this task can and must be looked at, but do not build a measurement loop
  that depends on many consecutive frames.

---

## Task 1 — a ceiling that can vary

### Step 1: the data path

Add an optional per-cell ceiling map to the level format, alongside `hmap`.
Follow `hmap`'s shape and naming so the two read as siblings — it is carried
from the level builder to `world`, exactly as `hmap` is carried to
`world.heightMap`.

Decide and state whether a cell's value is an absolute height or an offset
above `WALLH`, and why. An absent map, an absent row and an absent cell must
all mean "the height this level already had".

### Step 2: the geometry

Where a level opts in, the ceiling stops being one plane.

**Instance it.** Phase 2 Part A collapsed 202 per-cell objects into three
`InstancedMesh`es for exactly this reason, and the platform instancing in
`LevelLoader.ts` — a unit box scaled per instance — is the closest model.
Re-introducing a mesh per ceiling cell would undo that work.

**The risers are what makes it read.** Where two adjacent cells have different
ceiling heights, the gap between them must be closed by a vertical strip, or a
taller nave is just a hole in the roof with the skybox showing through. Getting
this wrong is the most likely way the task produces something that passes every
assertion and looks broken, so build it deliberately and **look at it**.

### Step 3: the coupling nobody would guess

`WALLH` is not only a wall height. Grep it: it is also used as **the ceiling
clamp for things that fly**.

- `src/fx/ProjectileTick.ts` ends a projectile when `my > WALLH`
- `src/weapons/Hitscan.ts` uses it
- `src/player/Interact.ts` and `src/enemies/ai/Attacks.ts` use it for door
  animation and audio positions

If the ceiling rises and these do not, **a fireball vanishes in mid-air at 3.4
units inside a ten-unit nave** — a bug that no geometry assertion would catch
and that looks like a rendering glitch rather than a clamp.

Work out which of those sites are genuinely "the ceiling above this point" and
which are "the wall height" and must stay constant. **They are not the same
question, and getting it backwards breaks doors.** Say in your report what you
decided for each site and why.

A `ceilHeightAt(x, z)` sibling to `floorHeightAt` is the obvious shape; check
whether it creates an import cycle before committing to it.

### Step 4: demonstrate on level 3

Raise the ceiling over part of level 3, in a way that follows the level's
existing vertical structure rather than being sprinkled on. Keep it modest —
this task builds the mechanism, and Phase 4 authors the real shapes when it
rebuilds levels by hand.

### Step 5: assert the structural half

- a level with no ceiling map builds the same single-plane ceiling it builds
  today — same child count, same geometry type
- a level with one builds geometry matching the map, cell for cell
- the riser strips exist wherever adjacent cells differ
- the flight clamp follows the local ceiling, not `WALLH` — assert this at the
  call site, not only on the helper. `tests/integration/` has the pattern for
  a wiring test, and Plan 0F's lesson was that proving the mechanism and
  proving the loop drives it are two different tests.

### Step 6: look at it

Start the dev server, load level 3, and take screenshots under the raised
section and at the transition. **Put what you saw in your report**, including
if it looks wrong. A screenshot of a hole in the ceiling is a better outcome
than a green suite and no picture.

This is the first task on this project able to do this. Use it.

### Prove it

Mutations, each turning a **named** test red:

- delete the riser generation → the risers test
- make the flight clamp read `WALLH` again → the wiring test from Step 5
- give a level a ceiling map and have the geometry ignore it → the geometry test

### Commit

`git commit -m "feat: ceilings can vary in height, per cell, opt-in per level"`

---

## Definition of done

- A level can specify per-cell ceiling height; levels that do not are byte-for-byte
  unchanged in scene graph, and all three fixtures are untouched.
- Ceiling geometry is instanced, not a mesh per cell.
- Risers close every height transition.
- Things that fly respect the local ceiling; doors and audio still use the wall
  height where that is what they meant.
- Screenshots in the report, of the raised section and of a transition.
- `npm test` clean; madge over ~90 files; no `src/` file over 400 lines.
