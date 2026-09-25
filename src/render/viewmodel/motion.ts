import { clamp } from "../../utils/math";

/**
 * How the body carries the weapon: the stride, the sprint pose, the weight
 * of the gun against turns and strafes, and jumps and landings. Player
 * feedback round 2, Task 2 (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md):
 * the project owner asked for the running animation to be fixed after round
 * 1 had already cut the sprint sway, so the answer here is shape, not less.
 *
 * Everything here only READS the frame (velocity, grounded, facing, bobT,
 * sway) and keeps its own purely visual state between frames. It never
 * writes gameplay state and draws nothing from Math.random, so movement,
 * footstep timing and every trace fixture are untouched.
 *
 * Cost: a change to a rig term re-rasterizes the model (~1 ms), a change to
 * a screen term only moves the finished image. So the continuous motions —
 * the stride, the lag behind the mouse and the strafe, the jump and landing
 * — are screen terms. Only the sprint pose (eased in and out over a fraction
 * of a second, then constant) and a small strafe lean (quantized to steps,
 * so it re-renders only when it crosses one) touch the rig.
 */

/**
 * A damped spring on one number: `x` chases `target` with a little
 * overshoot, which is what makes a weight read as a weight. Semi-implicit
 * Euler, substepped so a long frame (the loop caps dt at .05) behaves like
 * short ones. It snaps onto the target once it is within a hair of it, so
 * "back at rest" is exactly rest.
 */
export class Spring {
  x = 0;
  v = 0;
  constructor(readonly omega: number, readonly zeta: number) {}
  step(target: number, dt: number): number {
    const n = Math.max(1, Math.ceil(dt / 0.02)), h = dt / n, w = this.omega;
    for (let i = 0; i < n; i++) {
      this.v += (w * w * (target - this.x) - 2 * this.zeta * w * this.v) * h;
      this.x += this.v * h;
    }
    if (Math.abs(this.x - target) < 1e-3 && Math.abs(this.v) < 1e-2) { this.x = target; this.v = 0; }
    return this.x;
  }
}

/** The stride's size at full bob amount, overlay units: horizontal half-width, and the full vertical dip. */
export const STRIDE_X = 7, STRIDE_Y = 5;

/**
 * The stride: a figure-eight, horizontal at half the vertical rate.
 *
 * Phase-locked to Player.ts's footstep, which fires where sin(bobT*4)
 * crosses zero going up — footstep phase ph = bobT*4 ≡ 0 (mod 2π). The
 * vertical term (1+cos ph)/2 is at its lowest (the largest downward
 * offset) exactly there, once per footstep; the horizontal term
 * sin(ph/2+π/4) runs at half that rate, in the quarter-phase that makes the
 * path a figure-eight rather than a U. So the weapon lands at the bottom
 * of the right lobe on one footstep and the left lobe on the next — one
 * foot, then the other. `amt` scales both (the walk/sprint bob amount).
 * y is down-positive and never negative: the stride only ever lowers the
 * weapon from where it rests, never lifts it into the line of fire.
 */
export function stride(bobT: number, amt: number): { x: number; y: number } {
  const ph = bobT * 4;
  return { x: Math.sin(ph / 2 + Math.PI / 4) * STRIDE_X * amt, y: (1 + Math.cos(ph)) / 2 * STRIDE_Y * amt };
}

/**
 * The sprint pose at full strength, added to the rig: lowered a little, the
 * muzzle dipped (pitch) and swung in across the body (yaw), and canted over
 * onto its left side (roll) — the carry that says running, not aiming.
 * Chosen from contact sheets of all eight weapons; a deeper drop took the
 * long guns (sniper, cross launcher) almost off the bottom of the screen.
 */
export const SPRINT_POSE = { y: -0.015, pitch: -0.16, yaw: -0.38, roll: -0.5 };
/** Seconds to ease into the sprint pose, and back out of it (out is quicker: you want to aim). */
export const SPRINT_IN = 0.3, SPRINT_OUT = 0.2;
/** After a shot the weapon stays up at the aim this long before a held sprint lowers it again. */
export const SPRINT_AFTER_FIRE = 0.3;

