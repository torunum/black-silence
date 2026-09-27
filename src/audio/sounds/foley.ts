import { lv } from "../Levels";
import { play, type Layer } from "../Layers";
import { clack, rattle, slide, thud } from "../Material";
import { spin, spinning } from "../Spin";
import { SPIN } from "../../render/viewmodel/phases";

/**
 * THE SOUND CATALOGUE — WEAPON MECHANISMS. Player feedback round 2 Task 3
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`): the new
 * viewmodel shows the mechanisms moving — barrels breaking open, bolts,
 * magazines, drums, a hopper, a reliquary's roof, a soul pressed into a
 * cage — and here each movement has a sound. `src/weapons/Foley.ts` plays
 * them at the moments the animation reaches them, from the same phase
 * constants (`src/render/viewmodel/phases.ts`).
 *
 * They replace the generic clicks every weapon used to make (a `click()` at
 * 18% of the reload, another at 62% and one at the end, and one each for
 * the switch, the pump and the dry fire) — kept on the sound board as
 * "old" (`src/soundboard/previous/weapons.ts`).
 *
 * Three kinds of material, from three primitives:
 *
 * - `clack` — metal meeting metal: a tick of bright noise and a few
 *   inharmonic partials ringing down (a struck plate's modes). Higher and
 *   longer partials for small, hard parts; lower and shorter for big ones.
 * - `thud` — mass arriving: a sine dropping an octave, the weight behind a
 *   clack.
 * - `slide` — friction: noise through a narrow band that moves with the
 *   part.
 *
 * Each is `lv(...)`-scoped: every one of them is a "foley" entry in
 * `../Levels.ts`, measured and trimmed like the rest.
 */

// (the primitives — clack, thud, slide, rattle — live in ../Material.ts since Task 5, which builds the world from them too)

// ---- every weapon

/** The trigger on an empty chamber: the striker's snap, and nothing after it. */
export function dryFire(): void { lv("dryFire", () => { play([...clack(0, [3400, 5100], 0.025, 0.35), thud(0.002, 900, 0.02, 0.15)]); }); }
/** Switching: the weapon swung down and away — leather, and a light rattle. */
export function weaponLower(): void { lv("weaponLower", () => { play([slide(0, 1400, 600, 0.14, 0.5, 0.8), ...clack(0.09, [1900, 2870], 0.04, 0.1)]); }); }
/** Switching: the next weapon swung up. */
export function weaponRaise(): void { lv("weaponRaise", () => { play([slide(0, 500, 1500, 0.16, 0.5, 0.8)]); }); }
/** Switching: it arrives in the hands, at the end of the raise. */
export function weaponReady(): void { lv("weaponReady", () => { play([...clack(0, [2300, 3500, 5200], 0.05, 0.25), thud(0, 180, 0.06, 0.3)]); }); }

// ---- slot 0, the flare pistol

/** Fire: the thumb rolls the hammer back — two clicks, the half-cock then the full. */
export function flareHammerCock(): void { lv("flareHammerCock", () => { play([...clack(0, [4200, 6100], 0.02, 0.25), ...clack(0.03, [3300, 5000], 0.025, 0.3)]); }); }
/** Reload: the barrel drops open on its hinge, and the brass rings. */
export function flareOpen(): void { lv("flareOpen", () => { play([thud(0, 260, 0.08, 0.35), ...clack(0, [2800, 4100], 0.06, 0.25), ...clack(0.005, [5200], 0.12, 0.06)]); }); }
/** Reload: the fresh shell pushed home. */
export function flareShellIn(): void { lv("flareShellIn", () => { play([slide(0, 900, 1600, 0.05, 0.25), thud(0.04, 320, 0.05, 0.4), ...clack(0.04, [3100], 0.03, 0.12)]); }); }
/** Reload: snapped shut. */
export function flareShut(): void { lv("flareShut", () => { play([...clack(0, [2500, 3700, 5600], 0.07, 0.45), thud(0, 220, 0.06, 0.4)]); }); }

// ---- slot 1, the sawed-off

/** Fire, 300 ms after the blast: the forend racked back to its stop, and slammed home. */
export function shotgunPump(): void {
  lv("shotgunPump", () => {
    play([
      slide(0, 900, 1400, 0.05, 0.35, 1), ...clack(0, [1600, 2500], 0.06, 0.45), thud(0, 160, 0.06, 0.4),
      slide(0.02, 1400, 800, 0.04, 0.3, 1), ...clack(0.05, [1300, 2100, 3300], 0.07, 0.55), thud(0.05, 140, 0.07, 0.5),
    ]);
  });
}
/** Reload: the lever thrown and the barrels falling open on the hinge — heavy iron. */
export function shotgunOpen(): void { lv("shotgunOpen", () => { play([...clack(0, [1800, 2700], 0.05, 0.3), thud(0.02, 140, 0.12, 0.6), ...clack(0.02, [900, 1450], 0.12, 0.15)]); }); }
/** Reload: the extractor kicks the two spent hulls out, and they tumble. */
export function shotgunHullsOut(): void { lv("shotgunHullsOut", () => { play([thud(0, 500, 0.03, 0.3), ...clack(0.05, [2900], 0.04, 0.12), ...clack(0.11, [2600], 0.04, 0.1)]); }); }
/** Reload: two fresh shells dropped into the chambers, one after the other. */
export function shotgunShellsIn(): void {
  lv("shotgunShellsIn", () => { play([0, 0.07].flatMap((t): Layer[] => [slide(t, 700, 1300, 0.05, 0.2), thud(t + 0.04, 260, 0.05, 0.35)])); });
}
/** Reload: the barrels snapped shut. */
export function shotgunShut(): void { lv("shotgunShut", () => { play([...clack(0, [1500, 2300, 3400], 0.09, 0.55), thud(0, 120, 0.12, 0.7)]); }); }

