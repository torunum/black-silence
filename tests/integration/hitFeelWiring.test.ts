// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { input } from "../../src/player/Input";
import { renderState } from "../../src/render/Renderer";
import { screenShake } from "../../src/fx/ShakeState";
import { marker, resetMarker } from "../../src/fx/HitMarker";
import { punch, resetPunch } from "../../src/fx/ViewPunch";
import { resetHitFeel, FEEL, STOP_MAX } from "../../src/fx/HitFeel";
import { EYE } from "../../src/world/Grid";
import { floorHeightAt } from "../../src/world/Collision";

/**
 * EVERY HIT LANDS, THROUGH THE REAL GAME (impact plan, Task 1). The units
 * (tests/fx/hitFeel, hitMarker, viewPunch; tests/enemies/hitReact) prove
 * each piece; this proves the pieces are wired: a shot at a real zombie on
 * a real level, through the real `hitscan` and `damageEnemy`, then real
 * `Loop.ts` frames — the sprite goes white and leans, the marker lights at
 * the crosshair, the hit-stop is the weapon's, the view is punched for the
 * render only, and a kill is bigger than a hit.
 */

const rafQueue: FrameRequestCallback[] = [];
let clock = 0;
function frame(dtMs = 1000 / 60): void {
  clock += dtMs;
  const due = rafQueue.splice(0, rafQueue.length);
  for (const cb of due) cb(clock);
}

let hitscan: (dir: THREE.Vector3, dmg: number, wIdx: number) => void;
let loadLevel: (i: number) => void;
let foe: Foe;

