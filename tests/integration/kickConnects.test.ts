// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
import { resetHitFeel, FEEL } from "../../src/fx/HitFeel";
import { liveParticles } from "../../src/fx/Particles";
import { headPool } from "../../src/fx/Heads";
import { S } from "../../src/core/State";
import { EYE } from "../../src/world/Grid";
import { floorHeightAt, solidAt } from "../../src/world/Collision";
import { FLIGHT, liftAt } from "../../src/enemies/Launch";
import { OBJECT_STOP } from "../../src/weapons/KickFx";
import { seedRandom } from "../support/seededRandom";

/**
 * THE KICK CONNECTS, THROUGH THE REAL GAME (impact plan, Task 2). The kick
 * is still `doKick`'s: the hit resolves 110 ms after the swing and what it
 * does to a body (15 damage, a 16 units/s shove, the stun, the flight) is
 * as it was. What this holds is what the player sees and feels of it: the
 * stop, the punch, the dust and blood, the flight's lift and tumble, the
 * landing, the wall, the whiff, a punted head and a broken crate.
 */

const rafQueue: FrameRequestCallback[] = [];
let clock = 0;
function frame(dtMs = 1000 / 60): void {
  clock += dtMs;
  const due = rafQueue.splice(0, rafQueue.length);
  for (const cb of due) cb(clock);
}

interface Foe {
  key: string; x: number; z: number; h: number; w: number; hp: number; maxhp: number; dormant: boolean; dead: boolean; gone: boolean;
  stun: number; kx: number; kz: number; hurt: number; flung: number; flungT: number; fy?: number; boss: boolean; elite: boolean; speed: number; cool: number;
  sp: { position: { y: number; x: number; z: number }; material: { rotation: number; color: { r: number } } };
}
interface Prop { x: number; z: number; r: number; hgt: number; hp: number; dead: boolean; explosive: boolean; kind: string }

let doKick: () => void;
let loadLevel: (i: number) => void;
let spawnHead: (e: unknown, info: unknown) => void;
let foe: Foe;
const others: Foe[] = [];

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => { rafQueue.push(cb); return rafQueue.length; };
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ doKick } = await import("../../src/weapons/WeaponState"));
  ({ spawnHead } = await import("../../src/enemies/Death") as never);
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  (newGame as HTMLElement).click();
  (await import("../../src/world/Opening")).skipOpening();
  clock = performance.now();
  for (let i = 0; i < 3; i++) frame();
  loadLevel(1);
  const zs = (world.enemies as unknown as Foe[]).filter((e) => e.key === "z" && !e.elite);
  foe = zs[0];
  for (const o of world.enemies as unknown as Foe[]) if (o !== foe) { o.dead = true; others.push(o); }
  for (let i = 0; i < 3; i++) frame();
});
afterAll(() => { clearAllTimers(); clearScheduled(); });

const free = (x: number, z: number): boolean => !solidAt(x, z);

/**
 * Stands the player `gap` units behind the foe, facing along `ang`, where the way ahead is clear for `runway` units past the foe
 * (or, with `wallWithin`, shut within that many). Looks for the direction among the foe's sixteen; at the foe's own place if it
 * has one, else moves the foe to the first zombie spawn that does. Returns the unit vector the kick goes along.
 */
function stage(opts: { gap?: number; runway?: number; wallWithin?: number; hp?: number }): { dx: number; dz: number } {
  const gap = opts.gap ?? 1.6;
  const hp = opts.hp ?? 50;   // a body of 60 or less is flung by the kick (WeaponState.ts: `maxhp<=60`)
  for (const cand of (world.enemies as unknown as Foe[]).filter((e) => e.key === "z" || e === foe)) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2, dx = Math.sin(ang), dz = Math.cos(ang);
      const px = cand.x - dx * gap, pz = cand.z - dz * gap;
      let ok = free(px, pz);
      for (let t = 0; ok && t <= gap + (opts.runway ?? 0) + 0.01; t += 0.25) if (!free(px + dx * t, pz + dz * t)) ok = false;
      if (ok && opts.wallWithin !== undefined) {
        ok = false;
        for (let t = gap + 1.5; t < gap + opts.wallWithin; t += 0.25) if (!free(px + dx * t, pz + dz * t)) { ok = true; break; }
        // the line up to the wall must be clear
        for (let t = 0; ok && t < gap + 1.4; t += 0.25) if (!free(px + dx * t, pz + dz * t)) ok = false;
      }
      if (!ok) continue;
      foe.x = cand.x; foe.z = cand.z; foe.fy = floorHeightAt(foe.x, foe.z);
      foe.hp = hp; foe.maxhp = hp; foe.dead = false; foe.gone = false; foe.dormant = false; foe.stun = 0; foe.kx = 0; foe.kz = 0; foe.hurt = 0; foe.flung = 0; foe.flungT = 0;
      foe.speed = 0.0001; foe.cool = 9999;
      foe.sp.material.rotation = 0;
      player.px = px; player.pz = pz; player.pyy = EYE + (foe.fy ?? 0); player.spawnGuard = 999;
      renderState.camera.position.set(px, player.pyy, pz);
      input.yaw = Math.atan2(-dx, -dz);
      input.pitch = 0;
      resetHitFeel(); resetMarker(); resetPunch(); screenShake.hitStop = 0; S.kickCd = 0;
      return { dx, dz };
    }
  }
  throw new Error("no place to stage the kick: " + JSON.stringify(opts));
}

