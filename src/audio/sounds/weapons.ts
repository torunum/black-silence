import { bang, blip } from "../Sfx";
import { after } from "../../core/Timers";
import { soundRandom, soundRnd } from "../SoundRandom";
import { lv } from "../Levels";
import { jit, play, type Glue, type Layer } from "../Layers";

/**
 * THE SOUND CATALOGUE — WEAPONS. What the player's weapons sound like when
 * they fire, and the kick; the mechanisms (reloads, the pump, the switch,
 * the dry click) are in `./foley.ts`. Every sound is a named function the
 * game calls and the sound board (`soundboard.html`) plays by name — player
 * feedback round 2, Task 1.
 *
 * ## The reports — player feedback round 2, Task 3
 *
 * The owner said the sounds were "still very bad", and named the gun in
 * round 1. Round 1's report (`gunshot()`, kept on the board as "old",
 * `src/soundboard/previous/weapons.ts`) was one shape for six weapons: a
 * 4 ms crack and a 30-170 ms body. Task 2 measured the consequence: every
 * gun sat 3-6 dB under its -14 LK target, because a sound that short hits
 * the peak ceiling long before it is loud. And the relic and the
 * soul-eater were still the reference's swept square and sawtooth.
 *
 * Now each weapon is its own layered design (`../Layers.ts`): a
 * **transient** squashed by saturation so it hits without being one tall
 * spike, a **body** with that weapon's character and enough length (a
 * hold before the fall) for the ear to hear it as loud, a **thump** (a
 * pitch-dropping sine, some of them frequency-modulated), a **mechanical
 * tail** where the weapon has a mechanism that runs on the shot, and the
 * **room** — each weapon's entry in `../Levels.ts` sends more of it to the
 * level's reverb than a plain sound gets, so a shot indoors has the hall
 * answering it.
 *
 * The automatic weapons vary every shot — pitch and filter corners
 * jittered from sound's own generator (`jit`, never `Math.random`) — so
 * fifteen rounds a second are fifteen rounds and not one sample looped,
 * and their bodies end well inside one period (66 ms for the tommy gun,
 * 50 ms for the nail cannon) so a burst stays a burst instead of a wash.
 *
 * Nobody who wrote this has heard it. It is argued from synthesis and
 * checked by measurement — levels, spectrograms, clipping, clicks — and
 * the owner judges it on the board, old against new.
 */

/** Slot 0 — a signal pistol's hollow pop, then the fizz of the flare catching. */
function flare(): Layer[] {
  const p = jit(0.03);
  return [
    // transient: the primer's snap
    { noise: "white", filters: [{ type: "highpass", f: 1800 }], env: { a: 0.0004, h: 0.001, d: 0.02 }, drive: 3, level: 0.3 },
    // the hollow pop: a wide bore's resonance, a pitched "tok" falling as the gas leaves
    { noise: "white", filters: [{ type: "bandpass", f: 640 * p, q: 5, to: 420 * p, over: 0.06 }], env: { a: 0.001, h: 0.03, d: 0.16 }, drive: 2.5, level: 1.1 },
    { noise: "pink", filters: [{ type: "lowpass", f: 2600, to: 500, over: 0.1 }], env: { a: 0.001, h: 0.025, d: 0.14 }, drive: 1.6, level: 0.6 },
    // thump
    { tone: "sine", f: 190 * p, to: 70 * p, over: 0.05, env: { a: 0.001, h: 0.012, d: 0.12 }, drive: 1.8, level: 0.6 },
    // the flare igniting: a bright crackling fizz that lingers
    { at: 0.012, noise: "white", filters: [{ type: "highpass", f: 3000 }, { type: "bandpass", f: 6500, q: 0.8, to: 3800, over: 0.6 }],
      env: { a: 0.02, h: 0.12, d: 0.6 }, am: { rate: 37, depth: 0.45, type: "square", to: 23, over: 0.6 }, level: 0.3 },
  ];
}

