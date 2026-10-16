// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type { Enemy } from "../../src/enemies/Enemy";
import { RIGS } from "../../src/enemies/rig";
import { renderBitmap, rolePose, roleCount, renderPart, type Bitmap } from "../../src/enemies/rig/bake";
import { HEAD, L_ARM, LEGS, R_ARM, drawFigure, type Rig, type Role } from "../../src/enemies/rig/kit";
import { ATK_LEN, ATK_SPLIT, DEATH_AT, LUNGE_AIR, LUNGE_SECS, SCREAM_STUN, SCREAM_T } from "../../src/enemies/rig/timing";
import { HURT_LEN } from "../../src/enemies/HitReact";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";
import { PXDEF } from "../../src/enemies/pixels";
import { Builder } from "../../src/render/viewmodel/builder";
import { Raster, finish } from "../../src/render/viewmodel/raster";
import { E, FIRST_OWN } from "../../src/enemies/rig/palette";

/**
 * THE COMMON GRUNTS ARE RIGS (enemies plan, Task 2): the plague bloat `t`, the flayed sprinter `f`, the
 * plated horror `m`, the wailer `s`, the hound `g` and the dragger `w`, held where a test can bite.
 * (The plan calls `w` the wailer and `s` something else; in `EnemyDefs`/`PXDEF` `s` is the WAILER, with
 * the scream, and `w` the DRAGGER, torn at the waist: these tests follow the game's data.)
 *
 * For each one:
 * - **the bake is pure** and has what the plan asks (walk 6, idle, attack 3, pain 2, death 5, a crawl);
 * - **it keeps its world size and its mass**: the frame is the sprite's shape, its silhouette is as wide
 *   as the legacy art's, its colours as bright and its saturated accents as present (the rigged ghoul's
 *   first draft was a slimmer, paler thing than the sprite it replaced; this is the bar that holds it);
 * - **its head is where `Hitscan` counts one** (the top of the frame), or it has none (the hound and the
 *   dragger: the legacy art has no head row, so no head hit is counted and no headless frame exists);
 * - **its parts are real**: each dismemberment omits the part and leaves a stump of meat, the part that
 *   flies is its own;
 * - **the game selects its frames**: pain on a hit, the attack's phases, the death sequence, the walk,
 *   the crawl; the hound's leap and the wailer's scream hold the attack frames.
 */

/** How much of the legacy sprite's fill each rig must keep: the thinner bodies (the wailer, a starved thing in a shroud) are held to less, the barrels and brutes to nearly all of it. */
const FILL_BAR: Record<string, number> = { t: 0.8, f: 0.8, m: 0.85, s: 0.6, g: 0.8, w: 0.8, j: 0.65, L: 0.6, C: 0.7, n: 0.65, k: 0.65, y: 0.7, R: 0.7 };
const KEYS = ["t", "f", "m", "s", "g", "w", "j", "L", "C", "n", "k", "y", "R"] as const;
type Key = (typeof KEYS)[number];
/** The five that fly and the two that were never given a head row: the demons' flyers have none (a head shot is not counted on them), the hound and the dragger neither. */
const HAS_HEAD: Record<Key, boolean> = { t: true, f: true, m: true, s: true, g: false, w: false, j: true, L: false, C: false, n: true, k: true, y: false, R: false };
/** What a torn-off part leaves is wet meat, except on a skull of fire (a hollow of embers) and on stone (pale rock): the material whose pixels must show at the break. */
const STUMP: Partial<Record<Key, number>> = { L: FIRST_OWN + 4, y: FIRST_OWN + 2 };
const stumpMat = (key: Key): number => STUMP[key] ?? E.MEAT;

