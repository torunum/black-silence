// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { player } from "../../src/player/PlayerState";
import { keys, input } from "../../src/player/Input";
import { game } from "../../src/core/Game";
import { S } from "../../src/core/State";
import { CELL, EYE } from "../../src/world/Grid";
import { floorHeightAt } from "../../src/world/Collision";
import { LEVELS } from "../../src/world/levels/index";
import { MONOLOGUE } from "../../src/content/monologue";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { world } from "../../src/world/WorldState";

/**
 * THE OPENING — ADEM claws his way out of his grave (the prologue plan's
 * Task 2, `src/world/Opening.ts`). Boots the real game through NEW GAME and
 * drives the opening through its own tick, then checks what a player would
 * see and be able to do:
 *
 * 1. it runs on the prologue, and only there, from the moment the level loads;
 * 2. input is locked while it runs — WASD moves nothing, a click fires
 *    nothing — and released at its end;
 * 3. the weapon and the HUD are hidden until the hands come up;
 * 4. the camera starts down in the grave and ends at standing eye height on
 *    the spawn cell beside it, facing the way the level faces the player;
 * 5. any key or any click skips it, and the skip does not also fire or kick;
 * 6. the level's line is said once, by the opening, and nothing overwrites
 *    `p0_down` later (Task 1's first concern);
 * 7. it draws nothing from `Math.random` but `say()`'s own pick.
 */

let loadLevel: (i: number) => void;
let playerTick: (dt: number) => void;
let zoneTick: (dt: number) => void;
let O: typeof import("../../src/world/Opening");

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ playerTick } = await import("../../src/player/Player"));
  ({ zoneTick } = await import("../../src/world/Zones"));
  O = await import("../../src/world/Opening");
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
}, 60_000);

const DT = 1 / 60;
const cam = () => renderState.camera;
const subt = () => document.getElementById("subt")!.textContent ?? "";
const saidLvl0 = () => MONOLOGUE.lvl0.some((l) => subt().includes(l));
const opacity = (id: string) => document.getElementById(id)!.style.opacity;
/** Runs the opening's own tick for `seconds`. */
const run = (seconds: number) => { for (let t = 0; t < seconds - 1e-9; t += DT) O.openingTick(DT); };
/** The spawn cell's centre and its standing eye height. */
function spawn(): { x: number; z: number; y: number } {
  const L = LEVELS[0].build();
  for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++)
    if (L.g[z][x] === "P") { const wx = (x + .5) * CELL, wz = (z + .5) * CELL; return { x: wx, z: wz, y: floorHeightAt(wx, wz) + EYE }; }
  throw new Error("no spawn");
}

describe("it runs when the prologue starts, and only then", () => {
  it("NEW GAME starts it: input locked, the weapon and HUD hidden, the lid over the screen", () => {
    // the NEW GAME click in beforeAll loaded level 0; nothing has ticked since
    expect(S.level).toBe(0);
    expect(O.opening.active).toBe(true);
    expect(game.inputLock).toBe(true);
    expect(O.openingHidesWeapon()).toBe(true);
    expect(opacity("hud")).toBe("0");
    expect(opacity("cross")).toBe("0");
    expect(document.getElementById("graveLid")!.style.display).toBe("block");
  });

  it("only the prologue names a grave, and no other level opens with one", () => {
    const graves = LEVELS.map((d) => !!d.build().grave);
    expect(graves).toEqual(LEVELS.map((_, i) => i === 0));
    for (let i = 1; i < LEVELS.length; i++) {
      loadLevel(i);
      expect(O.opening.active, `level ${i}`).toBe(false);
      expect(game.inputLock, `level ${i}`).toBe(false);
    }
  });

  it("loading another level mid-opening drops it, with no lock left behind", () => {
    loadLevel(0);
    run(1);
    expect(game.inputLock).toBe(true);
    loadLevel(1);
    expect(O.opening.active).toBe(false);
    expect(game.inputLock).toBe(false);
    expect(document.getElementById("graveLid")!.style.display).toBe("none");
    expect(opacity("hud")).toBe("");
  });
});

