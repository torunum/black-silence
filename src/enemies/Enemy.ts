import type * as THREE from "three";

/**
 * The one enemy shape.
 *
 * Before this file there were sixteen of them — a local `interface` in
 * each of fifteen consumer files, every one an independently invented cast
 * shape over an object the compiler knew nothing about (KNOWN-13). 84
 * distinct fields, 59 declared in more than one place, and at least one
 * outright contradiction: `severKey` was `string` in `src/enemies/Damage.ts`
 * (which assigns it) and `boolean` in `src/enemies/ai/Behaviors.ts` (which
 * reads it).
 *
 * The root cause was never the consumers. `spawnEnemy`
 * (`src/world/LevelLoader.ts`) returned `Record<string, unknown>`, so there
 * was nothing for any of them to disagree *with*. That is why this interface
 * is derived from the **producer**, field by field, and why `spawnEnemy` now
 * returns `Enemy`: an interface the producer does not have to satisfy is
 * just a seventeenth unchecked declaration.
 *
 * The rule that settles every disagreement, now and later: **the spawn
 * literal is the ground truth.** If the literal will not type-check as an
 * `Enemy`, this file is what changes — never the literal.
 *
 * Three groups, and the group a field is in is a statement about it:
 *
 *   1. Built by `spawnEnemy`'s literal — **non-optional**. The literal
 *      writes every one of them on every enemy — no branch in `spawnEnemy`
 *      adds or drops a key — so all of them exist at runtime. The count is
 *      deliberately not written down here or in the test; the set
 *      comparison is what keeps it right.
 *      Where the sixteen old declarations said `boss?: boolean`, the
 *      producer says `boss:!!d.boss` — always present, always a boolean.
 *      Tightening that is the point of the consolidation.
 *   2. Assigned after spawn — **optional**, each with the site that writes
 *      it. These genuinely are absent on a freshly spawned enemy.
 *   3. The KNOWN-15 ten — **optional**, and always `undefined` at runtime.
 *      See the block above them. `title` is the one whose absence is
 *      harmless: its sole read (`src/enemies/Boss.ts`) falls back to
 *      `EDEF[e.key].title`.
 *
 * `tests/enemies/enemyShape.test.ts` pins group 1 against the producer by
 * parsing this file and comparing the non-optional names to the own-keys of
 * a real spawned enemy. Add a field to the literal and not here, or a
 * non-optional field here and not to the literal, and that test goes red.
 */
export interface Enemy {
  /* ---- group 1: built by spawnEnemy's object literal, always present ---- */

  /** The level-grid character that spawned it; indexes `ENEMY_DEFS` and `PX`. */
  key: string;
  /** `d.name` — `EnemyDef.name` is optional, so most enemies carry `undefined` here. */
  name: string | undefined;
  x: number;
  z: number;
  hp: number;
  maxhp: number;
  speed: number;
  /** Melee damage. */
  mel: number;
  /** Sprite width and height, already scaled by the elite/size multipliers. */
  w: number;
  h: number;
  /** Damage threshold that triggers a pain stagger. */
  pain: number;
  /** Knockback resistance, 0-1. `d.kbRes||0`, so a number, never undefined. */
  kbRes: number;
  boss: boolean;
  priest: boolean;
  stone: boolean;
  charge: boolean;
  slam: boolean;
  lunge: boolean;
  dodge: boolean;
  scream: boolean;
  toxic: boolean;
  /** `d.range||0`. */
  range: number;
  /** Frontal armour. `d.plate||0`. */
  plate: number;
  sp: THREE.Sprite;
  /** The shadow blob under the sprite. */
  blob: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  elite: boolean;
  summoned: boolean;
  cool: number;
  hurt: number;
  stun: number;
  kx: number;
  kz: number;
  flung: number;
  flungT: number;
  dead: boolean;
  gone: boolean;
  deathT: number;
  deathKind: number;
  deathDir: number;
  dropped: boolean;
  dodgeT: number;
  strafe: number;
  strafeDir: number;
  flank: number;
  alertX: number;
  alertZ: number;
  aware: boolean;
  slow: number;
  animT: number;
  frame: number;
  /** Collision radius. */
  r: number;
  screamT: number;
  lungeT: number;
  slamT: number;
  flingCD: number;
  /** Floor height under the spawn point. */
  fy: number;
  dormant: boolean;
  phase: number;
  tpT: number;
  atkT: number;
  sumT: number;
  ringT: number;
  debT: number;
  chT: number;
  charging: number;
  cdx: number;
  cdz: number;

  /* ---- group 2: assigned after spawn, so genuinely absent at first ---- */

