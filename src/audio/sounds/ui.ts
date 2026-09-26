import { blip, click } from "../Sfx";
import { lv } from "../Levels";

/**
 * THE SOUND CATALOGUE — UI. Cues that tell the player something rather than
 * sounding a thing in the world. See `./weapons.ts`'s header for what this
 * catalogue is and how the extraction is proven to be a pure refactor.
 */

/** An achievement toast slides in (`src/ui/Toasts.ts`'s `ach`). */
export function achievementChime(): void { lv("achievementChime", () => { blip(160, .5, "sine", .05, 120, true); }); }
/** The power kick's cooldown has run out (`weaponTick`). */
export function kickReady(): void { lv("kickReady", () => { click(.12); }); }
/** Eight kills without finding the SMG: it is assembled from the dead (`itemsTick`). */
export function scrapSmgAssembled(): void { lv("scrapSmgAssembled", () => { blip(330,.12,"square",.08); }); }
