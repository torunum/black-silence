// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { input } from "../../src/player/Input";
import { game } from "../../src/core/Game";
import { S } from "../../src/core/State";
import { save } from "../../src/save/SaveGame";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { CELL, EYE } from "../../src/world/Grid";
import { LEVELS } from "../../src/world/levels/index";
import { CHAPTER_LINES } from "../../src/content/monologue";
import { doors, against } from "../../src/world/ExitDoor";
import { T, resetTransition, trans } from "../../src/world/TransitionState";
import { floorHeightAt } from "../../src/world/Collision";

/**
 * THE TRANSITION (the transitions plan, Task 2): the exit door opens, the camera walks into the dark
 * while the world goes to black, a chapter card comes up over black, a deliberate key or click loads
 * the next level behind the black, and the camera walks in from its entrance door as the black lifts.
 * Driven here through `transitionTick` — the call `Loop.ts` makes each frame, outside the gameplay
 * block — at 60 fps, on the real game, level 1 to level 2.
 */

let loadLevel: (i: number) => void;
let leaveLevel: () => boolean;
let transitionTick: (dt: number) => void;
let exitCalls = 0;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => { exitCalls++; };
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ leaveLevel, transitionTick } = await import("../../src/world/Transition"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  (await import("../../src/world/Opening")).skipOpening();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

beforeEach(() => { resetTransition(); S.won = false; S.dead = false; game.inputLock = false; exitCalls = 0; });

const el = (id: string): HTMLElement => document.getElementById(id)!;
const fade = (): number => Number(el("fade").style.opacity || 0);
const cardUp = (): boolean => !el("levelend").classList.contains("hidden");
/** Frames of `seconds` at 60 fps, calling `each` after every one. */
function run(seconds: number, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) { transitionTick(1 / 60); each?.(); }
}
const key = (code: string, repeat = false): void => { window.dispatchEvent(new KeyboardEvent("keydown", { code, repeat })); };
const click = (button = 0): void => { window.dispatchEvent(new MouseEvent("mousedown", { button })); };

/** Level 1 with its Guardian dead, the player at its exit door, and the door opened. */
function leaveLevel1(): void {
  loadLevel(1);
  for (const e of world.enemies) e.dead = true;
  const d = doors.exit!;
  player.px = d.x + d.nx * 2; player.pz = d.z + d.nz * 2; input.yaw = Math.atan2(d.nx, d.nz);
  expect(leaveLevel()).toBe(true);
}
/** ...and the card up, a second past the time it may be continued. */
function toCard(): void {
  leaveLevel1();
  run(T.walk + T.hold + .05);
  expect(trans.phase).toBe("card");
  run(T.cardAfter + .1);
}

describe("the walk through the exit door", () => {
  it("stops the game, locks the input, hides the HUD and says nothing over the walk", () => {
    loadLevel(1);
    document.getElementById("msg")!.textContent = "PRESS E — THE IRON DOOR";
    el("subt").innerHTML = "<b>ADEM</b><br>“Something.”";
    leaveLevel1();
    expect(S.won, "the game is stopped (Loop.ts's gameplay block is gated on it)").toBe(true);
    expect(game.inputLock).toBe(true);
    expect(trans.phase).toBe("walk");
    expect(el("hud").style.opacity).toBe("0");
    expect(el("msg").textContent).toBe("");
    expect(el("subt").innerHTML).toBe("");
    expect(leaveLevel(), "a second press while it happens does nothing").toBe(false);
  });

  it("opens the door, walks the camera up to the dark and stops short of it, and goes to black on the way", () => {
    leaveLevel1();
    const d = doors.exit!, fades: number[] = [], outs: number[] = [];
    let seenOpen = false;
    run(T.walk - .01, () => {
      fades.push(fade());
      outs.push(against(d, renderState.camera.position.x, renderState.camera.position.z, 0).out);
      if (d.rig.open >= .999) seenOpen = true;
    });
    expect(seenOpen, "the door opens all the way").toBe(true);
    expect(fades[10], "still clear a sixth of a second in").toBeLessThan(.01);
    expect(fades[fades.length - 1], "black by the end").toBeGreaterThan(.95);
    for (let i = 1; i < fades.length; i++) expect(fades[i]).toBeGreaterThanOrEqual(fades[i - 1]);
    expect(Math.min(...outs), "never through the dark's plane, where the camera would be inside the wall").toBeGreaterThanOrEqual(.1);
    expect(outs[outs.length - 1], "ends against it").toBeLessThan(.35);
    expect(outs[0], "and began where the player stood").toBeGreaterThan(1.5);
    expect(cardUp(), "no panel yet").toBe(false);
    expect(trans.cued.has("walk"), "the walk's sound").toBe(true);
  });

  it("does not load the next level during it", () => {
    leaveLevel1();
    const grid = world.grid;
    run(T.walk + T.hold + .05);
    expect(S.level).toBe(1);
    expect(world.grid, "the same level's grid").toBe(grid);
  });

  it("saves maxLevel when the door is opened, and the walk saves nothing more", () => {
    save.maxLevel = 1;
    leaveLevel1();
    expect(save.maxLevel).toBe(2);
    run(T.walk + 1);
    expect(save.maxLevel).toBe(2);
  });
});

