# Phase 0E — The Systems

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the game's systems — collision, renderer, level loader, weapons, player, interaction, projectiles, damage/death and enemy AI — out of `src/legacy.js` into their own modules, leaving only UI, the piano, and the loop for Plan 0F.

**Architecture:** Plan 0D moved *state*; this plan moves *functions*. That is a harder problem, because functions call each other across what will become module boundaries, and some of those calls run **both ways** — enemy AI damages the player, the player queries enemies. `madge --circular` is a hard gate, so those cycles must be broken as the systems move, not after. The spec's answer is `core/Context.ts`, a service locator: systems register themselves and reach each other through it rather than importing each other directly. It is deliberate, tracked debt (KNOWN-2), not the end state.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 2, jsdom, madge, three 0.128.0 (pinned).

## Global Constraints

Every task's requirements implicitly include this section.

- **No gameplay changes. No balance changes. No new features.** Existing bugs are preserved.
- **No art changes. No audio changes.**
- **`reference/sonsurum.html` is never edited.**
- **Three.js is pinned to `0.128.0`.** The upgrade is Plan 0F.
- **No file in `src/` may exceed 400 lines**, except `src/legacy.js`. Hard gate.
- **No import cycles.** Hard gate, and the central design problem of this plan — see Decision 2.
- **Every task ends with a playable game.**
- **`src/legacy.js` has `checkJs: false`.** TypeScript will not catch a typo'd name there; only tests will. This bit Plan 0D repeatedly.
- **Every line number in this plan is advisory.** Confirm every range by reading its content. Line numbers were measured at `293a64a` and every task that lands shifts them.
- **Burn-down and test-count figures are estimates.** Record the real ones; never edit a source file to make a count match a document.
- **`npm test`, `npm run typecheck` and `madge --circular src/` must pass before every commit.** Node is not on PATH in a fresh shell: prefix with `export PATH="/c/Program Files/nodejs:$PATH"`.

---

## Starting state

`master` at `293a64a`. `src/legacy.js` is 1616 lines holding **75 function declarations**. 357 tests pass.

Sections remaining, measured rather than assumed:

| Section | Lines | Functions | Owner |
|---|---|---|---|
| THREE CORE | 40 | `sizeRender shake addSprite addBlob` | **Task 4** |
| WEAPONS — FSM, fire, kick | 153 | `requestSwitch startReload weaponTick fire doKick solidAt` | **Task 6** |
| Collision + hitscan ("Each seg…") | 109 | `distToSeg segBlocked segsCrossRay floorHeightAt wallNormal hitscan crossExplode` | **Task 3** |
| AMBIENT AUDIO | 21 | `ambience vitalsAudio` | **Task 11** |
| WORLD STATE + LEVEL LOADER | 239 | `spawnEnemy spawnProp breakProp explodeBarrel alertSound loadLevel` | **Task 5** |
| DAMAGE / DEATH | 231 | `damageEnemy refreshSeverSprite severLimb killEnemy spawnHead headTick dropAmmo bossDeath openExit wakeBoss roarFor cineTick` | **Task 9** |
| ENEMY AI | 352 | `los moveEnemy fireOrb throwFlesh priestTeleport enemyTick priestThink spawnRing ringTick spawnStrike strikeTick poisonTick` | **Task 10** |
| PROJECTILES | 43 | `projTick` | **Task 8** |
| PLAYER | 105 | `damagePlayer accelerate collides footstep playerTick` | **Task 7** |
| INTERACTION + PICKUPS | 70 | `interact itemsTick doorTick propTick torchTick` | **Task 8** |
| RANDOM EVENTS | 23 | `eventTick` | **Task 11** |
| PLAYABLE PIANO | 46 | `buildPiano pressKey pianoKeyDown openPiano closePiano` | Plan 0F |
| LEVEL END + WIN + HUD | 59 | `gradeOf statsHtml endLevel showWin hud` | Plan 0F |
| IDLE QUIPS + SUBTITLE TIMER | 9 | `chatterTick` | Plan 0F |
| MAIN LOOP + BOOT | 71 | `startGame showScreen loop` | Plan 0F |

0E owns roughly 1386 lines; Plan 0F inherits roughly 185.

### The coupling that has to be broken

Cross-section calls, counted from the source (weight = number of call sites):

```
 11  ENEMY AI      -> WEAPONS            9  ENEMY AI  -> THREE CORE
  8  ENEMY AI      -> PLAYER             7  ENEMY AI  -> DAMAGE/DEATH
  6  ENEMY AI      -> LEVEL LOADER       6  WEAPONS   -> COLLISION
  6  LEVEL LOADER  -> THREE CORE         5  COLLISION -> LEVEL LOADER
  5  DAMAGE/DEATH  -> WEAPONS            5  PROJECTILES -> PLAYER
  4  COLLISION     -> WEAPONS            4  DAMAGE/DEATH -> THREE CORE
  4  PLAYER        -> COLLISION          3  DAMAGE/DEATH -> ENEMY AI
  3  WEAPONS       -> THREE CORE         3  WEAPONS   -> LEVEL LOADER
  3  DAMAGE/DEATH  -> LEVEL LOADER       3  PLAYER    -> LEVEL LOADER
  3  ENEMY AI      -> COLLISION          3  THREE CORE -> WEAPONS
```

Three pairs call **both ways** and are therefore true cycles, not orderable away:

