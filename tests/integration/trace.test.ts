// @vitest-environment jsdom
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent, type TraceFrame } from "./gameplayTrace";

/**
 * The Plan 0D characterization test: 900 frames of the real game, played
 * from a fixed script, compared against a committed recording (every 10th
 * frame is kept, so the fixture and `trace` array both hold 90 frames).
 *
 * Read `gameplayTrace.ts`'s header for what is recorded and why. This file
 * owns the script and the fixture.
 *
 * **When this test fails during Plan 0D, the migration is wrong.** Nothing
 * in that plan may change what the game does, so any divergence is a
 * rewritten call site that no longer means what it did. The failure message
 * names the first frame that diverged and which of camera/hud/scene it was.
 *
 * Regenerating the fixture is how this test is silenced, so it must never
 * be done to make a red build green. Set `WRITE_TRACE=1` only when the
 * divergence has been explained and deliberately accepted, and say so in
 * the commit message.
 *
 * ## Proven to catch (measured, not assumed)
 *
 * `px`/`pz` transposed in the movement integration, `vx`/`vz` transposed,
 * `sin`/`cos` transposed in the heading, gravity `20`→`21`, and the shake
 * decay `1.6`→`1.7` all fail this test.
 *
 * ## Combat is NOT covered by this fixture — read this before trusting a test name
 *
 * The level this script plays (the prologue) loads with **zero enemies**
 * (`world.enemies.length === 0` right after load — confirmed live in a
 * browser, and consistent with everything the committed fixture shows).
 * There is nothing for the script's shots to hit and nothing that can hit
 * the player back, no matter how long it fires or how it sweeps its aim.
 * Concretely, across all 90 recorded frames of the committed fixture:
 *
 * - `hud.hp` is `"HEALTH100"` in every frame — the player is never damaged.
 * - `hud.subt` only ever holds `""` or the level-opening line — no
 *   `say("see_"+e.key)` enemy-sighting bark ever fires, because no enemy
 *   ever spots the player.
 * - `scene.count` rises monotonically (33 to 45 as of Phase 2 Part A Task 3's
 *   instancing below; 237 to 249 before it — same shape, smaller numbers)
 *   with zero frames where it decreases — nothing is ever removed from the
 *   scene.
 *
 * So **`damagePlayer`, `damageEnemy`, `killEnemy`, `severLimb`, `endLevel`
 * and everything else on the combat-resolution path are not exercised by
 * this fixture at all.** The `scene.count` growth this file does check for
 * is muzzle flashes, ejected casings and impact decals accumulating as the
 * script fires — FX of firing, not evidence that anything got hit. A test
 * name that implies otherwise is wrong; do not add one back. Covering
 * combat needs either a level with enemies added to a trace like this one,
 * or focused unit tests — this file does not grow a combat fixture.
 *
 * Two constants fall out of that same gap and survive sabotage here:
 *
 * - **`hitStop`'s `dt*=.08`** — only reached after a shot connects.
 * - **`spawnGuard`'s `2.0`** — only observable if the player is damaged
 *   during the entry window.
 *
 * Both became *directly* testable once their group was migrated, which was
 * a small piece of luck worth using rather than working around: since Plan
 * 0D Task 2, `screenShake.hitStop` is an exported property a test can
 * assign (see `wiring.test.ts`), and since Task 9 the same is true of
 * `player.spawnGuard`. Those tests own combat's edge behavior; this file
 * does not grow a combat fixture for them.
 *
 * ## Phase 2 Part A Task 3 — regenerated twice, for two different reasons
 *
 * **First regeneration: `gameplayTrace.ts` stopped letting three.js's own
 * object bookkeeping consume the seeded gameplay stream.** See
 * `gameplayTrace.ts`'s `installUuidStub` doc comment for the mechanism.
 * `src/` was unchanged for that commit; this fixture's zero-enemy script
 * has nothing for the shifted stream to change *behaviorally* (no enemies
 * means no `spawnEnemy` random timers to reseed), so — checked frame by
 * frame, not assumed — camera and hud came back **byte-identical** to the
 * pre-stub fixture; only `scene.digest` moved (positions/visibility of the
 * torches' and item's cosmetic timers shifted with the stream, changing
 * nothing camera/hud reads). combatTrace.test.ts's header has the fuller
 * story for level 1, where the shift did reach observable behavior.
 *
 * **Second regeneration: instancing the level's wall/pillar/platform
 * geometry** (`src/world/LevelLoader.ts`). With the stub already in place,
 * this moved only `scene.count`/`scene.digest` (237→33 at frame 10, a
 * constant 204-object delta at every sampled frame through 249→45 at
 * frame 900) — `camera` and `hud` were unchanged across all 90 sampled
 * frames. See that commit's report for the full frame-by-frame
 * confirmation.
 *
 * ## Phase 3 Part B Task 1 — third regeneration: the digest now records textures
 *
 * `digestScene` (`gameplayTrace.ts`) recorded type, position and `visible`
 * and nothing else, so which *texture* a sprite was showing was invisible
 * to this fixture and to `combatTrace.test.ts`'s. Phase 3 Part A Task 2
 * proved what that costs: a change chartered as type-only inverted
 * `Behaviors.ts`'s walk-cycle guard and all 463 tests passed. The digest now
 * also records, for each child that has a material, the **name** of that
 * material's texture (`z.a`, `item.torch[1]`, `tex.hellWall~clone` — see
 * `buildTextureIndex`, and note it is deliberately not `texture.uuid`) and
 * the material's **colour**. `scale` was considered and deliberately left
 * out; the reasoning, and the measurement behind it, are in `digestScene`'s
 * doc comment.
 *
 * That is a recording change with **no runtime effect**, and the
 * regeneration was checked against exactly that claim before being
 * accepted, frame by frame rather than at the first divergence:
 *
 * - `camera` — all seven fields, **byte-identical in all 90 sampled
 *   frames**. Compared field by field, not by whole-object equality.
 * - `hud` — all eight fields (`hp ar wname msg subt lvltitle bossname
 *   keys`), **identical in all 90 frames**, each key counted separately.
 * - `scene.count` — **identical in all 90 frames**, same 33 → 45 shape and
 *   the same min/max as before.
 * - `scene.digest` — changed in all 90 frames, which is expected rather
 *   than alarming: every frame of this level contains textured children
 *   (walls, floor, ceiling, torches), so every frame's part list gains
 *   `:m=`/`:c=` fields. First: frame 10, `313756e7` → `c1fe0472` at an
 *   unchanged count of 33. Last: frame 900, `ba3dd963` → `18e7fa44` at an
 *   unchanged count of 45. 90 distinct digests before and 90 after — the
 *   widening lost no resolution.
 *
 * **This fixture still has zero enemies**, so it gains far less than
 * `combatTrace.test.ts` does. The one `material.map=` assignment site it
 * now covers is the torch flicker (`player/Interact.ts`): both
 * `item.torch[0]` and `item.torch[1]` appear in its sampled frames, so a
 * frozen or reversed torch animation is no longer invisible here. Nothing
 * else changed: it records the same camera, the same HUD and the same
 * object count it always has.
 *
 * ## Player feedback round 1, fix round — fourth regeneration: two causes, kept separate
 *
 * Two of this round's player-requested changes reach this fixture, for two
 * different reasons, and `installAudioStub` (see `gameplayTrace.ts`, KNOWN-20)
 * was deliberately **not** wired in to remove either — that ruling costs three
 * fixtures and a boss-script retune, paid for in a future plan, not this one.
 * Both causes were isolated by temporarily reverting one constant at a time
 * (`KICK_CD` back to `15`, then `SPRINT_BOB_RATE` back to `1.9`), regenerating
 * against each in turn, and restoring `src/` afterward — `git diff --stat --
 * src/` empty before this commit. All frame numbers below are the 90 sampled
 * frames (every 10th of 900); "the fixture" means this commit's regeneration
 * against the pre-round (`010ddae`) committed copy.
 *
 * **Cause 1 — the sprint camera bob (`Player.ts`'s `SPRINT_BOB_RATE`,
 * `1.9`→`1.6`, task 3).** Isolated by regenerating with `KICK_CD` held at the
 * old `15` (so no kick-audio draw can fire inside the window) and the new bob
 * rate in place, diffed against the pre-round fixture:
 * - `camera` — index 1 (`py`) only, in 18 of 90 frames, first at **frame
 *   80** (the frame the script presses `ShiftLeft`), largest at **frame
 *   200** (`-0.009355`). `px`, `pz`, and all three rotation/`fov` fields are
 *   identical in every one of the 90 frames — the signature of a vertical
 *   head bob and nothing else, matching `Player.ts:161`'s `bobSin*.025`
 *   term exactly. This is a real motion change the trace exists to record.
 * - `scene.digest` — also moves, starting **frame 100**, 20 frames before
 *   the kick is even pressed (frame 120). Cause: `footstep()` (`Player.ts`)
 *   calls `bang()` (`src/audio/Sfx.ts`) on every `bobT` zero-crossing while
 *   grounded, so retuning the sprint bob *rate* also retimes when a
 *   sprint-phase footstep sound fires (script sprints frames 80-110); each
 *   shifted footstep is one draw earlier or later against the shared seeded
 *   `Math.random()` stream (see KNOWN-20), which is what actually moves the
 *   digest, not the bob itself. `hud` and `scene.count` are untouched in
 *   all 90 frames of this isolated run.
 *
 * **Cause 2 — the kick's ready-click (`WeaponState.ts`'s `KICK_CD`,
 * `15`→`1`, task 2).** Isolated by regenerating with the new `KICK_CD=1` and
 * the bob rate held at the old `1.9`, diffed against the pre-round fixture:
 * - `camera` — **zero frames differ.** The kick contributes no motion.
 * - `hud` and `scene.count` — **zero frames differ.**
 * - `scene.digest` — moves starting **frame 190** (kicked at frame 120;
 *   `KICK_CD=1`s later resolves under this fixture's 60fps clock right
 *   around there — under the old `KICK_CD=15` this could never happen
 *   inside a 900-frame/15s trace at all, see the task 2 report), through
 *   frame 900. The ready branch's `click(.12)`→`bang()` fills a noise
 *   buffer; in this harness `domStubs.ts`'s `createBuffer()` returns a
 *   1-sample `Float32Array` regardless of requested length, so the fill is
 *   **one** `Math.random()` draw, not the ~1100 a real browser's sample
 *   rate would produce (corrected in the task 2/3 report; the mechanism is
 *   the same, only the earlier magnitude claim was wrong). One draw is
 *   still enough to re-index every later draw in the shared stream.
 *
 * **Combined (this fixture, both changes live, stub not wired):** `camera`
 * diverges in exactly the same 18 frames as Cause 1 alone (Cause 2
 * contributes none) — confirms the two causes don't interact on `camera`.
 * `scene.digest` diverges in all 81 frames from **frame 100** onward (9
 * unaffected frames at the start, 10-90) and none before — Cause 1's
 * earlier onset (100) swallows Cause 2's later one (190) in the union, so
 * the combined fixture's first divergence is Cause 1's, not Cause 2's, even
 * though Cause 2 is the one this task set out to test. `hud` and
 * `scene.count` are identical in all 90 frames, for both causes and
 * combined — the `"kickready"` bark is real (see the task 2 report: it
 * loses `say`'s 3-second throttle race against the level-opening line and
 * is spent silently, never reaching the DOM), so nothing about it shows up
 * in `hud`.
 *
 * ## Phase 2B gothic trim — fifth regeneration: one more scene child
 *
 * `src/world/Trim.ts` adds pillar bases/capitals and wall courses as at most
 * two `InstancedMesh` scene children per level. The prologue has no pillars,
 * so it gains exactly one (`wallCourse`). A purely visual change: no
 * `Math.random()` draw (the module draws none, and `installUuidStub` keeps
 * three's own UUID draws out of the stream), and nothing reads the scene
 * back for gameplay. Compared field by field against the pre-trim fixture,
 * all 90 sampled frames:
 *
 * - `camera` — all seven components **identical in all 90 frames**.
 * - `hud` — all eight fields **identical in all 90 frames**.
 * - `scene.count` — **+1 in every one of the 90 frames**, no other delta
 *   (33..45 → 34..46).
 * - `scene.digest` — differs in all 90, necessarily, since the child list
 *   gained a member. First: frame 10, `c1fe0472` → `037ed69c`. Last: frame
 *   900, `455ad8bc` → `8d4e01de`. 90 distinct digests before and after.
 *
 * That the digest moved *only* because of the added child was checked
 * directly rather than inferred: with `digestScene` temporarily filtering out
 * children named `wallCourse`/`pillarTrim`, this run reproduced the
 * **pre-trim fixture byte for byte** (and so did the other two fixtures).
 * The filter was then removed; `gameplayTrace.ts` is unchanged by this
 * commit. Worth knowing: the digest records an `InstancedMesh` by its own
 * position and material, never by its instance matrices, so *where* the trim
 * sits is invisible to every trace — `tests/world/trim.test.ts` owns that.
 *
 * ## Trim bands — sixth regeneration: the course changes texture
 *
 * The wall courses stopped wearing the level's wall texture and wear the
 * theme's stone band instead (`src/render/BandTextures.ts`; on this level
 * `tex.hellWall` -> `band.hell`). The bands are built at boot from an
 * integer hash, not `Math.random`, and `installUuidStub` keeps three's
 * texture UUIDs out of the stream, so nothing had a mechanism to move but
 * the course's texture name. Field by field against the pre-band fixture,
 * all 90 sampled frames:
 *
 * - `camera` — all seven components **identical in all 90 frames**.
 * - `hud` — all eight fields **identical in all 90 frames**.
 * - `scene.count` — **identical in all 90 frames** (34..46).
 * - `scene.digest` — differs in all 90, necessarily: `wallCourse` is a
 *   scene child from the first frame to the last, and its part string
 *   carries the texture name. First: frame 10, `037ed69c` -> `fd28e136`.
 *   Last: frame 900, `8d4e01de` -> `c482baf4`. 90 distinct digests before
 *   and after.
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
 */

