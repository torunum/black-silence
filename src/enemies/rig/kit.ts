import type { Builder, V3 } from "../../render/viewmodel/builder";
import type { Palette } from "../../render/viewmodel/palette";

/**
 * THE ENEMY RIG KIT (`docs/superpowers/plans/2026-10-13-enemies.md`, Task 1).
 *
 * A monster is a **skeleton of joints** with **parts** hung on them, posed by
 * a function and rasterized at boot by the weapons' own renderer
 * (`src/render/viewmodel/{builder,raster}.ts`: hard tones, outline, rim
 * light), so the enemies and the guns they face are drawn by one hand. The
 * game keeps its billboards; what the rig changes is how many frames there
 * are and that the parts are real:
 *
 * - a `Joint` is a point on a parent (`at`, in the parent's frame) that a
 *   pose can turn; the tree is the monster's anatomy (pelvis, spine, chest,
 *   neck, head, jaw, shoulders, elbows, wrists, hips, knees, ankles);
 * - a `RigPart` is some primitives (boxes, prisms, balls) drawn in a joint's
 *   frame, and belongs to a `PartGroup`: the body, the head, an arm, the legs;
 * - a `Stump` is what is drawn at a joint when its group has been torn off:
 *   bone and meat at the real joint, not a rectangle of blanked pixels;
 * - a `RigPose` is every joint's rotation plus the pelvis's offset, and a few
 *   named scalars (a jaw, a sway of the entrails) the parts read.
 *
 * Frame space (x right as the player sees it, y up, z away from the player):
 * the monster faces -z, toward the viewer. A joint's rotation is
 * `[pitch, yaw, roll]` as `Builder` defines them, applied yaw, pitch, roll.
 * For a thing that points UP the joint (a spine, a neck) positive pitch leans
 * it toward the viewer; for a limb that hangs DOWN it swings it backward, so
 * `swing()` flips the sign and a positive swing is forward.
 *
 * Nothing here draws from `Math.random` (the weapons' rule, `docs/known-issues.md`
 * KNOWN-22): the same pose always bakes the same pixels.
 */

export type Rot = readonly [number, number, number];

/** One joint of the skeleton. The first joint listed has no parent and is the pose's `root` (the pelvis). */
export interface Joint { name: string; parent: string | null; at: V3 }

/** Which piece of the monster a part belongs to; a dismemberment mask removes whole groups. */
export type PartGroup = "body" | "head" | "lArm" | "rArm" | "legs";

/** Bits of a dismember mask. `lArm`/`rArm` are the arms as the *screen* sees them (the same sides `Hitscan` reports). */
export const HEAD = 1, L_ARM = 2, R_ARM = 4, LEGS = 8;
export const GROUP_BIT: Record<PartGroup, number> = { body: 0, head: HEAD, lArm: L_ARM, rArm: R_ARM, legs: LEGS };

/** What a part's `draw` is given: the builder (already in its joint's frame) and the pose's named scalars. */
export interface Ctx { b: Builder; x(name: string): number }

export interface RigPart { joint: string; group: PartGroup; draw(c: Ctx): void }
/** What a torn-off group leaves at `joint`: drawn in that joint's frame whenever `group` is masked out. */
export interface Stump { joint: string; group: PartGroup; draw(c: Ctx): void }
/** The torn end of a part that flies off whole: drawn in `joint`'s frame when only that part is baked. */
export interface PartCap { joint: string; draw(c: Ctx): void }

export interface RigPose {
  /** The pelvis's offset from where the skeleton rests, rig metres. */
  root: V3;
  /** Joint name -> rotation. A joint not named keeps its rest rotation (none). */
  rot: Record<string, Rot>;
  /** Named scalars the parts read (`jaw`, `gut`, `claw`...). */
  x?: Record<string, number>;
  /** Where the floor is in the frame, as a fraction of the frame's height from its top (default `Frame.floor`). A dying body's sprite sinks as it falls (`enemyTick`), so each death frame is drawn with the floor that much higher. */
  floor?: number;
}

/** How the monster is framed: the raster's size, its scale and the view. */
export interface Frame {
  /** Raster pixels. */
  w: number; h: number;
  /** Rig metres the frame's height covers. */
  worldH: number;
  /** Where the feet are, as a fraction of the height from the top. */
  floor: number;
  /** The view the billboard is drawn from: the monster turned `yaw` about the vertical, looked down on at `pitch`. */
  yaw: number; pitch: number;
  /** Rig metres the figure is moved to the right in the frame: a monster turned in its view stands left of its own middle. */
  shift: number;
}

export type Role = "walk" | "idle" | "atk" | "pain" | "die" | "crawl" | "crawlIdle" | "crawlAtk" | "crawlPain" | "crawlDie";

/**
 * A monster's whole animation: for each role the poses its frames are baked
 * from. A legless monster uses the `crawl*` poses, which the rig authors
 * as a body that is not standing.
 */
export interface RigPoses {
  walk: RigPose[]; idle: RigPose; atk: RigPose[]; pain: RigPose[]; die: RigPose[];
  crawl: RigPose[]; crawlIdle: RigPose; crawlAtk: RigPose[]; crawlPain: RigPose[]; crawlDie: RigPose[];
}