- `ENEMY AI` ↔ `DAMAGE/DEATH` (7 / 3)
- `WEAPONS` ↔ `THREE CORE` (3 / 3)
- `WEAPONS` ↔ `COLLISION` (6 / 4)

Regenerate this table any time with the script in Task 1, Step 1.

### Three decisions this plan locks in

**1. The combat net comes first, before any combat code moves.**

`docs/known-issues.md` KNOWN-10 records that the entire combat-resolution path
has no automated coverage: Plan 0D's trace plays the prologue, and the prologue
loads with **zero enemies**. This plan moves `DAMAGE / DEATH` (231 lines) and
`ENEMY AI` (352 lines) — 583 lines of exactly that untested code, plus
`damagePlayer`, `projTick`'s hit branches and `explodeBarrel`.

Moving untested code is the wrong order, and Plan 0D already proved the fix:
build the characterization net first, then migrate against it. Task 1 does that,
and it is now possible **because of** 0D — `save.maxLevel` is an exported
property a test can assign, so a trace can start a level other than the
prologue. Measured enemy counts per level:

```
level 0 (prologue):  0      level 4: 23
level 1:            15      level 5: 25
level 2:            28      level 6: 24
level 3:            24      level 7: 30
```

Level 1's 15 enemies are the target. **No system may move until Task 1's fixture
exists and is proven to fail on a combat-shaped mistake.**

**2. `Context`, not direct imports, and not `Events` yet.**

Spec §4 introduces two mechanisms, `Events` (typed pub/sub) and `Context` (a
service locator), and says Phase 0 ports using `Context` while later phases
migrate systems onto `Events`. This plan builds **`Context` only**. Nothing in
0E publishes or subscribes to an event, and an `Events.ts` that no module
imports is an abstraction with no user — the review rubric treats that as a
defect, and it would sit unused until Phase 1. Record the deviation in the task
report; the spec's intent (systems don't import each other) is honoured either
way. Phase 1 introduces `Events` when the first system actually needs it.

**3. Leaves first, the enemy brain last.**

Task order follows the call graph, not the file order: the most depended-upon
systems move first so that later tasks import a settled interface rather than a
moving one. `ENEMY AI` is both the largest section and the most coupled (5 of
the 13 heaviest edges originate there), so it moves last, when everything it
calls is already a module.

---

## File structure

Eleven new modules. The spec's §5 target layout is the guide, but **where the
spec and the files on disk disagree, the files win** — Plan 0D established this
and it holds here.

| File | Owns | From |
|---|---|---|
| `src/core/Context.ts` | the service locator | Task 5 |
| `src/world/Collision.ts` | `distToSeg segBlocked segsCrossRay floorHeightAt wallNormal solidAt collides` | Task 3 |
| `src/render/RenderCore.ts` | `sizeRender addSprite addBlob` | Task 4 |
| `src/world/LevelLoader.ts` | `loadLevel spawnEnemy spawnProp` | Task 5 |
| `src/world/Props.ts` | `breakProp explodeBarrel` | Task 5 |
| `src/weapons/WeaponState.ts` | `requestSwitch startReload weaponTick fire doKick` | Task 6 |
| `src/weapons/Hitscan.ts` | `hitscan crossExplode` | Task 6 |
| `src/player/Player.ts` | `damagePlayer accelerate footstep playerTick` | Task 7 |
| `src/player/Interact.ts` | `interact itemsTick doorTick propTick torchTick` | Task 8 |
| `src/fx/ProjectileTick.ts` | `projTick` | Task 8 |
| `src/enemies/Damage.ts` | `damageEnemy severLimb refreshSeverSprite` | Task 9 |
| `src/enemies/Death.ts` | `killEnemy spawnHead headTick dropAmmo bossDeath openExit` | Task 9 |
| `src/enemies/Boss.ts` | `wakeBoss roarFor cineTick priestTeleport priestThink` | Task 10 |
| `src/enemies/ai/Perception.ts` | `alertSound` (Task 5), `los` (Task 10) | Tasks 5, 10 |
| `src/enemies/ai/Locomotion.ts` | `moveEnemy` | Task 10 |
| `src/enemies/ai/Behaviors.ts` | `enemyTick` | Task 10 |
| `src/enemies/ai/Attacks.ts` | `fireOrb throwFlesh spawnRing ringTick spawnStrike strikeTick poisonTick` | Task 10 |
| `src/world/RandomEvents.ts` | `eventTick` | Task 11 |
| `src/world/Ambience.ts` | `ambience vitalsAudio` | Task 11 |

`shake()` (THREE CORE) is three lines writing `screenShake.trauma`; it belongs
with the state object it mutates. Move it to `src/fx/ShakeState.ts` in Task 4
rather than giving it a module.

Plus, in tests: `tests/integration/combatTrace.test.ts` and
`tests/integration/__fixtures__/trace-level1.json` (Task 1).

---

### Task 1: The combat trace — close KNOWN-10 before moving combat code

**Files:**
- Modify: `tests/integration/gameplayTrace.ts` (a `level` option)
- Create: `tests/integration/combatTrace.test.ts`
- Create: `tests/integration/__fixtures__/trace-level1.json`

**Interfaces:**
- Produces: `runTrace(o: TraceOptions)` gains an optional `level?: number`
  (default 0, preserving every existing caller). Later tasks call neither —
  they run `npm test`.

- [ ] **Step 1: Regenerate the section and coupling tables**

Paste the output into your task report; if it differs from this plan's tables,
yours is right and the plan is stale.

