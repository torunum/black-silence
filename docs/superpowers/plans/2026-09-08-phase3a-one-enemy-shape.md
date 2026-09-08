# Phase 3 Part A — One enemy shape

Closes KNOWN-13. Opens and pins KNOWN-15, which closing KNOWN-13 found.

This is the last structural prerequisite before Phase 3's roster work. The
roster cut (25 → 9 + 3 bosses with distinct brains) rewrites what an enemy
*is*; doing that against seventeen independent declarations of the enemy
shape would multiply every edit by seventeen and check none of them.

## Why now, and what changed since KNOWN-13 was written

KNOWN-13 counted fifteen interfaces. There are now **seventeen** across
sixteen files — `MusicBossEnemy` (`src/audio/Music.ts`) arrived with Phase 1's
adaptive music and nobody updated the count. The row predicted drift; the row
itself drifted. That is the argument for doing this now rather than after
Phase 3 adds more.

Measured conflicts between the existing declarations:

```
severKey    string   DamageEnemy (src/enemies/Damage.ts)     <- assigned e.severKey=key
            boolean  Enemy       (src/enemies/ai/Behaviors.ts)  <- a contradiction
alertX      number   Behaviors            ?number  Perception
alertZ      number   Behaviors            ?number  Perception
flung       number   Behaviors            ?number  KickEnemy (WeaponState)
flungT      number   Behaviors            ?number  KickEnemy
frenzy      number   Behaviors            ?number  Enemy (world/RandomEvents)
```

84 distinct fields, 59 of them declared in more than one place.

`severKey` is the one that is outright wrong rather than merely inconsistent:
`src/enemies/Damage.ts:155` assigns a **string** (`e.severKey=key`), while
`src/enemies/ai/Behaviors.ts:84` declares it `boolean`. Both reads
(`Behaviors.ts:162`, `:304`) are truthiness tests, so it happens to work —
but any future code trusting the declaration would be wrong.

## The root cause, which is not the interfaces

```ts
// src/world/LevelLoader.ts:112
export function spawnEnemy(ch, wx, wz, summoned?): Record<string, unknown>
```

**The producer has no type.** Seventeen consumers each invented a cast shape
over an object the compiler knows nothing about. Consolidating seventeen
declarations into one is cosmetic if the producer stays untyped — the new
declaration would be the eighteenth thing nothing checks. Typing
`spawnEnemy`'s return is what makes the shared interface load-bearing: after
this plan, adding a field to the spawn literal without adding it to `Enemy`
(or the reverse) is a compile error.

## KNOWN-15 — what typing the producer immediately exposes

`spawnEnemy` builds 69 fields. `ENEMY_DEFS` authors nine more that
`spawnEnemy` **never copies onto the spawned enemy**, in this port and
identically in the frozen reference:

| Field | Authored on | Read at | Consequence in the shipped game |
|---|---|---|---|
| `orb` | 7 enemy defs | `Behaviors.ts:249,252`, `Attacks.ts:78` | **No enemy ever fires a projectile.** `fireOrb` is gated on `e.orb`. |
| `fly`, `flyH` | 5 defs | `Attacks.ts:90,101`, `Behaviors.ts:153,318`, `Hitscan.ts:98,132` | Flying enemies do not fly; their hit height falls back to ground math. |
| `twin` | 1 def | `Behaviors.ts:251` | The Mancubus never fires its second barrel. |
| `burst` | 1 def | `Behaviors.ts:249,254` | The Afrit never fires its spread. |
| `charger` | 1 def | `Behaviors.ts:258` | The charge lunge never triggers. |
| `fling` | 3 defs | `Behaviors.ts:262` | The fling attack never triggers. |
| `shield` | 1 def | `Damage.ts:107` | Directional shield absorption never applies. |
| `sovereign` | 5 defs | `Boss.ts:174` | Sovereign bosses use the lower speed and melee numbers. |

Verified three ways: `spawnEnemy`'s literal has no spread and copies none of
them by name; no `.field =` assignment exists anywhere in `src/`; the
reference's own `spawnEnemy` copies none of them either (its only textual
match is the substring inside `flingCD:rnd(3,6)`).

