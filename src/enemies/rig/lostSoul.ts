import type { Builder } from "../../render/viewmodel/builder";
import { FIRST_OWN, enemyPalette } from "./palette";
import { crackTex, limb } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { SOUL_BODY, SOUL_POSES } from "./lostSoulPoses";

/**
 * THE LOST SOUL (`L`): a burning skull. It flies (`fly`) and throws itself at you (`charger`).
 *
 * The legacy sprite is a white skull (`b`, `R`) with black sockets (`0`), its jaw agape, in a wreath of orange and yellow fire
 * (`o`, `y`). The rig keeps the skull and the fire and gives it what is left of the man it was: a stub of spine hanging from it,
 * the vertebrae trailing like a tail, and the bones of two arms still reaching, all of it burning. The fire is its own material,
 * lit from within, and it leaps (`flick`); when it charges the flames stream back off it (`rush`) and the jaw drops.
 */

const SKULL = FIRST_OWN, SOCKET = FIRST_OWN + 1, FIRE = FIRST_OWN + 2, CORE = FIRST_OWN + 3, CHAR = FIRST_OWN + 4, EMBER = FIRST_OWN + 5;

export const SOUL_PALETTE = enemyPalette({
  // the legacy b / R: bone, white in its own firelight
  [SKULL]:  { ramp: ["#5a4c40", "#857462", "#ad9c86", "#cfc0aa", "#e8dcc8", "#fbf2e2"], amb: .7, spec: .3, rim: true },
  [SOCKET]: { ramp: ["#140604", "#1e0a06", "#2a0e08"], amb: .8 },
  // the legacy o / y: the fire round it
  [FIRE]:   { ramp: ["#6e1404", "#9c2208", "#c8380c", "#e45414", "#f4741e", "#ff962c"], emissive: true },
  [CORE]:   { ramp: ["#ff9a30", "#ffbc48", "#ffd868", "#ffec98"], emissive: true },
  // bone the fire has blackened
  [CHAR]:   { ramp: ["#1a120e", "#2c1f18", "#433024", "#5c4434"], amb: .5, spec: .2 },
  // what burns in the sockets
  [EMBER]:  { ramp: ["#a01808", "#d83010", "#ff5a20", "#ff9a40"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });

/** A tongue of fire rising from (x, y) at depth z, leaning `lean`, `h` tall: an outer flame and its hot core. */
function flame(b: Builder, x: number, y: number, z: number, w: number, h: number, lean: number): void {
  b.push(); b.translate(x, y, z); b.roll(lean);
  b.prz([[-w, 0], [-w * 0.6, h * 0.45], [-w * 0.15, h * 0.8], [0, h], [w * 0.3, h * 0.6], [w, 0.0], [0, -w * 0.4]], -0.012, 0.012, FIRE);
  b.prz([[-w * 0.45, 0], [-w * 0.2, h * 0.4], [0, h * 0.55], [w * 0.4, 0.02], [0, -w * 0.2]], -0.02, -0.012, CORE);
  b.pop();
}

/** The skull, on the chest joint: brow, sockets with embers in them, the nose's hole, the cheekbones, the upper teeth; and its fire. */
function skull(c: Ctx): void {
  const b = c.b, fl = c.x("flick"), rush = c.x("rush");
  // the fire behind and around it first, so the bone is in front of it
  for (let i = 0; i < 9; i++) {   // the fire rises off it: tongues round the crown and the sides, leaning up and back, none the same
    const a = -1.5 + (i / 8) * 3.0, r = 0.17, hh = 0.16 + 0.1 * Math.abs(Math.sin(i * 2.3 + fl * 4)) + 0.06 * Math.cos(i * 1.3) + rush * 0.14;
    flame(b, Math.sin(a) * r, 0.04 + Math.cos(a) * r * 0.8, 0.12, 0.06 + 0.02 * Math.sin(i * 1.7 + fl * 3), hh, a * 0.45 + rush * 0.4 * Math.sign(a || 1));
  }
  for (const s of [-1, 1]) flame(b, s * 0.17, -0.1, 0.08, 0.05, 0.14 + 0.05 * Math.sin(fl * 5 + s), s * 1.1);
  b.ball(0, 0.07, 0.02, 0.17, SKULL, 10, { tex: crackTex });                                    // the cranium
  b.cbox(-0.15, -0.12, -0.17, 0.15, 0.08, 0.08, 0.045, SKULL, { tex: crackTex });              // the face
  b.cbox(-0.17, -0.03, -0.13, 0.17, 0.04, 0.04, 0.02, SKULL);                                   // cheekbones
  b.cbox(-0.14, 0.05, -0.18, 0.14, 0.09, -0.12, 0.02, SKULL);                                   // the brow over the sockets
  for (const x of [-0.07, 0.07]) {
    b.prz([[x - 0.055, -0.035], [x + 0.055, -0.035], [x + 0.06, 0.035], [x + 0.03, 0.06], [x - 0.04, 0.055], [x - 0.065, 0.02]], -0.185, -0.15, SOCKET);
    b.ball(x, 0.01, -0.19, 0.022, EMBER, 4);                                                    // what burns in them
  }
  b.prz([[-0.025, -0.085], [0.025, -0.085], [0, -0.04]], -0.185, -0.15, SOCKET);                // the nose
  for (let i = 0; i < 6; i++) b.box(-0.075 + i * 0.026, -0.125, -0.18, -0.056 + i * 0.026, -0.09, -0.165, SKULL);   // the upper teeth
  b.box(-0.1, -0.2, -0.172, 0.1, -0.11, -0.12, SOCKET);                                          // the dark of the mouth behind them
  b.box(-0.17, 0.08, -0.04, -0.12, 0.13, 0.04, CHAR); b.box(0.12, 0.06, 0.0, 0.17, 0.1, 0.06, CHAR);   // where the fire has blackened it
}

const joints: Joint[] = humanJoints(SOUL_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => { for (let i = 0; i < 2; i++) c.b.cbox(-0.025, -0.02 + i * 0.05, 0.02, 0.025, 0.01 + i * 0.05, 0.06, 0.008, CHAR); }),   // vertebrae, behind
  part("spine", "body", (c) => { limb(c.b, 0, 0.04, 0, 0.12, 0.018, 0.016, CHAR, 5); for (let i = 0; i < 3; i++) c.b.cbox(-0.03, i * 0.04, 0.02, 0.03, i * 0.04 + 0.02, 0.06, 0.006, SKULL); }),
  part("chest", "body", skull),
  // ---- the "head": the horns and the crown of fire over the skull ----
  part("head", "head", (c) => {
    const b = c.b, fl = c.x("flick");
    for (const s of [-1, 1]) {
      b.push(); b.translate(s * 0.12, -0.02, -0.02); b.roll(-s * 0.7);
      limb(b, 0, 0, 0, 0.1, 0.035, 0.022, CHAR, 5); b.translate(0, 0.1, 0); b.roll(s * 0.6); limb(b, 0, 0, 0, 0.08, 0.022, 0.003, CHAR, 4);
      b.pop();
    }
    for (let i = 0; i < 3; i++) flame(b, -0.08 + i * 0.08, 0.0, 0.0, 0.06, 0.18 + 0.06 * Math.sin(fl * 4 + i * 2), (i - 1) * 0.3);
  }),
  part("jaw", "head", (c) => {   // the jaw, hung open from the skull
    const b = c.b;
    b.cbox(-0.12, -0.065, -0.17, 0.12, -0.02, 0.04, 0.02, SKULL, { tex: crackTex });
    for (const x of [-0.115, 0.115]) b.box(x - 0.02, -0.04, -0.1, x + 0.02, 0.06, 0.02, SKULL);   // its hinges, up into the skull
    for (let i = 0; i < 6; i++) b.box(-0.07 + i * 0.026, -0.03, -0.178, -0.052 + i * 0.026, 0.005, -0.165, SKULL);
  }),
  ...armParts(SOUL_BODY, "lArm", armSpec()),
  ...armParts(SOUL_BODY, "rArm", armSpec()),
  // the spine trailing under it, burning: it goes with the "legs"
  ...(["L", "R"] as const).flatMap((s) => legParts(SOUL_BODY, s, {
    joint: 0.025,
    upper: { r0: 0.022, r1: 0.02, mat: SKULL, deco: (c, len) => { for (let i = 0; i < 4; i++) c.b.cbox(-0.035, -len * (0.15 + i * 0.22) - 0.015, -0.03, 0.035, -len * (0.15 + i * 0.22) + 0.015, 0.03, 0.006, SKULL); flame(c.b, 0, -len * 0.5, 0.05, 0.04, 0.12, 0); } },
    lower: { r0: 0.02, r1: 0.012, mat: CHAR, deco: (c, len) => { for (let i = 0; i < 3; i++) c.b.cbox(-0.025, -len * (0.2 + i * 0.28) - 0.012, -0.022, 0.025, -len * (0.2 + i * 0.28) + 0.012, 0.022, 0.005, CHAR); } },
    foot: (c) => flame(c.b, 0, 0, 0.0, 0.035, -0.1, 0),
  })),
];

/** An arm of bones, burning: the long bones, the knuckles, a hand of finger bones reaching. */
function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.022,
    upper: { r0: 0.022, r1: 0.018, mat: SKULL, deco: (c, len) => flame(c.b, 0, -len * 0.3, 0.04, 0.04, 0.12, 0.3) },
    fore: { r0: 0.018, r1: 0.016, mat: SKULL, deco: (c, len) => limb(c.b, 0.02, 0, -len * 0.05, -len * 0.95, 0.012, 0.01, CHAR, 4) },
    hand: (c, s) => {
      const b = c.b;
      b.cbox(-0.025, -0.04, -0.012, 0.025, 0.0, 0.012, 0.005, SKULL);
      for (let i = -1; i <= 2; i++) { b.push(); b.translate(i * 0.014 - 0.007, -0.04, 0); b.pitch(-0.4); limb(b, 0, 0, 0, -0.06, 0.007, 0.004, SKULL, 4); b.pop(); }
      b.box(s * 0.025, -0.03, -0.01, s * 0.045, -0.005, 0.01, SKULL);
    },
  };
}

const O = { neck: 0.03, arm: 0.03, leg: 0.03, neckTop: 0.06, armLen: 0.06, legLen: 0.06 };

export const LOST_SOUL: Rig = {
  key: "L",
  palette: SOUL_PALETTE,
  frame: { w: 80, h: 80, worldH: 0.84, floor: 0.975, yaw: 0.28, pitch: 0.06, shift: 0.0 },
  crawlH: 8 / 12,
  joints, parts, stumps: humanStumps(O),
  poses: SOUL_POSES,
  walkStep: 0.08,
  regions: { W: 15, H: 12, head: 0, armTop: 0, armBot: 6, shoulder: 3 },
  partSpecs: humanPartSpecs(SOUL_BODY, O),
};
