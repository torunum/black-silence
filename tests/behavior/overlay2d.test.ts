// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { loadGameHtml } from "../support/domStubs";
import { recordingCanvas, installRecordingGetContext, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { recordingAudioContext } from "../support/recordingAudio";
import { audioInit as moduleAudioInit } from "../../src/audio/AudioEngine";
import type * as Overlay2DModule from "../../src/render/Overlay2D";

/**
 * The overlay half of the behavioral oracle — src/render/Overlay2D.ts's
 * sizeFx, ejectCasing, screenBlood, spawnPuff and fxTick, compared against
 * reference/sonsurum.html's originals (REF.overlay2d + REF.fxTick). Closes
 * KNOWN-6, which recorded that this whole module shipped with zero coverage:
 * seven simultaneous art/physics edits to it passed all 272 tests.
 *
 * Three things shape this file:
 *
 * 1. **The module captures its 2D context eagerly**, at its own top level
 *    (`fx.getContext("2d")`), so — exactly as in tests/behavior/viewmodel.test.ts
 *    — Overlay2D.ts is imported *dynamically* inside beforeAll, after
 *    loadGameHtml() has put `#fx2d` in the DOM and after one recording
 *    context has been installed for the rest of this file's process. Every
 *    module-side comparison slices its own window out of that one growing
 *    log.
 * 2. **The module's casings/puffs/bloodHits are private.** They can only be
 *    filled through ejectCasing/screenBlood/spawnPuff — all three of which
 *    draw from Math.random — and only be observed through the draw calls
 *    fxTick makes for them. Seeding Math.random identically on both sides
 *    therefore does double duty: it makes the spawned particles equal, and
 *    it makes each frame's integration observable through the arguments of
 *    translate/arc/fillStyle. Both pools also survive between tests (module
 *    singleton), so every window drains them first — see drainModulePools.
 * 3. **The reference computes its own FW/FH/VW/VH.** Its sizeFx() runs when
 *    its chunk is evaluated, from the same injected innerWidth/innerHeight
 *    the module's sizeFx() reads. Handing the module's getVW()/getVH() to
 *    the reference side instead would make a sabotaged sizeFx agree with
 *    itself — coverage that is present but not real, the second trap
 *    KNOWN-6 warns about.
 */

/**
 * ejectCasing's audio branch calls blip() through a static import, so the
 * only way to see its arguments is to replace the module. Everything else
 * in src/audio/Sfx.ts is passed through untouched. blipCalls stays empty for
 * every test but the last describe — until audioInit() runs, ejectCasing's
 * `if(ctx())` guard is false and no timer is ever scheduled.
 */
const { blipCalls } = vi.hoisted(() => ({ blipCalls: [] as unknown[][] }));
vi.mock("../../src/audio/Sfx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/audio/Sfx")>();
  return { ...actual, blip: (...args: unknown[]) => { blipCalls.push(args); } };
});

let moduleCalls: DrawCall[];
let Overlay2D: typeof Overlay2DModule;
/** Every event type src/render/Overlay2D.ts registered a listener for at import time, and the handler it registered — see the resize test. */
const moduleListeners: Array<[string, EventListenerOrEventListenerObject]> = [];

/**
 * The viewport both sides size their overlay from. Deliberately 16:9 rather
 * than the 4:3 the module's FW/FH/VW/VH defaults (640/400/320/200) imply, so
 * a test that quietly assumed those defaults would not pass.
 */
const VIEWPORT: readonly [number, number] = [1280, 720];

/**
 * Used by exactly one test below, the life-expiry pin: a viewport tall
 * enough (VH=4800) that the `y>VH+10` offscreen cull can never fire within a
 * casing's 1.6s life, so life expiry — not position — is what removes it.
 * Every ordinary viewport in this describe culls a casing off-screen in
 * under 1.2s, well inside its life, which is exactly why `life` stayed
 * unobservable until KNOWN-7 closed (KNOWN-6's former exception).
 *
 * This describe used to also need a deliberately absurd 8000x1000
 * "WIDE_VIEWPORT" just to reach a casing at all — the fix means every case
 * below now runs at an ordinary viewport instead, which is itself the
 * clearest evidence the underlying bug is gone.
 */
const TALL_VIEWPORT: readonly [number, number] = [200, 3000];

function setViewport([w, h]: readonly [number, number]): void {
  Object.defineProperty(globalThis, "innerWidth", { value: w, configurable: true, writable: true });
  Object.defineProperty(globalThis, "innerHeight", { value: h, configurable: true, writable: true });
}

