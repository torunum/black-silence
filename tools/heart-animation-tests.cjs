const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {createHash}=require("node:crypto");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");

const [baseline,candidate,proofDirectory]=process.argv.slice(2);
assert(baseline&&candidate,"Usage: node tools/heart-animation-tests.cjs baseline.html candidate.html [proof-dir]");
const out=path.resolve(proofDirectory||".dream-loop/heart-animation-proof");
const anchor="Jk();ju();Yy();X$(J$);D0t();";
const marker="/* HEART_ANIMATION_BEGIN */";
const digest=input=>createHash("sha256").update(input).digest("hex");

function installProbe() {
  let heart, frame=0, randomCalls=0, seed=978414;
  const near=[39.486826640855696,23.486826714390943];
  function random(){randomCalls++;seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  function seeded(action) {
    const original=Math.random;
    Math.random=random;
    try {return action();} finally {Math.random=original;}
  }
  function setup(phase,time) {
    seed=978414;
    return seeded(()=>{
    rp(8); Fd(); V5(true);
    heart=v.enemies.find(enemy=>enemy.key==="G");
    assertFixture(heart&&heart.dormant,"Native Living Heart not found");
    bk(heart); stt(v.cine.dur+1/60);
    for (const other of v.enemies) if(other!==heart) {
      other.stun=999;
    }
    if(phase===3) {
      heart.phase=2;
      heart.hp=heart.maxhp*.30;
    } else if(phase===2) {
      heart.phase=2;
      heart.hp=heart.maxhp*.55;
    }
    heart.tpT=100; heart.sumT=100; heart.ringT=100; heart.debT=100;
    heart.atkT=time; heart.aware=true; heart.cool=100;
    assertFixture(lm(heart.x,heart.z,...near),"Native camera has no direct line of sight");
    place(...near);
    Object.assign(T,{hp:100,armor:25,dead:false,won:false});
    for(const id of ["fx2d","hud","cross","minimap","automap","lvltitle","bossbar","toasts","keys",
      "pause","msg","execPrompt","subt","tip","hint","bossTitle"]) {
      document.getElementById(id)?.style.setProperty("visibility","hidden");
    }
    frame=0;randomCalls=0;
    return snapshot();
    });
  }
  function assertFixture(condition,message){if(!condition)throw Error(message);}
  function place(px,pz) {
    assertFixture(!fu(px,pz),`Camera is blocked at ${px},${pz}`);
    Object.assign(C,{px,pz,pyy:ie(px,pz)+Yo,vx:0,vz:0,vy:0,grounded:true,spawnGuard:0});
    Ct.yaw=Math.atan2(heart.x-px,heart.z-pz)+Math.PI;
    Ct.pitch=Math.atan2(heart.h*.5+heart.fy-C.pyy,Math.hypot(heart.x-px,heart.z-pz));
    window.__BLACK_SILENCE_QA.setCamera();
  }
  function chamberPoint(visible) {
    for(let z=30.75;z>=11.25;z-=.5) for(let x=12.75;x<=47.25;x+=.5) {
      const range=Math.hypot(x-heart.x,z-heart.z);
      if(visible ? range<24||range>26 : range<5||range>=21) continue;
      if(!fu(x,z)&&lm(heart.x,heart.z,x,z)===visible) return [x,z,range];
    }
    throw Error(`No authored Womb site with visibility ${visible}`);
  }
  function mapKey() {
    for(const [name,value] of wk(heart).frames) if(value===heart.sp.material.map)return name;
    return null;
  }
  function snapshot() {
    return {frame,pose:mapKey(),
      logic:{
        x:heart.x,z:heart.z,h:heart.h,w:heart.w,hp:heart.hp,phase:heart.phase,
        cool:heart.cool,atkT:heart.atkT,atkAnim:heart.atkAnim,hurt:heart.hurt,stun:heart.stun,
        playerHP:T.hp,armor:T.armor,doorOpen:Object.values(v.doors).filter(door=>door.open).length,
        camera:[C.px,C.pyy,C.pz,Ct.yaw,Ct.pitch],randomCalls,
        orbs:hA.orbs.map(({m,vx,vy,vz,dmg,life})=>[m.position.x,m.position.y,m.position.z,vx,vy,vz,dmg,life]),
      },
      view:{color:heart.sp.material.color.getHex(),scale:heart.sp.scale.toArray(),rotation:heart.sp.material.rotation,
        cacheSize:wk(heart).frames.size,visible:heart.sp.visible}
    };
  }
  function step({orbs=false,hurtAt=0}={}) {
    return seeded(()=>{
      frame++;
      if(frame===hurtAt)qr(heart,6,{wIdx:0});
      qtt(1/60);
      if(orbs)htt(1/60);
      return snapshot();
    });
  }
  function recall(caseName) {
    setup(2,.46);
    const far=caseName==="range";
    const settled=far?74:28;
    const previous=Array.from({length:settled},()=>step({orbs:far})).at(-1);
    const cast=new Set(hA.orbs);
    const [x,z,distance]=chamberPoint(far);
    place(x,z);
    const outside=Array.from({length:5},()=>step());
    const extraOutside=hA.orbs.filter(orb=>!cast.has(orb)).length;
    place(...near);
    const reentry=step();
    return {site:[x,z],distance,visible:far,previous,outside,reentry,
      extraOutside,extraOrbs:hA.orbs.filter(orb=>!cast.has(orb)).length};
  }
  function dimensions() {
    const cache=wk(heart),results=[];
    for (const [action,index] of [["idle",0],["atk",0],["atk",1],["atk",2]]) {
      const image=cache.tex(action,index,0).image;
      const {width,height}=image;
      const alpha=image.getContext("2d").getImageData(0,0,width,height).data;
      let minX=width,minY=height,maxX=-1,maxY=-1,count=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(alpha[(y*width+x)*4+3]){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;
      }
      results.push({action,index,width,height,bounds:[minX,minY,maxX,maxY],count});
    }
    return results;
  }
  window.heartProbe={setup,snapshot,step,dimensions,recall,steps(count,options){return Array.from({length:count},()=>step(options));}};
}

async function run() {
  fs.mkdirSync(out,{recursive:true});
  const sources=[["before",baseline],["after",candidate]].map(([branch,filename])=>{
    const bytes=fs.readFileSync(filename),src=bytes.toString("utf8");
    assert.equal(src.split(anchor).length,2,`Unrecognized ${branch} startup`);
    assert(src.split(marker).length<=2 && (branch==="before" || src.includes(marker)),`Unexpected Heart module in ${branch}`);
    return {branch,src,sha:digest(bytes)};
  });
  const browser=await chromium.launch({channel:"chrome",headless:true});
  const errors=[],variants=[];
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-heart-"));
  const file=path.join(temp,"game.html");
  try {
    for (const {branch,src,sha} of sources) {
      fs.writeFileSync(file,src.replace(anchor,()=>`(${installProbe.toString()})();\n${anchor}`));
      const context=await browser.newContext({viewport:{width:1280,height:720},offline:true});
      try {
        const page=await context.newPage();
        page.on("pageerror",err=>errors.push(err.message));
        const invoke=(method,...args)=>page.evaluate(([method,args])=>heartProbe[method](...args),[method,args]);
        const capture=async name=>{
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          await page.screenshot({path:path.join(out,`${branch}-${name}.png`)});
        };
        await page.goto(pathToFileURL(file).href+"?qa=1");
        await page.locator("#mNew").click();
        await page.waitForFunction(()=>__BLACK_SILENCE_QA.Be.started&&!__BLACK_SILENCE_QA.Be.inputLock,null,{timeout:60000});
        const cycles=[];
        for(const phase of [2,1,3]){
          await invoke("setup",phase,.46);
          const initial=await invoke("steps",1);
          if(phase===2)await capture("rest");
          const first=await invoke("steps",20);
          if(phase===2)await capture("windup");
          const near=await invoke("steps",7);
          if(phase===2)await capture("release");
          const recovery=await invoke("steps",12, {orbs:true});
          if(phase===2)await capture("settle");
          const later=await invoke("steps",228,{orbs:true,hurtAt:80});
          const snapshots=[...initial,...first,...near,...recovery,...later];
          assert(snapshots.every(sample=>sample.logic.phase===phase),"Wrong Heart phase");
          const release=snapshots.find(sample=>sample.logic.orbs.length);
          assert.equal(release.logic.orbs.length,{1:1,2:5,3:3}[phase]);
          assert.equal(release.frame,28);
          const releases=snapshots.filter((sample,index)=>index&&sample.logic.atkT>snapshots[index-1].logic.atkT);
          assert.equal(releases.length,2,"Each phase must complete a second native volley");
          const dimensions=await invoke("dimensions");
          assert(dimensions.every(frame=>frame.count>150));
          cycles.push({phase,release:release.frame,orbs:release.logic.orbs.length,snapshots,dimensions,releases});
        }
        await invoke("setup",2,.46);
        const simultaneousHurt=await invoke("steps",60,{hurtAt:26,orbs:true});
        const range=await invoke("recall","range");
        const cover=await invoke("recall","cover");
        variants.push({branch,sha,cycles,simultaneousHurt,range,cover});
      } finally {await context.close();}
    }
    assert.deepEqual(errors,[]);
    const [before,after]=variants;
    for(let i=0;i<before.cycles.length;i++) {
        const original=before.cycles[i],recent=after.cycles[i];
        assert.deepEqual(recent.snapshots.map(s=>s.logic),original.snapshots.map(s=>s.logic),`Gameplay parity, phase ${original.phase}`);
        assert.deepEqual(recent.snapshots.map(s=>[s.view.color,s.view.scale,s.view.rotation]),
          original.snapshots.map(s=>[s.view.color,s.view.scale,s.view.rotation]),`Presentation channels, phase ${original.phase}`);
        assert.deepEqual(recent.dimensions.map(({width,height})=>[width,height]),
          original.dimensions.map(({width,height})=>[width,height]),`Atlas unchanged, phase ${recent.phase}`);
        assert.match(recent.snapshots[0].pose,/^(idle|walk)/);
        assert.equal(recent.snapshots[20].pose,"atk0:0");
        assert.equal(recent.snapshots[27].pose,"atk1:0");
        assert.equal(recent.snapshots[39].pose,"atk2:0");
        assert.match(recent.snapshots[65].pose,/^(idle|walk)/);
        assert.equal(recent.snapshots[79].pose,original.snapshots[79].pose);
        assert(recent.releases.every(({pose})=>pose==="atk1:0"),"Both volleys visibly release");
    }
    assert.deepEqual(after.simultaneousHurt.map(s=>s.logic),before.simultaneousHurt.map(s=>s.logic));
    assert.equal(after.simultaneousHurt[27].pose,before.simultaneousHurt[27].pose);
    assert.match(after.simultaneousHurt[27].pose,/^pain/,"Pain owns the pose even at projectile emission");
    const parity=({site,distance,visible,previous,outside,reentry,extraOutside,extraOrbs})=>({site,distance,visible,
      previous:previous.logic,outside:outside.map(sample=>sample.logic),reentry:reentry.logic,extraOutside,extraOrbs});
    for (const section of ["range","cover"]) {
      assert.deepEqual(parity(after[section]),parity(before[section]),`Sight handoff keeps gameplay ${section}`);
      assert.equal(after[section].extraOrbs,0,`No new projectile ${section}`);
      assert(after[section].outside.every(sample=>sample.logic.atkT===after[section].previous.logic.atkT),
        `Native caster timer pauses out of sight ${section}`);
      assert(after[section].outside.every(sample=>/^(idle|walk)/.test(sample.pose)),`No stale pose ${section}`);
      assert.match(after[section].reentry.pose,/^(idle|walk)/,`No resumed stale pose ${section}`);
    }
    const handoff=({site,distance,visible,previous,outside,reentry,extraOutside,extraOrbs})=>({site,distance,visible,
      previous:previous.pose,outside:outside.map(sample=>sample.pose),reentry:reentry.pose,extraOutside,extraOrbs});
    const summary=variants.map(({branch,sha,cycles,simultaneousHurt,range,cover})=>({branch,sha,hurtDuringRelease:simultaneousHurt[27].pose,
      sightHandoff:{range:handoff(range),cover:handoff(cover)},
      cycles:cycles.map(({phase,release,orbs,snapshots,dimensions,releases})=>({
      phase,release,orbs,steps:snapshots.length,rest:snapshots[0].pose,windup:snapshots[20].pose,
      releases:releases.map(({frame,pose})=>({frame,pose})),
      firing:snapshots[27].pose,settle:snapshots[39].pose,post:snapshots[65].pose,
      pain:snapshots[79].pose,final:snapshots.at(-1).pose,
      rngCalls:snapshots.at(-1).logic.randomCalls,
      cacheSize:snapshots.at(-1).view.cacheSize,
      dimensions,
    }))}));
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify({passed:true,summary,errors},null,2)+"\n");
    console.log("PASS Living Heart",JSON.stringify(summary.map(({branch,sha,cycles})=>({branch,sha,
      phases:cycles.map(({phase,steps,releases})=>({phase,steps,releases}))}))));
  } finally {
    await browser.close();
    if(fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
  }
}

run().catch(err=>{console.error(err);process.exitCode=1;});
