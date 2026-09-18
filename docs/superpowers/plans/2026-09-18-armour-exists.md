# Armour exists

One task. It closes KNOWN-11, the sibling of the bug the player walked into
last round.

## Why this one, now

The player reported that level 2's first boss was much too hard. That was
KNOWN-4: eight tiles the level author wrote as pews spawning 2600 hp bosses,
because `loadLevel` checks the enemy table before the prop table and `V` is in
both. Fixed last round.

**KNOWN-11 is the same bug against the item table, and it is still armed.**

`A` is a Mancubus in `ENEMY_DEFS` (260 hp) and the armour key in `map2`. The
enemy arm wins, so `map2`'s `A:"armor"` entry is unreachable dead code and
every `A` tile spawns a 260 hp enemy instead of `+50 ARMOR`.

Twenty tiles across seven levels — nine in the five the project is keeping.

**The player has therefore never picked up armour, in any level, ever.** The
pickup code works (`src/player/Interact.ts` does `S.armor = min(100, S.armor+50)`
and shows `+50 ARMOR`); the HUD has a slot for it; the number has read `0` for
the entire game because nothing can reach it. `S.armor` is provably always zero
in real play, which is why Plan 0E's combat trace had to seed it by hand to test
the armour-absorption branch at all.

### The level authors said what they meant

Level 1's line is unambiguous:

```
put1(g,40,25,"A"); put1(g,41,26,"c"); put1(g,39,26,"2");  // armor, cross, shotgun
```

Armour, a cross pickup and a shotgun — a reward cache behind a secret door.
The player finds a 260 hp Mancubus in it instead.

Every other `A` keeps the same company: the sacristy with ammo, the SECRET
reliquary with crosses, the reliquary stair with ammo, the SECRET charnel
reliquary with crosses and health, the SECRET mausoleum reliquary with health.
Item caches, most of them behind secrets.

### Removing the Mancubus entirely is the right outcome, not a side effect

`A` is the **only** Mancubus glyph, so fixing this takes the Mancubus out of
the game. That is fine and worth stating plainly:

- No level author ever asked for one. All twenty are in item company.
- `docs/direction.md` cuts the roster from 25 to 9 and names `Mancubus`
  specifically among the types borrowed from other games — it was already on
  the list to go.
- Its two signature behaviours are dead anyway: `twin` and `orb` are both
  KNOWN-15 fields that `spawnEnemy` never copies, so these accidental Mancubus
  do not fire twin barrels or a projectile. They are 260 hp melee sponges.

## Global Constraints

- `reference/sonsurum.html` is **never edited**. It has this same bug.
- **This will move `trace-level1.json` and `trace-level2-boss.json`** — level 1
  has one `A`, level 2 has two. That is correct: a deliberate content change the
  fixtures *cannot* see would be the worrying outcome. Follow each fixture's own
  regeneration procedure — analyse which frames diverge and why, write it into
  the test file's header, regenerate in the same commit. **`trace-level0.json`
  must not move**; the prologue has no `A`.
- Tests that encode the old behaviour are **rewritten, never deleted**.
  `tests/integration/combatTrace.test.ts` seeds `S.armor` by hand *because* of
  this bug and says so — that comment becomes wrong, and the seeding may no
  longer be needed.
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/`, read the "Processed N files"
  line (~91). The bare form scans zero files and still reports success.
- `npm test` before committing; it runs `tsc --noEmit` first.
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game renders in the Browser pane** — read `docs/STATUS.md`'s
  Environment gotchas first, including the stale-module warning that has bitten
  four sessions. Screenshots force a frame; sustained rAF does not.

---

## Task 1 — armour exists

### The fix

Last round's pews took a distinct prop-only glyph rather than reordering
`loadLevel`'s dispatch, because `C` is an intentional Cacodemon in levels 6 and
7 and a chair in level 2 — a global reorder trades one bug for another. **Use
the same shape here**, and say in your report why the glyph you picked cannot
collide: check `ENEMY_DEFS`, the prop string, `map2`'s keys and the structural
skip string before committing to it.

Note the trap last round recorded: `c` was already taken by the crosses pickup,
so the lowercase trick is not always available. Verify, do not assume.

### The decision you must make and state

All twenty tiles, or only the nine in the five kept levels? Levels 5-7 are cut
to `episode2` per `docs/direction.md` but still build and are still tested.
Decide, and say why — a fix that leaves eleven armed in parked content is
defensible, and so is fixing all twenty. **Say which and why, rather than
letting it happen.**

### What this changes about the game

Nine armour pickups appear in the kept levels and nine 260 hp enemies leave.
`S.armor` stops being structurally zero. Both directions matter: the player
gets a defensive resource the game was designed around, and the levels lose
enemies nobody placed.

`damagePlayer`'s armour-absorption branch has been unreachable in real play.
**Check what it actually does** before declaring the change safe — a branch that
has never run in a real game is exactly where a second bug hides.

### Prove it

Mutations, each turning a **named** test red:

- revert one tile to `A` → the KNOWN-11 pin
- make the new glyph fall through to no table → `rosterReach.test.ts`'s
  every-placed-glyph-is-claimed assertion
- break the armour pickup's `+50` → whatever pins the pickup

And the one that matters most: **assert `S.armor` can now become non-zero
through real play**, not by being seeded. `tests/integration/combatTrace.test.ts`
seeds it today precisely because it could not.

### Docs

`docs/known-issues.md`: KNOWN-11 closed, with what changed and what remains —
**the mechanism is not fixed**, the tables still overlap, and `C` is still
ambiguous in level 2. KNOWN-4's row already says this; keep the two consistent.

`docs/STATUS.md`'s "bugs a player will actually hit" list loses an entry.
Re-derive its count rather than decrementing it.

### Look at it

Load level 1, go to the secret room behind the door at the carve near (40,25),
and confirm there is armour on the floor and no Mancubus. Screenshot it.

### Commit

`git commit -m "fix: armour pickups exist — twenty tiles the authors wrote as items"`

---

## Definition of done

- Every `A` the level authors wrote as armour is armour.
- The Mancubus's departure stated as a decision, not discovered later.
- `S.armor` provably reachable through play, asserted without seeding.
- Two fixtures regenerated with written analysis; the prologue's untouched.
- KNOWN-11 closed, KNOWN-4 kept consistent, STATUS's count re-derived.
- A screenshot of armour on the floor of level 1's secret room.
- `npm test` clean; madge over ~91 files.