// ---- slot 2, the combat rifle

/** Reload: the release pressed and the magazine sliding out. */
export function rifleMagOut(): void { lv("rifleMagOut", () => { play([...clack(0, [3600, 5300], 0.03, 0.3), slide(0.01, 1200, 700, 0.12, 0.35, 1.5)]); }); }
/** Reload: the fresh magazine seated with a click. */
export function rifleMagIn(): void { lv("rifleMagIn", () => { play([slide(0, 700, 1200, 0.04, 0.25), ...clack(0.035, [1900, 2800, 4200], 0.06, 0.55), thud(0.035, 200, 0.06, 0.45)]); }); }
/** Reload: the T-handle pulled back to its stop. */
export function rifleChargeBack(): void { lv("rifleChargeBack", () => { play([...clack(0, [2600, 3900], 0.05, 0.45), thud(0, 240, 0.05, 0.3)]); }); }
/** Reload: let fly — the bolt slams home. */
export function rifleChargeForward(): void { lv("rifleChargeForward", () => { play([...clack(0, [1800, 2750, 4100], 0.08, 0.6), thud(0, 170, 0.07, 0.5)]); }); }

// ---- slot 3, the tommy gun

/** Reload: the drum unlatched and slid out, its rounds shifting. */
export function tommyDrumOut(): void { lv("tommyDrumOut", () => { play([...clack(0, [2100, 3300], 0.04, 0.35), slide(0.01, 900, 500, 0.16, 0.35, 1.2), rattle(0.02, 3000, 30, 0.12, 0.15)]); }); }
/** Reload: the full drum swung in and latched. */
export function tommyDrumIn(): void { lv("tommyDrumIn", () => { play([slide(0, 500, 900, 0.06, 0.3), ...clack(0.05, [1500, 2400, 3600], 0.08, 0.6), thud(0.05, 150, 0.09, 0.6), rattle(0.05, 2800, 34, 0.1, 0.12)]); }); }
/** Reload: the cocking knob racked back. */
export function tommyKnobBack(): void { lv("tommyKnobBack", () => { play([...clack(0, [2400, 3600], 0.05, 0.45), thud(0, 200, 0.05, 0.3)]); }); }
/** Reload: the knob let go, the bolt home. */
export function tommyKnobForward(): void { lv("tommyKnobForward", () => { play([...clack(0, [1700, 2600, 3900], 0.08, 0.6), thud(0, 160, 0.07, 0.5)]); }); }

// ---- slot 4, the BMG sniper — the bolt's four motions, on every shot and in the reload

/** The bolt handle lifted. */
export function sniperBoltLift(): void { lv("sniperBoltLift", () => { play([...clack(0, [2900, 4400], 0.035, 0.3)]); }); }
/** The bolt drawn back to its stop. */
export function sniperBoltBack(): void { lv("sniperBoltBack", () => { play([slide(0, 800, 1500, 0.06, 0.3), ...clack(0.05, [2000, 3100], 0.07, 0.5)]); }); }
/** The bolt run forward, chambering. */
export function sniperBoltForward(): void { lv("sniperBoltForward", () => { play([slide(0, 1500, 800, 0.05, 0.3), ...clack(0.045, [1600, 2500, 3700], 0.09, 0.6), thud(0.045, 150, 0.08, 0.5)]); }); }
/** The handle dropped: locked. */
export function sniperBoltLock(): void { lv("sniperBoltLock", () => { play([...clack(0, [2300, 3500], 0.05, 0.4), thud(0, 220, 0.04, 0.25)]); }); }
/** Reload: the magazine out. */
export function sniperMagOut(): void { lv("sniperMagOut", () => { play([...clack(0, [3300, 5000], 0.03, 0.3), slide(0.01, 1000, 600, 0.1, 0.3)]); }); }
/** Reload: the magazine in. */
export function sniperMagIn(): void { lv("sniperMagIn", () => { play([slide(0, 600, 1000, 0.04, 0.25), ...clack(0.035, [1700, 2600, 3900], 0.07, 0.55), thud(0.035, 180, 0.06, 0.45)]); }); }

// ---- slot 5, the holy cross launcher

