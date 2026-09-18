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
 * That "only three" claim is not just asserted here — the "SUMMONED
 * accounts for..." test below re-derives it from source on every run. What
 * it actually establishes: every `spawnEnemy(` *call* in `src/` (parsed as
 * a whole call, not a line — so a call split across lines or wrapped in a
 * multi-line expression is still seen whole), other than the loader's own
 * `if(EDEF[ch])spawnEnemy(ch,...)` dispatch (recognized by that exact
 * shape, not by filename — a second, literal call added anywhere else in
 * `LevelLoader.ts` is scanned like any other file), numbers exactly three,
 * and each one's first argument either contains only quoted-string literals
 * (`"..."`, `'...'`, or a non-interpolated `` `...` ``) that are all members
 * of `SUMMONED`, or is a bare identifier this file can resolve to one via a
 * same-file `const`/`let`/`var` lookup. A first argument this scan cannot
 * turn into a literal — a computed value, an interpolated template literal,
 * or an identifier with no simple same-file assignment — fails the test
 * outright rather than being silently skipped.
 *
 * The known remaining gaps: the same-file identifier lookup is a plain text
 * search, not scope-aware. If a hoisted letter variable's name were reused
 * with a different value in another function in the same file, the lookup
 * could resolve the wrong one — and if that wrong value happened to already
 * be in `SUMMONED`, the check would pass when it should not. This has never
 * happened (today nothing hoists a summon letter into a variable at all),
 * and the fallback for anything it can't resolve is still to fail loudly,
 * not to pass silently — but this one path is not airtight, and is recorded
 * here rather than claimed away. A second gap: `spawnEnemy` called through
 * an alias (e.g., `const se = spawnEnemy; se(...)` or `obj["spawnEnemy"](...)`)
 * is invisible to the scan, which matches only the literal substring `spawnEnemy(`.
 * Today nothing in `src/` does this, but the scan cannot establish it never will.
 */
const SUMMONED = new Set(["z", "f"]);

/** Every `.ts` file under a directory, recursively. */
function srcFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? srcFiles(p) : p.endsWith(".ts") ? [p] : [];
  });
}

const SRC = join(__dirname, "..", "..", "src");
const LEVEL_LOADER = join(SRC, "world", "LevelLoader.ts");

/** Strip `/* ... *\/` and `// ...` comments so they can't hide or fake a call. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Splits a call's argument-list text on top-level commas — i.e. commas that
 * are not inside `(...)`/`[...]`/`{...}` nesting or inside a string/template
 * literal. Good enough for real call sites (`a?"x":"y",b,c`, nested calls,
 * etc.) without a full expression parser.
 */
