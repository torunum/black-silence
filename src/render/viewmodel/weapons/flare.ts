import type { Builder } from "../builder";
import { MAT } from "../palette";
import { fist, forearm, THUMB } from "../hands";
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
 * Fire (2026-10-22, "animasyonları da yenile, daha kaliteli"): the skull is the hammer and falls forward at the shot, its jaw
 * dropped and its eyes and the slits flaring white with the flash; the right thumb comes up onto its crown and rolls it back as the
 * gun is cocked (`FLARE.cock`, the click), the jaw shutting with it, and goes home.
 * Reload (2 s): the gun is brought up and canted; the wrist snaps down and the barrel breaks open on its front hinge (`FLARE.open`),
 * flopping once as it falls; the embers die; the spent shell kicks up out of the red-hot bore, tumbling, and over the shoulder; the
 * left hand brings a fresh shell up from below pinched by its rim and pushes it home (`FLARE.push`, the click), lets go and drops
 * away; the barrel snaps shut, speeding into the stop, the wrist flicks up, the skull's teeth chatter, and the slits light again
 * back to front, the eyes last.
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

/**
 * The bone skull on the breech, horned, facing back at the eye. `glow` (0..1) is the embers in its sockets (0 dead, 1 lit, more
 * flaring with the shot), `jaw` (0..1) drops its jaw, `fall` (0..1) tips it forward on its pivot at the base of the breech: it is
 * the hammer, and falls as the shot goes.
 */
function skull(b: Builder, glow: number, jaw: number, fall: number): void {
  b.push(); b.translate(0, CY - 0.012, -0.03); b.pitch(-0.55 * fall); b.translate(0, 0.019, -0.008);
  b.ball(0, 0.004, 0, 0.0175, MAT.BONE, 8, { tex: (x, y) => crackTex(x, y + CY) });   // the cranium
  b.cbox(-0.012, -0.013, -0.012, 0.012, -0.004, 0.004, 0.004, MAT.BONE);              // the cheekbones and the upper jaw
  b.cbox(-0.0095, -0.0155, -0.0118, 0.0095, -0.011, -0.002, 0.0015, MAT.BONE, { tex: teethTex });   // the upper teeth
  b.box(-0.0085, -0.017, -0.0105, 0.0085, -0.011, 0.0, MAT.BLACK);                     // the dark of the mouth behind them
  // the lower jaw, hinged at the back of the skull: it drops as the shot goes (the hammer's fall), and shuts as it is cocked again
  b.push(); b.translate(0, -0.012 - 0.0015 * jaw, 0.002); b.pitch(0.55 * jaw);
  b.cbox(-0.0105, -0.011, -0.0145, 0.0105, -0.004, 0.0, 0.003, MAT.BONE);
  b.cbox(-0.009, -0.0055, -0.0135, 0.009, -0.0005, -0.004, 0.0012, MAT.BONE, { tex: teethTex });   // the lower teeth
  b.pop();
  for (const s of [-1, 1]) {
    b.ball(s * 0.0068, 0.0005, -0.0128, 0.0052, MAT.BLACK, 6);                         // the eye sockets
    b.ball(s * 0.0068, 0.0005, -0.0168, 0.0013 + 0.0013 * Math.min(glow, 1) + 0.0016 * Math.max(0, glow - 1), glow > 1.5 ? MAT.FLAME : glow > 0.3 ? MAT.EMBER : MAT.RED, 5);   // the embers in them
    horn(b, s);
  }
  b.box(0.0058, -0.0115, -0.0128, 0.0074, -0.0035, -0.0118, MAT.RED);                  // a dried tear of blood down from one socket
  b.cbox(-0.0145, 0.0035, -0.0165, 0.0145, 0.0085, -0.006, 0.0025, MAT.BONE);       // the brow, heavy over the sockets
  b.prz([[-0.0022, -0.006], [0.0022, -0.006], [0, -0.0015]], -0.0175, -0.012, MAT.BLACK);   // the nose
  b.pop();
}

/** A segment of glove from `p` to `q` (local points), tapering from `r0` to `r1`: a finger. */
function limb(b: Builder, p: readonly number[], q: readonly number[], r0: number, r1: number): void {
  const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], len = Math.hypot(dx, dy, dz);
  b.push(); b.translate(p[0], p[1], p[2]); b.yaw(Math.atan2(dx, dz)); b.pitch(-Math.atan2(dy, Math.hypot(dx, dz)));
  b.cyl(0, 0, 0, len, r0, r1, 6, MAT.GLOVE);
  b.pop();
}