describe("played to the end", () => {
  it("locks input throughout — held keys and a click do nothing — and hands control back at the end", () => {
    loadLevel(0);
    const at = { x: player.px, z: player.pz };
    keys.KeyW = true; keys.KeyD = true;
    input.firing = true;   // as if the button were held through it
    const shots = S.shots;
    try {
      for (let t = 0; t < O.T.end - 0.05; t += DT) {
        O.openingTick(DT);
        playerTick(DT);
        expect(game.inputLock).toBe(true);
      }
      expect([player.px, player.pz]).toEqual([at.x, at.z]);
      expect(S.shots).toBe(shots);
      run(0.1);
      expect(O.opening.active).toBe(false);
      expect(game.inputLock).toBe(false);
      expect(input.firing, "a held button is let go, not fired on the first free frame").toBe(false);
    } finally {
      keys.KeyW = false; keys.KeyD = false; input.firing = false;
    }
  });

  it("starts down in the grave looking up, rises through sitting, and ends at standing eye height on the spawn cell", () => {
    loadLevel(0);
    const s = spawn();
    const yard = floorHeightAt(s.x, s.z);
    O.openingTick(DT);
    // lying in the coffin, below the churchyard's ground, looking up
    expect(cam().position.y).toBeLessThan(yard);
    expect(cam().rotation.x).toBeGreaterThan(0.9);
    const grave = { x: 9.5 * CELL, z: 3.5 * CELL };
    expect(Math.hypot(cam().position.x - grave.x, cam().position.z - grave.z)).toBeLessThan(CELL / 2);
    // sitting up: the eyes just over the lip of the grave, looking across the yard
    run(O.T.sit1 - DT);
    expect(cam().position.y).toBeGreaterThan(yard - 0.1);
    expect(cam().position.y).toBeLessThan(yard + 0.3);
    expect(Math.abs(cam().rotation.x)).toBeLessThan(0.15);
    // the end: standing, on the spawn cell beside the grave, facing south as the level faces him
    run(O.T.end);
    expect(O.opening.active).toBe(false);
    expect(cam().position.x).toBeCloseTo(s.x, 6);
    expect(cam().position.z).toBeCloseTo(s.z, 6);
    expect(cam().position.y).toBeCloseTo(s.y, 6);
    expect(cam().rotation.x).toBeCloseTo(0, 6);
    expect(cam().rotation.y).toBeCloseTo(input.yaw, 6);
    expect(cam().rotation.z).toBeCloseTo(0, 6);
    expect(Math.hypot(s.x - grave.x, s.z - grave.z)).toBeLessThanOrEqual(CELL);
    // and playerTick takes over from exactly there: the first free frame does not jump
    playerTick(DT);
    expect(cam().position.y).toBeCloseTo(s.y, 6);
  });

  it("keeps the weapon hidden until the hands come up, then raises it with the HUD", () => {
    loadLevel(0);
    run(O.T.raise - 0.05);
    expect(O.openingHidesWeapon()).toBe(true);
    expect(opacity("hud")).toBe("0");
    run(0.1);
    expect(O.openingHidesWeapon()).toBe(false);
    expect(weaponRuntime.wstate).toBe("equip");
    expect(opacity("hud")).toBe("");
  });

  it("says the level's line once, near the end, and nothing is left to overwrite the crypt's line", () => {
    vi.useFakeTimers();
    try {
      loadLevel(0);
      document.getElementById("subt")!.innerHTML = "";
      run(O.T.line - 0.05);
      expect(subt()).toBe("");
      run(0.1);
      expect(saidLvl0()).toBe(true);
      run(1);
      // straight into the mausoleum: the crypt's line — and no timer from loadLevel forcing lvl0 over it
      player.px = 9.5 * CELL; player.pz = 9.5 * CELL;
      zoneTick(DT);
      expect(MONOLOGUE.p0_down.some((l) => subt().includes(l)), subt()).toBe(true);
      vi.advanceTimersByTime(5000);
      expect(saidLvl0(), "lvl0 was forced over the crypt's line").toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("any key or click skips it", () => {
  it("a key: control at once, standing, the line said, the weapon coming up", () => {
    loadLevel(0);
    document.getElementById("subt")!.innerHTML = "";
    run(0.5);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    expect(O.opening.active).toBe(false);
    expect(game.inputLock).toBe(false);
    expect(saidLvl0()).toBe(true);
    expect(weaponRuntime.wstate).toBe("equip");
    expect(document.getElementById("graveLid")!.style.display).toBe("none");
    const s = spawn();
    expect([cam().position.x, cam().position.y, cam().position.z].map((v) => +v.toFixed(6))).toEqual([s.x, s.y, s.z].map((v) => +v.toFixed(6)));
  });

  it("a click: skips, and neither fires nor kicks", () => {
    loadLevel(0);
    run(2.2);
    const kick = weaponRuntime.kickAnim, cd = S.kickCd;
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    expect(O.opening.active).toBe(false);
    expect(input.firing).toBe(false);
    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    loadLevel(0);
    run(1);
    window.dispatchEvent(new MouseEvent("mousedown", { button: 2 }));
    window.dispatchEvent(new MouseEvent("mouseup", { button: 2 }));
    expect(O.opening.active).toBe(false);
    expect(weaponRuntime.kickAnim, "the skipping right-click is not also a kick").toBe(kick);
    expect(S.kickCd).toBe(cd);
  });

  it("a mouse move does not skip it", () => {
    loadLevel(0);
    run(0.5);
    const e = new MouseEvent("mousemove");
    Object.defineProperty(e, "movementX", { value: 40 });
    Object.defineProperty(e, "movementY", { value: 10 });
    document.dispatchEvent(e);
    expect(O.opening.active).toBe(true);
    O.skipOpening();
  });
});

describe("determinism", () => {
  it("draws from Math.random only for say()'s pick of the line — once in the whole opening", () => {
    loadLevel(0);
    const spy = vi.spyOn(Math, "random");
    try {
      run(O.T.end + 0.1);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("the pose is a pure function of time", () => {
    const site = { gx: 19, gz: 7, gy: 3.36, sx: 19, sz: 9, sy: 4.2 };
    for (const t of [0, 1, 2.3, 3.3, 4.1, 5, O.T.end]) expect(O.openingPose(t, site)).toEqual(O.openingPose(t, site));
    expect(world.zones).not.toBeNull();
  });
});
