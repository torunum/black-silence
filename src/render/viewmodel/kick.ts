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
/** How sharply the strike accelerates into the lock-out: 1 would be a steady drive, the larger the later the leg arrives. */
export const STRIKE_POWER = 2;
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
  // (impact plan, Task 2: it was u * (.55 + .45u), most of the travel in the first half; now u^2, over half of it in the last 20 ms: a snap)
  if (t < KICK_HIT_T - 1e-9) { const u = span(t, KICK_CHAMBER, KICK_HIT_T); return Math.pow(u, STRIKE_POWER); }
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

/**
 * The wind-up's coil (impact plan, Task 2): over the chamber the knee comes up higher and the leg folds
 * tighter, the toe cocked up, held until the strike lets go of it — the strike then has further to travel
 * and the snap more in it. Zero from the hit on (and so the recovery is as it was).
 */
const COIL = { thigh: 0.5, knee: 0.35, ankle: 0.25, hz: -0.03 };
function coil(t: number): number {
  if (t < KICK_CHAMBER) return smooth(t / KICK_CHAMBER);
  return t < KICK_HIT_T ? 1 : 0;
}
/** The foot's rebound off what it hit: pushed back a centimetre or so, twice, and settling, while it is planted (never nearer than the hit). */
function recoil(t: number): number {
  if (t < KICK_HIT_T || t > KICK_HOLD) return 0;
  const u = t - KICK_HIT_T;
  return 0.016 * Math.exp(-u * 32) * Math.abs(Math.sin(u * 64));
}

/**
 * The running drop kick's legs (owner, 2026-10-22: "koşarak tekme atınca drop kick atsın"): both of them, thrown up and out straight
 * from the hips, boots together, soles to the target, higher and further than the standing kick's one leg. The right is the leading leg;
 * the left comes a hand's breadth behind and to the side of it.
 */
const DROP_STRUCK = { thigh: 0.3, knee: 0.0, ankle: 0.25, hz: 0.12 };

/** The leg for elapsed time `t` (seconds since the kick), or null when no kick is running. `drop`: the drop kick's legs, `left` its left one. */
export function legPose(t: number, drop = false, left = false): LegPose | null {
  if (t < 0 || t >= KICK_ANIM) return null;
  const r = raised(t), e = extension(t), c = coil(t);
  if (drop) {
    const S = DROP_STRUCK, el = left ? Math.max(0, e - 0.08) : e, s = left ? -1 : 1;
    const k = (key: "thigh" | "knee" | "ankle" | "hz"): number => lerp(lerp(HANG[key], CHAMBER[key], r) + COIL[key] * c * 0.6, S[key], el);
    return { hx: left ? -0.12 : 0.1, hy: -0.4, hz: k("hz"), yaw: s * (-0.12 - 0.04 * el), thigh: k("thigh") - (left ? 0.06 : 0), knee: k("knee"), ankle: k("ankle"),
      twist: s * (0.1 - 0.1 * el), turn: s * (-0.1 - 0.25 * el) };
  }
  const k = (key: "thigh" | "knee" | "ankle" | "hz"): number => lerp(lerp(HANG[key], CHAMBER[key], r) + COIL[key] * c, STRUCK[key], e);
  return { hx: 0.075, hy: -0.33, hz: k("hz") - recoil(t), yaw: -0.2 - 0.06 * e, thigh: k("thigh"), knee: k("knee"), ankle: k("ankle"), twist: 0.3 - 0.1 * e, turn: -0.3 - 0.8 * e };   // turned further as it strikes: the sole and the heel's iron to the eye
}

