import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels";
import { findAll } from "../../src/world/analysis";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

/**
 * Ground truth for which `ENEMY_DEFS` letters a player can actually meet.
 * `tests/world/levels.test.ts` is the model for building every level —
 * reachability, completability, key/door logic and KNOWN-4's ambiguous
 * tiles are its job, not this file's; this file only asks two narrower
 * questions about the roster table itself. See docs/known-issues.md
 * KNOWN-18.
 */
const built = LEVELS.map((def) => ({ name: def.name, grid: def.build().g }));

/**
 * Enemy letters some level grid actually places, derived by *building*
 * every real level module and scanning the resulting grids — never by
 * scanning `.ts` source text. A source-text scan of quoted grid rows
 * undercounts: levels 2-7 build their grids from `emptyGrid()` plus
 * `put()`/`putAbs()`/`put1()` calls (see `tests/world/levels.test.ts`'s
 * KNOWN-4 comment, and the 8-`V` count it had to reproduce), so most
 * placements never exist as string literals for a regex to find.
 */
const PLACED = new Set(
  Object.keys(ENEMY_DEFS).filter((ch) => built.some(({ grid }) => findAll(grid, ch).length > 0)),
);

/**
 * Enemy letters `spawnEnemy` (src/world/LevelLoader.ts) is called with by
 * name, at the only three call sites outside the level loader's own grid
 * dispatch: src/enemies/Boss.ts:195 (a priest boss's flock-summon, phase 2)
 * and :209 (the same boss's phase-3 summon), and src/player/Player.ts:161
 * (the challenge-plate gauntlet event). All three call sites pick between
 * literal `"z"`/`"f"` — never a variable — so this is copied as a literal
 * set, the same convention `tests/world/levels.test.ts` uses for the prop
 * table it cannot yet import.
 *
 * That "only three" claim is not just asserted here — it is re-derived and
 * guarded below (see the "SUMMONED accounts for..." test): a source scan
 * counts every `spawnEnemy(` call site outside this loader and checks every
 * string literal on those lines against this set, so a new call site (like
 * `Boss.ts:209` gaining a fourth reachable letter) cannot silently slip past
 * both this set and KNOWN-18's claim that only `"z"`/`"f"` are ever named.
 */
const SUMMONED = new Set(["z", "f"]);

/** Every `.ts` file under a directory, recursively. */
function srcFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? srcFiles(p) : p.endsWith(".ts") ? [p] : [];
  });
}

/**
 * Guard for `SUMMONED` itself, closing the gap the review found: a set that
 * is merely copied from a comment, with nothing checking the comment still
 * matches the source, does not catch a new summon site (or a changed one)
 * that names a letter outside `{"z","f"}`. Proven by review: retargeting
 * `Boss.ts:209`'s `spawnEnemy("f",...)` to `spawnEnemy("q",...)` left all
 * three `rosterReach.test.ts` tests green, because `q` landed in neither
 * `PLACED` nor the hand-written `SUMMONED`, and *was* already in
 * `UNREACHABLE` — both directions of the first assertion passed while the
 * row they exist to protect (`q` is unreachable) had become false.
 *
 * This scans every `.ts` file under `src/` *except* `LevelLoader.ts` itself
 * (which owns the grid dispatch's own, separate `spawnEnemy(ch,...)` call —
 * that one passes a variable, not a literal, and is not part of this claim)
 * for lines containing `spawnEnemy(`, and asserts two things: there are
 * exactly three such lines, and every quoted string literal appearing on any
 * of them is a member of `SUMMONED`.
 */
const SRC = join(__dirname, "..", "..", "src");
const LEVEL_LOADER = join(SRC, "world", "LevelLoader.ts");

function spawnEnemyCallLines(): { file: string; line: string }[] {
  const hits: { file: string; line: string }[] = [];
  for (const f of srcFiles(SRC)) {
    if (f === LEVEL_LOADER) continue; // the loader's own grid dispatch, not a call site
    const text = readFileSync(f, "utf8");
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const line of code.split("\n")) {
      if (/\bspawnEnemy\(/.test(line)) hits.push({ file: f, line: line.trim() });
    }
  }
  return hits;
}

