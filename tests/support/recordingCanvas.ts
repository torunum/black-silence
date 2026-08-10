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

  const ctx = new Proxy(target, {
    get(_t, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
          return makeRecordingGradient(calls);
        };
      }
      // Every other property read is treated as a method call site: the
      // codebase's draw code never *reads back* a plain property (colours
      // and widths are write-only from the drawing code's point of view),
      // so returning a recording function here is safe for the full method
      // surface without enumerating it.
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
      };
    },
    set(_t, prop, value) {
      if (typeof prop === "string") {
        calls.push({ method: `set:${prop}`, args: [value] });
      }
      return true;
    },
  });

  return { ctx, calls };
}
