// Native file playback comparison for the Womb eastern key route.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const root = path.resolve(__dirname,"..");
const canonical = path.resolve(process.argv[2] || path.join(root,"THE-BLACK-SILENCE.html"));
const base = fs.readFileSync(canonical,"utf8");
const legacy = process.argv[3] && fs.readFileSync(path.resolve(process.argv[3]),"utf8");
const out = path.resolve(process.argv[4] || path.join(root,".dream-loop","womb-east-valve-native-route"));
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const actorTimeout = 18000;

function probe() {
  const names = ["wombEastValveRibs"];
  const doors = ["22,31","32,28","27,28","24,15"];
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
  window.wombProbe = {
    load(level) {rp(level);calm();},
    calm,
    state() {
      return {level:T.level,ready:Be.started&&!Be.inputLock,key:T.key,at:[C.px,C.pz,C.pyy],
        captured:!!document.pointerLockElement,
        route:doors.map(name=>{const d=v.doors[name];return [name,d?.open,d?.k,d?.locked,d?.dir];}),
        boss:{key:v.bossRef?.key,dead:v.bossRef?.dead},checkpoint:Q0.snap?.mark,exit:v.exitPos};
    },
    snapshot() {
      const built = gV[8].build();
      const collisions = [];
      for (let z = 51; z <= 65; z += .16) for (let x = 51; x <= 71; x += .16) {
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
        const positions=geo.getAttribute("position");
        let innermost=Infinity;
        for(let i=0;i<positions.count;i++) {
          if(positions.getY(i)>.15 && positions.getY(i)<1.35) {
            innermost=Math.min(innermost,Math.abs(positions.getX(i)));
          }
        }
        return {name:o.name, triangles:(geo.index?.count??geo.getAttribute("position").count)/3,
          texture:[o.material.map.image.width,o.material.map.image.height],
          point:o.position.toArray(), min:geo.boundingBox.min.toArray(),max:geo.boundingBox.max.toArray(),
          lights:o.children.filter(c=>c.isLight).length, openingClearance:innermost};
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
    const call = (method,...args)=>p.evaluate(([method,args])=>wombProbe[method](...args),[method,args]);
    async function start() {
      await p.goto(fileUrl);
      await p.locator("#mNew").click();
      await p.waitForFunction(()=>window.wombProbe?.state().ready,null,{timeout:45000});
      await call("calm");
    }
    async function walk(x,z,tolerance=.60) {
      const from = (await call("state")).at;
      await call("face",x,z);
      await p.keyboard.down("KeyW");
      try {
        await p.waitForFunction(([x,z,t])=>wombProbe.arrived(x,z,t),[x,z,tolerance],{timeout:actorTimeout});
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
      await p.waitForFunction(index=>{const door=wombProbe.state().route[index];return door[1] && (door[2]===1 || door[2]===undefined);},index,{timeout:9000});
      steps.push({action:"E",door,at:(await call("state")).at});
    }
    async function shot(name) {await p.screenshot({path:path.join(out,name+".png")});}

    const modulePattern=/\/\* WOMB_EAST_VALVE_BEGIN \*\/[\s\S]*?\/\* WOMB_EAST_VALVE_END \*\//;
    const hasFeature=modulePattern.test(base);
    assert(hasFeature,"Build the standalone Womb valve before comparing.");
    const stock=legacy || base.replace(modulePattern,"");
    assert(!modulePattern.test(stock),"The previous build already includes east valve dressing.");
    const comparisonShot = async () => {
      await call("at",64.08,62.76,65.04,56.90);
      await call("face",65.04,56.90,2.45);
      await p.waitForTimeout(260);
      return call("draws");
    };
    async function eastRoute(label) {
      // The gut shrine is reached from the stock Womb spawn by ordinary input.
      await walk(13.1,65,.42);
      await walk(19.5,65);
      await walk(39,65);
      await walk(42.8,63,.37);
      await open("ventricle-to-gut",45,63,0);
      await walk(48.44,63.04,.40);
      const center = await call("state");
      assert.equal(center.checkpoint,0,"native shrine activated");
      await call("face",65,57,2.58);
      await shot(label+"-gut-shrine");
      await walk(57.9,63);
      await walk(64.08,62.76);
      await call("face",65.04,56.90,2.45);
      await shot(label+"-east-approach");
      await walk(65,59.62,.38);
      await open("eastern valve",65,57,1);
      const dir = (await call("state")).route[1][4];
      await shot(label+"-east-open");
      await walk(65,51.5);
      await walk(65,43,.42);
      await walk(74.45,43,.43);
      await walk(77.7,43,.43);
      await walk(85.1,43,.50);
      await walk(85,53,.44);
      const key = await call("state");
      assert(key.key,"player collected the existing red key");
      await shot(label+"-red-key");
      return {center,key,dir};
    }

    install(file,stock);
    await start();
    await call("load",8);
    const old = await call("snapshot");
    assert.equal(await call("objects",false),null);
    const oldDraws = await comparisonShot();
    await call("load",8);
    const oldRoute = await eastRoute("before");

    await p.goto("about:blank");
    install(file,base);
    await start();
    await call("load",8);
    const newer = await call("snapshot");
    assert.deepEqual(newer,old,"level map, collision, entities, progression and checkpoint coordinates");
    const objects = await call("objects",true);
    assert(objects && objects.length===1);
    assert(objects.every(o=>o.lights===0));
    assert(objects[0].triangles <= 4500);
    assert(objects[0].openingClearance > 1,"frame remains outside the native two-unit opening at player height");
    assert(objects[0].max[1] < 3,"crown remains below the local three-unit ceiling");
    const newDraws = await comparisonShot();
    await call("load",8);
    const route = await eastRoute("after");
    assert.equal(route.dir,oldRoute.dir,"original forward hinge travel");

    await call("load",8);
    await call("at",65,54.25,65,57);
    await open("valve reverse",65,57,1);
    const reverse = (await call("state")).route[1][4];
    assert.equal(reverse,-route.dir,"same door opens in either direction");
    await walk(65,61);
    const retired = [];
    for (const level of [7,3]) {
      await call("objects",true);
      await call("load",level);
      assert.equal(await call("objects",false),null);
      const disposed = await call("disposed");
      assert.deepEqual(disposed,[1,1,1]);
      retired.push([level,disposed]);
      await call("load",8);
    }
    assert.deepEqual(errors,[]);
    const result = {objects,oldDraws,newDraws,collisionSamples:old.collisions.length,oldRoute,route,reverse,steps,retired,pageErrors:errors};
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log("PASS Womb scope, native W/E and repeated resource retirement",JSON.stringify(result));
  } finally {
    await b.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