const DIFF = (a: Bitmap, b: Bitmap): number => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) n++; return n; };
const OPAQUE = (a: Bitmap): number => { let n = 0; for (let i = 3; i < a.data.length; i += 4) if (a.data[i]) n++; return n; };
const frame = (rig: Rig, role: Role, i: number, mask = 0): Bitmap => renderBitmap(rig, rolePose(rig, role, i), mask, role.startsWith("crawl"));
const ROLES: Array<[Role, number]> = [["walk", 6], ["idle", 1], ["atk", 3], ["pain", 2], ["die", 5], ["crawl", 4], ["crawlIdle", 1], ["crawlAtk", 3], ["crawlPain", 2], ["crawlDie", 5]];
/** The pixels of `b` that are a tone of material `mat` in `rig`'s palette. */
function ofMaterial(rig: Rig, b: Bitmap, mat: number): number {
  const lut = rig.palette.lut, tones = new Set<number>();
  for (let t = 0; t < 8; t++) tones.add((lut[(mat * 8 + t) * 4] << 16) | (lut[(mat * 8 + t) * 4 + 1] << 8) | lut[(mat * 8 + t) * 4 + 2]);
  let n = 0;
  for (let i = 0; i < b.data.length; i += 4) if (b.data[i + 3] && tones.has((b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2])) n++;
  return n;
}

interface Look { fill: number; width: number; lum: number; punch: number }
/** What a sprite looks like at a distance: how much of its frame it fills, how wide it is, how bright, and how much of it is saturated and bright. */
function look(img: { w: number; h: number; at(x: number, y: number): [number, number, number, number] }): Look {
  let n = 0, x0 = img.w, x1 = -1, L = 0, punch = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const [r, g, b, a] = img.at(x, y); if (!a) continue;
    n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    L += 0.299 * r + 0.587 * g + 0.114 * b;
    if (mx && (mx - mn) / mx > 0.45 && mx / 255 > 0.45) punch++;
  }
  return { fill: n / (img.w * img.h), width: (x1 - x0 + 1) / img.w, lum: L / Math.max(1, n), punch: punch / (img.w * img.h) };
}
const legacyLook = (key: string): Look => {
  const d = PXDEF[key], W = Math.max(...d.px.map((r) => r.length)), H = d.px.length;
  const hex = (s: string): number[] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  return look({ w: W, h: H, at: (x, y) => { const k = d.px[y][x]; if (!k || k === " " || !d.pal[k] || d.pal[k] === "#00000000") return [0, 0, 0, 0]; const c = hex(d.pal[k]); return [c[0], c[1], c[2], 255]; } });
};
const newLook = (b: Bitmap): Look => look({ w: b.w, h: b.h, at: (x, y) => { const o = (y * b.w + x) * 4; return [b.data[o], b.data[o + 1], b.data[o + 2], b.data[o + 3]]; } });

