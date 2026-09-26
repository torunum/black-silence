import { bang, blip, click, gunshot, type GunshotProfile } from "../Sfx";
import { growl } from "../Voice";
import { after } from "../../core/Timers";
import { soundRnd } from "../SoundRandom";

/**
 * THE SOUND CATALOGUE — WEAPONS. Every sound the player's weapons make, as a
 * named function the game calls and the sound board (`soundboard.html`,
 * `src/soundboard/`) plays by name. Player feedback round 2, Task 1
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * Before this file existed these were inline `blip`/`bang`/`click` calls at
 * their call sites (`src/weapons/WeaponState.ts`, `src/render/Overlay2D.ts`),
 * which is why nothing could play "the shotgun pump" on its own. The
 * extraction is a pure refactor: every function below makes exactly the
 * calls, with exactly the arguments and in exactly the order, that its call
 * site made. `tests/behavior/soundCatalogue.test.ts` proves it against the
 * frozen reference's own call-site text, sound by sound.
 *
 * `WEAPON_REPORTS` (the six rebuilt firearm reports, player feedback round
 * 1 task 4) moved here from `WeaponState.ts` with its doc comment, unedited;
 * `WeaponState.ts` re-exports it for the tests that read it there.
 */

/**
 * The six BALLISTIC weapons' reports — every `kind:"hit"` slot. Rebuilt for
 * player feedback round 1 task 4 (2026-09-17): the project owner played the
 * game and said the gun firing sound was bad. `src/audio/Sfx.ts`'s
 * `gunshot()` doc comment carries the full argument; the short version is
 * that each of these used to be one fixed-lowpass noise burst with a
 * polynomial fade (no content above its own corner, so no transient; still
 * -12 dB at half its length, so too long a decay) plus, on four of the six,
 * a pitched square/sawtooth sweep — two of those through the echo bus,
 * which is the buzz.
 *
 * `split` is each weapon's OLD `bang` lowpass corner, unchanged: the crack
 * now occupies the band above it and the body the band below, so the one
 * number that used to end the sound is now where its two halves meet.
 * `crack + body + punch` is each weapon's OLD summed peak gain, exactly, so
 * nothing moved relative to the sounds this task did not touch.
 *
 * Slots 5 (HOLY CROSS LAUNCHER, `kind:"cross"`) and 7 (SOUL REAPER,
 * `kind:"reap"`) are DELIBERATELY UNCHANGED and still byte-for-byte the
 * reference's. Neither is a firearm; their rising pitched sweeps are the
 * character of a holy relic and a soul-eater, and "a firearm report is a
 * broadband transient followed by a fast-decaying body" is an argument that
 * does not apply to either. Changing them would be a sound-design decision
 * nobody asked for, in a round about one reported bug.
 *
 * NONE OF THIS HAS BEEN HEARD. It is argued entirely from the shape of the
 * synthesis. The real fix is Phase 1 Task 6's user-supplied CC0 `.ogg`
 * files — see `docs/assets.md`.
 */
const REPORTS: Record<number, GunshotProfile> = {
  // FLARE PISTOL — old: bang(.13,.42,2400) + blip(180,.08,"square",.1,60,echo)
  0: { split:2400, crack:.16, body:.20, bodyDur:.09, bodyEndHz:380, punch:.16, punchHz:150, punchEndHz:48, punchDur:.07 },
  // SAWED-OFF SHOTGUN — old: bang(.24,.65,1400) + bang(.1,.3,500). The second
  // bang was already a crude body layer; it is the punch now, done as a real
  // low thump instead of 100 ms of 500 Hz-lowpassed noise. Longest body and
  // the heaviest punch share of the six, which is the shotgun's whole point.
  1: { split:1400, crack:.25, body:.34, bodyDur:.17, bodyEndHz:240, punch:.36, punchHz:120, punchEndHz:36, punchDur:.12 },
  // COMBAT RIFLE — old: bang(.07,.34,2600) + blip(140,.05,"square",.06,70)
  2: { split:2600, crack:.13, body:.16, bodyDur:.05, bodyEndHz:420, punch:.11, punchHz:165, punchEndHz:55, punchDur:.04 },
  // TOMMY GUN — old: bang(.055,.26,3000), and nothing else at all: no second
  // layer of any kind. Gets both a crack and a punch here. Fires every 65 ms,
  // so it is the profile that most needs a decay that ends before the next
  // round starts; .04 body against a .065 rate now clears.
  3: { split:3000, crack:.09, body:.10, bodyDur:.04, bodyEndHz:520, punch:.07, punchHz:180, punchEndHz:62, punchDur:.03 },
  // BMG SNIPER — old: bang(.3,.6,1900) + blip(90,.3,"sawtooth",.12,40,echo).
  // Longest decay and the lowest punch: a .50 calibre rifle is the one weapon
  // here whose body legitimately runs past 200 ms.
  4: { split:1900, crack:.22, body:.26, bodyDur:.21, bodyEndHz:210, punch:.24, punchHz:110, punchEndHz:33, punchDur:.15 },
  // NAIL CANNON — old: bang(.04,.22,3200) + blip(260,.04,"square",.05,120).
  // Pneumatic, not a powder charge: brightest split, shortest body, and the
  // smallest punch share of the six — most of its energy is the crack.
  6: { split:3200, crack:.12, body:.10, bodyDur:.03, bodyEndHz:750, punch:.05, punchHz:220, punchEndHz:88, punchDur:.022 },
};

