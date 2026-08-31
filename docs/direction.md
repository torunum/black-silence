# Creative Direction — approved 2026-08-05

Director-level decisions. Approved by the project owner. These are settled; changing
one requires an explicit decision, not a drift.

## Content scope — Episode 1

Five hand-carved levels, not eight. The reference file has eight, but levels 2–7 all
share one `emptyGrid(4,4,7,5)` layout: same 4×4 room grid, same merged 2×2 boss
arena, red key always at room (3,1), Executioner always at (3,2), secret always at
(3,3). A player notices in ten minutes.

| # | Level | Status |
|---|---|---|
| 0 | OUT OF THE PIT | Keep. Short, hand-built, teaches movement. |
| 1 | THE GOTHIC DUNGEON | Keep + expand. Already hand-carved. |
| 2 | THE ABANDONED CHURCH | Rebuild by hand. The signature level — cathedral, vertical, nave. |
| 3 | THE NECROPOLIS | Rebuild by hand. Its `hmap` tiering is the best vertical work in the reference; build on it. |
| 4 | THE GRAVEYARD | Rebuild by hand. Open-air finale. |

**Cut from Episode 1:** SEWERS, FACTORY, WOMB. They dilute the gothic identity
(factory is Quake territory, womb is Amid Evil territory) and they are the three most
copy-pasted levels. Parked in `src/content/episode2/`, not deleted.

Five excellent levels beat eight mediocre ones. The second kind gets refunded.

## Enemy roster — 9 + elites + 3 bosses

The reference ships 25 types, eight of them named in code after id/Raven/Monolith
monsters (`Cacodemon`, `Mancubus`, `Lost Soul`, `Ettin`, `Slaughtaur`, `Afrit`,
`Reiver`, `Gargoyle`). That is IP risk, and it signals a roster that was borrowed
rather than designed. There are also five separate flying enemies that all behave
the same.

Rule: **every enemy must answer "what does this force the player to do differently?"**
Two enemies with the same answer means one of them dies.

| Enemy | Silhouette | Forced behavior |
|---|---|---|
| The Flock | hunched, in numbers | Crowd control — shotgun fodder |
| The Fleet | thin, sprinting | Target prioritization |
| The Hound | low, quadruped | Aim down |
| The Penitent | front-plated | Flank it or kick it |
| The Censer | tall, censer-swinging | Keep moving — area denial |
| The Crawler | dragging, floor-level | Watch the ground |
| The Chorister | thin, long-necked | Kill it first — it wakes the others |
| The Bellringer | huge, hammer | Don't tank, evade |
| The Suspended | hanging, singular | Look up — **the only flier** |

Plus elite variants of the above.

**Bosses — three, each with its own brain.** The reference has six bosses sharing
`priestThink()` with different HP values and sprites. That is the bullet sponge the
project is meant to avoid.

- **THE CATHEDRAL GUARDIAN** — arena-interactive; phase mechanic tied to the pillars
- **THE CORRUPTED PRIEST** — teleport and summon, driven by a real mechanic rather than HP gates
- **THE BONE SOVEREIGN** — finale; **rebuilds itself from the corpses left in the level**

That last mechanic is already promised by the existing writing —
`boss_Z2: "It's rebuilding itself. From the OTHER skeletons. That's cheating."`
The prose commits to a mechanic the code never delivered. The code will deliver it.

## Asset policy — hybrid

This deviates from the original brief's "search free assets first" instruction, on
purpose, and was approved.

**World geometry, textures, and sprites stay procedural.** Dropping ready-made GLTF
props into a sprite-based retro FPS produces exactly the asset-flip look the project
exists to avoid. Mixing free 3D models with hand-drawn pixel sprites is the clearest
tell of an amateur project. The zero-asset pipeline is a competitive advantage:
instant load, no licensing surface, total art control.

**Audio and typography use real files.** Procedural WebAudio cannot produce a
convincing shotgun and cannot produce music at all. This is where the current
approach definitively loses.

- Sound: Freesound, CC0 only, shipped as `.ogg`
- Music: layered adaptive tracks (exploration / combat / boss)
- Type: an open-licensed display face (SIL OFL) replacing Courier New

Every third-party asset must be recorded in `docs/assets.md` with name, license,
source URL, why it was chosen, and what was modified.

## Roadmap

Each phase gets its own spec → plan → implementation cycle.

| Phase | Scope |
|---|---|
| **0** | Modular port. Vite + TypeScript. No behavior change. |
| **1** | Tier 0 fixes: positional audio + music, resolution setting, save system |
| **2** | World: merged geometry, KNOWN-7 casings, KNOWN-8 wheel — then, needing a human at the game, the Three.js upgrade, shadowed lighting, variable ceiling height, gothic trim |
| **3** | Combat: weapon personalities, flow-field pathfinding, enemy redesign, **8-directional sprites** |
| **4** | Levels: five hand-carved maps |
| **5** | Bosses: three distinct brains |
| **6** | Polish: menus, settings, achievements, balance, performance |

### Amendment, 2026-08-29 — 8-directional sprites moved from Phase 1 to Phase 3

Approved after measuring the real cost at the end of Phase 0.

The roster today is **31 sprite definitions**, each baked into ~14 canvas
textures (walk A/B, headless A/B, four dismemberment variants ×2, gibbed ×2) —
about 434 textures. Eight facings multiplies that to roughly **3,500**, at boot,
on the CPU.

The size is not the real objection. **Every sprite is generated from a single
front-facing pixel grid**, so there is no side or back art to bake from: eight
facings means authoring seven more angles per enemy, by hand. That is not the
procedural pipeline this project's asset policy is built on — it is the largest
piece of manual art in the roadmap, hiding inside a line item that reads like a
rendering fix.

And it would be spent on the wrong roster. This document already commits to
cutting the enemy count from 25 to 9 plus 3 bosses. Drawing seven new angles for
31 definitions before that cut means drawing most of them for enemies scheduled
for deletion.

So it moves to **Phase 3**, where the roster is redesigned anyway and each
keeper enemy can be authored once, at its final size, with all its facings
together. Phase 1 keeps the three items that are pure code and unblocked.

## What the reference already does well — preserve it

Do not lose these while refactoring:

1. **The zero-asset procedural pipeline** — see asset policy above
2. **The level-builder DSL** (`emptyGrid` / `link` / `carve` / `hall` / `put`) — the
   best architectural idea in the file; extend it, don't replace it
3. **The dismemberment system** (`texFromPx` with region masks and generated wet
   stumps) — produces headless/armless/legless variants from one sprite definition
4. **ADEM's monologues** — the game's only real personality, and the thing that
   separates it from an asset flip
5. **The guttural voice synthesis** (`growl`/`gurgle`/`pain` with formant bandpass) —
   far better than chiptune beeps; keep it even after real audio files land
