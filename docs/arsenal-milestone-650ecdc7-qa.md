# Arsenal milestone QA — 650ecdc7

This is a private integration milestone, not the final shipped HTML. Cross (index 5) was still being revised after this snapshot.

- Candidate SHA256: 650ecdc772833768b18a3ca07ad696889afdf68e6fc413b231cde2d2ecbbf9e3
- Baseline SHA256: 3807e06bd8a5d40e76786582860f532dfab2c16cf7950d143feb6d646b0f25ed
- Functional report: verification-data/arsenal-milestone-650ecdc7-runtime.json
- ABBA raw report: verification-data/arsenal-milestone-650ecdc7-performance.json
- Pooled summary: verification-data/arsenal-milestone-650ecdc7-summary.json

## Functional result

PASS for all ten weapons: actual R/RAF reload and ammo conservation, actual fire, switch cancellation without early ammo transfer, kick/recovery, applicable partial-magazine fire cancellation, deterministic cache/ghosting image equality after other weapons/reload/two-foot poses, first controllable frame asset readiness. Zero page errors and zero HTTP requests. One-shot-capacity weapons do not support the partial-magazine fire-cancel case. These checks do not claim comprehensive combat balance coverage. Phase captures add overhead, so functional frame timings are not benchmark results.

## Performance result

NOT ACCEPTED as a smoothness pass. Serial ABBA used 1280×720, the same chapter 0 camera, deterministic random seed, equal enemy removal, real RAF and keyboard reload. Numbers below pool observed samples across two runs per build. They are observations on this host, not hardware-independent FPS promises. Idle remained near 56 FPS; reload regressed for four of five selected weapons.

| Weapon | Reload raster CPU baseline → candidate | Observed FPS baseline → candidate | Frame p95 baseline → candidate |
|---|---:|---:|---:|
| Shotgun (1) | 16.51 → 24.81 ms | 45.8 → 33.1 | 36.2 → 53.2 ms |
| Nail (6) | 13.13 → 15.86 ms | 55.2 → 47.8 | 18.2 → 36.2 ms |
| Soul (7) | 8.17 → 17.36 ms | 55.8 → 47.0 | 18.2 → 36.1 ms |
| TNT (8) | 8.56 → 16.62 ms | 55.9 → 43.3 | 18.1 → 36.2 ms |
| Stake (9) | 12.36 → 11.21 ms | 50.8 → 54.6 | 35.6 → 18.2 ms |

The harness measures h0t as a whole, not separate native and painted-composite stages. It did not instrument triangle counts or bounds. Run variation is visible in the raw report (especially shotgun and TNT); the table is not evidence of a universal FPS cap.

## Nail discrepancy audit

The historical standalone fbc6ab74144797765e1fdf2391b9f57a302413fbbf3b28d64d84ca7f18440107 candidate used the same baseline SHA. Its Nail implementation is byte-identical to this milestone after the sole asset-name replacement nailSource → relicSource. The two candidate prologue blocks are byte-identical (SHA 9bf162f97dda58fde0cd93c193b8fe802472246e284320293ee4ad9f4358cf5a); scene camera, renderer and child count (216) also match. Other source modules except viewmodels are unchanged between the two candidates. Consequently, a changed Nail model or scene does not explain that discrepancy.

The relevant shared compositor differences are delayed UV interpolation after depth rejection, the opaque-alpha fast path and dirty-rectangle putImageData. Broader call-site type feedback from all new models may also matter, but this remains a hypothesis. Private native-versus-composite instrumentation is required before attributing causality.

Both private candidates retain the earlier prologue block, not the accepted d2ba561b hell source. Final standard assembly must include and verify the accepted prologue. Final Cross-only runtime retest and normal offline/audio compatibility remain pending the stable final candidate. Main HTML was not modified by this QA.

## Subsequent normal compatibility and audio checks

The same exact 650ecdc7 candidate subsequently passed normal file opening without the QA API, legacy saves, settings persistence and chapter launch (zero page errors and HTTP requests). The existing 42-case Web Audio suite passed, including cancellation, mute, pause, hidden tab, context suspend/resume and shared timing. Actual R/RAF audio checks for weapons 0 and 1 each produced seven events exactly once and zero surviving voices. Maximum phase-crossing delays were 12.5 and 17.1 ms; these measure CPU submission, not physical speaker/display latency. These are existing detailed audio checks for the first two weapons, not an all-ten new-foley claim. Reports: verification-data/arsenal-milestone-650ecdc7-compatibility.json, -audio.json and -audio-raf.json.
