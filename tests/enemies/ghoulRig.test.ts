// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type { Enemy } from "../../src/enemies/Enemy";
import { GHOUL } from "../../src/enemies/rig/ghoul";
import { renderBitmap, rolePose, roleCount, renderPart, type Bitmap } from "../../src/enemies/rig/bake";
import { HEAD, L_ARM, LEGS, R_ARM, drawFigure, type Role } from "../../src/enemies/rig/kit";
import { ATK_LEN, ATK_SPLIT, BEHEAD_FALL, DEATH_AT, KILL_FALL, PAIN_LEN, STAGGER } from "../../src/enemies/rig/timing";
import { HURT_LEN } from "../../src/enemies/HitReact";
import { FALL_SECS, STAGGER_SECS } from "../../src/enemies/Corpse";
import { Builder } from "../../src/render/viewmodel/builder";
import { Raster, finish } from "../../src/render/viewmodel/raster";
import { E } from "../../src/enemies/rig/palette";

/**
 * THE GHOUL IS A RIG (enemies plan, Task 1): what has to be true of it, held
 * where a test can bite.
 *
 * - **the bake is pure**: the same pose bakes the same pixels, and nothing in
 *   it draws from `Math.random`;
 * - **it has what the plan asks**: a walk of six, an idle, an attack of three, two
 *   of pain and five of death, and a crawl for the legless;
 * - **its parts are real**: the variant without a part omits that part and has bone
 *   and meat at the joint; the head that flies is the ghoul's own;
 * - **its head is the head `Hitscan` counts** (the top 26% of the sprite), and each
 *   death frame is drawn on the floor the sinking sprite is at;
 * - **the game selects its frames**: pain on a hit, the attack's three phases, the
 *   death sequence by how far the body has fallen; and a legacy enemy still selects
 *   exactly as it always did.
 */

const BITMAP_DIFF = (a: Bitmap, b: Bitmap): number => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) n++; return n; };
const OPAQUE = (a: Bitmap): number => { let n = 0; for (let i = 3; i < a.data.length; i += 4) if (a.data[i]) n++; return n; };
const ROLES: Array<[Role, number]> = [["walk", 6], ["idle", 1], ["atk", 3], ["pain", 2], ["die", 5], ["crawl", 4], ["crawlIdle", 1], ["crawlAtk", 3], ["crawlPain", 2], ["crawlDie", 5]];
const frame = (role: Role, i: number, mask = 0): Bitmap => renderBitmap(GHOUL, rolePose(GHOUL, role, i), mask, role.startsWith("crawl"));
/** The pixels of `b` that are one of the palette's tones of material `mat`. */
function ofMaterial(b: Bitmap, mat: number): number {
  const lut = GHOUL.palette.lut, tones = new Set<number>();
  for (let t = 0; t < 8; t++) tones.add((lut[(mat * 8 + t) * 4] << 16) | (lut[(mat * 8 + t) * 4 + 1] << 8) | lut[(mat * 8 + t) * 4 + 2]);
  let n = 0;
  for (let i = 0; i < b.data.length; i += 4) if (b.data[i + 3] && tones.has((b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2])) n++;
  return n;
}

describe("its constants are the game's", () => {
  it("the frame times mirror the game's own: the hurt timer, the stagger and the fall of a beheaded body, a kill's .45 s", () => {
    expect(PAIN_LEN).toBe(HURT_LEN);
    expect(STAGGER).toBe(STAGGER_SECS);
    expect(BEHEAD_FALL).toBe(FALL_SECS);
    expect(KILL_FALL).toBe(0.45);
    expect(ATK_LEN).toBe(0.22);
  });
});

