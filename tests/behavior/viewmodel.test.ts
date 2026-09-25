// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { loadGameHtml } from "../support/domStubs";
import { recordingCanvas, installRecordingGetContext, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { WEAPON_STATS } from "../../src/weapons/definitions";
import type * as KitModule from "../../src/render/viewmodel/kit";
import type * as DrawModule from "../../src/render/viewmodel/draw";
import type * as Overlay2DModule from "../../src/render/Overlay2D";
import type * as RigModule from "../../src/render/viewmodel/rig";
import type * as ArtsModule from "../../src/render/viewmodel/arts";
import type * as RasterModule from "../../src/render/viewmodel/raster";
import type * as PoseModule from "../../src/render/viewmodel/pose";
import type * as AnimateModule from "../../src/render/viewmodel/animate";

/**
 * The weapon viewmodel: src/render/viewmodel/*.
 *
 * **This file used to prove call-for-call parity with the reference's
 * viewmodel** — eight baked pixel grids, their pxCanvas bake, and
 * drawViewmodel's frame picking. That art was replaced on purpose: the
 * project owner played the game and said to fix the weapon designs and
 * animations (player feedback round 2, Task 1 —
 * docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md). The plan
 * says tests pinning the reference's art are rewritten, not deleted, so:
 *
 * - What is still the reference's is still compared against it, call for
 *   call: the art-kit helpers, drawKickBoot (Task 3 replaces it), the
 *   scoped-sniper hide, and — the one that protects the trace fixtures —
 *   **how many Math.random values drawViewmodel draws per frame**, per
 *   weapon, firing and not (KNOWN-20: every visual draw shifts every
 *   gameplay draw after it).
 * - What is new is pinned by what must be true of it: every slot draws a
 *   solid silhouette; every pair of silhouettes differs; the muzzle anchor
 *   sits on the barrel tip; firing moves the weapon's own mechanism, not
 *   just the whole gun; the reload shows the mechanism across its length
 *   and ends exactly on the idle pose; rendering is deterministic and
 *   never touches Math.random; the frame it reads is never written.
 *
 * Overlay2D grabs the fx2d context at import, so the viewmodel modules are
 * imported dynamically in beforeAll, after loadGameHtml() made `#fx2d` and
 * after getContext was patched: fx2d gets a recorder (so drawImage and the
 * flash are visible as calls), every other canvas — the viewmodel's
 * offscreen one — gets a fake that keeps the last ImageData put into it.
 */

let moduleCalls: DrawCall[];
let Kit: typeof KitModule;
let Draw: typeof DrawModule;
let Overlay2D: typeof Overlay2DModule;
let Rig: typeof RigModule;
let Arts: typeof ArtsModule;
let RasterM: typeof RasterModule;
let PoseM: typeof PoseModule;
let Animate: typeof AnimateModule;
/** The last ImageData drawViewmodel put into its offscreen canvas. */
let lastPut: { data: Uint8ClampedArray; width: number; height: number } | null = null;
/** Math.random draws made while the viewmodel modules were first imported — i.e. at boot. */
let importDraws = -1;
/** The reference's own real, baked WPX — its drawViewmodel needs it as a bare global. */
let REFERENCE_WPX: Record<number, { idle: HTMLCanvasElement[]; fire: HTMLCanvasElement[]; reload: HTMLCanvasElement[] }>;
let VW: number, VH: number;

beforeAll(async () => {
  loadGameHtml();

  const bakeSession = recordingCanvas();
  const restoreBake = installRecordingGetContext(bakeSession.ctx, bakeSession.calls);
  REFERENCE_WPX = evalReference([refSource(REF.viewmodelSprites)], "(function(){buildWeaponSprites();return WPX;})()", { document });
  restoreBake();

  const rec = recordingCanvas();
  moduleCalls = rec.calls;
  const offscreen = {
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: (img: typeof lastPut) => { lastPut = img; },
  };
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string): unknown {
    if (kind !== "2d") return null;
    return this.id === "fx2d" ? rec.ctx : offscreen;
  } as typeof HTMLCanvasElement.prototype.getContext;

  const original = Math.random;
  let n = 0;
  Math.random = () => { n++; return original(); };
  try {
    Kit = await import("../../src/render/viewmodel/kit");
    Draw = await import("../../src/render/viewmodel/draw");
    Overlay2D = await import("../../src/render/Overlay2D");
    Rig = await import("../../src/render/viewmodel/rig");
    Arts = await import("../../src/render/viewmodel/arts");
    RasterM = await import("../../src/render/viewmodel/raster");
    PoseM = await import("../../src/render/viewmodel/pose");
    Animate = await import("../../src/render/viewmodel/animate");
  } finally {
    Math.random = original;
  }
  importDraws = n;
  VW = Overlay2D.getVW();
  VH = Overlay2D.getVH();
});

