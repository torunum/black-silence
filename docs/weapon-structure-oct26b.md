# Shotgun and Cross structure and loading

Final standalone build: `d6101272e6d34d5635d1a75745ad971c4ab07e9d85d5bec7b721e5a7f0813c87` (24,890,836 bytes). Viewmodel source: `b94143465477341407ed16e3377a7d95159309cea3b5b62fe68c1d887540b910`.

The shotgun skull plate now fits inside a raised oval receiver border. Solid curved hammer profiles remain attached to the original cocking pivots and break-open assembly. Existing reference artwork, overall weapon scale and shell-loading path are preserved.

The Cross has ivory panels inset into a darker bronze structure, a restrained axle and thin bevel edges. Its left hand and red relic move together on a more visible loading arc during the existing .27–.68 phase window. The attach positions, timing, ammunition and sound events are unchanged. The hand remains partially occluded in some views; this is an improvement in readability, not a complete hand or weapon reconstruction.

The final bevel uses four native quad faces instead of dense small limb geometry. A heavier intermediate version was rejected after measurement. Final local Cross ABBA reload CPU was16.86/16.48→18.38/18.02ms and measured FPS48.09/49.55→45.54/45.97; frame p95 stayed around36ms. This remaining quality cost is explicit. These are headless Chrome observations at one chapter0 camera, not a general performance guarantee. All intermediate and final runs, including cold outliers, remain in the compact performance report.

Verification:

- Final d610 actual keyboard R, fire, switch, kick, cancellation and canvas/topRow cache checks passed for all10 weapons.
- Baseline56394→weapon-only163ec, using the exact finalb941 viewmodel source:660 comparisons;540 exact,120 expected Shotgun/Cross differences,0 unexpected. This covers rawRGBA, native/side canvas, bounds and topRow. Handgun, other7 weapons, boots and standalone finishers are exact.
- Final Cross three-aspect actual R:12 frames,3 ammunition endpoints,0 errors. Earlier Shotgun/Cross24-frame and V3 Cross12-frame reports retain their original candidate hashes.
- The path tool verifies exact paired hand/relic translation changes,2,001 finite bounded samples,4 C1 joins and6 unchanged attach/idle endpoints. Final test is V4weapon-onlyf03c→V5weapon-only163ec; it is not relabeled as a whole-game test. Output collision tests preserve immutable inputs.
- Standard build verifies all11 embedded sources and unchanged native engine/Village code,2 idempotent builds and8 malformed-input refusals.
- Enemy/environment native checks ran on intermediate7ff with identical frozen modules. Separate finald610 identity reports establish those exact embedded sources; they do not claim the old runtime checks were rerun.

Actual images and a short native RAF/WebAudio reload clip are in [the media folder](weapon-structure-oct26b/). [Provenance](weapon-structure-oct26b/provenance.json) distinguishes the final combined capture from weapon-only and baseline images. Background RNG and screenshot phase differences are separate from deterministic renderer comparisons. The renderer remains an articulated2.5D system with volumetric backing, not arbitrary-view3D reconstruction.
