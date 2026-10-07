// @vitest-environment jsdom
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent, type TraceFrame } from "./gameplayTrace";
import { S } from "../../src/core/State";
import { MONOLOGUE } from "../../src/content/monologue";

/**
 * The combat trace — closes KNOWN-10. `trace.test.ts` plays the prologue,
 * which loads with eight enemies but stops short of hell, so it meets two of them
 * and lands no hit (see that file's own header), so nothing
 * on the combat-resolution path — `damagePlayer`, `damageEnemy`,
 * `killEnemy`, `enemyTick`, `los`, and everything else Plan 0E's DAMAGE/
 * DEATH and ENEMY AI carves move — is exercised by it at all. This file
 * plays level 1 instead, far enough into it that the player actually meets some of
 * them. **Level 1 was rebuilt** (deeper-levels plan, Task 3: 23 enemies, `z×6 j×3 m×3 s×3 g×3 f×2 t×2 U`), and this fixture with it: see the last section,
 * "Deeper levels, Task 3 — twelfth regeneration". It is the account of the fixture as it stands now. Every section before it is the history of the fixture
 * as it was recorded on the old level (the great hall, the corridor and the west room): what they say of that layout, those frames, those numbers and that
 * route was measured then and is kept as the record of why each regeneration happened. They are not claims about the fixture today, and where a claim there
 * is still true of it the last section says so, having measured it again.
 *
 * The roster used to read `… s A`, 15 enemies. The fifteenth was the `A`
 * in the secret alcove — an armour pickup the level author wrote, turned
 * into a 260 hp Mancubus by KNOWN-11's enemy-before-item dispatch. It is
 * armour now, and the sections below marked "player feedback round 2" are
 * the ones that changed because of it.
 *
 * **This fixture was recorded before Plan 0E moved any system out of
 * `src/legacy.js`.** Its entire value is being a pre-migration recording —
 * a later task's refactor is correct only if this file still diverges
 * nowhere from it. Regenerating it (`WRITE_TRACE=1`) to make a red build
 * green destroys that value the same way it would for `trace.test.ts`;
 * see that file's header for the full argument. Don't. (The one exception is a level that is rebuilt on purpose, which invalidates this
 * recording by changing what it records: the deeper-levels plan says to follow this header's procedure then, and the last section is that.)
 *
 * ## Getting to level 1, and then to a fight (the old level 1: history, see the last section for today's)
 *
 * `runTrace`'s `level` option (see `gameplayTrace.ts`) opens the chapter
 * select screen and clicks level 1's row instead of `NEW GAME`. From there
 * the player has to actually walk to the enemies — level 1's start room
 * only connects to the rest of the level through a single 1-cell-wide
 * corridor (`src/world/levels/level1.ts`'s `hall(g,9,30,9,24,1)`), gated by
 * a closed door (`g[27][9]="+"`) that needs `interact()` (`KeyE`, while
 * facing it within ~2.6 units) to open — nothing in `trace.test.ts`'s
 * script needed to deal with either, since the prologue has neither. The
 * script below turns to face the corridor with a movementX magnitude
 * computed from `Input.ts`'s exact mouse sensitivity (`π/sens`, so the
 * player ends up within microradians of due north — a residual as small as
 * a naively-rounded turn amount, ~0.05 rad, is enough to drift the player
 * into a dead corner over hundreds of frames of holding forward into a
 * wall), then taps `KeyE` every 20 frames through the whole approach so
 * the door opens whenever the player happens to be in range and facing it,
 * without needing to know the exact frame that happens.
 *
 * Once through — measured live to land around frame 1400 — the script
 * stops walking and turns the player into a standing turret: a slow
 * rotation (computed the same way as the entry turn, in fractions of a
 * full revolution) while firing on a tight cadence, so the aim sweeps past
 * whatever bearing an approaching enemy is at, not just a narrow forward
 * arc. That is what actually produces the fight — a script that only
 * fires straight ahead while walking, the way `trace.test.ts`'s does,
 * never lands a hit here, because the pistol's hitscan needs the shot
 * within roughly half an enemy's width of dead-center (see `hitscan()`),
 * far narrower than any small look-sweep while advancing.
 *
 * The run is cut off (`TOTAL_FRAMES`) shortly after the fight's one kill
 * and well before the player's hp would otherwise reach 0 a few dozen
 * frames later — this script is lethal in both directions, and a fixture
 * of the player already dead is a worse net than one of them still
 * fighting (the committed fixture ends at `"HEALTH61"` as of Task 3's stub
 * retune — `"HEALTH55"` before it, same idea — armour-absorbed from what
 * would be a much lower number without the seeded armour below).
 * `document.exitPointerLock` needed a stub in `gameplayTrace.ts` as
 * insurance against this: it is called from `damagePlayer`'s death branch,
 * which this trace's committed recording never reaches but a weakened
 * armour-absorb sabotage against it does (see the task report).
 *
 * ## The four observables, and one more `runTrace` cannot see
 *
 * The brief for this task named four things a degraded run would lose,
 * asserted below. **Three are genuinely combat-specific** and cannot be
 * produced by a script that never meets an enemy: `hud.hp` drops below
 * `"HEALTH100"`, a frame where `scene.count` decreases, and an `hud.subt`
 * frame holding one of the `MONOLOGUE`'s `see_*` sighting lines.
 *
 * **The fourth — more than one distinct `hud.wname` — is not.** Checked
 * empirically against the committed `trace-level0.json` (the zero-enemy
 * prologue fixture): it holds exactly the same two values this file's
 * fixture does, `"FLARE PISTOL"` and `"FLARE PISTOL — RELOADING"`, because
 * `trace.test.ts`'s script also holds `KeyR` long enough to complete a
 * reload. So this assertion is satisfiable by a script that never fights
 * anything — it is the "`— RELOADING` suffix" failure mode `trace.test.ts`'s
 * own header now warns about at length, reproduced here rather than
 * avoided. It is kept anyway, because it still pins that the weapon state
 * machine actually advances rather than the script silently degrading into
 * one that only walks (the same reason `trace.test.ts` keeps its own copy
 * of this check) — just don't read it as evidence of combat. None of the
 * five sabotages in the task report relied on it; each was caught by the
 * hp-drop, scene-count-decrease, scene-digest, or `S.kills` checks instead.
 *
 * A fifth check, not in the brief's four, is asserted directly against
 * `S.kills` (imported live from `src/core/State`, the same module
 * `legacy.js` mutates) rather than through a `TraceFrame` field.
 * `killEnemy`'s `if(!e.summoned)S.kills++` has no effect on the camera, the
 * scene graph, or any HUD element short of the level-end grade screen
 * (`gradeOf()`), which this trace never reaches — so sabotaging just that
 * increment is invisible to every field `runTrace` records, camera/hud/
 * scene alike, and the fixture diff below would not catch it either
 * (skipping an integer increment changes no timing and consumes no
 * `Math.random()` call, so it perturbs nothing else downstream). Reading
 * `S.kills` directly after the run is what the task brief's "widen what
 * the trace records" instruction meant in practice for this one sabotage —
 * see the task report for the sabotage run that demonstrated the need.
 *
 * ## Why the run starts with `S.armor = 50`
 *
 * **Rewritten, player feedback round 2 — the reason changed, the seed did
 * not.** This section used to say the fixture's first recorded frame,
 * `"ARMOR50"`, was a state the game could never organically reach, because
 * `loadLevel`'s dispatch checks `EDEF[ch]` before its item map and `A` is
 * both the Mancubus and the armour key, so every armour tile any level
 * author ever wrote spawned the enemy and the pickup arm was unreachable
 * dead code. That was true, it was KNOWN-11 — filed while building this
 * fixture — and it is **fixed**: all twenty `A` tiles are now `r`, an
 * item-only glyph, and `tests/integration/armourPickup.test.ts` proves
 * `S.armor` goes 0 → 50 through the real `itemsTick` in every level that
 * has one, with nothing seeded.
 *
 * The seed below stays anyway, and the distinction is worth keeping
 * straight: it is now about **reach**, not impossibility. Level 1's one
 * armour tile is in the SECRET ALCOVE behind `g[23][40]="S"`, which this
 * script never opens (see the Plan 0F Task 5 section below, which relies
 * on the same fact for a different reason). A run that did not seed
 * `S.armor` would therefore still hold 0 for all 1760 frames, and
 * `damagePlayer`'s armour-absorb branch — which this fixture is the only
 * committed recording of — would go dark. Removing the seed would cost
 * coverage and buy nothing.
 *
 * Seeding it directly in `beforeAll`, before `runTrace` boots the game, is
 * what makes `damagePlayer`'s armour-absorb branch (`src/legacy.js:1241`)
 * reachable at all — without it the branch is dead code in this trace too,
 * and that is exactly what let the armour-absorb sabotage in the task
 * report pass unnoticed on the first attempt. This is the same technique
 * `tests/integration/wiring.test.ts` already uses for `screenShake.hitStop`
 * and `player.spawnGuard`: directly assigning an exported/live state field
 * to reach a branch that the harness's own script cannot otherwise put the
 * player in. It is not a weakening of the net — it does not change what
 * `runTrace` records or relax any assertion, only the state the fight
 * starts from, the same way giving a test player a weapon they'd otherwise
 * have to walk further to find would be.
 *
 * ## Plan 0F Task 5 left this fixture byte-identical — verified, not assumed
 *
 * Task 5 moved four gameplay `setTimeout` calls onto `Time.ts`'s scaled
 * clock — `WeaponState.ts`'s power-kick hit test and `Behaviors.ts`'s
 * Mancubus second barrel, Slaughtaur second bolt and brute slam damage —
 * driven by `tickScheduled(dt)`, called every gameplay frame from the end of
 * `Loop.ts`'s `!paused&&!S.dead&&!S.won` block. A fixture recording level 1
 * combat is exactly what should catch that kind of change, and the task's
 * own brief says a run that comes back unchanged is suspicious, not lucky —
 * so before trusting the green result below, both functions were
 * instrumented with call counters for one throwaway run: `tickScheduled`
 * fires on every one of this trace's gameplay frames (1680 at the time this
 * was measured, 1760 as of Task 3's stub retune below — the scheduler is
 * genuinely wired in either way), but `schedule()` itself is called **zero
 * times**.
 *
 * That is fully explained by this fixture's own script and this level's own
 * roster, not by a dead scheduler:
 *
 * - The script (`combatScript()` below) never taps the kick key, so
 *   `doKick` — and the hit test it would schedule — never runs.
 * - The Mancubus's scheduled second barrel. **Corrected, player feedback
 *   round 2**: this bullet used to say that the level grid's
 *   `put1(g,40,25,"A")` — commented "armor" by the author — spawned level
 *   1's only `twin` (dual-barrel) enemy into the walled-off SECRET ALCOVE
 *   (`src/world/levels/level1.ts`'s `g[23][40]="S"`), which this script
 *   never opens and never gets within `los()`'s 22-unit range of, so it
 *   never reached `seen` and its ranged branch never ran. That was an
 *   argument about *this script*. It is now an argument about the game:
 *   the tile is `r`, the armour the author wrote, so level 1 contains **no
 *   `twin` enemy at all** and this site is structurally unreachable here,
 *   in the same class as the Slaughtaur and Ettin bullets below rather
 *   than merely unreached. The alcove itself is still shut, which is why
 *   the `S.armor` seed above is still needed.
 * - Level 1's roster (`U z×4 f×2 j m×2 t g×2 s A`, 15 enemies, enumerated in
 *   `src/world/levels/level1.ts`) has zero `orb==="centaur"` (Slaughtaur,
 *   key `k`) and zero `e.slam` (Ettin `n` / `B`) enemies at all — those two
 *   `Behaviors.ts` sites are structurally unreachable by this fixture
 *   regardless of script, not just unreached by this one.
 *
 * So this fixture, despite fighting and killing an enemy, exercises none of
 * Task 5's four call sites — only `enemyTick`'s generic movement/melee/LOS
 * paths, which Task 5 did not touch. Nothing was regenerated: there is
 * nothing to regenerate, since nothing diverged. A future task that adds a
 * kick, a Slaughtaur, an Ettin, or a script that opens the secret alcove
 * should expect this fixture to move for the first time and should not be
 * surprised by it.
 *
 * ## Phase 2 Part A Task 3 — regenerated twice, for two different reasons
 *
 * **First regeneration (this commit): `gameplayTrace.ts` stopped letting
 * three.js's own object bookkeeping consume the seeded gameplay stream.**
 * Every `THREE.Object3D`/`BufferGeometry`/`Material` constructor calls
 * `MathUtils.generateUUID()`, which burns four `Math.random()` calls for a
 * UUID nothing in this codebase ever reads — see `gameplayTrace.ts`'s
 * `installUuidStub` doc comment for the full mechanism and how it was
 * confirmed live. That means the number of *rendering* objects a level or
 * a frame of play happens to construct was silently perturbing *gameplay*
 * randomness — `spawnEnemy`'s dodge/flank/scream/attack timers among them
 * — for as long as this fixture has existed. Decoupling it is a harness
 * fix with `src/` completely unchanged, so it moved this fixture's `hud`/
 * `scene` fields (the flow of the fight shifted: different frames, a
 * different `see_*` line first) but must not break what the run *proves*.
 * It didn't: with the stub the only source change in this commit, all
 * five of "the recorded run actually fights"'s assertions passed —
 * including `S.kills > 0` — except that this script's original
 * `SWEEP_STEPS_USED = 12` / `TOTAL_FRAMES = 1680`, tuned live against the
 * *old* (entangled) stream, no longer lands its one kill inside that
 * budget: measured with the stub alone (no instancing), a 24-step sweep
 * out to `TOTAL_FRAMES = 1760` reproducibly kills exactly one enemy and
 * leaves the player alive with room to spare (`S.hp` in the 60s, not the
 * `S.dead` the original's 1680-frame budget hit at 24 steps, and not the
 * zero kills that 12 steps left even at 2200 frames — this needed more
 * shots in the sweep, not just more time to resolve the existing ones).
 * Both constants below were retuned to those measured values for that
 * reason alone; the sweep's shape, cadence and per-step angle are
 * unchanged.
 *
 * **Second regeneration (the following commit): instancing the level's
 * wall/pillar/platform geometry** (`src/world/LevelLoader.ts`). With the
 * stub in place first, this one moved only `scene.count`/`scene.digest`
 * — checked frame by frame, not assumed: `camera` and `hud` were
 * byte-identical to the first-regeneration fixture across all 176 sampled
 * frames, and `scene.count` moved by a constant 202-object delta at every
 * one of them (295→93 at frame 10, through 336→134 at frame 1760) — the
 * exact count of wall/pillar cells this level's `loadLevel` collapsed into
 * 2 `InstancedMesh` objects. That is the property this task's brief wanted
 * all along and could not previously assert. See that commit's report for
 * the full analysis.
 *
 * ## Phase 3 Part B Task 1 — third regeneration: this fixture can now see sprite frames
 *
 * Until this commit `digestScene` (`gameplayTrace.ts`) recorded type,
 * position and `visible` and nothing else, so **which texture an enemy
 * sprite was showing was invisible to this fixture**. Phase 3 Part A Task 2
 * priced that hole: a change chartered as type-only rewrote
 * `Behaviors.ts`'s walk guard from `e.atkAnim!==undefined&&e.atkAnim<=0` to
 * `(e.atkAnim??0)<=0` — inverting it, so every enemy cycled its walk frames
 * from spawn instead of only after its first attack — and all 463 tests
 * passed. The digest now also records each child's material texture *name*
 * (`z.a`, `z.atk`, `z.noLArm`, `item.torch[1]`, … — see `buildTextureIndex`
 * for the scheme and for why it is not `texture.uuid`) and the material's
 * colour. `scale` was measured and deliberately left out; see
 * `digestScene`'s doc comment.
 *
 * ### The regeneration, checked frame by frame
 *
 * A digest widening records more and **must change nothing the game does**.
 * Compared against the pre-widening fixture across all 176 sampled frames,
 * field by field rather than stopping at the first divergence:
 *
 * - `camera` — all seven fields **byte-identical in all 176 frames**.
 * - `hud` — each of the eight fields (`hp ar wname msg subt lvltitle
 *   bossname keys`) counted separately, **identical in all 176 frames**.
 * - `scene.count` — **identical in all 176 frames**; same 93 → 134 shape,
 *   same min and max.
 * - `scene.digest` — changed in all 176 frames, as it must: every frame
 *   holds textured children, so every part list gains `:m=`/`:c=`. First:
 *   frame 10, `3fec61e4` → `ec2dc37d` at an unchanged count of 93. Last:
 *   frame 1760, `fc62cb91` → `df11d51c` at an unchanged count of 134. 176
 *   distinct digests before, 176 after.
 *
 * ### What the new coverage is worth — two mutations, measured
 *
 * **1. The bug that motivated the plan.** Restoring `(e.atkAnim??0)<=0` at
 * `Behaviors.ts`'s walk guard now **fails this file's "diverges from the
 * fixture nowhere"**, first at frame 780. Its full footprint, measured by
 * regenerating a throwaway fixture under the mutation and comparing:
 * `camera` differs in **0** of 176 frames, `hud` in **0**, `scene.count` in
 * **0**, and `scene.digest` in **48**. That is the direct proof that the
 * old digest could not have caught it — the mutation moves nothing except
 * which texture is on a sprite — and that the new one does.
 * `tests/enemies/walkFrames.test.ts` also catches it, but it was written
 * *for* that one line; this file catches it as a trace.
 *
 * **2. The attack pose** (`Behaviors.ts`'s `e.sp.material.map=PX[e.key].atk`)
 * — chosen because it had no coverage anywhere in the suite before this
 * commit (`walkFrames.test.ts` and this harness are the only two places in
 * `tests/` that read `material.map` at all, and that file only exercises
 * the `a`/`b` walk pair). Changing that assignment to `PX[e.key].a`, so a
 * striking enemy never leaves its idle frame, also fails this file, at
 * frame 1530 with `scene.count` unchanged at 118. Both mutations were
 * reverted with a targeted edit.
 *
 * ### What this still cannot see — the honest list
 *
 * Five of the nine `material.map=` sites in `src/` are reached by this
 * fixture — one of them, the torch flicker, is reached by
 * `trace.test.ts`'s enemy-less prologue as well.
 * **The other four remain unreachable by this script and this level**,
 * and no amount of re-running changes that:
 *
 * - `Behaviors.ts`'s two-stage death collapse (`P.die1`/`P.die2`). Its
 *   branch is skipped outright for a corpse with `e.severKey` set or
 *   `deathKind===2`, and this run's kill *did* sever a limb — `z.noLArm`
 *   was what appeared in the sampled frames, not `z.die1`/`z.die2`, neither
 *   of which appeared anywhere. (Until player feedback round 2 Task 1; the
 *   kill now collapses whole — see that section.)
 * - `Death.ts`'s headless corpse (`PX[e.key].noHead||PX[e.key].hl`).
 *   Requires a decapitating kill; this run's kill is not one, and no
 *   `noHead`/`hl` texture appears in any sampled frame.
 *
 * **Both of the above were confirmed by mutation, not inferred**:
 * rewriting `Behaviors.ts`'s `want` to `P.a` and `Death.ts`'s headless
 * assignment to `PX[e.key].a` at the same time leaves both trace files
 * green. They are genuinely unreached, and this file should not be read as
 * covering them.
 *
 * The remaining two rest on structural argument, not mutation — no script
 * reaches the branch at all, so there is nothing to mutate:
 *
 * - `Boss.ts`'s phase-3 form swap and `Boss.ts`'s boss walk cycle. Both sit
 *   inside `priestThink`, which only runs for `e.priest` enemies. Level 1's
 *   only boss is `U`, THE CATHEDRAL GUARDIAN (`EnemyDefs.ts`: `boss:true,
 *   stone:true`, **no** `priest`), and it spawns dormant at grid (19,3),
 *   which this script never wakes — `U.a` is the only `U` texture that ever
 *   appears. These two are unreachable in *both* fixtures regardless of
 *   script, the same way `Behaviors.ts`'s Slaughtaur and Ettin branches
 *   are (see the Plan 0F Task 5 section above).
 *
 * ### Correction, Phase 3 Part D: all four of the above are now covered —
 * ### by a third fixture, not by this one
 *
 * Everything in the two lists above is still true *of this file*, and this
 * file should still not be read as covering any of the four. But the
 * parenthetical claim that the `Boss.ts` pair is unreachable "in *both*
 * fixtures regardless of script" was too strong: it was a statement about
 * the two fixtures that existed, dressed as a statement about the game.
 * Level 2 has a `priest` boss, and `tests/integration/bossTrace.test.ts`
 * now fights it through all three phases. That fixture reaches **all four**
 * of the sites listed above, each confirmed by mutation rather than
 * argument — including `Behaviors.ts`'s death collapse and `Death.ts`'s
 * headless corpse, which that run's kills do produce where this run's one
 * kill does not. Every `material.map=` site in `src/` is covered by at
 * least one committed trace as of that commit.
 *
 * The nine sites, and what the committed fixtures actually showed **until
 * player feedback round 2 Task 1** (its section at the end of this header
 * has the current state — the sever frame and the death collapse swapped):
 * walk cycle **covered** (`j.a`/`j.b` both appear), attack pose **covered**
 * (`z.atk`, `g.atk`, demonstrated by mutation above), hurt/sever frame in
 * `Damage.ts` **covered** (`z.noLArm`), torch flicker **covered**
 * (`item.torch[0]`/`[1]`, in both fixtures), death collapse **not**,
 * headless corpse **not**, both `Boss.ts` sites **not**.
 *
 * The ninth — `Behaviors.ts`'s post-attack stance restore, the `else if
 * (e.wasAtk)` arm — is **reached but only weakly covered**, and the
 * distinction is worth keeping straight. It necessarily executes (it is the
 * only exit from the attack pose, and the attack pose is covered), but it
 * writes the same `set[e.frame]` texture the walk cycle writes and holds it
 * for as little as one frame, so whether a mutation there is caught depends
 * on a sampled frame landing on it. Counted as covered in the five above
 * only in the sense that it runs; do not lean on it.
 *
 * ## Player feedback round 2 — fourth regeneration: level 1 has one fewer enemy
 *
 * KNOWN-11's fix retags level 1's `put1(g,40,25,"A")` to `"r"`, so the
 * secret alcove holds the +50 armour the author wrote instead of a 260 hp
 * Mancubus. This is a **deliberate content change**, not a harness change
 * and not a refactor, so unlike the three regenerations above it is
 * *expected* to move the fight — a fixture that came back byte-identical
 * would have meant the fix had not reached the level.
 *
 * The mechanism for the divergence is entirely the seeded `Math.random()`
 * stream, and it is arithmetic rather than inference: `spawnEnemy`
 * (`src/world/LevelLoader.ts`) draws **seven** values per enemy (the elite
 * roll, `dodgeT`, `flank`'s sign and magnitude, `lungeT`, `slamT`,
 * `flingCD`) and adds **two** scene children (`addSprite` + `addBlob`); the
 * item branch draws **one** (`bob`) and adds **one** (`addSprite`). So that
 * single cell now consumes six fewer draws at load and contributes one
 * fewer child, and every `Math.random()` in the rest of the run is shifted
 * by six. `installUuidStub` already keeps three.js's own UUID draws out of
 * this stream (Phase 2 Part A), so six is the whole of it.
 *
 * Compared field by field against the pre-fix fixture, all 176 sampled
 * frames, rather than stopping at the first divergence:
 *
 * - `scene.count` — differs in **174** of 176 frames, first at frame 10,
 *   `93 → 92`. The delta is **-1 in 158 frames**, which is exactly
 *   `2 - 1` (the Mancubus's sprite and blob leaving, the armour sprite
 *   arriving) and is the load-time floor of the whole run; the other 16
 *   (-2 x15, -4 x1) are frames where the fight's own transient children —
 *   gibs, particles, decals — land a frame or two differently under the
 *   shifted stream. Range `93..134` → `92..134`; the last sampled frame is
 *   134 in both, because by then the run's transients dominate the
 *   one-object floor.
 * - `scene.digest` — differs in **all 176**, as it must once the child list
 *   changes at frame 10. 176 distinct digests before, 176 after.
 * - `hud.subt` — differs in **52** frames, first at frame 90:
 *   `"A dungeon. Of course it's a dungeon…"` → `"Stone walls, chains,
 *   screaming in the distance…"`. Both are `MONOLOGUE.lvl1` lines; this is
 *   `pick()` reading a shifted stream, not a different event.
 * - `hud.hp` / `hud.ar` — differ in **24** frames each, first at frame
 *   1530 (`HEALTH91 → HEALTH94`, `ARMOR36 → ARMOR41`). The player takes
 *   *less* damage in the new run and ends at `HEALTH68`/`ARMOR2` instead
 *   of `HEALTH61`/`ARMOR0`. Not because an enemy left — the Mancubus was
 *   dormant behind a shut secret door and never fought — but because the
 *   shifted stream moves enemy attack cadence. Both are still far from
 *   death, which is what the cutoff below is tuned for.
 * - `hud.wname`, `hud.msg`, `hud.lvltitle`, `hud.bossname`, `hud.keys` —
 *   **identical in all 176 frames**.
 * - `camera` — differs in **8** of 176 frames, first at 1540, and only in
 *   `y` and `rz` (`0.999774 → 1`, `0.00043 → 0`): screen shake from damage
 *   landing on different frames, decaying to nothing. The player's `x`/`z`
 *   path is untouched, which is the expected shape — the script is
 *   open-loop and the alcove is nowhere near it.
 *
 * All five of "the recorded run actually fights"'s assertions still pass
 * unchanged, `S.kills > 0` included; nothing about the script, the seed,
 * `TOTAL_FRAMES` or `every` was retuned. `trace-level0.json` (the prologue)
 * is byte-identical — checksummed, not assumed — because the prologue
 * places no armour tile.
 *
 * ## Phase 2B gothic trim — fifth regeneration: two more scene children
 *
 * `src/world/Trim.ts` adds the level's trim as at most two `InstancedMesh`
 * scene children; level 1 has pillars, so it gets both (`wallCourse`,
 * `pillarTrim`), plus a `secretCourse` *child of the secret door's mesh*,
 * which the digest does not see (it reads top-level children only). The
 * module draws no `Math.random()` and `installUuidStub` keeps three's UUID
 * draws out of the seeded stream, so unlike the fourth regeneration above,
 * the fight itself must not move. Compared field by field against the
 * pre-trim fixture, all 176 sampled frames:
 *
 * - `camera` — all seven components **identical in all 176 frames**.
 * - `hud` — all eight fields **identical in all 176 frames**; the run still
 *   ends `HEALTH68`/`ARMOR2`, `"LIMB SEVERED"`.
 * - `scene.count` — **+2 in every one of the 176 frames**, no other delta
 *   (92..134 → 94..136).
 * - `scene.digest` — differs in all 176. First: frame 10, `f872e283` →
 *   `039f37df`. Last: frame 1760, `43c0921f` → `1ca8357d`. 176 distinct
 *   digests before and after.
 *
 * Confirmed rather than inferred: with `digestScene` temporarily filtering
 * out the two trim children, this run reproduced the pre-trim fixture byte
 * for byte. `gameplayTrace.ts` is unchanged by this commit. Where the trim
 * sits is invisible to this fixture (instance matrices are not hashed);
 * `tests/world/trim.test.ts` owns placement.
 *
 * ## Trim bands — sixth regeneration: the course changes texture
 *
 * The wall courses wear the theme's stone band instead of the wall texture
 * (`src/render/BandTextures.ts`; here `tex.dungeonWall` -> `band.dungeon`).
 * The bands are built at boot from an integer hash, not `Math.random`, so
 * the fight had no mechanism to move. Field by field against the pre-band
 * fixture, all 176 sampled frames:
 *
 * - `camera` — all seven components **identical in all 176 frames**.
 * - `hud` — all eight fields **identical in all 176 frames**; the run still
 *   ends `HEALTH68`/`ARMOR2`, `"LIMB SEVERED"`.
 * - `scene.count` — **identical in all 176 frames** (94..136).
 * - `scene.digest` — differs in all 176: `wallCourse` is a scene child in
 *   every frame and its part string carries the texture name. (The
 *   `secretCourse` on the secret door's mesh wears the same band, but the
 *   digest reads top-level children only.) First: frame 10, `039f37df` ->
 *   `5f395ae7`. Last: frame 1760, `1ca8357d` -> `ab06551b`. 176 distinct
 *   digests before and after.
 *
 * Confirmed rather than inferred, and with a stronger test than the trim
 * regeneration's filter: with `loadLevel` temporarily handing `buildTrim`
 * the wall texture again — the four bands still built at boot by
 * `startGame`, still indexed as `band.*` — this run and both other traces
 * reproduced the pre-band fixtures byte for byte. So building the bands
 * took nothing from the seeded stream, adding `BANDTEX` to
 * `buildTextureIndex` renamed nothing, and that one argument is the whole
 * of this diff. `gameplayTrace.ts` changed in this commit only by indexing
 * `BANDTEX` as a fourth source.
 *
 * **What the trap this avoided would have cost, measured on this fixture.**
 * With the band's grain drawn from `Math.random()` instead of the hash — one
 * draw per texel, at boot, inside the seeded window — a throwaway
 * regeneration differed from this one in `camera` in **12** of 176 frames
 * (x, height and roll — the three components screen shake writes), in
 * `hud` in **76** (the run ended `HEALTH61`/`ARMOR0` instead of
 * `HEALTH68`/`ARMOR2`) and in `scene.count` in **17**; the
 * prologue's `hud.subt` moved in 26 of its 90. A texture moved the fight.
 * `tests/render/bandTextures.test.ts` now fails by name on exactly that
 * mutation, before any fixture has to.
 *
 * ## Door arches — seventh regeneration: one more scene child
 *
 * `src/world/Arches.ts` puts a pointed arch head in every plain and locked
 * doorway with a wall either side, as one `InstancedMesh` scene child named
 * `doorArch`. Level 1 has one such door, (9,27); its other two plain doors
 * (one free-standing, one walled in) and its secret door get none. The
 * module draws nothing from `Math.random`, shares nothing with gameplay and
 * is read back by nothing. Field by field against the pre-arch fixture, all
 * 176 sampled frames:
 *
 * - `camera` — all seven components **identical in all 176 frames**.
 * - `hud` — all eight fields **identical in all 176 frames**; the run still
 *   ends `HEALTH68`/`ARMOR2`.
 * - `scene.count` — **+1 in every one of the 176 frames**, no other delta
 *   (94..136 -> 95..137).
 * - `scene.digest` — differs in all 176, necessarily, since the child list
 *   gained a member. First: frame 10, `5f395ae7` -> `7f17b36c`. Last: frame
 *   1760, `ab06551b` -> `e48c0502`. 176 distinct digests before and after.
 *
 * Confirmed rather than inferred, the same way the bands were: with only
 * the one `buildArches(...)` call taken out of `loadLevel` — the module, its
 * import and its shadow-policy entry all still in place — a `WRITE_TRACE=1`
 * run reproduced all three pre-arch fixtures **byte for byte** (md5 equal).
 * So that call is the whole of this diff. The prologue fixture did not move
 * at all: the prologue has no doors.
 *
 * ## Player feedback round 2 Task 1 — eighth regeneration: sound stopped rolling the game's dice
 *
 * `docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md` Task 1,
 * closing `docs/known-issues.md` KNOWN-22. Every sound used to draw from the
 * `Math.random()` this harness seeds for gameplay; sound now has its own
 * generator and shared noise, so this run's **264 sound draws** (207
 * sample/pitch/rate values, 57 that decide whether or when a later sound
 * plays) left the stream and every later gameplay draw re-indexed.
 * `trace.test.ts`'s section of the same name carries the three-step proof
 * that this is the *only* change — old code with sound's draws made but
 * ignored reproduces the old fixture byte for byte; old code with them
 * removed equals this fixture byte for byte — and it held for this fixture
 * exactly as for the other two. Field by field against the pre-change
 * fixture, all 176 sampled frames:
 *
 * - `camera` — **11 frames**, first at **1560**, only `x`, `y` and `rz`
 *   (largest deltas 0.0058, 0.0094, 0.0109): screen shake from hits landing
 *   on different frames. The walk and the turret sweep are open-loop and
 *   untouched; `ry`/`rx`/`fov` and `z` identical everywhere.
 * - `hud.subt` — **52 frames**, first at **90**: `pick()` choosing a
 *   different `MONOLOGUE.lvl1` line from a re-indexed stream (`"Stone
 *   walls, chains…"` -> `"A dungeon. Of course it's a dungeon…"`).
 * - `hud.hp` / `hud.ar` — **4 frames** each, first at **1560**
 *   (`HEALTH94`/`ARMOR41` -> `HEALTH90`/`ARMOR34`): one hit lands 20 frames
 *   earlier. The run still ends **`HEALTH68`/`ARMOR2`**, the same as before.
 * - `hud.msg` — **10 frames**, first at **1670**: `"LIMB SEVERED"` -> `""`.
 *   **The run's one kill no longer severs a limb; the zombie now dies whole
 *   and collapses.** Whether a heavy hit severs is a roll
 *   (`heavy||Math.random()<.5`), and the roll moved. See the coverage note
 *   below — this is the one change here with a consequence.
 * - `hud.wname`, `lvltitle`, `bossname`, `keys` — **identical in all 176**.
 * - `scene.count` — **13 frames**, first at **1640** (`121` -> `120`),
 *   every delta negative (-1 to -14): no severed arm, so no flying chunk,
 *   no stump gibs and less blood. Range `95..137` -> `95..123`.
 * - `scene.digest` — **all 176**, first at frame 10 (`7f17b36c` ->
 *   `c4a21a3a`), last at 1760 (`e48c0502` -> `a327c77b`); 176 distinct
 *   digests before and after.
 *
 * All six "the recorded run actually fights" assertions pass unchanged
 * (`S.kills > 0` included); nothing about the script, the seed,
 * `TOTAL_FRAMES` or `every` was retuned.
 *
 * ### Coverage, re-measured against this fixture
 *
 * The `material.map=` mutations this header describes were re-run against
 * the regenerated fixture, each by regenerating a throwaway copy under the
 * mutation and comparing all 176 frames (`camera`, `hud` and `scene.count`
 * differ in 0 frames in every case; only the digest moves):
 *
 * - the walk-guard inversion (`(e.atkAnim??0)<=0`) — red in **55** frames,
 *   first at **780**, as before;
 * - the attack pose rewritten to `PX[e.key].a` — red in **5** frames, first
 *   at **1560** (was 1530);
 * - **the two-stage death collapse (`P.die1`/`P.die2` -> `P.a`/`P.b`) is now
 *   reached by this fixture** — red in **10** frames, 1670-1760 — because
 *   the kill now collapses. The "honest list" above said this run could not
 *   reach it; that was true of the fixture before this regeneration;
 * - **`Damage.ts`'s sever frame (`refreshSeverSprite`, `P[key]||P.a` ->
 *   `P.a`) is reached by no committed trace any more** — red in 0 frames of
 *   all three. The coverage summary above credits this fixture with it
 *   (`z.noLArm`); that is no longer true. It is covered instead by a direct
 *   assertion added to `tests/integration/dismembermentThreshold.test.ts`
 *   (the severed ghoul's sprite is `PX.z.noLArm`), which the same mutation
 *   turns red. The headless corpse stays unreached here, as before; the
 *   boss trace covers it.
 *
 * ## Player feedback round 2, the stride — ninth regeneration: the camera bob slowed down
 *
 * `Player.ts`'s `bobT` rate went `1.6` -> `0.45` (2.0 steps a second walking,
 * 3.0 sprinting, was 7.1 and 10.7; the owner reported the weapon and the
 * footsteps swaying far too fast). `trace.test.ts`'s section of the same
 * name has the mechanism and the three-part proof; it held here exactly.
 * Field by field against the pre-change fixture, all 176 sampled frames:
 *
 * - `camera` — `y` in **116 frames**, first at **50** (`1.000419` ->
 *   `1.000118`), last at 1460, largest at 1260 (0.0460). `x`, `z`, `rx`,
 *   `ry`, `rz`, `fov` — **identical in all 176**.
 * - `hud` — all eight fields **identical in all 176**. The fight is the
 *   same fight: same hits on the same frames, same kill, same ending.
 * - `scene.count` — **identical in all 176** (95..123).
 * - `scene.digest` — differs in **136**, first at **410** (`f664a199` ->
 *   `e76de1b3`), last at 1760 (`a327c77b` -> `f9d72ed8`); 176 distinct
 *   before and after. 2075 differing parts — 1968 bullet holes and 107
 *   muzzle lights — and **every one differs in `position.y` alone**: they
 *   are placed at the camera's height, or where a ray from it meets a wall.
 *   Every sprite's texture, every visibility and every position but those
 *   heights is identical frame for frame, so the `material.map=` coverage
 *   the sections above re-measured is untouched: a mutation that changes a
 *   texture still differs from this fixture on the same frames it did.
 *
 * Old `y` minus old bob equals new `y` minus new bob in every frame (to
 * 1.1e-16), and with the bob term taken out of the camera both rates give
 * this fixture byte for byte.
 *
 * ## Levels-feel-full Task 2 — tenth regeneration: level 1 is furnished, and the fight did not move
 *
 * `src/world/levels/dress1.ts` dresses the great hall as a torture hall (a slab, racks, stocks,
 * cages, iron maidens), the vestry as a chancel, the east wing as a store, and every wall and
 * corner with the dungeon's clutter: 187 pieces merged into 27 scene meshes, 24 of the pieces
 * solid masses (`src/world/decor/masses.ts`: a point inside one is a wall to `solidAt`, so it stops
 * the player, the enemies, the shots and the line of sight). `level1.ts` also moved two
 * pickups and added two explosive barrels in the hall. This is a **deliberate content change**,
 * the kind of regeneration the header above says to expect for one, so the account is owed field
 * by field. All 176 sampled frames, against the fixture as it stood at commit `64b4e8d`:
 *
 * - `camera` — all seven components **identical in all 176 frames**.
 * - `hud` — all eight fields **identical in all 176**; the run still ends `HEALTH68`/`ARMOR2`.
 * - `scene.count` — **+31 in every one of the 176 frames**, no other delta (95..123 -> 126..154).
 *   The 31 is exactly 27 (the dressing: one merged mesh per shadow class and material, and there
 *   are 27 of those in level 1's list, which `costOf` reports without booting a scene) plus 4
 *   (two barrels, each a prop mesh and its blob).
 * - `scene.digest` — differs in all 176, first at frame 10 (`c4a21a3a` -> `3bf3a1dd`), last at
 *   1760 (`f9d72ed8` -> `ebe61469`); 176 distinct digests before and after.
 *
 * **Why the fight had no mechanism to move, and how each piece of the change was checked.**
 *
 * 1. *The decor draws nothing.* It is placed from the integer hash (`grain`), never `Math.random`
 *    (`tests/world/levelDressing.test.ts` spies on it), and `installUuidStub` keeps three's UUID
 *    draws out of the stream, so 27 more meshes shift no gameplay draw. Two throwaway
 *    regenerations bracket it: with `dress1.ts` returning `[]` (barrels and moved pickups kept)
 *    the difference from `64b4e8d` is `scene.count` **+4 in all 176**, `camera` and `hud`
 *    identical, digest different; so the 27 are the decor and only the decor. (The digest reads
 *    top-level children's type, position, visibility and texture, not a merged mesh's geometry, so
 *    it sees the decor only as the 27 children it adds.)
 * 2. *The pickups moved without crossing an enemy.* `loadLevel` draws in scan order — a torch, a
 *    candle or a pickup one value, an enemy seven — so an enemy's values depend on how many
 *    draws precede it. The bullets box (4,32) and the health pack (9,32) went to (19,25) and
 *    (26,25): between the old and the new cell, in scan order, there is no enemy, so every
 *    enemy is handed exactly the draws it always was (`U@19,3:0 z@17,12:11 f@29,12:18 j@10,13:25
 *    … z@34,34:108`, asserted in `levelDressing.test.ts`; the torches at (31,25), (6,29), (10,29)
 *    do lie between and take a neighbour's flicker seed, which only the digest can see). A second
 *    throwaway regeneration with the decor gone *and* the barrels gone (the pickup moves alone):
 *    `camera`, `hud` and `scene.count` identical in all 176, digest different in all 176.
 *    Moving the ammo across the hall's enemies instead (a mutation, run once) makes this test go
 *    red at frame 10 — the trace does see a stream shift.
 * 3. *The barrels draw nothing either* (`spawnProp`'s crate and barrel branches have no `rnd`; only
 *    the chair does) and stand at (28,16) and (26,21), sixteen cells from the player, who never
 *    leaves the west end. Only the count sees them.
 * 4. *Nothing solid stands where this script walks or fights.* The route — the start chamber, the
 *    x=9 corridor, the z=24 jog and the west room, where the turret stands at (12,12) — is
 *    `x <= 13 && z >= 12`, and `dress1.ts` puts only walk-through clutter there (`ROUTE`;
 *    `levelDressing.test.ts` asserts no mass cell in it). Every mass is at x >= 14 or z < 12.
 *    A rack at (12,16), on the route, makes this file go red at frame 1340 (mutation, run once).
 *
 * Coverage is unchanged: every `material.map=` site this header lists is reached on the same
 * frames as before, because camera, hud and every sprite's texture are identical.
 *
 * ## The transitions plan, Task 1 — no regeneration: the kick meter was never in the digest
 *
 * `docs/superpowers/plans/2026-10-05-transitions.md` Task 1 removed the HUD's kick meter (`#kickwrap`: a fill bar and the
 * label `KICK 1s` / `KICK [RMB]`). The plan allowed that every fixture's `hud` field might move with it, if the digest
 * included the label. It does not: `HUD_IDS` in `gameplayTrace.ts` is `hp ar wname msg subt lvltitle bossname keys`, and
 * the meter was never among them. So nothing moved, and the proof is the plainest one: with the meter's markup, style and
 * update code gone (the cooldown `KICK_CD` = 1 s untouched), all three committed fixtures passed unchanged and un-regenerated (full suite,
 * 108 files / 1675 tests; `git diff` on `__fixtures__` empty after Task 1's commit). The cooldown itself is
 * still seen where it always was: the kick's ready-click `kickReady()`, which is why Cause 2 above moves the scene digest.
 *
 * ## The transitions plan, Task 2 — eleventh regeneration: the exit is a door and so is the entrance, and the scene gained three
 *
 * Level 1's exit pad (a box and a point light at `X`, (31, 33)) is an iron door in the south wall of the hall, two doors in
 * all: the exit (`exitDoor`, `doorGlow`, and the pad's light) and an entrance at the spawn (`entranceDoor`, `doorGlow`, in
 * the west wall, shut and dark). Scene: **+3** (pad and light out, five in). The hall ends at the edge of the grid with no
 * wall built there, so the exit door brings a wall of its own across the hall's open end (`slabSpan` in `ExitDoor.ts`;
 * the level's grid is held cell for cell to the reference and is untouched). This script never reaches the exit
 * (the nearest the camera comes to it, measured off the fixture's own camera x/z, is 47.0 units), so no door is opened. Field by field against the pre-change fixture, all 176 sampled frames:
 *
 * - `camera` — all seven components **identical in all 176 frames**.
 * - `hud` — all eight fields **identical in all 176 frames**; the run still ends `HEALTH68`/`ARMOR2`.
 * - `scene.count` — **+3 in every one of the 176 frames**, no other delta (126..154 -> 129..157).
 * - `scene.digest` — differs in all 176, necessarily. First: frame 10, `3bf3a1dd` -> `99776932`. Last: frame 1760,
 *   `ebe61469` -> `dbf99dd4`. 176 distinct digests before and after.
 *
 * The proof that the doors are the whole of it is in `trace.test.ts`'s section of the same name (the old pad put back, the
 * door children filtered out of the digest: all three old fixtures reproduce byte for byte).
 *
 * ## Deeper levels, Task 3 — twelfth regeneration: level 1 is rebuilt, and this is the fixture of the new level
 *
 * `docs/superpowers/plans/2026-10-05-deeper-levels.md` Task 3 rebuilds level 1 with the level-design toolkit (`src/world/levels/level1.ts`: 58 x 44, three
 * floors, 14 rooms, 23 enemies, the Guardian in a ward at the far end). Nothing the old script walked or fought on exists any more, so this is not a
 * regeneration of the old run but a re-recording of the same *purpose* on the new layout, by the header's procedure: keep what the trace exercises, rewrite
 * the script for the new rooms, re-derive every measured claim, regenerate (`WRITE_TRACE=1`) and give the analysis. Nothing in the sections above is a claim
 * about the fixture now; what follows is.
 *
 * ### What the trace is for, and still is
 * Combat resolution on the real path (`damagePlayer`, `damageEnemy`, `killEnemy`, `enemyTick`, `los`), the armour-absorb arm of `damagePlayer` (through the seeded
 * `S.armor`), a kill, a dismemberment, the sighting line, the weapon state machine, and the sprite frames of a fight: all measured below, each by a mutation.
 *
 * ### The script, and why it is what it is
 * The player wakes in the spawn cell of the upper gaol (floor 2.4, so the camera's `y` is 3.4 in every frame), at (3.5, 5.5) in cells, facing south into the
 * wall. It turns a quarter-turn east (`yaw -= movementX * SENS`, so `-(pi / 2) / SENS` of movementX, in eight steps: the same float arithmetic as the old turn,
 * which the old header explains is what keeps the residual under a microradian), walks east along the spawn's own row through the doorway at (7, 5) and out along
 * the cell block, and stops at (16.5, 5.5) at frame 380. Then it is a standing turret that watches its front: it sweeps 8 degrees a step between 60 degrees to the
 * left of east and 60 to the right, firing every step. The old turret swept most of a circle; this one fights what comes at it from one side, which is what the
 * cell block is. Three decisions in it came from running it, not from reading it:
 *
 *  - **It walks at frame 160, not 50.** The sighting line is the trace's `an enemy spotted the player` assertion, and a sighting is said once per session and
 *    *spent by the 3 s throttle* (`Subtitles.ts`: `onceSaid` is set before the throttle is checked). The level's own line is said at frame 90. A first draft that
 *    walked at 50 woke the first zombie at about frame 180, 1.5 s after it, and recorded no zombie line at all. At 160 the zombie wakes at about frame 290 and says
 *    it (`"Zombies. Classic…"`, frame 290).
 *  - **There is a cultist in the cell block** (`j` at (26, 3)). Without it the run had two zombies, no ranged attack and nothing that despawns: `scene.count` rose
 *    from 188 to 213 and never fell (measured over 1300 frames), and "something despawned mid-fight" was red. With it the cultist's orbs end against walls and the
 *    count falls four times (frames 580, 690, 810, 1080). That is the same assertion the old run satisfied, and the cultist is the level's only enemy whose orb and
 *    walk cycle (`j.a`, `j.b`) a trace this short can show.
 *  - **It stops at frame 1100, not 1760.** The fight is at the start of the level, 14 cells from the spawn, and a sweep run on goes from 40 health at frame 1100
 *    to 25 at 1250 and would reach `S.dead` a few hundred frames later: lethal in both directions, as the old header says, and a fixture of the player already dead
 *    is a worse net than one still fighting. The armour seeded at 50 is exactly used up by frame 940.
 *
 * ### The measured claims, re-derived
 *  - **Frames and fields.** 110 recorded frames (every 10th of 1100). `hud.hp` 100 -> 40 in nine values, `hud.ar` 50 -> 0 in eight (ARMOR43 at frame 530, 34, 27,
 *    18, 9, 2, then 0 at 940: the absorb arm takes 60% of every hit until the plate is gone), `hud.msg` the level title (frame 10) then `LIMB SEVERED` (frame 870),
 *    `hud.subt` the level line (frame 90) and the zombie line (frame 290), `hud.wname` `FLARE PISTOL` and `FLARE PISTOL — RELOADING`. `scene.count` 190 at load (129
 *    before: the level is bigger), 190..215 in the run, falling at the four frames above.
 *  - **Kills and what they did.** `S.kills` is 2: both zombies, the first collapsing from frame 620 (`z.die1`, `z.die2`), the second losing its right arm first
 *    (`z.noRArm`) at 870. The cultist is alive at the end, 4 units away, still firing. The Guardian is dormant at (51, 34), 45 cells from the player, never woken: its
 *    one texture in the run is `U.a`.
 *  - **The textures a fight shows** (read off every enemy's sprite every 5th frame, through `buildTextureIndex`): `z.a`, `z.b` (the walk), `z.atk` (the attack pose),
 *    `z.die1`, `z.die2`, `z.noRArm`, `j.a`, `j.b`, and the resting `a` of the dormant `f g m s t U`. Not `z.noHead`: no shot in this run decapitates.
 *  - **Why the seeded armour stays.** `S.armor = 50` is still what makes the absorb arm reachable: level 1 now has five armour tiles (the torturer's closet at
 *    (21, 26), the hall's stair at (38, 19), the armoury, the ward and the warders' hoard behind a secret door at (46, 6)) and the nearest is 21 cells from anywhere
 *    the player stands in this run. Without the seed the run holds 0 armour in every frame and the arm goes dark.
 *  - **The Task 5 sites** (`tickScheduled` and `schedule`): instrumented for one throwaway run, `tickScheduled` fires on all 1100 gameplay frames and `schedule()` is
 *    called **zero times**. The script never kicks; the level has no Mancubus (`A` is armour: KNOWN-11), no Slaughtaur and no Ettin (the roster is `z j m s g f t U`).
 *    So this fixture exercises none of the four call sites, as the old one did not, and the structural argument above (the roster has no `k`, `n` or `B`) holds
 *    for the new roster as it did for the old.
 *
 * ### A bug the new level found, and the fix that made the sever possible
 * The upper gaol stands on a raised floor (2.4), and `Hitscan.ts` worked out where on an enemy a shot landed from a sprite centre at floor 0 while finding the
 * candidates from one on the floor the enemy stands on. On any raised floor the height of the hit was therefore past the head, and **every shot at an enemy
 * on the upper tiers was a headshot**: twice the damage and never an arm. Measured on the first draft of this script, before the fix: the first zombie died of
 * `DECAPITATED` every time and no sweep produced a limb. The fix is one term (`+ (e.fy || 0)`); `tests/weapons/hitscanRaised.test.ts` holds a chest shot, a head
 * shot and an arm shot to the same damage on floors 0 and 2.4 (and goes red, `chest: expected -18 to be 16`, with the term taken out). It moves no fixture but this
 * one: the prologue's trace lands no hit and the boss trace's level has one floor.
 *
 * ### Coverage, re-measured against this fixture
 * Each by running this file under the mutation (the diverging frame is the first the digest differs in):
 *  - the walk-guard inversion (`(e.atkAnim??0)<=0`): red, first frame **300**;
 *  - the attack pose rewritten to `PX[e.key].a`: red, first frame **530**;
 *  - the two-stage death collapse (`P.die1`/`P.die2` -> `P.a`): red, first frame **620**;
 *  - `Damage.ts`'s sever frame (`P[key]||P.a` -> `P.a`): red, first frame **870**: this fixture covers it again (it had lost it at the eighth regeneration);
 *  - the armour absorb weakened (`dmg*.6` -> `dmg*.1`): red, first frame **530**;
 *  - `S.kills++` never run: red in "an enemy actually died", because nothing in the recording sees it (the old header's argument);
 *  - **`Death.ts`'s headless corpse** (`PX[e.key].noHead` -> `.a`): **green, not reached**, as before. The boss trace covers it.
 * `git diff aab8f7d -- tests/integration/__fixtures__/trace-level0.json tests/integration/__fixtures__/trace-level2-boss.json` is empty: the other two fixtures did
 * not move.
 *
 * The level also stands the torches, candles, items and props of its raised floors on them (`BuiltLevel.lift`, `src/world/Decor.ts`): a torch burned under the 2.4
 * floor otherwise. That is in this fixture's digest as a `y`, and nowhere else: no other level opts in.
 *
 * ## Gore on raised floors — thirteenth regeneration: blood, gibs and heads land on the floor they fall on
 *
 * The owner: "in most places the blood doesn't stay on the floor, there's no dismemberment, and heads don't come off". The gore code assumed the ground was
 * y = 0 (a pool at y .01, a gib clamped at .07, a blood drop at .02, a head spawned at `e.h * .92` and bounced on `h.sz * .5`, a corpse sunk to `e.h * .18`, a
 * limb thrown from `e.h * .55`), and on a raised floor (this level's upper gaol, 2.4) all of it was spawned or settled inside the floor. Every one of those
 * sites now uses the floor under it (`floorHeightAt(x, z)`, or the enemy's `e.fy` when it spawns from an enemy), including when it rolls onto another height. No
 * dice were added or moved: the same draws, in the same order. `tests/integration/goreRaisedFloors.test.ts` holds each site on floors of 0, 1.2 and 4.2.
 *
 * ### What moved, and what did not (`WRITE_TRACE=1`, compared with the committed fixture field by field by a node script)
 *  - **Camera: 0 of the 110 frames differ. HUD (hp, ar, wname, msg, subt, lvltitle, bossname, keys): 0 of 110 differ. Frame numbers: identical.** The player's walk,
 *    the damage taken, the armour, the `LIMB SEVERED` message at 870, the sighting line at 290: all as before. The fight is the same fight.
 *  - **`scene.digest` differs in 62 of the 110 frames, every one from 480 to 1100 (490 is the only frame in that range that agrees); `scene.count` in 21,
 *    all from 900.** Nothing before frame 480 moved, which is the first recorded frame after the first shot lands on the first zombie (frame 473).
 *  - The prologue's fixture (`trace-level0.json`: 12 shots, 0 hits, 0 kills, so no gore) and the boss trace's (level 2, one floor) are byte-identical:
 *    `git diff -- tests/integration/__fixtures__/trace-level0.json tests/integration/__fixtures__/trace-level2-boss.json` is empty.
 *
 * ### Where each part of the movement comes from (each by reverting that one site and running this file; the first diverging frame is the first the digest differs in)
 *  - **A hurt enemy's sprite** (`Behaviors.ts`, the stunned branch put the sprite at `e.h / 2`, under the 2.4 floor, for the whole stun): first frame **480**. A zombie
 *    hit on the upper gaol used to vanish into the floor for about a fifth of a second at every hit; it now stands.
 *  - **Blood particles landing** (`Particles.ts`): first frame **500**. A drop on a raised floor never reached y .02 and died in the air; it now lands, and
 *    rolls its 14% for a pool.
 *  - **The corpse and its shadow** (`Behaviors.ts`, the dead branch): first frame **620**, the first zombie's collapse (`z.die1`). It lay at `e.h * .18` under the floor.
 *  - **The pool's height** (`Decals.ts`): first frame **620**.
 *  - **The torn-off arm** (`Damage.ts`, `severLimb`): first frame **870**, which is `LIMB SEVERED`. Its gibs and blood started under the floor.
 *  - **The gibs' floor** (`Gibs.ts`): first frame **890**.
 *  - `scene.count` is higher from 900 by 2 to 5 children, 217 against 214 at the last frame. Read off the scene at frame 1100 (a throwaway probe, old code and new, same
 *    script): the only kind of child that differs is the blood pool (14 against 11); every sprite, gib, light, orb and decor child agrees. A pool is only ever made when
 *    something lands (a bouncing gib's 50%, a drop's 14%, a head's, a sever's), and on this floor things now land where they did not: so the seeded stream is
 *    drawn on in a different place from there, and the later pools differ. The decreases the "something despawned" assertion needs are the same four (580, 690, 810,
 *    1080) plus a fifth, 940 (218 -> 217).
 *  - No kill in this run decapitates, so the head's own sites (`spawnHead`, `headTick`) are not reached by this fixture. They are
 *    held by `goreRaisedFloors.test.ts`, where a headshot kill on floors of 0, 1.2 and 4.2 still decapitates (`deathKind` 2, `DECAPITATED`, a head thrown from the neck)
 *    and the head comes to rest at `floor + sz / 2`, and a hit on an arm and on the legs still severs. Decapitation and dismemberment were not failing to trigger on a raised
 *    floor (`Hitscan.ts` was already fixed for it, `hitscanRaised.test.ts`): they fired, and their heads and limbs were inside the floor.
 *
 * ### Coverage, re-measured: each mutation below turns something red
 * Pool y (`Decals.addPool`): this file, frame 620, and the pool tests. Gib floor: frame 890. Particle floor: frame 500. Corpse height and its shadow: frame 620. Sever
 * height: frame 870. Stun sprite: frame **480**. The head's spawn height and its floor, the decapitation's blood and gibs, the broken crate's gibs: green here (not
 * reached), red in `goreRaisedFloors.test.ts`.
 */

