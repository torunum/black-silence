import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { crackTex, limb } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { GUARDIAN_BODY, GUARDIAN_POSES } from "./guardianPoses";

/**
 * THE CATHEDRAL GUARDIAN (`U`, a boss): the stone knight off a tomb, risen. "It has always stood here."
 *
 * The legacy sprite is a block of grey (`k`) with a slit of blue (`B`) for eyes, a shield (`S`) down its left and a pale sword
 * (`A`) down its right. The rig keeps all of it and makes it a statue that walks: a great helm with a cross cut in its visor and
 * the blue light behind it, a breastplate with the carved cross of a crusader's tomb, a stone surcoat to the knee, a kite shield
 * on its left arm bearing the same cross, and a broadsword in its right hand. The stone is weathered — cracks, the odd scab of
 * moss — and where it is broken it is not stone underneath: there is meat in it (its stumps, `humanStumps`), which is the wrong
 * thing about it. Its attack is the sword coming over and down (`atk`); it throws its shards (`stone`) from the same swing.
 */

const STONE = FIRST_OWN, DARK = FIRST_OWN + 1, PALE = FIRST_OWN + 2, MOSS = FIRST_OWN + 3, GLOW = FIRST_OWN + 4, BLADE = FIRST_OWN + 5;

export const GUARDIAN_PALETTE = enemyPalette({
  // the legacy k: a grey limestone, warm in the light
  [STONE]: { ramp: ["#17181b", "#26282c", "#383a3f", "#4c4f54", "#62656a", "#7a7c80", "#94958f", "#aeada4"], amb: .46, spec: .12, rim: true },
  // the legacy S: the shield's darker stone, and the joints of the armour
  [DARK]:  { ramp: ["#0e0f11", "#191b1e", "#25282c", "#33373c", "#43484e", "#555b61"], amb: .42, spec: .12 },
  // the carved crosses, the trim: the stone where it was polished
  [PALE]:  { ramp: ["#3a3832", "#5a574e", "#7c786b", "#9e9989", "#bfb9a6", "#dcd6c2"], amb: .5, spec: .2, rim: true },
  [MOSS]:  { ramp: ["#141a0c", "#222c14", "#33421e", "#465a29", "#5c7336"], amb: .4 },
  // the legacy B: what looks out of the helm
  [GLOW]:  { ramp: ["#0a2a50", "#1050a0", "#1a74d0", "#2a96f0", "#4ab4ff", "#7ac8ff"], emissive: true },
  // the legacy A: the sword, stone too but honed
  [BLADE]: { ramp: ["#26262a", "#3e3f44", "#5a5c61", "#7a7c80", "#9a9b9c", "#bcbcb6", "#e0ded4"], amb: .5, spec: .5, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
/** Weathered stone: a pitted speckle and the cracks. */
const weather: TexFn = (x, y, z) => {
  const c = crackTex(x * 0.8, y * 0.8, z * 0.8);
  if (c) return c;
  const v = Math.sin(x * 97 + y * 61) * Math.sin(z * 83 + y * 37);
  return v > 0.8 ? -0.8 : v < -0.9 ? 0.6 : 0;
};
const moss = (b: Builder, x: number, y: number, z: number, r: number): void => b.ball(x, y, z, r, MOSS, 5);

/** A carved cross in relief, centred at (x, y) on the face at depth z. */
function cross(b: Builder, x: number, y: number, z: number, h: number, mat = PALE): void {
  b.box(x - h * 0.09, y - h * 0.5, z - 0.012, x + h * 0.09, y + h * 0.5, z, mat);
  b.box(x - h * 0.34, y + h * 0.12, z - 0.012, x + h * 0.34, y + h * 0.28, z, mat);
}

/** The kite shield, on the left forearm: its face to the front, long side up, a rim and a cross. Drawn in the elbow's frame. */
function shield(b: Builder): void {
  b.push(); b.translate(-0.1, -0.2, -0.04); b.pitch(Math.PI / 2);
  const K: Array<[number, number]> = [[-0.26, 0.36], [0.26, 0.36], [0.28, 0.08], [0.18, -0.3], [0.0, -0.56], [-0.18, -0.3], [-0.28, 0.08]];
  b.prz(K, -0.05, 0.04, DARK, { r1: 0.92, tex: weather });
  b.prz(K.map(([x, y]) => [x * 0.86, y * 0.88 - 0.01] as [number, number]), -0.068, -0.05, STONE, { tex: weather });
  cross(b, 0, -0.02, -0.068, 0.62, GLOW);   // the cross on it lit from inside, as the helm is: whatever is in the stone is in it too
  moss(b, 0.15, -0.28, -0.06, 0.035); moss(b, -0.2, 0.25, -0.06, 0.03);
  b.pop();
}

/** The broadsword, in the right hand's frame: a hilt in the fist, a cross guard, a long blade on down the arm's line. */
function sword(b: Builder): void {
  b.push(); b.translate(0, -0.06, 0);
  b.ball(0, 0.1, 0, 0.04, PALE, 5);                                         // the pommel
  limb(b, 0, 0, 0.08, -0.05, 0.022, 0.022, DARK, 6);                        // the grip
  b.cbox(-0.17, -0.08, -0.03, 0.17, -0.04, 0.03, 0.01, PALE);               // the guard
  b.prz([[-0.05, -0.08], [0.05, -0.08], [0.045, -0.9], [0.0, -1.02], [-0.045, -0.9]], -0.016, 0.016, BLADE, { r1: 0.9 });
  b.box(-0.008, -0.1, -0.02, 0.008, -0.8, -0.016, DARK);                    // the fuller
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.065, -0.12, -0.055, 0.065, 0.0, 0.055, 0.02, STONE, { tex: weather });   // a gauntlet
  b.cbox(-0.06, -0.16, -0.05, 0.06, -0.1, 0.045, 0.015, DARK);
  if (s > 0) sword(b);
}

const joints: Joint[] = humanJoints(GUARDIAN_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.27, -0.1, -0.15, 0.27, 0.08, 0.14, 0.03, STONE, { tex: weather });
    c.b.cbox(-0.29, -0.03, -0.17, 0.29, 0.04, 0.16, 0.015, DARK);              // the sword belt
    c.b.cbox(-0.05, -0.05, -0.19, 0.05, 0.05, -0.16, 0.01, PALE);              // its buckle
  }),
  // the surcoat, carved in folds, to the knee: it goes with the legs
  part("pelvis", "legs", (c) => {
    const b = c.b, sw = c.x("sway");
    for (const [x, w, z, l] of [[-0.14, 0.24, -0.16, 0.58], [0.14, 0.24, -0.16, 0.58], [0, 0.5, 0.15, 0.62]] as const) {
      b.push(); b.translate(x, -0.06, z); b.pitch((z < 0 ? -0.05 : 0.08) + (x < 0 ? sw : -sw) * 0.1);
      b.prz([[-w / 2, 0], [w / 2, 0], [w * 0.6, -l], [-w * 0.6, -l]], -0.03, 0.03, STONE, { tex: weather });
      for (let i = 1; i < 3; i++) b.box(-w * 0.6 + i * w * 0.4 - 0.01, -l, -0.04, -w * 0.6 + i * w * 0.4 + 0.01, -l * 0.25, -0.03, DARK);   // its folds
      b.box(-w * 0.6, -l, -0.04, w * 0.6, -l + 0.04, 0.035, PALE);
      b.pop();
    }
  }),
  part("spine", "body", (c) => {
    c.b.cbox(-0.25, 0, -0.14, 0.25, 0.3, 0.13, 0.04, STONE, { tex: weather });
    for (let i = 0; i < 3; i++) c.b.cbox(-0.24, 0.02 + i * 0.09, -0.155, 0.24, 0.08 + i * 0.09, -0.13, 0.01, i % 2 ? DARK : STONE);   // the lames over the belly
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.33, 0, -0.15, 0.33, 0.36, 0.15, 0.06, STONE, { tex: weather });
    b.prz([[-0.28, 0.02], [0.28, 0.02], [0.31, 0.3], [0.0, 0.36], [-0.31, 0.3]], -0.17, -0.12, STONE, { r1: 0.94, tex: weather });   // the breastplate's swell
    cross(b, 0, 0.18, -0.17, 0.3);
    b.cbox(-0.2, 0.33, -0.14, 0.2, 0.42, 0.13, 0.03, DARK);                     // the gorget
    moss(b, -0.22, 0.05, -0.155, 0.04); moss(b, 0.25, 0.28, -0.14, 0.03);
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.1, 0.09, 0.085, DARK, 7)),
  part("shoulderL", "body", (c) => pauldron(c.b, -1)),
  part("shoulderR", "body", (c) => pauldron(c.b, 1)),
  // ---- the head: a great helm, a cross cut in its face and the blue behind it ----
  part("head", "head", (c) => {
    const b = c.b;
    b.cbox(-0.15, -0.02, -0.15, 0.15, 0.32, 0.15, 0.06, STONE, { tex: weather });
    b.cbox(-0.155, 0.27, -0.155, 0.155, 0.34, 0.155, 0.04, PALE);                // the crown's band
    for (const x of [-0.11, 0, 0.11]) b.prz([[x - 0.035, 0.33], [x + 0.035, 0.33], [x, 0.43]], -0.16, -0.11, PALE);   // its points
    b.box(-0.12, 0.15, -0.165, 0.12, 0.19, -0.14, E.CAVITY);                    // the visor's slit
    b.box(-0.022, 0.04, -0.165, 0.022, 0.25, -0.14, E.CAVITY);                  // and the upright of the cross cut in it
    b.box(-0.11, 0.15, -0.17, -0.03, 0.19, -0.155, GLOW); b.box(0.03, 0.15, -0.17, 0.11, 0.19, -0.155, GLOW);
    b.box(-0.012, 0.07, -0.17, 0.012, 0.15, -0.155, GLOW);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.box(s * 0.05 + s * i * 0.03 - 0.008, 0.04, -0.162, s * 0.05 + s * i * 0.03 + 0.008, 0.12, -0.15, E.CAVITY);   // breaths
    moss(b, 0.12, 0.3, -0.05, 0.03);
  }),
  part("elbowL", "lArm", (c) => shield(c.b)),
  ...armParts(GUARDIAN_BODY, "lArm", armSpec()),
  ...armParts(GUARDIAN_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(GUARDIAN_BODY, s, {
    joint: 0.1,
    upper: { r0: 0.12, r1: 0.1, mat: STONE, tex: weather },
    lower: { r0: 0.1, r1: 0.085, mat: STONE, tex: weather, deco: (c, len) => { c.b.cbox(-0.11, -len * 0.3, -0.13, 0.11, -len * 0.02, 0.1, 0.03, DARK); c.b.cbox(-0.1, -len * 0.95, -0.115, 0.1, -len * 0.35, 0.1, 0.03, STONE, { tex: weather }); } },
    foot: (c) => { c.b.cbox(-0.085, -0.05, -0.22, 0.085, 0.05, 0.07, 0.025, STONE, { tex: weather }); c.b.box(-0.08, -0.05, -0.22, 0.08, -0.02, -0.19, DARK); },
  })),
];

