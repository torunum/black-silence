import { clamp } from "../../utils/math";
import type { WeaponStats } from "../../weapons/definitions";
import { restPose, type Pose, type WeaponArt } from "./pose";
import { Body } from "./motion";
import { ASIDE, aside, kickElapsed } from "./kick";
import { Reactions } from "./react";
import { SPIN } from "./phases";

/**
 * Turns the weapon runtime into a Pose, once per frame. It only ever READS
 * the runtime (wstate, wtime, kickAmt, kickRot, muzzle, sway, bob) — it
 * never writes gameplay state, so fire rate, reload time and every trace
 * fixture are untouched by anything here.
 *
 * What it keeps between frames is purely visual: the spin of a rotating
 * part (the nail cannon's barrels spin up while firing and wind down after;
 * a baked frame could not carry that momentum), and the body carrying the
 * weapon — Task 2 of docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md,
 * the stride, sprint pose, weight and landings, in ./motion.ts. Tasks 3-4
 * (kick, flinch, fidget, switch arcs) hang their own eased state here,
 * adding to the Pose's rig terms.
 */

/** Per-frame inputs — the subset of draw.ts's ViewmodelFrame this reads. */
export interface AnimInput {
  cur: number;
  vx: number; vz: number;
  /** player.vy and player.grounded — jumps and landings. */
  vy: number;
  grounded: boolean;
  /** input.yaw — facing, so the strafe can be taken out of the velocity. */
  yaw: number;
  sprintKey: boolean;
  bobT: number;
  wstate: string; wtime: number;
  equipT: number; unequipT: number;
  kickAmt: number; kickRot: number;
  /** weaponRuntime.kickAnim — the power kick's countdown (./kick.ts). */
  kickAnim: number;
  /** src/core/AnimCues.ts's counters (hit, its damage, pickup, dry click, any input) — read to react, never written. */
  cueHurt: number; cueHurtAmt: number; cuePickup: number; cueDryFire: number; cueInput: number;
  /** The game is paused — an overlay (level end, win, death) or the piano is up: the hands do not fidget behind it. */
  paused: boolean;
  swayX: number; swayY: number;
  muzzle: number;
}

/**
 * The spin is drawn in steps of 2π/SPIN_STEPS, not continuously. The spin is a
 * rasterized term, so every change to it re-renders the model (~0.6 ms). A
 * fast spin moves several steps a frame, so the steps do not show. A slow one
 * crosses a step only now and then: the reaper's rune ring idles round at
 * .7 rad/s, which is about 7 steps a second, a sixth of the frames at 60 fps.
 * Without the steps it re-rendered every frame at rest. The nail cannon's
 * wind-down likewise stops costing anything once the barrels are nearly still.
 */
export const SPIN_STEPS = 64;
const SPIN_STEP = (Math.PI * 2) / SPIN_STEPS;

/**
 * Sprint/walk weapon-bob amplitude, multiplied into the screen-space bob.
 * Was `sprint?0.55:0.28` in the reference; the project owner reported the
 * sprint sway as "far too much" (player feedback round 1, task 3,
 * 2026-09-17) and `SPRINT_BOB_AMT` dropped to 0.38, about 1.36x walk.
 * Moved here unchanged from draw.ts with the rest of the pose maths. Since
 * round 2 Task 2 they scale ./motion.ts's figure-eight stride, and the
 * amount is blended from walk to sprint with the eased sprint pose rather
 * than switched.
 */
export const WALK_BOB_AMT = 0.28, SPRINT_BOB_AMT = 0.38;

/**
 * Switching weapons, at full travel (e=1, the weapon gone): out to the right (x, leading on sin e·π/2),
 * down (y, on e²), muzzle dropped, turned in and rolled onto its side. The reference only slid it down
 * (y -e²·.2, pitch -e·.55, roll e·.4); round 2 Task 4 asked for a rotation and an arc.
 */
export const SWITCH = { x: 0.075, y: -0.2, pitch: -0.6, yaw: 0.4, roll: 1.0 };

/** How long the fire state lasts — WeaponState.ts's weaponTick leaves "fire" at min(.35, rate). */
export function fireWindow(w: WeaponStats): number {
  return Math.min(0.35, w.rate);
}

export class Animator {
  private spin = 0;
  private spinVel = 0;
  private lastCur = -1;
  /** The body carrying the weapon: stride, sprint pose, weight, jumps and landings (./motion.ts). */
  readonly body = new Body();
  /** The hands' reactions: flinch, dry fire, pickup nod, idle fidget (./react.ts). */
  readonly react = new Reactions();

