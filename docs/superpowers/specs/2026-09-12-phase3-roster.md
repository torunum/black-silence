# Phase 3 — The Roster Cut

**Status:** spec. Written 2026-09-12, after Phase 3 Parts A, B and C.

## 1. Purpose

`docs/direction.md` settled the roster on 2026-08-05: **nine enemies, plus elite
variants, plus three bosses with distinct brains**, cut down from the twenty-five
`ENEMY_DEFS` letters the reference ships. Each of the nine is defined by one
column — *what does this force the player to do differently?* — and the rule
attached to it is that two enemies with the same answer means one of them dies.

That document is the approved input. **This spec does not redesign it.** Its job
is to turn nine rows of a table into something a plan can be written from: which
existing letters each of the nine replaces, which of the ten dead `ENEMY_DEFS`
fields each one's stated behavior requires, what the cut does to the levels that
place those letters, and which parts of the phase cannot be finished in this
environment at all.

Where this spec thinks a direction decision is under-specified or expensive, it
says so in §11 and leaves the decision where it belongs. It changes nothing.

### Non-goals

Explicitly out of scope for Phase 3. These are the ways a roster phase turns
into a rewrite:

- **No level layout work.** Carving, room shapes, `hmap` tiering and the five
  hand-built maps are Phase 4's. Whether and how Phase 3 touches level grids
  at all is exactly what §8 leaves to the project owner — see its four
  options, none of which this spec favours.
- **No boss implementation.** Phase 3 *specifies* the three brains and deletes
  the roster they sat in; `docs/direction.md`'s roadmap gives the brains
  themselves to Phase 5. §6 exists so Phase 5 inherits a shape, not a surprise.
- **No balance tuning that claims to be finished.** Every number this phase
  touches — hp, damage, cooldowns, hover height, spawn counts — is provisional
  until a human plays it. See §2.
- **No new weapon work.** Weapon personalities are the other half of
  `direction.md`'s Phase 3 row and are a separate spec.
- **No flow-field pathfinding.** `direction.md`'s Phase 3 row also names this;
  it is a separate spec too, per `direction.md`'s own rule that each phase
  gets its own spec → plan → implementation cycle. See §12 for the risk of it
  bleeding into this one.
- **No fix for KNOWN-4 or KNOWN-11.** Both are glyph collisions between the
  enemy table and another table, and both are owned by Phase 4. The roster cut
  *changes which letters collide* — see §8 — but does not resolve them.
- **No "fix KNOWN-15" as a single commit.** That row says so itself and §7 is
  the reason: ten fields is ten balance changes.

---

## 2. The constraint that shapes this phase

**The game cannot be rendered in the development environment.** `docs/STATUS.md`
is the authority and its measurement is unambiguous: `requestAnimationFrame`
fires zero times in the browser pane while a `setTimeout` loop fires normally,
so `src/core/Loop.ts` never runs and nothing is ever drawn. The test suite is
unaffected, because the trace harness installs and drains its own rAF queue. But
**no automated check in this repository samples a pixel**, and none ever has.

Phase 2 split itself along exactly this line and the split was the best decision
in that phase. Phase 3 inherits the same fault, and it runs deeper here, because
a roster is mostly art and feel:

**Verifiable here** — which types exist, which letters a level places, which def
fields reach a spawned enemy, which code paths a trace reaches, whether a type
is reachable at all, whether a glyph is claimed by two tables or none.

**Not verifiable here, at all** — and this list is the honest one:

| Not verifiable | Why |
|---|---|
| Every sprite, in every facing | Nothing samples a pixel; the sprite baker is compared as a *call log* |
| Silhouette distinctness | Nine enemies must be told apart by shape; that is a judgement made by eye |
| Readability at distance and in fog | Each level sets its own `fog`/`fogD`/`amb`; legibility is the interaction of art with lighting |
| Whether The Suspended reads as "look up" | The entire point of the only flier is a spatial reading of the screen |
| Every balance number | hp, melee damage, hover height, orb damage and speed, cooldowns, elite frequency, per-level spawn counts |
| Whether nine types feel like enough | The cut's whole premise is that variety came from *behavior*, not count |

**A green suite is not evidence for anything in that table.** Claiming it is
remains the most damaging output a task in this phase can produce, because it is
indistinguishable from success until someone finally looks.

So Phase 3 divides the same way Phase 2 did. The structural half — deleting
types, consolidating fliers, re-pointing the def table, turning named KNOWN-15
fields on one at a time, and keeping the guards honest — can ship on evidence
this environment can produce. The art half and every number cannot be called
done without a human at the game, and the plan should say so per task rather
than once at the top.

---

