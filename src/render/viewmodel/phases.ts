/**
 * WHEN EACH WEAPON'S MECHANISM MOVES — the timing of the viewmodel's
 * choreography, in one place, so the art that draws a mechanism and the
 * foley that sounds it read the same numbers. Player feedback round 2
 * Task 3 (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`):
 * "time foley to the reload animation's phases … without changing any
 * reload timing". The draw functions in `./weapons/*.ts` pass these to
 * `hump`/`ramp` (`./pose.ts`); `src/weapons/Foley.ts` turns them into the
 * moments each sound plays. Moving a number here moves the picture and the
 * sound together; no gameplay timing lives here.
 *
 * Units: a **reload** phase is `pose.reload`, 0..1 through the weapon's
 * reload time (`WEAPON_STATS[slot].reload`); a **fire** phase is
 * `pose.action`'s input, 0..1 through the fire window (`fireWindow` in
 * `./animate.ts`, `min(.35, rate)`).
 *
 * - `Hump` is `hump(t, a, b, e)`'s `[a, b, e]`: the part moves out over
 *   `[a, a+e]`, stays, and comes back over `[b-e, b]`.
 * - `Ramp` is `ramp(t, a, b)`'s `[a, b]`: it moves once, over `[a, b]`.
 */
export type Hump = readonly [a: number, b: number, e: number];
export type Ramp = readonly [a: number, b: number];

/** Where a hump arrives (fully out) and where it is home again. */
export const out = (h: Hump): number => h[0] + h[2];
export const home = (h: Hump): number => h[1];

/** Slot 0. */
export const FLARE = {
  /** Fire: the thumb rolls the hammer back — `action = 1 - ramp(p, ...cock)`. */
  cock: [0.5, 0.9] as Ramp,
  /** Reload: the barrel breaks open on its front hinge and snaps shut. */
  open: [0.08, 0.88, 0.1] as Hump,
  /** Reload: the left hand pushes the fresh shell into the breech. */
  push: [0.48, 0.6] as Ramp,
} as const;

/** Slot 1. */
export const SAWED_OFF = {
  /** Fire: the forend racked back and forward over the fire window. */
  pump: [0.45, 1.0, 0.38] as Hump,
  /** Reload: the barrels break open downward and snap shut. */
  open: [0.08, 0.86, 0.1] as Hump,
  /** Reload: the two spent hulls jump clear, from the first to the second number. */
  hulls: [0.14, 0.3] as Ramp,
  /** Reload: the left hand drops the two fresh shells into the chambers. */
  load: [0.42, 0.6] as Ramp,
} as const;

/** Slot 2. */
export const RIFLE = {
  /** Reload: the magazine drops out. */
  drop: [0.1, 0.22] as Ramp,
  /** Reload: the fresh magazine is seated. */
  seat: [0.42, 0.6] as Ramp,
  /** Reload: the T-handle is pulled back and let fly. */
  charge: [0.78, 0.96, 0.05] as Hump,
} as const;

/** Slot 3. */
export const TOMMY = {
  /** Reload: the drum slides out sideways. */
  out: [0.08, 0.24] as Ramp,
  /** Reload: the full drum is swung in. */
  seat: [0.4, 0.6] as Ramp,
  /** Reload: the cocking knob racked back and let go. */
  knob: [0.78, 0.97, 0.06] as Hump,
} as const;

/** Slot 4. */
export const SNIPER = {
  /** Fire: the bolt handle lifts and drops. */
  lift: [0.25, 0.95, 0.12] as Hump,
  /** Fire: the bolt runs back and forward. */
  back: [0.37, 0.83, 0.2] as Hump,
  /** Reload: the bolt handle lifts, and drops to lock at the end. */
  reloadLift: [0.08, 0.95, 0.06] as Hump,
  /** Reload: the bolt opens, and closes before it locks. */
  reloadBack: [0.12, 0.9, 0.08] as Hump,
  /** Reload: the left hand swaps the magazine. */
  mag: [0.26, 0.64, 0.1] as Hump,
} as const;

/** Slot 5. */
export const CROSS = {
  /** Fire: the next cross rises out of the roof slot. */
  rise: [0.5, 0.95] as Ramp,
  /** Reload: the roof hinges open along one eave, and closes. */
  lid: [0.1, 0.86, 0.12] as Hump,
  /** Reload: the new cross is laid in and settles. */
  loaded: [0.5, 0.62] as Ramp,
} as const;

/** Slot 6. */
export const NAIL = {
  /** Reload: the empty hopper lifted off its post, and the full one dropped on. */
  lift: [0.12, 0.66, 0.12] as Hump,
} as const;

/** Slot 7. */
export const REAPER = {
  /** Fire: the core is spent and re-forms. */
  spent: [0.12, 1.0, 0.4] as Hump,
  /** Reload: the core gutters out to a husk. */
  dying: [0.02, 0.14] as Ramp,
  /** Reload: the husk is plucked out. */
  pluck: [0.16, 0.34] as Ramp,
  /** Reload: the fresh soul is brought up and pressed in. */
  press: [0.4, 0.62] as Ramp,
  /** Reload: the claws open wide, and close on the new core. */
  claws: [0.1, 0.72, 0.1] as Hump,
} as const;

/**
 * The rotating parts (`./animate.ts`): the spin eases toward its target at
 * `up` per second while firing and `down` per second after — a first-order
 * lag, so its time constants are `1/up` and `1/down` seconds.
 */
export const SPIN = { up: 9, down: 1.6 } as const;