const FIXTURE_DIR = join(__dirname, "__fixtures__");
const FIXTURE = join(FIXTURE_DIR, "trace-level0.json");
const WRITE = process.env.WRITE_TRACE === "1";

/**
 * Deliberately not a still player, and deliberately long enough that a
 * level with enemies in it would have given combat a chance to happen.
 * (This one doesn't have any — see the module doc comment above.)
 *
 * A trace of someone standing at spawn exercises none of
 * px/pz/vx/vz/grounded/bobT — the largest and riskiest group in the plan.
 * A *short* trace exercises even less: `spawnGuard` gives 2 seconds of
 * entry invulnerability, so nothing shorter than that could ever show a
 * hit landing even in a level that had enemies to hit. The first version
 * of this script ran 4 seconds and proved nothing about `spawnGuard` or
 * `hitStop` either way.
 *
 * So: move and look for the first four seconds, then fire in swept bursts
 * for ten more. That second phase does exercise the weapon state machine
 * through fire/reload cycles and the FX firing produces (muzzle flashes,
 * casings, impact decals) — it does not exercise combat resolution, because
 * the prologue this script plays has no enemies for those shots to hit.
 */
const FIGHT_START = 260;

function fightingScript(): InputEvent[] {
  const script: InputEvent[] = [
    { frame: 2, kind: "pointerlock", locked: true },
    { frame: 5, kind: "key", type: "keydown", code: "KeyW" },
    { frame: 20, kind: "move", movementX: 120, movementY: -30 },
    { frame: 40, kind: "key", type: "keydown", code: "KeyD" },
    { frame: 55, kind: "move", movementX: -80, movementY: 15 },
    { frame: 70, kind: "key", type: "keyup", code: "KeyD" },
    { frame: 80, kind: "key", type: "keydown", code: "ShiftLeft" },
    { frame: 110, kind: "key", type: "keyup", code: "ShiftLeft" },
    { frame: 120, kind: "button", type: "mousedown", button: 2 },  // kick
    { frame: 122, kind: "button", type: "mouseup", button: 2 },
    { frame: 150, kind: "key", type: "keydown", code: "Space" },   // jump
    { frame: 152, kind: "key", type: "keyup", code: "Space" },
    { frame: 185, kind: "key", type: "keydown", code: "KeyA" },
    { frame: 210, kind: "key", type: "keyup", code: "KeyA" },
    { frame: 240, kind: "key", type: "keyup", code: "KeyW" },
  ];
  // Ten seconds of sweeping fire: turn a little, fire a burst, repeat. In a
  // level that had enemies, sweeping the aim rather than firing at one spot
  // would be what let shots connect without knowing where they were placed
  // — but this prologue has none (see the module doc comment), so what this
  // loop actually exercises is the weapon state machine's fire/reload path
  // and the FX firing produces, not a hit landing.
  for (let i = 0; i < 20; i++) {
    const f = FIGHT_START + i * 30;
    script.push({ frame: f, kind: "move", movementX: 55, movementY: i % 4 === 0 ? 8 : -6 });
    script.push({ frame: f + 4, kind: "button", type: "mousedown", button: 0 });
    script.push({ frame: f + 16, kind: "button", type: "mouseup", button: 0 });
    if (i % 5 === 4) {
      script.push({ frame: f + 20, kind: "key", type: "keydown", code: "KeyR" }); // reload
      script.push({ frame: f + 22, kind: "key", type: "keyup", code: "KeyR" });
    }
  }
  return script;
}

