// node tools/chapter-records-tests.cjs [game.html] [capture-directory] [baseline.html]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const input = path.resolve(process.argv[2] || "THE-BLACK-SILENCE.html");
const captures = process.argv[3] && path.resolve(process.argv[3]);
const baseline = process.argv[4] && path.resolve(process.argv[4]);
const key = "black-silence.chapter-record.v1.";
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const seam = `
window.chapterFixture = {
  get order() { return dh.slice() },
  shrineDeath() {
    sk();
    const shrine = Q0.marks[0];
    C.px = shrine.x; C.pz = shrine.z; QX(.016);
    if (!Q0.snap) throw Error("Shrine did not activate");
    T.levelT0 = performance.now() - 93000;
    C.spawnGuard = 0; ta(10000,true);
    return T.dead;
  },
  elapsed() { return (performance.now() - T.levelT0) / 1000 },
  atExit({grade,seconds}) {
    sk();
    for (const enemy of v.enemies.filter(e => e.boss && !e.dead))
      qr(enemy, 10000, {wIdx:0, explosive:true});
    if (!z0.exit || !v.exitPos) throw Error("Missing chapter exit " + T.level);
    C.px = z0.exit.x + z0.exit.nx * 1.3; C.pz = z0.exit.z + z0.exit.nz * 1.3;
    C.pyy = ie(C.px,C.pz)+Yo; C.vx = C.vz = 0;
    Ct.yaw = Math.atan2(z0.exit.nx,z0.exit.nz);
    T.shots=10; T.hitsLanded=grade==="S"?10:0; T.propsBroken=grade==="S"?10:0;
    T.kills=grade==="S"?T.enemiesTotal:0; T.secrets=grade==="S"?T.secretsTotal:0;
    if (seconds !== null) T.levelT0=performance.now()-seconds*1000;
  },
  toCard() {
    if (oe.phase!=="walk" && oe.phase!=="card") throw Error("Exit rejected: " + oe.phase);
    for (let i=0;i<180;i++) i_(.05);
  },
  killHeart() {
    const boss=v.enemies.find(e=>e.key==="G");
    if(!boss) throw Error("No Heart in final chapter");
    C.spawnGuard=60;
    qr(boss,10000,{wIdx:0,explosive:true});
  }
};`;

function fixture(source, dir, name) {
  const html = fs.readFileSync(source, "utf8");
  assert.equal(html.split(anchor).length, 2);
  const file = path.join(dir, name + ".html");
  fs.writeFileSync(file, html.replace(anchor, () => seam + anchor));
  return pathToFileURL(file).href + "?qa=1";
}

