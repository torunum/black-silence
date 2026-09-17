// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { loadGameHtml } from "../support/domStubs";
import { recordingCanvas, installRecordingGetContext, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import {
  WEAPON_PIXELS as moduleWEAPON_PIXELS, pxCanvas as modulePxCanvas, GP as moduleGP,
  buildWeaponSprites as moduleBuildWeaponSprites,
} from "../../src/render/viewmodel/sprites";
import { WEAPON_STATS } from "../../src/weapons/definitions";
import type * as KitModule from "../../src/render/viewmodel/kit";
import type * as DrawModule from "../../src/render/viewmodel/draw";
import type * as Overlay2DModule from "../../src/render/Overlay2D";

/**
 * The viewmodel half of the behavioral oracle (see
 * tests/behavior/textures.test.ts's doc comment for the overall rationale).
 * Covers src/render/viewmodel/{kit,sprites,draw}.ts and
 * src/render/Overlay2D.ts's fx2d canvas setup — Phase 0C Task 3.
 *
 * src/render/Overlay2D.ts grabs the real fx2d 2D context eagerly, at its
 * own module top level (`fx.getContext("2d")`, matching the reference's own
 * unconditional `const fx=document.getElementById("fx2d"),fg=...`) — not
 * lazily on first use. That capture happens once, the first time
 * Overlay2D.ts (hence src/render/viewmodel/kit.ts and draw.ts, which both
 * import its getFx() accessor) is imported. A plain static `import` at the
 * top of this file would resolve before this file's own top-level code —
 * including loadGameHtml(), which is what makes `#fx2d` exist in jsdom —
 * ever ran, so kit.ts/draw.ts are imported *dynamically*, inside beforeAll,
 * after loadGameHtml() and after installing the one recording 2D context
 * this whole file's module-side calls funnel through for the rest of the
 * process (moduleCalls below). Every module-side comparison in this file
 * slices its own window out of that one growing log (moduleWindow) rather
 * than getting a fresh capture — the accessor is captured once; the window
 * is what's fresh per case.
 *
 * The reference side has no such restriction: reference/sonsurum.html's
 * vRect/vGrad/.../drawKickBoot/drawViewmodel read a bare `fg` global rather
 * than an accessor, so each reference call below just injects a *fresh*
 * recordingCanvas() Proxy directly as that global — no DOM/getContext
 * patching needed for those (pxCanvas is the one exception: it creates its
 * own throwaway canvas via document.createElement, so its reference-side
 * calls use installRecordingGetContext instead, temporarily, nested inside
 * the permanent module-side patch and restored immediately after).
 */

let moduleCalls: DrawCall[];
let Kit: typeof KitModule;
let Draw: typeof DrawModule;
let Overlay2D: typeof Overlay2DModule;
/** The reference's own real, baked WPX (idle/fire/reload canvases per weapon) — frameFor/drawViewmodel need it as a bare global (see REFERENCE_WPX_EXPR below). Built once, from the reference's self-contained pxCanvas/GP/WPX/buildWeaponSprites, not the module's. */
let REFERENCE_WPX: Record<number, { idle: HTMLCanvasElement[]; fire: HTMLCanvasElement[]; reload: HTMLCanvasElement[] }>;
/**
 * The overlay's real logical viewport, read from Overlay2D.ts's own
 * sizeFx() rather than assumed as a fixed 320x200: VW is always 320, but VH
 * depends on innerWidth/innerHeight's aspect ratio (`VH=Math.round(VW/a)`),
 * which is jsdom's default window size here, not necessarily 4:3. Every
 * reference-side global below uses these same two numbers so both sides
 * agree on the viewport regardless of what jsdom's defaults happen to be.
 */
let VW: number, VH: number;

const REFERENCE_WPX_EXPR = "(function(){buildWeaponSprites();return WPX;})()";

beforeAll(async () => {
  loadGameHtml(); // installs the real <canvas id="fx2d"> from index.html, before Overlay2D.ts's first (dynamic) import below ever runs

  // A throwaway recording session, installed and restored immediately, just
  // so pxCanvas's g.fillStyle/g.fillRect calls (inside the reference's own
  // buildWeaponSprites) don't throw on jsdom's un-stubbed getContext, which
  // returns null. Its log is discarded — only the resulting WPX (real
  // HTMLCanvasElements, correct width/height) is kept — so none of this
  // leaks into moduleCalls below.
  const bakeSession = recordingCanvas();
  const restoreBake = installRecordingGetContext(bakeSession.ctx, bakeSession.calls);
  REFERENCE_WPX = evalReference([refSource(REF.viewmodelSprites)], REFERENCE_WPX_EXPR, { document });
  restoreBake();

  const rec = recordingCanvas();
  moduleCalls = rec.calls;
  // Never uninstalled: this becomes Overlay2D.ts's permanent fx2d context
  // for the rest of this test file's process, captured the moment the
  // dynamic imports below run.
  installRecordingGetContext(rec.ctx, rec.calls);
  Kit = await import("../../src/render/viewmodel/kit");
  Draw = await import("../../src/render/viewmodel/draw");
  Overlay2D = await import("../../src/render/Overlay2D");
  moduleBuildWeaponSprites();
  VW = Overlay2D.getVW();
  VH = Overlay2D.getVH();
});

/**
 * Gradient#N/Canvas#N tags are assigned by an ever-increasing counter PER
 * recordingCanvas()/installRecordingGetContext() SESSION (see
 * tests/support/recordingCanvas.ts) — necessary so a comparison can tell
 * "the same gradient/canvas as N calls ago" from "a different one", the gap
 * Task 1's review found and fixed. But the reference side gets a *fresh*
 * session per case below (so its counters always restart at 1), while the
 * module side shares *one* session across this whole file (moduleWindow),
 * so its counters keep climbing across every earlier test — comparing the
 * raw tags would fail on the numeric suffix alone even when every
 * gradient/canvas *relationship* within one call-log window is identical.
 * Renumbering each tag to its first-seen order within just this window —
 * independently for the Gradient and Canvas namespaces — keeps the
 * comparison sensitive to what's actually art-relevant (is argument N the
 * SAME gradient/canvas as the one created M calls earlier in *this*
 * window) while making it blind to which absolute counter value either
 * session happened to be at when the window started.
 */
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

/** Runs `run` under seed `seed`, returning only the module-side calls it appended to the shared log (Gradient#/Canvas# tags renumbered window-local — see normalizeIds). */
function moduleWindow(seed: number, run: () => void): DrawCall[] {
  const start = moduleCalls.length;
  const restore = seedRandom(seed);
  try {
    run();
  } finally {
    restore();
  }
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

/**
 * Runs `run` against the reference's vRect/.../drawViewmodel (evaluated
 * fresh, under seed `seed`), with `fg` injected directly as the recording
 * Proxy these functions read as a bare global — see this file's doc
 * comment for why that needs no getContext patching. `extraGlobals`
 * supplies whatever else the reference code reads as a bare global
 * (WEAPONS, wstate, S, kickAnim, VW, VH, puffs, ...).
 */
function refKitAndDrawWindow(seed: number, extraGlobals: Record<string, unknown>, run: (fns: RefKitAndDraw) => void): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const restore = seedRandom(seed);
  try {
    const fns = evalReference<RefKitAndDraw>(KIT_AND_DRAW_CHUNKS, KIT_AND_DRAW_EXPR, { ...extraGlobals, fg: ctx, Math });
    run(fns);
  } finally {
    restore();
  }
  return normalizeIds(calls);
}

describe("viewmodel art kit (vRect/vFlat/vGrad/vBarrel/vTube/vWood/vScrew/vHole/vTrigger) behavioral parity with reference", () => {
  it("draws an identical ordered sequence of canvas calls as the reference, across every helper (including both gradient-bearing and plain-fill shapes)", () => {
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

    // A recorder that can pass on a trivially short log proves nothing (see
    // tests/behavior/textures.test.ts's identical caveat).
    expect(referenceCalls.length).toBeGreaterThan(40);
    expectCallLogEqual(modCalls, referenceCalls, "viewmodel kit call log");
  });
});

describe("drawKickBoot behavioral parity with reference", () => {
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

/** One drawViewmodel scenario's inputs, shared between the module's ViewmodelFrame and the reference's bare globals — see toViewmodelFrame/toRefGlobals below. */
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
function reloadAScenario(cur: number): Scenario {
  const w = WEAPON_STATS[cur];
  return { cur, vx: 0, vz: 0, sprintKey: false, bobT: 0, wstate: "reload", wtime: w.reload * 0.4,
    kickAmt: 0, kickRot: 0, swayX: -1, swayY: 0.5, muzzle: 0, zoomLerp: 0 };
}
function reloadBScenario(cur: number): Scenario {
  const w = WEAPON_STATS[cur];
  return { cur, vx: 0, vz: 0, sprintKey: false, bobT: 0, wstate: "reload", wtime: w.reload * 0.6,
    kickAmt: 0, kickRot: 0, swayX: -1, swayY: 0.5, muzzle: 0, zoomLerp: 0 };
}
/** Sprinting, muzzle mid-flash, moderate sway/kick — a busier variant of the idle pose, reusing the "idle" wstate. */
function sprintScenario(cur: number): Scenario {
  return { cur, vx: 6, vz: 5, sprintKey: true, bobT: 2.1, wstate: "idle", wtime: 0,
    kickAmt: 0, kickRot: 0, swayX: -4, swayY: 3, muzzle: 0, zoomLerp: 0 };
}

const POSES: Array<[string, (cur: number) => Scenario, number]> = [
  ["idle", idleScenario, 301],
  ["fire", fireScenario, 302],
  ["reloadA", reloadAScenario, 303],
  ["reloadB", reloadBScenario, 304],
  ["sprint", sprintScenario, 305],
];

describe("sprint/walk weapon-bob amplitude constants", () => {
  it("pins the exact tuned values (player feedback round 1, task 3, 2026-09-17), not just their ratio", () => {
    // The sprint-pose call-log comparison below derives its expected offset
    // FROM Draw.SPRINT_BOB_AMT, so it stays green under any value of that
    // constant — it pins the *formula*, not the *number*. This pins the
    // number: sabotaged locally (0.38->0.40) while writing this test, and
    // confirmed the call-log comparison alone stayed green, which is why
    // this exists as a separate assertion.
    expect(Draw.WALK_BOB_AMT).toBe(0.28);
    expect(Draw.SPRINT_BOB_AMT).toBe(0.38);
  });
});

describe("drawViewmodel behavioral parity with reference, per weapon slot and animation frame", () => {
  WEAPON_STATS.forEach((weapon, cur) => {
    describe(`weapon ${cur} (${weapon.name})`, () => {
      for (const [label, makeScenario, seed] of POSES) {
        it(`${label}: draws an identical ordered sequence of canvas calls as the reference${label === "sprint" ? " (offset by the Phase-feedback sprint-bob divergence — see below)" : ""}`, () => {
          const scenario = makeScenario(cur);
          const referenceCalls = refKitAndDrawWindow(seed * 100 + cur, toRefGlobals(scenario), (fns) => fns.drawViewmodel(0.016, 1234.5));
          const modCalls = moduleWindow(seed * 100 + cur, () => Draw.drawViewmodel(0.016, 1234.5, toViewmodelFrame(scenario), WEAPON_STATS));

          expect(referenceCalls.length).toBeGreaterThan(3);

          if (label === "sprint") {
            // Deliberate divergence (player feedback round 1, task 3,
            // 2026-09-17): the module's sprint weapon-bob amplitude dropped
            // from 0.55 to Draw.SPRINT_BOB_AMT (see draw.ts's doc comment),
            // while the frozen reference (Global Constraints:
            // reference/sonsurum.html is never edited) still swings at the
            // original 0.55. bobAmt is a pure multiplier on bx/by
            // (bx=sin(bobT*4)*2.4*bobAmt, by=|cos(bobT*4)|*1.8*bobAmt), and
            // moveAmt=1 at this scenario's speed, so the two sides' only
            // difference is a fixed additive offset on the ONE translate()
            // call sprintScenario reaches (muzzle=0, so the muzzle-flash
            // translate never fires here) — expressed below from bobT=2.1
            // (shared by every weapon's sprint scenario) rather than as a
            // second copy of the magic 0.38, so this test tracks
            // SPRINT_BOB_AMT if it's tuned again.
            const bobT = scenario.bobT;
            const deltaAmt = Draw.SPRINT_BOB_AMT - 0.55;
            const dx = Math.sin(bobT * 4) * 2.4 * deltaAmt;
            const dy = Math.abs(Math.cos(bobT * 4)) * 1.8 * deltaAmt;
            expect(dx).not.toBe(0); // otherwise this whole branch would be a no-op silently passing

            // Same length and same method/arg-count shape as the reference,
            // checked structurally first so a real call-order or call-count
            // regression still fails loudly here rather than being masked
            // by the per-call tolerance below.
            expect(modCalls.map((c) => c.method)).toEqual(referenceCalls.map((c) => c.method));
            referenceCalls.forEach((refCall, idx) => {
              const modCall = modCalls[idx];
              if (refCall.method !== "translate") {
                expect(modCall).toEqual(refCall);
                return;
              }
              // toEqual (used everywhere else in this file) demands bit-exact
              // numbers; reconstructing "the reference's x/y plus the bob
              // delta" by addition is not bit-exact against the module's own
              // sin(bobT*4)*2.4*bobAmt (float addition/subtraction is not
              // perfectly associative), so this one call compares to ~1e-9,
              // far tighter than the ~0.15-0.35 unit shift the amplitude
              // change actually produces and far looser than the ~1e-13
              // rounding noise this reconstruction introduces.
              const [refX, refY] = refCall.args as number[];
              const [modX, modY] = modCall.args as number[];
              expect(modX).toBeCloseTo(refX + dx, 9);
              expect(modY).toBeCloseTo(refY + dy, 9);
            });
          } else {
            expectCallLogEqual(modCalls, referenceCalls, `drawViewmodel weapon ${cur} (${weapon.name}) ${label} call log`);
          }
        });
      }
    });
  });

  it("weapon 4 (sniper) scoped in: both sides agree drawViewmodel draws nothing (zoomLerp>=.85 && cur===4)", () => {
    const scenario: Scenario = { ...idleScenario(4), zoomLerp: 0.9 };
    const referenceCalls = refKitAndDrawWindow(399, toRefGlobals(scenario), (fns) => fns.drawViewmodel(0.016, 1234.5));
    const modCalls = moduleWindow(399, () => Draw.drawViewmodel(0.016, 1234.5, toViewmodelFrame(scenario), WEAPON_STATS));
    expect(referenceCalls).toEqual([]);
    expectCallLogEqual(modCalls, referenceCalls, "drawViewmodel weapon 4 scoped-in call log");
  });
});

/**
 * Extracts the reference's OWN per-weapon pixel rows independently of
 * src/render/viewmodel/pixels/{weapons0,weapons1}.ts's WEAPON_PIXELS — runs
 * the reference's real buildWeaponSprites() with pxCanvas faked to the
 * identity function, so reg()'s frames.map(f=>pxCanvas(f,GP)) hands back
 * the raw row arrays instead of a baked (and therefore, for a JSON-based
 * log-comparison, opaque) canvas. Deliberately independent of the module's
 * WEAPON_PIXELS: if a sabotage ever landed in that file, this function
 * would still return the untouched reference text, so the per-weapon test
 * below (which compares module WEAPON_PIXELS against *this*) would still
 * catch it — feeding the same (sabotaged) array to both sides would prove
 * nothing.
 */
function referenceWeaponFrames(): Array<{ idle: string[][]; fire: string[][]; reload: string[][] }> {
  const captured: Record<number, { idle: string[][]; fire: string[][]; reload: string[][] }> = {};
  evalReference(
    [refSource(REF.viewmodelBuildWeaponSprites)],
    "buildWeaponSprites()",
    { WPX: captured, GP: {}, pxCanvas: (rows: string[]) => rows },
  );
  return Object.keys(captured).map(Number).sort((a, b) => a - b).map((k) => captured[k]);
}

describe("pxCanvas behavioral parity with reference, per weapon slot (the Step 3 per-weapon sabotage target)", () => {
  const refFrames = referenceWeaponFrames();

  WEAPON_STATS.forEach((weapon, cur) => {
    it(`weapon ${cur} (${weapon.name}): bakes an identical ordered sequence of canvas calls as the reference's own idle frame`, () => {
      const referenceCalls = normalizeIds((() => {
        const { ctx, calls } = recordingCanvas();
        const restoreGetContext = installRecordingGetContext(ctx, calls);
        try {
          const ref = evalReference<{ pxCanvas: (rows: string[], pal: Record<string, string>) => unknown; GP: Record<string, string> }>(
            [refSource(REF.viewmodelSprites)],
            "({pxCanvas, GP})",
            { document },
          );
          ref.pxCanvas(refFrames[cur].idle[0], ref.GP);
        } finally {
          restoreGetContext();
        }
        return calls;
      })());

      const modCalls = moduleWindow(1, () => {
        modulePxCanvas(moduleWEAPON_PIXELS[cur].idle[0], moduleGP);
      });

      expect(referenceCalls.length).toBeGreaterThan(10);
      expectCallLogEqual(modCalls, referenceCalls, `pxCanvas weapon ${cur} (${weapon.name}) idle-frame call log`);
    });
  });
});
