// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { seedRandom } from "../support/seededRandom";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { WEAPON_STATS } from "../../src/weapons/definitions";
import type * as WeaponStateModule from "../../src/weapons/WeaponState";
import type * as AudioEngineModule from "../../src/audio/AudioEngine";

/**
 * THE WEAPON REPORT — player feedback round 1, task 4, 2026-09-17.
 *
 * The project owner played the game and said "the gun firing sound is bad."
 * `src/audio/Sfx.ts`'s new `gunshot()` is the rebuild and its doc comment
 * carries the whole argument; `src/weapons/WeaponState.ts`'s `REPORTS`
 * table carries the per-weapon numbers. This file is the oracle for both.
 *
 * WHY THIS FILE EXISTS AT ALL, rather than a divergence block bolted onto
 * `tests/behavior/audio.test.ts`. That file compares `audioInit`/`blip`/
 * `bang`/`boom`/`growl`/`snarl` against the frozen reference and every one
 * of those is UNTOUCHED by this task — it stays green, unweakened, and no
 * assertion in it was edited. The rebuild deliberately did not modify
 * `bang()`: `bang` is also every footstep, every bullet impact, every
 * ricochet, the static, and `click()`'s UI beep, so changing it would have
 * changed a dozen sounds the player did not name. The rebuild is a NEW
 * function plus a rewiring of the weapon sound table.
 *
 * And that table — `WEAPON_SOUNDS` in `src/weapons/WeaponState.ts` — had NO
 * oracle of any kind before this file. `tests/fidelity.test.ts`'s
 * "WEAPON_STATS vs. reference" case compares "every field except snd, slot
 * for slot", by name: the eight `snd` closures were the one part of the
 * weapon table nothing in the suite ever looked at, and `REF.weapons` has
 * been sitting in `tests/support/reference.ts` with its closures unread
 * since Plan 0B — the same "unused scaffolding over uncovered code" signal
 * that preceded KNOWN-6 and KNOWN-9. So this is not coverage traded away
 * for a behaviour change; it is the first coverage this surface has had.
 *
 * THE DIVERGENCE IS HANDLED THE WAY KNOWN-7 AND KNOWN-8 HANDLED THEIRS.
 * `reference/sonsurum.html` is never edited, so it still has the old
 * report. Rather than dropping the reference side, every ballistic slot
 * asserts the module's NEW shape and the reference's UNCHANGED old shape
 * side by side, each commented, so the reference stays in the loop as the
 * record of what changed. Both are derived from the recorded call logs —
 * old durations, old peak gains and the old filter set are all read back
 * out of the reference's own log rather than written down here, so nothing
 * in this file can go stale against a number in a comment.
 *
 * WHAT THIS FILE CANNOT DO, stated plainly. It is a call-log comparison,
 * exactly like every other oracle in `tests/behavior/` (KNOWN-5 item 5): it
 * proves which WebAudio nodes were built, how they were wired and what was
 * scheduled on them. It proves NOTHING about how any of it sounds. Nobody
 * on this task has heard the game. The player judges, and the real fix is
 * Phase 1 Task 6's user-supplied CC0 `.ogg` files — see `docs/assets.md`.
 */

let WeaponState: typeof WeaponStateModule;
let AudioEngine: typeof AudioEngineModule;

/**
 * `WeaponState.ts` transitively imports `src/render/Renderer.ts` (a real
 * `THREE.WebGLRenderer`, which needs `installDomStubs()`'s `getContext`
 * stub) — same ordering, and same reason, as
 * `tests/weapons/WeaponState.test.ts`. `installDomStubs()` also installs a
 * no-op `AudioContext`; `withModuleAudioSession` below overwrites it with
 * the recording one for the duration of each test and restores it after.
 */
beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  WeaponState = await import("../../src/weapons/WeaponState");
  AudioEngine = await import("../../src/audio/AudioEngine");
});

/** Same chunk set as tests/behavior/audio.test.ts, plus REF.weapons — whose `snd` closures call bang/blip/growl by bare name and so must share that one vm script's lexical scope. */
const CHUNKS = [
  refSource(REF.audioState),
  refSource(REF.audioInit),
  refSource(REF.blip),
  refSource(REF.bang),
  refSource(REF.boom),
  refSource(REF.noiseBuf),
  refSource(REF.growl),
  refSource(REF.weapons),
];

