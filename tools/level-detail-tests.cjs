// Validate authored scene additions against the same shipped native builders.
// Optional arguments: game.html, capture-directory. No current-source reinjection.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const htmlPath = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const output = path.resolve(process.argv[3] || path.join(root, ".dream-loop", "level-details"));
const baselineCapture = process.argv.includes("--baseline");
fs.mkdirSync(output, { recursive: true });
const marker = "// Prologue refinement: use the original map, props, lighting and message line.";
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
let html = fs.readFileSync(htmlPath, "utf8");
assert.equal(html.split(marker).length, 2, "Exactly one shipped scene module");
html = html.replace(marker,
  "window.__LEVEL_DETAIL_ORIGINAL=[gV[1].build,gV[9].build];\n" + marker);
html = html.replace(anchor, `
window.__LEVEL_DETAIL_TEST = {
  compare() {
    return [1,9].map((level,index) => {
      const original=window.__LEVEL_DETAIL_ORIGINAL[index](), current=gV[level].build();
      const {decor:before,...beforeMap}=original, {decor:after,...afterMap}=current;
      const added=after.slice(before.length);
      return {level, unchangedMap:JSON.stringify(beforeMap)===JSON.stringify(afterMap),
        unchangedExistingDecor:JSON.stringify(before)===JSON.stringify(after.slice(0,before.length)),
        added:added.length, newLights:added.filter(p=>p.k==='light'||di[p.k]?.light).length,
        newCollisionMasses:added.filter(p=>di[p.k]?.mass).length,
        anchorsValid:added.every(p=>!"#WI+DS".includes(current.g[Math.floor(p.z+.5)]?.[Math.floor(p.x+.5)]||'#')),
        repeatCount:gV[level].build().decor.length===after.length};
    });
  },
  pose(x,z,tx,tz) {
    V5(true); C.px=x; C.pz=z; C.vx=C.vz=C.vy=0; C.pyy=ie(x,z)+Yo;
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI; Ct.pitch=0;
    if(T.level===0) TR(0,true);
    // Advance the original subtitle timers, preserving game dialogue content.
    for(let i=0;i<540;i++){Wb(1/60);SK(1/60);}
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,'YXZ'); J.camera.updateMatrixWorld(true);
    document.getElementById('pause').classList.add('hidden');
  }
};
` + anchor);
const study = path.join(output, "study.html");
fs.writeFileSync(study, html);
(async () => {
  const browser = await chromium.launch({headless:true,channel:"chrome",args:["--allow-file-access-from-files"]});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:720}});
    const errors=[]; page.on("pageerror", e=>errors.push(e.message));
    await page.goto(pathToFileURL(study).href+"?qa=1");
    await page.locator("#mNew").click();
    await page.waitForTimeout(11000);
    const checks=await page.evaluate(()=>window.__LEVEL_DETAIL_TEST.compare());
    for(const check of checks) {
      assert(check.unchangedMap && check.unchangedExistingDecor && check.repeatCount, "Native chapter preserved: "+check.level);
      assert(check.anchorsValid && check.newCollisionMasses===0 && check.newLights===0, "Safe static batches: "+check.level);
      if (!baselineCapture) assert(check.added>=8, "Authored details present: "+check.level);
    }
    for(const [name,level,x,z,tx,tz] of [
      ["chapel-altar",0,59,16,59,6],
      ["monastery-crypt",9,167,154,167,148],
      ["dungeon-gallery",1,31,12,35,5],
    ]) {
      if(level!==0) await page.evaluate(level=>{
        const q=window.__BLACK_SILENCE_QA;q.load(level);q.C.spawnGuard=100;q.pause(false);
      },level);
      if(level!==0) await page.waitForTimeout(6500);
      await page.waitForFunction(()=>!window.__BLACK_SILENCE_QA.Be.inputLock);
      await page.evaluate(p=>window.__LEVEL_DETAIL_TEST.pose(...p),[x,z,tx,tz]);
      await page.waitForTimeout(500);
      await page.screenshot({path:path.join(output,name+".png")});
    }
    assert.deepEqual(errors,[],"No browser runtime errors");
    const report={passed:true,mode:baselineCapture?"baseline-capture":"detail-validation",game:htmlPath,checks,errors,captureScope:"Staged camera views; original map/props/elevations/pickups/encounters preserved. No full later-chapter playthrough claim."};
    fs.writeFileSync(path.join(output,"results.json"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
