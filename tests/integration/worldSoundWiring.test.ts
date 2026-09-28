// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled, tickScheduled } from "../../src/core/Time";
import { S } from "../../src/core/State";
import { game } from "../../src/core/Game";
import { player } from "../../src/player/PlayerState";
import { world } from "../../src/world/WorldState";
import { renderState } from "../../src/render/Renderer";
import { CELL, EYE } from "../../src/world/Grid";
import { LEVELS } from "../../src/world/levels/index";
import { ZONES } from "../../src/world/levels/prologue";
import { roomFor } from "../../src/audio/Room";
import { clearLastSoundLevel, lastSoundLevel } from "../../src/audio/Levels";
import { STEP_ENTRY } from "../../src/audio/sounds/steps";
import { surfaceFor, type Surface } from "../../src/audio/Surface";

/**
 * THE WORLD'S SOUNDS ARE PLAYED WHERE THE GAME DECIDES THEM — player feedback
 * round 2 Task 5 (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * `tests/audio/worldSounds.test.ts` pins what each sound is; this pins that
 * the game asks for the right one. It boots the real game (main.ts under
 * jsdom, NEW GAME, the way `tests/weapons/foley.test.ts` does), with the
 * step, impact, door and pickup catalogues wrapped so every call is heard
 * (and still plays), and drives the real code:
 *
 * 1. **A footstep's floor follows the level's theme** — through the real
 *    `loadLevel` (which sets the room) and the real `footstep` in
 *    `src/player/Player.ts`, read back as the table entry the step played at.
 * 2. **The landing gets the fall's speed** — the real `playerTick`, on the
 *    frame the player touches the ground.
 * 3. **The kick's impact picks its case on the frame the game resolves it**
 *    — the real `doKick`, its 110 ms scheduled check: a monster, a prop, a
 *    wall, the air.
 * 4. **A door says what kind it is**, and **a pickup what it is** — the
 *    real `interact` and `itemsTick`.
 */

const heard: Array<{ name: string; args: unknown[] }> = [];
function wrap(real: Record<string, unknown>, names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...real };
  for (const n of names) {
    const f = real[n] as (...a: unknown[]) => unknown;
    out[n] = (...args: unknown[]) => { heard.push({ name: n, args }); return f(...args); };
  }
  return out;
}
vi.mock("../../src/audio/sounds/steps", async (importOriginal) => wrap(await importOriginal(), ["footstep", "landing"]));
vi.mock("../../src/audio/sounds/impacts", async (importOriginal) => wrap(await importOriginal(), ["kickImpact"]));
vi.mock("../../src/audio/sounds/doors", async (importOriginal) => wrap(await importOriginal(), ["doorOpens"]));
vi.mock("../../src/audio/sounds/pickups", async (importOriginal) => wrap(await importOriginal(), ["itemPickup"]));

let loadLevel: (idx: number) => void;
let P: typeof import("../../src/player/Player");
let WS: typeof import("../../src/weapons/WeaponState");
let I: typeof import("../../src/player/Interact");

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  P = await import("../../src/player/Player");
  WS = await import("../../src/weapons/WeaponState");
  I = await import("../../src/player/Interact");
});

afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

beforeEach(() => { heard.length = 0; });

/**
 * Each level's floor where the player starts, written from what the levels
 * are (not from src/audio/Surface.ts's table). The rebuilt prologue starts in
 * its churchyard, dirt underfoot; its hell is ash, and
 * tests/world/zones.test.ts walks the player down there and hears it.
 */
const FLOORS: Surface[] = ["dirt", "marble", "stone", "stone", "dirt", "water", "metal", "flesh"];