/** Renumbers Gradient#/Canvas# tags to first-seen order within one window (see recordingCanvas.ts). */
function normalizeIds(calls: DrawCall[]): DrawCall[] {
  const gradientMap = new Map<string, string>();
  const canvasMap = new Map<string, string>();
  const renumber = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const m = /^(Gradient|Canvas)#(\d+)$/.exec(value);
    if (!m) return value;
    const map = m[1] === "Gradient" ? gradientMap : canvasMap;
    if (!map.has(value)) map.set(value, `${m[1]}#${map.size + 1}`);
    return map.get(value)!;
  };
  return calls.map((c) => ({ method: c.method, args: c.args.map(renumber) }));
}

/** Math.random values drawn inside the most recent moduleWindow / refKitAndDrawWindow. */
let moduleDraws = -1, refDraws = -1;

/** Runs `run` under seed `seed`, returning only the module-side calls it appended (its Math.random draw count lands in moduleDraws). */
function moduleWindow(seed: number, run: () => void): DrawCall[] {
  const start = moduleCalls.length;
  const restore = seedRandom(seed);
  const seeded = Math.random;
  let draws = 0;
  Math.random = () => { draws++; return seeded(); };
  try {
    run();
  } finally {
    restore();
  }
  moduleDraws = draws;
  return normalizeIds(moduleCalls.slice(start));
}

const KIT_AND_DRAW_CHUNKS = [refSource(REF.mathHelpers), refSource(REF.viewmodelKit), refSource(REF.viewmodelDraw)];

interface RefKitAndDraw {
  vRect: (x: number, y: number, w: number, h: number, c: string) => void;
  vFlat: (x: number, y: number, w: number, h: number, c: string) => void;
  vGrad: (x: number, y: number, w: number, h: number, c1: string, c2: string) => void;
  vBarrel: (x: number, y: number, w: number, h: number) => void;
  vTube: (x: number, y: number, w: number, h: number, c1: string, c2: string, c3?: string) => void;
  vWood: (x: number, y: number, w: number, h: number) => void;
  vScrew: (x: number, y: number) => void;
  vHole: (x: number, y: number, r: number) => void;
  vTrigger: (x: number, y: number) => void;
  drawKickBoot: () => void;
  drawViewmodel: (dt: number, tNow: number) => void;
}
const KIT_AND_DRAW_EXPR =
  "({vRect,vFlat,vGrad,vBarrel,vTube,vWood,vScrew,vHole,vTrigger,drawKickBoot,drawViewmodel})";

/** Runs `run` against the reference (fresh, seeded), `fg` injected as a recorder; returns its calls (its Math.random draw count lands in refDraws). */
function refKitAndDrawWindow(seed: number, extraGlobals: Record<string, unknown>, run: (fns: RefKitAndDraw) => void): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const restore = seedRandom(seed);
  const seeded = Math.random;
  let draws = 0;
  Math.random = () => { draws++; return seeded(); };
  try {
    const fns = evalReference<RefKitAndDraw>(KIT_AND_DRAW_CHUNKS, KIT_AND_DRAW_EXPR, { ...extraGlobals, fg: ctx, Math });
    run(fns);
  } finally {
    restore();
  }
  refDraws = draws;
  return normalizeIds(calls);
}

