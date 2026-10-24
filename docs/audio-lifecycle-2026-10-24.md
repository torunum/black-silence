# Reload audio lifecycle correction — 2026-10-24

Reload foley now stops at the native player-death transition. Previously, cleanup depended on the weapon update, but the actual frame loop stops running that update after death. A sound already playing could therefore continue over the death screen. Repeated cancellation checks also no longer replace an existing source-stop deadline.

The correction is limited to `src/reload-audio.js`. It preserves the recorded clips, gains, playback rates, seven phase events, native damage behavior, ammunition, reload duration and weapon appearance. It adds no timer or extra animation-frame loop. Pause, weapon switching, kick interruption, map loading, mute and suspended-audio cleanup retain their existing behavior.

## Evidence

- Baseline release HTML: `5c071b1892db41b162542460dc447586c4919df3d730bcf07164dea9dfe1e932`.
- Audio-only candidate HTML: `61974e0c1fb7e83c0be946b4cd713efe45cae9e7e034df1086ae860a6fc1a075`.
- Final combined candidate HTML: `41f9646703cce0a5da5b6b063df10bf60de84c9c821ffb5f65255ce0a6443448`.
- Updated audio source: `6b63eec006c8f7ee98392f323f630879140948f24165ab72b308bfb4b4d6be16`.
- The baseline failed the new assertion **“death releases foley without a subsequent weapon update”**. Its only test-fixture addition exposed the existing native damage function; audio behavior was unchanged.
- The audio-only candidate passed the initial 48 checks. The final combined candidate passed all 49 extended checks, including three successive nonlethal hits with the native return value preserved, lethal native damage without another weapon update, 120 repeated stop requests without rescheduling, pause/resume, switching, kick, mute, map/reset and suspended-context cleanup.
- On the final combined candidate, actual keyboard-R / native-RAF runs passed both seven-event reload timelines. A subsequent real reload followed by lethal native damage stopped its voice while the weapon clock remained frozen at `0.2142` seconds. No new foley events appeared and no page errors occurred.

Reports: [audio lifecycle assertions](verification-data/audio-lifecycle-2026-10-24-checks.json), [actual RAF and lethal-damage flow](verification-data/audio-lifecycle-2026-10-24-raf.json).

Both linked reports identify the exact final combined candidate by SHA-256. They are functional evidence, not a performance comparison or a measurement of physical speaker latency; other functional QA ran concurrently. The reproducible tests are `tools/reload-audio-tests.cjs` and `tools/reload-audio-raf-tests.cjs`; `GAME_HTML` selects a candidate without rebuilding the main game and `QA_OUTPUT_DIR` selects the report directory.
