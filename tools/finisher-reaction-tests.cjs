// node tools/finisher-reaction-tests.cjs GAME.html [RESULT.json]
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

const input = path.resolve(process.argv[2] || "THE-BLACK-SILENCE.html");
const output = process.argv[3] && path.resolve(process.argv[3]);
if (output) assert.equal(path.extname(output).toLowerCase(), ".json");
const source = fs.readFileSync(input, "utf8");
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const report = {sha256:sha(source), scope:"Native E, timeline, cache, and input recovery with QA-staged opponents.",
  runs:[], errors:[]};

// This closure lives in a temporary fixture with the exact production renderer.
function exposeReactionProbe() {
  function frameOf(clip, texture) {
    const cache = chapterReactions.get(clip);
    return cache ? Math.max(cache.intact.indexOf(texture),cache.wounded.indexOf(texture)) : -1;
  }
  const readFrame = (actor) => ({
    frame:Math.max(frameOf(mourner,actor.sp.material.map),frameOf(groundskeeper,actor.sp.material.map)),
    hand:!!activeGrasp && activeGrasp.enemy === actor, fired:ve.fired, time:ve.t,
  });
  function pixels(texture) {
    const c = texture.image;
    return c.getContext("2d").getImageData(0,0,c.width,c.height).data;
  }
  function match(a, b) {
    if (a.length !== b.length) return false;
    for (let i=0; i<a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  async function verifyCache() {
    const checks = [], times = [];
    for (const clip of [mourner,groundskeeper]) {
      const cache = prepareReaction(clip);
      await cache.image.decode();
      if (!cache.ready) throw Error("Sheet did not decode");
      releaseTextures(cache.intact);
      const key = clip.model.key;
      for (let i=0; i<clip.poses.length; i++) {
        const start = performance.now();
        const cached = closeupFrame(clip,i,0);
        const copied = performance.now();
        const raw = X7(clip.model,clip.poses[i],0,false);
        const native = performance.now();
        if (!match(pixels(cached),raw.data)) throw Error(key+" atlas differs at "+i);
        if (cached !== closeupFrame(clip,i,0) || cached.colorSpace !== ha ||
            cached.magFilter !== i0 || cached.minFilter !== i0) throw Error("Texture sampler changed");
        checks.push([key,i,0]);
        times.push({key, frame:i, cropMs:copied-start, rigMs:native-copied});
      }
      for (const mask of [2,4,6]) {
        const texture = closeupFrame(clip,clip.still,mask);
        const native = X7(clip.model,clip.poses[clip.still],mask,false);
        if (!match(pixels(texture),native.data) || match(pixels(texture),pixels(cache.intact[clip.still])))
          throw Error("Detachable arm mismatch for "+key+"/"+mask);
        checks.push([key,clip.still,mask]);
      }
      releaseTextures(cache.intact);
      cache.ready = false;
      const fallback = closeupFrame(clip,clip.still,0);
      if (!match(pixels(fallback),X7(clip.model,clip.poses[clip.still],0,false).data))
        throw Error("Cold fallback differs for "+key);
      cache.ready = true;
    }
    const old = Array.from(chapterReactions.values()).flatMap(state =>
      [...state.intact,...state.wounded].filter(Boolean));
    const disposed = new Map(old.map(texture => [texture,0]));
    for (const texture of old)
      texture.addEventListener("dispose",() => disposed.set(texture,disposed.get(texture)+1));
    window.__BLACK_SILENCE_QA.load(10);
    if (old.some(texture => disposed.get(texture)!==1) || graspFrames.size || activeGrasp)
      throw Error("Chapter resources survived a departure");
    const roster = Array.from(new Set(v.enemies.map(enemy => wk(enemy)?.rig?.key)
      .filter(key => key === "z" || key === "s"))).sort();
    const loaded = Array.from(chapterReactions.keys(),clip => clip.model.key).sort();
    if (String(loaded) !== String(roster)) throw Error("Decoded an absent actor");
    return {checks, samples:times, disposed:old.length, roster, loaded};
  }
  return {readFrame,verifyCache, preparedKeys:() => Array.from(chapterReactions.keys(), clip => clip.model.key)};
}

function stage({key,kind,mask}) {
  const q = __BLACK_SILENCE_QA;
  q.resetCombat();
  q.pause(false);
  q.v.cine = null;
  for (const e of q.v.enemies) { q.J.scene.remove(e.sp); q.J.scene.remove(e.blob); }
  q.v.enemies = [];
  Object.assign(q.C,{px:19,pz:9,pyy:q.floor(19,9)+q.eyeHeight,vx:0,vz:0,vy:0,grounded:true});
  Object.assign(q.Ct,{yaw:Math.PI,pitch:0,firing:false});
  Object.assign(q.T,{cur:0,hp:70,dead:false,won:false});
  Object.assign(q.St,{wstate:"idle",wtime:0,wCool:0});
  q.T.mag[0]=6;
  q.setCamera();
  const nativeRandom = Math.random;
  Math.random = () => .67;
  const enemy = q.spawn(key,19,11.18,false);
  Math.random = nativeRandom;
  Object.assign(enemy,{hp:19,stagger:4.6,staggerTried:true,cool:2});
  if (mask) enemy.sever = {...enemy.sever, rArm:true};
  window.actor = enemy;
  window.originalRandom = nativeRandom;
  Math.random = () => (kind+.03)/3;
  window.observed = [];
  function sample() {
    if (window.actor !== enemy) return;
    if (q.oo.exec) observed.push(window.reactionProbe.readFrame(enemy));
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
  return {kills:q.T.kills,total:q.T.totKills};
}

function ready() {
  const q = window.__BLACK_SILENCE_QA;
  return q?.Be.started && !q.Be.inputLock && q.paintedGloves.ready();
}
async function exercise(page, spec) {
  await page.emulateMedia({reducedMotion:spec.reduce ? "reduce" : "no-preference"});
  const before = await page.evaluate(stage,spec);
  await page.waitForFunction(() => __BLACK_SILENCE_QA.target() === window.actor);
  await page.keyboard.press("e");
  await page.waitForFunction(() => __BLACK_SILENCE_QA.oo.busy);
  await page.evaluate(() => { Math.random=window.originalRandom; });
  const paused = await page.evaluate(() => new Promise(resolve => {
    const q=__BLACK_SILENCE_QA;
    function tick() {
      if (q.oo.exec?.t >= .43) {
        q.pause(true);
        resolve([q.oo.exec.kind,q.oo.exec.t,q.T.hp,q.T.mag[0],actor.sp.material.map.uuid]);
      } else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
  assert.equal(paused[0],spec.kind);
  await page.keyboard.press("e");
  await page.keyboard.press("r");
  await page.waitForTimeout(160);
  assert.deepEqual(paused,await page.evaluate(() => {
    const q=__BLACK_SILENCE_QA;
    return [q.oo.exec.kind,q.oo.exec.t,q.T.hp,q.T.mag[0],actor.sp.material.map.uuid];
  }));
  await page.evaluate(cancel => {
    const q=__BLACK_SILENCE_QA;
    if (cancel) {
      q.v.enemies = q.v.enemies.filter(enemy => enemy !== actor);
      q.J.scene.remove(actor.sp); q.J.scene.remove(actor.blob);
    }
    q.pause(false);
  },!!spec.cancel);
  await page.waitForFunction(() => !__BLACK_SILENCE_QA.oo.busy && __BLACK_SILENCE_QA.pose().exec < 0);
  const after = await page.evaluate(() => {
    const q=__BLACK_SILENCE_QA;
    return {hp:q.T.hp, kills:q.T.kills,total:q.T.totKills, dead:actor.dead, busy:q.oo.busy,
      ammo:q.T.mag[0], frames:[...new Set(observed.map(s=>s.frame).filter(f=>f>=0))],
      grasp:observed.some(s=>s.hand), fired:Math.max(...observed.map(s=>s.fired)),
      time:Math.max(...observed.map(s=>s.time))};
  });
  const credit = spec.cancel ? 0 : 1;
  assert.equal(after.hp,70+15*credit);
  assert.equal(after.kills,before.kills+credit);
  assert.equal(after.total,before.total+credit);
  assert.equal(after.dead,!spec.cancel);
  assert.equal(after.ammo,6);
  if (spec.kind === 2) assert.deepEqual(after.frames,[]);
  else if (spec.reduce) assert.equal(after.frames.length,2);
  else assert(after.frames.length>=3);
  assert.equal(after.grasp,spec.key==="z" && spec.kind===0 && !spec.mask);
  if (!spec.cancel) {
    assert.equal(after.fired,3);
    assert(after.time>1.17 && after.time<1.251);
  }
  const z = await page.evaluate(() => __BLACK_SILENCE_QA.C.pz);
  await page.keyboard.down("w");
  await page.waitForFunction(z => Math.abs(__BLACK_SILENCE_QA.C.pz-z)>.065,z);
  await page.keyboard.up("w");
  await page.mouse.down();
  await page.waitForFunction(() => __BLACK_SILENCE_QA.T.mag[0]<6);
  await page.mouse.up();
  await page.evaluate(() => {window.actor=null;});
  return {...spec,pausedAt:paused[1],...after,controlReturned:true};
}

(async () => {
  const work=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-reactions-"));
  const fixture=path.join(work,"checked.html");
  const seam='  const limitedMotion = matchMedia("(prefers-reduced-motion: reduce)");';
  assert.equal(source.split(seam).length,2);
  fs.writeFileSync(fixture,source.replace(seam,() => `window.reactionProbe=(${exposeReactionProbe.toString()})();\n${seam}`));
  let browser;
  try {
    browser=await chromium.launch({channel:"chrome",headless:true});
    const page=await browser.newPage({viewport:{width:960,height:540},offline:true});
    page.on("pageerror",error=>report.errors.push(error.message));
    await page.goto(pathToFileURL(fixture).href+"?qa=1");
    report.titleScreenSheets = await page.evaluate(() => reactionProbe.preparedKeys());
    assert.deepEqual(report.titleScreenSheets,[],"The title screen must not decode enemy close-ups");
    await page.locator("#mNew").click();
    await page.waitForFunction(ready,null,{timeout:60000});
    for (const spec of [{key:"z",kind:0},{key:"s",kind:1},{key:"z",kind:0,reduce:true},
      {key:"s",kind:1,reduce:true},{key:"z",kind:0,mask:4},{key:"z",kind:2},
      {key:"s",kind:1,cancel:true},{key:"z",kind:0,cancel:true}])
      report.runs.push(await exercise(page,spec));
    report.cache=await page.evaluate(() => reactionProbe.verifyCache());
    assert.deepEqual(report.errors,[]);
    report.passed=true;
    console.log(`Passed ${report.runs.length} real E runs and ${report.cache.checks.length} exact texture comparisons.`);
  } finally {
    if(browser) await browser.close();
    if(fs.existsSync(fixture))fs.unlinkSync(fixture);
    fs.rmdirSync(work);
    assert.equal(sha(fs.readFileSync(input)),report.sha256);
    if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
