import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static guards on where sound comes from — player feedback round 2, Task 1
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
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

/** Source with comments blanked, so a doc comment naming `bang(` is not a call. */
function code(file: string): string {
  return readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

const rel = (f: string): string => relative(SRC, f).split("\\").join("/");

describe("every sound the game plays has a name", () => {
  /**
   * The engine's raw voices. Outside `src/audio/` the game must call a named
   * sound from `src/audio/sounds/` (or one of the already-named functions in
   * `Ambient.ts`/`Voice.ts`: the doors, bells, organ, piano, boss pulse and
   * `snarl`) — never one of these with numbers. An inline call is a sound
   * the sound board cannot list and a later task cannot find.
   */
  const RAW = /(?<![.\w$])(blip|bang|boom|click|gunshot|growl|gurgle|pain|deathCry|noiseBuf)\(/g;

  const outside = srcFiles(SRC).filter((f) => !rel(f).startsWith("audio/"));

  it("scans the game's files at all", () => {
    expect(outside.length).toBeGreaterThan(80);
  });

  it("calls no raw engine voice outside src/audio", () => {
    const hits: string[] = [];
    for (const f of outside) {
      for (const m of code(f).matchAll(RAW)) hits.push(`${rel(f)}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });

  it("is not vacuous — the same pattern finds the raw calls inside the catalogue", () => {
    const inside = srcFiles(join(SRC, "audio", "sounds"));
    const n = inside.reduce((sum, f) => sum + [...code(f).matchAll(RAW)].length, 0);
    expect(n).toBeGreaterThan(60);
  });
});
