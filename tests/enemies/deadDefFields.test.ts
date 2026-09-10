// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { ENEMY_DEFS, type EnemyDef } from "../../src/enemies/EnemyDefs";
import type { Enemy } from "../../src/enemies/Enemy";

/**
 * ================== KNOWN-15 — DO NOT "FIX" THIS FILE ==================
 *
 * Every assertion below asserts a **bug**, on purpose, and a green run here
 * means the bug is still exactly as broken as it was when it was found.
 *
 * Ten fields are authored on `ENEMY_DEFS` entries (`src/enemies/EnemyDefs.ts`)
 * and read by the AI, damage and boss code — but `spawnEnemy`'s object
 * literal (`src/world/LevelLoader.ts`) **never copies them onto the spawned
 * enemy**. No spread, no assignment by name, and no `e.<field> =` anywhere
 * in `src/` (the third test below proves that last part rather than
 * asserting it). So every read of them at runtime sees `undefined`, on
 * every enemy, always:
 *
 *   - no enemy fires the projectile its `orb` names — every ranged attack in
 *     the game shoots the same default purple bolt (proven below),
 *   - the five flying enemies do not fly,
 *   - the Mancubus's second barrel, the Afrit's spread and the Lost Soul's
 *     charge never trigger,
 *   - the Ghoul/Thrall/Ettin/Living Heart never throw flesh,
 *   - the Slaughtaur's shield absorbs nothing,
 *   - the five sovereign bosses use the non-sovereign stat block.
 *
 * `reference/sonsurum.html` does exactly the same thing, so this is faithful
 * port behavior and **not drift**.
 *
 * **Why a test that pins a bug, rather than a fix.** Turning ten behaviors
 * on at once is a combat-balance change: five enemies start flying, seven
 * start firing differently-coloured projectiles at different damage and
 * speed, and five bosses get a different stat block — all at the same
 * moment, in a game this environment cannot render (`requestAnimationFrame`
 * never fires in the browser pane; see `docs/STATUS.md`'s Environment
 * gotchas). That needs a human at the game, and it is owned by the Phase 3
 * roster work. This file exists so that when someone does it, it is a
 * **deliberate, visible act** — these tests go red and have to be rewritten
 * on purpose — instead of a one-line spread in `spawnEnemy` that nobody
 * notices until the game plays differently.
 *
 * So: **do not make `spawnEnemy` copy these fields, do not delete the read
 * sites, and do not "repair" the assertions below.** See KNOWN-15 in
 * `docs/known-issues.md`.
 *
 * ---
 *
 * Nothing here hardcodes a count. The authoring enemies for each field are
 * derived from `ENEMY_DEFS` itself, every time the test runs, and the loop
 * spawns *every* enemy that authors the field rather than a representative
 * one. That is deliberate: this project has been bitten four times by a
 * number in a comment or a test that nobody re-derived (see `docs/STATUS.md`,
 * Plan 0F, and KNOWN-12 for the worst of them) — and while writing this very
 * task, three separate written counts for these fields turned out to be
 * wrong. A count that lives in a test is a number someone has to remember to
 * bump. The derivation is self-maintaining: add a `fly` to a new def and the
 * new def is spawned and checked, with nothing to update here.
 *
 * The only guard against the derivation being *vacuous* is the first test,
 * which asserts each field is authored somewhere at all — without it, a
 * typo'd field name would make the main loop iterate over an empty list and
 * pass while proving nothing. That is the "coverage that is present but not
 * real" trap `docs/known-issues.md` KNOWN-6 warns about.
 */

/**
 * The ten. Nine are combat behaviors; `title` is the tenth, with the
 * identical gap but a harmless consequence — see its own test below.
 *
 * Typed `keyof EnemyDef` so a rename of any of them in `EnemyDefs.ts` is a
 * compile error here, not a silently-empty author list at runtime.
 */
const DEAD_FIELDS = [
  "orb", "fly", "flyH", "twin", "burst", "charger", "fling", "shield", "sovereign", "title",
] as const satisfies readonly (keyof EnemyDef)[];

/** The `ENEMY_DEFS` keys that author `field` — derived, never hardcoded. */
function authorsOf(field: keyof EnemyDef): string[] {
  return Object.keys(ENEMY_DEFS).filter((k) => ENEMY_DEFS[k][field] !== undefined);
}

const SRC = join(__dirname, "..", "..", "src");

/** Every `.ts` file under `src/`, recursively. */
function srcFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? srcFiles(p) : p.endsWith(".ts") ? [p] : [];
  });
}

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

