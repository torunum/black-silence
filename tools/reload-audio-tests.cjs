// Real Web Audio/native weapon update tests against a built artifact.
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
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      requestAnimationFrame = () => 1;
      window.__oscillators = 0;
      const native = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (...a) {
        window.__oscillators++;
        return native.apply(this, a);
      };
    });
    await page.goto(
      pathToFileURL(
        path.resolve(
          process.env.GAME_HTML || path.join(root, "THE-BLACK-SILENCE.html"),
        ),
      ).href + "?qa=1",
    );
    await page.locator("#mNew").click();
    await page.waitForFunction(
      () => window.__BLACK_SILENCE_QA?.reloadAudio?.state() === "running",
    );
    const checks = await page.evaluate(async () => {
      const q = window.__BLACK_SILENCE_QA,
        a = q.reloadAudio,
        out = [];
      const assert = (ok, msg) => {
        if (!ok) throw new Error(msg);
        out.push(msg);
      };
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const setup = (index) => {
        a.stop("test");
        a.clearTestEffects();
        q.resetCombat();
        q.pause(false);
        q.Be.inputLock = false;
        q.Be.pianoOpen = false;
        q.v.cine = null;
        q.T.dead = q.T.won = false;
        q.T.cur = index;
        q.T.weapons[index] = true;
        q.T.mag[index] = 0;
        q.T.ammo[q.weapons[index].ammo] = 30;
        q.St.wstate = "idle";
        q.St.wtime = 0;
        q.St.wCool = 0;
        q.Ct.firing = false;
        q.T.kickCd = 0;
        a.volume(0.5);
        for (const id of ["dead", "win", "levelend"])
          document.getElementById(id).classList.add("hidden");
        a.history.length = 0;
        window.__audioCalls = [];
        window.__oscillators = 0;
      };
      const advance = (seconds, dt = 0.01) => {
        for (let t = 0; t < seconds - 1e-6; t += dt)
          q.weaponStep(Math.min(dt, seconds - t));
      };
      for (const index of [0, 1]) {
        setup(index);
        a.start();
        const duration = q.weapons[index].reload;
        advance(duration * 0.2);
        assert(
          a.casingCount() === 0,
          `weapon ${index}: old .18 casing event removed`,
        );
        advance(duration * 0.08);
        assert(
          a.casingCount() === (index === 0 ? 6 : 2),
          `weapon ${index}: native casing count at shared .27 phase`,
        );
        advance(duration * 0.73);
        const events = a.history.filter((x) => x.type === "play");
        assert(
          events.length === 7,
          `weapon ${index}: seven foley events exactly once`,
        );
        assert(
          events.every((e) => Math.abs(e.phase - e.target) <= 0.011),
          `weapon ${index}: all event onsets within one simulation step`,
        );
        assert(
          q.T.mag[index] === q.weapons[index].magSize &&
            q.T.ammo[q.weapons[index].ammo] === 30 - q.weapons[index].magSize,
          `weapon ${index}: native ammo/reserve unchanged`,
        );
        assert(
          q.St.wstate === "idle",
          `weapon ${index}: native reload completion unchanged`,
        );
        assert(
          a.pendingNativeSounds() === 0 && window.__oscillators === 0,
          `weapon ${index}: zero delayed casing beeps or reload oscillators`,
        );
        await wait(60);
        assert(a.active() === 0, `weapon ${index}: completed voices released`);
      }
      setup(0);
      a.start();
      advance(0.7);
      for (let i = 0; i < 20; i++) a.start();
      advance(1.31);
      assert(
        a.history.filter((x) => x.type === "play").length === 7,
        "rapid R does not restart or duplicate reload audio",
      );
      setup(0);
      a.start();
      advance(0.56);
      assert(a.active() > 0, "reload creates real AudioBufferSource voices");
      q.T.weapons[1] = true;
      a.switch(1);
      await wait(60);
      assert(
        a.active() === 0,
        "weapon switch fades and releases reload voices",
      );
      const switchOscillators = window.__oscillators;
      await wait(500);
      assert(
        window.__oscillators === switchOscillators,
        "cancel after eject leaves no delayed old casing chirps",
      );
      setup(0);
      a.start();
      advance(0.3);
      q.pause(true);
      await wait(60);
      assert(a.active() === 0, "pause stops reload foley");
      const before = a.history.filter((x) => x.type === "play").length;
      await wait(120);
      assert(
        a.history.filter((x) => x.type === "play").length === before,
        "pause has no wall-clock audio event queue",
      );
      q.pause(false);
      advance(0.5);
      assert(
        a.history.filter((x) => x.type === "play").length > before,
        "resume triggers only future phase crossings",
      );
      setup(0);
      a.start();
      advance(0.3);
      dispatchEvent(new Event("blur"));
      await wait(60);
      assert(a.active() === 0, "focus loss stops reload voices");
      setup(0);
      a.start();
      advance(0.3);
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      await wait(60);
      assert(a.active() === 0, "hidden tab stops reload voices");
      advance(0.6);
      assert(a.active() === 0, "hidden tab cannot create new foley");
      delete document.hidden;
      setup(0);
      a.volume(0);
      a.start();
      advance(2.01);
      assert(
        a.history.filter((x) => x.type === "play").length === 0 &&
          a.active() === 0,
        "master effects volume zero produces no foley voices",
      );
      assert(
        q.T.mag[0] === 6 && a.casingCount() === 6,
        "mute does not change ammo or casing visuals",
      );
      a.volume(0.5);
      setup(0);
      a.start();
      advance(0.3);
      a.volume(0);
      await wait(60);
      assert(
        a.active() === 0,
        "muting mid-reload releases the existing voices",
      );
      a.volume(0.5);
      await wait(40);
      assert(a.active() === 0, "unmuting does not resurrect a prior transient");
      setup(0);
      a.start();
      advance(0.3);
      q.resetCombat();
      await wait(60);
      assert(a.active() === 0, "reset/new game releases active foley");
      setup(0);
      a.start();
      advance(0.3);
      q.T.dead = true;
      q.weaponStep(0.01);
      await wait(60);
      assert(a.active() === 0, "death releases active foley");
      setup(0);
      a.start();
      advance(0.3);
      q.kick();
      await wait(60);
      assert(
        a.active() === 0 && q.St.wstate !== "reload",
        "kick cancellation releases audio and preserves native combat cancellation",
      );
      setup(0);
      a.start();
      advance(0.3);
      q.load(1);
      await wait(60);
      assert(a.active() === 0, "map change releases old foley");
      setup(0);
      const ctx = a.context();
      await ctx.suspend();
      a.start();
      advance(0.5);
      assert(a.active() === 0, "suspended context does not queue stale foley");
      dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR" }));
      await wait(80);
      assert(
        ctx.state === "running",
        "user key gesture resumes the existing AudioContext",
      );
      advance(0.4);
      assert(a.active() > 0, "future events play after context resume");
      await ctx.suspend();
      q.pause(true);
      assert(
        a.active() === 0,
        "pause releases voices even while the audio clock is suspended",
      );
      await ctx.resume();
      await wait(40);
      assert(
        a.active() === 0,
        "resuming a suspended context cannot resurrect cancelled foley",
      );
      a.stop("test");
      await wait(60);
      setup(1);
      q.T.mag[1] = 1;
      q.Ct.firing = true;
      q.weaponStep(0.01);
      q.Ct.firing = false;
      q.St.wstate = "idle";
      a.start();
      window.__oscillators = 0;
      await wait(800);
      assert(
        window.__oscillators > 0,
        "delayed native shotgun firing mechanism remains audible during a later reload",
      );
      a.stop("test");
      a.clearTestEffects();
      assert(
        a.timing === window.__BLACK_SILENCE_RELOAD_TIMING,
        "audio and animation share the same frozen timing object",
      );
      assert(
        Object.isFrozen(a.timing),
        "shared timing cannot drift through runtime mutation",
      );
      return out;
    });
    if (errors.length) throw new Error(errors.join("\n"));
    const report = {
      checks: checks.length,
      results: checks,
      pageErrors: errors,
    };
    fs.mkdirSync(path.join(root, ".dream-loop"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".dream-loop/reload-audio-test-results.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
