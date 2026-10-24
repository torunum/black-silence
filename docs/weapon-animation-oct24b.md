# Weapon animation refinement — 24 October 2026

The sniper's bolt hand now shares the bolt's pivot, roll and slide during its grasp. The Soul Cannon's core fades into its depleted state and regains its charge continuously across reload phase 0.34–0.44. Native ammunition, firing, reload duration and sound-event timing are unchanged.

Actual reload footage also exposed a support forearm ending in mid-screen. The painted sleeve now continues beyond the original bitmap quad to the viewport edge. The original hand/cuff quad, texture and anchors remain intact. Additional distal polygons are clipped against the near plane and all four viewport edges; they do not enlarge the original quad or weaken its depth test. This applies to each weapon using the existing sleeve assets.

## Actual game evidence

- [Sniper/Soul motion with game audio](weapon-animation-oct24b/sniper-soul-motion.webm): 8.265 seconds captured on intermediate `b86c3b0b`, actual RAF, native fire/reload and keyboard switching. QA grants inventory and removes enemies; no scripted view pose.
- [Before: floating support sleeve](weapon-animation-oct24b/sniper-sleeve-before.png) on intermediate build `791b9d33`.
- [After: continuous support sleeve](weapon-animation-oct24b/sniper-bolt.png) on intermediate candidate `b86c3b0b`.
- [Soul charge renewal](weapon-animation-oct24b/soul-renew.png).

These are game captures, not target artwork. Capture and encoding metadata are in the adjacent JSON files. The clip's video granularity is 40 ms; physical sound-output latency was not measured.

## Verification and provenance

Final candidate SHA-256: `9cecdb74a11b616d9bfe12c031f2ff1c3e543f103cbc21dba6f280fdecd0e1f9`.
Viewmodel source SHA-256: `18b4702798eb4f7e8ebcac6316f097ab400add66e056f3895f2dadac4f4b355b`.

- [All ten actual reload/fire/switch/kick/cache checks](verification-data/animation-oct24b-runtime.json) passed on the final candidate.
- [Sleeve sweep](verification-data/animation-oct24b-sleeve-extremes.json): 594 poses, finite projected triangles and no page errors. 371 weapon poses intentionally gain distal sleeve pixels; 223 cases are identical, including all tested boot and finisher cases. This is not an all-weapon pixel-equality claim.
- [Earlier contact-only comparison](verification-data/animation-oct24b-contact-parity.json): 616 cases, 579 identical and 37 intended Sniper/Soul changes, no unrelated differences. This precedes the sleeve extension.
- [Build integrity](verification-data/animation-oct24b-build.json): exact live source embedding, unchanged bundled engine and Village extension, two identical builds, eight malformed-input refusals without writing.

The final sleeve sweep compares the contact-only renderer candidate `16aeaf09` (source `accecb3d`) against final combined `9cecdb74` (source `18b47027`). Its evidence must not be described as comparing the final combined build against the preceding public release. The clip and four original 16:9 screenshots were captured on intermediate `b86c3b0b`; they demonstrate the same contact, charge and sleeve changes before the ultrawide presentation correction. Their provenance is retained rather than relabelled as final captures.

The native weapon canvas is narrower than an ultrawide viewport. A separate sleeve-only side buffer now continues the distal material beyond that rectangle without scaling the weapon. Its transparent middle never covers the original canvas; it reuses the same perspective sampler. Margin capacity is fixed per viewport bucket, with a 32-pixel sway reserve, and is absent when the native canvas already covers the viewport. [Final ultrawide capture](weapon-animation-oct24b/sniper-ultrawide-final.png) and [nine native poses, three zoom/reload transitions and resize return](verification-data/animation-oct24b-aspects.json) confirm the final build.

## Measured rendering cost

[Serial ABBA observations](verification-data/animation-oct24b-performance-summary.json) compare previous release `41f96467` against `9cecdb74`, on the same host at 1280×720 with actual reloads. Median frame time remained 18 ms. Reload mean FPS was Sniper 54.16→50.80, Soul 53.23→54.06, Rifle 56.00→55.93 and Cross 54.79→52.61. Sniper/Cross frame p95 increased to 35.6 ms; their additional sleeve coverage has a measurable rendering cost. This is a visual/contact correction, not an overall FPS improvement. The full raw runs are retained in [the performance report](verification-data/animation-oct24b-performance.json). Ultrawide is functionally tested, not covered by this performance comparison.

The supported native reloads and aspect ratios are tested separately. Arbitrary camera-space poses outside normal gameplay are not a promise: the sleeve tail has a finite extension cap and the original glove quad retains its existing near-plane guard. The artwork remains articulated 2.5D surfaces with volumetric backing; this change does not turn it into a fully sculpted arbitrary-view human arm.

Reproduction: `node tools/viewmodel-sleeve-tests.cjs before.html after.html output-directory`. The report records immutable input and instrumented fixture hashes, classifies intentional weapon differences and fails on non-finite triangles, boot/finisher differences or page errors.
