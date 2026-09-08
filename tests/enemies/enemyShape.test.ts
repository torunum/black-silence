// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type { Enemy } from "../../src/enemies/Enemy";

/**
 * The pin that makes `src/enemies/Enemy.ts` load-bearing.
 *
 * Phase 3A replaced seventeen independently-invented enemy interfaces with
 * one, derived from the producer — `spawnEnemy`'s object literal in
 * `src/world/LevelLoader.ts`. `spawnEnemy` now returns `Enemy`, so the
 * compiler already rejects a literal that fails to *satisfy* the interface.
 * What the compiler cannot see is the other direction: TypeScript's excess-
 * property check fires on a fresh object literal, but the interface would
 * still be a lie if someone deleted a field from it, or added a field to the
 * literal that nobody declared. And `Enemy` is erased at runtime, so no
 * amount of importing it tells a test what it says.
 *
 * So this file reads `src/enemies/Enemy.ts` as text and re-extracts the
 * declaration from the source — the same technique
 * `tests/content/achievements.test.ts` uses to re-extract the 20 achievement
 * triples out of the frozen reference rather than trusting the table it is
 * checking. The extracted **non-optional** names are then compared, as a
 * set, against the own-keys of an enemy that really came out of `spawnEnemy`.
 *
 * Nothing here hardcodes how many fields there are. That is deliberate: a
 * literal count in a test is a number someone has to remember to bump, and
 * the whole point of this task is that nobody should have to remember
 * anything. The set comparison is self-maintaining — it goes red when
 *
 *   - a field is added to (or removed from) `spawnEnemy`'s literal and not
 *     mirrored in `Enemy`, and
 *   - a **non-optional** field is added to `Enemy` that the producer does
 *     not build.
 *
 * The optional half is pinned too, by the second `describe`: `Enemy`'s
 * optional fields are exactly the ones that are *not* there at spawn — the
 * six written later by the AI/damage code, and the nine KNOWN-15 fields that
 * are never written at all. If one of them were present on a fresh enemy it
 * would belong in group 1, non-optional, and the declaration would be
 * describing the object more loosely than the producer does — the exact
 * looseness this task exists to remove.
 */

const ENEMY_TS = join(__dirname, "..", "..", "src", "enemies", "Enemy.ts");

interface Declared {
  required: string[];
  optional: string[];
}

/**
 * The property names `export interface Enemy` declares, split by optionality.
 *
 * Comments are stripped first — `Enemy.ts` is heavily commented and several
 * of those comments contain colons, `?` and even property-shaped text (the
 * doc comment quotes `boss?: boolean`), any of which would fool a naive
 * line regex. Only depth-1 members are collected, so the inline object type
 * on `sever?: { lArm?: boolean; ... }` contributes `sever` and not its own
 * three members.
 */
