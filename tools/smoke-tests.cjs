// Real requestAnimationFrame / WebGL smoke test for the distributable HTML.
// Run: node tools/smoke-tests.cjs (requires npm install and desktop Chrome).
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const artifacts = path.join(root, ".dream-loop");
fs.mkdirSync(artifacts, { recursive: true });
function statistics(frames) {
  const sorted = frames.filter((value) => value > 0).sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length);
  return {
    frames: sorted.length,
    meanMs: +mean.toFixed(2),
    p95Ms: +(sorted[Math.floor(sorted.length * 0.95)] || 0).toFixed(2),
    maxMs: +(sorted.at(-1) || 0).toFixed(2),
    approximateFPS: +(1000 / mean).toFixed(1),
  };
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--allow-file-access-from-files"],
  });
  const errors = [];
  const report = { viewport: "1280x720", maps: [], actions: {} };
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      pathToFileURL(path.join(root, "THE-BLACK-SILENCE.html")).href + "?qa=1",
    );
    await page.locator("#mNew").click();
    await page.waitForFunction(
      () =>
        window.__BLACK_SILENCE_QA?.Be.started &&
        window.__BLACK_SILENCE_QA.v.enemies.length,
    );
    // Wait for the shipped wake-up cinematic to release input and actually show
    // the viewmodel. A fixed delay can incorrectly test an invisible kick.
    await page.waitForFunction(
      () => {
        const q = window.__BLACK_SILENCE_QA;
        return q.raster.canvas && !q.raster.skipped && !q.Be.inputLock;
      },
      null,
      { timeout: 30000 },
    );
    await page.evaluate(() => {
      window.__smoke = { frames: [], previous: 0, action: null };
      const loop = (time) => {
        const p = window.__smoke,
          q = window.__BLACK_SILENCE_QA;
        if (p.previous) p.frames.push(time - p.previous);
        p.previous = time;
        if (p.action) {
          const a = p.action,
            e = window.__smokeEnemy;
          a.distance = Math.max(
            a.distance || 0,
            Math.hypot(q.C.px - a.x, q.C.pz - a.z),
          );
          a.jump = Math.max(a.jump || 0, q.C.pyy - a.y);
          a.enemyDistance = Math.max(
            a.enemyDistance || 0,
            Math.hypot(e.x - a.ex, e.z - a.ez),
          );
          a.airborne = a.airborne || e.flung > 0;
          a.finisherSeen = a.finisherSeen || q.oo.busy;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      window.__prepareSmokeArena = () => {
        const q = window.__BLACK_SILENCE_QA;
        q.resetCombat();
        q.pause(false);
        q.Be.inputLock = false;
        q.Be.pianoOpen = false;
        q.v.cine = null;
        q.T.dead = q.T.won = false;
        q.T.hp = 100;
        q.T.kickCd = 0;
        for (const id of ["levelend", "win", "dead"])
          document.getElementById(id).classList.add("hidden");
        for (const e of q.v.enemies) {
          q.J.scene.remove(e.sp);
          q.J.scene.remove(e.blob);
        }
        q.v.enemies = [];
        let arena;
        for (let z = 2; z < q.v.GH - 1 && !arena; z++)
          for (let x = 1; x < q.v.GW - 1; x++) {
            const px = (x + 0.5) * q.cellSize,
              pz = (z + 0.5) * q.cellSize;
            if (
              !q.solid(px, pz) &&
              !q.solid(px, pz - 6) &&
              q.line(px, pz, px, pz - 6) &&
              Math.abs(q.floor(px, pz) - q.floor(px, pz - 6)) < 0.1
            ) {
              arena = { px, pz };
              break;
            }
          }
        if (!arena) throw new Error("No level test corridor");
        Object.assign(q.C, arena, {
          pyy: q.floor(arena.px, arena.pz) + q.eyeHeight,
          vx: 0,
          vy: 0,
          vz: 0,
          grounded: true,
          spawnGuard: 100,
        });
        q.Ct.yaw = q.Ct.pitch = 0;
        q.Ct.firing = false;
        q.St.wstate = "idle";
        q.St.wtime = 0;
        for (const key of Object.keys(q.li)) q.li[key] = false;
        const enemy = q.spawn("z", q.C.px, q.C.pz - 2, true);
        enemy.hp = enemy.maxhp = 250;
        enemy.stun = 10;
        window.__smokeEnemy = enemy;
        window.__smoke.action = {
          x: q.C.px,
          z: q.C.pz,
          y: q.C.pyy,
          ex: enemy.x,
          ez: enemy.z,
        };
        window.__smoke.frames = [];
        window.__smoke.previous = 0;
        q.setCamera();
      };
    });
    // Real movement and hit-stop with the browser animation loop left intact.
    await page.evaluate(() => {
      window.__prepareSmokeArena();
      const q = window.__BLACK_SILENCE_QA;
      q.li.ShiftLeft = q.li.KeyW = true;
      q.C.vz = -10;
      q.kick();
    });
    await page.waitForFunction(
      () => window.__BLACK_SILENCE_QA.melee()?.t > 0.22,
    );
    await page.screenshot({ path: path.join(artifacts, "smoke-dropkick.png") });
    await page.waitForFunction(() => !window.__BLACK_SILENCE_QA.melee(), null, {
      timeout: 15000,
    });
    const drop = await page.evaluate(() => ({
      ...window.__smoke.action,
      hp: window.__smokeEnemy.hp,
      frames: window.__smoke.frames,
    }));
    assert(
      drop.jump > 0.3 && drop.distance > 1 && drop.airborne && drop.hp < 250,
      "Actual RAF dropkick must jump, move, hit and launch an enemy",
    );
    report.actions.dropkick = { ...drop, frames: statistics(drop.frames) };
    // Use the actual E key binding, then let all three contact frames and recovery render.
    await page.evaluate(() => {
      window.__prepareSmokeArena();
      window.__smokeEnemy.hp = 10;
      window.__smokeEnemy.stagger = 4;
    });
    await page.keyboard.press("e");
    await page.waitForFunction(
      () => window.__BLACK_SILENCE_QA.oo.exec?.t > 0.45,
    );
    await page.screenshot({ path: path.join(artifacts, "smoke-finisher.png") });
    await page.waitForFunction(() => !window.__BLACK_SILENCE_QA.oo.busy, null, {
      timeout: 15000,
    });
    const finish = await page.evaluate(() => ({
      ...window.__smoke.action,
      dead: window.__smokeEnemy.dead,
      frames: window.__smoke.frames,
    }));
    assert(
      finish.dead && finish.finisherSeen,
      "Actual E input must run and finish the finisher",
    );
    report.actions.finisher = { ...finish, frames: statistics(finish.frames) };
    // Separate first-use model/raster compilation from repeated animation cost.
    report.actions.warmFinishers = [];
    for (const kind of [0, 1, 2]) {
      const actualKind = await page.evaluate((kind) => {
        window.__prepareSmokeArena();
        const q = window.__BLACK_SILENCE_QA;
        window.__smokeEnemy.hp = 10;
        window.__smokeEnemy.stagger = 4;
        const random = Math.random;
        Math.random = () => (kind + 0.1) / 3;
        try {
          if (!q.finish()) throw new Error("Cannot start warm finisher");
        } finally {
          Math.random = random;
        }
        return q.oo.exec.kind;
      }, kind);
      await page.waitForFunction(
        () => !window.__BLACK_SILENCE_QA.oo.busy,
        null,
        { timeout: 15000 },
      );
      const warm = await page.evaluate(() => ({
        dead: window.__smokeEnemy.dead,
        frames: window.__smoke.frames.slice(),
      }));
      assert(warm.dead, `Warm finisher ${kind} must complete`);
      report.actions.warmFinishers.push({
        requestedKind: kind,
        actualKind,
        ...statistics(warm.frames),
      });
    }
    // Restart while the combat animation is active, not only between actions.
    const restart = await page.evaluate(() => {
      window.__prepareSmokeArena();
      const q = window.__BLACK_SILENCE_QA;
      q.kick();
      q.load(0);
      q.C.spawnGuard = 100;
      q.pause(false);
      return {
        melee: q.melee() === null,
        busy: q.oo.busy,
        exec: q.oo.exec,
        level: q.T.level,
      };
    });
    assert(
      restart.melee && !restart.busy && !restart.exec && restart.level === 0,
      "Restart must clear combat animation state",
    );
    report.actions.restart = restart;
    // Every shipped campaign map initializes and renders with a live RAF loop.
    for (let level = 0; level < 11; level++) {
      const info = await page.evaluate((level) => {
        const q = window.__BLACK_SILENCE_QA;
        q.load(level);
        q.T.dead = q.T.won = false;
        q.C.spawnGuard = 100;
        q.pause(false);
        window.__smoke.action = null;
        return {
          level,
          width: q.v.GW,
          height: q.v.GH,
          enemies: q.v.enemies.length,
          finitePlayer: [q.C.px, q.C.pz, q.C.pyy].every(Number.isFinite),
        };
      }, level);
      await page.waitForTimeout(700);
      await page.evaluate(() => {
        window.__smoke.frames = [];
        window.__smoke.previous = 0;
      });
      await page.waitForFunction(
        () => window.__smoke.frames.length >= 32,
        null,
        { timeout: 20000 },
      );
      const frames = await page.evaluate(() => window.__smoke.frames.slice());
      assert(
        info.width > 0 && info.height > 0 && info.finitePlayer,
        `Map ${level} must initialize a valid world`,
      );
      report.maps.push({ ...info, performance: statistics(frames) });
      console.log(
        `Map ${level}: ${info.width}x${info.height}, ${info.enemies} enemies, ${statistics(frames).approximateFPS} FPS`,
      );
    }
    // Also exercise a normal, offline launch without the opt-in QA bridge.
    const offline = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      offline: true,
    });
    const ordinary = await offline.newPage();
    ordinary.on("pageerror", (error) => errors.push(error.message));
    await ordinary.goto(
      pathToFileURL(path.join(root, "THE-BLACK-SILENCE.html")).href,
    );
    await ordinary.locator("#mNew").click();
    await ordinary.waitForTimeout(11000);
    const qaAbsent = await ordinary.evaluate(
      () => typeof window.__BLACK_SILENCE_QA === "undefined",
    );
    assert(
      qaAbsent && !(await ordinary.locator("#mainmenu").isVisible()),
      "Ordinary offline launch starts without QA hooks",
    );
    await ordinary.screenshot({
      path: path.join(artifacts, "ordinary-offline-1080.png"),
    });
    report.ordinaryLaunch = { offline: true, qaAbsent, viewport: "1920x1080" };
    await offline.close();
    assert.equal(
      errors.length,
      0,
      "No browser runtime errors: " + errors.join("; "),
    );
    report.errors = errors;
    fs.writeFileSync(
      path.join(artifacts, "smoke-report.json"),
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
