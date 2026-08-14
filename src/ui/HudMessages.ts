/**
 * The centre-screen HUD line ("YOU NEED THE RED KEY", "SECRET FOUND") and
 * the two full-screen damage flashes.
 *
 * Copied verbatim from reference/sonsurum.html lines 1909-1914 (see
 * tests/support/reference.ts's REF.hudMessages), plus the one-line message
 * timer lifted out of the reference's main loop (REF.messageTimer) into
 * tickMessage below — the only other code that touched `msgT`, so moving it
 * here keeps msgEl/msgT private module state instead of bare exported `let`
 * bindings. src/legacy.js's loop calls tickMessage(dt) from exactly where
 * the decrement used to sit, inside the same `if(started&&!S.dead)` guard,
 * so a paused or dead player still freezes the message the way they did.
 *
 * `msgEl` is captured eagerly at module scope, matching the reference's own
 * `const msgEl=document.getElementById("msg")` — the same eager-capture
 * rule (and the same import-order consequence for tests) as
 * src/render/Overlay2D.ts's fx2d context. The two flash elements are looked
 * up per call instead, also matching the reference.
 *
 * `style.opacity` takes a string here where the reference assigns numbers;
 * CSSStyleDeclaration stringifies both to the same value.
 */

const msgEl = document.getElementById("msg");
let msgT = 0;

export function showMsg(t: string, sec?: number): void {
  msgEl.textContent = t; msgT = sec || 2.2;
}

/** Counts the current HUD message down and clears it when it expires. */
export function tickMessage(dt: number): void {
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.textContent = ""; }
}

export function flashDmg(a: number): void {
  const d = document.getElementById("dmg"); d.style.opacity = String(a);
  setTimeout(() => d.style.opacity = "0", 90);
}

export function flashHoly(a: number): void {
  const d = document.getElementById("holy"); d.style.opacity = String(a);
  setTimeout(() => d.style.opacity = "0", 80);
}