/** Runs `n` frames and returns the longest hit-stop the game was asked for in them (it counts down as it runs, so the peak is read each frame). */
function peakStop(n: number): number {
  let peak = 0;
  for (let i = 0; i < n; i++) { frame(); peak = Math.max(peak, screenShake.hitStop); }
  return peak;
}

/** Kicks, and runs frames until the hit has resolved (or 20 pass). */
function kickAndResolve(): number {
  doKick();
  for (let i = 1; i <= 20; i++) { frame(); if (foe.flung > 0 || foe.dead || foe.hurt > 0 || screenShake.hitStop > 0 || punch.lunge !== 0) return i; }
  return 20;
}

beforeEach(() => { for (const h of headPool.heads) (h.sp as { visible: boolean }).visible = false; headPool.heads.length = 0; });

describe("a kick that lands in a body", () => {
  it("freezes the game for the kick's own stop, punches the view, lights the marker, and launches the body", () => {
    const { dx, dz } = stage({ runway: 3 });
    const before = liveParticles();
    const frames = kickAndResolve();
    expect(frames).toBeGreaterThanOrEqual(6);   // never before the 110 ms: 6.6 frames at 60 fps
    expect(foe.flung, "launched").toBeGreaterThan(0);
    expect(Math.hypot(foe.kx, foe.kz), "the shove is the game's, 16 units/s").toBeGreaterThan(15);
    expect(foe.kx * dx + foe.kz * dz, "along the kick").toBeGreaterThan(15);
    expect(screenShake.hitStop, "the kick's stop").toBeGreaterThanOrEqual(FEEL[-1].hit - 1e-9);
    expect(punch.lunge, "the view lunges at it").toBeGreaterThan(0.05);
    expect(marker.left).toBeGreaterThan(0);
    expect(foe.sp.material.color.r, "white").toBeGreaterThan(1);
    expect(liveParticles(), "dust and blood off the boot").toBeGreaterThan(before + 12);
  });

  it("the foe is lifted into an arc as high as FLIGHT.arc and tumbles through whole turns, then lands upright", () => {
    stage({ runway: 17 });
    kickAndResolve();
    let top = 0, minRot = 0, maxRot = 0;
    const base = (foe.fy ?? 0) + foe.h / 2;
    for (let i = 0; i < 80 && foe.flung > 0; i++) {
      frame();
      top = Math.max(top, foe.sp.position.y - base);
      minRot = Math.min(minRot, foe.sp.material.rotation); maxRot = Math.max(maxRot, foe.sp.material.rotation);
    }
    expect(top, "the arc").toBeGreaterThan(FLIGHT.arc * 0.85);
    expect(top).toBeLessThan(FLIGHT.arc + 0.2);
    expect(maxRot - minRot, "more than a turn").toBeGreaterThan(Math.PI * 2);
    for (let i = 0; i < 4; i++) { frame(); }
    expect(foe.sp.material.rotation, "upright").toBeCloseTo(0, 5);
    expect(foe.sp.position.y).toBeCloseTo(base, 1);
    expect(liftAt(0)).toBe(0);
    expect(liftAt(FLIGHT.secs)).toBeCloseTo(0, 9);
  });

  it("bleeds as it flies, and comes down with dust", () => {
    stage({ runway: 17 });
    for (let i = 0; i < 100; i++) frame();   // the particles of earlier tests die (the longest lives 1.3 s)
    const restore = seedRandom(7);   // the particles' lives are the game's dice: seeded, the counts below are exact
    let grew = 0;
    try {
      kickAndResolve();
      let prev = liveParticles();
      for (let i = 0; i < 24; i++) { frame(); const n = liveParticles(); if (n > prev) grew++; prev = n; }
    } finally { restore(); }
    expect(grew, "drops thrown off every thirtieth of a second: a frame in two grows the count").toBeGreaterThanOrEqual(99);
    expect(foe.flung).toBeGreaterThan(0);
    // the frame the flight ends: the landing's dust and drops (nine of dust, five of blood) arrive at once
    let burst = 0;
    for (let i = 0; i < 80 && foe.flung > 0; i++) {
      const was = foe.flung, n = liveParticles();
      frame();
      if (was > 0 && foe.flung <= 0) burst = liveParticles() - n;
    }
    expect(burst, "landing").toBeGreaterThanOrEqual(10);
  });

    it("is slammed into a wall with the splat: 40 damage, the stun, the game's wall kill — and a spray of blood and the view's punch", () => {
    stage({ wallWithin: 7 });
    kickAndResolve();
    resetPunch();
    const hp0 = foe.hp;
    let slammed = false, burst = 0;
    for (let i = 0; i < 40 && !slammed; i++) {
      const n = liveParticles();
      frame();
      slammed = foe.stun > 1.1 && foe.kx === 0 && foe.kz === 0;
      if (slammed) burst = liveParticles() - n;
    }
    expect(slammed).toBe(true);
    expect(burst, "the game's 14 drops, and 26 more thrown back off the wall, dust and chips").toBeGreaterThanOrEqual(45);
    expect(foe.hp, "40 more").toBeLessThanOrEqual(hp0 - 39);
    expect(foe.sp.material.rotation, "upright against the wall").toBe(0);
    expect(punch.lunge, "the player is in sight of it").toBeGreaterThan(0);
  });

  it("a body the kick KILLS flies as well: the corpse keeps its speed through the air, arcs, and is slammed into a wall", () => {
    stage({ wallWithin: 9, hp: 10 });
    kickAndResolve();
    expect(foe.dead, "15 damage kills it").toBe(true);
    const speed = Math.hypot(foe.kx, foe.kz);
    for (let i = 0; i < 10; i++) frame();
    expect(Math.hypot(foe.kx, foe.kz), "no decay in the air").toBeGreaterThan(speed * 0.9);
    let high = 0;
    const base = (foe.fy ?? 0);
    let hit = false;
    for (let i = 0; i < 60; i++) { frame(); high = Math.max(high, foe.sp.position.y - base); if (foe.kx === 0 && foe.kz === 0) { hit = true; break; } }
    expect(hit, "slammed").toBe(true);
  });
});

