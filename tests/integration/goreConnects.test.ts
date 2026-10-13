// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { input } from "../../src/player/Input";
import { renderState } from "../../src/render/Renderer";
import { EYE } from "../../src/world/Grid";
import { floorHeightAt } from "../../src/world/Collision";
import { S } from "../../src/core/State";
import { watchRandom } from "../support/randomWatch";
import { STUMBLE_DIST } from "../../src/enemies/Corpse";

/**
 * DECAPITATION, DISMEMBERMENT AND OVERKILL, THROUGH THE REAL GAME (impact plan,
 * Task 3). The units (tests/fx/goreTex, splats, goreChunks, goreDrops, spurt,
 * parts; tests/enemies/corpse) hold each pool; this holds that a real shot at a
 * real zombie, through the real `hitscan`, `damageEnemy` and `killEnemy`,
 * throws all of it, on a floor of 0, 1.2 and 4.2: the head with a wet neck and
 * a trail, the neck pumping and the body staggering a step before it falls,
 * blood on the nearest wall and the floor; an arm torn off and flying while the
 * stump pumps, the monster walking on missing it; the legs gone and the monster
 * crawling; an overkill bursting into meat, bone and organs with its head and
 * limbs flying; and every pool holding its cap.
 */

let hitscan: (dir: THREE.Vector3, dmg: number, wIdx: number) => void;
let loadLevel: (i: number) => void;
let enemyTick: (dt: number) => number | undefined | boolean;
let headTick: (dt: number) => void, gibTick: (dt: number) => void, partTick: (dt: number) => void, goreTick: (dt: number) => void;
let buildParticles: () => void, resetGibs: () => void, resetDecals: () => void;
let headPool: { heads: Array<Record<string, unknown>> };
let G: typeof import("../../src/fx/GoreFx");
let CH: typeof import("../../src/fx/GoreChunks");
let SP: typeof import("../../src/fx/Splats");
let DR: typeof import("../../src/fx/GoreDrops");
let SPURT: typeof import("../../src/fx/Spurt");
let PARTS: typeof import("../../src/fx/Parts");
let TEX: typeof import("../../src/fx/GoreTex");
let PX: Record<string, Record<string, unknown> & { regions: { H: number } }>;
let crawlFactor: (key: string) => number;

type Foe = {
  key: string; x: number; z: number; h: number; w: number; fy: number; hp: number; dormant: boolean; dead: boolean; gone: boolean; deathKind: number; deathT: number;
  sever?: { lArm?: boolean; rArm?: boolean; legs?: boolean }; severKey?: string; sp: THREE.Sprite; blob: THREE.Mesh; kx: number; kz: number; speed: number; cool: number; aware: boolean;
  alertX: number; alertZ: number; stun: number; slow: number; elite: boolean; maxhp: number; hurt: number; wasAtk?: boolean; atkAnim?: number;
};
type Part = { kind: number; x: number; y: number; z: number; vx: number; vy: number; rest: boolean; sz: number; sp: THREE.Sprite };

const N = 24;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ hitscan } = await import("../../src/weapons/Hitscan"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ headTick } = await import("../../src/enemies/Death") as never);
  ({ gibTick, resetGibs } = await import("../../src/fx/Gibs"));
  ({ partTick, buildParticles } = await import("../../src/fx/Particles") as never);
  ({ resetDecals } = await import("../../src/fx/Decals"));
  ({ headPool } = await import("../../src/fx/Heads"));
  ({ enemyTick } = await import("../../src/enemies/ai/Behaviors") as never);
  G = await import("../../src/fx/GoreFx"); goreTick = G.goreTick;
  CH = await import("../../src/fx/GoreChunks");
  SP = await import("../../src/fx/Splats");
  DR = await import("../../src/fx/GoreDrops");
  SPURT = await import("../../src/fx/Spurt");
  PARTS = await import("../../src/fx/Parts");
  TEX = await import("../../src/fx/GoreTex");
  ({ crawlFactor } = await import("../../src/enemies/Sever") as never);
  PX = (await import("../../src/enemies/SpriteBaker")).PX as never;
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

