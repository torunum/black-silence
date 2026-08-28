/**
 * Two lookup helpers used throughout the UI layer in place of a bare
 * `document.getElementById`/`document.querySelector`, whose return types
 * are nullable — every id/selector used with these two is one that
 * `index.html` actually defines (`tests/smoke.test.ts` asserts that for
 * every literal argument passed to either), so a miss here is a build
 * error, not a runtime possibility worth threading `| null` through every
 * caller for.
 *
 * This changes behavior in one narrow way: a missing element now throws a
 * named `Error` instead of the call site failing later with `Cannot read
 * property 'x' of null`. Both crash; this one says which id or selector.
 * That is a diagnostic improvement, not a gameplay change.
 */

/** getElementById that throws instead of returning null — every id here is in index.html. */
export function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing element #${id}`);
  return e;
}

/** querySelector that throws instead of returning null — every selector here matches index.html. */
export function q(selector: string): HTMLElement {
  const e = document.querySelector(selector);
  if (!e) throw new Error(`missing element for selector ${selector}`);
  return e as HTMLElement;
}
