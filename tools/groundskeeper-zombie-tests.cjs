// node tools/groundskeeper-zombie-tests.cjs game.html before.html [proof-dir]
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

const startup = "Jk();ju();Yy();X$(J$);D0t();";
const marker = "/* GROUNDSKEEPER_ZOMBIE_BEGIN */";
const before = fs.readFileSync(process.argv[3],"utf8");
const after = fs.readFileSync(process.argv[2],"utf8");
const proof = process.argv[4];
assert(after.includes(marker) && !before.includes(marker));

function installProbe() {
  let actor;
  function place(px,pz,ax,az,pitch=0) {
    Object.assign(C,{px,pz,pyy:ie(px,pz)+Yo,vx:0,vy:0,vz:0,grounded:true,spawnGuard:0});
    Ct.yaw=Math.atan2(ax-px,az-pz)+Math.PI;
    Ct.pitch=pitch;
    window.__BLACK_SILENCE_QA.setCamera();
  }
  function encounter(distance,offset,stagger) {
    const q=window.__BLACK_SILENCE_QA;
    q.resetCombat();q.pause(true);
    v.cine=null;
    for (const enemy of v.enemies) J.scene.remove(enemy.sp,enemy.blob);
    v.enemies=[];
    place(19+offset,12.5-distance,19,12.5,stagger?-.08:0);
    Object.assign(T,{hp:100,armor:0,dead:false,won:false});
    let seed=821;
    Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    actor=q.spawn("z",19,12.5,true);
    Object.assign(actor,{aware:true,flank:0,dormant:false,cool:.28,stun:0,stagger:stagger?4.6:0,
      staggerTried:true,hp:stagger?10:actor.maxhp});
    for (const id of ["fx2d","hud","cross","minimap","automap","lvltitle","bossbar","toasts",
      "keys","pause","msg","execPrompt","subt","tip","hint"]) document.getElementById(id)?.style.setProperty("visibility","hidden");
    return {hp:actor.maxhp,reach:actor.mel,height:actor.h,width:actor.w,speed:actor.speed};
  }
  function frame() {
    for (const [name,texture] of wk(actor).frames) {
      if (texture===actor.sp.material.map) return name;
    }
    return null;
  }
  function state() {
    return [frame(),actor.x,actor.z,actor.hp,T.hp,actor.atkAnim||0,actor.stagger||0,actor.dead];
  }
  function bounds(texture) {
    const canvas=texture.image,{width,height}=canvas;
    const bytes=canvas.getContext("2d").getImageData(0,0,width,height).data;
    let left=width,top=height,right=-1,bottom=-1,count=0;
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      if (!bytes[(y*width+x)*4+3]) continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
    }
    return [left,top,right,bottom,count];
  }
  window.groundskeeperProbe={
    encounter,state,
    hold(){actor.stun=1;qtt(1/60);actor.stun=0;},
    tick(){qtt(1/60);return state();},
    animate(count){return Array.from({length:count},()=>groundskeeperProbe.tick());},
    cache(){
      const baked=wk(actor),rig=baked.rig,parts=Object.keys(rig.partSpecs);
      const select=()=>[baked.tex("idle",0,0),baked.tex("walk",2,0,true),baked.tex("idle",0,XA,true),
        baked.tex("atk",1,0),baked.tex("pain",1,0,true),baked.tex("die",3,0),
        baked.tex("crawl",2,wc,true),...parts.map(part=>baked.part(part).tex)];
      const measurements=()=>[baked.frames.size,baked.bitmaps.size,baked.baked];
      const textures=select();
      const counts=measurements(),versions=textures.map(texture=>texture.version);
      for (let i=0;i<80;i++) select();
      return {counts,stable:counts.every((n,i)=>n===measurements()[i])&&textures.every((t,i)=>t.version===versions[i]),
        dimensions:[rig.frame.w,rig.frame.h],walkStep:rig.walkStep,poses:Object.keys(rig.poses),parts,
        detachedSize:textures.slice(-parts.length).map(tex=>[tex.image.width,tex.image.height]),
        bounds:textures.map(bounds),colors:[...new Set(textures.map(tex=>tex.colorSpace))],
        unrelated:[Ze.s.a.colorSpace,Ze.t.a.colorSpace,Ze.m.a.colorSpace]};
    },
  };
}

