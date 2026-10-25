# Soul Reaper grip contact

The Soul Reaper's right hand previously sat beneath the rear receiver, leaving its downward brass grip visibly separate from the palm and curled fingers. The right-hand anchor now meets that grip in idle, firing and reloading.

Only that local anchor changes, from artwork coordinates `(1460,347)` to `(1365,350)`. The glove bitmap, orientation basis, depth, weapon geometry, left-hand/core motion, claws, energy transitions and native ammo/audio timings are unchanged. No new renderer path or texture is added.

- [Before](soul-grip-oct25b/soul-before.png) and [after](soul-grip-oct25b/soul-after.png): actual native idle frames.
- [Reload contact](soul-grip-oct25b/soul-reload.png) and [actual firing](soul-grip-oct25b/soul-fire.png).
- [Exact media provenance](soul-grip-oct25b/provenance.json). Background RNG differs between recordings; screenshots support visual review, while deterministic comparisons establish isolation.

The Soul-only candidate is `eee23be98f92a85ba032e678c3bae53d0ec405657f91895b2612ee0befcf78bf`, with viewmodel source `a7081298c0d62fa843a766956544986ce860327fae4a661fa1b3f2734c193630`. Its comparison baseline is release `b823d85f6dd70b4eb795c4e17cde96cc455b3f11e1c44856a70e78444b9f2103`.

Validation on this candidate:

- 660 deterministic raw/canvas/side-buffer and presentation comparisons: 600 exact, 60 intentional Soul7 differences, zero unexpected differences. The other nine weapons, boots and finishers are exact.
- Independent native idle/fire/reload checks across 4:3, 16:9 and ultrawide, with ammo endpoints and no page errors. The ultrawide sleeve exits through the lower edge without the earlier Stake-style open side cutoff.
- Source comparison proves the anchor replacement is the sole viewmodel change; the left-hand/core/claw paths remain byte-identical.

Cross5 and Sniper4 were also inspected with native idle/fire/reload evidence. No additional contact defect was established, so their geometry and animation are preserved. This work does not claim an FPS gain or universal animation correctness.

Final combined release `38b1a9aa2933d1523ba2607f3ae39d6d977b926b4d483d031112e085eb078b95` embeds this identical viewmodel source plus the accepted environment and native pose-prewarming changes. All ten weapons passed native reload/ammo/fire/switch/kick/cache checks on that exact combined candidate; standard build identity, two idempotent builds and eight invalid-input no-write refusals passed. The final idle/fire images and [actual fire/reload with game audio](soul-grip-oct25b/soul-fire-reload.webm) come from this combined build; the readable middle-reload still retains its Soul-only candidate identity in the provenance file.
