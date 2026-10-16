import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, ellipsoid, limb, meatTex } from "./shapes";
import type { Ctx, PartCap, PartGroup, PartSpec, Rig, RigPart, Stump } from "./kit";
import { CACO_JOINTS, CACO_PART_POSES, CACO_POSES } from "./cacodemonPoses";

/**
 * THE CACODEMON (`C`): a floating orb of meat, one huge eye, a ring of fangs.
 *
 * The legacy sprite is a red-brown orb (`R`, `r` darker where it curves away)
 * with two horns on top (`h`), a green eye (`G`) with a black pupil (`e`) and a
 * white glint (`0`) filling its middle, a row of cream fangs in red gums (`t`,
 * `W`) across the bottom of the orb, and a tapering underbelly. The rig keeps
 * each of those: the orb is an ellipsoid that can be squashed, swollen and
 * burst, the eye looks about and goes red when it spits, and its jaw — a lower
 * lip of fangs — drops on a mouth that holds a ball of plasma before it fires
 * (`maw`, `charge`). Two flippers beat to steer it, a tail swings under it.
 *
 * The three zones a hit can tear: the flippers (its arms) and the underbelly
 * with the jaw and the tail (its legs); the horns are the "head" group, which
 * the game never tears off (a flyer's art has no head row). A cacodemon whose
 * underbelly is gone has the orb's raw underside showing and sits on the floor.
 */

const FLESH = FIRST_OWN, DARK = FIRST_OWN + 1, HORN = FIRST_OWN + 2, IRIS = FIRST_OWN + 3, RAGE = FIRST_OWN + 4, GUM = FIRST_OWN + 5, PLASMA = FIRST_OWN + 6, FANG = FIRST_OWN + 7;