async function run() {
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-zombie-"));
  const file=path.join(scratch,"game.html");
  const browser=await chromium.launch({channel:"chrome"});
  const errors=[],results=[];
  try {
    if(proof) fs.mkdirSync(proof,{recursive:true});
    for (const [branch,html] of [["before",before],["after",after]]) {
      assert.equal(html.split(startup).length,2);
      fs.writeFileSync(file,html.replace(startup,()=>`(${installProbe.toString()})();\n${startup}`));
      const context=await browser.newContext({viewport:{width:1280,height:720},offline:true});
      try {
        const page=await context.newPage();
        page.on("pageerror",error=>errors.push(error.message));
        const call=(name,...args)=>page.evaluate(([name,args])=>groundskeeperProbe[name](...args),[name,args]);
        await page.goto(pathToFileURL(file).href+"?qa=1");
        await page.locator("#mNew").click();
        await page.waitForFunction(()=>__BLACK_SILENCE_QA.Be.started&&!__BLACK_SILENCE_QA.Be.inputLock,null,{timeout:60000});

        const capture=async label=>{
          if (!proof) return;
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          await page.screenshot({path:path.join(proof,`${branch}-${label}.png`)});
        };
        const spawn=await call("encounter",3.5,0,false);
        await call("hold");
        await capture("front");
        await call("encounter",2.34,.66,false);
        await call("hold");
        await capture("close");
        await call("encounter",1.9,-.36,true);
        const stagger=await call("tick");
        await capture("stagger");

        await call("encounter",3.5,0,false);
        const trace=await call("animate",150);
        assert(trace.some(([name])=>name?.startsWith("walk")),"Expected native walk frames");
        assert(trace.some(([name])=>name?.startsWith("atk")),"Expected native attack frames");
        const hit=trace.findIndex(([, , , ,hp])=>hp<100);
        assert(hit>=0,"Expected native melee contact");
        if(proof) {
          await call("encounter",3.5,0,false);
          const attack=await call("animate",hit+3);
          assert(attack.at(-1)[0]?.startsWith("atk"),"Expected an attack pose at contact");
          await capture("attack");
        }
        const cache=await call("cache");
        assert(cache.stable&&cache.bounds.every(bounds=>bounds[4]>15));
        assert.deepEqual(cache.dimensions,[72,100]);
        if (branch==="after") {
          assert.deepEqual(cache.colors,["srgb"]);
          assert(cache.bounds[0][1]>=1,"Original standing frame leaves room above the hairline");
        }
        results.push({branch,htmlSHA256:crypto.createHash("sha256").update(html).digest("hex"),
          spawn,stagger,trace,contactTick:hit+1,cache});
      } finally {await context.close();}
    }
    const [base,candidate]=results;
    for (const property of ["spawn","stagger","trace","contactTick"]) assert.deepEqual(candidate[property],base[property],property);
    for (const property of ["counts","dimensions","walkStep","poses","parts","unrelated"])
      assert.deepEqual(candidate.cache[property],base.cache[property],property);
    // The renderer crops detached pieces to their visible bounds at the same
    // resolution. Bound the silhouette's effect on their four cache entries.
    const detachedBytes=build=>build.cache.detachedSize.reduce((sum,[width,height])=>sum+width*height*4,0);
    assert(detachedBytes(candidate)-detachedBytes(base)<=1536,"Detached clothing remains a small alpha crop");
    assert.deepEqual(errors,[]);
    const compact=results.map(({trace,...rest})=>({...rest,decisionTicks:trace.length,
      distinctPoseFrames:[...new Set(trace.map(([name])=>name))],minimumPlayerHP:Math.min(...trace.map(row=>row[4]))}));
    const result={passed:true,builds:compact,errors};
    if(proof) fs.writeFileSync(path.join(proof,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log("PASS Groundskeeper Zombie",JSON.stringify({contactTick:candidate.contactTick,
      ticks:candidate.trace.length,atlas:candidate.cache.dimensions,cache:candidate.cache.counts,bounds:candidate.cache.bounds[0]}));
  } finally {await browser.close();fs.unlinkSync(file);fs.rmdirSync(scratch);}
}

run().catch(error=>{console.error(error);process.exitCode=1;});
