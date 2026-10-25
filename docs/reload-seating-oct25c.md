# Rifle and Tommy magazine seating

The Combat Rifle and Tommy now start returning their magazine and supporting hand during their native seating interval and finish at the existing phase-0.60 seat event. Previously the parts waited until approximately 0.49 and completed their return at 0.62/0.63. The change gives the approach more time and aligns the seated pose with the existing mechanical cue.

The initial extraction curve keeps its original floating-point arithmetic. A cubic smoothstep controls the return, with zero velocity at both ends. The magazine and left hand still use the same translation and roll. The native ammunition transfer, full reload duration, audio events, charging-handle movement, weapon geometry, idle and firing poses are unchanged. This is an animation timing improvement, not a new sound recording or model redesign.

## Evidence and scope

- Immutable baseline: `38b1a9aa2933d1523ba2607f3ae39d6d977b926b4d483d031112e085eb078b95`.
- Weapon-only candidate: `ccc9f8eafd5f3707c7686e4329d99bfc64c2b18c2be1472e1dcace47a6821129`.
- Viewmodel source: `9fc125ed1e30ec51921990ee12eb46f190ed62fbba0fe4a445ad33e2385dc049`.
- The exact two-change source check, 2,002 curve samples, eight smooth-join checks and unchanged shared contact transforms passed. Four output/input collision cases were rejected without changing either input.
- The deterministic 660-case raster/canvas/side-buffer/topRow comparison had 626 exact cases and 34 expected Rifle/Tommy return-phase differences. Other eight weapons, idle/fire, boots/finishers and the tested late charging/endpoint poses stayed exact.
- Actual R/native RAF at 4:3, 16:9 and ultrawide passed 36 phase/aspect frames and six ammunition endpoints. These tests used the weapon-only candidate above, not a later combined build.

The six screenshots in `reload-seating-oct25c/` are actual game captures. Their input identities are in `provenance.json`. Background RNG and captured native RAF phases can differ between runs, so the visual pairs are not themselves pixel-parity evidence. The independent deterministic test supplies that evidence.

The portable curve test is `tools/reload-seating-tests.cjs`. Its exact-two-change assertion deliberately applies to the weapon-only pair; a combined build also containing environment/combat changes is outside that source-comparison scope.

No general frame-rate improvement or new audio-quality claim is made.

## Combined validation

Final combined candidate `4b03db10fcf7433e90e2f21e662224d79ce356f3e2bac392ab7ab21cd09c6198` embeds the identical viewmodel source above alongside the accepted combat and environment changes. All ten weapons passed real reload/ammunition/fire/switch/kick/cache checks on this exact input; two idempotent standard builds, eight invalid-input no-write refusals and native engine/Village identity passed.

[Before: actual Rifle/Tommy reloads with game audio](reload-seating-oct25c/before-motion.webm) · [After: final combined actual reloads with game audio](reload-seating-oct25c/after-motion.webm). These uninterrupted recordings use real R and native RAF. The after clip lasts approximately 4.9 seconds; video/audio marker alignment has 40 ms video-frame granularity and does not measure physical audio-output latency.
