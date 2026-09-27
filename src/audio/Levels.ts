import { voiced } from "./AudioEngine";

/**
 * THE LOUDNESS TABLE — player feedback round 2, Task 2
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`):
 * "loudness is a design decision, not an accident". Every sound the game
 * plays has an entry here: the category it belongs to, and the trim (dB)
 * that brings it to its category's target. The catalogue
 * (`./sounds/*.ts`) plays every sound inside `lv(name, ...)`, which sets
 * that level for everything the sound emits — including its delayed halves,
 * through `src/core/Timers.ts`'s carrier.
 *
 * ## The targets
 *
 * Measured as **LK-fast**: K-weighted loudness (ITU-R BS.1770's filter, so
 * lows count less and presence counts more, roughly as ears do) over a
 * 125 ms sliding window, the loudest window of the sound — the "fast" time
 * weighting of a sound-level meter, because these are short sounds and a
 * 400 ms momentary window would rate a 40 ms click by how much silence
 * surrounds it. Rendered offline through the whole new mix — room (stone
 * hall), compressor, limiter — at master volume 1.
 *
 * The owner's order: weapons loudest, then explosions, monsters, impacts,
 * footsteps, UI quietest. Three categories the plan did not name are
 * slotted in: world **events** (doors, bells, the exit) with the monsters,
 * weapon **foley** (switching, reloading, the pump, casings, the jump)
 * between impacts and footsteps, and the **ambience** (distant stingers,
 * heartbeat, breath) just above the UI.
 *
 * Weapons are at -14, all eight (the automatic weapons measured as a
 * one-second burst, which is how they are heard). Until player feedback
 * round 2 Task 3 they could not get there: round 1's reports were a 4 ms
 * crack and a 30-170 ms body, which reached the peak ceiling
 * (`src/soundboard/measure.ts`'s `PEAK_CEILING`) at -17 to -20. Task 3's
 * layered reports (`./Layers.ts`, `./sounds/weapons.ts`) hold their body
 * for tens of milliseconds and are saturated as a whole, so they reach -14
 * a few dB under the ceiling. Every other target sits below them:
 * explosions at -19, the rest 2-3 dB apart under it. The weapons also send
 * more of themselves to the room than a plain sound (their `room` factors
 * below): a shot indoors is answered by the hall.
 *
 * ## The trims
 *
 * Written by `scripts/sound-levels.mjs --apply` from a measurement, and
 * listed with the measurements in `docs/sound-levels.md`, which that script
 * also writes; `tests/audio/levels.test.ts` fails if the two disagree. A
 * sound with several variants (the pain cry at six pitches, the footstep
 * walking and running) has one trim, the mean of its variants' errors, so
 * the variants keep their relation to each other.
 *
 * ## The one sound without a level
 *
 * The boss music pulse (`startBossMusic`, `../Ambient.ts`) plays its beats
 * from a `setInterval` inside a body `tests/fidelity.test.ts` pins
 * byte-for-byte to the reference, so no scope reaches them: they play at
 * the neutral level (trim 0 dB, room 1). It is measured with the rest in
 * `docs/sound-levels.md`. `AudioEngine.ts`'s `unscopedConnections()` counts
 * such plays, and `tests/audio/levels.test.ts` fails if any other sound
 * makes one.
 *
 * `room` scales how much of a sound goes to the reverb, relative to what its
 * `echo` flag sends (`./Mix.ts`'s `DRY_SEND`/`ECHO_SEND`). 1 unless a sound
 * says otherwise.
 */

export type LevelCategory =
  | "weapon" | "explosion" | "monster" | "event" | "impact" | "foley" | "footstep" | "ambience" | "ui";

/** Target LK-fast per category, dB (see the module doc comment). */
export const TARGETS: Readonly<Record<LevelCategory, number>> = {
  weapon: -14,
  explosion: -19,
  monster: -21,
  event: -22,
  impact: -23,
  foley: -26,
  footstep: -29,
  ambience: -30,
  ui: -31,
};

export interface SoundLevel {
  category: LevelCategory;
  /** dB, added to the sound's own level. */
  trim: number;
  /** Reverb send relative to the sound's `echo` flag. Default 1. */
  room?: number;
}

