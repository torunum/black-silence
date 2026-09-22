import { readFileSync } from "node:fs";

/**
 * Limits of what this harness proves (not exhaustive coverage of the real
 * browser environment — see tests/smoke.test.ts for what it does assert):
 *
 * - The `HTMLCanvasElement.prototype.getContext` override below is a global,
 *   process-wide patch. It's safe only because Vitest's default
 *   `isolate: true` gives each test file its own jsdom instance/global
 *   object, so the patch doesn't leak into other test files. If isolation is
 *   ever turned off (`isolate: false`, or a shared worker pool) this stub
 *   would leak across files with no test to catch it.
 * - The WebGL Proxy in `makeGlContext` answers *any* unknown property with a
 *   no-op function. That's a safe stand-in today only because `legacy.js`
 *   never calls the WebGL API directly — every draw call is routed through
 *   three.js's pinned (0.128.0) API surface. If raw `gl.*` calls were ever
 *   added to the port, a typo'd method name would silently resolve to a
 *   no-op here instead of throwing, and this harness would not notice.
 */

/**
 * A 2D context stub. The methods that must return something usable are
 * enumerated; everything else resolves to a no-op through a Proxy, the same
 * way makeGlContext handles the WebGL surface.
 *
 * The enumerated-only version of this worked while the only caller was the
 * texture generators. It broke the moment a test ran a real frame of the
 * game (tests/integration/trace.test.ts), because the viewmodel and overlay
 * layers call a wider set — setTransform, rect, arcTo — and a missing name
 * surfaced as `fg.setTransform is not a function` from inside production
 * code, which reads like a bug in the game rather than a gap here.
 *
 * The same caveat as makeGlContext applies: a typo'd method name now
 * silently no-ops instead of throwing. That is the accepted trade, because
 * every drawing call in this codebase is separately compared against the
 * reference by tests/behavior/*, which uses recordingCanvas.ts — a
 * recorder, not this stub. Nothing relies on this file to catch a bad call.
 */
function make2dContext(): Record<string, unknown> {
  const noop = () => {};
  const base: Record<string, unknown> = {
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, globalAlpha: 1,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: (): null => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    measureText: () => ({ width: 0 }),
    getLineDash: (): number[] => [],
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      if (typeof prop !== "string") return undefined;
      return noop;
    },
  }) as unknown as Record<string, unknown>;
}

/**
 * Minimal WebGL context. Three.js r128 probes a long list of methods and
 * extensions during WebGLRenderer construction; a Proxy answering every
 * unknown property with a no-op function is far more robust than enumerating
 * them, and this stub exists only to let construction succeed.
 */
