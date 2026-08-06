import type { BuiltLevel } from "../LevelBuilder";
import { buildPrologue } from "./prologue";
import { buildLevel1 } from "./level1";
import { buildLevel2 } from "./level2";
import { buildLevel3 } from "./level3";
import { buildLevel4 } from "./level4";
import { buildLevel5 } from "./level5";
import { buildLevel6 } from "./level6";
import { buildLevel7 } from "./level7";

/**
 * The eight level tables. Grid characters (also used by LevelBuilder.ts's
 * carving helpers):
 *   chars: # wall · I pillar · W window-wall · . floor
 *   + door · D locked · S secret
 *   P spawn · K key · X exit pad
 *   enemies z f g m t w s B · bosses E U Q
 *   pickups h A a b o c · weapons 2 3 4 5 6
 *   props x crate · T table · C chair · F shelf · V pew · O ex-barrel
 *   ambient i torch · l candles · p piano · Y challenge plate
 * Moved verbatim from the "LEVEL BUILDER (pure — validated offline)" banner
 * that used to precede these level tables in legacy.js.
 */
export interface LevelDef {
  name: string;
  build: () => BuiltLevel;
  /** Scene fog colour, hex. */
  fog: number;
  /** FogExp2 density. */
  fogD: number;
  /** Ambient light colour, hex. */
  amb: number;
  /** Ambient light intensity. */
  ambI: number;
  floor: string;
  sub: string;
  hell?: boolean;
  dungeon?: boolean;
  flesh?: boolean;
}

export const LEVELS: LevelDef[] = [
 {name:"PROLOGUE — OUT OF THE PIT",build:buildPrologue,
  fog:0x180604,fogD:.07,amb:0x6e2a14,ambI:.6,floor:"hell",sub:"hell",hell:true},
 {name:"LEVEL 1 — THE GOTHIC DUNGEON",build:buildLevel1,
  fog:0x07080b,fogD:.05,amb:0x3a4250,ambI:.5,floor:"dungeon",sub:"dungeon",dungeon:true},
 {name:"LEVEL 2 — THE ABANDONED CHURCH",build:buildLevel2,
  fog:0x0b070d,fogD:.042,amb:0x453a50,ambI:.5,floor:"church",sub:"church"},
 {name:"LEVEL 3 — THE NECROPOLIS",build:buildLevel3,
  fog:0x0a0a07,fogD:.046,amb:0x4a4636,ambI:.46,floor:"church",sub:"necropolis"},
 {name:"LEVEL 4 — THE GRAVEYARD",build:buildLevel4,
  fog:0x10120e,fogD:.04,amb:0x3e463a,ambI:.52,floor:"dungeon",sub:"graveyard"},
 {name:"LEVEL 5 — THE SEWERS",build:buildLevel5,
  fog:0x0a0e0a,fogD:.055,amb:0x36443a,ambI:.44,floor:"church",sub:"sewers"},
 {name:"LEVEL 6 — THE FACTORY",build:buildLevel6,
  fog:0x0c0a08,fogD:.05,amb:0x4a4038,ambI:.5,floor:"dungeon",sub:"factory"},
 {name:"LEVEL 7 — THE WOMB",build:buildLevel7,
  fog:0x1a0606,fogD:.06,amb:0x6e2a28,ambI:.5,floor:"flesh",sub:"womb",flesh:true},
];
