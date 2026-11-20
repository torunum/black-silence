const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const [before,after,output]=process.argv.slice(2);
if(!before||!after)throw Error("Usage: node tools/hollow-village-loft-tests.cjs previous.html candidate.html [report-directory]");
const anchor="Jk();ju();Yy();X$(J$);D0t();";
const marker="/* HOLLOW_VILLAGE_LOFT_GUIDE_BEGIN */";
const raw=[before,after].map(file=>fs.readFileSync(file,"utf8"));
const root=path.resolve(output||path.join(".dream-loop","hollow-village-loft-check"));
const hash=value=>crypto.createHash("sha256").update(value).digest("hex");
assert(!raw[0].includes(marker)&&raw[1].includes(marker));

function prepareLoftProbe(){
  const names=["hollowVillageLoftFittings","hollowVillageLoftSpill"];
  const models=()=>names.map(name=>J.scene.getObjectByName(name)).filter(Boolean);
  let retired=[];
  function face(x,z,y=C.pyy){
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);
  }
  window.loftProbe={
    ready:()=>Be.started&&!Be.inputLock,
    load(level=10){
      rp(level);sk();
      if(v.cine)stt(v.cine.dur+.1);
      if(v.cine)v.cine=null;
      V5(false); Be.inputLock=false;C.spawnGuard=480;
      for(const e of v.enemies){e.stun=480;e.sp.visible=false;}
      for(const id of ["lvltitle","subt","bossbar","bossTitle"]){
        const part=document.getElementById(id);
        if(part)part.style.visibility="hidden";
      }
    },
    at(x,z,tx,tz,y){
      Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vy:0,vz:0,grounded:true});
      face(tx,tz,y);
      if(v.zones)TR(0,true);
    },
    face,near(x,z,tolerance){
      if(Math.hypot(x-C.px,z-C.pz)<tolerance)return true;
      face(x,z);
      return false;
    },
    state:()=>({at:[C.px,C.pyy,C.pz],key:T.key,checkpoint:Q0.snap?.mark,level:T.level,
      zone:v.zones?.themes[Wa.cur]?.id,lights:J.scene.children.filter(o=>o.isLight).length}),
    scope(){
      const movement=[],shotVolume=[];
      for(let z=117.65;z<=120.23;z+=.11)for(let x=23.15;x<=35.75;x+=.15){
        movement.push([Number(fu(x,z)),ie(x,z)]);
        for(let y=1.3;y<4.8;y+=.35)shotVolume.push(Number(tV(x,y,z)));
      }
      return {movement,shotVolume,grid:v.grid,heights:v.heightMap,ceils:v.ceilMap,masses:[...v.masses],
        item:v.items.filter(i=>i.kind==="key").map(k=>[k.x,k.z]),doors:Object.keys(v.doors),
        marks:Q0.marks.map(s=>[s.x,s.z]),lights:J.scene.children.filter(o=>o.isLight).length};
    },
    render(watch){
      const meshes=models();
      if(watch){
        const assets=new Set(meshes.flatMap(m=>[m.geometry,m.material,m.material.map].filter(Boolean)));
        retired=[...assets].map(resource=>{
          const counter={type:resource.type||"CanvasTexture",disposed:0};
          resource.addEventListener("dispose",()=>counter.disposed++);
          return counter;
        });
      }
      return {calls:J.renderer.info.render.calls,triangles:J.renderer.info.render.triangles,retired,
        meshes:meshes.map(o=>{
          o.geometry.computeBoundingBox();
          const box=o.geometry.boundingBox;
          return {name:o.name,triangles:o.geometry.getAttribute("position").count/3,
            min:box.min.toArray(),max:box.max.toArray(),light:o.isLight===true,
            atlas:o.material.map&&[o.material.map.image.width,o.material.map.image.height]};
        })};
    }
  };
}

