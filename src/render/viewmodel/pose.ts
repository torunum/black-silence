import type { Builder } from "./builder";

/**
 * The viewmodel's pose: everything the eight weapon draw functions need to
 * put the gun, its moving parts and the hands where they belong this frame.
 * ./animate.ts builds one per frame from the weapon runtime (wstate, wtime,
 * kickAmt, ...), which it only ever reads; ./rig.ts turns it into pixels.
 *
 * Two layers, on purpose:
 * - **3D rig terms** (`x,y,z,pitch,yaw,roll`) move the whole weapon and
 *   hands in camera space, before rasterizing. Large motions belong here —
 *   the equip/unequip swing today; the sprint cant, landing dip, kick
 *   swinging the weapon aside, fidget and switch arcs of Tasks 2-4 add to
 *   these same six numbers.
 * - **Screen terms** (`sx,sy`) move the finished low-res image, in overlay
 *   units. Small continuous motions (walk bob, mouse sway, breathing) go
 *   here: re-rasterizing a model that moves by a fraction of a pixel every
 *   frame makes its edges crawl, translating a finished image does not.
 *
 * The mechanism terms (`recoil`, `action`, `spin`, `reload`, `heat`) are
 * what each weapon's own draw function reads to move its own parts — a
 * slide, a pump, a bolt, a barrel cluster, a break-open — which is the
 * whole reason the weapons are drawn per frame rather than baked: a baked
 * frame cannot be half-way through a pump stroke.
 */
export interface Pose {
  /** Rig offset, metres, camera space (x right, y up, z forward). */
  x: number; y: number; z: number;
  /** Rig rotation, radians: pitch lifts the muzzle, yaw swings it right, roll turns the top right. */
  pitch: number; yaw: number; roll: number;
  /** Image offset, overlay units. */
  sx: number; sy: number;
  /** 0..1 — the kick of the last shot, decaying. */
  recoil: number;
  /** 0..1 — the weapon's own firing mechanism (slide, pump, bolt, hammer, cross launch). */
  action: number;
  /** Radians — rotating parts (barrel cluster, reaper ring), integrated over time. */
  spin: number;
  /** -1 when not reloading, else 0..1 through the reload. */
  reload: number;
  /** 0..1 — muzzle / core heat (glow). */
  heat: number;
}

export function restPose(): Pose {
  return { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0, sx: 0, sy: 0, recoil: 0, action: 0, spin: 0, reload: -1, heat: 0 };
}

/** Where a weapon rests: its origin (the top of the right hand's grip) in camera space, and its aim. */
export interface Hold { x: number; y: number; z: number; pitch: number; yaw: number; roll: number; }

export interface WeaponArt {
  /** Must equal WEAPON_STATS[slot].name — pinned by tests. */
  name: string;
  hold: Hold;
  /** A full-strength kick: metres straight back and radians of muzzle lift, about the grip. */
  kick: { back: number; lift: number };
  /** Fire motion: progress through the fire state (0..1) -> mechanism travel (0..1). */
  action(p: number): number;
  /** Radians per second the rotating part turns while firing (0 = nothing spins). */
  spinRate?: number;
  /** Radians per second it turns at rest (the reaper's rune ring idles round). */
  idleSpin?: number;
  /** Draws weapon, hands and sleeves in weapon space. Must call b.anchor("muzzle", ...) at the barrel tip. */
  draw(b: Builder, pose: Pose): void;
}

/** Smooth 0..1 ramp of t between a and b. */
export function ramp(t: number, a: number, b: number): number {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}
/** 0 -> 1 -> 0 over [a,b] with a flat top from a+e to b-e. */
export function hump(t: number, a: number, b: number, e: number): number {
  return Math.min(ramp(t, a, a + e), 1 - ramp(t, b - e, b));
}