const FIXTURE_DIR = join(__dirname, "__fixtures__");
const FIXTURE = join(FIXTURE_DIR, "trace-level1.json");
const WRITE = process.env.WRITE_TRACE === "1";

const SENS = 0.0022; // src/player/Input.ts's mouse sensitivity at zoomLerp=0 (no scope equipped)

/**
 * Measured live under the seeded stream (the header's last section): 1100 is the frame by which the run's two kills have landed, the first corpse has
 * collapsed (`z.die1`, `z.die2`), an orb has been fired and has died against a wall (the `scene.count` decreases the "something despawned" assertion needs:
 * frames 580, 690, 810 and 1080) and the armour seeded at 50 is all gone, with the player alive on 40 health. A sweep run on past it takes the player to 25 by
 * frame 1250 and would reach `S.dead` a few hundred frames later: this script is lethal in both directions, and a fixture of the player already dead is a worse
 * net than one of them still fighting. Not the old 1760: the fight is at the start of the level now, 14 cells from the spawn, so the run is short.
 */
const TOTAL_FRAMES = 1100;

/**
 * The script, for the rebuilt level 1 (deeper-levels plan, Task 3): the player wakes in the spawn cell of the upper gaol facing south, into the cell's own wall.
 *
 *  - **Frame 5-40: turn east**, to the doorway in the cell's east wall (x 7, z 5, on the spawn's own row: the cell's `P` is at (3,5)). `yaw -= movementX * SENS`,
 *    so a quarter turn from the spawn's yaw of pi to 3 pi / 2 (forward `(-sin yaw, -cos yaw)` = +x) is `-(pi / 2) / SENS` of movementX, in eight steps.
 *  - **Frame 160: walk.** Not 50, as the old script did: the level's own line (`MONOLOGUE.lvl1`) is said at about frame 90 and the next unforced line is
 *    throttled for 3 s (`Subtitles.ts`'s `say`), and a sighting line is *spent* by that throttle (`onceSaid` is set before it is checked): a zombie that sees
 *    the player at frame 180 says nothing, for good. At 160 the first zombie, 18 cells away from the spawn (it stands at (21, 3)), wakes at about frame 300 and says its line.
 *  - **Frame 380: stop**, at (16.5, 5.5) cells, in the middle of the cell block's west half, the first zombie placed 5.4 cells away and the second 8.6 (where they stand at the start: they have moved by then).
 *  - **Frame 470-974: a standing turret that watches its front.** The aim sweeps 8 degrees a step between 60 degrees to the left of east and 60 to the right
 *    (a triangle wave, 14 frames a step), firing on every step (3 frames in, 15 out) and reloading on every sixth. The old script swept a whole circle with a slow
 *    rotation; this one fights what comes at it from one side, which is what the cell block is: a wide hall with the enemies at its east end. The sweep is why the
 *    pistol's shots land on arms and not only heads: the first zombie loses an arm (`LIMB SEVERED`, `z.noRArm`).
 *
 * `Input.ts` is read by the harness through the same events a player's hands make (`gameplayTrace.ts`).
 */
