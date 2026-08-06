export interface EnemyDef {
  hp: number;
  /** Move speed, world units per second. */
  sp: number;
  /** Melee damage. */
  mel: number;
  /** Sprite width and height, world units. */
  w: number;
  h: number;
  /** Damage threshold that triggers a pain stagger. */
  pain: number;
  name?: string;
  title?: string;
  range?: number;
  /** Frontal armour that absorbs damage. */
  plate?: number;
  /** Knockback resistance, 0-1. */
  kbRes?: number;
  flyH?: number;
  orb?: string;
  boss?: boolean;
  fly?: boolean;
  fling?: boolean;
  dodge?: boolean;
  lunge?: boolean;
  toxic?: boolean;
  scream?: boolean;
  slam?: boolean;
  charge?: boolean;
  stone?: boolean;
  priest?: boolean;
  sovereign?: boolean;
  shield?: boolean;
  twin?: boolean;
  burst?: boolean;
  charger?: boolean;
  deathBoom?: boolean;
}

/**
 * Keyed by the level-grid character that spawns the enemy.
 * Copied verbatim from reference/sonsurum.html lines 2678-2716.
 */
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  z: { hp: 50, sp: 2.4, mel: 12, w: 1.0, h: 1.4, pain: 170, fling: true },
  f: { hp: 35, sp: 5.2, mel: 10, w: 0.9, h: 1.25, pain: 260, dodge: true },
  g: { hp: 30, sp: 6.0, mel: 9, w: 1.25, h: 0.8, pain: 430, lunge: true },
  m: { hp: 55, sp: 2.2, mel: 14, w: 1.0, h: 1.4, pain: 150, plate: 45 },
  t: { hp: 65, sp: 2.0, mel: 12, w: 1.1, h: 1.45, pain: 200, range: 12, toxic: true, fling: true },
  w: { hp: 30, sp: 2.6, mel: 8, w: 1.15, h: 0.65, pain: 240 },
  s: { hp: 40, sp: 3.0, mel: 8, w: 0.95, h: 1.35, pain: 520, scream: true },
  C: { hp: 120, sp: 2.3, mel: 14, w: 1.5, h: 1.5, pain: 200, range: 15, fly: true, flyH: 1.7, orb: "caco" }, // Cacodemon
  A: { hp: 260, sp: 1.3, mel: 18, w: 1.8, h: 1.8, pain: 90, kbRes: 0.6, range: 13, orb: "manc", twin: true }, // Mancubus
  L: { hp: 24, sp: 6.4, mel: 14, w: 0.7, h: 0.7, pain: 600, fly: true, flyH: 1.4, charger: true }, // Lost Soul
  j: { hp: 45, sp: 3.2, mel: 9, w: 0.9, h: 1.4, pain: 240, range: 14, dodge: true, orb: "cult" }, // Cultist
  n: { hp: 130, sp: 2.8, mel: 24, w: 1.3, h: 1.7, pain: 130, kbRes: 0.4, slam: true, fling: true }, // Ettin
  B: { hp: 230, sp: 2.1, mel: 30, w: 1.7, h: 1.9, pain: 90, kbRes: 0.7, slam: true },
  E: { hp: 850, sp: 2.7, mel: 38, w: 2.1, h: 2.5, pain: 80, kbRes: 0.85, boss: true, charge: true,
    name: "THE MUTANT EXECUTIONER", title: "warden of the dungeon" },
  U: { hp: 700, sp: 2.0, mel: 26, w: 1.9, h: 2.2, pain: 60, kbRes: 0.92, boss: true, range: 13, stone: true,
    name: "THE CATHEDRAL GUARDIAN", title: "it has always stood here" },
  Q: { hp: 1800, sp: 2.6, mel: 26, w: 1.7, h: 2.6, pain: 55, kbRes: 1, boss: true, priest: true,
    name: "THE CORRUPTED PRIEST", title: "he still holds mass" },
  Z: { hp: 2400, sp: 2.4, mel: 30, w: 1.9, h: 2.9, pain: 45, kbRes: 1, boss: true, priest: true, sovereign: true,
    name: "THE BONE SOVEREIGN", title: "it wore every crown that rotted here" },
  N: { hp: 1500, sp: 3.0, mel: 24, w: 1.6, h: 2.3, pain: 60, kbRes: 1, boss: true, priest: true, sovereign: true,
    name: "THE GRAVEDIGGER", title: "he buries everyone eventually" },
  H: { hp: 2200, sp: 2.2, mel: 32, w: 2.4, h: 2.6, pain: 40, kbRes: 1, boss: true, priest: true, sovereign: true,
    name: "THE HOLLOW LEVIATHAN", title: "it learned to breathe the filth" },
  V: { hp: 2600, sp: 2.2, mel: 34, w: 2.2, h: 2.7, pain: 40, kbRes: 1, boss: true, priest: true, sovereign: true,
    name: "THE FACTORY FOREMAN", title: "it never clocked out" },
  G: { hp: 3000, sp: 2.0, mel: 36, w: 2.6, h: 2.8, pain: 36, kbRes: 1, boss: true, priest: true, sovereign: true, fling: true,
    name: "THE LIVING HEART", title: "the whole place was one body, and this was its heart" },
  k: { hp: 200, sp: 2.6, mel: 20, w: 1.3, h: 1.7, pain: 80, kbRes: 0.7, shield: true, range: 13, orb: "centaur",
    name: "SLAUGHTAUR", title: "it spits fire from a screaming shield" }, // Hexen Centaur/Slaughtaur
  q: { hp: 70, sp: 2.4, mel: 12, w: 1.1, h: 1.3, pain: 200, fly: true, flyH: 1.8, range: 14, orb: "afrit", burst: true, deathBoom: true,
    name: "AFRIT", title: "it burns even after it dies" }, // Hexen Afrit
  R: { hp: 90, sp: 3.0, mel: 14, w: 1.2, h: 1.2, pain: 160, fly: true, flyH: 1.9, range: 16, orb: "reiver",
    name: "REIVER", title: "half a corpse, all of the hate" }, // Hexen Reiver
  y: { hp: 110, sp: 2.8, mel: 18, w: 1.3, h: 1.5, pain: 120, fly: true, flyH: 1.6, range: 13, orb: "garg",
    name: "STONE GARGOYLE", title: "it served Cheogh, and Cheogh is dead" }, // Blood Gargoyle
};
