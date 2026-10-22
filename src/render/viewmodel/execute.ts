import type { Builder } from "./builder";
import { MAT } from "./palette";
import { fist, forearm, openHand } from "./hands";
import type { Pose, WeaponArt } from "./pose";
import { STANCE } from "./rig";

/**
 * THE HANDS OF A FINISH (owner, 2026-10-22: "vahşice animasyonlu öldürelim"; `src/player/Execution.ts` runs it). The weapon is down and
 * the two gloved hands do the work, in front of the eye and square to it (the stance's offset is taken back out: this is not held right
 * and low like a gun). `pose.exec` is the seconds into the finish, `pose.execKind` which finish:
 *
 *  0 THE HEAD  — both hands go out and take the head, wrench it once (the gloves come back red), and tear it off: the hands snap back
 *                toward the eye with what they tore.
 *  1 THE SKULL — the left hand takes the throat; the right fist draws back and smashes in, twice, then a third, harder, that bursts it.
 *  2 THE ARM   — both hands take an arm low, rip it out (the left hand comes back holding it), and the right fist takes the head.
 *
 * The blows land at `Execution.ts`'s `BLOWS` (.32, .56, .82 s); every move here is a pure function of the time, no dice.
 */

const BLOWS = [0.32, 0.56, 0.82] as const;
const smooth = (u: number): number => { const v = u < 0 ? 0 : u > 1 ? 1 : u; return v * v * (3 - 2 * v); };
const span = (t: number, a: number, b: number): number => smooth((t - a) / (b - a));
type V = [number, number, number];
const mix = (a: V, b: V, u: number): V => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

const claw = (b: Builder, side: 1 | -1, curl: number): void => openHand(b, side, curl);   // ./hands.ts

