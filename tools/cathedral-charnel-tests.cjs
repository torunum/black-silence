// The two supplied standalone files run offline under the same file:// URL.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {createHash}=require("node:crypto"),{pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const [oldPath,newPath,reportDir]=process.argv.slice(2);
if(!oldPath||!newPath)throw Error("Usage: node tools/cathedral-charnel-tests.cjs previous.html candidate.html [evidence-directory]");
const out=path.resolve(reportDir||".dream-loop/cathedral-charnel-tests");
const sources=[oldPath,newPath].map(p=>fs.readFileSync(p,"utf8"));
const marker="/* CATHEDRAL_CHARNEL_TOMB_BEGIN */",startup="Jk();ju();Yy();X$(J$);D0t();";
assert(!sources[0].includes(marker)&&sources[1].includes(marker));
const sha=s=>createHash("sha256").update(s).digest("hex");
const campaignSlot="black-silence.campaign.v1";

function prepare(){
  const names=["cathedralCharnelTomb","cathedralSanctuaryKeyhole","cathedralCharnelGroundLight"];
  const models=()=>names.map(name=>J.scene.getObjectByName(name)).filter(Boolean);
  let watched=[];
  function face(x,z,y=C.pyy){
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);
  }
  function calm(){
    sk();if(v.cine)stt(v.cine.dur+.1);if(oe.phase==="arrive")Fd();
    V5(false);Be.inputLock=false;C.spawnGuard=600;
    for(const a of v.enemies){a.stun=600;a.sp.visible=false;}
    for(const key of ["lvltitle","subt","bossbar","bossTitle"]){const el=Jt(key);if(el)el.style.visibility="hidden";}
  }
  function at(x,z,tx,tz,y){
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vy:0,vz:0,grounded:true});
    face(tx,tz,y);
  }
  const state=()=>({level:T.level,at:[C.px,C.pyy,C.pz],key:T.key,mark:Q0.snap?.mark,
    doors:["18,41","24,32"].map(k=>v.doors[k]?.open||false),marks:Q0.marks.map(m=>[m.x,m.z,m.lit]),
    ready:Be.started&&!Be.inputLock,models:models().length,
    diagnostics:{lock:!!document.pointerLockElement,paused:Wk(),yaw:Ct.yaw,phase:oe.phase,bossIntro:!!v.cine,
      message:Jt("msg")?.textContent,door:Object.keys(v.doors).includes("18,41")?v.doors["18,41"].locked:null}});
  window.charnelStudy={state,at,face,calm,
    enter(n=7){rp(n);calm();return state();},
    near(x,z,r){if(Math.hypot(C.px-x,C.pz-z)<r)return true;face(x,z);return false;},
    checkpoint(){
      // Stage the saved-key fixture at its original native shrine. The engine
      // creates and serializes the old-format checkpoint through its usual hook.
      const i=Q0.marks.findIndex(m=>!m.lit);
      if(i<0)throw Error("No fresh Cathedral shrine");
      const s=Q0.marks[i];at(s.x,s.z,s.x,s.z-2);T0t(C.px,C.pz);QX(1/60);
      return state();
    },
    scope(){
      const samples=[];
      for(let iz=0;iz<=72;iz++)for(let ix=0;ix<=156;ix++){
        const x=27.5+ix*.125,z=82+iz*.125;
        let bits=Number(d0(x,z))+2*Number(fu(x,z));
        [.28,.64,1.04,1.20,1.42,1.64,2.1].forEach((y,j)=>bits+=Number(tV(x,y,z))<<(j+2));
        samples.push(bits);
      }
      return {samples,map:{grid:v.grid,heights:v.heightMap,ceilings:v.ceilMap,doors:Object.keys(v.doors),
        items:v.items.map(i=>[i.kind,i.x,i.z]),shrines:Q0.marks.map(q=>[q.x,q.z]),
        actors:v.enemies.map(e=>[e.key,e.x,e.z]),props:v.props.map(p=>[p.kind,p.x,p.z,p.r]),
        masses:[...v.masses].flatMap(([k,m])=>m.filter(p=>p.x0!==35.41||p.z0!==89.178).map(p=>[k,p])),
        lights:J.scene.children.filter(o=>o.isLight).length},floor:[ie(37,87),ie(37,89)]};
    },
    render(track=false){
      const meshes=models();
      if(track){
        const assets=new Set(meshes.flatMap(m=>[m.geometry,m.material,m.material.map]));
        watched=[...assets].map(a=>{const info={kind:a.type,retired:0};a.addEventListener("dispose",()=>info.retired++);return info;});
      }
      return {retirements:watched,draws:J.renderer.info.render.calls,triangles:J.renderer.info.render.triangles,
        models:meshes.map(m=>({name:m.name,triangles:(m.geometry.index?.count||m.geometry.attributes.position.count)/3,
          texture:[m.material.map.image.width,m.material.map.image.height]}))};
    },
    shots(){
      const tomb=models()[0];if(!tomb)return null;
      const p=tomb.geometry.attributes.position,idx=tomb.geometry.index;
      const points=[[37,.64],[37,1.02],[37,1.22],[37.74,1.21],[38.19,1.37],
        [38.26,1.46],[35.79,1.19],[35.89,1.30],[37,1.86],[34.90,.73]];
      return points.map(([x,y])=>{
        const px=x-37;
        let visual=90,hit=90;
        // Intersect a real horizontal shot against the compiled triangles.
        for(let t=0;t<idx.count;t+=3){
          const a=idx.getX(t),b=idx.getX(t+1),c=idx.getX(t+2);
          const ax=p.getX(a),ay=p.getY(a),bx=p.getX(b)-ax,by=p.getY(b)-ay,cx=p.getX(c)-ax,cy=p.getY(c)-ay;
          const det=bx*cy-by*cx;if(Math.abs(det)<.0000001)continue;
          const u=((px-ax)*cy-(y-ay)*cx)/det,vv=(bx*(y-ay)-by*(px-ax))/det;
          if(u<0||vv<0||u+vv>1)continue;
          const z=90+p.getZ(a)+u*(p.getZ(b)-p.getZ(a))+vv*(p.getZ(c)-p.getZ(a));
          visual=Math.min(visual,z);
        }
        for(let z=88.50;z<90;z+=.004)if(tV(x,y,z)){hit=z;break;}
        return {x,y,visual,hit};
      });
    },
    async cost(){
      const objects=models(),renderer=J.renderer,draw=renderer.render;
      const blocks=[],states=[false,true,true,false,false,true,true,false];
      let active=null,last=0;
      renderer.render=function(...args){
        const start=performance.now(),result=draw.apply(this,args),end=performance.now();
        if(active&&args[0]===J.scene){
          if(last)active.raf.push(start-last);
          last=start;active.cpu.push(end-start);active.calls.push(this.info.render.calls);
        }
        return result;
      };
      try{
        const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
        for(const visible of states){
          for(const mesh of objects)mesh.visible=visible;
          for(let i=0;i<6;i++)await frame();
          active={visible,raf:[],cpu:[],calls:[]};last=0;
          for(let i=0;i<32;i++)await frame();
          blocks.push(active);active=null;
        }
      }finally{renderer.render=draw;for(const mesh of objects)mesh.visible=true;}
      function quantile(values,q){const a=[...values].sort((a,b)=>a-b);return +(a[Math.floor((a.length-1)*q)]||0).toFixed(3);}
      const summary=[false,true].map(visible=>{
        const rows=blocks.filter(b=>b.visible===visible),cpu=rows.flatMap(b=>b.cpu),raf=rows.flatMap(b=>b.raf);
        return {visible,frames:cpu.length,callsMedian:quantile(rows.flatMap(b=>b.calls),.5),
          cpuMedianMs:quantile(cpu,.5),cpuP95Ms:quantile(cpu,.95),rafMedianMs:quantile(raf,.5),rafP95Ms:quantile(raf,.95)};
      });
      return {sequence:states,framesPerBlock:32,summary};
    }
  };
}

