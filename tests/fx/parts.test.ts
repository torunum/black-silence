// @vitest-environment jsdom
import * as THREE from "three";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { gorePit } from "../support/goreWorld";
import { watchRandom } from "../support/randomWatch";

/**
 * THE PARTS A MONSTER COMES APART INTO (impact plan, Task 3): a head, an arm,
 * the legs — sprites cut from the monster's own art, flying with a blood
 * trail, bouncing, landing on the floor under them, lying on their sides,
 * kickable, and budgeted (twenty a level, the oldest's sprite reused).
 */

let P: typeof import("../../src/fx/Parts");
let D: typeof import("../../src/fx/GoreDrops");
let SP: typeof import("../../src/fx/Splats");
let H: typeof import("../../src/fx/Heads");
let player: typeof import("../../src/player/PlayerState").player;
let PX: Record<string, { head: number; regions: { W: number; H: number } }>;

beforeAll(async () => {
  installDomStubs();
  P = await import("../../src/fx/Parts");
  D = await import("../../src/fx/GoreDrops");
  SP = await import("../../src/fx/Splats");
  H = await import("../../src/fx/Heads");
  ({ player } = await import("../../src/player/PlayerState"));
  const sb = await import("../../src/enemies/SpriteBaker");
  sb.buildSprites();
  PX = sb.PX as never;
});

let scene: THREE.Scene;
const foe = { key: "z", x: 24, z: 24, h: 1.9, w: 1.36, fy: 0 };
const parts = (): Array<import("../../src/fx/Parts").Part> => H.headPool.heads as unknown as Array<import("../../src/fx/Parts").Part>;
const tick = (secs: number): void => { for (let i = 0; i < secs * 60; i++) P.headTick(1 / 60); };
const start = (over: Partial<import("../../src/fx/Parts").PartStart> = {}): import("../../src/fx/Parts").PartStart => ({ x: 24, y: 1.5, z: 24, vx: 3, vy: 4, vz: 0, spin: 8, ...over });

beforeEach(() => { scene = gorePit(); player.px = 2; player.pz = 2; });

describe("making a part", () => {
  it("is a sprite wearing the monster's own head, arm or legs, at that part's size on the monster", () => {
    const art = (k: "head" | "lArm") => import("../../src/fx/GoreTex").then((m) => m.partArt("z", k)!);
    return Promise.all([art("head"), art("lArm")]).then(([head, arm]) => {
      const h = P.makePart(0, foe, start())!;
      expect(h.sp.material.map).toBe(head.tex);
      expect(h.sp.scale.x).toBeCloseTo(head.cw * (foe.w / head.W), 6);
      expect(h.sp.scale.y).toBeCloseTo(head.ch * (foe.h / head.H), 6);
      expect(h.sz, "a head keeps the old head's size for its physics").toBeCloseTo(Math.max(0.34, foe.w * 0.34), 9);
      expect(h.sp.position.y + 0, "and is drawn at its own height, standing where the old one sat").toBeCloseTo(1.5 + (h.sp.scale.y - h.sz) / 2, 6);
      const a = P.makePart(1, foe, start())!;
      expect(a.sp.material.map).toBe(arm.tex);
      // the ghoul has a rig: its arm is drawn true size in the legacy crop's physical box (the box decides how it falls and rests: the church bot's run depends on it)
      expect(a.sz, "a rigged limb rests in the legacy box, its art thinner than the box").toBeGreaterThan(Math.min(a.sp.scale.x, a.sp.scale.y) + 0.1);
      expect(arm.phys, "and says what box").toBeTruthy();
      expect(scene.children.filter((o) => o.type === "Sprite")).toHaveLength(2);
      expect(parts()).toHaveLength(2);
      // a legacy monster's limb is its own box: it rests on its thin side, as it always did
      return import("../../src/fx/GoreTex").then((m) => {
        const legacy = { ...foe, key: "j" }, art2 = m.partArt("j", "lArm")!;
        const b = P.makePart(1, legacy, start())!;
        expect(b.sp.material.map).toBe(art2.tex);
        expect(art2.phys).toBeUndefined();
        expect(b.sz, "a limb rests on its thin side").toBeCloseTo(Math.min(b.sp.scale.x, b.sp.scale.y), 6);
      });
    });
  });

  it("is nothing for a monster that has no head to lose", () => {
    const noHead = Object.keys(PX).find((k) => PX[k].head === 0);
    if (!noHead) return;   // every monster in the roster has one
    expect(P.makePart(0, { ...foe, key: noHead }, start())).toBeNull();
    expect(parts()).toHaveLength(0);
  });

  it("is twenty a level: the next part takes the oldest's sprite, and no sprite is added", () => {
    const first = P.makePart(0, foe, start({ x: 10 }))!;
    for (let i = 1; i < P.PART_MAX; i++) P.makePart(1, foe, start({ x: 10 + i }));
    expect(parts()).toHaveLength(P.PART_MAX);
    const sprites = scene.children.filter((o) => o.type === "Sprite").length;
    expect(sprites).toBe(P.PART_MAX);
    const newest = P.makePart(2, foe, start({ x: 40 }))!;
    expect(parts()).toHaveLength(P.PART_MAX);
    expect(scene.children.filter((o) => o.type === "Sprite").length, "no sprite added past the cap").toBe(P.PART_MAX);
    expect(newest.sp, "wearing the oldest's sprite").toBe(first.sp);
    expect(parts().includes(first), "the oldest is gone from the list").toBe(false);
    expect(first.sp.visible).toBe(true);
  });

  it("lives until it is recycled: a part has no life of its own to run out", () => {
    const p = P.makePart(0, foe, start())!;
    tick(120);
    expect(p.life).toBe(Infinity);
    expect(parts().includes(p)).toBe(true);
  });
});

