import { soundRandom } from "./SoundRandom";

/**
 * THE MONSTER VOICES, AS DATA — player feedback round 2 Task 4
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * Until this task a monster's alert, pain, attack and death were the
 * reference's swept square and sawtooth `blip`s, or its `growl` (four
 * detuned oscillators and a noise throat) at a pitch taken from the
 * monster's *pain threshold* — so a Ghoul and a Baron differed by whatever
 * their stagger stat happened to be. Now every enemy has a **voice**: a
 * row in the table below, built into sound by `./Speak.ts`.
 *
 * ## What a voice is
 *
 * A source-filter voice, the way a throat works:
 *
 * - **the cords**: a sawtooth (a square for the small skittering things)
 *   at the voice's fundamental `f0`, with **breath** (the shared noise)
 *   mixed in, through a `WaveShaper` for **grit** — a rough larynx;
 * - **the tract**: three bandpass filters in parallel at a vowel's
 *   formants, gliding from one vowel to another over the sound, scaled to
 *   the creature's size (a bigger throat has lower formants);
 * - **the growl**: the whole voice amplitude-modulated at 30-80 Hz, which
 *   is what turns a tone into a snarl;
 * - pitch **jitter** (a random walk, every 40 ms) and **vibrato**, so it is
 *   never a clean tone;
 * - an envelope from silence to silence, so it never clicks.
 *
 * Bosses add a **second voice an octave down** through the same throat, and
 * go to the room through `echoBus()` rather than `masterBus()` — more of
 * them in the reverb.
 *
 * ## The table
 *
 * Five families give the character; each enemy row picks one and sets its
 * fundamental, overriding a family value where the creature needs it.
 * The fundamentals fall with size (sprite `w`·`h` in
 * `src/enemies/EnemyDefs.ts`): `tests/audio/monsterVoices.test.ts` fails if
 * any enemy is clearly bigger than another and not lower.
 *
 * | family | who | character |
 * |---|---|---|
 * | `skitter` | crawler, dog, lost soul | high, chittering, screechy: a square cord, bright "ee" formants, a fast growl |
 * | `moan` | the zombies, the cultist, the wailer | throaty moans, wet: "oh"→"uh", slow growl, breath, a gurgle as they die |
 * | `bellow` | Mancubus, Ettin, Brute, Slaughtaur | low bellows: "ah"→"oh", a heavy growl, grit |
 * | `hiss` | Cacodemon, Afrit, Reiver, Gargoyle | airy, hissing: mostly breath through the formants |
 * | `titan` | the eight bosses | heavier and layered: a sub-octave voice, more room |
 *
 * ## Variation
 *
 * Every emission draws from sound's own generator (`./SoundRandom.ts`,
 * never `Math.random`): its pitch, length, growl rate, vibrato rate and
 * formant scale are jittered a few percent, and the pitch walk is drawn
 * fresh. Two alerts from the same monster differ; the same seed gives the
 * same two alerts.
 */

export type Vowel = "a" | "o" | "u" | "e" | "i" | "U";

/** First three formants (Hz) of each vowel, for a man-sized throat: "ah", "oh", "oo", "eh", "ee", "uh". */
export const VOWELS: Readonly<Record<Vowel, readonly [number, number, number]>> = {
  a: [730, 1090, 2440],
  o: [570, 840, 2410],
  u: [300, 870, 2240],
  e: [530, 1840, 2480],
  i: [270, 2290, 3010],
  U: [640, 1190, 2390],
};

export type Family = "skitter" | "moan" | "bellow" | "hiss" | "titan";