/** Slot 1 — the biggest, widest boom: two barrels a hair apart, low and chesty. */
function shotgun(): Layer[] {
  const p = jit(0.02);
  return [
    { noise: "white", filters: [{ type: "highpass", f: 900 }], env: { a: 0.0005, h: 0.002, d: 0.035 }, drive: 4, level: 0.6 },
    // the blast, its corner collapsing as it expands
    { noise: "white", filters: [{ type: "lowpass", f: 4200, to: 260, over: 0.3, q: 0.6 }], env: { a: 0.001, h: 0.035, d: 0.36 }, drive: 2.4, level: 1 },
    // the second barrel, 7 ms behind: wider, not twice as loud
    { at: 0.007, noise: "white", filters: [{ type: "bandpass", f: 1300 * p, q: 0.8, to: 500, over: 0.1 }], env: { a: 0.001, h: 0.012, d: 0.12 }, drive: 2, level: 0.5 },
    // chest: a sub drop, frequency-modulated so it has a body you feel, and the cavity it rings in
    { tone: "sine", f: 108 * p, to: 36, over: 0.22, fm: { ratio: 1.5, index: 1.2, to: 0 }, env: { a: 0.002, h: 0.03, d: 0.38 }, drive: 2, level: 0.9 },
    { noise: "pink", filters: [{ type: "bandpass", f: 170, q: 1.3, to: 110, over: 0.2 }], env: { a: 0.002, h: 0.025, d: 0.26 }, drive: 1.5, level: 0.8 },
  ];
}

/** Slot 2 — a sharp supersonic crack with a tight body, and the bolt carrier cycling. */
function rifle(): Layer[] {
  const p = jit(0.04), q = jit(0.08);
  return [
    { noise: "white", filters: [{ type: "highpass", f: 2600 * q }], env: { a: 0.0003, h: 0.0008, d: 0.014 }, drive: 5, level: 0.45 },
    // the N-wave's edge: a tiny bright tick that falls in a few milliseconds
    { tone: "sine", f: 1900 * p, to: 800, over: 0.004, env: { a: 0.0002, d: 0.007 }, drive: 3, level: 0.2 },
    { noise: "white", filters: [{ type: "bandpass", f: 1150 * p, q: 1.1 }, { type: "lowpass", f: 5200 * q, to: 1300, over: 0.06 }], env: { a: 0.0008, h: 0.018, d: 0.075 }, drive: 2.6, level: 1 },
    { tone: "sine", f: 175 * p, to: 58, over: 0.045, env: { a: 0.001, h: 0.006, d: 0.07 }, drive: 1.6, level: 0.55 },
    // the carrier running back and home
    { at: 0.032, tone: "sine", f: [3150 * p, 4730 * p], env: { a: 0.0003, d: 0.02 }, level: 0.08 },
    { at: 0.058, tone: "sine", f: [2210 * p, 3380 * p], env: { a: 0.0003, d: 0.025 }, level: 0.08 },
  ];
}

/** Slot 3 — a fast, rattly .45 thump: heavier and lower than the rifle, and short enough for fifteen a second. */
function tommy(): Layer[] {
  const p = jit(0.05), q = jit(0.1);
  return [
    { noise: "white", filters: [{ type: "highpass", f: 1400 * q }], env: { a: 0.0004, h: 0.001, d: 0.016 }, drive: 3.5, level: 0.3 },
    { noise: "white", filters: [{ type: "lowpass", f: 2600 * q, to: 420, over: 0.045 }], env: { a: 0.0008, h: 0.014, d: 0.048 }, drive: 2.8, level: 1 },
    // the .45's thud
    { noise: "pink", filters: [{ type: "bandpass", f: 330 * p, q: 1.6 }], env: { a: 0.001, h: 0.012, d: 0.05 }, drive: 1.5, level: 0.7 },
    { tone: "sine", f: 150 * p, to: 52 * p, over: 0.035, env: { a: 0.001, h: 0.004, d: 0.05 }, drive: 1.8, level: 0.65 },
    // the rattle: the bolt slamming home on every round
    { at: 0.012, tone: "sine", f: [2650 * q, 3990 * q], env: { a: 0.0003, d: 0.018 }, level: 0.1 },
  ];
}

