import { bang, blip } from "../Sfx";
import { gurgle } from "../Voice";
import { after } from "../../core/Timers";
import { lv } from "../Levels";
import { play, type Layer } from "../Layers";
import { speak, speakOnce } from "../Speak";

/**
 * THE SOUND CATALOGUE — MONSTERS. Every sound an enemy or a boss makes. See
 * `./weapons.ts`'s header for what this catalogue is.
 *
 * Every call site wraps these in `at(x,y,z,...)` (`../AudioEngine.ts`) to
 * place them in the world. `bossRoar` is the one exception, because its
 * second half fires 200 ms later and has to be placed again then: it takes
 * the placing function as an argument instead.
 *
 * ## The voices — player feedback round 2 Task 4
 *
 * Every vocal event — a monster's alert, pain, attack and death, the dog's
 * lunge, the lost soul's charge, the brute's wind-up, the wailer's scream,
 * a boss waking, roaring, summoning and dying — is now the monster's own
 * **voice** (`../VoiceTable.ts`, built by `../Speak.ts`): formant-filtered
 * cords, breath, grit, a growl, pitch jitter and vibrato, with a character
 * set by what the creature is and a pitch set by its size. Where the event
 * is more than a throat — a claw's rake, a fireball's whoosh, flesh
 * tearing, the ground shaking as a boss wakes or falls — that part is a
 * layer (`../Layers.ts`) under the voice. The call sites pass the enemy's
 * letter (`e.key`); they fire at the same moments as before.
 *
 * What they replaced — `snarl`'s barks, the pain yelp and death cry pitched
 * from the monster's *pain* stat, and the swept `blip`s — is on the sound
 * board as "old" (`src/soundboard/previous/monsters.ts`).
 */

/** A monster sees the player for the first time (`enemyTick`). Bosses too, before they wake. */
export function monsterAlert(kind: string): void { lv("monsterAlert", () => { speak(kind, "alert"); }); }

/** A claw's rake: a bright noise scrape under the attack bark. */
const RAKE: Layer = { noise: "white", filters: [{ type: "highpass", f: 1400 }, { type: "bandpass", f: 3200, q: 1.2, to: 1700, over: 0.08 }], env: { a: 0.002, h: 0.012, d: 0.09 }, drive: 2, level: 0.45 };
/** Any monster's melee hit on the player (`enemyTick`): its attack bark, and the rake. */
export function monsterClaw(kind: string): void { lv("monsterClaw", () => { speak(kind, "attack", [RAKE]); }); }

/** A monster launches a projectile (`fireOrb`). Toxic spit sputters, the Mancubus's fireball is the heaviest. */
export type OrbSound = "toxic" | "heavy" | "normal";
const WHOOSH: Readonly<Record<OrbSound, Layer>> = {
  normal: { noise: "pink", filters: [{ type: "bandpass", f: 350, q: 1.4, to: 1600, over: 0.2 }], env: { a: 0.03, h: 0.03, d: 0.22 }, level: 0.7 },
  heavy: { noise: "pink", filters: [{ type: "bandpass", f: 180, q: 1.2, to: 700, over: 0.3 }], env: { a: 0.04, h: 0.05, d: 0.32 }, drive: 1.6, level: 1 },
  toxic: { noise: "white", filters: [{ type: "bandpass", f: 1800, q: 2, to: 650, over: 0.2 }], env: { a: 0.01, h: 0.03, d: 0.2 }, am: { rate: 22, depth: 0.45, type: "square" }, level: 0.7 },
};
/**
 * The projectile's whoosh, every orb; and the attack bark of `kind`, the
 * monster throwing it — once per volley (a priest's five orbs, the
 * Mancubus's second one 220 ms later), not once per orb. `who` is the
 * thrower (the call site passes the enemy), so two throwing together both bark.
 */
export function orbLaunch(orb: OrbSound, kind: string, who?: object): void { lv("orbLaunch", () => {
  play([WHOOSH[orb]]);
  speakOnce(kind, "attack", 0.25, [], who); }); }