function combatScript(): InputEvent[] {
  const s: InputEvent[] = [{ frame: 2, kind: "pointerlock", locked: true }];
  for (let i = 0; i < 8; i++) s.push({ frame: 5 + i * 5, kind: "move", movementX: -(Math.PI / 2) / SENS / 8, movementY: 0 });
  s.push({ frame: 160, kind: "key", type: "keydown", code: "KeyW" });
  s.push({ frame: 380, kind: "key", type: "keyup", code: "KeyW" });
  const SWEEP_START = 470, SWEEP_STEP = 14, SWEEP_STEPS = 36, AMP = 8 * Math.PI / 180, LIMIT = 60 * Math.PI / 180;
  let off = 0, dir = 1;
  for (let i = 0; i < SWEEP_STEPS; i++) {
    const f = SWEEP_START + i * SWEEP_STEP;
    if (Math.abs(off + dir * AMP) > LIMIT) dir = -dir;
    off += dir * AMP;
    s.push({ frame: f, kind: "move", movementX: -dir * AMP / SENS, movementY: 0 });
    s.push({ frame: f + 3, kind: "button", type: "mousedown", button: 0 });
    s.push({ frame: f + 15, kind: "button", type: "mouseup", button: 0 });
    if (i % 6 === 5) {
      s.push({ frame: f + 18, kind: "key", type: "keydown", code: "KeyR" });
      s.push({ frame: f + 20, kind: "key", type: "keyup", code: "KeyR" });
    }
  }
  return s;
}

