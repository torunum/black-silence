import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type { Enemy } from "../../src/enemies/Enemy";
import { RIGS } from "../../src/enemies/rig";
import { renderBitmap, rolePose, roleCount, renderPart, type Bitmap } from "../../src/enemies/rig/bake";
import { HEAD, L_ARM, LEGS, R_ARM, drawFigure, type Rig, type Role } from "../../src/enemies/rig/kit";
import { ATK_LEN, ATK_SPLIT, DEATH_AT } from "../../src/enemies/rig/timing";
import { HURT_LEN } from "../../src/enemies/HitReact";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";
import { PXDEF } from "../../src/enemies/pixels";
import { Builder } from "../../src/render/viewmodel/builder";
import { Raster, finish } from "../../src/render/viewmodel/raster";
import { E } from "../../src/enemies/rig/palette";

/**
 * THE RIG SUITE: what every rigged monster is held to (`gruntRigs.test.ts`, the common grunts; `rosterRigs.test.ts`, the
 * monsters and the bosses redrawn after them). `keys` are the monsters; `o.head` says which have a head row, `o.fill` how much of
 * the legacy sprite's fill each must keep (a thin body in a shroud less, a barrel nearly all), `o.width` how much of its width
 * (0.85 unless said: the blocky legacy bosses filled their whole box). It returns the in-game helpers a file's own tests use.
 */


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

export interface SuiteOpts {
  head: Record<string, boolean>; fill: Record<string, number>; width?: Record<string, number>; boss?: Record<string, boolean>;
  /** A priest boss's second form, by its key, naming its first (`Q2: "Q"`): it is never spawned, only worn (`formKey`). */
  form?: Record<string, string>;
}
export interface SuiteHelpers { standing(key: string): Enemy; map(e: Enemy): unknown; px(): Record<string, Record<string, unknown>>; tick(dt: number): boolean }

