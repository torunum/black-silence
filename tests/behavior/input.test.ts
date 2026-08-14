// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { loadGameHtml } from "../support/domStubs";
import type * as InputModule from "../../src/player/Input";

/**
 * The input half of the behavioral oracle — src/player/Input.ts (Plan 0C
 * Task 5), compared against reference/sonsurum.html's own INPUT section
 * (REF.input).
 *
 * Input has no drawing and no DOM output; what it has is *listeners* and
 * *state*. So this file compares two things, and both matter:
 *
 * 1. **The registrations themselves** — which target (window or document),
 *    which event type, in which order, with which options. The reference
 *    splits them deliberately (mousemove and pointerlockchange on
 *    `document`, the rest on `window`, and keydown alone passing an
 *    explicit `false`), and a listener attached to the wrong target still
 *    "works" in most manual testing while quietly breaking as soon as
 *    something calls stopPropagation.
 * 2. **The state each event produces** — yaw, pitch, sway, firing, zoom,
 *    the key map, pointer lock, and every gameplay callback the handler
 *    reaches for, in order.
 *
 * Both sides are driven by calling their captured handlers with the same
 * plain event objects, so the comparison is exact. One test at the end
 * dispatches *real* KeyboardEvent/MouseEvent through jsdom instead, which
 * is what proves the module's listeners are attached to the targets this
 * file otherwise only records.
 *
 * The world the handlers read (pianoOpen, started, inputLock, zoomLerp,
 * S.cur, S.weapons, renderer.domElement) reaches the module through the
 * hooks it was designed to take, and reaches the reference through plain
 * global assignment inside its sandbox — see REF_EXPR's setWorld.
 */

let Input: typeof InputModule;

/** A captured listener registration, from either side. */
interface Registration {
  target: "window" | "document";
  type: string;
  handler: (e: unknown) => void;
  options: unknown;
}
const moduleRegistrations: Registration[] = [];

/** The mutable world the input handlers read. Both sides are pointed at the same values before every step. */
interface World {
  pianoOpen: boolean; started: boolean; inputLock: boolean; zoomLerp: number;
  cur: number; weapons: boolean[];
}
function freshWorld(): World {
  return { pianoOpen: false, started: true, inputLock: false, zoomLerp: 0, cur: 0, weapons: [true, true, false, false, true, false] };
}

/** The pointer-lock target — a real element so classList/ownership behave, with requestPointerLock recorded. */
let canvasEl: HTMLElement;

beforeAll(async () => {
  loadGameHtml();
  canvasEl = document.getElementById("game") as HTMLElement;

  const realWindowAdd = globalThis.addEventListener.bind(globalThis);
  const realDocAdd = document.addEventListener.bind(document);
  // Recorded AND forwarded: the real-event test at the bottom needs the
  // module's listeners genuinely attached.
  (globalThis as unknown as { addEventListener: unknown }).addEventListener = (
    type: string, handler: (e: unknown) => void, options: unknown,
  ) => { moduleRegistrations.push({ target: "window", type, handler, options }); realWindowAdd(type, handler as EventListener, options as boolean); };
  document.addEventListener = ((
    type: string, handler: (e: unknown) => void, options: unknown,
  ) => { moduleRegistrations.push({ target: "document", type, handler, options }); realDocAdd(type, handler as EventListener, options as boolean); }) as typeof document.addEventListener;
  try {
    Input = await import("../../src/player/Input");
  } finally {
    (globalThis as unknown as { addEventListener: unknown }).addEventListener = realWindowAdd;
    document.addEventListener = realDocAdd;
  }
});

/** Everything one event can change, on either side. */
interface InputState {
  yaw: number; pitch: number; locked: boolean;
  swayX: number; swayY: number; firing: boolean; zoomOn: boolean;
  keys: Record<string, boolean>;
}

/** One side of the comparison: its listeners, its state, and a log of the gameplay calls its handlers made. */
interface Side {
  registrations: Registration[];
  state: () => InputState;
  setWorld: (w: World) => void;
  overlayOpen: () => boolean;
  calls: string[];
}

