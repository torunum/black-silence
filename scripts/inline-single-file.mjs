/**
 * Inlines `dist/` into one double-clickable `THE-BLACK-SILENCE.html`.
 *
 * The game ships as a single file that loads from `file://` with no network:
 * three.js comes from npm and is bundled, every texture and sprite is drawn
 * procedurally at boot, and there are no external assets to fetch. That is
 * the whole point of the asset policy in `docs/direction.md` — so the build
 * output should be one file a player can open, not a directory that needs a
 * server.
 *
 * `docs/STATUS.md` described this step for a long time without a script to do
 * it; the file at the repo root was produced by hand and went stale. This
 * makes it reproducible:
 *
 *     npm run build && node scripts/inline-single-file.mjs
 *
 * The output is gitignored — it is a build artifact, not source.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const OUT = "THE-BLACK-SILENCE.html";

if (!existsSync(join(DIST, "index.html"))) {
  console.error(`No ${DIST}/index.html — run "npm run build" first.`);
  process.exit(1);
}

let html = readFileSync(join(DIST, "index.html"), "utf8");

// Vite emits <script type="module" crossorigin src="/assets/index-HASH.js">.
// Inline it and drop crossorigin, which is meaningless (and in some browsers
// hostile) on a file:// page.
const scriptRe = /<script\b[^>]*\bsrc="\/?([^"]+\.js)"[^>]*><\/script>/g;
let inlined = 0;
html = html.replace(scriptRe, (_all, src) => {
  const p = join(DIST, src);
  if (!existsSync(p)) throw new Error(`referenced script not found: ${p}`);
  inlined++;
  // No escaping needed for the bundle itself, but a literal </script> inside a
  // string would end the tag early. Vite's minifier does not emit one, and
  // this guards the case rather than assuming it.
  const js = readFileSync(p, "utf8").replace(/<\/script>/gi, "<\\/script>");
  return `<script type="module">\n${js}\n</script>`;
});

const linkRe = /<link\b[^>]*\bhref="\/?([^"]+\.css)"[^>]*>/g;
let inlinedCss = 0;
html = html.replace(linkRe, (_all, href) => {
  const p = join(DIST, href);
  if (!existsSync(p)) throw new Error(`referenced stylesheet not found: ${p}`);
  inlinedCss++;
  return `<style>\n${readFileSync(p, "utf8")}\n</style>`;
});

// Fail loudly rather than shipping a file that silently fetches nothing.
if (inlined === 0) {
  console.error("Inlined no scripts — the build output's shape changed and this script did not notice.");
  process.exit(1);
}
const leftover = html.match(/\b(?:src|href)="\/?assets\//g);
if (leftover) {
  console.error(`Still references ${leftover.length} external asset(s) after inlining:`, leftover);
  process.exit(1);
}

writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`${OUT} — ${kb} kB, ${inlined} script(s) and ${inlinedCss} stylesheet(s) inlined, no external references.`);