describe.each(KEYS)("%s: the rig", (key) => {
  const rig = RIGS[key], def = ENEMY_DEFS[key], f = rig.frame;

  it("has the animation the plan asks for: a walk of 6, an idle, an attack of 3, pain of 2, death of 5, and the same for the legless one (a crawl of 4)", () => {
    expect(rig.key).toBe(key);
    for (const [role, n] of ROLES) expect(roleCount(rig, role), role).toBe(n);
  });

  it("the bake is pure: the same pose bakes the same pixels, and nothing in it draws from Math.random (every role, every variant, the parts)", () => {
    for (const [role, n] of ROLES) for (let i = 0; i < n; i++) {
      const a = frame(rig, role, i), b = frame(rig, role, i);
      expect(DIFF(a, b), `${role}${i}`).toBe(0);
      expect(OPAQUE(a), `${role}${i} is not empty`).toBeGreaterThan(250);
    }
    const real = Math.random;
    let draws = 0;
    Math.random = (): number => { draws++; return real(); };
    try {
      for (const [role, n] of ROLES) for (let i = 0; i < n; i++) for (const m of [0, HEAD, L_ARM | R_ARM, LEGS]) frame(rig, role, i, m);
      for (const k of ["head", "lArm", "rArm", "legs"] as const) renderPart(rig, k);
    } finally { Math.random = real; }
    expect(draws).toBe(0);
  });

  it("the walk cycle advances through all six poses: six different frames, no two neighbours alike", () => {
    const w = [0, 1, 2, 3, 4, 5].map((i) => frame(rig, "walk", i));
    for (let i = 0; i < 6; i++) {
      expect(DIFF(w[i], w[(i + 1) % 6]), `step ${i} to ${(i + 1) % 6}`).toBeGreaterThan(80);
      for (let j = i + 1; j < 6; j++) expect(DIFF(w[i], w[j]), `pose ${i} vs ${j}`).toBeGreaterThan(0);
    }
  });

  it("the three attack phases and the two pain frames differ from each other and from the idle", () => {
    const set = [frame(rig, "idle", 0), ...[0, 1, 2].map((i) => frame(rig, "atk", i)), ...[0, 1].map((i) => frame(rig, "pain", i))];
    for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) expect(DIFF(set[i], set[j]), `${i} vs ${j}`).toBeGreaterThan(120);
  });

  it("the frame is the sprite's shape (its e.w / e.h) and the crawler's is as much shorter as its hitbox is", () => {
    expect(f.w / f.h).toBeCloseTo(def.w / def.h, 1);
    expect(Math.abs(f.w / f.h / (def.w / def.h) - 1), "to within a pixel's rounding").toBeLessThan(0.03);
    const g = rig.regions;
    expect(rig.crawlH).toBeCloseTo((g.H - Math.ceil(g.H * 0.28)) / g.H, 9);
    expect(frame(rig, "crawl", 0, LEGS).h).toBe(Math.round(f.h * rig.crawlH));
    // the legacy grid the gore code measures rows in, and the legacy height of an arm's throw (the church bot's physics)
    const d = PXDEF[key], H = d.px.length, W = d.px[0].length, head = d.head || 0;   // (`buildSprites` measures a creature's width by its first row)
    expect({ W: g.W, H: g.H, armTop: g.armTop, armBot: g.armBot }).toEqual({ W, H, armTop: head, armBot: Math.min(H - 3, head + Math.ceil((H - head) * 0.45)) });
  });

  it("each death frame is drawn on the floor the sinking sprite is at: enemyTick sinks it .32 of its height as it falls", () => {
    for (let k = 0; k < 5; k++) {
      const from = DEATH_AT[k], to = k < 4 ? DEATH_AT[k + 1] : 1, mid = k < 4 ? (from + to) / 2 : 0.94;
      for (const role of ["die", "crawlDie"] as const) expect(rolePose(rig, role, k).floor, `${role}${k}`).toBeCloseTo(1 - 0.32 * mid, 1);
    }
  });

  it("it keeps the legacy sprite's mass and its colour punch: as wide, as bright, nearly as full, and the saturated accents are there", () => {
    const old = legacyLook(key);
    for (const [role, i] of [["idle", 0], ["walk", 0], ["walk", 3]] as const) {
      const n = newLook(frame(rig, role, i));
      expect(n.width, `${role}${i} is as wide as the old art (${old.width.toFixed(2)})`).toBeGreaterThan(old.width * 0.85);
      expect(n.fill, `${role}${i} fills its frame (${old.fill.toFixed(2)})`).toBeGreaterThan(old.fill * FILL_BAR[key]);
      expect(n.lum, `${role}${i} is as bright (${old.lum.toFixed(0)})`).toBeGreaterThan(old.lum * 0.95);
      expect(n.punch, `${role}${i} has its saturated accents (${(old.punch * 100).toFixed(1)}%)`).toBeGreaterThan(old.punch * 0.2);
    }
  });
});

