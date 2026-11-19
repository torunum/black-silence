const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const root = path.resolve(__dirname,"..");
if(!process.argv[2])throw new Error("Usage: node tools/factory-office-manifold-tests.cjs previous.html [candidate.html] [proof-directory]");
const stock = path.resolve(process.argv[2]);
const candidate = path.resolve(process.argv[3] || path.join(root,"THE-BLACK-SILENCE.html"));
const out = path.resolve(process.argv[4] || path.join(root,".dream-loop","factory-office-manifold-tests"));
const ids = ["28,36","42,29","35,18"];
const features = ["factoryOfficePressureManifold"];

function attach(args) {
  const {ids,features} = args;
  const q = __BLACK_SILENCE_QA, {C,Ct,Be,T,J,v} = q;
  const asset = () => features.map(name=>J.scene.getObjectByName(name)).filter(Boolean);
  let samples = [];
  function face(x,z,y=C.pyy) {
    Ct.yaw = Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch = Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    q.setCamera();
  }
  function load(id) {
    q.load(id);
    if(v.cine)v.cine=null;
    q.pause(false);
    Be.inputLock=false;
    C.spawnGuard=500;
    for(const e of v.enemies)e.stun=500;
    for(const id of ["lvltitle","subt","bossbar","bossTitle"]){
      const element=document.getElementById(id);
      if(element)element.style.visibility="hidden";
    }
  }
  window.foundryProof = {
    load, face,
    models(track=false){
      const objects=asset();
      if(track)samples=objects.flatMap(o=>[o.geometry,o.material,o.material.map]).filter(r=>r).map(resource=>{
        const sample={key:resource.uuid,retired:0};
        resource.addEventListener("dispose",()=>sample.retired++);
        return sample;
      });
      return objects.map(o=>{
        o.geometry.computeBoundingBox();
        return {name:o.name,geometry:o.geometry.uuid, material:o.material.uuid,
          triangles:(o.geometry.index?.count??o.geometry.getAttribute("position").count)/3,
          atlas:o.material.map?[o.material.map.image.width,o.material.map.image.height]:null,
          root:o.position.toArray(),bounds:[o.geometry.boundingBox.min.toArray(),o.geometry.boundingBox.max.toArray()],
          lights:o.children.filter(child=>child.isLight).length};
      });
    },
    retired(){return samples.map(r=>r.retired);},
    state() {
      return {level:T.level,player:[C.px,C.pyy,C.pz],
        key:T.key,paused:Be.menu,locked:Be.inputLock,pointer:!!document.pointerLockElement,
        guards:v.enemies.map(e=>[e.key,!!e.dead]),
        doors:ids.map(id=>{const d=v.doors[id];return {id,open:d.open,k:d.k,dir:d.dir,locked:d.locked};}),
        items:v.items.filter(i=>!i.used&&i.kind==="key").map(i=>[i.kind,i.x,i.z]),
        save:JSON.parse(localStorage.getItem("black-silence.campaign.v1")||"null")?.shrine?.mark};
    },
    staticState() {
      const collision=[];
      for(let z=61;z<76;z+=.2)for(let x=78;x<102;x+=.2)collision.push(Number(q.solid(x,z)));
      return {grid:v.grid,heightMap:v.heightMap,ceilMap:v.ceilMap,walls:v.wallSegs,exit:v.exitPos,
        masses:[...v.masses],actors:v.enemies.map(e=>[e.key,e.name,e.x,e.z]),
        props:v.props.map(o=>[o.kind,o.x,o.z,o.r]),items:v.items.map(i=>[i.kind,i.x,i.z]),
        doors:Object.entries(v.doors).map(([id,d])=>[id,d.axis,d.mesh.position.toArray(),d.secret,d.locked]),
        lights:J.scene.children.filter(child=>child.isLight).map(child=>child.type),
        collision};
    },
    arrived(x,z,tolerance) {
      if(Math.hypot(x-C.px,z-C.pz)<tolerance)return true;
      face(x,z);
      return false;
    },
    at(x,z,tx=x,tz=z-1,y=q.floor(x,z)+q.eyeHeight) {
      Object.assign(C,{px:x,pz:z,pyy:q.floor(x,z)+q.eyeHeight,vx:0,vz:0,vy:0,grounded:true});
      face(tx,tz,y);
    },
    draws(){return {...J.renderer.info.render};}
  };
}