it("SUMMONED accounts for every literal at every spawnEnemy call site outside the loader", () => {
  const hits = spawnEnemyCallLines();
  expect(
    hits.map((h) => `${h.file}: ${h.line}`),
    "expected exactly three spawnEnemy( call sites outside LevelLoader.ts — a call site was added or removed; re-derive SUMMONED and KNOWN-18's count",
  ).toHaveLength(3);

  for (const { file, line } of hits) {
    const literals = [...line.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
    for (const lit of literals) {
      expect(SUMMONED.has(lit), `${file}: "${line}" names "${lit}", which is not in SUMMONED ${JSON.stringify([...SUMMONED])} — a new/changed summon site may have just made a letter reachable`).toBe(true);
    }
  }
});

/**
 * `ENEMY_DEFS` letters no level places and nothing summons by name — the
 * player can never meet them. Each reason is recorded, not just the letter;
 * see docs/known-issues.md KNOWN-18. Do not "fix" this by placing or
 * summoning either letter — the roster cut (Phase 3) may delete both
 * outright, and that call belongs to a human who has played the game.
 */
const UNREACHABLE: Record<string, string> = {
  B: "230hp slam attacker — declared in ENEMY_DEFS, placed in no level grid, summoned nowhere by name",
  q: "AFRIT (fly/burst/deathBoom) — declared in ENEMY_DEFS, placed in no level grid, summoned nowhere by name",
};

it("every ENEMY_DEFS letter is placed, summoned, or recorded as UNREACHABLE", () => {
  for (const ch of Object.keys(ENEMY_DEFS)) {
    const reachable = PLACED.has(ch) || SUMMONED.has(ch);
    expect(reachable || ch in UNREACHABLE, `'${ch}' is placed nowhere, summoned nowhere, and not in UNREACHABLE`)
      .toBe(true);
  }
});

// The other half of the same guarantee: an UNREACHABLE entry that becomes
// reachable (placed or summoned) without being removed from the set is a
// stale claim, and must fail loudly rather than sit there unnoticed.
it("every UNREACHABLE entry is actually unreached", () => {
  for (const ch of Object.keys(UNREACHABLE)) {
    const reachable = PLACED.has(ch) || SUMMONED.has(ch);
    expect(reachable, `'${ch}' is listed in UNREACHABLE but is placed or summoned somewhere`).toBe(false);
  }
});

/**
 * Every glyph a level grid can hold must be claimed by some table, or it is
 * silently nothing at runtime. `loadLevel`'s dispatch (src/world/
 * LevelLoader.ts) checks, in order: a fixed skip-string for structural
 * chars, then P/X/i/l/p/Y (also structural — each does something, just not
 * enemy/prop/item), then `ENEMY_DEFS`, then the prop string, then an item
 * table (`map2`) — anything reaching past all of those hits `if(!k)continue`
 * and vanishes. This is KNOWN-4/KNOWN-11's bug class (a glyph claimed by
 * *two* tables) approached from the other side: a glyph claimed by *none*.
 *
 * `map2` and the prop string are not exported, so — like `PROP_CHARS` in
 * tests/world/levels.test.ts — they are copied here as literals with a
 * citation, not re-derived from source text.
 *
 * That copy is safe in only one direction: if `loadLevel`'s dispatch *gains*
 * a glyph in one of these three tables, this test starts flagging it as
 * unclaimed (a false alarm, noticed immediately). If the dispatch *loses* a
 * glyph, this copy stays too broad and silently stops catching that glyph —
 * `ENEMY_CHARS` is derived from `ENEMY_DEFS` at run time so that one table is
 * immune, but these three are not. Re-check `STRUCTURAL_CHARS`/`PROP_CHARS`/
 * `ITEM_CHARS` by hand against `loadLevel`'s dispatch whenever it changes —
 * which Phase 4 will do while rebuilding levels 2-4. A clear note was chosen
 * over trying to derive these three from source text, which is exactly the
 * undercounting trap `PLACED`'s own comment above documents.
 */
const STRUCTURAL_CHARS = new Set([
  ".", "#", "W", "I", "+", "D", "S", // LevelLoader.ts:304 skip string
  "P", "X", "i", "l", "p", "Y", // LevelLoader.ts:306-337 special-cased placements
]);
const PROP_CHARS = new Set(["x", "T", "C", "F", "V", "O"]); // LevelLoader.ts:339
const ITEM_CHARS = new Set([
  "h", "A", "a", "b", "o", "c", "K", // LevelLoader.ts:341 map2
  "2", "3", "4", "5", "6", "7", "8", "9", "0", // LevelLoader.ts:342 map2
]);
const ENEMY_CHARS = new Set(Object.keys(ENEMY_DEFS));

const CLAIMED = new Set<string>([...STRUCTURAL_CHARS, ...PROP_CHARS, ...ITEM_CHARS, ...ENEMY_CHARS]);

it("every glyph a level places is claimed by some table (enemy, prop, item, or structural)", () => {
  const unclaimed = new Set<string>();
  for (const { grid } of built) {
    for (const row of grid) {
      for (const ch of row) {
        if (!CLAIMED.has(ch)) unclaimed.add(ch);
      }
    }
  }
  // Today this finds nothing — every grid character every level actually
  // places is claimed by some table. The assertion still earns its place:
  // Phase 4 hand-authors new grids for levels 2-4, and this is what would
  // catch a typo'd or since-retired glyph the moment one is introduced.
  expect([...unclaimed]).toEqual([]);
});
