// Observe the compositor while real mouse and R inputs drive the normal game loop.
// node tools/tommy-presentation-tests.cjs game.html output-directory
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const input = path.resolve(process.argv[2] || 'THE-BLACK-SILENCE.html');
const output = path.resolve(process.argv[3] || '.dream-loop/tommy-presentation');
fs.mkdirSync(output, {recursive: true});
const fixture = path.join(output, 'presentation-fixture.html');
assert.notEqual(input.toLowerCase(), fixture.toLowerCase());

function installProbe() {
  const probe = window.tommyProbe = {frames: [], flashes: [], enabled: false};
  const present = u0t;
  u0t = function (...args) {
    if (!probe.enabled || T.cur !== 3) return present.apply(this, args);
    const ctx = ER(), draw = ctx.drawImage, gradient = ctx.createRadialGradient;
    let muzzle, canvasMuzzle;
    ctx.drawImage = function (image, ...rect) {
      if (image === Te.canvas && rect.length === 4 && Te.anchors.muzzle) {
        const tr = this.getTransform(), [x,y,w,h] = rect;
        const dx = x, dy = y, sx = w/Wr, sy = h/Xs;
        const [mx,my] = Te.anchors.muzzle;
        muzzle = [dx + mx*sx, dy + my*sy];
        const physical = tr.transformPoint(new DOMPoint(...muzzle));
        canvasMuzzle = [physical.x, physical.y, Math.hypot(tr.a,tr.b)];
        const lo = Math.max(0, Math.floor((bj()*.49-dx)/sx));
        const hi = Math.min(Wr-1, Math.ceil((bj()*.51-dx)/sx));
        let centerTop = 1;
        scan: for (let row = 0; row < Xs; row++) {
          for (let col = lo; col <= hi; col++) {
            if (Te.image.data[(row*Wr+col)*4+3] <= 64) continue;
            centerTop = Math.min(1, (dy + row*sy)/MR());
            break scan;
          }
        }
        probe.frames.push({state: St.wstate, t: St.wtime/Th[3].reload,
          centerTop, muzzleX: muzzle[0]/bj(), muzzleY: muzzle[1]/MR()});
      }
      return draw.call(this, image, ...rect);
    };
    ctx.createRadialGradient = function (...stops) {
      if (muzzle && stops[0] === 0 && stops[1] === 0 && stops[2] === 2 && stops[5] > 2) {
        const tr = this.getTransform();
        probe.flashes.push(Math.hypot(tr.e-canvasMuzzle[0], tr.f-canvasMuzzle[1])/canvasMuzzle[2]);
      }
      return gradient.apply(this, stops);
    };
    try { return present.apply(this, args); }
    finally { ctx.drawImage = draw; ctx.createRadialGradient = gradient; }
  };
}

function setCorridor() {
  const q = window.__BLACK_SILENCE_QA;
  q.resetCombat();
  q.pause(false);
  q.Be.inputLock = false;
  q.v.cine = null;
  for (const enemy of q.v.enemies) enemy.stun = 999;
  for (let z = 1; z < q.v.GH-1; z++) {
    for (let x = 1; x < q.v.GW-1; x++) {
      const px = (x+.5)*q.cellSize, pz = (z+.5)*q.cellSize;
      if (q.solid(px,pz) || q.solid(px,pz-4) || !q.line(px,pz,px,pz-4)) continue;
      if (Math.abs(q.floor(px,pz)-q.floor(px,pz-3)) > .25) continue;
      Object.assign(q.C, {px,pz,pyy:q.floor(px,pz)+q.eyeHeight, vx:0,vy:0,vz:0,grounded:true,spawnGuard:999});
      Object.assign(q.Ct, {yaw:0,pitch:0,firing:false});
      q.setCamera();
      q.T.weapons[3] = true;
      q.T.mag[3] = 3;
      q.T.ammo.bullets = 120;
      window.tommyTarget = q.spawn('z', px, pz-3, true);
      window.tommyTarget.stun = 999;
      return;
    }
  }
  throw Error('No clear corridor for the aiming fixture');
}

(async () => {
  const source = fs.readFileSync(input, 'utf8'), marker = 'Jk();ju();Yy();X$(J$);D0t();';
  assert.equal(source.split(marker).length, 2);
  fs.writeFileSync(fixture, source.replace(marker, () => '('+installProbe.toString()+')();'+marker));
  const browser = await chromium.launch({channel:'chrome'}), report = {cases:[],errors:[]};
  try {
    const page = await browser.newPage({offline:true});
    page.on('pageerror', e => report.errors.push(String(e)));
    await page.goto(pathToFileURL(fixture).href+'?qa=1');
    await page.locator('#mNew').click();
    await page.waitForFunction(() => window.__BLACK_SILENCE_QA?.paintedGloves.ready() && !__BLACK_SILENCE_QA.Be.inputLock);
    await page.evaluate(setCorridor);
    await page.keyboard.press('Digit4');
    await page.waitForFunction(() => __BLACK_SILENCE_QA.T.cur === 3 && __BLACK_SILENCE_QA.St.wstate === 'idle');
    for (const [width,height] of [[960,720],[1280,720],[1680,720]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(() => {
        const q = __BLACK_SILENCE_QA;
        q.T.mag[3] = 3;
        q.T.ammo.bullets = 120;
        tommyTarget.hp = tommyTarget.maxhp;
        tommyTarget.stun = 999;
        tommyProbe.frames = [];
        tommyProbe.flashes = [];
        tommyProbe.enabled = true;
      });
      await page.waitForFunction(() => tommyProbe.frames.some(f=>f.state==='idle'));
      await page.mouse.down();
      try { await page.waitForFunction(() => tommyTarget.hp < tommyTarget.maxhp && tommyProbe.flashes.length); }
      finally { await page.mouse.up(); }
      await page.waitForFunction(() => __BLACK_SILENCE_QA.St.wstate==='idle');
      await page.keyboard.press('r');
      await page.waitForFunction(() => tommyProbe.frames.some(f=>f.state==='reload'));
      await page.waitForFunction(() => __BLACK_SILENCE_QA.St.wstate==='idle' && __BLACK_SILENCE_QA.T.mag[3]===__BLACK_SILENCE_QA.weapons[3].magSize);
      const sample = await page.evaluate(() => {
        tommyProbe.enabled = false;
        return {frames:tommyProbe.frames,flashes:tommyProbe.flashes,damage:tommyTarget.maxhp-tommyTarget.hp};
      });
      const idle = sample.frames.find(f=>f.state==='idle');
      const loading = sample.frames.filter(f=>f.state==='reload');
      const handled = loading.filter(f=>f.t>=.13 && f.t<=.86);
      assert(idle.centerTop>=.65 && idle.muzzleY>=.54 && idle.muzzleY<=.68, 'Ready pose obstructed');
      assert(handled.length>2 && loading.some(f=>f.t>.75), 'Drum and charging strokes must be observed');
      const minimum = Math.min(...handled.map(f=>f.centerTop));
      assert(minimum>=.54, 'Raised receiver obscures the aiming corridor');
      const flashError = Math.max(...sample.flashes);
      report.cases.push({width,height,idle,minimum,reloadFrames:loading.length,flashError,damage:sample.damage});
      assert(flashError<=.37, `Muzzle flash displacement was ${flashError.toFixed(3)} logical pixels`);
    }
    assert.deepEqual(report.errors, []);
    console.log(JSON.stringify(report.cases));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output,'report.json'), JSON.stringify(report,null,2));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
