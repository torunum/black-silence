import { expect } from "vitest";

/**
 * Asserts two ordered call/event logs are equal — the comparison at the
 * heart of tests/behavior/textures.test.ts and tests/behavior/audio.test.ts.
 *
 * A real mismatch on a multi-thousand-entry log (buildTextures alone logs
 * around 30,000 draw calls) makes Vitest's default `expect(...).toEqual()`
 * diff printer take on the order of a minute, because it computes and
 * renders a full structural diff across the entire array on every failure.
 * That's slow enough to make re-running the suite after a real regression
 * feel expensive, which is exactly the outcome a fast oracle is supposed to
 * avoid.
 *
 * This does a cheap linear scan first — JSON.stringify equality per entry,
 * safe here because every logged value is a plain JSON-safe primitive or
 * nested plain object (recordingCanvas.ts tags gradients and
 * recordingAudio.ts tags nodes/params with stable id *strings* precisely so
 * no live object or function ever ends up inside a logged entry) — to find
 * the first divergent index, then throws with only a small window around
 * it instead of the whole arrays.
 *
 * If the scan finds no divergence (equal lengths, every entry's JSON
 * matches), it falls through to a real `expect(actual).toEqual(expected)`
 * as the authoritative final check. That's cheap on the genuinely-equal
 * path: `toEqual` only pays for diff rendering when it fails, and by this
 * point it won't.
 */
export function expectCallLogEqual<T>(actual: readonly T[], expected: readonly T[], label = "call log"): void {
  const n = Math.min(actual.length, expected.length);
  let i = 0;
  while (i < n && JSON.stringify(actual[i]) === JSON.stringify(expected[i])) i++;

  const diverges = i < n || actual.length !== expected.length;
  if (diverges) {
    const windowStart = Math.max(0, i - 2);
    const windowEnd = Math.min(Math.max(actual.length, expected.length), i + 3);
    const format = (arr: readonly T[]): string =>
      Array.from({ length: Math.max(0, windowEnd - windowStart) }, (_, k) => windowStart + k)
        .map((idx) => `  [${idx}] ${idx < arr.length ? JSON.stringify(arr[idx]) : "<missing>"}`)
        .join("\n");
    throw new Error(
      `${label}: mismatch at index ${i} (expected ${expected.length} entries, got ${actual.length})\n` +
        `--- expected (window around ${i}) ---\n${format(expected)}\n` +
        `--- actual (window around ${i}) ---\n${format(actual)}`,
    );
  }

  expect(actual).toEqual(expected);
}