async function main() {
  fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({channel:"chrome"});
  const errors=[],samples=[], all=[];
  try {
    for (const [variant,file] of [["old",stock],["after",candidate]]){
      const steps=[];
      const context=await b.newContext({viewport:{width:1280,height:720},offline:true});
      try {
        const p=await context.newPage();
        p.on("pageerror",e=>errors.push(e.message));
        await p.addInitScript(()=>{
          let state=2462113451;
          Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
        });
        await p.goto(pathToFileURL(file).href+"?qa=1");
        await p.locator("#mNew").click();
        await p.waitForFunction(()=>__BLACK_SILENCE_QA.Be.started&&!__BLACK_SILENCE_QA.Be.inputLock,null,{timeout:40000});
        await p.evaluate(attach,{ids,features});
        const call=(name,...args)=>p.evaluate(([name,args])=>foundryProof[name](...args),[name,args]);
        await call("load",6);
        const snap=await call("staticState");
        if(all.length)assert.deepEqual(snap,all[0],"native Factory layout and collision match");
        all.push(snap);
        const objects=await call("models");
        assert.equal(objects.length,variant==="after"?1:0);
        if(objects.length) {
          assert(objects[0].root[2]+objects[0].bounds[0][0]>70.3,"new geometry outside the office corridor opening");
          assert(objects[0].lights===0);
        }
        await call("at",83.5,69.96,89.70,68.54,2.45);
        await p.waitForTimeout(450);
        const render=await call("draws");
        await call("load",6);
        async function walk(x,z,tolerance=.60) {
          const from=(await call("state")).player;
          await call("face",x,z);
          await p.keyboard.down("KeyW");
          try {
            await p.waitForFunction(([x,z,t])=>foundryProof.arrived(x,z,t),[x,z,tolerance],{timeout:14000});
          } catch (error) {
            throw new Error("Stalled W from "+from.join(",")+" to "+[x,z].join(",")+" at "+
              (await call("state")).player.join(","),{cause:error});
          } finally {await p.keyboard.up("KeyW");}
          await p.waitForTimeout(170);
          steps.push({input:"W",from,goal:[x,z],result:(await call("state")).player});
        }
        async function open(id,x,z) {
          const before=(await call("state")).player;
          await call("face",x,z);
          await p.keyboard.press("KeyE");
          await p.waitForFunction(id=>{
            const d=foundryProof.state().doors.find(d=>d.id===id);return d.open&&d.k===1;
          },id,{timeout:8500});
          steps.push({input:"E",id,before});
        }
        await walk(21.8,77);
        await walk(36,77);
        await walk(43.2,73.3);
        await walk(54.52,73,.43);
        await open("28,36",57,73);
        await walk(63.2,73);
        await walk(76.7,73);
        await walk(82.6,69);
        await walk(88.6,69);
        await p.screenshot({path:path.join(out,variant+"-office-mouth.png")});
        await walk(95,69);
        await walk(102.9,69);
        await walk(109,69,.43);
        assert((await call("state")).key,"authored key picked up by movement");
        await p.screenshot({path:path.join(out,variant+"-office-key.png")});
        await walk(96,69);
        await walk(85.4,69);
        await walk(85,61.7,.36);
        await open("42,29",85,59);
        await walk(85,45.2);
        await walk(85,36.9);
        await walk(74.95,37);
        await walk(73.46,37,.35);
        await open("35,18",71,37);
        await walk(67,37);
        const end=await call("state");
        assert(end.key);
        const retired=[];
        if(variant==="after")for(const level of [5,7]){
          const current=await call("models",true);
          assert.equal(current.length,1);
          assert(current[0].triangles<5000);
          await call("load",level);
          assert.deepEqual(await call("models"),[]);
          const release=await call("retired");
          assert(release.length>=2&&release.every(n=>n===1));
          retired.push({level,release});
          await call("load",6);
        }
        const bytes=fs.readFileSync(file);
        samples.push({variant,bytes:bytes.length,sha256:crypto.createHash("sha256").update(bytes).digest("hex"),
          objects,collision:snap.collision.length,render,steps,end,retired});
        console.log(variant+" Factory native route PASS "+steps.length+" actions");
      } finally {await context.close();}
    }
    const result={samples,errors};
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(result,null,2)+"\n");
    assert.deepEqual(errors,[]);
    console.log("PASS original office key and casting-pit lock");
  } finally {await b.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
