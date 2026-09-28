import type * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { DRESSTEX, type DressKey } from "../render/DressTextures";
import { bandTheme, type BandTheme } from "../render/BandTextures";
import { world } from "./WorldState";
import type { ZoneTheme } from "./LevelBuilder";

/**
 * WHAT A CELL LOOKS LIKE — the read side of level zones (player feedback
 * round 2, the prologue plan, Task 1).
 *
 * Before zones a level had one look, chosen by `loadLevel` from its
 * `LevelDef`'s three flags with a row of nested ternaries (`hell ? … : flesh
 * ? … : dungeon ? … : church`). Those ternaries live here now, as
 * `themeTex`, so a zone and a whole level pick their textures by one rule
 * and cannot drift apart; `loadLevel`, `LevelMeshes.ts`, `Ceiling.ts` and
 * `Trim.ts` all ask this file.
 *
 * A level with no `zones` answers `null` from `zoneThemeAt` everywhere, and
 * every caller falls back to the level's own definition — which is the whole
 * of how the seven unzoned levels stay byte-identical: they take the same
 * textures from the same rule they always did.
 *
 * Pure lookups only. The live half — fog, light, reverb and ADEM's line as
 * the player crosses from one zone into another — is `Zones.ts`, kept apart
 * so the geometry builders importing this file do not pull in audio and UI.
 */

/** The theme flags every look is chosen from — a `LevelDef` and a `ZoneTheme` both have them. */
export interface ThemeFlags { hell?: boolean; flesh?: boolean; dungeon?: boolean; side?: string; ground?: string }

/** The textures a theme wears. `side` is a raised platform's side faces. */
export interface ThemeTex {
  wall: THREE.CanvasTexture;
  floor: THREE.CanvasTexture;
  ceil: THREE.CanvasTexture;
  side: THREE.CanvasTexture;
}

/** A named texture: `TEX`'s (the reference's) or, for the prologue's own surfaces, `DRESSTEX`'s. */
export function namedTex(key: string): THREE.CanvasTexture {
  const t = TEX[key] || DRESSTEX[key as DressKey];
  if (!t) throw new Error("no texture called " + key + " in TEX or DRESSTEX");
  return t;
}

/**
 * `loadLevel`'s own choice, moved here verbatim: hell, then flesh, then dungeon, else church — and a
 * zone's `ground`/`side` keys where it names its own (the churchyard's earth, the prologue plan's Task 3).
 */
export function themeTex(t: ThemeFlags): ThemeTex {
  const hell = t.hell, flesh = t.flesh, dungeon = t.dungeon;
  return {
    wall: hell ? TEX.hellWall : flesh ? TEX.fleshWall : (dungeon ? TEX.dungeonWall : TEX.churchWall),
    floor: t.ground ? namedTex(t.ground) : hell ? TEX.hellFloor : flesh ? TEX.fleshFloor : (dungeon ? TEX.dungeonFloor : TEX.churchFloor),
    ceil: hell ? TEX.hellCeil : flesh ? TEX.fleshCeil : TEX.ceil,
    side: t.side ? namedTex(t.side) : hell ? TEX.stair : flesh ? TEX.fleshWall : TEX.stair,
  };
}

/** What makes two looks' floors differ: the wall theme, and a ground of their own. With `side`, their raised ground's too. */
export function surfaceKey(t: ThemeFlags, withSide = false): string {
  return themeKey(t) + (t.ground ? "|" + t.ground : "") + (withSide ? (t.side || "") : "");
}

/** The four looks, by the same order of tests — also the trim band's key (`BandTextures.ts`). */
export function themeKey(t: ThemeFlags): BandTheme {
  return bandTheme(t);
}

/** The zone a cell belongs to, or `null` on a level with no zones (or off the map). */
export function zoneThemeAt(x: number, z: number): ZoneTheme | null {
  const zs = world.zones;
  if (!zs) return null;
  const i = zs.map[z] && zs.map[z][x];
  return i === undefined ? null : zs.themes[i] || null;
}

/** The look of a cell: its zone's, else the level's own. */
export function lookAt(x: number, z: number, level: ThemeFlags): ThemeFlags {
  return zoneThemeAt(x, z) || level;
}

/** True where a zone asked for open sky — no ceiling is built over the cell. */
export function skyAt(x: number, z: number): boolean {
  const t = zoneThemeAt(x, z);
  return !!(t && t.sky);
}
