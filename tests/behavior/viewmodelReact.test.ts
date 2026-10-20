import { describe, expect, it } from "vitest";
import { Reactions, FIDGET_AFTER, FIDGET_CANCEL, FIDGET_LEN, type CueInput, type Reaction } from "../../src/render/viewmodel/react";
import { Animator, SWITCH, type AnimInput } from "../../src/render/viewmodel/animate";
import { Raster } from "../../src/render/viewmodel/raster";
import { renderWeapon } from "../../src/render/viewmodel/rig";
import { WEAPON_ART } from "../../src/render/viewmodel/arts";
import { WEAPON_STATS } from "../../src/weapons/definitions";
import type { Pose } from "../../src/render/viewmodel/pose";

/**
 * The hands react — src/render/viewmodel/react.ts and the switch arc in
 * ./animate.ts, player feedback round 2, Task 4
 * (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md): a hurt
 * flinch, a dry-fire jerk and cant, a pickup nod, an idle fidget cancelled
 * by any input, and a switch that rotates and arcs.
 *
 * "Each must read on screen, or it is not worth its code": each motion is
 * held to a minimum number of changed pixels on the real rendered weapon,
 * not just a nonzero number. Each settles back to exactly the rest pose.
 * The line-of-fire guarantee for all of them, through the real drawViewmodel
 * at three aspect ratios, is in viewmodel.test.ts; that the gameplay hooks
 * bump the cues (and change nothing else) is tests/integration/animCues.test.ts.
 */

const DT = 1 / 60;
const QUIET: CueInput = { hurt: 0, hurtAmt: 0, pickup: 0, dryFire: 0, input: 0, busy: false };
const ZERO = { x: 0, y: 0, pitch: 0, yaw: 0, roll: 0, fidget: 0 };
const mag = (r: Reaction) => Math.abs(r.x) * 10 + Math.abs(r.y) * 10 + Math.abs(r.pitch) + Math.abs(r.yaw) + Math.abs(r.roll);

function run(r: Reactions, frames: number, c: CueInput, dt = DT): Reaction[] {
  const out: Reaction[] = [];
  for (let i = 0; i < frames; i++) out.push(r.step(dt, c));
  return out;
}

/** Pixels that differ between the weapon at rest and the weapon with a reaction's rig terms added. */
function pixelsMoved(slot: number, rx: Omit<Reaction, "fidget">): number {
  const rest = new Raster(), moved = new Raster();
  const p0: Pose = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0, sx: 0, sy: 0, recoil: 0, action: 0, spin: 0, reload: -1, heat: 0, kick: -1 };
  renderWeapon(rest, WEAPON_ART[slot], p0, 160, 110);
  renderWeapon(moved, WEAPON_ART[slot], { ...p0, ...rx }, 160, 110);
  let n = 0;
  for (let i = 0; i < rest.col.length; i++) if (rest.col[i] !== moved.col[i]) n++;
  return n;
}
/** The frame of a reaction's run that moves the weapon most, as changed pixels. */
function mostPixels(slot: number, frames: Reaction[]): number {
  let best = 0;
  for (const f of frames) best = Math.max(best, pixelsMoved(slot, f));
  return best;
}

describe("the cues", () => {
  it("the first frame is never an event: counters already up when the animator starts do nothing", () => {
    const r = new Reactions();
    expect(r.step(DT, { ...QUIET, hurt: 7, hurtAmt: 30, pickup: 3, dryFire: 9, input: 400 })).toEqual(ZERO);
  });
});

describe("hurt flinch", () => {
  it("jolts the weapon on a hit — hard enough to read on every weapon — and settles back to exactly rest within half a second", () => {
    for (const slot of [0, 2, 4, 5, 7]) {
      const r = new Reactions();
      r.step(DT, QUIET);
      const f = run(r, 40, { ...QUIET, hurt: 1, hurtAmt: 20 });
      const peak = f.reduce((a, b) => (mag(b) > mag(a) ? b : a));
      expect(f.indexOf(peak)).toBeLessThanOrEqual(4);                   // a jolt, not a drift: peaks within 4 frames
      expect(peak.pitch).toBeLessThan(-0.1);                            // the muzzle knocked down
      expect(mostPixels(slot, f.slice(0, 8)), `slot ${slot}`).toBeGreaterThan(400);
      expect(f[29]).toEqual(ZERO);                                      // gone within half a second
    }
  });

  it("scales with the damage, and never tips the gun over: a Doom gun drops, it does not cant (owner, 2026-10-20)", () => {
    const peak = (hits: number, amt: number) => {
      const r = new Reactions(); r.step(DT, QUIET);
      const f = run(r, 6, { ...QUIET, hurt: hits, hurtAmt: amt });
      for (const x of f) expect([x.roll + 0, x.yaw + 0, x.x + 0]).toEqual([0, 0, 0]);
      return f.reduce((a, b) => Math.min(a, b.pitch), 0);
    };
    expect(Math.abs(peak(1, 40))).toBeGreaterThan(Math.abs(peak(1, 5)) * 1.4);
  });
});