describe("a footstep's floor follows the level", () => {
  it("covers every level", () => expect(FLOORS).toHaveLength(LEVELS.length));

  it.each(FLOORS.map((floor, level) => ({ level, floor, name: LEVELS[level].name })))("$name: $floor", ({ level, floor }) => {
    loadLevel(level);
    for (const run of [false, true]) {
      clearLastSoundLevel();
      P.footstep(run);
      expect(lastSoundLevel(), `${run ? "running" : "walking"}`).toBe(STEP_ENTRY[floor]);
    }
    // `surfaceFor` reads a *level's* flags, where `dungeon` means level 1's
    // marble. The churchyard zone wears the dungeon's rough stone but walks on
    // its room's dirt (the game asks the room, `surfaceHere`, and only level 1
    // is marble), so for the prologue the room is the cross-check.
    if (level === 0) expect(roomFor(ZONES[0])).toBe("graveyard");
    else expect(surfaceFor(LEVELS[level])).toBe(floor);
    expect(heard.filter((h) => h.name === "footstep").map((h) => h.args.slice(0, 2))).toEqual([[false, level === 1], [true, level === 1]]);
  });
});

/** Puts the player on the ground at `x,z`, facing `yaw`, still, with nothing pending. */
function stand(x: number, z: number, yaw: number): void {
  player.px = x; player.pz = z; player.vx = 0; player.vz = 0; player.vy = 0;
  player.pyy = EYE; player.grounded = true;
  renderState.camera.position.set(x, EYE, z);
  renderState.camera.rotation.set(0, yaw, 0, "YXZ");
  renderState.camera.updateMatrixWorld(true);
  clearScheduled();
}
/** The yaw that faces from (x,z) towards (tx,tz): the camera looks down -z at yaw 0. */
const yawTo = (x: number, z: number, tx: number, tz: number): number => Math.atan2(-(tx - x), -(tz - z));

describe("the landing is heard at the fall's speed", () => {
  it("playerTick lands the player and plays the landing with how fast they were falling", () => {
    loadLevel(2);
    const x = player.px, z = player.pz;
    stand(x, z, 0);
    player.grounded = false; player.pyy = EYE + 0.0001; player.vy = -9;
    S.dead = false; S.won = false; game.inputLock = false;
    P.playerTick(1 / 120);
    const land = heard.filter((h) => h.name === "landing");
    expect(land).toHaveLength(1);
    // vy -= 20*dt happens first, so the speed it lands at is 9 + 20/120
    expect(land[0].args[0]).toBeCloseTo(9 + 20 / 120, 6);
    expect(heard.filter((h) => h.name === "footstep")).toHaveLength(0); // the landing replaced the running footstep it used to be
    expect(player.grounded).toBe(true);
  });
});

describe("the kick's impact picks its case on the frame the game resolves it", () => {
  /** Kicks, and returns the impact the scheduled check chose; asserts nothing is chosen before 110 ms. */
  function kick(): unknown {
    S.kickCd = 0; S.dead = false; game.inputLock = false; game.pianoOpen = false;
    WS.doKick();
    tickScheduled(0.1);
    expect(heard.filter((h) => h.name === "kickImpact"), "nothing before the 110 ms check").toHaveLength(0);
    tickScheduled(0.02);
    const got = heard.filter((h) => h.name === "kickImpact");
    expect(got).toHaveLength(1);
    return got[0].args[0];
  }
  /** A floor cell (in cells) whose neighbour `dx` cells along x is `want` (wall or open) — and no monster or prop within 4. */
  function cellBeside(want: "wall" | "open"): { x: number; z: number } {
    for (let gz = 1; gz < world.grid.length - 1; gz++) {
      for (let gx = 1; gx < world.grid[gz].length - 2; gx++) {
        const here = world.grid[gz][gx], next = world.grid[gz][gx + 1], next2 = world.grid[gz][gx + 2];
        if (here !== ".") continue;
        if (want === "wall" ? next !== "#" : next !== "." || next2 !== ".") continue;
        const x = gx * CELL + CELL / 2, z = gz * CELL + CELL / 2;
        const near = [...world.enemies.filter((e) => !e.dead), ...(world.props as Array<{ x: number; z: number; dead?: boolean }>).filter((p) => !p.dead)]
          .some((o) => Math.hypot(o.x - x, o.z - z) < 4);
        if (!near) return { x, z };
      }
    }
    throw new Error("no such cell");
  }

  it("into a monster: flesh", () => {
    loadLevel(1);
    const e = world.enemies.find((m) => !m.dead && !m.boss)!;
    stand(e.x - 1.5, e.z, yawTo(e.x - 1.5, e.z, e.x, e.z));
    expect(kick()).toBe("flesh");
  });

  it("into a prop: stone (a crate or a pew is struck, not a body)", () => {
    loadLevel(2);
    for (const e of world.enemies) e.dead = true;
    const p = (world.props as Array<{ x: number; z: number; dead?: boolean }>).find((q) => !q.dead)!;
    stand(p.x - 1.4, p.z, yawTo(p.x - 1.4, p.z, p.x, p.z));
    expect(kick()).toBe("stone");
  });

  it("against a wall: stone", () => {
    loadLevel(1);
    const c = cellBeside("wall");
    stand(c.x, c.z, -Math.PI / 2); // facing +x, the wall a boot's length ahead
    expect(kick()).toBe("stone");
  });

  it("into the air: the air (no impact of its own — the swing was the sound)", () => {
    loadLevel(1);
    const c = cellBeside("open");
    stand(c.x, c.z, -Math.PI / 2);
    expect(kick()).toBe("air");
  });
});

