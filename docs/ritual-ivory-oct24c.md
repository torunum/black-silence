# Arena ritual standards — 24 October 2026

The two existing ritual standards in the prologue arena had broad, untextured pale caps and ribs. These surfaces now share one warm, stained ivory texture with restrained grain and hairline cracks. Their existing bases use the arena's existing basalt material. Geometry, transforms, red cloth, lights and object placement are unchanged.

- [Before, native camera and zone lighting](ritual-ivory-oct24c/before-arena.png)
- [After, matched camera](ritual-ivory-oct24c/after-arena.png)
- [Native pixels enlarged for material inspection](ritual-ivory-oct24c/after-detail.png)

The blue-white shield near the foreground standard is the original armor pickup at map cell (33,54), not part of the standard. Its appearance and gameplay are intentionally unchanged. Floor bones and all other native bone/oldbone materials are unchanged.

## Scope and resource evidence

Approved prologue source SHA-256: `34e26edbff17862cb40142b3a167187f9379ec8ef25d414773da28a63847561a`. Before source: `7d94d4e54dbc0df11a2f29650e9129c9690d722bed0ffc556ac923d9f5200109`.

The paired images use baseline HTML `9cecdb74a11b616d9bfe12c031f2ff1c3e543f103cbc21dba6f280fdecd0e1f9` and environment-only candidate `4d3c15d980075a7c2b25d0bfc6d7912d8ead03fb0d55f07d5eaae2b5a5b4db86`. They show the isolated material change, before the minor lava-flow UV variation. They do not document any later combined release changes to weapons. Captures use the native standing eye height, camera/player alignment, fog and ambient zone settings.

[Map and geometry assertions](verification-data/ritual-ivory-oct24c-invariants.json) compare the entire generated map, including terrain, heights, encounters, pickups, lights, decor and themes. Both standards retain exactly the same dimensions and transforms; only their authorized material names change. Native bone/oldbone/rock/cloth material routing remains unchanged. The 32×64 opaque texture is created through the native canvas helper, reused within a map and replaced on map rebuild. No external image, new light or additional geometry primitives are introduced.

[Before resources](verification-data/ritual-ivory-oct24c-before.json) and [after resources/lifecycle](verification-data/ritual-ivory-oct24c-after.json) record one additional texture/image and one additional material/geometry batch: 52→53 scene textures, 48→49 source images, 233→234 materials, 157→158 geometries. Rendered draw calls were unchanged at the three sampled views (arena 68, pyre 72, bridge 199); this does not establish an FPS improvement or identical cost at every view.

The resource test explicitly includes the new ivory texture. Across five next-chapter/return cycles, all eight tracked scoped textures were disposed on departure, no disposed texture was reused, and the next chapter contained no scoped material/texture references. The returned resident texture count remained 59. No runtime errors occurred. Existing prologue topology, pickup, hint, pause/death and reload checks also passed.

Reproduce with `node tools/ritual-material-tests.cjs baseline.html before-prologue.js after-prologue.js report.json` and `node tools/hell-material-resource-tests.cjs candidate.html output-directory after`. The material test requires explicit immutable inputs; it does not depend on a private inspection cache.

## Minor lava-flow texture variation

The five existing lavafalls now have a small deterministic horizontal UV variation across their existing rows. This breaks up perfectly straight strands without rebuilding the section. Maximum measured U change is 0.03939; positions, geometry, V coordinates, repeat values and native scrolling speeds are unchanged. No texture, material, light, mesh or per-frame loop is added. The final prologue source is `c7614fb312a6171350279bc2cd7cfbc27984c60e13d8d5ddfdf944ffb36176c7`.

[Before](ritual-ivory-oct24c/before-flow.png) and [after](ritual-ivory-oct24c/after-flow.png) show the same native camera, zone lighting and controlled animation phase 0.5. Three phases (0, 0.5, 1) were checked; these are controlled captures, not a real-time video. A separate unpaused RAF check verified that native time and scrolling offsets advance.

[Scope report](verification-data/lava-flow-oct24c.json), [before samples](verification-data/lava-flow-oct24c-before.json) and [after samples](verification-data/lava-flow-oct24c-after.json) preserve exact inputs. Geometry, V, repeats and same-phase offsets match; next-chapter falls are unchanged and returning restores identical UVs. At the matched bridge view, resource counts remain 158 geometries/49 textures and rendered counts remain 199 calls/176078 triangles/2008 points. This is not a frame-rate claim. The map/prologue test also passed after the change.

Reproduce this isolated UV comparison with `node tools/lava-flow-tests.cjs before.html after.html output-directory`; both HTML inputs must remain outside the output directory.