describe("viewmodel art kit (vRect/vFlat/vGrad/vBarrel/vTube/vWood/vScrew/vHole/vTrigger) behavioral parity with reference", () => {
  it("draws an identical ordered sequence of canvas calls as the reference, across every helper", () => {
    const run = (fns: Pick<RefKitAndDraw, "vRect" | "vFlat" | "vGrad" | "vBarrel" | "vTube" | "vWood" | "vScrew" | "vHole" | "vTrigger">) => {
      fns.vRect(10, 20, 30, 15, "#445566");
      fns.vFlat(5, 5, 12, 8, "#112233");
      fns.vGrad(0, 10, 40, 20, "#111111", "#eeeeee");
      fns.vBarrel(2, 4, 50, 10);
      fns.vTube(1, 2, 33, 9, "#223344", "#556677", "#8899aa");
      fns.vTube(1, 2, 33, 9, "#223344", "#556677"); // c3 omitted: exercises the c3||c1 fallback
      fns.vWood(-5, -5, 44, 22);
      fns.vScrew(12, 8);
      fns.vHole(20, 20, 6);
      fns.vTrigger(15, 15);
    };
    const referenceCalls = refKitAndDrawWindow(101, {}, run);
    const modCalls = moduleWindow(101, () => run(Kit));
    expect(referenceCalls.length).toBeGreaterThan(40);
    expectCallLogEqual(modCalls, referenceCalls, "viewmodel kit call log");
  });
});

describe("drawKickBoot behavioral parity with reference (Task 3 of the plan replaces it)", () => {
  it.each([0.05, 0.2, 0.31])("draws an identical ordered sequence of canvas calls as the reference at kickAnim=%s", (kickAnim) => {
    const referenceCalls = refKitAndDrawWindow(202, { kickAnim, VW, VH }, (fns) => fns.drawKickBoot());
    const modCalls = moduleWindow(202, () => Draw.drawKickBoot(kickAnim));
    expectCallLogEqual(modCalls, referenceCalls, `drawKickBoot(${kickAnim}) call log`);
  });

  it("draws nothing when kickAnim<=0 (both sides agree on the early return)", () => {
    const referenceCalls = refKitAndDrawWindow(203, { kickAnim: 0, VW, VH }, (fns) => fns.drawKickBoot());
    const modCalls = moduleWindow(203, () => Draw.drawKickBoot(0));
    expect(referenceCalls).toEqual([]);
    expectCallLogEqual(modCalls, referenceCalls, "drawKickBoot(0) call log");
  });
});

/** One drawViewmodel scenario's inputs, shared between the module's ViewmodelFrame and the reference's bare globals. */
interface Scenario {
  cur: number; vx: number; vz: number; sprintKey: boolean; bobT: number;
  wstate: string; wtime: number; kickAmt: number; kickRot: number;
  swayX: number; swayY: number; muzzle: number; zoomLerp: number;
}
function toViewmodelFrame(s: Scenario): DrawModule.ViewmodelFrame {
  return {
    started: true, dead: false, pianoOpen: false, zoomLerp: s.zoomLerp, cur: s.cur,
    vx: s.vx, vz: s.vz, sprintKey: s.sprintKey, bobT: s.bobT, wstate: s.wstate, wtime: s.wtime,
    equipT: 0.24, unequipT: 0.16, kickAmt: s.kickAmt, kickRot: s.kickRot, swayX: s.swayX, swayY: s.swayY, muzzle: s.muzzle,
  };
}
function toRefGlobals(s: Scenario): Record<string, unknown> {
  return {
    started: true, S: { cur: s.cur, dead: false }, pianoOpen: false, zoomLerp: s.zoomLerp,
    vx: s.vx, vz: s.vz, keys: s.sprintKey ? { ShiftLeft: true } : {}, bobT: s.bobT,
    wstate: s.wstate, wtime: s.wtime, EQUIP_T: 0.24, UNEQUIP_T: 0.16,
    kickAmt: s.kickAmt, kickRot: s.kickRot, swayX: s.swayX, swayY: s.swayY, muzzle: s.muzzle,
    WEAPONS: WEAPON_STATS, VW, VH, puffs: [] as unknown[], WPX: REFERENCE_WPX,
  };
}
function idleScenario(cur: number): Scenario {
  return { cur, vx: 2.5, vz: 1.0, sprintKey: false, bobT: 1.3, wstate: "idle", wtime: 0,
    kickAmt: 0, kickRot: 0, swayX: 3, swayY: -2, muzzle: 0, zoomLerp: 0 };
}
function fireScenario(cur: number): Scenario {
  const w = WEAPON_STATS[cur];
  return { cur, vx: 1.0, vz: 0.5, sprintKey: false, bobT: 0.6, wstate: "fire", wtime: w.rate * 0.5,
    kickAmt: w.kick * 0.6, kickRot: 1.1, swayX: 2, swayY: 1.5, muzzle: 0.4, zoomLerp: 0 };
}
/** No motion at all: bob, sway and breathing are all exactly zero at tNow=0, so the image sits at its layout origin. */
function stillScenario(cur: number, over: Partial<Scenario> = {}): Scenario {
  return { cur, vx: 0, vz: 0, sprintKey: false, bobT: 0, wstate: "idle", wtime: 0,
    kickAmt: 0, kickRot: 0, swayX: 0, swayY: 0, muzzle: 0, zoomLerp: 0, ...over };
}

