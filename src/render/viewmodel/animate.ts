import { clamp } from "../../utils/math";
import type { WeaponStats } from "../../weapons/definitions";
import { restPose, type Pose, type WeaponArt } from "./pose";

/**
 * Turns the weapon runtime into a Pose, once per frame. It only ever READS
 * the runtime (wstate, wtime, kickAmt, kickRot, muzzle, sway, bob) — it
 * never writes gameplay state, so fire rate, reload time and every trace
 * fixture are untouched by anything here.
 *
 * The one thing it keeps between frames is purely visual: the spin of a
 * rotating part (the nail cannon's barrels spin up while firing and wind
 * down after; a baked frame could not carry that momentum). Tasks 2-4 of
 * docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md (sprint
 * pose, inertia, landing, kick, flinch, fidget, switch arcs) hang their own
 * eased state here, adding to the Pose's rig terms.
 */

/** Per-frame inputs — the subset of draw.ts's ViewmodelFrame this reads. */
export interface AnimInput {
  cur: number;
  vx: number; vz: number;
  sprintKey: boolean;
  bobT: number;
  wstate: string; wtime: number;
  equipT: number; unequipT: number;
  kickAmt: number; kickRot: number;
  swayX: number; swayY: number;
  muzzle: number;
}

/**
 * Sprint/walk weapon-bob amplitude, multiplied into the screen-space bob.
 * Was `sprint?0.55:0.28` in the reference; the project owner reported the
 * sprint sway as "far too much" (player feedback round 1, task 3,
 * 2026-09-17) and `SPRINT_BOB_AMT` dropped to 0.38, about 1.36x walk.
 * Moved here unchanged from draw.ts with the rest of the pose maths.
 */
export const WALK_BOB_AMT = 0.28, SPRINT_BOB_AMT = 0.38;

/** How long the fire state lasts — WeaponState.ts's weaponTick leaves "fire" at min(.35, rate). */
export function fireWindow(w: WeaponStats): number {
  return Math.min(0.35, w.rate);
}

export class Animator {
  private spin = 0;
  private spinVel = 0;
  private lastCur = -1;

  /** Builds this frame's pose. `tNow` is the loop's millisecond timestamp (for breathing). */
  step(dt: number, tNow: number, v: AnimInput, w: WeaponStats, art: WeaponArt): Pose {
    const p = restPose();
    if (v.cur !== this.lastCur) { this.lastCur = v.cur; this.spinVel = 0; }

    // screen-space: walk bob, breathing, mouse sway (the reference's formulas, same constants)
    const spd = Math.hypot(v.vx, v.vz);
    const sprint = v.sprintKey && spd > 7;
    const moveAmt = clamp((spd - 0.6) / 6.4, 0, 1);
    const bobAmt = moveAmt * (sprint ? SPRINT_BOB_AMT : WALK_BOB_AMT);
    const idleB = Math.sin(tNow * 0.0011) * 0.7 * (1 - moveAmt);
    p.sx = Math.sin(v.bobT * 4) * 2.4 * bobAmt + v.swayX * 0.25;
    p.sy = Math.abs(Math.cos(v.bobT * 4)) * 1.8 * bobAmt + idleB + v.swayY * 0.2;

    // equip / unequip: the weapon swings up from below the frame, or down out of it
    let e = 0;
    if (v.wstate === "equip") e = 1 - clamp(v.wtime / v.equipT, 0, 1);
    if (v.wstate === "unequip") e = clamp(v.wtime / v.unequipT, 0, 1);
    p.y = -e * e * 0.2;
    p.pitch = -e * 0.55;
    // (the reference also rolled the sprite by swayX*.0008 — a sliver of a degree; dropped, because a
    // term that changes with every mouse movement would re-rasterize the model every frame for nothing)
    p.roll = e * 0.4 + v.kickRot * 0.013;

    // firing: recoil from the runtime's own decaying kick; the mechanism from progress through the fire state
    p.recoil = w.kick > 0 ? clamp(v.kickAmt / w.kick, 0, 1) : 0;
    if (v.wstate === "fire") p.action = clamp(art.action(clamp(v.wtime / fireWindow(w), 0, 1)), 0, 1);
    p.heat = clamp(v.muzzle / 0.4, 0, 1);
    if (v.wstate === "reload") p.reload = clamp(v.wtime / w.reload, 0, 1);

    // rotating parts: spin up while firing, wind down after
    const rate = art.spinRate ?? 0;
    const target = v.wstate === "fire" ? rate : (art.idleSpin ?? 0);
    this.spinVel += (target - this.spinVel) * Math.min(1, dt * (target > this.spinVel ? 9 : 1.6));
    this.spin = (this.spin + this.spinVel * dt) % (Math.PI * 2);
    p.spin = this.spin;
    return p;
  }
}