describe.each(KEYS.filter((k) => HAS_HEAD[k]))("%s: its head is the head the hit test counts", (key) => {
  const rig = RIGS[key], f = rig.frame;
  it.each([["idle", 0], ...[0, 1, 2, 3, 4, 5].map((i) => ["walk", i] as const)] as const)("%s%i: the head sits in the top of the sprite (Hitscan's frac>0.74)", (role, i) => {
    const r = new Raster(f.w, f.h, rig.palette), pxm = f.h / f.worldH, b = new Builder(r, pxm * 14, f.w / 2 + f.shift * pxm, f.h * f.floor);
    b.translate(0, 0, 14); b.pitch(f.pitch); b.yaw(f.yaw);
    drawFigure(b, rig, rolePose(rig, role, i), { mask: 0, only: "head" });
    finish(r);
    let y0 = f.h, y1 = -1;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (r.col[y * f.w + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const top = (f.h - y0) / f.h, bottom = (f.h - y1) / f.h, centre = (top + bottom) / 2;
    expect(centre, "its middle is in the head zone").toBeGreaterThan(0.74);
    expect(top, "and it reaches the top").toBeGreaterThan(0.85);
  });
});

describe.each(KEYS)("%s: its parts are real", (key) => {
  const rig = RIGS[key], f = rig.frame, whole = frame(rig, "idle", 0);
  /** The pixels the part `group` alone covers in the standing frame. */
  const only = (group: "head" | "lArm" | "rArm" | "legs"): Bitmap => {
    const r = new Raster(f.w, f.h, rig.palette), pxm = f.h / f.worldH, b = new Builder(r, pxm * 14, f.w / 2 + f.shift * pxm, f.h * f.floor);
    b.translate(0, 0, 14); b.pitch(f.pitch); b.yaw(f.yaw);
    drawFigure(b, rig, rolePose(rig, "idle", 0), { mask: 0, only: group });
    const data = new Uint8ClampedArray(f.w * f.h * 4);
    for (let i = 0; i < f.w * f.h; i++) if (r.col[i]) data[i * 4 + 3] = 255;
    return { w: f.w, h: f.h, data };
  };
  const within = (a: Bitmap, region: Bitmap): number => { let n = 0; for (let i = 3; i < a.data.length; i += 4) if (a.data[i] && region.data[i]) n++; return n; };
  const changed = (a: Bitmap, b: Bitmap, region: Bitmap): number => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (region.data[i + 3] && (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3])) n++; return n; };
  const cases = [["left arm", L_ARM, "lArm"], ["right arm", R_ARM, "rArm"], ["legs", LEGS, "legs"], ...(HAS_HEAD[key] ? [["head", HEAD, "head"]] : [])] as Array<[string, number, "head" | "lArm" | "rArm" | "legs"]>;

  it.each(cases)("without its %s the part is gone and wet meat is at its joint", (_n, mask, group) => {
    const m = frame(rig, "idle", 0, mask), region = only(group);
    expect(OPAQUE(region), "the part covers something").toBeGreaterThan(60);
    expect(DIFF(m, whole), "the figure is different").toBeGreaterThan(100);
    expect(within(m, region), "the part is gone from where it was (a stump is a stub, not the limb)").toBeLessThan(within(whole, region) * 0.97);
    expect(changed(m, whole, region), "what the part covered is something else now").toBeGreaterThan(OPAQUE(region) * 0.3);
    expect(ofMaterial(rig, m, stumpMat(key)), "wet meat (or embers, or broken stone) where it was torn").toBeGreaterThan(ofMaterial(rig, whole, stumpMat(key)) + 6);
  });

  it("each part that flies is its own, baked from its skeleton: smaller than the monster and not its frame shrunk", () => {
    for (const k of ["head", "lArm", "rArm", "legs"] as const) {
      const { bmp, mw, mh } = renderPart(rig, k);
      expect(OPAQUE(bmp), k).toBeGreaterThan(40);
      expect(OPAQUE(bmp), `${k} is less of the monster than the whole of it`).toBeLessThan(OPAQUE(whole) * 0.7);
      expect(mw, `${k} is narrower than the frame`).toBeLessThan(f.worldH * (f.w / f.h) * 0.75);
      expect(mh, `${k} is shorter than the frame`).toBeLessThan(f.worldH * 0.9);
    }
  });

  it("the legless one is a different body: the crawl frame carries stumps of meat at the hips and is not a walk frame", () => {
    const c = frame(rig, "crawl", 0, LEGS);
    expect(ofMaterial(rig, c, stumpMat(key)), "meat (or embers, or broken stone) at the hips").toBeGreaterThan(4);
    expect(DIFF(c, frame(rig, "crawl", 2, LEGS))).toBeGreaterThan(60);
  });
});

// ---- in the game ----------------------------------------------------------------------------------------------

