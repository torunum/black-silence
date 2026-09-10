import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

/**
 * ================ KNOWN-16 (second half) — DO NOT "FIX" THIS FILE ================
 *
 * `EnemyDef.deathBoom` is authored on exactly one enemy (`q`, the Afrit) and
 * read **nowhere** in `src/` — not from the def, not from a spawned enemy.
 * The Afrit's death explosion still happens: `src/enemies/Death.ts` hardcodes
 * `if(e.key==="q")` instead of consulting the flag, so the *behavior* is not
 * missing, only the data-driven route to it.
 *
 * This is the opposite class from KNOWN-15's ten fields (`tests/enemies/deadDefFields.test.ts`):
 * those are read everywhere and delivered nowhere (authored -> declared on
 * `Enemy` -> read by AI/damage/boss code -> never copied by `spawnEnemy`).
 * `deathBoom` is authored and then touched by nothing at all — not even
 * declared on `Enemy`, because nothing needs to read it there.
 *
 * **Do not delete `deathBoom`, and do not wire `Death.ts` to read it.** Both
 * are defensible fixes, but deleting or rewiring authored data in a file
 * that mirrors the frozen reference (`EnemyDefs.ts`) is the roster phase's
 * call, not this task's. This file exists only to pin the current gap so a
 * future change is deliberate and visible — these tests go red on purpose
 * when someone does that work. See KNOWN-16 in `docs/known-issues.md`.
 *
 * ---
 *
 * The "authored on exactly one def" half is derived from `ENEMY_DEFS` at run
 * time, not hardcoded, for the same reason `deadDefFields.test.ts` derives
 * its counts: a hardcoded count goes stale silently the moment the roster
 * changes.
 *
 * The "read by nothing" half needs a source scan, and deliberately does NOT
 * reuse `deadDefFields.test.ts`'s write-scan regex (`\.field\s*=(?![=>])`).
 * That regex is narrow on purpose: those ten fields have many *legitimate*
 * reads, so the scan has to isolate writes specifically, and dot-notation
 * assignment is the only form this codebase's authors use for that — the
 * regex accepts missing bracket-access (`e["field"]=`) and compound
 * assignment (`e.field+=`) as a documented blind spot because nothing in
 * this codebase writes an enemy field that way.
 *
 * A *read* scan cannot make that same trade. `deathBoom` has zero legitimate
 * reads (that is the entire claim being pinned), so there is no "read forms
 * we don't care about" to narrow past — any occurrence of the identifier
 * anywhere, in any syntactic form (dot access, bracket access, destructuring,
 * a compound assignment's implicit read), would falsify the claim. Reusing
 * the dot-notation-only write-regex here would silently miss exactly those
 * forms. So this scan does not try to distinguish read/write/declare
 * syntax at all: it finds every occurrence of the bare identifier `deathBoom`
 * in `src/` (comments stripped) and asserts the *only* two are the
 * declaration and the single authoring line in `EnemyDefs.ts` itself. That
 * is strictly stronger than a read-only scan would be, and it has no
 * dot-notation blind spot because it is not anchored to any access syntax.
 */

const SRC = join(__dirname, "..", "..", "src");

/** Every `.ts` file under `src/`, recursively. */
function srcFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? srcFiles(p) : p.endsWith(".ts") ? [p] : [];
  });
}

describe("KNOWN-16 (second half) — deathBoom is authored once and read nowhere", () => {
  it("guard: is authored on exactly one ENEMY_DEFS entry", () => {
    const authors = Object.keys(ENEMY_DEFS).filter((k) => ENEMY_DEFS[k].deathBoom !== undefined);
    expect(authors, "deathBoom's author set changed — update this pin, and docs/known-issues.md KNOWN-16, deliberately").toEqual(["q"]);
    expect(ENEMY_DEFS.q.deathBoom).toBe(true);
  });

  it("is referenced nowhere in src/ except its declaration and its one authoring line", () => {
    const files = srcFiles();
    expect(files.length, "found no .ts files under src/ — the scan below would be vacuous").toBeGreaterThan(50);

    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // Comments stripped first, same as deadDefFields.test.ts: this file's
      // own prose (and EnemyDefs.ts's, and known-issues.md's) says
      // "deathBoom" at length.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const line of code.split("\n")) {
        if (/\bdeathBoom\b/.test(line)) hits.push(`${f}:${line.trim()}`);
      }
    }

    const enemyDefsFile = join(SRC, "enemies", "EnemyDefs.ts");
    const declaration = hits.filter((h) => h.startsWith(`${enemyDefsFile}:`) && /deathBoom\?:\s*boolean;/.test(h));
    const authoring = hits.filter((h) => h.startsWith(`${enemyDefsFile}:`) && /deathBoom:\s*true/.test(h));

    expect(declaration.length, "EnemyDef's `deathBoom?: boolean;` declaration is missing — has the field been removed?").toBe(1);
    expect(authoring.length, "the `q: {...deathBoom: true...}` authoring line is missing — has it moved or been deleted?").toBe(1);
    expect(
      hits.length,
      `deathBoom is now referenced somewhere new — KNOWN-16 may have been fixed (wired up or deleted); see the hits and update this pin deliberately:\n${hits.join("\n")}`,
    ).toBe(declaration.length + authoring.length);
  });

  it("Death.ts's Afrit explosion is still hardcoded on the key, not gated by deathBoom", () => {
    // The behavior deathBoom names is not missing — it just isn't
    // data-driven. If this ever starts reading e.deathBoom (directly or via
    // EDEF[e.key].deathBoom), the previous test already catches the new
    // reference; this one additionally documents *what* changed.
    const deathSrc = readFileSync(join(SRC, "enemies", "Death.ts"), "utf8");
    expect(
      /e\.key\s*===\s*"q"/.test(deathSrc),
      'Death.ts no longer hardcodes e.key==="q" for the Afrit explosion — deathBoom may now be wired up; update this pin',
    ).toBe(true);
  });
});
