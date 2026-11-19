// Native Chrome file playback comparison for the Cathedral dressing and critical path.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const root = path.resolve(__dirname,"..");
const canonical = path.resolve(process.argv[2] || path.join(root,"THE-BLACK-SILENCE.html"));
const base = fs.readFileSync(canonical,"utf8");
const legacy = process.argv[3] && fs.readFileSync(path.resolve(process.argv[3]),"utf8");
const out = path.resolve(process.argv[4] || path.join(root,".dream-loop","cathedral-native-test"));
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const actorTimeout = 18000;

function probe() {
  const names = ["cathedralBoneReliquary","cathedralVotiveLight"];
  const doors = ["55,31","44,28","18,41","24,32"];
  let resources = [];
  function face(x,z,y=C.pyy) {
    Ct.yaw = Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch = Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);
  }
  function calm() {
    sk();
    if (v.cine) stt(v.cine.dur + .1);
    V5(false);
    Be.inputLock = false;
    C.spawnGuard = 999;
    for (const e of v.enemies) e.stun = 999;
    for (const id of ["lvltitle","subt","bossbar","bossTitle"]) Jt(id).style.visibility = "hidden";
  }
  window.cathedralProbe = {
    load(level) {rp(level);calm();},
    calm,
    state() {
      return {level:T.level,ready:Be.started&&!Be.inputLock,key:T.key,at:[C.px,C.pz,C.pyy],
        captured:!!document.pointerLockElement,
        route:doors.map(name=>{const d=v.doors[name];return [name,d?.open,d?.k,d?.locked];}),
        boss:{key:v.bossRef?.key,dead:v.bossRef?.dead},checkpoint:Q0.snap?.mark,exit:v.exitPos};
    },
    snapshot() {
      const built = gV[7].build();
      const collisions = [];
      for (let z = 40; z <= 58; z += .25) for (let x = 84; x <= 101; x += .25) {
        collisions.push(Number(fu(x,z)));
      }
      return {grid:v.grid, heights:v.heightMap, ceilings:v.ceilMap, decor:built.decor,
        doors:Object.keys(v.doors), items:v.items.map(i=>[i.kind,i.x,i.z]), exit:v.exitPos,
        actors:v.enemies.map(e=>[e.key,e.name]), props:v.props.map(p=>[p.kind,p.x,p.z,p.r]),
        masses:[...v.masses], walls:v.wallSegs, shrines:Q0.marks.map(q=>[q.x,q.z]),collisions};
    },
    at(x,z,tx=x,tz=z-2) {
      Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
      face(tx,tz);
    },
    face,
    arrived(x,z,tol){
      if (Math.hypot(x-C.px,z-C.pz)<tol) return true;
      face(x,z);
      return false;
    },
    objects(track) {
      const objects = names.map(name=>J.scene.getObjectByName(name));
      if (!objects[0]) return null;
      if (track) resources = objects.flatMap(object=>[object.geometry,object.material,object.material.map]).map(resource=>{
        const observed = {id:resource.uuid,disposed:0};
        resource.addEventListener("dispose",()=>observed.disposed++);
        return observed;
      });
      return objects.map(o=>{
        const geo = o.geometry;
        geo.computeBoundingBox();
        return {name:o.name, triangles:(geo.index?.count??geo.getAttribute("position").count)/3,
          texture:[o.material.map.image.width,o.material.map.image.height],
          point:o.position.toArray(), min:geo.boundingBox.min.toArray(),max:geo.boundingBox.max.toArray(),
          lights:o.children.filter(c=>c.isLight).length};
      });
    },
    draws(){return {...J.renderer.info.render};},
    disposed:()=>resources.map(state=>state.disposed)
  };
}

function install(file, html) {
  assert.equal(html.split(anchor).length,2);
  fs.writeFileSync(file,html.replace(anchor,()=>"\n("+probe.toString()+")();\n"+anchor));
}

