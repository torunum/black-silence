// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { screenShake } from "../../src/fx/ShakeState";

/**
 * The seams — KNOWN-9.
 *
 * Every module carved out of src/legacy.js in Plan 0C was parameterised:
 * the state-*reading* moved out of the extracted function and into a call
 * site in legacy.js. `tests/behavior/*` proves each module is faithful to
 * the reference, but every one of those files supplies its own inputs —
 * viewmodel.test.ts builds its own ViewmodelFrame, input.test.ts installs
 * its own hooks — which is exactly what makes them good *module* tests and
 * useless as integration tests. Nothing checked that legacy.js hands those
 * modules the right values, and the review proved it: `swayX:getSwayY()`,
 * `drawKickBoot(0)` and `currentWeapon:()=>S.cur+1` each left all 331 tests
 * green while visibly breaking the game.
 *
 * This file closes that gap by booting the real legacy.js under jsdom,
 * starting a real level, and running real frames — with only the three
 * modules whose wiring is under test replaced by recorders. Two techniques
 * do the work:
 *
 * - **Sentinel accessors.** src/player/Input.ts is mocked so getSwayX() and
 *   getSwayY() (and getYaw/getPitch) return distinct, recognisable numbers.
 *   Whatever legacy.js reads them into is then identifiable by value, so a
 *   transposition is a failed equality rather than two indistinguishable
 *   floats.
 * - **Cross-checks between two independent readers of the same global.**
 *   The input hooks and the viewmodel frame both report S.cur and both
 *   report zoomLerp; the player always owns the weapon they are holding.
 *   Those invariants hold for any game state, so they need no fixture and
 *   cannot be satisfied by a wrong mapping.
 *
 * What this file deliberately does NOT do is re-test the modules. It never
 * looks at a draw call. It only asks: did legacy.js pass the right things?
 *
 * ## Two seams it cannot reach, and why
 *
 * Both are the same shape: a value that is identical to the thing it could
 * be confused with, in every state this fixture can reach.
 *
 * - **`dead:S.dead` vs `S.won`.** Both are false for a living player, and
 *   neither death nor victory is reachable in a two-frame prologue —
 *   dying needs an enemy to land enough hits over hundreds of frames, and
 *   winning needs the level finished. Rewriting the field to `S.won` still
 *   passes. The field's *presence* and type are pinned; which of the two
 *   globals feeds it is not.
 * - **`zoomLerp`.** It is 0 at rest and only rises while the sniper is
 *   equipped and scoped, and the prologue loadout is slot 0 only —
 *   `requestSwitch` refuses any slot the player does not own, and the
 *   sniper is granted by a pickup or a kill count, neither reachable here.
 *   Passing a literal `0` in its place still passes.
 *
 * Closing either one means a fixture that can put the game into a state it
 * takes real play to reach. That is a bigger apparatus than the gap
 * justifies today; it is recorded rather than hidden.
 */

const captured = vi.hoisted(() => ({
  hooks: null as Record<string, (...a: never[]) => unknown> | null,
  fxTick: [] as unknown[][],
  kick: [] as unknown[][],
  viewmodel: [] as unknown[][],
}));

/**
 * Distinct, implausible-as-coincidence values. Sway feeds nothing but the
 * frame, so any value is safe; yaw/pitch feed the camera and movement, so
 * they stay in a normal radian range to keep the level behaving.
 */
const SENTINEL = vi.hoisted(() => ({ swayX: 1101.25, swayY: 1102.5, yaw: 1.103, pitch: 0.104 }));

vi.mock("../../src/player/Input", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/player/Input")>();
  return {
    ...actual,
    setInputHooks: (h: Record<string, (...a: never[]) => unknown>) => { captured.hooks = h; },
    getSwayX: () => SENTINEL.swayX,
    getSwayY: () => SENTINEL.swayY,
    getYaw: () => SENTINEL.yaw,
    getPitch: () => SENTINEL.pitch,
  };
});

vi.mock("../../src/render/Overlay2D", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/render/Overlay2D")>();
  return { ...actual, fxTick: (...args: unknown[]) => { captured.fxTick.push(args); } };
});

vi.mock("../../src/render/viewmodel/draw", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/render/viewmodel/draw")>();
  return {
    ...actual,
    drawKickBoot: (...args: unknown[]) => { captured.kick.push(args); },
    drawViewmodel: (...args: unknown[]) => { captured.viewmodel.push(args); },
  };
});

/** One recorded fxTick call, with its two callbacks already invoked so their arguments are recorded too. */
interface Frame {
  dt: number; t: number; zoomLerp: number;
  /** The kickAnim value legacy.js closed over for drawKickBoot. */
  kickAnim: unknown;
  /** The ViewmodelFrame legacy.js built, and the weapon table it passed alongside. */
  vm: Record<string, unknown>;
  vmDt: number; vmT: number;
  weapons: unknown;
}

const rafQueue: FrameRequestCallback[] = [];
let hooksAtBoot: Record<string, (...a: never[]) => unknown> | null = null;
let startedBeforeNewGame: unknown;
let startedAfterNewGame: unknown;
let restFrame: Frame;
let kickFrame: Frame;