/**
 * The left hand pinching a shell by its brass rim, the shell's base at the origin and its hull along +z: the back of the hand low and
 * outside, two fingers and the thumb up round the rim, the arm away down to the left. Fingers, not a fist: the shell is held between
 * the eye and the breech, and a closed fist there hid the whole reload.
 */
function pinch(b: Builder): void {
  const W = [-0.034, -0.046, -0.012];
  b.ball(W[0], W[1], W[2], 0.017, MAT.GLOVE, 7);                                            // the back of the hand
  limb(b, W, [-0.019, -0.009, 0.004], 0.0095, 0.0085); limb(b, [-0.019, -0.009, 0.004], [-0.008, 0.004, 0.008], 0.0085, 0.0075);   // the index
  limb(b, [W[0] + 0.006, W[1] - 0.004, W[2] + 0.008], [-0.016, -0.018, 0.016], 0.0095, 0.0085); limb(b, [-0.016, -0.018, 0.016], [-0.004, -0.017, 0.014], 0.0085, 0.0075);   // the middle
  limb(b, [W[0] + 0.012, W[1] + 0.004, W[2]], [0.014, -0.02, -0.002], 0.0105, 0.009);       // the thumb, under the rim
  forearm(b, W[0] - 0.006, W[1] - 0.01, W[2] - 0.01, [-0.45, -1, -0.25], 0.03);
}

/** A quick bump that rings down: 0 at `t0`, up and back over `len`, with a smaller swing after it (a snap, a flick). */
function snap(t: number, t0: number, len: number): number {
  if (t < t0) return 0;
  const u = (t - t0) / len;
  return u >= 2 ? 0 : Math.sin(u * Math.PI) * Math.exp(-u * 1.4);
}

