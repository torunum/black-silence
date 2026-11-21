const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const input = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const current = fs.readFileSync(input, "utf8");
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const source = fs.readFileSync(path.join(root, "src/bone-sovereign.js"), "utf8").trim().replace(/\r\n/g, "\n");
const art = fs.readFileSync(path.join(root, "src/bone-sovereign-art.js"), "utf8").trim().replace(/\r\n/g, "\n");
const ownBlock = /\/\* BONE_SOVEREIGN_BEGIN \*\/[\s\S]*?\/\* BONE_SOVEREIGN_END \*\//g;
const artBlock = /\/\* BONE_SOVEREIGN_ART_BEGIN \*\/[\s\S]*?\/\* BONE_SOVEREIGN_ART_END \*\//g;
const blocks = [...current.matchAll(ownBlock)];
assert.ok(blocks.length<=1);
assert.equal(current.split(anchor).length,2);
if(blocks.length){
  assert.equal(blocks[0][0].replace(/\r\n/g,"\n"),source,"Stale embedded Sovereign source");
  assert.equal(current.match(artBlock)?.[0].replace(/\r\n/g,"\n"),art,"Stale embedded Sovereign artwork");
}
const base = current.replace(ownBlock,"").replace(artBlock,"");
const candidate = blocks.length ? current : base.replace(anchor,()=>art+"\n"+source+"\n"+anchor);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(),"sovereign-parity-"));
const sha = text => crypto.createHash("sha256").update(text).digest("hex");

// Probe the normal priest thinker, native projectile integrator and source
// atlas. Gameplay receives identical inputs from the same stock Cathedral.
const probe = `(() => {
  const fire=Qo, orb=ball=>[ball.m.position.toArray(),ball.vx,ball.vy,ball.vz,ball.dmg,ball.life,ball.col];
  let launches=[];
  Qo=function(enemy,...args) {
    const first=hA.orbs.length,result=fire.call(this,enemy,...args);
    if(enemy.key==="Z")launches.push(...hA.orbs.slice(first).map(orb));
    return result;
  };
  window.royalAudit={
    metrics(enemy){
      const fields=["hp","maxhp","phase","x","z","fy","h","w","r","cool","atkT","atkAnim","tpT","sumT",
        "ringT","debT","mel","speed","hurt","stun","dormant","dead","kx","kz","animT","frame","formKey"];
      const atlas=wk(enemy);
      return {
        game:[...fields.map(key=>enemy[key]??null),enemy.sp.position.toArray(),enemy.sp.scale.toArray(),T.hp,T.armor,
          T.kills,T.enemiesTotal,v.rings.length,v.strikes.length,v.enemies.filter(actor=>actor.summoned).length],
        launched:launches.splice(0),live:hA.orbs.map(orb),
        art:[...atlas.frames].find(([,texture])=>texture===enemy.sp.material.map)?.[0]??null
      };
    },
    clear(){for(const ball of hA.orbs)J.scene.remove(ball.m);hA.orbs.length=0;launches.length=0;},
    fly(dt){htt(dt);},
    cache(){return Object.fromEntries(["Z","Z2","U","G"].map(key=>[key,[...Ze[key].rig.frames.keys()].sort()]));},
    geometry(enemy){return enemy.sp.geometry;},
    compareArt(){
      if(typeof boneSovereignFrames==="undefined")return 0;
      let compared=0;
      for(const rig of [vG,QG]){
        const f=rig.frame;
        for(const [action,poses] of Object.entries(rig.poses))for(let i=0;i<Vu(rig,action);i++){
          if(!boneSovereignFrames[rig.key][action+i])continue;
          for(const mirror of [false,true]){
            const p=tz(rig,action,i), actual=X7(rig,p,0,false,mirror);
            const native=l6(rig,p,{mask:0},f.w,f.h,f.w/2+f.shift*f.h/f.worldH,f.h*(p.floor??f.floor),mirror);
            if(actual.w!==native.w || actual.h!==native.h || actual.data.some((v,j)=>v!==native.data[j]))
              throw Error("Stale or invalid precomputed pose "+rig.key+action+i+mirror);
            compared++;
          }
        }
      }
      return compared;
    },
    atlasTimes(now){
      const groups=[];
      for(const [rig,action] of [[vG,"regalCast"],[vG,"regalFan"],[QG,"regalCast"]]){
        if(!rig.poses[action])continue;
        const atlas=new nz(rig), cold=[],warm=[];
        for(const sample of [cold,warm])for(let frame=0;frame<Vu(rig,action);frame++){
          const start=now();atlas.tex(action,frame);sample.push(now()-start);
        }
        for(const texture of atlas.all())texture.dispose();
        groups.push({form:rig.key,action,cold,warm});
      }
      return groups;
    },
  };
})();`;

