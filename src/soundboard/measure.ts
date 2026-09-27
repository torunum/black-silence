import * as W from "../audio/sounds/weapons";
import * as M from "../audio/sounds/monsters";
import * as X from "../audio/sounds/explosions";
import * as WO from "../audio/sounds/world";
import { newMix, CLIP, DRY_SEND, ECHO_SEND, GLUE, LIMIT } from "../audio/Mix";
import { buildImpulse, ROOM_NAMES, ROOMS, type RoomName } from "../audio/Room";
import { clearLastSoundLevel, lastSoundLevel, SOUND_LEVELS, TARGETS, type SoundLevel } from "../audio/Levels";
import { previousMix } from "./previous/mix";
import { oldMonsterAlert } from "./previous/monsters";
import { at } from "../audio/AudioEngine";
import { renderOffline, type Rendered } from "./offline";
import { SOUND_ROWS } from "./registry";
import { VOICES } from "../audio/VoiceTable";
import { ENEMY_DEFS } from "../enemies/EnemyDefs";
import { WEAPON_STATS } from "../weapons/definitions";

/**
 * THE LEVEL MEASUREMENT — player feedback round 2, Task 2. Everything
 * `scripts/sound-levels.mjs` writes into `docs/sound-levels.md` is computed
 * here, in the browser, on a real `OfflineAudioContext`:
 * `await soundboard.levels()` from the board's console gives the same data.
 *
 * ## LK-fast
 *
 * The loudness figure the targets are set in (`src/audio/Levels.ts`):
 * the render K-weighted — ITU-R BS.1770's two biquads, a +4 dB high shelf
 * above ~1.5 kHz and a highpass around 38 Hz, coefficients as specified
 * for 48 kHz, which is why every render here is at 48 kHz — then the mean
 * square over a 125 ms window sliding in 10 ms steps, the loudest window,
 * as `-0.691 + 10 log10(mean square)`. BS.1770's own momentary window is
 * 400 ms; 125 ms is a sound-level meter's "fast", used because these are
 * short sounds (a click is 25 ms) and a 400 ms window rates a short sound
 * mostly by the silence around it.
 */

/** BS.1770 K-weighting at 48 kHz: shelf, then the RLB highpass. */
const SHELF = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
const RLB = { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] };

function biquad(x: Float32Array, f: { b: number[]; a: number[] }): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = f.b[0] * x[i] + f.b[1] * x1 + f.b[2] * x2 - f.a[0] * y1 - f.a[1] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

/** Loudest 125 ms K-weighted window, LKFS. Needs a 48 kHz render. */
export function lkFast(samples: Float32Array, sampleRate: number): number {
  if (sampleRate !== 48000) throw new Error("lkFast: K-weighting coefficients are for 48 kHz");
  const z = biquad(biquad(samples, SHELF), RLB);
  const win = Math.round(0.125 * sampleRate), hop = Math.round(0.01 * sampleRate);
  const sq = new Float64Array(z.length + 1);
  for (let i = 0; i < z.length; i++) sq[i + 1] = sq[i] + z[i] * z[i];
  let best = 0;
  for (let s = 0; s + win <= z.length; s += hop) best = Math.max(best, (sq[s + win] - sq[s]) / win);
  return best > 0 ? -0.691 + 10 * Math.log10(best) : -Infinity;
}

export interface Measured { peakDb: number; rmsDb: number; lk: number; seconds: number; clipped: number }
const measured = (r: Rendered): Measured => ({ peakDb: r.peakDb, rmsDb: r.rmsDb, lk: lkFast(r.samples, r.sampleRate), seconds: r.seconds, clipped: r.clipped });

/**
 * No single sound is trimmed so hot that it alone peaks above this (dBFS,
 * after the chain, at volume 1): the limiter and the soft clip are there for
 * sounds piling up, not to flatten one sound. A sound that cannot reach its
 * target under this ceiling — a very short one, whose energy is all in a few
 * milliseconds — stops here and is marked "peak-bound": it needs a longer
 * body, which is sound design (Tasks 3-5), not level.
 */
export const PEAK_CEILING = -1.5;
/** And no trim above +18 dB: past that it is not a level problem either. */
export const MAX_TRIM = 18;

/**
 * The automatic weapons — rate under 0.2 s — by their table entry. A player
 * hears these as a burst, not a shot: one 30-40 ms shot, rated alone, reads
 * far quieter than the stream of them the trigger actually makes. Their
 * entry is levelled by one second of fire at the weapon's own rate.
 */
