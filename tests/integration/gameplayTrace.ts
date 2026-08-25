import * as THREE from "three";
import { installDomStubs, loadGameHtml, installFakeClock } from "../support/domStubs";
import { seedRandom } from "../support/seededRandom";
import { getScene } from "../../src/render/SceneRef";
import { save } from "../../src/save/SaveGame";

/**
 * A deterministic recording of the real game playing itself — the safety
 * net Plan 0D's 633 call-site rewrites lean on.
 *
 * `tests/behavior/*` compares each extracted module against
 * reference/sonsurum.html and would not notice a botched call site in
 * legacy.js. `tests/integration/wiring.test.ts` runs two frames and checks
 * what legacy.js *passes* to those modules, not what the game *does*.
 * Neither would catch `px` and `pz` swapped inside a movement formula,
 * which is the single most likely mistake in this plan.
 *
 * ## What it records, and why those things
 *
 * Only observables that sit downstream of the whole migration and do not
 * change shape as it proceeds:
 *
 * - **the camera** — its position is px/pyy/pz plus shake, its rotation is
 *   yaw/pitch plus recoil, its fov is zoomLerp. Six of the eleven groups
 *   being migrated are visible here, and none of them by name, so the trace
 *   keeps working when `px` becomes `player.px`.
 * - **the scene graph** — every child's position and visibility, which
 *   covers enemies, props, items, doors, gibs, decals and particles moving,
 *   spawning or despawning.
 * - **the HUD** — health, armour, weapon name, level title, messages and
 *   subtitles, which covers `S`.
 *
 * ## How it stays deterministic
 *
 * Seeded `Math.random`, synthetic frame timestamps at a fixed dt, and a
 * fake clock (see installFakeClock) drained at each frame boundary so the
 * game's 17 gameplay `setTimeout`s land on the same frames every run.
 *
 * ## The one constraint on callers
 *
 * `runTrace` imports `src/legacy.js`, which is a module singleton with side
 * effects at import — it builds a renderer, registers listeners and starts
 * a loop. It can therefore run **once per test file**. A second call in the
 * same file gets the already-booted game and records nonsense, so it
 * throws instead.
 */

/** One scripted input event, delivered at the start of the given frame. */
export type InputEvent =
  | { frame: number; kind: "key"; type: "keydown" | "keyup"; code: string }
  | { frame: number; kind: "button"; type: "mousedown" | "mouseup"; button: number }
  | { frame: number; kind: "move"; movementX: number; movementY: number }
  | { frame: number; kind: "wheel"; deltaY: number }
  | { frame: number; kind: "pointerlock"; locked: boolean };

export interface TraceOptions {
  seed: number;
  frames: number;
  /** Fixed milliseconds per frame — never wall clock. */
  dtMs: number;
  input: readonly InputEvent[];
  /** Record every Nth frame. Every frame would make a multi-megabyte fixture for no extra signal. */
  every: number;
  /**
   * Which level to start. Defaults to 0 (the prologue), taken through
   * exactly the path `trace.test.ts` has always used — the `NEW GAME` menu
   * row, which runs `save.maxLevel=0;startGame(0)` — so that fixture stays
   * bit-for-bit unaffected by this option's existence.
   *
   * Any other value opens the chapter-select screen instead (`#mChapter`),
   * after unlocking it via `save.maxLevel`, and clicks that level's row —
   * see `src/legacy.js`'s `mChapter` click handler, which builds `#chaplist`
   * fresh from `LEVELS` in order, so `#chaplist`'s Nth child is always level
   * N's row without needing to match its text.
   */
  level?: number;
}

export interface TraceFrame {
  frame: number;
  /** x,y,z,rx,ry,rz,fov. */
  camera: number[];
  hud: Record<string, string>;
  /** Child count plus a digest of every child's position and visibility. */
  scene: { count: number; digest: string };
}

const HUD_IDS = ["hp", "ar", "wname", "msg", "subt", "lvltitle", "bossname", "keys"];

/**
 * Floats are rounded to 6 places: the migration must not perturb arithmetic
 * at all, so this is far stricter than needed while staying immune to
 * print-formatting noise.
 *
 * `-0` is normalised to `0`, and that is not cosmetic. `JSON.stringify(-0)`
 * writes `0`, so a fixture can never hold a negative zero — but a live run
 * produces them freely (any `-x` where x rounds to zero), and Vitest's
 * `toEqual` uses Object.is, which separates them. Without this the test
 * fails on a run that is in fact bit-identical, and the failure reads like
 * nondeterminism.
 */
