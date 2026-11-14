// Exercise the game's own simulation, delayed impact, renderer and physical hit
// detection using a manual 60 Hz browser RAF. Optional output is contact sheets
// captured in the playable level at native eye height.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const input = path.resolve(process.env.GAME_HTML || path.join(__dirname, "../THE-BLACK-SILENCE.html"));
const baseline = process.env.BASELINE === "1";
const out = process.env.HEAVY_PROOF;
const steps = [3, 19, 29, 40, 49];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      // The controlled clock drives camera input directly. Headless pointer
      // lock can otherwise reject after a slow bake expires user activation.
      Element.prototype.requestPointerLock = async () => {};
      const callbacks = new Map();
      const nativeRAF = window.requestAnimationFrame.bind(window);
      const cancelNative = window.cancelAnimationFrame.bind(window);
      let id = 0;
      window.requestAnimationFrame = fn => {
        if (!window.manualFrames)
          return nativeRAF(time => window.manualFrames ? callbacks.set(--id, fn) : fn(time));
        callbacks.set(--id, fn);
        return id;
      };
      window.cancelAnimationFrame = key => key < 0 ? callbacks.delete(key) : cancelNative(key);
      window.tick = () => {
        const pending = Array.from(callbacks.values());
        callbacks.clear();
        const time = window.__BLACK_SILENCE_QA.Be.last + 1000/60;
        for (const callback of pending) callback(time);
      };
    });
    await page.goto(pathToFileURL(input).href + "?qa=1");
    await page.locator("#mNew").click();
    await page.waitForFunction(() => {
      const q=window.__BLACK_SILENCE_QA;
      return q?.Be.started && !q.Be.inputLock && q.paintedGloves.ready();
    });
    await page.evaluate(() => { window.manualFrames = true; });
    await page.waitForTimeout(150);
    const setup = async (key, hit) => page.evaluate(({ key, hit, baseline }) => {
      const q = window.__BLACK_SILENCE_QA;
      q.load(6);
      q.resetCombat();
      q.pause(false);
      for (const id of ["pause","dead","win","levelend","menu"]) document.getElementById(id)?.classList.add("hidden");
      q.Be.inputLock = false;
      q.v.cine = null;
      const roster=q.v.enemies.map(e=>[e.key,e.x,e.z]);
      const coal=q.v.enemies.find(e=>e.x===77 && e.z===9);
      if(coal?.key !== (baseline ? "n" : "B")) throw Error("The expected Factory coal-store enemy is missing");
      const placed=q.v.enemies.find(e=>e.key===key && (key==="B" || e.x===45));
      const e=placed || q.spawn(key,77,9,true);
      for (const other of q.v.enemies) if (other!==e) {
        q.J.scene.remove(other.sp); q.J.scene.remove(other.blob);
      }
      q.v.enemies=[e];
      let px,pz;
      for(let i=0;i<24;i++) {
        const a=.6435+i*Math.PI/12;
        const x=e.x+Math.sin(a)*2.8, z=e.z+Math.cos(a)*2.8;
        if(q.solid(x,z) || !q.line(x,z,e.x,e.z) || q.floor(x,z)!==e.fy) continue;
        px=x; pz=z; break;
      }
      if(!Number.isFinite(px)) throw Error("No clear approach to placed actor");
      Object.assign(q.C, { px,pz,pyy:q.floor(px,pz)+q.eyeHeight, vx:0,vy:0,vz:0,
        grounded:true, spawnGuard:0 });
      Object.assign(q.Ct, { yaw:Math.atan2(px-e.x,pz-e.z),pitch:0,firing:false });
      Object.assign(q.T, { hp:100,armor:0,dead:false,won:false });
      q.setCamera();
      document.getElementById("subt").textContent="";
      Math.random = () => .5;
      Object.assign(e, { slamT:0,cool:8,flingCD:100,aware:true,flank:0 });
      window.heavy = e;
      window.nearHit = hit;
      window.heavyFrame = 0;
      window.heavyTrace = [];
      window.textureIds = new Map();
      return {w:e.w,h:e.h,maxhp:e.maxhp,position:[e.x,e.z],placed:!!placed,roster};
    }, { key, hit, baseline });
    const step = end => page.evaluate(end => {
      const q = window.__BLACK_SILENCE_QA, e = window.heavy;
      while (window.heavyFrame < end) {
        window.heavyFrame++;
        // A late sidestep out of the true hit radius tests the queued miss.
        if (!nearHit && heavyFrame === 19) q.li.KeyS = true;
        tick();
        if (heavyFrame === 33) q.li.KeyS = false;
        const texture = e.sp.material.map;
        if (!textureIds.has(texture)) textureIds.set(texture,textureIds.size);
        heavyTrace.push({ hp:q.T.hp, x:e.x, z:e.z, stun:e.stun, ownHp:e.hp,
          slamT:e.slamT, w:e.w, h:e.h, pose:q.enemyAnimation(e)?.pose,
          elapsed:q.enemyAnimation(e)?.slamElapsed, map:textureIds.get(texture) });
      }
      return heavyTrace;
    }, end);
    for (const key of ["n","B"]) {
      for (const hit of [true,false]) {
        const start = await setup(key, hit);
        const pics = [];
        for (const frame of steps) {
          await step(frame);
          if (out && hit) pics.push(PNG.sync.read(await page.screenshot()));
        }
        const trace = await step(52);
        const contact = trace.findIndex(f => f.hp < 100) + 1;
        const byFrame = frame => trace[frame-1];
        assert.equal(byFrame(1).slamT,4,key+" actual special attack scheduled");
        assert.equal(contact,hit ? 29 : 0,key+" native impact must land at 0.48 s or miss the dodge");
        assert.equal(trace.at(-1).hp,hit ? 76 : 100,key+" one native 24 HP hit");
        assert(trace.every(f => f.w===start.w && f.h===start.h && f.ownHp===start.maxhp));
        if (!baseline) {
          assert(steps.slice(0,4).every(frame=>byFrame(frame).pose==="slam"),key+" native slam poses");
          assert.equal(new Set(steps.slice(0,4).map(frame=>byFrame(frame).map)).size,4,key+" four distinct frames");
          assert.equal(trace.at(-1).elapsed,null,key+" recovery releases pose");
        }
        results.push({key,hit,contact,health:trace.at(-1).hp,start,frames:steps.map(frame=>({frame,...byFrame(frame)}))});
        if (pics.length) {
          fs.mkdirSync(out,{recursive:true});
          const width=300,height=340;
          const sheet=new PNG({width:width*pics.length,height});
          for(let i=0;i<pics.length;i++)
            PNG.bitblt(pics[i],sheet,330,63,width,height,width*i,0);
          fs.writeFileSync(path.join(out,key+"-slam.png"),PNG.sync.write(sheet));
        }
      }
    }
    const chapter=await page.evaluate(baseline => {
      const q=window.__BLACK_SILENCE_QA;
      q.load(6);
      const all=q.v.enemies, cell=n=>Math.floor(n / q.cellSize);
      const grid=q.v.grid.map(row=>row.slice());
      const boss=all.find(e=>e.key==="V");
      const brute=all.find(e=>e.x===77 && e.z===9);
      if(!boss || !brute) throw Error("Native encounter or Factory boss missing");
      const actors=all.map(e=>[e.key,cell(e.x),cell(e.z)]);
      // Look across the coal store from the entrance side. All placed actors,
      // lights, fog and surrounding geometry are present in this wide view.
      q.Be.inputLock=false; q.v.cine=null; q.pause(false);
      Object.assign(q.C,{px:85,pz:18,pyy:q.floor(85,18)+q.eyeHeight,vx:0,vy:0,vz:0});
      Object.assign(q.Ct,{yaw:Math.atan2(85-brute.x,18-brute.z),pitch:0,firing:false});
      q.setCamera();
      for(let i=0;i<12;i++) tick();
      const neighbours=[[1,0],[-1,0],[0,1],[0,-1]];
      function canReach(start,target,unlocked) {
        const seen=new Set(), queue=[start];
        for(let i=0;i<queue.length;i++) {
          const [x,z]=queue[i], key=x+","+z;
          if(seen.has(key) || "#WIS".includes(grid[z]?.[x]||"#") ||
            (!unlocked && grid[z][x]==="D")) continue;
          if(x===target[0] && z===target[1]) return true;
          seen.add(key);
          for(const [dx,dz] of neighbours) queue.push([x+dx,z+dz]);
        }
        return false;
      }
      const start=[5,38], key=[54,34], coal=[38,4];
      const lockedRoute=canReach(start,[cell(boss.x),cell(boss.z)],false);
      q.damage(boss,boss.hp+1,{wIdx:0});
      const exit=q.v.exitPos;
      return {actors,startsAt:brute.key,
        keyPickup:q.v.items.some(item=>cell(item.x)===key[0]&&cell(item.z)===key[1]),
        entranceToKey:canReach(start,key,false), entranceToCoal:canReach(start,coal,false),
        lockedRoute, throughLockedDoor:canReach(key,[cell(boss.x),cell(boss.z)],true),
        bossDeathOpensExit:boss.dead&&!!exit,
        exitReachable:!!exit && canReach(coal,[cell(exit.x),cell(exit.z)],true)};
    },baseline);
    if(out) await page.screenshot({path:path.join(out,"coal-store.png")});
    assert.equal(chapter.startsAt,baseline?"n":"B");
    assert.equal(chapter.actors.filter(([k])=>k==="n").length,baseline?3:2);
    assert.equal(chapter.actors.filter(([k])=>k==="B").length,baseline?0:1);
    assert(chapter.actors.some(([k,x,z])=>k==="E"&&x===44&&z===6));
    assert(chapter.entranceToKey && chapter.keyPickup && chapter.entranceToCoal &&
      !chapter.lockedRoute && chapter.throughLockedDoor && chapter.bossDeathOpensExit &&
      chapter.exitReachable,JSON.stringify(chapter));

    if(!baseline) {
      await setup("B",true);
      const boundaries=await page.evaluate(()=>{
        const q=window.__BLACK_SILENCE_QA, e=window.heavy;
        const maskOK=()=>e.sp.scale.x===e.w&&e.sp.scale.y===e.h;
        tick(); const normal=e.sp.material.map;
        for(let i=0;i<12;i++) tick();
        const canvas=e.sp.material.map.image;
        const pixels=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
        let edge=0;
        for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
          if ((!x || !y || x===canvas.width-1 || y===canvas.height-1) && pixels[4*(y*canvas.width+x)+3]) edge++;
        }
        const near={px:q.C.px,pz:q.C.pz};
        q.C.px+=40; q.enemyStep(1/60);
        const far=q.enemyAnimation(e).slamElapsed===null && maskOK();
        Object.assign(q.C,near);
        e.stun=0;e.slamT=0;q.enemyStep(1/60);e.stagger=2;q.enemyStep(1/60);
        const stagger=q.enemyAnimation(e).staggered && maskOK() && q.enemyAnimation(e).pose==="pain";
        e.stagger=0;e.hurt=0;e.stun=0;e.slamT=0;q.enemyStep(1/60);
        e.flung=.3;e.flungT=0;q.enemyStep(1/60);
        const flight=q.enemyAnimation(e).pose==="airborne"&& maskOK();
        e.flung=0;e.stun=0;e.slamT=0;q.enemyStep(1/60);
        q.damage(e,30,{wIdx:1,leg:true,dir:{x:0,z:1}});
        q.enemyStep(1/60);
        const crawler=e.sever?.legs && maskOK() && e.sp.material.map!==normal;
        return {edge,far,stagger,flight,crawler};
      });
      assert.equal(boundaries.edge,0,"Raised hands clear every edge of the texture");
      assert(boundaries.far&&boundaries.stagger&&boundaries.flight&&boundaries.crawler,
        "Native animation handoff: "+JSON.stringify(boundaries));
    }
    assert.deepEqual(errors,[]);
    if(out) fs.writeFileSync(path.join(out,"result.json"),JSON.stringify({results,chapter},null,2));
    console.log(JSON.stringify(results.map(({key,hit,contact,health})=>({key,hit,contact,health}))));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
