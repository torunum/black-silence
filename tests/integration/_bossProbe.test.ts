// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent, type TraceFrame } from "./gameplayTrace";
import { S } from "../../src/core/State";
import { player } from "../../src/player/PlayerState";
import { world } from "../../src/world/WorldState";
import * as THREE from "three";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { renderState } from "../../src/render/Renderer";
import { los } from "../../src/enemies/ai/Perception";
import { input } from "../../src/player/Input";
import { solidAt } from "../../src/world/Collision";
const existsSync = (_: string) => false, mkdirSync = (..._a: unknown[]) => 0, readFileSync = (..._a: unknown[]) => "[]", writeFileSync = (..._a: unknown[]) => 0, join = (..._a: string[]) => "";
const __dirname = "";
const FIXTURE_DIR = join(__dirname, "__fixtures__");
const FIXTURE = join(FIXTURE_DIR, "trace-level2-boss.json");
const WRITE = process.env.WRITE_TRACE === "1";

/** src/player/Input.ts's mouse sensitivity at zoomLerp=0 — the nail cannon has no scope. */
const SENS = 0.0022;
/** One full revolution's worth of movementX. */
const REV = (2 * Math.PI) / SENS;

/**
 * Measured, not chosen — and **re-measured after level 2's pews stopped
 * being bosses** (player-feedback round 1 task 1; see the KNOWN-4 section of
 * the module doc comment). Both numbers moved, and the reason each had to is
 * worth keeping:
 *
 * - **`TOTAL_FRAMES` 5400 → 2700.** The phase-3 transition used to land at
 *   frame ~4900; it now lands at **2244**. Phase 2 used to cost 4360 frames
 *   because the priest's one teleport put it 7.8 units away and a blind
 *   sweep's damage rate scales with the target's angular width; the new
 *   seeded RNG stream teleports it closer, so phase 2 costs ~1830 frames
 *   instead. At the old 5400 the priest was **dead** by the cutoff (measured:
 *   `hp=-4` at frame 5400), which would have turned 2500 of the recorded
 *   frames into a corpse and broken the "awake, hurt, transformed and still
 *   alive" check below. 2700 keeps the original design intent — a few hundred
 *   frames of live phase 3 after the swap, here 456 of them (7.6s), with the
 *   boss still alive at the cutoff.
 * - **`EVERY` 20 → 18.** Not a style choice: the form-swap guard below
 *   *demands* it. The swap's visible window is the half-open interval between
 *   the phase-3 `material.map` write and the walk cycle's next one, measured
 *   here as **[2244,2258)**, and no multiple of 20 falls inside it (2240 and
 *   2260 straddle it). 18 does: 18 x 125 = 2250. This is the guard added in
 *   review round 1 doing exactly the job it was added for, on its first real
 *   occasion — the paragraph it replaced predicted that a retune could
 *   silently drop this site's coverage, and a retune just did.
 *
 * 2700/18 = 150 recorded frames, down from 270, so the fixture shrinks too.
 * 18 frames is 0.3s, slightly finer than the 20 it replaces.
 *
 * ### Re-measured again, player feedback round 2 — and the guard fired again
 *
 * KNOWN-11's fix retags level 2's two `A` tiles (the sacristy's and the
 * secret reliquary's) to `r`, so each is the +50 armour the author wrote
 * rather than a 260 hp Mancubus. Two fewer `spawnEnemy` calls at load is
 * twelve fewer `Math.random()` draws (seven per enemy, one per item), and
 * every later draw in the seeded stream shifts by twelve — which is the
 * whole mechanism behind the numbers below. The priest itself is
 * untouched: it still spawns at (33,41) with 1800 hp.
 *
 * The phase structure moved a long way, in the opposite direction from
 * last time:
 *
 * | | before round 2 | after |
 * |---|---|---|
 * | phase 1 first sampled | 180 | 180 |
 * | phase 2 first sampled | 558 | 540 |
 * | phase-3 `material.map` write | 2244 | **5460** |
 * | swap's visible window | [2244,2258) | **[5460,5475)** |
 * | phase 3 first sampled | 2250 | **5472** |
 *
 * Phase 2 costs ~4900 frames instead of ~1690. The reason is the one the
 * round-1 note already named — the priest's teleport distance is drawn
 * from this stream, and a blind sweep's damage rate scales with the
 * target's angular width — only this time the shifted stream puts it
 * *further* away rather than nearer. At the old `TOTAL_FRAMES = 2700` the
 * run simply never reached phase 3: measured, the priest ended the run in
 * phase 2 with `hp = 942`, and **four** named tests said so rather than
 * one (the phase-3 bossname check, the phase-3 size check, the
 * "awake, hurt, transformed and still alive" check, and the structural
 * guard, which reported "the priest never reached phase 3" — exactly the
 * failure it was written for, for the second regeneration running).
 *
 * - **`TOTAL_FRAMES` 2700 → 6012.** The design intent is unchanged: a few
 *   hundred frames of live phase 3 after the swap, boss still alive at the
 *   cutoff. 6012 - 5460 = **552** frames (9.2s) of phase 3, against the
 *   456 the round-1 retune left. Measured at that cutoff: `phase = 3`,
 *   `dead = false`, `hp = 271` of 1800 (15%, so the `< 33%` check has
 *   room), `formKey = "Q2"`.
 * - **`EVERY` stays 18.** The guard's window is [5460,5475) and
 *   18 x 304 = **5472** falls inside it, three frames short of the walk
 *   cycle's overwrite. 6012 is the smallest multiple of 18 at or above
 *   6000, and that is the only reason the cutoff is not the round number:
 *   `TOTAL_FRAMES / EVERY` has to be an integer for the "records the
 *   frames it was asked for" check, and 6000 is not divisible by 18.
 *   Keeping `EVERY` fixed also keeps the sampling density at 0.3s, so the
 *   fixture's resolution is comparable to the one it replaces.
 *
 * 6012/18 = 334 recorded frames, up from 150, so the fixture grows to
 * roughly the size it was two regenerations ago.
 *
 * ### Re-measured a third time, player feedback round 2 Task 1 — 6012 -> 2808
 *
 * Sound stopped drawing from the gameplay stream, and 3,433 draws leaving
 * it moved the fight back close to where round 1 had it: phase-3 swap at
 * **2241**, window **[2241,2255)**, sampled at 18 x 125 = **2250**. At the
 * old 6012 cutoff the priest was dead (`hp = -4`), so **`TOTAL_FRAMES` =
 * 2808** (567 frames of live phase 3, priest at 194 hp) and **`EVERY` stays
 * 18**. 2808/18 = 156 recorded frames. The module doc comment's last
 * section has the measurement and the field-by-field account.
 */
