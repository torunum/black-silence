import type { BuiltLevel } from "../LevelBuilder";
import type { DoorStyle } from "../DoorKit";
import { buildPrologue } from "./prologue";
import { buildLevel1 } from "./level1";
import { buildLevel2 } from "./level2";
import { buildLevel3 } from "./level3";
import { buildLevel4 } from "./level4";
import { buildLevel5 } from "./level5";
import { buildLevel6 } from "./level6";
import { buildLevel7 } from "./level7";
import { buildCathedral } from "./cathedral";
import { buildMonastery } from "./monastery";
import { buildVillage } from "./village";

/**
 * The nine level tables (the bone cathedral, index 7, was added 2026-10-20 between the factory and the womb). Grid characters (also used by LevelBuilder.ts's
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
  /**
   * A way out that is not the theme's door (owner, 2026-10-20: the dungeon ends down a well on a rope). The levels run into each other:
   * the prologue climbs a ladder out of hell and the monastery begins coming up through its crypt's floor; the monastery ends at its great
   * gate and the dungeon begins coming in through it; the dungeon goes down its well and the church begins at the well's bottom.
   */
  exitStyle?: DoorStyle;
  /** A way in that is not the theme's door (the church begins at the well's bottom). */
  entranceStyle?: DoorStyle;
}

export const LEVELS: LevelDef[] = [
 {name:"PROLOGUE — OUT OF THE PIT",build:buildPrologue,
  fog:0x180604,fogD:.07,amb:0x6e2a14,ambI:.6,floor:"hell",sub:"hell",hell:true,exitStyle:"ladder"},   // up a ladder out of hell, into the monastery's crypt (2026-10-21)
 {name:"LEVEL 1 — THE GOTHIC DUNGEON",build:buildLevel1,
  fog:0x07080b,fogD:.05,amb:0x3a4250,ambI:.5,floor:"dungeon",sub:"dungeon",dungeon:true,exitStyle:"well",entranceStyle:"gate"},
 {name:"LEVEL 2 — THE ABANDONED CHURCH",build:buildLevel2,
  fog:0x0b070d,fogD:.042,amb:0x453a50,ambI:.5,floor:"church",sub:"church",entranceStyle:"rope"},
 {name:"LEVEL 3 — THE NECROPOLIS",build:buildLevel3,
  fog:0x0a0a07,fogD:.046,amb:0x4a4636,ambI:.46,floor:"church",sub:"necropolis",entranceStyle:"cemetery"},   // in through the village's cemetery gate (2026-10-21)
 {name:"LEVEL 4 — THE GRAVEYARD",build:buildLevel4,
  fog:0x10120e,fogD:.04,amb:0x3e463a,ambI:.52,floor:"dungeon",sub:"graveyard"},
 {name:"LEVEL 5 — THE SEWERS",build:buildLevel5,
  fog:0x0a0e0a,fogD:.055,amb:0x36443a,ambI:.44,floor:"church",sub:"sewers"},
 {name:"LEVEL 6 — THE FACTORY",build:buildLevel6,
  fog:0x0c0a08,fogD:.05,amb:0x4a4038,ambI:.5,floor:"dungeon",sub:"factory"},
 {name:"LEVEL 7 — THE BONE CATHEDRAL",build:buildCathedral,   // new (owner, 2026-10-20): ./cathedral.ts
  fog:0x0e0c0a,fogD:.045,amb:0x5a5046,ambI:.5,floor:"church",sub:"necropolis"},
 {name:"LEVEL 8 — THE WOMB",build:buildLevel7,
  fog:0x1a0606,fogD:.06,amb:0x6e2a28,ambI:.5,floor:"flesh",sub:"womb",flesh:true},
 {name:"LEVEL 1 — THE ASH BELL MONASTERY",build:buildMonastery,   // new (owner, 2026-10-20): ./monastery.ts — played straight after the prologue (PLAY_ORDER)
  fog:0x0d1016,fogD:.04,amb:0x5a6680,ambI:.6,floor:"church",sub:"church",entranceStyle:"hatch",exitStyle:"gate"},
 {name:"LEVEL 4 — THE HOLLOW VILLAGE",build:buildVillage,   // new (owner, 2026-10-21: "açık havada geçen, Blood tarzı bölümler"): ./village.ts — out of the church, played after it
  fog:0x0b1018,fogD:.032,amb:0x5e6e8c,ambI:.8,floor:"dungeon",sub:"graveyard",dungeon:true,entranceStyle:"church",exitStyle:"cemetery"},
];

/**
 * The order the levels are PLAYED in, by index (owner, 2026-10-20: the monastery "prologue sonrası ilk bölüm olsun"). The monastery is
 * appended to `LEVELS` (index 9) so every other level keeps its index — the traces, the tests and the saved games all name levels by
 * index — and is played second. A level's shown number is its place here (`titleOf`); `save.maxLevel` counts places, not indices.
 */
export const PLAY_ORDER: readonly number[] = [0, 9, 1, 2, 10, 3, 4, 5, 6, 7, 8];   // 10, the hollow village (2026-10-21), after the church it lies round
/** Where level `i` is played (0 = the prologue), or -1. */
export function playPos(i: number): number { return PLAY_ORDER.indexOf(i); }
/** The level played after `i`, or -1 after the last. */
export function nextLevel(i: number): number { const p = playPos(i); return p >= 0 && p + 1 < PLAY_ORDER.length ? PLAY_ORDER[p + 1] : -1; }
/** The level's name as shown, numbered by where it is played. */
export function titleOf(i: number): string {
  const n = LEVELS[i]?.name ?? "", p = playPos(i);
  return p > 0 ? n.replace(/^LEVEL \d+/, "LEVEL " + p) : n;
}
