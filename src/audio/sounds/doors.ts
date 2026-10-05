import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { clack, thud } from "../Material";
import { soundRandom } from "../SoundRandom";
import { wetDoor } from "../Ambient";
import { DOOR_SINK_SECONDS } from "../../world/Grid";

/**
 * THE SOUND CATALOGUE — DOORS AND THE EXIT. Player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`): "doors
 * (stone grinding as a door sinks)".
 *
 * A door in this game does not swing: it sinks into the floor, taking
 * `DOOR_SINK_SECONDS` (`src/world/Grid.ts`, about 1.27 s) to go. The old
 * stone door was a 0.9 s grind that ended before the door did. Now the
 * grind lasts exactly as long as the door moves — a deep **rumble** and a
 * **scrape** stuttering as stone sticks and slips on stone, **grit**
 * trickling, a **sub** under it — and the door **settles** with a thud and
 * a breath of dust on the frame it comes to rest.
 *
 * - A **secret** door is a piece of the wall: it breaks free with a crack,
 *   grinds lower and heavier, and lands harder.
 * - The **red-key gate** unbolts with an iron clank, then sinks like stone.
 * - A **locked** door the player has no key for rattles in its frame, and a
 *   low muted tone says no.
 * - The **flesh** doors of the womb keep their wet tearing (`wetDoor`,
 *   `../Ambient.ts`), which was never the problem.
 * - **The exit** opening is a longer, deeper grind with a low chord
 *   swelling up under it: the way out.
 *
 * The transitions plan (`docs/superpowers/plans/2026-10-05-transitions.md`)
 * adds the three sounds of leaving one level and entering the next:
 *
 * - **`exitWalkthrough`** — the camera walks into the open door (1.5 s): air
 *   drawn in through the doorway and a low chord rising, with three soft
 *   footfalls on stone, ending in the held breath of the black.
 * - **`chapterToll`** — the chapter card comes up: one low bell, struck once,
 *   its partials ringing out at their own lengths.
 * - **`doorShutsBehind`** — the entrance door of the new level closes behind
 *   the player: a latch, and the thud of a heavy door coming to rest.
 */

export type DoorKind = "stone" | "secret" | "gate" | "flesh";

/** The grind of stone sinking on stone for `dur` s; `heavy` 1 for a door, more for a piece of the wall. */
export function grind(dur: number, heavy: number, p: number): Layer[] {
  const h = (d: number): number => Math.max(0, dur - d);
  return [
    // the rumble: the weight of it moving
    { noise: "brown", filters: [{ type: "lowpass", f: 240 * p / heavy, q: 0.8 }], env: { a: 0.08, h: h(0.2), d: 0.12 }, am: { rate: 9 * p, depth: 0.3, to: 5.5, over: dur }, drive: 1.3, level: 0.9 * heavy },
    // the scrape: stone sticking and slipping on stone, the pitch sinking with the door
    { noise: "pink", filters: [{ type: "bandpass", f: 430 * p / heavy, q: 1.6, to: 250 * p / heavy, over: dur }], env: { a: 0.06, h: h(0.18), d: 0.12 }, am: { rate: 13 * p, depth: 0.4, to: 7.5, over: dur }, level: 0.55 },
    // grit trickling out of the joint
    { noise: "white", filters: [{ type: "highpass", f: 2500 }, { type: "bandpass", f: 3600 * p, q: 0.8 }], env: { a: 0.1, h: h(0.25), d: 0.15 }, am: { rate: 23, depth: 0.5, type: "square" }, level: 0.08 },
    // and the ground feeling it
    { tone: "sine", f: 42 / heavy, to: 33 / heavy, over: dur, env: { a: 0.1, h: h(0.22), d: 0.12 }, drive: 1.2, level: 0.35 * heavy },
  ];
}

/** The door coming to rest at `at` s: a heavy thud, a knock of stone, dust settling. */
export function settle(at: number, heavy: number, p: number): Layer[] {
  return [
    { at, tone: "sine", f: 75 * p / heavy, to: 36 / heavy, over: 0.12, env: { a: 0.002, h: 0.02, d: 0.3 * heavy }, drive: 2, level: 1 * heavy },
    { at, noise: "white", filters: [{ type: "lowpass", f: 700 * p }], env: { a: 0.001, h: 0.01, d: 0.1 }, drive: 1.8, level: 0.5 },
    { at: at + 0.02, noise: "pink", filters: [{ type: "lowpass", f: 1000 }], env: { a: 0.03, h: 0.05, d: 0.35 }, level: 0.2 },
  ];
}

/** A sinking door's whole sound, by kind — exported so tests can read it without playing it. */
export function doorDesign(kind: Exclude<DoorKind, "flesh">, p = 1): Layer[] {
  const dur = DOOR_SINK_SECONDS;
  if (kind === "secret") {
    return [
      // breaking free of the wall
      { noise: "white", filters: [{ type: "bandpass", f: 600 * p, q: 1 }], env: { a: 0.001, h: 0.01, d: 0.08 }, drive: 3, level: 0.8 },
      { tone: "sine", f: 62 * p, to: 30, over: 0.12, env: { a: 0.002, h: 0.02, d: 0.22 }, drive: 1.6, level: 0.7 },
      ...grind(dur, 1.4, p),
      ...settle(dur, 1.4, p),
    ];
  }
  const bolt: Layer[] = kind === "gate" ? [...clack(0, [900 * p, 1420 * p, 2300 * p], 0.25, 0.6), thud(0, 160 * p, 0.08, 0.5)] : [];
  return [...bolt, ...grind(dur, 1, p), ...settle(dur, 1, p)];
}