let enemyTick: (dt: number) => boolean;
let spawnEnemy: (ch: string, wx: number, wz: number, summoned?: boolean) => Enemy;
let damageEnemy: (e: unknown, dmg: number, info?: Record<string, unknown>) => void;
let PX: Record<string, Record<string, unknown>>;
let world: { grid: string[][]; GW: number; GH: number; heightMap: number[][] | null; wallSegs: unknown[]; doors: Record<string, unknown>; props: unknown[]; enemies: Enemy[]; cine: unknown };
let player: { px: number; pz: number; pyy: number };
type Set = { tex(role: string, i: number, mask?: number, mirror?: boolean): unknown; all(): unknown[]; baked: number };
const rigOf = (key: string): Set => PX[key].rig as Set;

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

/** A monster far from the player and not alerted: it stands, and nothing else about the tick touches its frame. */
const standing = (key: string): Enemy => { const e = spawnEnemy(key, 5, 30, true); e.cool = 9999; e.plate = 0; return e; };
const map = (e: Enemy): unknown => e.sp.material.map;

describe.each(KEYS)("%s: the game selects its frames", (key) => {
  it("PX is the rig's, with its legacy roles and its new ones all textures, and a headless frame only where there is a head", () => {
    const P = PX[key];
    expect(P.rig).toBeTruthy();
    for (const k of ["a", "b", "atk", "die1", "die2", "hl", "hlb", "noLArm", "noLArmB", "noRArm", "noRArmB", "noLegs", "noLegsB", "gibbed", "gibbedB",
      "idle", "walk0", "walk1", "walk2", "walk3", "walk4", "walk5", "atkWind", "atkStrike", "atkRecover", "pain0", "pain1", "death0", "death1", "death2", "death3", "death4"]) {
      expect((P[k] as { isTexture?: boolean }).isTexture, k).toBe(true);
    }
    expect(P.atk).toBe(P.atkStrike);
    expect(P.a, "spawns standing").toBe(P.idle);
    expect(P.noHead === null, "no head row, no headless frame (the legacy art has none)").toBe(!HAS_HEAD[key]);
    expect((P.head as number) > 0, "and Hitscan's head test (PX.head > 0) is what it was").toBe(HAS_HEAD[key]);
    expect(P.head, "equal to the legacy row's").toBe(HAS_HEAD[key] ? RIGS[key].regions.head : 0);
  });

  it("pain shows on a hit: the jerk, then the flinch, then it stands again", () => {
    const e = standing(key);
    e.hp = 5000; e.maxhp = 5000;
    expect(map(e)).toBe(PX[key].idle);
    damageEnemy(e, 5, { wIdx: 0, dir: { x: 1, z: 0 } });
    expect(e.hurt, "hurt starts at the game's .12 s").toBeCloseTo(HURT_LEN, 9);
    enemyTick(0.01);
    expect(map(e), "the first half of hurt: the jerk").toBe(PX[key].pain0);
    enemyTick(0.07);
    expect(map(e), "the second half: the flinch").toBe(PX[key].pain1);
    for (let i = 0; i < 40; i++) enemyTick(0.02);
    expect(e.hurt).toBeLessThanOrEqual(0);
    expect(map(e), "once it has recovered").toBe(PX[key].idle);
  });

  it("the attack runs its three phases over atkAnim's .22 s: the wind-up, the strike, the recover", () => {
    const e = standing(key);
    const want = (atk: number, name: string): void => { e.atkAnim = atk; enemyTick(0.0001); expect(map(e), `atkAnim ${atk}`).toBe(PX[key][name]); };
    want(ATK_LEN * (1 - ATK_SPLIT[0] / 2), "atkWind");
    want(ATK_LEN * (1 - (ATK_SPLIT[0] + ATK_SPLIT[1]) / 2), "atkStrike");
    want(ATK_LEN * 0.1, "atkRecover");
    e.atkAnim = 0; enemyTick(0.01);
    expect(map(e), "and it stands again").toBe(PX[key].idle);
  });

  it("it walks: moving, it steps through its six poses in order and wraps; standing still it does not step", () => {
    const e = standing(key);
    e.alertX = 5; e.alertZ = 25; e.speed = 1.5; e.atkAnim = 0;   // the investigate branch: it moves, no combat, no dice
    const step = rigOf(key) && RIGS[key].walkStep, seen: unknown[] = [];
    for (let i = 0; i < 40 && seen.length < 8; i++) { enemyTick(step + 0.001); const m = map(e); if (seen[seen.length - 1] !== m) seen.push(m); }
    const names = [0, 1, 2, 3, 4, 5].map((i) => PX[key][`walk${i}`]);
    const at = seen.map((m) => names.indexOf(m));
    expect(at.every((i) => i >= 0), "walk frames only").toBe(true);
    expect(new Set(at).size, "through at least five of its six poses").toBeGreaterThanOrEqual(5);
    for (let i = 1; i < at.length; i++) expect((at[i] - at[i - 1] + 6) % 6, "in order").toBe(1);
  });

  it("dying runs the five death frames by how far the body has fallen", () => {
    const e = standing(key);
    damageEnemy(e, e.hp + 6, { wIdx: 0, dir: { x: 1, z: 0 } });
    expect(e.dead).toBe(true);
    expect(e.deathKind).toBe(1);
    const mirror = e.deathDir < 0, expected = (k: number): unknown => rigOf(key).tex("die", k, 0, mirror);
    let t = 0;
    for (const [until, k] of [[0.03, 0], [0.1, 1], [0.2, 2], [0.3, 3], [0.5, 4]] as const) {
      while (t < until) { enemyTick(0.01); t += 0.01; }
      expect(map(e), `${t.toFixed(2)} s after the blow`).toBe(expected(k));
    }
    expect(e.sp.material.rotation, "the frames do the falling: no tilt").toBe(0);
  });

  it("a torn-off arm is a walking monster without it; the legs gone, it crawls (with the arm still off)", () => {
    const e = standing(key);
    e.hp = 9000; e.maxhp = 9000;
    damageEnemy(e, 40, { arm: true, armSide: "L", wIdx: 1, dir: { x: 1, z: 0 } });
    expect(e.sever?.lArm).toBe(true);
    e.hurt = 0; e.stun = 0;
    enemyTick(0.01);
    expect(map(e)).toBe(rigOf(key).tex("idle", 0, L_ARM));
    e.hurt = 0; e.stun = 0;
    damageEnemy(e, 40, { leg: true, wIdx: 1, dir: { x: 1, z: 0 } });
    e.hurt = 0; e.stun = 0;
    enemyTick(0.01);
    expect(map(e), "legless: the crawler's idle, without the arm").toBe(rigOf(key).tex("crawlIdle", 0, LEGS | L_ARM));
  });

  if (HAS_HEAD[key]) it("a beheaded body stands, headless, for .28 s and then falls headless", () => {
    const h = standing(key);
    damageEnemy(h, h.hp + 6, { head: true, wIdx: 0, dir: { x: 1, z: 0 } });
    expect(h.deathKind).toBe(2);
    enemyTick(0.05);
    expect(map(h), "on its feet, headless").toBe(rigOf(key).tex("idle", 0, HEAD));
    for (let i = 0; i < 100; i++) enemyTick(0.01);
    expect(map(h), "then down, headless").toBe(rigOf(key).tex("die", 4, HEAD, h.deathDir < 0));
  });

  if (!HAS_HEAD[key]) it("a shot at its top is not a head hit: no beheading, the body dies whole", () => {
    const h = standing(key);
    damageEnemy(h, h.hp + 6, { head: true, wIdx: 0, dir: { x: 1, z: 0 } });
    expect(h.deathKind, "an ordinary death (the legacy art has no head row)").toBe(1);
  });

  it("a rigged monster's limbs fall and rest in the legacy crop's box (the church bot's kicks depend on it)", async () => {
    const { makePart } = await import("../../src/fx/Parts");
    const { headPool } = await import("../../src/fx/Heads");
    const d = PXDEF[key], W = Math.max(...d.px.map((r) => r.length)), H = d.px.length, head = d.head || 0;
    const armBot = Math.min(H - 3, head + Math.ceil((H - head) * 0.45)), host = { x: 5, z: 5, h: ENEMY_DEFS[key].h, w: ENEMY_DEFS[key].w, fy: 0, key };
    const legacy = { 1: Math.min(((Math.ceil(W * 0.32) + 1) / W) * host.w * 1.3, ((armBot - head) / H) * host.h * 1.3), 2: Math.min(((W - (Math.floor(W * 0.68) - 1)) / W) * host.w * 1.3, ((armBot - head) / H) * host.h * 1.3), 3: Math.min(host.w * 1.3, (Math.ceil(H * 0.28) / H) * host.h * 1.3) };
    for (const kind of [1, 2, 3] as const) {
      headPool.heads.length = 0;
      const p = makePart(kind, host, { x: 5, y: 1, z: 5, vx: 0, vy: 0, vz: 0, spin: 0 })! as unknown as { sz: number };
      expect(p.sz, `kind ${kind}'s box`).toBeCloseTo(legacy[kind], 9);
    }
    headPool.heads.length = 0;
    const TEX = await import("../../src/fx/GoreTex");
    expect(TEX.partArt(key, "head") === null, "a monster with no head row has no head to lose").toBe(!HAS_HEAD[key]);
    for (const k of ["lArm", "rArm", "legs"] as const) expect(rigOf(key).all(), `${k} is the rig's own part`).toContain(TEX.partArt(key, k)!.tex);
  });

  it("it costs what the budget says: only its idle frame is baked at boot, the rest on first use and kept", async () => {
    const { rigSprite } = await import("../../src/enemies/rig/sprite");
    const s = rigSprite(RIGS[key]), set = s.rig as unknown as { baked: number };
    expect(set.baked, "the idle, nothing else").toBe(1);
    const w2 = (s as unknown as Record<string, unknown>).walk2;
    expect(set.baked).toBe(2);
    expect((s as unknown as Record<string, unknown>).walk2, "and kept").toBe(w2);
    expect(set.baked).toBe(2);
  });
});

