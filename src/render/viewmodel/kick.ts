import type { Builder } from "./builder";
import { MAT } from "./palette";
import { KICK_ANIM, KICK_HIT_T } from "../../weapons/WeaponRuntime";

/**
 * The power kick, as the player sees it — player feedback round 2, Task 3
 * (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md). The owner
 * said "fix the kick animation"; the reference's was a boot of a few
 * rectangles sliding up from the bottom edge. Now the weapon swings out of
 * the way, a leg in trousers and a hobnailed boot comes up and drives
 * forward into the centre of the screen, the view leans into it, and the
 * weapon comes back.
 *
 * **The timeline is fixed by the game, not chosen here.** doKick
 * (src/weapons/WeaponState.ts) sets kickAnim to .32 and resolves the hit
 * .110 s later on the same scaled clock kickAnim counts down on (both are
 * advanced by Loop.ts's gameplay block with the hit-stop-scaled dt). So,
 * in seconds since the kick:
 *
 *   0    .. .050  wind-up: the weapon swings aside, the knee comes up (the
 *                 chamber happens mostly below the frame; the knee and the
 *                 boot's toe break the bottom edge)
 *   .050 .. .110  strike: the leg drives out, accelerating, and locks out
 *                 at full extension exactly at KICK_HIT_T — the moment the
 *                 game resolves the hit
 *   .110 .. .160  hold: the foot stays planted in the target. The hit
 *                 lands on the first frame whose elapsed time reaches .110,
 *                 so the drawn hit frame sits somewhere in [.110, .110+dt);
 *                 holding to .160 covers every dt up to Loop.ts's .05 cap,
 *                 so the frame the hit lands on always shows full extension
 *                 and no earlier frame does
 *   .160 .. .320  recovery: the leg pulls back and drops out of frame, the
 *                 weapon swings back to the aim
 *
 * Everything here is a pure function of the elapsed time: no state, no
 * Math.random, and it never writes gameplay state (kickAnim is read from
 * the runtime, never set).
 */

/** Seconds since the kick: the wind-up ends and the strike begins. */
export const KICK_CHAMBER = 0.05;
/** Seconds since the kick: the foot leaves the target and the recovery begins. */
export const KICK_HOLD = 0.16;
/** Seconds since the kick: the leg is back at the chamber on its way down. */
export const KICK_RECHAMBER = 0.235;

/** Seconds since the kick started, from the runtime's countdown; -1 when no kick is running. */
export function kickElapsed(kickAnim: number): number {
  return kickAnim > 0 ? Math.min(KICK_ANIM, Math.max(0, KICK_ANIM - kickAnim)) : -1;
}

const smooth = (u: number): number => { const v = u < 0 ? 0 : u > 1 ? 1 : u; return v * v * (3 - 2 * v); };
/** 0..1 through [a,b]. */
const span = (t: number, a: number, b: number): number => Math.min(1, Math.max(0, (t - a) / (b - a)));

/**
 * How far the leg is driven out, 0 (chambered, or out of frame) to 1 (the
 * knee locked out, the sole in the target). Exactly 1 on
 * [KICK_HIT_T, KICK_HOLD], and below 1 at every moment before the hit.
 * The strike accelerates into the lock-out rather than easing into it — a
 * kick snaps.
 */
export function extension(t: number): number {
  if (t < KICK_CHAMBER || t > KICK_ANIM) return 0;
  // a hair under KICK_HIT_T counts as the hit: kickAnim and the scheduler subtract the same dt's in a
  // different order, so their float sums can differ in the last bit
  if (t < KICK_HIT_T - 1e-9) { const u = span(t, KICK_CHAMBER, KICK_HIT_T); return u * (0.55 + 0.45 * u); }
  if (t <= KICK_HOLD) return 1;
  return 1 - smooth(span(t, KICK_HOLD, KICK_RECHAMBER));
}

/** How far the knee has come up out of the resting (out-of-frame) leg: 0 hanging, 1 chambered or extended. */
function raised(t: number): number {
  if (t < 0 || t >= KICK_ANIM) return 0;
  if (t < KICK_CHAMBER) return smooth(t / KICK_CHAMBER);
  if (t <= KICK_RECHAMBER) return 1;
  return 1 - smooth(span(t, KICK_RECHAMBER, KICK_ANIM));
}

/** The leg's joints, camera space: the hip, then angles down the chain. */
export interface LegPose {
  /** Hip joint, metres, camera space (x right, y up, z forward). */
  hx: number; hy: number; hz: number;
  /** The leg swung in toward the centre line (negative yaw turns it left). */
  yaw: number;
  /** Thigh pitch from straight ahead: -π/2 hangs straight down. */
  thigh: number;
  /** Knee bend, radians (0 locked straight). */
  knee: number;
  /** Ankle: 0 keeps the foot square to the shin (sole facing along the shin), positive pulls the toe up toward the shin, negative points it. */
  ankle: number;
  /** The leg's turn about its own length. */
  twist: number;
  /** The foot turned about its own length: negative brings the outside of the boot, its sole and heel, round toward the eye. */
  turn: number;
}