```js
// scratch/sections.mjs — section sizes and their functions
import { readFileSync } from "node:fs";
const lines = readFileSync("src/legacy.js", "utf8").split(/\r?\n/);
const marks = [];
lines.forEach((l, i) => { const m = /^   ([A-Z][^*]*)$/.exec(l); if (m) marks.push({ line: i + 1, name: m[1].trim() }); });
const sectionOf = (n) => { let c = "(preamble)"; for (const m of marks) { if (m.line <= n) c = m.name; else break; } return c; };
const bySec = {};
lines.forEach((l, i) => {
  const m = /^function ([A-Za-z_$][\w$]*)/.exec(l);
  if (m) { const s = sectionOf(i + 1).split(/[—(]/)[0].trim().slice(0, 30); (bySec[s] = bySec[s] || []).push(m[1]); }
});
for (const [s, f] of Object.entries(bySec)) console.log(`\n${s} (${f.length}):\n  ${f.join(" ")}`);
```

For the coupling table, reuse the same section map and count calls whose callee
is declared in a different section — the full script is in this plan's git
history at the commit that added it; rewriting it from the description above is
also fine.

- [ ] **Step 2: Teach `runTrace` to start a level other than the prologue**

`runTrace` currently clicks the `NEW GAME` menu row, which runs
`maxLevel=0;startGame(0)`. Level 1 is reachable because Plan 0D made
`save.maxLevel` an exported property: set it, then click the chapter row the
menu builds for that level. Read `src/legacy.js`'s chapter-select block (search
`mChapter`) for the row's markup before writing the selector — do not guess it.

Add `level?: number` to `TraceOptions`, defaulting to `0`. When it is `0`, take
exactly today's path so `trace.test.ts`'s existing fixture is unaffected — verify
that by running that test before you touch anything else and again after.

- [ ] **Step 3: Write the combat script**

Level 1 has 15 enemies (`U z×4 f×2 j m×2 t g×2 s A`). The player must actually
meet them, so the script has to move, not stand at spawn. Aim for a run where
the fixture shows all four of:

- `hud.hp` dropping below `"HEALTH100"` at least once (the player took damage),
- at least one frame where `scene.count` **decreases** (something despawned),
- `hud.subt` holding an enemy-sighting bark (`see_*`) at least once,
- more than one distinct `hud.wname` value.

Assert all four in the test. Each is a specific observable that a degraded run
would lose, and together they are the guard KNOWN-10 says the prologue trace
could never provide. **If you cannot get all four, stop and report BLOCKED with
what you observed** — a combat fixture that does not fight is the exact failure
this task exists to prevent, and Plan 0D shipped one by accident.

- [ ] **Step 4: Generate the fixture and record its provenance**

Generate once with the `WRITE_TRACE=1` guard the existing harness already has.
Then add a comment at the top of `combatTrace.test.ts`, in the same voice as
`trace.test.ts`'s, stating that **this fixture was recorded before Plan 0E moved
any system**, that its value is being a pre-migration recording, and that
regenerating it to make a red build green destroys that value.

- [ ] **Step 5: Prove it catches combat-shaped mistakes**

This step is the whole point of the task. Apply each sabotage, run
`npx vitest run tests/integration/combatTrace.test.ts`, confirm FAIL, revert,
confirm PASS. Record every outcome in the report.

1. In `damagePlayer`, change the armour split (`S.armor` absorb fraction).
2. In `damageEnemy`, change the damage applied by any constant factor.
3. In `killEnemy`, skip the `S.kills++` increment.
4. In `enemyTick`, change an enemy's move speed by 10%.
5. In `los`, invert the return value.

If any sabotage passes, the fixture is not yet a net — widen what the trace
records (or lengthen the script) until it bites, and say so in the report.

- [ ] **Step 6: Run the gate and commit**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm run typecheck && npm test
git add tests/integration
git commit -m "test: add a combat trace on level 1, closing KNOWN-10"
```

Update `docs/known-issues.md`: KNOWN-10 moves to **closed**, with a one-line
note of which sabotages it is proven to catch.

---

### Task 2: *(withdrawn — folded into Task 5)*

**Correction, found before execution (2026-08-15).** This task originally
created `src/core/Context.ts` on its own, "empty except for what Task 3 needs".
Task 3 needs nothing from it: Collision imports the state objects directly,
because state objects are already modules and importing them creates no cycle.
Task 4 is the same. **`Context`'s first real consumer is Task 5**, where
`loadLevel` has to call `buildPiano` — code that stays in `legacy.js` for this
whole plan.

Running this as a standalone task would therefore have shipped a module that
nothing imports for three tasks running — precisely the abstraction-with-no-user
that this plan's own Decision 2 rejects when it declines to build `Events.ts`.
Applying that rule to `Events` but not to `Context` would have been
inconsistent.

So `Context` is created in **Task 5**, alongside its first entry. Its design —
a mutable registry object, fields added by the tasks that need them, typed as
they are added rather than declared up front — is unchanged and now lives in
Task 5's Step 3. Task numbering is left alone so that the ledger, the briefs
and this document keep referring to the same tasks.

---

### Task 3: Collision

The most depended-upon system: four other sections call into it, and it is one
half of a true cycle with WEAPONS.

**Files:**
- Create: `src/world/Collision.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `distToSeg`, `segBlocked`, `segsCrossRay`, `floorHeightAt`,
  `wallNormal`, `solidAt`, `collides`.
- Note `solidAt` currently sits in the WEAPONS section and `collides` in
  PLAYER; both are collision queries and move here. Confirm by reading them.

