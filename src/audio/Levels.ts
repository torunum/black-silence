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
 * Weapons aim at -14 and mostly do not get there: today's firearm reports
 * (`gunshot()`, round 1) are a 4 ms crack and a 30-170 ms body, and a
 * sound that short reaches the peak ceiling (`src/soundboard/measure.ts`'s
 * `PEAK_CEILING`) long before it reaches -14. They land at -17 to -19 (the
 * automatic weapons measured as a one-second burst, which is how they are
 * heard), so every other target sits below that: explosions at -19, the
 * rest 2-3 dB apart under it. Task 3's weapons, with real bodies, can take
 * the weapon target up to where it says.
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
  // weapons
  flarePistolFire: { category: "weapon", trim: 10 },
  shotgunFire: { category: "weapon", trim: 2.5 },
  combatRifleFire: { category: "weapon", trim: 10.7 },
  tommyGunFire: { category: "weapon", trim: 14.3 },
  sniperFire: { category: "weapon", trim: 5.9 },
  crossLauncherFire: { category: "weapon", trim: 9.8 },
  nailCannonFire: { category: "weapon", trim: 13.2 },
  soulReaperFire: { category: "weapon", trim: 2.1 },
  // weapon foley
  weaponLower: { category: "foley", trim: 10.2 },
  weaponRaise: { category: "foley", trim: 7.7 },
  reloadOut: { category: "foley", trim: 7.7 },
  reloadIn: { category: "foley", trim: 8.8 },
  reloadDone: { category: "foley", trim: 5.7 },
  dryFire: { category: "foley", trim: 11.8 },
  shotgunPump: { category: "foley", trim: 10.2 },
  casingTinkle: { category: "foley", trim: 13.8 },
  kickSwing: { category: "foley", trim: -1.3 },
  jump: { category: "foley", trim: 14.5 },
  // explosions
  barrelExplosion: { category: "explosion", trim: -7 },
  holyCrossExplosion: { category: "explosion", trim: -3 },
  afritDeathExplosion: { category: "explosion", trim: -4.2 },
  bossDies: { category: "explosion", trim: -1.1 },
  // monster voices and attacks
  "monsterAlert.C": { category: "monster", trim: -8.1 },
  "monsterAlert.A": { category: "monster", trim: -10.6 },
  "monsterAlert.L": { category: "monster", trim: -3.1 },
  "monsterAlert.j": { category: "monster", trim: -0.9 },
  "monsterAlert.n": { category: "monster", trim: -9.3 },
  "monsterAlert.k": { category: "monster", trim: -6.8 },
  "monsterAlert.q": { category: "monster", trim: -3.1 },
  "monsterAlert.R": { category: "monster", trim: -6.5 },
  "monsterAlert.y": { category: "monster", trim: -8.3 },
  "monsterAlert.s": { category: "monster", trim: -5.5 },
  "monsterAlert.other": { category: "monster", trim: -5.9 },
  monsterPain: { category: "monster", trim: 15.4 },
  monsterDeath: { category: "monster", trim: -8.9 },
  bossRoar: { category: "monster", trim: -11.2 },
  bossWakes: { category: "monster", trim: -0.2 },
  screamerCall: { category: "monster", trim: -9.6 },
  lostSoulCharge: { category: "monster", trim: 5.2 },
  houndLunge: { category: "monster", trim: 8.9 },
  slamWindup: { category: "monster", trim: 5.2 },
  monsterClaw: { category: "monster", trim: 12.5 },
  orbLaunch: { category: "monster", trim: 11.2 },
  fleshThrow: { category: "monster", trim: -1.1 },
  priestVanish: { category: "monster", trim: 4.7 },
  priestAppear: { category: "monster", trim: 4.1 },
  priestSummons: { category: "monster", trim: 3.9 },
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
