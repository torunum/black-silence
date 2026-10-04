# Hell, reworked

The owner, 2026-10-04, after playing the new prologue: "Fix the hell part of the
prologue — it's really bad there. The textures don't feel good at all."

## What exists, measured (screenshots in `.superpowers/sdd/2026-09-27-feedback-2-prologue/`)

The hell zone wears the frozen reference's three hell textures
(`src/render/ProcTextures.ts`, `TEX.hellWall/hellFloor/hellCeil`):

- **Wall:** a regular brick grid with five straight orange lines and four
  straight yellow lines drawn across it. Tiled on every wall face, it reads as
  a wire fence or a cage, not rock.
- **Floor:** red noise with seven straight random lines — scratches, tiled.
- **The lava pit's floor:** the same tiled floor. It does not read as lava.
- Everything is one uniform red-brown noise; the tiling repeats visibly.

## Global Constraints

- `reference/sonsurum.html` is never edited. **Do not change `TEX`'s hell
  textures** — `buildTextures` is pinned call-for-call to the reference and
  draws from the seeded `Math.random` at boot. Build the new hell surfaces in
  a separate named registry (the precedent is `DRESSTEX` in
  `src/render/DressTextures.ts`) with deterministic generation (grid hash /
  local PRNG), and point the prologue's hell zone at them.
- Only the prologue's hell zone changes. No other level, no gameplay value.
- `trace-level0.json` may move (scene digest and count) — follow
  `tests/integration/trace.test.ts`'s header procedure: camera and HUD must
  stay identical; prove it; write the analysis; regenerate. The level-1 and
  boss fixtures must not move.
- Animated surfaces (lava flow) must not allocate per frame and must not draw
  `Math.random`.
- No `src/` file over 400 lines; no import cycles; `npm test` green with exit
  code captured; Write tool for scripts; never `git checkout --`; nothing
  untracked; no `Co-Authored-By`.

## Task 1 — hell that reads as hell

- **Rock walls**: dark volcanic rock, irregular (cellular/Voronoi plates, not
  bricks), with glowing fissures that follow the plate edges and fade with
  depth; varied per wall so the tiling does not show (several variants, or
  world-space variation).
- **Floor**: scorched, cracked ground — charred plates, ash, glowing cracks.
- **Lava**: the pit becomes real lava — bright, emissive, a dark cooling
  crust breaking over molten yellow-orange, slowly flowing (animated UV or a
  per-frame texture update within budget), lighting the pit walls from below.
- **Ceiling**: dark rock, faint glow, not a flat sheet of noise.
- **Trim and bridge** in hell: the trim band and the bridge should belong to
  hell (basalt or charred stone), not a dungeon band.
- **Dressing**: break the box walls — rock outcrops, stalagmites, spikes,
  bones, chains, burning braziers, a lava fall if it can be done cheaply.
- **Light and fog**: tune hell's fog and ambient so the lava is the light
  source and depth reads.

Look at it in the Browser pane from the crypt stair's foot, on the bridge, in
the pit, and at the climb; before/after from the same spots. Say honestly how
it reads.

Commit: `feat: hell is rock and fire, and the pit is lava`
