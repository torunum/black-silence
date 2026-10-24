# Renderer verification — October 24, evening pass

The compositor remains unchanged from source SHA-256 `18b4702798eb4f7e8ebcac6316f097ab400add66e056f3895f2dadac4f4b355b`. The separate [Combat Rifle reload framing change](rifle-reload-oct24c.md) updates the final viewmodel source to `e9e098dc1cd5d0627c1ab47c4da255e5bb93f2e581326ceb5a849b60927a95e6`. No general frame-rate improvement is claimed for this pass.

Private compositor experiments tested dirty-row bounds, side-buffer clipping, division hoisting and texture sampling branches. The division-hoisting prototype changed exact texel/depth results and was rejected. The otherwise pixel-equivalent alternatives did not produce a consistent actual-reload improvement across Sniper, Cross and the ultrawide check, so none was installed. These are experiments against release `9cecdb74…`, not measurements of the final environment update.

The maintained `tools/viewmodel-kernel-tests.cjs` now recognizes the shipped compositor's optional surface argument and requires unique, ordered extraction boundaries. It checks raw RGBA, simulated canvas uploads, compositor depth and dirty bounds on both the main and side buffers. Its 3,600 deterministic cases include empty/degenerate triangles, texture/alpha boundaries and signed or zero sleeve directions. It also refuses report paths that alias an immutable input through casing or a filesystem junction.

Validation:

- Baseline/current-release comparison: all 3,600 cases equal.
- Direct, case-variant and junction-aliased output collisions: all three refused; input hashes unchanged.
- Deliberately inexact reciprocal prototype as a negative control: 156 cases detected as different. This expected rejection confirms the comparison is sensitive to the numerical changes being investigated.

Reports: [kernel equality](verification-data/renderer-oct24c-kernel.json), [immutable-input guards](verification-data/renderer-oct24c-guards.json), [negative-control summary](verification-data/renderer-oct24c-negative-control.json). These are compositor correctness checks, not proof that every gameplay state is bug-free.
