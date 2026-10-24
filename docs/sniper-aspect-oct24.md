# Native Sniper framing checks — 24 October 2026

The aspect fixture preserves the native reload presentation transform. It sets native weapon state/time and supplies only action values; it does not neutralize the weapon's pitch, roll or placement. Nine controlled poses cover 1024×768, 1280×720 and 1680×720 at reload phases 0.12, 0.20 and 0.82. These screenshots are controlled native poses, not recordings of the R key.

Three separate actual keyboard sequences use Z, R and Z at those sizes. The native scoped view intentionally hides the weapon at approximately 32° FOV. Unzoom restores a finite, visible weapon while reloading continues. A 16:9 → ultrawide → 16:9 resize additionally restores the same native model raster byte-for-byte.

All of those functional checks passed on candidate `9a06bd19e7a0f4d8905931d3868c2b59732934e7c8aa1d3f11b07c6903c93360`. The report includes the input hash and verifies that the source HTML was unchanged afterward:

- [Functional results and visual review](verification-data/sniper-native-9a06bd19.json)
- [Ultrawide native pose](weapon-animation-oct24b/sniper-ultrawide-9a06bd19.png)
- [Return to 16:9](weapon-animation-oct24b/sniper-resize-9a06bd19.png)

The preceding candidate `b86c3b0b` passed finite/zoom checks but still showed a straight sleeve end at the native weapon canvas boundary on ultrawide screens. Its report deliberately records partial visual acceptance. Candidate `9a06bd19` extends only sleeve pixels into those side margins and removes that visible end. The narrower original model raster and weapon scale are preserved.

The subsequent source `18b4702798eb4f7e8ebcac6316f097ab400add66e056f3895f2dadac4f4b355b` quantizes that extra buffer's capacity from viewport dimensions. Independent code review confirmed that normal sway no longer triggers buffer reallocations, the ordinary 16:9 path adds no side surface, the original center is masked out, and the scoped draw wrapper restores its method in `finally`. That later combined candidate has separate final tests; the `9a06bd19` report is not relabeled as a test of it.

Reproduce with `node tools/sniper-aspect-tests.cjs input.html output-directory`. The runner rejects input/output overlap, including case and filesystem aliases, and checks the input hash on completion. Preliminary private images that used neutral presentation transforms were excluded from release framing evidence.
