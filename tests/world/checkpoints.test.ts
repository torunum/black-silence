// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { after, clearAllTimers, pendingTimers } from "../../src/core/Timers";
import { clearScheduled, pendingScheduled, schedule, tickScheduled } from "../../src/core/Time";
import { trackedCount } from "../../src/render/DisposeRegistry";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { input } from "../../src/player/Input";
import { game } from "../../src/core/Game";
import { S } from "../../src/core/State";
import { save } from "../../src/save/SaveGame";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { screenShake } from "../../src/fx/ShakeState";
import { CELL, WALLH } from "../../src/world/Grid";
import { LEVELS } from "../../src/world/levels/index";
import { checkpoint } from "../../src/world/CheckpointState";
import { lastSoundLevel } from "../../src/audio/Levels";

/**
 * CHECKPOINTS, ON THE REAL GAME (deeper-levels plan, Task 1). Boots the game as the player does, loads
 * the dungeon (two markers) and the church (two more), and holds the whole flow to what the plan says:
 * a marker catches when it is passed and records what the player has; death no longer reloads the page;
 * the death screen offers the shrine (if there is one) and a restart, each by deliberate input; rising
 * puts back the player and the world's facts at the shrine; a restart and a new level forget the
 * shrine; and nothing of the dead run is left running however often the player dies.
 *
 * The rule, and why: `src/world/CheckpointState.ts`. What a death does to the numbers: `src/world/Respawn.ts`.
 */

