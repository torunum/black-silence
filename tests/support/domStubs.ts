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
  const base: Record<string, unknown> = {
    VERSION,
    getExtension: () => null,
    getParameter: (pname: unknown) => (pname === VERSION ? "WebGL 1.0 (Stub)" : 0),
    getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
    getContextAttributes: () => ({}),
    createTexture: () => ({}), createBuffer: () => ({}),
    createProgram: () => ({}), createShader: () => ({}),
    getProgramParameter: () => true, getShaderParameter: () => true,
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

  // The game declares AudioContext support but only constructs one on
  // audioInit(), which boot does not call. A constructor stub is enough.
  (globalThis as Record<string, unknown>).AudioContext = class {
    destination = {};
    currentTime = 0;
    sampleRate = 44100;
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    createDelay() { return { delayTime: { value: 0 }, connect() {} }; }
    createBiquadFilter() { return { type: "", frequency: { value: 0 }, Q: { value: 0 }, connect() {} }; }
    createOscillator() { return { type: "", frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
    createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
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