beforeAll(async () => {
  loadGameHtml(); // installs the real <canvas id="fx2d"> from index.html, before Overlay2D.ts's first (dynamic) import below
  setViewport(VIEWPORT);

  const rec = recordingCanvas();
  moduleCalls = rec.calls;
  // Never uninstalled: this becomes Overlay2D.ts's permanent fx2d context.
  installRecordingGetContext(rec.ctx, rec.calls);

  // Recorded *and* forwarded: the resize test below dispatches a real event
  // through jsdom to prove the registered handler is sizeFx itself.
  const realAdd = globalThis.addEventListener.bind(globalThis);
  (globalThis as unknown as { addEventListener: unknown }).addEventListener = (
    type: string, handler: EventListenerOrEventListenerObject, ...rest: unknown[]
  ) => {
    moduleListeners.push([type, handler]);
    return (realAdd as (...a: unknown[]) => unknown)(type, handler, ...rest);
  };
  try {
    Overlay2D = await import("../../src/render/Overlay2D");
  } finally {
    (globalThis as unknown as { addEventListener: unknown }).addEventListener = realAdd;
  }
});

/** The reference's overlay, evaluated in one sandbox: its state, sizeFx, ejectCasing, screenBlood and fxTick, plus accessors this side of the boundary needs. */
interface RefOverlay {
  sizeFx: () => void;
  ejectCasing: (kind: number) => void;
  screenBlood: () => void;
  fxTick: (dt: number, t: number) => void;
  /** The reference's `puffs` array is private to its chunk the same way the module's is — this mirrors src/render/Overlay2D.ts's spawnPuff parameter-for-parameter. */
  pushPuff: (x: number, y: number, vx: number, r: number, life: number) => void;
  /** Reads the reference's live FW/FH/VW/VH lexical bindings, so sizeFx's arithmetic can be compared without trusting the module's copy. */
  dims: () => { FW: number; FH: number; VW: number; VH: number };
  /** Pool sizes, so "the casing was culled" can be asserted directly and not only inferred from an absent draw call. */
  counts: () => { casings: number; puffs: number; bloodHits: number };
}

const REF_CHUNKS = [refSource(REF.mathHelpers), refSource(REF.overlay2d), refSource(REF.fxTick)];
const REF_EXPR =
  "({sizeFx,ejectCasing,screenBlood,fxTick," +
  "pushPuff:(x,y,vx,r,life)=>{puffs.push({x,y,vx,r,life});}," +
  "dims:()=>({FW,FH,VW,VH})," +
  "counts:()=>({casings:casings.length,puffs:puffs.length,bloodHits:bloodHits.length})})";

interface RefSession {
  /** Draw calls made after the sandbox was built — the module's equivalent window starts after its own setup too. */
  calls: DrawCall[];
  /** [type, handler] pairs the reference's own `addEventListener("resize",sizeFx)` produced. */
  listeners: Array<[string, () => void]>;
}

/**
 * Builds a fresh reference overlay sandbox, runs `run` under seed `seed`,
 * and returns only the draw calls `run` produced.
 *
 * `AC` is injected as null (audio off) so ejectCasing's trailing
 * `if(AC)setTimeout(...)` costs the shared PRNG sequence nothing on this
 * side either — the module's `if(ctx())` is false for the same reason until
 * the final describe. `Math` is the *outer* Math on purpose: seedRandom
 * patches that one, and a sandbox's own realm Math would be unseeded.
 */
function refWindow(
  seed: number,
  globals: Record<string, unknown>,
  run: (api: RefOverlay, session: RefSession) => void,
  viewport: readonly [number, number] = VIEWPORT,
): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const restoreCtx = installRecordingGetContext(ctx, calls);
  const listeners: Array<[string, () => void]> = [];
  try {
    const api = evalReference<RefOverlay>(REF_CHUNKS, REF_EXPR, {
      document, Math, AC: null,
      innerWidth: viewport[0], innerHeight: viewport[1],
      addEventListener: (type: string, handler: () => void) => { listeners.push([type, handler]); },
      zoomLerp: 0, drawKickBoot: () => { calls.push({ method: "callback:drawKick", args: [] }); },
      drawViewmodel: (dt: number, t: number) => { calls.push({ method: "callback:drawVm", args: [dt, t] }); },
      ...globals,
    });
    const start = calls.length; // drops the sandbox's own getContext entry and its startup sizeFx
    const restoreRandom = seedRandom(seed);
    try {
      run(api, { calls, listeners });
    } finally {
      restoreRandom();
    }
    return calls.slice(start);
  } finally {
    restoreCtx();
  }
}

