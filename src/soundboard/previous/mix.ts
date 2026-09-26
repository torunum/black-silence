import type { Mix, MixFactory } from "../../audio/Mix";

/**
 * THE OLD MIX — the audio graph the game had before player feedback round 2
 * Task 2 (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`),
 * kept so the sound board can play any sound through it: "Old mix" on the
 * board. The reference's own graph (reference/sonsurum.html's `audioInit`,
 * REF.audioInit), statement for statement:
 *
 * - `masterG`, one gain at the master volume, straight to the speakers.
 *   Every "dry" sound went here, with nothing between it and full scale.
 * - `echoG`, a 340 ms delay with 0.42 feedback into `masterG` — and **no dry
 *   path**: a sound sent to the echo was heard only as its repeats.
 *
 * No room, no compressor, no limiter, no level trims (`route` ignores
 * `send` and `gain`; it reads only which accessor the sound came through).
 * `tests/behavior/audio.test.ts` proves `audioInit({ mix: previousMix })`
 * builds exactly the reference's graph, call for call — which is also why
 * the tests that compare sound bodies with the reference run on this mix.
 *
 * Never imported by the game (`tests/soundboard/soundboard.test.ts`).
 */
export const previousMix: MixFactory = (ac, volume): Mix => {
  const masterG = ac.createGain(); masterG.gain.value = volume; masterG.connect(ac.destination);
  const dly = ac.createDelay(1); dly.delayTime.value = .34;
  const fb = ac.createGain(); fb.gain.value = .42;
  const echoG = ac.createGain(); echoG.gain.value = 1;
  echoG.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(masterG);
  return {
    bed: masterG,
    route: ({ echo }) => (echo ? echoG : masterG),
    setVolume(v) { masterG.gain.value = v; },
    volume: () => masterG.gain.value,
    setRoom() {},
    room: () => null,
  };
};
