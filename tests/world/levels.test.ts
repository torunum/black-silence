import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels";
import { findAll, floodFill, isOpen } from "../../src/world/analysis";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

const built = LEVELS.map((def) => ({ name: def.name, grid: def.build().g }));

/**
 * A level completes in one of three ways, so "has an exit" is not one check.
 * All three verified against bossDeath() and openExit() in the reference:
 *   - Prologue and Level 1 place a static `X` tile in the grid.
 *   - Levels 2-6 are boss-gated: killing Q/Z/N/H/V calls openExit(), which
 *     places the pad on the first open cell in a hardcoded candidate list.
 *   - Level 7 is the finale: its boss G calls showWin(), so it has no exit.
 */

/** The cells openExit() tries, in order. Hardcoded in the game. */
const EXIT_CANDIDATES: ReadonlyArray<readonly [number, number]> = [
  [16, 16], [16, 15], [15, 16], [17, 16], [16, 17],
];

/**
 * Bosses whose death calls openExit().
 *
 * **Hand-written here, mirroring `src/enemies/Death.ts`'s `bossDeath` — not
 * derived from it.** Accurate as of this commit: `bossDeath` has exactly
 * five `openExit()` arms (`e.key==="Q"|"Z"|"N"|"H"|"V"`), checked against
 * the source, and `G` deliberately has none because level 7's boss calls
 * `showWin()` instead. Nothing enforces the mirror, so a new boss key given
 * an `openExit()` arm would pass every test in this file while being
 * invisible to the two checks below — **re-check this list whenever
 * `Death.ts`'s `bossDeath` changes.** Same convention as
 * `EXIT_CANDIDATES` above, which is copied from `openExit` the same way.
 */
const EXIT_OPENING_BOSSES = ["Q", "Z", "N", "H", "V"];

/** The finale boss, which calls showWin() instead of opening an exit. */
const FINALE_BOSS = "G";

it("builds every declared level", () => {
  expect(built).toHaveLength(8);
});

describe.each(built)("$name", ({ grid }) => {
  it("has exactly one player spawn", () => {
    expect(findAll(grid, "P")).toHaveLength(1);
  });

  it("is completable — a reachable static exit, or a boss that opens a reachable one", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, true);

    const staticExits = findAll(grid, "X");
    if (staticExits.length > 0) {
      expect(staticExits.some((e) => seen[e.z]?.[e.x]), "no static exit is reachable").toBe(true);
      return;
    }

    if (EXIT_OPENING_BOSSES.some((b) => findAll(grid, b).length > 0)) {
      // openExit() walks EXIT_CANDIDATES and takes the first cell solidAt()
      // reports open. If none is open the loop falls through and the pad is
      // placed at (16,16) anyway — inside a wall, unreachable, level
      // unfinishable. So at least one candidate must be open, reachable, and
      // not a door (a door reads open statically but is solid until used).
      const usable = EXIT_CANDIDATES.filter(
        ([x, z]) => isOpen(grid, x, z) && !"+DS".includes(grid[z]?.[x]) && seen[z]?.[x],
      );
      expect(usable.length, "no openExit() candidate is open and reachable").toBeGreaterThan(0);
      return;
    }

    // No static exit and no exit-opening boss is legal only for the finale,
    // whose boss calls showWin() instead.
    expect(findAll(grid, FINALE_BOSS).length, "no exit and no finale boss").toBeGreaterThan(0);
  });

  it("every key is reachable without passing a locked door", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, false);
    for (const key of findAll(grid, "K")) {
      expect(seen[key.z][key.x], `key at ${key.x},${key.z}`).toBe(true);
    }
  });

  // The game has a single global key: S.key in legacy.js is a boolean, not
  // a per-door token, and one red key opens every "D" door in the level.
  // So a locked door standing behind another locked door is not a hazard —
  // there is nothing to chain. What must hold is weaker: every locked door
  // has open floor on at least one side, so the player can walk up and use
  // it once the (single) key is held. Keep this .every(), not .some() —
  // .some() only proves one door is approachable, which is not the
  // invariant the game's key model actually requires.
  it("every locked door is approachable without the key", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, false);
    const doors = findAll(grid, "D");
    if (doors.length === 0) return;
    const allReachable = doors.every(
      (d) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen[d.z + dz]?.[d.x + dx]),
    );
    expect(allReachable).toBe(true);
  });

  it("every secret door has open floor on both sides", () => {
    for (const s of findAll(grid, "S")) {
      const horizontal = isOpen(grid, s.x - 1, s.z) && isOpen(grid, s.x + 1, s.z);
      const vertical = isOpen(grid, s.x, s.z - 1) && isOpen(grid, s.x, s.z + 1);
      expect(horizontal || vertical, `secret at ${s.x},${s.z} opens onto solid rock`).toBe(true);
    }
  });

  it("every enemy, item and prop stands on reachable floor", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, true);
    const structural = new Set([".", "#", "I", "W", "+", "D", "S", "P"]);
    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        const ch = grid[z][x];
        if (structural.has(ch)) continue;
        expect(seen[z][x], `'${ch}' stranded at ${x},${z}`).toBe(true);
      }
    }
  });
});