// Three key poses; the leg blends hanging -> chambered by `raised`, chambered -> struck by `extension`.
const HANG = { thigh: -1.25, knee: 1.1, ankle: 0.55, hz: -0.02 };
const CHAMBER = { thigh: 0.36, knee: 1.95, ankle: 0.55, hz: 0.02 };
const STRUCK = { thigh: 0.36, knee: 0.05, ankle: -0.5, hz: 0.1 };
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/** The leg for elapsed time `t` (seconds since the kick), or null when no kick is running. */
export function legPose(t: number): LegPose | null {
  if (t < 0 || t >= KICK_ANIM) return null;
  const r = raised(t), e = extension(t);
  const k = (key: "thigh" | "knee" | "ankle" | "hz"): number => lerp(lerp(HANG[key], CHAMBER[key], r), STRUCK[key], e);
  return { hx: 0.075, hy: -0.33, hz: k("hz"), yaw: -0.2 - 0.06 * e, thigh: k("thigh"), knee: k("knee"), ankle: k("ankle"), twist: 0.3 - 0.1 * e, turn: -0.3 - 0.65 * e };
}

/** The weapon swung out of the way: 0 at the aim, 1 fully aside. Out during the wind-up, back over the recovery. */
export function aside(t: number): number {
  if (t < 0 || t >= KICK_ANIM) return 0;
  if (t < 0.07) return smooth(t / 0.07);
  if (t < 0.2) return 1;
  return 1 - smooth(span(t, 0.2, KICK_ANIM));
}
/** The weapon's rig offsets at full `aside`: down and out to the right, rolled onto its side, muzzle dropped. */
export const ASIDE = { x: 0.045, y: -0.038, pitch: -0.22, yaw: 0.22, roll: 0.6 };

/**
 * The view leaning into the kick, 0..1: it builds through the strike, peaks
 * on the hit, holds while the foot is planted and settles over the recovery.
 */
export function leanAmount(t: number): number {
  if (t < 0 || t >= KICK_ANIM) return 0;
  if (t < KICK_HIT_T) return smooth(t / KICK_HIT_T);
  if (t <= KICK_HOLD) return 1;
  return 1 - smooth(span(t, KICK_HOLD, KICK_ANIM));
}
/** The lean at full strength: the head dips forward and down (pitch, radians; drop and forward push, metres) and the body cants a little. */
export const LEAN = { pitch: -0.05, roll: -0.03, drop: 0.03, fwd: 0.07 };

/** The slice of a three.js camera withKickLean touches. */
export interface LeanCamera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  updateMatrixWorld(force?: boolean): void;
}

/**
 * Renders the world with the view leaned into the kick, then puts the
 * camera back exactly as it was.
 *
 * The lean is presentation only. Player.ts sets the camera every tick, and
 * gameplay reads it — the kick's own hit test and every hitscan take their
 * direction from it, the audio listener its orientation — so a lean written
 * into the camera would steer the kick it animates. Instead it is applied
 * around the one renderer.render call and undone straight after, restoring
 * the saved numbers by assignment (not by subtracting, which would leave
 * float residue) and refreshing matrixWorld, so everything outside the
 * render — gameplay, the listener, the trace fixtures that record the
 * camera after each frame — sees exactly the camera it would have without
 * the kick.
 */
export function withKickLean(cam: LeanCamera, kickAnim: number, render: () => void): void {
  const k = leanAmount(kickElapsed(kickAnim));
  if (k <= 0) { render(); return; }
  const { x: px, y: py, z: pz } = cam.position, { x: rx, z: rz } = cam.rotation, yaw = cam.rotation.y;
  // forward along the facing, as Player.ts moves (-sin yaw, -cos yaw)
  cam.position.x = px - Math.sin(yaw) * LEAN.fwd * k;
  cam.position.z = pz - Math.cos(yaw) * LEAN.fwd * k;
  cam.position.y = py - LEAN.drop * k;
  cam.rotation.x = rx + LEAN.pitch * k;
  cam.rotation.z = rz + LEAN.roll * k;
  try {
    render();
  } finally {
    cam.position.x = px; cam.position.y = py; cam.position.z = pz;
    cam.rotation.x = rx; cam.rotation.z = rz;
    cam.updateMatrixWorld(true);
  }
}

// ---------------------------------------------------------------------------
// Drawing the leg, in the same rig, raster and light as the weapons.

const L_THIGH = 0.27, L_SHIN = 0.3;

/** Heavy canvas: a faint twill so the big dark trouser shapes are not flat slabs. */
const twill = (x: number, y: number, z: number): number =>
  ((Math.floor((x + z) * 90) + Math.floor((y - z) * 90)) & 3) === 0 ? -0.6 : 0;