// One entry per line, `name: { category: "…", trim: n },` — the shape
// scripts/sound-levels.mjs rewrites. Keep it.
export const SOUND_LEVELS = {
  // weapons (room: how much more of each report the level's reverb hears — an indoor gunshot)
  flarePistolFire: { category: "weapon", trim: -4.3, room: 1.5 },
  shotgunFire: { category: "weapon", trim: -10.6, room: 1.7 },
  combatRifleFire: { category: "weapon", trim: -9.8, room: 1.4 },
  tommyGunFire: { category: "weapon", trim: -9.1, room: 1.2 },
  sniperFire: { category: "weapon", trim: -11.7, room: 2 },
  crossLauncherFire: { category: "weapon", trim: -7.1, room: 2.4 },
  nailCannonFire: { category: "weapon", trim: -6.7, room: 1 },
  soulReaperFire: { category: "weapon", trim: -10, room: 2.2 },
  // weapon foley: the switch, the dry click, the kick's swing, casings, the jump
  weaponLower: { category: "foley", trim: 0 },
  weaponRaise: { category: "foley", trim: 1.1 },
  weaponReady: { category: "foley", trim: -6.6 },
  dryFire: { category: "foley", trim: -3.6 },
  casingTinkle: { category: "foley", trim: 13.8 },
  kickSwing: { category: "foley", trim: -1.3 },
  jump: { category: "foley", trim: 14.5 },
  // weapon foley: the mechanisms (player feedback round 2 Task 3, ./sounds/foley.ts)
  flareHammerCock: { category: "foley", trim: -4.4 },
  flareOpen: { category: "foley", trim: -8.7 },
  flareShellIn: { category: "foley", trim: -7.7 },
  flareShut: { category: "foley", trim: -11 },
  shotgunPump: { category: "foley", trim: -14.6 },
  shotgunOpen: { category: "foley", trim: -13.2 },
  shotgunHullsOut: { category: "foley", trim: -4.8 },
  shotgunShellsIn: { category: "foley", trim: -9.2 },
  shotgunShut: { category: "foley", trim: -18 },
  rifleMagOut: { category: "foley", trim: -2.1 },
  rifleMagIn: { category: "foley", trim: -12.1 },
  rifleChargeBack: { category: "foley", trim: -8.9 },
  rifleChargeForward: { category: "foley", trim: -13.9 },
  tommyDrumOut: { category: "foley", trim: -4.1 },
  tommyDrumIn: { category: "foley", trim: -14.6 },
  tommyKnobBack: { category: "foley", trim: -8.9 },
  tommyKnobForward: { category: "foley", trim: -13.3 },
  sniperBoltLift: { category: "foley", trim: -1.9 },
  sniperBoltBack: { category: "foley", trim: -9.2 },
  sniperBoltForward: { category: "foley", trim: -13.7 },
  sniperBoltLock: { category: "foley", trim: -10.2 },
  sniperMagOut: { category: "foley", trim: -1.6 },
  sniperMagIn: { category: "foley", trim: -12.2 },
  crossRises: { category: "foley", trim: -5.3 },
  crossLidOpen: { category: "foley", trim: -2.6 },
  crossLaidIn: { category: "foley", trim: -9.3 },
  crossLidShut: { category: "foley", trim: -10.5 },
  nailHopperOff: { category: "foley", trim: -3.7 },
  nailHopperOn: { category: "foley", trim: -14.3 },
  nailCannonSpin: { category: "foley", trim: -20.4 },
  reaperGutter: { category: "foley", trim: -7.7 },
  reaperPluck: { category: "foley", trim: -5.6 },
  reaperCharge: { category: "foley", trim: -11.6 },
  reaperClawsClose: { category: "foley", trim: -9.1 },
  // explosions
  barrelExplosion: { category: "explosion", trim: -7 },
  holyCrossExplosion: { category: "explosion", trim: -3 },
  afritDeathExplosion: { category: "explosion", trim: -4.2 },
  bossDies: { category: "explosion", trim: -11.9 },
  // monster voices and attacks (player feedback round 2 Task 4: every vocal one is the monster's own voice, ./VoiceTable.ts;
  // bosses speak through echoBus(), so their voices send more to the room without a factor here)
  monsterAlert: { category: "monster", trim: 4.3 },
  monsterPain: { category: "monster", trim: 6.1 },
  monsterDeath: { category: "monster", trim: 3.5 },
  bossRoar: { category: "monster", trim: -1.6 },
  bossWakes: { category: "monster", trim: -14.1 },
  screamerCall: { category: "monster", trim: 3.2 },
  lostSoulCharge: { category: "monster", trim: 9.4 },
  houndLunge: { category: "monster", trim: 5.6 },
  slamWindup: { category: "monster", trim: 4.8 },
  monsterClaw: { category: "monster", trim: 0.4 },
  orbLaunch: { category: "monster", trim: -0.5 },
  fleshThrow: { category: "monster", trim: 0.8 },
  priestVanish: { category: "monster", trim: 4.7 },
  priestAppear: { category: "monster", trim: 4.1 },
  priestSummons: { category: "monster", trim: 1.5 },
  debrisWarning: { category: "monster", trim: 8.1 },
  // impacts
  kickImpact: { category: "impact", trim: 7.2 },
  wallSplat: { category: "impact", trim: 3.8 },
  chargeCrash: { category: "impact", trim: 4.9 },
  slamImpact: { category: "impact", trim: 3.4 },
  debrisImpact: { category: "impact", trim: 3.4 },
  shockwaveRing: { category: "impact", trim: 0.6 },
  shieldBlock: { category: "impact", trim: 4.5 },
  armourPlateHit: { category: "impact", trim: 3.4 },
  armourShatter: { category: "impact", trim: 4.8 },
  limbTorn: { category: "impact", trim: 4.6 },
  gibBurst: { category: "impact", trim: -1.7 },
  decapitation: { category: "impact", trim: 2.9 },
  headBounce: { category: "impact", trim: 15.6 },
  headKicked: { category: "impact", trim: 10.4 },
  fleshHitsPlayer: { category: "impact", trim: 7.7 },
  fleshSplat: { category: "impact", trim: 10.4 },
  bulletHitsProp: { category: "impact", trim: 17.8 },
  bulletRicochet: { category: "impact", trim: 15.8 },
  propBreaks: { category: "impact", trim: 4.4 },
  playerHurt: { category: "impact", trim: 4.4 },
  // footsteps
  footstep: { category: "footstep", trim: 14.4 },
  // world events
  doorStone: { category: "event", trim: 1 },
  doorFlesh: { category: "event", trim: 2.8 },
  lockedDoor: { category: "event", trim: -3.4 },
  exitOpens: { category: "event", trim: -2.8 },
  gauntletBegins: { category: "event", trim: 0.8 },
  gauntletCleared: { category: "event", trim: 3 },
  blackout: { category: "event", trim: 2.4 },
  churchBells: { category: "event", trim: 2.6 },
  organSting: { category: "event", trim: 9.8 },
  pianoKey: { category: "event", trim: -3 },
  // ambience
  distantScream: { category: "ambience", trim: 3.5 },
  machinery: { category: "ambience", trim: 18 },
  staticCrackle: { category: "ambience", trim: 5.3 },
  drip: { category: "ambience", trim: 6.9 },
  whispers: { category: "ambience", trim: 3.6 },
  heartbeat: { category: "ambience", trim: -1.2 },
  breath: { category: "ambience", trim: 12.2 },
  // UI
  achievementChime: { category: "ui", trim: -1.4 },
  kickReady: { category: "ui", trim: 5.2 },
  scrapSmgAssembled: { category: "ui", trim: -1.4 },
  itemPickup: { category: "ui", trim: -2.6 },
} satisfies Record<string, SoundLevel>;

export type SoundName = keyof typeof SOUND_LEVELS;

const dbToGain = (db: number): number => Math.pow(10, db / 20);

let last: SoundName | null = null;

/** Plays `emit` at the level `SOUND_LEVELS[name]` sets. */
export function lv<T>(name: SoundName, emit: () => T): T {
  last = name;
  const l: SoundLevel = SOUND_LEVELS[name];
  return voiced({ gain: dbToGain(l.trim), room: l.room ?? 1 }, emit);
}

/** Forgets the last entry — the board clears it before a render, then reads `lastSoundLevel()`. */
export function clearLastSoundLevel(): void {
  last = null;
}

/** The table entry the last `lv()` call used — how the sound board's measurement knows which trim a row plays at. */
export function lastSoundLevel(): SoundName | null {
  return last;
}
