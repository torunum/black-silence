import { ctx, voiced } from "../../audio/AudioEngine";
import { bang, blip, boom, click } from "../../audio/Sfx";
import { growl, gurgle } from "../../audio/Voice";
import { bellToll, organChord, stoneDoor } from "../../audio/Ambient";
import { soundRnd } from "../../audio/SoundRandom";

/**
 * THE WORLD AS IT SOUNDED BEFORE PLAYER FEEDBACK ROUND 2 TASK 5 — the sound
 * board's "old" buttons for every world sound Task 5 replaced: the
 * footstep and the landing (which was a running footstep), the jump, the
 * kick, the bullet hitting a crate and ricocheting, a prop breaking, the
 * stone door, the locked door, the pickup, the exit, the three explosions,
 * the UI cues, and the music the ambience check rebuilt (the boss pulse,
 * the organ chord, the church bells). The game never imports this file.
 *
 * Each function is the catalogue function as it stood at `e34815c`, and
 * plays at the level it had there — the trim from `src/audio/Levels.ts` at
 * `e34815c`, written down below because the table no longer has those
 * entries or those numbers — so "old" on the board is exactly what the
 * game played, through whichever mix the board is set to. The engine
 * voices they call (`bang`, `blip`, `boom`, `stoneDoor`, `bellToll`,
 * `organChord`, …) stay in `src/audio/` unchanged, pinned to the frozen
 * reference by `tests/fidelity.test.ts`; `tests/behavior/soundCatalogue.test.ts`
 * still runs these against the reference's own call sites.
 */

/** A level from `e34815c`'s table: trim in dB, room factor 1 (none of these had one). */
function at(trimDb: number, emit: () => void): void {
  voiced({ gain: Math.pow(10, trimDb / 20), room: 1 }, emit);
}

/** One footstep: stone everywhere but level 1's marble, with its random-pitched ring. The landing played it running. */
export function oldFootstep(sprinting: boolean, marble: boolean): void { at(14.4, () => {
  bang(.05,sprinting?.09:.06,marble?2400:700,marble?600:0);
  if(marble)blip(soundRnd(800,1000),.05,"sine",.02); }); }
/** The jump. */
export function oldJump(): void { at(14.5, () => { blip(140,.06,"sine",.04,90); }); }
/** The kick's swing. */
export function oldKickSwing(): void { at(-1.3, () => { bang(.15,.5,900); }); }
/** The kick landing on a monster or a prop (a wall, and the air, played nothing). */
export function oldKickImpact(): void { at(7.2, () => { bang(.12,.4,500); }); }
/** A bullet strikes a crate or pew. */
export function oldBulletHitsProp(): void { at(17.8, () => { bang(.04,.12,1500,300); }); }
/** The ricochet (three wall hits in ten). */
export function oldBulletRicochet(): void { at(15.8, () => { bang(.03,.08,4000,800); }); }
/** A crate, pew or chair breaks. */
export function oldPropBreaks(): void { at(4.4, () => { bang(.12,.32,1200);bang(.08,.2,500); }); }
/** Every door that was not flesh — stone, secret, and the red-key gate — was this one grind. */
export function oldStoneDoor(): void { at(1, () => { stoneDoor(); }); }
/** A locked door the player has no key for. */
export function oldLockedDoor(): void { at(-3.4, () => { growl(80,.3,.25,true); }); }
/** Every pickup — health, ammo, armour, a key, a weapon — was this one sound. */
export function oldItemPickup(): void { at(-2.6, () => { blip(330,.14,"sine",.1,210,true);gurgle(.12,.12); }); }
/** The exit opens. */
export function oldExitOpens(): void { at(-2.8, () => { blip(120,.7,"sine",.09,90,true);growl(70,.4,.2,true); }); }
/** The three explosions: the one `boom()` at three powers. */
export function oldBarrelExplosion(): void { at(-7, () => { boom(1.1); }); }
export function oldHolyCrossExplosion(): void { at(-3, () => { boom(.7); }); }
export function oldAfritDeathExplosion(): void { at(-4.2, () => { boom(.8); }); }
/** UI: the achievement toast, the kick coming ready, the scrap SMG. */
export function oldAchievementChime(): void { at(-1.4, () => { blip(160, .5, "sine", .05, 120, true); }); }
export function oldKickReady(): void { at(5.2, () => { click(.12); }); }
export function oldScrapSmgAssembled(): void { at(-1.4, () => { blip(330,.12,"square",.08); }); }
/** The organ chord (the priest's phases, the piano's recital) and the church bells. */
export function oldOrganSting(): void { at(9.8, () => { organChord(); }); }
export function oldChurchBells(): void { at(2.6, () => { bellToll(); }); }

let bossPulse: ReturnType<typeof setInterval> | null = null;
/**
 * The boss music pulse as it was — the reference's `startBossMusic`, body
 * and all (`tests/fidelity.test.ts` still compares this copy with the
 * reference byte for byte). It had no level: its beats fired from a
 * `setInterval` no scope reached, so it played at 0 dB.
 */
export function startBossMusic(): void {if(!ctx()||bossPulse)return;
  let beat=0;
  bossPulse=setInterval(()=>{
    bang(.09,.22,140);
    if(beat%2===1)bang(.05,.1,900,300);
    if(beat%4===3)blip(49,.25,"sawtooth",.07,46);
    beat++;},300);}
export function stopBossMusic(): void {if(bossPulse){clearInterval(bossPulse);bossPulse=null;}}