- [ ] **Step 1: Read the seven functions and list what each reads**

Before moving anything, write down for each function: which state objects it
reads (`world.grid`, `world.GW/GH`, `world.wallSegs`, `world.heightMap`,
`player.px/pz`, …) and which other functions it calls. Put that list in your
report — it is what the next steps check against, and Plan 0D's tasks that
skipped this step were the ones that needed fix rounds.

- [ ] **Step 2: Move them, importing state objects directly**

Collision reads state objects (`world`, `player`) and the `CELL`/`WALLH`
constants. State objects are already modules and importing them creates no
cycle — import them directly, not through `Context`. `Context` is only for
system-to-system calls.

`CELL` and `WALLH` are `const` in `legacy.js` and out of scope for Plan 0D's
rules, but Collision needs them. Export them from `legacy.js` is not an option
(it is the file being emptied). Move them into `src/world/Collision.ts` and have
`legacy.js` import them back, or into a small `src/world/Grid.ts` if a later
task also needs them — decide by reading who uses them and say which you chose
and why.

- [ ] **Step 3: Break the WEAPONS↔COLLISION cycle**

`hitscan` and `crossExplode` live in this section but call into WEAPONS. They do
**not** move here — they move in Task 6 with the weapon system, which is what
breaks the cycle: after Task 6, Collision has no WEAPONS dependency at all.
Leave them in `legacy.js` for now and confirm `madge --circular src/` is clean.

- [ ] **Step 4: Run the gate and commit**

Run both traces explicitly — collision drives movement, so
`tests/integration/trace.test.ts` is directly sensitive to a mistake here, and
Task 1's combat trace is sensitive to enemy movement.

```bash
npx vitest run tests/integration/trace.test.ts tests/integration/combatTrace.test.ts
npm run typecheck && npm test
git add src/world/Collision.ts src/legacy.js
git commit -m "refactor: extract the collision and geometry queries"
```

---

### Task 4: Render core

**Files:**
- Create: `src/render/RenderCore.ts`
- Modify: `src/fx/ShakeState.ts` (gains `shake()`)
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `sizeRender`, `addSprite`, `addBlob` from `RenderCore.ts`; `shake`
  from `ShakeState.ts`.

- [ ] **Step 1: Move `shake()` to the state it mutates**

`function shake(a){screenShake.trauma=Math.min(1,screenShake.trauma+a);}` — three
lines that touch nothing but `screenShake`. It belongs in
`src/fx/ShakeState.ts`, not in a render module. Beware the name: that file
exports the object as `screenShake` precisely because `shake` was taken; adding
`export function shake` beside it is correct and not a collision.

- [ ] **Step 2: Move the three renderer helpers**

`sizeRender` reads `innerWidth`/`innerHeight` and writes `renderState.renderer`
and `renderState.camera`; `addSprite`/`addBlob` build THREE objects and add them
to `renderState.scene`. All three import `renderState` directly.

`blobTex`/`blobTexC` are module-scope `const`s that `addBlob` needs — move them
with it.

- [ ] **Step 3: The resize listener, and an ordering hazard this plan got wrong**

`legacy.js` has, in this exact order at module scope:

```js
renderState.camera=new THREE.PerspectiveCamera(78,4/3,.05,90);
renderState.renderer=new THREE.WebGLRenderer({canvas:document.getElementById("game"),…});
…
function sizeRender(){ renderState.renderer.setSize(…); renderState.camera.aspect=a; … }
addEventListener("resize",sizeRender);sizeRender();
```

`sizeRender()` is **called immediately**, and it dereferences
`renderState.renderer` and `renderState.camera`. An earlier draft of this step
said "moving the listener into `RenderCore.ts` is correct" — that is wrong on
its own. `legacy.js` imports `RenderCore.ts`, so RenderCore's module body runs
**first**; a module-scope `sizeRender()` there would fire while
`renderState.renderer` is still `null` and throw.

Two ways out. Choose one, and justify it in your report:

1. **Move the camera/renderer construction into `RenderCore.ts` too**, above
   `sizeRender` and its listener, keeping the same relative order. RenderCore
   becomes self-contained and the ordering is preserved by construction. This
   is the recommended option — those five lines are THREE CORE section content
   and belong with it.
2. **Export `sizeRender` and leave `addEventListener("resize",sizeRender);sizeRender();`
   in `legacy.js`** where it is. Preserves order exactly, at the cost of the
   listener line staying behind for now.

Either way, **do not move the call into an init function invoked later** —
that changes when the renderer is first sized, which this plan forbids.

Note `src/render/Overlay2D.ts` also registers a `resize` listener (`sizeFx`)
at its module scope. Two listeners on the same event means their relative
order is observable in principle; they write disjoint state (one sizes the 2D
overlay canvas, the other the WebGL renderer), so nothing depends on it today
— but say which order your change produces, so the next reader knows it was
considered rather than missed.

- [ ] **Step 4: Run the gate and commit**

```bash
npx vitest run tests/integration/trace.test.ts tests/integration/combatTrace.test.ts
npm run typecheck && npm test
git add src/render/RenderCore.ts src/fx/ShakeState.ts src/legacy.js
git commit -m "refactor: extract the renderer helpers and move shake() onto ShakeState"
```

---

### Task 5: Level loader and props

The largest single function in the file (`loadLevel`) plus the spawners.

