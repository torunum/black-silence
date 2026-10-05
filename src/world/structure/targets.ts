import type { Structure } from "./analyse";

/**
 * WHAT A REBUILT LEVEL MUST BE (deeper-levels plan, Task 2; the numbers are argued in the plan's Task 3 section and
 * measured in `docs/level-structure.md`). Tasks 3-9 rebuild levels 1-7; each adds its index to `REBUILT`, and
 * `tests/world/structureLevels.test.ts` then holds that level to `checkTargets` as well as to the hard validation every
 * level passes. Level 1 (Task 3) is the first.
 */
export const REBUILT: readonly number[] = [1];

/**
 * The critical path of levels 1-7 as built before any rebuild, in steps (`scripts/level-structure.ts`, 2026-10-05). "About twice
 * as long" is measured against a level's own old length, and that is why the numbers stay here after a level is rebuilt.
 * `tests/world/structureLevels.test.ts` pins each level that is not in `REBUILT` to its number, so a number cannot drift while
 * the level is as it was; a level that is rebuilt leaves the pin and takes the 1.8-3x window of this number instead.
 */
export const OLD_CRITICAL: Readonly<Record<number, number>> = { 1: 42, 2: 66, 3: 44, 4: 44, 5: 44, 6: 44, 7: 32 };

/**
 * Hard failures the levels as they were built already have, by level, each recorded and argued so a rebuilt level starts clean
 * (`tests/world/structureLevels.test.ts` fails when a level has a problem not listed here *or* lists one it no longer has).
 *  - level 3 `unreachable`: the barrel at (18,17) stands on the south gallery's 2.3 stretch, which the ramps' lowered cells and the shelves
 *    on them cut off from every step (the galleries were meant to snipe from; they cannot be walked to); `exit-door`: the nave's exit
 *    is on the pit's 0.6 step and the wall behind it stands on a 2.3 gallery (`ExitDoor.ts`'s freestanding door).
 */
export const LEGACY_PROBLEMS: Readonly<Record<number, readonly string[]>> = {
  3: ["exit-door", "unreachable"],
};

export interface Targets {
  /** The critical path as a multiple of the level's old one: at least, and at most. */
  pathMin: number; pathMax: number;
  /** An absolute floor on the critical path, whatever the old one was. */
  pathFloor: number;
  loops: number;
  /** A key hunt: a key, a locked door, the door on the way, and the key found at least this many steps off it. */
  keyDetour: number;
  secrets: number;
  /** Pickups behind each secret. */
  secretRewards: number;
  arenas: number;
  heights: number; transitions: number;
  rooms: number; branches: number;
  /** A forced checkpoint between these fractions of the critical path. */
  checkpointFrom: number; checkpointTo: number;
  /** Damage the ammunition found is worth, per hit point of rank and file in a region; and per hit point of everything in a region with a boss. */
  supplyOverHp: number; supplyOverBossHp: number;
  /** Before a boss: at least this much health and armour on the way. */
  bossHealth: number; bossArmour: number;
}

export const TARGETS: Targets = {
  pathMin: 1.8, pathMax: 3, pathFloor: 80,
  loops: 1,
  keyDetour: 20,
  secrets: 2, secretRewards: 2,
  arenas: 1,
  heights: 3, transitions: 2,
  rooms: 8, branches: 2,
  checkpointFrom: 0.4, checkpointTo: 0.6,
  supplyOverHp: 2, supplyOverBossHp: 0.6,
  bossHealth: 50, bossArmour: 50,
};

/** What a rebuilt level `index` (the old one's number in `OLD_CRITICAL`) lacks, in words; empty means it meets every target. */
export function checkTargets(index: number, s: Structure, t: Targets = TARGETS, old: number = OLD_CRITICAL[index]): string[] {
  const out: string[] = [];
  const len = s.critical.length, lo = Math.max(t.pathFloor, Math.ceil(t.pathMin * old)), hi = Math.floor(t.pathMax * old);
  if (len < lo || len > hi) out.push(`critical path is ${len} steps, wanted ${lo}-${hi} (the old level's ${old}, ${t.pathMin}-${t.pathMax}x, and at least ${t.pathFloor})`);
  if (s.loops < t.loops) out.push(`${s.loops} loops, wanted ${t.loops}`);
  if (!(s.keys >= 1 && s.lockedDoors >= 1 && s.critical.keyRequired && s.critical.detour >= t.keyDetour)) {
    out.push(`no key hunt: ${s.keys} key(s), ${s.lockedDoors} locked door(s), the door ${s.critical.keyRequired ? "is" : "is not"} on the way, the key ${s.critical.detour} steps off it (wanted ${t.keyDetour})`);
  }
  if (s.secrets < t.secrets) out.push(`${s.secrets} secrets, wanted ${t.secrets}`);
  if (s.secretRewards.some((r) => r < t.secretRewards)) out.push(`a secret holds fewer than ${t.secretRewards} pickups (${s.secretRewards.join(", ")})`);
  if (s.arenas < t.arenas) out.push(`${s.arenas} arenas, wanted ${t.arenas}`);
  if (s.heights < t.heights) out.push(`${s.heights} floor heights, wanted ${t.heights}`);
  if (s.transitions < t.transitions) out.push(`${s.transitions} vertical transitions, wanted ${t.transitions}`);
  if (s.rooms < t.rooms) out.push(`${s.rooms} rooms, wanted ${t.rooms}`);
  if (s.branches < t.branches) out.push(`${s.branches} branch points, wanted ${t.branches}`);
  if (!s.checkpoints.some((c) => c.forced && c.fraction >= t.checkpointFrom && c.fraction <= t.checkpointTo)) {
    out.push(`no checkpoint every route passes between ${t.checkpointFrom} and ${t.checkpointTo} of the critical path (${s.checkpoints.map((c) => `${c.fraction.toFixed(2)}${c.forced ? "" : " unforced"}`).join(", ") || "none"})`);
  }
  for (const e of s.encounters) {
    const where = `the ${e.kind} at x ${e.x0}-${e.x1}, z ${e.z0}-${e.z1}`;
    if (e.bosses) {
      if (e.ratio < t.supplyOverBossHp) out.push(`${where} (a boss): ammunition worth ${Math.round(e.supply)} against ${e.hp + e.bossHp} hp`);
      if (e.health < t.bossHealth || e.armour < t.bossArmour) out.push(`${where} (a boss): ${e.health} health and ${e.armour} armour on the way, wanted ${t.bossHealth} and ${t.bossArmour}`);
    } else if (e.hp && e.supply < t.supplyOverHp * e.hp) out.push(`${where}: ammunition worth ${Math.round(e.supply)} against ${e.hp} hp, wanted ${t.supplyOverHp}x`);
  }
  return out;
}