/** A severed part that flies off whole: baked with only its group drawn and its torn end capped, then cropped to what it covers. */
export interface PartSpec {
  group: PartGroup;
  /** The pose the part is baked in (its group's joints are posed here, the rest is ignored). */
  pose: RigPose;
  /** The torn end's joint and drawing. */
  cap: PartCap;
}

export interface Rig {
  key: string;
  palette: Palette;
  frame: Frame;
  /** Fraction of the standing height a legless monster's frame covers (what `crawlFactor` already makes its hitbox). */
  crawlH: number;
  joints: readonly Joint[];
  parts: readonly RigPart[];
  stumps: readonly Stump[];
  poses: RigPoses;
  /** Seconds a walk pose is held. */
  walkStep: number;
  /** The rig's head and arms in the legacy `regions` the gore code reads (rows of a nominal grid `W` x `H`). */
  regions: { W: number; H: number; head: number; armTop: number; armBot: number };
  partSpecs: { head: PartSpec; lArm: PartSpec; rArm: PartSpec; legs: PartSpec };
}

/** A pose from its parts: the rig author's constructor. */
export function pose(root: V3, rot: Record<string, Rot>, x: Record<string, number> = {}, floor?: number): RigPose {
  return { root, rot, x, floor };
}
/** The rotation of a limb that hangs down and swings `a` radians FORWARD (negative pitch, see above), with a sideways `out` and a twist. */
export function swing(a: number, out = 0, twist = 0): Rot { return [-a, twist, out]; }

/** A pose halfway between two: every joint's rotation, the root and the scalars blend. */
export function lerpPose(a: RigPose, b: RigPose, t: number): RigPose {
  const rot: Record<string, Rot> = {};
  const z: Rot = [0, 0, 0];
  for (const k of new Set([...Object.keys(a.rot), ...Object.keys(b.rot)])) {
    const p = a.rot[k] ?? z, q = b.rot[k] ?? z;
    rot[k] = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  }
  const x: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a.x ?? {}), ...Object.keys(b.x ?? {})])) x[k] = (a.x?.[k] ?? 0) + ((b.x?.[k] ?? 0) - (a.x?.[k] ?? 0)) * t;
  const fa = a.floor, fb = b.floor;
  return {
    root: [a.root[0] + (b.root[0] - a.root[0]) * t, a.root[1] + (b.root[1] - a.root[1]) * t, a.root[2] + (b.root[2] - a.root[2]) * t],
    rot, x, floor: fa !== undefined && fb !== undefined ? fa + (fb - fa) * t : fa ?? fb,
  };
}

/** The skeleton as a tree, compiled once. */
export interface Compiled {
  kids: Map<string, Joint[]>;
  parts: Map<string, RigPart[]>;
  stumps: Map<string, Stump[]>;
  root: Joint;
}
const compiled = new WeakMap<Rig, Compiled>();
export function compile(rig: Rig): Compiled {
  let c = compiled.get(rig);
  if (c) return c;
  const kids = new Map<string, Joint[]>(), parts = new Map<string, RigPart[]>(), stumps = new Map<string, Stump[]>();
  for (const j of rig.joints) { kids.set(j.name, []); parts.set(j.name, []); stumps.set(j.name, []); }
  for (const j of rig.joints) if (j.parent) kids.get(j.parent)!.push(j);
  for (const p of rig.parts) parts.get(p.joint)!.push(p);
  for (const s of rig.stumps) stumps.get(s.joint)!.push(s);
  c = { kids, parts, stumps, root: rig.joints[0] };
  compiled.set(rig, c);
  return c;
}

/** What to draw of the skeleton: everything but the `mask` groups (the default), or only `only`'s parts. */
export interface DrawOpts { mask: number; only?: PartGroup; cap?: PartCap }

/**
 * Draws the posed skeleton into `b` (already placed: the floor-centre at the origin of the builder's current frame, y up).
 * Parts of masked groups are skipped and their stumps drawn at their joints; with `only`, just that group's parts are drawn
 * and, at the end, the `cap` at its joint.
 */
export function drawFigure(b: Builder, rig: Rig, p: RigPose, o: DrawOpts): void {
  const c = compile(rig), zero: Rot = [0, 0, 0];
  const ctx: Ctx = { b, x: (n: string): number => p.x?.[n] ?? 0 };
  const visit = (j: Joint): void => {
    b.push();
    if (j === c.root) b.translate(j.at[0] + p.root[0], j.at[1] + p.root[1], j.at[2] + p.root[2]);
    else b.translate(j.at[0], j.at[1], j.at[2]);
    const r = p.rot[j.name] ?? zero;
    if (r[1]) b.yaw(r[1]);
    if (r[0]) b.pitch(r[0]);
    if (r[2]) b.roll(r[2]);
    for (const part of c.parts.get(j.name)!) {
      if (o.only ? part.group === o.only : !(o.mask & GROUP_BIT[part.group])) part.draw(ctx);
    }
    if (!o.only) for (const s of c.stumps.get(j.name)!) if (o.mask & GROUP_BIT[s.group]) s.draw(ctx);
    if (o.cap && o.cap.joint === j.name) o.cap.draw(ctx);
    for (const k of c.kids.get(j.name)!) visit(k);
    b.pop();
  };
  visit(c.root);
}