**Files:**
- Create: `src/world/LevelLoader.ts`, `src/world/Props.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `loadLevel`, `spawnEnemy`, `spawnProp` from `LevelLoader.ts`;
  `breakProp`, `explodeBarrel` from `Props.ts`.
- Consumes: `Collision.ts` (Task 3), `RenderCore.ts` (Task 4).

- [ ] **Step 1: Split the section deliberately**

`loadLevel` builds the level; `breakProp`/`explodeBarrel` run during play when a
prop is destroyed. They share the `props` list and nothing else. Two files keeps
each under the size gate and matches how they are used — but read both before
splitting and say in your report whether the split holds up.

- [ ] **Step 2: `alertSound` moves now, into `Perception.ts`, ahead of schedule**

It is grouped with the loader in `legacy.js` but is a perception concern, and
this plan originally left it for Task 10 to take into
`src/enemies/ai/Perception.ts` alongside `los`. Measured before dispatch, that
is the wrong call: **`explodeBarrel` calls it**, and `explodeBarrel` moves in
this task. Leaving it behind would mean adding a `Context` entry for it — and
`alertSound` needs neither the locator nor a cycle-break, because it is a
four-line zero-dependency leaf that reads `world.enemies` and writes
`e.alertX`/`e.alertZ` and calls nothing at all.

So create `src/enemies/ai/Perception.ts` here with `alertSound` in it, and
import it directly from `Props.ts`. Task 10 adds `los` to the same file. This
follows the plan's own rule — never add a `Context` field a task does not
need — and its leaves-first principle.

There are seven `alertSound` call sites across `legacy.js` (in the weapon
fire path, damage, interaction and this task's own `explodeBarrel`); the ones
outside this task become imports.

- [ ] **Step 3: Create `Context` — `explodeBarrel` is what needs it**

This plan guessed twice about where the service locator is born, and both
guesses were wrong. It first put it in a standalone Task 2 (withdrawn: nothing
imported it for three tasks). It then justified creating it here because
`loadLevel` calls `buildPiano` — **it does not**; `startGame` does, and that
stays in `legacy.js` for Plan 0F. `loadLevel`'s only calls outside its own
section are `showMsg` and `say`, both already modules since Plan 0C.

Measured properly, across all six functions this task moves, exactly one has
unmoved dependencies: **`explodeBarrel`**, which calls `damagePlayer` (moves in
Task 7) and `damageEnemy` (moves in Task 9). Everything else —
`spawnEnemy`, `spawnProp`, `breakProp`, `alertSound`, `loadLevel` — calls
nothing that has not already moved.

So create `src/core/Context.ts` with exactly those two entries:

```ts
/**
 * The service locator, and deliberate debt.
 *
 * Plan 0E moves functions, and two situations make a direct import
 * impossible. Some pairs call each other **both ways** — enemy AI damages the
 * player and the player queries enemies — which `madge --circular` forbids.
 * And a system that has already moved sometimes has to call one that has not:
 * this module is born in the level-loader task because `explodeBarrel` calls
 * `damagePlayer` and `damageEnemy`, neither of which becomes a module until
 * Tasks 7 and 9.
 *
 * Each entry is registered by whoever owns the function *at the time*: today
 * `legacy.js` registers both, and when Tasks 7 and 9 extract them,
 * `Player.ts` and `Damage.ts` register them instead — and no call site
 * changes. That is the property that lets the remaining tasks land in order
 * without rewriting each other's call sites.
 *
 * This is NOT the end state. `docs/known-issues.md` KNOWN-2 tracks it: the
 * long-term rule is that systems talk over `core/Events.ts` and never reach
 * into each other, and each phase after this one migrates the systems it
 * touches. By the end of Phase 5 this should hold the renderer and the audio
 * engine and nothing else. It is written down as debt rather than hidden.
 */
export const ctx: {
  damagePlayer?: (d: number, silent?: boolean) => void;
  damageEnemy?: (e: unknown, dmg: number, info?: unknown) => void;
} = {};
```

The two real signatures are `damagePlayer(d,silent)` and
`damageEnemy(e,dmg,info)` — confirm both by reading them before you type the
type. Register them from `legacy.js` at module scope and call them as
`ctx.damagePlayer?.(...)` / `ctx.damageEnemy?.(...)` from `Props.ts`.

**Never add a `Context` field a task does not need.** Decision 2's rule — an
abstraction with no user is a defect — applies to individual fields as much as
to whole modules. Two entries, no more.

- [ ] **Step 4: `setScene` and the SceneRef mirror**

`loadLevel` calls `setScene(renderState.scene)` to mirror the scene for the FX
modules. Plan 0D's `Renderer.ts` doc comment says that mirror disappears in this
plan. **Do not remove it in this task** — the FX modules still call
`getScene()`, and changing them is not this task's scope. Removing it is a
one-line change once Task 10 lands and the last `getScene()` caller is gone;
record it as a Task 12 checklist item instead.

- [ ] **Step 5: Run the gate and commit**

```bash
npx vitest run tests/integration/trace.test.ts tests/integration/combatTrace.test.ts
npm run typecheck && npm test
git add src/world/LevelLoader.ts src/world/Props.ts src/legacy.js
git commit -m "refactor: extract the level loader and prop destruction"
```

---

### Task 6: Weapons — the FSM, firing, and hitscan

This task breaks two of the three cycles.

**Files:**
- Create: `src/weapons/WeaponState.ts`, `src/weapons/Hitscan.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `requestSwitch`, `startReload`, `weaponTick`, `fire`, `doKick` from
  `WeaponState.ts`; `hitscan`, `crossExplode` from `Hitscan.ts`.
