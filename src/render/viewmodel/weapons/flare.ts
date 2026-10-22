import type { Builder } from "../builder";
import { MAT } from "../palette";
import { fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";
import { FLARE } from "../phases";

/**
 * Slot 0, FLARE PISTOL — redrawn to frighten (owner, 2026-10-22: "pistol olan silahı daha iyi modeller misin daha korkutucu olsun").
 * It was a bright signal pistol, orange paint and brass; it is a cursed thing now. A fat barrel of blackened, hammered iron, bound
 * with riveted iron bands, its muzzle flared into a bell ringed with iron fangs; slits cut along its top and side show the flare
 * smouldering inside, red-hot while it is loaded and dead when it is spent. On the breech, facing the man who holds it, a bone skull
 * with embers in its eyes, its teeth bared and two ridged horns curling off its temples — it is the hammer: its jaw drops as the shot
 * goes and shuts as it is cocked again. Three barbs along the rib,
 * a frame of blued iron, a grip of yellowed bone bound in black cord, an iron skull for a butt cap.
 *
 * Fire: the skull's jaw drops, the muzzle flips up hard, and the jaw closes again as the gun is cocked. Reload: the gun turns to show its breech, the
 * barrel breaks open downward on its front hinge (the skull goes with it), the spent shell kicks out (the game ejects casings at
 * 18%), the left hand brings a fresh red flare shell up and pushes it in (the 62% click), the barrel snaps shut and the slits light.
 */

/** Hammered iron: pits scattered over the barrel. */
const pitTex = (x: number, y: number, z: number): number => {
  const h = Math.sin(x * 913 + y * 377 + z * 1291) * 43758.5453;
  return h - Math.floor(h) > 0.86 ? -1.1 : 0;
};
/** A ring of rivet heads round the barrel at `zc`: a lit dot every 30 degrees, and the seam they hold dark. */
const rivets = (zc: number) => (x: number, y: number, z: number): number => {
  if (Math.abs(z - zc) > 0.0045) return 0;
  const u = (Math.atan2(y - CY, x) / (Math.PI / 6)) % 1;
  return Math.abs(u < 0 ? u + 1 : u) - 0.5 < 0.18 && Math.abs(z - zc) < 0.003 ? 1.4 : -0.6;
};
/** Black cord wound round the bone grip. */
const cordTex = (_x: number, y: number, z: number): number => (Math.abs(Math.sin((y + z * 0.35) * 260)) < 0.32 ? -9 : 0);
/** The skull's teeth: dark gaps between them. */
const teethTex = (x: number): number => (Math.abs(Math.sin(x * 520)) < 0.25 ? -3 : 0);
/** The skull's cracks. */
const crackTex = (x: number, y: number): number => (Math.abs(y - CY - 0.006 - Math.sin(x * 300) * 0.002) < 0.0007 && x > -0.004 ? -2.5 : 0);

/** The barrel's axis height over the frame. */
const CY = 0.046;
/** The barrel's radius; the breech's. */
const R = 0.025, RB = 0.028;

/** A flare shell: brass head at z0, red paper hull forward of it. */
function shell(b: Builder, z0: number): void {
  b.cyl(0, 0, z0 + 0.01, z0 + 0.07, 0.017, 0.017, 8, MAT.RED);
  b.cyl(0, 0, z0, z0 + 0.013, 0.019, 0.019, 8, MAT.BRASS);
}

/** A cone along local z from (x, y, z0), `len` long, base radius `r`: a fang, a barb. */
function fang(b: Builder, x: number, y: number, z0: number, len: number, r: number, mat: number): void {
  b.cyl(x, y, z0, z0 + len, r, 0.0006, 5, mat);
}

/** A horn off the skull's temple on side `s`: up and out, then curling back toward the eye, in three tapering joints. */
function horn(b: Builder, s: number): void {
  b.push(); b.translate(s * 0.0135, 0.011, -0.003); b.roll(0.55 * s); b.pitch(Math.PI / 2 + 0.25);
  const seg = [[0.014, 0.0056, 0.0043], [0.013, 0.0043, 0.003], [0.012, 0.003, 0.0006]] as const;
  for (const [len, r0, r1] of seg) {
    b.cyl(0, 0, 0, len, r0, r1, 6, MAT.BONE, { tex: (_x, _y, z) => (Math.abs(Math.sin(z * 900)) < 0.2 ? -1.6 : 0) });   // ridged
    b.translate(0, 0, len * 0.92); b.pitch(-0.55); b.roll(-0.25 * s);
  }
  b.pop();
}

/** The bone skull on the breech, horned, facing back at the eye; `lit` puts embers in its sockets, `jaw` (0..1) drops its jaw. */
function skull(b: Builder, lit: boolean, jaw: number): void {
  b.push(); b.translate(0, CY + 0.007, -0.038);
  b.ball(0, 0.004, 0, 0.0175, MAT.BONE, 8, { tex: (x, y) => crackTex(x, y + CY) });   // the cranium
  b.cbox(-0.012, -0.013, -0.012, 0.012, -0.004, 0.004, 0.004, MAT.BONE);              // the cheekbones and the upper jaw
  b.cbox(-0.0095, -0.0155, -0.0118, 0.0095, -0.011, -0.002, 0.0015, MAT.BONE, { tex: teethTex });   // the upper teeth
  b.box(-0.0085, -0.017, -0.0105, 0.0085, -0.011, 0.0, MAT.BLACK);                     // the dark of the mouth behind them
  // the lower jaw, hinged at the back of the skull: it drops as the shot goes (the hammer's fall), and shuts as it is cocked again
  b.push(); b.translate(0, -0.012 - 0.004 * jaw, 0.002); b.pitch(0.75 * jaw);
  b.cbox(-0.0105, -0.011, -0.0145, 0.0105, -0.004, 0.0, 0.003, MAT.BONE);
  b.cbox(-0.009, -0.0055, -0.0135, 0.009, -0.0005, -0.004, 0.0012, MAT.BONE, { tex: teethTex });   // the lower teeth
  b.pop();
  for (const s of [-1, 1]) {
    b.ball(s * 0.0068, 0.0005, -0.0128, 0.0052, MAT.BLACK, 6);                         // the eye sockets
    b.ball(s * 0.0068, 0.0005, -0.0168, lit ? 0.0026 : 0.0014, lit ? MAT.EMBER : MAT.RED, 5);   // the embers in them
    horn(b, s);
  }
  b.box(0.0058, -0.0115, -0.0128, 0.0074, -0.0035, -0.0118, MAT.RED);                  // a dried tear of blood down from one socket
  b.cbox(-0.0145, 0.0035, -0.0165, 0.0145, 0.0085, -0.006, 0.0025, MAT.BONE);       // the brow, heavy over the sockets
  b.prz([[-0.0022, -0.006], [0.0022, -0.006], [0, -0.0015]], -0.0175, -0.012, MAT.BLACK);   // the nose
  b.pop();
}

export const flarePistol: WeaponArt = {
  name: "FLARE PISTOL",
  hold: { x: 0.028, y: -0.078, z: 0.34, pitch: 0.1, yaw: -0.05, roll: 0 },  // a little right of centre, square to the screen, looking ahead (owner, 2026-10-20: option 3, "biraz daha dik")
  present: { y: 0.05, pitch: 0.15, roll: 0 },   // the reload brought up into view (pose.ts)
  kick: { back: 0.065, lift: 0.12 },
  action: (p) => 1 - ramp(p, ...FLARE.cock),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const open = r < 0 ? 0 : hump(r, ...FLARE.open);    // breech angle 0..1
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);    // whole gun canted and dipped to show the breech
    b.translate(0, -0.03 * tilt, 0); b.roll(-0.35 * tilt); b.pitch(-0.25 * tilt); b.yaw(0.2 * tilt);
    // loaded: the flare smoulders in the barrel; spent (and while the breech is open), the slits are dead
    const loaded = r < 0 ? !pose.empty : r > 0.62 && open < 0.3;
    const ember = loaded ? MAT.EMBER : MAT.BLACK;

    // the frame, blued iron; a long raked grip of bone bound in black cord; an iron skull for a butt cap; the guard
    b.cbox(-0.015, 0.0, -0.045, 0.015, 0.03, 0.055, 0.005, MAT.BLUED);
    b.ext([[-0.046, 0.002], [0.0, 0.002], [-0.02, -0.112], [-0.029, -0.12], [-0.07, -0.114], [-0.066, -0.09]], -0.0145, 0.0145, MAT.BONE, { tex: cordTex });
    b.push(); b.translate(0, -0.12, -0.05); b.pitch(-0.3);
    b.ball(0, -0.004, 0, 0.017, MAT.IRON, 7, { tex: pitTex });
    for (const s of [-1, 1]) b.ball(s * 0.007, -0.002, -0.014, 0.004, MAT.BLACK, 5);
    fang(b, 0, -0.012, -0.004, 0.03, 0.005, MAT.IRON);   // a spike off the butt, for the skull of whatever gets close
    b.pop();
    b.ext([[0.0, 0.0], [0.048, 0.0], [0.048, -0.008], [0.038, -0.036], [0.01, -0.04], [0.002, -0.032], [0.032, -0.03], [0.04, -0.008], [0.0, -0.008]], -0.0045, 0.0045, MAT.IRON);

    // the barrel on its front hinge, the skull and the barbs going with it
    b.push();
    b.translate(0, 0.012, 0.05);
    b.pitch(-0.6 * open);
    b.translate(0, -0.012, -0.05);
    b.cyl(0, CY, -0.03, 0.022, RB, RB, 14, MAT.IRON, { tex: rivets(0.012) });          // the breech, its ring of rivets
    b.cyl(0, CY, 0.022, 0.16, R, R * 0.96, 14, MAT.BLACK, { tex: pitTex });             // the barrel, hammered black iron
    for (const z of [0.07, 0.125]) b.cyl(0, CY, z, z + 0.012, R + 0.003, R + 0.003, 14, MAT.IRON, { tex: rivets(z + 0.006) });   // its bands
    b.cyl(0, CY, 0.158, 0.19, R * 0.98, R * 1.42, 14, MAT.IRON, { tex: pitTex });       // the bell of the muzzle
    b.cyl(0, CY, 0.186, 0.192, R * 1.15, R * 1.15, 14, MAT.BLACK);                      // its dark mouth
    for (let i = 0; i < 9; i++) {                                                       // the fangs round it
      const a = Math.PI / 2 + (i - 4) * 0.62;
      b.push(); b.translate(Math.cos(a) * R * 1.3, CY + Math.sin(a) * R * 1.3, 0.186); b.pitch(Math.sin(a) * 0.95); b.yaw(Math.cos(a) * 0.95);
      fang(b, 0, 0, 0, 0.022, 0.0048, MAT.BONE);
      b.pop();
    }
    // the slits along its top and right side, the flare smouldering behind them
    for (const z of [0.035, 0.088, 0.14]) for (const a of [0.0, 0.55]) {
      b.push(); b.translate(0, CY, 0); b.roll(-a);
      b.box(-0.0035, R - 0.0026, z, 0.0035, R + 0.0008, z + 0.024, ember);
      b.pop();
    }
    b.cbox(-0.0045, CY + R - 0.002, 0.0, 0.0045, CY + R + 0.006, 0.156, 0.0015, MAT.IRON);   // the top rib
    for (const z of [0.04, 0.092, 0.144]) { b.push(); b.translate(0, CY + R + 0.005, z); b.pitch(1.1); fang(b, 0, 0, 0, 0.016, 0.0036, MAT.IRON); b.pop(); }   // the barbs along it, raked back
    skull(b, loaded, pose.action);   // the hammer's fall is the skull's jaw dropping (the action's 1 at the shot, back to 0 as it is cocked)
    if (open > 0.25) {
      b.cyl(0, CY, -0.032, -0.03, 0.018, 0.018, 12, MAT.BLACK);                       // the open bore
      if (r > 0.12 && r < 0.26) {                                                       // spent shell drops out
        const u = (r - 0.12) / 0.14;
        b.push(); b.translate(0.015 * u, CY - 0.12 * u * u, -0.035 - 0.05 * u); b.pitch(-1.2 * u); shell(b, 0); b.pop();
      }
      if (r > 0.6 && r < 0.84) { b.push(); b.translate(0, CY, -0.03); shell(b, 0); b.pop(); } // fresh shell seated
    }
    b.anchor("muzzle", 0, CY, 0.19);
    b.pop();

    // right hand on the grip, finger on the trigger
    b.push();
    b.translate(0, 0, -0.004); b.pitch(-0.2);
    fist(b, 1, { trigger: true, w: 0.0155 });
    b.pop();
    forearm(b, 0.012, -0.06, -0.06, [0.3, -0.5, -1], 0.03);

    // left hand: comes up from below with a fresh shell and pushes it into the breech
    if (r >= 0) {
      const inn = hump(r, 0.3, 0.78, 0.16), push = ramp(r, ...FLARE.push);
      if (inn > 0 && r < 0.62) {
        b.push();
        b.translate(-0.01 + 0.01 * inn, -0.12 + 0.15 * inn, -0.1 + 0.03 * inn + 0.03 * push);
        b.pitch(-0.6);
        shell(b, 0);
        b.pop();
      }
      if (inn > 0) {
        b.push();
        b.translate(-0.04 + 0.02 * inn, -0.16 + 0.15 * inn, -0.11 + 0.03 * inn + 0.03 * push);
        b.roll(-0.6); b.pitch(0.4);
        fist(b, -1, { w: 0.012, fingers: 3 });
        forearm(b, -0.01, -0.05, -0.045, [-0.4, -1, -0.4], 0.03);
        b.pop();
      }
    }
  },
};
