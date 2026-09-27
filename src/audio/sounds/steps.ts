import { lv, type SoundName } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { grit, rattle, slide, tick } from "../Material";
import { soundRandom } from "../SoundRandom";
import { surfaceHere, type Surface } from "../Surface";

/**
 * THE SOUND CATALOGUE — THE PLAYER'S BODY: footsteps, the landing, the jump.
 * Player feedback round 2 Task 5 (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * The old footstep was one 50 ms burst of lowpassed noise — the same burst
 * every step, on every floor (level 1 added a faint random ping for its
 * marble). Now a step is a foot: the **heel** meeting the floor, the
 * body's **weight** behind it (a low thud), the **toe** rolling down 20-45 ms
 * later, and the **grit** of whatever is underfoot — and what is underfoot
 * follows the level (`../Surface.ts`): stone, level 1's marble, the ash of
 * hell, the womb's wet flesh, the factory's grating, the sewer's water, the
 * graveyard's dirt and grass.
 *
 * **No two steps alike.** Each step draws its own stride from sound's own
 * dice (`soundRandom`, never `Math.random`): pitch, filter corners, the
 * heel-to-toe gap and how much grit, and the feet alternate — the left a
 * shade lower than the right.
 *
 * **Running is heavier, not faster.** The cadence is the game's
 * (`src/player/Player.ts`'s bob, untouched): a sprinting step lands harder —
 * more weight, a lower and longer thud, more grit — and is about 3 dB louder
 * than a walking one on the same floor. Each floor is its own entry in
 * `../Levels.ts`, levelled from its walk and its run together, so the
 * surfaces sit at one level (Task 2 left stone and marble 9 dB apart under
 * one trim) and the run stays above the walk.
 *
 * **The landing scales with the fall.** `landing(speed)` takes how fast the
 * player was falling (m/s): a step off a kerb is a soft scuff, a jump lands
 * like a hard running step with a body thud under it, and a drop from a
 * gallery lands heavy, low and long.
 */

/** One step's own variation — see `stride()`. */
export interface Stride { p: number; q: number; gap: number; g: number }
/** How a step is weighted: walking is all ones. */
interface Weight { d: number; f: number; heel: number; thud: number; grit: number }
const WALK: Weight = { d: 1, f: 1, heel: 1, thud: 1, grit: 1 };
const RUN: Weight = { d: 1.3, f: 0.88, heel: 1.2, thud: 1.6, grit: 1.35 };

let foot = 0;
/** A fresh stride: pitch ±6% (the left foot 2% under the right), filters ±12%, the toe 22-44 ms after the heel, grit ×0.7-1.3. */
export function stride(): Stride {
  foot ^= 1;
  return { p: jit(0.06) * (foot ? 1.02 : 0.98), q: jit(0.12), gap: 0.022 + soundRandom() * 0.022, g: 0.7 + soundRandom() * 0.6 };
}

/** A sine thud dropping about an octave: the body's weight. */
function weight(f: number, d: number, level: number, drive = 1.3): Layer {
  return { tone: "sine", f, to: f * 0.52, over: d * 0.55, env: { a: 0.0025, h: 0.005, d }, drive, level };
}

