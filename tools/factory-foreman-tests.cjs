const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.dream-loop', 'factory-foreman-test');
fs.mkdirSync(out, { recursive: true });
const anchor = 'Jk();ju();Yy();X$(J$);D0t();';
const expectedBase = 'e0e15fb5cfe8ffb640d9e3a6abf664133c7919194693f22ff0d5690927a26667';
const baseline = execFileSync('git', ['show', '1c4ce79:THE-BLACK-SILENCE.html'], { cwd:root, maxBuffer:32_000_000 });
assert.equal(crypto.createHash('sha256').update(baseline).digest('hex'), expectedBase);
const content = baseline.toString();
assert.equal(content.split(anchor).length, 2);
const foreman = fs.readFileSync(path.join(root, 'src', 'factory-foreman.js'), 'utf8').replace(/\r\n/g, '\n').trim();
const isolated = content.replace(anchor, () => `${foreman}\n${anchor}`);
const input = [path.join(out, 'baseline.html'), path.join(out, 'foreman-only.html')];
fs.writeFileSync(input[0], baseline);
fs.writeFileSync(input[1], isolated);

const fixture = `(() => {
  const release = Qo;
  let triggered = [];
  const orbState = ({m,vx,vy,vz,dmg,life,tox,col}) => ({pos:m.position.toArray(),vx,vy,vz,dmg,life,tox:tox ?? null,col});
  Qo = function (actor, ...args) {
    const before = hA.orbs.length;
    const result = release.call(this, actor, ...args);
    if (actor.key === 'V') triggered.push(...hA.orbs.slice(before).map(orbState));
    return result;
  };
  window.foremanParity = {
    clear() {
      for (const orb of hA.orbs) J.scene.remove(orb.m);
      hA.orbs.length = 0;
      triggered = [];
    },
    warm() {
      return Object.fromEntries(['V','V2','U','G'].map(key => [key, [...Ze[key].rig.frames.keys()].sort()]));
    },
    state(enemy) {
      const atlas = wk(enemy), texture = enemy.sp.material.map;
      const key = [...atlas.frames.entries()].find(([,frame]) => frame === texture)?.[0];
      const gameplay = ['hp','maxhp','phase','x','z','fy','h','w','cool','atkT','atkAnim','tpT','sumT','ringT','debT','mel','speed','hurt','stun','dormant','dead','kx','kz','formKey'];
      return {
        gameplay: {
          ...Object.fromEntries(gameplay.map(key => [key, enemy[key] ?? null])),
          pos:enemy.sp.position.toArray(), scale:enemy.sp.scale.toArray(),
          playerHP:T.hp, playerArmor:T.armor, playerDead:T.dead,
          rings:v.rings.length,strikes:v.strikes.length,summoned:v.enemies.filter(actor=>actor.summoned).length,
        },
        visual: { key, w:texture.image.width,h:texture.image.height,colors:texture.colorSpace,baked:atlas.baked },
        fired:triggered.splice(0), live:hA.orbs.map(orbState),
      };
    },
    flight(dt) { htt(dt); },
  };
})();`;

