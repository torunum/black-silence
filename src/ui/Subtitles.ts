import { pick } from "../utils/math";
import { MONOLOGUE as M } from "../content/monologue";
import { el } from "./dom";

/**
 * ADEM's subtitles — the voice in the player's ear.
 *
 * Copied verbatim from reference/sonsurum.html lines 1852-1862 (see
 * tests/support/reference.ts's REF.subtitles), plus the two-line subtitle
 * timer lifted out of the reference's chatterTick (REF.subtitleTimer) into
 * tickSubtitles below. That timer is the only other code that touches
 * `subT`, so moving it here is what lets subT/lastSayT/onceSaid stay
 * private module state rather than bare exported `let` bindings — the same
 * rule src/audio/AudioEngine.ts, src/render/SceneRef.ts and
 * src/render/Overlay2D.ts follow. src/legacy.js's chatterTick still calls
 * tickSubtitles(dt) from exactly where the decrement used to sit, so the
 * order of work inside one frame is unchanged.
 *
 * Two rules are load-bearing and easy to lose:
 *
 * - **The once-only set.** Sighting lines (`see_*`), boss lines (`boss_*`)
 *   and seven named ids fire once per session and are then silent forever.
 *   Marking `onceSaid[id]` happens BEFORE the 3-second throttle is checked,
 *   so a once-only line that loses the throttle race is spent, not queued —
 *   preserved deliberately.
 * - **`force` skips both.** A forced line ignores the once-only set and the
 *   throttle, but still refreshes lastSayT, so it delays the next
 *   unforced line.
 */

const onceSaid: Record<string, number> = {};
let subT = 0, lastSayT = -9;

/** The ids that fire at most once per session, beyond the `see_`/`boss_` prefixes. */
const ONCE_ONLY = ["kickready", "piano", "w2", "w5", "w6", "challenge", "key"];

export function say(id: string, force?: boolean): void {
  const lines = M[id]; if (!lines) return;
  const now = performance.now() / 1000;
  if (!force) {
    if (id.startsWith("see_") || id.startsWith("boss_") || ONCE_ONLY.includes(id)) {
      if (onceSaid[id]) return; onceSaid[id] = 1;
    }
    if (now - lastSayT < 3) return;
  }
  lastSayT = now;
  el("subt").innerHTML = "<b>ADEM</b><br>“" + pick(lines) + "”";
  subT = 4.3;
}

/** Counts the current subtitle down and clears the element when it expires — the reference's chatterTick opened with exactly this. */
export function tickSubtitles(dt: number): void {
  if (subT > 0) {
    subT -= dt;
    if (subT <= 0) el("subt").innerHTML = "";
  }
}