async function sample(browser,html,name) {
  const file = path.join(scratch,name+".html");
  fs.writeFileSync(file,html.replace(anchor,()=>probe+"\n"+anchor));
  const page = await browser.newPage({offline:true,viewport:{width:960,height:540}});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.goto(pathToFileURL(file).href+"?qa=1",{waitUntil:"domcontentloaded"});
    await page.locator("#mNew").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(()=>__BLACK_SILENCE_QA?.Be.started && __BLACK_SILENCE_QA.paintedGloves.ready());
    const result=await page.evaluate(() => {
      const q=__BLACK_SILENCE_QA,a=royalAudit, realNow=performance.now.bind(performance),nativeRandom=Math.random;
      let seed=1984,rng=0,clock=10500;
      Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;rng++;return seed/2**32;};
      try {
        q.load(7);q.pause(true);q.Be.inputLock=false;q.v.cine=null;
        const boss=q.v.enemies.find(e=>e.key==="Z"), guardian=q.v.enemies.find(e=>e.key==="U");
        const originalForm=a.geometry(boss), guardianGeometry=a.geometry(guardian), initial=a.cache();
        for(const actor of q.v.enemies)if(actor!==boss)q.J.scene.remove(actor.sp,actor.blob);
        q.v.enemies=[boss];
        const origin={x:boss.x,z:boss.z}, phases=[],casts=[];
        performance.now=()=>clock;
        const step=()=>{clock+=12.5;q.enemyStep(.0125);a.fly(.0125);};
        for(const [i,hp] of [2400,1320,640].entries()){
          a.clear();q.resetCombat();
          Object.assign(q.C,{px:origin.x,pz:origin.z+6.4,pyy:q.floor(origin.x,origin.z+6.4)+q.eyeHeight,
            vx:0,vy:0,vz:0,spawnGuard:0,grounded:true});
          Object.assign(q.T,{hp:100,armor:0,dead:false,won:false});
          Object.assign(boss,{...origin,hp,kx:0,kz:0,dormant:false,aware:true,stun:0,hurt:0,
            tpT:99,sumT:99,ringT:99,debT:99,cool:99,atkT:99,atkAnim:0});
          step(); // Phase changes, form changes and teleport side effects are native.
          const frames=[];
          for(let cycle=0;cycle<2;cycle++){
            Object.assign(boss,{...origin,atkT:.506});
            // Retain atkAnim between cycles: it stays latched in actual priest AI.
            for(let j=0;j<80;j++){
              const t=realNow();step();const elapsed=realNow()-t;
              const result=a.metrics(boss);
              if(result.art?.startsWith("regal"))casts.push({i,cycle,ms:elapsed,art:result.art});
              frames.push({...result,rng,cycle});
            }
          }
          phases.push(frames);
        }
        const finalForm=a.geometry(boss),beforeReload=a.cache(),scene=q.J.scene;
        q.load(6);
        const left=!q.v.enemies.includes(boss)&&q.J.scene!==scene&&!q.J.scene.children.includes(boss.sp);
        q.load(7);
        const restored=q.v.enemies.find(e=>e.key==="Z"),plain=q.v.enemies.find(e=>e.key==="U");
        const lifecycle={left,fresh:restored!==boss,one:q.v.enemies.filter(e=>e.key==="Z").length,
          reuse:a.geometry(restored)===originalForm,guardUnchanged:a.geometry(plain)===guardianGeometry,
          finalPadded:finalForm!==guardianGeometry,initialPadded:originalForm!==guardianGeometry,phase:restored.phase};
        return {phases,caches:{initial,beforeReload,afterReload:a.cache()},lifecycle,casts,pixels:a.compareArt(),
          atlasTimes:a.atlasTimes(realNow)};
      } finally{performance.now=realNow;Math.random=nativeRandom;}
    });
    assert.deepEqual(errors,[]);
    return result;
  }finally{await page.close();}
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try{
    const before=await sample(browser,base,"stock"),after=await sample(browser,candidate,"candidate");
    const releases=[],timing=[];
    for(const [i,frames] of after.phases.entries()){
      const gameplay=({game,launched,live,rng})=>({game,launched,live,rng});
      assert.deepEqual(frames.map(gameplay),before.phases[i].map(gameplay),"phase "+(i+1)+" native mismatch");
      const name=i===1?"regalFan":"regalCast";
      for(let cycle=0;cycle<2;cycle++){
        const pass=frames.filter(e=>e.cycle===cycle);
        const shot=pass.findIndex(e=>e.launched.length);
        assert.equal(shot,40);assert.equal(pass[shot].launched.length,[1,5,3][i]);
        const keys=pass.map(e=>e.art).filter((k,n,all)=>k!==all[n-1] && k?.startsWith(name));
        assert.deepEqual(keys,[0,1,2,3,4,5].map(f=>name+f+":0"));
        assert.equal(pass[shot].art,name+"3:0");
        assert.match(pass[shot+28].art,/^(idle|walk)/);
        releases.push({phase:i+1,cycle:cycle+1,sample:shot+1,orbs:pass[shot].launched.length,
          recovered:pass[shot+28].art});
      }
      for(const cycle of [0,1]){
        const seen=new Set(),ms=after.casts.filter(f=>f.i===i&&f.cycle===cycle&&!seen.has(f.art)&&seen.add(f.art))
          .map(f=>f.ms).sort((a,b)=>a-b);
        timing.push({phase:i+1,cycle:cycle+1,firstPoseMedianMs:ms[(ms.length/2)|0],maxMs:ms.at(-1)});
      }
    }
    for(const key of ["U","G"])assert.deepEqual(after.caches.beforeReload[key],before.caches.beforeReload[key]);
    assert.deepEqual(after.lifecycle,{left:true,fresh:true,one:1,reuse:true,guardUnchanged:true,
      finalPadded:true,initialPadded:true,phase:1});
    for(const key of ["Z","Z2"])assert.deepEqual(after.caches.afterReload[key],after.caches.beforeReload[key]);
    assert.equal(after.pixels,104);
    console.log(JSON.stringify({passed:true,embedded:!!blocks.length,base:sha(base),candidate:sha(candidate),
      frames:after.phases.flat().length,byteExactPoseComparisons:after.pixels,releases,lifecycle:after.lifecycle,
      timing,atlasTimes:after.atlasTimes},null,2));
  }finally{
    await browser.close();
    for(const name of ["stock","candidate"])fs.rmSync(path.join(scratch,name+".html"),{force:true});
    fs.rmdirSync(scratch);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
