// Native body, movement, animation and resource checks for the prologue pyre.
// node tools/hell-hearth-tests.cjs baseline.html current.html output-directory
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {pathToFileURL} = require("node:url");
const {chromium}=require("playwright");

const args = process.argv.slice(2);
assert.equal(args.length,3,"Pass baseline.html, current.html and output directory");
const [before, after, output]=args.map(arg=>path.resolve(arg));
const contains = (directory,file) => {
  const relative=path.relative(directory,file);
  return relative==="" || (!path.isAbsolute(relative) && relative!==".." && !relative.startsWith(".."+path.sep));
};
const outputKey=output.toLowerCase();
for(const input of [before,after])assert(!contains(outputKey,input.toLowerCase()),"Input must be outside the capture directory");
fs.mkdirSync(output,{recursive:true});
for(const input of [before,after])assert(!contains(fs.realpathSync(output).toLowerCase(),fs.realpathSync(input).toLowerCase()),"Resolved input must be outside the capture directory");

const anchor="Jk();ju();Yy();X$(J$);D0t();";
const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const files=[before,after].map(file=>{
  const source=fs.readFileSync(file,"utf8");
  assert.equal(source.split(anchor).length,2,"Original native startup marker");
  return {file,source,sha256:hash(source)};
});
assert(!files[0].source.includes("/* HELL_ARENA_HEARTH_BEGIN */"));
assert(files[1].source.includes("/* HELL_ARENA_HEARTH_BEGIN */"));
const probe=`
const nativeHearthPanner=Nt;
let hearthSoundCalls=[];
Nt=function(x,y,z,play){
  if(x===71&&z===105)hearthSoundCalls.push({x,y,z});
  return nativeHearthPanner.apply(this,arguments);
};
window.__hellHearthStudy={
  prepare(){
    C.spawnGuard=999;
    for(const enemy of v.enemies)enemy.stun=999;
    T.cur=1;T.weapons[1]=true;T.mag[1]=2;T.ammo.shells=13;
    Jt("subt").style.visibility="hidden";
  },
  pose(x,z,tx,tz,y){
    if(fu(x,z)||ie(x,z)<2)throw Error("Camera must stand on level ground");
    C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vz=C.vy=0;C.grounded=true;
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(tx-x,tz-z));
    J.camera.position.set(C.px,C.pyy,C.pz);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);TR(0,true);le("",0);
    return {x,z,floor:ie(x,z),eye:C.pyy,zone:v.zones.themes[Wa.cur].id};
  },
  stats(){ const {render,memory}=J.renderer.info;
    return {render:{...render},memory:{...memory},position:[C.px,C.pyy,C.pz],camera:J.camera.position.toArray(),solid:fu(C.px,C.pz)};
  },
  map(){
    const holes=[];for(let j=-25;j<=25;j++)for(let i=-25;i<=25;i++){
      const x=71+i*.08,z=105+j*.08;
      holes.push(+d0(x,z),+fu(x,z),+tV(x,2.75,z),+tV(x,3.45,z));
    }
    const exit=z0.exit;
    return {shape:holes.join(""),grid:v.grid.map(row=>row.join("")),elevations:v.hmap,
      doors:Object.keys(v.doors).sort(),exit:[exit.x,exit.z,exit.nx,exit.nz],items:v.items.map(r=>[r.kind,r.x,r.z]),
      masses:[...(v.masses.get(52*4096+35)||[])],visibleFireOrigin:Gn.bowls.some(e=>e.x===71&&e.z===105),
      sounds:hearthSoundCalls.length};
  },
  phase(){
    const base=J.scene.getObjectByName("hellArenaHearth"),flames=J.scene.getObjectByName("hellArenaHearthFlames");
    const spill=J.scene.getObjectByName("hellArenaHearthSpill");
    return {active:!!base,position:base?.position.toArray(),children:base?.children.map(o=>o.name),
      visible:flames?.visible,version:flames?.geometry.getAttribute("uv").version,
      uv:flames?.geometry.getAttribute("uv").getX(0),glow:spill?.material.opacity,
      triangles:base?.geometry.getAttribute("position").count/3,flameTriangles:flames?.geometry.getAttribute("position").count/3};
  },
  forceOneAmbient(){hearthSoundCalls=[];utt.fireCrackle();return {calls:hearthSoundCalls,context:It()?.state};},
  swap(level){
    const base=J.scene.getObjectByName("hellArenaHearth");
    const tracked=new Set(),disposed=new Map();
    base?.traverse(o=>{for(const item of [o.geometry,o.material,o.material?.map])if(item)tracked.add(item);});
    for(const object of tracked){
      disposed.set(object,0);object.addEventListener("dispose",()=>disposed.set(object,disposed.get(object)+1));
    }
    rp(level);
    const leaks=[];J.scene.traverse(o=>{if(o.name.startsWith("hellArenaHearth")||tracked.has(o.geometry)||tracked.has(o.material)||tracked.has(o.material?.map))leaks.push(o.name);});
    return {ids:tracked.size,disposed:[...disposed.values()],leaks};
  }
};\n`;
const cameras = [
  ["hero",68.4,101.2,69.7,105,3.33],
  ["east",74.6,101.4,72.8,105.7,3.4],
  ["south",68,111.2,71,105,3.5],
  ["entrance",76.7,93,71,105,3.93]
];