export interface FamilyDef {
  /** The cords' waveform. */
  wave: "sawtooth" | "square";
  /** The vowel the voice starts on and the one it glides to. */
  vowels: readonly [Vowel, Vowel];
  /** Growl: the rate (Hz) of the amplitude modulation, and its depth (at most .5). */
  growl: number;
  growlDepth: number;
  /** The growl's waveform: a sine rumbles, a triangle chitters. */
  growlWave: "sine" | "triangle";
  /** 0-1: how much of the source is breath (noise) rather than cords. */
  breath: number;
  /** tanh drive of the larynx's WaveShaper. */
  grit: number;
  /** Vibrato rate (Hz) and depth (cents). */
  vibrato: readonly [number, number];
  /** Depth of the pitch random walk, in cents. */
  jitter: number;
  /** A gurgle as it dies. */
  wet: boolean;
  /** A second voice an octave down, through the same throat. */
  sub: boolean;
  /** Through `echoBus()`: more of it in the room. */
  echo: boolean;
}

export const FAMILIES: Readonly<Record<Family, FamilyDef>> = {
  skitter: { wave: "square", vowels: ["i", "e"], growl: 68, growlDepth: 0.45, growlWave: "triangle", breath: 0.3, grit: 3, vibrato: [11, 45], jitter: 70, wet: false, sub: false, echo: false },
  moan: { wave: "sawtooth", vowels: ["o", "U"], growl: 36, growlDepth: 0.35, growlWave: "sine", breath: 0.35, grit: 1.6, vibrato: [5, 25], jitter: 40, wet: true, sub: false, echo: false },
  bellow: { wave: "sawtooth", vowels: ["a", "o"], growl: 46, growlDepth: 0.45, growlWave: "sine", breath: 0.18, grit: 2.4, vibrato: [3.5, 18], jitter: 22, wet: false, sub: false, echo: false },
  hiss: { wave: "sawtooth", vowels: ["e", "a"], growl: 58, growlDepth: 0.25, growlWave: "sine", breath: 0.7, grit: 1.2, vibrato: [6.5, 30], jitter: 30, wet: false, sub: false, echo: false },
  titan: { wave: "sawtooth", vowels: ["a", "u"], growl: 38, growlDepth: 0.5, growlWave: "sine", breath: 0.22, grit: 3, vibrato: [3, 14], jitter: 16, wet: false, sub: true, echo: true },
};

/** One enemy's voice: its family, its fundamental, and what it changes about its family. */
export interface VoiceDef {
  family: Family;
  /** Fundamental, Hz. Falls with size. */
  f0: number;
  vowels?: readonly [Vowel, Vowel];
  growl?: number;
  breath?: number;
  grit?: number;
  wet?: boolean;
  /**
   * Loudness correction, dB. A square cord through bright formants is far
   * louder than breath through narrow ones at the same level, so each voice
   * is measured and corrected until its alert, pain, attack and death sit
   * where its size puts them under the one trim each event has
   * (`src/soundboard/measure.ts`'s `VOICE_TILT`): written by
   * `scripts/sound-levels.mjs --apply`, listed in `docs/sound-levels.md`.
   */
  gain?: number;
}

/**
 * Every enemy in `src/enemies/EnemyDefs.ts`, by its grid letter. Size is the
 * sprite's `w`·`h`. One row per line, `K: { family: …, f0: n, …, gain: n },`
 * — the shape `scripts/sound-levels.mjs` rewrites `gain` in. Keep it.
 */
