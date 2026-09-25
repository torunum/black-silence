import { describe, expect, it } from "vitest";
import {
  Body, stride, type CarryInput, SPRINT_POSE, SPRINT_IN, SPRINT_OUT, SPRINT_AFTER_FIRE, STRIDE_X, STRIDE_Y, LAND_MIN,
} from "../../src/render/viewmodel/motion";

/**
 * The body carrying the weapon — src/render/viewmodel/motion.ts, player
 * feedback round 2, Task 2 (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md).
 * The project owner asked for the running animation to be fixed after round
 * 1 had already cut the sprint sway; these pin what "better" was taken to
 * mean: a sprint pose that eases rather than snaps, a figure-eight stride
 * whose bottom lands on every footstep, a take-off lift and a landing dip
 * scaled by fall speed, and weight that trails the mouse and the strafe
 * and settles exactly back to rest.
 *
 * The line-of-fire guarantee for all of these, through the real
 * drawViewmodel at three aspect ratios, is in viewmodel.test.ts.
 */

const DT = 1 / 60;
const REST: CarryInput = {
  vx: 0, vz: 0, vy: 0, grounded: true, yaw: 0, bobT: 0, swayX: 0, swayY: 0,
  sprinting: false, walkAmt: 0, sprintAmt: 0, wstate: "idle",
};

describe("the sprint pose", () => {
  it("eases in over SPRINT_IN and back out over SPRINT_OUT — never a snap", () => {
    const b = new Body();
    b.step(DT, REST);
    const ins: number[] = [];
    for (let t = 0; t < SPRINT_IN + 0.1; t += DT) ins.push(b.step(DT, { ...REST, sprinting: true }).sprint);
    expect(ins[0]).toBeGreaterThan(0);
    expect(ins[0]).toBeLessThan(0.05);                       // the first frame barely moves (smoothstep's slow start)
    for (let i = 1; i < ins.length; i++) {
      expect(ins[i]).toBeGreaterThanOrEqual(ins[i - 1]);      // monotone
      expect(ins[i] - ins[i - 1]).toBeLessThan(0.1);          // no frame jumps more than a tenth of the way
    }
    const halfway = ins.findIndex((k) => k >= 0.5) * DT;
    expect(halfway).toBeGreaterThan(SPRINT_IN * 0.4);
    expect(ins.at(-1)).toBe(1);

    const outs: number[] = [];
    for (let t = 0; t < SPRINT_OUT + 0.1; t += DT) outs.push(b.step(DT, REST).sprint);
    expect(outs[0]).toBeGreaterThan(0.95);
    for (let i = 1; i < outs.length; i++) {
      expect(outs[i]).toBeLessThanOrEqual(outs[i - 1]);
      expect(outs[i - 1] - outs[i]).toBeLessThan(0.15);
    }
    expect(outs.at(-1)).toBe(0);
  });

  it("at full strength it is the whole sprint pose: lowered, dipped, turned in and canted", () => {
    const b = new Body();
    let c = b.step(DT, REST);
    for (let i = 0; i < 60; i++) c = b.step(DT, { ...REST, sprinting: true });
    expect(c.y).toBeCloseTo(SPRINT_POSE.y, 12);
    expect(c.pitch).toBeCloseTo(SPRINT_POSE.pitch, 12);
    expect(c.yaw).toBeCloseTo(SPRINT_POSE.yaw, 12);
    expect(c.roll).toBeCloseTo(SPRINT_POSE.roll, 12);
    expect(Math.abs(SPRINT_POSE.roll)).toBeGreaterThan(0.3);   // a real cant, not a sliver
    expect(SPRINT_POSE.y).toBeLessThan(0);                     // and lowered
  });

  it("comes up to the aim to shoot, and stays up SPRINT_AFTER_FIRE after the last shot", () => {
    const b = new Body();
    for (let i = 0; i < 60; i++) b.step(DT, { ...REST, sprinting: true });
    let k = 1;
    for (let i = 0; i < 20; i++) k = b.step(DT, { ...REST, sprinting: true, wstate: "fire" }).sprint;
    expect(k).toBe(0);
    let t = 0;
    while (b.step(DT, { ...REST, sprinting: true }).sprint === 0) t += DT;
    expect(t).toBeGreaterThanOrEqual(SPRINT_AFTER_FIRE - DT * 1.5);
    expect(t).toBeLessThan(SPRINT_AFTER_FIRE + DT * 1.5);
  });
});

