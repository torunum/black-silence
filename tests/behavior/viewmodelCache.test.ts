// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { loadGameHtml } from "../support/domStubs";
import { recordingCanvas, type DrawCall } from "../support/recordingCanvas";
import { WEAPON_STATS } from "../../src/weapons/definitions";
import type * as DrawModule from "../../src/render/viewmodel/draw";
import type * as PoseModule from "../../src/render/viewmodel/pose";

/**
 * What the viewmodel costs when nothing happens, and what it forgets when it
 * is not drawn — the whole-branch review of player feedback round 2
 * (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md).
 *
 * - **The render cache.** draw.ts re-renders the model only when poseKey
 *   changes. Every Pose field but the screen terms must be in the key (a
 *   term left out would freeze on screen), and an unchanged pose must skip
 *   the render. The key is checked against the Pose's own keys, so a field
 *   added later is caught here until it is keyed or named a screen term.
 * - **At rest, rarely.** The reaper's rune ring idles round; it used to
 *   re-render on every frame at rest. Its spin is drawn in steps now
 *   (animate.ts's SPIN_STEPS): it still turns, on a small share of frames.
 *   The same holds for the nail cannon's wind-down.
 * - **Resync.** While the viewmodel is not drawn (dead, not started, the
 *   piano, scoped in) the animator does not step. What happened meanwhile —
 *   the killing blow's hurt cue, a fall — must not play on the first frame
 *   it is drawn again.
 *
 * A render is counted by the offscreen canvas's putImageData, which paint()
 * calls exactly once per render. Like viewmodel.test.ts, the modules are
 * imported after `#fx2d` exists and getContext is patched.
 */

let Draw: typeof DrawModule;
let PoseM: typeof PoseModule;
let puts = 0;
let fxCalls: DrawCall[];
const DT = 1 / 60;

beforeAll(async () => {
  loadGameHtml();
  const rec = recordingCanvas();
  fxCalls = rec.calls;
  const offscreen = {
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: () => { puts++; },
  };
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string): unknown {
    if (kind !== "2d") return null;
    return this.id === "fx2d" ? rec.ctx : offscreen;
  } as typeof HTMLCanvasElement.prototype.getContext;
  Draw = await import("../../src/render/viewmodel/draw");
  PoseM = await import("../../src/render/viewmodel/pose");
});

/** Standing still, weapon idle, nothing happening; breathing is 0 at tNow=0. */
function still(cur: number, over: Partial<DrawModule.ViewmodelFrame> = {}): DrawModule.ViewmodelFrame {
  return {
    started: true, dead: false, pianoOpen: false, zoomLerp: 0, cur,
    vx: 0, vz: 0, vy: 0, grounded: true, yaw: 0, sprintKey: false, bobT: 0, wstate: "idle", wtime: 0,
    equipT: 0.24, unequipT: 0.16, kickAmt: 0, kickRot: 0, kickAnim: 0, swayX: 0, swayY: 0, muzzle: 0,
    cueHurt: 0, cueHurtAmt: 0, cuePickup: 0, cueDryFire: 0, cueInput: 0, paused: false, hidden: false, ...over,
  };
}
/** Draws `frames` frames of `frame`, returning how many re-rendered the model. */
function renders(frames: number, frame: DrawModule.ViewmodelFrame): number {
  const before = puts;
  for (let i = 0; i < frames; i++) Draw.drawViewmodel(DT, 0, frame, WEAPON_STATS);
  return puts - before;
}
/** Switches to (or stays on) `cur` and settles for a second, with input coming in so no fidget is due for 6 s. */
let inputs = 0;
function settle(cur: number, over: Partial<DrawModule.ViewmodelFrame> = {}): DrawModule.ViewmodelFrame {
  for (let i = 0; i < 60; i++) Draw.drawViewmodel(DT, 0, still(cur, { ...over, cueInput: ++inputs }), WEAPON_STATS);
  return still(cur, { ...over, cueInput: inputs });
}
/** The overlay position drawImage put the weapon at, this frame. */
function blitAt(frame: DrawModule.ViewmodelFrame): [number, number] {
  const start = fxCalls.length;
  Draw.drawViewmodel(DT, 0, frame, WEAPON_STATS);
  const img = fxCalls.slice(start).filter((c) => c.method === "drawImage").at(-1)!;
  return [img.args[1] as number, img.args[2] as number];
}

