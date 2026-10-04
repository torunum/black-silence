/**
 * THE TRANSITION'S STATE AND ITS SCREEN — a leaf, so that the frame loop and
 * the viewmodel can ask "is a level changing?" without importing the module
 * that changes it (`./Transition.ts`, which imports the level loader).
 *
 * ## The four phases
 *
 * - `idle` — nothing is happening.
 * - `walk` — the exit door is opening and the camera walks into it, the world
 *   going to black (`WALK` seconds).
 * - `card` — the chapter card over black, until a deliberate key or click.
 * - `arrive` — the next level is loaded; the camera walks in from its entrance
 *   door to the spawn as the black lifts (`ARRIVE` seconds).
 *
 * The black is `#fade`, a full-screen div above the HUD and below the card.
 * Nothing here draws from `Math.random`.
 */

export type Phase = "idle" | "walk" | "card" | "arrive";

/** Seconds of each phase and of the beats inside them (see `Transition.ts` for the timeline in full). */
export const T = {
  walk: 1.5,
  /** Black before the card shows, and the time the card must have been up before anything continues it. */
  hold: 0.25, cardAfter: 1.0,
  arrive: 2.3,
} as const;

export const trans = {
  phase: "idle" as Phase,
  /** Seconds into the current phase. */
  t: 0,
  /** Seconds the card has been showing (negative while it is still black). */
  card: 0,
  /** The stats and grade, taken the moment the door was opened. */
  grade: "",
  stats: "",
  line: "",
  /** The camera at the moment the walk began. */
  from: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
  cued: new Set<string>(),
};

export const smooth = (a: number, b: number, t: number): number => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** The black over the world (0 clear .. 1 black). Made on first use if the page has none. */
export function setFade(opacity: number): void {
  let f = document.getElementById("fade");
  if (!f) {
    f = document.createElement("div");
    f.id = "fade";
    f.style.cssText = "position:fixed;inset:0;background:#000;z-index:19;pointer-events:none;opacity:0";
    document.body.appendChild(f);
  }
  f.style.opacity = String(opacity);
}

/** The HUD and the crosshair, hidden for a transition and faded back in at its end — the opening's own treatment. */
export function showHud(on: boolean): void {
  for (const id of ["hud", "cross"]) {
    const e = document.getElementById(id);
    if (!e) continue;
    e.style.transition = on ? "opacity .8s" : "opacity .4s";
    e.style.opacity = on ? "" : "0";
  }
}

/** True while the hands should not be drawn: the walk, the card, and the arrival. */
export function transitionHidesHands(): boolean {
  return trans.phase !== "idle";
}

/** Back to nothing happening — for a test, or a level loaded from outside the flow. The fade, the HUD and the card are put away. */
export function resetTransition(): void {
  trans.phase = "idle"; trans.t = 0; trans.card = 0; trans.cued.clear();
  setFade(0);
  showHud(true);
  document.getElementById("levelend")?.classList.add("hidden");
}