/**
 * Empties the module's three private pools. One tick with a dt larger than
 * any life used here drives every entry's life below zero, and every loop
 * splices on that — so the next window starts from the same empty state the
 * reference's freshly-evaluated sandbox does.
 */
function drainModulePools(): void {
  Overlay2D.fxTick(10, 0, 0, () => {}, () => {});
}

/** Runs `run` under seed `seed` against the module, returning only the draw calls it appended to the shared log. */
function moduleWindow(seed: number, run: () => void, viewport: readonly [number, number] = VIEWPORT): DrawCall[] {
  drainModulePools();
  setViewport(viewport);
  Overlay2D.sizeFx();
  const start = moduleCalls.length;
  const restore = seedRandom(seed);
  try {
    run();
  } finally {
    restore();
  }
  return moduleCalls.slice(start);
}

/** The module-side counterpart of the reference's injected drawKickBoot/drawViewmodel: logs into the same call log, in the same shape. */
function moduleCallbacks(): [() => void, (dt: number, t: number) => void] {
  return [
    () => { moduleCalls.push({ method: "callback:drawKick", args: [] }); },
    (dt: number, t: number) => { moduleCalls.push({ method: "callback:drawVm", args: [dt, t] }); },
  ];
}

/** Ticks the module's fxTick `frames` times at `dt`, with the marker callbacks. */
function moduleTicks(frames: number, dt: number, zoomLerp: number, t0 = 0): void {
  const [kick, vm] = moduleCallbacks();
  for (let i = 0; i < frames; i++) Overlay2D.fxTick(dt, t0 + i * dt, zoomLerp, kick, vm);
}

/** Ticks the reference's fxTick `frames` times at `dt` — its zoomLerp came from the sandbox globals, so it is not a parameter here. */
function refTicks(api: RefOverlay, frames: number, dt: number, t0 = 0): void {
  for (let i = 0; i < frames; i++) api.fxTick(dt, t0 + i * dt);
}

const DT = 1 / 60;

describe("sizeFx — the overlay's resize math", () => {
  it.each([
    ["16:9", [1280, 720]],
    ["4:3", [1024, 768]],
    ["ultrawide", [2560, 1080]],
    ["portrait", [600, 900]],
    // The four above all divide evenly enough that Math.round, Math.floor
    // and Math.ceil agree on VH — a sizeFx that used the wrong one would
    // pass on every one of them. These two do not: VH lands on .75 (round
    // and ceil up, floor down) and on .25 (round and floor down, ceil up).
    ["VH rounding up, FH on a .5 boundary", [1280, 643]],
    ["VH rounding down", [1280, 645]],
  ] as Array<[string, [number, number]]>)("derives the same FW/FH/VW/VH and canvas size as the reference at %s", (_label, viewport) => {
    setViewport(viewport);
    Overlay2D.sizeFx();
    const canvas = document.getElementById("fx2d") as HTMLCanvasElement;
    const moduleDims = { FW: canvas.width, FH: canvas.height, VW: Overlay2D.getVW(), VH: Overlay2D.getVH() };

    // The reference's chunk runs its own sizeFx() on evaluation and writes
    // the same DOM element, so its canvas size is read straight afterwards.
    let referenceDims!: { FW: number; FH: number; VW: number; VH: number };
    let referenceCanvas!: { width: number; height: number };
    refWindow(1, {}, (api) => {
      api.sizeFx();
      referenceDims = api.dims();
      referenceCanvas = { width: canvas.width, height: canvas.height };
    }, viewport);

    expect(moduleDims).toEqual(referenceDims);
    expect({ width: moduleDims.FW, height: moduleDims.FH }).toEqual(referenceCanvas);
    // Guards against a sizeFx that returned the 640/400/320/200 defaults
    // untouched and so agreed with itself at every viewport.
    expect(moduleDims.FW).toBe(640);
    expect(moduleDims.FH).toBe(Math.round(640 / (viewport[0] / viewport[1])));
    expect(moduleDims.VH).toBe(Math.round(320 / (viewport[0] / viewport[1])));
  });

  it("registers exactly one resize listener at import, and it is sizeFx (a real resize event re-derives the viewport)", () => {
    expect(moduleListeners.map(([type]) => type)).toEqual(["resize"]);

    setViewport([1280, 720]);
    Overlay2D.sizeFx();
    expect(Overlay2D.getVH()).toBe(180);

    setViewport([1000, 500]);
    window.dispatchEvent(new Event("resize"));
    expect(Overlay2D.getVH()).toBe(160); // 320/2, only reachable if the listener ran sizeFx

    const refListeners = ((): Array<[string, () => void]> => {
      let captured: Array<[string, () => void]> = [];
      refWindow(1, {}, (_api, session) => { captured = session.listeners; });
      return captured;
    })();
    expect(refListeners.map(([type]) => type)).toEqual(["resize"]);
  });
});