/** Loads level 1 and lays an open arena over it (floor `floorAt`, a wall column where `wallAt` says), one zombie alone at its middle, the gore pools fresh. */
function arena(floorAt: (gx: number, gz: number) => number, wallAt: (gx: number, gz: number) => boolean = () => false): Foe {
  loadLevel(1);
  world.grid = Array.from({ length: N }, (_, gz) => Array.from({ length: N }, (_, gx) => (wallAt(gx, gz) ? "#" : ".")));
  world.GW = N; world.GH = N;
  world.heightMap = Array.from({ length: N }, (_, gz) => Array.from({ length: N }, (_, gx) => floorAt(gx, gz)));
  world.ceilMap = null;
  world.masses.clear(); world.doors = {}; world.wallSegs = []; world.props = [];
  resetGibs(); resetDecals(); buildParticles(); headPool.heads.length = 0;
  S.beheads = 0;
  const foes = world.enemies as unknown as Foe[];
  const z = foes.find((e) => e.key === "z" && !e.elite)!;
  for (const o of foes) if (o !== z) { o.dead = true; o.gone = true; }
  z.x = 25; z.z = 25; z.fy = floorHeightAt(z.x, z.z); z.dormant = false; z.hp = 50; z.maxhp = 50; z.dead = false; z.gone = false; z.sever = {}; z.severKey = undefined; z.deathKind = 0; z.deathT = 0;
  z.kx = 0; z.kz = 0; z.speed = 0.0001; z.cool = 9999; z.aware = false; z.stun = 0; z.slow = 1; z.hurt = 0;
  z.sp.visible = true; z.sp.material.rotation = 0; z.sp.material.color.setHex(0xffffff);
  return z;
}
const flat = (fy: number) => () => fy;
const scene = (): THREE.Scene => renderState.scene as THREE.Scene;
const parts = (): Part[] => headPool.heads as unknown as Part[];

/** One frame of the world the gore lives in: bodies, parts, drops, chunks, decals, the game's own gibs and particles. */
function frames(n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) { enemyTick(dt); headTick(dt); gibTick(dt); partTick(dt); goreTick(dt); }
}
/** The player 4 units west of the zombie on its floor, facing it; fires the pistol at a point `up` of its height and `side` of its width from the centre. */
function shoot(e: Foe, up: number, side: number, dmg: number, wIdx = 0, dist = 4): void {
  player.px = e.x - dist; player.pz = e.z; player.pyy = EYE + e.fy; player.spawnGuard = 99;
  renderState.camera.position.set(player.px, player.pyy, player.pz);
  input.yaw = -Math.PI / 2;   // facing +x
  const target = new THREE.Vector3(e.x, e.fy + e.h * (0.5 + up), e.z + side * e.w * 0.5);
  hitscan(target.sub(renderState.camera.position).normalize(), dmg, wIdx);
}
/** Draws on Math.random pinned, so the game's own rolls (a bounce's blood, an elite) are the same each time. */
const wallDecals = (): number => {
  const blobs = SP.splatMeshes().blobs;
  if (!blobs) return 0;
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < SP.splatStats().blobs; i++) { blobs.getMatrixAt(i, m); m.decompose(p, q, s); if (Math.abs(new THREE.Vector3(0, 0, 1).applyQuaternion(q).y) < 0.5) n++; }
  return n;
};