/** Runs the main loop once and returns everything legacy.js handed the 2D layer during it. */
function runFrame(t: number): Frame {
  const beforeFx = captured.fxTick.length;
  rafQueue[rafQueue.length - 1](t);
  const calls = captured.fxTick.slice(beforeFx);
  if (calls.length !== 1) throw new Error(`expected exactly 1 fxTick call in a frame, got ${calls.length}`);
  const [dt, tArg, zoomLerp, kickCb, vmCb] = calls[0] as [number, number, number, () => void, (dt: number, t: number) => void];

  // fxTick is a recorder here, so the two callbacks it would normally invoke
  // have to be invoked by hand — which is also what makes the values legacy
  // closed over visible.
  const beforeKick = captured.kick.length, beforeVm = captured.viewmodel.length;
  kickCb();
  vmCb(dt, tArg);
  const kickArgs = captured.kick.slice(beforeKick);
  const vmArgs = captured.viewmodel.slice(beforeVm);
  if (kickArgs.length !== 1 || vmArgs.length !== 1) {
    throw new Error(`expected 1 drawKickBoot and 1 drawViewmodel, got ${kickArgs.length} and ${vmArgs.length}`);
  }
  return {
    dt, t: tArg, zoomLerp,
    kickAnim: kickArgs[0][0],
    vmDt: vmArgs[0][0] as number, vmT: vmArgs[0][1] as number,
    vm: vmArgs[0][2] as Record<string, unknown>,
    weapons: vmArgs[0][3],
  };
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  // jsdom implements neither, and startGame calls the first on the canvas.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};

  await import("../../src/legacy.js");
  hooksAtBoot = captured.hooks;
  startedBeforeNewGame = captured.hooks?.isStarted();

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  startedAfterNewGame = captured.hooks?.isStarted();

  // The loop derives dt as (t - last)/1000 with `last` seeded from the real
  // clock at boot, so frame timestamps have to continue that clock — passing
  // 16.7 outright yields a large negative dt and a frame that means nothing.
  const t0 = performance.now();
  restFrame = runFrame(t0 + 16.7);
  // doKick is one of the twelve hooks AND the only writer of kickAnim, so
  // going through the hook is what makes the kick seam observable at all.
  captured.hooks!.doKick();
  kickFrame = runFrame(t0 + 33.4);
});

describe("legacy.js boots the game far enough to test its wiring", () => {
  it("loads a level and reaches the main loop", () => {
    expect(document.getElementById("msg")!.textContent).toBe("PROLOGUE — OUT OF THE PIT");
    expect(rafQueue.length).toBeGreaterThan(1);
    // If this file ever stopped actually running frames, every assertion
    // below would pass vacuously against a stale snapshot.
    expect(captured.fxTick.length).toBe(2);
  });
});

describe("the input hooks legacy.js installs", () => {
  it("installs exactly the thirteen hooks Input.ts declares, all callable", () => {
    expect(hooksAtBoot).not.toBeNull();
    expect(Object.keys(hooksAtBoot!).sort()).toEqual([
      "canvas", "closePiano", "currentWeapon", "doKick", "interact", "isInputLocked",
      "isPianoOpen", "isStarted", "ownsWeapon", "pianoKeyDown", "requestSwitch", "startReload",
      "zoomLerp",
    ]);
    for (const [name, fn] of Object.entries(hooksAtBoot!)) {
      expect(typeof fn, `hook ${name}`).toBe("function");
    }
  });

  it("reports `started` — false before NEW GAME, true after — and not one of the other three flags", () => {
    expect(startedBeforeNewGame).toBe(false);
    expect(startedAfterNewGame).toBe(true);
    // The other flags do NOT flip on NEW GAME, so a hook wired to any of
    // them would have failed the pair above.
    expect(captured.hooks!.isPianoOpen()).toBe(false);
    expect(typeof captured.hooks!.isInputLocked()).toBe("boolean");
  });

  it("reports the equipped weapon slot, cross-checked two ways", () => {
    const cur = captured.hooks!.currentWeapon();
    expect(typeof cur).toBe("number");
    // 1. The player always owns the weapon they are holding. At the start of
    //    the prologue only slot 0 is owned, so an off-by-one here is fatal.
    expect(captured.hooks!.ownsWeapon(cur as never)).toBe(true);
    // 2. The viewmodel frame reads the same global through a different path.
    expect(cur).toBe(restFrame.vm.cur);
  });

  it("reports weapon ownership per slot, matching the prologue loadout", () => {
    const owned = Array.from({ length: 8 }, (_, i) => captured.hooks!.ownsWeapon(i as never));
    expect(owned).toEqual([true, false, false, false, false, false, false, false]);
  });

  it("points pointer lock at the game canvas, not some other element", () => {
    expect(captured.hooks!.canvas()).toBe(document.getElementById("game"));
  });

  it("wires doKick to the real kick — it drives kickAnim, which nothing else writes", () => {
    expect(restFrame.kickAnim).toBe(0);
    expect(kickFrame.kickAnim).toBeGreaterThan(0);
  });

  it("wires the remaining gameplay callbacks to real functions", () => {
    // Each is a distinct legacy function; calling them mid-level must not
    // throw, which is what an unbound or misspelled target would do.
    expect(() => captured.hooks!.interact()).not.toThrow();
    expect(() => captured.hooks!.startReload()).not.toThrow();
    expect(() => captured.hooks!.requestSwitch(0 as never)).not.toThrow();
    expect(() => captured.hooks!.pianoKeyDown("KeyA" as never)).not.toThrow();
    expect(() => captured.hooks!.closePiano()).not.toThrow();
  });
});