/** Fire: the next cross rises out of the roof slot — a small rising shimmer. */
export function crossRises(): void { lv("crossRises", () => { play([{ tone: "sine", f: 880, to: 1318.5, over: 0.15, env: { a: 0.04, h: 0.03, d: 0.25 }, level: 0.12 }, slide(0, 1500, 3000, 0.12, 0.1)]); }); }
/** Reload: the latch, and the roof creaking open on its hinge. */
export function crossLidOpen(): void {
  lv("crossLidOpen", () => {
    play([
      ...clack(0, [3000, 4500], 0.03, 0.3),
      { at: 0.02, tone: "sawtooth", f: 180, to: 240, over: 0.25, formants: [{ f: 1200, q: 8, gain: 1 }], am: { rate: 40, depth: 0.4 }, env: { a: 0.02, h: 0.1, d: 0.15 }, level: 0.5 },
    ]);
  });
}
/** Reload: a gold cross laid on ivory, and the relic answering. */
export function crossLaidIn(): void { lv("crossLaidIn", () => { play([...clack(0, [2600, 3900, 5800], 0.25, 0.25), { at: 0.01, tone: "sine", f: [1174.7, 1760], env: { a: 0.004, d: 0.9 }, level: 0.08 }]); }); }
/** Reload: the roof closed. */
export function crossLidShut(): void {
  lv("crossLidShut", () => {
    play([
      { tone: "sawtooth", f: 230, to: 170, over: 0.08, formants: [{ f: 1100, q: 8, gain: 1 }], am: { rate: 45, depth: 0.4 }, env: { a: 0.01, h: 0.03, d: 0.06 }, level: 0.35 },
      thud(0.07, 300, 0.06, 0.4), ...clack(0.07, [2200, 3300], 0.06, 0.4),
    ]);
  });
}

// ---- slot 6, the nail cannon

/** Reload: the empty hopper unclipped and lifted, rattling its last nails. */
export function nailHopperOff(): void { lv("nailHopperOff", () => { play([...clack(0, [2200, 3300], 0.04, 0.35), rattle(0.01, 2500, 25, 0.15, 0.15)]); }); }
/** Reload: the full hopper dropped on its post — heavy, and full of nails. */
export function nailHopperOn(): void { lv("nailHopperOn", () => { play([thud(0, 130, 0.1, 0.6), ...clack(0, [1400, 2100, 3200], 0.09, 0.55), rattle(0.01, 3200, 45, 0.25, 0.25)]); }); }
/**
 * Fire: the motor spinning the barrels — `true` every frame while firing,
 * `false` once it stops; `gone` when the weapon is put away (see
 * `../Spin.ts`). Its level is set when the motor starts.
 */
export function nailCannonSpin(on: boolean, gone = false): void {
  if (!on && !spinning()) return;
  lv("nailCannonSpin", () => { spin(on, SPIN.up, SPIN.down, gone); });
}

// ---- slot 7, the soul reaper

/** Reload: the spent core gutters out — a small voice falling away. */
export function reaperGutter(): void {
  lv("reaperGutter", () => {
    play([
      { tone: "sawtooth", f: [220, 233], to: 90, over: 0.35, formants: [{ f: 520, q: 6, gain: 1 }, { f: 900, q: 7, gain: 0.6 }], vibrato: { rate: 7, cents: 30 }, env: { a: 0.01, h: 0.05, d: 0.35 }, level: 0.9 },
      { noise: "white", filters: [{ type: "highpass", f: 2000 }], env: { a: 0.01, d: 0.3 }, level: 0.08 },
    ]);
  });
}
/** Reload: the husk plucked out of the cage — wet, and glassy. */
export function reaperPluck(): void { lv("reaperPluck", () => { play([{ noise: "white", filters: [{ type: "bandpass", f: 1800, q: 4 }], env: { a: 0.001, h: 0.005, d: 0.06 }, drive: 2, level: 0.35 }, { tone: "sine", f: [1320, 1980], env: { a: 0.001, d: 0.15 }, level: 0.1 }, thud(0, 90, 0.08, 0.3)]); }); }
/** The reaper's charge: a soul filling the cage — voices rising an octave, and a crackle under them. On the reload, and as the core re-forms after each shot. */
export function reaperCharge(): void {
  lv("reaperCharge", () => {
    play([
      { tone: "sawtooth", f: [110, 138.6, 164.8], to: 220, over: 0.5, formants: [{ f: 650, q: 6, gain: 1 }, { f: 1080, q: 7, gain: 0.6 }, { f: 2650, q: 8, gain: 0.3 }], vibrato: { rate: 6, cents: 20 }, env: { a: 0.15, h: 0.2, d: 0.3 }, level: 1 },
      { noise: "white", filters: [{ type: "highpass", f: 3000 }], am: { rate: 60, depth: 0.5, type: "square" }, env: { a: 0.2, h: 0.1, d: 0.25 }, level: 0.08 },
    ]);
  });
}
/** Reload: the bone claws closing on the new core — three dry clacks. */
export function reaperClawsClose(): void { lv("reaperClawsClose", () => { play([...[0, 0.018, 0.031].flatMap((t) => clack(t, [1400, 2200], 0.03, 0.35)), thud(0, 180, 0.05, 0.3)]); }); }