async function sample(browser, file, index) {
  const bytes = fs.readFileSync(file);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const src = bytes.toString();
  assert.equal(src.split(anchor).length, 2);
  const instrumented = src.replace(anchor, () => fixture + '\n' + anchor);
  const privateFile = path.join(out, `qa-${index}.html`);
  fs.writeFileSync(privateFile, instrumented);
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 }, offline: true });
  const errors = [];
  p.on('pageerror', err => errors.push(err.message));
  try {
    await p.goto(pathToFileURL(privateFile).href + '?qa=1', {waitUntil:'domcontentloaded'});
    await p.locator('#mNew').focus();
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => __BLACK_SILENCE_QA?.Be.started && __BLACK_SILENCE_QA.paintedGloves.ready());
    const results = await p.evaluate(() => {
      const q = __BLACK_SILENCE_QA, audit = foremanParity;
      let warmMS;
      const now = performance.now.bind(performance), random = Math.random;
      let clock = 10_000, count = 0, seed = 2783;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        count++;
        return seed / 2**32;
      };
      try {
        const start = now();
        q.load(6);
        warmMS = now() - start;
        q.pause(true);
        q.v.cine = null;
        q.Be.inputLock = false;
        const boss = q.v.enemies.find(actor => actor.key === 'V');
        for (const actor of q.v.enemies) if (actor !== boss) q.J.scene.remove(actor.sp, actor.blob);
        q.v.enemies = [boss];
        const origin = { x:boss.x, z:boss.z };
        Object.assign(q.C,{ px:boss.x, pz:boss.z+6.4, pyy:q.floor(boss.x,boss.z+6.4)+q.eyeHeight,
          vx:0,vy:0,vz:0,grounded:true,spawnGuard:0 });
        Object.assign(q.T,{ hp:100,armor:0,dead:false,won:false });
        const resident = audit.warm();
        performance.now = () => clock;
        function advance(ticks, moveOrbs = true) {
          for (let i=0;i<ticks;i++) {
            clock += 12.5;
            q.enemyStep(.0125);
            if (moveOrbs) audit.flight(.0125);
          }
        }
        const snapshot = label => ({ label, rng:count, ...audit.state(boss) });
        const phases = [];
        for (const hp of [2600,1450,705]) {
          q.resetCombat();
          audit.clear();
          Object.assign(q.T,{ hp:100,armor:0,dead:false,won:false });
          Object.assign(q.C,{ px:origin.x,pz:origin.z+6.4,pyy:q.eyeHeight,spawnGuard:0 });
          Object.assign(boss,{ hp,...origin,kx:0,kz:0,dormant:false,aware:true,stun:0,hurt:0,
            tpT:99,atkT:99,sumT:99,ringT:99,debT:99,cool:99 });
          advance(1,false);  // Ensure actual phase transition precedes comparable setup.
          Object.assign(boss,{ ...origin,atkT:.505,atkAnim:0 });
          const frames = [snapshot('ready')];
          for (let i=1;i<=116;i++) {
            advance(1);
            frames.push(snapshot('tick-'+i));
          }
          phases.push({ phase:boss.phase, frames });
        }
        const elapsedFrames = audit.warm(), authoredRngCalls = count;
        const warmReloadMs = [];
        for (let repeat = 0; repeat < 3; repeat++) {
          const warmStart = now();
          q.load(6);
          warmReloadMs.push(now() - warmStart);
        }
        return { phases,resident,after:elapsedFrames,warmMS,warmReloadMs,count:authoredRngCalls };
      } finally {
        performance.now = now;
        Math.random = random;
      }
    });
    assert.deepEqual(errors, []);
    return { sha256,file,errors,...results };
  } finally {
    await p.close();
  }
}

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const [before, after] = [await sample(browser,input[0],0), await sample(browser,input[1],1)];
    let pairs = [before,after];
    if (process.argv.includes('--warm-abba')) {
      const repeatedAfter = await sample(browser,input[1],2);
      const repeatedBefore = await sample(browser,input[0],3);
      pairs.push(repeatedAfter,repeatedBefore);
    }
    fs.writeFileSync(path.join(out,'parity-native.json'), JSON.stringify({ before,after },null,2));
    const wanted = [1,5,3], cooldown = [3.4,2.8,3.6];
    const compared = [];
    for (const [i,phase] of after.phases.entries()) {
      const baseline = before.phases[i];
      const gameplaySet = ({ label,rng,gameplay,fired,live }) => ({ label,rng,gameplay,fired,live });
      assert.deepEqual(phase.frames.map(gameplaySet), baseline.frames.map(gameplaySet), `Phase ${i+1} mechanics or RNG differ`);
      const launch = phase.frames.findIndex(frame => frame.fired.length);
      assert.ok(launch > 30);
      assert.equal(phase.frames[launch].fired.length,wanted[i]);
      assert.equal(phase.frames[launch].gameplay.atkT,cooldown[i]);
      assert.equal(phase.frames[launch].visual.key,'foremanCast3:0');
      assert.deepEqual(phase.frames.slice(0,launch).filter((frame,j,frames) => frame.visual.key?.startsWith('foremanCast') && frame.visual.key!==frames[j-1]?.visual.key).map(frame => frame.visual.key), ['foremanCast0:0','foremanCast1:0','foremanCast2:0']);
      assert.ok(phase.frames[launch+9].visual.key.startsWith('foremanCast4:'));
      assert.ok(phase.frames[launch+20].visual.key.startsWith('foremanCast5:'));
      assert.ok(!phase.frames[launch+28].visual.key.startsWith('foremanCast'));
      compared.push({phase:i+1, launchSample:launch, launched:wanted[i], cooldown:cooldown[i],
        damage:100-phase.frames.at(-1).gameplay.playerHP, pos:phase.frames[launch].fired.map(ball=>ball.pos),
        recovery:phase.frames[launch+28].visual.key });
    }
    for (const key of ['U','G']) assert.deepEqual(after.after[key], before.after[key]);
    for (const key of ['V','V2']) {
      assert.equal(after.resident[key].filter(pose => pose.startsWith('foremanCast')).length,0);
      assert.equal(after.after[key].filter(pose => pose.startsWith('foremanCast')).length,6);
    }
    const summary = { passed:true, base:before.sha256,candidate:after.sha256, measuredSamples:351, rng:after.count,
      chapterLoadOrder:pairs.length===4 ? 'ABBA' : 'AB',coldChapterLoadMs:pairs.map(result => result.warmMS),
      warmChapterLoadMs:pairs.map(result => result.warmReloadMs), compared };
    fs.writeFileSync(path.join(out,'parity-summary.json'),JSON.stringify(summary,null,2));
    console.log(JSON.stringify(summary));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