interface Foe {
  key: string; x: number; z: number; h: number; w: number; hp: number; maxhp: number; dormant: boolean; dead: boolean; gone: boolean;
  stun: number; kx: number; kz: number; hurt: number; flashT?: number; lean?: number; sever?: Record<string, boolean>;
  sp: THREE.Sprite;
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => { rafQueue.push(cb); return rafQueue.length; };
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ hitscan } = await import("../../src/weapons/Hitscan"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  (await import("../../src/world/Opening")).skipOpening();
  clock = performance.now();
  for (let i = 0; i < 3; i++) frame();
  loadLevel(1);
  const z = (world.enemies as unknown as Foe[]).find((e) => e.key === "z" && floorHeightAt(e.x, e.z) === 0);
  if (!z) throw new Error("level 1 has no zombie on the ground floor");
  for (const o of world.enemies as unknown as Foe[]) if (o !== z) o.dead = true;
  foe = z;
  for (let i = 0; i < 3; i++) frame();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

/** A fresh, unhurt zombie standing 4 units east of the player, who faces it; its centre (`up` of its height) is the aim. */
function stage(hp = 5000): void {
  foe.hp = hp; foe.maxhp = hp; foe.dead = false; foe.gone = false; foe.dormant = false; foe.sever = {};
  foe.stun = 0; foe.kx = 0; foe.kz = 0; foe.hurt = 0; foe.flashT = 0; foe.lean = 0;
  foe.sp.material.color.setHex(0xffffff); foe.sp.material.rotation = 0;
  const fy = floorHeightAt(foe.x, foe.z);
  player.px = foe.x - 4; player.pz = foe.z; player.pyy = EYE + fy;
  player.spawnGuard = 99;
  renderState.camera.position.set(player.px, player.pyy, player.pz);
  input.yaw = -Math.PI / 2;   // facing +x
  resetHitFeel(); resetMarker(); resetPunch();
  screenShake.hitStop = 0;
  for (let i = 0; i < 2; i++) frame();   // settle: the camera, the spawn guard, last frame's leftovers
  resetHitFeel(); resetMarker(); resetPunch(); screenShake.hitStop = 0;
}
function shoot(wIdx: number, dmg: number, up = 0, side = 0): void {
  const fy = floorHeightAt(foe.x, foe.z);
  const target = new THREE.Vector3(foe.x, fy + foe.h * (0.5 + up), foe.z + side * foe.w * 0.5);
  const dir = target.sub(renderState.camera.position).normalize();
  hitscan(dir, dmg, wIdx);
}

describe("a hit lands: the flash, the marker, the stop, the punch", () => {
  beforeEach(() => stage());

  it("a pistol hit turns the zombie white, lights the marker at the crosshair, freezes the game a moment and punches the view", () => {
    shoot(0, 34);
    frame();
    expect(foe.sp.material.color.r, "white: a multiplier past 1").toBeGreaterThan(1);
    expect(foe.flashT, "the flash is running").toBeGreaterThan(0);
    expect(marker.left, "the marker").toBeGreaterThan(0);
    expect(marker.kind).toBe("flesh");
    expect(screenShake.hitStop, "the pistol's hit-stop").toBeCloseTo(FEEL[0].hit, 6);
    expect(punch.lunge, "the view lunges at it").toBeGreaterThan(0);
    expect(foe.sp.material.rotation, "it leans").not.toBe(0);
  });

  it("the white gives way to the red tint, and the sprite ends upright and untinted", () => {
    shoot(0, 34);
    let sawWhite = false, sawTint = false;
    for (let i = 0; i < 40; i++) {
      frame();
      const c = foe.sp.material.color;
      if (c.r > 1) sawWhite = true;
      else if (c.getHex() === 0xff8866) sawTint = true;
    }
    expect(sawWhite && sawTint).toBe(true);
    expect(foe.sp.material.color.getHex()).toBe(0xffffff);
    expect(foe.sp.material.rotation).toBe(0);
  });

  it("a headshot's marker is a headshot's, a body shot's a body's", () => {
    shoot(0, 34, 0.38);   // doubled on a head: 68 of 5000
    frame();
    expect(marker.kind).toBe("head");
    stage();
    shoot(0, 34, 0);
    frame();
    expect(marker.kind).toBe("flesh");
  });

  it("the hit-stop is the weapon's: nothing for a rifle or a nail cannon, the pistol's, a shotgun volley's, the BMG's", () => {
    const stopFor = (w: number, dmg: number, pellets = 1): number => {
      stage();
      for (let i = 0; i < pellets; i++) shoot(w, dmg);
      frame();
      return screenShake.hitStop;
    };
    expect(stopFor(2, 14)).toBe(0);
    expect(stopFor(6, 11)).toBe(0);
    const pistol = stopFor(0, 34), shotgun = stopFor(1, 9, 8), sniper = stopFor(4, 160);
    expect(pistol).toBeGreaterThan(0);
    expect(shotgun).toBeGreaterThan(pistol);
    expect(sniper).toBeGreaterThan(shotgun);
    expect(sniper).toBeLessThanOrEqual(STOP_MAX);
  });

  it("the hit-stop really slows the game: the frozen frames age the monster's flash by a twelfth of what they would", () => {
    shoot(4, 160);
    frame();   // the stop is asked for
    const flash = foe.flashT!;
    expect(screenShake.hitStop).toBeGreaterThan(0.05);
    frame(); frame();
    expect(foe.flashT!).toBeGreaterThan(flash - 0.01);   // two 16.7 ms frames at 8%: ~2.7 ms of game time
  });

  it("the punch is for the render only: the camera gameplay reads is not moved by it", () => {
    shoot(1, 9);
    frame();
    expect(punch.lunge).toBeGreaterThan(0);
    // the camera sits where playerTick put it: at the player, at the eye, not lunged
    expect(Math.abs(renderState.camera.position.x - player.px)).toBeLessThan(0.1);   // (the screen shake's offset is under a tenth)
    expect(renderState.camera.rotation.z).toBeLessThan(0.1);
  });

  it("a shot into armour is a clink: the grey marker, no stop", () => {
    (foe as unknown as { plate: number }).plate = 100;
    try {
      shoot(0, 34);
      frame();
      expect(marker.kind).toBe("armour");
      expect(screenShake.hitStop).toBe(0);
    } finally { (foe as unknown as { plate: number }).plate = 0; }
  });
});

describe("a kill is bigger than a hit", () => {
  it("the kill's marker is red, its stop longer, its punch harder than the same weapon's plain hit", () => {
    stage();
    shoot(0, 34); frame();
    const hit = { stop: screenShake.hitStop, lunge: punch.lunge };
    stage(30);
    shoot(0, 34); frame();
    expect(foe.dead).toBe(true);
    expect(marker.kind === "kill" || marker.kind === "gib").toBe(true);
    expect(screenShake.hitStop).toBeGreaterThan(hit.stop);
    expect(punch.lunge).toBeGreaterThan(hit.lunge);
  });

  it("a headshot kill is a head-kill marker", () => {
    stage(60);   // the pistol's 34 is doubled on a head: 68 leaves -8, dead but not gibbed (past -22 it would be)
    shoot(0, 34, 0.38);
    frame();
    expect(foe.dead).toBe(true);
    expect(marker.kind).toBe("headkill");
  });

  it("a corpse is not left white", () => {
    stage(30);
    shoot(1, 9, 0, 0); shoot(1, 9, 0, 0); shoot(1, 9, 0, 0); shoot(1, 9, 0, 0);
    for (let i = 0; i < 20; i++) frame();
    expect(foe.dead).toBe(true);
    if (!foe.gone) expect(foe.sp.material.color.r).toBeLessThanOrEqual(1);
  });
});
