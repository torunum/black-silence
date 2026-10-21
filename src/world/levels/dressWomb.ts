import type { Decorator, PlaceOptions } from "../decor/place";
import type { Room } from "../authoring/Plan";

/**
 * LEVEL 8 — THE WOMB, dressed: growths and tumours swelling from the walls, pods, eyes that watch, sinew and drapes of skin hung from
 * the vault, veins over everything; glow bulbs. All through the kit's `Decorator`, all `may`: what a rule refuses is skipped, never forced.
 *
 *  - THE CHAMBER OF THE HEART: tumours along its walls, eyes over them, bulbs at its corners; the floor between its columns is kept
 *    clear (the heart fights there).
 *  - THE GREAT VENTRICLE: tumours on its rim, its middle open (the arena).
 */
export interface WombRooms {
  canal: Room; ventricle: Room; cyst: Room; heart: Room; gut: Room; spine: Room; gland: Room; sac: Room; lung: Room;
}

export function dressWomb(d: Decorator, r: WombRooms): void {
  const { heart, ventricle, sac, lung } = r;
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { d.tryPlace(k, x, z, o); };
  const inside = (...rs: Room[]) => (x: number, z: number): boolean => rs.some((q) => q.contains(x, z));

  // THE CHAMBER OF THE HEART (x 6-21, z 4-15)
  for (const x of [8, 12, 16, 20]) { may("tumor", x, 4, { side: "n" }); may("eye", x + 1, 4, { side: "n" }); }
  for (const x of [7, 11, 15, 19]) may("tumor", x, 15, { side: "s" });
  for (const [x, z] of [[8, 5], [21, 5], [8, 14], [21, 14]]) may("glowbulb", x, z);
  for (const [x, z] of [[14, 30], [20, 34], [27, 31], [30, 17], [41, 22], [43, 6], [4, 30]]) may("bulbDim", x, z);   // glow only, where no light reaches
  d.clutter({ density: .4, seed: 835, kinds: ["vein"], interior: true, where: inside(heart) });   // veins over its floor: flat, walked over
  // THE GREAT VENTRICLE (x 9-21, z 26-36)
  for (const x of [11, 15, 19]) { may("tumor", x, 26, { side: "n" }); may("growth", x + 1, 36, { side: "s" }); }
  may("glowbulb", 15, 31); may("glowbulb", 41, 27);   // the ventricle's, the lung's
  // THE SAC: pods; THE LUNG: drapes and sinew
  d.clutter({ density: .4, seed: 831, kinds: ["pod", "growth"], interior: true, where: inside(sac) });
  d.clutter({ density: .2, seed: 832, kinds: ["drape", "sinew"], interior: true, where: inside(lung) });

  // everything: growths, sinew, drapes, pods, eyes, veins
  d.clutter({ density: .55, seed: 833, where: inside(...Object.values(r)) });
  d.clutter({ density: .14, seed: 834, interior: true, kinds: ["sinew", "drape", "vein"], where: inside(ventricle, heart) });
  d.clutter({ density: .14, seed: 836, interior: true, kinds: ["vein"] });
  for (const z of [12, 15, 18]) may("vein", 42, z);   // the long throat up from the lung to the sac   // and veins underfoot everywhere else: the passages too
}
