import type { BakedSprite } from "../BakedSprite";
import { RigSet, roleCount } from "./bake";
import { HEAD, L_ARM, LEGS, R_ARM, type Rig, type Role } from "./kit";

/**
 * A rigged monster as the game's `PX[key]`: the roles every other module
 * already knows (`a`, `b`, `atk`, `die1`, `die2`, `hl`, `noHead`, `noLArm`,
 * `noLegs`, `gibbed`... each a texture), each now a frame of the rig, plus
 * the new roles `walk0`.. `idle`, `atk0`.., `pain0`.., `die0`.. so the
 * trace digest names them (`buildTextureIndex` walks `PX[key]`'s own
 * texture slots) and `rig`, which has everything else.
 *
 * **Only the idle frame is baked at boot** (the one a monster spawns in); every other
 * slot is a getter that bakes its frame the first time something asks for it and
 * keeps it. Measured (headless Chromium, `docs/STATUS.md`): a pose rasterizes in
 * about 1.2 ms, so the ghoul's 17 standing frames are 23 ms, and 22 monsters baked
 * eagerly would be about half a second of boot against the plan's 250 ms budget;
 * baked on demand a monster costs its idle (about 1.5 ms) at boot, and a frame
 * costs its 1.2 ms the first time an enemy of that kind walks, strikes, hurts or
 * falls. A getter is still a slot: `buildTextureIndex` (the trace digest) walks
 * them all, so the traces name every frame, and the tests read them all once.
 */

/** The slot names of the eager frames. None may be a legacy role's name: `die1`, `die2` and `atk` mean what they always meant (a falling frame, the flat corpse, the strike). */
const SLOTS: ReadonlyArray<[Role, readonly string[]]> = [
  ["walk", ["walk0", "walk1", "walk2", "walk3", "walk4", "walk5"]], ["idle", ["idle"]],
  ["atk", ["atkWind", "atkStrike", "atkRecover"]], ["pain", ["pain0", "pain1"]], ["die", ["death0", "death1", "death2", "death3", "death4"]],
];

export function rigSprite(rig: Rig): BakedSprite {
  const set = new RigSet(rig);
  const o: Record<string, unknown> = {};
  for (const [role, names] of SLOTS) {
    if (names.length !== roleCount(rig, role)) throw new Error(`rig ${rig.key}: ${role} has ${roleCount(rig, role)} poses, the slots name ${names.length}`);
    names.forEach((n, i) => { if (role === "idle") o[n] = set.tex(role, i); else lazy(n, role, i, 0); });
  }
  function lazy(name: string, role: Role, i: number, mask: number): void {
    Object.defineProperty(o, name, { get: () => set.tex(role, i, mask), enumerable: true, configurable: true });
  }
  // the legacy roles: `a` and `b` the two walk frames (here the idle, and the step half a cycle on), the attack's strike,
  // the two death frames (the first fall, the last, flat), and the variants an enemy that has lost something wears
  o.a = o.idle;
  lazy("b", "walk", 3, 0); lazy("atk", "atk", 1, 0); lazy("die1", "die", 1, 0); lazy("die2", "die", 4, 0);
  lazy("hl", "idle", 0, HEAD); lazy("noHead", "idle", 0, HEAD);
  lazy("hlb", "walk", 3, HEAD); lazy("noHeadB", "walk", 3, HEAD);
  lazy("noLArm", "idle", 0, L_ARM); lazy("noLArmB", "walk", 3, L_ARM);
  lazy("noRArm", "idle", 0, R_ARM); lazy("noRArmB", "walk", 3, R_ARM);
  lazy("gibbed", "idle", 0, L_ARM | R_ARM); lazy("gibbedB", "walk", 3, L_ARM | R_ARM);
  lazy("noLegs", "crawl", 0, LEGS); lazy("noLegsB", "crawl", 2, LEGS);
  o.head = rig.regions.head;
  o.regions = { ...rig.regions };
  o.rig = set;
  return o as unknown as BakedSprite;
}
