// Compare the asylum ascent with actual held W and the native floor samples.
// node tools/hell-ascent-tests.cjs previous.html current.html output-directory
const fs=require("node:fs"), path=require("node:path"), assert=require("node:assert/strict");
const {createHash}=require("node:crypto"), {pathToFileURL}=require("node:url"), {chromium}=require("playwright");
const args=process.argv.slice(2);
assert.equal(args.length,3,"Pass previous.html current.html output-directory");
const [before,after,output]=args.map(p=>path.resolve(p));
const below=(folder,file)=>{
  const rel=path.relative(folder.toLowerCase(),file.toLowerCase());
  return rel===""||(!path.isAbsolute(rel)&&rel!==".."&&!rel.startsWith(".."+path.sep));
};
for(const file of [before,after])assert(!below(output,file),"Keep input files outside the output tree");
fs.mkdirSync(output,{recursive:true});
for(const file of [before,after])assert(!below(fs.realpathSync(output),fs.realpathSync(file)),"Resolved input must be outside output tree");
const hash=s=>createHash("sha256").update(s).digest("hex");
const marker="Jk();ju();Yy();X$(J$);D0t();";
const anchor="/* HELL_ASCENT_LANTERNS_BEGIN */";
const inputs=[before,after].map(file=>{
  const data=fs.readFileSync(file,"utf8");assert.equal(data.split(marker).length,2);
  return {file,data,sha:hash(data)};
});
assert(!inputs[0].data.includes(anchor),"Original ascent input");
assert(inputs[1].data.includes(anchor),"Lantern ascent input");