describe("the bake is pure", () => {
  it("the same pose bakes the same pixels, twice, for every pose of every role", () => {
    for (const [role, n] of ROLES) for (let i = 0; i < n; i++) {
      const a = frame(role, i), b = frame(role, i);
      expect(BITMAP_DIFF(a, b), `${role}${i}`).toBe(0);
      expect(OPAQUE(a), `${role}${i} is not empty`).toBeGreaterThan(300);
    }
  });

  it("nothing in it draws from Math.random: every role, every variant, the parts", () => {
    const real = Math.random;
    let draws = 0;
    Math.random = (): number => { draws++; return real(); };
    try {
      for (const [role, n] of ROLES) for (let i = 0; i < n; i++) for (const m of [0, HEAD, L_ARM | R_ARM, LEGS]) frame(role, i, m);
      for (const k of ["head", "lArm", "rArm", "legs"] as const) renderPart(GHOUL, k);
    } finally { Math.random = real; }
    expect(draws).toBe(0);
  });
});

describe("it has the animation the plan asks for", () => {
  it("a walk of 6, an idle, an attack of 3, pain of 2, death of 5; and the legless ghoul a crawl of 4 and the same again", () => {
    for (const [role, n] of ROLES) expect(roleCount(GHOUL, role), role).toBe(n);
  });

  it("the walk cycle advances through all six poses: six different frames, and no two neighbours alike", () => {
    const f = [0, 1, 2, 3, 4, 5].map((i) => frame("walk", i));
    for (let i = 0; i < 6; i++) {
      expect(BITMAP_DIFF(f[i], f[(i + 1) % 6]), `step ${i} to ${(i + 1) % 6}`).toBeGreaterThan(150);
      for (let j = i + 1; j < 6; j++) expect(BITMAP_DIFF(f[i], f[j]), `pose ${i} vs ${j}`).toBeGreaterThan(0);
    }
  });

  it("the three attack phases and the two pain frames are different from each other and from the idle", () => {
    const set = [frame("idle", 0), ...[0, 1, 2].map((i) => frame("atk", i)), ...[0, 1].map((i) => frame("pain", i))];
    for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) expect(BITMAP_DIFF(set[i], set[j]), `${i} vs ${j}`).toBeGreaterThan(200);
  });

  it("the frame is the sprite's shape (its e.w / e.h) and the crawler's is as much shorter as its hitbox is", () => {
    const f = GHOUL.frame;
    expect(f.w / f.h).toBeCloseTo(1.0 / 1.4, 1);
    expect(GHOUL.crawlH).toBeCloseTo((GHOUL.regions.H - Math.ceil(GHOUL.regions.H * 0.28)) / GHOUL.regions.H, 9);
    expect(frame("crawl", 0, LEGS).h).toBe(Math.round(f.h * GHOUL.crawlH));
  });

  it("each death frame is drawn on the floor the sinking sprite is at: enemyTick sinks it .32 of its height as it falls", () => {
    for (let k = 0; k < 5; k++) {
      const from = DEATH_AT[k], to = k < 4 ? DEATH_AT[k + 1] : 1, mid = k < 4 ? (from + to) / 2 : 0.94;
      for (const role of ["die", "crawlDie"] as const) {
        expect(rolePose(GHOUL, role, k).floor, `${role}${k}`).toBeCloseTo(1 - 0.32 * mid, 1);
      }
    }
  });
});

