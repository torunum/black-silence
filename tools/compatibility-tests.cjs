// Exercise legacy settings/chapter saves through the shipped menu, without QA.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const input = path.resolve(process.env.GAME_HTML || path.join(root, "THE-BLACK-SILENCE.html"));
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, ".dream-loop"));

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const errors = [];
  const network = [];
  const report = {
    input,
    sha256: require("node:crypto").createHash("sha256").update(fs.readFileSync(input)).digest("hex"),
    legacySave: false,
    settingsPersist: false,
    chapterStarts: false,
  };
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    await page.goto(
      pathToFileURL(input).href,
    );
    // A v1 save created by the original game contains progression/settings only.
    await page.evaluate(() =>
      localStorage.setItem(
        "blacksilence.save",
        JSON.stringify({
          v: 1,
          maxLevel: 3,
          masterVolume: 0.25,
          renderWidth: 320,
          shadows: false,
        }),
      ),
    );
    await page.reload();
    assert.equal(
      await page.evaluate(() => typeof window.__BLACK_SILENCE_QA),
      "undefined",
    );
    await page.locator("#mSettings").click();
    assert.equal(await page.locator("#volSlider").inputValue(), "25");
    assert.equal(await page.locator("#resVal").textContent(), "320");
    assert.equal(await page.locator("#shadowVal").textContent(), "OFF");
    report.legacySave = true;
    await page.locator("#volSlider").fill("37");
    await page.locator("#volSlider").dispatchEvent("input");
    await page.reload();
    await page.locator("#mSettings").click();
    assert.equal(await page.locator("#volSlider").inputValue(), "37");
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("blacksilence.save")).maxLevel,
      ),
      3,
    );
    report.settingsPersist = true;
    await page.locator("#setBack").click();
    await page.locator("#mChapter").click();
    assert.equal(await page.locator("#chaplist .mbtn:not(.locked)").count(), 4);
    assert.equal(await page.locator("#chaplist .mbtn.locked").count(), 7);
    await page.locator("#chaplist .mbtn").nth(3).click();
    await page.locator("#chapsel").waitFor({ state: "hidden" });
    assert.equal(await page.locator("#mainmenu").isVisible(), false);
    await page.waitForTimeout(2000);
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("blacksilence.save")).maxLevel,
      ),
      3,
    );
    report.chapterStarts = true;
    report.errors = errors;
    report.network = network;
    assert.deepEqual(network, [], "Standalone file must not request network resources");
    assert.deepEqual(
      errors,
      [],
      "Legacy chapter start must have no runtime errors",
    );
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, "compatibility-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
