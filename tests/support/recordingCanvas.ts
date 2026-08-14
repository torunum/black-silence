/**
 * A behavioral 2D canvas context stub: instead of no-op'ing every call like
 * tests/support/domStubs.ts's make2dContext, this one logs every method
 * call and every property assignment made on it, in order. Comparing two
 * ordered logs (one from the reference, one from the ported module) proves
 * the same sequence of drawing operations happened, regardless of how the
 * surrounding code is shaped — see tests/behavior/textures.test.ts.
 *
 * `fillStyle`/`strokeStyle`/`lineWidth`/`globalAlpha` are how every colour
 * and stroke width in this codebase is chosen (`g.fillStyle = "#262a2e"`,
 * never a method call), so property *assignments* must be recorded with
 * the same fidelity as method calls — a recorder blind to them would miss
 * the single most likely kind of art regression.
 *
 * Implemented with a Proxy rather than an enumerated method list because
 * the 2D context API is large and open-ended; any property read that isn't
 * a special case below is treated as "call me and log it", which is safe
 * for every method this codebase's texture/sprite generators actually use
 * (fillRect, beginPath, arc, moveTo, lineTo, quadraticCurveTo,
 * bezierCurveTo, fill, stroke, save, restore, clip, ellipse, ...) without
 * having to enumerate them.
 */

export interface DrawCall {
  method: string;
  args: unknown[];
}

/** A createLinearGradient/createRadialGradient result: records its own addColorStop calls into the same log, prefixed so they can't be confused with context-level calls. */
function makeRecordingGradient(calls: DrawCall[]): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        return (...args: unknown[]) => {
          calls.push({ method: `gradient.${prop}`, args });
        };
      },
    },
  );
}

export function recordingCanvas(): { ctx: unknown; calls: DrawCall[] } {
  const calls: DrawCall[] = [];
  const target: Record<string, unknown> = {};

  // Gradient objects have no state of their own to compare (they're a
  // Proxy over {}; their addColorStop calls are recorded separately, into
  // `calls`) — so without an identity, two DIFFERENT gradients (created in
  // a different order, or with different colour stops) look byte-identical
  // wherever they show up as a plain logged VALUE, e.g.
  // `g.fillStyle = someGradient`. Tagging each gradient with a stable,
  // creation-ordered id and substituting that id for the live object
  // wherever a tracked gradient is about to be logged (as a method
  // argument or a property-set value) closes that gap the same way
  // recordingAudio.ts's node/param ids do — a bug that assigns the wrong
  // (but previously-created) gradient becomes a diff on "Gradient#1" vs.
  // "Gradient#2" instead of two indistinguishable empty Proxies.
  const gradientIds = new WeakMap<object, string>();
  let gradientCount = 0;

  function resolveLoggedValue(value: unknown): unknown {
    if (value && typeof value === "object" && gradientIds.has(value)) {
      return gradientIds.get(value);
    }
    return value;
  }

  const ctx = new Proxy(target, {
    get(_t, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
          const gradient = makeRecordingGradient(calls);
          gradientCount++;
          gradientIds.set(gradient as object, `Gradient#${gradientCount}`);
          return gradient;
        };
      }
      // Every other property read is treated as a method call site: the
      // codebase's draw code never *reads back* a plain property (colours
      // and widths are write-only from the drawing code's point of view),
      // so returning a recording function here is safe for the full method
      // surface without enumerating it.
      return (...args: unknown[]) => {
        calls.push({ method: prop, args: args.map(resolveLoggedValue) });
      };
    },
    set(_t, prop, value) {
      if (typeof prop === "string") {
        calls.push({ method: `set:${prop}`, args: [resolveLoggedValue(value)] });
      }
      return true;
    },
  });

  return { ctx, calls };
}

/**
 * Patches HTMLCanvasElement.prototype.getContext for the duration of a
 * recording session: every canvas that requests a "2d" context gets the
 * same `ctx` (so all canvases created during one buildTextures()-style run
 * share one call log, in creation order), but — unlike handing back `ctx`
 * silently — this pushes a boundary-marking `"getContext"` entry into
 * `calls` too, tagged with:
 *
 *  - a stable, creation-ORDERED canvas id (a genuinely fresh
 *    `document.createElement("canvas")` per texture logs Canvas#1,
 *    Canvas#2, ...; a bug that reuses one canvas across many textures logs
 *    Canvas#1 repeatedly instead — that reuse is otherwise completely
 *    invisible, because the 2D context recorder only sees *what* got
 *    drawn, never *which physical canvas* it was drawn onto, and reusing
 *    one canvas doesn't change the sequence or arguments of a single draw
 *    call, only where all of them end up rendered);
 *  - the canvas's width/height at the moment the context was requested
 *    (this codebase always sets `c.width`/`c.height` immediately before
 *    calling `c.getContext(...)`, so this is the real, final size for that
 *    texture — and it's otherwise unobservable, since width/height are set
 *    on the canvas *element*, which this recorder never wraps, not on the
 *    2D context).
 *
 * Uses a real `function`, not an arrow, specifically so `this` binds to
 * the calling canvas element — an arrow function here would have no way to
 * tell which canvas asked for a context at all.
 *
 * Returns a restore function; always call it, even on a thrown assertion.
 */
export function installRecordingGetContext(ctx: unknown, calls: DrawCall[]): () => void {
  const canvasIds = new WeakMap<HTMLCanvasElement, string>();
  let canvasCount = 0;
  const previous = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string): unknown {
    let id = canvasIds.get(this);
    if (!id) {
      canvasCount++;
      id = `Canvas#${canvasCount}`;
      canvasIds.set(this, id);
    }
    calls.push({ method: "getContext", args: [kind, id, this.width, this.height] });
    return kind === "2d" ? ctx : null;
  } as typeof HTMLCanvasElement.prototype.getContext;

  return () => {
    HTMLCanvasElement.prototype.getContext = previous;
  };
}
