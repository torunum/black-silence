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
 *  3. An optional-parameter marker: an identifier immediately followed by
 *     `?` immediately followed by `,` or `)` — e.g. `stumps?)`. This is
 *     safe ONLY because in this codebase's source every ternary has a full
 *     expression on its "then" branch (`masks?texFromPx(...):null` — here
 *     `?` is followed by `t`, not `,`/`)`), and a ternary can never have an
 *     empty "then" branch (`cond?,` and `cond?)` are both syntax errors in
 *     plain JS), so this pattern can only ever match a genuine optional
 *     parameter marker. Verified against the current file with
 *     `grep -noE '.\?.' src/enemies/SpriteBaker.ts` before relying on this.
 *
 *  4. A non-null assertion `!`: immediately after a word character, `)` or
 *     `]`, and NOT immediately followed by `=` (which would make it the
 *     real operators `!=`/`!==` — e.g. `stumps!==false` in buildSprites
 *     must NOT be touched, and is not, because its `!` is followed by `=`).
 *     Prefix logical-not (`!masks`, `!hex`, `!base`) is untouched because
 *     it is always preceded by `(` or the start of an expression, never a
 *     word character — verified against the current file with
 *     `grep -noE '![^=]' src/enemies/SpriteBaker.ts`.
 *
 * Explicitly NOT handled: a parameter-level type annotation inside an
 * inline arrow function embedded in a data-heavy body, e.g. rewriting
 * `(masks,stumps?)=>...` to `(masks: number[][], stumps?: boolean)=>...`.
 * That `:` cannot be told apart from an object-literal shorthand colon
 * (`{masks,stumps:stumps!==false}` appears two lines later in this exact
 * body) without real parsing. If a future edit adds such an annotation
 * inside texFromPx's or buildSprites' body, the normalized comparison will
 * start failing — that is the intended outcome. Extend this normalizer
 * deliberately with a structural (bracket-depth-aware) pass at that point,
 * do not add a blind `: Type` regex.
 */
export function normalizeTsSource(src: string): string {
  let out = src;
  out = out.replace(/\bexport\s+(function|const|let|var|class|interface|type|default)\b/g, "$1");
  out = out.replace(/\)\s*:\s*[A-Za-z_$][\w$.<>[\],\s|]*?\s*(?=\{|=>)/g, ")");
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