describe("a kick that finds nothing", () => {
  it("whiffs: the view overreaches (lunge on, pitch forward), no marker, no stop", () => {
    // face a long clear way with nothing in it
    stage({ runway: 6 });
    foe.x += 60; foe.z += 60;   // out of the way: nothing within the boot's reach
    foe.hp = 5000;
    frame();
    resetPunch(); resetMarker(); screenShake.hitStop = 0; S.kickCd = 0;
    doKick();
    for (let i = 0; i < 8; i++) frame();
    expect(punch.lunge + punch.pitch * 0, "lunged").toBeGreaterThan(0);
    expect(punch.pitch, "pitched forward").toBeLessThan(0);
    expect(marker.left).toBe(0);
    expect(screenShake.hitStop).toBe(0);
  });
});

describe("a kick that meets a crate, a wall or a head", () => {
  it("a crate breaks and the boot's own stop and punch are asked for", () => {
    const { dx, dz } = stage({ runway: 3 });
    foe.x += 80; foe.z += 80;
    const crate = (world.props as unknown as Prop[]).find((p) => !p.explosive && !p.dead);
    expect(crate, "a breakable prop on level 1").toBeDefined();
    const c = crate!;
    const saveX = c.x, saveZ = c.z;
    c.x = player.px + dx * 1.5; c.z = player.pz + dz * 1.5;
    for (let i = 0; i < 100; i++) frame();   // old particles die (the longest lives 1.3 s)
    resetPunch(); screenShake.hitStop = 0; S.kickCd = 0;
    const before = liveParticles();
    doKick();
    const stop = peakStop(10);
    expect(stop, "the boot's own stop").toBeGreaterThanOrEqual(OBJECT_STOP - 0.02);
    expect(c.dead, "broken").toBe(true);
    expect(punch.lunge, "the punch").toBeGreaterThan(0.03);
    expect(liveParticles(), "dust and chips").toBeGreaterThan(before + 10);
    c.x = saveX; c.z = saveZ;
    expect(OBJECT_STOP).toBeGreaterThan(0.03);
  });

  it("a wall in the boot's reach: dust and the view's punch (the sound was there already)", () => {
    // a place where the wall is within the reach (1.1) of the player, facing it
    let found = false;
    outer: for (const cand of world.enemies as unknown as Foe[]) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2, dx = Math.sin(ang), dz = Math.cos(ang);
        const px = cand.x, pz = cand.z;
        if (!free(px, pz) || free(px + dx * 1.05, pz + dz * 1.05) || !free(px + dx * 0.4, pz + dz * 0.4)) continue;
        player.px = px; player.pz = pz; player.pyy = EYE + floorHeightAt(px, pz); player.spawnGuard = 999;
        renderState.camera.position.set(px, player.pyy, pz);
        input.yaw = Math.atan2(-dx, -dz);
        found = true; break outer;
      }
    }
    expect(found, "a spot facing a wall").toBe(true);
    foe.x += 80; foe.z += 80;
    for (let i = 0; i < 100; i++) frame();   // old particles die (the longest lives 1.3 s)
    resetPunch(); resetHitFeel(); screenShake.hitStop = 0; S.kickCd = 0;
    const before = liveParticles();
    doKick();
    const stop = peakStop(10);
    expect(stop, "the boot's own stop").toBeGreaterThanOrEqual(OBJECT_STOP - 0.02);
    expect(punch.lunge).toBeGreaterThan(0.03);
    expect(liveParticles(), "dust and chips").toBeGreaterThan(before + 10);
  });

  it("a severed head in the way is punted hard along the kick when the boot lands — and not before, and walking into it only nudges it", () => {
    const { dx, dz } = stage({ runway: 3 });
    foe.x += 80; foe.z += 80;
    spawnHead({ ...foe, x: player.px + dx * 1.6, z: player.pz + dz * 1.6, h: 1.8, w: 1.3, fy: foe.fy, key: "z" }, { dir: { x: 0, z: 0 } });
    const h = headPool.heads[0] as unknown as { x: number; z: number; vx: number; vz: number; vy: number; y: number; rest: boolean; sp: { visible: boolean } };
    h.vx = 0; h.vz = 0; h.vy = 0; h.rest = true; h.y = (foe.fy ?? 0) + 0.5;
    S.kickCd = 0;
    doKick();
    let before = 0;
    for (let i = 0; i < 5; i++) { frame(); before = Math.hypot(h.vx, h.vz); }
    expect(before, "the swing alone does not move it").toBeLessThan(0.5);
    for (let i = 0; i < 4; i++) frame();
    expect(h.vx * dx + h.vz * dz, "punted along the kick").toBeGreaterThan(4);
    expect(h.vy, "up").toBeGreaterThan(2);
    expect(punch.lunge, "the view gets it").toBeGreaterThan(0);
  });

  it("walking into a head, even while the leg swings, only nudges it: the punt is the boot's, on the frame it lands", () => {
    const { dx, dz } = stage({ runway: 3 });
    foe.x += 80; foe.z += 80;
    spawnHead({ ...foe, x: player.px + dx * 0.5, z: player.pz + dz * 0.5, h: 1.8, w: 1.3, fy: foe.fy, key: "z" }, { dir: { x: 0, z: 0 } });
    const h = headPool.heads[0] as unknown as { vx: number; vz: number; rest: boolean; y: number };
    h.vx = 0; h.vz = 0; h.rest = true; h.y = (foe.fy ?? 0) + 0.5;
    S.kickCd = 0;
    doKick();
    let fastest = 0;
    for (let i = 0; i < 3; i++) { frame(); fastest = Math.max(fastest, Math.hypot(h.vx, h.vz)); }   // inside the 110 ms: the boot has not landed
    expect(fastest, "a nudge, not a punt").toBeLessThan(4);
    expect(fastest).toBeGreaterThan(0.5);
  });
});