const r6 = (n: number): number => {
  const v = Math.round(n * 1e6) / 1e6;
  return v === 0 ? 0 : v;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/**
 * Reaching the camera, which `legacy.js` never exports.
 *
 * The obvious route — patching `WebGLRenderer.prototype.render` to grab the
 * `(scene, camera)` the loop hands it — does not work: three r128 assigns
 * `this.render = function (scene, camera)` inside the constructor
 * (build/three.js:17847), an *instance* property, so the prototype is never
 * consulted and the patch silently captures nothing.
 *
 * `PerspectiveCamera`'s methods are real class methods on the prototype
 * (build/three.js:9033), so patching `updateProjectionMatrix` does work.
 * `legacy.js` calls it every frame from the sniper-zoom line and again on
 * every resize. The camera is built once at module scope and never
 * rebuilt, so the first capture is the camera for the whole run — but the
 * patch keeps updating anyway rather than assuming that.
 *
 * The scene needs no trick: `loadLevel` already mirrors it into
 * src/render/SceneRef.ts for the FX modules, and that accessor is a plain
 * import.
 */
function captureCamera(): { camera: () => Any | null; restore: () => void } {
  const proto = THREE.PerspectiveCamera.prototype as unknown as Record<string, Any>;
  const real = proto.updateProjectionMatrix;
  let captured: Any = null;
  proto.updateProjectionMatrix = function (this: Any, ...args: Any[]): Any {
    captured = this;
    return real.apply(this, args);
  };
  return {
    camera: () => captured,
    restore: () => { proto.updateProjectionMatrix = real; },
  };
}

function readCamera(camera: Any): number[] {
  return [
    r6(camera.position.x), r6(camera.position.y), r6(camera.position.z),
    r6(camera.rotation.x), r6(camera.rotation.y), r6(camera.rotation.z),
    r6(camera.fov),
  ];
}

/** FNV-1a. Any change to any child's type, position or visibility changes the hash. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * The scene as a child count plus a hash of every child's type, rounded
 * position and visibility.
 *
 * Hashed rather than stored raw: a level holds ~240 objects, so the raw
 * digest is ~9KB per recorded frame and turns the fixture into a
 * quarter-megabyte blob. The hash is equally sensitive — any object that
 * moves, spawns, despawns or hides changes it — and a failure still names
 * the exact frame, which is what a developer actually needs to start
 * bisecting.
 */
function digestScene(scene: Any): { count: number; digest: string } {
  const parts = (scene.children as Any[]).map(
    (o) => `${o.type}:${r6(o.position.x)},${r6(o.position.y)},${r6(o.position.z)}:${o.visible ? 1 : 0}`,
  );
  return { count: parts.length, digest: hash(parts.join("|")) };
}

function readHud(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of HUD_IDS) out[id] = (document.getElementById(id)?.textContent ?? "").trim();
  return out;
}

/** Delivers one scripted event to the same target the game listens on. */
function deliver(ev: InputEvent, canvas: HTMLElement): void {
  switch (ev.kind) {
    case "key":
      window.dispatchEvent(new KeyboardEvent(ev.type, { code: ev.code }));
      return;
    case "button":
      window.dispatchEvent(new MouseEvent(ev.type, { button: ev.button }));
      return;
    case "wheel":
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: ev.deltaY }));
      return;
    case "move": {
      // jsdom's MouseEventInit ignores movementX/movementY, so they are
      // defined on the instance — the same technique
      // tests/behavior/input.test.ts uses.
      const e = new MouseEvent("mousemove");
      Object.defineProperty(e, "movementX", { value: ev.movementX });
      Object.defineProperty(e, "movementY", { value: ev.movementY });
      document.dispatchEvent(e);
      return;
    }
    case "pointerlock":
      Object.defineProperty(document, "pointerLockElement", {
        value: ev.locked ? canvas : null, configurable: true, writable: true,
      });
      document.dispatchEvent(new Event("pointerlockchange"));
      return;
  }
}

let alreadyRan = false;