describe("sprint/walk weapon-bob amplitude constants", () => {
  it("pins the exact tuned values (player feedback round 1, task 3, 2026-09-17)", () => {
    expect(Draw.WALK_BOB_AMT).toBe(0.28);
    expect(Draw.SPRINT_BOB_AMT).toBe(0.38);
  });
});

describe("drawViewmodel keeps the reference's Math.random draw count, per weapon (the trace fixtures depend on it)", () => {
  WEAPON_STATS.forEach((weapon, cur) => {
    it(`weapon ${cur} (${weapon.name}): the same number of draws as the reference, firing and not`, () => {
      for (const [label, scenario, seed] of [["fire", fireScenario(cur), 500 + cur], ["idle", idleScenario(cur), 600 + cur]] as const) {
        refKitAndDrawWindow(seed, toRefGlobals(scenario), (fns) => fns.drawViewmodel(0.016, 1234.5));
        moduleWindow(seed, () => Draw.drawViewmodel(0.016, 1234.5, toViewmodelFrame(scenario), WEAPON_STATS));
        expect(moduleDraws, `${label}: module vs reference Math.random draws`).toBe(refDraws);
        if (label === "fire") expect(refDraws).toBeGreaterThan(0); // the flash's draws were really exercised
        else expect(refDraws).toBe(0);
      }
    });
  });

  it("nothing draws from Math.random at import — building the weapon art at boot moves no seeded draw (KNOWN-20)", () => {
    expect(importDraws).toBe(0);
  });
});

describe("drawViewmodel: scoped-in sniper", () => {
  it("weapon 4 scoped in: both sides agree drawViewmodel draws nothing (zoomLerp>=.85 && cur===4)", () => {
    const scenario: Scenario = { ...idleScenario(4), zoomLerp: 0.9 };
    const referenceCalls = refKitAndDrawWindow(399, toRefGlobals(scenario), (fns) => fns.drawViewmodel(0.016, 1234.5));
    const modCalls = moduleWindow(399, () => Draw.drawViewmodel(0.016, 1234.5, toViewmodelFrame(scenario), WEAPON_STATS));
    expect(referenceCalls).toEqual([]);
    expectCallLogEqual(modCalls, referenceCalls, "drawViewmodel weapon 4 scoped-in call log");
  });
});

// ---------------------------------------------------------------------------
// The new art, rendered directly.

const CX = 160, CY = 110;