/** The ballistic slots `REPORTS` covers — exported so tests can derive the divergence set rather than hardcode it. */
export const REBUILT_REPORT_SLOTS = Object.keys(REPORTS).map(Number);
/** The profiles themselves, exported for the same reason. */
export const WEAPON_REPORTS: Readonly<Record<number, GunshotProfile>> = REPORTS;

export function flarePistolFire(): void { gunshot(REPORTS[0]); }
export function shotgunFire(): void { gunshot(REPORTS[1]); }
export function combatRifleFire(): void { gunshot(REPORTS[2]); }
export function tommyGunFire(): void { gunshot(REPORTS[3]); }
export function sniperFire(): void { gunshot(REPORTS[4]); }
/** Not a firearm: a relic's rising chime plus a soft burst. Deliberately left as the reference had it (round 1 task 4). */
export function crossLauncherFire(): void { blip(520,.3,"sine",.12,780,true); bang(.1,.2,800); }
export function nailCannonFire(): void { gunshot(REPORTS[6]); }
/** Not a firearm: a soul-eater's rising sawtooth, a burst and a growl. Deliberately left as the reference had it (round 1 task 4). */
export function soulReaperFire(): void { blip(70,.5,"sawtooth",.16,360,true); bang(.28,.45,500); growl(90,.4,.3,true); }

/** Each weapon slot's firing sound, in `WEAPON_STATS` order — what `WEAPONS[i].snd` is. */
export const WEAPON_FIRE_SOUNDS: readonly (() => void)[] = [
  flarePistolFire, shotgunFire, combatRifleFire, tommyGunFire,
  sniperFire, crossLauncherFire, nailCannonFire, soulReaperFire,
];

/** Lowering the current weapon to switch (`requestSwitch`). */
export function weaponLower(): void { click(.12); }
/** The next weapon comes up (`weaponTick`, unequip -> equip). */
export function weaponRaise(): void { click(.16); }
/** Reload, first step — the magazine/shells come out (`weaponTick`, 18% through). */
export function reloadOut(): void { click(.16); }
/** Reload, second step — the new rounds go in (62% through). */
export function reloadIn(): void { click(.14); }
/** Reload done — the weapon is ready again. */
export function reloadDone(): void { click(.2); }
/** Pulling the trigger on an empty weapon with no ammo left. */
export function dryFire(): void { click(.1); }
/** The sawed-off's pump, 300 ms after each shot. */
export function shotgunPump(): void { click(.12); }
/** The power kick's swing (`doKick`), whether or not it lands. */
export function kickSwing(): void { bang(.15,.5,900); }
/** The power kick landing on an enemy or a prop, 110 ms later. */
export function kickImpact(): void { bang(.12,.4,500); }
/**
 * A spent shell hitting the floor (`ejectCasing`): a short high tick at a
 * random pitch, a random 250-450 ms after the casing leaves the gun.
 */
export function casingTinkle(): void { after(()=>blip(soundRnd(1800,2600),.04,"square",.025),soundRnd(250,450)); }