const FIRE_ENTRIES = ["flarePistolFire", "shotgunFire", "combatRifleFire", "tommyGunFire", "sniperFire", "crossLauncherFire", "nailCannonFire", "soulReaperFire"];
const AUTOMATIC: ReadonlyArray<readonly [string, () => void, number]> = W.WEAPON_FIRE_SOUNDS
  .map((fire, slot) => [FIRE_ENTRIES[slot], fire, WEAPON_STATS[slot].rate] as const)
  .filter(([, , rate]) => rate < 0.2);

/** How long to render a row: long enough for its longest part and the hell room's tail. */
function secondsFor(id: string): number {
  if (id === "organ" || id === "boss-music" || id === "event-bells") return 6;
  if (id.startsWith("boom-") || id === "exit-opens") return 5;
  if (id.startsWith("event-") || id === "door-flesh" || id === "stinger-scream" || id.startsWith("boss-dies") || id.startsWith("boss-wakes")) return 5;
  return 4;
}

export interface RowLevel {
  id: string; name: string;
  /** The table entry the row played at, or null (the boss pulse, and the random stinger, whose entry depends on the roll). */
  entry: string | null;
  category: string;
  target: number | null;
  trim: number | null;
  before: Measured;
  after: Measured;
}

export interface LevelReport {
  rows: RowLevel[];
  entries: Array<{ name: string } & SoundLevel & { target: number; lk: number; peak: number; burst: boolean; error: number; bound: null | "peak" | "cap"; suggested: number }>;
  worst: Array<{ name: string; oldPeakDb: number; newPeakDb: number; newClipped: number; oldClipped: number }>;
  rooms: Array<{ room: RoomName; label: string; seconds: number; rt60: number; predelay: number; wet: number; buildMs: number; reverbDb: number }>;
  cost: Array<{ what: string; msPerSecond: number }>;
  crowd: Array<{ what: string; msPerSecond: number; peakDb: number; clipped: number }>;
  voices: VoiceCalibration[];
  chain: { glue: typeof GLUE; limit: typeof LIMIT; clip: typeof CLIP; drySend: number; echoSend: number };
  peakCeiling: number;
  maxTrim: number;
}

/** The worst cases: everything loud at once, at master volume 1. */
const WORST: Array<{ name: string; play: () => void }> = [
  {
    name: "barrel explosion + shotgun + 5 monsters (alerts, a death, a pain cry, a boss roar)",
    play: () => { X.barrelExplosion(); W.shotgunFire(); M.monsterAlert("A"); M.monsterAlert("C"); M.monsterDeath("n"); M.monsterPain("z"); M.bossRoar("E"); },
  },
  {
    name: "three explosions + three shotgun blasts + a sniper + boss death + 8 monsters, all in the same instant",
    play: () => {
      X.barrelExplosion(); X.barrelExplosion(); X.afritDeathExplosion(); W.shotgunFire(); W.shotgunFire(); W.shotgunFire(); W.sniperFire(); M.bossDies("G");
      for (const k of ["A", "C", "n", "k", "y", "s", "q", "R"]) M.monsterAlert(k);
    },
  },
  {
    // player feedback round 2 Task 5's: the layered explosion over a fight, with the player running through it
    name: "barrel explosion + three monsters + shotgun + running footsteps (0, 0.3, 0.6 s)",
    play: () => {
      X.barrelExplosion(); M.monsterAlert("z"); M.monsterPain("A"); M.monsterDeath("C"); W.shotgunFire();
      for (const t of [0, 300, 600]) setTimeout(() => WO.footstep(true, false, "stone"), t);
    },
  },
];

