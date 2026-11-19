// Native offline Settings plus a seeded fixture for deterministic camera/readback comparison.
// node tools/impact-shake-tests.cjs [candidate.html] [baseline.html] [output-dir]
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const input = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const baseline = process.argv[3] && path.resolve(process.argv[3]);
const output = path.resolve(process.argv[4] || path.join(root, ".dream-loop", "impact-shake"));
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const shakeKey = "black-silence.impact-shake.v1";
const lookKey = "black-silence.look.v1";
const campaignKey = "black-silence.campaign.v1";
const oldLook = '{"sensitivity":95,"inverted":true}';
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const readAmmo = () => Number(document.querySelector("#am .num").firstChild.textContent);
const lock = page => page.waitForFunction(() => document.pointerLockElement?.id === "game" &&
  document.querySelector("#pause").classList.contains("hidden"));
const noQa = () => typeof window.__BLACK_SILENCE_QA === "undefined";

const probe = `
window.impactProof = {
  ready() {
    sk();
    v.cine = null;
    Be.inputLock = false;
    C.spawnGuard = 999;
    for (const enemy of v.enemies) enemy.stun = 999;
  },
  place(x, z, yaw, pitch) {
    Object.assign(C, { px: x, pz: z, pyy: ie(x, z) + Yo,
      vx: 0, vy: 0, vz: 0, grounded: true, spawnGuard: 999 });
    Object.assign(Ct, { yaw, pitch, firing: false });
    J.camera.position.set(C.px, C.pyy, C.pz);
    J.camera.rotation.set(pitch, yaw, 0, "YXZ");
    J.camera.updateMatrixWorld(true);
    if (T.level === 0) TR(0, true);
  },
  cameraSample() {
    const lookNow = Object.getOwnPropertyDescriptor(performance, "now");
    const pose = () => [
      ...J.camera.position.toArray(), J.camera.rotation.x,
      J.camera.rotation.y, J.camera.rotation.z,
    ];
    const worldPoint = new Y(19.1, 1.4, 9.2);
    const projected = () => {
      J.camera.updateMatrixWorld(true);
      return { pose: pose(), point: worldPoint.clone().project(J.camera).toArray() };
    };
    const passages = (kick = 0, drop = false, punch = false) => {
      const trace = {};
      Tj(0, 1000, 0, () => {}, () => { trace.hands = projected(); });
      Utt(J.camera, kick, () => {
        if (punch) Nj(J.camera, () => { trace.world = projected(); });
        else trace.world = projected();
      }, drop);
      return trace;
    };
    function synchronizedMove(now, dt) {
      Object.defineProperty(performance, "now", { configurable: true, value: () => now });
      try { m_(dt); }
      finally {
        if (lookNow) Object.defineProperty(performance, "now", lookNow);
        else delete performance.now;
      }
    }
    function prepareMotion(trauma) {
      impactProof.place(19, 13, 0.15, -0.06);
      Object.assign(C, { vx: 2.5, vz: 0.4, bobT: 0.78 });
      St.recoilPitch = 0.07;
      He.trauma = 0;
      M0(trauma);
      synchronizedMove(894, 0.012);
    }
    prepareMotion(0);
    const steady = passages();
    prepareMotion(0.75);
    const before = projected();
    const physical = { x: C.px, z: C.pz, y: C.pyy, recoil: St.recoilPitch, trauma: He.trauma,
      yaw: Ct.yaw, pitch: Ct.pitch, bulletDirection: J.camera.getWorldDirection(new Y()).toArray() };
    const motion = passages();
    const dropkick = passages(0.14, true);
    Oj(); gh(0.45, 1); Yj(0.7, 1);
    const impactPunch = passages(0, false, true);
    Oj();
    const errors = [];
    function captureException(pass) {
      try { pass(); } catch (error) { errors.push({ message: error.message, camera: projected() }); }
    }
    const throwDuringPaint = () => { throw new Error("sample draw failed"); };
    captureException(() => Tj(0, 1000, 0, () => {}, throwDuringPaint));
    captureException(() => Utt(J.camera, 0.14, throwDuringPaint, true));
    const after = { ...projected(), bulletDirection: J.camera.getWorldDirection(new Y()).toArray() };
    Be.inputLock = true;
    J.camera.position.x += 0.25;
    J.camera.rotation.z += 0.17;
    const script = { untouched: projected(), scene: passages() };
    Be.inputLock = false;
    He.trauma = 0;
    synchronizedMove(894, 0);
    const expired = { untouched: projected(), scene: passages() };
    return { steady, before, physical, motion, dropkick, impactPunch, errors, after, script, expired };
  },
  door() {
    const x = 66.18, z = 10.60, tx = 68, tz = 11;
    this.place(x, z, Math.atan2(tx - x, tz - z) + Math.PI, Math.atan2(0.2, Math.hypot(tx - x, tz - z)));
  },
  doorOpen() { return FX().opened.includes("34,5"); },
  finishTarget() {
    for (const enemy of v.enemies) {
      J.scene.remove(enemy.sp);
      J.scene.remove(enemy.blob);
    }
    v.enemies = [];
    this.place(19, 13, 0, 0);
    T.hp = 70;
    const enemy = Du("z", 19, 12.8, true);
    Object.assign(enemy, { hp: 20, stagger: 4.6, staggerTried: true, cool: 2 });
    window.impactFinishTarget = enemy;
  },
  finishing() { return Boolean(oo.busy); },
  finished() { return !oo.busy && window.impactFinishTarget?.dead; },
  motion() {
    return { phase: ve.t, kick: St.kickAnim, drop: oo.drop,
      position: [C.px, C.pyy, C.pz], velocity: [C.vx, C.vy, C.vz] };
  },
  sprinting() { return C.grounded && C.vz < -7.5; },
};
`;

