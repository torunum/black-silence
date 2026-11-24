// Probe the shipped standalone with the engine's own grid, ray tests and
// player movement. Pass a built HTML and an optional JSON evidence path.
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const game=path.resolve(process.argv[2]||"THE-BLACK-SILENCE.html");
const reportFile=process.argv[3]&&path.resolve(process.argv[3]);
const seam="Jk();ju();Yy();X$(J$);D0t();",marker="/* ASH_CLOISTER_LAVABO_BEGIN */";
const source=fs.readFileSync(game,"utf8");
assert.equal(source.split(marker).length,2,"one compiled wash court");
assert.equal(source.split(seam).length,2,"one startup seam");

function probe(){
  function stage(){
    rp(9);sk();if(v.cine)stt(v.cine.dur+.2);v.cine=null;V5(false);Be.inputLock=false;
    C.spawnGuard=400;for(const e of v.enemies)e.stun=400;
    const old=oldCloisterMap(),current=gV[9].build();
    const changed=[],heights=[];
    for(let z=0;z<old.H;z++)for(let x=0;x<old.W;x++){
      if(old.g[z][x]!==current.g[z][x])changed.push([x,z,old.g[z][x],current.g[z][x]]);
      if(old.hmap[z][x]!==current.hmap[z][x])heights.push([x,z]);
    }
    const fixed=[
      [42,58],[42,59],[43,59],[43,60],[44,58],[44,59],[44,60],[43,61],[58,58],[58,59],
      [41,27],[35,52],[77,43],current.script.lever,...current.script.lift.cells
    ].map(([x,z])=>[x,z,old.g[z][x],current.g[z][x],old.hmap[z][x],current.hmap[z][x]]);
    const visibleAcross=(x,y)=>Array.from({length:37},(_,i)=>!tV(x,y,127.4+i*.2)).every(Boolean);
    return {changed,heights,fixed,identicalScript:JSON.stringify(current.script)===JSON.stringify(old.script),
      oldLane:Array.from({length:13},(_,n)=>[50,51,52].every(x=>old.g[56+n][x]===current.g[56+n][x])),
      meshes:["ashCloisterLavabo","ashCloisterOutlook"].map(name=>[name,!!J.scene.getObjectByName(name)]),
      obstacles:{base:d0(91.25,130.9),clear:!d0(94.5,130.9),lowShot:tV(91.25,ie(91.25,130.9)+.94,130.9),
        overRim:!tV(92.36,ie(92.36,130.9)+1.6,130.9),
        basinScreensLowShots:!visibleAcross(91.25,2.08),eastLineOpen:visibleAcross(94.55,2.08)},
      rises:[55,56,57,58,59,60,61,62,63,64,65,66,67,68].map(z=>ie(94,2*z+1))};
  }
  function place(x,z){
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
    Ct.pitch=0;
  }
  function aim(x,z){Ct.yaw=Math.atan2(C.px-x,C.pz-z);}
  function state(){return {x:C.px,z:C.pz,y:C.pyy,floor:ie(C.px,C.pz),dead:T.dead};}
  let trip;
  function startWalk(points){
    trip={samples:[],done:false};
    const targets=points.slice(1);
    function steer(){
      const [x,z]=targets[0];
      if(Math.hypot(C.px-x,C.pz-z)<.65){
        trip.samples.push(state());targets.shift();
        if(!targets.length){
          trip.done=true;
          window.dispatchEvent(new KeyboardEvent("keyup",{code:"KeyW",key:"w",bubbles:true}));
          return;
        }
      }
      aim(...targets[0]);requestAnimationFrame(steer);
    }
    place(...points[0]);steer();
  }
  function reload(){
    const names=["ashCloisterLavabo","ashCloisterOutlook"];
    const initial=names.map(name=>J.scene.getObjectByName(name)),released={},draws=[];
    for(const object of initial){
      const items=[["geometry",object.geometry],["material",object.material],["texture",object.material.map]];
      for(const [kind,res] of items){
        const key=object.name+" "+kind;released[key]=false;
        res.addEventListener("dispose",()=>{released[key]=true;});
      }
      draws.push({mesh:object.name,triangles:object.geometry.getIndex().count/3});
    }
    rp(9);
    const replacements=names.map((name,i)=>{const found=J.scene.getObjectByName(name);return !!found&&found!==initial[i];});
    return {released,replacements,draws,drawBatches:draws.length,addedLights:initial.reduce((n,o)=>n+o.children.filter(c=>c.isLight).length,0)};
  }
  window.cloisterTest={stage,state,reload,startWalk,trip:()=>trip,ready:()=>Be.started};
}