interface RefBundle {
  audioInit: () => void;
  WEAPONS: Array<{ name: string; kind: string; snd: () => void }>;
}

/** See tests/behavior/audio.test.ts's constructorReturning — a `new Ctor()` that always hands back `target`. */
function constructorReturning(target: unknown): new () => unknown {
  function Ctor(): unknown {
    return target;
  }
  return Ctor as unknown as new () => unknown;
}

/** Records the reference's own `WEAPONS[slot].snd()` — the OLD report — with Math.random seeded and restored in a finally. */
function recordReference(slot: number, wrap?: (emit: () => void) => void): AudioEvent[] {
  const { ctx, events } = recordingAudioContext();
  const restoreRandom = seedRandom(900 + slot);
  try {
    const ref = evalReference<RefBundle>(CHUNKS, "({audioInit,WEAPONS})", {
      window: { AudioContext: constructorReturning(ctx) },
      Math,
    });
    ref.audioInit();
    const baseline = events.length;
    const emit = () => ref.WEAPONS[slot].snd();
    if (wrap) wrap(emit);
    else emit();
    return events.slice(baseline);
  } finally {
    restoreRandom();
  }
}

/** Records the module's `WEAPONS[slot].snd()` — the NEW report — against the same recorder surface and the same seed. */
function recordModule(slot: number, wrap?: (emit: () => void) => void): AudioEvent[] {
  const { ctx, events } = recordingAudioContext();
  const previous = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = constructorReturning(ctx);
  const restoreRandom = seedRandom(900 + slot);
  try {
    AudioEngine.audioInit();
    const baseline = events.length;
    const emit = () => WeaponState.WEAPONS[slot].snd();
    if (wrap) wrap(emit);
    else emit();
    return events.slice(baseline);
  } finally {
    restoreRandom();
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = previous;
  }
}

// ---- log readers: everything this file asserts is derived, never written down ----

const created = (events: AudioEvent[], type: string): string[] =>
  events.filter((e) => e.kind === "create" && e.detail.type === type).map((e) => e.detail.node as string);

const createArgs = (events: AudioEvent[], type: string): unknown[][] =>
  events.filter((e) => e.kind === "create" && e.detail.type === type).map((e) => e.detail.args as unknown[]);

/** Every `node.type = "..."` assignment for nodes of the given creation kind, in order (biquad `lowpass`/`highpass`, oscillator `sine`/`square`/...). */
function typesOf(events: AudioEvent[], kind: string): string[] {
  const ids = new Set(created(events, kind));
  return events
    .filter((e) => e.kind === "param" && e.detail.prop === "type" && ids.has(e.detail.node as string))
    .map((e) => e.detail.value as string);
}

/** Scheduled/assigned events on one AudioParam name, in order. */
const params = (events: AudioEvent[], prop: string): Array<Record<string, unknown>> =>
  events.filter((e) => e.kind === "param" && e.detail.prop === prop).map((e) => e.detail);

/**
 * The summed PEAK gain of a report: every `gain` event that establishes a
 * level (a bare `.value` write, or a `setValueAtTime`), never a decay ramp.
 * This is the invariant that keeps the rebuilt report at exactly the
 * loudness the old one had relative to every sound this task did not touch.
 */
const peakGainSum = (events: AudioEvent[]): number =>
  params(events, "gain")
    .filter((d) => d.method === "value" || d.method === "setValueAtTime")
    .reduce((sum, d) => sum + (d.value as number), 0);

/** Every buffer's sample count, read off `createBuffer(channels, length, sampleRate)`'s logged arguments. */
const bufferLengths = (events: AudioEvent[]): number[] => createArgs(events, "AudioBuffer").map((a) => a[1] as number);

/**
 * The set of source nodes (buffer sources and oscillators) whose signal
 * reaches `target` by following logged `connect` edges. Used to prove that
 * every layer of the new report goes through the one panner `at()` armed —
 * the old closures called a bus accessor two or three times, and
 * `AudioEngine.ts`'s `emitAt()` positions only the first.
 */