describe("a door says what kind it is, and a pickup what it is", () => {
  /** The first door of the kind in any level, and that level. */
  function findDoor(pred: (d: Record<string, unknown>) => boolean): { level: number; gx: number; gz: number } {
    for (let level = 0; level < LEVELS.length; level++) {
      loadLevel(level);
      for (const [k, d] of Object.entries(world.doors)) {
        if (pred(d)) { const [gx, gz] = k.split(",").map(Number); return { level, gx, gz }; }
      }
    }
    throw new Error("no such door");
  }
  /** Stands in front of the door cell, on its open side, facing it, and presses use. */
  function openDoor(gx: number, gz: number): void {
    const dx = CELL * 0.5 + 1.2;
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cx = gx + sx, cz = gz + sz;
      if (world.grid[cz]?.[cx] !== ".") continue;
      const x = gx * CELL + CELL / 2 + sx * dx, z = gz * CELL + CELL / 2 + sz * dx;
      stand(x, z, yawTo(x, z, gx * CELL + CELL / 2, gz * CELL + CELL / 2));
      S.key = true; game.inputLock = false;
      I.interact();
      return;
    }
    throw new Error("no open side");
  }

  it.each([
    ["stone", (d: Record<string, unknown>) => !d.flesh && !d.secret && !d.locked],
    ["secret", (d: Record<string, unknown>) => !!d.secret],
    ["gate", (d: Record<string, unknown>) => !!d.locked],
    ["flesh", (d: Record<string, unknown>) => !!d.flesh],
  ] as const)("a %s door", (kind, pred) => {
    const { gx, gz } = findDoor(pred);
    heard.length = 0;
    openDoor(gx, gz);
    expect(heard.filter((h) => h.name === "doorOpens").map((h) => h.args[0])).toEqual([kind]);
  });

  it("every pickup in the first three levels is heard as its own kind", () => {
    const seen = new Set<string>();
    for (const level of [0, 1, 2]) {
      loadLevel(level);
      for (const it of world.items as Array<{ x: number; z: number; kind: string; taken?: boolean }>) {
        heard.length = 0;
        S.hp = 50;
        stand(it.x, it.z, 0);
        I.itemsTick(1 / 60);
        if (!it.taken) continue;
        expect(heard.filter((h) => h.name === "itemPickup").map((h) => h.args[0])).toEqual([it.kind]);
        seen.add(it.kind);
      }
    }
    expect(seen.size, [...seen].join(",")).toBeGreaterThanOrEqual(4);
  });
});