  /** Builds this frame's pose. `tNow` is the loop's millisecond timestamp (for breathing). */
  step(dt: number, tNow: number, v: AnimInput, w: WeaponStats, art: WeaponArt): Pose {
    const p = restPose();
    if (v.cur !== this.lastCur) { this.lastCur = v.cur; this.spinVel = 0; }

    // the body: stride, sprint pose, lag, jump and land (./motion.ts); breathing when standing
    // (the reference's walk/sprint bob amounts and breathing formula, same constants)
    const spd = Math.hypot(v.vx, v.vz);
    const moveAmt = clamp((spd - 0.6) / 6.4, 0, 1);
    const idleB = Math.sin(tNow * 0.0011) * 0.7 * (1 - moveAmt);
    const c = this.body.step(dt, {
      vx: v.vx, vz: v.vz, vy: v.vy, grounded: v.grounded, yaw: v.yaw, bobT: v.bobT, swayX: v.swayX, swayY: v.swayY,
      sprinting: v.sprintKey && spd > 7, walkAmt: moveAmt * WALK_BOB_AMT, sprintAmt: moveAmt * SPRINT_BOB_AMT, wstate: v.wstate,
    });
    p.sx = c.sx;
    p.sy = c.sy + idleB;

    // equip / unequip (Task 4): the weapon goes down out of the frame on an arc — out to the right first
    // (x leads, sin), then down (y follows, e²) — turning over onto its side as it goes; the new one comes
    // up the same arc, righting itself
    let e = 0;
    if (v.wstate === "equip") e = 1 - clamp(v.wtime / v.equipT, 0, 1);
    if (v.wstate === "unequip") e = clamp(v.wtime / v.unequipT, 0, 1);
    const arc = Math.sin(e * Math.PI / 2);
    // the power kick (./kick.ts): the weapon swings out of the leg's way and back; the leg is drawn from p.kick
    p.kick = kickElapsed(v.kickAnim);
    const a = aside(p.kick);
    // the hands' reactions (./react.ts): flinch, dry fire, pickup nod, idle fidget
    const r = this.react.step(dt, {
      hurt: v.cueHurt, hurtAmt: v.cueHurtAmt, pickup: v.cuePickup, dryFire: v.cueDryFire, input: v.cueInput,
      busy: spd > 0.3 || v.wstate !== "idle" || p.kick >= 0 || !v.grounded || v.paused,
    });
    p.x = SWITCH.x * arc + ASIDE.x * a + r.x;
    p.y = SWITCH.y * e * e + c.y + ASIDE.y * a + r.y;
    p.pitch = SWITCH.pitch * e + c.pitch + ASIDE.pitch * a + r.pitch;
    p.yaw = SWITCH.yaw * arc + c.yaw + ASIDE.yaw * a + r.yaw;
    // (the reference also rolled the sprite by swayX*.0008 — a sliver of a degree; dropped, because a
    // term that changes with every mouse movement would re-rasterize the model every frame for nothing)
    p.roll = SWITCH.roll * e + v.kickRot * 0.013 + c.roll + ASIDE.roll * a + r.roll;

    // firing: recoil from the runtime's own decaying kick; the mechanism from progress through the fire state
    p.recoil = w.kick > 0 ? clamp(v.kickAmt / w.kick, 0, 1) : 0;
    if (v.wstate === "fire") p.action = clamp(art.action(clamp(v.wtime / fireWindow(w), 0, 1)), 0, 1);
    p.heat = clamp(v.muzzle / 0.4, 0, 1);
    if (v.wstate === "reload") p.reload = clamp(v.wtime / w.reload, 0, 1);

    // rotating parts: spin up while firing, wind down after
    const rate = art.spinRate ?? 0;
    const target = v.wstate === "fire" ? rate : (art.idleSpin ?? 0);
    this.spinVel += (target - this.spinVel) * Math.min(1, dt * (target > this.spinVel ? SPIN.up : SPIN.down));
    if (Math.abs(target - this.spinVel) < 1e-3) this.spinVel = target; // a wind-down ends, exactly
    this.spin = (this.spin + this.spinVel * dt) % (Math.PI * 2);
    p.spin = (Math.round(this.spin / SPIN_STEP) % SPIN_STEPS) * SPIN_STEP;
    return p;
  }

  /**
   * Forget what happened while the viewmodel was not drawn (dead, not
   * started, the piano, the sniper scoped in): cue counters bumped meanwhile
   * are not events, and a fall in progress is not a landing. Without this
   * the killing blow's flinch, or a mid-fall death's landing dip, would play
   * on the first frame the weapon is drawn again.
   */
  resync(): void {
    this.react.resync();
    this.body.resync();
  }
}