async function run() {
  fs.mkdirSync(out,{recursive:true});
  const file = path.join(out,"play.html");
  const fileUrl = pathToFileURL(file).href;
  const b = await chromium.launch({channel:"chrome"});
  try {
    const p = await b.newPage({viewport:{width:1280,height:720},offline:true});
    const errors = [], steps = [];
    p.on("pageerror",error=>errors.push(error.message));
    const call = (method,...args)=>p.evaluate(([method,args])=>cathedralProbe[method](...args),[method,args]);
    async function start() {
      await p.goto(fileUrl);
      await p.locator("#mNew").click();
      await p.waitForFunction(()=>window.cathedralProbe?.state().ready,null,{timeout:45000});
      await call("calm");
    }
    async function walk(x,z,tolerance=.60) {
      const from = (await call("state")).at;
      await call("face",x,z);
      await p.keyboard.down("KeyW");
      try {
        await p.waitForFunction(([x,z,t])=>cathedralProbe.arrived(x,z,t),[x,z,tolerance],{timeout:actorTimeout});
      } catch (error) {
        throw new Error("Blocked walking from " + from.join(",") + " to " + [x,z].join(",") + " at " +
          (await call("state")).at.join(","),{cause:error});
      } finally {
        await p.keyboard.up("KeyW");
      }
      await p.waitForTimeout(170);
      const at = (await call("state")).at;
      steps.push({action:"W",from,goal:[x,z],at});
      return at;
    }
    async function open(door,x,z,index) {
      await call("face",x,z);
      await p.keyboard.press("KeyE");
      await p.waitForFunction(index=>{const door=cathedralProbe.state().route[index];return door[1] && (door[2]===1 || door[2]===undefined);},index,{timeout:9000});
      steps.push({action:"E",door,at:(await call("state")).at});
    }
    async function shot(name) {await p.screenshot({path:path.join(out,name+".png")});}

    const hasFeature = base.includes("/* CATHEDRAL_RELIQUARY_BEGIN */");
    const strip = /\/\* CATHEDRAL_RELIQUARY_BEGIN \*\/[\s\S]*?\/\* CATHEDRAL_RELIQUARY_END \*\//;
    assert(hasFeature,"Build the upgraded HTML before running this test.");
    const stock = legacy || base.replace(strip,"");
    assert(!stock.includes("/* CATHEDRAL_RELIQUARY_BEGIN */"),"The comparison HTML already includes the feature.");
    install(file,stock);
    await start();
    await call("load",7);
    const old = await call("snapshot");
    assert.equal(await call("objects",false),null);
    await call("at",94.2,43.7,92.9,48.56);
    await p.waitForTimeout(250);
    const oldDraws = await call("draws");

    await p.goto("about:blank");
    install(file,base);
    await start();
    await call("load",7);
    const newer = await call("snapshot");
    assert.deepEqual(newer,old,"level map, collision, entities, progression and checkpoint coordinates");
    const objects = await call("objects",true);
    assert.equal(objects.length,2);
    assert(objects[0].triangles <= 6800 && objects[1].triangles <= 4);
    assert(objects.every(o=>o.lights===0));
    assert(objects[0].min[0]>-1&&objects[0].max[0]<1&&objects[0].min[2]>-1&&objects[0].max[2]<1);
    await call("at",94.2,43.7,92.9,48.56);
    await p.waitForTimeout(250);
    const newDraws = await call("draws");

    // Begin from the normal spawn tile (the original source item coordinates
    // and console/save state are left alone for the entire input sequence).
    await call("at",111,66.0,111,63);
    await open("porch",111,63,0);
    await walk(111,61);
    await walk(111,43);
    await walk(96.4,43);
    await walk(94.2,43.7);
    await call("face",92.9,48.56,2.4);
    await shot("armed-first-nave-turn");
    await walk(90.1,45.6);
    await walk(88.9,50.8);
    await walk(89,54.64,.37);
    await shot("armed-vault-gate-closed");
    await open("nave-to-vault",89,57,1);
    await walk(89,66.5);
    await shot("armed-through-original-gate");
    {
      await walk(86.8,67.8); await walk(87,75); await walk(65,75); await walk(43,75);
      await walk(37,76.6); await walk(37,80.6,.36); await open("charnel",37,83,2);
      await walk(37,87,.42);
      assert((await call("state")).key,"existing Cathedral key acquired by W");
      await shot("armed-original-key");
      await walk(37,79); await walk(49,77); await walk(49,67.5,.42);
      await open("sanctuary-lock",49,65,3);
      await walk(49,61);
      await shot("armed-through-sanctuary-lock");
    }
    const end = await call("state");
    const retired = [];
    for (const level of [6,8]) {
      await call("objects",true);
      await call("load",level);
      assert.equal(await call("objects",false),null);
      const disposed = await call("disposed");
      assert.deepEqual(disposed,[1,1,1,1,1,1]);
      retired.push([level,disposed]);
      await call("load",7);
    }
    assert.deepEqual(errors,[]);
    const result = {objects,oldDraws,newDraws,collisionSamples:old.collisions.length,end,steps,retired,pageErrors:errors};
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log("PASS Cathedral scope, native W/E and repeated resource retirement",JSON.stringify(result));
  } finally {
    await b.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
