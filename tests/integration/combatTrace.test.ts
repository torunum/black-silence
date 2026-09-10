// @vitest-environment jsdom
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent, type TraceFrame } from "./gameplayTrace";
import { S } from "../../src/core/State";
import { MONOLOGUE } from "../../src/content/monologue";

/**
 * The combat trace — closes KNOWN-10. `trace.test.ts` plays the prologue,
 * which loads with zero enemies (see that file's own header), so nothing
 * on the combat-resolution path — `damagePlayer`, `damageEnemy`,
 * `killEnemy`, `enemyTick`, `los`, and everything else Plan 0E's DAMAGE/
 * DEATH and ENEMY AI carves move — is exercised by it at all. This file
 * plays level 1 instead (`U z×4 f×2 j m×2 t g×2 s A`, 15 enemies), far
 * enough into it that the player actually meets some of them.
 *
 * **This fixture was recorded before Plan 0E moved any system out of
 * `src/legacy.js`.** Its entire value is being a pre-migration recording —
 * a later task's refactor is correct only if this file still diverges
 * nowhere from it. Regenerating it (`WRITE_TRACE=1`) to make a red build
 * green destroys that value the same way it would for `trace.test.ts`;
 * see that file's header for the full argument. Don't.
 *
 * ## Getting to level 1, and then to a fight
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
 * The fixture's very first recorded frame reads `"ARMOR50"` — a state the
 * game can never organically reach. `S.armor` starts at 0 and nothing in
 * `loadLevel` ever changes that; the only way a real playthrough raises it
 * is picking up an armour item, and no level's grid can ever place one:
 * `loadLevel`'s dispatch checks `EDEF[ch]` (the enemy-key map) before the
 * item-letter map, and `A` is both the Mancubus's key in `ENEMY_DEFS` and
 * the armour item's key in that item map, so every `"A"` grid cell spawns
 * the enemy and the armour branch is unreachable dead code — see
 * `docs/known-issues.md` KNOWN-11, filed while building this fixture.
 * `S.armor` is therefore structurally always 0 in real play, for every
 * level, not just this one.
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
 * - This file's own `S.armor` note above already establishes that the level
 *   grid's `put1(g,40,25,"A")` — commented "armor" by the level author —
 *   spawns a Mancubus instead, per KNOWN-11's enemy-vs-item collision.
 *   That Mancubus is the *only* `twin` (dual-barrel) enemy level 1 has, and
 *   it sits in the walled-off SECRET ALCOVE (`src/world/levels/level1.ts`'s
 *   `g[23][40]="S"`), which this script's path (start room -> corridor ->
 *   great hall -> standing turret) never opens and never gets within
 *   `los()`'s 22-unit range of. It never reaches `seen`, so its ranged
 *   branch — and the scheduled second barrel — never runs.
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
 *   `deathKind===2`, and this run's kill *does* sever a limb — `z.noLArm`
 *   is what appears in the sampled frames, not `z.die1`/`z.die2`, neither
 *   of which appears anywhere.
 * - `Death.ts`'s headless corpse (`PX[e.key].noHead||PX[e.key].hl`).
 *   Requires a decapitating kill; this run's kill is not one, and no
 *   `noHead`/`hl` texture appears in any sampled frame.
 *
 * Both of those were **confirmed by mutation, not inferred**: rewriting
 * `Behaviors.ts`'s `want` to `P.a` and `Death.ts`'s headless assignment to
 * `PX[e.key].a` at the same time leaves both trace files green. They are
 * genuinely unreached, and this file should not be read as covering them.
 * - `Boss.ts`'s phase-3 form swap and `Boss.ts`'s boss walk cycle. Both sit
 *   inside `priestThink`, which only runs for `e.priest` enemies. Level 1's
 *   only boss is `U`, THE CATHEDRAL GUARDIAN (`EnemyDefs.ts`: `boss:true,
 *   stone:true`, **no** `priest`), and it spawns dormant at grid (19,3),
 *   which this script never wakes — `U.a` is the only `U` texture that ever
 *   appears. These two are unreachable in *both* fixtures regardless of
 *   script, the same way `Behaviors.ts`'s Slaughtaur and Ettin branches
 *   are (see the Plan 0F Task 5 section above).
 *
 * The nine sites, and what the committed fixtures actually show:
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
 */

const FIXTURE_DIR = join(__dirname, "__fixtures__");
const FIXTURE = join(FIXTURE_DIR, "trace-level1.json");
const WRITE = process.env.WRITE_TRACE === "1";

const SENS = 0.0022; // src/player/Input.ts's mouse sensitivity at zoomLerp=0 (no scope equipped)
const REV = (2 * Math.PI) / SENS; // one full revolution's worth of movementX