describe("what a monster does that is not `atkAnim`: the hound leaps and the wailer screams, and the attack frames are held across it", () => {
  it("the hound's leap: coil, spring, land over the .4 s after it lunges, then it is a hound that runs again", () => {
    const e = standing("g");
    expect(e.lunge, "it is the lunging one").toBe(true);
    const at = (since: number, name: string): void => { e.lungeT = LUNGE_SECS - since; e.atkAnim = 0; enemyTick(0.0001); expect(map(e), `${since} s into the leap`).toBe(PX.g[name]); };
    at(0.03, "atkWind"); at(0.2, "atkStrike"); at(LUNGE_AIR - 0.03, "atkRecover");
    e.lungeT = LUNGE_SECS - LUNGE_AIR - 0.05; enemyTick(0.0001);
    expect(map(e), "on the ground again").toBe(PX.g.idle);
    const z = standing("z");
    z.lungeT = LUNGE_SECS - 0.2; enemyTick(0.0001);
    expect(map(z), "and a monster that does not lunge ignores the timer").toBe(PX.z.idle);
  });

  it("the wailer's scream: held on the shriek frames while it stands screaming (its stun), gathering, shrieking, slumping", () => {
    const e = standing("s");
    expect(e.scream, "it is the screaming one").toBe(true);
    const at = (elapsed: number, name: string): void => { e.screamT = SCREAM_T; e.stun = SCREAM_STUN - elapsed + 0.0001; e.hurt = 0; enemyTick(0.0001); expect(map(e), `${elapsed} s into the scream`).toBe(PX.s[name]); };
    at(0.05, "atkWind"); at(0.5, "atkStrike"); at(1.05, "atkRecover");
    e.screamT = 4; e.stun = 0.5; enemyTick(0.0001);
    expect(map(e), "a stun that is not a scream is a monster standing").toBe(PX.s.idle);
    const t = standing("t");
    t.screamT = SCREAM_T; t.stun = 0.5; enemyTick(0.0001);
    expect(map(t), "and one that does not scream ignores it").toBe(PX.t.idle);
  });
});
