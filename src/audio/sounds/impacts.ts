import { ctx } from "../AudioEngine";
import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { clack, grit, tick } from "../Material";
import { soundRandom } from "../SoundRandom";
import { wallHere, type WallMaterial } from "../Surface";

/**
 * THE SOUND CATALOGUE — IMPACTS: the kick, bullets striking things, props
 * breaking. Player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). Each was
 * one or two `bang()`s — lowpassed noise with a fade — the same burst
 * whatever was hit. Now each is what it hits:
 *
 * - **The kick** swings with a whoosh (`kickSwing`, as the leg goes out)
 *   and lands, on the frame the game resolves it (`doKick`'s scheduled
 *   check, 110 ms later), as one of three: a **monster** — a meaty thud and
 *   a wet slap; a **wall or a prop** — a boot sole on stone, grit and dust;
 *   **air** — nothing more than the whoosh.
 * - **A bullet** cracks off **stone** (chips skittering), rings off
 *   **metal** (the factory), slaps into **flesh** (the womb's walls, and
 *   any monster it hits), knocks into **wood** (crates, pews, chairs). A
 *   ricochet whines three times in ten, rolled from sound's own dice.
 * - **A prop breaking** cracks, thuds hollow, and its splinters land
 *   around it for a third of a second.
 *
 * Two of these can come in dozens at once — a shotgun's eight pellets on a
 * wall, a tommy gun's fifteen rounds a second — so they are capped: at most
 * three wall hits within 20 ms, and one flesh hit per monster within 30 ms.
 * The caps count time on the audio clock and draw nothing.
 */

/** The kick's swing (`doKick`), whether or not it lands: the leg cutting the air, and the coat. */
export function kickSwing(): void {
  const p = jit(0.05);
  lv("kickSwing", () => {
    play([
      { noise: "pink", filters: [{ type: "bandpass", f: 380 * p, q: 1.3, to: 1700 * p, over: 0.12 }], env: { a: 0.045, h: 0.02, d: 0.12 }, level: 0.9 },
      { noise: "white", filters: [{ type: "highpass", f: 2400 }], env: { a: 0.03, h: 0.01, d: 0.08 }, level: 0.12 },
    ]);
  });
}

export type KickTarget = "flesh" | "stone" | "air";

/** A kick landing in a body: a meaty thud, a wet slap, the boot's leather snapping. */
function kickFlesh(p: number): Layer[] {
  return [
    { tone: "sine", f: 125 * p, to: 55, over: 0.06, env: { a: 0.001, h: 0.012, d: 0.14 }, drive: 2.5, level: 1 },
    { noise: "white", filters: [{ type: "lowpass", f: 1500 * p, q: 0.9, to: 300, over: 0.08 }], env: { a: 0.001, h: 0.01, d: 0.1 }, drive: 2, level: 0.8 },
    { at: 0.01, noise: "pink", filters: [{ type: "bandpass", f: 480 * p, q: 1.5 }], env: { a: 0.004, h: 0.015, d: 0.12 }, am: { rate: 30, depth: 0.35 }, level: 0.45 },
    tick(0, 2800, 1.2, 0.012, 0.25, 2),
  ];
}
/** A kick landing on stone or a prop: a boot sole striking, grit, a little dust coming down. */
function kickStone(p: number): Layer[] {
  return [
    { tone: "sine", f: 96 * p, to: 44, over: 0.07, env: { a: 0.001, h: 0.008, d: 0.12 }, drive: 1.8, level: 0.85 },
    tick(0, 820 * p, 1.3, 0.06, 0.75, 2),
    grit(0.002, 2600 * p, 70, 0.08, 0.25),
    { at: 0.02, noise: "pink", filters: [{ type: "lowpass", f: 650 }], env: { a: 0.02, h: 0.03, d: 0.22 }, level: 0.22 },
  ];
}
/** A kick's impact design — exported so tests can read it without playing it. Air is nothing: the swing was the whole sound. */
export function kickImpactDesign(target: KickTarget, p = 1): Layer[] {
  return target === "flesh" ? kickFlesh(p) : target === "air" ? [] : kickStone(p);
}

