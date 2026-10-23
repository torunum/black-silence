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
