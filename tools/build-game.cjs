// Rebuild the standalone game without altering the bundled engine or saved games.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const target = path.join(root, "THE-BLACK-SILENCE.html");
const begin = "/* BLACK_SILENCE_UPGRADE_BEGIN */";
const end = "/* BLACK_SILENCE_UPGRADE_END */";
const villageBegin = "/* BLACK_SILENCE_VILLAGE_PRESENTATION_BEGIN";
const villageEnd = "/* BLACK_SILENCE_VILLAGE_PRESENTATION_END */";
let html = fs.readFileSync(target, "utf8");
for (const marker of [begin, end, villageBegin, villageEnd]) {
  if (html.split(marker).length > 2)
    throw new Error("Duplicate extension marker; refusing to overwrite game.");
}
if (html.includes(begin) !== html.includes(end) ||
    html.includes(villageBegin) !== html.includes(villageEnd))
  throw new Error("Incomplete extension markers; refusing to overwrite game.");
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
// The October 23 handoff adds a second extension after the original upgrade.
// Rebuild both in that same order so wrappers keep their intended precedence.
const villageStart = html.indexOf(villageBegin);
if (villageStart >= 0) {
  const villageFinish = html.indexOf(villageEnd, villageStart);
  const startup = html.indexOf(anchor);
  if (villageFinish < 0 || villageFinish > startup ||
      !/^\s*$/.test(html.slice(villageFinish + villageEnd.length, startup)))
    throw new Error("Unexpected village extension boundary.");
  html = html.slice(0, villageStart) + html.slice(startup);
} else if (html.includes(villageEnd)) {
  throw new Error("Incomplete village extension.");
}
const village = fs.readFileSync(path.join(root, "src", "village-presentation.js"), "utf8");
if (!village.startsWith(villageBegin) || !village.trimEnd().endsWith(villageEnd) ||
    village.split(villageBegin).length !== 2 || village.split(villageEnd).length !== 2)
  throw new Error("Unexpected village source markers.");
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
html = html.replace(anchor, () => `${begin}\n${code}\n${end}${village}\n${anchor}`);
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
