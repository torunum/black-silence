import { readFileSync } from "node:fs";

/**
 * Reads a ported module's source text for the fidelity oracle's
 * body-identity comparisons, normalizing CRLF to LF.
 *
 * This repo has `core.autocrlf=true`, so a clean checkout — or `git
 * checkout --` after an edit — smudges tracked source files back to CRLF
 * line endings via git's checkout filter. tests/support/reference.ts's
 * `referenceLines()` already normalizes the reference side the same way
 * (splitting on `/\r\n|\n/`); without the same normalization on the module
 * side, a body-identity assertion would fail on pure `\r` noise that has
 * nothing to do with fidelity — a spurious red build for any Windows
 * contributor with the common `core.autocrlf=true` default, or for a CI
 * runner doing a clean checkout. Both sides of every comparison must be
 * normalized by construction: the oracle guards this whole port, and a
 * gate that cries wolf on checkout artifacts is a gate that gets ignored,
 * which is how a real drift eventually ships.
 */
export function readModuleSource(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}