describe("the stride: a figure-eight on bobT", () => {
  /** Samples the stride over `cycles` footstep periods (ph = bobT*4 over 2π each). */
  function sample(cycles: number, n = 4000): Array<{ ph: number; x: number; y: number }> {
    const out = [];
    for (let i = 0; i < n; i++) {
      const bobT = (i / n) * cycles * 2 * Math.PI / 4 + 1e-4;
      out.push({ ph: bobT * 4, ...stride(bobT, 1) });
    }
    return out;
  }
  const crossings = (vals: number[], mid: number) => {
    let n = 0;
    for (let i = 1; i < vals.length; i++) if ((vals[i - 1] - mid) * (vals[i] - mid) < 0) n++;
    return n;
  };

  it("runs horizontal at exactly half the vertical rate", () => {
    const s = sample(8);
    const xs = crossings(s.map((p) => p.x), 0);
    const ys = crossings(s.map((p) => p.y), STRIDE_Y / 2);
    expect(xs).toBe(8);   // one horizontal cycle per two footsteps
    expect(ys).toBe(16);  // one vertical cycle per footstep
  });

  it("is a figure-eight, not a U: it crosses the centre at mid-height, and dips to the bottom on both sides", () => {
    const s = sample(4);
    for (let i = 1; i < s.length; i++) {
      if (s[i - 1].x * s[i].x < 0) expect(Math.abs(s[i].y - STRIDE_Y / 2)).toBeLessThan(STRIDE_Y * 0.02);
    }
    const bottoms = s.filter((p) => p.y > STRIDE_Y * 0.999);
    expect(bottoms.some((p) => p.x > STRIDE_X * 0.6)).toBe(true);
    expect(bottoms.some((p) => p.x < -STRIDE_X * 0.6)).toBe(true);
    expect(Math.min(...s.map((p) => p.y))).toBeGreaterThanOrEqual(0); // it only ever lowers the weapon
  });

  it("every footstep lands at the bottom of a stride, alternately on the right and the left", () => {
    // Player.ts: bobT += spd*dt*rate; a footstep where sin(bobT*4) crosses zero going up.
    for (const spd of [7, 10.5]) {
      let bobT = 0.37, last = Math.sin(bobT * 4);
      const steps: Array<{ x: number; y: number }> = [];
      const ys: number[] = [];
      for (let f = 0; f < 600; f++) {
        bobT += spd * DT * 1.6;
        const now = Math.sin(bobT * 4);
        const st = stride(bobT, 1);
        ys.push(st.y);
        if (last <= 0 && now > 0) steps.push(st);
        last = now;
      }
      expect(steps.length).toBeGreaterThan(40);
      // the phase moves at most spd*DT*1.6*4 rad a frame, so a footstep frame is within that of the bottom
      const slack = (1 - Math.cos(spd * DT * 1.6 * 4)) / 2 * STRIDE_Y;
      for (const st of steps) expect(st.y).toBeGreaterThanOrEqual(STRIDE_Y - slack - 1e-9);
      for (let i = 1; i < steps.length; i++) expect(Math.sign(steps[i].x)).toBe(-Math.sign(steps[i - 1].x));
      // and the stride's bottoms happen nowhere else: as many local maxima of y as footsteps (give or take the ends)
      let peaks = 0;
      for (let i = 1; i < ys.length - 1; i++) if (ys[i] >= ys[i - 1] && ys[i] > ys[i + 1]) peaks++;
      expect(Math.abs(peaks - steps.length)).toBeLessThanOrEqual(1);
    }
  });

  it("through the body: the stride fades out in the air and the walk-to-sprint amount blends rather than switches", () => {
    const b = new Body();
    const moving = { ...REST, vz: -10.5, walkAmt: 0.28, sprintAmt: 0.38, bobT: 0 };
    const bottom = () => b.step(DT, { ...moving, sprinting: true }).sy;
    b.step(DT, moving);
    const first = bottom();
    expect(first).toBeGreaterThan(STRIDE_Y * 0.28 * 0.99);
    expect(first).toBeLessThan(STRIDE_Y * 0.3);            // one frame into the sprint: still nearly the walk amount
    for (let i = 0; i < 40; i++) bottom();
    expect(bottom()).toBeCloseTo(STRIDE_Y * 0.38, 9);      // eased all the way to the sprint amount
    let sy = 1;
    for (let i = 0; i < 20; i++) sy = b.step(DT, { ...moving, grounded: false, vy: -1 }).sy;
    expect(Math.abs(sy)).toBeLessThan(1e-9 + Math.abs(b.air.x)); // airborne: no stride left, only the air spring
  });
});

