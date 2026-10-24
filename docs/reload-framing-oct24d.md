# Loading-hand visibility: Tommy Gun, Nail Cannon and Sniper

The native reload presentation kept the weapon's upper edge at a fixed screen height. During magazine or canister removal, the loading hand then fell mostly below the viewport. Smooth, weapon-specific presentation offsets now lift the complete assembly during these loading phases. Hands, ammunition parts, sleeve continuation and weapon anchors share the same final placement; there is no independent screen-space clamp on a hand or magazine.

Tommy Gun also uses a shorter shared drum/hand extraction travel. Nail Cannon and Sniper geometry and mechanical paths are unchanged. The Sniper offset covers only the middle loading window; the tested `.12` and `.82` bolt poses remain exact. The window slightly overlaps the edges of the bolt-reach envelopes, so this is not a claim that every bolt-phase pixel is unchanged. Relative hand/bolt contact remains intact.

Idle holds, the other seven weapons, kick/finisher artwork, weapon statistics, ammo transfers, reload duration and audio timing are preserved. The compositor and environment source are unchanged this pass. The Sniper magazine still approaches the lower screen edge in the middle phase; the loading hand is more visible without enlarging or redesigning the weapon.

## Actual evidence

Final content SHA-256: `6dd69003987fadb8c4b405d3e94d3833e303d37a86484e33c4ed2fb556c75c99`. Viewmodel source: `7f847d1bda53689395130c52abcb05ea87564f82f6b7c33ecfa55882ac0bc77c`.

- 661 scoped comparisons include raw/canvas/side-buffer pixels and native presentation `topRow`: 543 unchanged; 118 expected differences only within the three loading windows. No unexpected differences. Sniper `.12` and `.82` are explicitly checked.
- Independent native-R aspect checks: 36 Tommy/Nail frames plus 9 Sniper frames, with full-magazine/idle endpoints at all three aspect ratios.
- The compositor's 3,600 deterministic kernel comparisons remain equal.
- Final all-ten-weapon native reload/fire/switch/kick/cancellation checks passed. Repeated cached idle and reload draws retained identical canvas pixels and presentation hints; no accumulating offset was found.

## Performance scope

Short serial ABBA observations used the same chapter-0 camera on this host. Tommy remained similar (55.34 → 55.69 FPS); the final Sniper check was also similar (55.82 → 55.79 FPS, frame p95 18.1 ms in both builds). Nail showed inconsistent slow trials: the first comparison had a slower candidate trial, while the repeat had a slower baseline trial. Both complete reports are retained. This does not establish a repeatable speed gain or regression, and no general FPS improvement is claimed.

[Actual Tommy/Nail firing and reload video](reload-framing-oct24d/tommy-nail-reload.webm) includes game WebAudio. It was recorded from intermediate build `824314e9…`; those two weapon changes are unchanged in the final build. Sniper was added afterward and is shown separately in the final-build screenshots. No target illustration is presented as gameplay evidence.

Before/after images and their exact source builds are recorded in [provenance](reload-framing-oct24d/provenance.json). Historical before frames retain their original build identities.