describe("fxTick — the per-frame overlay clear and transform", () => {
  it("clears, disables smoothing and upscales identically to the reference on an empty frame", () => {
    const referenceCalls = refWindow(11, {}, (api) => refTicks(api, 1, DT));
    const modCalls = moduleWindow(11, () => moduleTicks(1, DT, 0));

    expectCallLogEqual(modCalls, referenceCalls, "fxTick empty-frame call log");
    // Pinned explicitly as well as by parity: this is the frame preamble
    // every other case in this file rides on, and an all-empty log would
    // make every comparison below vacuously true.
    expect(modCalls).toEqual([
      { method: "setTransform", args: [1, 0, 0, 1, 0, 0] },
      { method: "clearRect", args: [0, 0, 640, 360] },
      { method: "set:imageSmoothingEnabled", args: [false] },
      { method: "scale", args: [2, 2] },
      { method: "callback:drawKick", args: [] },
      { method: "callback:drawVm", args: [DT, 0] },
    ]);
  });

  it("calls drawKick then drawVm last, after the pools are drawn", () => {
    const modCalls = moduleWindow(12, () => {
      Overlay2D.screenBlood();
      Overlay2D.spawnPuff(40, 60, 12, 3, 0.9);
      moduleTicks(1, DT, 0.8);
    });
    const tail = modCalls.slice(-2).map((c) => c.method);
    expect(tail).toEqual(["callback:drawKick", "callback:drawVm"]);
    // ...and they really came after drawing work, not after an empty frame.
    expect(modCalls.filter((c) => c.method === "arc").length).toBeGreaterThan(0);
  });
});

describe("screenBlood — the screen blood flash", () => {
  it("spawns and fades an identical splat set to the reference over 12 frames, scaled into the 320-space fxTick draws in (Phase 2 divergence closing KNOWN-7: the frozen reference is unchanged and still spawns in 640-space)", () => {
    const referenceCalls = refWindow(21, {}, (api) => {
      api.screenBlood();
      refTicks(api, 12, DT);
    });
    const modCalls = moduleWindow(21, () => {
      Overlay2D.screenBlood();
      moduleTicks(12, DT, 0);
    });

    // 5 splats x 12 frames x (fillStyle, beginPath, arc, fill) plus the
    // per-frame preamble — a log too short to be a real comparison would be
    // caught here.
    expect(referenceCalls.length).toBeGreaterThan(300);

    // Deliberate Phase 2 divergence (KNOWN-7): the module now spawns blood
    // at rnd(0,VW)/rnd(0,VH) — the space fxTick actually draws in — while
    // the frozen reference (Global Constraints: reference/sonsurum.html is
    // never edited) is unchanged and still spawns at rnd(0,FW)/rnd(0,FH).
    // Both sides draw the same seeded Math.random() sequence in the same
    // order, and FW/VW is exactly 640/320=2 always (VH/FH is 180/360=2 too,
    // at this 16:9 VIEWPORT), so every arc's x and y is exactly half of the
    // reference's. Radius, call order and fillStyle alpha are untouched by
    // the fix, so halving the reference's arc x/y and comparing the whole
    // log through expectCallLogEqual proves both at once: the fix landed,
    // and nothing else moved — this keeps the reference visible as the
    // record of what changed, rather than dropping the comparison.
    const halved = referenceCalls.map((c) =>
      c.method === "arc"
        ? { ...c, args: [(c.args as number[])[0] / 2, (c.args as number[])[1] / 2, ...(c.args as number[]).slice(2)] }
        : c,
    );
    expectCallLogEqual(modCalls, halved, "screenBlood call log (module vs halved 640-space reference)");
    // And explicitly, not only implied by the halving above: the reference
    // itself still spawns splats outside the 320x180 canvas fxTick draws
    // into — the bug, unchanged.
    const refArcsRaw = referenceCalls.filter((c) => c.method === "arc").map((c) => c.args as number[]);
    expect(refArcsRaw.some(([x, y]) => x >= 320 || y >= 180)).toBe(true);

    // The count, radii and fade rate, pinned as values and not only as a
    // diff: KNOWN-6's sabotage list included 5→6 splats, rnd(6,22)→rnd(6,26)
    // radii and a .6→.7 fade, and each one has to fail here on its own.
    const endOfFirstFrame = modCalls.findIndex((c) => c.method === "callback:drawKick");
    const firstFrameArcs = modCalls.slice(0, endOfFirstFrame).filter((c) => c.method === "arc");
    expect(firstFrameArcs.length).toBe(5);
    for (const arc of firstFrameArcs) {
      const [x, y, r] = arc.args as number[];
      expect(r).toBeGreaterThanOrEqual(6);
      expect(r).toBeLessThan(22);
      // Pinned directly, not only via the halved-reference comparison
      // above: every splat now lands inside the 320x180 canvas fxTick
      // actually draws into (KNOWN-7).
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(320);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(180);
    }
    const alphas = modCalls
      .filter((c) => c.method === "set:fillStyle")
      .map((c) => Number(/rgba\(110,18,8,([\d.e-]+)\)/.exec(String(c.args[0]))?.[1]));
    expect(alphas[0]).toBeCloseTo((1 - DT * 0.6) * 0.5, 12);
    expect(alphas[5]).toBeCloseTo((1 - 2 * DT * 0.6) * 0.5, 12);
  });

  it("agrees with the reference on when the last splat is spliced away (a full 1/(dt*.6) second fade)", () => {
    // 100 frames at dt=.02 is 2s — comfortably past the 1/.6 ≈ 1.67s life.
    const referenceCalls = refWindow(22, {}, (api, session) => {
      api.screenBlood();
      refTicks(api, 100, 0.02);
      session.calls.push({ method: "assert:pools", args: [api.counts()] });
    });
    const modCalls = moduleWindow(22, () => {
      Overlay2D.screenBlood();
      moduleTicks(100, 0.02, 0);
    });

    const lastRefArc = referenceCalls.map((c) => c.method).lastIndexOf("arc");
    const lastModArc = modCalls.map((c) => c.method).lastIndexOf("arc");
    expect(lastModArc).toBe(lastRefArc);
    expect(referenceCalls[referenceCalls.length - 1]).toEqual({
      method: "assert:pools", args: [{ casings: 0, puffs: 0, bloodHits: 0 }],
    });
    // 84 frames x .02s x .6 = 1.008 > 1: the fade must not still be running.
    expect(referenceCalls.slice(0, lastRefArc).filter((c) => c.method === "arc").length).toBeGreaterThan(400);
  });
});

