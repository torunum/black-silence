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

/** A 2D context stub: every method the texture generators call, all no-ops. */
function make2dContext(): Record<string, unknown> {
  const noop = () => {};
  return {
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, globalAlpha: 1,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fill: noop, stroke: noop, clip: noop, save: noop, restore: noop,
    translate: noop, scale: noop, rotate: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, drawImage: noop,
  };
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
    getExtension: () => null,
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
    createBufferSource() { return { buffer: null, playbackRate: param(1), detune: param(), connect() {}, disconnect() {}, start() {}, stop() {} }; }
    createStereoPanner() { return { pan: param(), connect() {}, disconnect() {} }; }
  };

  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 0;
  (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};
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