function render(slot: number, mod: (p: PoseModule.Pose) => void = () => {}): { col: Uint8Array; z: Float32Array; anchors: Record<string, [number, number]> } {
  const r = new RasterM.Raster();
  const p = PoseM.restPose();
  mod(p);
  const anchors = Rig.renderWeapon(r, Arts.WEAPON_ART[slot], p, CX, CY);
  return { col: r.col.slice(), z: r.z.slice(), anchors };
}
function opaque(col: Uint8Array): number {
  let n = 0;
  for (const c of col) if (c) n++;
  return n;
}
function diff(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

describe("the redrawn weapons, per slot", () => {
  WEAPON_STATS.forEach((weapon, slot) => {
    describe(`weapon ${slot} (${weapon.name})`, () => {
      it("idle: a solid silhouette, its muzzle anchor on the barrel tip", () => {
        const { col, z, anchors } = render(slot);
        expect(opaque(col)).toBeGreaterThan(1200);
        const m = anchors.muzzle;
        expect(m).toBeDefined();
        expect(m[0]).toBeGreaterThanOrEqual(0); expect(m[0]).toBeLessThan(RasterM.RW);
        expect(m[1]).toBeGreaterThanOrEqual(0); expect(m[1]).toBeLessThan(RasterM.RH);
        // on the model: an opaque pixel within 1.5 px of the anchor
        let nearest = Infinity, fartherOut = 0, total = 0;
        const vx = CX + Rig.AIM_DX, vy = CY + Rig.AIM_DY; // the viewmodel's vanishing point
        const dm = Math.hypot(m[0] - vx, m[1] - vy);
        for (let i = 0; i < col.length; i++) {
          if (!col[i]) continue;
          const x = i % RasterM.RW + 0.5, y = Math.floor(i / RasterM.RW) + 0.5;
          nearest = Math.min(nearest, Math.hypot(x - m[0], y - m[1]));
          total++;
          if (Math.hypot(x - vx, y - vy) >= dm) fartherOut++;
        }
        expect(nearest).toBeLessThanOrEqual(1.5);
        // at the tip: the barrel points at its vanishing point, so its tip is nearer that point than nearly all of the weapon
        expect(fartherOut / total).toBeGreaterThan(0.7);
        // and at the front: the model under the anchor lies deeper (farther from the eye) than 75% of the weapon
        let nearZ = 0, bestD = Infinity;
        const depths: number[] = [];
        for (let i = 0; i < col.length; i++) {
          if (!col[i] || z[i] > 1e8) continue; // (the outline ring carries a sentinel depth)
          depths.push(z[i]);
          const d = Math.hypot(i % RasterM.RW + 0.5 - m[0], Math.floor(i / RasterM.RW) + 0.5 - m[1]);
          if (d < bestD) { bestD = d; nearZ = z[i]; }
        }
        expect(depths.filter((v) => v < nearZ).length / depths.length).toBeGreaterThan(0.75);
      });

      it("firing moves the weapon's own mechanism, not only the whole gun", () => {
        const art = Arts.WEAPON_ART[slot];
        const idle = render(slot).col;
        const window = Animate.fireWindow(weapon);
        let most = 0;
        for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
          const fired = render(slot, (pose) => { pose.action = art.action(p); pose.spin = (art.spinRate ?? 0) * window * p; }).col;
          most = Math.max(most, diff(fired, idle));
        }
        expect(most).toBeGreaterThan(40);
      });

      it("recoil kicks it back into the hand: the image changes and the muzzle moves", () => {
        const idle = render(slot);
        const kicked = render(slot, (p) => { p.recoil = 1; });
        expect(diff(kicked.col, idle.col)).toBeGreaterThan(500);
        const [ix, iy] = idle.anchors.muzzle, [kx, ky] = kicked.anchors.muzzle;
        expect(Math.hypot(kx - ix, ky - iy)).toBeGreaterThan(1.5); // and the flash goes with it
      });

      it("the reload shows the mechanism across its whole length, and ends exactly on the idle pose", () => {
        const idle = render(slot).col;
        const phases = [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => render(slot, (p) => { p.reload = t; }).col);
        expect(new Set(phases.map((c) => Buffer.from(c).toString("base64"))).size).toBeGreaterThanOrEqual(4);
        for (const c of phases.slice(1, 4)) expect(diff(c, idle)).toBeGreaterThan(300);
        expect(diff(render(slot, (p) => { p.reload = 1; }).col, idle)).toBe(0);
      });

      it("is deterministic and draws nothing from Math.random", () => {
        const original = Math.random;
        let draws = 0;
        Math.random = () => { draws++; return original(); };
        try {
          const a = render(slot, (p) => { p.recoil = 0.4; p.action = 0.5; p.reload = 0.4; p.spin = 1; });
          const b = render(slot, (p) => { p.recoil = 0.4; p.action = 0.5; p.reload = 0.4; p.spin = 1; });
          expect(diff(a.col, b.col)).toBe(0);
          expect(a.anchors).toEqual(b.anchors);
        } finally {
          Math.random = original;
        }
        expect(draws).toBe(0);
      });
    });
  });

  it("every weapon's silhouette differs from every other's by at least 20% of their combined outline", () => {
    const masks = WEAPON_STATS.map((_, slot) => render(slot).col);
    const tooClose: string[] = [];
    for (let i = 0; i < masks.length; i++) {
      for (let j = i + 1; j < masks.length; j++) {
        let xor = 0, union = 0;
        for (let k = 0; k < masks[i].length; k++) {
          const a = !!masks[i][k], b = !!masks[j][k];
          if (a !== b) xor++;
          if (a || b) union++;
        }
        if (xor / union < 0.2) tooClose.push(`${WEAPON_STATS[i].name} vs ${WEAPON_STATS[j].name}: ${(xor / union).toFixed(3)}`);
      }
    }
    expect(tooClose).toEqual([]);
  });
});

