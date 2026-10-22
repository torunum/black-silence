import type { ZoneMap, ZoneTheme } from "../LevelBuilder";

/** The village's regions, each with its own look and light; the open ones under the sky. Later boxes win. */
export const VILLAGE_ZONES: ZoneTheme[] = [
  { id: "v_outdoor", dungeon: true, sub: "graveyard", sky: true, ground: "yardEarth", side: "graveEarth", bed: "yard", fog: 0x0b1018, fogD: .032, amb: 0x5e6e8c, ambI: .8 },
  { id: "v_house", sub: "church", fog: 0x0d0a08, fogD: .045, amb: 0x6a5242, ambI: .6 },
  { id: "v_cellar", sub: "crypt", fog: 0x0a0909, fogD: .06, amb: 0x4a403c, ambI: .48 },
  { id: "v_barn", dungeon: true, sub: "dungeon", fog: 0x0c0a08, fogD: .045, amb: 0x5a4a3a, ambI: .55 },
  { id: "v_undertaker", sub: "crypt", fog: 0x09090b, fogD: .055, amb: 0x463e48, ambI: .5 },
  { id: "v_burned", dungeon: true, sub: "dungeon", sky: true, ground: "yardEarth", side: "graveEarth", bed: "yard", fog: 0x120c0a, fogD: .04, amb: 0x6a4a3a, ambI: .7 },
  { id: "v_smithy", dungeon: true, sub: "factory", fog: 0x120a06, fogD: .05, amb: 0x6a3a22, ambI: .62 },
  { id: "v_graveyard", dungeon: true, sub: "graveyard", sky: true, line: "vil_grave", ground: "yardEarth", side: "graveEarth", bed: "yard", fog: 0x0a0e16, fogD: .04, amb: 0x5a6a88, ambI: .72 },
  { id: "v_field", dungeon: true, sub: "graveyard", sky: true, line: "vil_field", ground: "yardEarth", side: "graveEarth", bed: "yard", fog: 0x0b1018, fogD: .036, amb: 0x5e6e8c, ambI: .78 },
  { id: "v_barnhall", dungeon: true, sub: "dungeon", line: "vil_barn", fog: 0x0c0a08, fogD: .045, amb: 0x5a4a3a, ambI: .55 },
];

const BOXES: ReadonlyArray<readonly [string, number, number, number, number]> = [
  ["v_graveyard", 23, 45, 48, 62],
  ["v_house", 13, 4, 25, 15],      // the inn
  ["v_cellar", 14, 0, 21, 4],      // its wine cellar
  ["v_house", 46, 4, 56, 13],      // the store
  ["v_cellar", 56, 3, 69, 12],     // the store's cellar, the stair down to it
  ["v_cellar", 60, 12, 62, 19],    // the tunnel up
  ["v_barn", 58, 15, 69, 32],      // the mill and the miller's hoard
  ["v_undertaker", 21, 21, 31, 32],
  ["v_burned", 21, 32, 31, 41],
  ["v_smithy", 40, 21, 49, 29],
  ["v_house", 40, 32, 49, 40],     // the cottage
  ["v_field", 2, 16, 19, 44],      // the cornfield
  ["v_barnhall", 2, 45, 18, 60],   // the barn
];

export function villageZones(W: number, H: number): ZoneMap {
  const idx = (id: string): number => VILLAGE_ZONES.findIndex((t) => t.id === id);
  const map = Array.from({ length: H }, () => Array(W).fill(idx("v_outdoor")));
  for (const [id, x0, z0, x1, z1] of BOXES) for (let z = Math.max(0, z0); z <= Math.min(H - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) map[z][x] = idx(id);
  return { map, themes: VILLAGE_ZONES };
}