/**
 * Retuned by Phase 2 Part A Task 3 (see the module doc comment's "regenerated
 * twice" section) from the original 1680 — measured live, under the
 * `installUuidStub`-corrected RNG stream, as the frame past which the run's
 * one kill has landed and the player is alive with room to spare (`S.hp` in
 * the 60s at cutoff, not falling toward the `S.dead` a too-short budget
 * hits). Still well short of the player dying outright.
 */
const TOTAL_FRAMES = 1760;

function combatScript(): InputEvent[] {
  const s: InputEvent[] = [
    { frame: 2, kind: "pointerlock", locked: true },
  ];
  // Spawn yaw is PI (facing south, into the start room's own wall) — turn
  // to face north, toward the corridor, in exactly pi/SENS worth of
  // movementX so the residual is microradians rather than the ~0.05 rad a
  // rounder number leaves (see the module doc comment for why that
  // residual matters over hundreds of frames of holding forward).
  for (let i = 0; i < 8; i++) {
    s.push({ frame: 5 + i * 5, kind: "move", movementX: Math.PI / SENS / 8, movementY: 0 });
  }
  s.push({ frame: 50, kind: "key", type: "keydown", code: "KeyW" });
  // A brief strafe toward the corridor's world-x — the start room is wide
  // enough that walking due north from spawn misses the corridor entirely.
  s.push({ frame: 52, kind: "key", type: "keydown", code: "KeyD" });
  s.push({ frame: 100, kind: "key", type: "keyup", code: "KeyD" });
  // Tap the level's one door every 20 frames through the whole approach —
  // interact() is a no-op unless a door is within ~2.6 units and roughly
  // in front, so this is safe to spam rather than timing precisely.
  for (let f = 150; f <= 1500; f += 20) {
    s.push({ frame: f, kind: "key", type: "keydown", code: "KeyE" });
    s.push({ frame: f + 2, kind: "key", type: "keyup", code: "KeyE" });
  }
  // Approach-phase fire: this also supplies the small alternating look
  // (+-60 movementX) that drifts the player sideways into the corridor's
  // one-cell-wide doorway over the course of the walk — removing it (or
  // changing its magnitude) changes where the player ends up, not just
  // whether they fire.
  for (let i = 0; i < 33; i++) {
    const f = 400 + i * 30;
    s.push({ frame: f, kind: "move", movementX: i % 2 === 0 ? 60 : -60, movementY: 0 });
    s.push({ frame: f + 4, kind: "button", type: "mousedown", button: 0 });
    s.push({ frame: f + 14, kind: "button", type: "mouseup", button: 0 });
    if (i % 5 === 4) {
      s.push({ frame: f + 20, kind: "key", type: "keydown", code: "KeyR" });
      s.push({ frame: f + 22, kind: "key", type: "keyup", code: "KeyR" });
    }
  }
  // Standing turret phase, from ~frame 1400 (measured live — see the
  // module doc comment). Only the first 24 of a planned ~2.86-revolution
  // sweep are actually emitted (12 before Task 3's stub retune — see the
  // module doc comment's "regenerated twice" section for why more shots,
  // not just more frames, were needed), since that already lands the run's
  // kill; the denominator stays 130 rather than being recomputed for a
  // shorter loop, which would change the per-step angle and retune the
  // whole encounter's timing.
  s.push({ frame: 1400, kind: "key", type: "keyup", code: "KeyW" });
  const SWEEP_START = 1420, SWEEP_STEP = 22, SWEEP_STEPS_DENOM = 130, SWEEP_STEPS_USED = 24;
  for (let i = 0; i < SWEEP_STEPS_USED; i++) {
    const f = SWEEP_START + i * SWEEP_STEP;
    s.push({ frame: f, kind: "move", movementX: (2.86 * REV) / SWEEP_STEPS_DENOM, movementY: 0 });
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
  // Level 1's grid cannot place an armour pickup: `EDEF["A"]` (the
  // Mancubus) is checked before the item-letter map in legacy.js's
  // loadLevel(), so every "A" cell spawns the enemy, never the +50 armour
  // item that letter maps to — true of every level, not just this one.
  // `loadLevel()` never resets `S.armor` either, so setting it here, before
  // `runTrace` imports and boots `legacy.js`, is what makes `damagePlayer`'s
  // armour-absorb branch (line 1241 in `src/legacy.js`) reachable at all —
  // without it `S.armor` stays 0 for the whole run and that branch never
  // executes, which is exactly what let sabotage 1 in this task's report
  // pass unnoticed on the first attempt.
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
