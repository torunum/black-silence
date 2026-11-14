// Compare the game's own HUD and append-only extension under identical, offline inputs.
// node tools/hud-updates-tests.cjs [upstream-or-integrated.html] [proof-directory]
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const root = path.resolve(__dirname, "..");
const input = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const out = path.resolve(process.argv[3] || path.join(root, ".dream-loop", "hud-proof"));
const source = fs.readFileSync(path.join(root, "src", "hud-updates.js"), "utf8").trimEnd();
const inputBytes = fs.readFileSync(input);
const html = inputBytes.toString("utf8").replace(/\r\n/g, "\n");
const moduleText = source.replace(/\r\n/g, "\n");
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const integrated = html.includes(moduleText);
assert.equal(html.split(anchor).length, 2);
assert.equal(html.includes("const carriedSeals = [];"), integrated, "stale/different HUD source embedded");
const baseline = integrated ? html.replace(moduleText, "") : html;
const candidate = integrated ? html : html.replace(anchor, () => moduleText + "\n" + anchor);

// This closure is serialized into private fixtures inside the game's module scope.
function installFixture() {
  const ids = ["hp", "ar", "am", "wname", "keys", "bossbar"];
  const records = [];
  const observer = new MutationObserver(batch => records.push(...batch));
  const ammo = fp("#am .num");
  const bindAmmo = () => [ammo.firstChild, ammo.querySelector(".sub2"), ammo.querySelector(".sub2").firstChild];
  const original = bindAmmo();
  let priest, executioner;
  window.hudTest = {
    start() {
      J$(9);
      V5(false);
      Be.inputLock = false;
      C.spawnGuard = 0;
      T.cur = 0;
      T.mag[0] = 4;
      T.ammo.bullets = 28;
      T.hp = 73.2;
      T.armor = 22.3;
      T.key = false;
      St.wstate = "idle";
      St.wCool = 0;
      Ct.firing = false;
      m0t();
      for (const id of ids) observer.observe(Jt(id), {
        subtree: true, childList: true, characterData: true, attributes: true,
      });
    },
    read() {
      const buckets = {};
      let removed = 0;
      records.push(...observer.takeRecords());
      for (const record of records) {
        const el = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        const field = el?.closest("[id]")?.id || "detached";
        const bucket = field + "." + record.type;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
        removed += record.removedNodes.length;
      }
      const mutations = records.length;
      records.length = 0;
      const pixels = id => Jt(id).toDataURL();
      const nodes = bindAmmo();
      return {
        state: {
          hp: fp("#hp .num").textContent, armor: fp("#ar .num").textContent,
          ammo: ammo.innerHTML, weapon: Jt("wname").textContent, keys: Jt("keys").textContent,
          boss: [Jt("bossbar").style.display, Jt("bossname").textContent, Jt("bossfill").style.width],
          hudOpacity: Jt("hud").style.opacity, icons: ["icoHp", "icoAr", "icoAm", "icoW"].map(pixels),
        },
        mutations, buckets, removed, stableAmmo: original.every((node, i) => node === nodes[i]),
      };
    },
    idle(n) { for (let i = 0; i < n; i++) m0t(); },
    frame() { Fk(Be.last + 1000 / 60); },
    weapon(n) { for (let i = 0; i < n; i++) { v$(1 / 60); m0t(); } },
    grant(i) { T.weapons[i] = true; },
    hurt() { C.spawnGuard = 0; ta(19.5, true); m0t(); },
    pickup(kind) {
      const item = v.items.find(e => e.kind === kind && !e.taken);
      if (!item) throw Error("Missing placed pickup " + kind);
      C.px = item.x; C.pz = item.z;
      G$(0);
      if (!item.taken) throw Error("Pickup did not trigger " + kind);
      m0t();
    },
    sameCount() {
      // Also exercise a restore replacing one collected seal with the other before the next frame.
      de.seals.clear();
      zH("seal_bell");
      m0t();
    },
    bothSeals() { zH("seal_ash"); m0t(); },
    redKey() { T.key = true; m0t(); },
    hide(show) { _g(show); T.hp -= 2; m0t(); },
    factory() { rp(6); m0t(); },
    wake() {
      priest = v.enemies.find(e => e.key === "V");
      if (!priest?.dormant || !priest.priest) throw Error("Missing placed Factory boss");
      bk(priest); m0t();
    },
    finishCine() { stt(v.cine.dur); m0t(); },
    phase(fraction) {
      qr(priest, priest.hp - priest.maxhp * fraction, { wIdx: 0 });
      const dx = C.px - priest.x, dz = C.pz - priest.z;
      rtt(priest, 1 / 60, Math.hypot(dx, dz), dx, dz);
      m0t();
    },
    secondBoss() {
      executioner = Du("E", priest.x + 2, priest.z, true);
      bk(executioner);
      stt(v.cine.dur);
      m0t();
    },
    defeat(boss) {
      const enemy = boss === "first" ? priest : executioner;
      qr(enemy, enemy.hp + 1, { wIdx: 0 });
      m0t();
    },
    stopObserving() { observer.disconnect(); },
    time(changing, n) {
      // Replay a low-rate series of HUD changes, including a shot every 25 calls.
      // Both variants use identical values, chapter roster and loop overhead.
      const start = performance.now();
      for (let i = 0; i < n; i++) {
        if (changing) {
          T.mag[T.cur] = 6 - (Math.floor(i / 25) % 7);
          St.wstate = i % 175 >= 150 ? "reload" : "idle";
        }
        m0t();
      }
      return performance.now() - start;
    },
  };
}