function declaredFields(): Declared {
  const src = readFileSync(ENEMY_TS, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  const at = src.search(/\bexport\s+interface\s+Enemy\s*\{/);
  if (at < 0) throw new Error("export interface Enemy not found in src/enemies/Enemy.ts");
  const open = src.indexOf("{", at);

  let depth = 0;
  let close = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { close = i; break; }
  }
  if (close < 0) throw new Error("unbalanced braces in the Enemy interface body");
  const body = src.slice(open + 1, close);

  // Split on the `;` that terminate depth-0 members only, so the nested
  // object type's internal `;` stay inside their own segment.
  const segments: string[] = [];
  let buf = "";
  depth = 0;
  for (const c of body) {
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    if (c === ";" && depth === 0) { segments.push(buf); buf = ""; continue; }
    buf += c;
  }
  segments.push(buf);

  const required: string[] = [];
  const optional: string[] = [];
  for (const seg of segments) {
    const m = /^\s*(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(\?)?\s*:/.exec(seg);
    if (!m) continue;
    (m[2] ? optional : required).push(m[1]);
  }
  return { required, optional };
}

/**
 * A real enemy, straight out of the real `spawnEnemy`. Deliberately typed
 * `=> object` here rather than `=> Enemy`: this local exists only so the
 * assertions below can call it before the dynamic `import()` in `beforeAll`
 * has resolved, and TypeScript would happily narrow a same-named `=> Enemy`
 * declaration to match whatever the module actually exports today. Because
 * of that looseness, nothing that follows from *this* declaration pins
 * `spawnEnemy`'s real return type — see `_typePinSpawnEnemyReturnsEnemy`
 * below, which does.
 */
let spawnEnemy: (ch: string, wx: number, wz: number, summoned?: boolean) => object;

/**
 * The actual pin for `spawnEnemy`'s return type. Every assertion above only
 * ever inspects `Object.keys(...)` of what `spawnEnemy` returns, so if
 * `src/world/LevelLoader.ts`'s `spawnEnemy` were reverted to return
 * `Record<string, unknown>` — while its literal stayed annotated
 * `const e: Enemy = {...}` — every test in this file would still pass; the
 * shape test would no longer be pinning the producer's declared signature at
 * all. This function is never called; it exists solely so `npm run
 * typecheck` rejects that reversion. `real` is typed off the module itself,
 * not off the `object`-typed local above, so the check cannot be satisfied
 * by accident.
 */
function _typePinSpawnEnemyReturnsEnemy(
  real: typeof import("../../src/world/LevelLoader").spawnEnemy,
): Enemy {
  return real("z", 0.5, 0.5);
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();

  // Dynamic, after the stubs: LevelLoader -> RenderCore constructs a real
  // THREE.WebGLRenderer against #game at module scope, which a static
  // top-of-file import would run before installDomStubs()/loadGameHtml().
  // Same reason tests/integration/dismembermentThreshold.test.ts does this.
  const THREE = await import("three");
  const { buildSprites } = await import("../../src/enemies/SpriteBaker");
  const { renderState } = await import("../../src/render/Renderer");
  const { setScene } = await import("../../src/render/SceneRef");
  const { world } = await import("../../src/world/WorldState");

  const scene = new THREE.Scene();
  buildSprites();                 // PX[ch].a — spawnEnemy's sprite texture
  renderState.scene = scene;      // addSprite/addBlob add straight into it
  setScene(scene);                // and keep SceneRef's getScene() consistent with it
  world.enemies = [];             // spawnEnemy pushes into it
  // world.heightMap stays null, so floorHeightAt() returns 0 without a grid.

  spawnEnemy = (await import("../../src/world/LevelLoader")).spawnEnemy;
});

describe("the Enemy interface's non-optional fields", () => {
  it("names exactly the fields spawnEnemy's literal builds — no more, no fewer", () => {
    const { required } = declaredFields();
    // Guard the extractor itself, the way achievements.test.ts asserts its
    // regex found 20 literals before trusting them: an `Enemy.ts` rename or
    // a broken regex must fail loudly here, not pass by comparing two empty
    // sets. No count is asserted — only that parsing produced something.
    expect(required.length, "parsed no non-optional fields out of src/enemies/Enemy.ts").toBeGreaterThan(0);
    expect(new Set(required).size, "Enemy declares a field twice").toBe(required.length);

    const spawned = Object.keys(spawnEnemy("z", 5.5, 5.5));
    expect([...spawned].sort()).toEqual([...required].sort());
  });

  it("describes every enemy the same way — boss, summoned and rank-and-file spawn one shape", () => {
    // spawnEnemy branches on `d.boss` (r, dormant), on `summoned`, and on a
    // random elite roll, but no branch adds or drops a key. If one ever did,
    // the interface could only be right for some enemies.
    const ghoul = Object.keys(spawnEnemy("z", 6.5, 6.5)).sort();
    const boss = Object.keys(spawnEnemy("E", 7.5, 7.5)).sort();
    const summoned = Object.keys(spawnEnemy("z", 8.5, 8.5, true)).sort();
    expect(boss).toEqual(ghoul);
    expect(summoned).toEqual(ghoul);
  });
});

describe("the Enemy interface's optional fields", () => {
  it("are exactly the ones a freshly spawned enemy does not have", () => {
    const { optional } = declaredFields();
    expect(optional.length, "parsed no optional fields out of src/enemies/Enemy.ts").toBeGreaterThan(0);

    const spawned = new Set(Object.keys(spawnEnemy("z", 9.5, 9.5)));
    for (const f of optional) {
      expect(
        spawned.has(f),
        `Enemy declares '${f}' optional, but spawnEnemy builds it — it belongs in the non-optional group`,
      ).toBe(false);
    }
  });

  it("does not overlap the non-optional ones", () => {
    const { required, optional } = declaredFields();
    expect(optional.filter((f) => required.includes(f))).toEqual([]);
  });

  it("types severKey as exactly the union Damage.ts assigns, not the boolean Behaviors.ts declared", () => {
    // `severKey` is KNOWN-13's one outright contradiction rather than a mere
    // looseness: `src/enemies/Damage.ts`'s `refreshSeverSprite` assigns
    // `e.severKey=key` where `key` is exactly `SeverKeyUnion` below, while
    // `src/enemies/ai/Behaviors.ts` declared it `boolean`. Both of that
    // file's reads are bare truthiness tests, which is the only reason the
    // game works.
    //
    // The real assertion is the **type**, checked by `npm run typecheck`,
    // not the `expect` under it — and it must be checked both ways.
    // `const assigned: Enemy["severKey"] = "gibbed" as SeverKeyUnion` (the
    // earlier form of this guard) only checks that `SeverKeyUnion` is
    // assignable *into* `Enemy["severKey"]`, which rejects `boolean` but
    // says nothing against `Enemy.severKey` being widened back to `string`
    // (or `string | undefined`) — a plain `string` still accepts a
    // `SeverKeyUnion` value. `Exactly<A, B>` below is a two-directional
    // equality check instead, so a widen-to-`string` mutation is caught by
    // this test too, not only a narrow-to-`boolean` one.
    //
    // The check lives here because Task 1 deliberately leaves the seventeen
    // consumer interfaces alone — until Task 2 points `Damage.ts` at
    // `Enemy`, nothing in `src/` reads `Enemy["severKey"]` at all, so
    // nothing in `src/` would notice the type being wrong again.
    type SeverKeyUnion = "noLegs" | "noLArm" | "noRArm" | "gibbed" | undefined;
    type Exactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
    const isExactlyTheUnion: Exactly<Enemy["severKey"], SeverKeyUnion> = true;
    expect(isExactlyTheUnion).toBe(true);
  });
});
