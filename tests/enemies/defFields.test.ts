// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { ENEMY_DEFS, type EnemyDef } from "../../src/enemies/EnemyDefs";
import type { Enemy } from "../../src/enemies/Enemy";

/**
 * KNOWN-15, CLOSED (owner, 2026-10-21). Ten fields are authored on `ENEMY_DEFS` entries and read by the AI, the damage and
 * the boss code; until this date `spawnEnemy` (`src/world/LevelLoader.ts`) never copied them — the frozen reference never
 * did — so every read saw `undefined` (this file was `defFields.test.ts` and pinned that, on purpose, until a human
 * decided). The owner turned them on: the fliers fly, each ranged monster fires its own orb, the flesh-throwers throw, the
 * Slaughtaur's shield works, the sovereign bosses use their own numbers. This file now holds the opposite: every authoring
 * enemy spawns with its def's value, and the read sites take the branch the def names.
 *
 * The authoring enemies are derived from `ENEMY_DEFS` every run (nothing here is a count to keep up to date), and the first
 * test guards that derivation from being vacuous.
 */

const FIELDS = [
  "orb", "fly", "flyH", "twin", "burst", "charger", "fling", "shield", "sovereign", "title",
] as const satisfies readonly (keyof EnemyDef)[];

/** The `ENEMY_DEFS` keys that author `field` — derived, never hardcoded. */
function authorsOf(field: keyof EnemyDef): string[] {
  return Object.keys(ENEMY_DEFS).filter((k) => ENEMY_DEFS[k][field] !== undefined);
}

const SRC = join(__dirname, "..", "..", "src");

let spawnEnemy: (ch: string, wx: number, wz: number, summoned?: boolean) => Enemy;
let fireOrb: (e: unknown, spreadA: number, tox?: boolean) => void;
let projectiles: { orbs: Array<Record<string, unknown>>; nails: unknown[] };
let player: { px: number; pz: number; pyy: number };

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();

  // Dynamic, after the stubs: LevelLoader -> RenderCore constructs a real
  // THREE.WebGLRenderer against #game at module scope, which a static
  // top-of-file import would run first. Same reason
  // `tests/enemies/enemyShape.test.ts` and
  // `tests/integration/dismembermentThreshold.test.ts` do this.
  const THREE = await import("three");
  const { buildSprites } = await import("../../src/enemies/SpriteBaker");
  const { renderState } = await import("../../src/render/Renderer");
  const { setScene } = await import("../../src/render/SceneRef");
  const { world } = await import("../../src/world/WorldState");

  const scene = new THREE.Scene();
  buildSprites();                 // PX[ch].a — spawnEnemy's sprite texture
  renderState.scene = scene;      // addSprite/addBlob add straight into it
  setScene(scene);
  world.enemies = [];             // spawnEnemy pushes into it
  // world.heightMap stays null, so floorHeightAt() returns 0 without a grid.

  spawnEnemy = (await import("../../src/world/LevelLoader")).spawnEnemy;
  fireOrb = (await import("../../src/enemies/ai/Attacks")).fireOrb;
  projectiles = (await import("../../src/fx/Projectiles")).projectiles as typeof projectiles;
  player = (await import("../../src/player/PlayerState")).player;
});

/**
 * A non-elite enemy of `ch`. `summoned:true` forces `spawnEnemy`'s
 * `elite=!d.boss&&!summoned&&Math.random()<.11` roll to false, so no
 * assertion below can flake on an 11% dice roll — and per
 * `enemyShape.test.ts`, no branch of `spawnEnemy` adds or drops a key, so a
 * summoned enemy has exactly the same field set as a placed one.
 */
function spawn(ch: string, x = 5.5, z = 5.5): Enemy {
  return spawnEnemy(ch, x, z, true);
}

describe("KNOWN-15 closed — the def's behaviours reach the spawned enemy", () => {
  it("guard: each of the ten really is authored on at least one ENEMY_DEFS entry", () => {
    for (const f of FIELDS) expect(authorsOf(f).length, `no ENEMY_DEFS entry authors '${f}'`).toBeGreaterThan(0);
  });

  it("spawnEnemy copies every one — each authoring enemy spawns with its def's value", () => {
    for (const f of FIELDS) {
      for (const ch of authorsOf(f)) {
        const e = spawn(ch) as unknown as Record<string, unknown>;
        expect(e[f], `a '${ch}' spawned without its '${f}'`).toBe(ENEMY_DEFS[ch][f]);
      }
    }
  });

  it("and an enemy that does not author one spawns with it off", () => {
    const z = spawn("z");
    expect(z.fly).toBe(false); expect(z.flyH).toBe(0); expect(z.orb).toBeUndefined(); expect(z.shield).toBe(false);
  });
});

describe("KNOWN-15 closed — what the read sites now do", () => {
  it("a Cacodemon fires its green plasma, from where it hangs in the air", () => {
    expect(ENEMY_DEFS.C.orb).toBe("caco");
    player.px = 5.5; player.pz = 12.5; player.pyy = 1.0;
    const caco = spawn("C");
    projectiles.orbs.length = 0;
    fireOrb(caco, 0);
    expect(projectiles.orbs.length).toBe(1);
    const orb = projectiles.orbs[0] as { col: number; dmg: number; m: { position: { y: number } } };
    expect(orb.col).toBe(0x5a8a3a);
    expect(orb.dmg).toBe(16);
    expect(orb.m.position.y).toBeCloseTo(1.7, 6);   // its hover height over floor 0 (src/enemies/Hover.ts)
  });

  it("the boss bar reads the spawned boss's own title", () => {
    const boss = spawn("E");
    expect(boss.title).toBe("warden of the dungeon");
    const bossSrc = readFileSync(join(SRC, "enemies", "Boss.ts"), "utf8");
    expect(/e\.title\s*\|\|\s*EDEF\[e\.key\]\.title/.test(bossSrc)).toBe(true);
  });
});
