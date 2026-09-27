import * as F from "../audio/sounds/foley";
import { CROSS, FLARE, home, NAIL, out, REAPER, RIFLE, SAWED_OFF, SNIPER, TOMMY } from "../render/viewmodel/phases";
import { after } from "../core/Timers";

/**
 * WHEN THE MECHANISMS ARE HEARD — player feedback round 2 Task 3
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). The
 * viewmodel animates each weapon's mechanism from the weapon runtime's
 * state and time (`src/render/viewmodel/animate.ts` reads `wstate` and
 * `wtime`, and nothing else, to know how far through a reload or a shot it
 * is). This file sounds those movements at the moments the animation
 * reaches them: each cue's phase is computed from the same constants the
 * art draws with (`src/render/viewmodel/phases.ts`) — a barrel "arrives"
 * open at `out(open)`, is home at `home(open)`, a ramp lands at its end.
 *
 * ## How a cue is delivered, and why this way
 *
 * `weaponTick` (`./WeaponState.ts`) already advances `wtime` every frame;
 * it asks this file which cues lie between the phase the state was at and
 * the phase it has reached — `(from, to]` — and plays them. So:
 *
 * - **Nothing about gameplay changes.** No timer is scheduled, no state is
 *   written, nothing is read that the weapon code did not already compute;
 *   the sounds draw from sound's own dice, never `Math.random()`. Every
 *   trace fixture is byte-identical.
 * - **The sound and the picture share one clock.** Both follow `wtime`,
 *   which hit-stop slows and a pause stops. A wall-clock timer scheduled
 *   at the reload's start would drift from the animation on every
 *   hit-stop.
 * - **A cancelled reload cancels its foley, by construction.** There is
 *   nothing pending to cancel: once the state is no longer "reload", no
 *   reload cue can be crossed. The game cancels a reload two ways, and
 *   `weaponTick` handles both: switching weapons mid-reload
 *   (`requestSwitch` sets "unequip" from the input handler, between
 *   ticks), and firing mid-reload with rounds still in the magazine (the
 *   reload branch sets "idle" — `weaponTick` does not sound that frame's
 *   cues). A reload started again starts its cues from the top.
 *
 * The one exception is the sawed-off's pump, which the game has always
 * played from a 300 ms `after()` alongside the hull it ejects; the pump's
 * animation was built to land on that moment, so the sound stays on it.
 */

export interface Cue {
  /** Phase 0..1 through the state. */
  at: number;
  play: () => void;
}

/** The reload's cues per slot, phase = `wtime / reload`. */
export const RELOAD_CUES: readonly (readonly Cue[])[] = [
  // 0 FLARE PISTOL: the barrel drops open, the shell pushed home, snapped shut
  [{ at: out(FLARE.open), play: F.flareOpen }, { at: FLARE.push[1], play: F.flareShellIn }, { at: home(FLARE.open), play: F.flareShut }],
  // 1 SAWED-OFF: hulls kicked out as the barrels fall open, two shells in, snapped shut
  [
    { at: SAWED_OFF.hulls[0], play: F.shotgunHullsOut }, { at: out(SAWED_OFF.open), play: F.shotgunOpen },
    { at: SAWED_OFF.load[1], play: F.shotgunShellsIn }, { at: home(SAWED_OFF.open), play: F.shotgunShut },
  ],
  // 2 COMBAT RIFLE: magazine out, magazine in, the T-handle back and let fly
  [
    { at: RIFLE.drop[0], play: F.rifleMagOut }, { at: RIFLE.seat[1], play: F.rifleMagIn },
    { at: out(RIFLE.charge), play: F.rifleChargeBack }, { at: home(RIFLE.charge), play: F.rifleChargeForward },
  ],
  // 3 TOMMY GUN: drum out, drum in, the knob racked
  [
    { at: TOMMY.out[0], play: F.tommyDrumOut }, { at: TOMMY.seat[1], play: F.tommyDrumIn },
    { at: out(TOMMY.knob), play: F.tommyKnobBack }, { at: home(TOMMY.knob), play: F.tommyKnobForward },
  ],
  // 4 BMG SNIPER: the bolt lifted and drawn, magazine out and in, the bolt run home and locked
  [
    { at: out(SNIPER.reloadLift), play: F.sniperBoltLift }, { at: out(SNIPER.reloadBack), play: F.sniperBoltBack },
    { at: SNIPER.mag[0], play: F.sniperMagOut }, { at: home(SNIPER.mag), play: F.sniperMagIn },
    { at: home(SNIPER.reloadBack), play: F.sniperBoltForward }, { at: home(SNIPER.reloadLift), play: F.sniperBoltLock },
  ],
  // 5 HOLY CROSS LAUNCHER: the roof opens, a cross laid in, the roof shut
  [{ at: CROSS.lid[0], play: F.crossLidOpen }, { at: CROSS.loaded[1], play: F.crossLaidIn }, { at: home(CROSS.lid), play: F.crossLidShut }],
  // 6 NAIL CANNON: the empty hopper off, the full one on
  [{ at: NAIL.lift[0], play: F.nailHopperOff }, { at: home(NAIL.lift), play: F.nailHopperOn }],
  // 7 SOUL REAPER: the core gutters, the husk plucked, the fresh soul charges in, the claws close
  [
    { at: REAPER.dying[0], play: F.reaperGutter }, { at: REAPER.pluck[0], play: F.reaperPluck },
    { at: REAPER.press[0], play: F.reaperCharge }, { at: home(REAPER.claws), play: F.reaperClawsClose },
  ],
];

/** The fire window's cues per slot, phase = `wtime / min(.35, rate)` — the mechanisms that run after a shot. */
export const FIRE_CUES: readonly (readonly Cue[])[] = [
  [{ at: FLARE.cock[1], play: F.flareHammerCock }],
  [],
  [],
  [],
  [
    { at: out(SNIPER.lift), play: F.sniperBoltLift }, { at: out(SNIPER.back), play: F.sniperBoltBack },
    { at: home(SNIPER.back), play: F.sniperBoltForward }, { at: home(SNIPER.lift), play: F.sniperBoltLock },
  ],
  [{ at: CROSS.rise[0], play: F.crossRises }],
  [],
  [{ at: home(REAPER.spent) - REAPER.spent[2], play: F.reaperCharge }],
];

/** The raise's one cue: the weapon arriving in the hands at the end of it. Phase = `wtime / EQUIP_T`. */
export const EQUIP_CUES: readonly Cue[] = [{ at: 1, play: F.weaponReady }];

/** Plays every cue in `cues` whose phase lies in `(from, to]`. */
export function cross(cues: readonly Cue[], from: number, to: number): void {
  for (const c of cues) if (from < c.at && c.at <= to) c.play();
}

/**
 * The nail cannon's motor, each frame: driven while it fires, winding down
 * otherwise, and gone fast when another weapon is out
 * (`../audio/Spin.ts`). The animation's spin target is the same test.
 */
export function motorFoley(slot: number, wstate: string): void {
  F.nailCannonSpin(slot === 6 && wstate === "fire", slot !== 6);
}

/** The sound board's reload row: every cue of `slot`'s reload at its time, over `seconds`. */
export function playReload(slot: number, seconds: number): void {
  for (const c of RELOAD_CUES[slot]) after(c.play, c.at * seconds * 1000);
}