function makeGlContext(): unknown {
  const noop = () => {};
  // Real WebGL1 enum value. Three.js r128's WebGLState constructor calls
  // gl.getParameter(gl.VERSION) and does glVersion.indexOf('WebGL') on the
  // result, so VERSION needs a distinct identity from every other pname (so
  // getParameter can recognize it) and getParameter needs to answer it with
  // a version string rather than the generic numeric stub.
  const VERSION = 0x1f02;
  // Real WebGL1 enum values. Three.js asks getProgramParameter for both a
  // link-status *flag* and two uniform/attribute *counts*, so a stub that
  // answers everything with `true` makes it loop once over a program with no
  // uniforms and dereference the undefined it gets back. Answering the two
  // counts with 0 is what lets a real frame render against this stub.
  // They must be numbers on the base object, not the Proxy's generic no-op
  // function, or `gl.ACTIVE_UNIFORMS` would arrive here as a function.
  const ACTIVE_UNIFORMS = 0x8b86, ACTIVE_ATTRIBUTES = 0x8b89;
  const base: Record<string, unknown> = {
    VERSION, ACTIVE_UNIFORMS, ACTIVE_ATTRIBUTES,
    getExtension: (): null => null,
    getParameter: (pname: unknown) => (pname === VERSION ? "WebGL 1.0 (Stub)" : 0),
    getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
    getContextAttributes: () => ({}),
    // Three.js r128 calls .trim() on all three unconditionally while
    // debug.checkShaderErrors is on, so the Proxy's generic no-op (which
    // returns undefined) is not enough for anything that actually renders a
    // frame — see tests/integration/wiring.test.ts, which runs the real
    // main loop.
    getProgramInfoLog: () => "",
    getShaderInfoLog: () => "",
    getShaderSource: () => "",
    createTexture: () => ({}), createBuffer: () => ({}),
    createProgram: () => ({}), createShader: () => ({}),
    // Render targets. Phase 2B (shadowed lighting) turned
    // `renderer.shadowMap.enabled` on, so a real frame now goes through
    // `WebGLShadowMap.render` -> `setRenderTarget(shadow.map)` for the first
    // time in this project's life. Three keys a `WeakMap` on the framebuffer
    // object, so the Proxy's generic no-op — which returns `undefined` —
    // made every integration test that renders a frame die with "Invalid
    // value used as weak map key" from inside three. These four return real
    // objects/values for the same reason `createTexture` does: object
    // identity is what three stores, not what it inspects.
    createFramebuffer: () => ({}), createRenderbuffer: () => ({}),
    createVertexArray: () => ({}), fenceSync: () => ({}),
    getProgramParameter: (_p: unknown, pname: unknown) =>
      pname === ACTIVE_UNIFORMS || pname === ACTIVE_ATTRIBUTES ? 0 : true,
    getShaderParameter: () => true,
    canvas: { width: 400, height: 300 },
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      return noop;
    },
  });
}

let installed = false;

