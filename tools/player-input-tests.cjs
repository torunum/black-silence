// Run the standalone HTML offline without game-state patches or a QA query.
// The blocked-capture cases use an actual sandboxed iframe and a recoverable
// browser-API rejection. The normal case uses real mouse and keyboard input.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const input = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const out = path.resolve(process.argv[3] || path.join(root, ".dream-loop", "player-input"));
const url = pathToFileURL(input).href;
const hash = () => crypto.createHash("sha256").update(fs.readFileSync(input)).digest("hex");
const sha256 = hash();
const timeout = 60000;

function readAmmo() {
  const ammo = document.querySelector("#am .num");
  return [Number(ammo.firstChild.textContent), Number(ammo.querySelector(".sub2").textContent.split("|")[1])];
}

const focus = page => page.evaluate(() => document.activeElement?.id);
const paused = page => page.locator("#pauseResume").waitFor({ state: "visible", timeout });
const locked = page => page.waitForFunction(() => document.pointerLockElement?.id === "game", null, { timeout });
const noQa = page => page.evaluate(() => typeof window.__BLACK_SILENCE_QA === "undefined");
const pauseNotice = page => page.locator("#pause .sub").textContent();

async function normal(page) {
  const steps = [];
  await page.goto(url, { timeout });
  assert(await noQa(page));
  assert.equal(await focus(page), "mNew");
  await page.keyboard.press("KeyM");
  await page.keyboard.press("Tab");
  assert.equal(await focus(page), "mChapter");
  await page.keyboard.press("Enter");
  await page.locator("#chapsel").waitFor({ state: "visible", timeout });
  assert(await page.locator("#chaplist > [role=button]").first().evaluate(el => el === document.activeElement));
  assert.equal(await page.locator("#chaplist [aria-disabled=true]").count(), 10);
  await page.keyboard.press("Tab");
  assert.equal(await focus(page), "chapBack");
  await page.keyboard.press("Space");
  assert.equal(await focus(page), "mChapter");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await focus(page), "mNew");
  await page.keyboard.press("Enter");
  await locked(page);
  steps.push("Fresh Title, Chapter Select, Back and New Game work with only the keyboard");

  // The ordinary Prologue cinematic can be skipped once it has begun.
  await page.waitForTimeout(1900);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => getComputedStyle(document.querySelector("#hud")).opacity === "1", null, { timeout });
  const map = page.locator("#automap");
  await map.waitFor({ state: "hidden", timeout });
  await page.keyboard.down("Tab");
  await map.waitFor({ state: "visible", timeout });
  await page.keyboard.up("Tab");
  await map.waitFor({ state: "hidden", timeout });
  steps.push("Menu M stays inactive and real held Tab still opens the map during play");
  const initial = await page.evaluate(readAmmo);
  await page.keyboard.down("KeyW");
  await page.mouse.down({ button: "left" });
  await page.waitForFunction(value => Number(document.querySelector("#am .num").firstChild.textContent) < value, initial[0], { timeout });
  await page.evaluate(() => document.exitPointerLock());
  await paused(page);
  assert.equal(await focus(page), "pauseResume");
  const resume = page.locator("#pauseResume");
  const box = await resume.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.up({ button: "left" });
  await page.keyboard.up("KeyW");
  const released = await page.evaluate(readAmmo);
  assert(released[0] < initial[0] && released[0] > 0);
  // The mouseup hits the pause action, which consumes it. The active weapon
  // must still stay quiet when Enter captures the pointer again.
  assert.equal(await page.evaluate(() => window.lastRealMouseUp), "pauseResume");
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press("KeyR");
  assert(!/RELOADING/.test(await page.locator("#wname").textContent()));
  await resume.focus();
  await page.keyboard.press("Enter");
  await locked(page);
  await page.waitForTimeout(1300);
  assert.deepEqual(await page.evaluate(readAmmo), released);
  steps.push("Pointer exit clears held fire and blocks reload input until resumed");

  // Headless pages are kept active by the browser, regardless of tab order.
  // Inject its window event here; the real game still releases native capture.
  await page.evaluate(() => dispatchEvent(new FocusEvent("blur")));
  await page.waitForFunction(() => !document.pointerLockElement &&
    !document.querySelector("#pause").classList.contains("hidden"), null, { timeout });
  await page.screenshot({ path: path.join(out, "paused-after-focus-loss.png") });
  await page.locator("#pauseSettings").click();
  await page.locator("#lookSensitivity").waitFor({ state: "visible", timeout });
  await page.keyboard.press("Escape");
  await paused(page);
  await resume.click();
  await locked(page);
  assert.deepEqual(await page.evaluate(readAmmo), released);
  steps.push("Window blur event releases native capture, Settings returns to the same pause, click recaptures without firing");

  // Save identity and chapter contents are owned by the native campaign code.
  const saveKey = "black-silence.campaign.v1";
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), saveKey);
  assert(saved?.id);
  await page.reload({ timeout });
  assert.equal(await focus(page), "mContinue");
  await page.keyboard.press("Enter");
  await locked(page);
  const restored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), saveKey);
  assert.equal(restored.id, saved.id);
  assert.equal(restored.level, saved.level);
  steps.push("Keyboard Continue starts the same saved campaign");
  return { steps, initial, released, chapter: restored.level };
}