const REF_CHUNKS = [refSource(REF.mathHelpers), refSource(REF.input)];
/**
 * `setWorld` assigns to the reference's bare globals directly. That works
 * because a vm chunk runs sloppy-mode, so `pianoOpen=x` writes to the
 * sandbox's global object — the same object the injected values landed on.
 * It is the only way to make those four reads *live*: evalReference copies
 * its `globals` argument, so nothing the test holds afterwards is the
 * object the sandbox reads from.
 */
const REF_EXPR =
  "({state:()=>({yaw,pitch,locked,swayX,swayY,firing,zoomOn,keys:Object.assign({},keys)})," +
  "overlayOpen," +
  "setWorld:w=>{pianoOpen=w.pianoOpen;started=w.started;inputLock=w.inputLock;zoomLerp=w.zoomLerp;S.cur=w.cur;S.weapons=w.weapons;}})";

interface RefApi {
  state: () => InputState;
  overlayOpen: () => boolean;
  setWorld: (w: World) => void;
}

/** Builds the reference side: a fresh sandbox, its listeners captured, its callbacks logged. */
function referenceSide(): Side {
  const registrations: Registration[] = [];
  const calls: string[] = [];
  const S = { cur: 0, weapons: [] as boolean[] };
  const refDocument = {
    addEventListener: (type: string, handler: (e: unknown) => void, options: unknown) => {
      registrations.push({ target: "document", type, handler, options });
    },
    getElementById: (id: string) => document.getElementById(id),
    get pointerLockElement() { return document.pointerLockElement; },
  };
  const api = evalReference<RefApi>(REF_CHUNKS, REF_EXPR, {
    document: refDocument, Math, S,
    renderer: { domElement: canvasEl },
    pianoOpen: false, started: true, inputLock: false, zoomLerp: 0,
    addEventListener: (type: string, handler: (e: unknown) => void, options: unknown) => {
      registrations.push({ target: "window", type, handler, options });
    },
    pianoKeyDown: (code: string) => calls.push(`pianoKeyDown(${code})`),
    closePiano: () => calls.push("closePiano"),
    interact: () => calls.push("interact"),
    startReload: () => calls.push("startReload"),
    requestSwitch: (i: number) => calls.push(`requestSwitch(${i})`),
    doKick: () => calls.push("doKick"),
  });
  return { registrations, state: api.state, setWorld: api.setWorld, overlayOpen: api.overlayOpen, calls };
}

/**
 * Builds the module side. The module is a singleton, so this resets its
 * state to the values a freshly-evaluated reference chunk starts from —
 * including `locked`, which has no setter and is cleared the only way the
 * game clears it, with a pointerlockchange that does not match the canvas.
 */
function moduleSide(): Side {
  const calls: string[] = [];
  Input.setInputHooks({
    isPianoOpen: () => world.pianoOpen,
    isStarted: () => world.started,
    isInputLocked: () => world.inputLock,
    zoomLerp: () => world.zoomLerp,
    canvas: () => canvasEl,
    currentWeapon: () => world.cur,
    ownsWeapon: (i) => !!world.weapons[i],
    pianoKeyDown: (code) => calls.push(`pianoKeyDown(${code})`),
    closePiano: () => calls.push("closePiano"),
    interact: () => calls.push("interact"),
    startReload: () => calls.push("startReload"),
    requestSwitch: (i) => calls.push(`requestSwitch(${i})`),
    doKick: () => calls.push("doKick"),
  });
  let world = freshWorld();
  Input.setYaw(Math.PI); Input.setPitch(0);
  Input.setSwayX(0); Input.setSwayY(0);
  Input.setFiring(false); Input.setZoomOn(false);
  for (const k of Object.keys(Input.keys)) delete Input.keys[k];
  setPointerLockElement(null);
  fire(moduleRegistrations, "document", "pointerlockchange", {});
  return {
    registrations: moduleRegistrations,
    state: () => ({
      yaw: Input.getYaw(), pitch: Input.getPitch(), locked: Input.isPointerLocked(),
      swayX: Input.getSwayX(), swayY: Input.getSwayY(),
      firing: Input.isFiring(), zoomOn: Input.isZoomOn(),
      keys: { ...Input.keys },
    }),
    setWorld: (w) => { world = w; },
    overlayOpen: () => Input.overlayOpen(),
    calls,
  };
}