export function rigSuite(keys: readonly string[], o: SuiteOpts): SuiteHelpers {
  describe.each(keys)("%s: the rig", (key) => {
    const rig = RIGS[key], f = rig.frame, of = o.form?.[key];
    // a boss's second form has no def of its own: its sprite is its first form's, grown as `Boss.ts` grows it (w x1.35, h x1.15)
    const def = of ? { w: ENEMY_DEFS[of].w * 1.35, h: ENEMY_DEFS[of].h * 1.15 } : ENEMY_DEFS[key];

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
        expect(n.width, `${role}${i} is as wide as the old art (${old.width.toFixed(2)})`).toBeGreaterThan(old.width * (o.width?.[key] ?? 0.85));
        expect(n.fill, `${role}${i} fills its frame (${old.fill.toFixed(2)})`).toBeGreaterThan(old.fill * o.fill[key]);
        expect(n.lum, `${role}${i} is as bright (${old.lum.toFixed(0)})`).toBeGreaterThan(old.lum * 0.95);
        expect(n.punch, `${role}${i} has its saturated accents (${(old.punch * 100).toFixed(1)}%)`).toBeGreaterThan(old.punch * 0.2);
      }
    });
  });

  describe.each(keys.filter((k) => o.head[k]))("%s: its head is the head the hit test counts", (key) => {
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

  describe.each(keys)("%s: its parts are real", (key) => {
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
    const cases = [["left arm", L_ARM, "lArm"], ["right arm", R_ARM, "rArm"], ["legs", LEGS, "legs"], ...(o.head[key] ? [["head", HEAD, "head"]] : [])] as Array<[string, number, "head" | "lArm" | "rArm" | "legs"]>;

    // a boss is never torn apart (`Damage.ts`), so its stumps are never seen: the bosses are held to everything else
    if (!o.boss?.[key] && !o.form?.[key]) it.each(cases)("without its %s the part is gone and wet meat is at its joint", (_n, mask, group) => {
      const m = frame(rig, "idle", 0, mask), region = only(group);
      expect(OPAQUE(region), "the part covers something").toBeGreaterThan(60);
      expect(DIFF(m, whole), "the figure is different").toBeGreaterThan(100);
      expect(within(m, region), "the part is gone from where it was (a stump is a stub, not the limb)").toBeLessThan(within(whole, region) * 0.97);
      expect(changed(m, whole, region), "what the part covered is something else now").toBeGreaterThan(OPAQUE(region) * 0.3);
      expect(ofMaterial(rig, m, E.MEAT), "wet meat where it was torn").toBeGreaterThan(ofMaterial(rig, whole, E.MEAT) + 6);
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
      expect(ofMaterial(rig, c, E.MEAT), "meat at the hips").toBeGreaterThan(4);
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
  const standing = (key: string): Enemy => { const e = spawnEnemy(key, 5, 30, true); e.cool = 9999; e.plate = 0; e.dormant = false; return e; };   // a boss is awake (no cinematic)
  const map = (e: Enemy): unknown => e.sp.material.map;

  describe.each(keys.filter((k) => !o.form?.[k]))("%s: the game selects its frames", (key) => {
    it("PX is the rig's, with its legacy roles and its new ones all textures, and a headless frame only where there is a head", () => {
      const P = PX[key];
      expect(P.rig).toBeTruthy();
      for (const k of ["a", "b", "atk", "die1", "die2", "hl", "hlb", "noLArm", "noLArmB", "noRArm", "noRArmB", "noLegs", "noLegsB", "gibbed", "gibbedB",
        "idle", "walk0", "walk1", "walk2", "walk3", "walk4", "walk5", "atkWind", "atkStrike", "atkRecover", "pain0", "pain1", "death0", "death1", "death2", "death3", "death4"]) {
        expect((P[k] as { isTexture?: boolean }).isTexture, k).toBe(true);
      }
      expect(P.atk).toBe(P.atkStrike);
      expect(P.a, "spawns standing").toBe(P.idle);
      expect(P.noHead === null, "no head row, no headless frame (the legacy art has none)").toBe(!o.head[key]);
      expect((P.head as number) > 0, "and Hitscan's head test (PX.head > 0) is what it was").toBe(o.head[key]);
      expect(P.head, "equal to the legacy row's").toBe(o.head[key] ? RIGS[key].regions.head : 0);
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

    if (o.boss?.[key]) it("a boss is not torn apart: a big hit to a limb or its head takes nothing off (Damage.ts), and it dies whole", () => {
      const e = standing(key);
      e.hp = 9000; e.maxhp = 9000;
      damageEnemy(e, 40, { arm: true, armSide: "L", wIdx: 1, dir: { x: 1, z: 0 } });
      damageEnemy(e, 40, { leg: true, wIdx: 1, dir: { x: 1, z: 0 } });
      expect(e.sever, "nothing severed").toBeUndefined();
      const h = standing(key);
      damageEnemy(h, h.hp + 6, { head: true, wIdx: 0, dir: { x: 1, z: 0 } });
      expect(h.deathKind, "a boss's death is its own (bossDeath): never a beheading").toBe(1);
    });

    if (!o.boss?.[key]) it("a torn-off arm is a walking monster without it; the legs gone, it crawls (with the arm still off)", () => {
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

    if (o.head[key] && !o.boss?.[key]) it("a beheaded body stands, headless, for .28 s and then falls headless", () => {
      const h = standing(key);
      damageEnemy(h, h.hp + 6, { head: true, wIdx: 0, dir: { x: 1, z: 0 } });
      expect(h.deathKind).toBe(2);
      enemyTick(0.05);
      expect(map(h), "on its feet, headless").toBe(rigOf(key).tex("idle", 0, HEAD));
      for (let i = 0; i < 100; i++) enemyTick(0.01);
      expect(map(h), "then down, headless").toBe(rigOf(key).tex("die", 4, HEAD, h.deathDir < 0));
    });

    if (!o.head[key] && !o.boss?.[key]) it("a shot at its top is not a head hit: no beheading, the body dies whole", () => {
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
      expect(TEX.partArt(key, "head") === null, "a monster with no head row has no head to lose").toBe(!o.head[key]);
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


  return { standing, map, px: () => PX, tick: (dt) => enemyTick(dt) };
}
