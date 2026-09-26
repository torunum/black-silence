import { bang, blip } from "../Sfx";
import { growl, gurgle } from "../Voice";
import { after } from "../../core/Timers";
import { soundRandom, soundRnd } from "../SoundRandom";

/**
 * THE SOUND CATALOGUE — WORLD. The player's own body, doors, pickups,
 * impacts on the level, and the ambient layer. See `./weapons.ts`'s header
 * for what this catalogue is and how the extraction is proven to be a pure
 * refactor. The doors, the bells, the organ, the piano and the boss pulse
 * were already named functions and stay where they are (`../Ambient.ts`).
 */

/**
 * One footstep (`footstep` in `src/player/Player.ts`). Stone everywhere but
 * level 1, whose marble floor adds a faint random-pitched ring; running is
 * louder.
 */
export function footstep(sprinting: boolean, marble: boolean): void {
  bang(.05,sprinting?.09:.06,marble?2400:700,marble?600:0);
  if(marble)blip(soundRnd(800,1000),.05,"sine",.02);}
/** The player jumps. */
export function jump(): void { blip(140,.06,"sine",.04,90); }
/** The player is hit (`damagePlayer`). */
export function playerHurt(): void { bang(.1,.3,700);blip(90,.2,"sawtooth",.12,40); }
/** A locked door the player has no key for (`interact`). */
export function lockedDoor(): void { growl(80,.3,.25,true); }
/** Any pickup — health, ammo, armour, a key, a weapon (`itemsTick`). */
export function itemPickup(): void { blip(330,.14,"sine",.1,210,true);gurgle(.12,.12); }
/** The level's exit opens once its boss is dead (`openExit`). */
export function exitOpens(): void { blip(120,.7,"sine",.09,90,true);growl(70,.4,.2,true); }
/** The gauntlet plate is stepped on and the dead come (`playerTick`). */
export function gauntletBegins(): void { blip(70,1,"sawtooth",.15,40,true); }
/** The gauntlet is cleared. */
export function gauntletCleared(): void { blip(523,.3,"sine",.1,1046,true); }
/** A bullet strikes a breakable prop (`hitscan`). */
export function bulletHitsProp(): void { bang(.04,.12,1500,300); }
/** Whether a bullet that hit a wall ricochets audibly — three times in ten (`hitscan`). */
export function ricochetRoll(): boolean { return soundRandom()<.3; }
/** The ricochet itself. */
export function bulletRicochet(): void { bang(.03,.08,4000,800); }
/** A crate, pew or chair breaks (`breakProp`). */
export function propBreaks(): void { bang(.12,.32,1200);bang(.08,.2,500); }
/** The random-event blackout: the torches die (`eventTick`). */
export function blackout(): void { blip(50,2,"sine",.1,30,true);bang(.4,.1,300); }
/** The random-event whispers: three faint voices, 0.6 s apart (`eventTick`). */
export function whispers(): void { for(let i=0;i<3;i++)after(()=>blip(soundRnd(300,500),.7,"sine",.025,soundRnd(120,200),true),i*600); }
/** Ambient stinger: a distant scream. */
export function distantScream(): void { blip(soundRnd(480,720),1.4,"sine",.022,soundRnd(140,200),true); }
/** Ambient stinger: machinery — three low knocks at random spacing. */
export function machinery(): void { for(let i=0;i<3;i++)after(()=>bang(.08,.05,400),i*soundRnd(120,260)); }
/** Ambient stinger: a burst of static, then a shorter one. */
export function staticCrackle(): void { bang(.3,.03,6000,1800);after(()=>bang(.15,.025,6000,1800),200); }
/** Ambient stinger: a drip. */
export function drip(): void { blip(soundRnd(1200,2200),.08,"sine",.03,undefined,true); }
/** One of the four ambient stingers at random, weighted as the reference weighted them (`ambience`). */
export function ambientStinger(): void {
  const r=soundRandom();
  if(r<.28)distantScream();
  else if(r<.5)machinery();
  else if(r<.72)staticCrackle();
  else drip();}
/** Low health: one heartbeat, lub then dub (`vitalsAudio`). */
export function heartbeat(): void { blip(52,.1,"sine",.22,40);after(()=>blip(48,.12,"sine",.18,36),130); }
/** Low health: one ragged breath (`vitalsAudio`). */
export function breath(): void { bang(.5,.04,900,300); }