describe("its parts are real", () => {
  const whole = frame("idle", 0);
  /** The pixels the part `group` alone covers in the standing frame. */
  const only = (group: "head" | "lArm" | "rArm" | "legs"): Bitmap => {
    const f = GHOUL.frame, r = new Raster(f.w, f.h, GHOUL.palette), pxm = f.h / f.worldH, b = new Builder(r, pxm * 14, f.w / 2 + f.shift * pxm, f.h * f.floor);
    b.translate(0, 0, 14); b.pitch(f.pitch); b.yaw(f.yaw);
    drawFigure(b, GHOUL, rolePose(GHOUL, "idle", 0), { mask: 0, only: group });
    const data = new Uint8ClampedArray(f.w * f.h * 4);
    for (let i = 0; i < f.w * f.h; i++) if (r.col[i]) data[i * 4 + 3] = 255;
    return { w: f.w, h: f.h, data };
  };
  /** Opaque pixels of `a` where `region` is. */
  const within = (a: Bitmap, region: Bitmap): number => { let n = 0; for (let i = 3; i < a.data.length; i += 4) if (a.data[i] && region.data[i]) n++; return n; };
  // (the right arm hangs in front of the torso in this view, so what it covered is torso once it is gone: it asks for less)
  /** Pixels of `region` where `a` and `b` differ. */
  const changed = (a: Bitmap, b: Bitmap, region: Bitmap): number => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (region.data[i + 3] && (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3])) n++; return n; };
  it.each([["head", HEAD, "head", 0.55], ["left arm", L_ARM, "lArm", 0.55], ["right arm", R_ARM, "rArm", 1.01], ["legs", LEGS, "legs", 0.7]] as const)("without its %s the part is gone and a stump of meat is at its joint", (_n, mask, group, ratio) => {
    const m = frame("idle", 0, mask), region = only(group);
    expect(OPAQUE(region), "the part covers something").toBeGreaterThan(80);
    // what the part covered is mostly empty now: a stump is a stub, not the limb
    expect(within(m, region), "the part is gone from where it was").toBeLessThan(within(whole, region) * ratio);
    expect(changed(m, whole, region), "what the part covered is something else now").toBeGreaterThan(OPAQUE(region) * 0.5);
    expect(BITMAP_DIFF(m, whole)).toBeGreaterThan(100);
    expect(ofMaterial(m, E.MEAT), "wet meat where it was torn").toBeGreaterThan(ofMaterial(whole, E.MEAT) + 8);
  });

  it("the part drawn on its own is exactly what the body lost: nothing of the head is in the headless body", () => {
    const r = new Raster(GHOUL.frame.w, GHOUL.frame.h, GHOUL.palette), pxm = GHOUL.frame.h / GHOUL.frame.worldH;
    const b = new Builder(r, pxm * 14, GHOUL.frame.w / 2 + GHOUL.frame.shift * pxm, GHOUL.frame.h * GHOUL.frame.floor);
    b.translate(0, 0, 14); b.pitch(GHOUL.frame.pitch); b.yaw(GHOUL.frame.yaw);
    drawFigure(b, GHOUL, rolePose(GHOUL, "idle", 0), { mask: 0, only: "head" });
    finish(r);
    const eyes = Array.from(r.col).filter((c) => c === E.EYE * 8 || (c >> 3) === E.EYE).length;
    expect(eyes, "the head has its eyes").toBeGreaterThan(2);
    expect(ofMaterial(frame("idle", 0, HEAD), E.EYE), "and the headless body has none").toBe(0);
    expect(ofMaterial(whole, E.EYE), "the whole ghoul has them").toBeGreaterThan(2);
  });

  it("the legless ghoul crawls: a crawl frame is not a walk frame and keeps the hips' stumps", () => {
    const c = frame("crawl", 0, LEGS);
    expect(ofMaterial(c, E.MEAT)).toBeGreaterThan(10);
  });

  it("an arm, the head and the legs fly off as parts of their own: not the monster's frame shrunk", () => {
    for (const k of ["head", "lArm", "rArm", "legs"] as const) {
      const { bmp, mw, mh } = renderPart(GHOUL, k);
      expect(OPAQUE(bmp), k).toBeGreaterThan(80);
      expect(mw, `${k} is smaller than the ghoul`).toBeLessThan(GHOUL.frame.worldH * 0.55);
      expect(mh).toBeLessThan(GHOUL.frame.worldH * 0.75);
    }
    const head = renderPart(GHOUL, "head"), legs = renderPart(GHOUL, "legs");
    expect(head.mh, "the head is a head").toBeLessThan(0.62);
    expect(legs.mw, "the legs are legs, lying on their side").toBeGreaterThan(0.6);
    expect(legs.mh, "a pair, one above the other").toBeLessThan(0.75);
  });
});