async function run(){
  fs.mkdirSync(out,{recursive:true});
  const fixture=path.join(out,"native.html"),url=pathToFileURL(fixture).href;
  const browser=await chromium.launch({channel:"chrome"});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
    const errors=[],network=[],verified=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("request",r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    await page.addInitScript(()=>{let seed=271826;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
    const call=(method,...args)=>page.evaluate(([m,a])=>charnelStudy[m](...a),[method,args]);
    let oldScope,oldSave,changes,shots,cost,retirements,restored;
    async function start(button){
      await page.goto(url);await page.locator(button).click();
      await page.waitForFunction(()=>charnelStudy.state().ready,null,{timeout:45000});
      await call("calm");
    }
    for(const [i,source] of sources.entries()){
      await page.goto("about:blank");
      assert.equal(source.split(startup).length,2);
      fs.writeFileSync(fixture,source.replace(startup,()=>"("+prepare.toString()+")();\n"+startup));
      if(i){
        await start("#mContinue");
        restored=await call("state");
        assert.equal(restored.level,7);assert(restored.key&&restored.doors.every(Boolean));
        assert.equal(restored.mark,oldSave.shrine.mark);
        assert(Math.hypot(restored.at[0]-oldSave.shrine.at.x,restored.at[2]-oldSave.shrine.at.z)<.05);
      }
      await start("#mNew");await call("enter");
      const scope=await call("scope");
      if(!i)oldScope=scope;
      else{
        assert.deepEqual(scope.map,oldScope.map);
        changes={gridPoints:scope.samples.length,testsPerPoint:9,changedPoints:0,bits:[0,0,0,0,0,0,0,0,0]};
        for(let n=0;n<scope.samples.length;n++){
          const delta=scope.samples[n]^oldScope.samples[n];if(!delta)continue;
          changes.changedPoints++;
          const x=27.5+(n%157)*.125,z=82+Math.floor(n/157)*.125;
          assert.equal(oldScope.samples[n]&delta,0,"new stone only adds solidity");
          for(let k=0;k<9;k++)if(delta&(1<<k)){
            changes.bits[k]++;
            const margin=k===1?.351:.001;
            assert(x>=35.41-margin&&x<=38.59+margin&&z>=89.178-margin&&z<=89.91+margin,
              "unexpected obstruction at "+[x,z,k]);
          }
        }
        assert(changes.changedPoints>0&&changes.bits[0]>0&&changes.bits[1]>0);
        assert.equal(changes.bits[8],0,"everything above the effigy is clear");
        shots=await call("shots");
        for(const shot of shots){
          if(shot.visual<89.65)assert(Math.abs(shot.hit-shot.visual)<.012,JSON.stringify(shot));
          else assert(shot.hit>=89.85,JSON.stringify(shot));
        }
        assert(shots.filter(s=>s.y>1.06&&s.hit<89.65).length>=3);
        assert(shots.filter(s=>s.hit>=89.85).length>=2);
      }
      const run={sha256:sha(source),bytes:Buffer.byteLength(source),steps:[]};
      const shot=name=>page.screenshot({path:path.join(out,(i?"candidate-":"previous-")+name+".png")});
      async function walk(x,z,r=.37){
        const at=(await call("state")).at;await call("face",x,z);await page.keyboard.down("KeyW");
        try{await page.waitForFunction(([x,z,r])=>charnelStudy.near(x,z,r),[x,z,r],{timeout:18000});}
        finally{await page.keyboard.up("KeyW");}
        await page.waitForTimeout(110);
        run.steps.push({action:"W",from:at,to:[x,z],at:(await call("state")).at});
      }
      async function open(x,z,door){
        await call("face",x,z);await page.keyboard.press("KeyE");
        try{await page.waitForFunction(k=>charnelStudy.state().doors[k],door,{timeout:4500});}
        catch(error){
          await shot("door-failure");
          throw Error("E at "+[x,z]+" failed: "+JSON.stringify(await call("state")),{cause:error});
        }
        await page.waitForTimeout(500);
        run.steps.push({action:"E",door:["charnel","sanctuary"][door],at:(await call("state")).at});
      }
      await call("at",37,78.4,37,83);
      await page.waitForTimeout(200);await call("calm");
      await walk(37,81.03,.24);await open(37,83,0);
      await walk(36.56,84.76);await call("face",37,89.9,1.43);await shot("approach");
      await walk(37,87,.36);assert((await call("state")).key);
      await call("face",37,90,1.48);await shot("key");
      await call("face",37,91,1.22);await page.keyboard.down("KeyW");
      try{
        await page.waitForFunction(min=>charnelStudy.state().at[2]>min,i?88.70:89.45,{timeout:10000});
        await page.waitForTimeout(430);
        run.frontStop=(await call("state")).at;
      }finally{await page.keyboard.up("KeyW");}
      assert(i?run.frontStop[2]>88.7&&run.frontStop[2]<88.84:run.frontStop[2]>89.46);
      run.steps.push({action:"W",contact:i?"stone lid":"original rear wall",at:run.frontStop});
      await walk(37,87.0);await walk(34.50,87.0);await walk(34.50,89.29,.22);
      run.flank=(await call("state")).at;assert(run.flank[2]>89.0);
      await call("face",37,89.55,1.24);await shot("flank");
      await walk(34.50,87);await walk(37,85.65);await walk(37,79);
      await walk(49,77);await walk(49,67.5,.35);await call("face",50.6,66,1.46);await shot("sanctuary-seal");
      await open(49,65,1);await walk(49,61.3,.4);
      run.finished=await call("state");assert(run.finished.key&&run.finished.doors.every(Boolean));
      if(!i){
        await call("checkpoint");
        oldSave=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),campaignSlot);
        assert(oldSave.level===7&&oldSave.shrine?.inv.key&&oldSave.shrine.facts.opened.includes("24,32"));
      }else{
        await call("at",36.8,86.48,37,90,1.52);await page.waitForTimeout(220);
        run.render=await call("render");assert.equal(run.render.models.length,3);
        cost=await call("cost");
        assert(cost.summary.every(c=>c.frames>=120));
        assert(cost.summary[1].callsMedian-cost.summary[0].callsMedian<=3);
        retirements=[];
        for(const n of [8,6]){
          await call("render",true);await call("enter",n);const after=await call("render");
          assert.equal(after.models.length,0);assert.equal(after.retirements.length,7);
          assert(after.retirements.every(r=>r.retired===1));
          retirements.push({other:n,disposed:after.retirements.map(r=>r.retired)});
          await call("enter",7);assert.equal((await call("render")).models.length,3);
        }
      }
      verified.push(run);console.log("PASS",i?"candidate":"previous","key, physical contact, flank, sanctuary");
    }
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    const result={scope:"Offline Chrome, real keyboard motion and interaction after staged route entry. Actors held for reproducibility.",verified,changes,shots,cost,
      previousSavedShrine:{level:oldSave.level,mark:oldSave.shrine.mark,key:oldSave.shrine.inv.key},
      restored,retirements,errors,network};
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log("PASS Cathedral charnel collision, old save, render and disposal",JSON.stringify({changes,shots,cost,retirements}));
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
