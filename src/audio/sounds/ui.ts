import { blip, click } from "../Sfx";

/**
 * THE SOUND CATALOGUE — UI. Cues that tell the player something rather than
 * sounding a thing in the world. See `./weapons.ts`'s header for what this
 * catalogue is and how the extraction is proven to be a pure refactor.
 */

/** An achievement toast slides in (`src/ui/Toasts.ts`'s `ach`). */
export function achievementChime(): void { blip(160, .5, "sine", .05, 120, true); }
/** The power kick's cooldown has run out (`weaponTick`). */
export function kickReady(): void { click(.12); }
/** Eight kills without finding the SMG: it is assembled from the dead (`itemsTick`). */
export function scrapSmgAssembled(): void { blip(330,.12,"square",.08); }
