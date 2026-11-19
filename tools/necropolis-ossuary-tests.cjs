// Native input, traversal, release/load behavior and unchanged campaign data.
// node tools/necropolis-ossuary-tests.cjs candidate.html previous.html [proof-dir]
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const current=fs.readFileSync(process.argv[2]||"THE-BLACK-SILENCE.html","utf8");
const legacy=fs.readFileSync(process.argv[3],"utf8");
const out=process.argv[4];
const anchor="Jk();ju();Yy();X$(J$);D0t();";
const version="/* NECROPOLIS_OSSUARY_ENTRANCE_BEGIN */";
assert(current.includes(version)&&!legacy.includes(version));
const hash=text=>crypto.createHash("sha256").update(text).digest("hex");

function doorwayTest() {
  const cell="34,21",red="31,27";
  let tracked=[];
  function face(x,z,y=C.pyy) {
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);
  }
  function at(x,z,tx=x,tz=z-2){
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
    face(tx,tz);
  }
  function calm(){
    sk();if(T.level===3 && v.bossRef?.dormant)bk(v.bossRef);
    if(v.cine)stt(v.cine.dur+.1);
    V5(false);Be.inputLock=false;C.spawnGuard=999;
    for(const e of v.enemies)e.stun=999;
    for(const id of ["lvltitle","subt","bossbar","bossTitle"])Jt(id).style.visibility="hidden";
  }
  function pureMap() {
    const m=gV[3].build();
    const {decor,...layout}=m;
    return {layout,decor};
  }
  function objects() {
    const root=J.scene.getObjectByName("ossuaryPlazaEntrance");
    const rear=J.scene.getObjectByName("ossuaryReturnEntrance");
    const name=J.scene.getObjectByName("ossuaryNativeOpening");
    if(!root) return null;
    const branches=[root,rear,name,...v.doors[cell].leaves.map(leaf=>leaf.node.getObjectByName("ossuarySwingHardware"))];
    const geometries=new Set(),materials=new Set(),textures=new Set();
    let meshes=0,triangles=0,lights=0;
    for(const branch of branches) {
      if(!branch) throw Error("Missing visible ossuary branch");
      branch.traverse(mesh=>{
        if(mesh.isLight)lights++;
        if(!mesh.isMesh)return;
        meshes++;triangles+=(mesh.geometry.index?.count??mesh.geometry.getAttribute("position").count)/3;
        geometries.add(mesh.geometry);materials.add(mesh.material);
        if(mesh.material.map)textures.add(mesh.material.map);
      });
    }
    tracked=[...geometries,...materials,...textures].map(resource=>{
      const state={id:resource.uuid,disposed:0};
      resource.addEventListener("dispose",()=>state.disposed++);
      return state;
    });
    return {meshes,triangles,lights,textures:textures.size};
  }
  function state(){
    const door=v.doors[cell];
    return {level:T.level,at:[C.px,C.pz,C.pyy],yaw:Ct.yaw,ready:!Be.inputLock&&Be.started,solid:fu(69,43),
      main:door?{open:door.open,k:door.k,dir:door.dir,leaves:door.leaves.map(p=>p.node.rotation.y),axis:door.axis}:null,
      red:v.doors[red]?{open:v.doors[red].open,locked:v.doors[red].locked}:null,
      key:T.key,checkpoint:Q0.snap?.mark,seen:We.seen.reduce((a,b)=>a+b,0),secrets:T.secrets,exit:v.exitPos};
  }
  window.ossuaryProof={
    calm, state, pureMap, objects, at, face, load(level){rp(level);calm();},
    layout(){return {
      items:v.items.map(i=>[i.kind,i.x,i.z]),actors:v.enemies.map(e=>e.key),
      props:v.props.map(p=>[p.kind,p.x,p.z,p.r]),doors:Object.keys(v.doors),
      heights:v.heightMap,ceilings:v.ceilMap,terrain:v.grid,
      masses:[...v.masses],walls:v.wallSegs,shrines:Q0.marks.map(q=>[q.x,q.z])
    };},
    shrine(index){const q=Q0.marks[index];at(q.x,q.z);T0t(C.px,C.pz);QX(1/60);},
    saved(){return JSON.parse(localStorage.getItem("black-silence.campaign.v1"));},
    disposed:()=>tracked.map(info=>info.disposed),
    lightPhase:()=>J.scene.getObjectByName("ossuaryLampFlame")?.parent.scale.y,
    arrived(x,z,tolerance){if(Math.hypot(x-C.px,z-C.pz)<tolerance)return true;face(x,z);return false;},
    clean(on){ER().canvas.style.visibility=on?"hidden":"";for(const id of ["hud","minimap","cross"])Jt(id).style.visibility=on?"hidden":"";}
  };
}