const INPUT: readonly InputEvent[] = fightingScript();

let trace: TraceFrame[];

beforeAll(async () => {
  trace = await runTrace({ seed: 20260814, frames: 900, dtMs: 1000 / 60, input: INPUT, every: 10 });
  if (WRITE) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(FIXTURE, JSON.stringify(trace, null, 1) + "\n");
  }
}, 60_000);

describe("the recorded run is worth comparing", () => {
  it("records the frames it was asked for", () => {
    expect(trace.length).toBe(90); // 900 frames, every 10th
  });

  it("fires and reloads — the weapon state machine advances and FX accumulate in the scene", () => {
    // This does NOT check combat — see the module doc comment above: the
    // prologue has zero enemies, so no shot here ever lands. What this
    // guards against is the script silently degrading into a walking tour
    // that never actually pulls the trigger: an earlier version of this
    // script did exactly that and let a `hitStop` sabotage pass unnoticed.
    const counts = trace.map((f) => f.scene.count);
    // Firing adds muzzle-flash, casing and decal objects to the scene; a
    // walking-only run would not grow the count anywhere near this much.
    expect(Math.max(...counts) - Math.min(...counts)).toBeGreaterThan(5);
    // In this fixture the count only ever grows — FX accumulate and nothing
    // is ever despawned, because there is nothing (no enemies) to remove.
    // Pin that shape: a future frame where it drops is a real behavior
    // change, not something that should pass silently.
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    // The weapon state machine left its idle pose and actually reloaded —
    // not just any two wname strings, but specifically the "RELOADING"
    // state the script's scripted KeyR presses should trigger.
    const wnames = new Set(trace.map((f) => f.hud.wname));
    expect(wnames.size).toBeGreaterThan(1);
    expect([...wnames].some((w) => w.includes("RELOADING"))).toBe(true);
  });

  it("shows a player who actually moved and looked around", () => {
    const first = trace[0].camera, last = trace.at(-1)!.camera;
    expect(first).not.toEqual(last);
    // Position AND rotation, separately: a trace that only turned would
    // leave px/pz untested, which is the whole point of the script.
    expect([first[0], first[2]]).not.toEqual([last[0], last[2]]);
    expect(first[4]).not.toEqual(last[4]); // yaw
  });

  it("shows a world that changed — things spawned or moved", () => {
    const digests = new Set(trace.map((f) => f.scene.digest));
    expect(digests.size).toBeGreaterThan(20);
    expect(trace[0].scene.count).toBeGreaterThan(10);
  });

  it("shows the HUD reacting", () => {
    const hudStates = new Set(trace.map((f) => JSON.stringify(f.hud)));
    expect(hudStates.size).toBeGreaterThan(1);
    expect(trace[0].hud.hp).toMatch(/\d/);
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

    // Report the first divergence and stop, rather than letting Vitest
    // print a diff of 90 frames' worth of scene digests.
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
    // Nothing diverged in the scan; assert the whole thing for good measure.
    expect(trace).toEqual(expected);
  });
});
