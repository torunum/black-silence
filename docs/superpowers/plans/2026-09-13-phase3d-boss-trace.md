# Phase 3 Part D — record the boss fight before it is rewritten

One task. It adds the project's third characterization trace, against a priest
boss, and it is worth doing **now** rather than later for one reason: Phase 3
replaces the shared `priestThink` with three distinct boss brains, and
`priestThink` is currently the least-observed code in the game.

## Why now

This is the same argument that produced `combatTrace.test.ts`, and it was right
then. `trace.test.ts` plays the prologue, which has zero enemies, so the entire
combat path was unexercised — Plan 0E Task 1 recorded level 1 *before* 0E moved
combat code, and that fixture then caught real defects during the move.

The position today is the same one step further in:

- `docs/superpowers/specs/2026-09-12-phase3-roster.md` flags it in its own risks
  section — the three brains replace `priestThink`, and a boss rewrite would
  happen in code with no trace coverage.
- Phase 3 Part B widened `digestScene` to record sprite frames and then listed,
  honestly, the four `material.map` assignment sites the traces still cannot
  reach. **Two of the four are inside `priestThink`** — the phase-3 form swap
  and the boss walk cycle. They are unreachable because level 1's only boss
  (`U`) has no `priest` flag and the prologue has no enemies.
- `direction.md` says the current six bosses "share `priestThink()` with
  different HP values and sprites", which is the bullet-sponge the project is
  cutting. Whatever replaces it, a recording of what it did first is the only
  way to say what changed.

**A characterization recording's entire value is being made before the change.**
Recorded after Phase 3, it records the new thing and proves nothing.

## What this does NOT do

It does not change `priestThink`, the boss defs, or any gameplay. It records.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **The two existing trace fixtures must stay byte-identical.** This task adds a
  third; it must not touch `trace-level0.json` or `trace-level1.json`. If one
  moves, stop and find out why — nothing here changes runtime behavior.
- **No `src/` change.** If you believe one is needed, stop and report rather
  than making it; a trace that required altering the code it records would not
  be recording that code.
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/`, and read the
  "Processed N files" line (~90). **The bare form scans zero files and still
  reports success** (KNOWN-12).
- `npm test` before committing — it runs `tsc --noEmit` first. Final run cold:
  `npx vitest run --no-cache`.
- Node is not on PATH: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game cannot be rendered in this environment** — `requestAnimationFrame`
  never fires in the browser pane. Every claim must be structural.

---

## Task 1 — a priest-boss characterization trace

`tests/integration/bossTrace.test.ts`, with its fixture beside the other two.

**`tests/integration/combatTrace.test.ts` is the model. Read it first, in full,
including its header** — it documents why its script is shaped the way it is,
what its four observables are, and one thing `runTrace` cannot see. Your file
owes the same account of itself.

### Step 1: reach a priest boss

Six defs carry `priest: true` — `Q Z N H V G`. Level 2 places `Q`, the Corrupted
Priest, at the altar; the player arrives in the narthex.

`runTrace` takes a `level` option, and `save.maxLevel` is a plain mutable
exported property a test assigns synchronously — that is exactly how
`combatTrace` reaches level 1, and `src/save/SaveGame.ts`'s own comment records
that this is deliberate and load-bearing.

Two obstacles the script alone cannot beat, both measured:

1. **The nave is behind `locked` links** needing the red key, so a walking
   script would have to solve the level.
2. **Bosses spawn `dormant: true`** and wake on proximity or sight.

`combatTrace` already establishes and documents the technique for this:
seeding state directly in `beforeAll`, before `runTrace` boots, to reach a
branch the harness's own script cannot otherwise produce. Player position is
mutable state of the same kind. **Use it, and document it in the file header
the way `combatTrace` documents its own seeding** — including what you seeded,
why the script could not get there, and what that means the trace does and does
not prove. A seeded start is honest; a seeded start presented as a played
approach is not.

**Do not modify the level to make this easier.** Level grids are Phase 4's, and
a trace of a level nobody ships is worth nothing.

### Step 2: the observables

State, up front, which fields prove a priest boss actually fought — the way
`combatTrace`'s header names its four. At minimum the trace must show the boss
**awake and acting**, not merely present: `dormant` false, and behavior that
only `priestThink` produces.

`priestThink` has teleport, summon, ring and debris timers plus phase gates.
**Derive the real phase thresholds and timer names from `Boss.ts` yourself** —
do not take them from this plan, which does not state them for that reason.

A boss that never wakes, or wakes and is never hit, is the failure this task
exists to avoid, and it is the failure `combatTrace`'s header describes hitting
first: a straight-ahead script never lands a shot. **Assert the fight happened
in a way that a degraded script cannot satisfy.**

### Step 3: the two blind sites

The point of the task. Phase 3 Part B's honest-gaps list names four
`material.map` sites the traces cannot reach; two are in `priestThink`.

**Prove your trace reaches them, by mutation**: change what each assigns, and
confirm your new fixture's digest moves and a named test fails. If a site is
still unreached, say which and why — an honest list beats a claim.

Then **check the other two** (the two-stage death collapse in
`ai/Behaviors.ts`, the headless-corpse sprite in `enemies/Death.ts`). A boss
fight may or may not reach them. Report either way, and update Phase 3 Part B's
list in `docs/STATUS.md` to match what is now true.

### Step 4: the fixture, and its rule

This is a third committed fixture. **Write its regeneration rule into the test
file's header**, in the same terms the other two carry: it is a recording made
before the boss rewrite, and `WRITE_TRACE=1` exists for deliberate, explained
updates, never to turn a red build green.

Say plainly in the header what a future reader must do when Phase 3 replaces
`priestThink`: this fixture is expected to move then, and that regeneration is
the one the whole task exists to make meaningful.

### Step 5: determinism

Both existing fixtures are stable across runs, which took work — a seeded PRNG,
and `installUuidStub` keeping `generateUUID`'s four `Math.random()` draws out of
that stream (it fails loudly if it intercepts none). A boss summons minions and
fires projectiles, so this trace draws more than either existing one.

**Run the trace at least three times and confirm identical output** before
committing the fixture. A flaky fixture is worse than none: it trains people to
regenerate.

### Prove it

- each of the two `priestThink` sprite sites, mutated → a named test red
- one `priestThink` timer or phase threshold changed → a named test red
- the boss left `dormant` → a named test red

Revert each with a targeted edit.

### Docs

`docs/STATUS.md`: add this trace beside the other two in "How fidelity is
guarded", and correct Phase 3 Part B's honest-gaps list. `docs/known-issues.md`
only if something you find warrants a row.

### Commit

`git commit -m "test: record the priest boss fight before three brains replace it"`

---

## Definition of done

- A third trace, against a level with a priest boss, with the boss provably
  awake and fighting.
- Both `priestThink` sprite sites proven reached by mutation, or an honest list
  of what is still unreachable and why.
- Identical output across three runs.
- Both existing fixtures byte-identical; no `src/` change.
- `npm test` clean; madge over ~90 files.
