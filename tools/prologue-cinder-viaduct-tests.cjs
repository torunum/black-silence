// Exercise both the original bridge and the new lower route with native walk
// physics. The fixture places the player at each start and holds enemies still.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const [original,candidate,output] = process.argv.slice(2);
assert(original && candidate && output, "Pass baseline.html candidate.html evidence-directory");
const out = path.resolve(output);
fs.mkdirSync(out,{recursive:true});
const startup = "Jk();ju();Yy();X$(J$);D0t();";

function instrument() {
  const name="prologueCinderSluice";
  function aim(x,z) {
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch=0;
    J.camera.rotation.set(0,Ct.yaw,0,"YXZ");
  }
  function setStart(x,z) {
    C.px=x; C.pz=z; C.pyy=ie(x,z)+Yo;
    C.vx=C.vz=C.vy=0; C.grounded=true;
    J.camera.position.set(x,C.pyy,z); TR(0,true);
  }
  const state=()=>({floor:ie(C.px,C.pz),x:C.px,z:C.pz,eye:C.pyy,level:T.level,ready:Be.started&&!Be.inputLock,
    hp:T.hp,ground:C.grounded,collision:fu(C.px,C.pz)});
  const layout=()=>{
    const map=gV[0].build(), local=[];
    for(let z=26;z<=36;z++) for(let x=38;x<=47;x++)
      local.push({x,z,cell:map.g[z][x],floor:map.hmap[z][x],ceil:map.cmap[z][x]});
    return {local,shrines:Q0.marks.map(s=>[s.x,s.z]),exit:[z0.exit.x,z0.exit.z],
      objects:map.g.flatMap((row,z)=>row.flatMap((cell,x)=>/[wzhaED]/.test(cell)&&x>=38&&x<=47&&z>=26&&z<=36?[[x,z,cell]]:[])),
      lights:J.scene.children.filter(m=>m.isPointLight).length,
      probes:[[81,57],[81,59],[81,61],[85,61],[86,65],[89,67],[91,67],[93,67]].map(([x,z])=>[x,z,ie(x,z),fu(x,z)])};
  };
  window.sluiceProbe={start(x,z) {
    sk();if(v.cine)stt(v.cine.dur+.2);if(oe.phase==="arrive")Fd();V5(false);Be.inputLock=false;
    C.spawnGuard=999;for(const e of v.enemies)e.stun=999;
    setStart(x,z);
  }, aim,state,layout,viewpoint(x,z,tx,tz,pitch){
    setStart(x,z);aim(tx,tz);Ct.pitch=pitch;
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);
    return {position:[C.px,C.pyy,C.pz],yaw:Ct.yaw,pitch:Ct.pitch};
  },legacySave(){
    const mark=Q0.marks.at(-1);setStart(mark.x,mark.z);
    T0t(C.px,C.pz);QX(1/60);
    return JSON.parse(localStorage.getItem("black-silence.campaign.v1"));
  },restored(){
    return {mark:Q0.snap?.mark,at:Q0.snap?.at,inventory:ck(),
      chart:Q0.snap?.automap?.layout,seen:Q0.snap?.automap?.data};
  },near(x,z,r) {
    if(Math.hypot(C.px-x,C.pz-z)<=r)return state();
    aim(x,z);return false;
  },performance() {
    const mesh=J.scene.getObjectByName(name),renderer=J.renderer.info;
    return {draws:renderer.render.calls,triangles:renderer.render.triangles,drawnFrames:renderer.render.frame,
      ownTriangles:mesh?mesh.geometry.index.count/3:0,customMeshes:J.scene.children.filter(o=>o.name===name).length,
      geometries:renderer.memory.geometries,textures:renderer.memory.textures};
  },retire(){
    const mesh=J.scene.getObjectByName(name);
    const counts=[mesh.geometry,mesh.material,mesh.material.map].map(obj=>{
      const info={n:0};obj.addEventListener("dispose",()=>info.n++);return info;
    });
    rp(1);const nextCount=J.scene.children.filter(o=>o.name===name).length;
    rp(0);return {released:counts.map(o=>o.n),nextCount,returned:J.scene.children.filter(o=>o.name===name).length};
  }};
}

