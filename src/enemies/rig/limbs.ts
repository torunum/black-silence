import type { TexFn } from "../../render/viewmodel/raster";
import type { Ctx, PartCap, PartGroup, PartSpec, RigPart, RigPose, Stump } from "./kit";
import type { Dims } from "./humanoid";
import { E } from "./palette";
import { limb, meatTex } from "./shapes";
import { makeStd } from "./humanoid";

/**
 * The parts every two-legged monster hangs on the shared skeleton
 * (`./humanoid.ts`): an arm (upper arm, elbow and forearm, hand), a leg
 * (thigh, knee and shin, foot), and what each leaves behind when it is torn
 * off (a stump of meat, bone and sinew at the real joint) and what flies
 * when it is (a cap on the torn end). A monster supplies each limb's
 * radii, skin and decorations; the geometry and the dismemberment come from
 * here, so five monsters do not carry five copies of a stump.
 */

export interface Seg {
  /** Radius at the top and at the bottom of the segment, rig metres. */
  r0: number; r1: number;
  mat: number; tex?: TexFn; sides?: number;
  /** Drawn in the segment's frame after it: a wound, a plate, a rag. The segment runs from y=0 down to `-len`. */
  deco?(c: Ctx, len: number): void;
}

export interface ArmSpec { upper: Seg; fore: Seg; joint: number; hand(c: Ctx, side: -1 | 1): void }
export interface LegSpec { upper: Seg; lower: Seg; joint: number; foot(c: Ctx, side: -1 | 1): void }

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });

function seg(c: Ctx, len: number, s: Seg): void {
  limb(c.b, 0, 0, 0, -len, s.r0, s.r1, s.mat, s.sides ?? 7, s.tex ? { tex: s.tex } : undefined);
  s.deco?.(c, len);
}

/** One arm: the upper arm at the shoulder, the forearm at the elbow, the hand at the wrist. */
export function armParts(d: Dims, group: "lArm" | "rArm", a: ArmSpec): RigPart[] {
  const s = group === "lArm" ? -1 : 1, side = group === "lArm" ? "L" : "R";
  return [
    part("shoulder" + side, group, (c) => seg(c, d.upperArm, a.upper)),
    part("elbow" + side, group, (c) => { c.b.ball(0, 0, 0, a.joint, a.upper.mat, 6); seg(c, d.foreArm, a.fore); }),
    part("wrist" + side, group, (c) => a.hand(c, s)),
  ];
}

/** One leg: the thigh at the hip, the shin at the knee, the foot at the ankle. */
export function legParts(d: Dims, side: "L" | "R", l: LegSpec): RigPart[] {
  const s = side === "L" ? -1 : 1;
  return [
    part("hip" + side, "legs", (c) => seg(c, d.thigh, l.upper)),
    part("knee" + side, "legs", (c) => { c.b.ball(0, 0, 0, l.joint, l.upper.mat, 6); seg(c, d.shin, l.lower); }),
    part("ankle" + side, "legs", (c) => l.foot(c, s)),
  ];
}

/** What each torn-off group leaves at its joint, scaled to the body: `neck` / `arm` / `leg` are the radii of the torn flesh. */
export interface StumpSpec { neck: number; arm: number; leg: number; mat?: number }

export function humanStumps(o: StumpSpec): Stump[] {
  const m = o.mat ?? E.MEAT;
  return [
    { joint: "neck", group: "head", draw: (c) => {
      limb(c.b, 0, 0, 0.05, 0.12, o.neck, o.neck * 0.82, m, 7, { tex: meatTex });
      limb(c.b, 0, 0.0, 0.07, 0.19, 0.017, 0.013, E.BONE, 5);
      c.b.box(-0.045, 0.1, -0.06, -0.015, 0.15, -0.03, E.SINEW); c.b.box(0.015, 0.1, 0.02, 0.045, 0.14, 0.05, E.ORGAN); c.b.box(0.02, 0.1, -0.06, 0.05, 0.13, -0.035, m);
    } },
    ...(["L", "R"] as const).map((s): Stump => ({ joint: "shoulder" + s, group: s === "L" ? "lArm" : "rArm", draw: (c) => {
      limb(c.b, 0, 0, 0.01, -0.11, o.arm, o.arm * 0.8, m, 7, { tex: meatTex });
      limb(c.b, 0.005, 0, -0.02, -0.19, 0.017, 0.013, E.BONE, 5);
      c.b.box(-0.04, -0.15, -0.06, -0.012, -0.1, -0.03, E.SINEW); c.b.box(0.02, -0.14, -0.05, 0.05, -0.1, -0.02, m);
    } })),
    ...(["L", "R"] as const).map((s): Stump => ({ joint: "hip" + s, group: "legs", draw: (c) => {
      limb(c.b, 0, 0, 0, -0.12, o.leg, o.leg * 0.86, m, 7, { tex: meatTex });
      limb(c.b, 0, 0, -0.03, -0.2, 0.02, 0.015, E.BONE, 5);
      c.b.box(0.02, -0.16, -0.05, 0.05, -0.1, -0.02, E.SINEW); c.b.box(-0.05, -0.15, -0.05, -0.02, -0.1, -0.02, m);
    } })),
  ];
}

const cap = (joint: string, draw: (c: Ctx) => void): PartCap => ({ joint, draw });

/** The severed parts: baked upright (the legs lying on their side), each with its torn end capped. `neck`/`arm`/`leg` are the torn flesh's radii. */
export function humanPartSpecs(d: Dims, o: StumpSpec): { head: PartSpec; lArm: PartSpec; rArm: PartSpec; legs: PartSpec } {
  const std = makeStd(d), m = o.mat ?? E.MEAT;
  const poses: Record<"head" | "arm" | "legs", RigPose> = {
    head: std({ head: [0.05, 0, 0], jaw: 0.35, ground: false }),
    arm: std({ aL: { f: 0, out: 0.1, e: 0.35, w: 0.1 }, aR: { f: 0, out: 0.1, e: 0.35, w: 0.1 }, ground: false }),
    legs: std({ pelvis: [0, 0, Math.PI / 2], lL: { f: 0, k: 0.1 }, lR: { f: 0, k: 0.1 }, ground: false }),
  };
  const armCap = (j: string): PartCap => cap(j, (c) => { limb(c.b, 0, 0, -0.01, 0.04, o.arm, o.arm * 0.88, m, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, 0.11, 0.014, 0.011, E.BONE, 5); });
  return {
    head: { group: "head", pose: poses.head, cap: cap("neck", (c) => {
      limb(c.b, 0, 0, -0.01, 0.06, o.neck, o.neck * 0.88, m, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, -0.06, 0.014, 0.011, E.BONE, 5);
      limb(c.b, 0.03, 0.01, 0.03, -0.06, 0.008, 0.004, E.SINEW, 4); limb(c.b, -0.025, -0.01, 0.03, -0.05, 0.009, 0.004, E.ORGAN, 4);
    }) },
    lArm: { group: "lArm", pose: poses.arm, cap: armCap("shoulderL") },
    rArm: { group: "rArm", pose: poses.arm, cap: armCap("shoulderR") },
    legs: { group: "legs", pose: poses.legs, cap: cap("pelvis", (c) => {
      for (const x of [-d.hipX, d.hipX]) { limb(c.b, x, 0, -0.04, 0.02, o.leg, o.leg * 0.9, m, 7, { tex: meatTex }); limb(c.b, x, 0, -0.03, 0.09, 0.016, 0.012, E.BONE, 5); }
    }) },
  };
}

