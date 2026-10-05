import type * as THREE from "three";
import type { GameState } from "../core/State";
import type { CheckpointLook } from "./decor/checkpoint";

/**
 * THE CHECKPOINTS' STATE (deeper-levels plan, Task 1) — what `src/world/Checkpoints.ts` builds and
 * `src/world/Respawn.ts` reads. A leaf: it imports only types, so the loader, the player's tick, the
 * death screen and the tests can all reach it without a cycle.
 *
 * ## The rule: reload, then replay the facts
 *
 * Dying does not restore a world; it **rebuilds the level** (`loadLevel`, the one path that already
 * cancels every timer, drops every scheduled call, disposes every GPU resource and replaces the scene)
 * and then **re-applies what was recorded when the player reached the shrine**:
 *
 *  - the player: where they stood, which way they faced, health, armour, the red key, every weapon,
 *    magazine and ammunition count, the weapon in hand, and the run's tallies (kills, gibs, secrets,
 *    shots, hits, objects broken);
 *  - the world, as *facts about ids* — `killed` (the spawn-order index of each enemy the level placed that
 *    was dead), `taken` (the index of each item the grid placed that was gone), `opened` (the grid key of
 *    each door that was open), `broken` (the index of each prop that was smashed), `challenge` (whether
 *    the plate had been cleared), and `spawned` (the items the dead had dropped and nobody had taken,
 *    which a fresh load does not have).
 *
 * Ids are indices into the lists `loadLevel` builds from the grid in a fixed scan order, so they mean the
 * same thing on every load of a level. Enemies that are *summoned* (the plate's wave, a priest's
 * helpers) come after the grid's, and are never in `killed`: they belong to a fight, and a fight that was
 * under way at the shrine starts over.
 *
 * **Why not snapshot the world itself.** An enemy holds a three.js sprite, a blob mesh, materials and
 * ~50 fields of AI state timers; a door holds a mesh; every one of them is owned by a scene `loadLevel`
 * disposes. Copying them is copying GPU objects, and putting them back means keeping a scene alive that
 * the leak rules say must be freed. Facts about ids are plain data; a fresh level has fresh sprites,
 * and the replay marks the dead ones gone. What it costs, deliberately: corpses, gore and scorch marks are
 * not kept (a killed enemy is simply not there); an enemy alive at the shrine is alive again where it was
 * *placed*, at full health and asleep, however it had moved or been hurt; a half-won fight (the plate's
 * wave) starts over; and what the dead dropped is kept only if nobody had taken it.
 */

/** One checkpoint marker standing in the level (built from the level's decor list). */
export interface Mark {
  k: string;
  look: CheckpointLook;
  /** The cell's centre, in world units, and the marker's place for the reach test. */
  x: number;
  z: number;
  /** Where each flame stands, in world units. */
  flames: Array<{ x: number; y: number; z: number }>;
  lit: boolean;
  /** The sprites added when it caught; they are in the scene and die with it. */
  sprites: THREE.Sprite[];
}

/** What the player carries. */
export interface Inventory {
  hp: number;
  armor: number;
  key: boolean;
  ammo: GameState["ammo"];
  mag: number[];
  weapons: boolean[];
  cur: number;
  totKills: number;
  totGibs: number;
  totSecrets: number;
}

/** The level's own tallies, which the grade and the stats screen read. */
export interface Tallies { kills: number; gibs: number; secrets: number; shots: number; hitsLanded: number; propsBroken: number }

/** What had happened to the level, by id (see the header). */
export interface Facts {
  killed: number[];
  taken: number[];
  spawned: Array<{ kind: string; x: number; z: number }>;
  opened: string[];
  broken: number[];
  challenge: number;
}

export interface Snapshot {
  /** Which marker caught, and every marker lit by then. */
  mark: number;
  lit: number[];
  at: { x: number; z: number; yaw: number };
  inv: Inventory;
  tallies: Tallies;
  facts: Facts;
}

export const checkpoint = {
  marks: [] as Mark[],
  /** What the last marker recorded, or null: nothing reached since the level was loaded. */
  snap: null as Snapshot | null,
  /** What the player came into the level with (hp 100): what "restart the level" gives back. */
  entry: null as Inventory | null,
  /** How many enemies, items and props the grid placed — the ids below this are the grid's; those above were made during play. */
  base: { enemies: 0, items: 0, props: 0 },
  /** `performance.now()` at the moment of death; the death screen waits on it, and the level's clock leaves out the time spent there. */
  deadAt: 0,
  /** Seconds the markers' glow has pulsed for. */
  pulse: 0,
};