async function main(){
  const b=await chromium.launch({channel:"chrome"});
  const stats=[],errors=[],network=[];
  let oldSave,oldState;
  try {
    for (const [version,file] of [original,candidate].entries()) {
      const input=fs.readFileSync(file,"utf8");
      assert.equal(input.includes("/* PROLOGUE_CINDER_VIADUCT_BEGIN */"),!!version);
      assert.equal(input.split(startup).length,2);
      const wrapped=path.join(out,version?"candidate.html":"original.html");
      assert(![original,candidate].some(source=>path.resolve(source)===wrapped),"Input file must be outside the output fixtures");
      fs.writeFileSync(wrapped,input.replace(startup,()=>`(${instrument.toString()})();\n${startup}`));
      const p=await b.newPage({viewport:{width:640,height:360},offline:true});
      if(version)await p.addInitScript(save=>localStorage.setItem("black-silence.campaign.v1",JSON.stringify(save)),oldSave);
      p.on("pageerror",e=>errors.push(e.message));
      p.on("request",r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
      await p.goto(pathToFileURL(wrapped).href,{waitUntil:"commit",timeout:120000});
      await p.locator(version?"#mContinue":"#mNew").focus({timeout:120000});await p.keyboard.press("Enter");
      await p.waitForFunction(()=>window.sluiceProbe?.state().ready,null,{timeout:120000});
      const call=(m,...a)=>p.evaluate(([m,a])=>sluiceProbe[m](...a),[m,a]);
      const result={layout:await call("layout"),steps:[]};
      if(version)assert.deepEqual(await call("restored"),oldState,"Continue restores the old shrine, equipment and automap");
      async function walk(x,z,r=.37) {
        await call("aim",x,z);await p.keyboard.down("KeyW");
        let hit;
        try{hit=await p.waitForFunction(([x,z,r])=>sluiceProbe.near(x,z,r),[x,z,r],{timeout:50000});}
        catch(e){throw Error("Walk to "+[x,z]+" ended at "+JSON.stringify(await call("state")),{cause:e});}
        finally{await p.keyboard.up("KeyW");}
        // Record the actual crossing frame. On a busy host a remote keyup
        // acknowledgement can arrive several frames after crossing the tile.
        const state=await hit.jsonValue();await hit.dispose();
        assert(!state.collision && state.level===0 && state.hp>0);
        result.steps.push(state);
      }
      // Same upper bridge in either direction. This exact lane was one tile
      // wide before and still reaches the arena above without intersecting the hoist.
      await call("start",81,53);await walk(81,57);await walk(81,61);await walk(81,64);
      await walk(81,59);await walk(81,55);
      assert(result.steps.every(p=>p.floor===2.1));
      await call("start",84.91,58.89);
      if(version) {
        // All subsequent motion to the arena is held W. No jumps or player warps.
        await walk(86,61);await walk(86,63);await walk(86,65);await walk(86,66.85);
        await walk(89,66.85);await walk(91,66.85);await walk(93,66.85);
        await walk(93,72);await walk(87,76);
        assert.deepEqual(result.steps.slice(5,12).map(p=>p.floor),[.45,.75,1.05,1.05,1.4,1.75,2.1]);
        assert.equal(result.steps.at(-1).floor,2.1);
        await call("start",81,57);
        await walk(81,59);await walk(83,59);await walk(83,61);
        result.lookout=result.steps.splice(-3);
        assert(result.lookout.every(s=>s.floor===2.1 && !s.collision));
      }
      await call("start",80.8,52.2);await call("aim",83.4,62);await p.waitForTimeout(450);
      result.view=await call("performance");
      result.cameras={};
      for(const [name,...args] of [
        ["trench",84.91,57.9,87.2,64,.075],["upper",80.8,52.2,83.4,62,-.010]
      ]) {
        result.cameras[name]=await call("viewpoint",...args);await p.waitForTimeout(400);
        await p.screenshot({path:path.join(out,(version?"after":"before")+"-"+name+".png")});
      }
      if(version)result.lifecycle=await call("retire");
      else {
        oldSave=await call("legacySave");oldState=await call("restored");
        assert(oldSave.shrine && oldState.chart && oldState.seen,"The old run saved a discovered shrine");
      }
      stats.push(result);await p.close();
    }
    const [before,after]=stats;
    assert.deepEqual(before.cameras,after.cameras,"Both camera locations and view angles must match between revisions");
    const changed=after.layout.local.filter((q,i)=>q.floor!==before.layout.local[i].floor);
    assert.equal(changed.length,15,"ten lower cells, four upper cells and the cantilever landing change grade");
    for(const k of ["objects","shrines","exit"])assert.deepEqual(before.layout[k],after.layout[k]);
    assert.equal(before.layout.lights,after.layout.lights);
    assert(after.layout.probes.every(([, , ,blocked])=>!blocked));
    assert.deepEqual(after.lifecycle,{released:[1,1,1],nextCount:0,returned:1});
    assert.equal(after.view.customMeshes,1);
    assert(after.view.ownTriangles<4000);
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    const report={changed,legacyShrine:oldState.mark,legacyAutomap:oldState.chart,upperRoute:after.steps.slice(0,5),lookout:after.lookout,recovery:after.steps.slice(5),
      cameras:after.cameras,baseline:before.view,current:after.view,lifecycle:after.lifecycle,errors,network};
    fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify({changed:changed.length,upperSteps:report.upperRoute.length,
      recoverySteps:report.recovery.length,view:after.view,lifecycle:after.lifecycle}));
  }finally{await b.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