describe.each([0, 1.2, 4.2])("on a floor of %s", (fy) => {
  describe("a decapitation", () => {
    it("takes the head off with its own face and a wet neck, throws it off the neck of the body on this floor, and it lands and lies on the floor", () => {
      const z = arena(flat(fy));
      shoot(z, 0.38, 0, 30);   // 30 x2 on 50 hp: dead, not gibbed
      expect(z.dead && !z.gone, "dead, not gibbed").toBe(true);
      expect(z.deathKind, "and headless").toBe(2);
      expect(S.beheads).toBe(1);
      const heads = parts().filter((p) => p.kind === 0);
      expect(heads, "one head").toHaveLength(1);
      const h = heads[0];
      expect(h.y, "from the neck").toBeGreaterThan(fy + z.h * 0.8);
      const art = TEX.partArt("z", "head")!;
      expect((h.sp.material as THREE.SpriteMaterial).map, "the zombie's own head, not the whole body shrunk").toBe(art.tex);
      expect((h.sp.material as THREE.SpriteMaterial).map).not.toBe(PX.z.a);
      player.px = 1; player.pz = 1;
      frames(60 * 12);
      expect(h.rest).toBe(true);
      expect(h.y, "on the floor").toBeCloseTo(fy + h.sz * 0.5, 5);
    });

    it("pumps its neck: pulses of spray for about three seconds, a fountain first and a dribble after", () => {
      const z = arena(flat(fy));
      shoot(z, 0.38, 0, 30);
      expect(SPURT.spurtCount(), "a neck").toBe(1);
      player.px = 1; player.pz = 1;
      const jumps: number[] = [];
      let prev = DR.dropStats().drops;
      for (let i = 0; i < 60 * 3.2; i++) { frames(1); const n = DR.dropStats().drops; if (n - prev >= 5) jumps.push(n - prev); prev = n; }
      expect(jumps.length, "pulses").toBeGreaterThanOrEqual(5);
      expect(jumps[0]).toBeGreaterThan(jumps[jumps.length - 1]);
      expect(SPURT.spurtCount(), "and it runs dry").toBe(0);
    });

    it("staggers a step before it falls: on its feet for .28 s and swaying, then down by .7 s, and a step further along the shot than a plain kill", () => {
      const plain = arena(flat(fy));
      shoot(plain, -0.1, 0, plain.hp);   // a body shot that kills, no more: the game's own knock, with no neck to stumble from
      expect(plain.deathKind).toBe(1);
      const plainKx = plain.kx;
      const z = arena(flat(fy));
      shoot(z, 0.38, 0, 30);
      expect(z.deathKind).toBe(2);
      expect(z.kx, "the body's knock is the game's own and nothing more: the stumble is the sprite's, not another 1.4 on the body's velocity").toBeCloseTo(plainKx, 0);
      player.px = 1; player.pz = 1;
      const x0 = z.x;
      frames(15);   // .25 s
      expect(Math.abs(z.sp.material.rotation), "still up, swaying").toBeLessThan(0.14);
      expect(z.sp.position.y, "on its feet").toBeGreaterThan(fy + z.h * 0.4);
      frames(45);   // 1 s
      expect(Math.abs(z.sp.material.rotation), "down").toBeCloseTo(Math.PI / 2, 1);
      expect(z.sp.position.y).toBeCloseTo(fy + z.h * 0.18, 1);
      expect(z.sp.position.x - x0, "knocked back along the shot (+x), and then a step further, the sprite's own: STUMBLE_DIST").toBeGreaterThan(0.7 + STUMBLE_DIST * 0.95);
      expect(z.sp.position.x - z.x, "the sprite is ahead of the body by the whole stumble once it has stopped").toBeCloseTo(STUMBLE_DIST, 2);
      expect(z.blob.position.x, "and its shadow goes with it").toBeCloseTo(z.sp.position.x, 6);
    });

    it("blood on the floor under it at once, and on the nearest wall the shot was heading for", () => {
      const z = arena(flat(fy));
      shoot(z, 0.38, 0, 30);
      const floorOnly = SP.splatStats().blobs;
      expect(floorOnly, "pools under and beyond the body").toBeGreaterThanOrEqual(3);
      expect(wallDecals(), "no wall within reach").toBe(0);
      const w = arena(flat(fy), (gx) => gx === 15);   // a wall at x 30..32: 5 from the body, along the shot
      shoot(w, 0.38, 0, 30);
      expect(wallDecals(), "a main splat, its spray and its drips on the wall").toBeGreaterThanOrEqual(6);
      expect(SP.splatStats().streaks, "drips running down it").toBeGreaterThanOrEqual(1);
    });
  });

  describe("an arm torn off", () => {
    it("flies as a part with a trail, lands on the floor and lies, while the shoulder pumps and the monster walks on without it", () => {
      const z = arena(flat(fy));
      z.hp = 100; z.maxhp = 100;
      shoot(z, 0, 0.8, 34);
      const s = z.sever!;
      expect(Boolean(s.lArm || s.rArm), "an arm is off").toBe(true);
      expect(z.dead).toBe(false);
      const arms = parts().filter((p) => p.kind === 1 || p.kind === 2);
      expect(arms, "the arm").toHaveLength(1);
      const a = arms[0];
      expect(a.y, "from the shoulder").toBeGreaterThan(fy + z.h * 0.4);
      expect(a.vx, "along the shot").toBeGreaterThan(2);
      expect(SPURT.spurtCount(), "the stump").toBe(1);
      const armTex = (a.sp.material as THREE.SpriteMaterial).map;
      expect(armTex).toBe(TEX.partArt("z", s.lArm ? "lArm" : "rArm")!.tex);
      // it walks on: toward a player 12 units off, for a second and a half
      player.px = z.x - 12; player.pz = z.z; player.pyy = EYE + fy; z.speed = 3; z.cool = 0; z.aware = true; z.alertX = player.px; z.alertZ = player.pz; z.stun = 0; z.hurt = 0; z.atkAnim = 0;   // (a monster only runs its walk cycle once it has attacked: atkAnim is undefined until then)
      const want = s.lArm ? [PX.z.noLArm, PX.z.noLArmB] : [PX.z.noRArm, PX.z.noRArmB];
      const seen = new Set<unknown>();
      for (let i = 0; i < 90; i++) { frames(1); seen.add((z.sp.material as THREE.SpriteMaterial).map); }
      expect(seen.has(PX.z.a) || seen.has(PX.z.b), "never whole again").toBe(false);
      expect([...seen].every((t) => want.includes(t as never)), "armless frames only").toBe(true);
      expect(seen.size, "it still walks: both frames").toBe(2);
      frames(60 * 6);
      expect(a.rest).toBe(true);
      expect(a.y).toBeCloseTo(fy + a.sz * 0.5, 5);
      expect(SPURT.spurtCount(), "dry").toBe(0);
    });
  });

  describe("the legs torn off", () => {
    it("the legs fly, the hip pumps, and the monster drops to a crawl on a sprite and a hitbox of its own, dragging a smear", () => {
      const z = arena(flat(fy));
      z.hp = 100; z.maxhp = 100;
      const h0 = z.h;
      shoot(z, -0.4, 0, 34);
      expect(z.sever!.legs, "legs off").toBe(true);
      expect(z.dead).toBe(false);
      const legs = parts().filter((p) => p.kind === 3);
      expect(legs, "the legs").toHaveLength(1);
      expect(SPURT.spurtCount(), "the hip").toBe(1);
      expect(z.h, "shorter: the hitbox is the visible body").toBeCloseTo(h0 * crawlFactor("z"), 9);
      expect(z.sp.scale.y, "and so is the sprite").toBeCloseTo(h0 * crawlFactor("z"), 9);
      expect((z.sp.material as THREE.SpriteMaterial).map, "on the crawler's own sprite").toBe(TEX.crawlArt("z", false, false, false)!.tex);
      player.px = z.x - 12; player.pz = z.z; player.pyy = EYE + fy; z.speed = 3; z.cool = 0; z.aware = true; z.alertX = player.px; z.alertZ = player.pz; z.stun = 0; z.hurt = 0; z.slow = 1; z.atkAnim = 0;
      const streaks0 = SP.splatStats().streaks;
      const crawl = TEX.crawlArt("z", false, false, false)!;
      const seen = new Set<unknown>();
      let x0 = z.x;
      for (let i = 0; i < 150; i++) { frames(1); seen.add((z.sp.material as THREE.SpriteMaterial).map); }
      expect(seen.has(PX.z.a) || seen.has(PX.z.b), "never whole again").toBe(false);
      expect([...seen].every((t) => t === crawl.tex || t === crawl.texB), "the crawler's frames only").toBe(true);
      expect(seen.size, "and it walks: both").toBe(2);
      expect(z.sp.position.y, "on the floor it stands on, by its own height").toBeCloseTo(fy + z.h / 2, 1);
      expect(z.x - x0, "it crawled toward the player").toBeLessThan(-0.5);
      expect(SP.splatStats().streaks - streaks0, "a smear every thirty-odd frames").toBeGreaterThanOrEqual(3);
    });

    it("a crawler's head shot is a head shot: the head is where the sprite shows it, and the air above it is air", () => {
      const z = arena(flat(fy));
      z.hp = 400; z.maxhp = 400;
      shoot(z, -0.4, 0, 34);   // the legs
      const hp0 = z.hp;
      shoot(z, 0.3, 0, 20);   // 20 at the top of the (shorter) body: its head, doubled
      expect(hp0 - z.hp, "doubled").toBeCloseTo(40, 6);
      const hp1 = z.hp;
      shoot(z, 0.62, 0, 20);   // over its head, where the old hitbox stood: nothing there
      expect(z.hp, "a miss").toBe(hp1);
    });

    it("a legless body that loses its head loses it from the crawler's sprite", () => {
      const z = arena(flat(fy));
      z.hp = 100; z.maxhp = 100;
      shoot(z, -0.4, 0, 34);
      z.hp = 30;
      shoot(z, 0.3, 0, 20);   // 40 on a head: dead, not by 22 past it
      expect(z.dead && !z.gone).toBe(true);
      expect(z.deathKind).toBe(2);
      expect((z.sp.material as THREE.SpriteMaterial).map).toBe(TEX.crawlArt("z", false, false, true)!.tex);
      expect(parts().filter((p) => p.kind === 0), "its head flies").toHaveLength(1);
    });
  });

  describe("an overkill", () => {
    it("bursts the body into meat, bone and organs, its head and limbs come off whole and fly, mist and blood everywhere, all of it landing on this floor", () => {
      const z = arena(flat(fy));
      z.hp = 20; z.maxhp = 20;
      for (let i = 0; i < 4; i++) shoot(z, 0, 0, 9, 1, 3);   // four shotgun pellets at three units: dead and gibbed
      expect(z.dead && z.gone, "gibbed").toBe(true);
      expect(S.gibs).toBeGreaterThan(0);
      const st = CH.chunkStats();
      expect(st.used, "meat, bone and organs").toBeGreaterThanOrEqual(28);
      for (let i = 0; i < 28; i++) { const c = CH.chunkAt(i); expect(c.y, "thrown from the body on this floor").toBeGreaterThan(fy + 0.3); }
      const ps = parts();
      expect(new Set(ps.map((p) => p.kind)).size, "head, both arms and the legs").toBe(4);
      expect(DR.dropStats().drops, "a burst of gouts").toBeGreaterThanOrEqual(40);
      expect(DR.dropStats().mist, "and a haze").toBeGreaterThanOrEqual(8);
      expect(SP.splatStats().blobs, "pools on the floor").toBeGreaterThanOrEqual(4);
      player.px = 1; player.pz = 1;
      frames(60 * 10);
      const after = CH.chunkStats();
      expect(after.flying).toBe(0);
      for (let i = 0; i < 40; i++) { const c = CH.chunkAt(i); if (c.state === 2) { expect(c.y).toBeGreaterThanOrEqual(fy); expect(c.y).toBeLessThan(fy + 0.25); } }
      for (const p of ps) { expect(p.rest, `kind ${p.kind} at rest`).toBe(true); expect(p.y).toBeCloseTo(fy + p.sz * 0.5, 5); }
    });

    it("splatters every wall within five metres, not just the one in front", () => {
      const z = arena(flat(fy), (gx, gz) => gx === 15 || gz === 14);   // a wall to the east (x 30), one to the south (z 28)
      z.hp = 20; z.maxhp = 20;
      for (let i = 0; i < 4; i++) shoot(z, 0, 0, 9, 1, 3);
      expect(z.gone).toBe(true);
      expect(wallDecals(), "walls on two sides").toBeGreaterThanOrEqual(12);
    });
  });
});

