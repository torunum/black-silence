/**
 * Animation cues: counters that gameplay and input code bump when something
 * happens that the hands should react to, and that the viewmodel only ever
 * reads. Player feedback round 2, Task 4
 * (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md): a hurt
 * flinch, a dry-fire click, a pickup nod, an idle fidget cancelled by any
 * input.
 *
 * The rule that keeps gameplay independent of animation: every write to
 * this object is a bare `animCues.x++` (or the damage figure beside it) at
 * the point the event already happens, and nothing in the game reads it
 * back — only src/core/Loop.ts, which copies it into the ViewmodelFrame,
 * and src/render/viewmodel/react.ts, which compares each counter with the
 * value it saw last frame. A counter (rather than a flag something would
 * have to clear) means no reader ever writes here, and two events in one
 * frame are still two events.
 *
 * Nothing here draws from Math.random, and no trace fixture records it.
 */
export const animCues = {
  /** Bumped by damagePlayer (src/player/Player.ts) on every audible hit. */
  hurt: 0,
  /** The damage of the latest hit, after armour — the flinch scales with it. */
  hurtAmt: 0,
  /** Bumped by itemsTick (src/player/Interact.ts) when a weapon or ammo is picked up. */
  pickup: 0,
  /** Bumped by weaponTick (src/weapons/WeaponState.ts) on the dry click: empty magazine, no reserve. */
  dryFire: 0,
  /** Bumped by src/player/Input.ts on every key, mouse button, mouse movement and wheel event. */
  input: 0,
};
