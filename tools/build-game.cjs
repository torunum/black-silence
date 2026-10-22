// Rebuild the standalone game without altering the bundled engine or saved games.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const target = path.join(root, "THE-BLACK-SILENCE.html");
const begin = "/* BLACK_SILENCE_UPGRADE_BEGIN */";
const end = "/* BLACK_SILENCE_UPGRADE_END */";
let html = fs.readFileSync(target, "utf8");
const start = html.indexOf(begin);
if (start >= 0) {
  const finish = html.indexOf(end, start);
  if (finish < 0)
    throw new Error("Incomplete upgrade block; refusing to overwrite game.");
  html = html.slice(0, start) + html.slice(finish + end.length);
}
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
if (html.split(anchor).length !== 2)
  throw new Error("Unexpected engine version.");
const code = [
  "materials.js",
  "combat.js",
  "enemy-animation.js",
  "viewmodels.js",
  "finishers.js",
  "reload-audio-data.js",
  "reload-audio.js",
  "prologue.js",
  "render-warmup.js",
]
  .map((file) => fs.readFileSync(path.join(root, "src", file), "utf8"))
  .join("\n");
html = html.replace(anchor, () => `${begin}\n${code}\n${end}${anchor}`);
// Normalize entries left by earlier builds before adding the controls once.
html = html.replace(
  /\s*<span>DROP KICK<\/span><b>SPRINT FORWARD \+ RMB<\/b>/g,
  "",
);
html = html.replace(
  /\s*<span>FINISH STAGGERED ENEMY<\/span><b>E \(CLOSE RANGE\)<\/b>/g,
  "",
);
html = html.replace(
  "<span>POWER KICK</span><b>RMB</b>",
  "<span>POWER KICK</span><b>RMB</b>\n      <span>DROP KICK</span><b>SPRINT FORWARD + RMB</b>\n      <span>FINISH STAGGERED ENEMY</span><b>E (CLOSE RANGE)</b>",
);
fs.writeFileSync(target, html);
console.log(
  "Built THE-BLACK-SILENCE.html (" + Buffer.byteLength(html) + " bytes)",
);
