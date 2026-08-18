/**
 * The three flags that gate almost every system, plus the main loop's
 * previous-frame timestamp.
 *
 * - `started` — false while the menu is up; the loop returns immediately.
 * - `inputLock` — true during a cinematic; mouse look and firing are off
 *   but the world keeps simulating.
 * - `pianoOpen` — true while the playable piano has focus; pauses the world.
 * - `last` — the timestamp the loop diffs against for dt.
 */
export const game = { started: false, inputLock: false, pianoOpen: false, last: performance.now() };