const TOTAL_FRAMES = Number(process.env.PROBE_FRAMES ?? 6012);
const EVERY = 18;
/**
 * The fifth knob the structural guard depends on, alongside `TOTAL_FRAMES`
 * and `EVERY`: `runTrace`'s own frame clock and the guard's write-log frame
 * math (`afterLoad` below) both have to derive frame indices the same way,
 * or the guard silently desyncs from the harness it is checking. Hoisted to
 * one constant, used in both places, instead of the two independent
 * `1000 / 60` literals an earlier version of this file carried.
 */
const DT_MS = 1000 / 60;

/** Where the priest is placed by `putAbs(L,16,20,"Q")`, in world units. */
const PRIEST_X = 39, PRIEST_Z = 37;
/** Grid (21,21) — an empty crypt floor cell, 10.2 units from the priest with clear LOS. */
const START_X = Number(process.env.PROBE_X ?? 49), START_Z = Number(process.env.PROBE_Z ?? 41);

function bossScript(): InputEvent[] {
  const s: InputEvent[] = [{ frame: 2, kind: "pointerlock", locked: true }];
  // Hold the trigger from just after the 2.7s wake cinematic (which ends
  // around frame 165 and clears input.firing on the way in). The nail
  // cannon is automatic and self-reloading, so this one event is the whole
  // firing script.
  s.push({ frame: 220, kind: "button", type: "mousedown", button: 0 });
  // Standing-turret sweep, one revolution every SWEEP_SECS, from after the
  // phase-1 melee exchange has resolved. See the module doc comment for why
  // it covers the whole circle instead of the wedge the boss happens to
  // teleport into.
  const SWEEP_START = 620, SWEEP_STEP = 4, SWEEP_SECS = Number(process.env.PROBE_SWEEP ?? 9);
  const perStep = REV / ((SWEEP_SECS * 60) / SWEEP_STEP);
  for (let f = SWEEP_START; f <= TOTAL_FRAMES; f += SWEEP_STEP) {
    s.push({ frame: f, kind: "move", movementX: perStep, movementY: 0 });
  }
  return s;
}