let loadLevel: (i: number) => void;
let playerTick: (dt: number) => void;
let damagePlayer: (d: number, silent?: boolean) => void;
let itemsTick: (dt: number) => void;
let doorTick: (dt: number) => void;
let killEnemy: (e: unknown, d: number, info: object) => void;
let dropAmmo: (x: number, z: number) => void;
let DEATH_HOLD: number;
let gradeOf: () => string;
let statsHtml: () => string;
let startBossMusic: () => void;
let screenFxCount: () => number;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ playerTick, damagePlayer } = await import("../../src/player/Player"));
  ({ itemsTick, doorTick } = await import("../../src/player/Interact"));
  ({ killEnemy, dropAmmo } = await import("../../src/enemies/Death"));
  ({ DEATH_HOLD } = await import("../../src/ui/DeathScreen"));
  ({ gradeOf, statsHtml } = await import("../../src/ui/LevelEnd"));
  ({ startBossMusic } = await import("../../src/audio/Ambient"));
  ({ screenFxCount } = await import("../../src/render/Overlay2D"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  (await import("../../src/world/Opening")).skipOpening();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

const el = (id: string): HTMLElement => document.getElementById(id)!;
const key = (code: string, repeat = false): void => { window.dispatchEvent(new KeyboardEvent("keydown", { code, repeat })); };
const mark = (i = 0) => checkpoint.marks[i];

/** A fresh level, the player in control of it and fully able to be hurt. */
function start(level: number): void {
  S.dead = false; S.won = false; game.inputLock = false;
  S.armor = 0; S.key = false; S.weapons.fill(false); S.weapons[0] = true; S.mag.fill(0); S.mag[0] = 6; S.cur = 0;
  Object.assign(S.ammo, { bullets: 60, shells: 0, slugs: 0, crosses: 0, nails: 0, souls: 0 });
  S.totKills = 0; S.totGibs = 0; S.totSecrets = 0;
  loadLevel(level);
  player.spawnGuard = 0;
}
/** Stands the player on a marker and runs the real tick, which is what catches it. */
function pass(i = 0): void {
  player.px = mark(i).x; player.pz = mark(i).z; player.vx = player.vz = 0;
  playerTick(1 / 60);
}
function die(): void {
  player.spawnGuard = 0; damagePlayer(9999);
  expect(S.dead).toBe(true);
}
/** ...and the screen has been up for as long as it takes to be allowed to answer it. */
function dieAndWait(): void { die(); checkpoint.deadAt -= DEATH_HOLD * 1000 + 50; }
const rise = (): void => el("riseBtn").click();
const restart = (): void => el("restartBtn").click();

beforeEach(() => { vi.restoreAllMocks(); S.deaths = 0; });

describe("a marker catches when it is passed", () => {
  it("stands unlit with nothing lit in the scene, and stays so while the player is elsewhere", () => {
    start(1);
    expect(checkpoint.marks).toHaveLength(2);
    expect(checkpoint.snap).toBeNull();
    expect(renderState.scene.children.filter((c) => c.name.startsWith("checkpoint"))).toHaveLength(0);
    playerTick(1 / 60);   // at the spawn, far from both
    expect(checkpoint.marks.every((m) => !m.lit)).toBe(true);
    expect(checkpoint.snap).toBeNull();
  });

  it("lights it on the real tick, with a flame, a glow, a sound from it and a line on the HUD, and records the snapshot", () => {
    start(1);
    S.hp = 77; S.armor = 33; input.yaw = 1.3;
    pass(0);
    const m = mark(0);
    expect(m.lit).toBe(true);
    expect(m.sprites.length).toBe(m.flames.length * 2);
    const names = renderState.scene.children.filter((c) => c.name.startsWith("checkpoint")).map((c) => c.name);
    expect(names.filter((n) => n === "checkpointFlame")).toHaveLength(m.flames.length);
    expect(names.filter((n) => n === "checkpointGlow")).toHaveLength(m.flames.length);
    expect(lastSoundLevel()).toBe("shrineLights");
    expect(el("msg").textContent).toContain("THE CANDLE CATCHES");
    const s = checkpoint.snap!;
    expect(s.mark).toBe(0);
    expect(s.lit).toEqual([0]);
    expect(s.inv.hp).toBe(77); expect(s.inv.armor).toBe(33);
    expect(s.at).toEqual({ x: player.px, z: player.pz, yaw: 1.3 });
    expect(mark(1).lit).toBe(false);
  });

  it("catches only once, and the next marker replaces the record while the first stays lit", () => {
    start(1);
    pass(0);
    const first = checkpoint.snap;
    S.armor = 50;
    pass(0);
    expect(checkpoint.snap, "the same marker does not record again").toBe(first);
    pass(1);
    expect(checkpoint.snap!.mark).toBe(1);
    expect(checkpoint.snap!.lit).toEqual([0, 1]);
    expect(checkpoint.snap!.inv.armor).toBe(50);
  });

  it("does not catch while the player is dead or the game is locked (an opening, a cinematic, a door walk)", () => {
    start(1);
    game.inputLock = true; pass(0);
    expect(mark(0).lit).toBe(false);
    game.inputLock = false;
    S.dead = true; pass(0);
    expect(mark(0).lit).toBe(false);
    S.dead = false;
  });
});

describe("death does not reload the page", () => {
  it("has no reload on the death screen's markup or code, and answering it moves no page", () => {
    expect(el("dead").innerHTML).not.toMatch(/reload/);
    expect(el("dead").querySelector("[onclick]")).toBeNull();
    start(1);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    pass(0);
    dieAndWait();
    const scene = renderState.scene;
    rise();
    restart();   // (not dead any more: nothing)
    dieAndWait();
    restart();
    expect(err.mock.calls.filter((c) => String(c[0]).includes("navigation")), "jsdom reports a page reload as a navigation").toHaveLength(0);
    expect(renderState.scene, "the level was rebuilt in the engine").not.toBe(scene);
    expect(S.dead).toBe(false);
  });

  it("shows the death screen with both choices when there is a shrine, and only the restart when there is not", () => {
    start(1);
    die();
    expect(el("dead").classList.contains("hidden")).toBe(false);
    expect(el("riseBtn").classList.contains("hidden"), "no shrine, no rise").toBe(true);
    expect(el("deadwhere").textContent).toMatch(/NO SHRINE/);
    expect(el("restartBtn").textContent).toMatch(/RESTART THE LEVEL/);
    start(1); pass(0);
    die();
    expect(el("riseBtn").classList.contains("hidden")).toBe(false);
    expect(el("riseBtn").textContent).toMatch(/RISE AGAIN AT THE LAST SHRINE/);
    expect(el("deadwhere").textContent).toMatch(/REMEMBERS/);
  });

  it("takes nothing in the first second, and nothing from a key held down or a stray key while alive", () => {
    start(1); pass(0);
    const scene0 = renderState.scene;
    key("Space");   // alive: Space is a jump, not an answer
    expect(renderState.scene).toBe(scene0);
    die();
    key("Space"); rise(); restart(); key("KeyR");
    expect(S.dead, "nothing is taken before DEATH_HOLD").toBe(true);
    checkpoint.deadAt -= DEATH_HOLD * 1000 + 50;
    key("Space", true); key("KeyR", true);
    expect(S.dead, "a key's auto-repeat does nothing").toBe(true);
    key("Escape"); key("KeyW");
    expect(S.dead, "no other key does").toBe(true);
    key("Space");
    expect(S.dead).toBe(false);
    expect(renderState.scene).not.toBe(scene0);
  });

  it("answers Space with the shrine, R with a restart, and Space with a restart when there is no shrine", () => {
    start(1); S.armor = 25; pass(0);
    S.armor = 0; dieAndWait();
    key("Space");
    expect(S.dead).toBe(false);
    expect(S.armor, "Space rose at the shrine").toBe(25);
    dieAndWait();
    key("KeyR");
    expect(S.dead).toBe(false);
    expect(checkpoint.snap, "R restarted: the shrine is forgotten").toBeNull();
    dieAndWait();
    key("Space");
    expect(S.dead, "with no shrine, Space restarts").toBe(false);
  });
});

describe("rising again at the last shrine", () => {
  it("puts back the player — health, armour, key, every weapon, magazine and ammunition count — at the marker, facing as they faced", () => {
    start(1);
    Object.assign(S, { hp: 63, armor: 41, key: true, cur: 2 });
    S.weapons[1] = true; S.weapons[2] = true; S.mag[1] = 5; S.mag[2] = 3;
    Object.assign(S.ammo, { bullets: 41, shells: 11, slugs: 2 });
    input.yaw = 0.7;
    pass(0);
    const at = { x: player.px, z: player.pz };
    // everything the dead run did afterwards
    Object.assign(S, { hp: 9, armor: 0, key: false, cur: 0 });
    S.weapons[2] = false; S.mag[1] = 0; Object.assign(S.ammo, { bullets: 3, shells: 0, slugs: 9 });
    player.px = 30; player.pz = 50; input.yaw = 3;
    weaponRuntime.wstate = "reload"; weaponRuntime.zoomLerp = .8; screenShake.hitStop = .4;
    dieAndWait();
    rise();
    expect(S.dead).toBe(false);
    expect(el("dead").classList.contains("hidden")).toBe(true);
    expect([S.hp, S.armor, S.key, S.cur]).toEqual([63, 41, true, 2]);
    expect(S.weapons.slice(0, 3)).toEqual([true, true, true]);
    expect([S.mag[1], S.mag[2]]).toEqual([5, 3]);
    expect(S.ammo).toMatchObject({ bullets: 41, shells: 11, slugs: 2 });
    expect([player.px, player.pz]).toEqual([at.x, at.z]);
    expect(Math.hypot(player.px - mark(0).x, player.pz - mark(0).z)).toBeLessThan(2.6);
    expect(input.yaw).toBeCloseTo(0.7);
    expect(player.spawnGuard, "a moment's safety, as on entering a level").toBeGreaterThan(1);
    expect(weaponRuntime.wstate).toBe("equip");
    expect([weaponRuntime.zoomLerp, screenShake.hitStop]).toEqual([0, 0]);
    expect(mark(0).lit, "the shrine is lit again, and the next death rises here too").toBe(true);
    expect(checkpoint.snap).not.toBeNull();
  });

  it("keeps the dead dead, the taken taken and the opened open — and brings back what the dead run killed, took and opened after", () => {
    start(1);
    const fighters = world.enemies.map((e, i) => [e, i] as const).filter(([e]) => !e.boss);
    const [[a], [b]] = fighters, ia = world.enemies.indexOf(a), ib = world.enemies.indexOf(b);
    const ammo = world.items.filter((it) => ["bullets", "shells", "slugs", "crosses"].includes(it.kind as string));
    const [pa, pb] = ammo, ipa = world.items.indexOf(pa), ipb = world.items.indexOf(pb);
    const [da, db] = Object.keys(world.doors).filter((k) => !(world.doors[k] as { secret?: boolean }).secret);
    const take = (it: Record<string, unknown>): void => { player.px = it.x as number; player.pz = it.z as number; itemsTick(1 / 60); expect(it.taken).toBe(true); };

    // before the shrine: one enemy killed, one pickup taken, one door opened, one drop left lying
    killEnemy(a, 999, {});
    take(pa);
    (world.doors[da] as { open: boolean }).open = true; doorTick(5);
    dropAmmo(world.items.length + 2, 3);
    const lying = world.items[world.items.length - 1];
    pass(0);
    expect(S.kills).toBe(1);
    // after it: another killed, another taken, another opened, the drop picked up
    killEnemy(b, 999, {});
    take(pb);
    take(lying);
    (world.doors[db] as { open: boolean }).open = true; doorTick(5);
    expect(S.kills).toBe(2);
    dieAndWait();
    rise();

    const ea = world.enemies[ia], eb = world.enemies[ib];
    expect(ea.dead && ea.gone, "killed before the shrine: still dead").toBe(true);
    expect(renderState.scene.children.includes(ea.sp), "and gone from the scene").toBe(false);
    expect(eb.dead || eb.gone, "killed after it: alive again").toBe(false);
    expect(renderState.scene.children.includes(eb.sp)).toBe(true);
    expect(world.items[ipa].taken, "taken before: still taken").toBe(true);
    expect(renderState.scene.children.includes(world.items[ipa].sp as never)).toBe(false);
    expect(world.items[ipb].taken, "taken after: there to take again").toBeFalsy();
    expect(renderState.scene.children.includes(world.items[ipb].sp as never)).toBe(true);
    expect(world.items.slice(CPbase()).filter((it) => !it.taken), "the drop that was lying at the shrine lies there again").toHaveLength(1);
    const A = world.doors[da] as { open: boolean; mesh: { position: { y: number } } }, B = world.doors[db] as typeof A;
    expect(A.open, "opened before: still open").toBe(true);
    expect(A.mesh.position.y).toBe(-WALLH / 2);
    expect(B.open, "opened after: shut again").toBe(false);
    expect(B.mesh.position.y).toBe(WALLH / 2);
    expect(S.kills, "and the tally is the shrine's").toBe(1);
  });
});

const CPbase = (): number => checkpoint.base.items;

describe("restarting the level", () => {
  it("starts over with what the player came in with, at the spawn, with nothing lit and the whole level alive", () => {
    S.armor = 20; Object.assign(S.ammo, { bullets: 77 });
    loadLevel(1); player.spawnGuard = 0;
    const [spawn] = [{ x: player.px, z: player.pz }];
    S.armor = 20;   // (as loaded)
    pass(0); S.armor = 0; S.ammo.bullets = 4; S.weapons[3] = true; S.key = true;
    killEnemy(world.enemies.find((e) => !e.boss), 999, {});
    const scene0 = renderState.scene;
    dieAndWait();
    restart();
    expect(renderState.scene).not.toBe(scene0);
    expect(checkpoint.snap, "a restart forgets the shrine").toBeNull();
    expect(checkpoint.marks.every((m) => !m.lit)).toBe(true);
    expect(renderState.scene.children.filter((c) => c.name.startsWith("checkpoint"))).toHaveLength(0);
    expect([S.hp, S.armor, S.ammo.bullets, S.weapons[3], S.key]).toEqual([100, 20, 77, false, false]);
    expect([player.px, player.pz]).toEqual([spawn.x, spawn.z]);
    expect(world.enemies.every((e) => !e.dead && !e.gone)).toBe(true);
    expect([S.kills, S.gibs, S.secrets, S.shots, S.propsBroken]).toEqual([0, 0, 0, 0, 0]);
    expect(S.dead).toBe(false);
  });
});

describe("a new level forgets the shrine", () => {
  it("clears the snapshot and the lit markers when another level loads, and the save is untouched", () => {
    save.maxLevel = 3;
    start(1); pass(0); pass(1);
    expect(checkpoint.snap).not.toBeNull();
    expect(S.deaths).toBe(0);
    die();
    expect(S.deaths).toBe(1);
    checkpoint.deadAt -= 2000;
    rise();
    expect(S.deaths, "a rise keeps the count").toBe(1);
    start(2);
    expect(checkpoint.snap).toBeNull();
    expect(checkpoint.entry).not.toBeNull();
    expect(checkpoint.marks.map((m) => m.k)).toEqual(["shrine", "shrine"]);
    expect(checkpoint.marks.every((m) => !m.lit)).toBe(true);
    expect(S.deaths, "and the level's deaths").toBe(0);
    expect(save.maxLevel, "saves are unchanged").toBe(3);
    start(1);   // and back: a first load again, nothing carried
    expect(checkpoint.snap).toBeNull();
    die(); expect(el("riseBtn").classList.contains("hidden")).toBe(true);
  });
});

describe("what a death does to the numbers", () => {
  it("rewinds kills, gibs, secrets, shots, hits and breakage to the shrine, so the grade counts the life being kept", () => {
    start(1);
    Object.assign(S, { shots: 10, hitsLanded: 4, gibs: 2, secrets: 1, propsBroken: 3 });
    const fighters = world.enemies.filter((e) => !e.boss);
    killEnemy(fighters[0], 999, {});
    pass(0);
    killEnemy(fighters[1], 999, {}); killEnemy(fighters[2], 999, {});
    Object.assign(S, { shots: 55, hitsLanded: 30, gibs: 6, secrets: 2, propsBroken: 9 });
    expect(S.kills).toBe(3);
    dieAndWait();
    rise();
    expect([S.kills, S.totKills, S.shots, S.hitsLanded, S.gibs, S.secrets, S.propsBroken]).toEqual([1, 1, 10, 4, 2, 1, 3]);
    expect(S.kills / S.enemiesTotal!, "never more kills than enemies").toBeLessThanOrEqual(1);
    expect(S.enemiesTotal, "the level still counts everything it placed").toBe(world.enemies.filter((e) => !e.summoned).length);
    expect(["S", "A", "B", "C", "D"]).toContain(gradeOf());
  });

  it("does not count the time spent on the death screen, keeps the time of the lost stretch, and says how many deaths on the card", () => {
    start(1); pass(0);
    S.levelT0 = performance.now() - 30000;
    expect(statsHtml(), "no DEATHS until there is one").not.toMatch(/DEATHS/);
    dieAndWait();
    checkpoint.deadAt -= 9000;   // nine seconds more looking at the screen
    const t0 = S.levelT0, atDeath = checkpoint.deadAt - t0;
    rise();
    const now = performance.now() - S.levelT0;
    expect(Math.abs(now - atDeath), "the clock is where it stood when the player died").toBeLessThan(200);
    expect(S.deaths).toBe(1);
    expect(statsHtml()).toMatch(/DEATHS <b>1<\/b>/);
    dieAndWait(); restart();
    expect(S.deaths, "a restart counts it too").toBe(2);
    expect(performance.now() - S.levelT0, "and starts the clock over").toBeLessThan(500);
  });
});

describe("nothing of the dead run is left running", () => {
  /** What a level load must leave exactly as it found it. */
  const census = (): { scene: number; timers: number; scheduled: number; tracked: number; fx: number } => ({
    scene: renderState.scene.children.length, timers: pendingTimers(), scheduled: pendingScheduled(), tracked: trackedCount(), fx: screenFxCount(),
  });

  it("drops the dead run's timers and scheduled calls, whichever way the player comes back", () => {
    start(1); pass(0);
    let fired = 0;
    schedule(() => { fired++; }, 3); after(() => { fired++; }, 99999);
    expect(pendingScheduled()).toBeGreaterThan(0);
    dieAndWait(); rise();
    schedule(() => { fired++; }, 3); after(() => { fired++; }, 99999);
    dieAndWait(); restart();
    tickScheduled(60);
    expect(fired, "none of them fires into the new level").toBe(0);
    expect(pendingScheduled()).toBe(0);
  });

  it("does not carry the death's blood on the lens, or a casing in the air, into the new level", () => {
    start(1); pass(0);
    dieAndWait();   // (the killing blow drew blood on the screen)
    expect(screenFxCount()).toBeGreaterThan(0);
    rise();
    expect(screenFxCount()).toBe(0);
    dieAndWait(); restart();
    expect(screenFxCount()).toBe(0);
  });

  it("does not grow the scene, the timers or the GPU resources over repeated deaths, by either way back", () => {
    start(1); pass(0);
    dieAndWait(); rise();
    const base = census();
    const scenes = new Set<object>();
    for (let n = 0; n < 8; n++) {
      // a messy run: shots in the air, a drop on the floor, music playing, a wall of timers
      dropAmmo(10, 10); startBossMusic(); schedule(() => {}, 9); after(() => {}, 99999);
      scenes.add(renderState.scene);
      dieAndWait(); rise();
      expect(census(), `after rising, death ${n + 1}`).toEqual(base);
    }
    expect(scenes.size, "each rise built its own scene, and dropped the last").toBe(8);
    start(1);
    dieAndWait(); restart();
    const fresh = census();   // (a restart opens with the title and the level line a first load sets on timers, so the comparison is restart to restart)
    for (let n = 0; n < 8; n++) {
      dropAmmo(10, 10); startBossMusic(); schedule(() => {}, 9); after(() => {}, 99999);
      dieAndWait(); restart();
      expect(census(), `after restarting, death ${n + 1}`).toEqual(fresh);
    }
  });

  it("is also true of a level with a boss and a plate, and of one a long way from the dungeon", () => {
    for (const lvl of [2, 7]) {
      start(lvl); pass(1);
      dieAndWait(); rise();
      const base = census();
      for (let n = 0; n < 3; n++) { dieAndWait(); rise(); expect(census(), `level ${lvl} death ${n + 1}`).toEqual(base); }
    }
    expect(LEVELS.length).toBe(8);
  });
});

describe("the sizes it was built to", () => {
  it("is one cell wide where it counts: a marker is lit from its own cell and from the one beside it, not from across a wall", () => {
    start(1);
    const m = mark(0);
    player.px = m.x + CELL * 1.2; player.pz = m.z; playerTick(0);   // (a floor cell beside it)
    expect(m.lit, "within reach").toBe(true);
    start(1);
    player.px = m.x + CELL * 2; player.pz = m.z; playerTick(0);
    expect(mark(0).lit, "two cells away is not").toBe(false);
  });
});