/** Sets jsdom's window size and re-runs the overlay's own sizing, as a resize event would. */
function setScreen(w: number, h: number): void {
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
  Overlay2D.sizeFx();
}

describe("the weapon stays out of the player's line of fire (Task 1 fix round)", () => {
  // The first cut of these weapons aimed every muzzle straight at the
  // crosshair and drew them at half the screen's height: the sawed-off's
  // barrels covered the centre of the screen, where the enemies are. The
  // rule now: whatever the aspect ratio and whatever the weapon is doing —
  // at rest, at full recoil at every point of its firing motion, at every
  // point of its reload, coming up on equip — no opaque pixel of it sits
  // higher than CLEAR_BELOW (15%) of the screen's height below the
  // crosshair; and at rest it takes up about a third of the screen's height.
  // Checked end to end through drawViewmodel: the real blit rectangle and
  // the real image, not the raster alone.
  const ASPECTS: Array<[string, number, number]> = [["16:9", 1600, 900], ["21:9", 2560, 1080], ["4:3", 1024, 768]];

  /** Draws one frame and returns the screen row (overlay units) of the weapon's topmost opaque pixel. */
  function topRow(frame: DrawModule.ViewmodelFrame): number {
    const calls = moduleWindow(900, () => Draw.drawViewmodel(0.016, 0, frame, WEAPON_STATS));
    const blit = calls.filter((c) => c.method === "drawImage").at(-1);
    if (!blit || !lastPut) throw new Error("drawViewmodel blitted nothing");
    const [, , y, , h] = blit.args as number[];
    const data = lastPut.data;
    for (let row = 0; row < RasterM.RH; row++) {
      for (let x = 0; x < RasterM.RW; x++) if (data[(row * RasterM.RW + x) * 4 + 3]) return y + row * (h / RasterM.RH);
    }
    return Infinity;
  }

  for (const [label, w, h] of ASPECTS) {
    it(`${label}: every weapon, at rest, firing, reloading and equipping, stays 15% of the screen below the crosshair (rig.ts CLEAR_BELOW); at rest it is 28-40% of the screen's height`, () => {
      const saved = [window.innerWidth, window.innerHeight];
      setScreen(w, h);
      try {
        const vh = Overlay2D.getVH(), line = vh / 2 + Rig.CLEAR_BELOW * vh;
        const breaches: string[] = [];
        WEAPON_STATS.forEach((stats, slot) => {
          const base = toViewmodelFrame(stillScenario(slot));
          const frames: Array<[string, DrawModule.ViewmodelFrame]> = [["rest", base]];
          for (let k = 0; k <= 10; k++) {
            frames.push([`fire ${k / 10}`, { ...base, wstate: "fire", wtime: Animate.fireWindow(stats) * k / 10, kickAmt: stats.kick, kickRot: stats.kick * 0.125 }]);
          }
          for (let k = 0; k <= 40; k++) frames.push([`reload ${k / 40}`, { ...base, wstate: "reload", wtime: stats.reload * k / 40 }]);
          for (let k = 0; k <= 4; k++) frames.push([`equip ${k / 4}`, { ...base, wstate: "equip", wtime: base.equipT * k / 4 }]);
          for (const [name, frame] of frames) {
            const top = topRow(frame);
            if (top < line - 0.5) breaches.push(`${stats.name} ${name}: top ${top.toFixed(1)} above the line ${line.toFixed(1)}`);
          }
          const height = (vh - topRow(base)) / vh;
          if (height < 0.28 || height > 0.4) breaches.push(`${stats.name} at rest is ${(height * 100).toFixed(0)}% of the screen's height`);
        });
        expect(breaches).toEqual([]);
      } finally {
        setScreen(saved[0], saved[1]);
      }
    });
  }
});