/** jsdom leaves pointerLockElement undefined; both sides read it through the real document, so this is where it is decided. */
function setPointerLockElement(el: Element | null): void {
  Object.defineProperty(document, "pointerLockElement", { value: el, configurable: true, writable: true });
}

/** Invokes the one handler registered for `target`/`type` with a plain event object. */
function fire(registrations: Registration[], target: "window" | "document", type: string, event: Record<string, unknown>): void {
  const found = registrations.filter((r) => r.target === target && r.type === type);
  if (found.length !== 1) throw new Error(`expected exactly 1 ${target} "${type}" listener, found ${found.length}`);
  found[0].handler(event);
}

/** What a scripted step can do to either side. */
interface Api {
  keyDown: (code: string) => void;
  keyUp: (code: string) => void;
  wheel: (deltaY: number) => void;
  mouseMove: (movementX: number, movementY: number) => void;
  mouseDown: (button: number) => void;
  mouseUp: (button: number) => void;
  /** Sets document.pointerLockElement to the game canvas (or nothing), then delivers pointerlockchange. */
  pointerLock: (toCanvas: boolean) => void;
  /** The same, for an arbitrary element — every step must go through the api, or it fires only one side's handler. */
  pointerLockTo: (el: Element | null) => void;
  contextMenu: (e: { preventDefault: () => void }) => void;
  world: (patch: Partial<World>) => void;
}
type Step = [label: string, run: (api: Api) => void];

function apiFor(side: Side, world: World): Api {
  const f = (target: "window" | "document", type: string, event: Record<string, unknown>) =>
    fire(side.registrations, target, type, event);
  return {
    keyDown: (code) => f("window", "keydown", { code }),
    keyUp: (code) => f("window", "keyup", { code }),
    wheel: (deltaY) => f("window", "wheel", { deltaY }),
    mouseMove: (movementX, movementY) => f("document", "mousemove", { movementX, movementY }),
    mouseDown: (button) => f("window", "mousedown", { button }),
    mouseUp: (button) => f("window", "mouseup", { button }),
    pointerLock: (toCanvas) => { setPointerLockElement(toCanvas ? canvasEl : null); f("document", "pointerlockchange", {}); },
    pointerLockTo: (el) => { setPointerLockElement(el); f("document", "pointerlockchange", {}); },
    contextMenu: (e) => f("window", "contextmenu", e),
    world: (patch) => { Object.assign(world, patch); side.setWorld(world); },
  };
}

/** Runs `steps` against one side, snapshotting state and the callback log after each. */
function run(side: Side, steps: readonly Step[]): Array<{ state: InputState; calls: string[] }> {
  const world = freshWorld();
  side.setWorld(world);
  const api = apiFor(side, world);
  return steps.map(([, step]) => { step(api); return { state: side.state(), calls: [...side.calls] }; });
}

/** Runs `steps` on both sides and asserts every step's state and callback log match. */
function expectParity(steps: readonly Step[]): Array<{ state: InputState; calls: string[] }> {
  const mod = run(moduleSide(), steps);
  const ref = run(referenceSide(), steps);
  steps.forEach(([label], i) => {
    expect({ step: label, ...mod[i] }).toEqual({ step: label, ...ref[i] });
  });
  return mod;
}

let pointerLockRequests = 0;
beforeEach(() => {
  pointerLockRequests = 0;
  (canvasEl as unknown as { requestPointerLock: () => void }).requestPointerLock = () => { pointerLockRequests++; };
  setPointerLockElement(null);
});

describe("listener registration", () => {
  it("registers the same events, on the same targets, in the same order, with the same options as the reference", () => {
    const ref = referenceSide();
    const shape = (r: Registration) => ({ target: r.target, type: r.type, options: r.options });
    expect(moduleRegistrations.map(shape)).toEqual(ref.registrations.map(shape));
    // Spelled out too: a parity check alone would accept both sides moving
    // mousemove onto window together.
    expect(moduleRegistrations.map(shape)).toEqual([
      { target: "window", type: "keydown", options: false },
      { target: "window", type: "keyup", options: undefined },
      { target: "window", type: "wheel", options: undefined },
      { target: "document", type: "mousemove", options: undefined },
      { target: "document", type: "pointerlockchange", options: undefined },
      { target: "window", type: "mousedown", options: undefined },
      { target: "window", type: "mouseup", options: undefined },
      { target: "window", type: "contextmenu", options: undefined },
    ]);
  });
});

