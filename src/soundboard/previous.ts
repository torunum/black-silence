import { OLD_FIRE, oldDryFire, oldReload, oldShotgunPump, oldWeaponLower, oldWeaponRaise } from "./previous/weapons";
import * as OM from "./previous/monsters";
import { ENEMY_DEFS } from "../enemies/EnemyDefs";

/**
 * THE OLD VERSIONS — the sound board's "old" button for every sound a task
 * has replaced. Player feedback round 2 (`docs/superpowers/plans/2026-09-26-
 * player-feedback-2-sound.md`): the owner judges by ear, so each rebuilt
 * sound is heard beside the one it replaced.
 *
 * **Task 3 registered the weapons, Task 4 the monsters' voices** (below). Task 1 replaced no sound. Task 2 changed
 * how *every* sound comes out — the room, the master chain, the level trims
 * — without touching any sound's own synthesis, so its "old" is one global
 * switch rather than 111 rows: the board's **Old mix / New mix** toggle
 * (`./previous/mix.ts`, the reference's graph, no trims). "Old mix" plus a
 * row's own "old" button is the whole pre-round-2 sound. A task that
 * changes a sound's own synthesis does this before changing it:
 *
 * 1. Copy the sound's function, as it stands, into a file in
 *    `src/soundboard/previous/` (for example `previous/weapons.ts` for
 *    `shotgunFire`). Copy anything it calls that the same task is about to
 *    change too. Import only engine pieces the task leaves alone. (The mix
 *    is not one of them to copy: the toggle above already plays any row
 *    through the old one.)
 * 2. Register the copy below under the row's `id` from `./registry.ts`
 *    (`"weapon-fire-1"` is the shotgun).
 * 3. Then change the real function in `src/audio/`. The board now shows
 *    **old** and **new** on that row; "new" is the game's own code.
 *
 * The game never imports this file or anything in `src/soundboard/` —
 * `tests/soundboard/soundboard.test.ts` fails if it does — so old versions
 * cost the game nothing and can be kept as long as they are useful.
 */
export const PREVIOUS: Readonly<Record<string, () => void>> = {
  // Task 3 — the weapons (./previous/weapons.ts): all eight reports, the
  // switch, the dry click, the pump, and each weapon's reload as it was.
  ...Object.fromEntries(OLD_FIRE.map((play, slot) => [`weapon-fire-${slot}`, play])),
  "weapon-lower": oldWeaponLower,
  "weapon-raise": oldWeaponRaise,
  "dry-fire": oldDryFire,
  "shotgun-pump": oldShotgunPump,
  ...Object.fromEntries(OLD_FIRE.map((_p, slot) => [`reload-${slot}`, () => oldReload(slot)])),
  // Task 4 — the monsters (./previous/monsters.ts): per enemy, what it used to
  // make — its snarl or the generic moan, the yelp and death cry pitched from
  // its pain stat, the claw's sawtooth blip — and the swept blips and growls
  // of the lunge, the charge, the wind-up, the scream, the orbs and the bosses.
  ...Object.fromEntries(Object.entries(ENEMY_DEFS).flatMap(([k, d]) => {
    const rows: Array<[string, () => void]> = [
      [`monster-alert-${k}`, () => OM.oldMonsterAlert(k)],
      [`monster-pain-${k}`, () => OM.oldMonsterPain(d.pain)],
      d.boss ? [`boss-dies-${k}`, OM.oldBossDies] : [`monster-death-${k}`, () => OM.oldMonsterDeath(d.pain)],
    ];
    if (!d.priest) rows.push([`monster-attack-${k}`, OM.oldMonsterClaw]);
    if (d.fling) rows.push([`flesh-throw-${k}`, OM.oldFleshThrow]);
    if (d.slam) rows.push([`slam-windup-${k}`, OM.oldSlamWindup]);
    if (d.boss) rows.push([`boss-wakes-${k}`, OM.oldBossWakes], [`boss-roar-${k}`, OM.oldBossRoar]);
    if (d.priest) rows.push([`priest-summons-${k}`, OM.oldPriestSummons]);
    return rows;
  })),
  "orb-normal": () => OM.oldOrbLaunch("normal"),
  "orb-heavy": () => OM.oldOrbLaunch("heavy"),
  "orb-toxic": () => OM.oldOrbLaunch("toxic"),
  "screamer": OM.oldScreamerCall,
  "lost-soul-charge": OM.oldLostSoulCharge,
  "hound-lunge": OM.oldHoundLunge,
};