export const CACO_PALETTE = enemyPalette({
  // the legacy R: raw red-brown meat
  [FLESH]:  { ramp: ["#1c0806", "#3a120c", "#5c1c12", "#7e2a1c", "#a03a26", "#c25438", "#e07a58"], amb: .4, spec: .3, rim: true },
  // the legacy r: the dark of it where it turns away
  [DARK]:   { ramp: ["#120504", "#240c08", "#3a140c", "#521e12", "#6e2a1a"], amb: .4, spec: .15 },
  // the legacy h: the horns
  [HORN]:   { ramp: ["#140605", "#2a0e0a", "#441810", "#642414", "#863820", "#a85030"], amb: .35, spec: .35, rim: true },
  // the legacy G: the green of the eye
  [IRIS]:   { ramp: ["#0e2008", "#1c3c10", "#2c5c1a", "#468a2a", "#6cc040", "#a6ee6c"], amb: .9, spec: .4, rim: true },
  // the legacy W: the iris when it spits, a hot red
  [RAGE]:   { ramp: ["#5a0e08", "#8a1a10", "#b8281a", "#e03a26", "#ff5a3e", "#ff9a80"], amb: .9, spec: .4, rim: true },
  // the legacy W: gums
  [GUM]:    { ramp: ["#3a0a08", "#601410", "#8a2018", "#b0302a", "#d04a3c", "#e86c58"], amb: .45, spec: .4, rim: true },
  // plasma, held in the maw
  [PLASMA]: { ramp: ["#2c6a1a", "#48a028", "#74d040", "#a8f070", "#e0ffc0"], emissive: true },
  // the legacy t: cream fangs
  [FANG]:   { ramp: ["#4a3e30", "#7a6a52", "#b0a07e", "#d8c8a4", "#f0dcc0", "#fff4e0"], amb: .45, spec: .3, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const R0 = 0.6, RY0 = 0.58, RZ0 = 0.55;
/** The orb's radii for the pose: squashed flat as `sq` rises (it widens), swollen as `sw` rises. */
const radii = (c: Ctx): [number, number, number] => { const sq = c.x("sq"), sw = 1 + c.x("sw"); return [R0 * sw * (1 + 0.45 * sq), RY0 * sw * (1 - sq), RZ0 * sw * (1 + 0.2 * sq)]; };
/** Welts and pits across the meat. */
const welts: TexFn = (x, y, z) => (blotchTex(1.4, 1.0, -1.1)(x, y, z));
/** A fang standing along y: from the gum at `y0` to its point at `y1`. */
const fang = (b: Builder, x: number, z: number, y0: number, y1: number, r: number): void => limb(b, x, z, y0, y1, r, r * 0.12, FANG, 5);

/** A flipper: a thick root, a membrane that fans out to its tip, with ribs of cartilage along it. `s` is -1 on the left. */
function flipper(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  ellipsoid(b, s * 0.06, 0, 0, 0.14, 0.12, 0.12, FLESH, 7, { tex: welts });
  b.prz([[0, 0.14], [s * 0.2, 0.2], [s * 0.4, 0.12], [s * 0.42, -0.04], [s * 0.3, -0.16], [0, -0.12]], -0.03, 0.03, DARK, { r1: 0.9 });
  for (let i = -1; i <= 1; i++) { b.push(); b.translate(s * 0.05, 0, 0); b.roll(-s * (Math.PI / 2 + i * 0.35)); limb(b, 0, -0.02, 0, 0.4 - Math.abs(i) * 0.04, 0.02, 0.008, E.SINEW, 4); b.pop(); }
}
const tip = (c: Ctx, s: -1 | 1): void => {
  const b = c.b;
  b.prz([[0, 0.12], [s * 0.16, 0.1], [s * 0.26, 0.0], [s * 0.16, -0.12], [0, -0.1]], -0.025, 0.025, DARK, { r1: 0.7 });
  for (let i = -1; i <= 1; i++) { b.push(); b.translate(s * 0.12, i * 0.05, 0); b.roll(-s * (Math.PI / 2 - i * 0.5)); limb(b, 0, -0.01, 0, 0.2, 0.015, 0.002, E.TOOTH, 4); b.pop(); }
};

const parts: RigPart[] = [
  part("core", "body", (c) => {
    const b = c.b, [rx, ry, rz] = radii(c), bu = c.x("burst");
    ellipsoid(b, 0, 0, 0, rx, ry, rz, FLESH, 11, { tex: welts });
    for (const s of [-1, 1]) ellipsoid(b, s * 0.35 * rx / R0, 0.32 * ry / RY0, -0.3 * rz / RZ0, 0.2, 0.12, 0.2, DARK, 6);   // the brow, heavy on both sides of the eye
    ellipsoid(b, 0, 0.5 * ry / RY0, -0.1, 0.22, 0.1, 0.22, DARK, 6);
    // the mouth: its dark inside and the ring of fangs along the lip of the orb
    const maw = c.x("maw"), open = Math.min(1, maw / 1.2);
    ellipsoid(b, 0, -0.3 * ry / RY0 - 0.04, -0.4 * rz / RZ0, 0.36 * rx / R0, 0.05 + 0.15 * open, 0.16, E.CAVITY, 8);
    if (c.x("charge") > 0.05) ellipsoid(b, 0, -0.3 * ry / RY0 - 0.04, -0.46 * rz / RZ0, 0.1 + 0.2 * c.x("charge"), 0.1 + 0.2 * c.x("charge"), 0.1, PLASMA, 7);   // a ball of plasma in it
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.28, x = Math.sin(a) * 0.55 * rx / R0, z = -Math.cos(a) * 0.5 * rz / RZ0, y = -0.27 * ry / RY0 - 0.03 * Math.abs(i);
      b.ball(x, y + 0.03, z * 0.97, 0.04, GUM, 4);
      fang(b, x, z * 1.0, y + 0.02, y - 0.1 - 0.02 * (3 - Math.abs(i)), 0.034);
    }
    if (bu > 0.05) {                                                                         // burst: a gaping wound, and chunks of it lying about
      ellipsoid(b, 0.2 * rx / R0, 0.2 * ry / RY0, -0.4 * rz / RZ0, 0.2 * bu + 0.1, 0.14 * bu + 0.06, 0.1, E.ORGAN, 7, { tex: meatTex });
      ellipsoid(b, -0.15 * rx / R0, 0.1 * ry / RY0, -0.5 * rz / RZ0, 0.12 * bu + 0.05, 0.09 * bu + 0.04, 0.08, E.CAVITY, 6);
      for (let i = 0; i < 5; i++) {
        const a = i * 2.1 + 0.4, r = (0.55 + 0.12 * i) * rx / R0;
        ellipsoid(b, Math.cos(a) * r, -ry + 0.06 + 0.02 * (i % 2), -0.1 + Math.sin(a) * 0.3, 0.05 + 0.025 * bu * (1 + (i % 3)), 0.04 + 0.02 * bu, 0.05 + 0.02 * bu, i % 2 ? E.MEAT : E.ORGAN, 5);
      }
    }
  }),
  part("eye", "body", (c) => {
    const b = c.b, sq = c.x("sq"), lid = c.x("lid"), look = c.x("look"), pup = c.x("pup"), sw = 1 + c.x("sw");
    const k = (1 + 0.3 * sq) * sw;
    ellipsoid(b, 0, 0, 0.02, 0.34 * k, 0.31 * (1 - sq * 0.5) * sw, 0.1, DARK, 9);          // the socket
    ellipsoid(b, 0, 0, -0.02, 0.29 * k, 0.27 * (1 - sq * 0.5) * sw, 0.09, c.x("rage") > 0.5 ? RAGE : IRIS, 9);   // the iris
    const pr = 0.07 + 0.09 * pup;
    ellipsoid(b, look * 0.09, 0, -0.09, pr * 0.8 * k, pr * 1.4 * (1 - sq * 0.4), 0.04, E.CAVITY, 7);   // a slit pupil, wide when it is angry
    ellipsoid(b, look * 0.09 - 0.07, 0.1, -0.11, 0.03, 0.04, 0.02, FANG, 4);                  // the glint
    if (lid > 0.02) ellipsoid(b, 0, 0.31 * (1 - lid) * (1 - sq * 0.5), -0.07, 0.36 * k, 0.33 * lid * (1 - sq * 0.5) + 0.001, 0.1, FLESH, 8, { tex: welts });   // the lid, brought down over it
  }),
  part("horns", "head", (c) => {
    for (const s of [-1, 1]) {
      const b = c.b, [rx, ry] = radii(c);
      b.push(); b.translate(s * 0.26 * rx / R0, -0.04 + (ry - RY0), 0.0); b.roll(s * -0.55); b.pitch(-0.15);
      limb(b, 0, 0, 0, 0.2, 0.1, 0.07, HORN, 6); b.translate(0, 0.19, 0); b.roll(s * 0.5);
      limb(b, 0, 0, 0, 0.2, 0.07, 0.01, HORN, 6); b.pop();
    }
  }),
  part("finL", "lArm", (c) => flipper(c, -1)), part("tipL", "lArm", (c) => tip(c, -1)),
  part("finR", "rArm", (c) => flipper(c, 1)), part("tipR", "rArm", (c) => tip(c, 1)),
  part("belly", "legs", (c) => {                                                             // the underbelly: it hangs from the orb and tapers
    const b = c.b;
    ellipsoid(b, 0, -0.05, 0.1, 0.38, 0.2, 0.36, FLESH, 9, { tex: welts });
    ellipsoid(b, 0, -0.12, 0.22, 0.22, 0.14, 0.26, DARK, 7);
  }),
  part("jaw", "legs", (c) => {
    const b = c.b;
    ellipsoid(b, 0, -0.02, -0.04, 0.3, 0.07, 0.17, GUM, 8);                                   // the lower lip, red
    for (let i = -2; i <= 2; i++) { const x = i * 0.1, z = -0.14 + Math.abs(i) * 0.04; fang(b, x, z, 0.03, 0.17 - 0.02 * Math.abs(i), 0.03); }
  }),
  part("tail", "legs", (c) => {
    const b = c.b;
    limb(b, 0, 0, 0, -0.4, 0.2, 0.03, FLESH, 7, { tex: welts });
    b.ball(0, -0.42, 0, 0.05, HORN, 5);
  }),
];

/** What each torn-off zone leaves: a raw underside (meat, gut, sinew) under the orb; a ragged flank where a flipper was; stubs where the horns were. */
const stumps: Stump[] = [
  { joint: "horns", group: "head", draw: (c) => { for (const s of [-1, 1]) limb(c.b, s * 0.26, 0, -0.04, 0.08, 0.09, 0.07, E.MEAT, 6); } },
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "fin" + s, group: s === "L" ? "lArm" : "rArm", draw: (c) => {
    const d = s === "L" ? -1 : 1;
    ellipsoid(c.b, d * 0.13, 0, -0.1, 0.17, 0.18, 0.15, E.MEAT, 8, { tex: meatTex }); ellipsoid(c.b, d * 0.2, 0.03, -0.2, 0.09, 0.08, 0.07, E.ORGAN, 6);
    limb(c.b, d * 0.2, -0.2, 0.0, 0.2, 0.02, 0.012, E.BONE, 5); c.b.box(d * 0.1 - 0.025, -0.1, -0.24, d * 0.1 + 0.025, 0.06, -0.19, E.SINEW);
  } })),
  { joint: "core", group: "legs", draw: (c) => {
    const b = c.b, [rx, ry] = radii(c);
    ellipsoid(b, 0, -ry * 0.88, -0.22, rx * 0.66, 0.12, 0.3, E.MEAT, 9, { tex: meatTex });  // the torn underside, wet and red, in front of the fangs
    ellipsoid(b, 0.1, -ry * 0.88, -0.36, 0.26, 0.1, 0.16, E.ORGAN, 7);
    for (let i = -2; i <= 2; i++) limb(b, i * 0.14, -0.1 + 0.03 * (i % 2), -ry * 0.72, -ry * 0.72 - 0.12 - 0.04 * (i % 3), 0.026, 0.008, E.SINEW, 4);   // sinews hanging from it
    for (const s of [-1, 1]) fang(b, s * 0.28, -0.3, -ry * 0.72, -ry * 0.72 - 0.08, 0.03);   // a couple of fangs left in the gum
  } },
];

