import { ceilHeightAt } from "../world/Collision";

/**
 * WHERE A FLIER HANGS (KNOWN-15, closed 2026-10-21): the height of a monster's sprite centre. One that walks stands on its floor
 * (`h/2` over it); one that flies (`fly`) hangs `flyH` over the floor under it — a raised gallery lifts it, as it lifts a walker —
 * but never so high that its top goes through the ceiling, and never lower than standing. Everything that asks where a monster's
 * body is (the hitscan, the muzzle of its orb, the sprite) asks this, so what is drawn and what is hit cannot drift apart.
 */

export interface Hoverer { x: number; z: number; h: number; fy?: number; fly?: boolean; flyH?: number }

export function hoverY(e: Hoverer): number {
  const fy = e.fy || 0, stand = fy + e.h * 0.5;
  if (!e.fly) return stand;
  const top = ceilHeightAt(e.x, e.z) - e.h * 0.5 - 0.05;
  return Math.max(stand, Math.min(fy + (e.flyH || 1.5), top));
}

/** How far a flier hangs over where it would stand: what its falling corpse comes down from. */
export function hoverLift(e: Hoverer): number { return e.fly ? hoverY(e) - ((e.fy || 0) + e.h * 0.5) : 0; }