## 3. Success criteria

Splitting exactly along §2's line: what a plan can prove with a test, and what
it can only claim with a human's eyes.

**Structural — verifiable here**

- Every one of `direction.md`'s nine enemies exists as a def, mapped from the
  letter(s) named in §5, with the flier consolidation (§5, The Suspended) and
  the Penitent merge (§5, §7) both landed.
- The three named bosses (`U`, `Q`, `Z`) carry the mapped stat blocks of §6,
  and the boss-brain characterization fixture of §6.1 exists and reddens on a
  mutation of both `priestThink` `material.map` sites, *before* either boss
  brain is rewritten.
- Exactly the four §7 fields (`fly`, `flyH`, `orb`, `shield`) reach a spawned
  enemy, each landed as its own commit; `tests/enemies/deadDefFields.test.ts`
  is rewritten, not deleted, to keep proving the other six stay dead or gone
  with their defs.
- `tests/world/rosterReach.test.ts` is extended per §10 to fail when a level
  places a letter the def table no longer has, and its `UNREACHABLE` set is
  empty once `B` and `q` are gone.
- The level-coupling choice (§8) is a recorded decision attributed to the
  project owner, not a default silently taken by whichever task hits it first.
- `npm test`, `tsc --noEmit`, and `madge --circular --extensions ts,js src/`
  all stay green; no `src/` file over 400 lines; neither trace fixture moves
  unless a task regenerates and analyses it in the same commit.

**Everything else — needs a human at the game**

Each row of §2's second table gets its own criterion: a human compared it
against the intended behavior and said it is right. Sprites in every facing,
silhouette distinctness across the nine, readability at distance and in fog,
whether The Suspended reads as "look up", every balance number the four §7
fields and the elite tint touch, and whether nine types feel like enough —
none of these is done on a green suite. Nothing else counts.

---

## 4. Ground truth: what the roster actually is

Everything in this section was re-derived for this spec by **building every
level module and counting the real placement calls** — never by scanning grid
rows as source text, which undercounts badly: levels 2-7 build their grids from
`emptyGrid` plus `put`/`putAbs`/`put1`, so most placements never exist as a
string literal at all. `tests/world/rosterReach.test.ts` is the honest mechanism
and the same one used here.

### 4.1 Enemy letters placed, per level

Level 0, the prologue, places **no enemies at all**, which is why
`tests/integration/trace.test.ts` cannot see a single line of combat code.

```
KEEP   level1    9 letters  15 tiles   z:4 m:2 g:2 f:2 U:1 j:1 A:1 t:1 s:1
KEEP   level2   12 letters  28 tiles   V:8 z:4 A:2 f:2 g:2 m:2 t:2 w:2 Q:1 C:1 U:1 s:1
KEEP   level3   13 letters  24 tiles   y:3 k:3 A:3 m:2 R:2 f:2 g:2 w:2 Z:1 s:1 U:1 z:1 E:1
KEEP   level4   10 letters  23 tiles   z:4 m:4 f:3 A:3 g:2 s:2 w:2 N:1 U:1 E:1
cut    level5   10 letters  25 tiles   (parked to episode2)
cut    level6    9 letters  24 tiles
cut    level7   14 letters  30 tiles

Used by the five KEPT levels:  19 of 25   A C E N Q R U V Z f g j k m s t w y z
Used ONLY by the cut levels:    G H L n
Placed in NO level at all:      B q        (KNOWN-18)
```

The `V:8` in level 2 is KNOWN-4's independently-recorded ground truth — eight
tiles written under a "nave pews" comment that spawn eight 2600 hp bosses — and
it reproducing exactly here is the check that this measurement is looking at
real placements rather than text.

### 4.2 The shape of the cut, stated honestly

**The roster cut is not "delete sixteen defs".** Nineteen of the twenty-five
letters are placed in levels the project is keeping. Six letters are removed for
free: `G H L n` exist only in the three cut levels, and `B q` are placed
nowhere. Everything else is placed in a level that has to keep working.

Two more counts, derived the same way, that a plan will need:

- Across the four kept levels with enemies there are **90 enemy tiles**, of
  which **17 are boss-flagged letters** (`U`×4, `V`×8, `E`×2, `Q`, `Z`, `N`) and
  73 are ordinary enemies.
- The five flying letters account for **6 tiles** in kept levels (`y`:3, `R`:2,
  `C`:1), five of them in level 3. `L` and `q` are placed in no kept level.

### 4.3 Other counts this spec depends on, re-derived