export const VOICES: Readonly<Record<string, VoiceDef>> = {
  // size .49 .. 1.0 — small, fast things
  L: { family: "skitter", f0: 420, grit: 3.6, gain: -3.5 },                       // Lost soul: a burning skull's shriek
  w: { family: "skitter", f0: 300, gain: -2.7 },                                  // Crawler: chittering
  g: { family: "skitter", f0: 240, vowels: ["a", "U"], growl: 62, gain: -1.1 },   // Zombie dog: a snarl, not a squeak
  // size 1.1 .. 1.6 — humanoids
  f: { family: "moan", f0: 175, vowels: ["e", "U"], gain: -1.4 },                 // Fast zombie: a rasp
  j: { family: "moan", f0: 150, vowels: ["U", "a"], breath: 0.25, wet: false, gain: -0.8 }, // Cultist: a man's chant-grunt
  s: { family: "moan", f0: 165, vowels: ["i", "a"], breath: 0.45, gain: -1.1 },   // Wailer
  z: { family: "moan", f0: 120, gain: -0.9 },                                     // Zombie
  m: { family: "moan", f0: 115, grit: 2.2, gain: -2 },                          // Armoured zombie: muffled, rougher
  t: { family: "moan", f0: 105, breath: 0.5, gain: -1.4 },                        // Toxic zombie: bubbling
  // size 1.4 .. 2.3 — flying things
  q: { family: "hiss", f0: 140, breath: 0.8, gain: -1.3 },                        // Afrit: fire's hiss
  R: { family: "hiss", f0: 130, vowels: ["u", "o"], gain: -0.3 },                 // Reiver: a hollow wail
  y: { family: "hiss", f0: 95, grit: 2.6, breath: 0.5, gain: -2.4 },              // Stone gargoyle: grinding
  C: { family: "hiss", f0: 88, vowels: ["a", "o"], gain: 0 },                  // Cacodemon: a hissing bellow
  // size 2.2 .. 3.3 — big demons
  k: { family: "bellow", f0: 82, vowels: ["a", "e"], grit: 3, gain: 0.4 },       // Slaughtaur
  n: { family: "bellow", f0: 78, gain: 0.8 },                                    // Ettin
  B: { family: "bellow", f0: 62, gain: 1.9 },                                    // Brute
  A: { family: "bellow", f0: 58, gain: 1.9 },                                    // Mancubus
  // size 3.7 .. 7.3 — the bosses
  N: { family: "titan", f0: 56, gain: 2.2 },                                     // The Gravedigger
  Q: { family: "titan", f0: 52, vowels: ["o", "a"], gain: 1.3 },                 // The Corrupted Priest
  U: { family: "titan", f0: 50, vowels: ["o", "u"], grit: 3.6, gain: 1.9 },      // The Cathedral Guardian: stone
  E: { family: "titan", f0: 46, gain: 3.5 },                                     // The Mutant Executioner
  Z: { family: "titan", f0: 44, gain: 4.9 },                                     // The Bone Sovereign
  V: { family: "titan", f0: 42, grit: 3.6, gain: 4.5 },                          // The Factory Foreman
  H: { family: "titan", f0: 40, breath: 0.4, wet: true, gain: 3.6 },             // The Hollow Leviathan: it breathes filth
  G: { family: "titan", f0: 36, wet: true, gain: 3.8 },                          // The Living Heart
};

/** The voice an unknown kind gets (nothing in the game asks for one; a caller's mistake still makes a sound). */
export const FALLBACK_VOICE = "z";

export type VocalEvent =
  | "alert" | "pain" | "attack" | "death"
  | "charge" | "heave" | "scream"
  | "roar" | "roarTail" | "wake" | "summon";

/** What an event does to a voice: how long, how it bends the pitch, how it starts. */
export interface EventDef {
  /** Seconds, before the size scaling (bigger creatures are slower). */
  dur: number;
  /** Seconds from silence to the peak. */
  attack: number;
  /** Pitch contour, as multiples of `f0`, spread evenly over the sound. */
  pitch: readonly number[];
  /** Overrides the voice's vowels. */
  vowels?: readonly [Vowel, Vowel];
  /** Multiplies the vibrato depth. */
  vibrato?: number;
}

export const EVENTS: Readonly<Record<VocalEvent, EventDef>> = {
  alert: { dur: 0.7, attack: 0.05, pitch: [1, 1.22, 1.12, 0.82] },
  pain: { dur: 0.26, attack: 0.012, pitch: [1.45, 1.7, 1.05] },
  attack: { dur: 0.3, attack: 0.02, pitch: [1.05, 1.3, 0.9] },
  death: { dur: 1.0, attack: 0.03, pitch: [1.25, 1.05, 0.72, 0.5] },
  charge: { dur: 0.42, attack: 0.03, pitch: [1, 1.5, 2.1] },
  heave: { dur: 0.5, attack: 0.09, pitch: [0.8, 0.95, 1.2] },
  scream: { dur: 1.0, attack: 0.06, pitch: [1.7, 2.6, 2.5, 1.9], vowels: ["i", "a"], vibrato: 1.6 },
  roar: { dur: 1.1, attack: 0.08, pitch: [0.9, 1.2, 1.05, 0.78] },
  roarTail: { dur: 0.6, attack: 0.05, pitch: [1.05, 1.25, 0.85] },
  wake: { dur: 1.7, attack: 0.45, pitch: [0.55, 0.85, 1.1, 0.95] },
  summon: { dur: 0.95, attack: 0.12, pitch: [1, 1.02, 1, 0.92], vowels: ["o", "u"], vibrato: 2.5 },
};

