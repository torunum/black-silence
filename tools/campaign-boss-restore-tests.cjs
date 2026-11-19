// Native boss death, real shrine approach, Continue and Rise Again on file://.
// node tools/campaign-boss-restore-tests.cjs <legacy.html> [<candidate.html>] [<output.json>]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const [legacyPath, candidatePath, reportPath] = process.argv.slice(2);
assert(legacyPath, "Pass the pre-fix game file first");
const legacy = fs.readFileSync(legacyPath, "utf8");
const candidate = candidatePath ? fs.readFileSync(candidatePath, "utf8") : legacy;
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const storageKey = "black-silence.campaign.v1";
const sha = input => createHash("sha256").update(input).digest("hex");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "black-silence-boss-restore-"));
const file = path.join(dir, "game.html");

// Chapters are prepared at known reachable spots with nearby threats held
// still. A seeded terminal hit uses the game's actual damage and death path.
// The fixture never marks a boss dead, fakes a save, or forces a transition.
const probe = `
let fixtureVictoryCalls=0;
const fixtureVictory=h9;
h9=function(...args) {
  fixtureVictoryCalls++;
  return fixtureVictory.apply(this,args);
};
window.bossRestoreProbe = {
  stage(level) {
    rp(level);
    Fd();
    for (const enemy of v.enemies) {
      if (!enemy.boss || !enemy.dormant) continue;
      bk(enemy);
      stt(v.cine.dur+1/60);
    }
    this.calm();
  },
  calm() {
    if (v.cine) stt(v.cine.dur+1/60);
    for (const enemy of v.enemies) enemy.stun = 999;
    Be.inputLock = false;
    V5(false);
  },
  aim(x, z) {
    Ct.yaw = Math.atan2(x - C.px, z - C.pz) + Math.PI;
    Ct.pitch = 0;
    J.camera.rotation.set(0, Ct.yaw, 0, "YXZ");
    J.camera.updateMatrixWorld(true);
  },
  pose(x, z, tx, tz) {
    if (fu(x, z)) throw Error("Fixture position is solid: " + x + "," + z);
    Object.assign(C, { px:x, pz:z, pyy:ie(x,z)+Yo, vx:0, vz:0, vy:0, grounded:true });
    J.camera.position.set(x,C.pyy,z);
    this.aim(tx,tz);
  },
  terminalHit(kind) {
    const enemy = v.enemies.find(actor => actor.key === kind && actor.boss);
    if (!enemy || enemy.dead) throw Error("Boss fixture unavailable: " + kind);
    if (enemy.dormant) bk(enemy);
    if (v.cine) stt(v.cine.dur + 1/60);
    qr(enemy, enemy.hp+1, { explosive:true, wIdx:1 });
    this.calm();
  },
  fixedForward(mark) {
    if (!li.KeyW) throw Error("A real W key must already be held");
    for (let step=0; step<240 && Q0.snap?.mark!==mark; step++) {
      m_(1/60);
      G$(1/60);
      F$(1/60);
    }
    if (Q0.snap?.mark!==mark) throw Error("Could not reach the expected shrine");
  },
  obtainKey() {
    const it = v.items.find(item => item.kind === "key" && !item.taken);
    this.pose(it.x,it.z,it.x+1,it.z);
    G$(1/60);
  },
  exitApproach() {
    const portal = z0.exit;
    if (!portal) throw Error("No authored exit rig");
    this.pose(portal.x+portal.nx*1.4, portal.z+portal.nz*1.4, portal.x, portal.z);
  },
  fall() { C.spawnGuard=0; ta(9999,true); },
  state() {
    const exit=z0.exit;
    return {
      level:T.level, started:Be.started, locked:Be.inputLock, dead:T.dead, won:T.won,
      activeMark:Q0.snap?.mark, marks:Q0.marks.map(m=>[m.x,m.z,m.lit]),
      position:[C.px,C.pz], boss:v.enemies.flatMap((e,i)=>e.boss?[[i,e.key,e.dead]]:[]),
      exit:v.exitPos, lit:!!exit?.lit, rig:exit&&[exit.x,exit.z,exit.nx,exit.nz],
      lights:J.scene?.children.filter(n=>n.isPointLight).length, phase:oe.phase,
      card:oe.card, cardAfter:pc.cardAfter, kills:T.kills, totalKills:T.totKills,
      speed:Math.hypot(C.vx,C.vz),
      victoryCalls:fixtureVictoryCalls,
      key:T.key, doorOpen:Object.entries(v.doors).filter(([,d])=>d.open).map(([k])=>k),
      achievements:Object.keys(T.ach), msg:Jt("msg")?.textContent
    };
  }
};
`;

