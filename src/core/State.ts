import type { UnlockedAchievement } from "../ui/Toasts";

/**
 * The run's scoreboard, ammo, and inventory — everything `S` held in
 * src/legacy.js before this carve. Moved verbatim from the `const S={...}`
 * literal that used to sit at legacy.js's module scope (see
 * reference/sonsurum.html for the original global of the same name); no
 * field was added or dropped. One field is renamed to `enemiesTotal` (see
 * below) — the only cleanup Phase 0 allows, since it changes no behavior.
 *
 * `S`'s own initialiser accounts for 25 of the 28 fields read at `S.<x>`
 * call sites across legacy.js. The other three are created lazily, the
 * first time the code that needs them runs, and are documented individually
 * below rather than pretended into the initialiser.
 */
export interface GameState {
  hp: number;
  armor: number;
  key: boolean;
  dead: boolean;
  won: boolean;
  level: number;

  kills: number;
  gibs: number;
  secrets: number;
  secretsTotal: number;
  shots: number;
  hitsLanded: number;
  propsBroken: number;

  totKills: number;
  totGibs: number;
  totSecrets: number;
  t0: number;
  levelT0: number;

  ammo: {
    bullets: number;
    shells: number;
    slugs: number;
    crosses: number;
    nails: number;
    souls: number;
  };
  mag: number[];
  weapons: boolean[];
  cur: number;

  kickCd: number;
  pianoNotes: number;
  /** Unlocked achievements, keyed by id — the record `ach()` (src/ui/Toasts.ts) reads and writes. */
  ach: Record<string, UnlockedAchievement>;

  /**
   * Enemies spawned so far this level, not enemies killed — this field was
   * renamed from a name that paired "kills" with "Total" and implied
   * otherwise. `gradeOf()` divides `kills` by this to score the level-end
   * grade.
   *
   * Lazily created: `spawnEnemy` does `S.enemiesTotal=(S.enemiesTotal||0)+1`,
   * so it is `undefined` until the first enemy spawns each run. `loadLevel`
   * resets it to `0` for the next level, so after the first spawn it is
   * always a `number` again. Optional here, not a required `number`, so the
   * type stays honest with the `||0` guard — don't "simplify" that guard
   * away without also making this field non-optional and initialised.
   */
  enemiesTotal?: number;
  /**
   * Kick kills, tallied only while the current kick lands on empty space
   * (`info.wIdx===-1`). Lazily created by `S.kickK=(S.kickK||0)+1` and never
   * reset in `loadLevel`, so it accumulates for the whole run, not per
   * level. Optional to match the `||0` guard it is always read through —
   * do not initialise it eagerly without checking that cross-level
   * accumulation is still intended.
   */
  kickK?: number;
  /**
   * Decapitation kills for the whole run. Lazily created by an explicit
   * `if(!S.beheads)S.beheads=0;` immediately before the first increment,
   * rather than the `||0` idiom the other two lazy fields use — same
   * effect, never reset in `loadLevel`. Optional here so the type doesn't
   * contradict that guard.
   */
  beheads?: number;
}

/* ============================================================
   GLOBAL STATE
   ============================================================ */
export const S: GameState = {hp:100,armor:0,key:false,dead:false,won:false,level:0,
  kills:0,gibs:0,secrets:0,secretsTotal:0,shots:0,hitsLanded:0,propsBroken:0,
  totKills:0,totGibs:0,totSecrets:0,t0:0,levelT0:0,
  ammo:{bullets:60,shells:0,slugs:0,crosses:0,nails:0,souls:0},
  mag:[6,0,0,0,0,0,0,0],weapons:[true,false,false,false,false,false,false,false],cur:0,
  kickCd:0,pianoNotes:0,ach:{}};
