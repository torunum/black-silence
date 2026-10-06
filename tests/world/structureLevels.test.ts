import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels/index";
import { analyse, type Structure } from "../../src/world/structure/analyse";
import { structureMarkdown } from "../../src/world/structure/markdown";
import { checkTargets, LEGACY_PROBLEMS, OLD_CRITICAL, REBUILT, TARGETS } from "../../src/world/structure/targets";
import { buildCharnel } from "../support/proofLevel";
import { evalReference, REF, refSource } from "../support/reference";
import type { BuiltLevel } from "../../src/world/LevelBuilder";

/**
 * EVERY LEVEL, THROUGH THE STRUCTURE SUITE (deeper-levels plan, Task 2; `src/world/structure/`). Two things:
 *
 *  1. **Hard validation** of every level, 0-7: reachability of the exit through the required keys, key before door and no
 *     softlock, every enemy, pickup, secret and checkpoint reachable, secrets behind secret doors and rewarding, the exit door
 *     sited. The old levels have a few failures they always had (`LEGACY_PROBLEMS`); they are pinned exactly, so a level that
 *     loses one must lose it from the list, and a new one is a red test.
 *  2. **The targets** a rebuilt level must meet (`REBUILT`, `checkTargets`). `REBUILT` is empty today; Tasks 3-9 add their
 *     level, and from then on the level is held to the numbers. The targets are tested here against a level written to meet
 *     them (`tests/support/proofLevel.ts`) and against the levels as they were, so they can neither be impossible nor empty.
 *
 * The numbers measured are in `docs/level-structure.md`, which this file fails if it is stale.
 */

const built = LEVELS.map((def, index) => ({ index, name: def.name, s: analyse(def.build()) }));

describe.each(built)("level $index · $name", ({ index, s }) => {
  it("passes the hard validation, but for the failures it always had", () => {
    const codes = [...new Set(s.problems.map((p) => p.code))].sort();
    expect(codes, s.problems.map((p) => p.message).join("; ")).toEqual([...(LEGACY_PROBLEMS[index] || [])].sort());
  });

  it("has a way through: a critical path, every goal reached in order", () => {
    expect(s.critical.length).toBeGreaterThan(0);
    expect(s.critical.cells).toHaveLength(s.critical.length + 1);
    expect(s.spawn).not.toBeNull();
  });

  it("has its checkpoints reachable", () => {
    for (const c of s.checkpoints) expect(c.reachable, `${c.kind} at ${c.x},${c.z}`).toBe(true);
  });
});

/**
 * What the levels were when they were measured, pinned for the ones still as they were: a level that is rebuilt (`REBUILT`) leaves
 * these pins, and is held to the targets instead.
 */
describe("the levels as built, pinned where they were measured", () => {
  const old = built.filter(({ index }) => !REBUILT.includes(index));
  const expectOld = <T,>(what: Record<number, T>, get: (s: Structure) => T): void => {
    for (const { index, s } of old) if (index in what) expect(get(s), `level ${index}`).toEqual(what[index]);
  };

  it("has the critical paths the targets take as 1x: the old level's own length", () => {
    for (const { index, s } of old) if (index) expect(s.critical.length, `level ${index}`).toBe(OLD_CRITICAL[index]);
  });

  it("has the exit doors ExitDoor.ts builds: a wall, but for level 1's grid edge and level 3's gallery-backed nave; the finale has none", () => {
    expectOld({ 0: "wall", 1: "edge", 2: "wall", 3: "freestanding", 4: "wall", 5: "wall", 6: "wall", 7: "n/a" }, (s) => s.exitSite);
  });

  it("opens the way with the right goal: a pad, a boss then the exit cell, or the finale", () => {
    expectOld({ 0: "pad", 1: "pad", 2: "boss", 3: "boss", 4: "boss", 5: "boss", 6: "boss", 7: "finale" }, (s) => s.exit.kind);
    expectOld({ 2: "Q", 3: "Z", 4: "N", 5: "H", 6: "V" }, (s) => s.exit.boss);
  });

  it("needs a key on the way on level 2 only: the others' locked doors guard side rooms (level 1's key opens nothing: KNOWN-1)", () => {
    expectOld({ 0: false, 1: false, 2: true, 3: false, 4: false, 5: false, 6: false, 7: false }, (s) => s.critical.keyRequired);
  });

  it("has one secret with at least three pickups on every level but the prologue, and two shrines on levels 1-7", () => {
    expectOld({ 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 }, (s) => s.secrets);
    for (const { index, s } of old) { if (index) expect(s.secretRewards.every((r) => r >= 3), `level ${index}`).toBe(true); expect(s.checkpoints.length, `level ${index}`).toBe(index ? 2 : 0); }
  });

  it("shows the sameness the plan says: levels 4, 5 and 6 are one building, one critical path", () => {
    const same = [4, 5, 6].filter((i) => !REBUILT.includes(i)).map((i) => built[i].s.critical.length);
    expect(new Set(same).size).toBeLessThanOrEqual(1);
    if (same.length) expect(same[0]).toBe(44);
  });
});