describe("keyboard", () => {
  it("sets a key on keydown and clears it on keyup, exactly as the reference does", () => {
    const snaps = expectParity([
      ["hold W", (a) => a.keyDown("KeyW")],
      ["hold Shift too", (a) => a.keyDown("ShiftLeft")],
      ["release W", (a) => a.keyUp("KeyW")],
      ["release Shift", (a) => a.keyUp("ShiftLeft")],
    ]);
    expect(snaps[1].state.keys).toEqual({ KeyW: true, ShiftLeft: true });
    // keyup writes false rather than deleting — legacy.js reads keys.KeyW
    // as a truthiness test, so the distinction never showed, but it is what
    // the reference does.
    expect(snaps[3].state.keys).toEqual({ KeyW: false, ShiftLeft: false });
  });

  it("routes E, R and the digit row to interact, reload and weapon switching", () => {
    const snaps = expectParity([
      ["E", (a) => a.keyDown("KeyE")],
      ["R", (a) => a.keyDown("KeyR")],
      ["1", (a) => a.keyDown("Digit1")],
      ["8", (a) => a.keyDown("Digit8")],
      ["9 — outside the Digit1-8 range", (a) => a.keyDown("Digit9")],
      ["an unbound key", (a) => a.keyDown("KeyP")],
    ]);
    expect(snaps[5].calls).toEqual(["interact", "startReload", "requestSwitch(0)", "requestSwitch(7)"]);
  });

  it("toggles the sniper zoom on Z only while the sniper is equipped", () => {
    const snaps = expectParity([
      ["Z with the shotgun equipped", (a) => a.keyDown("KeyZ")],
      ["equip the sniper (slot 4)", (a) => a.world({ cur: 4 })],
      ["Z again", (a) => a.keyDown("KeyZ")],
      ["Z again — it is a toggle", (a) => a.keyDown("KeyZ")],
      ["Z once more", (a) => a.keyDown("KeyZ")],
    ]);
    expect(snaps.map((s) => s.state.zoomOn)).toEqual([false, false, true, false, true]);
  });

  it("hands every key to the piano while it is open, and closes it on E", () => {
    const snaps = expectParity([
      ["open the piano", (a) => a.world({ pianoOpen: true })],
      ["press A", (a) => a.keyDown("KeyA")],
      ["press E", (a) => a.keyDown("KeyE")],
    ]);
    expect(snaps[2].calls).toEqual(["pianoKeyDown(KeyA)", "pianoKeyDown(KeyE)", "closePiano"]);
    // ...and nothing leaked into the movement key map or the gameplay verbs.
    expect(snaps[2].state.keys).toEqual({});
    expect(snaps[2].calls).not.toContain("interact");
  });
});

