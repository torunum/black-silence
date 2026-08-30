import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every `at(x, y, z, …)` call site passes its coordinates in the right order.
 *
 * ## Why this exists
 *
 * Phase 1 Task 4 wrapped ~15 sound emissions in `at()`. Its wiring test,
 * `tests/integration/positionalCallers.test.ts`, boots the game and proves the
 * *real* coordinates reach the panner — but only for two of them, because a
 * full boot per call site is disproportionate.
 *
 * The Task 7 review found what that leaves open: swapping `wx_` and `wz_` at
 * the door-open sound (`src/player/Interact.ts:101`) left all 447 tests green.
 * A transposed pair is the defect class this feature is most prone to — the
 * arguments are adjacent, same-typed, and a swap is invisible to `tsc` — and
 * it is exactly what Plan 0D's trace caught twice in the player's own movement
 * code (`px`/`pz` and `vx`/`vz`).
 *
 * ## What it checks, and what it deliberately does not
 *
 * This is a **structural** check, not a behavioural one. It reads the source,
 * finds each `at(` call, splits its arguments respecting nesting, and asserts
 * that the first argument mentions only x-axis terms and the third only
 * z-axis terms. It cannot tell you the coordinates belong to the right
 * *object* — `at(other.x, y, other.z, …)` passes — so it complements the two
 * deep wiring tests rather than replacing them. Together: those two prove the
 * values are right end to end, this proves the ordering is right everywhere.
 *
 * An axis term is a property access `.x`/`.z` or a bare identifier whose name
 * is an axis name (`x`, `wx`, `nx`, `hx`, `wx_`, …). Anything else — `c.t`,
 * `clamp`, `WALLH`, a numeric literal — contributes nothing, so a y argument
 * of `e.h*.6+(e.fy||0)` is simply ignored.
 */

const SRC = join(__dirname, "..", "..", "src");

function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...srcFiles(p));
    else if (ent.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

/** Splits a call's argument list on top-level commas only. */
function splitArgs(src: string, open: number): string[] | null {
  const args: string[] = [];
  let depth = 0, start = open + 1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0) { args.push(src.slice(start, i)); return args; }
    } else if (c === "," && depth === 1) { args.push(src.slice(start, i)); start = i + 1; }
  }
  return null; // unbalanced — caller treats as unparseable
}

/** The axis letters an expression mentions: `.x`/`.z` accesses and bare axis identifiers. */
function axesIn(expr: string): string[] {
  const found: string[] = [];
  for (const m of expr.matchAll(/\.([xz])\b/g)) found.push(m[1]);
  for (const m of expr.matchAll(/(?<![.\w$])([a-z]{0,2}([xz]))_?(?![\w$])/g)) found.push(m[2]);
  return found;
}

describe("at() coordinate order", () => {
  const sites: Array<{ file: string; args: string[] }> = [];

  for (const file of srcFiles(SRC)) {
    if (file.endsWith("AudioEngine.ts")) continue; // where at() is defined
    const src = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/[^\n]*/g, " ");
    for (const m of src.matchAll(/(?<![.\w$])at\(/g)) {
      const open = m.index! + m[0].length - 1;
      const args = splitArgs(src, open);
      if (args && args.length >= 4) sites.push({ file, args });
    }
  }

  it("finds the call sites at all — an empty scan must fail loudly", () => {
    // Anti-vacuity. If a rename or a reformat stops this scan matching, every
    // assertion below would pass by examining nothing, which is this project's
    // signature failure mode.
    expect(sites.length).toBeGreaterThanOrEqual(12);
  });

  it("passes an x-axis term first and a z-axis term third at every site", () => {
    for (const { file, args } of sites) {
      const first = axesIn(args[0]);
      const third = axesIn(args[2]);
      const where = `${file}: at(${args[0].trim()}, …, ${args[2].trim()}, …)`;

      expect(first.length, `${where} — first argument mentions no axis term`).toBeGreaterThan(0);
      expect(third.length, `${where} — third argument mentions no axis term`).toBeGreaterThan(0);
      expect([...new Set(first)], `${where} — first argument should be x, not z`).toEqual(["x"]);
      expect([...new Set(third)], `${where} — third argument should be z, not x`).toEqual(["z"]);
    }
  });
});