describe("REBUILT: the levels held to the targets", () => {
  it("names real levels, once each, in order, with no waiver", () => {
    expect([...REBUILT]).toEqual([...new Set(REBUILT)].sort((a, b) => a - b));
    for (const i of REBUILT) {
      expect(i >= 1 && i <= 7, `level ${i}`).toBe(true);
      expect(LEGACY_PROBLEMS[i], `level ${i} is rebuilt: it has no waiver`).toBeUndefined();
    }
  });

  for (const i of REBUILT) {
    it(`level ${i} meets every target, and passes the hard validation clean`, () => {
      const s = built[i].s;
      expect(s.problems, `level ${i}`).toEqual([]);
      expect(checkTargets(i, s), `level ${i}`).toEqual([]);
    });
  }
});

describe("the targets themselves", () => {
  const proof = analyse(buildCharnel());
  const meet = (s: Structure): string[] => checkTargets(3, s);

  it("are met by a level the toolkit wrote (tests/support/proofLevel.ts), so they can be met together", () => {
    expect(proof.problems).toEqual([]);
    expect(meet(proof)).toEqual([]);
  });

  it("are missed, number by number, by the levels as they were: level 1 (the frozen reference's, which the rebuild replaced) fails nine of them, level 2 six", () => {
    // levels 1 and 2 are rebuilt and meet the targets (above); "as it was" is the reference's own grid: no dressing, so no checkpoints and no masses.
    // Level 2 as it was has its pews as `v` and its armour as `r`, as the port spelt them before the rebuild (KNOWN-4, KNOWN-11: the reference's `V` is a Foreman and `A` a Mancubus)
    const old1 = analyse(evalReference<() => BuiltLevel>([refSource(REF.levelBuilder), refSource(REF.put1), refSource(REF.buildLevel1)], "buildLevel1")());
    const ref2 = evalReference<() => BuiltLevel>([refSource(REF.levelBuilder), refSource(REF.put1), refSource(REF.buildLevel2)], "buildLevel2")();
    const old2 = analyse({ ...ref2, g: ref2.g.map((row) => row.map((c) => (c === "V" ? "v" : c === "A" ? "r" : c))) });
    const l1 = checkTargets(1, old1).join("\n"), l2 = checkTargets(2, old2).join("\n");
    expect(l1).toMatch(/critical path is 42 steps, wanted 80-126/);
    expect(l1).toMatch(/0 loops/);
    expect(l1).toMatch(/no key hunt/);
    expect(l1).toMatch(/1 secrets/);
    expect(l1).toMatch(/1 floor heights/);
    expect(l1).toMatch(/0 vertical transitions/);
    expect(l1).toMatch(/4 rooms/);
    expect(l1).toMatch(/0 branch points/);
    expect(l1).toMatch(/no checkpoint every route passes/);
    expect(checkTargets(1, old1).length).toBeGreaterThanOrEqual(9);
    expect(l2).not.toMatch(/no key hunt/);   // level 2 has one: the key is 32 steps off the way
    expect(l2).not.toMatch(/loops/);
    expect(l2).toMatch(/critical path is 66 steps, wanted 119-198/);
  });

  /** One field spoilt at a time: each target is a separate way to fail, and each message names it. */
  const spoil: Array<[string, (s: Structure) => Structure, RegExp]> = [
    ["a path of 79 (under the floor of 80)", (s) => ({ ...s, critical: { ...s.critical, length: 79 } }), /critical path is 79/],
    ["a path of 133 (over three times 44)", (s) => ({ ...s, critical: { ...s.critical, length: 133 } }), /critical path is 133/],
    ["no loop", (s) => ({ ...s, loops: 0 }), /0 loops/],
    ["a key not on the way", (s) => ({ ...s, critical: { ...s.critical, keyRequired: false } }), /no key hunt/],
    ["a key off the way by 19", (s) => ({ ...s, critical: { ...s.critical, detour: 19 } }), /no key hunt/],
    ["no locked door", (s) => ({ ...s, lockedDoors: 0 }), /no key hunt/],
    ["one secret", (s) => ({ ...s, secrets: 1 }), /1 secrets/],
    ["a bare secret", (s) => ({ ...s, secretRewards: [3, 1] }), /fewer than 2 pickups/],
    ["no arena", (s) => ({ ...s, arenas: 0 }), /0 arenas/],
    ["two heights", (s) => ({ ...s, heights: 2 }), /2 floor heights/],
    ["one transition", (s) => ({ ...s, transitions: 1 }), /1 vertical transitions/],
    ["seven rooms", (s) => ({ ...s, rooms: 7 }), /7 rooms/],
    ["one branch point", (s) => ({ ...s, branches: 1 }), /1 branch points/],
    ["no checkpoint", (s) => ({ ...s, checkpoints: [] }), /no checkpoint every route passes/],
    ["a checkpoint at 0.39", (s) => ({ ...s, checkpoints: s.checkpoints.map((c) => ({ ...c, fraction: 0.39 })) }), /no checkpoint every route passes/],
    ["a checkpoint at 0.61", (s) => ({ ...s, checkpoints: s.checkpoints.map((c) => ({ ...c, fraction: 0.61 })) }), /no checkpoint every route passes/],
    ["a checkpoint a route can miss", (s) => ({ ...s, checkpoints: s.checkpoints.map((c) => ({ ...c, forced: false })) }), /unforced/],
    ["a fight with too little ammunition", (s) => ({ ...s, encounters: s.encounters.map((e, i) => (i ? e : { ...e, supply: e.hp * 1.9 })) }), /wanted 2x/],
    ["a boss with no armour on the way", (s) => ({ ...s, encounters: s.encounters.map((e) => (e.bosses ? { ...e, armour: 0 } : e)) }), /a boss\): .* armour/],
    ["a boss with too little ammunition", (s) => ({ ...s, encounters: s.encounters.map((e) => (e.bosses ? { ...e, ratio: .5 } : e)) }), /a boss\): ammunition/],
  ];
  it.each(spoil)("names it when the level has %s", (_what, f, re) => {
    expect(meet(f(proof)).join("\n")).toMatch(re);
  });

  it("takes a path of exactly 80 and exactly 132, the bounds themselves", () => {
    expect(meet({ ...proof, critical: { ...proof.critical, length: 80 } })).toEqual([]);
    expect(meet({ ...proof, critical: { ...proof.critical, length: 132 } })).toEqual([]);
  });

  it("scales the path with the level being rebuilt: level 2's old 66 wants 119-198, level 7's old 32 wants 80-96", () => {
    expect(checkTargets(2, { ...proof, critical: { ...proof.critical, length: 118 } }).join()).toMatch(/118 steps, wanted 119-198/);
    expect(checkTargets(2, { ...proof, critical: { ...proof.critical, length: 119 } })).toEqual([]);
    expect(checkTargets(7, { ...proof, critical: { ...proof.critical, length: 97 } }).join()).toMatch(/wanted 80-96/);
  });

  it("are the numbers the plan's Task 3 section writes down", () => {
    expect(TARGETS).toEqual({
      pathMin: 1.8, pathMax: 3, pathFloor: 80, loops: 1, keyDetour: 20, secrets: 2, secretRewards: 2, arenas: 1, heights: 3, transitions: 2,
      rooms: 8, branches: 2, checkpointFrom: 0.4, checkpointTo: 0.6, supplyOverHp: 2, supplyOverBossHp: 0.6, bossHealth: 50, bossArmour: 50,
    });
    const plan = readFileSync("docs/superpowers/plans/2026-10-05-deeper-levels.md", "utf8");
    for (const needle of ["1.8-3x", "at least 80 steps", "at least 1 loop", "20 steps", "2 secrets", "1 arena", "3 floor heights", "40-60%"]) expect(plan, needle).toContain(needle);
  });
});

describe("docs/level-structure.md", () => {
  it("is what scripts/level-structure.ts writes: run it after changing a level or the analysis", () => {
    const md = structureMarkdown(built.map(({ index, name, s }) => ({ index, name, s })));
    expect(readFileSync("docs/level-structure.md", "utf8").replace(/\r\n/g, "\n")).toBe(md);
  });
});
