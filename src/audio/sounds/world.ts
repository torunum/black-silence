import { bang, blip } from "../Sfx";
import { pianoNote } from "../Ambient";
import { after } from "../../core/Timers";
import { soundRandom, soundRnd } from "../SoundRandom";
import { lv } from "../Levels";

/**
 * THE SOUND CATALOGUE — WORLD. The player's own body, doors, pickups,
 * impacts on the level, and the ambient layer. See `./weapons.ts`'s header
 * for what this catalogue is and how the extraction is proven to be a pure
 * refactor.
 *
 * Player feedback round 2 Task 5 rebuilt most of it, each family in a file
 * of its own, re-exported from here so the game's call sites import from
 * where they always did: the footsteps, the landing and the jump
 * (`./steps.ts`), bullets and props (`./impacts.ts`), the doors and the exit
 * (`./doors.ts`), the pickups (`./pickups.ts`), the organ and the bells
 * (`./music.ts`). What they replaced is on the sound board as "old"
 * (`src/soundboard/previous/world.ts`). What is still here is as it was.
 */

export { footstep, landing, jump } from "./steps";
export { bulletHitsWall, bulletHitsFlesh, bulletHitsProp, ricochetRoll, bulletRicochet, propBreaks } from "./impacts";
export { hitFlesh, hitHead, hitArmour, hitKill } from "./hits";
export { doorOpens, lockedDoor, exitOpens, exitWalkthrough, chapterToll, doorShutsBehind, shrineLights } from "./doors";
export { itemPickup } from "./pickups";
export { organSting, churchBells, bossBeat } from "./music";
export { graveBreath, graveHeartbeat, earthShifts, lidCracks, dirtFalls } from "./grave";
export { hellRoar, hellScream, fireCrackle, churchyardWind } from "./hell";

/** One piano key (`Piano.ts`). */
export function pianoKey(midi: number): void { lv("pianoKey", () => { pianoNote(midi); }); }
/** The player is hit (`damagePlayer`). */
export function playerHurt(): void { lv("playerHurt", () => { bang(.1,.3,700);blip(90,.2,"sawtooth",.12,40); }); }
/** The gauntlet plate is stepped on and the dead come (`playerTick`). */
export function gauntletBegins(): void { lv("gauntletBegins", () => { blip(70,1,"sawtooth",.15,40,true); }); }
/** The gauntlet is cleared. */
export function gauntletCleared(): void { lv("gauntletCleared", () => { blip(523,.3,"sine",.1,1046,true); }); }
/** The random-event blackout: the torches die (`eventTick`). */
export function blackout(): void { lv("blackout", () => { blip(50,2,"sine",.1,30,true);bang(.4,.1,300); }); }
/** The random-event whispers: three faint voices, 0.6 s apart (`eventTick`). */
export function whispers(): void { lv("whispers", () => { for(let i=0;i<3;i++)after(()=>blip(soundRnd(300,500),.7,"sine",.025,soundRnd(120,200),true),i*600); }); }
/** Ambient stinger: a distant scream. */
export function distantScream(): void { lv("distantScream", () => { blip(soundRnd(480,720),1.4,"sine",.022,soundRnd(140,200),true); }); }
/** Ambient stinger: machinery — three low knocks at random spacing. */
export function machinery(): void { lv("machinery", () => { for(let i=0;i<3;i++)after(()=>bang(.08,.05,400),i*soundRnd(120,260)); }); }
/** Ambient stinger: a burst of static, then a shorter one. */
export function staticCrackle(): void { lv("staticCrackle", () => { bang(.3,.03,6000,1800);after(()=>bang(.15,.025,6000,1800),200); }); }
/** Ambient stinger: a drip. */
export function drip(): void { lv("drip", () => { blip(soundRnd(1200,2200),.08,"sine",.03,undefined,true); }); }
/** One of the four ambient stingers at random, weighted as the reference weighted them (`ambience`). */
export function ambientStinger(): void {
  const r=soundRandom();
  if(r<.28)distantScream();
  else if(r<.5)machinery();
  else if(r<.72)staticCrackle();
  else drip();}
/** Low health: one heartbeat, lub then dub (`vitalsAudio`). */
export function heartbeat(): void { lv("heartbeat", () => { blip(52,.1,"sine",.22,40);after(()=>blip(48,.12,"sine",.18,36),130); }); }
/** Low health: one ragged breath (`vitalsAudio`). */
export function breath(): void { lv("breath", () => { bang(.5,.04,900,300); }); }
