import type { RigPose } from "./kit";
import type { Std } from "./humanoid";

/**
 * THE FALL AND THE CRAWL every two-legged monster shares: a body that jerks,
 * buckles, topples and lies (five frames, each drawn on the floor the sinking
 * sprite is at: `enemyTick` sinks a dying sprite as it falls, so the floor
 * rises in the frame), and the legless one that hauls itself on its arms.
 * They are the ghoul's (`ghoulPoses.ts`) written once with the two numbers
 * that differ between bodies: how high the pelvis rides (`y`, 1 for the
 * ghoul's .88 m) and how far it lies from where it stood (`x`). A monster's
 * own scalars (`xs(k)`: its `burst`, its `bile`) come in per frame.
 */

export interface Fall {
  /** Pelvis height over the ghoul's: scales the drops. */
  y: number;
  /** How far the body lies from where it stood, over the ghoul's. */
  x: number;
  /** The monster's own scalars at frame `k` (0..4) of the fall. */
  xs?: (k: number) => Record<string, number>;
  /** The mouth, at frame `k`: open on the way down. */
  jaw?: (k: number) => number;
}

type Make = (s: Std) => RigPose;
const FLOORS = [0.975, 0.93, 0.866, 0.78, 0.7];

/** Death: five frames of a body going down; mirrored by the game when it falls the other way. */
export function dieSeq(make: Make, f: Fall): RigPose[] {
  const xs = (k: number): Record<string, number> => f.xs?.(k) ?? {};
  const jaw = (k: number, d: number): number => f.jaw?.(k) ?? d;
  const Y = f.y, X = f.x;
  return [
    make({ spine: [-0.16, 0, 0.1], chest: [-0.28, 0.1, 0.12], neck: [-0.2, 0, 0], head: [-0.45, 0, 0], jaw: jaw(0, 1.05), x: xs(0),
      aL: { f: 1.2, out: 0.8, e: 0.3, w: 0 }, aR: { f: 1.0, out: 0.8, e: 0.3, w: 0 },
      lL: { f: 0.2, k: 0.45 }, lR: { f: -0.18, k: 0.4 }, root: [0.02, 0, 0.07], floor: FLOORS[0] }),
    make({ spine: [0.1, 0, 0.14], chest: [-0.12, 0.1, 0.18], neck: [-0.15, 0, 0], head: [-0.2, 0.2, 0.1], jaw: jaw(1, 0.8), x: xs(1),
      aL: { f: 0.1, out: 0.55, e: 0.25, w: 0 }, aR: { f: 0.3, out: 0.65, e: 0.3, w: 0 },
      lL: { f: 1.35, k: 1.95, out: 0.15 }, lR: { f: 1.2, k: 1.85, out: 0.15 },
      ground: false, root: [-0.04 * X, -0.4 * Y, -0.04], floor: FLOORS[1] }),
    make({ pelvis: [0, 0, 0.55], spine: [0.1, 0, 0.3], chest: [-0.05, 0, 0.3], neck: [-0.1, 0, 0.1], head: [-0.1, 0.1, 0.3], jaw: jaw(2, 0.6), x: xs(2),
      aL: { f: 0.2, out: 0.4, e: 0.3 }, aR: { f: -0.2, out: 0.35, e: 0.4 },
      lL: { f: 1.0, k: 1.7, out: 0.2 }, lR: { f: 0.6, k: 1.6, out: 0.2 },
      ground: false, root: [-0.26 * X, -0.44 * Y, 0], floor: FLOORS[2] }),
    make({ pelvis: [0, 0, 1.15], spine: [0.1, 0, 0.2], chest: [0.0, 0, 0.2], neck: [0, 0, 0.1], head: [0.1, 0.1, 0.25], jaw: jaw(3, 0.5), x: xs(3),
      aL: { f: -0.1, out: 0.45, e: 0.5 }, aR: { f: 0.3, out: 0.55, e: 0.7 },
      lL: { f: 1.35, k: 2.1, out: 0.25 }, lR: { f: 0.9, k: 1.95, out: 0.2 },
      ground: false, root: [-0.33 * X, -0.5 * Y, 0], floor: FLOORS[3] }),
    make({ pelvis: [0, 0, 1.4], spine: [0.1, 0, 0.1], chest: [0.05, 0, 0.1], neck: [0, 0, 0.05], head: [0.1, 0.1, 0.2], jaw: jaw(4, 0.5), x: xs(4),
      aL: { f: -0.2, out: 0.5, e: 0.5 }, aR: { f: 0.4, out: 0.6, e: 0.8 },
      lL: { f: 1.45, k: 2.2, out: 0.3 }, lR: { f: 1.1, k: 2.05, out: 0.3 },
      ground: false, root: [-0.35 * X, -0.52 * Y, 0], floor: FLOORS[4] }),
  ];
}

/** The same fall without legs (they are masked out: the pelvis just topples). */
export function crawlDieSeq(make: Make, f: Fall): RigPose[] {
  const xs = (k: number): Record<string, number> => f.xs?.(k) ?? {};
  const jaw = (k: number, d: number): number => f.jaw?.(k) ?? d;
  const Y = f.y, X = f.x;
  const base = (k: number): Std => ({ ground: false, x: xs(k), floor: FLOORS[k] });
  return [
    make({ ...base(0), root: [0.02, -0.7 * Y, 0.05], spine: [0.0, 0, 0.1], chest: [-0.2, 0, 0.1], neck: [-0.3, 0, 0], head: [-0.5, 0, 0.1], jaw: jaw(0, 1.0), aL: { f: 1.5, out: 0.6, e: 0.2, w: 0 }, aR: { f: 1.4, out: 0.6, e: 0.2, w: 0 } }),
    make({ ...base(1), root: [-0.1 * X, -0.7 * Y, 0], pelvis: [0, 0, 0.45], spine: [0.3, 0, 0.1], chest: [0.1, 0, 0.1], neck: [-0.1, 0, 0], head: [-0.2, 0.1, 0.1], jaw: jaw(1, 0.7), aL: { f: 0.9, out: 0.7, e: 0.4 }, aR: { f: 1.0, out: 0.7, e: 0.4 } }),
    make({ ...base(2), root: [-0.24 * X, -0.66 * Y, 0], pelvis: [0, 0, 0.95], spine: [0.2, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0, 0, 0], head: [0.1, 0.1, 0.1], jaw: jaw(2, 0.5), aL: { f: 0.5, out: 0.9, e: 0.3 }, aR: { f: 0.7, out: 0.9, e: 0.3 } }),
    make({ ...base(3), root: [-0.32 * X, -0.64 * Y, 0], pelvis: [0, 0, 1.3], spine: [0.1, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0.1, 0, 0], head: [0.2, 0.1, 0.1], jaw: jaw(3, 0.5), aL: { f: -0.1, out: 0.7, e: 0.5 }, aR: { f: 0.0, out: 0.7, e: 0.5 } }),
    make({ ...base(4), root: [-0.37 * X, -0.64 * Y, 0], pelvis: [0, 0, 1.45], spine: [0.1, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0.1, 0, 0], head: [0.3, 0.1, 0.1], jaw: jaw(4, 0.45), aL: { f: -0.2, out: 0.75, e: 0.5 }, aR: { f: -0.1, out: 0.75, e: 0.5 } }),
  ];
}