async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chapter-records-"));
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const network = [];
  if (captures) fs.mkdirSync(captures, { recursive: true });
  function capture(page, name) {
    return captures && page.screenshot({ path: path.join(captures, name + ".png") });
  }
  async function open(url, denied = false) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 760 }, offline: true });
    if (denied) await context.addInitScript(() => Object.defineProperty(window, "localStorage", {
      get() { throw new DOMException("Disabled", "SecurityError"); }
    }));
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", req => { if (/^https?:/i.test(req.url())) network.push(req.url()); });
    await page.goto(url);
    return page;
  }
  async function start(page, row) {
    await (row === undefined ? page.locator("#mNew") : page.locator("#chaplist > .mbtn").nth(row)).click();
    await page.waitForFunction(() => window.__BLACK_SILENCE_QA?.Be.started && window.__BLACK_SILENCE_QA.v.grid);
  }
  async function clear(page, grade, seconds) {
    await page.evaluate(args => window.chapterFixture.atExit(args), { grade, seconds });
    await page.keyboard.press("e");
    await page.evaluate(() => window.chapterFixture.toCard());
    await page.locator("#levelend").waitFor();
    return nativeResult(page, "le");
  }
  async function nativeResult(page, prefix) {
    const grade = await page.locator("#" + prefix + "grade").textContent();
    const text = await page.locator("#" + prefix + "stats").innerText();
    const [, m, s] = /\bTIME (\d+):(\d\d)/.exec(text);
    return { grade, seconds: Number(m) * 60 + Number(s) };
  }
  async function expectRecord(page, locator, expected) {
    const fields = await page.locator(locator + " .chapter-record b").allTextContents();
    const seconds = expected.seconds;
    assert.deepEqual(fields, [expected.grade, Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0")]);
  }
  async function stored(page, level = 0) {
    return page.evaluate(k => JSON.parse(localStorage.getItem(k)), key + level);
  }
  async function reloadMenu(page) {
    await page.reload();
    await page.locator("#mChapter").click();
  }
  try {
    if (baseline) {
      const before = await open(fixture(baseline, dir, "before"));
      await start(before);
      await clear(before, "D", 94);
      await capture(before, "before-clear");
      await reloadMenu(before);
      await capture(before, "before-menu");
      assert.equal(await before.locator(".chapter-record").count(), 0);
      await before.context().close();
    }
    const url = fixture(input, dir, "after");
    const page = await open(url);
    await page.locator("#mChapter").click();
    const rows = page.locator("#chaplist > .mbtn");
    const order = await page.evaluate(() => window.chapterFixture.order);
    assert.equal(await rows.count(), order.length);
    assert.equal(await page.locator("#chaplist > .locked").count(), order.length - 1);
    assert.equal(await page.locator(".chapter-record").count(), 0);
    await page.locator("#chapBack").click();
    await start(page);
    assert.equal(await stored(page), null);
    assert(await page.evaluate(() => window.chapterFixture.shrineDeath()));
    assert.equal(await stored(page), null);
    await page.waitForTimeout(1100);
    await page.locator("#riseBtn").click();
    await page.waitForFunction(() => !window.__BLACK_SILENCE_QA.T.dead);
    assert(await page.evaluate(() => window.chapterFixture.elapsed() >= 93));
    assert.equal(await stored(page), null);
    const first = await clear(page, "D", null);
    assert.equal(first.grade, "D");
    assert(first.seconds >= 93);
    assert.deepEqual(await stored(page), first);
    await expectRecord(page, "#levelend", first);
    await capture(page, "after-clear");
    await page.keyboard.press("Space");
    await page.waitForFunction(expected => window.__BLACK_SILENCE_QA.T.level === expected, order[1]);
    assert.deepEqual(await stored(page), first);
    assert.equal(await stored(page, order[1]), null);
    await reloadMenu(page);
    await expectRecord(page, "#chaplist > :first-child", first);
    assert.equal(await page.locator("#chaplist > .locked").count(), order.length - 2);
    assert.equal(await page.locator("#chaplist .chapter-record").count(), 1);
    await capture(page, "after-menu");
    await start(page, 0);
    const slower = await clear(page, "S", 360);
    assert.equal(slower.grade, "S");
    assert(slower.seconds > first.seconds);
    await expectRecord(page, "#levelend", { grade: "S", seconds: first.seconds });
    await reloadMenu(page);
    await start(page, 0);
    const faster = await clear(page, "D", 42);
    assert.equal(faster.grade, "D");
    assert(faster.seconds < first.seconds);
    const best = { grade: "S", seconds: faster.seconds };
    assert.deepEqual(await stored(page), best);
    await expectRecord(page, "#levelend", best);
    // A valid record alone cannot unlock a chapter or reveal its title.
    await page.evaluate(({key, level}) => localStorage.setItem(key+level, '{"grade":"A","seconds":42}'), {key, level:order[2]});
    await reloadMenu(page);
    assert.equal(await rows.nth(2).innerText(), "[ CH 2 · LOCKED ]");
    await page.setViewportSize({ width: 360, height: 480 });
    await capture(page, "after-menu-small");
    const panel = page.locator("#chapsel");
    const sizes = await panel.evaluate(e => ({ width: e.clientWidth, content: e.scrollWidth,
      top: e.querySelector("h1").getBoundingClientRect().top, height: innerHeight }));
    assert(sizes.content <= sizes.width + 1 && sizes.top >= 0);
    await page.locator("#chapBack").scrollIntoViewIfNeeded();
    assert(await page.locator("#chapBack").evaluate(e => e.getBoundingClientRect().bottom <= innerHeight + 1));
    // Existing late-game saves use the engine's chapter order. Enter the last
    // one through its native row and kill its real boss with native damage.
    await page.evaluate(() => {
      const save=JSON.parse(localStorage.getItem("blacksilence.save"));
      save.maxLevel=window.chapterFixture.order.length-1;
      localStorage.setItem("blacksilence.save", JSON.stringify(save));
    });
    await reloadMenu(page);
    await start(page, order.length-1);
    await page.evaluate(() => window.chapterFixture.killHeart());
    await page.locator("#win").waitFor({ timeout: 30000 });
    const victory=await nativeResult(page,"win");
    assert.deepEqual(await stored(page,order.at(-1)),victory);
    await expectRecord(page,"#win",victory);
    await capture(page,"after-victory-small");
    await reloadMenu(page);
    await expectRecord(page,"#chaplist > :last-child",victory);
    // Corrupt or future-shaped data cannot alter the native save or reveal
    // a record. A well-formed sibling remains visible.
    for (const corrupt of ['{}','not JSON','"S"','{"grade":"X","seconds":2}',
      '{"grade":"S","seconds":-1}','{"grade":"S","seconds":3.5}',' '.repeat(200)]) {
      await page.evaluate(({key,corrupt})=>localStorage.setItem(key,corrupt),{key:key+0,corrupt});
      await reloadMenu(page);
      assert.equal(await rows.nth(0).locator(".chapter-record").count(),0);
      await expectRecord(page,"#chaplist > :last-child",victory);
    }
    await page.context().close();
    const blocked = await open(url, true);
    await start(blocked);
    const session=await clear(blocked,"D",55);
    await expectRecord(blocked,"#levelend",session);
    await reloadMenu(blocked);
    assert.equal(await blocked.locator(".chapter-record").count(),0);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    console.log(JSON.stringify({ first, slower, faster, best, victory, blocked:session, small:sizes, errors, network }));
  } finally {
    await browser.close();
    for (const name of ["before.html","after.html"]) {
      const file=path.join(dir,name);
      if(fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(dir);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