/** The weapon swung out of the way: 0 at the aim, 1 fully aside. Out during the wind-up, back over the recovery. */
export function aside(t: number): number {
  if (t < 0 || t >= KICK_ANIM) return 0;
  if (t < 0.07) return smooth(t / 0.07);
  if (t < 0.2) return 1;
  return 1 - smooth(span(t, 0.2, KICK_ANIM));
}
/** The weapon's rig offsets at full `aside`: down and out to the right, rolled onto its side, muzzle dropped. */
export const ASIDE = { x: 0, y: -0.06, pitch: -0.22, yaw: 0, roll: 0 };   // straight down out of the leg's way, never twisted (owner, 2026-10-20)

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
export const LEAN_STAND = { pitch: -0.11, roll: -0.05, drop: 0.06, fwd: 0.16 };
/** The drop kick's: the body thrown back behind the boots (the head goes up, not down), canted hard, and carried far on. */
export const LEAN = LEAN_STAND;
export const DROP_LEAN = { pitch: 0.09, roll: -0.13, drop: -0.08, fwd: 0.34 };   // (impact plan, Task 2: was -.05, -.03, .03, .07; owner, 2026-10-21: -.08, -.04, .05, .11 — the body behind the boot)

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
export function withKickLean(cam: LeanCamera, kickAnim: number, render: () => void, drop = false): void {
  const k = leanAmount(kickElapsed(kickAnim)), LEAN = drop ? DROP_LEAN : LEAN_STAND;
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

/**
 * The kick the player is shown: kickAnim, or 0 for a kick that must not be
 * seen. src/core/Loop.ts passes this, not kickAnim, to the leg, the streaks
 * and the lean.
 *
 * kickAnim only counts down in the gameplay tick, which stops on death and
 * on winning. A kick in progress at that moment would freeze: the world
 * would stay leaned behind the death or level-end screen, and the rest of
 * the kick would play on arrival in the next level. So a kick is hidden from
 * the first frame the player is dead or has won, or a new level has loaded
 * (`level` is anything that changes identity on a load, e.g. the scene),
 * and stays hidden until kickAnim reaches 0. A new kick cannot start before
 * then: doKick needs the cooldown (KICK_CD, 1 s) gone, and that counts down
 * alongside kickAnim's .32 s.
 *
 * Presentation only: kickAnim itself is never written, and gameplay
 * (src/enemies/Death.ts's kick knockback) still reads the real one.
 */
export class KickShown {
  private hidden = false;
  private level: unknown = null;

  shown(kickAnim: number, over: boolean, level: unknown): number {
    if (kickAnim > 0 && (over || (this.level !== null && level !== this.level))) this.hidden = true;
    this.level = level;
    if (!(kickAnim > 0)) { this.hidden = false; return 0; }
    return this.hidden ? 0 : kickAnim;
  }
}

// ---------------------------------------------------------------------------
// Drawing the leg, in the same rig, raster and light as the weapons.

const L_THIGH = 0.27, L_SHIN = 0.3;


/** The boot is drawn this much larger than life: at the distance the kick lands it has to read at 320x200 (owner, 2026-10-21: "gerçekten sağlam bir tekme" — it was 1.3, a boot you could miss). */
const BK = 1.75;
const k = (n: number): number => n * BK;
/** Leather: creases where the boot flexes over the instep and the ankle, and a polished toe. In the boot's frame, before BK. */
const leatherTex = (x: number, y: number, z: number): number => {
  x /= BK; y /= BK; z /= BK;
  if (Math.abs(z - 0.112) < 0.0035) return -2;                                   // the toe cap's seam
  if (z > 0.115) return 0.9;                                                     // the toe cap, polished
  if (y > -0.012 && z > -0.012 && z < 0.1) {                                     // the instep: the tongue, laced over
    const u = ((z + 0.012) % 0.028) / 0.028;
    if (Math.abs(x) < 0.022 && Math.abs(Math.abs(x) / 0.022 - Math.abs(u - 0.5) * 2) < 0.2) return 1.8;   // the lace, crossing
    if (Math.abs(Math.abs(x) - 0.026) < 0.004 && u < 0.35) return 2.2;                                       // an eyelet
    if (Math.abs(x) < 0.024) return -1.2;                                                                     // the tongue, in shadow
  }
  if (z > 0.02 && z < 0.1 && Math.abs(Math.sin(z * 260 + x * 40)) < 0.12) return -1.1;   // creases across the instep
  return 0;
};
/** The laces up the front of the shaft: three crossings, the eyelets either side. */
const laceTex = (x: number, y: number, z: number): number => {
  x /= BK; y /= BK; z /= BK;
  if (z < 0.03) return 0;
  const u = ((y + 0.03) % 0.034) / 0.034;
  if (Math.abs(Math.abs(x) / 0.026 - Math.abs(u - 0.5) * 2) < 0.22 && Math.abs(x) < 0.026) return 1.7;   // the lace
  return Math.abs(Math.abs(x) - 0.03) < 0.005 && u < 0.3 ? 2.2 : 0;                                       // an eyelet
};
/** The sole's edge: the welt's stitching along its top, hobnails underneath. */
const soleTex = (x: number, y: number, z: number): number => {
  x /= BK; y /= BK; z /= BK;
  if (y > -0.069) return (Math.floor(z * 160) & 1) ? 1.4 : 0.4;
  return Math.abs(Math.abs(x) - 0.036) < 0.007 && Math.floor(z / 0.028) % 2 === 0 ? 2.5 : 0;
};
/** Heavy canvas trousers: the weave and the folds that run round a bent leg. */
const foldTex = (x: number, y: number, z: number): number =>
  (((Math.floor((x + z) * 90) + Math.floor((y - z) * 90)) & 3) === 0 ? -0.6 : 0) + (Math.sin(z * 34 + Math.atan2(y, x) * 2) > 0.86 ? -1.2 : 0);

/**
 * The boot, ankle at the origin: z toward the toe, y up the shin, x across. Remodelled (owner, 2026-10-22: "bacaklar da öyle olsun"):
 * a rounded heel, instep and toe box (`Builder.ell`), lit round; a laced shaft up over the trouser with two iron-buckled straps; a welted
 * sole with its stitching and hobnails, springing up at the toe; a stacked heel shod with iron.
 */
function boot(b: Builder): void {
  // the shaft up the shin, laced up its front, the trouser tucked into it; its two straps. One surface with the foot below it.
  const up = b.part();
  b.push(); b.pitch(-Math.PI / 2);
  b.cyl(0, 0, k(-0.03), k(0.12), k(0.054), k(0.062), 12, MAT.BOOT, { tex: (x, y, z) => laceTex(x, -z, -y), part: up });
  for (const [z0, z1] of [[0.045, 0.062], [0.088, 0.104]] as const) {
    b.cyl(0, 0, k(z0), k(z1), k(0.064), k(0.065), 12, MAT.BLACK);
    b.cbox(k(0.05), k(-0.011), k(z0 - 0.002), k(0.07), k(0.011), k(z1 + 0.002), k(0.003), MAT.IRON);
  }
  b.pop();
  // the foot: one long rounded last from heel to toe, the heel and the toe box swelling out of it — a single leather surface
  b.ell(0, k(-0.036), k(0.06), k(0.05), k(0.042), k(0.135), MAT.BOOT, 12, { tex: leatherTex, part: up });
  b.ell(0, k(-0.04), k(-0.026), k(0.05), k(0.044), k(0.044), MAT.BOOT, 10, { tex: leatherTex, part: up });
  b.ell(0, k(-0.046), k(0.15), k(0.049), k(0.03), k(0.06), MAT.BOOT, 10, { tex: leatherTex, part: up });
  // the welted sole, wider and longer than the upper, and its spring at the toe
  b.cbox(k(-0.058), k(-0.082), k(-0.068), k(0.058), k(-0.064), k(0.16), k(0.008), MAT.BLACK, { tex: soleTex });
  b.push(); b.translate(0, k(-0.073), k(0.16)); b.pitch(0.3);
  b.cbox(k(-0.052), k(-0.009), 0, k(0.052), k(0.009), k(0.055), k(0.008), MAT.BLACK, { tex: soleTex });
  b.pop();
  // the stacked heel and its iron plate
  b.cbox(k(-0.052), k(-0.11), k(-0.07), k(0.052), k(-0.078), k(0.012), k(0.006), MAT.BOOT);
  b.box(k(-0.05), k(-0.117), k(-0.068), k(0.05), k(-0.108), k(0.01), MAT.IRON);
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
  b.cyl(0, 0, -0.25, L_THIGH, 0.118, 0.087, 12, MAT.TROUSER, { tex: foldTex });     // thigh
  b.translate(0, 0, L_THIGH);
  b.ell(0, 0.006, 0, 0.088, 0.09, 0.084, MAT.TROUSER, 10, { tex: foldTex });          // knee
  b.pitch(-lp.knee);
  b.cyl(0, 0, 0, L_SHIN - 0.07, 0.081, 0.069, 12, MAT.TROUSER, { tex: foldTex });     // shin
  b.cyl(0, 0, L_SHIN - 0.1, L_SHIN - 0.05, 0.077, 0.074, 12, MAT.TROUSER, { tex: foldTex });   // bunched where it goes into the boot
  b.translate(0, 0, L_SHIN);
  // the foot, square to the shin: its toe along the shin's "up", its sole facing down the shin;
  // then turned about its own length so the outside of the boot — sole, heel — shows to the eye
  b.pitch(Math.PI / 2 + lp.ankle);
  b.roll(lp.turn);
  boot(b);
  b.anchor("foot", 0, k(-0.06), k(0.08));
  b.pop();
}
