import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  extension, kickElapsed, legPose, aside, leanAmount, withKickLean, LEAN, ASIDE,
  KICK_CHAMBER, KICK_HOLD, KICK_RECHAMBER,
} from "../../src/render/viewmodel/kick";
import { KICK_ANIM, KICK_HIT_T } from "../../src/weapons/WeaponRuntime";
import { Raster, RW } from "../../src/render/viewmodel/raster";
import { renderWeapon, CLEAR_BELOW } from "../../src/render/viewmodel/rig";
import { restPose, type Pose } from "../../src/render/viewmodel/pose";
import { WEAPON_ART } from "../../src/render/viewmodel/arts";
import { MAT } from "../../src/render/viewmodel/palette";
import { Animator, type AnimInput } from "../../src/render/viewmodel/animate";
import { WEAPON_STATS } from "../../src/weapons/definitions";

/**
 * The power kick as drawn — src/render/viewmodel/kick.ts, player feedback
 * round 2, Task 3 (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md).
 * The owner said "fix the kick animation"; the reference's boot (a few canvas
 * rectangles sliding up from the bottom edge — viewmodel.test.ts records that
 * divergence) became a modelled leg with a wind-up, a strike and a recovery.
 *
 * What is pinned, above all: **the strike's full extension lands on the
 * frame the game resolves the kick's hit, and on no earlier frame**, at any
 * frame rate. doKick sets kickAnim=.32 and schedules its hit test .110 s of
 * scaled time later; both clocks run on Loop.ts's hit-stop-scaled dt. This
 * file proves it on the game's own arithmetic; tests/integration/kickTiming.test.ts
 * proves it through the real doKick, the real Loop and the real scheduler.
 *
 * Also pinned: the leg is a trouser and a boot with a sole and a heel,
 * rendered in the weapons' raster; it drives into the centre of the screen
 * (the kick is exempt from the weapons' line-of-fire rule — that is its
 * point); the weapon swings aside and comes back exactly to rest; and the
 * view's lean is applied only around the render and undone exactly.
 */

const CX = 160, CY = 110;
const DT = 1 / 60;

/** The pose the real Animator builds at a given kickAnim, weapon standing still, after it has settled. */
function animated(slot: number, kickAnims: number[]): Pose[] {
  const a = new Animator();
  const base: AnimInput = {
    cur: slot, vx: 0, vz: 0, vy: 0, grounded: true, yaw: 0, sprintKey: false, bobT: 0, wstate: "idle", wtime: 1,
    equipT: 0.24, unequipT: 0.16, kickAmt: 0, kickRot: 0, kickAnim: 0, swayX: 0, swayY: 0, muzzle: 0,
    cueHurt: 0, cueHurtAmt: 0, cuePickup: 0, cueDryFire: 0, cueInput: 0,
  };
  for (let i = 0; i < 30; i++) a.step(DT, 0, base, WEAPON_STATS[slot], WEAPON_ART[slot]);
  return kickAnims.map((k) => a.step(DT, 0, { ...base, kickAnim: k }, WEAPON_STATS[slot], WEAPON_ART[slot]));
}
function render(slot: number | null, pose: Pose): { r: Raster; anchors: Record<string, [number, number]> } {
  const r = new Raster();
  const anchors = renderWeapon(r, slot === null ? null : WEAPON_ART[slot], pose, CX, CY);
  return { r, anchors };
}
function kickPose(t: number): Pose {
  const p = restPose(); p.kick = t; return p;
}
/** Opaque pixels per material. */
function materials(r: Raster): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of r.col) if (c) m.set(c >> 3, (m.get(c >> 3) ?? 0) + 1);
  return m;
}
const LEG_MATS: number[] = [MAT.TROUSER, MAT.BOOT, MAT.BLACK, MAT.IRON];