describe("KNOWN-15 — ten ENEMY_DEFS fields are authored, read, and never delivered", () => {
  it("guard: each of the ten really is authored on at least one ENEMY_DEFS entry", () => {
    // Without this, a typo in DEAD_FIELDS would make the next test loop over
    // nothing and pass while proving nothing at all.
    for (const f of DEAD_FIELDS) {
      expect(authorsOf(f).length, `no ENEMY_DEFS entry authors '${f}' — is DEAD_FIELDS stale?`).toBeGreaterThan(0);
    }
    expect(Object.keys(ENEMY_DEFS).length).toBeGreaterThan(0);
  });

  it("spawnEnemy copies none of them — every authoring enemy spawns without the field", () => {
    for (const f of DEAD_FIELDS) {
      for (const ch of authorsOf(f)) {
        const e = spawn(ch) as unknown as Record<string, unknown>;
        // `in`, not just `=== undefined`: the field is not merely unset, it
        // is not an own key of the spawned object at all. That is what
        // `enemyShape.test.ts` pins from the other side, and it is why these
        // ten are declared optional on `Enemy`.
        expect(f in e, `spawnEnemy copied '${f}' onto a '${ch}' — KNOWN-15 has been fixed; see this file's header`).toBe(false);
        expect(e[f]).toBeUndefined();
      }
    }
  });

  it("nothing in src/ writes them after spawn either, so the reads see undefined forever", () => {
    // The gap is not "absent at spawn, filled in later". Nothing ever fills
    // them in. A source scan is the only way to state that, the same
    // technique `tests/content/achievements.test.ts` and
    // `tests/enemies/enemyShape.test.ts` use to check a claim against source
    // text rather than trusting a comment.
    const files = srcFiles();
    expect(files.length, "found no .ts files under src/ — the scan below would be vacuous").toBeGreaterThan(50);

    const writes: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // Comments stripped first: this file's own prose, and Enemy.ts's,
      // discuss these field names at length.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const field of DEAD_FIELDS) {
        // `\.field` then `=` that is not `==`/`===`/`=>`. `flingCD` and
        // `flyH` cannot match `fling`/`fly` because the `=` must follow the
        // name directly (modulo spaces).
        const re = new RegExp(`\\.${field}\\s*=(?![=>])`);
        if (re.test(code)) writes.push(`${f}: .${field}=`);
      }
    }
    expect(writes, "something in src/ now writes a KNOWN-15 field — see this file's header before 'fixing' it").toEqual([]);
  });
});

describe("KNOWN-15 — what the gap actually costs, at the read site", () => {
  it("a Cacodemon's fireOrb fires the default bolt, not the caco one, and fires it from the ground", () => {
    // The third leg of the verification: the def authors it, the spawned
    // enemy lacks it, and *therefore* the code that reads it takes the wrong
    // branch. `fireOrb` (`src/enemies/ai/Attacks.ts`) picks colour, damage
    // and speed off `e.orb`, and its muzzle height off `e.fly`/`e.flyH`. The
    // Cacodemon authors all three (`orb:"caco"`, `fly:true`, `flyH:1.7`) and
    // carries none of them, so every one of those branches falls through.
    //
    // This is not a claim that `fireOrb` is unreachable — it very much is
    // reachable, gated by `e.range`, which `spawnEnemy` *does* copy. What is
    // unreachable is every orb-specific branch inside it. Seven enemies name
    // seven different projectiles and all seven shoot the same purple bolt.
    expect(ENEMY_DEFS.C.orb).toBe("caco");
    expect(ENEMY_DEFS.C.fly).toBe(true);
    expect(ENEMY_DEFS.C.flyH).toBe(1.7);

    player.px = 5.5; player.pz = 12.5; player.pyy = 1.0;   // 7 units away, so dist is never 0
    const caco = spawn("C");
    expect(caco.orb).toBeUndefined();

    projectiles.orbs.length = 0;
    fireOrb(caco, 0);
    expect(projectiles.orbs.length, "fireOrb pushed nothing — this assertion would be vacuous").toBe(1);
    const orb = projectiles.orbs[0] as { col: number; dmg: number; m: { position: { y: number } } };

    // The `else` fallthrough at the bottom of fireOrb's colour chain, not
    // the `ot==="caco"` branch (0x5a8a3a / 16 dmg).
    expect(orb.col).toBe(0x9a4ae0);
    expect(orb.dmg).toBe(15);

    // And the muzzle: `e.fly?(e.flyH||1.5):e.h*.6+(e.fy||0)`. With `fly`
    // undefined it comes out of the sprite's midriff at ~1.06 instead of the
    // authored hover height of 1.7.
    expect(orb.m.position.y).toBeCloseTo(caco.h * 0.6, 6);
    expect(orb.m.position.y).not.toBeCloseTo(1.7, 2);
  });

  it("title is the harmless tenth — the boss bar works only because Boss.ts falls back to the def", () => {
    // `title` has the identical gap and is listed with the other nine, but it
    // is not a combat field and its single read site already tolerates the
    // gap: `src/enemies/Boss.ts` reads `e.title||EDEF[e.key].title`. That
    // `||` is the entire reason the boss title bar shows anything, and it is
    // why this one is harmless where the other nine are silently-dead
    // features. Twelve defs carry a `title` and only the boss ones are ever
    // read, so the four non-boss ones are dead data even if the mechanism
    // worked.
    const boss = spawn("E");
    expect(ENEMY_DEFS.E.title).toBe("warden of the dungeon");
    expect(boss.title).toBeUndefined();

    const bossSrc = readFileSync(join(SRC, "enemies", "Boss.ts"), "utf8");
    expect(
      /e\.title\s*\|\|\s*EDEF\[e\.key\]\.title/.test(bossSrc),
      "Boss.ts's `e.title||EDEF[e.key].title` fallback is gone — the boss title bar is now blank for every boss",
    ).toBe(true);
  });
});
