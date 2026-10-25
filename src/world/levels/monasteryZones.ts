import type { ZoneMap, ZoneTheme } from "../LevelBuilder";

/** The monastery's regions, each with its own look, light and (for the open ones) sky. Later boxes win. */
export const MONASTERY_ZONES: ZoneTheme[] = [
  { id: "m_crypt", sub: "crypt", fog: 0x0a0909, fogD: .06, amb: 0x4a403c, ambI: .5 },
  { id: "m_graveyard", dungeon: true, sub: "graveyard", sky: true, ground: "yardEarth", side: "graveEarth", bed: "yard", fog: 0x0b1018, fogD: .045, amb: 0x5a6a88, ambI: .75 },
  { id: "m_courtyard", sub: "church", sky: true, bed: "yard", fog: 0x0d1016, fogD: .035, amb: 0x5a6680, ambI: .72 },
  { id: "m_tower", sub: "church", fog: 0x0c0b0e, fogD: .04, amb: 0x4a4458, ambI: .55 },
  { id: "m_morgue", dungeon: true, sub: "dungeon", fog: 0x080a0b, fogD: .055, amb: 0x3c4a50, ambI: .48 },
  { id: "m_crematorium", dungeon: true, sub: "factory", fog: 0x120a06, fogD: .05, amb: 0x6a3a22, ambI: .62 },
  { id: "m_cloister", sub: "church", sky: true, bed: "yard", fog: 0x0d1016, fogD: .035, amb: 0x5a6680, ambI: .7 },
  { id: "m_library", sub: "church", fog: 0x0b090a, fogD: .045, amb: 0x54463a, ambI: .52 },
  { id: "m_ossuary", sub: "necropolis", fog: 0x0a0a07, fogD: .055, amb: 0x4a4636, ambI: .42 },
  { id: "m_cistern", sub: "sewers", fog: 0x0a0e0a, fogD: .05, amb: 0x36443a, ambI: .46 },
  { id: "m_chapel", sub: "church", fog: 0x140606, fogD: .045, amb: 0x6a2a24, ambI: .58 },
];

const BOXES: ReadonlyArray<readonly [string, number, number, number, number]> = [
  ["m_crypt", 74, 60, 99, 85],
  ["m_graveyard", 32, 65, 74, 85],
  ["m_courtyard", 36, 26, 65, 65],
  ["m_tower", 54, 26, 65, 38],
  ["m_morgue", 11, 28, 37, 47],
  ["m_crematorium", 4, 48, 37, 67],
  ["m_cloister", 64, 42, 88, 60],
  ["m_library", 65, 17, 92, 41],
  ["m_ossuary", 39, 1, 62, 27],
  ["m_cistern", 25, 0, 39, 25],
  ["m_chapel", 3, 3, 25, 28],
  ["m_tower", 42, 20, 49, 27],
];

export function monasteryZones(W: number, H: number): ZoneMap {
  const idx = (id: string): number => MONASTERY_ZONES.findIndex((t) => t.id === id);
  const map = Array.from({ length: H }, () => Array(W).fill(idx("m_courtyard")));
  for (const [id, x0, z0, x1, z1] of BOXES) for (let z = Math.max(0, z0); z <= Math.min(H - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) map[z][x] = idx(id);
  return { map, themes: MONASTERY_ZONES };
}