const INPUT: readonly InputEvent[] = combatScript();

/** Every `see_*` sighting line in the game, flattened — used to detect an
 * enemy-sighting bark in a recorded `hud.subt` without hard-coding which
 * enemy the script happens to meet first (that depends on the exact path
 * taken, which is itself sensitive to the drift described above). */
const SEE_LINES: string[] = Object.entries(MONOLOGUE)
  .filter(([id]) => id.startsWith("see_"))
  .flatMap(([, lines]) => lines);

let trace: TraceFrame[];

beforeAll(async () => {
  // Level 1 has five armour tiles since its rebuild, and this script reaches none of them (the nearest is 21 cells from anywhere the player stands),
  // so a run without this line holds `S.armor = 0` for all 1100 frames and `damagePlayer`'s armour-absorb branch goes dark. `loadLevel()` never resets
  // `S.armor`, so setting it here, before `runTrace` boots the game, is what keeps that branch reachable. See the last section of the header
  // ("Why the seeded armour stays") and `tests/integration/armourPickup.test.ts` for the unseeded proof that a player can reach armour at all.
  S.armor = 50;
  trace = await runTrace({
    seed: 20260815, frames: TOTAL_FRAMES, dtMs: 1000 / 60, input: INPUT, every: 10, level: 1,
  });
  if (WRITE) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(FIXTURE, JSON.stringify(trace, null, 1) + "\n");
  }
}, 90_000);