/**
 * Characterization test for KNOWN-1. Level 1 places a red key and a Guardian
 * miniboss guarding it, but contains no locked door at all — the key does
 * nothing. Phase 0 preserves the bug; this pins it so it cannot spread
 * unnoticed and fails loudly when Phase 4 fixes it.
 */
it("records levels that place a key with no locked door (KNOWN-1)", () => {
  const offenders = built
    .filter(({ grid }) => findAll(grid, "K").length > 0 && findAll(grid, "D").length === 0)
    .map(({ name }) => name);
  expect(offenders).toEqual(["LEVEL 1 — THE GOTHIC DUNGEON"]);
});

/**
 * KNOWN-4, rewritten — **not deleted**. It used to pin the bug; it now pins
 * the half of the bug that was fixed and the half that is still armed.
 *
 * The mechanism is unchanged and deliberately so. `loadLevel` dispatches a
 * grid character to an enemy spawn (`EDEF[ch]`) before it ever checks the
 * prop set (`"xTCFVOv".includes(ch)`, `src/world/LevelLoader.ts`), so any
 * character in BOTH rosters still always spawns the enemy and never the
 * prop. The prop set is still a literal in that file rather than an export,
 * so it is still copied here — kept honest by these tests failing the moment
 * either roster or any level grid changes under it. The enemy side is
 * derived from `ENEMY_DEFS` rather than duplicated.
 *
 * What changed: the project owner played the game and reported level 2's
 * first boss as much too hard. It was eight of them. Level 2's eight `V`
 * tiles, written under a "nave pews" comment, each spawned THE FACTORY
 * FOREMAN (2600 hp, `boss`, `priest`, `sovereign`) — 20,800 hp of church
 * furniture in front of the level's actual boss, the Corrupted Priest. All
 * eight are now `v`, a prop-only pew added to `spawnProp`; see
 * `src/world/levels/level2.ts`'s header for why the chapel and side-aisle
 * tiles were judged furniture too, and why level 2 has no Foreman at all.
 *
 * What did NOT change: `C` and `V` are still both an enemy and a prop, and
 * the `C` in level 2's priest chambers is still a Cacodemon rather than the
 * chair it was written as. The dispatch order was **not** flipped, because
 * `C` is an intentional Cacodemon in levels 6 and 7 — flipping it would
 * trade this collision for that one.
 */
const PROP_CHARS = "xTCFVOv"; // src/world/LevelLoader.ts — spawnProp()'s dispatch string, not an export
const AMBIGUOUS_CHARS = Object.keys(ENEMY_DEFS)
  .filter((ch) => PROP_CHARS.includes(ch))
  .sort();