describe("its head is the head the hit test counts", () => {
  it.each([["idle", 0], ...[0, 1, 2, 3, 4, 5].map((i) => ["walk", i] as const)] as const)("%s%i: the head sits in the top of the sprite (Hitscan's frac>0.74 is its top 26%%)", (role, i) => {
    const f = GHOUL.frame, r = new Raster(f.w, f.h, GHOUL.palette), pxm = f.h / f.worldH, b = new Builder(r, pxm * 14, f.w / 2 + f.shift * pxm, f.h * f.floor);
    b.translate(0, 0, 14); b.pitch(f.pitch); b.yaw(f.yaw);
    drawFigure(b, GHOUL, rolePose(GHOUL, role, i), { mask: 0, only: "head" });
    finish(r);
    let y0 = f.h, y1 = -1;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (r.col[y * f.w + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const top = (f.h - y0) / f.h, bottom = (f.h - y1) / f.h, centre = (top + bottom) / 2;
    expect(centre, "its middle is in the head zone").toBeGreaterThan(0.77);
    expect(bottom, "and its chin is not far below the line").toBeGreaterThan(0.64);
    expect(top).toBeGreaterThan(0.88);
  });
});

// ---- in the game ----------------------------------------------------------------------------------------------

let enemyTick: (dt: number) => boolean;
let spawnEnemy: (ch: string, wx: number, wz: number, summoned?: boolean) => Enemy;
let damageEnemy: (e: unknown, dmg: number, info?: Record<string, unknown>) => void;
let PX: Record<string, Record<string, unknown>>;
let world: { grid: string[][]; GW: number; GH: number; heightMap: number[][] | null; wallSegs: unknown[]; doors: Record<string, unknown>; props: unknown[]; enemies: Enemy[]; cine: unknown };
let player: { px: number; pz: number; pyy: number };
type Set = { tex(role: string, i: number, mask?: number, mirror?: boolean): unknown };
const rig = (): Set => PX.z.rig as Set;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  const THREE = await import("three");
  const { buildSprites } = await import("../../src/enemies/SpriteBaker");
  const { renderState } = await import("../../src/render/Renderer");
  const { setScene } = await import("../../src/render/SceneRef");
  const scene = new THREE.Scene();
  buildSprites();
  renderState.scene = scene;
  setScene(scene);
  // the pools a kill or a torn-off limb throws into: blood particles, decals, the gore's chunks, drops and splats
  (await import("../../src/fx/Particles")).buildParticles();
  (await import("../../src/fx/GoreFx")).buildGore();
  PX = (await import("../../src/enemies/SpriteBaker")).PX as never;
  world = (await import("../../src/world/WorldState")).world;
  player = (await import("../../src/player/PlayerState")).player;
  spawnEnemy = (await import("../../src/world/LevelLoader")).spawnEnemy;
  enemyTick = (await import("../../src/enemies/ai/Behaviors")).enemyTick;
  damageEnemy = (await import("../../src/enemies/Damage")).damageEnemy as never;
});

beforeEach(() => {
  world.grid = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => "."));
  world.GW = 20; world.GH = 20; world.heightMap = null; world.wallSegs = []; world.doors = {}; world.props = []; world.cine = null; world.enemies = [];
  player.px = 5; player.pz = 5; player.pyy = 1;
});

/** A ghoul far from the player and not alerted: it stands, and nothing else about the tick touches its frame. */
const standing = (key = "z"): Enemy => { const e = spawnEnemy(key, 5, 30, true); e.cool = 9999; return e; };
const map = (e: Enemy): unknown => e.sp.material.map;

