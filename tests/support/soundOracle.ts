import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vi } from "vitest";
import { evalReference, REF, refSource } from "./reference";
import { recordingAudioContext, type AudioEvent } from "./recordingAudio";
import { seedRandom } from "./seededRandom";
import { audioInit } from "../../src/audio/AudioEngine";

/**
 * The sound catalogue's oracle: plays one sound through the frozen
 * reference's own code and through the port's, against the same recording
 * WebAudio surface (`recordingAudio.ts`) and the same seed, so the two call
 * logs can be compared. The same technique as `tests/behavior/audio.test.ts`,
 * widened from "one engine function" to "one line of a call site".
 *
 * The reference side runs a **snippet of the reference's own call-site
 * text** — `blip(700,.3,"sawtooth",.12,1400)`, the Lost Soul's charge, as
 * it appears in `reference/sonsurum.html` — inside a sandbox holding the
 * reference's audio engine. `referenceSite()` below refuses a snippet the
 * reference does not contain exactly once, so a snippet cannot drift from
 * the file it claims to quote.
 */

const REFERENCE_TEXT = readFileSync(join(__dirname, "..", "..", "reference", "sonsurum.html"), "utf8").replace(/\r\n/g, "\n");

/** Throws unless `site` occurs in the reference exactly once; returns it. */
export function referenceSite(site: string): string {
  const n = REFERENCE_TEXT.split(site).length - 1;
  if (n !== 1) throw new Error(`reference/sonsurum.html contains ${n} copies of ${JSON.stringify(site)}, not 1`);
  return site;
}

/** The reference's whole audio layer plus `rnd`/`clamp`/`pick`, in one sandbox so the bare `AC`/`masterG`/`echoG` resolve. */
export const REFERENCE_AUDIO_CHUNKS: readonly string[] = [
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
];

function constructorReturning(target: unknown): new () => unknown {
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
  const restoreRandom = seedRandom(seed);
  vi.useFakeTimers();
  try {
    const ref = evalReference<{ audioInit: () => void; run: (...a: unknown[]) => void }>(
      REFERENCE_AUDIO_CHUNKS,
      `({audioInit,run:(${names.join(",")})=>{\n${snippet}\n}})`,
      {
        window: { AudioContext: constructorReturning(ctx) },
        Math,
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
    restoreRandom();
  }
}

/** The port's side: the real `audioInit()`, then `run` — a catalogue function called the way its call site calls it. */
export function recordModuleSound(run: () => void, seed: number): AudioEvent[] {
  const { ctx, events } = recordingAudioContext();
  const previous = (globalThis as { AudioContext?: unknown }).AudioContext;
  (globalThis as { AudioContext?: unknown }).AudioContext = constructorReturning(ctx);
  const restoreRandom = seedRandom(seed);
  vi.useFakeTimers();
  try {
    audioInit();
    const baseline = events.length;
    run();
    vi.runAllTimers();
    return events.slice(baseline);
  } finally {
    vi.useRealTimers();
    restoreRandom();
    (globalThis as { AudioContext?: unknown }).AudioContext = previous;
  }
}
