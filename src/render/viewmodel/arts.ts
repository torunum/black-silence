import type { WeaponArt } from "./pose";
import { flarePistol } from "./weapons/flare";
import { sawedOff } from "./weapons/shotgun";
import { combatRifle } from "./weapons/rifle";
import { tommyGun } from "./weapons/tommy";
import { bmgSniper } from "./weapons/sniper";
import { crossLauncher } from "./weapons/cross";
import { nailCannon } from "./weapons/nailgun";
import { soulReaper } from "./weapons/reaper";

/** The eight weapons' art, in WEAPON_STATS slot order (tests pin that each name matches its slot). */
export const WEAPON_ART: readonly WeaponArt[] = [
  flarePistol, sawedOff, combatRifle, tommyGun, bmgSniper, crossLauncher, nailCannon, soulReaper,
];
