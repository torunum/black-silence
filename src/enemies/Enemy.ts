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
 *   3. (Retired 2026-10-21.) The KNOWN-15 ten were optional and always
 *      `undefined`; `spawnEnemy` now builds them, so they are group 1.
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
  /** Seconds of white flash left after a hit. Written by `src/enemies/HitReact.ts` (Damage.ts starts it, `enemyTick` ages it). */
  flashT?: number;
  /** Where a decapitated body's sprite stumbles to, metres from where it stands, along the shot (the sprite's, not the body's: the corpse and what it drops stay where the game put them). Written by `killEnemy`, read by `enemyTick`. */
  stumbleX?: number;
  stumbleZ?: number;
  /** How far the sprite leans away from the last hit at the start of the flinch, radians (signed). Written by `src/enemies/HitReact.ts`. */
  lean?: number;
  /** Seconds left reeling at the last of its health (`src/enemies/Stagger.ts`); 0 or absent when it is not. */
  stagger?: number;
  /** It has had its one chance to reel. */
  staggerTried?: boolean;
  /** Seconds it has been reeling, for its sway and its pulse. */
  reelT?: number;
  /** The player is finishing it with their hands (`src/player/Execution.ts`): it is held, and the stagger does not run out. */
  executing?: boolean;

  /* ---- group 1, continued: the def's behaviours (KNOWN-15, closed) ----
   *
   * These ten are authored on `ENEMY_DEFS` entries (`src/enemies/EnemyDefs.ts`). Until 2026-10-21 `spawnEnemy` never copied
   * them, as the frozen reference never did, and every read saw `undefined`: no enemy fired the projectile it names, no flier
   * flew, the shield absorbed nothing. The owner turned them on (2026-10-21: "bahsettiğin şeyler iyimiş. Onlar da
   * yapılabilir"); the literal now writes every one on every enemy, so they are group 1. `tests/enemies/defFields.test.ts`
   * holds each equal to its def. See KNOWN-15 in `docs/known-issues.md`.
   */

  /** Projectile kind (`caco`, `manc`, `cult`, `centaur`, `afrit`, `reiver`, `garg`), or none. Read at `ai/Behaviors.ts`, `ai/Attacks.ts`. */
  orb: string | undefined;
  /** It flies: hovers `flyH` over the floor (`src/enemies/Hover.ts`). Read at `ai/Attacks.ts`, `ai/Behaviors.ts`, `weapons/Hitscan.ts`. */
  fly: boolean;
  /** Where a flier's sprite centre hovers above the floor, metres (0 for one that does not fly). */
  flyH: number;
  /** Mancubus second barrel. Read at `ai/Behaviors.ts`. */
  twin: boolean;
  /** Afrit spread. Read at `ai/Behaviors.ts`. */
  burst: boolean;
  /** Lost soul's charge. Read at `ai/Behaviors.ts`. */
  charger: boolean;
  /** Tears off its own flesh and throws it. Read at `ai/Behaviors.ts`. */
  fling: boolean;
  /** Directional shield absorption. Read at `enemies/Damage.ts`. */
  shield: boolean;
  /** Sovereign boss stat block. Read at `enemies/Boss.ts`. */
  sovereign: boolean;
  /** Boss subtitle line, e.g. "warden of the dungeon". Read at `src/enemies/Boss.ts`. */
  title: string | undefined;
}