/** The boot is drawn this much larger than life: at the distance the kick lands it has to read at 320x200. */
const BK = 1.3;
/** Laces up the instep and a polished toe cap, in the boot's own space (z toward the toe, y up from the sole), before BK. */
const bootTex = (x: number, y: number, z: number): number => {
  x /= BK; y /= BK; z /= BK;
  if (z > 0.135) return 0.9;                                               // toe cap, polished
  if (y > 0.022 && z > -0.03 && z < 0.11 && Math.abs(x) < 0.024) {        // the lacing: three crossings
    const u = ((z + 0.03) % 0.047) / 0.047;
    return Math.abs(Math.abs(x) / 0.024 - Math.abs(u - 0.5) * 2) < 0.28 ? 1.6 : -1.1;
  }
  return 0;
};
/** A welt stitch along the sole's top edge, and hobnails. */
const soleTex = (x: number, y: number, z: number): number => {
  x /= BK; y /= BK; z /= BK;
  if (y > -0.053) return 1.2;
  return Math.abs(Math.abs(x) - 0.038) < 0.006 && Math.floor(z / 0.03) % 2 === 0 ? 2.5 : 0;
};
const k = (n: number): number => n * BK;

/**
 * The boot, ankle at the origin: z toward the toe, y up the shin, x across.
 * A leather upper and toe cap in side profile, a shaft round the ankle, a
 * welted sole, a stacked heel shod with an iron plate.
 */
function boot(b: Builder): void {
  // the upper, heel counter to the ball of the foot, the instep sloping down
  b.ext([[-0.058, -0.05], [-0.063, 0.02], [-0.045, 0.052], [0.02, 0.05], [0.1, 0.03], [0.13, 0.024], [0.13, -0.05]]
    .map(([z, y]) => [k(z), k(y)] as [number, number]), k(-0.05), k(0.05), MAT.BOOT, { tex: bootTex });
  // the toe box: a rounded section narrowing to the tip
  const toe: Array<[number, number]> = [[-0.05, -0.05], [0.05, -0.05], [0.05, 0.004], [0.036, 0.022], [-0.036, 0.022], [-0.05, 0.004]];
  b.push(); b.translate(0, 0, k(0.128));
  b.prz(toe.map(([x, y]) => [k(x), k(y)] as [number, number]), 0, k(0.088), MAT.BOOT, { r1: 0.72, tex: (x, y, z) => bootTex(x, y, z + k(0.128)) });
  b.pop();
  // the shaft round the ankle, running up into the trouser
  b.push(); b.pitch(-Math.PI / 2); b.cyl(0, k(-0.008), k(-0.03), k(0.11), k(0.058), k(0.062), 8, MAT.BOOT); b.pop();
  // welted sole, wider and longer than the upper, springing up a little at the toe
  const sole: Array<[number, number]> = [[-0.057, -0.07], [0.057, -0.07], [0.057, -0.048], [-0.057, -0.048]];
  b.prz(sole.map(([x, y]) => [k(x), k(y)] as [number, number]), k(-0.068), k(0.226), MAT.BLACK, { r1: 0.8, tex: soleTex });
  // stacked heel and its iron plate
  b.box(k(-0.052), k(-0.1), k(-0.068), k(0.052), k(-0.07), k(0.016), MAT.BOOT);
  b.box(k(-0.052), k(-0.108), k(-0.068), k(0.052), k(-0.1), k(0.016), MAT.IRON);
}

/**
 * Draws the kicking leg into `b`, which must project from the true eye (the
 * crosshair), not the weapons' shifted lens: the kick is aimed at the
 * centre of the screen. Records a "foot" anchor at the middle of the sole.
 */
export function drawLeg(b: Builder, lp: LegPose): void {
  b.push();
  b.translate(lp.hx, lp.hy, lp.hz);
  b.yaw(lp.yaw);
  b.pitch(lp.thigh);
  b.roll(lp.twist);
  b.cyl(0, 0, -0.25, L_THIGH, 0.1, 0.074, 8, MAT.TROUSER, { tex: twill });          // thigh
  b.translate(0, 0, L_THIGH);
  b.ball(0, 0, 0, 0.072, MAT.TROUSER, 8);                                            // knee
  b.pitch(-lp.knee);
  b.cyl(0, 0, 0, L_SHIN - 0.07, 0.07, 0.06, 8, MAT.TROUSER, { tex: twill });         // shin
  b.cyl(0, 0, L_SHIN - 0.1, L_SHIN - 0.065, 0.068, 0.066, 8, MAT.TROUSER);           // the trouser's hem over the boot
  b.translate(0, 0, L_SHIN);
  // the foot, square to the shin: its toe along the shin's "up", its sole facing down the shin;
  // then turned about its own length so the outside of the boot — sole, heel — shows to the eye
  b.pitch(Math.PI / 2 + lp.ankle);
  b.roll(lp.turn);
  boot(b);
  b.anchor("foot", 0, k(-0.06), k(0.08));
  b.pop();
}