function splitArgs(argsText: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inStr: string | null = null;
  let current = "";
  for (let i = 0; i < argsText.length; i++) {
    const c = argsText[i];
    if (inStr) {
      current += c;
      if (c === "\\") {
        current += argsText[++i] ?? "";
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      current += c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    if (c === ")" || c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) {
      args.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  if (current.trim() !== "" || args.length > 0) args.push(current);
  return args.map((a) => a.trim());
}

/** Every quoted-string / template-literal substring found in `text`, flagging interpolation. */
function literalsIn(text: string): { literal: string; interpolated: boolean }[] {
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  const out: { literal: string; interpolated: boolean }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const lit = (m[1] ?? m[2] ?? m[3]) as string;
    out.push({ literal: lit, interpolated: lit.includes("${") });
  }
  return out;
}

/**
 * Best-effort resolution of a bare identifier to the string literal it was
 * assigned, via a same-file `const`/`let`/`var NAME = "…"` lookup. NOT
 * scope-aware — see the `SUMMONED` comment's "known remaining gap" above.
 */
function resolveIdentifier(code: string, name: string): string | null {
  const re = new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)`);
  const m = re.exec(code);
  if (!m) return null;
  const raw = m[1];
  const inner = raw.slice(1, -1);
  if (inner.includes("${")) return null; // interpolated — cannot resolve statically
  return inner;
}

/**
 * Is this `spawnEnemy(` occurrence (at `spawnIdx` in `code`) the level
 * loader's own grid dispatch — `if(EDEF[ch])spawnEnemy(ch,...)` — recognized
 * by that exact shape (the `if(EDEF[<name>])` immediately before the call,
 * with the same `<name>` as the call's own first argument), not by which
 * file it's in? Anything else in `LevelLoader.ts`, including a second call
 * with this same shape but a different variable, or a literal call, is
 * scanned like any other call site.
 */
function isKnownLevelLoaderDispatch(code: string, spawnIdx: number, arg0: string): boolean {
  const before = code.slice(Math.max(0, spawnIdx - 60), spawnIdx);
  const m = /if\s*\(\s*EDEF\[([A-Za-z_$][\w$]*)\]\s*\)\s*$/.exec(before);
  return !!m && m[1] === arg0;
}

interface CallSite {
  file: string;
  arg0: string;
  literals: string[];
  problem?: string;
}

function analyzeCall(file: string, code: string, argsText: string): CallSite {
  const args = splitArgs(argsText);
  const arg0 = (args[0] ?? "").trim();
  const found = literalsIn(arg0);
  if (found.some((f) => f.interpolated)) {
    return {
      file,
      arg0,
      literals: [],
      problem: `first argument \`${arg0}\` is an interpolated template literal — its value is not fixed at read time and cannot be verified statically`,
    };
  }
  if (found.length > 0) return { file, arg0, literals: found.map((f) => f.literal) };
  if (/^[A-Za-z_$][\w$]*$/.test(arg0)) {
    const resolved = resolveIdentifier(code, arg0);
    if (resolved !== null) return { file, arg0, literals: [resolved] };
  }
  return {
    file,
    arg0,
    literals: [],
    problem: `first argument \`${arg0}\` names no literal this guard can verify (not a quoted literal, and not a same-file const/let/var it can resolve) — a hoisted or computed letter must be re-derived by a human, not assumed safe`,
  };
}

/**
 * Every `spawnEnemy(` call in `src/`, parsed as a whole call (so a call
 * split across lines, or one whose literal is on a different line than
 * `spawnEnemy(`, is still captured whole), except the loader's own
 * `if(EDEF[ch])spawnEnemy(ch,...)` dispatch (see `isKnownLevelLoaderDispatch`).
 * Function *declarations* (`function spawnEnemy(...)`) are excluded — they
 * are not call sites.
 */
function collectCallSites(): CallSite[] {
  const sites: CallSite[] = [];
  for (const f of srcFiles(SRC)) {
    const code = stripComments(readFileSync(f, "utf8"));
    const re = /\bspawnEnemy\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
      const nameStart = m.index;
      const openParen = nameStart + m[0].length - 1;
      const before = code.slice(0, nameStart);
      if (/\bfunction\s+$/.test(before)) continue; // declaration, not a call

      let depth = 1;
      let i = openParen + 1;
      let inStr: string | null = null;
      for (; i < code.length && depth > 0; i++) {
        const c = code[i];
        if (inStr) {
          if (c === "\\") {
            i++;
            continue;
          }
          if (c === inStr) inStr = null;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") {
          inStr = c;
          continue;
        }
        if (c === "(") depth++;
        else if (c === ")") depth--;
      }
      const argsText = code.slice(openParen + 1, i - 1);
      const arg0 = (splitArgs(argsText)[0] ?? "").trim();
      if (f === LEVEL_LOADER && isKnownLevelLoaderDispatch(code, nameStart, arg0)) continue;
      sites.push(analyzeCall(f, code, argsText));
    }
  }
  return sites;
}

/**
 * Guard for `SUMMONED` itself, closing the gap the review found: a set that
 * is merely copied from a comment, with nothing checking the comment still
 * matches the source, does not catch a new summon site (or a changed one)
 * that names a letter outside `{"z","f"}`. Proven by review round 1:
 * retargeting `Boss.ts:209`'s `spawnEnemy("f",...)` to `spawnEnemy("q",...)`
 * left all three original `rosterReach.test.ts` tests green.
 *
 * Round 2 proved the line-based version of this guard (which scanned single
 * lines for quoted literals and excluded `LevelLoader.ts` by filename) had
 * three further gaps, all closed by the version below: a backtick literal
 * (the old regex matched `"` and `'` only), the same call split across two
 * lines or hoisted into a variable (the literal was no longer on the
 * `spawnEnemy(` line itself), and a literal `spawnEnemy("q",...)` added
 * anywhere else in `LevelLoader.ts` (the old guard skipped that whole file).
 * See the `SUMMONED` comment above for exactly what this version establishes
 * and the one gap it still has.
 */
it("SUMMONED accounts for every literal at every spawnEnemy call site outside the loader's own dispatch", () => {
  const sites = collectCallSites();

  expect(
    sites.map((s) => `${s.file}: ${s.arg0}`),
    "expected exactly three spawnEnemy( call sites outside LevelLoader.ts's own if(EDEF[ch])spawnEnemy(ch,...) dispatch — a call site was added, removed, or the dispatch changed shape enough that this guard no longer recognizes it; re-derive SUMMONED and KNOWN-18's count",
  ).toHaveLength(3);

  for (const site of sites) {
    expect(site.problem, `${site.file}: first argument \`${site.arg0}\`${site.problem ? " — " + site.problem : ""}`).toBeUndefined();
    for (const lit of site.literals) {
      expect(
        SUMMONED.has(lit),
        `${site.file}: first argument \`${site.arg0}\` names "${lit}", which is not in SUMMONED ${JSON.stringify([...SUMMONED])} — a new/changed summon site may have just made a letter reachable`,
      ).toBe(true);
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
// `v` — the prop-only pew added in player-feedback round 1, task 1 (KNOWN-4).
// It is in this table and in no other, which is the entire reason it exists.
const PROP_CHARS = new Set(["x", "T", "C", "F", "V", "O", "v"]); // LevelLoader.ts spawnProp dispatch
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