/** Install canvas/WebGL/AudioContext stubs onto the jsdom globals. Idempotent. */
export function installDomStubs(): void {
  if (installed) return;
  installed = true;

  HTMLCanvasElement.prototype.getContext = function (kind: string) {
    if (kind === "2d") return make2dContext();
    return makeGlContext();
  } as typeof HTMLCanvasElement.prototype.getContext;

  // Boot alone never constructs one (audioInit() is called from startGame),
  // but anything that actually starts a level and plays a sound does — see
  // tests/integration/wiring.test.ts. Every AudioParam therefore carries the
  // full scheduling surface this codebase uses, not just `value`: a param
  // missing setValueAtTime fails only inside whichever sound happens to be
  // played, which reads as a bug in the caller rather than a gap here.
  // tests/support/recordingAudio.ts is the stub to use when the audio graph
  // itself is what's under test; this one only has to not throw.
  const param = (value = 0) => ({
    value,
    setValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; },
    cancelScheduledValues() { return this; },
  });
  (globalThis as Record<string, unknown>).AudioContext = class {
    destination = {};
    currentTime = 0;
    sampleRate = 44100;
    createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
    createDelay() { return { delayTime: param(), connect() {}, disconnect() {} }; }
    createBiquadFilter() { return { type: "", frequency: param(), Q: param(), gain: param(), detune: param(), connect() {}, disconnect() {} }; }
    createOscillator() { return { type: "", frequency: param(), detune: param(), connect() {}, disconnect() {}, start() {}, stop() {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
    createBufferSource() { return { buffer: null as null, playbackRate: param(1), detune: param(), connect() {}, disconnect() {}, start() {}, stop() {} }; }
    createStereoPanner() { return { pan: param(), connect() {}, disconnect() {} }; }
    // Plan 1 Task 4 gave real callers a world position, so AudioEngine.ts's
    // busFor() now actually reaches ctx().createPanner() through this stub
    // too (previously unreachable: Task 3 shipped emitAt()/at() to nobody).
    // panningModel/distanceModel/refDistance/maxDistance/rolloffFactor are
    // plain fields here, matching busFor()'s plain assignment — same
    // distinction tests/support/recordingAudio.ts's own createPanner() draws
    // between those and the scheduled positionX/Y/Z params.
    createPanner() {
      return {
        panningModel: "", distanceModel: "", refDistance: 0, maxDistance: 0, rolloffFactor: 0,
        positionX: param(), positionY: param(), positionZ: param(),
        connect() {}, disconnect() {},
      };
    }
  };

  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 0;
  (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};
}

/**
 * A deterministic `setTimeout` for trace runs: nothing fires on its own.
 * The caller drains due timers at a frame boundary, so a run replays
 * identically no matter how fast the machine is or how loaded it is.
 *
 * src/legacy.js schedules 17 gameplay effects this way (KNOWN-3) — the kick
 * hitbox, delayed explosions, boss cues. Under real timers those land
 * between arbitrary frames and no two runs of the same input produce the
 * same result, which makes a recorded trace worthless as a characterization
 * test.
 *
 * `advance` re-scans after every callback rather than iterating a snapshot,
 * because a timer that schedules another timer is common here (the toast
 * fade does exactly that) and the nested one must fire in the same drain if
 * it is already due.
 *
 * That re-scan has a generous but finite cap on how many timers it will
 * drain in one `advance` call. Nothing in the game schedules anywhere near
 * it today, so it never fires in practice — it exists only so a timer that
 * reschedules itself at 0ms (a real bug, not a hypothetical: it is exactly
 * the shape of an off-by-one in a countdown) throws a clear diagnostic
 * instead of spinning the suite forever.
 */
export function installFakeClock(): {
  advance(ms: number): void;
  restore(): void;
  pending(): number;
} {
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let now = 0, seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();

  (globalThis as Record<string, unknown>).setTimeout = (fn: () => void, ms = 0) => {
    const id = ++seq;
    timers.set(id, { at: now + ms, fn });
    return id;
  };
  (globalThis as Record<string, unknown>).clearTimeout = (id: number) => { timers.delete(id); };

  // A generous cap: real usage here drains well under a hundred timers per
  // `advance`. This exists to fail loudly on a runaway (a timer that
  // reschedules itself at 0ms) rather than hang the test suite.
  const MAX_DRAINED_TIMERS_PER_ADVANCE = 10_000;

  return {
    advance(ms: number): void {
      now += ms;
      let drained = 0;
      for (;;) {
        let nextId = -1, next: { at: number; fn: () => void } | undefined;
        for (const [id, t] of timers) {
          // Ties break on insertion order, which is what a real event loop does.
          if (t.at <= now && (next === undefined || t.at < next.at || (t.at === next.at && id < nextId))) {
            nextId = id; next = t;
          }
        }
        if (next === undefined) return;
        if (++drained > MAX_DRAINED_TIMERS_PER_ADVANCE) {
          throw new Error(
            `installFakeClock().advance drained more than ${MAX_DRAINED_TIMERS_PER_ADVANCE} timers in a ` +
            "single call — almost certainly a timer that reschedules itself at (or before) the current " +
            "time, which would otherwise hang the suite instead of failing it.",
          );
        }
        timers.delete(nextId);
        next.fn();
      }
    },
    restore(): void {
      (globalThis as Record<string, unknown>).setTimeout = realSetTimeout;
      (globalThis as Record<string, unknown>).clearTimeout = realClearTimeout;
    },
    pending: () => timers.size,
  };
}

/** Install index.html's body markup so every element id the game reads exists. */
export function loadGameHtml(): void {
  const html = readFileSync("index.html", "utf8");
  // Match a body *tag*, not the literal string "<body>", so this doesn't
  // silently break (and slice from the wrong place) the day the tag gains an
  // attribute, e.g. <body class="x">. Fail loudly rather than falling back
  // to a bad slice that jsdom's tolerant parser might swallow quietly.
  const openMatch = /<body[^>]*>/i.exec(html);
  const closeIdx = html.indexOf("</body>");
  if (!openMatch || closeIdx === -1) {
    throw new Error(
      "loadGameHtml: couldn't find a <body>...</body> section in index.html — " +
        "the game's element ids would silently not be installed.",
    );
  }
  const bodyStart = openMatch.index + openMatch[0].length;
  const body = html.slice(bodyStart, closeIdx);
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");
}
