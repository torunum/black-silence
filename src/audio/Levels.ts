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
 * ## No sound without a level
 *
 * Until player feedback round 2 Task 5 the boss music pulse
 * (`startBossMusic`, `../Ambient.ts`) played its beats from a `setInterval`
 * inside a body pinned byte-for-byte to the reference, so no scope reached
 * them and they played at 0 dB. Task 5 rebuilt each beat as `bossBeat`
 * (`./sounds/music.ts`), which has its entry below like everything else;
 * the old pulse is on the sound board as "old". `AudioEngine.ts`'s
 * `unscopedConnections()` counts plays outside any level, and
 * `tests/audio/levels.test.ts` fails if the game makes one.
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
  kickSwing: { category: "foley", trim: -5.4 },
  jump: { category: "foley", trim: -2.3 },
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
  // (player feedback round 2 Task 5: layered, with a long tail — and 2.2 times a plain sound's share of the room)
  barrelExplosion: { category: "explosion", trim: -18.6, room: 2.2 },
  holyCrossExplosion: { category: "explosion", trim: -17.8, room: 2.2 },
  afritDeathExplosion: { category: "explosion", trim: -18.1, room: 2.2 },
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
  // (player feedback round 2 Task 5: the kick lands in a monster or on stone — in the air it makes no sound of its own)
  kickImpactFlesh: { category: "impact", trim: -14.7 },
  kickImpactStone: { category: "impact", trim: -9.9 },
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
  bulletHitsWall: { category: "impact", trim: -4.7 },
  bulletHitsFlesh: { category: "impact", trim: -9.1 },
  bulletHitsProp: { category: "impact", trim: 0.8 },
  // the impact plan, Task 1: the hit confirmation at the crosshair (./sounds/hits.ts)
  hitFlesh: { category: "impact", trim: -7.8 },
  hitHead: { category: "impact", trim: -8.7 },
  hitArmour: { category: "impact", trim: -9.5 },
  hitKill: { category: "explosion", trim: -13.8 },
  bulletRicochet: { category: "impact", trim: -5 },
  propBreaks: { category: "impact", trim: -16.8 },
  playerHurt: { category: "impact", trim: 4.4 },
  // footsteps
  // (player feedback round 2 Task 5: one entry per floor, each levelled from its walk and its run together, so every
  // floor steps at one level and the run stays above the walk; the landing is levelled over three falls)
  footstepStone: { category: "footstep", trim: -12.1 },
  footstepMarble: { category: "footstep", trim: -10.9 },
  footstepAsh: { category: "footstep", trim: -12.1 },
  footstepFlesh: { category: "footstep", trim: -11.1 },
  footstepMetal: { category: "footstep", trim: -11.7 },
  footstepWater: { category: "footstep", trim: -13.9 },
  footstepDirt: { category: "footstep", trim: -12.8 },
  landing: { category: "footstep", trim: -22.4 },
  // world events (the doors, the exit, the organ and the bells ring in the room: each sends 2.5-2.7 times a plain sound's share)
  doorStone: { category: "event", trim: -17.1, room: 2.5 },
  doorSecret: { category: "event", trim: -18.8, room: 2.5 },
  doorGate: { category: "event", trim: -17.1, room: 2.5 },
  doorFlesh: { category: "event", trim: 2.8 },
  lockedDoor: { category: "event", trim: -8.7, room: 1.5 },
  exitOpens: { category: "event", trim: -18, room: 2.5 },
  // the transitions plan: walking into the open exit door, the chapter card's bell, the entrance door shutting behind the player
  exitWalkthrough: { category: "event", trim: -13.8, room: 1.5 },
  chapterToll: { category: "event", trim: -15.5, room: 2.5 },
  doorShutsBehind: { category: "event", trim: -17, room: 2.5 },
  // the deeper-levels plan: a checkpoint marker catches
  shrineLights: { category: "event", trim: -13.5, room: 2 },
  gauntletBegins: { category: "event", trim: 0.8 },
  gauntletCleared: { category: "event", trim: 3 },
  blackout: { category: "event", trim: 2.4 },
  churchBells: { category: "event", trim: -14.2, room: 2.7 },
  organSting: { category: "event", trim: -15.6, room: 2.7 },
  pianoKey: { category: "event", trim: -3 },
  // ambience
  distantScream: { category: "ambience", trim: 3.5 },
  machinery: { category: "ambience", trim: 18 },
  staticCrackle: { category: "ambience", trim: 5.3 },
  drip: { category: "ambience", trim: 6.9 },
  whispers: { category: "ambience", trim: 3.6 },
  heartbeat: { category: "ambience", trim: -1.2 },
  breath: { category: "ambience", trim: 12.2 },
  // the prologue's opening: waking in the coffin, heard from inside it (./sounds/grave.ts)
  graveBreath: { category: "ambience", trim: -15.8 },
  graveHeartbeat: { category: "ambience", trim: -22.5 },
  earthShifts: { category: "event", trim: -14.1 },
  lidCracks: { category: "event", trim: -14.5, room: 1.5 },
  dirtFalls: { category: "foley", trim: -12.2 },
  // the prologue's room tones, per zone (./sounds/hell.ts, src/world/ZoneBed.ts)
  hellRoar: { category: "ambience", trim: -23.2, room: 1.5 },
  hellScream: { category: "ambience", trim: -19.2, room: 2.5 },
  fireCrackle: { category: "ambience", trim: -7.8 },
  churchyardWind: { category: "ambience", trim: -10.5 },
  // the boss pulse (player feedback round 2 Task 5: rebuilt as a drum, and given a level at last)
  bossPulse: { category: "ambience", trim: -27.8, room: 1.5 },
  // UI
  achievementChime: { category: "ui", trim: -19.8, room: 2 },
  kickReady: { category: "ui", trim: -10.8 },
  scrapSmgAssembled: { category: "ui", trim: -17.7 },
  uiHover: { category: "ui", trim: -0.1 },
  uiSelect: { category: "ui", trim: -17.1, room: 1.2 },
  // (player feedback round 2 Task 5: every pickup used to be one sound; each family now has its own)
  pickupHealth: { category: "ui", trim: -15 },
  pickupArmour: { category: "ui", trim: -17.3 },
  pickupAmmo: { category: "ui", trim: -12.6 },
  pickupKey: { category: "ui", trim: -17.1 },
  pickupWeapon: { category: "ui", trim: -19.1 },
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