describe("spawnPuff — the muzzle smoke pool", () => {
  it("rises, drifts, grows and fades identically to the reference", () => {
    const spawn = (push: (x: number, y: number, vx: number, r: number, life: number) => void) => {
      push(150, 120, 9, 2, 0.8);
      push(170, 130, -6, 3.5, 0.5);
      push(160, 110, 0, 1, 0.25); // dies mid-run: exercises the splice
    };
    const referenceCalls = refWindow(31, {}, (api) => {
      spawn(api.pushPuff);
      refTicks(api, 40, DT);
    });
    const modCalls = moduleWindow(31, () => {
      spawn(Overlay2D.spawnPuff);
      moduleTicks(40, DT, 0);
    });

    expect(referenceCalls.length).toBeGreaterThan(200);
    expectCallLogEqual(modCalls, referenceCalls, "spawnPuff call log");

    // The three per-frame constants (y-=14dt, x+=vx*dt, r+=8dt) read off the
    // first puff's own arc arguments across two consecutive frames.
    const arcs = modCalls.filter((c) => c.method === "arc").map((c) => c.args as number[]);
    const firstFrame = arcs.slice(0, 3);
    const secondFrame = arcs.slice(3, 6);
    // Pools are walked backwards, so index 2 of each frame is the puff pushed first.
    expect(secondFrame[2][1] - firstFrame[2][1]).toBeCloseTo(-14 * DT, 12);
    expect(secondFrame[2][0] - firstFrame[2][0]).toBeCloseTo(9 * DT, 12);
    expect(secondFrame[2][2] - firstFrame[2][2]).toBeCloseTo(8 * DT, 12);
  });
});

