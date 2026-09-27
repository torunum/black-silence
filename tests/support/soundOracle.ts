import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, vi } from "vitest";
import { evalReference, REF, refSource } from "./reference";
import { recordingAudioContext, type AudioEvent } from "./recordingAudio";
import { seedRandom } from "./seededRandom";
import { expectCallLogEqual } from "./expectCallLogEqual";
import { audioInit } from "../../src/audio/AudioEngine";
import { mulberry32, reseedSoundRandom } from "../../src/audio/SoundRandom";
import { NOISE_SECONDS, resetNoiseOffsets } from "../../src/audio/Noise";
import { previousMix } from "../../src/soundboard/previous/mix";

/**
 * THE SOUND ORACLE — plays one sound through the frozen reference's own code
 * and through the port's, against the same recording WebAudio surface
 * (`recordingAudio.ts`), so the two call logs can be compared. The same
 * technique as `tests/behavior/audio.test.ts`, widened from "one engine
 * function" to "one line of a call site", and shared by that file,
 * `weaponReport.test.ts` and `soundCatalogue.test.ts`.
 *
 * ## The one deliberate divergence it has to see through
 *
 * Player feedback round 2 Task 1 (`docs/superpowers/plans/2026-09-26-player-
 * feedback-2-sound.md`, `docs/known-issues.md` KNOWN-22) took sound off the
 * game's dice. The reference fills a fresh `AudioBuffer` from `Math.random()`
 * for every noise sound and draws every pitch jitter from `Math.random()`;
 * the port plays one shared noise buffer at an offset (`src/audio/Noise.ts`)
 * and draws its jitter from its own generator (`src/audio/SoundRandom.ts`).
 * Two things make the logs still comparable, and neither loosens anything
 * else:
 *
 * 1. **The dice.** The reference sandbox is handed a `Math` whose `random()`
 *    is a fresh copy of the port's jitter generator, seeded identically — and
 *    the reference's three buffer-fill loops (`bang`, `boom`, `noiseBuf`) are
 *    rewritten to draw their samples from a separate `__sample()` instead
 *    (`soundDiceChunks`). So every *jitter* draw the reference makes lands on
 *    exactly the value the port's `soundRandom()` returns at the same point —
 *    which it only does if the port draws jitter at the same points, in the
 *    same order, the same number of times. Sample data, which nothing logs,
 *    goes elsewhere.
 * 2. **The noise source** (`compareSoundLogs`). The per-play `AudioBuffer`,
 *    the `buffer` assignment, the buffer source's `start`/`stop`, and the
 *    fade the reference baked into its samples (`bang`'s `(1-t)^2`, `boom`'s
 *    `(1-t)^1.6`) all legitimately differ. Those events are checked against
 *    a positive contract first — the port plays the shared noise, starts it
 *    at the reference's time at an offset that fits, and stops it exactly
 *    when the reference's fresh buffer would have run out — and only then
 *    set aside. Everything else — every oscillator, filter, gain, envelope,
 *    connection and timer — must match event for event.
 *
 * ## The mix is set aside too (round 2, Task 2)
 *
 * Task 2 put a room, a compressor, a limiter and a per-sound level trim
 * after every sound (`src/audio/Mix.ts`, `src/audio/Levels.ts`). That is
 * routing, not synthesis, and it is not the reference's — so the port's
 * side of every comparison here builds the **pre-Task-2 mix**
 * (`src/soundboard/previous/mix.ts`, the sound board's "Old mix"), which
 * `tests/behavior/audio.test.ts` proves is the reference's own graph call
 * for call. On it a sound's level scope changes nothing and a bus call
 * lands on masterG/echoG exactly as before, so these oracles still compare
 * every oscillator, filter, gain and envelope a sound makes. The new mix,
 * and the level each catalogue sound plays at, are pinned on their own in
 * `tests/audio/mix.test.ts` and `tests/audio/levels.test.ts`.
 *
 * ## Quoting the reference
 *
 * The reference side of a catalogue case runs a **snippet of the reference's
 * own call-site text** — `blip(700,.3,"sawtooth",.12,1400)`, the Lost
 * Soul's charge — inside a sandbox holding the reference's audio engine.
 * `referenceSite()` refuses a snippet the reference does not contain
 * exactly once, so a snippet cannot drift from the file it claims to quote.
 */

