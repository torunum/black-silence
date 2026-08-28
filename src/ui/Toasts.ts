import { blip } from "../audio/Sfx";
import { after } from "../core/Timers";
import type { Achievement } from "../content/achievements";

/**
 * The achievement toast — the card that slides in at the top-right and
 * fades out 4.2 seconds later.
 *
 * Copied verbatim from reference/sonsurum.html lines 1863-1870 (see
 * tests/support/reference.ts's REF.achievementToast). Two things changed
 * shape, neither one behavior:
 *
 * - **The strings became a table.** The reference passes them inline,
 *   `ach("punt","FIELD GOAL","Kick an enemy into a wall")`; the port passes
 *   `ACHIEVEMENTS.punt`. src/content/achievements.ts explains why that
 *   table had to wait until this carve.
 * - **The unlocked record is a parameter.** The reference reads the `S.ach`
 *   global directly. Passing it in keeps this module free of any binding to
 *   game state — the same choice src/render/Overlay2D.ts's fxTick and
 *   src/render/viewmodel/draw.ts's drawViewmodel made, and the one that
 *   leaves Plan 0D free to move `S` without touching this file.
 *
 * `style.opacity` is assigned a string here where the reference assigns the
 * numbers 1 and 0; CSSStyleDeclaration stringifies either one to the same
 * "1"/"0", so the rendered result is identical — TypeScript simply won't
 * let the number through.
 */

/** What `S.ach` stores per unlocked id: the title and description as they were at unlock time. */
export interface UnlockedAchievement { title: string; desc: string; }

export function ach(a: Achievement, unlocked: Record<string, UnlockedAchievement>): void {
  if (unlocked[a.id]) return; unlocked[a.id] = { title: a.title, desc: a.desc };
  const t = document.createElement("div"); t.className = "toast";
  t.innerHTML = "✦ " + a.title + "<small>" + a.desc + "</small>";
  document.getElementById("toasts").appendChild(t);
  requestAnimationFrame(() => t.style.opacity = "1");
  blip(160, .5, "sine", .05, 120, true);
  after(() => { t.style.opacity = "0"; after(() => t.remove(), 500); }, 4200);
}
