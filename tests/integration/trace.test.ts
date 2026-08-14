// @vitest-environment jsdom
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent, type TraceFrame } from "./gameplayTrace";

/**
 * The Plan 0D characterization test: 240 frames of the real game, played
 * from a fixed script, compared against a committed recording.
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
 * ## Two things it does NOT catch, and why
 *
 * The prologue run never lands a hit on an enemy or takes damage — the
 * scene-count variation it does show is muzzle, casing and impact effects,
 * not enemy contact. So two constants survive sabotage here:
 *
 * - **`hitStop`'s `dt*=.08`** — only reached after a shot connects.
 * - **`spawnGuard`'s `2.0`** — only observable if the player is damaged
 *   during the entry window.
 *
 * Both become *directly* testable the moment their group is migrated,
 * which is a small piece of luck worth using rather than working around:
 * after Plan 0D Task 2, `screenShake.hitStop` is an exported property a
 * test can assign, and after Task 9 the same is true of
 * `player.spawnGuard`. Those two tasks own writing the focused tests; this
 * file does not grow a combat fixture for them.
 */

const FIXTURE_DIR = join(__dirname, "__fixtures__");
const FIXTURE = join(FIXTURE_DIR, "trace-level0.json");
const WRITE = process.env.WRITE_TRACE === "1";

/**
 * Deliberately not a still player, and deliberately long enough to fight.
 *
 * A trace of someone standing at spawn exercises none of
 * px/pz/vx/vz/grounded/bobT — the largest and riskiest group in the plan.
 * A *short* trace exercises no combat either: `spawnGuard` gives 2 seconds
 * of entry invulnerability, and enemies need several more to close. The
 * first version of this script ran 4 seconds, never took a hit, and let
 * both a `spawnGuard` and a `hitStop` sabotage pass.
 *
 * So: move and look for the first four seconds, then stand and fight for
 * ten, sweeping the aim across the room and firing in bursts so shots
 * connect, enemies retaliate, and damage, hit-stop, gibs and death all
 * appear in the recording.
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
  // Ten seconds of sweeping fire: turn a little, fire a burst, repeat. The
  // sweep is what makes shots actually connect without knowing where the
  // level put its enemies.
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

  it("actually fights — shots land and the world gains and loses objects", () => {
    // Without this the trace silently degrades into a walking tour and
    // every combat constant in the migration goes untested: a `hitStop`
    // sabotage survived the version of this script that only walked.
    const counts = trace.map((f) => f.scene.count);
    expect(Math.max(...counts) - Math.min(...counts)).toBeGreaterThan(5);
    // The weapon state machine ran through more than its idle pose.
    expect(new Set(trace.map((f) => f.hud.wname)).size).toBeGreaterThan(1);
  });

  it("shows a player who actually moved and looked around", () => {
    const first = trace[0].camera, last = trace.at(-1)!.camera;
    expect(first).not.toEqual(last);
    // Position AND rotation, separately: a trace that only turned would
    // leave px/pz untested, which is the whole point of the script.
    expect([first[0], first[2]]).not.toEqual([last[0], last[2]]);
    expect(first[4]).not.toEqual(last[4]); // yaw
  });

  it("shows a world that changed — things spawned, moved or despawned", () => {
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
    // print a diff of 60 frames' worth of scene digests.
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
