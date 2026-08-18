/**
 * Timers for the ambient audio bed and the vitals layer — the drone, the
 * heartbeat that speeds up at low health, the breathing, and the darkness
 * event's saved ambient level.
 *
 * Every initial value is copied from the reference exactly (`ambT=6`,
 * `heartT=0`, `breathT=0`, `darkT=0`, `savedAmb=0`) — `ambT`'s 6-second
 * head start before the first ambient cue is real, observable timing, not
 * an arbitrary default. `savedAmb` is only ever read inside an
 * `if(darkT>0)` guard and `darkT` also starts at 0, so its own initial
 * value is never actually observed at runtime — but it is typed as a
 * plain `number`, matching the reference's own `let darkT=0,savedAmb=0;`,
 * not given an invented nullable type.
 */
export const ambienceState = {
  ambT: 6,
  heartT: 0,
  breathT: 0,
  darkT: 0,
  savedAmb: 0,
};