describe("the flight", () => {
  it.each([0, 1.2, 4.2])("a part lands and lies on the floor under it, on a floor of %s", (fy) => {
    scene = gorePit(() => fy);
    const kinds = [0, 1, 2, 3];
    for (const k of kinds) P.makePart(k, { ...foe, fy }, start({ y: fy + 1.5, vx: 2 + k, vz: 0.5 * k }));
    tick(12);
    for (const p of parts()) {
      expect(p.rest, `kind ${p.kind} came to rest`).toBe(true);
      expect(p.y, "on the floor").toBeCloseTo(fy + p.sz * 0.5, 5);
      if (p.kind === 0) expect(p.sp.position.y - p.sp.scale.y / 2, "a head's own face stands on the floor").toBeCloseTo(fy, 5);
    }
  });

  it("rolls onto another height: a part thrown off a plateau lands on the lower floor", () => {
    scene = gorePit((gx) => (gx < 12 ? 4.2 : 1.2));
    const p = P.makePart(1, { ...foe, fy: 4.2 }, start({ x: 23.5, y: 5.5, vx: 3, vz: 0 }))!;
    tick(12);
    expect(p.x).toBeGreaterThan(24);
    expect(p.y).toBeCloseTo(1.2 + p.sz * 0.5, 5);
  });

  it("bleeds a trail while it flies fast: drops are thrown off it as it goes", () => {
    P.makePart(0, foe, start({ vx: 6, vy: 6 }));
    let max = 0;
    for (let i = 0; i < 30; i++) { P.headTick(1 / 60); max = Math.max(max, D.dropStats().drops); }
    expect(max, "a trail of drops in the air").toBeGreaterThanOrEqual(5);
  });

  it("every landing splashes the floor, and a part at rest leaves a pool under it", () => {
    P.makePart(1, foe, start({ vx: 4, vy: 6 }));
    const before = SP.splatStats().blobs;
    tick(8);
    expect(SP.splatStats().blobs - before, "splats from the bounces, the drops and its pool").toBeGreaterThanOrEqual(3);
    expect(parts()[0].rest).toBe(true);
  });

  it("an arm that has stopped eases round to lie on its side; the legs lie flat", () => {
    const arm = P.makePart(1, foe, start({ vx: 3, spin: 5 }))!;
    const legs = P.makePart(3, foe, start({ x: 20, vx: 3, spin: 5 }))!;
    tick(10);
    expect(arm.rest && legs.rest).toBe(true);
    expect(Math.abs(Math.sin(arm.sp.material.rotation)), "on its side").toBeCloseTo(1, 2);
    expect(Math.abs(Math.sin(legs.sp.material.rotation)), "flat").toBeCloseTo(0, 2);
  });
});

describe("the kick", () => {
  it("punts the parts in front of the boot hard along the kick and up; the ones behind it stay", () => {
    player.px = 20; player.pz = 24;
    const front = P.makePart(1, foe, start({ x: 21.5, y: 0.3, vx: 0, vy: 0, vz: 0 }))!;
    const behind = P.makePart(2, foe, start({ x: 18.5, y: 0.3, vx: 0, vy: 0, vz: 0 }))!;
    front.rest = true; behind.rest = true;
    const n = P.puntHeads(1, 0);
    expect(n).toBe(1);
    expect(front.vx).toBeGreaterThan(10); expect(front.vy).toBeGreaterThan(5); expect(front.rest).toBe(false);
    expect(behind.vx).toBe(0); expect(behind.rest).toBe(true);
  });

  it("walking into a part only nudges it", () => {
    const p = P.makePart(0, foe, start({ vx: 0, vy: 0, vz: 0 }))!;
    p.rest = true; p.y = 0.3;
    player.px = p.x - 0.4; player.pz = p.z;
    P.headTick(1 / 60);
    expect(Math.hypot(p.vx, p.vz)).toBeLessThan(4);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(2);
  });
});

describe("the dice", () => {
  it("a limb's whole flight, trail, bounces and pool draw nothing from the game's Math.random; a head draws only its old bounce rolls", () => {
    const w = watchRandom();
    try { P.makePart(1, foe, start()); P.makePart(3, foe, start({ x: 20 })); tick(8); } finally { w.stop(); }
    expect(w.draws(), "limbs").toBe(0);
    const h = watchRandom();
    try { P.makePart(0, foe, start({ x: 30 })); tick(8); } finally { h.stop(); }
    // `headTick`'s bounce draws two rolls (and `rnd` for a pool) each bounce, exactly as it always did: a handful, never a stream
    expect(h.draws()).toBeGreaterThan(0);
    expect(h.draws(), "a handful, not a stream: eight seconds of bounces").toBeLessThan(150);
  });
});
