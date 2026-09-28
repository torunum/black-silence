import { hellRoar, hellScream, fireCrackle, churchyardWind } from "../audio/sounds/hell";
import { soundRnd } from "../audio/SoundRandom";

/**
 * A ZONE'S ROOM TONE — what a region of a level sounds like standing still
 * (the prologue plan's Task 3). The existing ambience (`Ambience.ts`'s
 * `ambience`) plays one of four random stingers every 8-18 seconds on
 * every level — a distant scream, machinery, static, a drip — which in a
 * churchyard or in hell is the wrong room. A zone that names a `bed`
 * (`ZoneTheme.bed`, `LevelBuilder.ts`) gets its own instead, for as long as
 * the player stands in it:
 *
 * - **hell** — the cavern's roar, a swell every 3.6 s that overlaps the last
 *   into one breathing roar (`hellRoar`), a distant scream every 6-14 s, the
 *   pit crackling every 0.7-2.2 s;
 * - **yard** — the wind over the churchyard, a gust every 4.5-8 s.
 *
 * Walking out of a zone stops its bed on that frame: nothing is scheduled
 * ahead, so the last swell dies away by itself. Walking back in starts it
 * again from the roar. Timings come from sound's own generator
 * (`soundRnd`), never `Math.random`, so the traces' seeded stream is not
 * touched; on a level with no zones `bedTick` is handed `null` and plays
 * nothing, and the stingers run exactly as before.
 */

export type Bed = "hell" | "yard";

/** The sounds a bed plays — the catalogue's, or a test's recorder. */
export interface BedSounds { hellRoar(): void; hellScream(): void; fireCrackle(): void; churchyardWind(): void }
const CATALOGUE: BedSounds = { hellRoar, hellScream, fireCrackle, churchyardWind };

/** Seconds between the roar's swells: less than one swell's 5.6 s, so they overlap. */
export const ROAR_EVERY = 3.6;

export const bedState = { bed: null as Bed | null, roarT: 0, screamT: 0, crackleT: 0, windT: 0 };

/**
 * Every gameplay frame, from `Ambience.ts`, with the bed of the zone the player
 * stands in (or `null`). Returns true while a bed is playing — the stingers
 * are then left silent.
 */
export function bedTick(dt: number, bed: Bed | null, s: BedSounds = CATALOGUE): boolean {
  if (bed !== bedState.bed) {
    bedState.bed = bed;
    bedState.roarT = 0; bedState.screamT = soundRnd(3, 8); bedState.crackleT = soundRnd(.3, 1); bedState.windT = soundRnd(.5, 2);
  }
  if (!bed) return false;
  if (bed === "hell") {
    if ((bedState.roarT -= dt) <= 0) { bedState.roarT += ROAR_EVERY; s.hellRoar(); }
    if ((bedState.screamT -= dt) <= 0) { bedState.screamT = soundRnd(6, 14); s.hellScream(); }
    if ((bedState.crackleT -= dt) <= 0) { bedState.crackleT = soundRnd(.7, 2.2); s.fireCrackle(); }
  } else if ((bedState.windT -= dt) <= 0) { bedState.windT = soundRnd(4.5, 8); s.churchyardWind(); }
  return true;
}
