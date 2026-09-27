import { currentRoom } from "./AudioEngine";
import { roomFor, type LevelTheme, type RoomName } from "./Room";

/**
 * WHAT THE FLOOR AND THE WALLS ARE MADE OF — player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`): "footsteps,
 * surface-aware if the level theme allows". It does: every level carries a
 * theme (`src/world/levels/index.ts`'s `hell`/`flesh`/`dungeon` flags and its
 * `sub`), and `loadLevel` already hands it to the audio engine as the level's
 * room (`./Room.ts`'s `roomFor`, `setRoom`). So a step asks the room the
 * game is in what it is walking on — no new wiring into the level loader.
 *
 * | Level | Theme | Room | Floor | Walls |
 * |---|---|---|---|---|
 * | Prologue | hell | hell | ash (crunchy, dry) | stone |
 * | 1 the dungeon | dungeon | stone hall | marble (the reference's own "marble floor" on level 1) | stone |
 * | 2 the church, 3 the necropolis | church, necropolis | stone hall | stone | stone |
 * | 4 the graveyard | graveyard | open air | dirt and grass | stone |
 * | 5 the sewers | sewers | tunnel | water | stone |
 * | 6 the factory | factory | metal hall | metal grating | metal |
 * | 7 the womb | flesh | flesh | flesh (wet) | flesh |
 *
 * Marble is the one surface the room cannot tell: the dungeon, the church
 * and the necropolis share the stone hall. The game has always told level 1
 * apart itself (`src/player/Player.ts`'s `footstep` passes `S.level===1`,
 * the reference's `marble`), and still does.
 */

export type Surface = "stone" | "marble" | "ash" | "flesh" | "metal" | "water" | "dirt";
export const SURFACES: readonly Surface[] = ["stone", "marble", "ash", "flesh", "metal", "water", "dirt"];

/** What a bullet finds when it hits a wall. */
export type WallMaterial = "stone" | "metal" | "flesh";
export const WALL_MATERIALS: readonly WallMaterial[] = ["stone", "metal", "flesh"];

const FLOOR: Readonly<Record<RoomName, Surface>> = {
  hall: "stone", hell: "ash", flesh: "flesh", graveyard: "dirt", sewer: "water", factory: "metal",
};

/** The floor of a level with this theme. */
export function surfaceFor(theme: LevelTheme): Surface {
  return theme.dungeon ? "marble" : FLOOR[roomFor(theme)];
}

/** The floor of the level the game is in now — its room, and whether it is level 1's marble. */
export function surfaceHere(marble: boolean): Surface {
  const room = currentRoom().wanted;
  return room === "hall" && marble ? "marble" : FLOOR[room];
}

/** The walls of the level the game is in now. */
export function wallHere(): WallMaterial {
  const room = currentRoom().wanted;
  return room === "factory" ? "metal" : room === "flesh" ? "flesh" : "stone";
}