async function visit(browser,{sha256,source},label) {
  const fixture=path.join(output,label+"-hearth-"+sha256.slice(0,12)+".html");
  fs.writeFileSync(fixture,source.replace(anchor,()=>probe+anchor),{flag:"wx"});
  const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
  const errors=[],captures=[];
  page.on("pageerror",error=>errors.push(error.message));
  const onPage=(method,...params)=>page.evaluate(([name,args])=>window.__hellHearthStudy[name](...args),[method,params]);
  try {
    await page.goto(pathToFileURL(fixture).href+"?qa=1",{timeout:65000});
    await page.locator("#mNew").click();
    await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started&&!window.__BLACK_SILENCE_QA?.Be.inputLock,undefined,{timeout:45000});
    await onPage("prepare");
    const map=await onPage("map");
    const nearby=await onPage("phase");
    console.log(label+": launched, captured map and native collision");
    for(const [name,...pose] of cameras){
      const settled=await onPage("pose",...pose);
      await page.waitForTimeout(320);
      const stats=await onPage("stats");
      assert.equal(settled.zone,"hell");
      assert.deepEqual(stats.position,stats.camera,"Standing player and native camera match");
      assert(!stats.solid,"Camera pose is traversable");
      await page.screenshot({path:path.join(output,label+"-"+name+".png")});
      captures.push({name,pose,settled,renderer:stats.render,memory:stats.memory});
    }
    // Walk into the square collision mass with normal W, then back out.
    await onPage("pose",71,102,71,105,3.1);
    await page.keyboard.down("KeyW");await page.waitForTimeout(900);await page.keyboard.up("KeyW");
    const blocked=await onPage("stats");
    assert(blocked.position[2]>102.5&&blocked.position[2]<=104.13,"Player stops at the native pyre face");
    assert(!blocked.solid,"Player radius does not intersect the hearth");
    await page.keyboard.down("KeyS");await page.waitForTimeout(300);await page.keyboard.up("KeyS");
    const escaped=await onPage("stats");
    assert(escaped.position[2]<blocked.position[2]-.2,"Player can back out of the pyre face");
    console.log(label+": captured view angles and W/S collision");

    const litFrames=[];
    const lifecycle=[];
    const audio = {near:await onPage("forceOneAmbient")};
    await onPage("pose",76.7,93,71,105,3.93);
    audio.far=await onPage("forceOneAmbient");
    if (label==="after") {
      assert(nearby.triangles>0&&nearby.triangles<2800,"One small hearth batch, triangles="+nearby.triangles);
      assert.equal(nearby.flameTriangles,32);
      await onPage("pose",68.4,101.2,69.7,105,3.33);
      for(let i=0;i<5;i++) {
        await page.waitForTimeout(160);
        litFrames.push(await onPage("phase"));
      }
      assert(litFrames[0].visible&&new Set(litFrames.map(s=>s.uv)).size>2,"Live RAF advances the fire atlas");
      assert(new Set(litFrames.map(s=>s.glow)).size>2,"The floor glow follows the fire");
      await page.evaluate(()=>window.__BLACK_SILENCE_QA.pause(true));
      const state=await onPage("phase");await page.waitForTimeout(200);
      assert.deepEqual(await onPage("phase"),state,"Pausing pauses fire and floor glow");
      await page.evaluate(()=>window.__BLACK_SILENCE_QA.pause(false));
      await onPage("pose",81,55.2,81,64,3.5);await page.waitForTimeout(180);
      assert.equal((await onPage("phase")).visible,false,"Distant hearth overdraw culled");
      console.log(label+": flame animation passed");
      for(let cycle=0;cycle<2;cycle++) {
        const departed=await onPage("swap",1);
        assert.equal(departed.ids,9);assert(departed.disposed.every(n=>n===1));
        assert.deepEqual(departed.leaks,[]);
        assert.equal((await onPage("phase")).active,false);
        await onPage("swap",0);const returned=await onPage("phase");
        assert.equal(returned.children.length,2);assert.equal(returned.triangles,nearby.triangles);
        lifecycle.push({cycle,departed,returned});
      }
      assert.deepEqual(audio.near.calls,[{x:71,y:2.92,z:105}],"The native fire cue originates inside the hearth");
      assert.deepEqual(audio.far.calls,[],"Distant ambient keeps its ordinary route");
    }
    assert.deepEqual(errors,[],"No native browser errors");
    return {sha256, map, captures, nearby, blocked:blocked.position, escaped:escaped.position, audio, litFrames, lifecycle, errors};
  } finally {
    await page.close();
    fs.unlinkSync(fixture);
  }
}

(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true});
  try {
    const original=await visit(browser,files[0],"before"), candidate=await visit(browser,files[1],"after");
    assert(original.map.visibleFireOrigin&&!candidate.map.visibleFireOrigin,"Only the pyre's old shared flame is replaced");
    for(const key of ["shape","grid","elevations","doors","exit","items","masses"]) {
      assert.deepEqual(candidate.map[key],original.map[key],key+" matches baseline");
      delete candidate.map[key];delete original.map[key];
    }
    for(const entry of files)assert.equal(hash(fs.readFileSync(entry.file)),entry.sha256,"Inputs preserved byte-for-byte");
    const report={passed:true,exactCollisionSamples:51*51*4,preserved:["grid","elevation","doors","exit","item spawns","native mass"],
      scope:"Live Chrome RAF/renderer and W/S at the centered pyre; quiet encounters and fixed camera for matched captures.",original,candidate};
    fs.writeFileSync(path.join(output,"verification.json"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify({passed:true,after:files[1].sha256,exactCollisionSamples:report.exactCollisionSamples,
      drawCalls:original.captures.map((r,i)=>[r.renderer.calls,candidate.captures[i].renderer.calls]),lifecycle:candidate.lifecycle.length}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
