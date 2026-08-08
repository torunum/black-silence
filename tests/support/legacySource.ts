import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { assertNoDanglingQuote } from "./assertNoDanglingQuote";

const LEGACY_PATH = join(__dirname, "..", "..", "src", "legacy.js");

/**
 * Extracts a top-level `const NAME={...}` or `const NAME=[...]` literal out
 * of src/legacy.js's *live* source by balanced-bracket scanning, evaluates
 * it in an isolated sandbox, and returns its value.
 *
 * Unlike tests/support/reference.ts (which targets the frozen reference and
 * can safely hardcode line ranges), src/legacy.js is rewritten by every
 * later carve — so this reads by declaration name instead of by line
 * number, and keeps working as the port shrinks legacy.js. The day `S`
 * itself is extracted into a module, its caller should import that module
 * directly instead of calling this.
 *
 * The bracket counter below is blind to string literals, same as
 * tests/fidelity.test.ts's extractFunctionBody — see assertNoDanglingQuote
 * for why a `}`/`]` inside a string is a real risk here and what guards
 * against it silently returning a truncated literal instead of throwing.
 */
export function readLegacyConst<T>(name: string): T {
  const source = readFileSync(LEGACY_PATH, "utf8");
  const marker = `const ${name}=`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`readLegacyConst: '${marker}' not found in src/legacy.js`);

  let i = start + marker.length;
  while (i < source.length && source[i] !== "{" && source[i] !== "[") i++;
  const open = source[i];
  const close = open === "{" ? "}" : "]";

  let depth = 0;
  let end = i;
  for (; end < source.length; end++) {
    if (source[end] === open) depth++;
    else if (source[end] === close) {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }
  if (depth !== 0) throw new Error(`readLegacyConst: unbalanced '${open}${close}' in '${name}'`);

  const literal = source.slice(i, end);
  assertNoDanglingQuote(literal, `readLegacyConst("${name}")`);
  return runInNewContext(`(${literal});`, {}, { filename: "src/legacy.js (sandbox)" }) as T;
}