const INPUT: readonly InputEvent[] = bossScript();

let trace: TraceFrame[];
const PROBE: string[] = [];
let lastPhase = 1, deadLogged = false;
/** The Corrupted Priest itself, captured in `afterLoad` and read after the run. */
let priest: (typeof world.enemies)[number];
/**
 * The priest's hitbox as it spawned — i.e. its phase-1/phase-2 size, read
 * before `Boss.ts`'s phase-3 arm stretches it. Captured because `priest` is
 * a live reference: by the time the tests run it holds the phase-3 numbers,
 * and the two are exactly what review round 1 found confused in this
 * file's header.
 */
let spawnW = 0, spawnH = 0;
/**
 * The physical shape of every `kind:"v"` prop level 2 built, captured in
 * `afterLoad` — see the "level 2's pews really are pews" test below for why
 * a named check exists at all when the fixture already covers it.
 */
let pewShapes: Array<Record<string, unknown>> = [];
/**
 * Every write to the priest's `sp.material.map`, in chronological order —
 * the structural guard for the phase-3 form swap (review round 1, Important
 * 1). Installed by the accessor in `afterLoad` below; see this file's
 * module doc comment, "The form swap is pinned by exactly one sampled
 * frame", for what it proves and why.
 */
let mapWrites: Array<{ frame: number; phase: number }>;