/** Slot 4 — an enormous crack, then a long rolling tail. */
function sniper(): Layer[] {
  const p = jit(0.02);
  return [
    { noise: "white", filters: [{ type: "highpass", f: 2200 }], env: { a: 0.0003, h: 0.0015, d: 0.025 }, drive: 6, level: 0.85 },
    { noise: "white", filters: [{ type: "lowpass", f: 4600, to: 180, over: 0.45, q: 0.6 }], env: { a: 0.001, h: 0.035, d: 0.5 }, drive: 2.6, level: 1 },
    { tone: "sine", f: 96 * p, to: 30, over: 0.3, fm: { ratio: 1.41, index: 1.5, to: 0 }, env: { a: 0.002, h: 0.03, d: 0.5 }, drive: 2.2, level: 0.95 },
    // the roll: slaps off far walls, then low thunder that swells and rolls away
    { at: 0.085, noise: "white", filters: [{ type: "bandpass", f: 950, q: 0.7 }, { type: "lowpass", f: 2600 }], env: { a: 0.002, h: 0.01, d: 0.16 }, drive: 1.5, level: 0.35 },
    { at: 0.19, noise: "white", filters: [{ type: "bandpass", f: 700, q: 0.7 }, { type: "lowpass", f: 1800 }], env: { a: 0.003, h: 0.01, d: 0.2 }, level: 0.2 },
    { at: 0.03, noise: "brown", filters: [{ type: "lowpass", f: 420, to: 120, over: 1.4 }], env: { a: 0.06, h: 0.15, d: 1.5 }, am: { rate: 4.3, depth: 0.4, to: 2.1, over: 1.6 }, drive: 1.3, level: 0.6 },
  ];
}

/** The notes the cross launcher's bell rings: D, F and A — a minor chord over three shots. */
const BELL_NOTES = [587.33, 698.46, 880];
/** A church bell's partials (hum, prime, minor third, fifth, nominal, …) and how long each rings. */
const BELL = [[0.5, 1.8, 0.35], [1, 1.5, 0.5], [1.183, 1.1, 0.3], [1.506, 0.9, 0.2], [2, 0.8, 0.22], [2.514, 0.55, 0.1], [3.011, 0.4, 0.07]] as const;

/** Slot 5 — a launch whoosh and a bell: a relic thrown, not a round fired. */
function cross(): Layer[] {
  const f0 = BELL_NOTES[Math.floor(soundRandom() * BELL_NOTES.length)];
  return [
    // the launch: a soft pneumatic thoonk
    { tone: "sine", f: 210, to: 75, over: 0.07, env: { a: 0.001, h: 0.01, d: 0.13 }, drive: 1.6, level: 0.7 },
    { noise: "white", filters: [{ type: "bandpass", f: 700, q: 0.9 }], env: { a: 0.001, h: 0.012, d: 0.09 }, drive: 1.4, level: 0.6 },
    // the whoosh as it leaves, rising and gone
    { noise: "pink", filters: [{ type: "bandpass", f: 480, q: 2.5, to: 2600, over: 0.35 }], env: { a: 0.05, h: 0.06, d: 0.36 }, level: 0.9 },
    // the bell
    ...BELL.map(([ratio, d, level]): Layer => ({ at: 0.015, tone: "sine", f: f0 * ratio, env: { a: 0.002, d }, level: level * 0.8 })),
  ];
}

/** Slot 6 — a pneumatic thwack, twenty a second, mechanical. */
function nail(): Layer[] {
  const p = jit(0.06), q = jit(0.1);
  return [
    // the air let go
    { noise: "white", filters: [{ type: "highpass", f: 3800 * q }], env: { a: 0.0005, h: 0.002, d: 0.03 }, level: 0.2 },
    // the thwack: a hard, pitched knock of steel on steel
    { noise: "white", filters: [{ type: "bandpass", f: 780 * p, q: 3 }], env: { a: 0.0006, h: 0.01, d: 0.034 }, drive: 3, level: 1 },
    { tone: "sine", f: 300 * p, to: 120 * p, over: 0.02, env: { a: 0.0005, h: 0.002, d: 0.03 }, drive: 1.5, level: 0.55 },
    // the driver clanking back
    { at: 0.004, tone: "sine", f: [2380 * p, 3710 * p], env: { a: 0.0003, d: 0.02 }, level: 0.12 },
  ];
}