/** A door opens (`interact`): a stone door, a secret piece of wall, the red-key gate, or flesh. */
export function doorOpens(kind: DoorKind): void {
  if (kind === "flesh") { lv("doorFlesh", () => { wetDoor(); }); return; }
  const k = kind === "secret" || kind === "gate" ? kind : "stone";
  const p = jit(0.05);
  lv(k === "secret" ? "doorSecret" : k === "gate" ? "doorGate" : "doorStone", () => { play(doorDesign(k, p)); });
}

/** A locked door the player has no key for (`interact`): shaken in its frame — three iron knocks — and a low muted tone that says no. */
export function lockedDoor(): void {
  const p = jit(0.05);
  const knocks = [0, 0.07 + soundRandom() * 0.02, 0.16 + soundRandom() * 0.02];
  lv("lockedDoor", () => {
    play([
      ...knocks.flatMap((t, i): Layer[] => [...clack(t, [700 * p, 1150 * p, 1900 * p], 0.09, 0.5 - i * 0.1), thud(t, 140 * p, 0.04, 0.3)]),
      // the "no": two low tones a semitone apart, beating, muffled
      { at: 0.22, tone: "triangle", f: [110, 116.5], filters: [{ type: "lowpass", f: 600 }], env: { a: 0.02, h: 0.08, d: 0.35 }, level: 0.35 },
    ]);
  });
}

/** The level's exit opens once its boss is dead (`openExit`): a long deep grind, and a low chord swelling under it. */
export function exitOpens(): void {
  const p = jit(0.03);
  lv("exitOpens", () => {
    play([
      ...grind(1.6, 1.3, p),
      ...settle(1.6, 1.2, p),
      { at: 0.2, tone: "sine", f: [65.4, 98, 130.8], filters: [{ type: "lowpass", f: 900 }], env: { a: 0.6, h: 0.4, d: 1.3 }, level: 0.3 },
    ]);
  });
}

/** The camera walks through the open exit door into the dark (`Transition.ts`, the first 1.5 s): a breath drawn in, a chord rising, three soft footfalls. */
export function exitWalkthrough(): void {
  const p = jit(0.03);
  lv("exitWalkthrough", () => {
    play([
      // the air drawn through the doorway, brightening as the door nears
      { noise: "pink", filters: [{ type: "lowpass", f: 260 * p, q: 0.7, to: 1500 * p, over: 1.2 }], env: { a: 0.9, h: 0.15, d: 0.6 }, am: { rate: 5, depth: 0.15 }, level: 0.5 },
      // the low chord rising under it
      { tone: "sine", f: [55 * p, 82.4 * p, 110 * p], filters: [{ type: "lowpass", f: 700 }], env: { a: 0.8, h: 0.3, d: 0.9 }, level: 0.35 },
      { tone: "sine", f: 44, to: 30, over: 1.6, env: { a: 0.5, h: 0.5, d: 0.7 }, drive: 1.2, level: 0.4 },
      // three footfalls on stone, soft
      ...[0.15, 0.55, 0.95].map((at): Layer => ({ at, noise: "brown", filters: [{ type: "lowpass", f: 320 }], env: { a: 0.005, h: 0.02, d: 0.12 }, level: 0.5 })),
    ]);
  });
}

/** The chapter card comes up over the black: one low bell, struck once, every partial ringing at its own length. */
export function chapterToll(): void {
  const p = jit(0.01);
  lv("chapterToll", () => {
    const partials: Array<[number, number, number]> = [[98, 0.5, 3.4], [147.6, 0.22, 2.4], [196.4, 0.3, 2.8], [246, 0.12, 1.6], [294.6, 0.12, 1.4]];
    play([
      ...partials.map(([f, level, d]): Layer => ({ tone: "sine", f: f * p, env: { a: 0.004, d }, level })),
      { noise: "brown", filters: [{ type: "lowpass", f: 420 }], env: { a: 0.002, h: 0.01, d: 0.14 }, drive: 1.5, level: 0.4 },
    ]);
  });
}

/** The entrance door of the new level shuts behind the player: the latch, then the heavy door coming to rest. */
export function doorShutsBehind(): void {
  const p = jit(0.04);
  lv("doorShutsBehind", () => {
    play([
      ...settle(0.05, 1, p),
      ...clack(0.22, [900 * p, 1420 * p, 2300 * p], 0.2, 0.5),
      thud(0.22, 160 * p, 0.08, 0.4),
    ]);
  });
}

/**
 * A checkpoint marker catches (`src/world/Checkpoints.ts`, deeper-levels plan Task 1): a strike, a wick drawing, a flame taking and a soft
 * note rising out of it — the sound of a light left for the dead being answered. Quiet and warm: it is a reward, not an alarm.
 */
export function shrineLights(): void {
  const p = jit(0.03);
  lv("shrineLights", () => {
    play([
      // the strike: a dry scrape and a spark
      { noise: "white", filters: [{ type: "highpass", f: 2600 }, { type: "lowpass", f: 7000 }], env: { a: 0.002, h: 0.01, d: 0.1 }, level: 0.3 },
      ...clack(0.02, [2400 * p, 3600 * p], 0.03, 0.2),
      // the flame drawing breath, brightening as it takes
      { at: 0.06, noise: "pink", filters: [{ type: "lowpass", f: 320 * p, q: 0.7, to: 1500 * p, over: 0.5 }], env: { a: 0.12, h: 0.1, d: 0.55 }, level: 0.4 },
      // a low fifth swelling under it, and one high note that rings out
      { at: 0.1, tone: "sine", f: [196 * p, 294 * p], filters: [{ type: "lowpass", f: 1400 }], env: { a: 0.05, h: 0.2, d: 1.3 }, level: 0.3 },
      { at: 0.16, tone: "sine", f: 784 * p, env: { a: 0.01, d: 1.1 }, level: 0.12 },
    ]);
  });
}