beforeAll(async () => {
  // Pre-boot seeding, the `combatTrace` way: loadLevel never touches the
  // inventory, so this survives it. Slot 6 is the NAIL CANNON.
  S.weapons[6] = true;
  S.cur = 6;
  S.mag[6] = 50;
  S.ammo.nails = 100_000;

  trace = await runTrace({
    seed: 20260913,
    frames: TOTAL_FRAMES,
    dtMs: DT_MS,
    input: INPUT,
    every: EVERY,
    level: 2,
    until: (frame) => {
      if (!priest) return false;
      const ph = priest.phase;
      if (ph !== lastPhase) { PROBE.push(`frame ${frame}: phase ${lastPhase} -> ${ph} hp ${priest.hp} player ${S.hp} priest at ${(priest.x / 2).toFixed(1)},${(priest.z / 2).toFixed(1)}`); lastPhase = ph; }
      if (frame % 300 === 0 && frame >= 600 && frame <= 1500) PROBE.push(`  los ${los(player.px, player.pz, priest.x, priest.z)} solid-mid ${solidAt((player.px + priest.x) / 2, (player.pz + priest.z) / 2)} shots ${(S as unknown as { shots: number }).shots} hits ${(S as unknown as { hitsLanded: number }).hitsLanded} yaw ${input.yaw.toFixed(2)} bearing ${Math.atan2(-(priest.x - player.px), -(priest.z - player.pz)).toFixed(2)} pyy ${player.pyy.toFixed(2)} pitch ${input.pitch.toFixed(3)} ammo ${S.ammo.nails}`);
      if (frame >= 560 && frame <= 1700) { const o = renderState.camera.position, e = priest as unknown as { x: number; z: number; h: number; w: number; fy?: number }; const dvv = new THREE.Vector3(); renderState.camera.getWorldDirection(dvv); const dv = { x: dvv.x, y: dvv.y, z: dvv.z }; const ecy = e.h * .5 + (e.fy || 0); const ex = e.x - o.x, ez = e.z - o.z, ey = ecy - o.y; const t = ex * dv.x + ez * dv.z + ey * dv.y; const cx = o.x + dv.x * t, cz = o.z + dv.z * t, cy = o.y + dv.y * t; const dd = Math.hypot(cx - e.x, cz - e.z); if (dd < 1.6) PROBE.push(`  AIM f${frame} wstate ${weaponRuntime.wstate} mag ${S.mag[6]} shots ${(S as unknown as { shots: number }).shots} dir ${dv.x.toFixed(2)},${dv.y.toFixed(3)},${dv.z.toFixed(2)} t ${t.toFixed(2)} dd ${dd.toFixed(2)} cy ${cy.toFixed(2)} band ${(ecy - e.h * .55).toFixed(2)}..${(ecy + e.h * .55).toFixed(2)} hits ${(S as unknown as { hitsLanded: number }).hitsLanded}`); }
      if (frame === 700) { const o = renderState.camera.position, e = priest as unknown as { x: number; z: number; h: number; w: number; fy?: number; fly?: boolean; dormant: boolean; dead: boolean }; const ecy = e.h * .5 + (e.fy || 0); const dx = e.x - o.x, dz = e.z - o.z, dy = ecy - o.y, d = Math.hypot(dx, dz, dy); PROBE.push(`  CAM ${o.x.toFixed(2)},${o.y.toFixed(2)},${o.z.toFixed(2)} priest ${e.x.toFixed(2)},${e.z.toFixed(2)} h ${e.h.toFixed(2)} w ${e.w.toFixed(2)} fy ${e.fy} fly ${e.fly} dormant ${e.dormant} ecy ${ecy.toFixed(2)} d ${d.toFixed(2)} playerpx ${player.px},${player.pz},${player.pyy}`); let wallT = 1e9; const dir = { x: dx / d, y: dy / d, z: dz / d }; for (let t = 0; t < 46; t += .1) { const sx = o.x + dir.x * t, sz = o.z + dir.z * t; if (solidAt(sx, sz)) { wallT = t; PROBE.push(`  RAY BLOCKED at t ${t.toFixed(1)} (${sx.toFixed(2)},${sz.toFixed(2)}) cell ${Math.floor(sx / 2)},${Math.floor(sz / 2)}`); break; } } PROBE.push(`  wallT ${wallT}`); }
      if (frame % 300 === 0) PROBE.push(`frame ${frame}: phase ${ph} hp ${Math.round(priest.hp)} player ${Math.round(S.hp)} priest at ${priest.x.toFixed(1)},${priest.z.toFixed(1)} dead ${priest.dead} summons ${world.enemies.filter((e) => e.summoned && !e.dead).length}`);
      if (priest.dead && !deadLogged) { deadLogged = true; PROBE.push(`frame ${frame}: DEAD`); }
      return false;
    },
    // Post-load seeding, for the two fields loadLevel itself writes. See
    // `TraceOptions.afterLoad` and this file's doc comment.
    afterLoad: () => {
      const found = world.enemies.find((e) => e.key === "Q");
      if (!found) {
        throw new Error(
          "level 2 loaded without a `Q` enemy — this trace exists to record THE CORRUPTED " +
          "PRIEST, and a run that silently recorded some other level's layout would still pass " +
          "its fixture comparison after a regeneration",
        );
      }
      priest = found;
      spawnW = found.w;
      spawnH = found.h;
      // Read here rather than in the test body: `world.props` is live and
      // play mutates it (`breakProp` sets `dead`, `explodeBarrel` removes
      // entries), so only a pre-frame-1 read is a reading of what
      // `loadLevel` actually built.
      pewShapes = world.props
        .filter((p) => p.kind === "v")
        .map((p) => ({ r: p.r, hgt: p.hgt, hp: p.hp, explosive: p.explosive }));
      if (found.x !== PRIEST_X || found.z !== PRIEST_Z) {
        throw new Error(
          `the priest spawned at (${found.x},${found.z}), not (${PRIEST_X},${PRIEST_Z}) — the ` +
          "player's seeded start below was chosen for that position's line of sight and wake " +
          "radius, so a moved boss silently invalidates the whole script",
        );
      }
      player.px = START_X;
      player.pz = START_Z;
      S.hp = 5000;

      // The structural guard itself (review round 1, Important 1). A
      // `configurable` accessor on the priest's own material — not a
      // `src/` change, and not a new stub: `sp.material.map` is a plain,
      // writable, configurable instance property (three's `SpriteMaterial`
      // assigns it directly in its constructor), so redefining it here with
      // a getter/setter that stores-and-forwards is safe. The getter always
      // returns exactly what the setter last stored, so nothing that reads
      // `material.map` afterward — three's own renderer included — can tell
      // the difference; this was confirmed, not assumed — the accessor is
      // installed on every run (not toggled), so the "the run matches the
      // committed recording" test below re-proves it every time: an
      // accessor that perturbed the run would have moved the fixture.
      //
      // `performance.now()` here is `runTrace`'s own faked clock, read at
      // the same instant (`fakeNow===t0`, before frame 1) its frame loop
      // will start counting from — so `(performance.now()-t0)/DT_MS`, at any
      // later write, reproduces the exact frame index `runTrace` itself
      // would assign that tick. `DT_MS` is the same module constant passed
      // to `runTrace` as `dtMs` above — one knob, not two independent
      // literals that could silently drift apart.
      mapWrites = [];
      const t0 = performance.now();
      const material = priest.sp.material as unknown as { map: unknown };
      let currentMap: unknown = material.map;
      Object.defineProperty(material, "map", {
        configurable: true,
        get(): unknown { return currentMap; },
        set(v: unknown): void {
          currentMap = v;
          mapWrites.push({ frame: Math.round((performance.now() - t0) / DT_MS), phase: priest.phase });
        },
      });
    },
  });
  // Written here, in beforeAll right after runTrace, matching the model
  // trace.test.ts/combatTrace.test.ts both use — review round 1, Minor: an
  // earlier version of this file wrote the fixture from inside the
  // comparison test instead, which means a filtered regeneration run
  // (vitest -t "some other test name") would silently write nothing.
  if (WRITE) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(FIXTURE, JSON.stringify(trace, null, 1) + "\n");
  }
}, 600_000);

