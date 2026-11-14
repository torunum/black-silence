const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const {PNG} = require("pngjs");

const game = path.resolve(process.env.GAME_HTML || path.join(__dirname,"../THE-BLACK-SILENCE.html"));
const proof = process.env.CREATURE_PROOF;
const before = process.env.BASELINE === "1";
const init = "Jk();ju();Yy();X$(J$);D0t();";

function installProbe() {
  window.gaol = {
    load() {
      rp(1); sk();
      if (v.cine) stt(v.cine.dur+.1);
      Be.started=true; Be.inputLock=false; V5(true);
      for (const id of ["pause","bossbar","bossTitle","lvltitle","subt","msg"]) {
        const el=Jt(id); if (el) el.style.visibility="hidden";
      }
      for (const actor of v.enemies) actor.dormant=true;
    },
    camera(x,z,tx,tz,targetY) {
      C.px=x; C.pz=z; C.pyy=ie(x,z)+Yo;
      C.vx=C.vy=C.vz=0; C.grounded=true;
      Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;
      Ct.pitch=Math.atan2(targetY-C.pyy,Math.hypot(tx-x,tz-z));
      J.camera.position.set(x,C.pyy,z);
      J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
      J.camera.updateMatrixWorld(true); if(v.zones) TR(0,true);
    },
    view() { this.camera(24,40.8,34.5,43.2,1.85); },
    settleLight() {
      V5(false);
      for(let i=0;i<48;i++) m_(1/60);
      V5(true);
    },
    encounter(key) {
      this.load();
      const actor=v.enemies.find(e=>e.key===key && e.z>=37 && e.x<32);
      if (!actor) throw Error("No key ward spawn for "+key);
      this.actor=actor; this.frame=0; this.release=0;
      for (const other of v.enemies) if(other!==actor) J.scene.remove(other.sp,other.blob);
      v.enemies=[actor];
      const distance=key==="t"?6.2:5.1;
      // Both actors remain at their authored map positions. Find a connected
      // spot on the same floor so the real AI can see and approach the player.
      let spot;
      for(let n=0;n<60;n++) {
        const a=Math.PI*n/30, x=actor.x+Math.sin(a)*distance, z=actor.z+Math.cos(a)*distance;
        if (!d0(x,z) && lm(x,z,actor.x,actor.z) && ie(x,z)===actor.fy) {spot=[x,z];break;}
      }
      if (!spot) throw Error("No reachable encounter position");
      this.camera(...spot,actor.x,actor.z,actor.h*.52+actor.fy);
      this.settleLight();
      C.spawnGuard=0; T.hp=100; T.armor=0;
      Object.assign(actor,{dormant:false,aware:true,cool:.52,lungeT:.35,stun:0,flank:0});
      Math.random=()=>.5;
      return {key,x:actor.x,z:actor.z,size:[actor.w,actor.h],hp:actor.maxhp};
    },
    state() {
      const actor=this.actor, texture=actor.sp.material.map;
      const pose=Array.from(wk(actor).frames).find(([,entry])=>entry===texture)?.[0];
      return {pose,frame:this.frame,spaces:texture.colorSpace,orbs:hA.orbs.length,
        release:this.release,playerHP:T.hp,actorHP:actor.hp,x:actor.x,z:actor.z};
    },
    step() {
      const oldLunge=this.actor.lungeT;
      qtt(1/60); this.frame++;
      if (!this.release && (hA.orbs.length || this.actor.lungeT>oldLunge)) this.release=this.frame;
      return this.state();
    },
    hurt() {
      qr(this.actor,4,{wIdx:0});
      qtt(1/60);
      return this.state();
    },
    cacheCheck(key) {
      const actor=v.enemies.find(e=>e.key===key), rig=wk(actor);
      const samples=[Ze[key].a,Ze[key].b,Ze[key].atkWind,Ze[key].pain0,Ze[key].death4,
        rig.tex("walk",2,2,true),rig.tex("die",4,2,true),rig.tex("crawl",2,wc,true),
        ...Object.keys(rig.rig.partSpecs).map(part=>rig.part(part).tex)];
      const versions=samples.map(s=>s.version), baked=rig.baked;
      for (let n=0;n<100;n++) {
        rig.tex("walk",2,2,true);rig.tex("die",4,2,true);
        for (const part of Object.keys(rig.rig.partSpecs)) rig.part(part);
      }
      return {key,color:[...new Set(samples.map(s=>s.colorSpace))],baked,
        size:[rig.rig.frame.w,rig.rig.frame.h],
        stable:rig.baked===baked && samples.every((s,i)=>s.version===versions[i]),
        unrelated:Ze.z.a.colorSpace};
    }
  };
}