This is the same structural class as KNOWN-4 and KNOWN-11 — author intent the
dispatch never delivers — and like those it is **faithful port behavior, not
drift**. Turning nine dead behaviors on is a combat-balance change of the
first order and belongs to the roster work, not here. **This plan documents
and pins it; it does not fix it.**

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **Neither trace fixture may be regenerated.** This plan is types and one
  new test file. No runtime behavior changes at all — if a fixture moves,
  something in the diff is not a type-only change, and you must find out
  what rather than regenerating.
- No `src/` file over 400 lines.
- No import cycles: `npx madge --circular --extensions ts,js src/`, and read
  the "Processed N files" line — it should say ~89. **The bare form scans
  zero files and still reports success** (KNOWN-12).
- `npm test` and `npm run typecheck` before every commit. Cold cache on the
  final run of each task: `npx vitest run --no-cache`.
- Node is not on PATH in a fresh shell: prefix with
  `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game cannot be rendered in this environment** — `requestAnimationFrame`
  never fires in the browser pane. Every claim must be structural. "It looks
  fine" is not available.

---

## Task 1 — `src/enemies/Enemy.ts`, and a typed producer

Create the one shape and make the spawn site produce it.

### Step 1: derive the shape from the producer, not from the consumers

Read `spawnEnemy`'s object literal (`src/world/LevelLoader.ts:112`) and give
every field it builds a **non-optional** property whose type is what the
literal actually assigns. `boss:!!d.boss` is `boolean`, not `boolean | undefined`
— the seventeen `boss?: boolean` declarations are all describing the field
more loosely than the producer does, and tightening it is the point.

Then add the fields assigned after spawn, each **optional**, each with a
one-line comment naming where it is written:

```
atkAnim   formKey   frenzy   sever   severKey   wasAtk
```

`severKey` is `string` (`Damage.ts:155`), not `boolean`. Say so in a comment.

### Step 2: the nine KNOWN-15 fields

Declare them optional, and group them under a comment block that says
plainly: authored in `ENEMY_DEFS`, never copied by `spawnEnemy`, therefore
always `undefined` at runtime — with a pointer to KNOWN-15. Do **not** make
`spawnEnemy` start copying them. Do not delete the read sites.

### Step 3: type the producer

`spawnEnemy` returns `Enemy`. Remove the `Record<string, unknown>` return
type and the `as Record<string, unknown> & { sp: THREE.Sprite }` assertion at
the literal — the literal should type-check as an `Enemy` on its own. If it
does not, the mismatch is information: fix the interface to match the
producer, never the producer to match the interface.

`world.enemies` is currently `Record<string, unknown>[]` with 15 cast sites.
**Retyping `world.enemies` to `Enemy[]` is Task 3's job, not yours** — keep
this task to the interface and the producer so the two diffs stay readable.
The cast at the `world.enemies` push stays for now.

### Step 4: pin the shape against the producer

`tests/enemies/enemyShape.test.ts`. Spawn a real enemy through `spawnEnemy`
and assert that the set of its own keys equals the set of non-optional keys
`Enemy` declares. The interface is erased at runtime, so derive the expected
list by parsing `src/enemies/Enemy.ts` — the same technique
`tests/content/achievements.test.ts` uses to re-extract from the reference.

This is the assertion that makes the consolidation stick: it fails when
someone adds a field to the spawn literal and not to `Enemy`, and when
someone adds a non-optional field to `Enemy` that the producer does not
build.

### Step 5: prove it

Mutations, each turning a **named** test red:

- add a field to `spawnEnemy`'s literal, not to `Enemy` → the shape test
- add a non-optional field to `Enemy`, not to the literal → the shape test
- change `severKey` back to `boolean` → `tsc --noEmit`

### Commit

`git commit -m "types: one Enemy shape, produced by a typed spawnEnemy"`

---

## Task 2 — the seventeen consumers become `Pick<>`s

Convert every local interface to an alias of `Enemy`.

```ts
type AttackEnemy = Pick<Enemy, "x" | "z" | "h" | "hp" | "atkAnim" | "orb" | ...>;
```

**Keep the narrowness.** The convention KNOWN-13 describes was deliberate and
defensible — each file names only the fields its own code path reads, so a
file cannot silently depend on a field it never checks. `Pick<>` preserves
that property exactly while making the field's *type* single-sourced. Do not
replace them with bare `Enemy`.

The seventeen, with their files:

```
src/audio/Music.ts          MusicBossEnemy
src/enemies/ai/Attacks.ts   AttackEnemy
src/enemies/ai/Behaviors.ts Enemy          <- the widest; 69 fields
src/enemies/ai/Locomotion.ts MoveEnemy
src/enemies/ai/Perception.ts Enemy
src/enemies/Boss.ts         BossBrainEnemy
src/enemies/Damage.ts       DamageEnemy
src/enemies/Death.ts        DeathEnemy, KillEnemy
src/fx/ProjectileTick.ts    Enemy
src/player/Player.ts        TickEnemy
src/ui/Hud.ts               BossEnemy
src/weapons/Hitscan.ts      HitscanEnemy
src/weapons/WeaponState.ts  KickEnemy
src/world/Props.ts          DamageableEnemy
src/world/RandomEvents.ts   Enemy
```

`src/enemies/EnemyDefs.ts`'s `EnemyDef` is **not** in scope — it is the static
def table, a genuinely different shape (`sp` there is a sprite index, not a
`THREE.Sprite`). Leave it alone.

### The optionality conflicts resolve toward the producer

Five fields are optional in one declaration and required in another
(`alertX`, `alertZ`, `flung`, `flungT`, `frenzy`). `Enemy` decides, and
`Enemy` follows the producer: `spawnEnemy` builds `alertX`, `alertZ`, `flung`
and `flungT` unconditionally, so they are required; `frenzy` is assigned only
by `RandomEvents.ts`, so it is optional. Consumers that declared them
optional will now see them as required, which is strictly more information
and cannot break a read.

### Watch for a cycle

`src/enemies/Enemy.ts` must import nothing but `three`. Every one of the
sixteen files importing it must stay acyclic — check
`madge --circular --extensions ts,js src/` after the conversion, and read the
processed-file count.

### Prove it

Mutation: narrow one `Pick<>` by removing a field the file actually reads →
`tsc --noEmit` fails in that file. Record which.

### Commit

`git commit -m "types: every enemy cast shape becomes a Pick of Enemy"`

---

## Task 3 — `world.enemies` is `Enemy[]`, and KNOWN-15 is pinned

### Step 1: retype the array

`world.enemies` becomes `Enemy[]`, and the 15 `as` casts at its use sites go
away. This is what turns the shared interface from a convention into a
checked contract: after this, a consumer reading a field `Enemy` does not
declare is a compile error at the read site.

If any cast cannot be removed, leave it, and say in the report exactly which
and why — a cast that survives is information about a seam, not a failure.

### Step 2: pin KNOWN-15

`tests/enemies/deadDefFields.test.ts`. Assert the **current, broken** state,
so that Phase 3 turning these on is a deliberate, visible act:

- `ENEMY_DEFS` authors each of the nine fields on at least one enemy (assert
  the counts from the plan's table — 7 `orb`, 5 `fly`, etc.).
- A freshly spawned enemy of one of those types has the field `undefined`.
- Therefore `fireOrb` is unreachable for it.

Derive the def counts by reading `src/enemies/EnemyDefs.ts`, not by hardcoding
— a hardcoded count goes stale silently, which is the failure mode this
project has hit four times (see `docs/STATUS.md`, Plan 0F).

**Do not fix the bug.** A test that asserts the broken behavior is the
deliverable. Comment it as such, loudly, so a future reader does not "fix"
the test.

### Step 3: the docs

- **KNOWN-13**: closed. Record the seventeen (not fifteen), the `severKey`
  contradiction, and that the producer is now typed.
- **KNOWN-15**: new row. The table above, the three-way verification, the
  owner (Phase 3 — roster), and the explicit warning that enabling nine
  behaviors at once is a balance change requiring a human at the game.
- `docs/STATUS.md`: a Phase 3 Part A section.

### Prove it

- Read a field off a `world.enemies` element that `Enemy` does not declare →
  `tsc --noEmit` fails. This is the whole point of Step 1; demonstrate it.
- Make `spawnEnemy` copy `orb` from the def → the KNOWN-15 test fails.

### Commit

Two commits: the retype, then the pin and the docs.

---

## Definition of done

- One `src/enemies/Enemy.ts`; seventeen `Pick<>`s; zero hand-written enemy
  shapes besides `EnemyDef`.
- `spawnEnemy` returns `Enemy`; `world.enemies` is `Enemy[]`.
- A test that fails when the producer and the interface disagree.
- A test that pins the nine dead fields.
- Both trace fixtures byte-identical to their committed state.
- `npm test`, `npm run typecheck`, madge over ~89 files, all clean.