| Claim | Measured |
|---|---|
| `ENEMY_DEFS` letters | **25** |
| Letters with `boss:true` | **8** — `E U Q Z N H V G` |
| Letters with `priest:true` — the shared `priestThink` roster | **6** — `Q Z N H V G` |
| Letters with `sovereign:true` | **5** — `Z N H V G` |
| Letters with `range` (so, fire *something*) | **9** — `t C A j U k q R y` |
| Letters naming an `orb` | **7** — `C A j k q R y` |
| Letters with `fly`/`flyH` | **5** — `C L q R y` |
| `PXDEF` sprite definitions | **31** — the 25 letters plus six `key+"2"` phase forms (`Q2 Z2 N2 H2 V2 G2`), one per `priest:true` boss |
| Baked canvas textures at boot, enemy sprite baker only | **446** |
| `material.map=` assignment sites in `src/` | **9** — `ai/Behaviors.ts` ×4, `Boss.ts` ×2, `Damage.ts`, `Death.ts`, `player/Interact.ts` |

The 446 row is scoped to `buildSprites` alone and is worth two footnotes. First,
the game also bakes weapon-viewmodel and item textures at boot in separate
passes, so 446 is not the boot's total texture count — only the roster's share
of it, read alone this row could mislead. Second, `direction.md`'s sprite
amendment estimates "~14 textures each, about 434". Fourteen is the count for
an entry with a head region; nine entries have none, and ten carry the optional
attack and two death frames. The estimate was close and its argument is
unaffected — the real figure is slightly *higher* — and the comparison is fair
precisely because both numbers are scoped to the enemy roster the same way.

---

## 5. The nine, mapped to what exists

Each row names the letters that collapse into it. "Derives from" means the new
enemy inherits that letter's stat block and role as a starting point; it does
not mean a rename.