function fixture(file, name) {
  const source = fs.readFileSync(file, "utf8");
  assert.equal(source.split(anchor).length, 2, "Test fixture must match a single engine startup");
  const fixturePath = path.join(output, name);
  const existing = fs.existsSync(fixturePath) ? fs.realpathSync(fixturePath) : fixturePath;
  for (const protectedPath of [input, baseline].filter(Boolean)) {
    assert.notEqual(existing.toLowerCase(), fs.realpathSync(protectedPath).toLowerCase());
  }
  fs.writeFileSync(fixturePath, source.replace(anchor, () => probe + anchor));
  return pathToFileURL(fixturePath).href;
}

function assertPoseNear(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    assert(Math.abs(actual[i] - expected[i]) < 1e-10, `Camera axis ${i}: ${actual[i]} != ${expected[i]}`);
  }
}

function checkSamples(full, reduced, off) {
  const poses = [full, reduced, off];
  const between = (a, b, gain) => a.map((base, i) => base + (b[i] - base) * gain);
  const delta = (a, b) => a.map((axis, i) => axis - b[i]);
  const nativeBefore = full.before.pose;
  const neutral = full.steady.hands.pose;
  assert(Math.abs(nativeBefore[0] - neutral[0]) > 0.01);
  assert(Math.abs(nativeBefore[1] - neutral[1]) > 0.01);
  assert(Math.abs(nativeBefore[5] - neutral[5]) > 0.01);
  const nativeDropkick = delta(full.dropkick.world.pose, full.motion.world.pose);
  const nativeImpact = delta(full.impactPunch.world.pose, full.motion.world.pose);
  assert(nativeDropkick.some(value => Math.abs(value) > 0.01));
  assert(nativeImpact.some(value => Math.abs(value) > 0.001));
  for (const [sample, gain] of poses.map((sample, i) => [sample, [1, 0.5, 0][i]])) {
    assert.deepEqual(sample.physical, full.physical, "Native recoil, trauma, player and ray direction match");
    assert.deepEqual(sample.before, full.before, "Hitscan start after movement uses the same pose");
    assert.deepEqual(sample.after.pose, nativeBefore, "Native pose is restored on leaving render callbacks");
    assert.deepEqual(sample.after.bulletDirection, full.physical.bulletDirection);
    assert.deepEqual(sample.motion.world, sample.motion.hands, "Hands/projected contact and world agree");
    assertPoseNear(sample.motion.world.pose, between(neutral, nativeBefore, gain));
    assertPoseNear(delta(sample.dropkick.world.pose, sample.motion.world.pose), nativeDropkick);
    assertPoseNear(delta(sample.impactPunch.world.pose, sample.motion.world.pose), nativeImpact);
    assert.deepEqual(sample.errors, [
      { message: "sample draw failed", camera: full.before },
      { message: "sample draw failed", camera: full.before },
    ]);
    for (const frame of [sample.script, sample.expired]) {
      assert.deepEqual(frame.scene.hands, frame.untouched);
      assert.deepEqual(frame.scene.world, frame.untouched);
    }
  }
  assert.deepEqual(off.motion, full.steady, "Off retains the native bob and unshaken projection");
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const report = { candidate: hash(input), baseline: baseline ? hash(baseline) : null, checks: [], errors: [] };
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  report.browser = browser.version();
  const note = name => { report.checks.push(name); console.log("PASS", name); };
  const watch = page => page.on("pageerror", error => report.errors.push(error.message));
  const real = await browser.newContext({ viewport: { width: 960, height: 600 } });
  const page = await real.newPage();
  watch(page);
  const slider = page.locator("#impactShake");
  async function select(game, key) {
    const slider = game.locator("#impactShake");
    await slider.focus();
    await game.keyboard.press(key);
  }
  async function openPauseSettings(game) {
    await game.evaluate(() => { if (document.pointerLockElement) document.exitPointerLock(); });
    await game.locator("#pauseResume").waitFor();
    await game.keyboard.press("Tab");
    assert.equal(await game.evaluate(() => document.activeElement.id), "pauseSettings");
    await game.keyboard.press("Enter");
    await game.locator("#impactShake").waitFor();
    assert.equal(await game.evaluate(() => document.activeElement.id), "lookSensitivity");
  }
  async function resumeFromSettings(game) {
    await game.keyboard.press("Escape");
    assert.equal(await game.evaluate(() => document.activeElement.id), "pauseSettings");
    await game.keyboard.press("Shift+Tab");
    assert.equal(await game.evaluate(() => document.activeElement.id), "pauseResume");
    await game.keyboard.press("Enter");
    await lock(game);
  }

  try {
    await page.goto(pathToFileURL(input).href);
    assert(await page.evaluate(noQa));
    await page.evaluate(([key, old]) => localStorage.setItem(key, old), [lookKey, oldLook]);
    await page.reload();
    await page.locator("#mSettings").click();
    assert.equal(await slider.inputValue(), "100");
    assert.equal(await slider.getAttribute("aria-valuetext"), "Full");
    assert.equal(await page.locator("#lookSensitivity").inputValue(), "95");
    assert(await page.locator("#invertLook").isChecked());
    await select(page, "ArrowLeft");
    assert.equal(await slider.getAttribute("aria-valuetext"), "Reduced");
    await page.setViewportSize({ width: 360, height: 480 });
    await slider.scrollIntoViewIfNeeded();
    const bounds = await slider.boundingBox();
    assert(bounds && bounds.width >= 38 && bounds.x + bounds.width <= 360);
    await page.screenshot({ path: path.join(output, "settings-reduced-short.png") });
    await page.setViewportSize({ width: 960, height: 600 });
    await page.locator("#setBack").click();
    await page.locator("#mNew").click();
    await lock(page);
    await page.waitForTimeout(1900);
    await page.keyboard.press("Space");
    await page.waitForFunction(() => getComputedStyle(document.querySelector("#hud")).opacity === "1");
    const save = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), campaignKey);
    assert(save?.id);
    await openPauseSettings(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "impactShake");
    await page.keyboard.press("Home");
    assert.equal(await slider.getAttribute("aria-valuetext"), "Off");
    await page.screenshot({ path: path.join(output, "pause-settings-off.png") });
    await resumeFromSettings(page);
    await page.mouse.move(530, 300);
    const before = await page.evaluate(readAmmo);
    await page.mouse.down();
    try {
      await page.waitForFunction(before => Number(document.querySelector("#am .num").firstChild.textContent) < before, before);
    } finally {
      await page.mouse.up();
    }
    await page.keyboard.press("KeyR");
    await page.waitForFunction(() => /RELOADING/.test(document.querySelector("#wname").textContent));
    await page.waitForFunction(before => Number(document.querySelector("#am .num").firstChild.textContent) === before, before);
    await page.evaluate(() => document.exitPointerLock());
    await page.locator("#pauseResume").waitFor();
    await page.reload();
    assert(await page.evaluate(noQa));
    assert(await page.locator("#mContinue").isVisible());
    await page.locator("#mSettings").click();
    assert.equal(await slider.getAttribute("aria-valuetext"), "Off");
    const restored = await page.evaluate(([campaign, look, shake]) => ({
      save: JSON.parse(localStorage.getItem(campaign)), look: localStorage.getItem(look), shake: localStorage.getItem(shake),
    }), [campaignKey, lookKey, shakeKey]);
    assert.equal(restored.save.id, save.id);
    assert.equal(restored.save.level, save.level);
    assert.equal(restored.look, oldLook);
    assert.equal(restored.shake, "0");
    note("Native no-QA Settings, compact layout, Tab/Shift+Tab/Escape, capture, fire and reload preserve campaign and old input prefs");

    await page.evaluate(key => localStorage.setItem(key, "corrupt"), shakeKey);
    await page.reload();
    await page.locator("#mSettings").click();
    assert.equal(await slider.getAttribute("aria-valuetext"), "Full");
    const denied = await browser.newContext();
    const deniedPage = await denied.newPage();
    watch(deniedPage);
    await deniedPage.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
    });
    await deniedPage.goto(pathToFileURL(input).href);
    await deniedPage.locator("#mSettings").click();
    assert.equal(await deniedPage.locator("#impactShake").getAttribute("aria-valuetext"), "Full");
    await deniedPage.locator("#impactShake").focus();
    await deniedPage.keyboard.press("Home");
    assert.equal(await deniedPage.locator("#impactShake").getAttribute("aria-valuetext"), "Off");
    await denied.close();
    note("Invalid and unavailable preferences default to Full, with a usable session preference when storage is denied");
    await real.close();

    async function sample(url, preference) {
      const context = await browser.newContext({ viewport: { width: 800, height: 520 } });
      const page = await context.newPage();
      watch(page);
      await page.goto(url);
      if (preference !== undefined) {
        await page.evaluate(([key, value]) => localStorage.setItem(key, String(value)), [shakeKey, preference]);
        await page.reload();
      }
      assert(await page.evaluate(noQa));
      await page.locator("#mNew").click();
      await lock(page);
      await page.evaluate(() => impactProof.ready());
      const state = await page.evaluate(() => impactProof.cameraSample());
      return { state, page, context };
    }
    const measuredUrl = fixture(input, "candidate-fixture.html");
    const full = await sample(measuredUrl);
    await full.context.close();
    const reduced = await sample(measuredUrl, 50);
    await reduced.context.close();
    const off = await sample(measuredUrl, 0);
    if (baseline) {
      const original = await sample(fixture(baseline, "baseline-fixture.html"));
      assert.deepEqual(full.state, original.state, "Full exactly matches the original camera/projection and simulation sample");
      await original.context.close();
      note("Full matches the unmodified baseline exactly across all sampled camera, projection and gameplay state");
    }
    checkSamples(full.state, reduced.state, off.state);
    report.render = {
      unshaken: full.state.steady.hands.pose,
      full: full.state.motion.hands.pose,
      reduced: reduced.state.motion.hands.pose,
      off: off.state.motion.hands.pose,
      bulletDirection: full.state.physical.bulletDirection,
    };
    note("Exact 100/50/0 shake amplitude projects coherently with unchanged recoil, dropkick staging, hit origin, script, and exception recovery");
    const play = off.page;
    await play.evaluate(() => impactProof.door());
    await play.keyboard.press("KeyE");
    await play.waitForFunction(() => impactProof.doorOpen());
    await play.evaluate(() => impactProof.finishTarget());
    await play.keyboard.press("KeyE");
    await play.waitForFunction(() => {
      if (!impactProof.finishing()) return false;
      document.exitPointerLock();
      return true;
    });
    await openPauseSettings(play);
    const executing = await play.evaluate(() => impactProof.motion());
    assert(await play.evaluate(() => impactProof.finishing()));
    await select(play, "ArrowRight");
    assert.equal(await play.locator("#impactShake").getAttribute("aria-valuetext"), "Reduced");
    assert.deepEqual(await play.evaluate(() => impactProof.motion()), executing);
    await resumeFromSettings(play);
    await play.waitForFunction(() => impactProof.finished());
    note("Real E opens the native Prologue door and completes a finisher after changing shake while paused mid-animation");

    await play.evaluate(() => impactProof.place(19, 13, 0, 0));
    await play.keyboard.down("ShiftLeft");
    await play.keyboard.down("KeyW");
    await play.waitForFunction(() => impactProof.sprinting());
    await play.mouse.move(400, 260);
    await play.mouse.click(400, 260, { button: "right" });
    await play.waitForFunction(() => {
      if (!impactProof.motion().drop) return false;
      document.exitPointerLock();
      return true;
    });
    await play.keyboard.up("KeyW");
    await play.keyboard.up("ShiftLeft");
    await openPauseSettings(play);
    const flying = await play.evaluate(() => impactProof.motion());
    assert(flying.drop && flying.kick > 0 && flying.velocity[2] < -7.5);
    await select(play, "Home");
    assert.deepEqual(await play.evaluate(() => impactProof.motion()), flying);
    await resumeFromSettings(play);
    await play.waitForFunction(() => !impactProof.motion().drop);
    const landed = await play.evaluate(() => impactProof.motion());
    assert(landed.position[2] < flying.position[2] - 0.3, "The native airborne lunge resumes after closing Settings");
    note("Real forward sprint/right-click travels through the dropkick after changing shake while paused mid-flight");
    await off.context.close();
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    await browser.close();
    assert.equal(hash(input), report.candidate);
    if (baseline) assert.equal(hash(baseline), report.baseline);
    fs.writeFileSync(path.join(output, "impact-shake-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