function writeFixture(input) {
  assert.equal(input.split(anchor).length, 2);
  fs.writeFileSync(file, input.replace(anchor, () => probe + anchor));
}

async function run() {
  writeFixture(legacy);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 800, height: 500 }, offline: true });
    const page = await context.newPage();
    const errors = [], checks = [];
    page.on("pageerror", error => errors.push(error.message));
    const call = (method, ...args) => page.evaluate(
      ([method,args]) => bossRestoreProbe[method](...args), [method,args],
    );
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
    const state = () => call("state");
    const start = async button => {
      await page.locator(button).click({ timeout: 60000 });
      await page.waitForFunction(() => bossRestoreProbe.state().started, null, { timeout: 60000 });
      await call("calm");
    };
    const pathToFile = pathToFileURL(file).href;
    const goto = async () => page.goto(pathToFile, { timeout: 90000, waitUntil: "domcontentloaded" });
    const walk = async (x, z) => {
      await call("aim",x,z);
      await page.keyboard.down("KeyW");
      try {
        await page.waitForFunction(([x,z]) => {
          const [px,pz] = bossRestoreProbe.state().position;
          return Math.hypot(px-x,pz-z)<.50;
        }, [x,z], { timeout: 12000 });
      } catch(error) {
        throw Error(`Could not reach ${x},${z}: ${JSON.stringify(await state())}`, { cause:error });
      } finally { await page.keyboard.up("KeyW"); }
      await page.waitForFunction(() => bossRestoreProbe.state().speed<.09);
    };
    await goto();
    await start("#mNew");

    // The open door east of the Gravedigger's arena leads to an existing
    // unlit shrine, which can be saved after the real boss-death handler ran.
    await call("stage",9);
    await call("pose",49.4,33,53,33);
    await page.keyboard.press("KeyE");
    assert((await state()).doorOpen.includes("25,16"), "Actual E opens the arena return door");
    await call("terminalHit","N");
    const original = await state();
    assert(original.exit && original.lit && original.boss[0][2]);
    await walk(53,33);
    await walk(53,45);
    await page.waitForFunction(() => bossRestoreProbe.state().activeMark===6);
    const save = await read();
    assert(save?.shrine?.facts.killed.includes(original.boss[0][0]));
    assert(save.shrine.facts.opened.includes("25,16"));
    checks.push({ name: "post-boss shrine reached with E and W on legacy file", saved: save.shrine.at,
      index: original.boss[0][0], original });
    console.log("PASS native boss dies, opens exit, and real E/W writes an authored shrine");

    // Keep the URL and actual native localStorage, replacing only the game file.
    writeFixture(candidate);
    await goto();
    await start("#mContinue");
    const continued = await state();
    assert(continued.boss[0][2] && continued.activeMark===6, "Continue restored the dead boss and shrine");
    if (!candidatePath) {
      assert(!continued.exit && !continued.lit, "Legacy file must reproduce the sealed exit");
      await call("exitApproach");
      await page.keyboard.press("KeyE");
      assert.equal((await state()).phase, "idle", "Original exit cannot finish after Continue");
      console.log("REPRO legacy dead boss leaves an unlit sealed exit after real Continue and E");
      if (reportPath) fs.writeFileSync(reportPath, JSON.stringify({ sha:sha(legacy), checks, continued },null,2));
      return;
    }
    assert.deepEqual(continued.exit, original.exit, "Continue recreates the exact native exit position");
    assert.equal(continued.lit, true);
    assert.equal(continued.kills, original.kills);
    assert.equal(continued.totalKills, original.totalKills);
    assert.deepEqual(continued.achievements, original.achievements);
    assert.deepEqual(await read(), save, "Restoring the derived exit must not rewrite a compatible old record");
    checks.push({ name: "legacy Continue restores native gate without replaying kill credit", continued });

    await call("fall");
    await page.locator("#riseBtn").waitFor();
    await page.waitForTimeout(1300);
    await page.keyboard.press("Space");
    await page.waitForFunction(() => !bossRestoreProbe.state().dead);
    const risen = await state();
    assert.deepEqual(risen.exit, original.exit);
    assert.equal(risen.lit, true);
    assert.equal(risen.lights, continued.lights, "An actual respawn creates one exit light on a new scene");
    await call("calm");
    await call("exitApproach");
    await page.keyboard.press("KeyE");
    await page.waitForFunction(() => {
      const s=bossRestoreProbe.state();return s.phase==="card" && s.card>=s.cardAfter;
    },null,{timeout:60000});
    await page.keyboard.press("Space");
    await page.waitForFunction(() => bossRestoreProbe.state().level===1,null,{timeout:60000});
    checks.push({name:"native death, Rise Again, E and Space reach the Gothic Dungeon", risen});
    console.log("PASS authentic legacy Continue and Rise Again restore exit, E and Space advance");

    // The Priest opens the exit, but this chapter also has a Guardian.
    // A restored doorway must still refuse to let a player leave it alive.
    writeFixture(legacy);
    await goto();
    await start("#mNew");
    await call("stage",2);
    await call("pose",39,44.9,39,50);
    await page.keyboard.press("KeyE");
    const entrance = await state();
    assert(entrance.doorOpen.includes("19,23"), "Church door used with actual E "+JSON.stringify(entrance));
    await call("terminalHit","Q");
    await walk(39,55);
    await walk(41,55);
    await page.waitForFunction(() => bossRestoreProbe.state().activeMark===2);
    const priestSave = await read();
    assert(priestSave.shrine.facts.killed.length===1);
    writeFixture(candidate);
    await goto();
    await start("#mContinue");
    const church = await state();
    assert(church.exit && church.lit && church.boss.find(e=>e[1]==="Q")[2]);
    assert(!church.boss.find(e=>e[1]==="U")[2]);
    await call("exitApproach");
    await page.keyboard.press("KeyE");
    assert.equal((await state()).phase,"idle", "Live Guardian still blocks the restored exit");
    await call("terminalHit","U");
    assert.equal((await state()).lights,church.lights,
      "Killing the remaining Guardian does not duplicate the restored exit light");
    await call("exitApproach");
    await page.keyboard.press("KeyE");
    await page.waitForFunction(() => bossRestoreProbe.state().phase!=="idle");
    checks.push({name:"restored Priest exit still requires the Cathedral Guardian", church});

    // A shrine just beyond the Heart's open gate can trigger before the
    // 2.8-second native finale. Walking through it with a different offset
    // saves either in the open door or just outside it.
    const makeHeartSave = async z => {
      writeFixture(legacy);
      await goto();
      await start("#mNew");
      await call("stage",8);
      await call("obtainKey");
      await call("pose",47.15,z,52.5,z);
      await page.keyboard.press("KeyE");
      assert((await state()).doorOpen.includes("24,15"), "Womb gate uses the existing red key");
      await page.keyboard.down("KeyW");
      let value;
      try {
        value=await page.evaluate(({key,z}) => {
          bossRestoreProbe.terminalHit("G");
          bossRestoreProbe.aim(52.5,z);
          // Hold the real W state while stepping the original movement
          // clock so wall time from the test runner cannot finish the game
          // before the real checkpoint auto-save.
          bossRestoreProbe.fixedForward(2);
          const record=JSON.parse(localStorage.getItem(key));
          location.reload();
          return record;
        },{key:storageKey,z});
      } finally { await page.keyboard.up("KeyW"); }
      assert(value.shrine.facts.killed.length===1 && value.shrine.facts.opened.includes("24,15"));
      await page.locator("#mContinue").waitFor({timeout:90000});
      await start("#mContinue");
      return value;
    };
    const thresholdSave=await makeHeartSave(31);
    const oldThreshold=await state();
    assert.equal(Math.floor(thresholdSave.shrine.at.x/2),24);
    assert.equal(Math.floor(thresholdSave.shrine.at.z/2),15);
    assert.equal(oldThreshold.activeMark,undefined, "Old build drops a compatible door-cell snapshot");
    assert(!oldThreshold.boss.find(e=>e[1]==="G")[2]&&!oldThreshold.key);
    checks.push({name:"legacy native shrine within its open red gate fell back to the entry",at:thresholdSave.shrine.at,oldThreshold});

    const finalSave = await makeHeartSave(30.5);
    await page.waitForTimeout(3000);
    const oldHeart=await state();
    assert(finalSave.shrine.at.x>=50);
    assert(oldHeart.boss.find(e=>e[1]==="G")[2] && !oldHeart.won && oldHeart.activeMark===2,
      "Old restored Heart cannot finish even from a position outside the doorway");
    assert.equal(oldHeart.victoryCalls,0);

    writeFixture(candidate);
    await goto();
    const resumeRecord = async value => {
      await page.evaluate(({key,value}) => localStorage.setItem(key,JSON.stringify(value)), {key:storageKey,value});
      await goto();
      await start("#mContinue");
    };
    const missingDoor = structuredClone(thresholdSave);
    missingDoor.shrine.facts.opened=missingDoor.shrine.facts.opened.filter(key=>key!=="24,15");
    await resumeRecord(missingDoor);
    const closed=await state();
    assert(!closed.activeMark&&!closed.won&&!closed.key, "A closed door position must still fall back");
    const againstWall = structuredClone(thresholdSave);
    againstWall.shrine.at.z=31.99;
    await resumeRecord(againstWall);
    const partlyInWall=await state();
    assert(!partlyInWall.activeMark&&!partlyInWall.won&&!partlyInWall.key,
      "An opened door must not allow a footprint overlapping the adjacent wall");
    checks.push({name:"closed and wall-overlapping doorway snapshots remain rejected",closed,partlyInWall});

    for(const value of [finalSave,thresholdSave]){
      // Both records came from the real old game, without altering their
      // facts or position. Reinsert each to exercise its independent resume.
      await resumeRecord(value);
      await page.locator("#win").waitFor({timeout:20000});
      const won = await state();
      assert(won.won && won.boss.find(e=>e[1]==="G")[2]);
      assert.equal(won.activeMark,2);
      assert.deepEqual(won.position,[value.shrine.at.x,value.shrine.at.z]);
      assert.equal(won.totalKills,value.shrine.inv.totKills);
      assert.equal(won.victoryCalls,1);
      assert.equal(await read(),null, "Native victory completes the restored campaign");
      checks.push({name:"legacy final-boss shrine recovers native victory without another fight", saved:value.shrine.at,oldHeart,won});
    }
    console.log("PASS restored Priest exit respects the Guardian; restored Heart completes the campaign");
    assert.deepEqual(errors,[]);
    if(reportPath) fs.writeFileSync(reportPath, JSON.stringify({legacySha:sha(legacy),candidateSha:sha(candidate),checks,errors},null,2));
  } finally { await browser.close(); }
}
run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  fs.unlinkSync(file);
  fs.rmdirSync(dir);
});
