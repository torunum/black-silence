/**
 * A safety net for tests/fidelity.test.ts's `extractFunctionBody`: it locates
 * a declaration's closing delimiter by counting braces/brackets character by
 * character, blind to string literals — the same blindness documented (and
 * removed, as rule 4) in normalizeTsSource's doc comment. A `}` or `]`
 * sitting inside a string can make that counter stop at the wrong place,
 * silently handing back a truncated prefix instead of the real body — it
 * sides of a comparison truncated identically, so the test stays green
 * while comparing less than it claims to.
 *
 * Recounting the already-extracted text's own brace balance cannot catch
 * this: both callers' scanners always stop exactly when their running
 * depth returns to zero, so whatever slice they hand back is *always*
 * brace-balanced by construction — truncated or not. That check would be a
 * no-op.
 *
 * What a stopped-mid-string extraction DOES leave behind is a dangling
 * quote: the slice ends partway through a string literal, so it contains
 * an odd number of `"`, `'`, or `` ` ``. A well-formed extraction — every
 * string in it opened and closed within the slice — always has an even
 * count of each. This is a cheap trip-wire, not a parser: it does not make
 * extraction string-aware (an astray brace pair inside a *balanced* string,
 * e.g. `"{}"`, still slips past uncounted, same as before — see
 * extractFunctionBody's own doc comment on `${...}` template placeholders
 * for why that particular case is already known to be harmless here). It
 * only guarantees that the specific, demonstrated failure — a scanner
 * stopping on an unmatched brace character inside a string — throws
 * instead of silently returning a truncated result.
 */
export function assertNoDanglingQuote(text: string, label: string): void {
  for (const q of ['"', "'", "`"] as const) {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\\") {
        i++; // skip the escaped character, e.g. \" or \\
        continue;
      }
      if (text[i] === q) count++;
    }
    if (count % 2 !== 0) {
      throw new Error(
        `${label}: extracted text has an odd number of ${q} characters (${count}) — ` +
          `brace/bracket counting almost certainly stopped inside an unterminated string ` +
          `literal, producing a truncated result rather than the real body/literal.`,
      );
    }
  }
}