const seam=`
window.__ascentStudy={
  prepare(){
    C.spawnGuard=120;
    for(const e of v.enemies)e.stun=120;
    T.cur=1;T.weapons[1]=true;T.mag[1]=2;T.ammo.shells=13;
    Jt("subt").style.visibility="hidden";
  },
  pose(x,z,tx,tz,y){
    C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vz=C.vy=0;C.grounded=true;
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(tx-x,tz-z));
    J.camera.position.set(C.px,C.pyy,C.pz);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,'YXZ');
    J.camera.updateMatrixWorld(true);TR(0,true);le("",0);
    return {x,z,eye:C.pyy,zone:v.zones.themes[Wa.cur].id};
  },
  map(){
    const probes=[];for(let z=52;z<=100;z+=.125)for(let x=109.6;x<=116.4;x+=.17){
      const floor=ie(x,z);
      probes.push(+d0(x,z),+fu(x,z),+tV(x,floor+1.1,z));
    }
    return {probes:probes.join(""), grid:v.grid.map(row=>row.join("")), elevation:v.hmap,
      distancesToFloor:[98,90,82,74,66].map(z=>[ie(113,z+.1),ie(113,z-.1)]),
      candles:v.candles.map(c=>[c.x,c.z]),shrines:Q0.marks.map(s=>[s.x,s.z]),
      points:J.scene.children.filter(o=>o.isPointLight).length};
  },
  stats(){
    const m=J.scene.children.filter(o=>o.name.startsWith("hellAscentLantern"));
    return {p:[C.px,C.pyy,C.pz],camera:J.camera.position.toArray(),floor:ie(C.px,C.pz),
      meshes:m.map(o=>[o.name,o.geometry.attributes.position.count/3]),
      render:{...J.renderer.info.render},memory:{...J.renderer.info.memory}};
  },
  stairs(){
    const floorValues=new Set(),visits=[];
    function collect(){
      const z=C.pz,floor=ie(C.px,z);
      if(!floorValues.has(floor)){
        floorValues.add(floor);visits.push({z,floor,x:C.px,eye:C.pyy,solid:fu(C.px,z)});
      }
      if(z>53.5&&visits.length<20)requestAnimationFrame(collect);
    }
    collect();return visits;
  },
  depart(){
    const names=J.scene.children.filter(o=>o.name.startsWith("hellAscentLantern"));
    const resources=new Set();
    for(const mesh of names)for(const item of [mesh.geometry,mesh.material,mesh.material.map])resources.add(item);
    const released=new Map();
    for(const object of resources){released.set(object,0);object.addEventListener("dispose",()=>released.set(object,released.get(object)+1));}
    rp(1);const leaked=[];
    J.scene.traverse(o=>{
      if(o.name.startsWith("hellAscentLantern")||resources.has(o.geometry)||resources.has(o.material)||resources.has(o.material?.map))leaked.push(o.name);
    });
    const result={count:resources.size,released:[...released.values()],leaked};
    rp(0);
    return {...result,rebuilt:J.scene.children.filter(o=>o.name.startsWith("hellAscentLantern")).length};
  }
};\n`;
const cameras=[
  ["foot",113,98.6,113,82,4.35],
  ["mid",113,85.5,113,71,5.3],
  ["refuge",115.2,54.5,123.9,52.2,5.33]
];
async function visit(browser,input,label) {
  const fixture=path.join(output,label+"-ascent-"+input.sha.slice(0,12)+".html");
  fs.writeFileSync(fixture,input.data.replace(marker,()=>seam+marker),{flag:"wx"});
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const study=(method,...params)=>page.evaluate(([name,args])=>__ascentStudy[name](...args),[method,params]);
  try{
    await page.goto(pathToFileURL(fixture).href+"?qa=1",{timeout:65000});
    await page.locator("#mNew").click();
    await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started&&!window.__BLACK_SILENCE_QA?.Be.inputLock,undefined,{timeout:45000});
    await study("prepare");
    const map=await study("map"), captures=[];
    for(const [name,...pose] of cameras){
      const settled=await study("pose",...pose);
      await page.waitForTimeout(350);
      const rendering=await study("stats");
      assert.equal(settled.zone,"climb");assert.deepEqual(rendering.p,rendering.camera);
      await page.screenshot({path:path.join(output,label+"-"+name+".png")});
      captures.push({name,pose,settled,rendering});
    }
    await study("pose",113,99.4,113,54.2,5.0);
    await page.evaluate(()=>window.__ascentStairs=__ascentStudy.stairs());
    await page.keyboard.down("KeyW");
    try{
      await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.C.pz<=53.5,undefined,{timeout:19000});
    }finally{await page.keyboard.up("KeyW");}
    await page.waitForTimeout(67);
    const trail=await page.evaluate(()=>window.__ascentStairs),arrived=await study("stats");
    assert.deepEqual(trail.map(p=>+p.floor.toFixed(2)),[2.10,2.52,2.94,3.36,3.78,4.20]);
    assert(trail.every(p=>p.x===113&&!p.solid),"Native center lane remains walkable");
    assert(arrived.floor>=4.2&&arrived.p[2]<=53.5,"Player reaches landing");
    const resources=await study("depart");
    assert.deepEqual(errors,[]);
    if(label==="after"){
      assert.equal(captures[0].rendering.meshes.length,3);
      assert(captures[0].rendering.meshes.every(([name,n])=>n>0&&n<5000),"Small batched 3D assets");
      assert.equal(resources.count,8);assert(resources.released.every(n=>n===1));
      assert.deepEqual(resources.leaked,[]);assert.equal(resources.rebuilt,3);
    }
    return {sha:input.sha,map,captures,trail,arrived,resources,errors};
  } finally {await page.close();fs.unlinkSync(fixture);}
}
(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true});
  try{
    const original=await visit(browser,inputs[0],"before"),candidate=await visit(browser,inputs[1],"after");
    assert.deepEqual(original.map,candidate.map,"Same ascent map, grid collision, coves, native candles and lights");
    const count=original.map.probes.length;
    delete original.map.probes; delete candidate.map.probes;
    delete original.map.grid; delete candidate.map.grid;
    delete original.map.elevation; delete candidate.map.elevation;
    for(const input of inputs)assert.equal(hash(fs.readFileSync(input.file)),input.sha,"Original input preserved");
    const result={passed:true,collisionSamples:count,
      scope:"Original walking input and native frames; matched activation, viewmodel, cameras and encounter staging.",original,candidate};
    fs.writeFileSync(path.join(output,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log(JSON.stringify({passed:true,source:inputs[1].sha,collisionSamples:count,
      rises:candidate.trail.map(p=>p.floor),lights:candidate.map.points,resources:candidate.resources}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
