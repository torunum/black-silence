import { voiced } from "../../audio/AudioEngine";
import { bang, blip } from "../../audio/Sfx";
import { deathCry, growl, gurgle, pain, snarl } from "../../audio/Voice";
import { after } from "../../core/Timers";
import { clamp } from "../../utils/math";
import { soundRandom, soundRnd } from "../../audio/SoundRandom";

/**
 * THE MONSTERS AS THEY SOUNDED BEFORE PLAYER FEEDBACK ROUND 2 TASK 4 — the
 * sound board's "old" buttons for every monster sound Task 4 replaced with a
 * voice (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`,
 * `src/audio/VoiceTable.ts`). The game never imports this file.
 *
 * Each function is the catalogue function (`src/audio/sounds/monsters.ts`)
 * as it stood at `f198dea`: the first-sighting `snarl` with its ten barks and
 * the generic moan, the pain yelp and death cry voiced at a pitch from the
 * monster's `pain` stat, and the swept square/sawtooth `blip`s the attacks,
 * the lunge, the charge, the wind-up, the scream, the boss's waking, roar,
 * summons and death were made of. Each plays at the level it had then — the
 * trim from `src/audio/Levels.ts` at `f198dea`, written down below because
 * the table no longer has those entries or those numbers — so "old" on the
 * board is exactly what the game played, through whichever mix the board is
 * set to.
 *
 * `tests/behavior/soundCatalogue.test.ts` still compares these with the
 * frozen reference's own call sites, so the record stays pinned.
 */

/** A level from `f198dea`'s table: trim in dB, room factor 1 (no monster sound had one). */
function at(trimDb: number, emit: () => void): void {
  voiced({ gain: Math.pow(10, trimDb / 20), room: 1 }, emit);
}

/** `f198dea`'s `monsterAlert.<kind>` trims; every other kind (and every boss) played the generic moan at `.other`'s. */
const ALERT_TRIMS: Readonly<Record<string, number>> = {
  C: -8.1, A: -10.6, L: -3.1, j: -0.9, n: -9.3, k: -6.8, q: -3.1, R: -6.5, y: -8.3, s: -5.5,
};
const OTHER_ALERT_TRIM = -5.9;

/** A monster first sees the player: `snarl(kind)`, at its kind's trim. */
export function oldMonsterAlert(kind: string): void { at(ALERT_TRIMS[kind] ?? OTHER_ALERT_TRIM, () => { snarl(kind); }); }
/** The pitch a pain cry was voiced at, from the monster's `EnemyDefs.ts` `pain` stat. */
export function painPitch(painStat: number): number { return clamp(painStat*.35,70,360); }
/** A monster is hurt. */
export function oldMonsterPain(painStat: number): void { at(15.4, () => { pain(painPitch(painStat),.08+soundRandom()*.04); }); }
/** The pitch a death cry was voiced at. */
export function deathPitch(painStat: number): number { return clamp(painStat*.3,42,200); }
/** A monster dies whole. */
export function oldMonsterDeath(painStat: number): void { at(-8.9, () => { deathCry(deathPitch(painStat)); }); }
/** Any monster's melee hit on the player. */
export function oldMonsterClaw(): void { at(12.5, () => { blip(140,.12,"sawtooth",.1,60); }); }
/** A monster launches a projectile: toxic spit highest, the Mancubus's fireball lowest. */
export function oldOrbLaunch(kind: "toxic" | "heavy" | "normal"): void { at(11.2, () => { blip(kind==="toxic"?420:kind==="heavy"?180:300,.2,"sawtooth",.08,90); }); }
/** A flesh-flinger tears a chunk out of itself and throws it. */
export function oldFleshThrow(): void { at(-1.1, () => { gurgle(.22,.32);growl(150,.22,.22); }); }
/** A screamer wakes every monster nearby. */
export function oldScreamerCall(): void { at(-9.6, () => { growl(180,.9,.4,true);blip(500,.7,"sawtooth",.1,180,true); }); }
/** A Lost Soul telegraphs its dash. */
export function oldLostSoulCharge(): void { at(5.2, () => { blip(700,.3,"sawtooth",.12,1400); }); }
/** A brute raises its fists before the slam. */
export function oldSlamWindup(): void { at(5.2, () => { blip(80,.4,"sawtooth",.14,40); }); }
/** A zombie dog lunges. */
export function oldHoundLunge(): void { at(8.9, () => { blip(500,.2,"sawtooth",.1,260); }); }
/** A boss wakes and the cinematic starts. */
export function oldBossWakes(): void { at(-0.2, () => { blip(40,1.6,"sawtooth",.2,30,true);bang(.5,.4,300); }); }
/** A boss roars: a growl at a random low pitch, then a shorter one 200 ms later. */
export function oldBossRoar(): void { at(-11.2, () => {
  growl(soundRnd(42,60),1.0,.6,true);
  after(()=>{growl(soundRnd(50,70),.6,.4,true);},200); }); }
/** A priest boss summons its flock. */
export function oldPriestSummons(): void { at(3.9, () => { blip(180,.6,"sawtooth",.12,60,true); }); }
/** A boss dies (its entry was an explosion's). */
export function oldBossDies(): void { at(-1.1, () => { bang(.6,.7,400);blip(50,1.4,"sawtooth",.2,28,true); }); }
