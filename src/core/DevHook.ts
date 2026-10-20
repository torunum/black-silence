import { player } from "../player/PlayerState";
import { input } from "../player/Input";
import { CELL } from "../world/Grid";
import { floorHeightAt } from "../world/Collision";
import { world } from "../world/WorldState";

/**
 * A developer's hook, only with `#dev` in the address: `window.__bs.tp(x, z, yaw)` stands the player in cell (x, z) facing `yaw`, and
 * `__bs.calm()` puts every monster to sleep — for walking a level's screenshots by script. Absent from a normal page; nothing in the game
 * reads it.
 */
export function devHook(): void {
  if (typeof location === "undefined" || !location.hash.includes("dev")) return;
  (window as unknown as Record<string, unknown>).__bs = {
    tp(x: number, z: number, yaw = 0): void {
      player.px = (x + 0.5) * CELL; player.pz = (z + 0.5) * CELL; player.vx = player.vz = 0;
      player.pyy = floorHeightAt(player.px, player.pz) + 1.6; input.yaw = yaw; input.pitch = 0;
    },
    calm(): void { for (const e of world.enemies) e.dormant = true; },
  };
}