it("pins which grid characters are still claimed by both an enemy and a prop (KNOWN-4)", () => {
  // Still two. Adding `v` deliberately did not shrink this set — it gave the
  // pew an unambiguous spelling without disarming the trap underneath.
  expect(AMBIGUOUS_CHARS).toEqual(["C", "V"]);
});

it("pins how many ambiguous tiles each level grid contains (KNOWN-4)", () => {
  const counts = Object.fromEntries(
    built.map(({ name, grid }) => [
      name,
      Object.fromEntries(AMBIGUOUS_CHARS.map((ch) => [ch, findAll(grid, ch).length])),
    ]),
  );
  expect(counts).toEqual({
    "PROLOGUE — OUT OF THE PIT": { C: 0, V: 0 },
    // Was `{ C: 1, V: 8 }`. The eight are gone; the one `C` — the chair in
    // the priest's chambers, still a Cacodemon — is the part of KNOWN-4 that
    // stays open, and this row is where it stays visible.
    "LEVEL 1 — THE GOTHIC DUNGEON": { C: 0, V: 0 },
    "LEVEL 2 — THE ABANDONED CHURCH": { C: 1, V: 0 },
    "LEVEL 3 — THE NECROPOLIS": { C: 0, V: 0 },
    "LEVEL 4 — THE GRAVEYARD": { C: 0, V: 0 },
    "LEVEL 5 — THE SEWERS": { C: 0, V: 0 },
    // Level 6 is THE FACTORY: its single `V` is the Foreman, its own boss,
    // and is meant to be an enemy. This is why the fix is in level 2's grid
    // and not in the dispatch.
    "LEVEL 6 — THE FACTORY": { C: 3, V: 1 },
    "LEVEL 7 — THE WOMB": { C: 2, V: 0 },
  });
});

/**
 * The positive half of the same change: the furniture actually reaches the
 * prop table. `v` must stay out of `ENEMY_DEFS` — the moment a def claims
 * it, level 2's pews become bosses again in exactly the way KNOWN-4
 * describes, and nothing else in the suite would say so.
 */
it("level 2's pews are props, not enemies, and `v` is claimed by no enemy def (KNOWN-4)", () => {
  expect(Object.keys(ENEMY_DEFS)).not.toContain("v");
  expect(PROP_CHARS).toContain("v");

  const counts = Object.fromEntries(
    built.map(({ name, grid }) => [name, findAll(grid, "v").length]),
  );
  expect(counts).toEqual({
    "PROLOGUE — OUT OF THE PIT": 0,
    "LEVEL 1 — THE GOTHIC DUNGEON": 0,
    "LEVEL 2 — THE ABANDONED CHURCH": 8,
    "LEVEL 3 — THE NECROPOLIS": 0,
    "LEVEL 4 — THE GRAVEYARD": 0,
    "LEVEL 5 — THE SEWERS": 0,
    "LEVEL 6 — THE FACTORY": 0,
    "LEVEL 7 — THE WOMB": 0,
  });
});

/**
 * KNOWN-11 — the item-table half of the same collision, closed the same way
 * and in the same round. `A` is the armour pickup's key in `loadLevel`'s
 * item map *and* the Mancubus in `ENEMY_DEFS`; the enemy arm is checked
 * first, so all **twenty** `A` tiles across seven levels spawned a 260 hp
 * enemy, `map2.A` was unreachable dead code, and `S.armor` was structurally
 * 0 for the entire life of the game — the HUD's armour slot could only ever
 * read `0`. All twenty are now `r`, an item-only glyph.
 *
 * All twenty, not only the nine in the five kept levels: levels 5-7 are
 * parked to `episode2` but still build and are still covered by every test
 * in this file, and a partial fix would leave eleven armed behind a
 * known-issues row saying the bug is closed.
 *
 * The two tests below are what makes the mutation "revert one tile to `A`"
 * go red; `tests/world/rosterReach.test.ts`'s `UNREACHABLE` entry for `A`
 * is the third, from the roster side, and `tests/fidelity.test.ts`'s
 * `ARMOUR_CELLS` is the fourth, from the frozen master's side.
 *
 * What did NOT change, exactly as with KNOWN-4: `A` is still in the item
 * map and still unreachable there, the dispatch order is still
 * enemy-before-item, and the tables still overlap.
 */