function sourcesReaching(events: AudioEvent[], target: string): string[] {
  const edges = events.filter((e) => e.kind === "connect" && e.detail.to !== null);
  const reaches = new Set<string>([target]);
  // Edges are logged in construction order, which is not necessarily
  // downstream order, so iterate to a fixed point rather than once.
  for (let pass = 0; pass < edges.length + 1; pass++) {
    let grew = false;
    for (const e of edges) {
      const to = e.detail.to as string;
      const from = e.detail.from as string;
      // An AudioParam target is logged as "NodeId.prop"; its node counts.
      const toNode = to.includes(".") ? to.slice(0, to.indexOf(".")) : to;
      if (reaches.has(toNode) && !reaches.has(from)) {
        reaches.add(from);
        grew = true;
      }
    }
    if (!grew) break;
  }
  const sources = [...created(events, "AudioBufferSourceNode"), ...created(events, "OscillatorNode")];
  return sources.filter((id) => reaches.has(id)).sort();
}

const BALLISTIC = WEAPON_STATS.map((w, i) => ({ ...w, i })).filter((w) => w.kind === "hit");
const UNCHANGED = WEAPON_STATS.map((w, i) => ({ ...w, i })).filter((w) => w.kind !== "hit");

describe("which weapon reports diverge from the reference at all", () => {
  it("is exactly the six kind:\"hit\" slots — derived from WEAPON_STATS, not written down", () => {
    // Both sides of this are derived: the divergence set is measured by
    // replaying every slot, and the expected set comes out of the weapon
    // data. So "every firearm changed, and only firearms changed" is
    // checked rather than asserted, and a seventh slot quietly picking up a
    // gunshot() (or a sixth quietly losing one) fails here by name.
    const diverged = WEAPON_STATS.map((_w, slot) => slot).filter((slot) => {
      const ref = recordReference(slot);
      const mod = recordModule(slot);
      return JSON.stringify(mod) !== JSON.stringify(ref);
    });
    expect(diverged).toEqual(BALLISTIC.map((w) => w.i));
    expect(diverged).toEqual(WeaponState.REBUILT_REPORT_SLOTS);
  });

  it("guard: the reference really does define all eight snd closures, so the loop above cannot be vacuous", () => {
    for (let slot = 0; slot < WEAPON_STATS.length; slot++) {
      expect(recordReference(slot).length).toBeGreaterThan(5);
    }
  });
});

describe.each(UNCHANGED)("$name (slot $i) — NOT a firearm, deliberately untouched", ({ i }) => {
  it("is still call-for-call identical to the reference's closure", () => {
    // The HOLY CROSS LAUNCHER and the SOUL REAPER keep their rising pitched
    // sweeps: those are the character of a relic and a soul-eater, not a
    // firearm report, so the argument this task is built on does not apply
    // to them. Full parity, through the un-weakened comparator — and this
    // is the first test either closure has ever had.
    const ref = recordReference(i);
    const mod = recordModule(i);
    expect(ref.length).toBeGreaterThan(10);
    expectCallLogEqual(mod, ref, `WEAPONS[${i}].snd() call log`);
  });
});