(async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"blacksilence-washcourt-")),fixture=path.join(tmp,"court.html");
  const html=source.replace(marker,()=>"const oldCloisterMap=gV[9].build;"+marker)
    .replace(seam,()=>"("+probe.toString()+")();"+seam);
  fs.writeFileSync(fixture,html);
  let browser;
  try{
    browser=await chromium.launch({channel:"chrome",headless:true});
    const page=await browser.newPage({viewport:{width:540,height:304},offline:true});
    const errors=[];page.on("pageerror",e=>errors.push(String(e)));
    await page.goto(pathToFileURL(fixture).href,{waitUntil:"domcontentloaded",timeout:90000});
    await page.locator("#mNew").focus();await page.keyboard.press("Enter");
    await page.waitForFunction(()=>cloisterTest.ready(),null,{timeout:45000});
    const report=await page.evaluate(()=>cloisterTest.stage());
    assert(report.changed.length>=55,"a second lane cuts through previously solid map");
    assert(report.changed.every(([x,z,from,to])=>x>=41&&x<=48&&z>=58&&z<=67&&from==="#"&&to==="."));
    assert(report.heights.every(([x,z])=>x>=41&&x<=48&&z>=56&&z<=67));
    assert(report.fixed.every(([, ,a,b,ha,hb])=>a===b&&ha===hb));
    assert(report.identicalScript&&report.oldLane.every(Boolean));
    assert(report.meshes.every(([,present])=>present));
    assert(Object.values(report.obstacles).every(Boolean));
    assert(Math.max(...report.rises)===2.4&&Math.min(...report.rises)===1.2);
    assert(report.rises.slice(1).every((y,i)=>Math.abs(y-report.rises[i])<=.301));
    const routes={
      court:[[94,138],[94.55,133.3],[94.55,128],[94,123],[94,119],[94,114],[94,110]],
      westOfBasin:[[94,138],[89.7,135],[88.2,133.4],[88.1,128.6],[91.6,126],[94,123]],
      processional:[[103,138],[103,133],[103,127],[103,121],[103,115],[103,110]]
    };
    report.traversals={};
    for(const [name,points] of Object.entries(routes)){
      for(const dir of ["out","back"]){
        const pathPoints=dir==="out"?points:[...points].reverse();
        await page.evaluate(p=>cloisterTest.startWalk(p),pathPoints);
        await page.keyboard.down("KeyW");
        try{
          await page.waitForFunction(()=>cloisterTest.trip().done,null,{timeout:50000,polling:"raf"});
        }catch(e){throw new Error(name+" "+dir+" stopped at "+JSON.stringify(await page.evaluate(()=>({state:cloisterTest.state(),trip:cloisterTest.trip()}))),{cause:e});}
        finally{await page.keyboard.up("KeyW");}
        const samples=await page.evaluate(()=>cloisterTest.trip().samples);
        assert(samples.every(s=>!s.dead));
        report.traversals[name+" "+dir]=samples;
      }
    }
    report.reload=await page.evaluate(()=>cloisterTest.reload());
    assert(Object.values(report.reload.released).every(Boolean)&&report.reload.replacements.every(Boolean),"native level reload releases the old resources");
    report.errors=errors;assert.deepEqual(errors,[]);
    if(reportFile)fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify({opened:report.changed.length,graded:report.heights.length,rises:report.rises,traversals:Object.keys(report.traversals),reload:report.reload,errors},null,2));
  }finally{if(browser)await browser.close();fs.unlinkSync(fixture);fs.rmdirSync(tmp);}
})().catch(e=>{console.error(e);process.exitCode=1});
