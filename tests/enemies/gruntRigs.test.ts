// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { LUNGE_AIR, LUNGE_SECS, SCREAM_STUN, SCREAM_T } from "../../src/enemies/rig/timing";
import { rigSuite } from "./rigSuite";

/**
 * THE COMMON GRUNTS ARE RIGS (enemies plan, Task 2): the plague bloat `t`, the flayed sprinter `f`, the
 * plated horror `m`, the wailer `s`, the hound `g` and the dragger `w`, held where a test can bite.
 * (The plan calls `w` the wailer and `s` something else; in `EnemyDefs`/`PXDEF` `s` is the WAILER, with
 * the scream, and `w` the DRAGGER, torn at the waist: these tests follow the game's data.)
 *
 * For each one:
 * - **the bake is pure** and has what the plan asks (walk 6, idle, attack 3, pain 2, death 5, a crawl);
 * - **it keeps its world size and its mass**: the frame is the sprite's shape, its silhouette is as wide
 *   as the legacy art's, its colours as bright and its saturated accents as present (the rigged ghoul's
 *   first draft was a slimmer, paler thing than the sprite it replaced; this is the bar that holds it);
 * - **its head is where `Hitscan` counts one** (the top of the frame), or it has none (the hound and the
 *   dragger: the legacy art has no head row, so no head hit is counted and no headless frame exists);
 * - **its parts are real**: each dismemberment omits the part and leaves a stump of meat, the part that
 *   flies is its own;
 * - **the game selects its frames**: pain on a hit, the attack's phases, the death sequence, the walk,
 *   the crawl; the hound's leap and the wailer's scream hold the attack frames.
 */

const { standing, map, px, tick: enemyTick } = rigSuite(["t", "f", "m", "s", "g", "w"], {
  head: { t: true, f: true, m: true, s: true, g: false, w: false },
  // how much of the legacy sprite's fill each rig must keep: the thinner bodies (the wailer, a starved thing in a shroud) are held to less, the barrels and brutes to nearly all of it
  fill: { t: 0.8, f: 0.8, m: 0.85, s: 0.6, g: 0.8, w: 0.8 },
});

describe("what a monster does that is not `atkAnim`: the hound leaps and the wailer screams, and the attack frames are held across it", () => {
  it("the hound's leap: coil, spring, land over the .4 s after it lunges, then it is a hound that runs again", () => {
    const e = standing("g");
    expect(e.lunge, "it is the lunging one").toBe(true);
    const at = (since: number, name: string): void => { e.lungeT = LUNGE_SECS - since; e.atkAnim = 0; enemyTick(0.0001); expect(map(e), `${since} s into the leap`).toBe(px().g[name]); };
    at(0.03, "atkWind"); at(0.2, "atkStrike"); at(LUNGE_AIR - 0.03, "atkRecover");
    e.lungeT = LUNGE_SECS - LUNGE_AIR - 0.05; enemyTick(0.0001);
    expect(map(e), "on the ground again").toBe(px().g.idle);
    const z = standing("z");
    z.lungeT = LUNGE_SECS - 0.2; enemyTick(0.0001);
    expect(map(z), "and a monster that does not lunge ignores the timer").toBe(px().z.idle);
  });

  it("the wailer's scream: held on the shriek frames while it stands screaming (its stun), gathering, shrieking, slumping", () => {
    const e = standing("s");
    expect(e.scream, "it is the screaming one").toBe(true);
    const at = (elapsed: number, name: string): void => { e.screamT = SCREAM_T; e.stun = SCREAM_STUN - elapsed + 0.0001; e.hurt = 0; enemyTick(0.0001); expect(map(e), `${elapsed} s into the scream`).toBe(px().s[name]); };
    at(0.05, "atkWind"); at(0.5, "atkStrike"); at(1.05, "atkRecover");
    e.screamT = 4; e.stun = 0.5; enemyTick(0.0001);
    expect(map(e), "a stun that is not a scream is a monster standing").toBe(px().s.idle);
    const t = standing("t");
    t.screamT = SCREAM_T; t.stun = 0.5; enemyTick(0.0001);
    expect(map(t), "and one that does not scream ignores it").toBe(px().t.idle);
  });
});