describe("dry fire", () => {
  it("jerks with the squeeze and drops the empty weapon a little — readable, never canted — then comes back to exactly rest", () => {
    for (const slot of [0, 1, 3, 6]) {
      const r = new Reactions(); r.step(DT, QUIET);
      const f = run(r, 60, { ...QUIET, dryFire: 1 });
      expect(Math.min(...f.slice(0, 6).map((x) => x.pitch))).toBeLessThan(-0.05); // the jerk
      expect(Math.min(...f.map((x) => x.y))).toBeLessThan(-0.01);                  // the drop
      expect(Math.max(...f.map((x) => Math.abs(x.roll) + Math.abs(x.yaw)))).toBe(0); // and never a cant
      expect(mostPixels(slot, f.slice(0, 30)), `slot ${slot}`).toBeGreaterThan(400);
      expect(f[59]).toEqual(ZERO);
    }
  });

  it("held down (the game clicks every .3 s), the drop holds instead of snapping back and restarting", () => {
    const r = new Reactions(); r.step(DT, QUIET);
    let dry = 0;
    const ys: number[] = [];
    for (let i = 0; i < 90; i++) { if (i % 18 === 0) dry++; ys.push(r.step(DT, { ...QUIET, dryFire: dry }).y); }
    // once lowered, it never comes more than a fifth of the way back between clicks
    const full = Math.min(...ys);
    for (let i = 20; i < 90; i++) expect(ys[i]).toBeLessThan(full * 0.8);
  });
});

describe("pickup nod", () => {
  it("dips and comes back — readable on every weapon — in under half a second", () => {
    for (const slot of [0, 2, 5, 7]) {
      const r = new Reactions(); r.step(DT, QUIET);
      const f = run(r, 30, { ...QUIET, pickup: 1 });
      expect(Math.min(...f.map((x) => x.pitch))).toBeLessThan(-0.2);
      expect(mostPixels(slot, f), `slot ${slot}`).toBeGreaterThan(300);
      expect(f[29]).toEqual(ZERO);
    }
  });
});

describe("idle fidget", () => {
  it(`waits ${FIDGET_AFTER} s of no input at all, then plays — readable — and ends exactly at rest; the next waits another ${FIDGET_AFTER} s`, () => {
    const r = new Reactions(); r.step(DT, QUIET);
    const before = run(r, Math.floor(FIDGET_AFTER / DT) - 3, QUIET);
    for (const f of before) expect(f).toEqual(ZERO);
    const play = run(r, Math.ceil(FIDGET_LEN / DT) + 10, QUIET);
    expect(Math.max(...play.map((f) => f.fidget))).toBe(1);
    expect(mostPixels(2, play)).toBeGreaterThan(500);
    expect(play.at(-1)).toEqual(ZERO);
    const gap = run(r, Math.floor(FIDGET_AFTER / DT) - 20, QUIET);
    for (const f of gap) expect(f).toEqual(ZERO);
  });

  it("any input cancels it at once: the frame the input arrives it stops advancing, and it is gone within FIDGET_CANCEL", () => {
    for (const cancel of [{ input: 1 }, { busy: true }, { hurt: 1 }] as Array<Partial<CueInput>>) {
      const r = new Reactions(); r.step(DT, QUIET);
      run(r, Math.ceil(FIDGET_AFTER / DT) + 30, QUIET);                  // half a second into a fidget
      const mid = r.step(DT, QUIET);
      expect(mid.fidget).toBe(1);
      const after = run(r, Math.ceil(FIDGET_CANCEL / DT) + 1, { ...QUIET, ...cancel });
      expect(after[0].fidget).toBeLessThan(1);                          // already fading on the input's own frame
      for (let i = 1; i < after.length; i++) expect(after[i].fidget).toBeLessThan(after[i - 1].fidget + 1e-12);
      expect(after.at(-1)!.fidget).toBe(0);
      if (!cancel.hurt) expect(after.at(-1)).toEqual(ZERO);
    }
  });

  it("never starts while the player moves or the weapon is busy, or while input keeps coming", () => {
    const moving = new Reactions(); moving.step(DT, QUIET);
    for (const f of run(moving, 900, { ...QUIET, busy: true })) expect(f.fidget).toBe(0);
    const typing = new Reactions(); typing.step(DT, QUIET);
    for (let i = 0; i < 900; i++) expect(typing.step(DT, { ...QUIET, input: Math.floor(i / 60) }).fidget).toBe(0); // one input a second
  });

  it("never plays behind an overlay: while the game is paused (Loop.ts's `paused`) the idle wait does not run", () => {
    const a = new Animator();
    const frame: AnimInput = {
      cur: 2, vx: 0, vz: 0, vy: 0, grounded: true, yaw: 0, sprintKey: false, bobT: 0, wstate: "idle", wtime: 0,
      equipT: 0.24, unequipT: 0.16, kickAmt: 0, kickRot: 0, kickAnim: 0, swayX: 0, swayY: 0, muzzle: 0,
      cueHurt: 0, cueHurtAmt: 0, cuePickup: 0, cueDryFire: 0, cueInput: 0, paused: true,
    };
    /** The most the hands move (the fidget's dip: y and pitch, never a turn) over `secs` seconds of no input at all. */
    const most = (paused: boolean, secs: number) => {
      let m = 0;
      for (let i = 0; i < secs / DT; i++) {
        const p = a.step(DT, 0, { ...frame, paused }, WEAPON_STATS[2], WEAPON_ART[2]);
        m = Math.max(m, Math.abs(p.pitch) + Math.abs(p.y) * 10);
        expect(Math.abs(p.roll) + Math.abs(p.yaw)).toBe(0);
      }
      return m;
    };
    expect(most(true, FIDGET_AFTER * 2 + FIDGET_LEN)).toBe(0);
    expect(most(false, FIDGET_AFTER - 0.5)).toBe(0);                     // unpaused, it waits the whole six seconds again
    expect(most(false, FIDGET_LEN + 1)).toBeGreaterThan(0.08);           // and then plays
  });

  it("alternates between two different fidgets — deterministic, no Math.random", () => {
    const original = Math.random;
    let draws = 0;
    Math.random = () => { draws++; return original(); };
    try {
      const r = new Reactions(); r.step(DT, QUIET);
      const one = run(r, Math.ceil((FIDGET_AFTER + FIDGET_LEN) / DT) + 5, QUIET).filter((f) => f.fidget > 0);
      const two = run(r, Math.ceil((FIDGET_AFTER + FIDGET_LEN) / DT) + 5, QUIET).filter((f) => f.fidget > 0);
      expect(one.length).toBeGreaterThan(60);
      expect(two.length).toBeGreaterThan(60);
      expect(Math.min(...one.map((f) => f.pitch))).toBeLessThan(-0.07);   // the inspect: tipped back toward the eye (pitch only: no roll, owner 2026-10-20)
      expect(JSON.stringify(one)).not.toBe(JSON.stringify(two.slice(0, one.length)));   // and the re-grip is another motion
      for (const f of [...one, ...two]) expect(Math.abs(f.roll) + Math.abs(f.yaw)).toBe(0);
      const again = new Reactions(); again.step(DT, QUIET);
      expect(run(again, Math.ceil((FIDGET_AFTER + FIDGET_LEN) / DT) + 5, QUIET).filter((f) => f.fidget > 0)).toEqual(one);
    } finally {
      Math.random = original;
    }
    expect(draws).toBe(0);
  });
});

