# Combined arsenal and hell candidate — verification

Tested immutable standard-build artifact: SHA256 **5c071b1892db41b162542460dc447586c4919df3d730bcf07164dea9dfe1e932**, 22,632,339 bytes. Viewmodel source: 2830ab4dfb61df8fa334cadb7ed417ed7821c26b1488f387f84a78568e284251. The accepted hell source d2ba561ba361d9764cdefd1fc7731c2c0697bb208a41e12f4c739a52c15e9084 is embedded exactly. This report identifies the tested candidate; it does not assert the main distribution has already been replaced.

## Functional checks

- All ten weapons: actual keyboard R and RAF reload, native ammunition conservation, actual mouse fire, switching/cancellation, kick recovery, applicable partial-magazine fire cancellation and cache/ghosting equality passed. First controllable frame had ready assets; zero page errors and HTTP requests.
- Normal file opening without the QA API: legacy save loading, settings persistence and chapter launch passed; zero page errors/HTTP requests.
- Existing 42-case audio suite passed. Actual R/RAF for weapons 0 and 1 each produced seven events and zero surviving voices; maximum phase-crossing delays 16.2/17.0 ms. Physical speaker/display latency was not measured, and this is not an all-ten newly recorded sound claim.
- Prologue: all 15 movement checkpoints, optional shotgun pickup, first live enemy approach, E exit, level-card continuation and arrival in native chapter index 9 passed. Remaining navigation after the first encounter isolates collision/elevation rather than full combat balance.
- No baked hell materials, scoped textures or crypt embers leaked to the next chapter. Returning to prologue twice did not accumulate them. Complete gameplay grid/floor/zone boundaries and other themes are unchanged; 1,338 open hell ceiling cells are intentionally raised.
- At the actual hell arena position, all ten weapons rendered finite, visible idle and insert poses (20 bounded checks). This is pose validation, separate from the actual R reload coverage above.

Reports are under verification-data/arsenal-final-5c071b18-{runtime,compatibility,audio,audio-raf,navigation,hell-invariants}.json. The navigation extension is reproducible with tools/arsenal-hell-navigation-tests.cjs. Actual navigation screenshots are under .dream-loop/arsenal-final-qa/navigation/. Runtime phase PNGs are weapon-raster captures during actual R reloads, not full-scene screenshots.

## Serial performance observations

The root granted an exclusive browser window for serial ABBA against unchanged baseline 3807e06bd8a5d40e76786582860f532dfab2c16cf7950d143feb6d646b0f25ed. Same 1280×720 viewport, chapter 0 starting camera, deterministic random seed and equal enemy removal. Numbers pool samples across two runs per build. Source rendering improvements are included; no concurrent agent browser capture ran in this final window.

| Weapon | Reload raster CPU baseline → candidate | Observed FPS baseline → candidate | Frame p95 baseline → candidate |
|---|---:|---:|---:|
| Shotgun (1) | 14.56 → 15.76 ms | 51.18 → 51.45 | 35.7 → 35.7 ms |
| Nail (6) | 15.53 → 10.69 ms | 46.81 → 55.91 | 36.1 → 18.1 ms |
| Soul (7) | 8.71 → 16.16 ms | 55.67 → 49.78 | 18.2 → 36.0 ms |
| TNT (8) | 12.10 → 11.45 ms | 52.42 → 55.93 | 35.6 → 18.1 ms |
| Stake (9) | 11.62 → 11.06 ms | 52.72 → 53.49 | 35.5 → 18.2 ms |

Idle was approximately 56 FPS. The four non-Soul sampled weapons preserved or improved the observed frame rate; shotgun raster CPU still increased about 8.2%. **Soul reload remains more expensive and showed a real frame-time regression.** Its two candidate runs observed 45.9 and 53.6 FPS, illustrating host/JIT variability. Consequently this is not a blanket smoothness pass or a universal FPS guarantee. No separate hell-arena performance sample was taken; navigation and appearance passes do not establish arena FPS.

Raw timing report and pooled summary: verification-data/arsenal-final-5c071b18-performance.json and arsenal-final-5c071b18-performance-summary.json. Functional-test frame timings contain capture overhead and must not be used instead of this benchmark.

The fixed-camera authored weapon textures and baked hell illumination retain their documented visual limits. Static baked hell surfaces do not respond to dynamic muzzle lights; other native surfaces retain their normal lighting.
