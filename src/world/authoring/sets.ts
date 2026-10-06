import type { Decorator } from "../decor/place";
import type { Theme } from "../decor/kit";

/**
 * NAMED SET-PIECES — the dressing a room is given as a whole, by name (deeper-levels plan, Task 2). Each is the
 * hand-dressing the dress files (`levels/dress*.ts`) do again and again — an altar under its banners, a torture
 * hall's racks and cages, a store's crate piles — written once over a room's rectangle and placed through the
 * kit's own `Decorator`, so every placement rule (`decor/place.ts`) holds.
 *
 * A set-piece asks for what fits and skips what does not (`tryPlace`), because a room's size and doors differ; it
 * returns how many pieces went in, and `LevelPlan.set` throws if the answer is none, so a set-piece that fits nowhere
 * is an error at the author's desk and not an empty room in the game. A level that wants something else uses
 * `LevelPlan.dress` and the `Decorator` directly.
 */

export interface Rect { x0: number; z0: number; x1: number; z1: number }
export type SetPiece = (d: Decorator, r: Rect, theme: Theme) => number;

const ok = (e: string | null): number => (e === null ? 1 : 0);
const mid = (a: number, b: number): number => Math.floor((a + b) / 2);

/** An altar on the north wall under a row of banners, a candelabrum in each corner. */
const chancel: SetPiece = (d, r) => {
  let n = ok(d.tryPlace("altar", mid(r.x0, r.x1), r.z0, { side: "n" }));
  for (let x = r.x0 + 1; x < r.x1; x += 2) if (Math.abs(x - mid(r.x0, r.x1)) > 1) n += ok(d.tryPlace("banner", x, r.z0, { side: "n" }));
  n += ok(d.tryPlace("candelabra", r.x0 + 1, r.z0 + 1)) + ok(d.tryPlace("candelabra", r.x1 - 1, r.z0 + 1));
  return n;
};

/** Racks and stocks on the north wall, maidens on the south wall, cages on chains over the floor. */
const torture: SetPiece = (d, r) => {
  let n = 0;
  for (let x = r.x0 + 1; x <= r.x1 - 1; x += 3) n += ok(d.tryPlace(x % 2 ? "rack" : "stocks", x, r.z0, { side: "n" })) + ok(d.tryPlace("maiden", x + 1, r.z1, { side: "s" }));
  for (let z = r.z0 + 2; z <= r.z1 - 2; z += 3) for (let x = r.x0 + 2; x <= r.x1 - 2; x += 4) n += ok(d.tryPlace("cage", x, z));
  return n;
};

/** Crate piles against the walls, a bench by the door. */
const store: SetPiece = (d, r) => {
  let n = 0;
  for (let x = r.x0; x <= r.x1; x += 3) n += ok(d.tryPlace("cratepile", x, r.z0, { side: "n" })) + ok(d.tryPlace("cratepile", x, r.z1, { side: "s" }));
  return n;
};

/** A brazier (glow only, no light) at each corner of the room. */
const braziers: SetPiece = (d, r) =>
  ok(d.tryPlace("brazier", r.x0, r.z0)) + ok(d.tryPlace("brazier", r.x1, r.z0)) + ok(d.tryPlace("brazier", r.x0, r.z1)) + ok(d.tryPlace("brazier", r.x1, r.z1));

/** Urns and niches along the north wall, skull piles in the corners. */
const ossuary: SetPiece = (d, r) => {
  let n = 0;
  for (let x = r.x0; x <= r.x1; x += 2) n += ok(d.tryPlace(x % 4 ? "niche" : "urn", x, r.z0, { side: "n" }));
  n += ok(d.tryPlace("skullpile", r.x0, r.z1, { side: "s" })) + ok(d.tryPlace("skullpile", r.x1, r.z1, { side: "s" }));
  return n;
};

export const SET_PIECES: Readonly<Record<string, SetPiece>> = { chancel, torture, store, braziers, ossuary };
