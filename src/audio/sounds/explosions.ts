import { lv } from "../Levels";
import { play } from "../Layers";
import { BLAST_GLUE as GLUE, explosionDesign } from "../Blast";

/**
 * THE SOUND CATALOGUE — EXPLOSIONS. Player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * All three used to be the one `boom()` (`../Sfx.ts`, kept on the sound
 * board as "old"): a sine thud and a soft noise tail — the reference's
 * "one clean, deep explosion", clean to the point of being polite. Now an
 * explosion is five things, layered and saturated together like a weapon
 * report (`../Layers.ts`):
 *
 * - the **crack**: the shock front, a few milliseconds of bright noise
 *   driven hard;
 * - the **body**: the blast, its corner collapsing from 4 kHz to a few
 *   hundred Hz as it expands;
 * - the **sub**: a frequency-modulated sine falling out of hearing, the
 *   part felt more than heard;
 * - the **debris**: gravel rolling and stones landing around the blast for
 *   the best part of a second, at moments drawn from sound's own dice;
 * - the **tail**: a long low roll of brown noise, swelling and rolling away
 *   over two seconds — and the room answering (each entry in
 *   `../Levels.ts` sends 2.2 times a plain sound's share to the reverb).
 *
 * `power` scales the size: the Afrit bursting (0.8) and the relic
 * detonating (0.7) are smaller and shorter than a barrel (1.1). The master
 * chain's limiter keeps any pile of them under full scale
 * (`docs/sound-levels.md`, "The worst case").
 */

/** An explosive barrel goes up (`src/world/Props.ts`'s `explodeBarrel`). */
export function barrelExplosion(): void { lv("barrelExplosion", () => { play(explosionDesign(1.1), GLUE); }); }
/** A Holy Cross Launcher round detonates (`src/weapons/Hitscan.ts`'s `crossExplode`). */
export function holyCrossExplosion(): void { lv("holyCrossExplosion", () => { play(explosionDesign(0.7), GLUE); }); }
/** An Afrit bursts when it dies (`src/enemies/Death.ts`'s `killEnemy`). */
export function afritDeathExplosion(): void { lv("afritDeathExplosion", () => { play(explosionDesign(0.8), GLUE); }); }
