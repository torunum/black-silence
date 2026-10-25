# Enemy first-contact preparation — 25 October

Chapter loading now prepares the native two pain and three attack textures for each unique enemy rig present in that chapter. The existing cache keys, pose renderer, gameplay state, damage and animation timing are unchanged. Intact actors use the native default mirror value; severed and death poses remain lazy. A failed optional rig bake preserves valid cached frames and leaves the remainder to the native lazy path, without preventing a successful chapter load or subsequent rigs from preparing.

The cache is the engine's existing global rig cache, retained across chapters. It is not a map-owned resource and must not be disposed during map cleanup.

## Evidence and limits

- A controlled baseline/private-prototype comparison observed five pain/attack texture bakes during first contact before the change, and none afterward. Those five baseline bakes totaled 27.0 ms across their calls; this does not attribute the complete frame spike to texture generation. Four walk frames remained lazy. Repeat contact created no new frames in either case.
- Preparation added 36.6 ms to the measured prologue load and 78 ms when loading the next chapter's seven new rig types. Returning to the already prepared prologue added no textures. These are single local measurements, not loading-time guarantees or steady FPS results.
- Prologue preparation adds ten textures across two rig types: approximately 217 KiB of raw RGBA data. Preparing all 28 native rig types over a session would add at most 140 textures, approximately 4.15 MiB of raw RGBA data, excluding canvas, GPU and driver overhead. Only encountered chapter rigs are prepared.
- The final combined HTML passed actual held-fire ammo/HP transitions, first/repeat contact, startup/chapter/return cache checks, zero gameplay RNG calls during preparation, and unchanged sampled gameplay state. Its five zombie pain/attack PNGs exactly match the baseline. No page errors occurred.
- VM tests cover native load arguments/return, unique-rig bounds, existing-cache identity, partial-cache preservation after a bake failure, continuation to the next rig, and propagation of original native-load exceptions.

The measured normal-path prototype source was `4ee19cf44a893f1e9dd91b778a2fdd6868d9c174daddbf6fc066628896178c13`, embedded in private HTML `d45ae0c4c74ccee1e348b3650418fbc8e3094590aa65db1164f466dae5a6c861`. The final source adds the failure fallback and is `84db971283d86b0cbea7d0181eb3d48d40924936c5d577ab05fd31ca4b7e755c`. The final functional HTML is `38b1a9aa2933d1523ba2607f3ae39d6d977b926b4d483d031112e085eb078b95`.

Reports: [controlled measurement](verification-data/enemy-pose-warmup-oct25-measurement.json), [final combined functional verification](verification-data/enemy-pose-warmup-oct25-final-38b1a9aa.json).

Reproduce the module contract with `node tools/render-warmup-tests.cjs`; run the native functional smoke with `node tools/enemy-pose-warmup-tests.cjs GAME.html OUTPUT_DIRECTORY`. The latter instruments a private copy and preserves its input file. Its timing fields are diagnostic, not an exclusive performance benchmark.