describe.each(BALLISTIC)("$name (slot $i) — the rebuilt report", ({ i }) => {
  const profile = () => WeaponState.WEAPON_REPORTS[i];

  it("REFERENCE (unchanged, the record of what changed): had no highpass anywhere — no transient band at all", () => {
    // Claim 1 of the rebuild. The old closure's only filter on the noise was
    // a single fixed lowpass, so nothing in any weapon report had energy
    // above that weapon's own corner. Not attenuated — absent.
    const ref = recordReference(i);
    expect(typesOf(ref, "BiquadFilterNode")).not.toContain("highpass");
    expect(typesOf(ref, "BiquadFilterNode")).toContain("lowpass");
  });

  it("MODULE (new): splits one noise source into a highpassed crack and a lowpassed body, crossing over at the old lowpass corner", () => {
    const mod = recordModule(i);
    const p = profile();
    expect(typesOf(mod, "BiquadFilterNode")).toEqual(["highpass", "lowpass"]);
    // The crack occupies the band the old sound stopped at.
    const hpFreq = params(mod, "frequency").filter((d) => d.method === "value");
    expect(hpFreq).toHaveLength(1);
    expect(hpFreq[0].value).toBe(p.split);
    // And `split` is that weapon's OLD corner, taken off the reference's own
    // log rather than copied into this file.
    const ref = recordReference(i);
    const refLowpassCorners = params(ref, "frequency")
      .filter((d) => d.method === "value")
      .map((d) => d.value as number);
    expect(refLowpassCorners).toContain(p.split);
    // One noise source, not two: the crack and the body are the same
    // acoustic event through two filters. This is also the KNOWN-20 draw
    // count — one Math.random() fill loop, exactly as the old single bang().
    expect(created(mod, "AudioBufferSourceNode")).toHaveLength(1);
  });

  it("MODULE (new): the body's lowpass corner collapses across the decay instead of sitting still", () => {
    // Claim 2's other half. A static filter over a long noise burst is what
    // makes filtered noise read as hiss; a real report's spectral centroid
    // falls as the blast expands.
    const mod = recordModule(i);
    const p = profile();
    const sweep = params(mod, "frequency").filter((d) => d.method !== "value");
    // [lowpass corner set, lowpass corner ramp, punch pitch set, punch pitch ramp]
    expect(sweep).toHaveLength(4);
    expect(sweep[0]).toMatchObject({ method: "setValueAtTime", value: p.split });
    expect(sweep[1]).toMatchObject({ method: "exponentialRampToValueAtTime", value: p.bodyEndHz, time: p.bodyDur });
    expect(p.bodyEndHz).toBeLessThan(p.split);
  });

  it("decay: the module's noise buffer is strictly shorter than every buffer the reference's closure made", () => {
    // Claim 2. Both numbers are read out of createBuffer()'s logged
    // arguments, so this compares the real durations rather than two
    // literals. The buffer length understates the change on its own: the
    // reference baked a (1-i/N)^2 polynomial fade into the samples (-12 dB
    // at half its length), while the module runs an exponential gain ramp to
    // .001 (around -27 dB at half its length), so the audible decay shortens
    // by considerably more than these lengths do.
    const ref = recordReference(i);
    const mod = recordModule(i);
    expect(bufferLengths(mod)).toHaveLength(1);
    expect(bufferLengths(ref).length).toBeGreaterThanOrEqual(1);
    expect(bufferLengths(mod)[0]).toBeLessThan(Math.max(...bufferLengths(ref)));
  });

  it("MODULE (new): every envelope is on an AudioParam, so this oracle can actually see it", () => {
    // The reference put the noise envelope in the buffer samples, which a
    // call-log recorder is blind to by construction (KNOWN-5 item 3) — the
    // only gain event it ever emitted for a bang was a constant `.value`.
    // Three exponential decays to .001, no constant gain writes at all.
    const mod = recordModule(i);
    const ref = recordReference(i);
    const gains = params(mod, "gain");
    expect(gains.filter((d) => d.method === "value")).toHaveLength(0);
    expect(ref.length).toBeGreaterThan(0);
    expect(params(ref, "gain").filter((d) => d.method === "value").length).toBeGreaterThan(0);
    const decays = gains.filter((d) => d.method === "exponentialRampToValueAtTime");
    expect(decays).toHaveLength(3);
    for (const d of decays) expect(d.value).toBe(0.001);
    // Crack first and fastest — 4 ms, well inside the body.
    const p = profile();
    const ends = decays.map((d) => d.time as number).sort((a, b) => a - b);
    expect(ends[0]).toBeCloseTo(0.004, 10);
    expect(ends[0]).toBeLessThan(p.bodyDur);
  });

  it("MODULE (new): the pitched layer is a bare sine dropping under 90 Hz — the square/sawtooth buzz is gone", () => {
    // Claim 3. A square is odd harmonics; swept downward and (on the pistol
    // and the sniper) fed through the delay feedback loop, it is the
    // chiptune "pew" under the noise. A sine has no harmonics and a pitch
    // drop this fast and this low is heard as a thump, not a note.
    const mod = recordModule(i);
    const ref = recordReference(i);
    const p = profile();
    expect(typesOf(mod, "OscillatorNode")).toEqual(["sine"]);
    expect(p.punchEndHz).toBeLessThan(90);
    expect(p.punchEndHz).toBeLessThan(p.punchHz);
    // The reference's oscillator, where it had one, was harmonic-rich.
    for (const t of typesOf(ref, "OscillatorNode")) expect(["square", "sawtooth"]).toContain(t);
  });

  it("loudness is unchanged: the module's summed peak gain equals the reference closure's, exactly", () => {
    // Both sums come out of the logs. This is what keeps the rebuilt report
    // sitting at the same level against every sound the task did NOT touch
    // — footsteps, monsters, doors, explosions. Only the distribution across
    // the three new layers moved. It is also why gunshot()'s `out` gain is
    // left at the Web Audio default of 1 rather than assigned: an explicit
    // write would land in this same log and break the derivation.
    const ref = recordReference(i);
    const mod = recordModule(i);
    expect(peakGainSum(ref)).toBeGreaterThan(0);
    expect(peakGainSum(mod)).toBeCloseTo(peakGainSum(ref), 10);
    const p = profile();
    expect(p.crack + p.body + p.punch).toBeCloseTo(peakGainSum(ref), 10);
  });

  it("positional: one masterBus() call, so a positioned report costs one HRTF panner instead of two or three", () => {
    // gunshot() calls masterBus() exactly once — which is the only reason
    // its unity `out` gain exists at all.
    //
    // A CORRECTION WORTH KEEPING, because it is written the other way round
    // in three of AudioEngine.ts's own doc comments and it cost this task an
    // hour: `busFor()` does NOT consume `pendingPos`. Its body says so
    // outright ("Deliberately NOT cleared here") and
    // tests/audio/positional.test.ts already pins it ("every accessor call
    // after one emitAt() gets a panner, not just the first"). So a
    // multi-accessor emitter does not lose a layer out of the pan — it pays
    // for one extra HRTF panner per accessor call, and that file's own
    // comment is what calls HRTF the expensive node here. The cost of the
    // old shape is allocation, not correctness; this test asserts the thing
    // that is actually true.
    //
    // fire() emits the report unpositioned today — it is first-person — so
    // this buys nothing live. It is the structural property of the rebuild
    // that can be proven without hearing anything.
    const viaAt = recordModule(i, (emit) => AudioEngine.at(1, 2, 3, emit));
    const panners = created(viaAt, "PannerNode");
    expect(panners).toHaveLength(1);
    const sources = [...created(viaAt, "AudioBufferSourceNode"), ...created(viaAt, "OscillatorNode")];
    expect(sources).toHaveLength(2); // the noise and the punch
    expect(sourcesReaching(viaAt, panners[0])).toEqual([...sources].sort());

    // The reference side is recorded but NOT compared here, deliberately:
    // positional audio is a Phase 1 module addition that the frozen
    // reference predates entirely — its bang/blip connect to a bare
    // `masterG`, so it builds no panner at all and there is nothing to
    // diverge from. The old shape is demonstrated on live code instead, by
    // the two untouched slots below.
    expect(created(recordReference(i, (emit) => AudioEngine.at(1, 2, 3, emit)), "PannerNode")).toHaveLength(0);
  });
});

describe("the multi-bus-call cost gunshot() avoids is real, not hypothetical", () => {
  // Shown on the two closures this task deliberately did NOT rebuild, so it
  // is a property of live code rather than of a shape that no longer exists.
  // Each still calls blip() and bang() (and, on the SOUL REAPER, growl())
  // separately, so each reaches masterBus()/echoBus() more than once. Every
  // ballistic slot used to look exactly like this. Left filed rather than
  // fixed: rerouting a relic and a soul-eater is a second sound-design
  // change, and this round is about the one bug the player named.
  it.each(UNCHANGED)("$name (slot $i) builds one panner per layer under at(), where the rebuilt report builds one", ({ i }) => {
    const mod = recordModule(i, (emit) => AudioEngine.at(1, 2, 3, emit));
    expect(created(mod, "PannerNode").length).toBeGreaterThan(1);
  });
});
