/**
 * The hands reacting to what happens to the player — player feedback round
 * 2, Task 4 (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md):
 * "more animation". Small motions, each big enough to read on screen:
 *
 * - **Hurt flinch.** On a hit the weapon jolts down and twists, harder for
 *   more damage, alternating sides hit to hit, and settles in under half a
 *   second.
 * - **Dry fire.** Pulling the trigger on an empty weapon with no reserve
 *   (the game's dry click) jerks it with the squeeze, then cants it over as
 *   if to look at it. Held down, the game clicks every .3 s; the cant holds
 *   rather than restarting, and each click jerks it again.
 * - **Pickup nod.** A weapon or ammo picked up: a quick dip and back.
 * - **Idle fidget.** After FIDGET_AFTER seconds with no input at all, and
 *   the weapon idle, a short inspect (turned over to look at its side) or a
 *   re-grip (a rock in the hand), alternating. Any input cancels it at once:
 *   it stops advancing that frame and is gone within FIDGET_CANCEL.
 *
 * Every event arrives as a counter in src/core/AnimCues.ts that gameplay
 * bumps and nothing in the game reads; this only compares each counter with
 * the value it saw last frame. The motions are rig terms added to the pose,
 * held under the same line-of-fire rule as everything else (tests pin it).
 * Deterministic: variation comes from the counters themselves (which side a
 * hit twists to, which fidget plays), never from Math.random.
 */

/** Counters from src/core/AnimCues.ts, plus what the frame says about activity. */
export interface CueInput {
  hurt: number; hurtAmt: number; pickup: number; dryFire: number; input: number;
  /** The player is moving, or the weapon is doing anything but idling (firing, reloading, switching, kicking), or the game is paused. */
  busy: boolean;
}
/** Rig terms to add to the pose. `fidget` (0..1, the fidget's weight) is for tests. */
export interface Reaction { x: number; y: number; pitch: number; yaw: number; roll: number; fidget: number }

/** Seconds without input before the hands fidget; how long one lasts; how fast input cancels it. */
export const FIDGET_AFTER = 6, FIDGET_LEN = 1.8, FIDGET_CANCEL = 0.1;
/** The flinch: rise time and duration, seconds; full-strength rig offsets (roll signed by side). */
export const FLINCH = { tau: 0.045, len: 0.45, x: 0.012, y: -0.022, pitch: -0.17, roll: 0.22 };
/** The dry-fire squeeze (a jerk) and the cant to look at the empty weapon, and how long the cant holds after the last click. */
export const DRY = { jerk: -0.08, tau: 0.03, roll: -0.34, yaw: -0.12, y: -0.012, hold: 0.35, ease: 0.1 };
/** The pickup nod: duration and full offsets. */
export const NOD = { len: 0.4, pitch: -0.24, y: -0.028, roll: 0.1 };

const smooth = (u: number): number => { const v = u < 0 ? 0 : u > 1 ? 1 : u; return v * v * (3 - 2 * v); };
/** A jolt: rises to 1 at `tau`, decays after, shaped by t·e^(1-t/tau); faded to exactly 0 by `len`. */
function jolt(t: number, tau: number, len: number): number {
  if (!(t >= 0) || t >= len) return 0;
  return (t / tau) * Math.exp(1 - t / tau) * (1 - smooth((t - len * 0.6) / (len * 0.4)));
}
/** 0 -> 1 -> 0 over [0,len] with eased ends of `e`. */
function hump(t: number, len: number, e: number): number {
  if (!(t >= 0) || t >= len) return 0;
  return Math.min(smooth(t / e), 1 - smooth((t - (len - e)) / e));
}

/** The two fidgets, at time t into one, full weight. */
function fidgetPose(n: number, t: number): Omit<Reaction, "fidget"> {
  if (n % 2 === 1) {
    // inspect: turned over onto its left side and in toward the eye, a small settle half-way, and back
    const k = hump(t, FIDGET_LEN, 0.4), w = Math.sin(t * 5.2) * 0.06 * k;
    return { x: -0.014 * k, y: -0.012 * k, pitch: -0.1 * k, yaw: -0.3 * k, roll: -0.58 * k + w };
  }
  // re-grip: dipped, rocked in the hand twice, and settled back
  const k = hump(t, FIDGET_LEN * 0.8, 0.25);
  return { x: 0, y: -0.02 * k, pitch: -0.07 * k, yaw: 0.06 * k, roll: 0.26 * Math.sin(t * 7) * k };
}