const cap = (joint: string, draw: (c: Ctx) => void): PartCap => ({ joint, draw });
const partSpecs: Record<"head" | "lArm" | "rArm" | "legs", PartSpec> = {
  head: { group: "head", pose: CACO_PART_POSES.horns, cap: cap("horns", (c) => { for (const s of [-1, 1]) limb(c.b, s * 0.26, 0, -0.06, 0.0, 0.1, 0.09, E.MEAT, 6); }) },
  lArm: { group: "lArm", pose: CACO_PART_POSES.fin, cap: cap("finL", (c) => { ellipsoid(c.b, 0.1, 0, 0, 0.06, 0.12, 0.1, E.MEAT, 6); limb(c.b, 0.1, 0, -0.04, -0.14, 0.016, 0.012, E.BONE, 4); }) },
  rArm: { group: "rArm", pose: CACO_PART_POSES.fin, cap: cap("finR", (c) => { ellipsoid(c.b, -0.1, 0, 0, 0.06, 0.12, 0.1, E.MEAT, 6); limb(c.b, -0.1, 0, -0.04, -0.14, 0.016, 0.012, E.BONE, 4); }) },
  legs: { group: "legs", pose: CACO_PART_POSES.belly, cap: cap("belly", (c) => { ellipsoid(c.b, 0, 0.17, 0.1, 0.34, 0.06, 0.32, E.MEAT, 8); for (let i = -1; i <= 1; i++) limb(c.b, i * 0.14, 0.2, 0.1, 0.32, 0.02, 0.008, E.SINEW, 4); }) },
};

export const CACODEMON: Rig = {
  key: "C",
  palette: CACO_PALETTE,
  frame: { w: 96, h: 96, worldH: 1.64, floor: 0.975, yaw: 0.0, pitch: 0.12, shift: 0 },
  crawlH: 12 / 18,
  joints: CACO_JOINTS, parts, stumps,
  poses: CACO_POSES,
  walkStep: 0.11,
  // legacy grid 19 x 18; a flyer's rows have no head (head 0)
  regions: { W: 19, H: 18, head: 0, armTop: 0, armBot: 9, shoulder: 4 },
  partSpecs,
};
