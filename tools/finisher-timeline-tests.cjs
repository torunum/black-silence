// node tools/finisher-timeline-tests.cjs GAME.html OUTPUT_DIRECTORY
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

assert(process.argv[2] && process.argv[3], "An input HTML and output directory are required");
const input = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const reportFile = path.join(output, "finisher-timeline-report.json");
const digest = () => crypto.createHash("sha256").update(fs.readFileSync(input)).digest("hex");
const sha256 = digest();
const report = { input, sha256, tests: [], errors: [] };
fs.mkdirSync(output, { recursive: true });
assert(!fs.existsSync(reportFile) || fs.realpathSync(input) !== fs.realpathSync(reportFile),
  "The report must not overwrite the game HTML");

function setScenario(kind) {
  const q = window.__BLACK_SILENCE_QA;
  q.resetCombat();
  q.pause(false);
  q.v.cine = null;
  for (const enemy of q.v.enemies) {
    q.J.scene.remove(enemy.sp);
    q.J.scene.remove(enemy.blob);
  }
  q.v.enemies = [];
  Object.assign(q.C, { px: 19, pz: 9, pyy: q.floor(19, 9) + q.eyeHeight,
    vx: 0, vy: 0, vz: 0, grounded: true, spawnGuard: 0 });
  Object.assign(q.Ct, { yaw: Math.PI, pitch: 0, firing: false });
  Object.assign(q.T, { cur: 0, hp: 70, dead: false, won: false });
  Object.assign(q.St, { wstate: "idle", wtime: 0, wCool: 0 });
  q.T.mag[0] = 6;
  q.setCamera();

  const enemy = q.spawn("z", 19, 11.18, false);
  Object.assign(enemy, { hp: 19, stagger: 4.6, staggerTried: true, cool: 2 });
  window.timelineEnemy = enemy;
  window.timelineRandom = Math.random;
  Math.random = () => (kind + .03) / 3;
}

function readState() {
  const q = window.__BLACK_SILENCE_QA, enemy = window.timelineEnemy;
  return {
    busy: q.oo.busy,
    execution: q.oo.exec,
    deaths: q.T.deaths,
    kills: q.T.kills,
    totalKills: q.T.totKills,
    hp: q.T.hp,
    ammo: q.T.mag[0],
    actorHealth: enemy.hp,
    actorDead: enemy.dead,
    actorExecuting: enemy.executing,
    actorDeathTime: enemy.deathT,
    actorHeight: enemy.sp.position.y,
    actorFloor: enemy.fy,
    actorHitboxHeight: enemy.h,
    poseExecution: q.pose().exec,
  };
}

async function play(page, kind) {
  await page.evaluate(setScenario, kind);
  await page.waitForFunction(() => __BLACK_SILENCE_QA.target() === window.timelineEnemy);
  const before = await page.evaluate(readState);
  await page.keyboard.press("e");
  await page.waitForFunction(() => __BLACK_SILENCE_QA.oo.busy);
  await page.evaluate(() => {
    Math.random = window.timelineRandom;
    delete window.timelineRandom;
  });
  const activeKind = await page.evaluate(() => __BLACK_SILENCE_QA.oo.exec.kind);
  assert.equal(activeKind, kind);
  return before;
}

async function pauseAt(page, time) {
  await page.evaluate(time => new Promise((resolve, reject) => {
    function waitForFrame() {
      const q = __BLACK_SILENCE_QA;
      if (q.oo.exec?.t >= time) {
        q.pause(true);
        resolve();
      } else if (!q.oo.busy) {
        reject(new Error(`Execution ended before the ${time} second probe`));
      } else {
        requestAnimationFrame(waitForFrame);
      }
    }
    requestAnimationFrame(waitForFrame);
  }), time);
  return page.evaluate(readState);
}

async function repeatInputs(page) {
  await page.keyboard.down("e");
  await page.keyboard.down("e");
  await page.keyboard.up("e");
  await page.keyboard.press("r");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 }, offline: true });
    page.on("pageerror", error => report.errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && message.text().includes("WebGLProgram"))
        report.errors.push(message.text());
    });
    await page.goto(pathToFileURL(input).href + "?qa=1");
    await page.locator("#mNew").click();
    await page.waitForFunction(() => {
      const q = window.__BLACK_SILENCE_QA;
      return q?.Be.started && !q.Be.inputLock && q.paintedGloves.ready();
    }, null, { timeout: 60000 });

    for (const kind of [0, 1, 2]) {
      const before = await play(page, kind);
      const paused = await pauseAt(page, .39);
      assert.equal(paused.actorDead, false);
      assert.equal(paused.hp, before.hp);
      await repeatInputs(page);
      await page.waitForTimeout(260);
      assert.deepEqual(await page.evaluate(readState), paused, "Pause must hold the current gesture and target state");
      await page.evaluate(() => __BLACK_SILENCE_QA.pause(false));
      const recovery = await pauseAt(page, 1.055);
      assert.equal(recovery.actorDead, true);
      if (kind !== 1) {
        const torsoAboveFloor = recovery.actorHeight - recovery.actorFloor;
        assert(torsoAboveFloor < recovery.actorHitboxHeight * .31,
          "A headless target should already be dropping out of the camera at recovery");
      }
      await repeatInputs(page);
      await page.evaluate(() => __BLACK_SILENCE_QA.pause(false));
      await page.waitForFunction(() => !__BLACK_SILENCE_QA.oo.busy && __BLACK_SILENCE_QA.pose().exec < 0);
      const after = await page.evaluate(readState);
      assert.equal(after.execution, null);
      assert.equal(after.actorExecuting, false);
      assert.equal(after.kills, before.kills + 1);
      assert.equal(after.totalKills, before.totalKills + 1);
      assert.equal(after.hp, before.hp + 15);
      assert.equal(after.ammo, before.ammo);
      assert.equal(after.deaths, before.deaths);
      report.tests.push({ kind, before, paused, recovery, after });
      console.log(`Finisher ${kind} paused, recovered and awarded one kill`);
    }

    const before = await play(page, 0);
    await pauseAt(page, .43);
    const obstructed = await page.evaluate(() => {
      const q = __BLACK_SILENCE_QA;
      const z = (q.C.pz + window.timelineEnemy.z) / 2;
      q.v.wallSegs.push({ x1: q.C.px - 1.8, z1: z, x2: q.C.px + 1.8, z2: z });
      const sight = q.line(q.C.px, q.C.pz, window.timelineEnemy.x, window.timelineEnemy.z);
      q.pause(false);
      return !sight;
    });
    assert(obstructed, "The injected wall must block the actor sightline");
    await page.waitForFunction(() => !__BLACK_SILENCE_QA.oo.busy && __BLACK_SILENCE_QA.pose().exec < 0);
    await page.waitForTimeout(180);
    const after = await page.evaluate(readState);
    assert.equal(after.actorDead, false);
    assert.equal(after.actorExecuting, false);
    assert.equal(after.kills, before.kills);
    assert.equal(after.totalKills, before.totalKills);
    assert.equal(after.hp, before.hp);
    assert.equal(after.ammo, before.ammo);
    report.tests.push({ cancel: "obstruction after first beat", before, after });
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    await browser.close();
    assert.equal(digest(), sha256);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