export class Reactions {
  private seen: CueInput | null = null;
  private tHurt = Infinity; private hurtSide = 1; private hurtK = 1;
  private tDry = Infinity; private cant = 0;
  private tNod = Infinity;
  private idle = 0; private fidgetT = -1; private fidgetW = 0; private fidgetN = 0; private cancelling = false;

  /** Starts over: the next step's counters are a baseline, not events, and nothing is playing. See Animator.resync. */
  resync(): void {
    this.seen = null;
    this.tHurt = this.tDry = this.tNod = Infinity; this.cant = 0;
    this.idle = 0; this.fidgetT = -1; this.fidgetW = 0; this.cancelling = false;
  }

  step(dt: number, c: CueInput): Reaction {
    const s = this.seen ?? c; // the first frame sees nothing new: counters that were already up are not events
    const hurt = c.hurt !== s.hurt, dry = c.dryFire !== s.dryFire, nod = c.pickup !== s.pickup, input = c.input !== s.input;
    this.seen = { ...c };
    this.tHurt += dt; this.tDry += dt; this.tNod += dt;
    if (hurt) {
      this.tHurt = 0;
      this.hurtSide = c.hurt % 2 ? 1 : -1;                        // alternate sides, hit to hit
      this.hurtK = Math.min(1.25, 0.6 + Math.max(0, c.hurtAmt) / 40);
    }
    if (dry) this.tDry = 0;
    if (nod) this.tNod = 0;

    // idle fidget: counts up only while nothing at all happens; any input or activity cancels it at once
    const quiet = !input && !c.busy && !hurt && !dry && !nod;
    if (!quiet) {
      this.idle = 0;
      if (this.fidgetT >= 0) this.cancelling = true;
    } else if (this.fidgetT < 0) {
      this.idle += dt;
      if (this.idle >= FIDGET_AFTER) { this.fidgetT = 0; this.fidgetW = 1; this.fidgetN++; this.cancelling = false; }
    }
    let fx = { x: 0, y: 0, pitch: 0, yaw: 0, roll: 0 };
    if (this.fidgetT >= 0) {
      if (this.cancelling) this.fidgetW = Math.max(0, this.fidgetW - dt / FIDGET_CANCEL);
      else this.fidgetT += dt;
      if (this.fidgetW <= 0 || this.fidgetT >= FIDGET_LEN) { this.fidgetT = -1; this.fidgetW = 0; this.idle = 0; this.cancelling = false; }
      else fx = fidgetPose(this.fidgetN, this.fidgetT);
    }
    const fw = this.fidgetW;

    // the dry fire's cant: up while clicks keep coming, eased back after the last
    const want = this.tDry < DRY.hold ? 1 : 0;
    this.cant += Math.max(-dt / DRY.ease, Math.min(dt / DRY.ease, want - this.cant));
    const cant = smooth(this.cant), jerk = jolt(this.tDry, DRY.tau, 0.2);

    const f = jolt(this.tHurt, FLINCH.tau, FLINCH.len) * this.hurtK, side = this.hurtSide;
    const n = this.tNod < NOD.len ? Math.sin(Math.PI * this.tNod / NOD.len) ** 2 : 0;

    return {
      x: FLINCH.x * side * f + fx.x * fw,
      y: FLINCH.y * f + DRY.y * cant + NOD.y * n + fx.y * fw,
      pitch: FLINCH.pitch * f + DRY.jerk * jerk + NOD.pitch * n + fx.pitch * fw,
      yaw: DRY.yaw * cant + fx.yaw * fw,
      roll: FLINCH.roll * side * f + DRY.roll * cant + NOD.roll * n + fx.roll * fw,
      fidget: fw,
    };
  }
}