/** The voice a kind speaks with: its row over its family. */
export function voiceOf(kind: string): FamilyDef & { f0: number; gain: number; family: Family } {
  const v = VOICES[kind] ?? VOICES[FALLBACK_VOICE];
  const fam = FAMILIES[v.family];
  return {
    ...fam,
    family: v.family,
    f0: v.f0,
    vowels: v.vowels ?? fam.vowels,
    growl: v.growl ?? fam.growl,
    breath: v.breath ?? fam.breath,
    grit: v.grit ?? fam.grit,
    wet: v.wet ?? fam.wet,
    gain: v.gain ?? 0,
  };
}

/** Everything `./Speak.ts` needs to build one emission — pure data, so it can be tested without an audio graph. */
export interface VoicePlan {
  kind: string;
  event: VocalEvent;
  wave: OscillatorType;
  /** Seconds. */
  dur: number;
  attack: number;
  /** The cords' pitch, as [seconds, Hz] points, jitter included. */
  pitch: Array<[number, number]>;
  /** A second voice at half the pitch. */
  sub: boolean;
  formants: Array<{ from: number; to: number; q: number; gain: number }>;
  breath: number;
  grit: number;
  growl: { rate: number; depth: number; wave: OscillatorType };
  vibrato: { rate: number; cents: number };
  /** A gurgle under the death. */
  wet: boolean;
  echo: boolean;
  /** Linear level of the whole voice. */
  level: number;
}

const FORMANT_Q = [5, 6, 8];
const FORMANT_GAIN = [1, 0.6, 0.35];
/** Seconds between the pitch walk's steps. */
export const JITTER_STEP = 0.04;

const clampTo = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** Nyquist at the 48 kHz the levels are measured at: harmonics above it do not sound. */
const NYQUIST = 24000;

/** Power gain of a unit-peak bandpass (the RBJ/analog prototype WebAudio's is) at `f`. */
function bandpassPower(f: number, fc: number, q: number): number {
  const x = f / fc, b = x / q;
  return (b * b) / ((1 - x * x) ** 2 + b * b);
}

/**
 * How much power a throat passes: every harmonic of the cords (a sawtooth's
 * 2/πn, a square's odd 4/πn; a boss's sub-octave too) and the breath (the
 * shared noise, uniform ±1) through the three formants, at their gains.
 * Why it is needed: a high square cord through bright formants puts a
 * strong harmonic under every band, while a low voice's first formant can
 * sit between two weak ones and breath through a narrow band is thin — at
 * the same level, 15 dB apart, measured. Dividing it out puts every voice
 * and event at one power before the envelope, so one trim per event fits
 * them all; what the grit and the growl then do, and the ear's weighting,
 * is left to each voice's measured `gain`.
 */
export function throatPower(
  wave: "sawtooth" | "square", f0: number, formants: ReadonlyArray<{ f: number; q: number; gain: number }>, breath: number, sub: boolean,
): number {
  const cords = 1 - breath * 0.6, air = breath * 0.8;
  const voices: Array<[number, number]> = sub ? [[f0, 1], [f0 / 2, 0.8]] : [[f0, 1]];
  let p = 0;
  for (const fm of formants) {
    let h = 0;
    for (const [pitch, g] of voices) {
      for (let n = 1; n * pitch < NYQUIST && n <= 400; n++) {
        if (wave === "square" && n % 2 === 0) continue;
        const a = ((wave === "square" ? 4 : 2) / (Math.PI * n)) * g;
        h += ((a * a) / 2) * bandpassPower(n * pitch, fm.f, fm.q);
      }
    }
    const noise = (1 / 3) * (Math.PI / 2) * (fm.f / fm.q) / NYQUIST;
    p += fm.gain * fm.gain * (cords * cords * h + air * air * noise);
  }
  return p;
}