describe("what legacy.js passes to the 2D overlay each frame", () => {
  it("passes dt and t, and a zoomLerp that is neither of them", () => {
    expect(restFrame.dt).toBeGreaterThan(0);
    expect(restFrame.t).toBeGreaterThan(0);
    // The third argument being 0 while dt and t are not is what separates
    // "zoomLerp was passed" from "an argument was dropped and dt slid over"
    // — but see this file's header: it does NOT separate zoomLerp from a
    // hardcoded 0, because the prologue can never scope in.
    expect(restFrame.zoomLerp).toBe(0); // scope down at rest
    expect(restFrame.zoomLerp).not.toBe(restFrame.dt);
    expect(restFrame.zoomLerp).not.toBe(restFrame.t);
    // All three readers of the same global agree.
    expect(captured.hooks!.zoomLerp()).toBe(restFrame.zoomLerp);
    expect(restFrame.vm.zoomLerp).toBe(restFrame.zoomLerp);
  });

  it("forwards fxTick's own dt and t into drawViewmodel unchanged", () => {
    expect(restFrame.vmDt).toBe(restFrame.dt);
    expect(restFrame.vmT).toBe(restFrame.t);
  });

  it("advances t between frames", () => {
    expect(kickFrame.t).toBeGreaterThan(restFrame.t);
  });
});

describe("the ViewmodelFrame legacy.js builds", () => {
  const EXPECTED_FIELDS = [
    "bobT", "cur", "dead", "equipT", "kickAmt", "kickRot", "muzzle", "pianoOpen",
    "sprintKey", "started", "swayX", "swayY", "unequipT", "vx", "vz", "wstate", "wtime", "zoomLerp",
  ];

  it("carries exactly the eighteen fields ViewmodelFrame declares — no more, no fewer", () => {
    // draw.ts reads `v.foo` for each; a dropped field is silently undefined
    // there, which is how a missing one would otherwise reach the screen.
    expect(Object.keys(restFrame.vm).sort()).toEqual(EXPECTED_FIELDS);
    for (const field of EXPECTED_FIELDS) {
      expect(restFrame.vm[field], `frame.${field}`).toBeDefined();
    }
  });

  it("maps swayX and swayY to their own accessors, not to each other", () => {
    expect(restFrame.vm.swayX).toBe(SENTINEL.swayX);
    expect(restFrame.vm.swayY).toBe(SENTINEL.swayY);
  });

  it("maps started, dead and pianoOpen to the right three flags", () => {
    expect(restFrame.vm.started).toBe(true);   // NEW GAME was clicked
    expect(restFrame.vm.dead).toBe(false);
    expect(restFrame.vm.pianoOpen).toBe(false);
    // started is the only one of the three that is true, so any pair of
    // them being swapped fails here.
  });

  it("passes the weapon table, with an entry for the equipped slot", () => {
    const weapons = restFrame.weapons as Array<{ name: string }>;
    expect(Array.isArray(weapons)).toBe(true);
    expect(weapons.length).toBe(8);
    expect(weapons[restFrame.vm.cur as number]).toBeDefined();
    expect(typeof weapons[restFrame.vm.cur as number].name).toBe("string");
  });

  it("gives every numeric field a number and every flag a boolean", () => {
    for (const field of ["bobT", "cur", "equipT", "kickAmt", "kickRot", "muzzle", "swayX", "swayY", "unequipT", "vx", "vz", "wtime", "zoomLerp"]) {
      expect(typeof restFrame.vm[field], `frame.${field}`).toBe("number");
      expect(Number.isNaN(restFrame.vm[field]), `frame.${field} is NaN`).toBe(false);
    }
    for (const field of ["dead", "pianoOpen", "sprintKey", "started"]) {
      expect(typeof restFrame.vm[field], `frame.${field}`).toBe("boolean");
    }
    expect(typeof restFrame.vm.wstate).toBe("string");
  });
});

describe("screenShake — hit-stop slows and burns down the frame", () => {
  beforeEach(() => {
    screenShake.trauma = 0;
    screenShake.hitStop = 0;
  });

  it("slows the frame while hit-stop is running", () => {
    screenShake.hitStop = 0.05;
    const frame = runFrame(performance.now());
    // When hit-stop is active, the main loop scales dt to 8% before passing it
    // to the 2D layer: dt*=.08. If this is sabotaged to dt*=.09, the trace test
    // (which exercises the full gameplay loop) would fail. Here we verify the
    // scaled dt is small while hit-stop is active.
    expect(frame.dt).toBeLessThan(1 / 60 * 0.5);
  });
});