const REFERENCE_TEXT = readFileSync(join(__dirname, "..", "..", "reference", "sonsurum.html"), "utf8").replace(/\r\n/g, "\n");

/** Throws unless `site` occurs in the reference exactly once; returns it. */
export function referenceSite(site: string): string {
  const n = REFERENCE_TEXT.split(site).length - 1;
  if (n !== 1) throw new Error(`reference/sonsurum.html contains ${n} copies of ${JSON.stringify(site)}, not 1`);
  return site;
}

/** The three sample-fill loops in the reference, and what each draws instead inside the oracle's sandbox. */
const FILL_LOOPS: ReadonlyArray<readonly [string, string]> = [
  ["d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2)", "d[i]=(__sample()*2-1)*Math.pow(1-i/d.length,2)"], // bang
  ["d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.6)", "d[i]=(__sample()*2-1)*Math.pow(1-i/d.length,1.6)"], // boom
  ["for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;", "for(let i=0;i<d.length;i++)d[i]=__sample()*2-1;"], // noiseBuf
];

/**
 * `chunks` with the reference's sample-fill loops drawing from `__sample()`
 * rather than `Math.random()` — see the module doc comment, point 1. Each
 * loop that appears is rewritten exactly once; a chunk set that contains a
 * loop the table does not know about still has it drawing jitter, which
 * `compareSoundLogs` would then report as a mismatch rather than hide.
 */
export function soundDiceChunks(chunks: readonly string[]): string[] {
  const joined = chunks.join("\n");
  for (const [from] of FILL_LOOPS) {
    const n = joined.split(from).length - 1;
    if (n > 1) throw new Error(`reference fill loop found ${n} times: ${from}`);
  }
  return chunks.map((c) => FILL_LOOPS.reduce((s, [from, to]) => s.replace(from, to), c));
}

/** The globals a reference sandbox needs to roll the port's sound dice: a `Math` whose `random` is the port's jitter generator at `seed`, and `__sample`. */
export function soundDiceGlobals(seed: number): { Math: Math; __sample: () => number } {
  const m = Object.create(Math) as Math;
  (m as { random: () => number }).random = mulberry32(seed);
  return { Math: m, __sample: () => 0 };
}

/** Puts the port's sound dice and noise offsets at the start of a known sequence. */
export function resetSoundDice(seed: number): void {
  reseedSoundRandom(seed);
  resetNoiseOffsets();
}

/** The reference's whole audio layer plus `rnd`/`clamp`/`pick`, in one sandbox so the bare `AC`/`masterG`/`echoG` resolve. */
export const REFERENCE_AUDIO_CHUNKS: readonly string[] = soundDiceChunks([
  refSource(REF.mathHelpers),
  refSource(REF.audioState),
  refSource(REF.audioInit),
  refSource(REF.blip),
  refSource(REF.bang),
  refSource(REF.click),
  refSource(REF.boom),
  refSource(REF.noiseBuf),
  refSource(REF.growl),
  refSource(REF.gurgle),
  refSource(REF.pain),
  refSource(REF.deathCry),
  refSource(REF.snarl),
]);

export function constructorReturning(target: unknown): new () => unknown {
  function Ctor(): unknown {
    return target;
  }
  return Ctor as unknown as new () => unknown;
}

/**
 * Runs `snippet` (reference call-site text) with `vars` bound as parameters,
 * after the reference's own `audioInit()`, and returns only the events the
 * snippet produced — timers included, drained with fake timers.
 */
export function recordReferenceSnippet(snippet: string, vars: Record<string, unknown>, seed: number): AudioEvent[] {
  const { ctx, events } = recordingAudioContext();
  const names = Object.keys(vars);
  vi.useFakeTimers();
  try {
    const ref = evalReference<{ audioInit: () => void; run: (...a: unknown[]) => void }>(
      REFERENCE_AUDIO_CHUNKS,
      `({audioInit,run:(${names.join(",")})=>{\n${snippet}\n}})`,
      {
        window: { AudioContext: constructorReturning(ctx) },
        ...soundDiceGlobals(seed),
        setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      },
    );
    ref.audioInit();
    const baseline = events.length;
    ref.run(...names.map((n) => vars[n]));
    vi.runAllTimers();
    return events.slice(baseline);
  } finally {
    vi.useRealTimers();
  }
}

