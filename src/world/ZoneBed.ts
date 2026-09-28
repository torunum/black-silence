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
 * again from the roar — unless the player is back within `KEEP` seconds, when
 * the bed carries on where it left off (its timers stood still while he was
 * away), so dancing across the crypt/hell line does not play a 5.6 s swell on
 * every re-entry and stack them. A roar never plays within `ROAR_EVERY`
 * seconds of the last one, whatever the timers say. Timings come from sound's own generator
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

/** Seconds a bed's timers are kept after the player leaves it: back inside this and it carries on, not restarts. */
export const KEEP = 6;

export const bedState = { bed: null as Bed | null, last: null as Bed | null, away: 0, sinceRoar: 1e9,
  roarT: 0, screamT: 0, crackleT: 0, windT: 0 };

/**
 * Every gameplay frame, from `Ambience.ts`, with the bed of the zone the player
 * stands in (or `null`). Returns true while a bed is playing — the stingers
 * are then left silent.
 */
export function bedTick(dt: number, bed: Bed | null, s: BedSounds = CATALOGUE): boolean {
  bedState.sinceRoar += dt;
  if (bed !== bedState.bed) {
    const back = bed !== null && bed === bedState.last && bedState.away <= KEEP;
    bedState.bed = bed;
    if (bed && !back) {
      bedState.roarT = 0; bedState.screamT = soundRnd(3, 8); bedState.crackleT = soundRnd(.3, 1); bedState.windT = soundRnd(.5, 2);
    }
  }
  if (!bed) { bedState.away += dt; return false; }
  bedState.last = bed; bedState.away = 0;
  if (bed === "hell") {
    if ((bedState.roarT -= dt) <= 0) {
      if (bedState.sinceRoar >= ROAR_EVERY) { bedState.roarT += ROAR_EVERY; bedState.sinceRoar = 0; s.hellRoar(); }
      else bedState.roarT = 0;   // too soon after the last swell: wait, without banking a burst
    }
    if ((bedState.screamT -= dt) <= 0) { bedState.screamT = soundRnd(6, 14); s.hellScream(); }
    if ((bedState.crackleT -= dt) <= 0) { bedState.crackleT = soundRnd(.7, 2.2); s.fireCrackle(); }
  } else if ((bedState.windT -= dt) <= 0) { bedState.windT = soundRnd(4.5, 8); s.churchyardWind(); }
  return true;
}
