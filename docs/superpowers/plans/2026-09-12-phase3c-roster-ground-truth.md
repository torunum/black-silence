# Phase 3 Part C — the roster's ground truth

Two tasks. Neither touches gameplay. Both exist so that Phase 3's roster cut and
Phase 4's level rebuild are planned against measured numbers instead of the
project's recollection of them.

## Why now

Phase 3 cuts the enemy roster from 25 types to 9 plus 3 bosses
(`docs/direction.md`, approved). That reads like "delete sixteen defs". It is
not. Measured against the real placement calls:

```
KEEP   level1    9 letters   z:4 m:2 g:2 f:2 U:1 j:1 A:1 t:1 s:1
KEEP   level2   12 letters   V:8 z:4 A:2 f:2 g:2 m:2 t:2 w:2 Q:1 C:1 U:1 s:1
KEEP   level3   13 letters   y:3 k:3 A:3 m:2 R:2 f:2 g:2 w:2 Z:1 s:1 U:1 z:1 E:1
KEEP   level4   10 letters   z:4 m:4 f:3 A:3 g:2 s:2 w:2 N:1 U:1 E:1
cut    level5   10 letters   cut to episode2
cut    level6    9 letters   cut to episode2
cut    level7   14 letters   cut to episode2

Used by the five KEPT levels:  19 of 25
Used ONLY by the cut levels:    G H L n
Placed in NO level at all:      B q
```

**Nineteen of twenty-five letters are placed in levels the project is keeping**,
across the four that have enemies at all (level 0, the prologue, has none). So
the roster cut rewrites enemy placement in every kept level with enemies, which
means Phase 3 and Phase 4 are one piece of work with two names, or Phase 3 ships
levels that reference types that no longer exist. **That is the decision this
measurement exists to inform, and this plan does not make it.**

### How this number was arrived at, because it was wrong first

A first scan read quoted grid rows and reported 2 enemy letters in level 2.
Levels 2-7 build from `emptyGrid(4,4,7,5)` and place glyphs through
`put`/`putAbs`/`put1` calls, so their rows never exist as string literals. The
corrected scan checks itself against a fact recorded independently — KNOWN-4
documents **eight** `V` tiles in level 2 — and refuses to be trusted until it
reproduces it.

That is the fifth scanner miscount recorded on this project and the third that
was mine. Task 1's test exists so the number stops living in a scratch script.

## KNOWN-18 — two enemies the player can never meet

`B` and `q` are declared in `ENEMY_DEFS`, placed in no level, and not summoned:
the only runtime `spawnEnemy` calls outside the level loader summon `z` or `f`
by name (`Boss.ts` ×2, `Player.ts` ×1). So both types are unreachable.

- **`B`** — 230 hp, `slam: true`. A slam attacker nothing places.
- **`q`** — 70 hp, `fly`, `flyH: 1.8`, `range: 14`, `orb: "afrit"`,
  `burst: true`, `deathBoom: true`.

`q` makes two existing rows sharper, and neither says this today:

- **KNOWN-15** lists `burst` among ten fields authored in `ENEMY_DEFS` and never
  copied by `spawnEnemy`. `q` is `burst`'s **only** author. So `burst` is dead
  twice over — fixing KNOWN-15 would still leave it doing nothing, because the
  enemy carrying it never spawns.
- **KNOWN-16** records `deathBoom` as authored on `q` and read nowhere. Same
  doubling: even wiring a reader would change nothing.

**Do not fix either.** `B` and `q` are types the roster cut may delete outright,
and deciding that is Phase 3's job with a human who has played the game. This
plan records and pins.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **Neither trace fixture may be regenerated.** Nothing in this plan changes
  runtime behavior; if a fixture moves, stop and find out why.