/** A pauldron of stone: a dome, a lip, two lames. */
function pauldron(b: Builder, s: -1 | 1): void {
  b.ball(0, 0.03, 0, 0.17, STONE, 8, { tex: weather });
  b.cbox(-0.19, -0.04, -0.17, 0.19, 0.01, 0.16, 0.02, PALE);
  b.cbox(-0.17, -0.12, -0.15, 0.17, -0.05, 0.14, 0.02, STONE, { tex: weather });
  if (s < 0) moss(b, -0.08, 0.12, -0.08, 0.035);
}

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.09,
    upper: { r0: 0.095, r1: 0.08, mat: STONE, tex: weather },
    fore: { r0: 0.08, r1: 0.075, mat: STONE, tex: weather, deco: (c, len) => c.b.cbox(-0.09, -len * 0.95, -0.09, 0.09, -len * 0.45, 0.09, 0.02, DARK) },
    hand,
  };
}

const O = { neck: 0.09, arm: 0.1, leg: 0.12, neckTop: 0.16, armLen: 0.2, legLen: 0.2 };

export const GUARDIAN: Rig = {
  key: "U",
  palette: GUARDIAN_PALETTE,
  frame: { w: 86, h: 100, worldH: 2.34, floor: 0.975, yaw: 0.38, pitch: 0.05, shift: 0.06 },
  crawlH: 8 / 12,
  joints, parts, stumps: humanStumps(O),
  poses: GUARDIAN_POSES,
  walkStep: 0.16,
  regions: { W: 16, H: 12, head: 4, armTop: 4, armBot: 8, shoulder: 4.5 },
  partSpecs: humanPartSpecs(GUARDIAN_BODY, O),
};