/** Blood on a glove: a few wet red beads over its knuckles and back, more as `n` grows. */
function gore(b: Builder, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const h = (k: number): number => { const s = Math.sin((seed + i) * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
    b.ball((h(1) - 0.5) * 0.05, 0.008 + h(2) * 0.012, (h(3) - 0.3) * 0.06, 0.0025 + 0.003 * h(4), MAT.RED, 5);
  }
}

/** The right fist's punch at blow `i`: drawn back over the 0.14 s before it, driven in over the last 0.04, held, and back. 0..1 forward. */
function punch(t: number, at: number): number {
  if (t < at - 0.16 || t > at + 0.2) return -1;
  if (t < at - 0.04) return -span(t, at - 0.16, at - 0.06) * 0.6;                            // the draw back: below zero
  if (t < at) return -0.6 + 1.6 * span(t, at - 0.04, at);
  if (t < at + 0.06) return 1;
  return 1 - span(t, at + 0.06, at + 0.2);
}

/** Up out of the bottom of the frame over the first fifth of a second, and back down after 1.05 s. */
const raise = (t: number): number => Math.min(span(t, 0.0, 0.18), 1 - span(t, 1.05, 1.25));

function drawLeft(b: Builder, kind: number, t: number, up: number): void {
  const out: V = kind === 2 ? [-0.06, -0.06, 0.44] : kind === 1 ? [-0.05, -0.02, 0.44] : [-0.055, 0.035, 0.4];
  const rest: V = [-0.12, -0.2, 0.08];
  const reach = span(t, 0.12, 0.3);
  // held on it, wrenched at the second blow, torn back toward the eye at the third (the head, the arm) or let go (the skull)
  const wrench = kind !== 1 ? Math.max(0, 1 - Math.abs(t - BLOWS[1]) / 0.08) : 0;
  const tear = kind === 0 ? span(t, BLOWS[2] - 0.03, BLOWS[2] + 0.08) : kind === 2 ? span(t, BLOWS[1] - 0.03, BLOWS[1] + 0.1) : 0;
  const away = kind === 1 ? span(t, BLOWS[2] + 0.02, BLOWS[2] + 0.2) : 0;
  let p = mix(rest, out, reach * (1 - away));
  p = mix(p, [-0.07, -0.05, 0.24], tear);
  const shake = reach * (1 - tear) * Math.sin(t * 80) * 0.004 + wrench * 0.025;
  b.push();
  b.translate(p[0] + shake, p[1] - 0.25 * (1 - up) + wrench * 0.01, p[2] - wrench * 0.04);
  b.roll(0.45 + 0.4 * wrench); b.pitch(0.6 - 0.7 * tear);
  claw(b, -1, 0.15 + 0.85 * reach);
  if (t > BLOWS[0]) gore(b, t > BLOWS[1] ? 7 : 3, 3);
  if (kind === 2 && tear > 0.5) {   // the arm it tore out, hanging from the fist: the shoulder's raw end, the bone, the hand at the far end
    b.push(); b.translate(0, -0.02, 0.03); b.pitch(-1.1);
    b.cyl(0, 0, 0, 0.2, 0.032, 0.024, 7, MAT.SKIN);
    b.ball(0, 0, 0, 0.034, MAT.RED, 6);
    b.cyl(0, 0, -0.03, 0.0, 0.01, 0.01, 5, MAT.BONE);
    b.ball(0, 0, 0.21, 0.026, MAT.SKIN, 6);
    b.pop();
  }
  if (kind === 0 && tear > 0.5) {   // what the hands tore: strings of it, red and dripping, out of the fist
    for (let i = 0; i < 4; i++) { b.push(); b.translate(-0.02 + i * 0.013, -0.01, 0.03); b.pitch(-1.2 - 0.15 * i); b.cyl(0, 0, 0, 0.05 + 0.02 * i, 0.006, 0.002, 5, MAT.RED); b.pop(); }
  }
  b.pop();
  forearm(b, p[0] - 0.01, p[1] - 0.25 * (1 - up) - 0.03, p[2] - 0.05, [-0.35, -0.55, -1], 0.03);
}

function drawRight(b: Builder, kind: number, t: number, up: number): void {
  const rest: V = [0.11, -0.08, 0.16];
  if (kind === 0) {   // the right hand takes the head too, and tears with the left
    const reach = span(t, 0.14, 0.32), tear = span(t, BLOWS[2] - 0.03, BLOWS[2] + 0.08);
    const wrench = Math.max(0, 1 - Math.abs(t - BLOWS[1]) / 0.08);
    let p = mix(rest, [0.055, 0.035, 0.4], reach);
    p = mix(p, [0.08, -0.04, 0.24], tear);
    b.push(); b.translate(p[0] - wrench * 0.02, p[1] - 0.25 * (1 - up), p[2] - wrench * 0.04);
    b.roll(-0.45 - 0.4 * wrench); b.pitch(0.6 - 0.7 * tear);
    claw(b, 1, 0.15 + 0.85 * reach);
    if (t > BLOWS[0]) gore(b, t > BLOWS[1] ? 6 : 2, 11);
    b.pop();
    forearm(b, p[0] + 0.01, p[1] - 0.25 * (1 - up) - 0.03, p[2] - 0.05, [0.35, -0.55, -1], 0.03);
    return;
  }
  // the fist: the skull's three blows, or the arm's last
  let fwd = 0;
  for (let i = kind === 2 ? 2 : 0; i < 3; i++) { const v = punch(t, BLOWS[i]); if (v !== -1) fwd = v; }
  const hit: V = [0.025, 0.02, 0.47];
  const p = fwd >= 0 ? mix(rest, hit, fwd) : mix(rest, [0.14, -0.12, 0.05], -fwd);
  b.push(); b.translate(p[0], p[1] - 0.25 * (1 - up), p[2]);
  b.pitch(0.25 + 0.5 * Math.max(0, fwd)); b.roll(-0.25);
  fist(b, 1, { w: 0.014 });
  if (t > BLOWS[kind === 2 ? 2 : 0]) gore(b, t > BLOWS[1] ? 8 : 4, 21);
  b.pop();
  forearm(b, p[0] + 0.01, p[1] - 0.25 * (1 - up) - 0.07, p[2] - 0.06, [0.3, -0.5, -1], 0.031);
}

export const EXEC_ART: WeaponArt = {
  name: "HANDS",
  // in front of the eye and square to it: the stance (rig.ts), which holds the guns right and low, taken back out
  hold: { x: -STANCE.x, y: 0.02 - STANCE.y, z: 0.3 - STANCE.z, pitch: -STANCE.pitch, yaw: -STANCE.yaw, roll: 0 },
  kick: { back: 0, lift: 0 },
  action: () => 0,
  draw(b: Builder, pose: Pose) {
    const t = pose.exec, kind = pose.execKind;
    if (t < 0) return;
    const up = raise(t);
    drawLeft(b, kind, t, up);
    drawRight(b, kind, t, up);
    b.anchor("muzzle", 0, 0, 0.5);
  },
};
