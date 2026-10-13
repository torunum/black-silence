/**
 * THE HIT MARKER — a short flick of four corner ticks around the crosshair
 * when a blow lands (`docs/superpowers/plans/2026-10-08-impact.md`, Task 1).
 *
 * Four kinds, each readable without a glance at its colour:
 *
 * - **flesh** — four short cream ticks, a tenth of a second.
 * - **head** — the same in gold, with a pip above the centre.
 * - **armour** — grey, and a plus, not a cross: the blow did not get through.
 * - **kill** — red and larger, the ticks flying outward as it fades; a
 *   **headkill** adds the gold pip, a **gib** adds the plus too (eight ticks).
 *
 * It is drawn into the 320-wide overlay (`Overlay2D.ts`'s `fxTick`) pixel
 * by pixel, with a dark shadow a pixel down-right so it reads over a bright
 * wall, and draws nothing (not even a state change on the canvas) while
 * idle. One object, rewritten in place: no allocation.
 */

export type MarkerKind = "armour" | "flesh" | "head" | "kill" | "headkill" | "gib";

interface Look { len: number; gap: number; color: string; secs: number; spread: number; plus: boolean; pip: boolean; ticks: number }
export const LOOKS: Readonly<Record<MarkerKind, Look>> = {
  armour:   { len: 4, gap: 4, color: "#a9b1ba", secs: 0.11, spread: 0, plus: true,  pip: false, ticks: 4 },
  flesh:    { len: 5, gap: 4, color: "#efe6d2", secs: 0.12, spread: 1, plus: false, pip: false, ticks: 4 },
  head:     { len: 6, gap: 4, color: "#f2c444", secs: 0.18, spread: 1, plus: false, pip: true,  ticks: 4 },
  kill:     { len: 7, gap: 5, color: "#e2301c", secs: 0.34, spread: 6, plus: false, pip: false, ticks: 4 },
  headkill: { len: 8, gap: 5, color: "#e2301c", secs: 0.40, spread: 7, plus: false, pip: true,  ticks: 4 },
  gib:      { len: 9, gap: 5, color: "#ff4a22", secs: 0.46, spread: 9, plus: true,  pip: true,  ticks: 4 },
};
const RANK: Record<MarkerKind, number> = { armour: 1, flesh: 2, head: 3, kill: 4, headkill: 5, gib: 6 };

/** What is showing: `kind` for `left` more seconds of its `secs`. `left <= 0` is idle. */
export const marker: { kind: MarkerKind; left: number } = { kind: "flesh", left: 0 };

/** A blow landed. A bigger kind replaces a smaller one still showing; the same kind restarts. */
export function showMarker(kind: MarkerKind): void {
  if (marker.left > 0 && RANK[kind] < RANK[marker.kind] && marker.left > LOOKS[marker.kind].secs * 0.5) return;
  marker.kind = kind;
  marker.left = LOOKS[kind].secs;
}

export function resetMarker(): void { marker.left = 0; marker.kind = "flesh"; }

/**
 * Draws the marker at the middle of a `vw` x `vh` overlay and ages it by
 * `dt`. Called last in `fxTick`, so the weapon and the leg never cover it.
 */
export function drawHitMarker(g: CanvasRenderingContext2D, vw: number, vh: number, dt: number): void {
  if (marker.left <= 0) return;
  const look = LOOKS[marker.kind];
  const u = 1 - marker.left / look.secs;                      // 0 at the blow, 1 at the end
  marker.left -= dt;
  const out = Math.round(look.spread * u * u * 1.4);            // kills fly outward as they fade
  const gap = look.gap + out, cx = Math.round(vw / 2), cy = Math.round(vh / 2);
  const alpha = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
  for (let pass = 0; pass < 2; pass++) {
    const o = pass === 0 ? 1 : 0;                                // the shadow first, a pixel down and right
    g.fillStyle = pass === 0 ? `rgba(0,0,0,${(alpha * 0.6).toFixed(2)})` : look.color;
    if (pass === 1) g.globalAlpha = alpha;
    g.beginPath();
    for (let i = 0; i < look.len; i++) {
      const d = gap + i;
      if (!look.plus || marker.kind === "gib") {
        g.rect(cx - d + o, cy - d + o, 1, 1); g.rect(cx + d + o, cy - d + o, 1, 1);
        g.rect(cx - d + o, cy + d + o, 1, 1); g.rect(cx + d + o, cy + d + o, 1, 1);
      }
      if (look.plus) {
        const e = gap - 1 + i;
        g.rect(cx - e + o, cy + o, 1, 1); g.rect(cx + e + o, cy + o, 1, 1);
        g.rect(cx + o, cy - e + o, 1, 1); g.rect(cx + o, cy + e + o, 1, 1);
      }
    }
    if (look.pip) { g.rect(cx + o, cy - gap - look.len - 3 + o, 1, 3); }
    g.fill();
    if (pass === 1) g.globalAlpha = 1;
  }
}