  /** Attack-animation countdown. Written by `src/enemies/ai/Attacks.ts`, `ai/Behaviors.ts`, `Boss.ts`. */
  atkAnim?: number;
  /** Second-form sprite key for a transformed boss. Written by `src/enemies/Boss.ts`. */
  formKey?: string;
  /** Enrage timer. Written by `src/world/RandomEvents.ts` and `src/enemies/ai/Behaviors.ts`. */
  frenzy?: number;
  /** Which limbs have been torn off. Written by `src/enemies/Damage.ts`. */
  sever?: { lArm?: boolean; rArm?: boolean; legs?: boolean };
  /**
   * The dismembered sprite currently shown. `refreshSeverSprite`
   * (`src/enemies/Damage.ts`) is the sole writer and assigns exactly
   * this union — never a bare `boolean`. `src/enemies/ai/Behaviors.ts`
   * declared it `boolean`; both of its reads there are bare
   * truthiness tests, which is the only reason the contradiction never
   * showed. Fixing it here is why this file exists.
   */
  severKey?: "noLegs" | "noLArm" | "noRArm" | "gibbed";
  /** True while the attack sprite is swapped in. Written by `src/enemies/ai/Behaviors.ts`. */
  wasAtk?: boolean;

  /* ---- group 3: KNOWN-15 — authored, read, never delivered ------------
   *
   * These ten are authored on `ENEMY_DEFS` entries (`src/enemies/EnemyDefs.ts`)
   * and read by the AI, but `spawnEnemy`'s literal **never copies them onto
   * the spawned enemy** — no spread, no assignment by name, and no
   * `e.<field> =` anywhere in `src/`. So every read of them at runtime sees
   * `undefined`, on every enemy, always. The frozen reference
   * (`reference/sonsurum.html`) does exactly the same thing, so this is
   * faithful port behavior and not drift: no enemy fires a projectile, no
   * flying enemy flies, the shield never absorbs, the sovereign bosses use
   * the lower numbers.
   *
   * They are declared here — optional, matching what a read actually gets —
   * so that the interface documents the gap instead of hiding it. Turning
   * any of them on is a combat-balance change that belongs to the roster
   * work. **Do not make `spawnEnemy` copy them, and do not delete the read
   * sites.**
   *
   * `title` below is the tenth, with the identical gap but a harmless
   * consequence — it is not a combat field and its one read already
   * tolerates the gap with a fallback — so it is described separately below
   * rather than counted among the nine combat behaviors.
   *
   * `tests/enemies/deadDefFields.test.ts` pins all ten, deriving the
   * authoring defs from `ENEMY_DEFS` itself so no count here or there can go
   * stale. **Read that file's header before changing anything in this
   * block.** See also KNOWN-15 in `docs/known-issues.md`.
   */

  /** Projectile kind. Read at `ai/Behaviors.ts`, `ai/Attacks.ts`. Always `undefined`. */
  orb?: string;
  /** Read at `ai/Attacks.ts`, `ai/Behaviors.ts`, `weapons/Hitscan.ts`. Always `undefined`. */
  fly?: boolean;
  /** Hover height. Same read sites as `fly`. Always `undefined`. */
  flyH?: number;
  /** Mancubus second barrel. Read at `ai/Behaviors.ts`. Always `undefined`. */
  twin?: boolean;
  /** Afrit spread. Read at `ai/Behaviors.ts`. Always `undefined`. */
  burst?: boolean;
  /** Charge lunge. Read at `ai/Behaviors.ts`. Always `undefined`. */
  charger?: boolean;
  /** Fling attack. Read at `ai/Behaviors.ts`. Always `undefined`. */
  fling?: boolean;
  /** Directional shield absorption. Read at `enemies/Damage.ts`. Always `undefined`. */
  shield?: boolean;
  /** Sovereign boss stat block. Read at `enemies/Boss.ts`. Always `undefined`. */
  sovereign?: boolean;
  /**
   * Boss subtitle line, e.g. "warden of the dungeon". Authored on **twelve**
   * `ENEMY_DEFS` entries — 8 boss (`E,U,Q,Z,N,H,V,G`) and 4 non-boss
   * (`k,q,R,y`) — but `spawnEnemy`'s literal never copies it, the same gap
   * as the other nine. Read at `src/enemies/Boss.ts` as
   * `e.title||EDEF[e.key].title`; the `||` fallback to the def's own `title`
   * is why the boss title bar works anyway, and is why this one is harmless
   * today where the others are silently-dead features. That read site is
   * boss-only, so the four non-boss titles are dead data even if the
   * mechanism worked.
   */
  title?: string;
}