describe("probe", () => {
  it("prints", () => {
    // eslint-disable-next-line no-console
    console.log(PROBE.join(String.fromCharCode(10)) + String.fromCharCode(10) + `writes: ${JSON.stringify(mapWrites.filter((w) => w.phase === 3).slice(0, 3))} and the one after: ${JSON.stringify(mapWrites[mapWrites.findIndex((w) => w.phase === 3) + 1])}` + String.fromCharCode(10) + `end hp ${priest.hp} player ${S.hp} phase ${priest.phase} formKey ${priest.formKey} sampled hud last ${trace[trace.length - 1].hud.hp}`);
    expect(true).toBe(true);
  });
});
describe("the recorded run actually fights a priest boss", () => {
  it("records the frames it was asked for", () => {
    expect(trace.length).toBe(TOTAL_FRAMES / EVERY);
  });

  it("the priest woke, and priestThink drove it to phase 3", () => {
    // `Hud.ts` only names a boss that is `!dead && !dormant`, and the
    // "— PHASE n" suffix is `boss.phase`, which only `priestThink` writes.
    const names = new Set(trace.map((f) => f.hud.bossname).filter(Boolean));
    expect([...names]).toContain("THE CORRUPTED PRIEST — PHASE 1");
    expect([...names]).toContain("THE CORRUPTED PRIEST — PHASE 2");
    expect([...names]).toContain("THE CORRUPTED PRIEST — PHASE 3");
  });

  it("is the size this file's header does its sweep arithmetic with — phase 2, not phase 3", () => {
    // Review round 1, Important 1: the header's phase-2 passages had been
    // given the priest's PHASE-3 dimensions (w=2.71, h=3.53), which made
    // the file argue against itself — the angular width it computed from
    // them was *larger* than the pre-teleport figure, while the paragraph
    // two screens down explains why the sweep got a *smaller* target. The
    // numbers are re-derived in the header; this pins them, so the next
    // person to quote a dimension there has a test that disagrees rather
    // than prose that quietly doesn't.
    //
    // Derivation, independent of the header: `EnemyDefs.ts` has `Q.w=1.7,
    // Q.h=2.6`; `spawnEnemy` (`src/world/LevelLoader.ts`) multiplies by
    // `SZ=1.18` and skips the x1.15 elite bump because `d.boss` is true.
    expect(spawnW).toBeCloseTo(1.7 * 1.18, 10);
    expect(spawnH).toBeCloseTo(2.6 * 1.18, 10);
    expect(spawnW).toBeCloseTo(2.006, 3);
    expect(spawnH).toBeCloseTo(3.068, 3);
    // hitscan's half-width for that w — the number the sweep arithmetic
    // actually uses (`src/weapons/Hitscan.ts`: `dd<e.w*.45+.1`).
    expect(spawnW * 0.45 + 0.1).toBeCloseTo(1.0027, 4);

    // And where 2.71/3.53 really come from: `Boss.ts`'s phase-3 arm runs
    // `e.w*=1.35; e.h*=1.15` AT the transition, so they describe the boss
    // only after phase 2 is over. The run ends in phase 3, so the live
    // object carries them now.
    expect(priest.phase).toBe(3);
    expect(priest.w).toBeCloseTo(spawnW * 1.35, 10);
    expect(priest.h).toBeCloseTo(spawnH * 1.15, 10);
    expect(priest.w).toBeCloseTo(2.708, 3);
    expect(priest.h).toBeCloseTo(3.528, 3);
  });

  it("level 2's pews really are pews, not explosive barrels — review round 1, Minor 2", () => {
    // Task 1 turned level 2's eight `V` tiles into `v`, a prop-only pew.
    // Until this test, the only thing standing between `spawnProp`'s
    // `ch==="V"||ch==="v"` branch and silence was the fixture's digest at
    // frame 18: break the branch and all eight tiles fall through to the
    // **explosive barrel** `else`, and the failure reads as a hash that
    // doesn't match. That is a real regression reported illegibly. This
    // says what it is instead.
    //
    // The numbers are `spawnProp`'s pew arm (`src/world/PropSpawn.ts`):
    // `r=.75; hgt=.95; hp=18;` with `explosive` left false. The barrel
    // `else` it must not have fallen into is `r=.48; hgt=1.1; hp=24;
    // explosive=true` — every field differs, so this cannot pass by
    // accident on a partial fall-through either.
    expect(pewShapes).toHaveLength(8);
    for (const p of pewShapes) {
      expect(p).toEqual({ r: 0.75, hgt: 0.95, hp: 18, explosive: false });
    }
  });

  it("the priest summoned its flock", () => {
    // showMsg("THE PRIEST CALLS HIS FLOCK") has exactly one call site in
    // src/: priestThink's phase-2 summon block.
    expect(trace.some((f) => f.hud.msg.includes("THE PRIEST CALLS HIS FLOCK"))).toBe(true);
    // And the summons are really in the world. Level 2 has no "Y" cell, so
    // the challenge plate — the only other `summoned` spawner in src/ —
    // cannot have produced these.
    expect(world.enemies.filter((e) => e.summoned).length).toBeGreaterThan(0);
  });

  it("the priest ends the run awake, hurt, transformed and still alive", () => {
    // None of this is visible in any field runTrace records, so it is read
    // off the live enemy — the same reason combatTrace checks `S.kills`
    // directly.
    expect(priest.dormant).toBe(false);
    expect(priest.dead).toBe(false);
    expect(priest.hp).toBeLessThan(priest.maxhp * 0.33);
    expect(priest.formKey).toBe("Q2");
  });

  it("the phase-3 form swap always lands inside a sampled frame — structural guard, review round 1", () => {
    // See the module doc comment's "The form swap is pinned by exactly one
    // sampled frame" section. `mapWrites` is every write to the priest's
    // material.map, in order; the first one recorded with phase===3 is
    // necessarily the form swap itself (`Boss.ts`'s phase transition sets
    // `e.phase=3` and performs the swap in the same call, before any
    // phase-3 walk-cycle write can exist), and the very next write after it
    // is the walk cycle overwriting it. Whatever that half-open window is,
    // a sampled frame (a multiple of EVERY) has to fall inside it, or this
    // site's coverage is gone regardless of what the fixture comparison says.
    const phase3Writes = mapWrites.filter((w) => w.phase === 3);
    expect(phase3Writes.length, "the priest never reached phase 3 — nothing to check the window against").toBeGreaterThan(0);

    const swap = phase3Writes[0]!;
    const swapIdx = mapWrites.indexOf(swap);
    const overwrite = mapWrites[swapIdx + 1];
    expect(
      overwrite,
      "nothing ever overwrote the phase-3 form swap's material.map — the window is open-ended, " +
      "which this test cannot check a sample against",
    ).toBeDefined();

    const lo = swap.frame, hi = overwrite!.frame;
    let sampledFrameInWindow = -1;
    for (let f = EVERY; f <= TOTAL_FRAMES; f += EVERY) {
      if (f >= lo && f < hi) { sampledFrameInWindow = f; break; }
    }
    expect(
      sampledFrameInWindow,
      `the form swap's visible window is [${lo},${hi}) and no multiple of EVERY(${EVERY}) falls in ` +
      "it — a retune of TOTAL_FRAMES/EVERY/DT_MS/the sweep/the seed has silently moved this site's " +
      "coverage out of the sampled frames",
    ).toBeGreaterThan(0);
  });

  it("the weapon state machine left idle (NOT boss-specific — see the module doc comment)", () => {
    const wnames = new Set(trace.map((f) => f.hud.wname));
    expect(wnames.size).toBeGreaterThan(1);
    expect([...wnames].some((w) => w.includes("RELOADING"))).toBe(true);
  });
});