let reference: number | null = null;
/** The power of a zombie's alert with no jitter — the level every voice is brought to. */
function referencePower(): number {
  if (reference === null) {
    const z = voiceOf("z"), ev = EVENTS.alert, tract = Math.pow(z.f0 / 120, 0.3);
    reference = throatPower(z.wave, z.f0 * ev.pitch[0], [0, 1, 2].map((i) => ({ f: VOWELS[z.vowels[0]][i] * tract, q: FORMANT_Q[i], gain: FORMANT_GAIN[i] })), z.breath, z.sub);
  }
  return reference;
}

/**
 * One emission of `event` in `kind`'s voice. Draws from `dice` — sound's own
 * generator unless a test passes another — a fixed number of times plus one
 * per pitch step, so the same seed plans the same sound.
 */
export function voicePlan(kind: string, event: VocalEvent, dice: () => number = soundRandom): VoicePlan {
  const v = voiceOf(kind);
  const ev = EVENTS[event];
  const j = (amount: number): number => 1 + (dice() * 2 - 1) * amount;
  const pitchJit = j(0.06), durJit = j(0.08), growlJit = j(0.12), vibJit = j(0.2), tractJit = j(0.05);
  // A bigger creature is slower, and its throat is longer: lower formants.
  const size = 120 / v.f0;
  const dur = ev.dur * clampTo(Math.pow(size, 0.2), 0.85, 1.35) * durJit;
  const tract = clampTo(Math.pow(v.f0 / 120, 0.3), 0.65, 1.5) * tractJit;
  const [va, vb] = ev.vowels ?? v.vowels;
  const formants = [0, 1, 2].map((i) => ({
    from: VOWELS[va][i] * tract,
    to: VOWELS[vb][i] * tract,
    q: FORMANT_Q[i],
    gain: FORMANT_GAIN[i],
  }));
  const contour = (x: number): number => {
    const p = ev.pitch, s = x * (p.length - 1), i = Math.min(p.length - 2, Math.floor(s));
    return p[i] + (p[i + 1] - p[i]) * (s - i);
  };
  const pitch: Array<[number, number]> = [];
  let walk = 0;
  const steps = Math.max(2, Math.ceil(dur / JITTER_STEP));
  for (let n = 0; n <= steps; n++) {
    const t = (n / steps) * dur;
    walk = walk * 0.6 + (dice() * 2 - 1) * 0.8;
    pitch.push([t, v.f0 * pitchJit * contour(t / dur) * Math.pow(2, (walk * v.jitter) / 1200)]);
  }
  // Every voice and event at the same power into the envelope (see throatPower), then the voice's own correction.
  const power = [0, 0.25, 0.5, 0.75, 1].reduce((sum, x) => sum + throatPower(v.wave, v.f0 * pitchJit * contour(x),
    formants.map((f) => ({ f: f.from * Math.pow(f.to / f.from, x), q: f.q, gain: f.gain })), v.breath, v.sub), 0) / 5;
  const level = 0.5 * clampTo(Math.sqrt(referencePower() / power), 0.2, 5) * Math.pow(10, v.gain / 20);
  return {
    kind, event, wave: v.wave, dur, attack: Math.min(ev.attack, dur * 0.4),
    pitch, sub: v.sub, formants, breath: v.breath, grit: v.grit,
    growl: { rate: v.growl * growlJit, depth: v.growlDepth, wave: v.growlWave },
    vibrato: { rate: v.vibrato[0] * vibJit, cents: v.vibrato[1] * (ev.vibrato ?? 1) },
    wet: v.wet && event === "death",
    echo: v.echo,
    level,
  };
}