async function denied(page) {
  const wrapper = path.join(out, "deny-capture-test.html");
  fs.writeFileSync(wrapper, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#080808"><iframe id="gameFrame" title="Blocked capture" sandbox="allow-scripts allow-same-origin" src="${url}" style="display:block;width:100vw;height:100vh;border:0"></iframe>`);
  await page.goto(pathToFileURL(wrapper).href, { timeout });
  const frame = page.frames().find(candidate => candidate.url() === url);
  assert(frame, "Browser loaded the original HTML in a real sandboxed frame");
  assert(await noQa(frame));
  await frame.locator("#mNew").click({ timeout });
  await paused(frame);
  await frame.waitForFunction(() => /capture was blocked/i.test(document.querySelector("#pause .sub").textContent), null, { timeout });
  assert.match(await frame.locator("#pauseResume").textContent(), /retry mouse capture/i);
  const before = await frame.evaluate(readAmmo);
  await page.keyboard.press("KeyW");
  await frame.locator("#pauseResume").click();
  await frame.waitForTimeout(1000);
  await paused(frame);
  assert.equal(await frame.evaluate(() => document.pointerLockElement), null);
  assert.equal(await frame.evaluate(() => getComputedStyle(document.querySelector("#hud")).opacity), "0");
  assert.deepEqual(await frame.evaluate(readAmmo), before);
  await page.screenshot({ path: path.join(out, "capture-blocked.png") });
  return { stoppedBeforeGameControl: true, retryPaused: true, notice: await pauseNotice(frame) };
}

async function recover(page) {
  // Reject the first launch request as a browser would. A genuine click on
  // the retry action restores the real native request and user activation.
  await page.addInitScript(() => {
    const native = Element.prototype.requestPointerLock;
    let allowRetry = false;
    window.rejectedCaptureRequests = 0;
    document.addEventListener("click", event => {
      if (event.isTrusted && event.target.closest("#pauseResume")) allowRetry = true;
    }, true);
    Element.prototype.requestPointerLock = function (...args) {
      if (allowRetry) return native.apply(this, args);
      window.rejectedCaptureRequests++;
      queueMicrotask(() => document.dispatchEvent(new Event("pointerlockerror")));
      return Promise.reject(new DOMException("capture declined for the test", "NotAllowedError"));
    };
  });
  await page.goto(url, { timeout });
  assert(await noQa(page));
  await page.locator("#mNew").click({ timeout });
  await paused(page);
  assert.match(await pauseNotice(page), /capture was blocked/i);
  const rejected = await page.evaluate(() => window.rejectedCaptureRequests);
  assert(rejected >= 1);
  const before = await page.evaluate(readAmmo);
  await page.locator("#pauseResume").click();
  await locked(page);
  await page.waitForTimeout(1500);
  assert.deepEqual(await page.evaluate(readAmmo), before);
  assert(!/capture was blocked/i.test(await pauseNotice(page)));
  assert.match(await page.locator("#pauseResume").textContent(), /click to return/i);
  return { rejected, genuineRetryCaptured: true, retryDidNotFire: true };
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.GAME_CHANNEL || "chrome", headless: true });
  const report = { sha256, browser: browser.version(), results: {}, pageErrors: [], network: [] };
  try {
    for (const [name, exercise] of [["normal", normal], ["realBrowserDenial", denied], ["recoverableDenial", recover]]) {
      const context = await browser.newContext({ offline: true, viewport: { width: 960, height: 650 } });
      try {
        const page = await context.newPage();
        page.on("pageerror", error => report.pageErrors.push(error.message));
        page.on("request", request => {
          if (/^https?:/i.test(request.url())) report.network.push(request.url());
        });
        await page.addInitScript(() => {
          document.addEventListener("mouseup", event => {
            if (event.isTrusted) window.lastRealMouseUp = event.target?.id || null;
          }, true);
        });
        report.results[name] = await exercise(page);
        console.log(`PASS ${name}`);
      } finally {
        await context.close();
      }
    }
    assert.equal(hash(), sha256);
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.network, []);
    report.passed = true;
  } finally {
    fs.writeFileSync(path.join(out, "player-input-results.json"), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