export async function measureLevels(onProgress?: (done: number, total: number) => void): Promise<LevelReport> {
  const rows: RowLevel[] = [];
  let done = 0;
  for (const row of SOUND_ROWS) {
    const play = row.versions[row.versions.length - 1].play;
    const seconds = secondsFor(row.id);
    const before = measured(await renderOffline(play, { mix: previousMix, volume: 1, seconds }));
    clearLastSoundLevel();
    const after = measured(await renderOffline(play, { mix: newMix, room: "hall", volume: 1, seconds }));
    const entry = row.id === "stinger-random" ? null : lastSoundLevel();
    const lvl = entry ? (SOUND_LEVELS as Record<string, SoundLevel>)[entry] : null;
    rows.push({
      id: row.id, name: row.name, entry, category: lvl ? lvl.category : row.id === "boss-music" ? "music (no level)" : "(varies)",
      target: lvl ? TARGETS[lvl.category] : null, trim: lvl ? lvl.trim : null, before, after,
    });
    onProgress?.(++done, SOUND_ROWS.length);
  }
  const bursts = new Map<string, Measured>();
  for (const [name, fire, rate] of AUTOMATIC) {
    const n = Math.round(1 / rate);
    bursts.set(name, measured(await renderOffline(() => { for (let i = 0; i < n; i++) setTimeout(fire, i * rate * 1000); }, { mix: newMix, room: "hall", volume: 1, seconds: 3 })));
  }
  const entries = Object.entries(SOUND_LEVELS as Record<string, SoundLevel>).map(([name, l]) => {
    const mine = rows.filter((r) => r.entry === name);
    const burst = bursts.get(name);
    const lk = burst ? burst.lk : mine.reduce((s, r) => s + r.after.lk, 0) / Math.max(1, mine.length);
    const peak = burst ? burst.peakDb : Math.max(...mine.map((r) => r.after.peakDb));
    const target = TARGETS[l.category];
    const toTarget = target - lk, toCeiling = PEAK_CEILING - peak;
    const move = Math.min(toTarget, toCeiling, MAX_TRIM - l.trim);
    const bound: null | "peak" | "cap" = move === toTarget ? null : move === toCeiling ? "peak" : "cap";
    return { name, ...l, target, lk, peak, burst: !!burst, error: lk - target, bound, suggested: Math.round((l.trim + move) * 10) / 10 };
  });
  const worst = [];
  for (const w of WORST) {
    const o = await renderOffline(w.play, { mix: previousMix, volume: 1, seconds: 4 });
    const n = await renderOffline(w.play, { mix: newMix, room: "hall", volume: 1, seconds: 4 });
    worst.push({ name: w.name, oldPeakDb: o.peakDb, newPeakDb: n.peakDb, oldClipped: o.clipped, newClipped: n.clipped });
  }
  const rooms = [];
  const probe = new OfflineAudioContext(1, 1, 48000);
  for (const room of ROOM_NAMES) {
    const t0 = performance.now();
    buildImpulse(probe, room);
    const buildMs = performance.now() - t0;
    // How loud the room is against the dry sound: the shotgun with and without it.
    const wet = await renderOffline(W.shotgunFire, { mix: newMix, room, volume: 1, seconds: 4 });
    const dry = await renderOffline(W.shotgunFire, { mix: (ac, v, r) => { const m = newMix(ac, v, r); return { ...m, route: (q) => m.route({ ...q, send: 0 }) }; }, volume: 1, seconds: 4 });
    // The tail: everything the room adds after the dry sound has died away
    // (-60 dB), against the dry sound's whole energy. Differencing the two
    // renders' totals would not do — the glue compressor reacts to the room's
    // early reflections, so "wet minus dry" can even come out negative.
    const energy = (s: Float32Array, from = 0): number => { let e = 0; for (let i = from; i < s.length; i++) e += s[i] * s[i]; return e; };
    const reverbDb = 10 * Math.log10(energy(wet.samples, Math.ceil(dry.seconds * dry.sampleRate)) / energy(dry.samples));
    const s = ROOMS[room];
    rooms.push({ room, label: s.label, seconds: s.seconds, rt60: s.rt60, predelay: s.predelay, wet: s.wet, buildMs, reverbDb });
  }
  // Render cost: 20 s of the drone bed plus the boss pulse, through each mix.
  const cost = [];
  const busy = (): void => { M.bossRoar("E"); };
  for (const [what, opts] of [
    ["old mix (delay echo, no chain)", { mix: previousMix }],
    ["new mix, stone hall (2.4 s stereo IR)", { mix: newMix, room: "hall" as RoomName }],
    ["new mix, hell (3.0 s stereo IR)", { mix: newMix, room: "hell" as RoomName }],
  ] as const) {
    const r = await renderOffline(busy, { ...opts, volume: 1, seconds: 20, drones: true });
    cost.push({ what, msPerSecond: r.renderMs / 20 });
  }
  const crowd = await measureCrowd();
  return { rows, entries, worst, rooms, cost, crowd, voices: calibrateVoices(rows), chain: { glue: GLUE, limit: LIMIT, clip: CLIP, drySend: DRY_SEND, echoSend: ECHO_SEND }, peakCeiling: PEAK_CEILING, maxTrim: MAX_TRIM };
}