it("no level places `A`, so the Mancubus is out of the game (KNOWN-11)", () => {
  const placed = built
    .map(({ name, grid }) => [name, findAll(grid, "A").length] as const)
    .filter(([, n]) => n > 0);
  expect(placed).toEqual([]);
});

it("every armour tile the authors wrote reaches the item table (KNOWN-11)", () => {
  // `r` must stay out of both other rosters — the moment an enemy def or the
  // prop string claims it, every armour pickup in the game turns back into
  // something else and nothing but this line would say so.
  expect(Object.keys(ENEMY_DEFS)).not.toContain("r");
  expect(PROP_CHARS).not.toContain("r");

  const counts = Object.fromEntries(
    built.map(({ name, grid }) => [name, findAll(grid, "r").length]),
  );
  expect(counts).toEqual({
    "PROLOGUE — OUT OF THE PIT": 0,          // the prologue authors none
    "LEVEL 1 — THE GOTHIC DUNGEON": 1,       // the secret alcove's reward cache
    "LEVEL 2 — THE ABANDONED CHURCH": 2,
    "LEVEL 3 — THE NECROPOLIS": 3,
    "LEVEL 4 — THE GRAVEYARD": 3,
    "LEVEL 5 — THE SEWERS": 3,
    "LEVEL 6 — THE FACTORY": 4,
    "LEVEL 7 — THE WOMB": 4,
  });
  expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(20);
});

/**
 * And the consequence the level design turns on. `bossDeath`'s `V` arm calls
 * `openExit()` — the same call the Corrupted Priest's death makes — so any
 * Foreman in level 2 would open the level's exit and let the player walk past
 * `Q`. Whatever those tiles were, they were not that.
 *
 * The keys come from `EXIT_OPENING_BOSSES` above, which **mirrors**
 * `src/enemies/Death.ts` by hand rather than deriving anything from it —
 * see that constant's own comment for what that costs and when to re-check
 * it. (Review round 1, Minor 1: this said "derived", which it is not.)
 */
it("no level contains an exit-opening boss other than its own (KNOWN-4)", () => {
  const perLevel = Object.fromEntries(
    built.map(({ name, grid }) => [
      name,
      EXIT_OPENING_BOSSES.filter((b) => findAll(grid, b).length > 0).sort(),
    ]),
  );
  expect(perLevel).toEqual({
    "PROLOGUE — OUT OF THE PIT": [],
    "LEVEL 1 — THE GOTHIC DUNGEON": [],
    "LEVEL 2 — THE ABANDONED CHURCH": ["Q"],   // was ["Q","V"] — eight stray exits
    "LEVEL 3 — THE NECROPOLIS": ["Z"],
    "LEVEL 4 — THE GRAVEYARD": ["N"],
    "LEVEL 5 — THE SEWERS": ["H"],
    "LEVEL 6 — THE FACTORY": ["V"],
    "LEVEL 7 — THE WOMB": [],
  });
});

/**
 * Not KNOWN-4 itself, but discovered alongside it: the grid-legend
 * docstring atop src/world/levels/index.ts is inherited verbatim from the
 * reference's old banner comment and is inaccurate — it does not list
 * every character that actually appears in a grid (e.g. `0`, `7`, `8`, `9`,
 * the pickup digits used by put()/putAbs() calls throughout these level
 * files). It is left as-is (inherited, unreliable) rather than rewritten,
 * since correcting it is a documentation change orthogonal to this fix
 * wave — flagged here and in docs/known-issues.md so nobody mistakes it
 * for an exhaustive reference.
 */
