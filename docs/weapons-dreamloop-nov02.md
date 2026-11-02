# Weapon reference pass — 2 November

Rifle and Tommy now use the actual right-hand silhouettes from their approved reference board. The index, palm and curled fingers stay attached to the weapon through firing and reload, while the other hand continues operating the magazine, drum and charging mechanism. This replaces the oversized generic grip that previously hid the receiver and trigger area.

| Weapon | Result |
| --- | --- |
| 0 Handgun | Preserved exactly. |
| 1 Shotgun | Broader, separate curved barrel highlights; original barrel/chamber/loading centres retained. The pair still reads flatter than the reference. |
| 2 Rifle | Its own reference index/palm silhouette, a real open rounded guard, and removal of a redundant grip backing that produced detached fragments during reload. |
| 3 Tommy | Its own reference grasp, wooden grip neck and open rounded guard. The small index curl remains less natural than the target. |
| 4 Sniper | Smaller right glove, connected stock-neck contact, and a real guard below the wooden stock. Bolt-contact endpoint preserved. |
| 5 Cross | Audited and preserved exactly. |
| 6 Nail | Audited and preserved exactly. |
| 7 Soul | Ivory cage contours close around the orb while retaining the original hinge roots and UV artwork. |
| 8 Dynamite | Audited and preserved exactly. |
| 9 Stake | Lower, connected grip reveals the brass pressure body and lever; open rounded guard. |

The existing DreamLoop Pro reference → native capture → independent critique → revision workflow was used. No new external models or bitmap assets were downloaded. This remains an articulated, depth-tested 2.5D presentation, not a complete free-view 3D reconstruction. The reference is not claimed to be matched equally well by every weapon.

## Verification

- [Source identity](verification-data/arsenal-nov02-source-scope.json): reviewed viewmodels source `25c82ff3c3f1e0fadf97a7adb2ba04b1771f7be24ac3550e549ecb38e55f5797` is identical in final combined build `3d58959919c4b673aa7643dd1237ecaf98eb21654f89f87a5b007f7d745a69e9`.
- [Scoped raster parity](verification-data/arsenal-nov02-parity.json): 660 comparisons, 300 exact, 360 expected differences confined to weapons 1/2/3/4/7/9, zero unexpected changes. Handgun, Cross, Nail, Dynamite, boots and standalone finishers remain exact.
- [Native aspect and motion checks](verification-data/arsenal-nov02-aspects.json): 135 actual idle/fire/reload frames and 27 ammunition endpoints across 4:3, 16:9 and ultrawide, zero runtime errors. These use weapon-only input `2fa1bf12550d57f04ee6d6dd2a40350df61eac189534074dd56f1335088daad1`, with identical reviewed source in the combined build; they are not relabelled as final-build runs.
- [Final combined runtime](verification-data/arsenal-nov02-runtime.json): all ten weapons passed actual keyboard reload, fire, switch, kick, cancel and cached-presentation checks.
- [Fresh independent visual review](verification-data/dreamloop-nov02-fresh-motion-review.json) confirmed the Rifle reload fragments were removed and found no duplicated hands, sleeve cutoff or guard-fill blocker in the reviewed Rifle/Tommy aspect matrix. Its subjective scores apply to those two weapons only.

Animation durations, ammunition, audio events, shared rendering/compositing, boots and finishers were not changed. Sniper's moving bolt hand and all original loading mechanisms remain active; this pass changes their visible contact and model geometry.

## Performance and actual media

The [complete performance record](verification-data/arsenal-nov02-performance.json) retains serial ABBA and BAAB observations on the same headless Chrome host. A first candidate run showed a 35.7 ms frame tail; it did not repeat, while a baseline repeat showed a similar 36 ms tail. In the repeat, Rifle reload raster CPU was 10.55/10.35 ms for the candidate versus 14.38/11.89 ms for baseline; Tommy was 9.22/9.34 versus 11.08/10.83 ms. All runs remain available. This is not a general FPS improvement claim.

The after images, contact sheets and short Rifle/Tommy reload clip are actual native output from the final combined build. Before images come from the released baseline. The video uses real keyboard reloads, uninterrupted RAF and captured game WebAudio. Provenance records input and output hashes.

- [Full viewport sheet](weapons-dreamloop-nov02/full.jpg)
- [Labelled enlarged weapon crops](weapons-dreamloop-nov02/weapon-crops.jpg)
- [Rifle before](weapons-dreamloop-nov02/rifle-before.png) / [after](weapons-dreamloop-nov02/rifle-after.png)
- [Tommy before](weapons-dreamloop-nov02/tommy-before.png) / [after](weapons-dreamloop-nov02/tommy-after.png)
- [Actual reload and audio](weapons-dreamloop-nov02/reload.webm)
- [Media provenance](weapons-dreamloop-nov02/provenance.json)