describe("jump and land", () => {
  /** A jump from flat ground that lands at `fall` m/s: returns the lift's peak (up, negative) and the landing dip's peak. */
  function jump(fall: number, takeoffVy = 7.4): { lift: number; dip: number } {
    const b = new Body();
    b.step(DT, REST);
    let vy = takeoffVy, grounded = false, lift = 0, dip = 0;
    for (let i = 0; i < 300; i++) {
      const c = b.step(DT, { ...REST, grounded, vy });
      if (!grounded) { lift = Math.min(lift, c.sy); vy -= 20 * DT; if (vy < -fall) { grounded = true; vy = 0; } }
      else dip = Math.max(dip, c.sy);
    }
    return { lift, dip };
  }

  it("lifts the weapon slightly on take-off", () => {
    const { lift } = jump(7.4);
    expect(lift).toBeLessThan(-0.8);
    expect(lift).toBeGreaterThan(-3);
    expect(jump(7.4, -0.1).lift).toBe(0); // walking off a ledge is not a take-off
  });

  it("dips it on landing, in proportion to the fall speed", () => {
    const d4 = jump(4).dip, d8 = jump(8).dip, d12 = jump(12).dip;
    expect(d4).toBeGreaterThan(0.5);
    expect(d8).toBeGreaterThan(d4);
    expect(d12).toBeGreaterThan(d8);
    // linear in the speed above LAND_MIN (the fall itself is discretized per frame, hence the slack)
    expect(d8 / d4).toBeCloseTo((8 - LAND_MIN) / (4 - LAND_MIN), 0);
    expect(Math.abs(d12 / d8 - (12 - LAND_MIN) / (8 - LAND_MIN))).toBeLessThan(0.1);
    expect(jump(40).dip).toBeLessThan(10); // capped: a long fall does not throw the weapon off the screen
  });
});

describe("weight: the weapon trails the mouse and the strafe, then settles", () => {
  it("trails a mouse turn (it swings the other way from the turn, and does not jump there in one frame), then returns exactly to rest", () => {
    const b = new Body();
    b.step(DT, REST);
    let swayX = 10, swayY = 7;
    const first = b.step(DT, { ...REST, swayX, swayY });
    expect(first.sx).toBeLessThan(0);          // turning right: the weapon is left behind, to the left
    expect(first.sy).toBeLessThan(0);          // looking down: it is left behind, above
    let most = first.sx;
    for (let i = 0; i < 20; i++) { swayX *= Math.exp(-7 * DT); swayY *= Math.exp(-7 * DT); most = Math.min(most, b.step(DT, { ...REST, swayX, swayY }).sx); }
    expect(most).toBeLessThan(first.sx * 3);    // the lag builds over frames: a weight, not a teleport
    let c = first;
    for (let i = 0; i < 240; i++) { swayX *= Math.exp(-7 * DT); swayY *= Math.exp(-7 * DT); c = b.step(DT, { ...REST, swayX, swayY }); }
    expect(c.sx).toBeCloseTo(0, 3);
    for (let i = 0; i < 400; i++) c = b.step(DT, REST);
    expect([c.sx, c.sy, c.roll].map((n) => n + 0)).toEqual([0, 0, 0]); // (+0: -0 is rest too)
  });

  it("trails a strafe, leaning a quantized step or more, overshoots a little on the stop, and settles exactly back", () => {
    const b = new Body();
    b.step(DT, REST);
    // facing yaw=π/2: Player.ts's right vector is (cos yaw, -sin yaw) = (0,-1), so moving along -z is a strafe right
    const right = { ...REST, yaw: Math.PI / 2, vz: -10.5 };
    let c = b.step(DT, right);
    const firstSx = c.sx;
    for (let i = 0; i < 60; i++) c = b.step(DT, right);
    expect(c.sx).toBeLessThan(-1.5);           // left behind, to the left
    expect(c.sx).toBeLessThan(firstSx * 3);
    expect(c.roll).toBeLessThan(0);            // leaning with it
    let over = 0;
    for (let i = 0; i < 60; i++) { c = b.step(DT, { ...REST, yaw: Math.PI / 2 }); over = Math.max(over, c.sx); }
    expect(over).toBeGreaterThan(0.05);        // swings past rest: it has mass
    for (let i = 0; i < 300; i++) c = b.step(DT, { ...REST, yaw: Math.PI / 2 });
    expect([c.sx, c.sy, c.roll, c.pitch, c.yaw, c.y].map((n) => n + 0)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("does not lean for running straight ahead, whichever way the player faces", () => {
    for (const yaw of [0, 1, 2.5, -2]) {
      const b = new Body();
      let c = b.step(DT, REST);
      const fwd = { ...REST, yaw, vx: -Math.sin(yaw) * 10.5, vz: -Math.cos(yaw) * 10.5 };
      for (let i = 0; i < 60; i++) c = b.step(DT, fwd);
      expect(Math.abs(c.roll)).toBe(0);
      expect(Math.abs(c.sx)).toBeLessThan(1e-6);
    }
  });
});

describe("the body draws nothing from Math.random", () => {
  it("a whole run — sprint, jump, land, turn, strafe — makes no draws", () => {
    const original = Math.random;
    let draws = 0;
    Math.random = () => { draws++; return original(); };
    try {
      const b = new Body();
      for (let i = 0; i < 200; i++) {
        b.step(DT, { ...REST, vx: 10, vz: -3, bobT: i * 0.2, sprinting: i < 100, grounded: i % 50 > 10, vy: 7 - (i % 50) * 0.3, swayX: 5, swayY: -3 });
      }
    } finally {
      Math.random = original;
    }
    expect(draws).toBe(0);
  });
});
