/**
 * Screen shake and hit-stop — the two values every impact in the game
 * writes to and the main loop reads back.
 *
 * A property on an exported object, not an exported `let`: an ES module's
 * `let` export is read-only to importers, so `trauma = ...` from
 * src/legacy.js would not compile. The object binding never changes; its
 * properties do. See the Plan 0D header for why this pattern replaces the
 * getter/setter pairs src/player/Input.ts used.
 *
 * The reference declares these as `let trauma=0,hitStop=0,zoomT=0;`
 * (reference/sonsurum.html line 911). `zoomT` is not carried over: it is
 * read nowhere in the reference or the port, so it is dead state, and
 * deleting a binding nothing reads cannot change behavior.
 */
export const screenShake = {
  /** 0..1, decays at 1.6/s; the camera offset is trauma². */
  trauma: 0,
  /** Seconds of hit-stop remaining; while positive the loop scales dt to 8%. */
  hitStop: 0,
};