describe("ejectCasing — the spent shell arc", () => {
  // Phase 2 divergence (KNOWN-7): the module now spawns a casing at
  // VW/2+rnd(4,12), VH*.62 — the 320-space fxTick actually culls and draws
  // in. reference/sonsurum.html is never edited (Global Constraints) and
  // still spawns at FW/2+rnd(4,12), FH*.62, so at every viewport this
  // describe uses — all ordinary now, see "now reaches the screen" below for
  // why WIDE_VIEWPORT is gone — the reference's casing is culled on its own
  // first tick, before it ever draws. From here on the module's new
  // behavior and the reference's unchanged behavior are asserted directly,
  // side by side, each commented as the divergence, rather than feeding a
  // now-empty reference log into expectCallLogEqual.
  it.each([0, 1, 2, 3])("kind %i: draws an identical arc, spin and colour sequence to the reference's own formula, now reachable at an ordinary viewport (closes KNOWN-7)", (kind) => {
    const referenceCalls = refWindow(41 + kind, {}, (api) => {
      api.ejectCasing(kind);
      refTicks(api, 40, DT);
    });
    const modCalls = moduleWindow(41 + kind, () => {
      Overlay2D.ejectCasing(kind);
      moduleTicks(40, DT, 0);
    });

    // The frozen reference: still culled before its first draw, even at an
    // ordinary viewport — the bug, unchanged.
    expect(referenceCalls.filter((c) => c.method === "translate")).toEqual([]);

    // The per-kind art, asserted as values straight off the module's own
    // draws (the reference's are empty, so there is nothing to diff against
    // here): a colour swap between kinds is the single most likely
    // regression, and a pure log diff would catch it only if the two logs
    // were built from different code.
    const fills = modCalls.filter((c) => c.method === "set:fillStyle").map((c) => c.args[0]);
    const widths = modCalls.filter((c) => c.method === "fillRect").map((c) => (c.args as number[])[2]);
    if (kind === 2) {
      expect(fills.slice(0, 2)).toEqual(["#8a2a14", "#a08c5a"]); // brass stripe on the shotgun shell
      expect(widths.slice(0, 2)).toEqual([5, 1]);
    } else if (kind === 3) {
      expect(fills[0]).toBe("#b8b2a6");
      expect(widths[0]).toBe(6);
      expect(fills.slice(0, 4)).not.toContain("#a08c5a");
    } else {
      expect(fills[0]).toBe("#a08c5a");
      expect(widths[0]).toBe(4);
    }
    expect(new Set(modCalls.filter((c) => c.method === "fillRect").map((c) => (c.args as number[]).join(",")).slice(0, 2)).size)
      .toBe(kind === 2 ? 2 : 1);

    // Gravity, read off two consecutive translate() calls: y accelerates by
    // exactly 240*dt*dt per frame. KNOWN-6's 240→260 sabotage dies here even
    // if the reference side were ever fed the same broken constant.
    const ys = modCalls.filter((c) => c.method === "translate").map((c) => (c.args as number[])[1]);
    expect(ys.length).toBeGreaterThan(4);
    const d1 = ys[1] - ys[0], d2 = ys[2] - ys[1];
    expect(d2 - d1).toBeCloseTo(240 * DT * DT, 12);
    // ...and horizontal drift stays linear (no gravity on x).
    const xs = modCalls.filter((c) => c.method === "translate").map((c) => (c.args as number[])[0]);
    expect(xs[2] - xs[1]).toBeCloseTo(xs[1] - xs[0], 12);
  });

  it("spawns at VW/2+rnd(4,12), VH*.62 with an upward vy — 320-space, the space fxTick actually culls and draws in (closes KNOWN-7; re-derived from VW/VH, not halved by eye — see the task report)", () => {
    const referenceCalls = refWindow(51, {}, (api) => {
      api.ejectCasing(0);
      refTicks(api, 2, DT);
    });
    const modCalls = moduleWindow(51, () => {
      Overlay2D.ejectCasing(0);
      moduleTicks(2, DT, 0);
    });
    // The frozen reference: culled on its first tick at this ordinary
    // viewport, same as every case in this describe — it never reaches a
    // translate() call at all.
    expect(referenceCalls.filter((c) => c.method === "translate")).toEqual([]);

    // VW is 320 at every aspect ratio; VH is 180 at the 16:9 VIEWPORT
    // (VH = Math.round(320 / (1280/720)) = 180) — the same relationship the
    // "sizeFx" describe above pins independently.
    const [x0, y0] = modCalls.find((c) => c.method === "translate")!.args as number[];
    expect(x0).toBeGreaterThan(320 / 2 + 4);
    expect(x0).toBeLessThan(320 / 2 + 12 + 55 * DT);
    expect(y0).toBeLessThan(180 * 0.62); // the first frame moves it UP, so vy started negative
    expect(y0).toBeGreaterThan(180 * 0.62 - 70 * DT);
    const rotations = modCalls.filter((c) => c.method === "rotate").map((c) => (c.args as number[])[0]);
    expect(rotations[1]).not.toBe(rotations[0]); // vr is non-zero: the shell spins
  });

  it("now reaches the screen at ordinary aspect ratios — casings spawn and are culled in the same VW/VH space (closes KNOWN-7; inverts the test that used to pin the bug)", () => {
    // Keep the viewport list: it is the proof the fix holds at real aspect
    // ratios, not just one contrived one.
    for (const viewport of [[1280, 720], [1024, 768], [2560, 1080], [600, 900]] as Array<[number, number]>) {
      const referenceCalls = refWindow(61, {}, (api, session) => {
        api.ejectCasing(1);
        refTicks(api, 3, DT);
        session.calls.push({ method: "assert:pools", args: [api.counts()] });
      }, viewport);
      const modCalls = moduleWindow(61, () => {
        Overlay2D.ejectCasing(1);
        moduleTicks(3, DT, 0);
      }, viewport);

      // The module now draws the casing at every one of these four ordinary
      // aspect ratios — the fix.
      expect(modCalls.filter((c) => c.method === "translate").length).toBeGreaterThan(0);
      // The frozen reference is unchanged: still culled before its first
      // draw, at every one of the same four viewports.
      expect(referenceCalls.filter((c) => c.method === "translate")).toEqual([]);
      expect(referenceCalls[referenceCalls.length - 1]).toEqual({
        method: "assert:pools", args: [{ casings: 0, puffs: 0, bloodHits: 0 }],
      });
    }
  });

  it("removes the casing when its life (1.6s) runs out, once it survives long enough for that to matter rather than the y>VH+10 cull (pins KNOWN-6's previously-unobservable literal, closed alongside KNOWN-7)", () => {
    // TALL_VIEWPORT keeps the casing on-screen (VH=4800) so the offscreen
    // cull can never fire within 1.6s of flight — see TALL_VIEWPORT's own
    // comment for why every ordinary viewport above cannot show this. Life
    // decays at a flat dt per frame regardless of the casing's randomized
    // velocity, so the frame it dies on is the same for every seed used in
    // this file: alive through frame 96 (t=1.6s, life just above 0), gone
    // by frame 97 (t≈1.617s) — verified directly below, not assumed.
    const modCalls = moduleWindow(66, () => {
      Overlay2D.ejectCasing(0);
      moduleTicks(96, DT, 0);
    }, TALL_VIEWPORT);
    expect(modCalls.some((c) => c.method === "translate")).toBe(true);
    const lastY = modCalls.filter((c) => c.method === "translate").map((c) => (c.args as number[])[1]).at(-1)!;
    // Proves it is life, not position, that is about to remove it.
    expect(lastY).toBeLessThan(Overlay2D.getVH() + 10);

    const before = moduleCalls.length;
    moduleTicks(1, DT, 0); // frame 97: life has just crossed 0
    expect(moduleCalls.slice(before).filter((c) => c.method === "translate")).toEqual([]);
  });
});