export async function runTrace(o: TraceOptions): Promise<TraceFrame[]> {
  if (alreadyRan) {
    throw new Error(
      "runTrace can only be called once per test file: src/legacy.js is a module singleton " +
      "that boots the game at import, so a second run would record an already-running game.",
    );
  }
  alreadyRan = true;

  installDomStubs();
  loadGameHtml();

  /**
   * `performance.now()` has to be synthetic too, and this is not optional.
   * legacy.js reads it in three places that reach the recording: the screen
   * shake offset (`const sh=trauma*trauma,t=performance.now()`, which feeds
   * a sin/cos into the camera position), say()'s three-second subtitle
   * throttle, and the level timers S.t0/S.levelT0. Left on the wall clock,
   * two runs of the same script produce different camera positions and
   * different subtitles — the first version of this harness did exactly
   * that and failed its own comparison on the second run.
   */
  let fakeNow = 1_000_000; // an arbitrary but fixed epoch
  const realPerformance = globalThis.performance;
  Object.defineProperty(globalThis, "performance", {
    value: { now: () => fakeNow }, configurable: true, writable: true,
  });

  const clock = installFakeClock();
  const capture = captureCamera();

  /**
   * A minimal rAF queue, drained the way a browser drains it: every
   * callback pending *as of the start of the tick* runs once, in the order
   * it was requested, and the queue is cleared before any of them run.
   *
   * `loop` is not the only thing that calls `requestAnimationFrame` —
   * `src/ui/Toasts.ts`'s `ach()` does too, from inside a `loop` call, to
   * fade an achievement toast in. Taking only the *last* queued callback
   * (`raf[raf.length-1]`) is wrong the moment more than one is pending: the
   * toast's callback would get invoked instead of `loop` on the next tick,
   * nothing would re-request `loop`, and the game loop would stall silently
   * for the rest of the run. Draining every pending callback each tick, in
   * FIFO order, is what actually matches a browser and survives that case.
   */
  const raf: FrameRequestCallback[] = [];
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => raf.push(cb);
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  // jsdom has no pointer-lock implementation at all — legacy.js only ever
  // calls exitPointerLock() from damagePlayer()'s death branch. The
  // committed combat-level fixture never reaches it either (hp bottoms out
  // at 55, not 0), but a weakened armour-absorb sabotage against it does
  // make death reachable, so this stub is real insurance for that case —
  // and for any future level fixture that plays a run out to a death.
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  const restoreRandom = seedRandom(o.seed);
  try {
    await import("../../src/legacy.js");
    const canvas = document.getElementById("game") as HTMLElement;
    const level = o.level ?? 0;
    if (level === 0) {
      // Exactly today's path — untouched — so trace.test.ts's committed
      // fixture never sees a byte of difference from this option existing.
      const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
      if (!newGame) throw new Error("the NEW GAME menu row is gone — the trace drives the game through it");
      (newGame as HTMLElement).click();
    } else {
      // Plan 0D made save.maxLevel a writable exported property, which is
      // what makes any level beyond the prologue reachable from a test at
      // all. Unlock it, then drive the chapter-select screen the same way a
      // player would: open it, click the row for this level.
      save.maxLevel = Math.max(save.maxLevel, level);
      const chapterBtn = document.getElementById("mChapter") as HTMLElement | null;
      if (!chapterBtn) throw new Error("the CHAPTER SELECT menu row is gone — the trace drives level selection through it");
      chapterBtn.click();
      // Scoped to #chaplist: the main menu's own mNew/mChapter/mSettings
      // buttons are ALSO .mbtn (index.html), so a bare
      // `.mbtn` query would risk matching those instead.
      const row = document.querySelectorAll("#chaplist .mbtn")[level] as HTMLElement | undefined;
      if (!row) throw new Error(`chapter select has no row for level ${level} — #chaplist didn't build as expected`);
      if (row.className.includes("locked")) {
        throw new Error(`level ${level}'s chapter row is locked — save.maxLevel wasn't raised far enough`);
      }
      row.click();
    }

    const byFrame = new Map<number, InputEvent[]>();
    for (const ev of o.input) {
      if (!byFrame.has(ev.frame)) byFrame.set(ev.frame, []);
      byFrame.get(ev.frame)!.push(ev);
    }

    const out: TraceFrame[] = [];
    // The loop derives dt as (t - last)/1000 with `last` seeded from
    // performance.now() at boot — which is the fake clock above, so the
    // frame timestamps continue from it exactly and frame 1 gets a normal
    // dt rather than a large negative one.
    const t0 = fakeNow;
    for (let frame = 1; frame <= o.frames; frame++) {
      // Advance the wall clock in lockstep, before the frame's own work, so
      // anything reading performance.now() mid-frame sees this frame's time.
      fakeNow = t0 + frame * o.dtMs;
      for (const ev of byFrame.get(frame) ?? []) deliver(ev, canvas);
      if (raf.length === 0) throw new Error(`the main loop stopped requesting frames at frame ${frame}`);
      // Snapshot and clear before invoking: a callback that itself calls
      // requestAnimationFrame (loop always does; ach()'s toast fade
      // sometimes does) must be queued for the *next* tick, not appended to
      // and then re-run within this one.
      const due = raf.splice(0, raf.length);
      for (const cb of due) cb(fakeNow);
      clock.advance(o.dtMs);
      if (frame % o.every === 0) {
        const camera = capture.camera();
        if (!camera) {
          throw new Error(
            `the camera was never captured by frame ${frame} — updateProjectionMatrix stopped being ` +
            "called, so the trace would record empty placeholder rows and pass forever",
          );
        }
        out.push({
          frame,
          camera: readCamera(camera),
          hud: readHud(),
          scene: digestScene(getScene()),
        });
      }
    }
    return out;
  } finally {
    restoreRandom();
    clock.restore();
    capture.restore();
    Object.defineProperty(globalThis, "performance", {
      value: realPerformance, configurable: true, writable: true,
    });
  }
}