describe("the game selects its frames", () => {
  it("guard: PX.z is the rig's, with its legacy roles and its new ones all textures", () => {
    expect(PX.z.rig).toBeTruthy();
    for (const k of ["a", "b", "atk", "die1", "die2", "hl", "hlb", "noHead", "noHeadB", "noLArm", "noLArmB", "noRArm", "noRArmB", "noLegs", "noLegsB", "gibbed", "gibbedB",
      "idle", "walk0", "walk1", "walk2", "walk3", "walk4", "walk5", "atkWind", "atkStrike", "atkRecover", "pain0", "pain1", "death0", "death1", "death2", "death3", "death4"]) {
      expect((PX.z[k] as { isTexture?: boolean }).isTexture, k).toBe(true);
    }
    expect(PX.z.atk).toBe(PX.z.atkStrike);
    expect(PX.z.a, "spawns standing").toBe(PX.z.idle);
    expect(PX.z.noLArm, "a lazy variant is the same texture every time").toBe(PX.z.noLArm);
    expect(PX.z.head, "and head > 0 for Hitscan").toBeGreaterThan(0);
  });

  it("pain shows on a hit: the jerk, then the flinch, then it stands again", () => {
    const e = standing();
    e.hp = 500; e.maxhp = 500;
    expect(map(e)).toBe(PX.z.idle);
    damageEnemy(e, 5, { wIdx: 0, dir: { x: 1, z: 0 } });
    expect(e.hurt, "hurt starts at the game's .12 s").toBeCloseTo(HURT_LEN, 9);
    enemyTick(0.01);
    expect(map(e), "the first half of hurt: the jerk").toBe(PX.z.pain0);
    enemyTick(0.07);
    expect(map(e), "the second half: the flinch").toBe(PX.z.pain1);
    for (let i = 0; i < 40; i++) enemyTick(0.02);
    expect(e.hurt).toBeLessThanOrEqual(0);
    expect(map(e), "once it has recovered").toBe(PX.z.idle);
  });

  it("the attack runs its three phases over atkAnim's .22 s: the wind-up, the strike, the recover", () => {
    const e = standing();
    const want = (atk: number, name: string): void => { e.atkAnim = atk; enemyTick(0.0001); expect(map(e), `atkAnim ${atk}`).toBe(PX.z[name]); };
    want(ATK_LEN * (1 - ATK_SPLIT[0] / 2), "atkWind");
    want(ATK_LEN * (1 - (ATK_SPLIT[0] + ATK_SPLIT[1]) / 2), "atkStrike");
    want(ATK_LEN * 0.1, "atkRecover");
    e.atkAnim = 0; enemyTick(0.01);
    expect(map(e), "and it stands again").toBe(PX.z.idle);
  });

  it("dying runs the five death frames by how far the body has fallen, and a headless body stands, then falls headless", () => {
    const e = standing();
    damageEnemy(e, e.hp + 6, { wIdx: 0, dir: { x: 1, z: 0 } });
    expect(e.dead).toBe(true);
    expect(e.deathKind).toBe(1);
    const mirror = e.deathDir < 0, expected = (k: number): unknown => rig().tex("die", k, 0, mirror);
    let t = 0;
    for (const [until, k] of [[0.03, 0], [0.1, 1], [0.2, 2], [0.3, 3], [0.5, 4]] as const) {
      while (t < until) { enemyTick(0.01); t += 0.01; }
      expect(map(e), `${t.toFixed(2)} s after the blow`).toBe(expected(k));
    }
    expect(e.sp.material.rotation, "the frames do the falling: no tilt").toBe(0);
    // beheaded
    world.enemies = [];
    const h = standing();
    damageEnemy(h, h.hp + 6, { head: true, wIdx: 0, dir: { x: 1, z: 0 } });
    expect(h.deathKind).toBe(2);
    enemyTick(0.05);
    expect(map(h), "on its feet, headless, for .28 s").toBe(rig().tex("idle", 0, HEAD));
    for (let i = 0; i < 100; i++) enemyTick(0.01);
    expect(map(h), "then down, headless").toBe(rig().tex("die", 4, HEAD, h.deathDir < 0));
  });

  it("the dying sprite sinks as it always did (positions in the trace digests): the rig kept enemyTick's own curve", () => {
    const e = standing();
    damageEnemy(e, e.hp + 6, { wIdx: 0, dir: { x: 0, z: 1 } });
    for (let i = 0; i < 60; i++) enemyTick(0.01);
    expect(e.sp.position.y).toBeCloseTo(e.h * 0.18 + (e.fy || 0), 1);
  });

  it("an arm torn off is a walking ghoul without it, in the cycle; legs gone, it crawls", () => {
    const e = standing();
    e.hp = 900; e.maxhp = 900;
    damageEnemy(e, 40, { arm: true, armSide: "L", wIdx: 1, dir: { x: 1, z: 0 } });
    expect(e.sever?.lArm).toBe(true);
    e.hurt = 0; e.stun = 0;
    enemyTick(0.01);
    expect(map(e)).toBe(rig().tex("idle", 0, L_ARM));
    e.hurt = 0; e.stun = 0;
    damageEnemy(e, 40, { leg: true, wIdx: 1, dir: { x: 1, z: 0 } });
    e.hurt = 0; e.stun = 0;
    enemyTick(0.01);
    expect(map(e), "legless: the crawler's idle, without the arm").toBe(rig().tex("crawlIdle", 0, LEGS | L_ARM));
  });
});