describe("the kick's timing is the game's", () => {
  it("KICK_ANIM and KICK_HIT_T are exactly what doKick does: kickAnim=.32, hit test scheduled .110 s later", () => {
    const src = readFileSync(join(__dirname, "..", "..", "src", "weapons", "WeaponState.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
    const kick = src.slice(src.indexOf("export function doKick"));
    expect(Number(/weaponRuntime\.kickAnim=([0-9.]+)/.exec(kick)![1])).toBe(KICK_ANIM);
    expect(Number(/schedule\([\s\S]*?\},\s*([0-9.]+)\s*\)/.exec(kick)![1])).toBe(KICK_HIT_T);
    expect([KICK_ANIM, KICK_HIT_T]).toEqual([0.32, 0.110]);
  });

  it("wind-up, strike, hold, recovery: extension is 0 through the wind-up, rises strictly, is below 1 at every moment before the hit, exactly 1 from the hit to KICK_HOLD, then falls back to 0", () => {
    expect(KICK_CHAMBER).toBeGreaterThan(0);
    expect(KICK_CHAMBER).toBeLessThan(KICK_HIT_T);
    for (let t = 0; t <= KICK_CHAMBER; t += 0.001) expect(extension(t)).toBe(0);
    let prev = 0;
    for (let t = KICK_CHAMBER + 0.001; t < KICK_HIT_T - 1e-6; t += 0.001) {
      const e = extension(t);
      expect(e).toBeGreaterThan(prev);
      expect(e).toBeLessThan(1);
      prev = e;
    }
    expect(extension(KICK_HIT_T - 1e-6)).toBeLessThan(1);
    for (let t = KICK_HIT_T; t <= KICK_HOLD; t += 0.001) expect(extension(t)).toBe(1);
    prev = 1;
    for (let t = KICK_HOLD + 0.001; t <= KICK_ANIM; t += 0.002) {
      const e = extension(t);
      expect(e).toBeLessThanOrEqual(prev);
      prev = e;
    }
    expect(extension(KICK_RECHAMBER)).toBe(0);
    // it snaps: the last stretch before the lock-out moves the leg further than the first
    const d = (a: number, b: number) => extension(b) - extension(a);
    expect(d(KICK_HIT_T - 0.015, KICK_HIT_T - 1e-6)).toBeGreaterThan(d(KICK_CHAMBER, KICK_CHAMBER + 0.015));
  });

  // Loop.ts's order in one frame: weaponTick (kickAnim -= dt) ... tickScheduled (the hit test's
  // countdown -= dt, firing at <= 0) ... then the overlay draws with the frame's kickAnim.
  const RATES: Array<[string, (i: number) => number]> = [
    ["144 fps", () => 1 / 144], ["60 fps", () => 1 / 60], ["30 fps", () => 1 / 30], ["20 fps (the .05 cap)", () => 0.05],
    ["uneven", (i) => [0.011, 0.023, 0.017, 0.041, 0.009, 0.05, 0.013][i % 7]],
    ["hit-stop mid-strike", (i) => (i > 3 && i < 9 ? (1 / 60) * 0.08 : 1 / 60)],
  ];
  for (const [label, dtAt] of RATES) {
    it(`${label}: the drawn frame on which the hit lands is the first to show full extension, and the view's lean peaks with it`, () => {
      let kickAnim = 0.32, left = 0.110, hitFrame = -1;
      const drawn: number[] = [];
      for (let i = 0; i < 400 && kickAnim > 0; i++) {
        const dt = dtAt(i);
        kickAnim = Math.max(0, kickAnim - dt);
        left -= dt;
        if (hitFrame < 0 && left <= 0) hitFrame = i;
        drawn.push(extension(kickElapsed(kickAnim)));
        if (hitFrame === i) {
          expect(extension(kickElapsed(kickAnim))).toBe(1);
          expect(leanAmount(kickElapsed(kickAnim))).toBe(1);
        }
      }
      expect(hitFrame).toBeGreaterThan(0);
      for (let i = 0; i < hitFrame; i++) expect(drawn[i]).toBeLessThan(1);
      expect(Math.max(...drawn)).toBe(1);
    });
  }

  it("reads kickAnim, never writes it: -1 with no kick, elapsed seconds during one", () => {
    expect(kickElapsed(0)).toBe(-1);
    expect(kickElapsed(-0.01)).toBe(-1);
    expect(kickElapsed(0.32)).toBe(0);
    expect(kickElapsed(0.2)).toBeCloseTo(0.12, 12);
    expect(legPose(-1)).toBeNull();
    expect(legPose(KICK_ANIM)).toBeNull();
  });
});

describe("the leg, drawn", () => {
  it("at the hit it is a trouser leg and a boot with a sole and an iron-shod heel, and the boot is on the crosshair", () => {
    const { r, anchors } = render(null, kickPose(KICK_HIT_T));
    const m = materials(r);
    expect(m.get(MAT.TROUSER) ?? 0).toBeGreaterThan(1500);
    expect(m.get(MAT.BOOT) ?? 0).toBeGreaterThan(1200);
    expect(m.get(MAT.BLACK) ?? 0).toBeGreaterThan(60);   // the sole's edge shows
    expect(m.get(MAT.IRON) ?? 0).toBeGreaterThan(8);     // the heel plate shows
    const c = r.col[CY * RW + CX];
    expect(c, "the crosshair pixel is covered").not.toBe(0);
    expect([MAT.BOOT, MAT.BLACK, MAT.IRON, MAT.OUT]).toContain(c >> 3);
    const [fx, fy] = anchors.foot;
    expect(Math.hypot(fx - CX, fy - CY)).toBeLessThan(20);
  });

  it("drives forward into the centre: the foot closes on the crosshair every frame of the strike and is nearest it on the hit", () => {
    const dist = (t: number) => { const f = render(null, kickPose(t)).anchors.foot; return f ? Math.hypot(f[0] - CX, f[1] - CY) : Infinity; };
    const strike = [0.06, 0.07, 0.08, 0.09, 0.1, KICK_HIT_T];
    for (let i = 1; i < strike.length; i++) expect(dist(strike[i])).toBeLessThan(dist(strike[i - 1]));
    const atHit = dist(KICK_HIT_T);
    for (let t = 0.005; t < KICK_ANIM; t += 0.005) expect(dist(t)).toBeGreaterThanOrEqual(atHit - 1e-9);
  });

  it("comes up out of the bottom of the frame and goes back down it: almost nothing of it in the first and last frames", () => {
    const legPixels = (t: number) => { const m = materials(render(null, kickPose(t)).r); return LEG_MATS.reduce((n, k) => n + (m.get(k) ?? 0), 0); };
    expect(legPixels(0.017)).toBeLessThan(200);
    expect(legPixels(0.3)).toBeLessThan(200);
    expect(legPixels(KICK_HIT_T)).toBeGreaterThan(3000);
    expect(legPixels(0.08)).toBeGreaterThan(legPixels(0.017));
  });

  it("is exempt from the weapons' line-of-fire rule: at the hit the boot is far above the line every weapon must stay under", () => {
    const { r } = render(null, kickPose(KICK_HIT_T));
    const line = CY + CLEAR_BELOW * 180;
    let top = Infinity;
    for (let i = 0; i < r.col.length; i++) if (r.col[i]) { top = Math.floor(i / RW); break; }
    expect(top).toBeLessThan(line - 30);
    expect(top).toBeLessThan(CY);
  });

  it("is deterministic and draws nothing from Math.random", () => {
    const original = Math.random;
    let draws = 0;
    Math.random = () => { draws++; return original(); };
    try {
      for (const t of [0.03, 0.08, KICK_HIT_T, 0.2]) {
        const a = render(2, kickPose(t)), b = render(2, kickPose(t));
        expect(Buffer.from(a.r.col).equals(Buffer.from(b.r.col))).toBe(true);
      }
    } finally {
      Math.random = original;
    }
    expect(draws).toBe(0);
  });
});

describe("the weapon gets out of the way, and comes back", () => {
  it("through the real Animator: swung down and aside during the kick, exactly at rest once it ends", () => {
    for (const slot of [0, 2, 5]) {
      const [rest, windup, hit, recover, after] = animated(slot, [0, 0.32 - 0.04, 0.32 - KICK_HIT_T, 0.32 - 0.3, 0]);
      expect(windup.y).toBeLessThan(rest.y);
      expect(hit.roll - rest.roll).toBeCloseTo(ASIDE.roll, 12);          // fully aside while the leg is out
      expect(hit.pitch - rest.pitch).toBeCloseTo(ASIDE.pitch, 12);
      expect(Math.abs(recover.roll - rest.roll)).toBeLessThan(Math.abs(ASIDE.roll) * 0.2); // mostly back
      expect(after).toEqual(rest);
      const r0 = render(slot, rest).anchors.muzzle, r1 = render(slot, { ...hit, kick: -1 }).anchors.muzzle;
      expect(r1[1] - r0[1]).toBeGreaterThan(8);                             // the muzzle drops away
      expect(aside(0)).toBe(0);
    }
  });
});

describe("the view leans into the kick — at render time only", () => {
  function camera(): THREE.PerspectiveCamera {
    const c = new THREE.PerspectiveCamera(78, 1.6, 0.05, 100);
    c.position.set(3.25, 1.62, -7.5);
    c.rotation.order = "YXZ";
    c.rotation.y = 2.1; c.rotation.x = 0.13; c.rotation.z = 0.004;
    c.updateMatrixWorld(true);
    return c;
  }
  it("leans the camera forward and down inside the render, and afterwards it is bit-for-bit the camera it was", () => {
    const cam = camera(), control = camera();
    let seen: { x: number; z: number; px: number; pz: number; py: number } | null = null;
    withKickLean(cam, 0.32 - KICK_HIT_T, () => {
      seen = { x: cam.rotation.x, z: cam.rotation.z, px: cam.position.x, pz: cam.position.z, py: cam.position.y };
    });
    expect(seen).not.toBeNull();
    const s = seen!;
    expect(s.x).toBeCloseTo(control.rotation.x + LEAN.pitch, 12);   // pitched down
    expect(s.z).toBeCloseTo(control.rotation.z + LEAN.roll, 12);
    expect(s.py).toBeCloseTo(control.position.y - LEAN.drop, 12);
    // pushed forward along the facing (Player.ts's forward is (-sin yaw, -cos yaw))
    const fwd = (s.px - control.position.x) * -Math.sin(2.1) + (s.pz - control.position.z) * -Math.cos(2.1);
    expect(fwd).toBeCloseTo(LEAN.fwd, 12);
    expect(cam.position.toArray()).toEqual(control.position.toArray());
    expect(cam.rotation.toArray()).toEqual(control.rotation.toArray());
    expect(cam.quaternion.toArray()).toEqual(control.quaternion.toArray());
    expect(cam.matrixWorld.toArray()).toEqual(control.matrixWorld.toArray());
  });

  it("does nothing at all with no kick running, and still restores the camera if the render throws", () => {
    const cam = camera(), control = camera();
    withKickLean(cam, 0, () => { expect(cam.rotation.x).toBe(control.rotation.x); });
    expect(() => withKickLean(cam, 0.2, () => { throw new Error("render failed"); })).toThrow("render failed");
    expect(cam.rotation.toArray()).toEqual(control.rotation.toArray());
    expect(cam.position.toArray()).toEqual(control.position.toArray());
  });

  it("builds through the strike, peaks on the hit, holds while the foot is planted and settles to nothing", () => {
    expect(leanAmount(0)).toBe(0);
    for (let i = 1; i <= 10; i++) expect(leanAmount(i * 0.01)).toBeLessThan(1);
    expect(leanAmount(KICK_HIT_T)).toBe(1);
    expect(leanAmount(KICK_HOLD)).toBe(1);
    expect(leanAmount(0.3)).toBeLessThan(0.05);
    expect(leanAmount(KICK_ANIM)).toBe(0);
  });
});
