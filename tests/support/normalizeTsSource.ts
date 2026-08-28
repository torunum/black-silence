/**
 * Strips TypeScript-only syntax that this port adds when it moves reference
 * JavaScript into a typed module, so what's left can be compared against the
 * untyped reference for true logical equivalence rather than requiring
 * byte-identity (which is incoherent for code the port necessarily
 * annotates — it only works for pure data, e.g. PXDEF).
 *
 * This is a targeted, regex-based normalizer for THIS codebase's dense,
 * near-unformatted source style — not a general TypeScript stripper. Each
 * transform below is safe only because of specific properties of that
 * style, documented per-transform. If a body's shape ever changes such that
 * a documented assumption no longer holds, do not widen a pattern to make a
 * diff disappear — stop and reconsider the transform.
 *
 * Erases, in order:
 *
 *  1. `export` immediately before a declaration keyword. Function BODY text
 *     can never legally contain `export` (it's a module-top-level-only
 *     keyword), so this is a no-op for the body-only comparisons this file
 *     is used for today; kept for when a caller compares fuller source.
 *
 *  2. A return-type annotation: `)` immediately followed by `: Type` and
 *     then `{` or `=>`. Unambiguous — `)` directly followed by `:` is not
 *     valid JavaScript anywhere except a TS return-type position, so this
 *     can never collide with an object-literal or ternary colon.
 *
 *  3. An arrow function's parameter-list type annotations — e.g.
 *     `(masks: number[][] | null,stumps?: boolean)=>...` back to
 *     `(masks,stumps?)=>...`. Structural, not a blind `: Type` regex: it
 *     only looks inside a parenthesized group that has no nested parens of
 *     its own AND is immediately followed by `=>` (`\(([^()]*)\)(?=\s*=>)`),
 *     so it can never match `{masks,stumps:stumps!==false}` two lines later
 *     in this exact body — that's a `{}` object literal, not a `()` group,
 *     and is never captured by the outer pattern at all. Within the
 *     captured parameter list only, each `name` / `name?` immediately
 *     followed by `: Type` loses the `: Type`, leaving the optional marker
 *     (if any) for transform 4 below to strip. Added when Plan 0F Task 8
 *     (`noImplicitAny`) annotated `buildSprites`' own `mk`/`mkM` helpers —
 *     see that task's brief for why the fix belongs here and not in the
 *     source.
 *
 *  4. An optional-parameter marker: an identifier immediately followed by
 *     `?` immediately followed by `,` or `)` — e.g. `stumps?)`. This is
 *     safe ONLY because in this codebase's source every ternary has a full
 *     expression on its "then" branch (`masks?texFromPx(...):null` — here
 *     `?` is followed by `t`, not `,`/`)`), and a ternary can never have an
 *     empty "then" branch (`cond?,` and `cond?)` are both syntax errors in
 *     plain JS), so this pattern can only ever match a genuine optional
 *     parameter marker. Verified against the current file with
 *     `grep -noE '.\?.' src/enemies/SpriteBaker.ts` before relying on this.
 *
 *  5. A non-null assertion `!`: immediately after a word character, `)` or
 *     `]`, and NOT immediately followed by `=` (which would make it the
 *     real operators `!=`/`!==` — e.g. `stumps!==false` in buildSprites
 *     must NOT be touched, and is not, because its `!` is followed by `=`).
 *     Prefix logical-not (`!masks`, `!hex`, `!base`) is untouched because
 *     it is always preceded by `(` or the start of an expression, never a
 *     word character — verified against the current file with
 *     `grep -noE '![^=]' src/enemies/SpriteBaker.ts`.
 */
export function normalizeTsSource(src: string): string {
  let out = src;
  out = out.replace(/\bexport\s+(function|const|let|var|class|interface|type|default)\b/g, "$1");
  out = out.replace(/\)\s*:\s*[A-Za-z_$][\w$.<>[\],\s|]*?\s*(?=\{|=>)/g, ")");
  out = out.replace(/\(([^()]*)\)(?=\s*=>)/g, (_all, params: string) =>
    "(" + params.replace(/([A-Za-z_$][\w$]*)(\??)\s*:\s*[A-Za-z_$][\w$.<>[\]]*(?:\s*\|\s*[A-Za-z_$][\w$.<>[\]]*)*\s*(?=[,)]|$)/g, "$1$2") + ")",
  );
  out = out.replace(/(\w)\?(?=[,)])/g, "$1");
  // TypeScript `as` casts are deliberately NOT normalized here: a
  // text-level regex for `as Type` cannot distinguish code from string
  // content — e.g. the literal string "as dark" would lose "as" too — and
  // this file's whole premise is that every transform is provably safe on
  // this codebase's source, not merely safe on the bodies it happens to run
  // against today. If a guarded body ever needs an `as` cast normalized,
  // reach for a real parser, not a regex.
  out = out.replace(/(?<=[\w)\]])!(?!=)/g, "");
  return out;
}