describe("drawViewmodel with the new art", () => {
  it("draws every slot: the offscreen image holds the weapon, and it is blitted onto the overlay", () => {
    for (let slot = 0; slot < WEAPON_STATS.length; slot++) {
      const calls = moduleWindow(700 + slot, () => Draw.drawViewmodel(0.016, 0, toViewmodelFrame(stillScenario(slot)), WEAPON_STATS));
      expect(calls.some((c) => c.method === "drawImage"), `slot ${slot} drawImage`).toBe(true);
      let alpha = 0;
      for (let i = 3; i < lastPut!.data.length; i += 4) if (lastPut!.data[i]) alpha++;
      expect(alpha, `slot ${slot} opaque pixels`).toBeGreaterThan(1200);
    }
  });

  it("the muzzle flash is centred on the rendered barrel tip", () => {
    for (const slot of [0, 4, 6]) {
      const scenario = stillScenario(slot, { wstate: "fire", wtime: 0.01, kickAmt: 0, muzzle: 0.4 });
      const calls = moduleWindow(800 + slot, () => Draw.drawViewmodel(0.016, 0, toViewmodelFrame(scenario), WEAPON_STATS));
      const m = Draw.lastAnchors().muzzle;
      const s = VH / Draw.VIEW_H;
      const left = (VW - RasterM.RW * s) / 2, top = VH - RasterM.RH * s;
      const flash = calls.filter((c) => c.method === "translate").at(-1)!;
      expect(flash.args[0] as number).toBeCloseTo(left + m[0] * s, 6);
      expect(flash.args[1] as number).toBeCloseTo(top + m[1] * s, 6);
    }
  });

  it("equip swings the weapon up from below: at the start of the equip its muzzle is far lower than at rest", () => {
    Draw.drawViewmodel(0.016, 0, toViewmodelFrame(stillScenario(2)), WEAPON_STATS);
    const rest = Draw.lastAnchors().muzzle[1];
    Draw.drawViewmodel(0.016, 0, toViewmodelFrame(stillScenario(2, { wstate: "equip", wtime: 0 })), WEAPON_STATS);
    const drawn = Draw.lastAnchors().muzzle[1];
    expect(drawn - rest).toBeGreaterThan(30);
  });

  it("only reads the frame it is given — a frozen frame draws without a write", () => {
    const frame = Object.freeze(toViewmodelFrame(fireScenario(3)));
    expect(() => Draw.drawViewmodel(0.016, 0, frame, WEAPON_STATS)).not.toThrow();
  });
});

describe("the animator", () => {
  it("spins the nail cannon's barrels up while firing and winds them down after", () => {
    const anim = new Animate.Animator();
    const w = WEAPON_STATS[6], art = Arts.WEAPON_ART[6];
    const frame = (wstate: string) => ({ ...toViewmodelFrame(stillScenario(6)), wstate, wtime: 0.01 });
    let prev = anim.step(0.016, 0, frame("idle"), w, art).spin;
    const turn = (wstate: string) => {
      const next = anim.step(0.016, 0, frame(wstate), w, art).spin;
      const d = (next - prev + Math.PI * 4) % (Math.PI * 2);
      prev = next;
      return d;
    };
    for (let i = 0; i < 40; i++) turn("fire");
    const firing = turn("fire");
    expect(firing).toBeGreaterThan(0.2);                     // ~26 rad/s at full speed
    for (let i = 0; i < 20; i++) turn("idle");
    const coasting = turn("idle");
    expect(coasting).toBeGreaterThan(0);                     // still turning: momentum, not a snap
    expect(coasting).toBeLessThan(firing);
    for (let i = 0; i < 400; i++) turn("idle");
    expect(turn("idle")).toBeLessThan(0.001);                // and it stops
  });

  it("drives the mechanism from progress through the fire state, recoil from the runtime's own kick", () => {
    const anim = new Animate.Animator();
    const w = WEAPON_STATS[1], art = Arts.WEAPON_ART[1];
    const base = toViewmodelFrame(stillScenario(1));
    const pump = anim.step(0.016, 0, { ...base, wstate: "fire", wtime: Animate.fireWindow(w) * 0.8 }, w, art);
    expect(pump.action).toBeCloseTo(art.action(0.8), 10);
    expect(pump.action).toBeGreaterThan(0.5);               // the pump is racked back at the 300 ms hull ejection
    const kicked = anim.step(0.016, 0, { ...base, kickAmt: w.kick * 0.5 }, w, art);
    expect(kicked.recoil).toBeCloseTo(0.5, 10);
    const reloading = anim.step(0.016, 0, { ...base, wstate: "reload", wtime: w.reload * 0.25 }, w, art);
    expect(reloading.reload).toBeCloseTo(0.25, 10);
  });
});
