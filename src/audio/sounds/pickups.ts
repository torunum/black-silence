import { lv, type SoundName } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { bell, clack, rattle, slide, thud, tick } from "../Material";

/**
 * THE SOUND CATALOGUE — PICKUPS. Player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). Every
 * pickup in the game — health, armour, six kinds of ammunition, the red
 * key, seven weapons — used to make one sound: a sine sweeping down and a
 * gurgle. Now each says what it is, in under half a second, and stays in
 * the UI category, the quietest (`../Levels.ts`): the player hears what
 * they took without it covering the fight.
 *
 * - **Health**: a glass vial's clink, and a warm fifth rising softly.
 * - **Armour**: leather straps and a plate settling onto the chest.
 * - **Ammunition**, by what it is: a box of rounds rattling (bullets), two
 *   shells clacking (shells), one heavy slug (slugs), gold crosses clinking
 *   with a thread of a bell (crosses), nails pouring (nails), and souls — a
 *   breath of voices.
 * - **The red key**: an iron key's two knocks and a warm low hum ("it is
 *   warm").
 * - **A weapon**: lifted up and settled in the hands — heavier than any of
 *   the others.
 */

export type PickupFamily = "health" | "armour" | "ammo" | "key" | "weapon";

/** Every item kind the game has (`src/player/Interact.ts`'s `itemsTick`), and what the player picks up — one weapon stands for the seven. */
export const PICKUPS: ReadonlyArray<readonly [string, string]> = [
  ["health", "health"], ["armor", "armour"], ["bullets", "bullets"], ["shells", "shells"], ["slugs", "slugs"],
  ["crosses", "blessed crosses"], ["nails", "nails"], ["souls", "souls"], ["key", "the red key"], ["w1", "a weapon"],
];
const AMMO = new Set(["bullets", "shells", "slugs", "crosses", "nails", "souls"]);

/** What family an item kind (`src/player/Interact.ts`'s `it.kind`) belongs to. Anything unknown is a weapon (`w1`…`w7`). */
export function pickupFamily(kind: string): PickupFamily {
  if (kind === "health") return "health";
  if (kind === "armor") return "armour";
  if (kind === "key") return "key";
  if (AMMO.has(kind)) return "ammo";
  return "weapon";
}

const ENTRY: Readonly<Record<PickupFamily, SoundName>> = {
  health: "pickupHealth", armour: "pickupArmour", ammo: "pickupAmmo", key: "pickupKey", weapon: "pickupWeapon",
};

/** What each ammunition kind sounds like as it is taken. */
const AMMO_DESIGN: Readonly<Record<string, (p: number) => Layer[]>> = {
  bullets: (p) => [rattle(0, 3200 * p, 38, 0.08, 0.35), ...clack(0.01, [2800 * p, 4200 * p], 0.04, 0.3), thud(0.01, 260 * p, 0.04, 0.3)],
  shells: (p) => [...clack(0, [1700 * p, 2600 * p], 0.05, 0.4), thud(0, 220 * p, 0.04, 0.3), ...clack(0.045, [1800 * p, 2750 * p], 0.05, 0.35), thud(0.045, 230 * p, 0.04, 0.25)],
  slugs: (p) => [...clack(0, [1300 * p, 2050 * p, 3100 * p], 0.08, 0.5), thud(0, 150 * p, 0.06, 0.6)],
  crosses: (p) => [...clack(0, [1568 * p, 2349 * p], 0.05, 0.3), ...bell(0.01, 1568 * p, 0.12, 0.25)],
  nails: (p) => [rattle(0, 4200 * p, 60, 0.12, 0.4), ...clack(0.02, [3300 * p, 5000 * p], 0.03, 0.2), ...clack(0.07, [3000 * p, 4600 * p], 0.03, 0.15)],
  souls: (p) => [
    { noise: "pink", formants: [{ f: 650 * p, q: 6, gain: 1 }, { f: 1080 * p, q: 7, gain: 0.6 }], env: { a: 0.05, h: 0.05, d: 0.3 }, level: 0.9 },
    { tone: "sine", f: [330 * p, 495 * p], vibrato: { rate: 5, cents: 18 }, env: { a: 0.04, h: 0.05, d: 0.3 }, level: 0.12 },
  ],
};

/**
 * The six kinds share one entry in `../Levels.ts`, so they must sit at one
 * level among themselves (the footstep lesson of Task 2): measured
 * (`docs/sound-levels.md`, first pass) the slug's single heavy clack came
 * out 9 dB over the crosses' faint clink. These bring each to the six's mean.
 */
const AMMO_GAIN: Readonly<Record<string, number>> = { bullets: 1, shells: 0.75, slugs: 0.54, crosses: 1.53, nails: 1.41, souls: 1.1 };

/** A pickup's design — exported so tests can read it without playing it. */
export function pickupDesign(kind: string, p = 1): Layer[] {
  switch (pickupFamily(kind)) {
    case "health":
      return [
        tick(0, 4200, 2, 0.01, 0.2, 1.4),
        { tone: "sine", f: [2630 * p, 3950 * p, 5480 * p], env: { a: 0.0005, d: 0.12 }, level: 0.12 },
        { at: 0.02, tone: "sine", f: [370 * p, 555 * p], to: 392 * p, over: 0.08, filters: [{ type: "lowpass", f: 2000 }], env: { a: 0.03, h: 0.04, d: 0.3 }, level: 0.2 },
      ];
    case "armour":
      return [slide(0, 700 * p, 420 * p, 0.12, 0.45, 1.2), ...clack(0.05, [900 * p, 1450 * p, 2250 * p], 0.1, 0.45), thud(0.05, 180 * p, 0.07, 0.5)];
    case "ammo":
      return (AMMO_DESIGN[kind] ?? AMMO_DESIGN.bullets)(p).map((l): Layer => ({ ...l, level: (l.level ?? 1) * (AMMO_GAIN[kind] ?? 1) }));
    case "key":
      return [
        ...clack(0, [1850 * p, 2780 * p, 4150 * p], 0.2, 0.3), ...clack(0.06, [2150 * p, 3200 * p], 0.15, 0.22),
        { tone: "sine", f: [196, 294], env: { a: 0.02, h: 0.05, d: 0.45 }, level: 0.14 },
      ];
    default:
      return [slide(0, 600 * p, 1200 * p, 0.1, 0.35, 1), ...clack(0.08, [1400 * p, 2200 * p, 3300 * p], 0.1, 0.55), thud(0.08, 150 * p, 0.08, 0.6)];
  }
}

/** Any pickup (`itemsTick`, the moment it is taken): what it is says how it sounds. */
export function itemPickup(kind: string): void {
  const k = typeof kind === "string" ? kind : "";
  const p = jit(0.04);
  lv(ENTRY[pickupFamily(k)], () => { play(pickupDesign(k, p)); });
}
