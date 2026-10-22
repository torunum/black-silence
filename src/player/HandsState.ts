/**
 * What the player's body is doing that is not a weapon — read by the weapon loop, the kick, the viewmodel and the camera, written by
 * the two moves that own it (owner, 2026-10-22): the running drop kick (`src/weapons/WeaponState.ts`'s `doKick`) and the finish by hand
 * (`./Execution.ts`). A plain state module, so the readers need not import the writers (and the cycles that would close).
 */
export const hands = {
  /** The hands are finishing a monster: no shot, no reload, no kick, no walking. */
  busy: false,
  /** The finish under way, for the viewmodel: seconds into it and which of the finishes it is; null when there is none. */
  exec: null as { t: number; kind: number } | null,
  /** The kick under way is the running drop kick (both boots, the body behind them): set by `doKick`, cleared as the kick ends. */
  drop: false,
};

/** A level load: nothing the hands were doing carries over (`./Execution.ts` lets go of a monster no longer in the world). */
export function resetHands(): void {
  hands.busy = false; hands.exec = null; hands.drop = false;
}
