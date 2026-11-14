// Read a prior, shipped game into an isolated page, then replace the same
// document with the new game. Each Continue runs the real offline campaign menu.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict");
const crypto=require("node:crypto"),{pathToFileURL}=require("node:url"),{chromium}=require("playwright");
const root=path.resolve(__dirname,".."),args=process.argv.slice(2);
if(args.length!==3)throw Error("Expected pre-port.html new-game.html output-directory");
const old=fs.readFileSync(path.resolve(args[0]),"utf8"),fresh=fs.readFileSync(path.resolve(args[1]),"utf8");
assert(!old.includes("/* DUNGEON_SALLY_PORT_BEGIN */"));
const mod=fs.readFileSync(path.join(root,"src/dungeon-sally-port.js"),"utf8").trim();
const anchor="Jk();ju();Yy();X$(J$);D0t();",candidate=fresh.includes(mod)?fresh:fresh.replace(anchor,()=>mod+"\n"+anchor);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"gaoler-upgrade-")),file=path.join(tmp,"game.html");
const url=pathToFileURL(file).href,out=path.resolve(args[2]);fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
function probe(){
  function calm(){
    sk();if(v.bossRef?.dormant)bk(v.bossRef);if(v.cine)stt(v.cine.dur+.1);
    V5(false);Be.inputLock=false;C.spawnGuard=999;for(const e of v.enemies)e.stun=999;
  }
  function pose(x,z,tx=x+1,tz=z,h=1){
    C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vy=C.vz=0;C.grounded=true;
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(h-C.pyy,Math.hypot(tx-x,tz-z));
    J.camera.position.set(x,C.pyy,z);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);
  }
  function shrine(i){
    const m=Q0.marks[i];pose(m.x,m.z);T0t(C.px,C.pz);QX(1/60);
  }
  function state(){
    Gk();
    return {level:T.level,id:JSON.parse(localStorage.getItem("black-silence.campaign.v1"))?.id,
      inv:ck(),x:C.px,z:C.pz,secrets:T.secrets,tallies:[T.totSecrets,T.propsBroken],facts:FX(),map:Q0.snap?.automap?.layout,
      discovered:[...We.seen].flatMap((b,i)=>b?[i]:[]),bits:[20,21,22].map(z=>We.seen[z*We.W+17]),width:We.W,
      props:v.props.map(p=>[p.kind||p.stuff||"prop",p.x,p.z,p.dead]),open:v.doors["17,21"]?.open??null,
      finished:!!Be.started,marks:Q0.marks.map(p=>p.lit),overlay:Qm()};
  }
  window.__gateCampaign={calm,pose,shrine,state,next(){oe.phase="card";oe.card=3;uk();Fd();calm();},
    makeLegacySave(){
      const key=v.items.find(i=>i.kind==="key");pose(key.x,key.z);G$(1/60);
      T.hp=64;T.armor=27;T.mag[0]=3;T.ammo.bullets=67;
      const obj=v.props.find(p=>!p.dead);fr(obj);T0t(7,11);T0t(33,43);T0t(33,45);
      const d=v.doors["9,13"];d.open=true;shrine(0);return state();
    },
    aim(){calm();St.wstate="idle";St.wtime=St.wCool=0;T.cur=0;Ct.firing=false;
      const p=v.props.find(o=>o.m.name==="sallyPortOakKeeper");pose(32,p.z,p.x,p.z,.65);},
    ticks(n){for(let i=0;i<n;i++){v$(1/60);F$(1/60);}},
    beyond(){pose(37.4,43);T0t(C.px,C.pz);shrine(1);},
  };
}
function stage(content){
  assert.equal(content.split(anchor).length,2);
  fs.writeFileSync(file,content.replace(anchor,()=>"("+probe.toString()+")();"+anchor));
}
(async()=>{const browser=await chromium.launch({channel:"chrome",headless:true});
  try{
    const ctx=await browser.newContext({offline:true,viewport:{width:960,height:540}}),errors=[];
    let page;async function newPage(content,button){
      if(page){await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});await page.waitForTimeout(80);await page.close();}
      stage(content);page=await ctx.newPage();page.setDefaultNavigationTimeout(90000);page.setDefaultTimeout(60000);page.on("pageerror",err=>errors.push(err.message));
      await page.goto(url);await page.locator(button).click();await page.waitForFunction(()=>__gateCampaign.state().finished);
      await page.evaluate(()=>{requestAnimationFrame=()=>1;});await page.waitForTimeout(120);await page.evaluate(()=>__gateCampaign.calm());
    }
    const call=(n,...args)=>page.evaluate(([n,a])=>__gateCampaign[n](...a),[n,args]);
    await newPage(old,"#mNew");
    await call("next");await call("next");assert.equal((await call("state")).level,1);
    const before=await call("makeLegacySave");
    assert(before.inv.key&&before.inv.hp===64&&before.inv.mag[0]===3&&before.marks[0]);assert(before.discovered.includes(5*58+3));assert(before.bits.some(Boolean));
    await newPage(candidate,"#mContinue");
    const imported=await call("state");assert.equal(imported.open,false);assert(["7a18b2bb","269c7657"].includes(imported.map));
    for(const k of ["level","id","inv","x","z","secrets","tallies","marks"])assert.deepEqual(imported[k],before[k],k);
    assert.deepEqual(imported.props.slice(0,-1),before.props);assert.deepEqual(imported.facts,before.facts);
    const avoid=[20,21,22].map(z=>z*58+17);
    const kept=before.discovered.filter(i=>!avoid.includes(i));
    assert.deepEqual(imported.bits,[0,0,0]);
    const missing=kept.filter(i=>!imported.discovered.includes(i)),unexpected=imported.discovered.filter(i=>!kept.includes(i));
    assert(!missing.length&&!unexpected.length,`Legacy map lost ${missing.length} cells (first ${missing.slice(0,5)}); gained ${unexpected.length} cells (first ${unexpected.slice(0,5)})`);
    await call("aim");await page.mouse.down();await call("ticks",2);await page.mouse.up();await call("ticks",85);
    assert((await call("state")).open);await call("beyond");const earned=await call("state");
    assert.equal(earned.map,"269c7657");assert(earned.bits.some(Boolean));
    assert.equal(earned.secrets,before.secrets+1);assert.equal(earned.inv.mag[0],before.inv.mag[0]-1);
    const resumes=[];
    for(let i=0;i<2;i++){
      await newPage(candidate,"#mContinue");const restored=await call("state");
      for(const field of ["id","inv","open","x","z","secrets","tallies","facts","map","discovered","marks"])
        assert.deepEqual(restored[field],earned[field],field);
      resumes.push({x:restored.x,z:restored.z,secrets:restored.secrets,broken:restored.facts.broken,mag:restored.inv.mag[0],seen:restored.discovered.length});
    }
    assert.deepEqual(errors,[]);const report={oldSHA256:hash(old),inputSHA256:hash(fresh),candidateSHA256:hash(candidate),
      oldMap:before.map,newMap:earned.map,oldSeen:before.discovered.length,importedSeen:imported.discovered.length,oldDoorBits:before.bits,newDoorBits:imported.bits,
      oldPropIndices:before.facts.broken,originalPropCount:before.props.length,unchangedOldProps:imported.props.length-1,idPreserved:before.id===imported.id,
      initKey:before.inv.key,initialMagazine:before.inv.mag[0],initArmor:before.inv.armor,initHP:before.inv.hp,twoRestarts:resumes,errors};
    fs.writeFileSync(path.join(out,"campaign-upgrade.json"),JSON.stringify(report,null,2)+"\n");console.log("PASS",JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(tmp);});