describe("the sniper scope vignette", () => {
  it.each([0, 0.25, 0.5])("draws nothing at zoomLerp=%s (at or below the .5 threshold)", (zoomLerp) => {
    const referenceCalls = refWindow(71, { zoomLerp }, (api) => refTicks(api, 1, DT));
    const modCalls = moduleWindow(71, () => moduleTicks(1, DT, zoomLerp));
    expectCallLogEqual(modCalls, referenceCalls, `scope zoomLerp=${zoomLerp} call log`);
    expect(modCalls.filter((c) => c.method === "rect")).toEqual([]);
    expect(modCalls.filter((c) => c.method === "stroke")).toEqual([]);
  });

  it.each([0.5001, 0.75, 1])("draws the same vignette, crosshair and darkness as the reference at zoomLerp=%s", (zoomLerp) => {
    const referenceCalls = refWindow(72, { zoomLerp }, (api) => refTicks(api, 1, DT));
    const modCalls = moduleWindow(72, () => moduleTicks(1, DT, zoomLerp));
    expectCallLogEqual(modCalls, referenceCalls, `scope zoomLerp=${zoomLerp} call log`);

    // VH is 180 at the 16:9 test viewport, so the scope radius is 75.6 and
    // the crosshair spans VW/2±r — pinned as values so a change to .42, to
    // the 1.6 darkness slope, or to the crosshair geometry fails here too.
    const r = 180 * 0.42;
    expect(modCalls).toContainEqual({ method: "set:fillStyle", args: [`rgba(0,0,0,${(zoomLerp - 0.5) * 1.6})`] });
    expect(modCalls).toContainEqual({ method: "rect", args: [0, 0, 320, 180] });
    expect(modCalls).toContainEqual({ method: "arc", args: [160, 90, r, 0, 7, true] });
    expect(modCalls).toContainEqual({ method: "set:strokeStyle", args: ["rgba(180,178,166,.6)"] });
    expect(modCalls).toContainEqual({ method: "set:lineWidth", args: [1] });
    expect(modCalls).toContainEqual({ method: "moveTo", args: [160 - r, 90] });
    expect(modCalls).toContainEqual({ method: "lineTo", args: [160 + r, 90] });
    expect(modCalls).toContainEqual({ method: "moveTo", args: [160, 90 - r] });
    expect(modCalls).toContainEqual({ method: "lineTo", args: [160, 90 + r] });
  });

  it("draws the vignette over the pools, under the viewmodel", () => {
    const modCalls = moduleWindow(73, () => {
      Overlay2D.screenBlood();
      moduleTicks(1, DT, 0.9);
    });
    const methods = modCalls.map((c) => c.method);
    expect(methods.lastIndexOf("fill")).toBeLessThan(methods.indexOf("stroke"));
    expect(methods.indexOf("rect")).toBeGreaterThan(methods.indexOf("arc"));
    expect(methods.indexOf("stroke")).toBeLessThan(methods.indexOf("callback:drawKick"));
  });
});

