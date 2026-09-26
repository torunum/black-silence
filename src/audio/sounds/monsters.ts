import { bang, blip } from "../Sfx";
import { deathCry, growl, gurgle, pain } from "../Voice";
import { after } from "../../core/Timers";
import { clamp } from "../../utils/math";
import { soundRandom, soundRnd } from "../SoundRandom";

/**
 * THE SOUND CATALOGUE — MONSTERS. Every sound an enemy or a boss makes, bar
 * the first-sighting bark, which was already a named function (`snarl`, in
 * `../Voice.ts`). See `./weapons.ts`'s header for what this catalogue is and
 * how the extraction is proven to be a pure refactor.
 *
 * Every call site wraps these in `at(x,y,z,...)` (`../AudioEngine.ts`) to
 * place them in the world, exactly as it wrapped the inline calls they
 * replace. `bossRoar` is the one exception, because its second half fires
 * 200 ms later and has to be placed again then: it takes the placing
 * function as an argument instead.
 */

/** A monster launches a projectile (`fireOrb`). Toxic spit is highest, the Mancubus's fireball lowest. */
export type OrbSound = "toxic" | "heavy" | "normal";
export function orbLaunch(kind: OrbSound): void { blip(kind==="toxic"?420:kind==="heavy"?180:300,.2,"sawtooth",.08,90); }
/** A flesh-flinger tears a chunk out of itself and throws it (`throwFlesh`). */
export function fleshThrow(): void { gurgle(.22,.32);growl(150,.22,.22); }
/** A thrown chunk of flesh hits the player (`orbTick`). */
export function fleshHitsPlayer(): void { gurgle(.2,.35); }
/** A thrown chunk of flesh lands and splatters (`orbTick`). */
export function fleshSplat(): void { gurgle(.16,.25); }
/** A boss's expanding shockwave ring (`spawnRing`). */
export function shockwaveRing(): void { bang(.3,.5,250);blip(60,.5,"sawtooth",.16,30,true); }
/** The warning whine before debris falls from the ceiling (`spawnStrike`). */
export function debrisWarning(): void { blip(1200,.4,"sine",.05,300); }
/** The debris lands (`strikeTick`). */
export function debrisImpact(): void { bang(.25,.5,400); }
/** A kicked monster slams into a wall (`enemyTick`'s flung branch). */
export function wallSplat(): void { bang(.18,.5,600); }
/** The Executioner's charge ends against a wall (`enemyTick`). */
export function chargeCrash(): void { bang(.2,.5,400); }
/** A screamer wakes every monster nearby (`enemyTick`). */
export function screamerCall(): void { growl(180,.9,.4,true);blip(500,.7,"sawtooth",.1,180,true); }
/** A Lost Soul telegraphs its dash (`enemyTick`). */
export function lostSoulCharge(): void { blip(700,.3,"sawtooth",.12,1400); }
/** A brute raises its fists before the slam (`enemyTick`). */
export function slamWindup(): void { blip(80,.4,"sawtooth",.14,40); }
/** The slam lands, 0.48 s later. */
export function slamImpact(): void { bang(.3,.6,300); }
/** A zombie dog lunges (`enemyTick`). */
export function houndLunge(): void { blip(500,.2,"sawtooth",.1,260); }
/** Any monster's melee hit on the player (`enemyTick`). */
export function monsterClaw(): void { blip(140,.12,"sawtooth",.1,60); }
/** A boss wakes and the cinematic starts (`wakeBoss`). */
export function bossWakes(): void { blip(40,1.6,"sawtooth",.2,30,true);bang(.5,.4,300); }
/**
 * A boss roars (`roarFor`): a growl at a random low pitch, then a shorter
 * one 200 ms later. `place` puts each half where the boss is at that moment
 * — `roarFor` passes `emit=>at(e.x,…,e.z,emit)`; the sound board passes
 * nothing and hears both at the listener.
 */
export function bossRoar(place: (emit: () => void) => void = (emit) => emit()): void {
  place(()=>growl(soundRnd(42,60),1.0,.6,true));
  after(()=>{place(()=>growl(soundRnd(50,70),.6,.4,true));},200);}
/** A priest boss vanishes (`priestTeleport`, first half). */
export function priestVanish(): void { blip(700,.25,"sine",.1,140,true); }
/** …and reappears somewhere else (second half). */
export function priestAppear(): void { blip(140,.25,"sine",.12,700,true); }
/** A priest boss summons its flock (`priestThink`, phase 2). */
export function priestSummons(): void { blip(180,.6,"sawtooth",.12,60,true); }
/** A Slaughtaur's shield blocks a shot (`damageEnemy`). */
export function shieldBlock(): void { bang(.04,.3,3000,800); }
/** A shot rings off an armoured zombie's plating (`damageEnemy`). */
export function armourPlateHit(): void { bang(.05,.32,2800,700); }
/** The plating gives way. */
export function armourShatter(): void { bang(.15,.35,900); }
/** The pitch a monster's pain cry is voiced at, from its `EnemyDefs.ts` `pain` stat. */
export function painPitch(painStat: number): number { return clamp(painStat*.35,70,360); }
/** A monster is hurt (`damageEnemy`). `painStat` is its `EnemyDefs.ts` `pain` value. */
export function monsterPain(painStat: number): void { pain(painPitch(painStat),.08+soundRandom()*.04); }
/** A limb is torn off (`severLimb`). */
export function limbTorn(): void { gurgle(.25,.4); }
/** A body bursts into gibs (`killEnemy`'s overkill branch). */
export function gibBurst(): void { bang(.2,.45,800);gurgle(.45,.5); }
/** The pitch a monster's death cry is voiced at, from its `pain` stat. */
export function deathPitch(painStat: number): number { return clamp(painStat*.3,42,200); }
/** A monster dies whole (`killEnemy`). `painStat` is its `EnemyDefs.ts` `pain` value. */
export function monsterDeath(painStat: number): void { deathCry(deathPitch(painStat)); }
/** A head is torn off (`killEnemy`'s decapitation branch). */
export function decapitation(): void { gurgle(.32,.45); }
/** A severed head bounces (`headTick`). */
export function headBounce(): void { gurgle(.1,.18); }
/** A severed head is kicked (`headTick`). */
export function headKicked(): void { bang(.08,.3,500); }
/** A boss dies (`bossDeath`). */
export function bossDies(): void { bang(.6,.7,400);blip(50,1.4,"sawtooth",.2,28,true); }
