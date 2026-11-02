# Weapon mechanisms and reference hands — 2 November, second pass

The Shotgun visual prototype was rejected because repeated native reload measurements showed a material frame-time cost. Its previous model, hand poses and animation framing are preserved. The separately tested two-round capacity correction ships with the combat module.

The Sniper uses the approved illustrated curled grasp on a continuous grip-to-bolt trajectory. A steel bolt body remains engaged with the receiver while the handle withdraws. Reducing the original whole-rifle roll and moving the complete reload presentation makes the mechanism visible; the aim ray and world camera are unaffected. The right cuff continues into a textured forearm instead of ending at the source-board boundary.

The Stake uses its own approved reference hand silhouette. Its carried wooden shaft samples bare wood between the reference's metal saddles, preserving the pale sharpened tip; the stationary bands remain separate parts. Its right cuff also continues to the viewport edge.

The handgun, Shotgun and the previously improved Rifle/Tommy are preserved. Cross, Nail, Soul and Dynamite were audited and retained. This pass does not claim that every weapon now matches the reference equally well. The Sniper forearm remains comparatively straight and its cuff transition angular; those are remaining visual polish limits.

## Reference method

DreamLoop Pro's reference → native capture → independent critique → revision cycle was used with the existing approved source boards. The [official Atari Blood screenshot](https://atari.com/cdn/shop/files/blood_ss_03_1920x1080_57855ce3-ec13-4f8c-b16e-0f6c7e114278.jpg?v=1661796627) informed the readability of separate chamber mouths, hinge and ammunition. A still image does not establish animation timing: no Blood reload duration or copied game asset is claimed. The game retains its own weapon identity and articulated, depth-tested 2.5D rendering.

The presentation correction is scoped to weapons 4/9 and disabled during kicks, finishers and hidden/dead states. It restores the drawing context with `try/finally`. A bounded distal-sleeve surface covers the lower edge exposed by lifting the weapon canvas; the weapon raster itself is unchanged. The overscan is derived from the actual screen offset converted to raster units, plus a small border allowance.

## Verification and provenance

- [Source identity](verification-data/weapons-blood-nov02-source.json): installed module `3d897880…`, exact combined HTML `5e5ceb0c…`. Shotgun model/helpers remain baseline.
- [660 raster comparisons](verification-data/weapons-blood-nov02-parity.json): 539 exact, 120 expected differences confined to 4/9, and one internal stale side-canvas difference. The latter does not change the final native image, independently checked below. Boots and standalone finishers remain exact.
- [46 native presentation checks](verification-data/weapons-blood-nov02-presentation.json): all eight retained weapons, including Shotgun, match final-canvas pixels; context transforms restore after every call. Hidden/full-zoom output and kick offset passthrough also pass.
- [Native reference motion](verification-data/weapons-blood-nov02-reference-motion.json): retained 4/9 full-frame idle/fire/reload checks across 4:3, 16:9 and ultrawide. These private captures keep their original input hashes and are not relabelled as combined-build runs.
- [Final combined media provenance](verification-data/weapons-blood-nov02-media.json): actual final-build reload cycles and post-volume game audio. [Watch the reload clip](weapons-blood-pass-nov02/reload.webm); [Sniper](weapons-blood-pass-nov02/sniper-after.png), [Stake](weapons-blood-pass-nov02/stake-after.png). Before images are separate baseline captures.

Independent review rejected and corrected the early floating cuff, disconnected bolt and inappropriate receiver-texture sample on the carried Stake. The final visual acceptance retains the narrower Sniper forearm/angular cuff limitation noted above.

[Performance observations](verification-data/weapons-blood-nov02-performance.json) retain raw serial runs and input identities. Sniper observations were approximately 55–56 FPS versus 56 FPS baseline, with variable reload CPU cost; the earlier conservative Stake observation was about 56 FPS in both builds. These are shared-host observations, not a hardware-independent guarantee or an overall FPS gain. Shotgun candidates repeatedly cost more during reload and were rejected; its shipped visual rendering is baseline-exact.

Weapon audio and reload durations were not changed in this pass. The separate combat change makes the two-barrel Shotgun capacity agree with its two-round mechanism while preserving the first pickup's ammunition budget.