describe("the recorded run actually fights", () => {
  it("records the frames it was asked for", () => {
    expect(trace.length).toBe(TOTAL_FRAMES / 10);
  });

  it("the player took damage", () => {
    expect(trace.some((f) => f.hud.hp !== "HEALTH100")).toBe(true);
  });

  it("something despawned mid-fight", () => {
    let decreased = false;
    for (let i = 1; i < trace.length; i++) {
      if (trace[i].scene.count < trace[i - 1].scene.count) { decreased = true; break; }
    }
    expect(decreased).toBe(true);
  });

  it("an enemy spotted the player", () => {
    expect(trace.some((f) => SEE_LINES.some((line) => f.hud.subt.includes(line)))).toBe(true);
  });

  it("the weapon state machine left idle (NOT combat-specific — see the module doc comment)", () => {
    // trace-level0.json (the zero-enemy prologue fixture) holds these same
    // two values, so this only pins that the reload script cue works, not
    // that anything was fought. Kept for the same reason trace.test.ts
    // keeps its own copy: it catches the script silently degrading into a
    // walking tour that never touches the fire/reload state machine.
    const wnames = new Set(trace.map((f) => f.hud.wname));
    expect(wnames.size).toBeGreaterThan(1);
    expect([...wnames].some((w) => w.includes("RELOADING"))).toBe(true);
  });

  it("an enemy actually died — not just took damage", () => {
    // See the module doc comment: this is invisible to every field
    // `runTrace` records (camera/hud/scene alike), so it is checked
    // directly against the live state module instead.
    expect(S.kills).toBeGreaterThan(0);
  });
});

describe("the run matches the committed recording", () => {
  it("diverges from the fixture nowhere", () => {
    if (WRITE) {
      expect(existsSync(FIXTURE)).toBe(true);
      return; // just wrote it; nothing to compare against
    }
    expect(
      existsSync(FIXTURE),
      `${FIXTURE} is missing — generate it once with WRITE_TRACE=1 and commit it`,
    ).toBe(true);

    const expected = JSON.parse(readFileSync(FIXTURE, "utf8")) as TraceFrame[];
    expect(trace.length).toBe(expected.length);

    for (let i = 0; i < expected.length; i++) {
      const a = trace[i], b = expected[i];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const what = a.camera.join() !== b.camera.join() ? "camera"
        : JSON.stringify(a.hud) !== JSON.stringify(b.hud) ? "hud"
        : "scene";
      expect(
        { frame: a.frame, what, actual: a[what as "camera"], expected: b[what as "camera"] },
      ).toEqual(
        { frame: b.frame, what, actual: b[what as "camera"], expected: b[what as "camera"] },
      );
    }
    expect(trace).toEqual(expected);
  });
});