describe("mouse look", () => {
  it("turns yaw and pitch by 0.0022 rad per pixel and accumulates sway", () => {
    const snaps = expectParity([
      ["lock the pointer", (a) => a.pointerLock(true)],
      ["move right and up", (a) => a.mouseMove(100, -40)],
      ["move left and down", (a) => a.mouseMove(-30, 12)],
    ]);
    // Spelled out as values: the sensitivity, its sign, and the .035 sway
    // rate are art, and a parity check alone would accept both sides
    // drifting together.
    expect(snaps[1].state.yaw).toBeCloseTo(Math.PI - 100 * .0022, 12);
    expect(snaps[1].state.pitch).toBeCloseTo(40 * .0022, 12);
    expect(snaps[1].state.swayX).toBeCloseTo(100 * .035, 12);
    expect(snaps[1].state.swayY).toBeCloseTo(-40 * .035, 12);
    expect(snaps[2].state.yaw).toBeCloseTo(Math.PI - 70 * .0022, 12);
  });

  it("scales sensitivity down while the sniper scope is up", () => {
    const snaps = expectParity([
      ["lock the pointer", (a) => a.pointerLock(true)],
      ["fully scoped in", (a) => a.world({ zoomLerp: 1 })],
      ["move right", (a) => a.mouseMove(100, 0)],
    ]);
    // .0022 * (1 - .68) — under a third of hip sensitivity.
    expect(Math.PI - snaps[2].state.yaw).toBeCloseTo(100 * .0022 * .32, 12);
  });

  it("clamps pitch to ±1.45 rad and sway to ±10 / ±7, so the view cannot invert", () => {
    const snaps = expectParity([
      ["lock the pointer", (a) => a.pointerLock(true)],
      ["yank the mouse far up", (a) => a.mouseMove(0, -5000)],
      ["yank it far down", (a) => a.mouseMove(0, 10000)],
      ["yank it far right", (a) => a.mouseMove(5000, 0)],
      ["yank it far left", (a) => a.mouseMove(-10000, 0)],
    ]);
    expect(snaps[1].state.pitch).toBe(1.45);
    expect(snaps[2].state.pitch).toBe(-1.45);
    expect(snaps[1].state.swayY).toBe(-7);
    expect(snaps[2].state.swayY).toBe(7);
    expect(snaps[3].state.swayX).toBe(10);
    expect(snaps[4].state.swayX).toBe(-10);
    // yaw itself is deliberately NOT clamped — it wraps, and the player can
    // keep turning forever.
    expect(snaps[4].state.yaw).toBeGreaterThan(snaps[3].state.yaw);
  });

  it("ignores the mouse entirely while unlocked, or while a cutscene holds input", () => {
    const snaps = expectParity([
      ["unlocked: move", (a) => a.mouseMove(200, 200)],
      ["lock the pointer", (a) => a.pointerLock(true)],
      ["cutscene takes input", (a) => a.world({ inputLock: true })],
      ["move again", (a) => a.mouseMove(200, 200)],
      ["cutscene ends", (a) => a.world({ inputLock: false })],
      ["move once more", (a) => a.mouseMove(10, 0)],
    ]);
    expect(snaps[0].state.yaw).toBe(Math.PI);
    expect(snaps[3].state.yaw).toBe(Math.PI);
    expect(snaps[5].state.yaw).toBeCloseTo(Math.PI - 10 * .0022, 12);
  });

  it("tracks pointer lock against the game canvas, and nothing else", () => {
    const other = document.getElementById("msg") as HTMLElement;
    const snaps = expectParity([
      ["locked to the canvas", (a) => a.pointerLock(true)],
      ["locked to some other element", (a) => a.pointerLockTo(other)],
      ["locked back to the canvas", (a) => a.pointerLock(true)],
      ["released", (a) => a.pointerLock(false)],
    ]);
    expect(snaps.map((s) => s.state.locked)).toEqual([true, false, true, false]);
  });
});