/** Slot 7 — an unearthly discharge: a crackling burst, and a choir that slides the wrong way. */
function reaper(): Layer[] {
  const p = jit(0.03);
  return [
    // the discharge: overdriven noise stuttering like a bad contact
    { noise: "white", filters: [{ type: "highpass", f: 900 }, { type: "lowpass", f: 7000 }], env: { a: 0.002, h: 0.06, d: 0.28 }, am: { rate: 73, depth: 0.45, type: "square" }, drive: 8, level: 0.4 },
    // the choir: a clustered chord of voices, sung through "ah", falling a tritone as it dies
    { tone: "sawtooth", f: [110 * p, 116.54 * p, 155.56 * p, 164.81 * p], to: 110 * p * 0.707, over: 0.7,
      formants: [{ f: 730, q: 6, gain: 1 }, { f: 1090, q: 7, gain: 0.6 }, { f: 2440, q: 8, gain: 0.35 }],
      vibrato: { rate: 5.5, cents: 14 }, env: { a: 0.03, h: 0.12, d: 0.9 }, drive: 1.4, level: 1.4 },
    // under it all, a sub that drops out of hearing
    { tone: "sine", f: 58 * p, to: 32, over: 0.5, env: { a: 0.004, h: 0.05, d: 0.7 }, drive: 1.8, level: 0.8 },
  ];
}

/** How hard each slot's report is saturated as a whole (`../Layers.ts`'s `Glue`) — hardest for the rapid ones, whose every shot must be loud and short. */
const GLUE: readonly Glue[] = [
  { pre: 0.6, drive: 1.8 }, { pre: 0.5, drive: 1.6 }, { pre: 0.7, drive: 2.4 }, { pre: 0.7, drive: 2.4 },
  { pre: 0.5, drive: 1.6 }, { pre: 0.6, drive: 1.2 }, { pre: 0.8, drive: 2.6 }, { pre: 0.6, drive: 1.6 },
];

/** Each slot's report design, in `WEAPON_STATS` order — exported so tests can read a design without playing it. */
export const REPORT_DESIGNS: readonly (() => Layer[])[] = [flare, shotgun, rifle, tommy, sniper, cross, nail, reaper];

export function flarePistolFire(): void { lv("flarePistolFire", () => { play(flare(), GLUE[0]); }); }
export function shotgunFire(): void { lv("shotgunFire", () => { play(shotgun(), GLUE[1]); }); }
export function combatRifleFire(): void { lv("combatRifleFire", () => { play(rifle(), GLUE[2]); }); }
export function tommyGunFire(): void { lv("tommyGunFire", () => { play(tommy(), GLUE[3]); }); }
export function sniperFire(): void { lv("sniperFire", () => { play(sniper(), GLUE[4]); }); }
export function crossLauncherFire(): void { lv("crossLauncherFire", () => { play(cross(), GLUE[5]); }); }
export function nailCannonFire(): void { lv("nailCannonFire", () => { play(nail(), GLUE[6]); }); }
export function soulReaperFire(): void { lv("soulReaperFire", () => { play(reaper(), GLUE[7]); }); }

/** Each weapon slot's firing sound, in `WEAPON_STATS` order — what `WEAPONS[i].snd` is. */
export const WEAPON_FIRE_SOUNDS: readonly (() => void)[] = [
  flarePistolFire, shotgunFire, combatRifleFire, tommyGunFire,
  sniperFire, crossLauncherFire, nailCannonFire, soulReaperFire,
];

/** The power kick's swing (`doKick`), whether or not it lands. */
export function kickSwing(): void { lv("kickSwing", () => { bang(.15,.5,900); }); }
/** The power kick landing on an enemy or a prop, 110 ms later. */
export function kickImpact(): void { lv("kickImpact", () => { bang(.12,.4,500); }); }
/**
 * A spent shell hitting the floor (`ejectCasing`): a short high tick at a
 * random pitch, a random 250-450 ms after the casing leaves the gun.
 */
export function casingTinkle(): void { lv("casingTinkle", () => { after(()=>blip(soundRnd(1800,2600),.04,"square",.025),soundRnd(250,450)); }); }