/**
 * A room of ten monsters seeing the player in the same instant (player
 * feedback round 2 Task 4): ten alerts, each at its own place (so each has
 * its own HRTF panner, as in the game), through the new mix in the stone
 * hall. The render cost — offline, one thread, the median of three — of
 * the new voices, the old barks, and the same render with nothing in it.
 */
const CROWD = ["z", "z", "f", "m", "t", "j", "s", "g", "w", "C"];
export async function measureCrowd(): Promise<LevelReport["crowd"]> {
  const out: LevelReport["crowd"] = [];
  const cases: Array<[string, () => void]> = [
    ["nothing (the mix alone)", () => {}],
    ["ten alerts, old (snarl / moan)", () => CROWD.forEach((k, i) => { const x = i - 4.5, z = 4 + (i % 3); at(x, 1, z, () => oldMonsterAlert(k)); })],
    ["ten alerts, new voices", () => CROWD.forEach((k, i) => { const x = i - 4.5, z = 4 + (i % 3); at(x, 1, z, () => M.monsterAlert(k)); })],
  ];
  for (const [what, play] of cases) {
    const runs = [];
    for (let n = 0; n < 3; n++) runs.push(await renderOffline(play, { mix: newMix, room: "hall", volume: 1, seconds: 2 }));
    runs.sort((a, b) => a.renderMs - b.renderMs);
    out.push({ what, msPerSecond: runs[1].renderMs / 2, peakDb: runs[1].peakDb, clipped: runs[1].clipped });
  }
  return out;
}

/**
 * How much louder than average a voice is meant to be, dB: 2 dB per doubling
 * of the creature's size (sprite `w`·`h`, against a zombie's 1.4), within
 * ±4 dB — a lost soul's shriek a little under the crowd, a boss a little
 * over it. Player feedback round 2 Task 4: the loudness of a voice follows
 * the creature, by design, not by how its formants happen to meet its cords.
 */
export function VOICE_TILT(kind: string): number {
  const d = ENEMY_DEFS[kind];
  return Math.max(-4, Math.min(4, 2 * Math.log2((d.w * d.h) / 1.4)));
}

export interface VoiceCalibration { kind: string; gain: number; tilt: number; offset: number; rows: number; suggested: number }

/**
 * Each voice's `gain` (`src/audio/VoiceTable.ts`): its alert, pain, attack
 * and death rows are compared with the mean of the rows at the same table
 * entry, less the difference between its tilt and theirs; the voice's
 * offset is the mean of those, and the suggestion removes it. (Weighted by
 * rows, so the corrections at an entry sum to nothing and the gains do
 * not drift against the trims.) Like the
 * trims, it takes a pass or two to settle, because each entry's mean moves
 * with the voices in it.
 */
function calibrateVoices(rows: RowLevel[]): VoiceCalibration[] {
  const ROW = /^monster-(alert|pain|death|attack)-(\w)$/;
  const kindOf = (r: RowLevel): string => ROW.exec(r.id)![2];
  const voiced = rows.filter((r) => ROW.test(r.id) && r.entry && Number.isFinite(r.after.lk));
  const mean = (x: number[]): number => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);
  // Per entry: the mean level of its rows, and the mean tilt of the voices in them (weighted as the rows are).
  const entryMean = new Map<string, { lk: number; tilt: number }>();
  for (const e of new Set(voiced.map((r) => r.entry!))) {
    const mine = voiced.filter((r) => r.entry === e);
    entryMean.set(e, { lk: mean(mine.map((r) => r.after.lk)), tilt: mean(mine.map((r) => VOICE_TILT(kindOf(r)))) });
  }
  return Object.keys(VOICES).map((kind) => {
    const tilt = VOICE_TILT(kind);
    const mine = voiced.filter((r) => kindOf(r) === kind);
    // how far its rows sit from where the tilt wants them, relative to their entry's rows
    const offset = mean(mine.map((r) => { const m = entryMean.get(r.entry!)!; return r.after.lk - m.lk - (tilt - m.tilt); }));
    const gain = VOICES[kind].gain ?? 0;
    return { kind, gain, tilt, offset, rows: mine.length, suggested: Math.round((gain - offset) * 10) / 10 };
  });
}