describe("mouse buttons and the wheel", () => {
  it("holds fire on the left button and kicks on the right", () => {
    const snaps = expectParity([
      ["press left", (a) => a.mouseDown(0)],
      ["release left", (a) => a.mouseUp(0)],
      ["press right", (a) => a.mouseDown(2)],
      ["release right", (a) => a.mouseUp(2)],
      ["press middle", (a) => a.mouseDown(1)],
    ]);
    expect(snaps.map((s) => s.state.firing)).toEqual([true, false, false, false, false]);
    expect(snaps[4].calls).toEqual(["doKick"]);
  });

  it("requests pointer lock on click once the game has started, but not over a menu or the piano", () => {
    const dead = document.getElementById("dead") as HTMLElement;
    expectParity([
      ["not started yet", (a) => { a.world({ started: false }); a.mouseDown(0); }],
      ["started", (a) => { a.world({ started: true }); a.mouseDown(0); }],
      ["already locked", (a) => { a.pointerLock(true); a.mouseDown(0); }],
      ["unlocked, but the death overlay is up", (a) => { a.pointerLock(false); dead.classList.remove("hidden"); a.mouseDown(0); }],
      ["overlay dismissed", (a) => { dead.classList.add("hidden"); a.mouseDown(0); }],
      ["piano open", (a) => { a.pointerLock(false); a.world({ pianoOpen: true }); a.mouseDown(0); }],
    ]);
    // Both sides share one canvas stub, so the count covers both runs: two
    // requests each, from "started" and "overlay dismissed".
    expect(pointerLockRequests).toBe(4);
  });

  it("cycles the wheel through owned weapon slots only, in both directions", () => {
    const snaps = expectParity([
      ["wheel down from slot 0", (a) => a.wheel(1)],
      ["wheel down again", (a) => a.wheel(1)],
      ["wheel up", (a) => a.wheel(-1)],
      ["before the game starts", (a) => { a.world({ started: false }); a.wheel(1); }],
      ["while the piano is open", (a) => { a.world({ started: true, pianoOpen: true }); a.wheel(1); }],
    ]);
    // Owned slots are 0, 1 and 4; slot 2, 3 and 5 must be skipped, and the
    // scan wraps within the first six slots.
    expect(snaps[4].calls).toEqual(["requestSwitch(1)", "requestSwitch(1)", "requestSwitch(4)"]);
  });

  it("cannot reach the last two weapons with the wheel at all — it cycles six slots while the game has eight (KNOWN-8)", () => {
    const snaps = expectParity([
      ["own only the nail cannon and soul reaper, slots 6 and 7", (a) => a.world({ cur: 0, weapons: [false, false, false, false, false, false, true, true] })],
      ["wheel down", (a) => a.wheel(1)],
      ["wheel up", (a) => a.wheel(-1)],
      ["Digit7 still reaches slot 6", (a) => a.keyDown("Digit7")],
      ["Digit8 still reaches slot 7", (a) => a.keyDown("Digit8")],
    ]);
    expect(snaps[2].calls).toEqual([]);
    expect(snaps[4].calls).toEqual(["requestSwitch(6)", "requestSwitch(7)"]);
  });

  it("suppresses the browser context menu so right-click can kick", () => {
    let modulePrevented = 0, refPrevented = 0;
    const mod = moduleSide();
    fire(mod.registrations, "window", "contextmenu", { preventDefault: () => { modulePrevented++; } });
    const ref = referenceSide();
    fire(ref.registrations, "window", "contextmenu", { preventDefault: () => { refPrevented++; } });
    expect(modulePrevented).toBe(1);
    expect(modulePrevented).toBe(refPrevented);
  });
});

describe("overlayOpen", () => {
  const ids = ["levelend", "win", "dead"];
  const hideAll = () => ids.forEach((id) => document.getElementById(id)!.classList.add("hidden"));

  it("agrees with the reference for every overlay, and for the piano", () => {
    const ref = referenceSide();
    const mod = moduleSide();
    const world = freshWorld();
    hideAll();
    expect(Input.overlayOpen()).toBe(false);
    expect(ref.overlayOpen()).toBe(false);

    for (const id of ids) {
      hideAll();
      document.getElementById(id)!.classList.remove("hidden");
      expect(Input.overlayOpen(), `${id} visible`).toBe(true);
      expect(ref.overlayOpen(), `${id} visible (reference)`).toBe(true);
    }

    hideAll();
    world.pianoOpen = true;
    mod.setWorld(world); ref.setWorld(world);
    expect(Input.overlayOpen()).toBe(true);
    expect(ref.overlayOpen()).toBe(true);
    world.pianoOpen = false;
    mod.setWorld(world); ref.setWorld(world);
    expect(Input.overlayOpen()).toBe(false);
  });
});

describe("the listeners are attached to the real window and document", () => {
  it("responds to genuine KeyboardEvents and MouseEvents dispatched through jsdom", () => {
    moduleSide(); // resets state and installs hooks
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    expect(Input.keys.KeyW).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    expect(Input.keys.KeyW).toBe(false);

    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    expect(Input.isFiring()).toBe(true);
    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    expect(Input.isFiring()).toBe(false);

    // mousemove is registered on document, not window: dispatching on
    // window still reaches it by bubbling, but only because the event
    // bubbles up to document. Dispatching on document directly is the
    // check that matters here.
    setPointerLockElement(canvasEl);
    document.dispatchEvent(new Event("pointerlockchange"));
    expect(Input.isPointerLocked()).toBe(true);
    const move = new MouseEvent("mousemove");
    Object.defineProperty(move, "movementX", { value: 50 });
    Object.defineProperty(move, "movementY", { value: 0 });
    document.dispatchEvent(move);
    expect(Input.getYaw()).toBeCloseTo(Math.PI - 50 * .0022, 12);
  });
});