async function test() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-ossuary-"));
  const file=path.join(dir,"play.html"),url=pathToFileURL(file).href;
  const install=html=>fs.writeFileSync(file,html.replace(anchor,()=>"("+doorwayTest.toString()+")();\n"+anchor));
  const browser=await chromium.launch({channel:"chrome"});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
    const errors=[],checks=[];page.on("pageerror",error=>errors.push(error.message));
    const call=(name,...args)=>page.evaluate(([name,args])=>ossuaryProof[name](...args),[name,args]);
    const screenshot=async name=>{
      if(!out)return;
      await page.waitForTimeout(260);
      await page.screenshot({path:path.join(out,name+".png")});
    };
    const wait=fn=>page.waitForFunction(fn,null,{timeout:12000});
    const use=()=>page.keyboard.press("KeyE");
    async function walk(x,z,tolerance=.60) {
      const from=(await call("state")).at;
      await call("face",x,z);
      await page.keyboard.down("KeyW");
      try {await page.waitForFunction(([x,z,t])=>ossuaryProof.arrived(x,z,t),[x,z,tolerance],{timeout:13000});}
      catch (error) {throw Error(`Walking from ${from.join(",")} to ${x},${z} stalled at ${(await call("state")).at.join(",")}`,{cause:error});}
      finally {await page.keyboard.up("KeyW");}
      await page.waitForTimeout(230);
      const at=(await call("state")).at;
      checks.push({action:"W",from,target:[x,z],at});
      return at;
    }
    async function start(button) {
      await page.locator(button).click();
      await page.waitForFunction(()=>window.ossuaryProof?.state().ready,null,{timeout:45000});
      await call("calm");
    }
    if(out)fs.mkdirSync(out,{recursive:true});

    install(legacy);await page.goto(url);await start("#mNew");await call("load",3);
    const oldMap=await call("pureMap"),oldLevel=await call("layout");
    await call("at",69,45.55,69,43);
    assert((await call("state")).solid);
    await use();await wait(()=>ossuaryProof.state().main.k===1);
    await call("shrine",1);
    const prior=await call("saved");assert(prior.shrine?.facts.opened.includes("34,21")&&!prior.shrine.inv.key);
    await page.goto("about:blank");install(current);await page.goto(url);await start("#mContinue");
    const migrated=await call("state");
    assert(migrated.main.open&&!migrated.solid&&migrated.checkpoint===1&&!migrated.key);
    assert.deepEqual((await call("saved")).shrine,prior.shrine);
    checks.push({action:"existing Continue from the same file URL",at:migrated.at,mappedCells:migrated.seen});
    const afterMap=await call("pureMap");assert.deepEqual(afterMap.layout,oldMap.layout);
    const renamed=oldMap.decor.filter(d=>d.k==="niche"&&d.x===36&&d.z===22&&d.r===0);
    assert.equal(renamed.length,1);
    assert.deepEqual(afterMap.decor,oldMap.decor.filter(d=>!renamed.includes(d)));
    assert.deepEqual(await call("layout"),oldLevel);
    checks.push({action:"identical grid, heights, walls, collisions, doors and actor, item and shrine indices"});
    const geometry=await call("objects");assert(geometry.meshes<12&&geometry.triangles<18000&&geometry.lights===0);

    await call("load",3);await call("at",69,58.5,69,43);
    await screenshot("plaza-approach");
    await walk(69,45.65,.40);
    await call("face",69,43,1.42);await screenshot("ossuary-closed");
    const first=await call("lightPhase");await page.waitForTimeout(120);
    assert.notEqual(await call("lightPhase"),first,"The local lamp flame animates");
    await use();await wait(()=>ossuaryProof.state().main.k===1);
    const openedFromPlaza=await call("state");assert(!openedFromPlaza.solid&&openedFromPlaza.main.dir===-1);
    await screenshot("ossuary-open");
    assert((await walk(69,37.3))[1]<42,"walk across original door from the plaza");
    assert((await walk(69,30.2))[2]>2,"climb the same two steps to the ossuary");
    await screenshot("ossuary-stair");
    await walk(69,24);await walk(75,24);await walk(75,13);
    assert((await call("state")).key,"reach and collect the existing red key by movement");
    await walk(75,24);await walk(69,24);await walk(69,31);await walk(69,47.6);
    await walk(69,55);await walk(65.1,55,.46);
    await call("face",63,55);await use();await wait(()=>ossuaryProof.state().red.open);
    checks.push({action:"collect original red key, return to plaza and open the original red lock"});
    await screenshot("red-lock-return");
    await call("shrine",2);
    const earned=await call("saved");assert(earned.shrine?.inv.key);
    assert(earned.shrine.facts.opened.includes("34,21")&&earned.shrine.facts.opened.includes("31,27"));
    await page.reload();await start("#mContinue");
    assert((await call("state")).red.open&&(await call("state")).key);
    checks.push({action:"new Continue restores both opened gates and red key"});

    await call("load",3);await call("at",69,40.6,69,43);
    assert((await call("state")).solid);
    await use();await wait(()=>ossuaryProof.state().main.k===1);
    const openedFromOssuary=await call("state");assert(openedFromOssuary.main.dir===1);
    await call("face",69,43,1.25);await screenshot("reverse-open");
    assert((await walk(69,46.5))[1]>44,"walk from the ossuary to the plaza");

    const disposed=[];
    for(const level of [5,9]) {
      const mesh=await call("objects");assert.deepEqual(mesh,geometry);
      await call("load",level);assert.equal(await call("objects"),null);
      const counts=await call("disposed");assert(counts.every(v=>v===1));disposed.push(counts.length);
      await call("load",3);
    }
    assert.deepEqual(errors,[]);
    const result={old:hash(legacy),current:hash(current),geometry,openedFromPlaza,openedFromOssuary,checks,disposed,errors};
    if(out)fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log("PASS native Necropolis door, climb, red key, checkpoint, previous save and resources",JSON.stringify({geometry,checks:checks.length,disposed}));
  } finally {
    await browser.close();fs.unlinkSync(file);fs.rmdirSync(dir);
  }
}
test().catch(error=>{console.error(error);process.exitCode=1;});
