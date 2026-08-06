import { readFileSync } from "node:fs";

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
  const body = html.slice(html.indexOf("<body>") + "<body>".length, html.indexOf("</body>"));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "");
}