- **No `src/` change at all** beyond comments, unless a task says otherwise.
  Task 1 is a test and docs; Task 2 is a document.
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/`, and read the
  "Processed N files" line (~90). **The bare form scans zero files and still
  reports success** (KNOWN-12).
- `npm test` before every commit — it runs `tsc --noEmit` first. Cold cache on
  each task's final run: `npx vitest run --no-cache`.
- Node is not on PATH: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game cannot be rendered in this environment** — `requestAnimationFrame`
  never fires in the browser pane. Every claim must be structural.

---

## Task 1 — pin what is reachable

`tests/world/rosterReach.test.ts`. `tests/world/levels.test.ts` is the model for
building every level; read it first — it already asserts reachability,
completability, key/door logic and KNOWN-4's ambiguous tiles, and this file must
not duplicate any of that.

### The two assertions

**1. Every `ENEMY_DEFS` letter is reachable, or is listed as not.** Derive the
placed set by building every level through the real level modules — **not by
scanning source text**, for the reason above. Derive the summoned set from the
`spawnEnemy` call sites outside the loader. Any letter in neither must appear in
an explicit `UNREACHABLE` set in the test, with a one-line reason.

This fails when someone adds a def and places it nowhere, and when someone
places a previously-unreachable one without removing it from the set. Both are
the right failures.

**2. Every glyph a level places is claimed by some table** — enemy, prop, item,
or structural. A glyph claimed by nothing is silently nothing at runtime, which
is KNOWN-4 and KNOWN-11's bug class approached from the other side: those two
are glyphs claimed by *two* tables, this is glyphs claimed by *none*.

If assertion 2 finds nothing today, say so plainly in the report — a guard that
currently has nothing to catch is still worth having when Phase 4 hand-authors
new grids, but it must not be described as having found something.

### Do not pin per-level placement counts

The temptation is a table of "level 2 places V:8, z:4, …". **Do not.** Phase 4
rebuilds levels 2, 3 and 4 by hand, so such a test pins content already
scheduled for replacement and would have to be regenerated wholesale — exactly
the kind of fixture churn this project guards against. Pin the invariants that
survive a rebuild, which is what the two assertions above are.

### Prove it

Mutations, each turning a **named** test red:

- add a def letter to `ENEMY_DEFS` and place it nowhere → assertion 1
- place `B` in a level → assertion 1 (it is in `UNREACHABLE`)
- put a glyph no table claims into a level grid → assertion 2

Revert each with a targeted edit.

### Docs

`docs/known-issues.md`: add **KNOWN-18** with the content above — `B` and `q`
unreachable, and the doubling it creates for `burst` (KNOWN-15) and `deathBoom`
(KNOWN-16). Owner: Phase 3, the roster cut. Add a sentence to KNOWN-15's and
KNOWN-16's rows pointing at it, since a reader of either needs to know.

### Commit

`git commit -m "test: pin which enemy types a player can actually meet"`

---

## Task 2 — the Phase 3 spec

Every prior phase has a spec under `docs/superpowers/specs/`; Phase 3 has none,
and its creative decisions have been settled in `docs/direction.md` since
2026-08-05. Write `docs/superpowers/specs/2026-09-12-phase3-roster.md`.

**This is a document. It implements nothing and must not touch `src/`.**

Read `docs/direction.md` first — its roster table (nine enemies, each with a
"forced behavior" column, plus elites and three bosses with distinct brains) is
the approved input and **must not be redesigned here**. The spec's job is to
turn it into something implementable.

It should cover, at minimum:

1. **The nine, mapped to what exists.** For each of direction.md's nine, which
   current `ENEMY_DEFS` letter it replaces or derives from, and what changes.
   Several current types collapse into one — direction.md says five flying
   enemies all behave the same and only The Suspended survives as a flier.

2. **Which KNOWN-15 fields each new enemy needs.** This is the spec's most
   useful section. Ten fields are authored and never copied by `spawnEnemy`;
   the new roster's behaviors decide which must start working. The Suspended is
   "the only flier", so `fly`/`flyH`; an area-denial enemy plausibly needs
   `orb`. **Each field turned on is a deliberate act with a balance
   consequence, and the spec should say so per field**, not as a blanket
   "fix KNOWN-15".

3. **The level coupling**, with the measured table above, and the choice it
   forces: roster and levels as one phase, or a defined intermediate state.
   State the options and what each costs. **Do not decide it** — it needs the
   project owner, who has not yet played the game.

4. **What cannot be verified in this environment.** Sprites, silhouettes,
   readability at distance, and every balance number. `docs/STATUS.md`'s
   environment note is the authority on why. Say plainly which parts of Phase 3
   need a human at the game before they can be called done.

5. **Non-goals**, in the shape Phase 0's spec uses.

The three bosses each need their own brain, replacing the shared `priestThink`.
Note which of the six current `priest: true` defs each maps to, and that
`priestThink` currently holds two of the `material.map` sites the traces still
cannot reach (Phase 3 Part B's honest-gaps list), so a boss rewrite is
happening in code with no trace coverage — the spec should flag that as a risk
and say what would close it.

### Commit

`git commit -m "spec: Phase 3 — the roster cut"`

---

## Definition of done

- A test that fails when an enemy type becomes unreachable, or when a glyph
  nothing claims appears in a grid.
- KNOWN-18 recorded; KNOWN-15 and KNOWN-16 cross-referenced.
- A Phase 3 spec that a fresh session could plan from, with the level-coupling
  decision stated and explicitly left to the project owner.
- `npm test` clean; both fixtures byte-identical; no `src/` behavior change.