| direction.md | Forced behavior | Derives from | Also absorbs | What changes |
|---|---|---|---|---|
| **The Flock** | Crowd control — shotgun fodder | `z` (50 hp, the commonest letter: 13 of 73 non-boss tiles in kept levels) | — | Sprite and name; named by literal at two of the three `spawnEnemy` summon call sites (the priest's phase-2 flock summon and the challenge-plate event) — the priest's phase-3 summon is an unconditional `f`, not a `z`/`f` choice — see §8, neither letter is a single-system dependency |
| **The Fleet** | Target prioritization | `f` (35 hp, `dodge`, sp 5.2 — second only to `g`'s 6.0 among ground units) | — | Sprite and name — but also named by literal at all three `spawnEnemy` summon call sites, including the priest's phase-3 summon, where it is the unconditional fallback rather than a `z`/`f` choice (§8); a rename must repoint all three or the summon silently spawns nothing. No dead field is authored on it |
| **The Hound** | Aim down | `g` (30 hp, `lunge`, wide-and-short at 1.25×0.8) | — | Sprite and name only |
| **The Penitent** | Flank it or kick it | `m` (`plate:45`) | `k` (`shield`) | The two answers merge; see §7, this is the one merge that needs a dead field turned on |
| **The Censer** | Keep moving — area denial | `t` (`toxic`, `range:12`) | — | Already the only enemy that leaves a lingering zone. The censer swing is new art over an existing mechanic |
| **The Crawler** | Watch the ground | `w` (30 hp, the lowest def in the table, at 1.15×0.65 — shorter even than `g`) | — | Sprite and name only; today it has no flag at all, which is exactly right for "it is just *low*" |
| **The Chorister** | Kill it first — it wakes the others | `s` (`scream`, the wake-the-dead call) | — | Sprite and name only. Its mechanic already works |
| **The Bellringer** | Don't tank, evade | `n` (Ettin, 130 hp, `slam`) | `B` (230 hp, `slam`, unreachable — KNOWN-18) | Neither letter is placed in a kept level, so this is the one of the nine with **no existing placement to inherit** |
| **The Suspended** | Look up — **the only flier** | `C` (120 hp — the heaviest of the five, sp 2.3 — the slowest, `fly`, `flyH:1.7` — the median hover height of the five, `orb`, `range:15`) | `L`, `q`, `R`, `y` | Five defs become one. The largest single deletion in the phase and the only one that needs two dead fields on |

That accounts for fifteen of the twenty-five letters — every letter named in
the "Derives from" and "Also absorbs" columns above: `z f g m k t w s n B C L
q R y`. The rest:

- **`E`, `U`, `Q`, `Z`, `N`, `H`, `V`, `G`** — the eight bosses, resolved in §6.
- **`A`** (Mancubus, 260 hp, `twin`) and **`j`** (Cultist, 45 hp, `range`,
  `dodge`, `orb`) have **no successor among the nine**. `A` ties `f` for
  third-most-placed letter in the kept levels (9 tiles each, behind `z`'s 13
  and `m`'s 10) and `j` is placed once. See §11.1 — this is a real gap in the
  input, not a decision this spec makes.

(15 + 8 + 2 = 25.)

### 5.1 Elites

`direction.md` adds "elite variants of the above" and the existing implementation
is already almost free: `spawnEnemy` rolls an 11% elite chance for any non-boss,
non-summoned spawn, doubles hp, scales size and speed by 1.15, and **tints the
existing sprite gold** rather than baking a second texture. So elites cost zero
new sprite work under the current scheme, including at eight facings.

Whether a gold tint is enough to read as "elite" at distance in fog is exactly
the kind of question §2 says cannot be answered here.

---

## 6. The bosses — three brains replacing one

`direction.md` names three, each with its own brain, and the thing it is
replacing is real: **six defs carry `priest:true` and all six run the same
`priestThink`**, differing only in hp, sprite and the `sovereign` flag. That
count was re-derived for this spec: `Q Z N H V G`.

| direction.md boss | Maps to | Today |
|---|---|---|
| **THE CATHEDRAL GUARDIAN** — arena-interactive, phase mechanic tied to the pillars | `U` | 700 hp, `boss`, `stone`, `range:13`. **Not one of the six priests** — it runs the ordinary `enemyTick` brain with a three-bolt stone volley, and it has no phase mechanic and no `U2` sprite form |
| **THE CORRUPTED PRIEST** — teleport and summon, driven by a mechanic rather than HP gates | `Q` | 1800 hp, `priest`. The `priestThink` original: teleport, flock summon, rings, falling debris |
| **THE BONE SOVEREIGN** — finale; rebuilds itself from the corpses in the level | `Z` | 2400 hp, `priest`, `sovereign`. Runs the identical brain to `Q`, with more hp and a different sprite |

So of the six `priest:true` defs, **two survive as named bosses** (`Q`, `Z`) and
**four are deleted** (`N` Gravedigger, `H` Hollow Leviathan, `V` Factory Foreman,
`G` Living Heart) — and a third named boss, the Cathedral Guardian, is drawn
from `U`, which was never a priest at all and therefore has the *least* existing
machinery of the three. That leaves `E` (Mutant Executioner) — the eighth
`boss:true` letter, also not a priest, placed in two of the four kept levels and
with no successor among the named three; see §11.2.

The corpse-rebuild mechanic is not a new promise. `boss_Z2` — the phase-2
subtitle the game already ships — reads *"It's rebuilding itself. From the OTHER
skeletons. That's cheating."* The prose commits to a mechanic the code never
delivered, which is `direction.md`'s own observation and the reason `Z` is the
finale.

### 6.1 The risk: the boss brain has no trace coverage

Phase 3 Part B widened `digestScene` to hash each material's texture name, which
is what finally let the trace fixtures see sprite-frame selection. It also
produced an honest list of what the fixtures still cannot reach — recorded in
`docs/STATUS.md` — and **two of the four unreached `material.map` sites are
inside `priestThink`**: the phase-3 form swap to `PX[formKey]` and the boss's
own walk-frame cycle.

The gap is structural, not a matter of running longer. `priestThink` executes
only for an enemy with `priest:true`; the combat trace plays level 1, whose only
boss is `U`, which has `boss:true` and no `priest` flag. No script against level
1 can reach that code, ever.

**So a boss rewrite would happen in the least-covered code in the game.** Both
of the sites a rewrite would certainly touch are blind, and the `priestThink`
body is the single largest behavior block in `src/enemies/`.

**What would close it, before any brain is written:** a third characterization
fixture played against a level that actually places a `priest:true` boss —
level 2 places `Q`, level 3 places `Z` — driven far enough to cross both phase
gates (below 66% and below 33% of max hp). Two details make that harder than it
sounds and belong in the plan rather than being discovered mid-task:

1. **The script cannot shoot a 1800 hp boss down with a pistol** in a fixture of
   sane length. The fixture needs the boss's hp assigned directly, the same way
   `save.maxLevel` being a writable exported property is what made the combat
   trace possible at all.
2. **The fixture must be proven, not just recorded.** The bar this project has
   set twice: rewrite both `priestThink` map sites and watch named frames go
   red, with the footprint measured — how many frames differ, in which fields —
   rather than asserted.

Without that fixture, "the boss still works" has no evidence behind it except
someone playing it.

---

## 7. KNOWN-15 — which fields the new roster actually needs

This is the section the rest of the phase hangs on.

Ten `ENEMY_DEFS` fields are authored, are read at real sites, and **never reach
a spawned enemy**: `spawnEnemy` builds its object with an explicit literal and
omits them, and nothing writes them afterwards. Every read sees `undefined`, on
every enemy, always. It is faithful — the frozen reference does the same — and
it is pinned by `tests/enemies/deadDefFields.test.ts`.

KNOWN-15 says plainly: **do not fix this with a spread.** Ten fields is ten
balance changes in one commit, in a game this environment cannot render. The
roster decides which of them must start working, and each one that does is a
deliberate act with a consequence that has to be written down before it is
turned on.

| Field | Authored on | New roster's need | Balance consequence of turning it on |
|---|---|---|---|
| **`fly`** | `C L q R y` | **Required — The Suspended.** "The only flier" does not exist without it | Changes the sprite's y to the hover height and the orb's origin with it. Every hitscan weapon must still reach it at that height, and the player's pitch range becomes load-bearing for the first time |
| **`flyH`** | `C L q R y` | **Required — The Suspended.** `fly` without it falls back to a hardcoded 1.5 | Sets how far the player must look up. 1.4-1.9 across the five source defs; the value chosen *is* the forced behavior, and is unmeasurable here |
| **`orb`** | `C A j k q R y` | **On — The Suspended, and only it. Not strictly "required": the case is economy, not necessity** | The Suspended already fires — `range` is already copied — so this is one branch of `fireOrb` instead of seven, not a new capability. **The Censer does not need it**: `fireOrb`'s `tox` branch runs *before* the `orb`-name branches and fires whenever the caller passes `toxic` (`t`'s `toxic` field is already copied), so The Censer already gets its own colour (`0x6ad04a`) and damage (12) regardless of `orb`. Today every one of the seven `orb`-named, non-toxic enemies falls through to a default purple 15-damage, 9.5-speed bolt. Turning `orb` on for one enemy changes exactly one projectile's colour, damage and speed. **Turning it on for all seven at once is the balance change KNOWN-15 warns about** |
| **`shield`** | `k` | **Required — The Penitent**, if "flank it" is to be mechanically real | `damageEnemy` multiplies damage by **0.25** inside a 1.0-radian frontal cone, for non-explosive hits only. That is a hard four-fold difference between shooting it in the face and shooting it in the back — the strongest single answer-enforcer in the table, and the reason `m`'s `plate` alone is not enough: `plate` is a directionless damage pool, so a player who never flanks still wins by shooting longer |
| **`fling`** | `z t n G` | **Not required by any of the nine.** Recommend leaving it off and deleting it with the cut | `throwFlesh` is a 14-damage ranged attack that costs the thrower 3 hp. On The Flock (the commonest enemy, 13 tiles) it would turn mass melee fodder into ranged chip damage and destroy "shotgun fodder". On The Bellringer it would give the evade-me boss-adjacent brute a ranged option, weakening "don't tank, evade" into "trade at range". On The Censer it is redundant with the toxic bolt it already fires |
| **`charger`** | `L` | **Owner's call, default off** (§11.5). The Lost Soul's telegraphed dash | If The Suspended dives, the forced behavior becomes "dodge a dash" — close enough in spirit to `g`'s existing `lunge` (a telegraphed charge) to sit in tension with the roster's answer-uniqueness rule, even though `direction.md` states the Hound's own forced behavior as "Aim down", not "dodge a dash" verbatim. Turning `charger` on is a deliberate choice to make the flier's answer two things instead of one |
| **`twin`** | `A` | **Not required — `A` has no successor.** Delete with the def | `A`'s second barrel is a 220 ms-delayed second orb. It only means anything on a heavy artillery unit, and the nine have none (§11.1) |
| **`burst`** | `q` | **Not required, and cannot be "turned on" at all** | `burst` is **dead twice over** (KNOWN-18): its only author is `q`, and `q` is placed in no level grid and summoned nowhere by name, so the player can never meet it. Making `spawnEnemy` copy `burst` would still leave it inert, because nothing carrying it is ever spawned. If The Suspended wants a spread attack, that is *re-authoring* the field onto a new def, not fixing KNOWN-15 — and the plan must not let those two be confused |
| **`sovereign`** | `Z N H V G` | **Not required. Recommend deleting the flag** | Its only reads are inside `priestThink`'s phase-3 branch, choosing between two speed and two melee values. The three brains replace `priestThink`, so a boolean shared across five bosses has nothing left to select. The Bone Sovereign's phase-3 stats belong in the Bone Sovereign's brain |
| **`title`** | 12 defs (8 boss, 4 non-boss) | **Not required. The only one of the ten with no balance consequence** | Its sole read is `e.title \|\| EDEF[e.key].title`, and that fallback is why the boss bar shows anything today. Copying it would be a no-op. The four non-boss titles (`k q R y`) are dead data at a boss-only read site, and all four letters disappear in the cut |

**The count, stated so a plan can be sized:** of the ten, **four are turned on**
(`fly`, `flyH`, `orb`, `shield`), **five are deleted with their defs** (`fling`,
`twin`, `burst`, `sovereign`, and `charger` unless §11.5 says otherwise), and
**one is a no-op** (`title`). The four that turn on affect **two** of the nine
enemies. That is the version of "fix KNOWN-15" this roster actually asks for,
and it is much smaller than the row makes it sound.

Each of the four still needs a human at the game before it is called done, and
they should land as four commits, not one.

### 7.1 KNOWN-16's other half

`deathBoom` is authored on exactly one def — `q` — and read nowhere in `src/`.
The Afrit's death explosion does happen, because `Death.ts` hardcodes a check on
the key rather than consulting the flag. It is the same doubling as `burst`: `q`
is unreachable, so wiring `killEnemy` to the flag would change nothing.

The cut deletes `q`, which deletes the field, which closes KNOWN-16's open half
without a behavior change. That is the cheapest close available and it should be
taken deliberately rather than as a side effect — the hardcoded key check in
`Death.ts` goes with it.

---

## 8. The level coupling — the decision this spec does not make

**Nineteen of twenty-five letters are placed in levels the project is keeping,
across all four kept levels that have enemies.** So the roster cut invalidates
enemy placement in *every* kept level. There is no version of this where Phase 3
finishes and Phase 4 starts from an intact map.

Which means Phase 3 and Phase 4 are either one piece of work with two names, or
Phase 3 ships levels referencing types that no longer exist.

**This spec states the options and does not choose.** It changes the shape of the
rest of the roadmap, and it belongs to the project owner, who has not yet played
the game. A spec that quietly picks one is worse than a spec that says so.

### Option A — merge Phase 3 and Phase 4

Roster and levels as one phase: define the nine, then hand-carve the five levels
directly against them.

- **Costs:** the largest phase in the roadmap by a wide margin, with no
  intermediate state that plays. Two kinds of work — data-table surgery and
  level authoring — under one review loop. Nothing ships until both halves do.
- **Buys:** no throwaway work. Every placement is authored once, against the
  final roster, in its final level.

### Option B — a compatibility map

Phase 3 ships the nine, and keeps the deleted letters alive as aliases pointing
at their successor (`y`, `R`, `L`, `q` → The Suspended; `k` → The Penitent), so
the existing grids still load.

- **Costs:** a translation layer that exists only to be deleted, leaving the
  level tables naming types they no longer contain. Five fliers becoming one
  is a real change in how level 3 plays, and the alias does not surface it.
- **Buys:** the game is playable at every commit, and the two phases stay
  independently reviewable.

### Option C — placement substitution only

Phase 3 ships the nine and rewrites the *placements* in the four kept levels —
a letter-for-letter substitution — leaving layouts, rooms and `hmap` work
entirely to Phase 4.

- **Costs:** the substituted placements are provisional by construction. Level
  3's five flier tiles become five copies of the same enemy, one to a room
  across five separate rooms — still a composition nobody chose. Some of that
  work is redone in Phase 4.
- **Buys:** the game plays at every commit, the level tables stay honest, and
  the roster's balance consequences become visible to a human immediately.

### Option D — reverse the order

Phase 4 first, rebuilding the five levels against the *existing* roster, then
Phase 3 cuts.

- **Costs:** every level is hand-authored against twenty-five types and then
  re-populated against nine. This is the most throwaway work of the four.
- **Buys:** the level layouts — the part `direction.md` calls the signature work
  — get a human's attention first, on a codebase nothing else is moving.

### What the decision needs to weigh

- **KNOWN-4 and KNOWN-11 both move under the cut.** `V` is deleted, so level 2's
  eight "pew" tiles stop being eight bosses — either by becoming pews or by
  becoming nothing. `A` is deleted with no successor, so the nine `A` tiles in
  the kept levels — twenty across all eight — stop being Mancubus, and `map2`'s
  armour entry becomes live for the first time, meaning **armour pickups start
  existing in the game**. Neither is a
  Phase 3 goal; both happen anyway as a consequence of deleting a letter. The
  chosen option determines who owns that.
- **The Flock is named by code, not just by grids.** `priestThink` summons `"z"`
  and `"f"` by literal, and the challenge-plate event summons by literal too —
  three call sites, guarded by `tests/world/rosterReach.test.ts`. Whatever
  option is chosen, those three literals must be re-pointed in the same commit
  as the rename, or the summon silently spawns nothing.

---

## 9. Sprites — what the cut buys, and what it does not

`direction.md`'s 2026-08-29 amendment moved 8-directional sprites into this
phase for one reason: the roster is being cut, and drawing seven new angles for
thirty-one definitions means drawing most of them for enemies scheduled for
deletion.

Measured today: **31 `PXDEF` entries, 446 baked canvas textures at boot** (the
enemy sprite baker only — weapon and item textures are baked separately). After
the cut the def count is nine enemies plus three bosses, plus whatever phase
forms the three brains need (today there are six `key+"2"` forms, exactly one per
`priest:true` boss; two of those six bosses survive). Elites add none, because
they tint rather than re-bake.

So the definition count needing manual art falls from 31 to about 12 —
roughly two-fifths, not the one-third it might sound like — and the boot-time
texture count falls with it, in the same shape: **seven new angles for about
twelve definitions instead of thirty-one** — which is the amendment's whole
argument, and it holds.

What the cut does **not** buy: any way to check the result here. Silhouette
distinctness across nine enemies, readability at distance, and whether eight
facings actually read as turning rather than as flicker are all in §2's second
table. The sprite baker has a behavioral recorder, and a recorder proves the
same sequence of draw calls happened with the same arguments — it has never
proven that anything looks like anything.

---

## 10. Testing

The five existing mechanisms apply unchanged. Two rules this phase leans on
especially hard.

**A test that encodes the current roster is rewritten when the roster changes,
never deleted.** Four test files describe today's roster as fact and will go red
the moment a def is removed. Each one is a deliberate rewrite, and each rewrite
is the proof the cut landed:

| File | What it pins | What the cut does to it |
|---|---|---|
| `tests/enemies/deadDefFields.test.ts` | KNOWN-15's ten fields, every count derived at run time | Four fields stop being dead; the rest disappear with their defs. The file must keep proving the remaining ones are still dead |
| `tests/enemies/deathBoom.test.ts` | `deathBoom` authored once, read nowhere | The field goes; the file retires with it, and `Death.ts`'s hardcoded key check goes in the same commit |
| `tests/world/rosterReach.test.ts` | Every letter is placed, summoned, or recorded unreachable — and the three summon literals | The `UNREACHABLE` set empties as `B` and `q` are deleted; the summon-literal guard is what catches a rename that forgets the priest's flock |
| `tests/enemies/enemyShape.test.ts` | `Enemy`'s non-optional fields equal exactly what `spawnEnemy` builds | Every field turned on in §7 must be added to `Enemy` in the same commit or this goes red — which is the point |

**Every new assertion gets a recorded mutation that turns it red.** Four guards
in this project have at some point reported success while examining nothing, and
the tell was always a number nobody read. The roster phase adds one more shape
of that risk: a test that iterates `ENEMY_DEFS` becomes *cheaper to pass* as the
table shrinks. A loop over nine entries that would also pass over zero is
vacuous, and needs the same non-emptiness guard `deadDefFields.test.ts` already
carries.

Two additions this phase should make:

- **The boss fixture of §6.1**, before any brain is written.
- **A reachability assertion that survives the cut**: `rosterReach.test.ts`
  already fails when a type becomes unreachable or a glyph nothing claims
  appears in a grid. After the cut it should also fail when a level places a
  letter the def table no longer has — the failure mode Option C exists to
  prevent and Option B deliberately masks.

---

## 11. Notes back to `docs/direction.md`

These are observations, not changes. The roster table is approved and this spec
implements it as written. Each of these is something a plan will hit and should
be settled by the project owner first.

**11.1 The nine have no ranged ground enemy, and two placed letters have no
successor.** `A` (Mancubus, 260 hp, twin-barrel artillery) ties `f` for
third-most-placed letter in the kept levels at 9 tiles each (behind `z`'s 13
and `m`'s 10); `j` (Cultist, a dodging caster) is placed once. Neither maps to
any of the nine. The Censer answers *area denial* and The Suspended answers
*elevation*; nothing in the table answers *pressure from a distance on the
ground*. That may be deliberate — nine enemies with nine distinct answers is
the whole rule, and "ranged" is not by itself an answer. But deleting `A`
removes 9 of 73 non-boss tiles from the kept levels and takes the game's only
heavy with it, and that is worth an explicit yes rather than a silent one.

**11.2 The kept levels place six distinct boss letters; the direction names
three, and three of those six are among them.** Measured: `U` appears in all
four kept levels, `E` in two, and `Q`, `Z`, `N`, `V` in one each. Of the six,
`U`, `Q` and `Z` map to the three named bosses (§6) and `E`, `N` and `V` do
not. The Cathedral Guardian (`U`) is currently a *repeated miniboss*, not a
signature encounter — which sits oddly with "arena-interactive, phase
mechanic tied to the pillars", a thing you would not build four of. `E`
(Mutant Executioner) has no successor among the named three despite being
placed in two kept levels, and `direction.md`'s own level table cites
"Executioner always at (3,2)" as evidence of the copy-paste it is cutting.
Where the Executioner goes, and whether the Guardian appears once or four
times, are level-composition decisions the roster spec cannot make.

**11.3 The Cathedral Guardian has the least existing machinery of the three
bosses, not the most.** It is the only one of the three that is not a
`priest:true` def: no phase transitions, no teleport, no summon, no `U2` sprite
form. Of the three brains, it is the one closest to being written from scratch,
and a plan that sequences it first because "it is the earliest boss" would be
sequencing the hardest one first.

**11.4 The Bellringer is the only one of the nine with nothing to inherit.**
Both of its source letters are absent from the kept levels: `n` exists only in
the cut levels, and `B` is placed nowhere at all (KNOWN-18). Every other one of
the nine can be validated by loading a level that already places its ancestor.
The Bellringer's first appearance is also its first test.

**11.5 `charger` is an owner decision too, and belongs here with the rest.**
§7 leaves it off by default: turning it on gives The Suspended a telegraphed
dive that reads as "dodge a dash", which sits close enough to `g`'s existing
`lunge` — also a telegraphed charge — to be in tension with the roster's own
rule that two enemies sharing an answer means one dies. (`direction.md` states
the Hound's forced behavior as "Aim down", not "dodge a dash"; the tension is
with `lunge`'s mechanic, not with that literal phrase.) This is recorded here,
alongside the other decisions this section collects, so it is not the one
owner decision missing from where owner decisions are collected.

---

## 12. Risks

**Claiming a green suite as evidence for the art or the numbers (highest).**
Same risk as Phase 2 Part B, larger surface. Mitigation: §2's second table is the
list; a task that touches a row in it states its evidence as "a human compared
it" or it does not ship.

**Turning on more than one KNOWN-15 field per commit.** The row's own warning.
Four fields land in this phase; four commits, four separate human checks.
Mitigation: §7 names the consequence of each one *before* it is turned on, so a
reviewer can tell a field that was decided from a field that was swept in.

**Rewriting `priestThink` with no trace coverage.** §6.1. Mitigation: the boss
fixture lands before the first brain, and is proven by mutating both of the
`material.map` sites it exists to cover.

**Deleting a letter a level still places.** Nineteen of twenty-five are placed
in kept levels and the level tables are plain data with no compile-time link to
`ENEMY_DEFS`. A deleted letter does not fail to build — it silently spawns
nothing, and `loadLevel`'s dispatch falls through to `if(!k)continue`.
Mitigation: §10's new assertion, and §8's decision made before the first def is
removed rather than discovered halfway through.

**Consolidating five fliers into one being read as a rendering change.** It is
not. Three distinct fliers are placed in the kept levels across six tiles, and
five of those six are in level 3 — where `y`×3 and `R`×2 become five copies of
the same enemy, one per room, across five of level 3's separate rooms. That is
still a composition change nobody chose, even spread this wide. Mitigation: say
so in the commit, and treat it as a balance change needing a human, not as a
deletion.

**Scope creep into weapons.** `direction.md` gives Phase 3 both the roster and
weapon personalities plus flow-field pathfinding. This spec covers the roster
only; the others need their own, and bundling them is how a phase that is mostly
data surgery becomes a rewrite.

---

## 13. What this phase leaves broken

Recorded so the next phase inherits an honest list rather than a surprise.

- **Every sprite, silhouette and balance number is unverified** until a human
  plays it. Nothing in §2's second table changes state during this phase.
- **Six of KNOWN-15's ten fields remain dead or deleted** rather than fixed —
  which is the intended outcome, not a shortfall. The row stays open, narrowed to
  what is left.
- **Levels 2-4 still share the copy-pasted layout** (Phase 4), whatever §8
  decides about their *contents*.
- **KNOWN-4 and KNOWN-11 are not closed**, though both change shape: see §8.
- **The three boss brains are specified, not written** (Phase 5).
- **`Context.ts` still holds `wakeBoss`** (KNOWN-2). The boss rewrite is the
  natural moment to move it onto `core/Events.ts`, and this phase does not.
- **The grid-legend docstring in `src/world/levels/index.ts` is still wrong** —
  it advertises `B` as placeable, omits `q`, and names three bosses where the
  table has eight. KNOWN-18 assigns its correction to this phase; it is trivial
  and should land with the cut, not before it.
