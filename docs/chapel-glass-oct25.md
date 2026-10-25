# Chapel glass surface — 25 October 2026

The existing broken chapel window now uses one shared 32×64 opaque grayscale surface texture. Broad facets, sparse cracks and small glints modulate its original wine, smoke and old-gold colors. The window silhouette, missing shards, geometry, opacity, lights and map layout are unchanged. The separate amber material is excluded.

This is procedural native pixel artwork in `src/prologue.js`, not an externally generated image. It adds one map-owned texture, no extra materials, geometry or lights, and no per-frame texture update. No FPS improvement is claimed.

## Matched game captures

[Before](chapel-glass-oct25/before.png) · [After](chapel-glass-oct25/after.png) · [Wider chapel view](chapel-glass-oct25/after-wide.png)

These are actual 1280×720 file-offline game renders with the same native standing eye, camera, Flare weapon and settled churchyard zone lighting/fog. They are paused comparison frames, not a real-time animation recording. The historical before HTML is `6dd69003987fadb8c4b405d3e94d3833e303d37a86484e33c4ed2fb556c75c99`; the environment-only after HTML is `cd5579d71ec3675a30e9811b89c666df2d3187ac47e0a39f3cb3f95d2f0b1a6c`. The after source `b0107518140492cc18c4cd7bd41b1e342359ceccf558e9ed1dee22942add3773` is also used by the combined release. Exact media hashes are recorded in [provenance](chapel-glass-oct25/provenance.json).

## Scope and resource checks

[VM invariants](verification-data/chapel-glass-oct25-invariants.json) prove identical generated map data, chapel primitive geometry/transforms/material IDs, original glass colors, tone mapping and unrelated material routes. All three glass groups share one texture; its cache resets for a new map.

[Actual five-cycle lifecycle](verification-data/chapel-glass-oct25-lifecycle.json) alternates prologue and native next chapter. Every cycle disposes all nine scoped textures, leaves no scoped tags in the next chapter, and reuses no disposed texture. Returned resident texture count stays at 44. In the matched chapel scene, scene textures increase 53→54 and source images 49→50; material count stays 234. Sampled renderer geometry count remains 126 and resident textures increase 46→47. These resource counts are not performance measurements. No browser errors occurred and the input HTML remained byte-identical.

Portable checks accept explicit immutable inputs and separate outputs:

```sh
node tools/chapel-material-tests.cjs before.html before-prologue.js src/prologue.js output/invariants.json
node tools/chapel-material-resource-tests.cjs THE-BLACK-SILENCE.html output/chapel after
```

Historical before inputs can be obtained from commit `baf54e2`. The resource test creates only an instrumented output fixture; it does not rewrite its input. Its deterministic random seed and paused comparison camera are test-only.
