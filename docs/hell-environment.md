# Prologue hell environment

The hell section follows a screenshot-led DreamLoop pass: the existing bridge view was used to generate an in-engine visual target, then geometry, materials and lighting were iterated against independent scene-only reviews. The frozen round 23 review scored **8.1/10** (composition 2.7, lighting 2.2, materials 2.5, detail 0.7). This is an acceptance score, not a claim that the rendered scene exactly matches the generated target.

The final scene has pointed, layered vaults, recessed side aisles, three-lancet altar walls, broad basalt paving, lava outlets and suspended braziers. Floor heights, the pre-existing gameplay grid, pickups, enemies, doors and exits are retained. Visual ceiling heights change only in open hell cells. Added architectural props have no collision mass; the actual movement test validates clearance separately.

## Assets and offline loading

- Reference target: `assets/hell/reference-target.png` (also `.dream-loop/hell/target.png`), generated from `.dream-loop/hell/baseline-bridge.png`.
- `assets/hell/material-atlas-v1.png`: wall stone, bronze and glowing glass quadrants.
- `assets/hell/material-atlas-v2.png`: only its upper-right paving quadrant is used. The other three quadrants remain sourced from v1.
- `tools/compile-hell-materials.cjs` box-averages these tiles into four 128 × 128 RGB buffers embedded in `src/prologue.js`. Runtime decoding is synchronous and requires no image/network fetch.
- Asset provenance is recorded in `assets/hell/provenance.json` and the v2 sidecar.

## Lighting scope and limitation

Hell architecture and the native `hellRock`/`hellGround` meshes receive static per-vertex warm illumination at scene construction. This avoids adding a per-frame light-field calculation or more dynamic lights. The upper vault remains dark while pillar bases, coping and window surrounds receive warm accents.

These tagged static surfaces use unlit materials with baked vertex colors, so **dynamic muzzle flashes do not illuminate those surfaces**. Characters, hands and pre-existing normally lit objects keep their native lighting. Static illumination is not a replacement for dynamic shadow casting. The material substitutions are guarded by level 0 and the current prologue map identity; other levels retain their native surfaces.

## Reproducible verification

Run `node tools/prologue-tests.cjs` for original map topology, floor heights, scoped ceiling/material changes, pickups and hint behavior.

Run `node tools/hell-invariants-test.cjs <baseline.html> <baseline-prologue.js> <report.json>` to compare the current extension against the frozen pre-hell extension. This checks the entire gameplay grid and all map fields other than the intentional decoration, ceiling and hell-theme changes.

Run `node tools/prologue-navigation-test.cjs <candidate.html> <output-directory>` for actual movement through 15 checkpoints, optional shotgun collection, ladder interaction, level-card continuation and next-level material isolation. Enemy AI is active through the first encounter; the remaining route isolates movement, collision and elevation. It is not a full combat balance playthrough. The harness returns to the prologue twice to check material restoration and lack of accumulation.

Final development proofs are `round23-bridge.png`, `round23-bridge-near.png`, `round23-second.png`, `round23-arena.png` and `final-navigation/` under `.dream-loop/hell/`. They show real runtime frames. Weapons in the private environment fixture may precede the final combined weapon build; the environment review excludes weapon/HUD appearance.

Frozen environment source SHA-256: `D2BA561BA361D9764CDEFD1FC7731C2C0697BB208A41E12F4C739A52C15E9084`.

Final verification passed: 15 movement checkpoints, E ladder animation, level card and actual next-chapter arrival (native level index 9), with no browser errors. That chapter contains zero baked hell materials, scoped hell texture references or crypt ember objects. Returning to the prologue twice restores the same 8 baked meshes, 3 scoped surface references and 2 ember objects. The complete gameplay grid and floor elevations match the frozen pre-hell prologue. Exactly 1,338 open hell ceiling cells are intentionally raised. Reports: `docs/verification-data/hell-navigation.json` and `hell-invariants.json`. Performance is assessed separately on the final combined build.

## 24 October scoped refinement

The accepted cathedral architecture and gameplay map remain unchanged. The native hell pyres previously rendered their large flames as solid pale cones. Those three flame volumes now use two crossed, alpha-tested cutouts apiece inside the original diameter/height bounds. A single native pixel texture supplies irregular tongues and a small yellow core (22 × 32 authored pixels; the existing Jn helper uploads 66 × 96). The cutout texture is static; the existing native particle emitters provide movement. No new lights or emitters were added. Depth writing stays enabled and alphaTest is 0.15, so the transparent card corners do not cover the scene. The flame material is used only by pyres in prologue hell cells; chapel flames and other chapters retain their native material and geometry.

Atlas source textures are shared within one prologue build, with repeat/name-specific clones kept separate. The cache is reset before the next prologue build, matching the native map disposal lifetime. This avoids retaining a disposed texture after leaving and returning.

At the same three-camera sequence on this host, scene texture handles changed from 53 to 52, unique source images from 51 to 48, and renderer-resident textures from 50 to 48. The new flame material adds one batched mesh/material; these resource counts do not establish an FPS improvement. Five next-chapter/return pairs disposed all tracked hell textures, reused none of the disposed instances, and leaked zero tagged hell materials to the next chapter. After the first transition, the resident texture count stayed at 59 across all five returns; the first-view count and return count have different native allocation histories.

Verification passed: unchanged complete grid, floor, ceiling and 787 decor entries against the preceding release; unchanged native pyre emitter data and 18 native decor lights; exact non-hell flame geometry/material data and next-chapter flame/emitter parity; 15 movement checkpoints, E exit, native level 9 arrival, return/load isolation and 20 finite visible weapon poses at the arena. Private candidate SHA: 80d9f77f5209f2da0c5d1a108ffc6d1c6244360fea6cb6cbb5c7f437c5235632. Updated prologue source SHA: 7d94d4e54dbc0df11a2f29650e9129c9690d722bed0ffc556ac923d9f5200109. The private candidate changes only prologue, not the concurrent weapon/combat improvements.

Same-camera evidence and source hashes: [before/after provenance](hell-refinement-oct24/provenance.json), [before arena](hell-refinement-oct24/before-arena.png), [after arena](hell-refinement-oct24/after-arena.png). Detailed reports are verification-data/hell-refinement-oct24-{before-resources,after-resources,invariants,scope,navigation}.json. The portable resource/capture harness is tools/hell-material-resource-tests.cjs; the tested private harness has the same capture/lifecycle logic.