/**
 * LAST, and deliberately so: audioInit() flips src/audio/AudioEngine.ts's
 * module-private AC for the rest of the process, which turns on
 * ejectCasing's `if(ctx())` branch and its two extra rnd() draws — every
 * comparison above assumes that branch is off on both sides.
 */
describe("ejectCasing's delayed casing-clink (the audio branch)", () => {
  /** `new Ctor()` always hands back `target` — how audioInit's `new AudioContext()` gets a recording context. */
  function constructorReturning(target: unknown): unknown {
    return function (this: unknown) { return target; } as unknown;
  }

  it("schedules nothing while audio is off", () => {
    expect(blipCalls).toEqual([]);
    const spy = vi.spyOn(globalThis, "setTimeout");
    try {
      moduleWindow(81, () => Overlay2D.ejectCasing(0));
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("after audioInit, schedules one blip at the same rnd(250,450) delay the reference does, with the same rnd(1800,2600) tone", () => {
    const { ctx } = recordingAudioContext();
    const previousAudioCtor = (globalThis as { AudioContext?: unknown }).AudioContext;
    (globalThis as { AudioContext?: unknown }).AudioContext = constructorReturning(ctx);
    vi.useFakeTimers();
    let moduleDelay: number | undefined;
    let moduleNextRandom: number | undefined;
    try {
      moduleAudioInit();
      blipCalls.length = 0;
      const spy = vi.spyOn(globalThis, "setTimeout");
      moduleWindow(91, () => {
        Overlay2D.ejectCasing(2);
        moduleDelay = spy.mock.calls[0]?.[1] as number;
        vi.runAllTimers();
        moduleNextRandom = Math.random(); // proves the fired callback consumed exactly one draw
      });
      spy.mockRestore();
    } finally {
      vi.useRealTimers();
      (globalThis as { AudioContext?: unknown }).AudioContext = previousAudioCtor;
    }

    // The reference side runs the same branch with AC truthy and its own
    // blip/setTimeout stubs, off the same seed.
    let refDelay: number | undefined;
    let refBlipArgs: unknown[] | undefined;
    let refNextRandom: number | undefined;
    refWindow(91, {
      AC: {},
      blip: (...args: unknown[]) => { refBlipArgs = args; },
      setTimeout: (fn: () => void, delay: number) => { refDelay = delay; fn(); return 0; },
    }, (api) => {
      api.ejectCasing(2);
      refNextRandom = Math.random();
    });

    expect(moduleDelay).toBe(refDelay);
    expect(moduleDelay).toBeGreaterThanOrEqual(250);
    expect(moduleDelay).toBeLessThan(450);
    expect(blipCalls.length).toBe(1);
    expect(blipCalls[0]).toEqual(refBlipArgs);
    expect(blipCalls[0].slice(1)).toEqual([0.04, "square", 0.025]);
    expect(blipCalls[0][0] as number).toBeGreaterThanOrEqual(1800);
    expect(blipCalls[0][0] as number).toBeLessThan(2600);
    // Both sides drew the same number of values from the seeded sequence.
    expect(moduleNextRandom).toBe(refNextRandom);
  });
});
