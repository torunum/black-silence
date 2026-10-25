# Execution consistency verification — 2026-10-25

The arm-tear finisher used two simultaneous representations of the same left arm: the first-person hand held it while the native sever effect launched a second world arm. The combat hook now defers only that one world-limb spawn. The native wound, blood, sounds, impact timings, kill and health reward continue. When the hand lowers out of view at normal completion, one world arm drops below the camera. Interrupted executions discard the deferred spawn.

## Original combined input (before final Stake right-grip refinement)

- HTML: `697219aba3391120a1e0b74b5056050b9dbce774513385a3773485b6e76199b9`
- combat.js: `6c6a13264859ecdf05f9740d8d161f8eb265f9e8a04dc05b1675b6bdb1164e54`
- viewmodels.js: `d4e95d6ecd61b08e117ef1f8e04d48e0274d5d9942beb26c59c551b49d464a07`
- finishers.js: `8c2c7bdf13e17005c3383054560b155986d8e706b5bfda81e9f1a8224ee3c5b0`
- prologue.js: `b0107518140492cc18c4cd7bd41b1e342359ceccf558e9ed1dee22942add3773`

## What ran

**Actual input / native RAF:** all three choreography types ran in fresh games on the 697219ab combined HTML. QA setup placed a low-health, staggered target and briefly selected each choreography via an RNG fixture. Held E started the real native execution; screenshots at .12/.36/.62/.90 only paused the game for capture. Each target died, HP increased from 70 to 85, busy/exec state cleared, and the weapon returned. Actual held W and held mouse fire then verified control recovery. No JavaScript errors. The RNG selector was restored immediately after the execution began.

**32 isolated assertions:** controlled calls to the existing combat functions check event boundaries and the world-limb count. No world left arm exists while the first-person arm is held; exactly one appears at normal completion, with a downward launch below the camera. Repeated cleanup cannot duplicate it. Ordinary left-arm severing, right arms, unrelated actors and an artificial boss fixture retain immediate native spawning. A forced effect exception restores the temporary spawner interception and clears its deferred state. These checks are isolated state-machine tests, not additional manual gameplay runs.

The isolated suite also invokes the real native player-damage function `ta(1000)` and native map loader `rp(1)`: actual death and next-level rebuilding discard the pending limb. It does not set the hook's pending state to null. Fixture setup resets overlays between otherwise separate scenarios.

The prior combat-only candidate also passed the existing 35 combat and 27 enemy-animation assertions. Those are supporting intermediate-source checks, separate from the 697219ab HTML runs above.

- [Actual input report](verification-data/execution-native-oct25-697219ab.json)
- [32 lifecycle/event assertions](verification-data/execution-lifecycle-oct25-697219ab.json)
- [Before held arm](execution-oct25/before-kind2-hold.png) — baseline HTML `6dd69003…`
- [After held arm](execution-oct25/after-kind2-hold.png) — 697219ab HTML above
- [Neck-contact hands](execution-oct25/after-neck-contact.png) — 697219ab HTML above

The screenshots use native presentation and HUD, not isolated model renders. Particle arrangements differ between real-time runs; they are not pixel-parity comparisons. Large existing gore particles remain visible and were not globally culled or rescaled by this change. No performance improvement is claimed.

## Final-build sanity

The delivered HTML is `b823d85f6dd70b4eb795c4e17cde96cc455b3f11e1c44856a70e78444b9f2103`. Its later Stake right-hand anchor and side-sleeve refinement changes viewmodels only; the combat source above is byte-identical. One fresh native held-E kind-2 execution, followed by actual movement and firing, passed on this final HTML without JavaScript errors. [Final sanity report](verification-data/execution-sanity-oct25-b823d85f.json). The three-kind and 32-assertion reports retain their earlier 697219ab input identity; they were not rerun under the final hash.

## Independent chapel-glass review

The b0107518 prologue change is limited to the three named chapel-glass materials. The amber material and ordinary fallback remain unchanged. A deterministic 32×64 map-owned texture is registered through `Z`; the prologue builder resets its cache per map. No per-frame texture work or RNG mutation was added. The owner's five-cycle evidence reports nine scoped texture disposals out of nine, zero disposed-object reuse and no glass tags in the next chapter; code inspection found no scope/disposal issue.