async function main() {
  const html=fs.readFileSync(game,"utf8");
  const patch=process.env.CREATURE_PATCH ? fs.readFileSync(process.env.CREATURE_PATCH,"utf8") : "";
  assert.equal(html.split(init).length,2,"bootstrap seam");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"gaol-creatures-"));
  const fixture=path.join(dir,"game.html");
  fs.writeFileSync(fixture,html.replace(init,()=>patch+";("+installProbe.toString()+")();"+init));
  const browser=await chromium.launch({channel:"chrome"}), errors=[];
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    page.on("pageerror",err=>errors.push(err.message));
    await page.addInitScript(()=>{
      let seed=7801;
      Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    });
    await page.goto(pathToFileURL(fixture).href+"?qa=1");
    await page.locator("#mNew").click();
    await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);
    await page.evaluate(()=>{gaol.load();gaol.view();});
    if (proof) {
      fs.mkdirSync(proof,{recursive:true});
      await page.waitForTimeout(180);
      await page.screenshot({path:path.join(proof,"keyward.png")});
      await page.evaluate(()=>gaol.settleLight());
      await page.waitForTimeout(100);
      await page.screenshot({path:path.join(proof,"lamp-keyward.png")});
    }
    const report={actors:[],errors};
    for (const key of ["t","g"]) {
      const spawn=await page.evaluate(k=>gaol.encounter(k),key);
      const cache=await page.evaluate(k=>gaol.cacheCheck(k),key);
      assert(cache.stable);
      assert.deepEqual(cache.size,key==="t"?[79,104]:[91,58]);
      if (!before) { assert.deepEqual(cache.color,["srgb"]);assert.notEqual(cache.unrelated,"srgb"); }
      const frames=[],seen=new Set(),images=[];
      for(let i=1;i<=100;i++) {
        const f=await page.evaluate(()=>gaol.step());
        const family=f.pose?.replace(/\d+:.*$/,"");
        if (family && !seen.has(family)) {
          seen.add(family);
          if (proof && ["walk","atk"].includes(family)) {
            await page.waitForTimeout(55);
            const snap=await page.screenshot({path:path.join(proof,key+"-"+family+".png")});
            images.push(PNG.sync.read(snap));
          }
        }
        frames.push(f);
      }
      assert(seen.has("walk") && seen.has("atk"),key+" did not move/attack: "+[...seen]);
      assert(frames.at(-1).release>0,"No native release "+key);
      // At tick 100 the hound has reached the viewer. Start the identical
      // encounter again to photograph a real impact at the same viewing range.
      await page.evaluate(k=>gaol.encounter(k),key);
      // A preceding melee encounter may have tinted the HUD. Allow its native
      // callback and CSS fade to finish before recording this new encounter.
      if(proof) await page.waitForTimeout(550);
      await page.evaluate(()=>{ for(let i=0;i<8;i++) gaol.step(); });
      const hurt=await page.evaluate(()=>gaol.hurt());
      assert(hurt.actorHP<spawn.hp && hurt.pose.startsWith("pain"),"Damage pose "+JSON.stringify(hurt));
      const settled=await page.evaluate(()=>{
        let snap=gaol.state();
        while(gaol.actor.flashT>0 && gaol.frame<24) snap=gaol.step();
        return snap;
      });
      assert(settled.pose.startsWith("pain"),"Unexpected pose after impact flash: "+settled.pose);
      if (proof) {
        await page.waitForTimeout(55);
        images.push(PNG.sync.read(await page.screenshot({path:path.join(proof,key+"-hurt.png")})));
        const width=338,height=312,strip=new PNG({width:width*images.length,height});
        images.forEach((image,i)=>PNG.bitblt(image,strip,470,191,width,height,i*width,0));
        fs.writeFileSync(path.join(proof,key+"-encounter.png"),PNG.sync.write(strip));
      }
      report.actors.push({spawn,cache,release:frames.at(-1).release,seen:[...seen],hurt,settled,
        trace:frames.map(({pose,orbs,x,z,playerHP})=>[pose,orbs,x,z,playerHP])});
    }
    assert.deepEqual(errors,[]);
    if(proof) fs.writeFileSync(path.join(proof,"encounters.json"),JSON.stringify(report,null,2));
    console.log(report.actors.map(({spawn,release,seen})=>[spawn.key,release,seen]));
  } finally {
    await browser.close();
    fs.unlinkSync(fixture); fs.rmdirSync(dir);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
