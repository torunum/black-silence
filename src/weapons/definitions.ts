export interface WeaponStats {
  name: string;
  ammo: "bullets" | "shells" | "slugs" | "crosses" | "nails" | "souls";
  dmg: number;
  /** Seconds between shots. */
  rate: number;
  pellets: number;
  spread: number;
  kind: "hit" | "cross" | "reap";
  magSize: number;
  /** Seconds for a full reload. */
  reload: number;
  /** Screen-shake trauma added per shot. */
  trauma: number;
  /** Viewmodel kick, pixels. */
  kick: number;
  pump?: boolean;
  /** How many extra enemies a shot passes through. */
  pierce?: number;
}

/**
 * Slot order is gameplay: it is the 1-8 hotkey binding and the index into
 * S.mag and S.weapons. Do not reorder.
 * Copied from reference/sonsurum.html lines 1919-1944, minus the snd closures
 * (those stay in legacy.js as WEAPON_SOUNDS until Plan 0B extracts the audio
 * layer, and are merged back onto these stats at module init).
 */
export const WEAPON_STATS: WeaponStats[] = [
  { name: "FLARE PISTOL", ammo: "bullets", dmg: 34, rate: 0.42, pellets: 1, spread: 0.004,
    kind: "hit", magSize: 6, reload: 2.0, trauma: 0.15, kick: 14 },
  { name: "SAWED-OFF SHOTGUN", ammo: "shells", dmg: 9, rate: 0.85, pellets: 8, spread: 0.075,
    kind: "hit", magSize: 5, reload: 2.1, trauma: 0.42, kick: 26, pump: true },
  { name: "COMBAT RIFLE", ammo: "bullets", dmg: 14, rate: 0.1, pellets: 1, spread: 0.018,
    kind: "hit", magSize: 24, reload: 1.7, trauma: 0.09, kick: 9 },
  { name: "TOMMY GUN", ammo: "bullets", dmg: 8, rate: 0.065, pellets: 1, spread: 0.04,
    kind: "hit", magSize: 36, reload: 1.5, trauma: 0.06, kick: 6 },
  { name: "BMG SNIPER", ammo: "slugs", dmg: 160, rate: 1.4, pellets: 1, spread: 0,
    kind: "hit", magSize: 4, reload: 2.4, trauma: 0.32, kick: 24, pierce: 2 },
  { name: "HOLY CROSS LAUNCHER", ammo: "crosses", dmg: 60, rate: 1.1, pellets: 1, spread: 0.005,
    kind: "cross", magSize: 3, reload: 2.2, trauma: 0.26, kick: 18 },
  { name: "NAIL CANNON", ammo: "nails", dmg: 11, rate: 0.05, pellets: 1, spread: 0.03,
    kind: "hit", magSize: 50, reload: 2.0, trauma: 0.05, kick: 5 },
  { name: "SOUL REAPER", ammo: "souls", dmg: 75, rate: 1.3, pellets: 1, spread: 0,
    kind: "reap", magSize: 4, reload: 2.6, trauma: 0.4, kick: 22, pierce: 3 },
];
