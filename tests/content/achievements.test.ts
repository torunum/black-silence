import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENT_IDS, type Achievement } from "../../src/content/achievements";

/**
 * src/content/achievements.ts is the one content table with no reference
 * range to compare against: reference/sonsurum.html has no achievements
 * table at all, only 20 inline `ach("id","TITLE","desc")` literals at their
 * trigger sites. So this file *is* the fidelity check for it — it
 * re-extracts all 20 triples straight out of the frozen reference and
 * asserts the table reproduces them, which is the same guarantee
 * tests/fidelity.test.ts gives every other table, just recovered by regex
 * instead of by line range.
 *
 * It also checks the other half of the carve, the half that has no
 * reference at all: that every `ach(...)` call site in src/legacy.js names
 * an id this table defines. A typo'd id there is invisible at runtime —
 * `ACHIEVEMENTS.punct` is `undefined`, and the toast would render
 * "✦ undefined" with an empty description rather than throw.
 */

const REFERENCE_PATH = join(__dirname, "..", "..", "reference", "sonsurum.html");
const LEGACY_PATH = join(__dirname, "..", "..", "src", "legacy.js");

/** Every `ach("id","TITLE","desc")` literal in the reference, in call-site order. */
function referenceAchievements(): Achievement[] {
  const src = readFileSync(REFERENCE_PATH, "utf8");
  const out: Achievement[] = [];
  const re = /\bach\("([^"]*)","([^"]*)","([^"]*)"\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push({ id: m[1], title: m[2], desc: m[3] });
  return out;
}

/** Every id passed to ach() in the port, i.e. the `x` in `ach(ACHIEVEMENTS.x,S.ach)`. */
function portCallSiteIds(): string[] {
  const src = readFileSync(LEGACY_PATH, "utf8");
  const out: string[] = [];
  const re = /\bach\(\s*ACHIEVEMENTS\.([A-Za-z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

describe("the achievements table", () => {
  const reference = referenceAchievements();

  it("reproduces all 20 of the reference's inline achievement literals, verbatim and in call-site order", () => {
    expect(reference).toHaveLength(20);
    expect(ACHIEVEMENT_IDS.map((id) => ACHIEVEMENTS[id] as Achievement)).toEqual(reference);
  });

  it("keys every entry by its own id", () => {
    for (const id of ACHIEVEMENT_IDS) expect(ACHIEVEMENTS[id].id).toBe(id);
  });

  it("has 20 unique ids, and each has a non-empty title and description", () => {
    expect(new Set(ACHIEVEMENT_IDS).size).toBe(20);
    for (const id of ACHIEVEMENT_IDS) {
      expect(ACHIEVEMENTS[id].title.length).toBeGreaterThan(0);
      expect(ACHIEVEMENTS[id].desc.length).toBeGreaterThan(0);
    }
  });

  it("keeps the id set the reference uses — no invented, renamed or dropped achievement", () => {
    expect([...ACHIEVEMENT_IDS].sort()).toEqual(reference.map((a) => a.id).sort());
  });
});

describe("the port's ach() call sites", () => {
  const callSiteIds = portCallSiteIds();

  it("names an id the table defines at every one of them", () => {
    expect(callSiteIds.length).toBeGreaterThan(0);
    for (const id of callSiteIds) {
      expect(ACHIEVEMENT_IDS, `ach(ACHIEVEMENTS.${id}, ...) has no entry in the table`).toContain(id);
    }
  });

  it("still triggers all 20 — every achievement stays reachable, and none was left behind as a string literal", () => {
    expect([...new Set(callSiteIds)].sort()).toEqual([...ACHIEVEMENT_IDS].sort());
    expect(callSiteIds).toHaveLength(20);
    // The old inline form must be gone, or a call site could still be
    // passing text the table never sees.
    expect(readFileSync(LEGACY_PATH, "utf8")).not.toMatch(/\bach\("/);
  });
});