- Consumes: `Collision.ts`, `RenderCore.ts`.

- [ ] **Step 1: Confirm both cycles are actually broken by this move**

Before writing code, trace on paper: after `hitscan`/`crossExplode` move out of
the collision section and into `Hitscan.ts`, does `Collision.ts` still reference
anything in WEAPONS? And after `sizeRender`/`addSprite`/`addBlob` moved in Task
4, does `RenderCore.ts` reference anything in WEAPONS? Write the answer in your
report with the specific call sites you checked. If either cycle survives,
`madge` will fail and you need `Context` for that edge — decide which, and say
why, before you start.

- [ ] **Step 2: `doKick`'s `setTimeout` stays as-is**

`doKick` schedules its hit test 110 ms later with `setTimeout`. Spec §6 step 11
says that call must eventually move to `Time.schedule()` because as written it
ignores hit-stop and pause and survives level unload — but that is **Plan 0F's
hardening step, not this one**. Move the call verbatim. Do not "fix" it here;
KNOWN-3 already tracks it.

- [ ] **Step 3: Add your own `Context` entries — the module already exists**

Task 5 created `src/core/Context.ts` for `explodeBarrel`'s two unmoved calls.
Your functions need it too: `fire`/`hitscan` call `damageEnemy` (three sites,
already a `ctx` entry from Task 5 — reuse it, do not add a second) and
`alertSound` (two sites, which Task 5 moved early into
`src/enemies/ai/Perception.ts` — **import it directly**, it needs no locator).

So this task likely adds *no* new `Context` fields at all. Verify that by
listing every call your moved functions make to something still in
`legacy.js`, and add an entry only for what that list actually contains. If it
is empty, say so — that is the good outcome, not a missed step.

- [ ] **Step 4: Run the gate and commit**

The combat trace is the sensitive one here: firing, hit-stop and enemy damage
all run through this code.

```bash
npx vitest run tests/integration/combatTrace.test.ts tests/integration/wiring.test.ts
npm run typecheck && npm test
git add src/weapons/WeaponState.ts src/weapons/Hitscan.ts src/legacy.js
git commit -m "refactor: extract the weapon state machine and hitscan"
```

---

### Task 7: Player

**Files:**
- Create: `src/player/Player.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `damagePlayer`, `accelerate`, `footstep`, `playerTick`.
- Consumes: `Collision.ts` (`collides` moved there in Task 3).

- [ ] **Step 1: Move the four functions**

`playerTick` is the per-frame integrator — it reads `input` and `keys` from
`src/player/Input.ts`, `player.*` from `PlayerState.ts`, and calls `collides`
and `floorHeightAt`. All are already modules; import them directly.

- [ ] **Step 2: `damagePlayer` is called from enemy code that has not moved**

Register it through `Context`. Enemy AI (Task 10) calls it 8 times — the
heaviest single edge in the coupling table — and this is the registration that
lets Task 10 avoid an import cycle entirely.

- [ ] **Step 3: Run the gate and commit**

The prologue trace is the sensitive one — it is 900 frames of movement.

```bash
npx vitest run tests/integration/trace.test.ts tests/integration/combatTrace.test.ts
npm run typecheck && npm test
git add src/player/Player.ts src/legacy.js
git commit -m "refactor: extract the player movement and damage"
```

---

### Task 8: Interaction, pickups, and projectiles

Two small, low-coupling sections, grouped because neither is worth its own
review cycle and they do not interact.

**Files:**
- Create: `src/player/Interact.ts`, `src/fx/ProjectileTick.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `interact`, `itemsTick`, `doorTick`, `propTick`, `torchTick` from
  `Interact.ts`; `projTick` from `ProjectileTick.ts`.

- [ ] **Step 1: Move interaction and pickups**

`interact` is one of the input hooks `legacy.js` registers via
`setInputHooks({...})` (Plan 0C). Once it moves, that block's
`interact:()=>interact()` entry must import from the new module. Read the block
before editing; Plan 0D's Task 5 broke a neighbouring entry by editing that
block carelessly.

- [ ] **Step 2: Move `projTick`**

