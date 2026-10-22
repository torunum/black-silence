// Run after npm run build: node tools/prologue-render-test.cjs
// Optional: node tools/prologue-render-test.cjs path/to/game.html path/to/proof.png
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const root = path.resolve(__dirname, "..");
const html = path.resolve(
  process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"),
);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(html).href + "?qa=1");
    await page.locator("#mNew").click();
    await page.waitForTimeout(11000);
    const scene = await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA;
      const halo = q.J.scene.getObjectByName("prologueEmberHalo");
      const pool = q.J.scene.getObjectByName("prologueEmberPool");
      return {
        depthTest: halo?.material.depthTest,
        pool: !!pool,
        atSpawn: q.C.px === 19 && q.C.pz === 9,
        collision: q.solid(19, 17),
      };
    });
    assert(
      scene.atSpawn && scene.depthTest && scene.pool,
      "Depth-tested glow exists at actual starting view",
    );
    assert(!scene.collision, "Crypt throat stays walkable");
    const buffer = await page.screenshot();
    const png = PNG.sync.read(buffer);
    let emberPixels = 0;
    // The actual doorway, excluding the weapon and HUD. The previous invisible
    // glow yielded 79 warm pixels; the visible ember source yields over 4,000.
    for (let y = 305; y < 398; y++)
      for (let x = 535; x < 690; x++) {
        const i = (y * png.width + x) * 4;
        const [r, g, b] = png.data.subarray(i, i + 3);
        if (r > 60 && r > g * 1.65 && r > b * 2) emberPixels++;
      }
    assert(
      emberPixels > 500,
      "Ember glow must be visibly red at spawn, not only exist in the scene",
    );
    if (process.argv[3])
      fs.writeFileSync(path.resolve(process.argv[3]), buffer);
    const leaks = await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA;
      q.load(1);
      return q.J.scene.children.some((object) =>
        object.name.startsWith("prologueEmber"),
      );
    });
    assert(!leaks, "Ember scene additions do not leak into other chapters");
    assert.deepEqual(errors, [], "No browser runtime errors");
    console.log(
      JSON.stringify({
        passed: true,
        emberPixels,
        depthTest: scene.depthTest,
        otherChapterLeak: leaks,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