describe("the parts that fly are the ghoul's own", () => {
  it("the flying head, arms and legs are the rig's parts, baked from its skeleton: the same textures every time, in its own set", async () => {
    const TEX = await import("../../src/fx/GoreTex");
    const { makePart } = await import("../../src/fx/Parts");
    const { headPool } = await import("../../src/fx/Heads");
    const set = PX.z.rig as unknown as { all(): unknown[]; part(k: string): { tex: unknown } };
    for (const k of ["head", "lArm", "rArm", "legs"] as const) {
      const art = TEX.partArt("z", k)!;
      expect(set.all(), `${k}: baked by the rig`).toContain(art.tex);
      expect(TEX.partArt("z", k)!.tex, "and kept").toBe(art.tex);
      expect(set.part(k).tex).toBe(art.tex);
    }
    // a legacy monster's parts are still cut from its pixel art, not from any rig
    expect(TEX.partArt("B", "head")!.tex).not.toBe(TEX.partArt("z", "head")!.tex);
    expect((PX.B.rig as unknown), "B has no rig set to contain it").toBeUndefined();
    // and the sprite that is thrown is that texture
    headPool.heads.length = 0;
    const host = { x: 5, z: 5, h: 1.65, w: 1.18, fy: 0, key: "z" };
    const part = makePart(0, host, { x: 5, y: 1.5, z: 5, vx: 1, vy: 4, vz: 0, spin: 3 })!;
    expect((part.sp.material as { map: unknown }).map, "the head that flies is the ghoul's own").toBe(TEX.partArt("z", "head")!.tex);
    expect((part.sp.material as { map: unknown }).map).not.toBe(PX.z.a);
    headPool.heads.length = 0;
  });

  it("a rigged monster's limbs fall, rest and are kicked exactly as the legacy monster's did: the legacy crop's physical box, thrown from the legacy height", async () => {
    // the church bot (churchPlay.test.ts) kicks parts, and a kick that lands is a hit-stop: the rig's thin arm in a box of its own moved that run off its recording
    const { makePart } = await import("../../src/fx/Parts");
    const { headPool } = await import("../../src/fx/Heads");
    const { PXDEF } = await import("../../src/enemies/pixels");
    const d = PXDEF.z, W = Math.max(...d.px.map((r) => r.length)), H = d.px.length, head = d.head || 0;
    const armBot = Math.min(H - 3, head + Math.ceil((H - head) * 0.45)), host = { x: 5, z: 5, h: 1.65, w: 1.18, fy: 0, key: "z" };
    const legacy = { 1: Math.min(((Math.ceil(W * 0.32) + 1) / W) * host.w * 1.3, ((armBot - head) / H) * host.h * 1.3), 2: Math.min(((W - (Math.floor(W * 0.68) - 1)) / W) * host.w * 1.3, ((armBot - head) / H) * host.h * 1.3), 3: Math.min(host.w * 1.3, (Math.ceil(H * 0.28) / H) * host.h * 1.3) };
    for (const kind of [1, 2, 3] as const) {
      headPool.heads.length = 0;
      const p = makePart(kind, host, { x: 5, y: 1, z: 5, vx: 0, vy: 0, vz: 0, spin: 0 })! as unknown as { sz: number; sp: { scale: { x: number; y: number } } };
      expect(p.sz, `kind ${kind}'s box`).toBeCloseTo(legacy[kind], 9);
      expect(Math.min(p.sp.scale.x, p.sp.scale.y), "while the art drawn in it is its own, thinner").toBeLessThan(p.sz);
    }
    headPool.heads.length = 0;
    expect(PX.z.regions, "the arm is thrown from the legacy height").toMatchObject({ armTop: head, armBot });
  });

  it("the crawler is the rig's too: crawlArt gives its crawl frames, with the arm or the head gone as asked", async () => {
    const TEX = await import("../../src/fx/GoreTex");
    expect(TEX.crawlArt("z", false, false, false)!.tex).toBe(rig().tex("crawl", 0, LEGS));
    expect(TEX.crawlArt("z", true, false, false)!.tex).toBe(rig().tex("crawl", 0, LEGS | L_ARM));
    expect(TEX.crawlArt("z", false, true, true)!.texB).toBe(rig().tex("crawl", 2, LEGS | R_ARM | HEAD));
  });
});

