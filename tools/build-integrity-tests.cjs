// Portable source/engine checks; fixtures are isolated from the delivered HTML.
const fs = require("node:fs"), path = require("node:path");
const assert = require("node:assert/strict"), crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const html = fs.readFileSync(path.join(root, "THE-BLACK-SILENCE.html"), "utf8");
const begin = "/* BLACK_SILENCE_UPGRADE_BEGIN */", end = "/* BLACK_SILENCE_UPGRADE_END */";
const villageBegin = "/* BLACK_SILENCE_VILLAGE_PRESENTATION_BEGIN";
const villageEnd = "/* BLACK_SILENCE_VILLAGE_PRESENTATION_END */";
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const markers = [begin, end, villageBegin, villageEnd, anchor];
for (const marker of markers) assert.equal(html.split(marker).length, 2, "One marker: " + marker);
const positions = markers.map(marker => html.indexOf(marker));
assert(positions.every((value, index) => index === 0 || value > positions[index - 1]), "Native → upgrade → village → startup order");
const build = fs.readFileSync(path.join(root, "tools/build-game.cjs"), "utf8");
const moduleList = build.match(/const code = (\[[\s\S]*?\])/)[1];
const modules = [...moduleList.matchAll(/"([^"\n]+)"/g)].map(match => match[1]);
const source = modules.map(file => fs.readFileSync(path.join(root, "src", file), "utf8")).join("\n");
assert.equal(html.slice(positions[0] + begin.length, positions[1]), "\n" + source + "\n", "Embedded upgrade matches editable sources");
const village = fs.readFileSync(path.join(root, "src/village-presentation.js"), "utf8");
assert.equal(html.slice(positions[2], positions[4]), village + "\n", "Village source is embedded verbatim");
assert.equal(hash(village), "d60bd40de6b093eadcfb9e3f99d822c0987250813647484bef79b73c96a0d627", "User handoff Village presentation preserved");
const engine = (html.slice(0, positions[0]) + html.slice(positions[4]))
  .replace(/\s*<span>DROP KICK<\/span><b>SPRINT FORWARD \+ RMB<\/b>/g, "")
  .replace(/\s*<span>FINISH STAGGERED ENEMY<\/span><b>E \(CLOSE RANGE\)<\/b>/g, "");
assert.equal(hash(engine), "6dd6c59430c843ef82b065bde2eba13fab8ce9d166876ba2877e6e90882e7899", "Original bundled engine/content preserved");
const artifacts = path.join(root, ".dream-loop");
fs.mkdirSync(artifacts, { recursive: true });
const fixture = fs.mkdtempSync(path.join(artifacts, "build-integrity-"));
fs.mkdirSync(path.join(fixture, "tools"));
fs.cpSync(path.join(root, "src"), path.join(fixture, "src"), { recursive: true });
fs.copyFileSync(path.join(root, "tools/build-game.cjs"), path.join(fixture, "tools/build-game.cjs"));
const fixtureHTML = path.join(fixture, "THE-BLACK-SILENCE.html");
const run = () => spawnSync(process.execPath, [path.join(fixture, "tools/build-game.cjs")], { encoding: "utf8" });
fs.writeFileSync(fixtureHTML, html);
for (let attempt = 0; attempt < 2; attempt++) {
  const result = run(); assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(fixtureHTML, "utf8"), html, "Rebuild preserves exact released bytes");
}
let refused = 0;
for (const marker of [begin, end, villageBegin, villageEnd]) {
  for (const invalid of [html.replace(marker, ""), html.replace(marker, marker + marker)]) {
    fs.writeFileSync(fixtureHTML, invalid);
    assert.notEqual(run().status, 0, "Malformed marker must fail");
    assert.equal(fs.readFileSync(fixtureHTML, "utf8"), invalid, "Failure must not rewrite input");
    refused++;
  }
}
const report = { passed: true, bytes: Buffer.byteLength(html), sha256: hash(html), engineSha256: hash(engine), villageSha256: hash(village), moduleHashes: Object.fromEntries([...modules, "village-presentation.js"].map(file => [file, hash(fs.readFileSync(path.join(root, "src", file)))])), idempotentBuilds: 2, invalidInputsRefusedWithoutWrite: refused, fixture };
fs.writeFileSync(path.join(artifacts, "build-integrity-results.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
