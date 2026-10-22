// Real RAF audio/visual phase check. The callback delay is CPU submission delay,
// not a claim to measure the listener's physical speaker/display latency.
const fs = require("node:fs"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      pathToFileURL(
        path.resolve(
          process.env.GAME_HTML || path.join(root, "THE-BLACK-SILENCE.html"),
        ),
      ).href + "?qa=1",
    );
    await page.locator("#mNew").click();
    const runs = [];
    for (const weapon of [0, 1]) {
      await page.evaluate((index) => {
        const q = window.__BLACK_SILENCE_QA,
          a = q.reloadAudio;
        q.resetCombat();
        a.clearTestEffects();
        q.pause(false);
        q.Be.inputLock = false;
        q.Be.pianoOpen = false;
        q.v.cine = null;
        q.T.dead = q.T.won = false;
        q.C.spawnGuard = 100;
        q.T.hp = 100;
        q.T.cur = index;
        q.T.weapons[index] = true;
        q.T.mag[index] = 0;
        q.T.ammo[q.weapons[index].ammo] = 30;
        q.St.wstate = "idle";
        q.St.wtime = 0;
        q.St.wCool = 0;
        q.Ct.firing = false;
        for (const id of ["dead", "win", "levelend"])
          document.getElementById(id).classList.add("hidden");
        a.history.length = 0;
        window.__audioRAF = {
          events: [],
          frames: [],
          last: 0,
          index: 0,
          active: true,
        };
        const track = (now) => {
          const r = window.__audioRAF;
          if (!r.active) return;
          if (r.last) r.frames.push(now - r.last);
          r.last = now;
          for (const event of a.history.slice(r.index))
            if (event.type === "play")
              r.events.push({
                ...event,
                observedAfterFrameMs: performance.now() - event.performanceTime,
              });
          r.index = a.history.length;
          requestAnimationFrame(track);
        };
        requestAnimationFrame(track);
      }, weapon);
      await page.keyboard.press("r");
      await page.waitForFunction(
        () => window.__BLACK_SILENCE_QA.St.wstate === "reload",
      );
      await page.waitForFunction(
        () =>
          window.__BLACK_SILENCE_QA.St.wstate === "idle" &&
          window.__BLACK_SILENCE_QA.T.mag[window.__BLACK_SILENCE_QA.T.cur] > 0,
        null,
        { timeout: 20000 },
      );
      await page.waitForTimeout(80);
      const run = await page.evaluate(() => {
        const q = window.__BLACK_SILENCE_QA,
          r = window.__audioRAF;
        r.active = false;
        return {
          weapon: q.T.cur,
          events: r.events,
          frames: r.frames,
          baseLatency: q.reloadAudio.context().baseLatency,
          outputLatency: q.reloadAudio.context().outputLatency,
          voices: q.reloadAudio.active(),
          mag: q.T.mag[q.T.cur],
          reserve: q.T.ammo[q.weapons[q.T.cur].ammo],
        };
      });
      if (run.events.length !== 7)
        throw new Error("Expected 7 real-RAF events, got " + run.events.length);
      if (
        run.events.some(
          (e) =>
            e.phase - e.target < -0.0001 ||
            (e.phase - e.target) * [2, 2.1][weapon] > 0.051,
        )
      )
        throw new Error("Event did not follow a native <=50ms phase crossing");
      if (run.voices !== 0)
        throw new Error("Voices survived reload completion");
      runs.push(run);
    }
    if (errors.length) throw new Error(errors.join("\n"));
    fs.writeFileSync(
      path.join(root, ".dream-loop/reload-audio-raf-results.json"),
      JSON.stringify(
        {
          viewport: "1280x720",
          scope:
            "real keyboard R, actual RAF/native reload; speaker/display physical latency not measured",
          runs,
          pageErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        runs.map((r) => ({
          weapon: r.weapon,
          events: r.events.length,
          maxPhaseDelayMs: Math.max(
            ...r.events.map(
              (e) => (e.phase - e.target) * [2, 2.1][r.weapon] * 1000,
            ),
          ),
          maxAfterFrameMs: Math.max(
            ...r.events.map((e) => e.observedAfterFrameMs),
          ),
          frameMax: Math.max(...r.frames),
          baseLatency: r.baseLatency,
          outputLatency: r.outputLatency,
          voices: r.voices,
        })),
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