/** Take-off: the upward kick given to the jump spring by a full jump (7.4 m/s), overlay units per second. */
export const LIFT = 34;
/** Landing: downward kick per m/s of fall speed above LAND_MIN, capped at LAND_CAP m/s. */
export const LAND_K = 12, LAND_MIN = 1, LAND_CAP = 16;
/** Lag: overlay units per unit of mouse sway (swayX/swayY) and per m/s of strafe; lean, radians per m/s, in steps. */
export const LAG_TURN = 0.4, LAG_PITCH = 0.22, LAG_STRAFE = 0.24, LEAN = 0.008, LEAN_STEP = 0.015;

/** What the body's motion reads from the frame. */
export interface CarryInput {
  vx: number; vz: number; vy: number;
  grounded: boolean;
  /** input.yaw — facing, to take the strafe out of the velocity. */
  yaw: number;
  bobT: number;
  swayX: number; swayY: number;
  /** Sprint key held and actually moving at sprint speed. */
  sprinting: boolean;
  /** The walk/sprint bob amount, 0 when standing (./animate.ts's moveAmt times WALK/SPRINT_BOB_AMT). */
  walkAmt: number; sprintAmt: number;
  wstate: string;
}

/** The body's contribution to this frame's Pose: rig terms and screen terms, to be added. */
export interface Carry {
  y: number; pitch: number; yaw: number; roll: number;
  sx: number; sy: number;
  /** 0..1, the eased sprint pose (for tests and for Tasks 3-4). */
  sprint: number;
}

export class Body {
  /** Linear progress into the sprint pose, 0..1; the pose itself is a smoothstep of it, so it eases both ends. */
  private sprintU = 0;
  /** Linear 0..1 toward grounded: the stride fades out in the air and back in on landing. */
  private ground = 1;
  private sinceFire = Infinity;
  private wasGrounded = true;
  private lastVy = 0;
  private started = false;
  /** Mouse lag, horizontal and vertical, overlay units. */
  readonly turn = new Spring(11, 0.55);
  readonly look = new Spring(11, 0.55);
  /** Strafe lag, m/s (a lagged copy of the strafe velocity). */
  readonly strafe = new Spring(9, 0.5);
  /** Jump and landing, overlay units, down-positive. */
  readonly air = new Spring(13, 0.42);

  step(dt: number, v: CarryInput): Carry {
    if (!this.started) { this.started = true; this.wasGrounded = v.grounded; this.lastVy = v.vy; }

    // sprint pose: eased in while sprinting, out when the sprint ends, and out while shooting or reloading
    this.sinceFire = v.wstate === "fire" ? 0 : this.sinceFire + dt;
    const wantSprint = v.sprinting && v.wstate !== "fire" && v.wstate !== "reload" && this.sinceFire >= SPRINT_AFTER_FIRE;
    this.sprintU = clamp(this.sprintU + (wantSprint ? dt / SPRINT_IN : -dt / SPRINT_OUT), 0, 1);
    const k = this.sprintU * this.sprintU * (3 - 2 * this.sprintU);

    // the stride: a figure-eight on bobT, its size eased with the sprint, fading out in the air
    this.ground = clamp(this.ground + (v.grounded ? dt * 8 : -dt * 8), 0, 1);
    const st = stride(v.bobT, (v.walkAmt + (v.sprintAmt - v.walkAmt) * k) * this.ground);

    // jump and land: a kick to the air spring on take-off (up) and on landing (down, by fall speed)
    if (this.wasGrounded && !v.grounded && v.vy > 0) this.air.v -= LIFT * clamp(v.vy / 7.4, 0, 1);
    if (!this.wasGrounded && v.grounded) this.air.v += LAND_K * clamp(-this.lastVy - LAND_MIN, 0, LAND_CAP);
    this.wasGrounded = v.grounded; this.lastVy = v.vy;
    const air = this.air.step(0, dt);

    // weight: the weapon trails the turn (the mouse's own decaying sway) and the strafe, and settles back
    const side = v.vx * Math.cos(v.yaw) - v.vz * Math.sin(v.yaw); // strafe velocity, right-positive
    const lagS = this.strafe.step(side, dt);
    const turn = this.turn.step(-v.swayX * LAG_TURN, dt);
    const look = this.look.step(-v.swayY * LAG_PITCH, dt);
    const lean = Math.round(-lagS * LEAN / LEAN_STEP) * LEAN_STEP;

    return {
      y: SPRINT_POSE.y * k, pitch: SPRINT_POSE.pitch * k, yaw: SPRINT_POSE.yaw * k,
      roll: SPRINT_POSE.roll * k + lean,
      sx: st.x + turn - lagS * LAG_STRAFE,
      sy: st.y + look + air,
      sprint: k,
    };
  }
}
