import { ITEMTEX } from "../render/ItemTextures";

/**
 * The HUD's icons (owner, 2026-10-20): the same pictures as the pickups (`src/render/PickupArt.ts`) beside the numbers — the medical
 * kit by HEALTH, the breastplate by ARMOR, the current weapon's own ammunition by AMMO (pistol rounds, red shells, rifle rounds, a
 * cross, nails, a soul, dynamite, stakes), and the weapon itself over its name. Drawn only when what they show changes. A no-op where the
 * canvases or the textures are missing (the tests' DOM, a call before the pickups are painted).
 */

const shown: Record<string, string> = {};

function paint(id: string, key: string): void {
  if (shown[id] === key) return;
  const c = document.getElementById(id) as HTMLCanvasElement | null;
  const tex = ITEMTEX[key];
  const img = tex && !Array.isArray(tex) ? (tex.image as CanvasImageSource | undefined) : undefined;
  const g = c?.getContext?.("2d");
  if (!c || !g || !img) return;
  shown[id] = key;
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, c.width, c.height);
}

/** Brings the four icons up to date: the slot equipped and its ammunition. */
export function hudIcons(slot: number, ammo: string): void {
  paint("icoHp", "health");
  paint("icoAr", "armor");
  paint("icoAm", ammo);
  paint("icoW", "w" + slot);
}

/** Forgets what was drawn (the textures were rebuilt). */
export function resetHudIcons(): void {
  for (const k of Object.keys(shown)) delete shown[k];
}