/**
 * The port's side: the real `audioInit()` on the pre-Task-2 mix (see the
 * module doc comment), then `run` — a catalogue function
 * called the way its call site calls it. The gameplay `Math.random` is
 * seeded and **counted**: a sound that drew from it fails here, whatever
 * its log says.
 */
export function recordModuleSound(run: () => void, seed: number): AudioEvent[] {
  const { ctx, events } = recordingAudioContext();
  const previous = (globalThis as { AudioContext?: unknown }).AudioContext;
  (globalThis as { AudioContext?: unknown }).AudioContext = constructorReturning(ctx);
  const restoreRandom = seedRandom(seed);
  const seeded = Math.random;
  let gameplayDraws = 0;
  Math.random = () => { gameplayDraws++; return seeded(); };
  resetSoundDice(seed);
  vi.useFakeTimers();
  try {
    audioInit({ mix: previousMix });
    const baseline = events.length;
    run();
    vi.runAllTimers();
    expect(gameplayDraws, "a sound drew from the gameplay generator").toBe(0);
    return events.slice(baseline);
  } finally {
    vi.useRealTimers();
    restoreRandom();
    (globalThis as { AudioContext?: unknown }).AudioContext = previous;
  }
}

// ---------------------------------------------------------------------------
// Comparing a port log with a reference log across the noise-source change.

const SAMPLE_RATE = 44100; // recordingAudio.ts's fixed sampleRate
const EPS = 1e-9;

interface NoisePlay { source: string; when: number; offset?: number; stop?: number; bufferLen?: number; buffer?: string }

/** Every buffer source in a log, in creation order, with what it played and when. */
function noisePlays(events: readonly AudioEvent[]): NoisePlay[] {
  const bufferLen = new Map<string, number>();
  const plays = new Map<string, NoisePlay>();
  for (const e of events) {
    const d = e.detail;
    if (e.kind === "create" && d.type === "AudioBuffer") bufferLen.set(d.node as string, (d.args as number[])[1]);
    if (e.kind === "create" && d.type === "AudioBufferSourceNode") plays.set(d.node as string, { source: d.node as string, when: 0 });
    const p = plays.get(d.node as string);
    if (!p) continue;
    if (e.kind === "param" && d.prop === "buffer") { p.buffer = d.value as string; p.bufferLen = bufferLen.get(d.value as string); }
    if (e.kind === "start") { const a = d.args as number[]; p.when = a[0] ?? 0; p.offset = a[1]; }
    if (e.kind === "stop") p.stop = (d.args as number[])[0];
  }
  return [...plays.values()];
}

/** GainNodes carrying a `setValueCurveAtTime` — the fade the reference baked into its samples. */
function shapeNodes(events: readonly AudioEvent[]): Set<string> {
  return new Set(
    events.filter((e) => e.kind === "param" && e.detail.method === "setValueCurveAtTime").map((e) => e.detail.node as string),
  );
}

/**
 * The log with the noise source set aside: no `AudioBuffer`s, buffer
 * assignments read `"noise"`, no buffer-source `start`/`stop`, shape gains
 * spliced out of the graph, and every node renumbered in creation order so
 * the remaining ids line up.
 */
export function withoutNoiseSource(events: readonly AudioEvent[]): AudioEvent[] {
  const sources = new Set(events.filter((e) => e.kind === "create" && e.detail.type === "AudioBufferSourceNode").map((e) => e.detail.node as string));
  const shapes = shapeNodes(events);
  const feeds = new Map<string, string>(); // shape -> the node that fed it
  for (const e of events) if (e.kind === "connect" && shapes.has(e.detail.to as string)) feeds.set(e.detail.to as string, e.detail.from as string);
  const kept: AudioEvent[] = [];
  for (const e of events) {
    const d = e.detail;
    if (e.kind === "create" && (d.type === "AudioBuffer" || shapes.has(d.node as string))) continue;
    if ((e.kind === "start" || e.kind === "stop") && sources.has(d.node as string)) continue;
    if (e.kind === "param" && shapes.has(d.node as string)) continue;
    if (e.kind === "connect" && shapes.has(d.to as string)) continue;
    if (e.kind === "connect" && shapes.has(d.from as string)) { kept.push({ kind: "connect", detail: { ...d, from: feeds.get(d.from as string) } }); continue; }
    if (e.kind === "param" && d.prop === "buffer") { kept.push({ kind: "param", detail: { ...d, value: "noise" } }); continue; }
    kept.push(e);
  }
  // Renumber per node type, in creation order.
  const rename = new Map<string, string>();
  const counts: Record<string, number> = {};
  for (const e of kept) {
    if (e.kind !== "create") continue;
    const type = e.detail.type as string;
    counts[type] = (counts[type] ?? 0) + 1;
    rename.set(e.detail.node as string, `${type}#${counts[type]}`);
  }
  const fix = (v: unknown): unknown => {
    if (typeof v !== "string") return v;
    const [node, ...rest] = v.split(".");
    const r = rename.get(node);
    return r ? [r, ...rest].join(".") : v;
  };
  return kept.map((e) => ({
    kind: e.kind,
    detail: Object.fromEntries(Object.entries(e.detail).map(([k, v]) => [k, Array.isArray(v) ? v.map(fix) : fix(v)])),
  }));
}