describe("the game's dice", () => {
  it("a falling drop of the plan's blood (particle kind 4) lands, pools and splats without a single draw from Math.random", async () => {
    arena(flat(0));
    const { spawnP } = await import("../../src/fx/Particles");
    for (let i = 0; i < 400; i++) spawnP(10 + (i % 20) * 0.3, 1.2, 10 + Math.floor(i / 20) * 0.3, 0, 0, 0, 0.6, 0.02, 0.02, 3, 4);
    const w = watchRandom();
    const before = SP.splatStats().blobs;
    frames(30);
    w.stop();
    expect(SP.splatStats().blobs, "some of them left a stain (about one in seven)").toBeGreaterThan(before);
    expect(w.draws(), "and none rolled the game's dice for it (`addPool` jitters its height with Math.random)").toBe(0);
  });
});

describe("the budgets hold", () => {
  it("forty bodies burst in a row: no pool passes its cap, and the scene gains no child past the first few sprites", () => {
    const z = arena(flat(0));
    const partSprites = new Set<unknown>();
    const kill = (): void => { z.hp = 20; z.maxhp = 20; z.dead = false; z.gone = false; z.sever = {}; z.deathKind = 0; z.sp.visible = true; for (let i = 0; i < 4; i++) shoot(z, 0, 0, 9, 1, 3); };
    let childrenAfterWarm = 0;
    for (let i = 0; i < 40; i++) {
      kill();
      frames(20);
      for (const p of parts()) partSprites.add(p.sp);
      if (i === 8) childrenAfterWarm = scene().children.length;
    }
    expect(CH.chunkStats().used).toBeLessThanOrEqual(CH.CHUNK_MAX);
    expect(CH.chunkStats().used, "and the pool is full").toBe(CH.CHUNK_MAX);
    expect(parts().length).toBeLessThanOrEqual(PARTS.PART_MAX);
    expect(SP.splatStats().blobs).toBeLessThanOrEqual(SP.BLOB_MAX);
    expect(SP.splatStats().streaks).toBeLessThanOrEqual(SP.STREAK_MAX);
    expect(DR.dropStats().drops).toBeLessThanOrEqual(DR.DROP_MAX);
    expect(DR.dropStats().mist).toBeLessThanOrEqual(DR.MIST_MAX);
    expect(SPURT.spurtCount()).toBeLessThanOrEqual(SPURT.SPURT_MAX);
    // the scene: the gore is five children, the parts are sprites up to PART_MAX, and the game's own gibs and pools (capped at 110 and 150) come and go
    expect(partSprites.size, "every part wore one of at most PART_MAX sprites, ever").toBeLessThanOrEqual(PARTS.PART_MAX);
    expect(scene().children.length, "nothing but the game's own capped pools still grows").toBeLessThanOrEqual(childrenAfterWarm + 110 + 150);
    expect(scene().children.filter((o) => o.name === "goreSplats" || o.name === "goreChunks" || o.name === "goreDrops" || o.name === "goreMist")).toHaveLength(5);
  });

  it("a long fight allocates nothing per frame: the pools' own buffers and instance lists are the ones they started with", () => {
    const z = arena(flat(0));
    const chunkMesh = CH.chunkStats().mesh!, blobMesh = SP.splatMeshes().blobs!;
    const arrays = [DR.dropStats().dropPoints!.geometry.attributes.position.array, chunkMesh.instanceMatrix.array, blobMesh.instanceMatrix.array];
    for (let i = 0; i < 6; i++) { z.hp = 20; z.maxhp = 20; z.dead = false; z.gone = false; z.sever = {}; z.deathKind = 0; z.sp.visible = true; for (let k = 0; k < 4; k++) shoot(z, 0, 0, 9, 1, 3); frames(240); }
    expect(CH.chunkStats().mesh).toBe(chunkMesh);
    expect(SP.splatMeshes().blobs).toBe(blobMesh);
    expect(DR.dropStats().dropPoints!.geometry.attributes.position.array).toBe(arrays[0]);
    expect(chunkMesh.instanceMatrix.array).toBe(arrays[1]);
    expect(blobMesh.instanceMatrix.array).toBe(arrays[2]);
  });
});
