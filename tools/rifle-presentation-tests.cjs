const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

const root = path.resolve(__dirname,"..");
const html = path.resolve(process.argv[2] || path.join(root,"THE-BLACK-SILENCE.html"));
const output = path.resolve(process.argv[3] || path.join(root,".dream-loop/rifle-presentation"));
assert.notEqual(html,output,"Pass a game HTML and a separate report directory");
const source = fs.readFileSync(html, "utf8");
const sourceSha = crypto.createHash("sha256").update(source).digest("hex");
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
assert.equal(source.split(anchor).length, 2);
fs.mkdirSync(output, {recursive:true});
const fixture = path.join(output, "rifle-probe.html");
assert.notEqual(fixture, html);

// Read a small screen-space region from the game’s actual weapon composite,
// including the native draw transform. HUD and world pixels stay excluded.
function observeWeapon() {
  const original = CanvasRenderingContext2D.prototype.drawImage;
  const scratch = document.createElement("canvas");
  const radius = 50;
  const diameter = radius * 2 + 1;
  scratch.width = scratch.height = diameter;
  const pixels = scratch.getContext("2d", {willReadFrequently:true});
  let frames = null;
  window.__beginRifleRead = () => {frames = [];};
  window.__endRifleRead = () => {const result = frames; frames = null; return result;};
  CanvasRenderingContext2D.prototype.drawImage = function(image, ...rect) {
    const result = original.call(this, image, ...rect);
    if (!frames || image !== Te.canvas || rect.length !== 4 || T.cur !== 2) return result;
    const matrix = this.getTransform();
    const canvas = this.canvas;
    const box = canvas.getBoundingClientRect();
    const viewX = (innerWidth / 2 - box.left) / box.width * canvas.width;
    const viewY = (innerHeight / 2 - box.top) / box.height * canvas.height;
    pixels.resetTransform();
    pixels.clearRect(0,0,diameter,diameter);
    pixels.setTransform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.e+radius-viewX,matrix.f+radius-viewY);
    pixels.imageSmoothingEnabled = this.imageSmoothingEnabled;
    original.call(pixels,image,...rect);
    const rgba = pixels.getImageData(0,0,diameter,diameter).data;
    let distance = radius;
    for(let y=0;y<diameter;y++) for(let x=0;x<diameter;x++) {
      if (rgba[(y*diameter+x)*4+3] < 16) continue;
      const dx = (x-radius)*box.width/canvas.width;
      const dy = (y-radius)*box.height/canvas.height;
      distance = Math.min(distance,Math.hypot(dx,dy));
    }
    frames.push({distance,state:St.wstate,phase:St.wtime/Th[2].reload});
    return result;
  };
}

const cues = ["release","strip","guide","seat","drawBolt","catchBolt"];
const viewports = [[1024,768],[1280,720],[1680,720]];
const proofOnly = process.env.RIFLE_REPORT_ONLY === "1";
fs.writeFileSync(fixture, source.replace(anchor, () => `(${observeWeapon})();${anchor}`));
async function read() {
  const b = await chromium.launch({channel:"chrome",headless:true});
  try {
    const page = await b.newPage({viewport:{width:1280,height:720}});
    const errors = [], requests = [];
    page.on("pageerror", err => errors.push(err.message));
    await page.route(/^https?:/, req => {requests.push(req.request().url()); return req.abort();});
    await page.goto(pathToFileURL(fixture).href+"?qa=1");
    await page.locator("#mNew").click();
    await page.waitForFunction(() => {
      const q = window.__BLACK_SILENCE_QA;
      return q?.Be.started && !q.Be.inputLock && q.paintedGloves.ready();
    },null,{timeout:60000});
    await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA;
      for (const e of q.v.enemies){q.J.scene.remove(e.sp);q.J.scene.remove(e.blob);}
      q.v.enemies = [];
      q.v.cine = null;
    });
    const runs = [];
    for(const [width,height] of viewports) {
      await page.setViewportSize({width,height});
      const initial = await page.evaluate(() => {
        const q = window.__BLACK_SILENCE_QA, w = q.weapons[2];
        q.resetCombat();
        q.pause(false);
        q.C.spawnGuard = 100;
        q.T.cur = 2;
        q.T.weapons[2] = true;
        q.T.mag[2] = w.magSize;
        q.T.ammo[w.ammo] = 50;
        q.T.kickCd = 0;
        Object.assign(q.St,{wstate:"idle",wtime:0,wCool:0,pending:-1,kickAnim:0});
        q.reloadAudio.history.length = 0;
        window.__beginRifleRead();
        return [w.magSize, q.T.ammo[w.ammo]];
      });
      await page.waitForTimeout(420);
      await page.mouse.down();
      await page.waitForFunction(n => window.__BLACK_SILENCE_QA.T.mag[2] <= n-4, initial[0]);
      await page.mouse.up();
      await page.waitForFunction(() => window.__BLACK_SILENCE_QA.St.wstate==="idle");
      const afterFire = await page.evaluate(() => window.__BLACK_SILENCE_QA.T.mag[2]);
      await page.keyboard.press("r");
      await page.waitForFunction(() => window.__BLACK_SILENCE_QA.St.wstate==="reload");
      await page.waitForFunction(n => {
        const q = window.__BLACK_SILENCE_QA;
        return q.St.wstate==="idle" && q.T.mag[2]===n;
      },initial[0],{timeout:20000});
      const details = await page.evaluate(() => {
        const q = window.__BLACK_SILENCE_QA, w = q.weapons[2];
        return {
          frames: window.__endRifleRead(),
          final:[q.T.mag[2],q.T.ammo[w.ammo]],
          played:q.reloadAudio.history.filter(e=>e.type==="play")
            .map(({event,phase,target})=>({event,phase,target}))
        };
      });
      assert.equal(details.final[0],initial[0]);
      assert.equal(details.final[1],initial[1]-initial[0]+afterFire);
      const samples = {};
      for (const state of ["idle","fire","reload"]) {
        const frames = details.frames.filter(f=>f.state===state);
        assert(frames.length >= 3,`Missing native ${state} frames`);
        const minimum = frames.reduce((a,f) => f.distance<a.distance?f:a);
        samples[state] = {count:frames.length,nearest:minimum.distance,phase:minimum.phase,
          obstructedPhases:frames.filter(f=>f.distance<12).map(f=>Math.round(f.phase*1000)/1000)};
      }
      if (!proofOnly) {
        assert.deepEqual(details.played.map(e=>e.event),cues);
        assert(details.played.every(e=>e.phase>=e.target-1e-5 && e.phase-e.target<.07));
      }
      runs.push({width,height,initial,afterFire,final:details.final,samples,played:details.played});
      fs.writeFileSync(path.join(output,"rifle-presentation.json"),JSON.stringify({sourceSha,runs,errors,requests},null,2)+"\n");
      if (!proofOnly) assert(Object.values(samples).every(s=>s.nearest>=12),
        `${width}x${height} has less than 12 CSS px of rifle clearance ${JSON.stringify(samples)}`);
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(requests,[]);
    console.log("Rifle viewport, ammunition and audio",sourceSha,JSON.stringify(runs));
  } finally {await b.close();}
}
read().catch(err=>{console.error(err);process.exitCode=1;});
