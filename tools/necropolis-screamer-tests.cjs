// The existing enemy lifecycle gets the same inputs in both builds. The live
// proof uses the game's own actor tick and shows the loaded 68x97 rig in-world.
// node tools/necropolis-screamer-tests.cjs new.html previous.html [proof-dir]
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const init="Jk();ju();Yy();X$(J$);D0t();";
const marker="/* NECROPOLIS_SCREAMER_BEGIN */";
const input=fs.readFileSync(process.argv[2]||"THE-BLACK-SILENCE.html","utf8");
const old=fs.readFileSync(process.argv[3],"utf8");
assert(input.includes(marker)&&!old.includes(marker));
const proof=process.argv[4];
const sha=text=>crypto.createHash("sha256").update(text,"utf8").digest("hex");

function install() {
  let actor, ally, tick=0, release=0;
  function position(x,z,tx,tz,h) {
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;
    Ct.pitch=Math.atan2(h-C.pyy,Math.hypot(tx-x,tz-z));
  }
  function locate(){
    const random=Math.random;
    Math.random=()=>.5;
    try {rp(3);} finally {Math.random=random;}
    sk();if(v.bossRef?.dormant)bk(v.bossRef);if(v.cine)stt(v.cine.dur+.1);
    Be.inputLock=false;C.spawnGuard=100;
    for(const id of ["lvltitle","subt","msg","bossbar","bossTitle","pause"])Jt(id).style.visibility="hidden";
    for(const e of v.enemies)e.stun=100;
    actor=v.enemies.find(e=>e.key==="s"&&e.x===67&&e.z===57);
    ally=v.enemies.find(e=>e.key==="z"&&e.x===73&&e.z===51);
    if(!actor||!ally)throw Error("Missing native Necropolis encounter");
    position(67,61.46,67,57,1.02);
    V5(false);
  }
  function isolate() {
    for(const e of v.enemies)if(e!==actor&&e!==ally)J.scene.remove(e.sp,e.blob);
    v.enemies=[actor,ally];
    for(const e of v.enemies)Object.assign(e,{aware:true,flank:0,stun:0,dormant:false,cool:.32});
    actor.screamT=.45;
    C.spawnGuard=0;T.hp=100;T.armor=0;
    Math.random=()=>.5;tick=0;release=0;
  }
  function poseName(){
    const tex=actor.sp.material.map;
    for(const [name,value] of wk(actor).frames)if(value===tex)return name;
    return null;
  }
  function state(){
    return {tick,release,frame:poseName(),screamT:actor.screamT,stun:actor.stun,allyFrenzy:ally.frenzy||0,
      playerHP:T.hp,actorHP:actor.hp,position:[actor.x,actor.z],ready:Be.started&&!Be.inputLock};
  }
  function bounds(texture){
    const source=texture.image,{width,height}=source;
    const bytes=source.getContext("2d").getImageData(0,0,width,height).data;
    let left=width,right=-1,top=height,bottom=-1,count=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(bytes[(y*width+x)*4+3]){
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
    }
    return {width,height,left,right,top,bottom,count};
  }
  window.screamerProbe={
    locate,state,
    clean(){ER().canvas.style.visibility="hidden";for(const id of ["hud","minimap","cross"])Jt(id).style.visibility="hidden";},
    angle(which){if(which==="oblique")position(68.84,61.36,67,57,.95);else position(67,61.46,67,57,1.02);},
    stableEncounter(){locate();V5(true);isolate();return {hp:actor.maxhp,w:actor.w,h:actor.h,speed:actor.speed,movement:actor.mel,walkStep:wk(actor).rig.walkStep};},
    tick(){const before=actor.screamT;qtt(1/60);tick++;if(!release&&before<1&&actor.screamT>=8.9)release=tick;return state();},
    liveEncounter(){locate();isolate();V5(false);},
    cache(){
      const baked=wk(actor),group=baked.rig;
      const names=Object.keys(group.partSpecs);
      const samples=[...baked.all(),baked.tex("idle",0,0),baked.tex("idle",0,0,true),
        baked.tex("walk",4,0),baked.tex("atk",1,0),baked.tex("die",3,0),baked.tex("pain",0,0,true),
        baked.tex("walk",0,wc,true),baked.tex("idle",0,2,true),...names.map(k=>baked.part(k).tex)];
      const versions=samples.map(texture=>texture.version),before=[baked.frames.size,baked.bitmaps.size,baked.baked];
      for(let i=0;i<100;i++){baked.tex("idle",0,0,true);baked.tex("walk",0,wc,true);baked.tex("idle",0,2,true);for(const k of names)baked.part(k);}
      const after=[baked.frames.size,baked.bitmaps.size,baked.baked];
      return {colors:[...new Set(samples.map(t=>t.colorSpace))],before,after,
        stable:samples.every((t,i)=>versions[i]===t.version),dims:[group.frame.w,group.frame.h],
        poses:Object.keys(group.poses),parts:names,rest:bounds(baked.tex("idle",0,0)),
        attack:bounds(baked.tex("atk",1,0)),unrelated:[Ze.z.a.colorSpace,Ze.t.a.colorSpace,Ze.g.a.colorSpace]};
    }
  };
}

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-screamer-"));
  const file=path.join(dir,"game.html");
  const browser=await chromium.launch({channel:"chrome"});
  const errors=[],results=[];
  try {
    if(proof)fs.mkdirSync(proof,{recursive:true});
    for(const [branch,source] of [["before",old],["after",input]]){
      fs.writeFileSync(file,source.replace(init,()=>"("+install.toString()+")();\n"+init));
      const context=await browser.newContext({viewport:{width:1280,height:720},offline:true});
      try{
        const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
        await page.addInitScript(()=>{let seed=4807;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);});
        const call=(name,...args)=>page.evaluate(([name,args])=>screamerProbe[name](...args),[name,args]);
        await page.goto(pathToFileURL(file).href+"?qa=1");await page.locator("#mNew").click();
        await page.waitForFunction(()=>__BLACK_SILENCE_QA.Be.started&&!__BLACK_SILENCE_QA.Be.inputLock,null,{timeout:60000});
        await call("locate");await call("clean");
        if(proof)for(const angle of ["front","oblique"]){
          await call("angle",angle);await page.waitForTimeout(580);
          await page.screenshot({path:path.join(proof,`${branch}-${angle}.png`)});
        }
        const spawn=await call("stableEncounter");const cache=await call("cache");
        assert(cache.stable&&cache.rest.count>30&&cache.attack.count>30);
        assert.deepEqual(cache.before,cache.after);
        assert.deepEqual(cache.dims,[68,97]);
        console.log(branch,JSON.stringify({rest:cache.rest,attack:cache.attack,cache:cache.after}));
        if(branch==="after"){
          assert.deepEqual(cache.colors,["srgb"]);
          assert(cache.rest.top>=1,"The hood crown stays below the top of the existing frame");
        }
        const trace=await page.evaluate(()=>Array.from({length:110},()=>screamerProbe.tick()));
        const release=trace.find(frame=>frame.release>0);
        assert(release&&release.allyFrenzy===5&&release.screamT===9,"Expected native call to nearby enemy");
        assert(trace.some(f=>f.frame?.startsWith("walk"))&&trace.some(f=>f.frame?.startsWith("atk")));
        let actual=null;
        if(proof){
          await call("liveEncounter");
          await page.waitForFunction(()=>screamerProbe.state().frame?.startsWith("atk1:"),null,{timeout:9000});
          actual=await call("state");
          await page.screenshot({path:path.join(proof,`${branch}-call.png`)});
        }
        results.push({branch,htmlSHA256:sha(source),spawn,cache,release,trace,actual});
      }finally{await context.close();}
    }
    const [before,after]=results;
    assert.deepEqual(after.trace,before.trace);
    assert.deepEqual(after.spawn,before.spawn);
    for(const matching of ["before","after","dims","poses","parts","unrelated"])assert.deepEqual(after.cache[matching],before.cache[matching]);
    assert.deepEqual(errors,[]);
    const report={passed:true,files:results,errors};
    if(proof)fs.writeFileSync(path.join(proof,"verification.json"),JSON.stringify(report,null,2)+"\n");
    console.log("PASS Screamer 110 native logic ticks, original atlas/cache slots and ally call",JSON.stringify({release:after.release.tick,bounds:[after.cache.rest,after.cache.attack],cache:after.cache.after}));
  } finally {await browser.close();fs.unlinkSync(file);fs.rmdirSync(dir);}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
