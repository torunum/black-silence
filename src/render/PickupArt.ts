import type * as THREE from "three";
import { texFromPx } from "../enemies/SpriteBaker";
import { quietly } from "../fx/Quiet";
import { ITEMTEX } from "./ItemTextures";
import { ITEM_ART } from "./pickups/items";
import { GUN_ART } from "./pickups/guns";

/**
 * THE PICKUPS, REDRAWN (owner, 2026-10-20: "can silah mermisi vs simgelerini daha güzel yapalım ... ne oldugu da cok anlasılmıyor.
 * pompalı mermisi vs simgesi hepsinin farklı olsun"). The reference's pickups were 8x8 blocks on a dark square — the shells, the
 * bullets and the nails were the same box in three colours. Each is now its own thing, at 16x16 (the guns 24x24, side-on), outlined so it
 * reads against any floor: a medical kit, a steel breastplate, an open box of pistol rounds, three red shotgun shells with brass heads,
 * two long rifle rounds on a clip, a gold cross, a tin of nails, a burning green skull, three loose sticks of dynamite, the red key —
 * and every weapon by its own silhouette (`w0`..`w8`, by slot), where the reference laid one grey blob for all seven.
 *
 * Drawn over the reference's own textures at the end of `buildItemTex`, under the same keys (so every caller that names a pickup by
 * kind gets the new one) and the same nearest filtering; built `quietly` (`../fx/Quiet.ts`), so the textures' uuids draw nothing from
 * the game's seeded stream. The HUD shows the same icons beside its numbers (`src/ui/HudIcons.ts`).
 *
 * One row per line, a character per pixel; a space is clear. The bevel (lit top-left, shaded bottom-right) is `texFromPx`'s.
 */

export const PICKUP_PAL: Readonly<Record<string, string>> = {
  "A": "#5a7a9a",
  "B": "#7a5a2c",
  "C": "#c8a24a",
  "E": "#ff5030",
  "F": "#ffd060",
  "H": "#c8b088",
  "K": "#484c56",
  "L": "#8ae060",
  "N": "#d0d4dc",
  "R": "#b0201a",
  "S": "#b8bcc4",
  "T": "#a8281a",
  "V": "#e8ffd0",
  "W": "#e8e0cc",
  "Y": "#e8c060",
  "a": "#34506c",
  "b": "#4e3818",
  "c": "#8a6a24",
  "f": "#ff8a2a",
  "h": "#8c7450",
  "k": "#2c2e34",
  "l": "#3c9a2c",
  "n": "#7c8088",
  "o": "#140f0c",
  "r": "#6e1410",
  "s": "#6c7078",
  "t": "#6a160e",
  "w": "#b4ab96",
  "y": "#a8802c",
};

export const PICKUP_ART: Readonly<Record<string, readonly string[]>> = { ...ITEM_ART, ...GUN_ART };

/** Paints every pickup over the reference's, and the weapon icons (`w0`..`w8`, by slot). */
export function paintPickups(): void {
  for (const [k, rows] of Object.entries(PICKUP_ART)) ITEMTEX[k] = quietly((): THREE.CanvasTexture => texFromPx([...rows], PICKUP_PAL as Record<string, string>));
}