/**
 * The comparison every oracle in `tests/behavior/` now uses for a sound that
 * plays noise. First the positive contract, per noise play, the port's k-th
 * buffer source against the reference's k-th:
 *
 * - it plays the port's shared noise (the same buffer for every play), never
 *   a buffer of its own;
 * - it starts when the reference's did, at an offset that leaves room for
 *   the whole play inside `NOISE_SECONDS`;
 * - it stops exactly when the reference's fresh buffer would have run out
 *   (the reference's buffer length / sample rate after its start), or when
 *   the reference stopped it explicitly, if earlier;
 * - where the reference baked a fade into those samples, the port shapes it
 *   with a gain curve over exactly that span, from 1 down to 0.
 *
 * Then `withoutNoiseSource` on both, compared event for event.
 */
export function compareSoundLogs(mod: readonly AudioEvent[], ref: readonly AudioEvent[], label: string): void {
  const mp = noisePlays(mod), rp = noisePlays(ref);
  expect(mp.length, `${label}: noise plays`).toBe(rp.length);
  const buffers = new Set(mp.map((p) => p.buffer));
  if (mp.length) expect(buffers.size, `${label}: every noise play shares one buffer`).toBe(1);
  for (let k = 0; k < mp.length; k++) {
    const m = mp[k], r = rp[k];
    expect(r.bufferLen, `${label}: the reference's play ${k} had a fresh buffer`).toBeGreaterThan(0);
    // The port's only buffer is the shared bank, built the first time a
    // context plays noise — so it may be created inside this log, once, at
    // NOISE_SECONDS long, and never per play.
    if (m.bufferLen !== undefined) expect(m.bufferLen, `${label}: the port's play ${k} is the shared noise bank`).toBe(Math.ceil(NOISE_SECONDS * SAMPLE_RATE));
    const dur = Math.min(r.bufferLen! / SAMPLE_RATE, r.stop !== undefined ? r.stop - r.when : Infinity);
    expect(m.when, `${label}: play ${k} start`).toBeCloseTo(r.when, 9);
    expect(m.offset, `${label}: play ${k} offset`).toBeGreaterThanOrEqual(0);
    expect(m.offset! + dur, `${label}: play ${k} fits the noise buffer`).toBeLessThanOrEqual(NOISE_SECONDS + EPS);
    expect(m.stop, `${label}: play ${k} stop`).toBeCloseTo(m.when + dur, 4); // 44.1 kHz rounding of the old buffer length
  }
  for (const e of mod) {
    if (e.kind !== "param" || e.detail.method !== "setValueCurveAtTime") continue;
    const curve = e.detail.value as number[];
    expect(curve[0], `${label}: a shape curve starts at full level`).toBe(1);
    expect(curve[curve.length - 1], `${label}: and fades to silence`).toBe(0);
    const fed = mod.find((c) => c.kind === "connect" && c.detail.to === e.detail.node)?.detail.from;
    const play = mp.find((p) => p.source === fed);
    expect(play, `${label}: a shape curve sits directly on a noise source`).toBeDefined();
    expect(e.detail.time).toBeCloseTo(play!.when, 9);
    expect(e.detail.duration as number).toBeCloseTo(play!.stop! - play!.when, 4);
  }
  expectCallLogEqual(withoutNoiseSource(mod), withoutNoiseSource(ref), label);
}