/**
 * The power kick landing (`doKick`'s check, 110 ms after the swing, on the
 * frame the game resolves the hit): in a monster, against a wall or a prop,
 * or into the air — which makes no sound of its own.
 */
export function kickImpact(target: KickTarget): void {
  if (target === "air") return;
  const t: KickTarget = target === "flesh" ? "flesh" : "stone";
  const p = jit(0.04);
  lv(t === "flesh" ? "kickImpactFlesh" : "kickImpactStone", () => { play(kickImpactDesign(t, p)); });
}

let capCtx: unknown = null;
let wallAt = -1, wallCount = 0;
let fleshLast = new WeakMap<object, number>();
/** The caps above start again on a new audio context (the sound board's offline renders are each their own). */
function capsFor(): number {
  const ac = ctx();
  if (ac !== capCtx) { capCtx = ac; wallAt = -1; wallCount = 0; fleshLast = new WeakMap(); }
  return ac.currentTime;
}

/** A bullet striking a wall: its design, by what the wall is made of — exported for tests. */
export function bulletWallDesign(material: WallMaterial, p: number, q: number): Layer[] {
  if (material === "metal") {
    return [
      tick(0, 3400 * q, 1.2, 0.012, 0.6, 2.4),
      { tone: "sine", f: [1850 * p, 2960 * p, 4410 * p], env: { a: 0.0004, d: 0.2 }, level: 0.22 },
      { tone: "sine", f: 420 * p, to: 260 * p, over: 0.03, env: { a: 0.0008, d: 0.04 }, level: 0.3 },
    ];
  }
  if (material === "flesh") {
    return [
      { noise: "white", filters: [{ type: "lowpass", f: 1300 * q, q: 1.2, to: 350, over: 0.05 }], env: { a: 0.001, h: 0.006, d: 0.07 }, am: { rate: 32, depth: 0.35 }, drive: 1.8, level: 0.9 },
      { tone: "sine", f: 140 * p, to: 70, over: 0.04, env: { a: 0.001, d: 0.05 }, level: 0.4 },
    ];
  }
  // stone: the crack, chips skittering off, a puff of dust
  return [
    tick(0, 2600 * q, 1.1, 0.02, 0.75, 3),
    { tone: "sine", f: 300 * p, to: 150 * p, over: 0.02, env: { a: 0.0008, d: 0.025 }, level: 0.3 },
    tick(0.018 + 0.02 * (q - 0.85), 4200 * p, 3, 0.01, 0.22, 1.2),
    tick(0.05 + 0.03 * (p - 0.9), 3600 * q, 3, 0.01, 0.14, 1.2),
    { noise: "pink", filters: [{ type: "lowpass", f: 1200 }], env: { a: 0.004, h: 0.01, d: 0.08 }, level: 0.25 },
  ];
}

/** A bullet striking a wall (`hitscan`), at the level's wall material or `material`: at most three in 20 ms. */
export function bulletHitsWall(material: WallMaterial = wallHere()): void {
  if (!ctx()) return;
  const t = capsFor();
  if (t - wallAt > 0.02) { wallAt = t; wallCount = 0; }
  if (++wallCount > 3) return;
  const m: WallMaterial = material === "metal" || material === "flesh" ? material : "stone";
  const p = jit(0.08), q = jit(0.12);
  lv("bulletHitsWall", () => { play(bulletWallDesign(m, p, q)); });
}