/** What a step on each floor is made of. */
const FLOORS: Readonly<Record<Surface, (v: Stride, w: Weight) => Layer[]>> = {
  // leather on dressed stone: a mid scuff, a firm low thud, sand under the sole
  stone: (v, w) => [
    { noise: "white", filters: [{ type: "bandpass", f: 1150 * v.q, q: 1.1 }, { type: "lowpass", f: 4500 }], env: { a: 0.0012, h: 0.003, d: 0.045 * w.d }, drive: 1.8, level: 0.5 * w.heel },
    weight(118 * v.p * w.f, 0.06 * w.d, 0.75 * w.thud),
    tick(v.gap, 1700 * v.q, 1.6, 0.025, 0.28, 1),
    { noise: "white", filters: [{ type: "highpass", f: 3600 * v.q }], env: { a: 0.003, h: 0.008, d: 0.04 * w.d }, am: { rate: 95 * v.p, depth: 0.45, type: "square" }, level: 0.1 * v.g * w.grit },
  ],
  // polished marble: a hard bright tock and a short ring off the slab
  marble: (v, w) => [
    tick(0, 2500 * v.q, 1.8, 0.03 * w.d, 0.55 * w.heel, 2.2),
    weight(126 * v.p * w.f, 0.055 * w.d, 0.6 * w.thud),
    { tone: "sine", f: [1180 * v.p, 1690 * v.p, 2830 * v.p], env: { a: 0.0006, d: 0.07 * w.d }, level: 0.05 },
    tick(v.gap, 3100 * v.q, 2, 0.018, 0.25, 1.4),
  ],
  // hell's ash and cinders: crunchy, dry, a puff of it, a dull thud under
  ash: (v, w) => [
    grit(0, 2200 * v.q, 62 * v.p, 0.07 * w.d, 0.45 * v.g * w.grit, 0.8),
    { noise: "white", filters: [{ type: "bandpass", f: 700 * v.q, q: 1 }], env: { a: 0.0015, h: 0.004, d: 0.05 * w.d }, drive: 1.6, level: 0.45 * w.heel },
    weight(96 * v.p * w.f, 0.07 * w.d, 0.7 * w.thud),
    grit(v.gap, 1500 * v.q, 48 * v.p, 0.05, 0.3 * v.g, 0.8),
    { noise: "pink", filters: [{ type: "lowpass", f: 800 }], env: { a: 0.004, h: 0.01, d: 0.08 * w.d }, level: 0.3 },
  ],
  // the womb: a wet squelch, a soft thud, the sole sucking free
  flesh: (v, w) => [
    { noise: "white", filters: [{ type: "lowpass", f: 1100 * v.q, q: 2.5, to: 260, over: 0.07 * w.d }], env: { a: 0.004, h: 0.012, d: 0.08 * w.d }, am: { rate: 26 * v.p, depth: 0.35 }, drive: 1.4, level: 0.75 * w.heel },
    weight(86 * v.p * w.f, 0.07 * w.d, 0.6 * w.thud, 1.1),
    { noise: "pink", filters: [{ type: "bandpass", f: 350 * v.q, q: 1.5 }], env: { a: 0.006, h: 0.02, d: 0.1 * w.d }, level: 0.35 },
    tick(v.gap + 0.02, 2300 * v.q, 4, 0.012, 0.16, 1.2),
  ],
  // factory grating: a clang with the plate's modes, a lighter toe clank, the grate rattling in its frame
  metal: (v, w) => [
    tick(0, 2600 * v.q, 1.4, 0.012, 0.5 * w.heel, 2),
    { tone: "sine", f: [540 * v.p, 1360 * v.p, 2230 * v.p], env: { a: 0.0005, d: 0.11 * w.d }, level: 0.2 * w.heel },
    weight(125 * v.p * w.f, 0.055 * w.d, 0.6 * w.thud),
    { at: v.gap, tone: "sine", f: [780 * v.p, 1930 * v.p], env: { a: 0.0005, d: 0.06 }, level: 0.1 },
    rattle(0.004, 3400 * v.q, 70, 0.05 * w.d, 0.08 * w.grit),
  ],
  // the sewer's water: a splash, the spray, a plop, the thud muffled under it
  water: (v, w) => [
    { noise: "white", filters: [{ type: "bandpass", f: 1500 * v.q, q: 0.9, to: 520, over: 0.08 }], env: { a: 0.004, h: 0.012, d: 0.11 * w.d }, drive: 1.3, level: 0.6 * w.heel },
    { noise: "white", filters: [{ type: "highpass", f: 3800 * v.q }], env: { a: 0.006, h: 0.01, d: 0.09 * w.d }, level: 0.22 * v.g * w.grit },
    { tone: "sine", f: 260 * v.p, to: 130 * v.p, over: 0.04, env: { a: 0.002, d: 0.05 }, level: 0.2 },
    weight(90 * v.p * w.f, 0.06 * w.d, 0.45 * w.thud),
    { at: v.gap, noise: "white", filters: [{ type: "bandpass", f: 2100 * v.q, q: 1.2, to: 900, over: 0.05 }], env: { a: 0.003, d: 0.05 }, level: 0.25 },
  ],
  // graveyard earth: a soft deep thud, soil and gravel crunching, grass brushing the boot
  dirt: (v, w) => [
    weight(100 * v.p * w.f, 0.075 * w.d, 0.85 * w.thud, 1.4),
    grit(0, 1300 * v.q, 44 * v.p, 0.06 * w.d, 0.3 * v.g * w.grit, 0.7),
    { noise: "white", filters: [{ type: "highpass", f: 3500 }, { type: "bandpass", f: 6200 * v.q, q: 0.8, to: 3800, over: 0.08 }], env: { a: 0.012, h: 0.01, d: 0.07 * w.d }, level: 0.16 * v.g },
    tick(v.gap, 900 * v.q, 1.2, 0.025, 0.3, 1.2),
  ],
};