describe("switching weapons: straight down out of the frame and straight back up, as Doom does (owner, 2026-10-20)", () => {
  const base: AnimInput = {
    cur: 2, vx: 0, vz: 0, vy: 0, grounded: true, yaw: 0, sprintKey: false, bobT: 0, wstate: "idle", wtime: 1,
    equipT: 0.24, unequipT: 0.16, kickAmt: 0, kickRot: 0, kickAnim: 0, swayX: 0, swayY: 0, muzzle: 0,
    cueHurt: 0, cueHurtAmt: 0, cuePickup: 0, cueDryFire: 0, cueInput: 0, paused: false,
  };
  it("going down it drops and dips without turning or rolling, its muzzle travelling down the middle of the screen", () => {
    for (const slot of [0, 2, 3, 5]) {
      const a = new Animator();
      const path: Array<[number, number]> = [];
      let mid: Pose | null = null;
      for (let k = 0; k <= 8; k++) {
        const p = a.step(DT, 0, { ...base, cur: slot, cueInput: k, wstate: "unequip", wtime: base.unequipT * k / 8 }, WEAPON_STATS[slot], WEAPON_ART[slot]);
        if (k === 4) mid = p;
        const r = new Raster();
        path.push(renderWeapon(r, WEAPON_ART[slot], p, 160, 110).muzzle);
      }
      expect([mid!.roll + 0, mid!.yaw + 0, mid!.x + 0]).toEqual([0, 0, 0]);
      expect(mid!.y).toBeLessThan(SWITCH.y * 0.2);
      // straight down: the muzzle keeps to the screen's middle column while it falls
      const [ax, ay] = path[0], [, by] = path[path.length - 1];
      for (const [x] of path) expect(Math.abs(x - ax), `slot ${slot}`).toBeLessThan(1.5);
      expect(by - ay, `slot ${slot}`).toBeGreaterThan(20);
    }
  });

  it("the new weapon comes straight back up and lands exactly on the aim", () => {
    const a = new Animator();
    const at = (k: number) => a.step(DT, 0, { ...base, cueInput: k, wstate: "equip", wtime: base.equipT * k }, WEAPON_STATS[2], WEAPON_ART[2]);
    const half = at(0.5);
    expect(half.y).toBeLessThan(0);
    expect(half.roll + 0).toBe(0);
    const done = at(1);
    expect([done.x, done.y, done.pitch, done.yaw, done.roll]).toEqual([0, 0, 0, 0, 0]);
  });
});
