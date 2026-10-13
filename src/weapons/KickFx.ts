import { addHitPunch, addWhiffPunch } from "../fx/ViewPunch";
import { bloodFx, chipFx, dustFx } from "../fx/ImpactFx";
import { screenShake, shake } from "../fx/ShakeState";
import { at } from "../audio/AudioEngine";
import { kickSlamFlesh, kickSlamStone, kickWhiff } from "../audio/sounds/kick";
import { player } from "../player/PlayerState";
import { EYE } from "../world/Grid";

/**
 * WHAT THE KICK DOES TO THE SCREEN AND THE AIR WHEN IT LANDS, OR DOESN'T —
 * `docs/superpowers/plans/2026-10-08-impact.md`, Task 2. `doKick`
 * (`WeaponState.ts`) resolves the hit as it always has, 110 ms after the
 * swing, and says what the boot met; this makes it read:
 *
 * - **a body**: dust off the boot, a spray of blood along the kick, a meaty
 *   slam under `kickImpact`'s thud. The hit-stop, the punch and the white
 *   flash come from the body being hit (`damageEnemy` -> `HitFeel`, the
 *   kick's row), once for every body.
 * - **a wall, a crate, a barrel, a head**: the same boot, without a body to
 *   report it — so the stop and the punch are made here — with dust and
 *   chips, and a stone slam.
 * - **nothing**: the leg goes through the air and the body goes after it,
 *   the view lunging on and pitching forward, and a whoosh.
 *
 * All of it presentation: a punch for the render, particles, a sound; the
 * only simulation it touches is the kick's hit-stop (`OBJECT_STOP`), which
 * `docs/STATUS.md` records with the others.
 */

/** Seconds of hit-stop when the boot meets a wall, a prop or a head (a body asks for its own, `HitFeel.FEEL[-1]`). */
export const OBJECT_STOP = 0.05;
/** How far ahead of the player, and how high, the contact is drawn. */
const REACH = 1.45, CONTACT_Y = -0.45;

export type KickMet = "body" | "head" | "prop" | "wall" | "air";

/** The kick's hit has resolved against `met`, along the unit vector (`dx`,`dz`). `flip` alternates the whiff's tilt kick to kick. */
export function kickResolved(met: KickMet, dx: number, dz: number, flip: number): void {
  if (met === "air") {
    addWhiffPunch(flip);
    at(player.px + dx * 0.8, player.pyy - 0.5, player.pz + dz * 0.8, () => kickWhiff());
    return;
  }
  const x = player.px + dx * REACH, z = player.pz + dz * REACH, y = player.pyy + CONTACT_Y;
  const floor = player.pyy - EYE;
  dustFx(x, floor + 0.15, z, met === "body" ? 6 : 12, met === "body" ? 0.8 : 1.3, dx, dz);
  if (met === "body") {
    bloodFx(x, y, z, 14, 2, dx, dz);
    at(x, y, z, () => kickSlamFlesh());
    return;
  }
  if (met === "head") {
    bloodFx(x, y, z, 8, 2, dx, dz);
    at(x, y, z, () => kickSlamFlesh());
  } else {
    chipFx(x, y, z, met === "wall" ? 9 : 5, 1.2, -dx, -dz);
    at(x, y, z, () => kickSlamStone());
  }
  // no body to report the blow: the punch and the stop are asked for here
  addHitPunch(0.85, 0);
  screenShake.hitStop = Math.max(screenShake.hitStop, OBJECT_STOP);
  shake(0.1);
}