/** A step's layers — exported so tests can read a design without playing it. */
export function stepDesign(surface: Surface, sprinting: boolean, v: Stride): Layer[] {
  return (FLOORS[surface] ?? FLOORS.stone)(v, sprinting ? RUN : WALK);
}

/** Each floor's entry in `../Levels.ts`. */
export const STEP_ENTRY: Readonly<Record<Surface, SoundName>> = {
  stone: "footstepStone", marble: "footstepMarble", ash: "footstepAsh", flesh: "footstepFlesh",
  metal: "footstepMetal", water: "footstepWater", dirt: "footstepDirt",
};

/**
 * One footstep (`footstep` in `src/player/Player.ts`, at the same moment it
 * always fired: the bob's upward zero crossing). `marble` is the game's own
 * level-1 test; the floor comes from the level the game is in
 * (`../Surface.ts`), or `surface` when the sound board asks for one.
 */
export function footstep(sprinting: boolean, marble: boolean, surface: Surface = surfaceHere(marble)): void {
  const s = FLOORS[surface] ? surface : "stone";
  lv(STEP_ENTRY[s], () => { play(stepDesign(s, sprinting, stride())); });
}

/** How hard a landing at `speed` m/s is, 0 (a step off a kerb, 2 m/s) to 1 (a drop of about 3.6 m, 12 m/s and over). */
export function landingForce(speed: number): number {
  const k = (speed - 2) / 10;
  return Number.isFinite(k) ? Math.max(0, Math.min(1, k)) : 0;
}

/** A landing's layers: a running step on the floor, scaled by the force, and the body's thud under it, lower and longer the harder. */
export function landingDesign(surface: Surface, speed: number, v: Stride): Layer[] {
  const k = landingForce(speed);
  const feet = stepDesign(surface, true, v).map((l): Layer => ({ ...l, level: (l.level ?? 1) * (0.5 + 0.5 * k) }));
  return [
    ...feet,
    { tone: "sine", f: 96 - 26 * k, to: 44 - 10 * k, over: 0.08 + 0.1 * k, env: { a: 0.003, h: 0.01 + 0.02 * k, d: 0.12 + 0.2 * k }, drive: 1.5 + 1.5 * k, level: 0.25 + 0.85 * k },
    // the kit and the clothes settling
    { noise: "pink", filters: [{ type: "lowpass", f: 900 - 300 * k }], env: { a: 0.004, h: 0.02, d: 0.08 + 0.15 * k }, level: 0.2 + 0.4 * k },
  ];
}

/** The player lands (`playerTick`, the frame it touches the ground — where a running footstep used to play), falling at `speed` m/s. */
export function landing(speed: number, marble = false, surface: Surface = surfaceHere(marble)): void {
  const s = FLOORS[surface] ? surface : "stone";
  lv("landing", () => { play(landingDesign(s, speed, stride())); });
}

/** The player jumps: the push-off's scuff, and the clothes and kit lifting. */
export function jump(): void {
  const p = jit(0.05);
  lv("jump", () => {
    play([
      tick(0, 1000 * p, 1.2, 0.035, 0.5, 1.5),
      weight(140 * p, 0.05, 0.35),
      slide(0.01, 700 * p, 1500 * p, 0.12, 0.35, 1.1),
    ]);
  });
}