describe("the chapter card", () => {
  it("comes up over black a moment after the walk, not before, and lets go of the mouse", () => {
    leaveLevel1();
    run(T.walk + T.hold - .1);
    expect(cardUp()).toBe(false);
    expect(fade()).toBe(1);
    run(.15);
    expect(cardUp()).toBe(true);
    expect(trans.phase).toBe("card");
    expect(exitCalls, "the pointer is released for the card").toBeGreaterThan(0);
    expect(trans.cued.has("card"), "and the bell").toBe(true);
  });

  it("shows the level struck through, its grade and stats, ADEM's line for how it went, and what comes next", () => {
    toCard();
    expect(el("letitle").textContent).toContain("THE GOTHIC DUNGEON");
    expect(el("letitle").textContent).toContain("CLEARED");
    expect(el("letitle").querySelector(".done")!.textContent, "the name is the struck-through part").toBe("THE GOTHIC DUNGEON");
    expect(el("legrade").textContent).toBe(trans.grade);
    expect(el("lestats").innerHTML).toContain("KILLS");
    expect(el("lestats").innerHTML).toContain("ACCURACY");
    expect(el("lestats").innerHTML).toBe(trans.stats);
    expect(el("lebtn").textContent).toContain("THE ABANDONED CHURCH");
    expect(el("leline").textContent).toBe("ADEM: “" + CHAPTER_LINES[1][trans.grade === "C" || trans.grade === "D" ? 1 : 0] + "”");
  });

  it("says the line for a level cleared well when it was, and the other when it was not", () => {
    loadLevel(1);
    for (const e of world.enemies) e.dead = true;
    S.kills = S.enemiesTotal ?? 0; S.secrets = S.secretsTotal ?? 0; S.shots = 10; S.hitsLanded = 9; S.propsBroken = 10;
    const d = doors.exit!;
    player.px = d.x + d.nx * 2; player.pz = d.z + d.nz * 2; input.yaw = Math.atan2(d.nx, d.nz);
    leaveLevel();
    expect(trans.grade).toBe("S");
    expect(trans.line).toBe(CHAPTER_LINES[1][0]);
    resetTransition(); S.won = false; game.inputLock = false;
    loadLevel(1);
    for (const e of world.enemies) e.dead = true;
    player.px = d.x + d.nx * 2; player.pz = d.z + d.nz * 2;
    leaveLevel();
    expect(trans.grade).toBe("D");
    expect(trans.line).toBe(CHAPTER_LINES[1][1]);
  });

  it("has a line from ADEM for every level that has an exit, two each, and none for the womb", () => {
    for (let i = 0; i < LEVELS.length - 1; i++) {
      expect(CHAPTER_LINES[i], LEVELS[i].name).toHaveLength(2);
      for (const l of CHAPTER_LINES[i]) expect(l.length).toBeGreaterThan(30);
    }
    expect(CHAPTER_LINES[LEVELS.length - 1]).toBeUndefined();
  });

  it("stacks above the HUD and the black below the card: the fade is over everything but the card", () => {
    const html = readFileSync("index.html", "utf8");
    const z = (sel: string): number => Number(new RegExp(sel.replace(/[.#]/g, "\\$&") + "\\{[^}]*z-index:(\\d+)").exec(html)![1]);
    expect(z("#fade")).toBeGreaterThan(z("#hud"));
    expect(z("#fade")).toBeGreaterThan(z("#subt"));
    expect(z("#fade")).toBeGreaterThan(z("#msg"));
    expect(z(".overlay")).toBeGreaterThan(z("#fade"));
  });
});

describe("continuing the card is deliberate", () => {
  it("ignores everything in the card's first second", () => {
    leaveLevel1();
    run(T.walk + T.hold + .5);
    expect(trans.phase).toBe("card");
    key("Space"); key("Enter"); key("KeyE"); click();
    expect(trans.phase).toBe("card");
    expect(S.level).toBe(1);
  });

  it("ignores a key's auto-repeat, Esc, a modifier, the movement keys, a right click, and a click that began before the card", () => {
    leaveLevel1();
    // a button already down when the door opened: no new mousedown arrives for the card to take, and one that
    // arrives during the walk is not for the card
    click();
    run(T.walk + T.hold + .05);
    run(T.cardAfter + .1);
    expect(trans.phase).toBe("card");
    // MUTATION TARGET: let a repeat continue the card
    key("Space", true); key("Enter", true); key("KeyE", true);
    for (const code of ["Escape", "ShiftLeft", "ControlLeft", "KeyW", "KeyA", "KeyS", "KeyD", "KeyR", "Digit2", "Tab"]) key(code);
    click(2); click(1);
    expect(trans.phase, "none of those continues it").toBe("card");
    expect(S.level).toBe(1);
  });

  it("continues on Space, Enter or E pressed afresh, or on a left click", () => {
    for (const go of [() => key("Space"), () => key("Enter"), () => key("KeyE"), () => key("NumpadEnter"), () => click(0)]) {
      toCard();
      go();
      expect(trans.phase).toBe("arrive");
      expect(S.level).toBe(2);
      run(T.arrive + .1);
      expect(trans.phase).toBe("idle");
    }
  });

  it("loads the next level only when it is continued, behind black", () => {
    toCard();
    const grid = world.grid;
    expect(S.level, "still the old level on the card").toBe(1);
    expect(world.grid).toBe(grid);
    key("Space");
    expect(S.level).toBe(2);
    expect(world.grid, "a new level's grid").not.toBe(grid);
    expect(fade(), "and the black is still down as it loads").toBe(1);
    expect(cardUp(), "the card is gone").toBe(false);
  });
});

describe("the arrival", () => {
  it("starts black, with the camera at the entrance door, the door open and the title coming up", () => {
    toCard();
    key("Space");
    const e = doors.entrance!;
    expect(S.won, "the new level is live").toBe(false);
    expect(game.inputLock, "but the player is not free yet").toBe(true);
    expect(fade()).toBe(1);
    expect(e.rig.open).toBe(1);
    const x = (e.site.sx + .5) * CELL, z = (e.site.sz + .5) * CELL;
    expect(renderState.camera.position.x).toBeCloseTo(x, 3);
    expect(renderState.camera.position.z).toBeCloseTo(z, 3);
    expect(renderState.camera.position.y).toBeCloseTo(floorHeightAt(x, z) + EYE, 3);
    expect(el("lvltitle").textContent).toBe(LEVELS[2].name);
    expect(el("lvltitle").style.opacity).toBe("1");
    expect(el("msg").textContent).toBe(LEVELS[2].name);
  });

  it("lifts the black while the camera walks in from the door to the spawn, shuts the door behind, and ends where the level begins", () => {
    toCard();
    key("Space");
    const e = doors.entrance!, x0 = (e.site.sx + .5) * CELL, z0 = (e.site.sz + .5) * CELL;
    const fades: number[] = [], dists: number[] = [], opens: number[] = [];
    run(T.arrive - .01, () => {
      fades.push(fade());
      dists.push(Math.hypot(renderState.camera.position.x - player.px, renderState.camera.position.z - player.pz));
      opens.push(e.rig.open);
    });
    // MUTATION TARGET: never lift the fade, or never walk
    expect(fades[2]).toBeGreaterThan(.95);
    expect(fades[fades.length - 1], "clear at the end").toBeLessThan(.01);
    for (let i = 1; i < fades.length; i++) expect(fades[i]).toBeLessThanOrEqual(fades[i - 1] + 1e-9);
    expect(dists[0], "begins as far from the spawn as the door").toBeCloseTo(Math.hypot(x0 - player.px, z0 - player.pz), 2);
    expect(dists[0], "just inside the door, not across the level").toBeLessThan(4.5);
    expect(dists[dists.length - 1], "ends at the spawn").toBeLessThan(.01);
    for (let i = 1; i < dists.length; i++) expect(dists[i]).toBeLessThanOrEqual(dists[i - 1] + 1e-9);
    expect(opens[0]).toBe(1);
    expect(opens[opens.length - 1], "the door is shut behind").toBeCloseTo(0, 6);
    expect(trans.cued.has("shut"), "with its sound").toBe(true);
    run(.05);
    expect(trans.phase).toBe("idle");
    expect(game.inputLock, "control").toBe(false);
    expect(fade()).toBe(0);
    expect(el("hud").style.opacity, "the HUD is back").toBe("");
    expect(weaponRuntime.wstate, "and the hands come up").toBe("equip");
    expect(e.rig.glow.visible, "the entrance door is dark again").toBe(false);
    expect(input.yaw, "looking the way every level starts").toBeCloseTo(Math.PI, 6);
  });

  it("has the camera at the spawn exactly when control comes, on every level with an entrance", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      resetTransition();
      loadLevel(i);
      // arrive directly, as `proceed` does after loading (it is not exported; the phase is its whole effect on `transitionTick`)
      trans.phase = "arrive"; trans.t = 0; trans.cued.clear(); game.inputLock = true;
      run(T.arrive + .05);
      expect(renderState.camera.position.x, LEVELS[i].name).toBeCloseTo(player.px, 3);
      expect(renderState.camera.position.z, LEVELS[i].name).toBeCloseTo(player.pz, 3);
      expect(trans.phase).toBe("idle");
    }
  });
});

describe("the end of the game", () => {
  it("has no exit door on the last level: nothing to open, and its boss shows the win screen as it always did", () => {
    loadLevel(LEVELS.length - 1);
    expect(doors.exit).toBeNull();
    expect(leaveLevel()).toBe(false);
    expect(S.won).toBe(false);
    expect(el("win").classList.contains("hidden")).toBe(true);
  });
});