It calls `damagePlayer` (Task 7's `Context` entry) and reads
`projectiles.nails/orbs` from `src/fx/Projectiles.ts`. Note the near-collision:
`src/fx/Projectiles.ts` is the *state* object from Plan 0D and
`src/fx/ProjectileTick.ts` is the *logic* — do not merge them, and do not name
the new file `Projectiles.ts`.

- [ ] **Step 3: Run the gate and commit**

```bash
npx vitest run tests/integration/trace.test.ts tests/integration/combatTrace.test.ts
npm run typecheck && npm test
git add src/player/Interact.ts src/fx/ProjectileTick.ts src/legacy.js
git commit -m "refactor: extract interaction, pickups and the projectile tick"
```

---

### Task 9: Damage and death

**Files:**
- Create: `src/enemies/Damage.ts`, `src/enemies/Death.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `damageEnemy`, `severLimb`, `refreshSeverSprite` from
  `Damage.ts`; `killEnemy`, `spawnHead`, `headTick`, `dropAmmo`, `bossDeath`,
  `openExit` from `Death.ts`.
- **CORRECTION (made before Task 9 ran).** `dropAmmo` was originally assigned to
  `Damage.ts`. That split is circular: `damageEnemy` (Damage) calls `killEnemy`
  (Death) and `killEnemy` calls `dropAmmo` (`legacy.js:208`), so the two files
  would import each other and `madge --circular` — a hard gate in `npm test` —
  would fail. `dropAmmo` moves to `Death.ts` instead, which makes
  `Damage.ts -> Death.ts` the only cross-file edge. It is also the better
  grouping on merit: `dropAmmo` is a death drop, and its only other caller
  (`legacy.js:437`, the AI section) is itself inside a death branch.
- `wakeBoss`, `roarFor` and `cineTick` are grouped with this section in
  `legacy.js` but are boss-brain concerns — they move in Task 10. Confirm by
  reading them and note it for the next implementer.

- [ ] **Step 1: Register `damageEnemy` from its real home**

Task 6 registered `ctx.damageEnemy` from `legacy.js`. Move the registration to
`Damage.ts`. The call sites in `Hitscan.ts` do not change — verify that by
reading them, and say so in your report; if a call site needs editing, the
`Context` indirection was not set up correctly in Task 6 and that is worth
flagging.

- [ ] **Step 2: The DAMAGE↔ENEMY-AI cycle**

`killEnemy` calls into ENEMY AI (3 sites) and ENEMY AI calls damage (7 sites).
Task 10 has not run, so the AI half is still in `legacy.js` — route this
direction through `Context` too. After Task 10, both halves are modules and the
`Context` entries are what keep them acyclic.

- [ ] **Step 3: Run the combat trace explicitly, then the gate**

This is the task Task 1 exists for. If `combatTrace.test.ts` fails here, a
damage or death path changed — read the frame it names before changing anything
else.

```bash
npx vitest run tests/integration/combatTrace.test.ts
npm run typecheck && npm test
git add src/enemies/Damage.ts src/enemies/Death.ts src/legacy.js
git commit -m "refactor: extract enemy damage and death"
```

---

### Task 10: Enemy AI

The largest section (352 lines) and the most coupled. Everything it calls is now
a module or a `Context` entry.

**Files:**
- Create: `src/enemies/ai/Locomotion.ts`, `src/enemies/ai/Behaviors.ts`,
  `src/enemies/ai/Attacks.ts`, `src/enemies/Boss.ts`
- Modify: `src/enemies/ai/Perception.ts`, `src/legacy.js`

**Interfaces:**
- Produces: `los`, `alertSound` from `Perception.ts`; `moveEnemy` from
  `Locomotion.ts`; `enemyTick` from `Behaviors.ts`; `fireOrb`, `throwFlesh`,
  `spawnRing`, `ringTick`, `spawnStrike`, `strikeTick`, `poisonTick` from
  `Attacks.ts`; `wakeBoss`, `roarFor`, `cineTick`, `priestTeleport`,
  `priestThink` from `Boss.ts`.

- **CORRECTION (made before Task 10 ran).** `moveEnemy` was originally grouped
  with `enemyTick` in `Behaviors.ts`. That split is circular, the same failure
  as Task 9's: `enemyTick` calls `priestThink`, `wakeBoss` and `roarFor`
  (`legacy.js:252,296,308`) so `Behaviors -> Boss`, while `priestThink` calls
  `moveEnemy` (`legacy.js:415,445`) so `Boss -> Behaviors`. `madge --circular`
  would fail.

  `moveEnemy` moves to its own leaf, `Locomotion.ts`. It earns one: it is a
  12-line movement primitive whose only calls are to already-migrated modules
  (`solidAt`, `explodeBarrel`, `breakProp`, `world`), it is shared by two
  callers in different files, and it is locomotion rather than perception, so
  folding it into `Perception.ts` would misname it. The alternative — moving
  the priest brain into `Behaviors.ts` — would break the cycle too but dilute
  what `Boss.ts` means. The resulting graph is a clean DAG:

  ```
  Behaviors -> Perception, Locomotion, Attacks, Boss
  Boss      -> Perception, Locomotion, Attacks
  Attacks, Locomotion, Perception -> (leaves, w.r.t. AI)
  ```

- [ ] **Step 1: Check the size gate before you split**

352 lines across four files should fit comfortably, but `enemyTick` alone is
large. Measure it first; if `Behaviors.ts` would exceed 400 lines, split
`enemyTick`'s per-archetype branches rather than letting the gate fail at commit
time.

- [ ] **Step 2: `Perception.ts` already exists — add `los` to it**

Task 5 created it early with `alertSound`, because `explodeBarrel` needed it
and it is a zero-dependency leaf. Add `los` alongside; do not create a second
file.

- [ ] **Step 3: Move the files one at a time, testing between each**

Order follows the DAG, leaves first: `Perception.ts` (add `los`),
`Locomotion.ts`, `Attacks.ts`, `Boss.ts`, then `Behaviors.ts` (which calls all
four). Run `npx vitest run tests/integration/combatTrace.test.ts` after each —
352 lines is too much to debug as one red test.

- [ ] **Step 4: Retire the `Context` entries this task makes unnecessary**

After this task, `damageEnemy`, `damagePlayer` and the AI entries are all
modules. Any `Context` entry whose only purpose was bridging to unmoved code can
now become a direct import **if and only if** doing so does not create a cycle —
check each with `madge --circular src/` after removing it, and keep the ones
that genuinely break cycles. Record which you removed and which you kept, with
the cycle each kept one prevents. This is how `Context` shrinks rather than
becoming permanent.

- [ ] **Step 5: Run the gate and commit**

```bash
npx vitest run tests/integration/combatTrace.test.ts tests/integration/trace.test.ts
npm run typecheck && npm test
git add src/enemies src/legacy.js
git commit -m "refactor: extract the enemy AI, attacks and boss brains"
```

---

### Task 11: Random events and ambience

The last two small sections 0E owns.

**Files:**
- Create: `src/world/RandomEvents.ts`, `src/world/Ambience.ts`
- Modify: `src/legacy.js`

**Interfaces:**
- Produces: `eventTick` from `RandomEvents.ts`; `ambience`, `vitalsAudio` from
  `Ambience.ts`.

- [ ] **Step 1: Note the name near-collision**

`src/world/AmbienceState.ts` (Plan 0D) holds the timers; `src/world/Ambience.ts`
holds the functions that read them. Two files, one subject — the same split as
`Projectiles.ts`/`ProjectileTick.ts` in Task 8. Do not merge them; the state
object is imported by other code and moving it is out of scope.

- [ ] **Step 2: `eventTick` does NOT call into the piano — this task needs no `Context` work**

**CORRECTION (measured before Task 11 ran).** This step previously read
"`eventTick` calls into the piano — the darkness/bell events touch `openPiano`
(Plan 0F), route through `Context`, as Task 5 did for `buildPiano`". Every part
of that is wrong:

- `eventTick` contains **no piano reference at all**. Its three branches are the
  blackout (torch lights + ambient intensity), the bells (`bellToll`, enemy
  `frenzy`) and the whispers (`blip`). Grep it and see.
- Task 5 never routed `buildPiano` through `Context` either; that claim was a
  separate plan error, corrected earlier — `buildPiano` is called by
  `startGame`, which stays in `legacy.js` for Plan 0F.

All three functions in this task reach only already-migrated modules:
`bellToll`/`startBossMusic` (`audio/Ambient.ts`), `blip`/`bang`
(`audio/Sfx.ts`), `showMsg` (`ui/HudMessages.ts`), `say` (`ui/Subtitles.ts`),
`rnd` (`utils/math.ts`), plus the state objects and `ctx()` from
`audio/AudioEngine.ts`. **Import everything directly. Add no `Context` entry** —
the locator shrank to three entries in Task 10 and this task must not grow it.

Note also that `WHITE`, `BLACK` and `KEYMAP` sit immediately after `eventTick`
in `legacy.js`. They are the **piano's** constants, read by `buildPiano` and
`pianoKeyDown`, and belong to Plan 0F. They are not part of this task.

- [ ] **Step 3: Run the gate and commit**

```bash
npm run typecheck && npm test
git add src/world/RandomEvents.ts src/world/Ambience.ts src/legacy.js
git commit -m "refactor: extract random events and the ambient audio tick"
```

---

### Task 12: Whole-branch review and merge

- [ ] **Step 1: Confirm what is left**

Re-run Task 1 Step 1's section script. What remains in `legacy.js` should be
only: the piano, level end/win/HUD, idle quips, main loop and boot, plus the
`Context` registrations and imports. Anything else is either an oversight or a
deliberate deferral — say which, in the task report.

- [ ] **Step 2: Retire the `SceneRef` mirror if it is now dead**

Task 5 Step 4 deferred this. Check whether any module still calls `getScene()`;
if none does, delete `src/render/SceneRef.ts` and the `setScene` call in
`loadLevel`. If the FX modules still call it, leave it and record why.

- [ ] **Step 3: Audit what `Context` still holds**

List every remaining entry and the cycle it prevents. Anything that prevents no
cycle should be a direct import. Update KNOWN-2 in `docs/known-issues.md` with
the real remaining set — the spec's target is that it holds only the renderer
and audio engine by the end of Phase 5, so recording the trajectory matters.

- [ ] **Step 4: Sabotage the new seams**

For each extracted system, break one call site and confirm the suite fails.
Cover at least: a `Context` entry pointing at the wrong function, a collision
query returning the wrong axis, and an enemy-damage constant.

- [ ] **Step 5: Verify in the served game**

`npm run dev`, load the prologue and chapter 1, fight, take damage, die, and
finish a level. Note the environment gotcha in `docs/STATUS.md`: the browser
pane throttles `requestAnimationFrame` to zero when it is not displayed, so if
`document.hidden` is true the loop will not run and only module state is
checkable.

- [ ] **Step 6: Update the docs and merge**

`docs/STATUS.md`: the 0E row to **merged**, real burn-down and test counts, and
the next action. Record any new findings in `docs/known-issues.md`.

---

## Definition of done for Plan 0E

- [ ] `src/legacy.js` holds only the piano, level end/win/HUD, idle quips, the main loop and boot, plus `Context` wiring
- [ ] The combat trace exists, is proven to fail on all five Task 1 sabotages, and passes
- [ ] KNOWN-10 is closed
- [ ] Every `Context` entry that remains prevents a named import cycle; the rest are direct imports
- [ ] `npm run typecheck` clean; `npm test` passes; no import cycles; no `src/` file over 400 lines except `legacy.js`
- [ ] `npm run dev` plays identically to `reference/sonsurum.html`
- [ ] `docs/STATUS.md` and `docs/known-issues.md` reflect reality

## What comes next

**Plan 0F** — UI, the piano, the loop and boot; then hardening: moving the four
gameplay `setTimeout` calls to a scheduler (KNOWN-3), the dispose registry,
`strict: true`, and the Three.js upgrade. `src/legacy.js` reaches zero there.
