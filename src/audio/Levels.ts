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
  explosion: -15,
  monster: -18,
  event: -19,
  impact: -20,
  foley: -23,
  footstep: -26,
  ambience: -27,
  ui: -28,
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
  flarePistolFire: { category: "weapon", trim: 0 },
  shotgunFire: { category: "weapon", trim: 0 },
  combatRifleFire: { category: "weapon", trim: 0 },
  tommyGunFire: { category: "weapon", trim: 0 },
  sniperFire: { category: "weapon", trim: 0 },
  crossLauncherFire: { category: "weapon", trim: 0 },
  nailCannonFire: { category: "weapon", trim: 0 },
  soulReaperFire: { category: "weapon", trim: 0 },
  // weapon foley
  weaponLower: { category: "foley", trim: 0 },
  weaponRaise: { category: "foley", trim: 0 },
  reloadOut: { category: "foley", trim: 0 },
  reloadIn: { category: "foley", trim: 0 },
  reloadDone: { category: "foley", trim: 0 },
  dryFire: { category: "foley", trim: 0 },
  shotgunPump: { category: "foley", trim: 0 },
  casingTinkle: { category: "foley", trim: 0 },
  kickSwing: { category: "foley", trim: 0 },
  jump: { category: "foley", trim: 0 },
  // explosions
  barrelExplosion: { category: "explosion", trim: 0 },
  holyCrossExplosion: { category: "explosion", trim: 0 },
  afritDeathExplosion: { category: "explosion", trim: 0 },
  bossDies: { category: "explosion", trim: 0 },
  // monster voices and attacks
  "monsterAlert.C": { category: "monster", trim: 0 },
  "monsterAlert.A": { category: "monster", trim: 0 },
  "monsterAlert.L": { category: "monster", trim: 0 },
  "monsterAlert.j": { category: "monster", trim: 0 },
  "monsterAlert.n": { category: "monster", trim: 0 },
  "monsterAlert.k": { category: "monster", trim: 0 },
  "monsterAlert.q": { category: "monster", trim: 0 },
  "monsterAlert.R": { category: "monster", trim: 0 },
  "monsterAlert.y": { category: "monster", trim: 0 },
  "monsterAlert.s": { category: "monster", trim: 0 },
  "monsterAlert.other": { category: "monster", trim: 0 },
  monsterPain: { category: "monster", trim: 0 },
  monsterDeath: { category: "monster", trim: 0 },
  bossRoar: { category: "monster", trim: 0 },
  bossWakes: { category: "monster", trim: 0 },
  screamerCall: { category: "monster", trim: 0 },
  lostSoulCharge: { category: "monster", trim: 0 },
  houndLunge: { category: "monster", trim: 0 },
  slamWindup: { category: "monster", trim: 0 },
  monsterClaw: { category: "monster", trim: 0 },
  orbLaunch: { category: "monster", trim: 0 },
  fleshThrow: { category: "monster", trim: 0 },
  priestVanish: { category: "monster", trim: 0 },
  priestAppear: { category: "monster", trim: 0 },
  priestSummons: { category: "monster", trim: 0 },
  debrisWarning: { category: "monster", trim: 0 },
  // impacts
  kickImpact: { category: "impact", trim: 0 },
  wallSplat: { category: "impact", trim: 0 },
  chargeCrash: { category: "impact", trim: 0 },
  slamImpact: { category: "impact", trim: 0 },
  debrisImpact: { category: "impact", trim: 0 },
  shockwaveRing: { category: "impact", trim: 0 },
  shieldBlock: { category: "impact", trim: 0 },
  armourPlateHit: { category: "impact", trim: 0 },
  armourShatter: { category: "impact", trim: 0 },
  limbTorn: { category: "impact", trim: 0 },
  gibBurst: { category: "impact", trim: 0 },
  decapitation: { category: "impact", trim: 0 },
  headBounce: { category: "impact", trim: 0 },
  headKicked: { category: "impact", trim: 0 },
  fleshHitsPlayer: { category: "impact", trim: 0 },
  fleshSplat: { category: "impact", trim: 0 },
  bulletHitsProp: { category: "impact", trim: 0 },
  bulletRicochet: { category: "impact", trim: 0 },
  propBreaks: { category: "impact", trim: 0 },
  playerHurt: { category: "impact", trim: 0 },
  // footsteps
  footstep: { category: "footstep", trim: 0 },
  // world events
  doorStone: { category: "event", trim: 0 },
  doorFlesh: { category: "event", trim: 0 },
  lockedDoor: { category: "event", trim: 0 },
  exitOpens: { category: "event", trim: 0 },
  gauntletBegins: { category: "event", trim: 0 },
  gauntletCleared: { category: "event", trim: 0 },
  blackout: { category: "event", trim: 0 },
  churchBells: { category: "event", trim: 0 },
  organSting: { category: "event", trim: 0 },
  pianoKey: { category: "event", trim: 0 },
  // ambience
  distantScream: { category: "ambience", trim: 0 },
  machinery: { category: "ambience", trim: 0 },
  staticCrackle: { category: "ambience", trim: 0 },
  drip: { category: "ambience", trim: 0 },
  whispers: { category: "ambience", trim: 0 },
  heartbeat: { category: "ambience", trim: 0 },
  breath: { category: "ambience", trim: 0 },
  // UI
  achievementChime: { category: "ui", trim: 0 },
  kickReady: { category: "ui", trim: 0 },
  scrapSmgAssembled: { category: "ui", trim: 0 },
  itemPickup: { category: "ui", trim: 0 },
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

/** The table entry the last `lv()` call used — how the sound board's measurement knows which trim a row plays at. */
export function lastSoundLevel(): SoundName | null {
  return last;
}