async function run() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "black-silence-hud-"));
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const report = { sourceSha256: sha(inputBytes), hudSourceSha256: sha(source), integrated,
    browser: browser.version(), viewport: [960, 540], seed: 0x48f5a11, states: {}, timings: {} };
  const points = {}, pages = {}, errors = [];
  try {
    for (const [version, build] of Object.entries({ baseline, candidate })) {
      const file = path.join(temp, version + ".html");
      fs.writeFileSync(file, build.replace(anchor, () => "(" + installFixture.toString() + ")();\n" + anchor));
      const page = pages[version] = await browser.newPage({ viewport: { width: 960, height: 540 } });
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(seed => {
        Math.random = () => {
          seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
          return (seed >>> 0) / 4294967296;
        };
        requestAnimationFrame = () => 0;
        Element.prototype.requestPointerLock = async () => {};
      }, report.seed);
      await page.goto(pathToFileURL(file).href + "?qa=1", { timeout: 90000 });
      await page.evaluate(() => hudTest.start());
      points[version] = {};
      const take = async label => {
        const row = await page.evaluate(() => hudTest.read());
        row.state.icons = row.state.icons.map(icon => sha(Buffer.from(icon.split(",")[1], "base64")));
        points[version][label] = row;
        if (version === "candidate") {
          assert.deepEqual(row.state, points.baseline[label].state, label + " matches native");
          assert(row.stableAmmo, label + " preserves the original two text nodes and span");
        }
      };
      const step = async (label, action, arg) => {
        await page.evaluate(([action, arg]) => hudTest[action](arg), [action, arg]);
        await take(label);
      };
      const screenshot = async label => {
        // Isolate native HUD pixels against a reproducible background; keep every HUD style intact.
        const sheet = await page.addStyleTag({ content:
          "body{background:#34302c!important}body>:not(#hud):not(#bossbar):not(#keys){visibility:hidden!important}" });
        // Settle the existing 150 ms boss fill and 800 ms HUD opacity transitions.
        // Their timers run independently of the manually stepped game clock.
        await page.evaluate(async () => {
          for (const id of ["hud", "bossfill"]) {
            const el = document.getElementById(id);
            el.getBoundingClientRect();
            for (const animation of el.getAnimations()) await animation.finished;
          }
        });
        const image = await page.screenshot();
        await sheet.evaluate(el => el.remove());
        const name = label + "-" + version + ".png";
        fs.writeFileSync(path.join(out, name), image);
        const pixels = PNG.sync.read(image);
        const signature = sha(pixels.data);
        report.states[label] ||= {};
        report.states[label][version + "RGBA"] = signature;
        if (version === "candidate") assert.equal(signature, report.states[label].baselineRGBA, label + " HUD pixels");
      };
      await take("bound");
      await step("stationary120", "idle", 120);
      await step("gameLoopFrame", "frame");
      await page.mouse.down();
      await step("shoot", "weapon", 1);
      await page.mouse.up();
      await page.keyboard.press("r");
      await step("startReload", "weapon", 1);
      await screenshot("startReload");
      await step("finishReload", "weapon", 160);
      await step("damage", "hurt");
      await step("heal", "pickup", "health");
      for (const [i, code] of [[1, "Digit2"], [4, "Digit5"], [9, "Digit0"], [0, "Digit1"]]) {
        await page.evaluate(i => hudTest.grant(i), i);
        await page.keyboard.press(code);
        await step("switch" + i, "weapon", 40);
      }
      await step("ashSeal", "pickup", "seal_ash");
      await step("replaceSeal", "sameCount");
      await step("twoSeals", "bothSeals");
      await step("keyAndSeals", "redKey");
      await step("hidden", "hide", false);
      await step("shown", "hide", true);
      await step("chapterLoad", "factory");
      await step("bossIntro", "wake");
      await step("bossAppears", "finishCine");
      await step("bossIdle120", "idle", 120);
      await step("phaseTwo", "phase", .55);
      await screenshot("phaseTwo");
      await step("phaseThree", "phase", .25);
      await step("twoBosses", "secondBoss");
      await step("axeExecutioner", "defeat", "first");
      await step("lastBossDead", "defeat", "second");
      await page.evaluate(() => hudTest.stopObserving());
    }
    const rows = points.candidate;
    for (const key of ["stationary120", "bossIdle120", "bossIntro", "twoBosses"]) assert.equal(rows[key].mutations, 0, key);
    assert.deepEqual(rows.shoot.buckets, { "am.characterData": 1 });
    assert.deepEqual(rows.startReload.buckets, { "wname.characterData": 1 });
    assert.deepEqual(rows.finishReload.buckets, { "am.characterData": 2, "wname.characterData": 1 });
    assert.deepEqual(rows.damage.buckets, { "hp.characterData": 1, "ar.characterData": 1 });
    assert.deepEqual(rows.heal.buckets, { "hp.characterData": 1 });
    assert.equal(rows.keyAndSeals.state.keys, "■ RED KEY   ■ ASH SEAL   ■ BELL SEAL");
    assert.equal(rows.replaceSeal.state.keys, "■ BELL SEAL");
    assert.equal(rows.chapterLoad.state.keys, "");
    assert.equal(rows.bossIntro.state.boss[0], "none");
    assert.deepEqual(rows.phaseTwo.state.boss, ["block", "THE FACTORY FOREMAN — PHASE 2", "55%"]);
    assert.deepEqual(rows.phaseThree.state.boss, ["block", "THE FACTORY FOREMAN — PHASE 3", "25%"]);
    assert.deepEqual(rows.axeExecutioner.state.boss, ["block", "THE MUTANT EXECUTIONER", "100%"]);
    assert.equal(rows.lastBossDead.state.boss[0], "none");
    assert.deepEqual(errors, []);
    for (const label of Object.keys(rows)) {
      const old = points.baseline[label], fresh = rows[label];
      report.states[label] = { ...report.states[label], state: fresh.state,
        mutations: [old.mutations, fresh.mutations], removed: [old.removed, fresh.removed],
        candidateFields: fresh.buckets, originalAmmoNodesRetained: [old.stableAmmo, fresh.stableAmmo] };
    }
    const calls = 512, blocks = 24;
    for (const changing of [false, true]) {
      const samples = { baseline: [], candidate: [] };
      for (let b = -4; b < blocks; b++) {
        for (const version of b % 2 === 0 ? ["baseline", "candidate"] : ["candidate", "baseline"]) {
          const elapsed = await pages[version].evaluate(([changing, n]) => hudTest.time(changing, n), [changing, calls]);
          if (b >= 0) samples[version].push(elapsed);
        }
      }
      const quantile = (sorted, p) => sorted[Math.ceil(sorted.length * p) - 1];
      const result = { callsPerBlock: calls, alternatingOrder: true, warmupBlocks: 4, rawBlockMs: samples };
      for (const [key, values] of Object.entries(samples)) {
        const sorted = values.map(ms => ms * 1000 / calls).sort((a,b) => a-b);
        result[key + "UsPerCall"] = { p50: quantile(sorted, .5), p95: quantile(sorted, .95) };
      }
      report.timings[changing ? "shotsAndReload" : "stationary"] = result;
    }
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ states: Object.keys(rows).length, errors, timings: report.timings }, null, 2));
  } finally {
    await browser.close();
    for (const name of ["baseline.html", "candidate.html"]) fs.rmSync(path.join(temp, name), { force: true });
    fs.rmdirSync(temp);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