/** The terms that move the finished image rather than the model: never rasterized, so never keyed. */
const SCREEN_TERMS = ["sx", "sy"];

describe("the render cache's key", () => {
  it("holds every Pose field except the screen terms — checked against the Pose's own keys", () => {
    const rest = PoseM.restPose();
    const fields = Object.keys(rest) as Array<keyof PoseModule.Pose>;
    expect(fields.length).toBeGreaterThan(10);
    const key = Draw.poseKey(2, rest, 110);
    for (const f of fields) {
      const moved = Draw.poseKey(2, { ...rest, [f]: rest[f] + 0.37 }, 110);
      if (SCREEN_TERMS.includes(f)) expect(moved, `${f} is a screen term`).toBe(key);
      else expect(moved, `${f} must change the key`).not.toBe(key);
    }
    expect(Draw.poseKey(3, rest, 110)).not.toBe(key);    // the weapon
    expect(Draw.poseKey(2, rest, 111)).not.toBe(key);    // the aim row
  });

  it("an unchanged pose skips the render; a changed one renders once", () => {
    const frame = settle(2);
    expect(renders(1, frame)).toBe(0);
    expect(renders(1, { ...frame, kickRot: 5 })).toBe(1); // a rasterized term (roll) moved
    expect(renders(1, { ...frame, kickRot: 5 })).toBe(0);
  });
});

describe("at rest the model is rarely re-rendered", () => {
  it("every weapon, standing still with nothing happening, re-renders on at most a sixth of its frames — and the reaper's ring still turns", () => {
    const counts: Record<string, number> = {};
    WEAPON_STATS.forEach((w, cur) => { counts[w.name] = renders(120, settle(cur)); });
    for (const [name, n] of Object.entries(counts)) expect(n, `${name}: ${n} of 120 frames re-rendered`).toBeLessThanOrEqual(20);
    expect(counts["SOUL REAPER"]).toBeGreaterThanOrEqual(8); // ~7 steps a second: visibly turning
  });

  it("the nail cannon's barrels wind down to rest after firing and stop costing renders", () => {
    settle(6, { wstate: "fire", wtime: 0.01 });           // a second of firing: full speed
    const before = puts;
    settle(6);                                            // the first second after: momentum, still turning
    expect(puts - before).toBeGreaterThan(20);
    const later = settle(6);                              // the second after that: slowing (~1/4 of frames)
    expect(renders(120, later)).toBeLessThanOrEqual(20);  // two to four seconds after: nearly still
    for (let i = 0; i < 4; i++) settle(6);                // and by eight seconds after,
    expect(renders(60, settle(6))).toBe(0);               // it has stopped
  });
});

describe("after a stretch of not being drawn, nothing that happened meanwhile is replayed", () => {
  it("the killing blow's hurt cue does not flinch the weapon on the first frames after a respawn", () => {
    const rest = settle(2);
    const at = blitAt(rest);
    const anchor = Draw.lastAnchors().muzzle;
    renders(1, { ...rest, dead: true, cueHurt: 1, cueHurtAmt: 80 });   // the blow lands; the player is dead
    renders(5, { ...rest, dead: true, cueHurt: 1, cueHurtAmt: 80 });
    for (let i = 0; i < 20; i++) {
      expect(blitAt({ ...rest, cueHurt: 1, cueHurtAmt: 80 })).toEqual(at);
      expect(Draw.lastAnchors().muzzle, `frame ${i} after respawn`).toEqual(anchor);
    }
  });

  it("a death in mid-fall gives no landing dip at the spawn; nor does a fall while the piano was open", () => {
    const rest = settle(2);
    const at = blitAt(rest);
    for (const away of [{ dead: true }, { pianoOpen: true }]) {
      renders(10, { ...rest, grounded: false, vy: -14 });             // falling fast, drawn...
      renders(10, { ...rest, ...away, grounded: false, vy: -14 });    // ...then not drawn
      renders(60, { ...rest, ...away });                              // and landed, still not drawn
      for (let i = 0; i < 30; i++) expect(blitAt(rest), `${JSON.stringify(away)} frame ${i}`).toEqual(at);
    }
  });
});