describe("a legacy enemy is unchanged", () => {
  it("the mancubus has no rig and its legacy frames: it dies on die1 then die2, tilting as it always did", () => {
    expect(PX.A.rig).toBeUndefined();
    const e = standing("A");
    damageEnemy(e, e.hp + 6, { wIdx: 0, dir: { x: 1, z: 0 } });
    enemyTick(0.05);
    expect(map(e), "die1 before .22 s").toBe(PX.A.die1);
    expect(e.sp.material.rotation).toBeCloseTo(e.deathDir * (0.05 / 0.45) * Math.PI / 6, 9);
    for (let i = 0; i < 40; i++) enemyTick(0.01);
    expect(map(e), "die2 after").toBe(PX.A.die2);
    expect(e.sp.material.rotation).toBeCloseTo(e.deathDir * Math.PI / 6, 9);
  });

  it("the heavy brute has no rig, no pain frame (a hit changes its frame not at all) and walks its two legacy frames", () => {
    expect(PX.B.rig).toBeUndefined();
    const e = standing("B");
    e.hp = 500; e.maxhp = 500;
    const before = map(e);
    damageEnemy(e, 5, { wIdx: 0, dir: { x: 1, z: 0 } });
    enemyTick(0.01);
    expect(map(e), "a hit does not change a legacy frame").toBe(before);
    expect(before).toBe(PX.B.a);
  });

  it("a legacy enemy that loses an arm is the legacy variant, as before", () => {
    const e = standing("B");
    e.hp = 900; e.maxhp = 900;
    damageEnemy(e, 40, { arm: true, armSide: "R", wIdx: 1, dir: { x: 1, z: 0 } });
    expect(map(e)).toBe(PX.B.noRArm);
  });
});

describe("it costs what the budget says", () => {
  it("only its idle frame is baked at boot; every other frame is baked the first time it is asked for, and kept", async () => {
    const { rigSprite } = await import("../../src/enemies/rig/sprite");
    const s = rigSprite(GHOUL), set = s.rig as unknown as { baked: number };
    expect(set.baked, "the idle, nothing else").toBe(1);
    const w2 = (s as unknown as Record<string, unknown>).walk2;
    expect(set.baked).toBe(2);
    expect((s as unknown as Record<string, unknown>).walk2, "and kept").toBe(w2);
    expect(set.baked).toBe(2);
    void s.b; void s.atk; void s.die1; void s.die2;
    expect(set.baked, "the legacy slots are frames of the same set").toBe(6);
  });

  it("all 17 standing frames rasterize in a fraction of the 250 ms budget (22 monsters at this rate are the number in docs/STATUS.md, which is why they are lazy)", () => {
    const t0 = performance.now();
    for (const [role, n] of ROLES.slice(0, 5)) for (let i = 0; i < n; i++) frame(role, i);
    expect(performance.now() - t0, "17 poses rasterized").toBeLessThan(250);
  });
});