async function verify(){
  fs.mkdirSync(root,{recursive:true});
  const html=path.join(root,"native.html"),url=pathToFileURL(html).href;
  const b=await chromium.launch({channel:"chrome"});
  try{
    const p=await b.newPage({viewport:{width:1280,height:720},offline:true});
    const errors=[],network=[];p.on("pageerror",e=>errors.push(e.message));
    p.on("console",event=>{if(event.type()==="error")errors.push(event.text());});
    p.on("request",req=>{if(/^https?:/.test(req.url()))network.push(req.url());});
    await p.addInitScript(()=>{let seed=2462113451;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
    const call=(name,...args)=>p.evaluate(([name,args])=>loftProbe[name](...args),[name,args]);
    let scope, retirements;
    const results=[];
    for(const [index,s] of raw.entries()){
      await p.goto("about:blank");
      assert.equal(s.split(anchor).length,2);
      fs.writeFileSync(html,s.replace(anchor,()=>"("+prepareLoftProbe.toString()+")();\n"+anchor));
      await p.goto(url);await p.locator("#mNew").click();
      await p.waitForFunction(()=>loftProbe.ready(),null,{timeout:35000});
      await call("load");
      const parity=await call("scope");
      if(index===0)scope=parity;
      else assert.deepEqual(parity,scope);
      await call("at",34.73,110.3,28.1,118.7,2.72);
      await p.waitForTimeout(450);
      const render=await call("render",false),start=await call("state");
      assert.equal(render.meshes.length,index*2);
      if(index){
        const [item]=render.meshes;
        assert(item.min[2]>=119.64&&item.max[2]<=120.025);
        assert(render.meshes.every(mesh=>!mesh.light));
      }
      const options={path:path.join(root,index?"updated-from-aisle.png":"previous-from-aisle.png")};
      await p.screenshot(options);
      const steps=[];
      async function walk(x,z,tolerance=.32){
        const from=(await call("state")).at;
        await call("face",x,z);
        const sprint=Math.hypot(x-from[0],z-from[2])>23;
        if(sprint)await p.keyboard.down("ShiftLeft");
        await p.keyboard.down("KeyW");
        try{await p.waitForFunction(([x,z,t])=>loftProbe.near(x,z,t),[x,z,tolerance],{timeout:14000});}
        catch(e){throw Error("Loft route to "+[x,z].join(",")+" stopped at "+(await call("state")).at.join(","),{cause:e});}
        finally{await p.keyboard.up("KeyW");if(sprint)await p.keyboard.up("ShiftLeft");}
        await p.waitForTimeout(135);
        steps.push({input:sprint?"Shift+W":"W",from,goal:[x,z],at:(await call("state")).at});
      }
      const upper=[[10.92,119.03],[9.42,114.45],[7.35,111.85],[7.35,105.36],[11.13,104.76]];
      await walk(34.73,118.93,.30);
      for(const [x,z] of upper)await walk(x,z);
      await walk(11,101,.34);
      const picked=await call("state");
      assert(picked.key&&picked.at[1]>4);
      for(const [x,z] of upper.toReversed())await walk(x,z);
      await walk(34.73,118.93,.31);
      await walk(34.73,110.3,.42);
      const finished=await call("state");
      assert(finished.key&&finished.at[1]<2.8);
      results.push({sha256:hash(s),bytes:Buffer.byteLength(s),start,picked,finished,render,steps});
      if(index){
        retirements=[];
        for(const other of [0,9]){
          await call("render",true);
          await call("load",other);
          const after=await call("render",false);
          assert.equal(after.meshes.length,0);
          assert.equal(after.retired.length,5);
          assert(after.retired.every(resource=>resource.disposed===1));
          retirements.push({other,retired:after.retired});
          await call("load");
        }
      }
      console.log("PASS "+(index?"candidate":"previous")+" genuine W loft stairs, key and return ("+steps.length+" steps)");
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(network,[]);
    fs.writeFileSync(path.join(root,"verification.json"),JSON.stringify({
      results,movement:scope.movement.length,shotVolume:scope.shotVolume.length,retirements,errors,network},null,2)+"\n");
  } finally {await b.close();}
}
verify().catch(e=>{console.error(e);process.exitCode=1;});