export const flarePistol: WeaponArt = {
  name: "FLARE PISTOL",
  hold: { x: 0.028, y: -0.078, z: 0.34, pitch: 0.1, yaw: -0.05, roll: 0 },  // a little right of centre, square to the screen, looking ahead (owner, 2026-10-20: option 3, "biraz daha dik")
  present: { y: 0.05, pitch: 0.15, roll: 0 },   // the reload brought up into view (pose.ts)
  kick: { back: 0.065, lift: 0.12 },
  action: (p) => 1 - ramp(p, ...FLARE.cock),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload, a = pose.action, R0 = r < 0;
    // ---- the reload's timeline (0..1 of its 2 s): the phases the foley follows (phases.ts), and the moves between them
    const opened = R0 ? 0 : hump(r, ...FLARE.open);                                    // breech angle 0..1, open at .18, shut at .88
    const close = R0 ? 0 : Math.min(1, Math.max(0, (r - 0.78) / 0.1));                 // the barrel slapped shut: it speeds up into the stop
    const open = R0 ? 0 : (r > 0.78 ? 1 - close * close : opened) * (1 + 0.16 * snap(r, 0.18, 0.07));   // and flops once on its hinge as it falls open
    const tilt = R0 ? 0 : hump(r, 0.0, 0.98, 0.14);                                  // the whole gun canted and dipped to show the breech
    const breakFlick = R0 ? 0 : snap(r, 0.07, 0.06);                                 // the wrist snaps down to break it open
    const shutFlick = R0 ? 0 : snap(r, 0.88, 0.05);                                  // and flicks up as it slams shut
    b.translate(0, -0.03 * tilt - 0.012 * breakFlick, 0);
    b.roll(-0.35 * tilt); b.pitch(-0.25 * tilt - 0.16 * breakFlick + 0.12 * shutFlick); b.yaw(0.2 * tilt);

    // ---- the fire: the skull is the hammer. It falls at the shot (a = 1), jaw dropped; the thumb comes up onto its crown and rolls it
    // back as the action runs down (a 1 -> 0, FLARE.cock), the jaw shutting with it, and leaves it cocked
    const fall = a > 0.67 ? 1 : Math.max(0, (a - 0.12) / 0.55);
    const reach = a <= 0 ? 0 : a > 0.67 ? (1 - a) * 3 : a > 0.12 ? 1 : a / 0.12;
    const rattle = R0 ? 0 : 0.45 * Math.abs(Math.sin((r - 0.88) * 140)) * snap(r, 0.88, 0.06);   // its teeth chatter as the barrel slams
    const jaw = Math.min(1, a * 1.5) + rattle;
    // the embers: alive while loaded, flaring white with the shot's flash; gone the moment the breech opens, and lit again back to front
    // once it is shut (the eyes last)
    const ignite = R0 ? (pose.empty ? 0 : 1) : r < 0.2 ? 1 - ramp(r, 0.06, 0.16) : ramp(r, 0.88, 0.97);
    const flash = R0 ? pose.heat : 0;
    const slit = (i: number): number => (ignite > (i + 1) / 4 ? (flash > 0.45 ? MAT.FLAME : MAT.EMBER) : MAT.BLACK);
    const eyes = ignite > 0.85 ? 1 + flash : ignite * 0.25;

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
      const t = Math.PI / 2 + (i - 4) * 0.62;
      b.push(); b.translate(Math.cos(t) * R * 1.3, CY + Math.sin(t) * R * 1.3, 0.186); b.pitch(Math.sin(t) * 0.95); b.yaw(Math.cos(t) * 0.95);
      fang(b, 0, 0, 0, 0.022, 0.0048, MAT.BONE);
      b.pop();
    }
    // the slits along its top and right side, the flare smouldering behind them, lit back to front
    [0.035, 0.088, 0.14].forEach((z, i) => {
      for (const t of [0.0, 0.55]) {
        b.push(); b.translate(0, CY, 0); b.roll(-t);
        b.box(-0.0035, R - 0.0026, z, 0.0035, R + 0.0008, z + 0.024, slit(i));
        b.pop();
      }
    });
    b.cbox(-0.0045, CY + R - 0.002, 0.0, 0.0045, CY + R + 0.006, 0.156, 0.0015, MAT.IRON);   // the top rib
    for (const z of [0.04, 0.092, 0.144]) { b.push(); b.translate(0, CY + R + 0.005, z); b.pitch(1.1); fang(b, 0, 0, 0, 0.016, 0.0036, MAT.IRON); b.pop(); }   // the barbs along it, raked back
    skull(b, eyes, jaw, fall);
    if (open > 0.25) {
      // the open bore, red-hot from the shots and cooling while it stands open
      b.cyl(0, CY, -0.032, -0.03, 0.018, 0.018, 12, r < 0.42 ? MAT.EMBER : MAT.BLACK);
      if (r > 0.17 && r < 0.36) {                                                       // the spent shell kicks up out of it, tumbling, and over the shoulder
        const u = (r - 0.17) / 0.19;
        b.push(); b.translate(0.09 * u, CY + 0.06 * u - 0.15 * u * u, -0.04 - 0.035 * u); b.pitch(-0.5 - 7 * u); b.roll(1.5 * u); shell(b, -0.035); b.pop();
      }
      const push = ramp(r, ...FLARE.push);
      // the fresh shell: up from below and the left to behind the bore (.28-.46), pushed home (.48-.6), seated till the barrel shuts
      const inn = ramp(r, 0.28, 0.46);
      if (r > 0.28 && r < 0.86) {
        const u = 1 - inn;
        b.push(); b.translate(-0.07 * u, CY - 0.12 * u, -0.03 - 0.045 * (1 - push) + 0.03 * u); b.roll(0.9 * u); b.pitch(-0.6 * u);
        shell(b, 0);
        b.pop();
      }
      // the left hand that brings it, its fingers round the hull, and lets go at the bottom of the push and drops away
      const leave = ramp(r, 0.6, 0.74);
      if (r > 0.28 && r < 0.74) {
        const u = 1 - inn;
        b.push(); b.translate(-0.07 * u - 0.05 * leave, CY - 0.12 * u - 0.12 * leave, -0.03 - 0.045 * (1 - push) + 0.03 * u);
        b.roll(0.9 * u); b.pitch(-0.6 * u);
        pinch(b);
        b.pop();
      }
    }
    b.anchor("muzzle", 0, CY, 0.19);
    b.pop();

    // right hand on the grip, finger on the trigger; its thumb rolls the skull back after the shot
    b.push();
    b.translate(0, 0, -0.004); b.pitch(-0.2);
    fist(b, 1, { trigger: true, w: 0.0155, thumb: false });
    const [tx, ty, tz] = THUMB(1, 0.0155);
    b.push(); b.translate(tx, ty, tz); b.yaw(0.12 - 0.2 * reach); b.pitch(1.3 * reach);
    b.cyl(0, 0, 0, 0.03 + 0.008 * reach, 0.0108, 0.0098, 6, MAT.GLOVE);                 // the thumb's first joint
    b.translate(0, 0, 0.03 + 0.008 * reach); b.pitch(0.5 * reach);
    b.cyl(0, 0, -0.002, 0.024, 0.0098, 0.0082, 6, MAT.GLOVE);                           // and its tip, hooked over the crown as it pulls
    b.pop();
    b.pop();
    forearm(b, 0.012, -0.06, -0.06, [0.3, -0.5, -1], 0.03);
  },
};
