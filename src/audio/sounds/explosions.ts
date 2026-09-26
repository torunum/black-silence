import { boom } from "../Sfx";
import { lv } from "../Levels";

/**
 * THE SOUND CATALOGUE — EXPLOSIONS. All three are the one `boom()` at a
 * different power. See `./weapons.ts`'s header for what this catalogue is
 * and how the extraction is proven to be a pure refactor.
 */

/** An explosive barrel goes up (`src/world/Props.ts`'s `explodeBarrel`). */
export function barrelExplosion(): void { lv("barrelExplosion", () => { boom(1.1); }); }
/** A Holy Cross Launcher round detonates (`src/weapons/Hitscan.ts`'s `crossExplode`). */
export function holyCrossExplosion(): void { lv("holyCrossExplosion", () => { boom(.7); }); }
/** An Afrit bursts when it dies (`src/enemies/Death.ts`'s `killEnemy`). */
export function afritDeathExplosion(): void { lv("afritDeathExplosion", () => { boom(.8); }); }
