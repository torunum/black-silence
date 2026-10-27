# Reference-based arsenal revision — 27 October

All ten weapons were compared with the existing target artwork. Eight received local model or material changes. The previously approved handgun and Cross remain unchanged. The game still uses articulated reference-derived 2.5D surfaces with native depth-tested backing; these changes do not turn it into an unrestricted-view 3D reconstruction.

| Weapon | Main discrepancy and change |
| --- | --- |
| 0 Handgun | Existing skull, grip and reload match the approved direction; preserved exactly. |
| 1 Shotgun | Narrower dark central rib and separate barrel highlight directions make the two rounded tubes easier to distinguish. Existing lockplate, chambers and break-open rig remain. |
| 2 Rifle | Closed steel receiver faces replace the oversized plain upper backing, with a short magwell lip connecting the receiver and magazine. |
| 3 Tommy | Thicker moving drum wall and a fourteen-quad bevel give the drum volume; its fixed feed throat stays in the receiver. |
| 4 Sniper | Deeper wooden fore-end, lower optic and two compact mounting feet replace the high continuous scope platform. Bolt and hand mechanics remain. |
| 5 Cross | Previously approved bronze/ivory structure, hinge and visible shared hand/relic loading path remain unchanged. |
| 6 Nail | A compact steel bridge closes the visual seam between the barrel jacket and copper pressure body. |
| 7 Soul | The curved glass samples more of the target's mottled surface, with a darker rim and less uniform light. Cage, core motion and both hand rigs remain. |
| 8 Dynamite | Two twisted low-face strands replace the plain fuse cord. A tightly masked flame from the existing target adds an orange/white core; lighter, fuse trajectory and ignition timing remain. |
| 9 Stake | The upper pressure cap is more visible and the wooden fore-stock's lower chamfer is slimmer. The approved right-hand anchor and left-hand loading path are unchanged. |

No new image asset was generated. Weapon statistics, ammunition, audio events, native animation durations and Rifle/Tommy seating at phase .60 were not changed. The renderer, glove compositor, boot and finisher paths were not modified. Rejected private grip variants were not installed.

## Evidence and scope

- The weapon-only V4 input is `4edca6147375d48abcf15207c1ec9f363d24dab308fdf8b0e3dd79b5056408cf`, containing viewmodels source `99bd9d094ce38eb0f221a820026ce5ee81e0c192a2b9a8b5b5fa630ac3416aac`.
- Against released `d6101272e6d34d5635d1a75745ad971c4ab07e9d85d5bec7b721e5a7f0813c87`, 660 deterministic comparisons checked raw pixels, the native and side canvases, bounds and presentation position: 192 exact, 468 expected differences limited to the eight revised weapons, zero unexpected differences. Handgun, Cross, boots and standalone finishers remain exact.
- [Independent aspect QA](verification-data/arsenal-reference-oct27-aspects.json) records 135 actual native idle/fire/reload frames and 27 ammunition endpoints across 4:3, 16:9 and ultrawide. It uses the private V4 input, not a relabelled final-build test. The [independent review](verification-data/arsenal-reference-oct27-independent-review.json) separately confirms its source is identical in the combined build.
- Final combined input `17ebe0d27fdcef2eea80b54fbc68ebf0cfa96b51c0244bd2a56e85ac22155d61` passed all-ten actual keyboard reload, fire, switch, kick, cancel and cached-presentation checks. Native engine and embedded modules are checked separately by the standard build integrity suite.
- The small black triangular rail profiles seen above Stake during reload also exist in the released baseline. They were not a newly introduced grip gap. No new hand separation, sleeve cutoff or framing blocker was found in the independent 135-frame review.

The [performance record](verification-data/arsenal-reference-oct27-performance.json) retains all serial ABBA runs at 1280×720 in the same chapter-0 camera, plus a Sniper-only B-A-A-B repeat. That repeat measured candidate reload CPU 12.91/12.07 ms versus baseline 11.68/12.07 ms; the earlier 35 ms frame-tail observation did not repeat (repeat p95 frames about 18.1–18.6 ms). Soul and Dynamite have large run-order variation. This is not a general FPS improvement claim or a guarantee for every chapter or computer.

## Actual game media

The full-viewport and enlarged-weapon sheets contain actual game captures, not target boards or mockups. Cropped sheets are explicitly labelled. The short clip uses uninterrupted real keyboard reloads and captured WebAudio for Tommy, Sniper, Soul and Dynamite. Exact input hashes and file hashes are in [the media provenance](arsenal-reference-oct27/provenance.json).

- [Full viewport contact sheet](arsenal-reference-oct27/full.jpg)
- [Enlarged weapon contact sheet](arsenal-reference-oct27/weapon-crops.jpg)
- [Rifle](arsenal-reference-oct27/rifle-after.png)
- [Soul](arsenal-reference-oct27/soul-after.png)
- [Actual reload clip](arsenal-reference-oct27/reload.webm)

The target artwork remains in `assets/weapon-reference` and `assets/hand-reference`; it is separate from the actual-game evidence above. These tests cover the listed states, not every possible campaign interaction.
