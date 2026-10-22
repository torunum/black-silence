import type { ZoneMap, ZoneTheme } from "../LevelBuilder";

/**
 * The graveyard's regions (owner, 2026-10-22: "geliştirmeye devam et"): a burying ground is under the sky, so its yards, its field, its
 * terraces and its new graves are open to the night, as the village's are (`villageZones.ts`); the gravekeeper's cottage and loft, the chapel
 * of rest and its bell loft, and the charnel and the family vault under their roofs. Later boxes win.
 */
export const GRAVEYARD_ZONES: ZoneTheme[] = [
  { id: "g_outdoor", dungeon: true, sub: "graveyard", sky: true, ground: "yardEarth", side: "graveEarth", bed: "yard", fog: 0x0e110e, fogD: .036, amb: 0x56604e, ambI: .62 },
  { id: "g_house", sub: "church", fog: 0x0d0a08, fogD: .045, amb: 0x6a5242, ambI: .58 },
  { id: "g_chapel", sub: "church", fog: 0x0b070d, fogD: .042, amb: 0x4e4458, ambI: .55 },
  { id: "g_crypt", sub: "crypt", fog: 0x0a0909, fogD: .06, amb: 0x4a403c, ambI: .48 },
];

const BOXES: ReadonlyArray<readonly [string, number, number, number, number]> = [
  ["g_house", 33, 26, 42, 42],      // the gravekeeper's cottage, its stair and its loft
  ["g_chapel", 39, 0, 54, 16],      // the chapel of rest and its bell loft
  ["g_crypt", 28, 2, 39, 11],       // the charnel, and the stair down into it
  ["g_crypt", 58, 34, 61, 40],      // the family vault
];

export function graveyardZones(W: number, H: number): ZoneMap {
  const idx = (id: string): number => GRAVEYARD_ZONES.findIndex((t) => t.id === id);
  const map = Array.from({ length: H }, () => Array(W).fill(idx("g_outdoor")));
  for (const [id, x0, z0, x1, z1] of BOXES) for (let z = Math.max(0, z0); z <= Math.min(H - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) map[z][x] = idx(id);
  return { map, themes: GRAVEYARD_ZONES };
}