/** Flesh tearing: a wet, sputtering low noise. */
const TEAR: Layer = { at: 0.02, noise: "white", filters: [{ type: "lowpass", f: 1400, q: 1.5, to: 350, over: 0.25 }], env: { a: 0.01, h: 0.05, d: 0.25 }, am: { rate: 17, depth: 0.45, type: "square" }, level: 0.9 };
/** A flesh-flinger tears a chunk out of itself and throws it (`throwFlesh`): its attack bark, over the tearing. */
export function fleshThrow(kind: string): void { lv("fleshThrow", () => { speak(kind, "attack", [TEAR]); }); }
/** A thrown chunk of flesh hits the player (`orbTick`). */
export function fleshHitsPlayer(): void { lv("fleshHitsPlayer", () => { gurgle(.2,.35); }); }
/** A thrown chunk of flesh lands and splatters (`orbTick`). */
export function fleshSplat(): void { lv("fleshSplat", () => { gurgle(.16,.25); }); }
/** A boss's expanding shockwave ring (`spawnRing`). */
export function shockwaveRing(): void { lv("shockwaveRing", () => { bang(.3,.5,250);blip(60,.5,"sawtooth",.16,30,true); }); }
/** The warning whine before debris falls from the ceiling (`spawnStrike`). */
export function debrisWarning(): void { lv("debrisWarning", () => { blip(1200,.4,"sine",.05,300); }); }
/** The debris lands (`strikeTick`). */
export function debrisImpact(): void { lv("debrisImpact", () => { bang(.25,.5,400); }); }
/** A kicked monster slams into a wall (`enemyTick`'s flung branch). */
export function wallSplat(): void { lv("wallSplat", () => { bang(.18,.5,600); }); }
/** The Executioner's charge ends against a wall (`enemyTick`). */
export function chargeCrash(): void { lv("chargeCrash", () => { bang(.2,.5,400); }); }
/** A screamer wakes every monster nearby (`enemyTick`): the wailer's scream. */
export function screamerCall(): void { lv("screamerCall", () => { speak("s", "scream"); }); }
/** A Lost Soul telegraphs its dash (`enemyTick`): a shriek rising an octave. */
export function lostSoulCharge(): void { lv("lostSoulCharge", () => { speak("L", "charge"); }); }
/** A brute raises its fists before the slam (`enemyTick`): a heaving, rising strain. The Ettin and the Brute slam. */
export function slamWindup(kind: string): void { lv("slamWindup", () => { speak(kind, "heave"); }); }
/** The slam lands, 0.48 s later. */
export function slamImpact(): void { lv("slamImpact", () => { bang(.3,.6,300); }); }
/** A zombie dog lunges (`enemyTick`): its snarl. */
export function houndLunge(): void { lv("houndLunge", () => { speak("g", "attack"); }); }
/** The ground under a waking boss: a long brown-noise rumble. */
const RUMBLE: Layer = { noise: "brown", filters: [{ type: "lowpass", f: 160, q: 0.7 }], env: { a: 0.3, h: 0.6, d: 1.0 }, drive: 1.5, level: 1.2 };
/** A boss wakes and the cinematic starts (`wakeBoss`): a slow bellow rising out of a rumble. */
export function bossWakes(kind: string): void { lv("bossWakes", () => { speak(kind, "wake", [RUMBLE]); }); }
/**
 * A boss roars (`roarFor`): a roar, then a shorter one 200 ms later.
 * `place` puts each half where the boss is at that moment — `roarFor`
 * passes `emit=>at(e.x,…,e.z,emit)`; the sound board passes nothing and
 * hears both at the listener.
 */
export function bossRoar(kind: string, place: (emit: () => void) => void = (emit) => emit()): void { lv("bossRoar", () => {
  place(()=>speak(kind, "roar"));
  after(()=>{place(()=>speak(kind, "roarTail"));},200); }); }
/** A priest boss vanishes (`priestTeleport`, first half). */
export function priestVanish(): void { lv("priestVanish", () => { blip(700,.25,"sine",.1,140,true); }); }
/** …and reappears somewhere else (second half). */
export function priestAppear(): void { lv("priestAppear", () => { blip(140,.25,"sine",.12,700,true); }); }
/** A priest boss summons its flock (`priestThink`, phase 2): a chant, steady, with a wide vibrato. */
export function priestSummons(kind: string): void { lv("priestSummons", () => { speak(kind, "summon"); }); }
/** A Slaughtaur's shield blocks a shot (`damageEnemy`). */
export function shieldBlock(): void { lv("shieldBlock", () => { bang(.04,.3,3000,800); }); }
/** A shot rings off an armoured zombie's plating (`damageEnemy`). */
export function armourPlateHit(): void { lv("armourPlateHit", () => { bang(.05,.32,2800,700); }); }
/** The plating gives way. */
export function armourShatter(): void { lv("armourShatter", () => { bang(.15,.35,900); }); }
/**
 * A monster is hurt (`damageEnemy`): a short yelp in its voice — once per
 * hit, however many pellets of it landed in the same instant (`speakOnce`).
 * `who` is the monster hurt (the call site passes the enemy), so a blast
 * that hurts three of a kind still makes three yelps.
 */
export function monsterPain(kind: string, who?: object): void { lv("monsterPain", () => { speakOnce(kind, "pain", 0.04, [], who); }); }
/** A limb is torn off (`severLimb`). */
export function limbTorn(): void { lv("limbTorn", () => { gurgle(.25,.4); }); }
/** A body bursts into gibs (`killEnemy`'s overkill branch). */
export function gibBurst(): void { lv("gibBurst", () => { bang(.2,.45,800);gurgle(.45,.5); }); }
/** A monster dies whole (`killEnemy`): its death cry, falling; the wet ones gurgle under it. */
export function monsterDeath(kind: string): void { lv("monsterDeath", () => { speak(kind, "death"); }); }
/** A head is torn off (`killEnemy`'s decapitation branch). */
export function decapitation(): void { lv("decapitation", () => { gurgle(.32,.45); }); }
/** A severed head bounces (`headTick`). */
export function headBounce(): void { lv("headBounce", () => { gurgle(.1,.18); }); }
/** A severed head is kicked (`headTick`). */
export function headKicked(): void { lv("headKicked", () => { bang(.08,.3,500); }); }
/** A body the size of a boss hitting the floor. */
const CRASH: Layer[] = [
  { noise: "white", filters: [{ type: "lowpass", f: 1200, q: 0.7, to: 180, over: 0.5 }], env: { a: 0.002, h: 0.05, d: 0.7 }, drive: 2.5, level: 0.8 },
  { noise: "brown", filters: [{ type: "lowpass", f: 90, q: 0.7 }], env: { a: 0.01, h: 0.1, d: 1.0 }, drive: 1.5, level: 1.2 },
];
/** A boss dies (`bossDeath`): its death cry, with the octave under it, over the crash. */
export function bossDies(kind: string): void { lv("bossDies", () => { speak(kind, "death", CRASH); }); }
