# Trim, finished: loader headroom, theme bands, pointed arches

Three tasks, in order — each depends on the one before.

Phase 2 Part B shipped gothic trim — pillar bases and capitals, wall plinths and
cornices — and recorded two gaps honestly: the courses reuse the wall texture,
so they are **busy on the prologue's hell walls and near-invisible on the flesh
level**; and **pointed arches**, the most distinctly gothic element, were left
out on purpose because doors sink into the floor when they open.

Both gaps are blocked by one constraint recorded in `docs/STATUS.md`:
`src/world/LevelLoader.ts` is at **399 of its 400-line hard gate**.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/`, read the "Processed N files"
  line (~94). The bare form scans zero files and still reports success.
- `npm test` before every commit; it runs `tsc --noEmit` first.
- **The game renders in the Browser pane.** Read `docs/STATUS.md`'s Environment
  gotchas first: stale modules (reach the live game through `renderState.scene`,
  reload for a clean state, enter levels through the real menu), the collapsed
  framebuffer (`drawingBufferHeight` sometimes reads 1 — guard pixel
  measurements), and `renderer.info` resetting after the shadow pass.
- **Trace fixtures**: Task 1 must not move any. Tasks 2 and 3 may, because they
  change what the scene contains; follow each fixture's own regeneration
  procedure, and **camera and HUD must be identical at every frame** — none of
  this work can move the player. If camera or HUD moves, something drew from
  the seeded RNG; find it.
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- Leave nothing untracked in the repo.
- **No `Co-Authored-By` in commit messages.** The owner is the sole author.

---

## Task 1 — headroom in the loader

Move a self-contained piece out of `src/world/LevelLoader.ts` into its own
module. **No behaviour change at all.**

The natural candidate is `spawnProp` — exported, self-contained, about 43 lines,
called from `loadLevel`'s dispatch. The platform instancing block inside
`loadLevel` is the alternative. `src/world/Ceiling.ts`, `src/render/Shadows.ts`
and `src/world/Trim.ts` are the precedents for shape and naming. Note that
`src/world/Props.ts` already exists and holds prop *damage*; decide whether
spawning belongs there or beside it, and check the import graph either way.

**Every existing test must pass unchanged, and no fixture may move.** This is a
move, not an edit. Leave the loader with real headroom — say how much.

`git commit -m "refactor: move prop spawning out of the level loader"`

---

## Task 2 — a stone band per theme

The courses reuse the wall texture of whatever theme a level uses. Give trim its
own band texture per theme — a plain dressed-stone band that reads on stone
walls, on hell walls and on flesh walls.

Procedural, per the asset policy. **Two traps, both measured on this project:**

1. **Do not add the new textures inside `buildTextures`.** `tests/behavior/textures.test.ts`
   compares `buildTextures`'s entire canvas call log against the frozen
   reference, call for call. Build the bands in a separate function.
2. **Do not draw from `Math.random()` to make them.** Textures are built at boot,
   and the trace harness seeds `Math.random`, so every draw a texture makes at
   boot shifts every gameplay draw after it — the same coupling as KNOWN-20 and
   Phase 2A's `generateUUID` finding. Use a deterministic pattern or a locally
   seeded generator of your own.

Also: `digestScene` names textures from three registries (`PX`, `ITEMTEX`,
`TEX`) and gives anything else a stable `unnamed#N` in first-seen order. **Put
the band textures in a named registry** so the fixtures stay readable and the
`unnamed#N` numbering does not shift.

Look at all three themes on screen, before and after: the prologue (hell), a
stone level, and the flesh level. The goal is that the band reads everywhere and
is busy nowhere. Say honestly if it does not.

`git commit -m "feat: trim gets a stone band of its own on every theme"`

---

## Task 3 — pointed arches over doorways

**Read how doors work before designing anything.** A door cell (`+`, `D`, `S`)
is a full-height box filling the whole cell, and `doorTick` sinks it into the
floor when it opens. There is no wall above a door. So an arch cannot sit on a
wall above the opening — the opening is the full height of the cell.

What an arch can be: a pointed-arch *head* filling the top of the door cell's
opening, from a springline down near two-thirds height to a point at the top,
inset just inside the cell faces so the closed door hides it and the sinking
door reveals it. With a two-unit span, a head that rises about a unit above the
springline makes a properly pointed arch. That is a sketch, not a spec —
measure `CELL`, `WALLH` and the door's sink depth and design against them.

Decisions to make and state:

- **Secret doors (`S`) get no arch.** An arch over a wall that is secretly a
  door is a sign saying "secret here". The course work already went to lengths
  to avoid exactly that.
- Plain (`+`) and locked (`D`) doors: yes.
- Flesh doors are a separate door texture; decide whether a stone arch belongs
  on them or whether the arch follows the theme band from Task 2.
- **The closed door must hide the arch completely** — check for z-fighting at
  the inset, which Phase 2B's trim review measured as a real, draw-order-
  dependent flicker at coplanar faces.
- **Collision must not change.** Arches are visual; `Collision.ts` reads the
  grid, never the scene. Projectiles clamp against the ceiling, not the arch —
  say whether that matters for a shot fired through a doorway.
- **Instance it.** One object per level at most, however many doors.

Look at it: a closed door, a half-sunk door, and an open doorway, at minimum on
level 1 and level 2 (the church, where it matters most).

`git commit -m "feat: doorways have pointed arches"`

---

## Definition of done

- `LevelLoader.ts` has real headroom, by a pure move.
- A trim band that reads on every theme, built deterministically, in a named
  registry, outside `buildTextures`.
- Pointed arches over plain and locked doors, none over secrets, hidden by a
  closed door, instanced, collision untouched.
- Fixtures regenerated only where contents changed, each with analysis; camera
  and HUD identical throughout.
- Before/after frames for every visual change, with an honest verdict.
- `npm test` clean; madge over ~94 files.
