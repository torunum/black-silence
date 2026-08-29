import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The four gameplay delays Plan 0F Task 5 moved from `setTimeout` onto
 * `src/core/Time.ts`'s scaled `schedule()`.
 *
 * ## Why this file exists
 *
 * `tests/core/time.test.ts` proves the scheduler mechanism in isolation, and
 * `tests/integration/schedulerWiring.test.ts` proves `Loop.ts` drives it with
 * hit-stop-scaled, pausable time. Neither touches the four *real* call sites,
 * and Plan 0F's Task 12 review found the hole by mutating the Mancubus
 * second-barrel delay from `0.220` to `220` — a thousandfold error, and the
 * exact ms-for-seconds confusion Task 5's own brief named as "the most likely
 * defect in this task" — and watching all 391 tests stay green.
 *
 * They stay green because no fixture reaches these sites. `combatTrace.test.ts`
 * plays level 1 with a script that never kicks and never gets a Mancubus into
 * range, so `schedule()` is called zero times during the whole recording
 * (verified directly, twice). A wrong delay here is therefore invisible to
 * every other test: at `220` seconds the Mancubus's second barrel would simply
 * never fire inside a level, and nothing would say so.
 *
 * ## Why it compares against the reference rather than hardcoding
 *
 * Hardcoding `0.220` would only assert that the number equals itself. The
 * frozen `reference/sonsurum.html` is the authority for what these delays
 * *are*, in milliseconds, so this derives the expected values from it and
 * asserts the conversion: `port seconds * 1000 === reference milliseconds`.
 * That catches three distinct mistakes with one assertion — a missed
 * conversion (`220`), a wrong conversion (`0.22` where the reference says
 * `180`), and a drifted literal — and it keeps working if a later phase
 * deliberately retunes one, because then the reference would have to change
 * too. Same technique as `tests/content/achievements.test.ts`, which
 * re-extracts all 20 achievement triples from the reference instead of
 * trusting a copied table.
 */

const REFERENCE = readFileSync(join(__dirname, "..", "..", "reference", "sonsurum.html"), "utf8");

/**
 * Comments are stripped before every scan below. Without this the doc comment
 * at `src/weapons/WeaponState.ts:71`, which quotes `schedule(...,0.110)` as
 * prose, is matched first and the lazy scan then runs forward past the real
 * call site to the shotgun pump's unrelated `after(...,300)`. That produced a
 * confident, completely wrong failure on this file's first run — the third
 * time on this project that a scanner has read prose as code.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/** The four sites, each identified by a fragment unique to it in both files. */
const SITES = [
  {
    name: "doKick's hit test",
    portFile: "src/weapons/WeaponState.ts",
    // The kick's scheduled block is the only `schedule(` in this file.
    portRe: /schedule\([\s\S]*?\},\s*([0-9.]+)\s*\)/,
    refRe: /\},110\);\}/,
    refMs: 110,
  },
  {
    name: "Mancubus second barrel",
    portFile: "src/enemies/ai/Behaviors.ts",
    portRe: /e\.twin\)\{fireOrb\(e,-\.1\);schedule\(\(\)=>\{if\(!e\.dead\)fireOrb\(e,\.1\);\},\s*([0-9.]+)\s*\)/,
    refRe: /e\.twin\)\{fireOrb\(e,-\.1\);setTimeout\(\(\)=>\{if\(!e\.dead\)fireOrb\(e,\.1\);\},(\d+)\)/,
    refMs: 220,
  },
  {
    name: "Slaughtaur second bolt",
    portFile: "src/enemies/ai/Behaviors.ts",
    portRe: /fireOrb\(e,-\.05\);schedule\(\(\)=>\{if\(!e\.dead\)fireOrb\(e,\.05\);\},\s*([0-9.]+)\s*\)/,
    refRe: /fireOrb\(e,-\.05\);setTimeout\(\(\)=>\{if\(!e\.dead\)fireOrb\(e,\.05\);\},(\d+)\)/,
    refMs: 180,
  },
  {
    name: "brute slam damage",
    portFile: "src/enemies/ai/Behaviors.ts",
    portRe: /player\.vz\+=\(player\.pz-e\.z\)\*3;\}\},\s*([0-9.]+)\s*\)/,
    refRe: /vz\+=\(pz-e\.z\)\*3;\}\},(\d+)\)/,
    refMs: 480,
  },
] as const;

describe("the four gameplay schedule() delays", () => {
  for (const site of SITES) {
    it(`${site.name}: the port's seconds match the reference's milliseconds`, () => {
      const src = stripComments(readFileSync(join(__dirname, "..", "..", site.portFile), "utf8"));

      const portMatch = site.portRe.exec(src);
      expect(portMatch, `no schedule() call matching ${site.name} found in ${site.portFile} — ` +
        "the call site moved or changed shape, so this test is no longer looking at it").not.toBeNull();

      const seconds = Number(portMatch![1]);
      expect(Number.isFinite(seconds)).toBe(true);

      // The reference is the authority for the real delay. For doKick the
      // fragment is a plain marker rather than a capture, so fall back to the
      // recorded constant only when the regex has no group.
      const refMatch = site.refRe.exec(REFERENCE);
      expect(refMatch, `the reference no longer contains ${site.name} in the expected shape`).not.toBeNull();
      const referenceMs = refMatch!.length > 1 && refMatch![1] !== undefined ? Number(refMatch![1]) : site.refMs;
      expect(referenceMs).toBe(site.refMs);

      expect(
        Math.round(seconds * 1000),
        `${site.name}: schedule() takes SECONDS but the reference's setTimeout took ${referenceMs} ms — ` +
          `found ${seconds}, expected ${referenceMs / 1000}`,
      ).toBe(referenceMs);
    });
  }

  it("every schedule() call in the port is a plausible sub-second gameplay delay", () => {
    // A blunt backstop for a site this file does not know about: any future
    // schedule() call passing a bare millisecond value would land far outside
    // this range. Deliberately loose — it exists to catch the 1000x mistake,
    // not to police design.
    const files = ["src/enemies/ai/Behaviors.ts", "src/weapons/WeaponState.ts"];
    let found = 0;
    for (const f of files) {
      const src = stripComments(readFileSync(join(__dirname, "..", "..", f), "utf8"));
      for (const m of src.matchAll(/schedule\([\s\S]*?\},\s*([0-9.]+)\s*\)/g)) {
        const secs = Number(m[1]);
        found++;
        expect(secs, `${f}: schedule() delay ${secs} is not a plausible seconds value`).toBeGreaterThan(0);
        expect(secs, `${f}: schedule() delay ${secs} looks like milliseconds`).toBeLessThan(5);
      }
    }
    // Anti-vacuity: if the scan stops matching, fail rather than assert nothing.
    expect(found, "the schedule() scan found no call sites at all").toBeGreaterThanOrEqual(4);
  });
});