/** A bullet striking a monster (`hitscan`, where the blood flies): a wet thwack. One per monster (`who`) within 30 ms — eight pellets are one hit, louder. */
export function bulletHitsFlesh(who?: object): void {
  if (!ctx()) return;
  const t = capsFor();
  if (who !== null && typeof who === "object") {
    const last = fleshLast.get(who);
    if (last !== undefined && t - last < 0.03) return;
    fleshLast.set(who, t);
  }
  const p = jit(0.08);
  lv("bulletHitsFlesh", () => {
    play([
      { noise: "white", filters: [{ type: "lowpass", f: 1800 * p, q: 1, to: 450, over: 0.05 }], env: { a: 0.0006, h: 0.004, d: 0.06 }, drive: 2.2, level: 0.9 },
      { tone: "sine", f: 150 * p, to: 70, over: 0.035, env: { a: 0.001, h: 0.003, d: 0.05 }, drive: 1.4, level: 0.6 },
      { at: 0.008, noise: "pink", filters: [{ type: "bandpass", f: 700 * p, q: 1.4 }], env: { a: 0.004, h: 0.01, d: 0.07 }, am: { rate: 35, depth: 0.35 }, level: 0.35 },
    ]);
  });
}

/** A bullet strikes a breakable prop — a crate, a pew, a chair (`hitscan`): a wooden knock, its grain ringing, a splinter. */
export function bulletHitsProp(): void {
  const p = jit(0.08), q = jit(0.1);
  lv("bulletHitsProp", () => {
    play([
      tick(0, 900 * q, 2.2, 0.035, 0.8, 2),
      { tone: "sine", f: [410 * p, 1130 * p, 2080 * p], env: { a: 0.0005, d: 0.06 }, level: 0.25 },
      { at: 0.004, noise: "white", filters: [{ type: "highpass", f: 3000 * q }], env: { a: 0.001, d: 0.03 }, am: { rate: 110, depth: 0.45, type: "square" }, level: 0.2 },
    ]);
  });
}

/** Whether a bullet that hit a wall ricochets audibly — three times in ten (`hitscan`), from sound's own dice. */
export function ricochetRoll(): boolean { return soundRandom()<.3; }

/** The ricochet: a whine falling away — a narrow band of noise sweeping down, a thin fluttering tone under it. */
export function bulletRicochet(): void {
  const p = jit(0.15), len = 0.18 + soundRandom() * 0.1;
  lv("bulletRicochet", () => {
    play([
      tick(0, 3000 * p, 1.5, 0.008, 0.35, 2),
      { noise: "white", filters: [{ type: "bandpass", f: 4200 * p, q: 9, to: 1600 * p, over: len }], env: { a: 0.006, h: 0.02, d: len }, level: 0.8 },
      { tone: "sine", f: 3100 * p, to: 1300 * p, over: len + 0.03, vibrato: { rate: 18, cents: 40 }, env: { a: 0.008, h: 0.015, d: len }, level: 0.1 },
    ]);
  });
}

/** A crate, pew or chair breaks (`breakProp`): the crack, a hollow thud, splinters landing around it, dust. */
export function propBreaks(): void {
  const p = jit(0.06);
  const splinters: Layer[] = [];
  for (let i = 0; i < 5; i++) {
    const at = 0.04 + i * 0.065 + soundRandom() * 0.04;
    splinters.push(...clack(at, [1300 * p * (1 + 0.3 * soundRandom()), 2150 * p], 0.025, 0.2 * (1 - i * 0.15)));
  }
  lv("propBreaks", () => {
    play([
      { noise: "white", filters: [{ type: "bandpass", f: 1500 * p, q: 0.9 }], env: { a: 0.0005, h: 0.01, d: 0.08 }, drive: 3, level: 1 },
      { tone: "sine", f: 140 * p, to: 60, over: 0.09, env: { a: 0.002, h: 0.01, d: 0.15 }, drive: 1.5, level: 0.8 },
      ...splinters,
      { at: 0.03, noise: "pink", filters: [{ type: "lowpass", f: 800 }], env: { a: 0.02, h: 0.03, d: 0.3 }, level: 0.25 },
    ]);
  });
}
