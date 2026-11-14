// Same-camera native geometry and real left/right mouse, E and walking tests.
// Accepts either a shipped HTML or the previous game with this module injected.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const root=path.resolve(__dirname,"..");
const input=path.resolve(process.argv[2]||path.join(root,"THE-BLACK-SILENCE.html"));
const out=path.resolve(process.argv[3]||path.join(root,".dream-loop","dungeon-sally-proof"));
const html=fs.readFileSync(input,"utf8"),moduleText=fs.readFileSync(path.join(root,"src/dungeon-sally-port.js"),"utf8").trim();
const hash=text=>crypto.createHash("sha256").update(text).digest("hex");
const anchor="Jk();ju();Yy();X$(J$);D0t();",mark="/* DUNGEON_SALLY_PORT_BEGIN */";
assert.equal(html.split(anchor).length,2);
const integrated=html.includes(mark);assert(!integrated||html.includes(moduleText),"Test the identical environment module");
const candidate=integrated?html:html.replace(anchor,()=>moduleText+"\n"+anchor);
const capturePrevious="window.__dungeonBefore=gV[1].build;\n";
function instruments(){
  const cell="17,21",cx=34,cz=43;
  function prop(){return v.props.find(p=>p.m.name==="sallyPortOakKeeper");}
  function setView(x,z,tx,tz,ty){
    C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vy=C.vz=0;C.grounded=true;C.spawnGuard=100;
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(ty-C.pyy,Math.hypot(tx-x,tz-z));
    J.camera.position.set(x,C.pyy,z);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);
    if(v.zones)TR(0,true);
  }
  function settle(){
    sk();if(v.bossRef?.dormant)bk(v.bossRef);
    if(v.cine)stt(v.cine.dur+.1);
    V5(false);Be.inputLock=false;C.spawnGuard=100;for(const e of v.enemies)if(!e.boss)e.dormant=true;
    T.cur=0;St.wstate="idle";St.wtime=St.wCool=0;Ct.firing=false;T.mag[0]=6;
    for(const n of ["subt","lvltitle","bossTitle","barTop","barBot"]){const d=Jt(n);if(d)d.style.visibility="hidden";}
  }
  function load(n=1){rp(n);settle();}
  function state(){
    const d=v.doors[cell],co=J.scene.getObjectByName("sallyPortIronGrate");
    return {closed:!!d&&!d.open,keeper:prop()?.dead,glide:co?.position.y,fall:J.scene.getObjectByName("sallyPortWeight")?.position.y,
      shut:fu(cx+1,cz),count:T.secrets,total:T.secretsTotal,broken:T.propsBroken,oldDoors:Object.keys(v.doors).filter(k=>k!==cell),
      key:T.key,ammo:T.mag[0],warden:v.enemies.filter(e=>e.key==="U").length,marks:Q0.marks.map(q=>[q.x,q.z]),
    x:C.px,z:C.pz,locked:v.doors["43,24"]?.locked,gate:v.doors["43,24"]?.open,feedback:Jt("msg").textContent,
    blockedInput:Be.inputLock,paused:Wk(),overlay:Qm(),busy:oo.busy,started:Be.started};
  }
  function tick(n){for(let i=0;i<n;i++){m_(1/60);v$(1/60);C$(1/60);F$(1/60);G$(1/60);}}
  function aim(name){
    const p=prop(),frontal=name.startsWith("front");
    if(name.endsWith("Door"))return setView(frontal?cx-1.12:cx+2.92,cz,cx+1,cz,1);
    if(name==="armoury")return setView(84.9,49,87,49,1);
    if(name==="key")return setView(25,35,26,35,1);
    const x=frontal?32.04:36.59;setView(x,p.z,p.x,p.z,.65);
  }
  function mapDiff(){
    const run=build=>{const rand=Math.random;let seed=2403;Math.random=()=>{seed=Math.imul(seed,1664525)+1013904223|0;return (seed>>>0)/4294967296;};try{return build();}finally{Math.random=rand;}};
    const a=run(__dungeonBefore),b=run(gV[1].build);
    const change=(a,b)=>a.flatMap((r,z)=>r.flatMap((v,x)=>v===b[z][x]?[]:[[x,z,v,b[z][x]]]));
    const {g:ga,cmap:ca,decor:da,...aa}=a,{g:gb,cmap:cb,decor:db,...bb}=b;
    return {grid:change(ga,gb),ceiling:change(ca,cb),others:JSON.stringify(aa)===JSON.stringify(bb),
      decor:da.filter(d=>!db.some(e=>JSON.stringify(d)===JSON.stringify(e))),added:db.filter(d=>!da.some(e=>JSON.stringify(d)===JSON.stringify(e)))};
  }
  function feel(){
    const out={};
    for(const [name,sy,sz] of [["gap",.99,.14],["bar",.99,.28],["brace",.54,.14],["jamb",1,1.19],["highStone",2.63,.44],["sideWall",1,1.85]]){
      const y=sy*1.3,z=cz+sz*1.52;
      const points=[];for(let x=cx-.12;x<cx+2.2;x+=.025)if(tV(x,y,z))points.push(x);
      out[name]=points.length>0;
    }
    return out;
  }
  // Use both native weapon dispatches and a diagnostic per-ray target immediately behind the opening.
  function ballistics(){
    const p=prop(),results=[];
    for(const [name,sy,sz] of [["opening",.99,.14],["upright",.99,.28],["lower crossbar",.54,.14],["side jamb",1,1.19]]){
      const y=sy*1.3,z=cz+sz*1.52,x=32.1,goal=36.9;
      let reports={name};
      for(const weapon of ["bullet","stake"]){
        const dummy={x:goal,z,r:.16,hgt:y+.4,hp:500,dead:false,explosive:false,m:new n0()};
        v.props.push(dummy);setView(x,z,goal,z,y);J.camera.position.y=y;
        if(weapon==="bullet")Ww(new Y(1,0,0),5,0);
        else{
          R$(new Y(1,0,0),5);
          const shot=yc.at(-1);
          for(let i=0;i<80 && yc.includes(shot);i++)C$(1/300);
          if(yc.includes(shot))F1(shot,yc.indexOf(shot));
        }
        reports[weapon]=dummy.dead||dummy.hp<500;
        v.props.splice(v.props.indexOf(dummy),1);
        if(weapon==="stake" && dummy.dead){T.propsBroken--; /* Remove random native debris reward from the probe. */}
      }
      results.push(reports);
    }
    if(p.dead)throw Error("Ballistic probes damaged keeper");
    return results;
  }
  function observeDisposal(){
    const root=J.scene.getObjectByName("gaolerSallyPort"),p=prop(),set=new Set();let mesh=0,tris=0,lights=0;
    for(const group of [root,p.m])group.traverse(o=>{
      if(o.isLight)lights++;
      if(!o.isMesh)return;
      mesh++;tris+=(o.geometry.index?.count??o.geometry.getAttribute("position").count)/3;set.add(o.geometry);set.add(o.material);
      if(o.material.map)set.add(o.material.map);
    });
    window.__sallyResources=[...set].map(o=>{const record={type:o.type,count:0};o.addEventListener("dispose",()=>record.count++);return record;});
    return {meshes:mesh,triangles:tris,lights,resources:set.size};
  }
  function frame(coords){
    V5(false);setView(...coords);
    // These movement ticks settle the actual player's lamp, camera bob and
    // warm centre light in the new spot, as ordinary gameplay does.
    for(let i=0;i<48;i++)m_(1/60);
    V5(true);Jt("pause").classList.add("hidden");Jt("msg").style.visibility="hidden";
    Jt("bossbar").style.visibility="hidden";
  }
  function prepareKick(){
    const q=window.__BLACK_SILENCE_QA;q.resetCombat();T.kickCd=0;Be.inputLock=false;V5(false);
    for(const old of v.enemies)J.scene.remove(old.sp,old.blob);v.enemies.length=0;
    setView(28.72,43,34.5,43,Yo);
    const actor=Du("z",32.72,43,true);
    Object.assign(actor,{hp:200,maxhp:200,aware:true,flingCD:100,cool:10,flank:0});
    window.__sallyKickActor=actor;return !fu(C.px,C.pz)&&!d0(actor.x,actor.z);
  }
  function fly(){
    const e=window.__sallyKickActor,trail=[];
    for(let i=0;i<230;i++){
      if(i===50)li.KeyS=true;
      if(i===94)li.KeyS=false;
      m_(1/60);v$(1/60);qtt(1/60);C.spawnGuard=100;
      trail.push({x:e.x,z:e.z,flung:e.flung,stun:e.stun,hp:e.hp,solid:d0(e.x,e.z)});
    }
    const launch=trail.find(s=>s.flung>0),land=launch&&trail.slice(trail.indexOf(launch)+1).find(s=>s.flung===0);
    return {launch,land,last:trail.at(-1),maxX:Math.max(...trail.map(s=>s.x)),touchedSolid:trail.some(s=>s.solid)};
  }
  window.__sallyTest={state,tick,aim,feel,mapDiff,ballistics,setView,load,frame,observeDisposal,settle,
    prepareKick,fly,sprint(){for(let i=0;i<13;i++)m_(1/60);return Math.hypot(C.vx,C.vz);},
    isDrop(){return !!window.__BLACK_SILENCE_QA.melee()?.drop;},
    render(){Fk(performance.now());},
    disposed:()=>window.__sallyResources, fire(on){Ct.firing=on;},walkTick(){const down=li.KeyW;tick(32);return {down,x:C.px,z:C.pz};},
    resume(){V5(false);Jt("msg").style.visibility="";},facts:FX,
    restore(f){a_(f);},openAll(){for(let i=0;i<90;i++)F$(1/60);},
    arm(n){T.cur=n;T.weapons[n]=true;T.mag[n]=Th[n].magSize;St.wstate="idle";St.wCool=0;},shootPrison(){
      aim("back");const p=prop();Ww(J.camera.getWorldDirection(new Y()),60,4);R$(J.camera.getWorldDirection(new Y()),60);
      for(let i=0;i<120;i++)C$(1/240);return [p.hp,p.dead];},
    save(){const m=Q0.marks[0];setView(m.x,m.z,m.x+1,m.z,ie(m.x,m.z)+1);QX(.016);return Q0.snap;},
    dieRise(){C.spawnGuard=0;ta(10000,true);if(!T.dead||!s_())throw Error("Native shrine rise failed");C.spawnGuard=100;settle();},
    scores(){return [T.secrets,T.totSecrets,T.propsBroken];}, pausedFixed(){V5(true);const y=state().glide;tick(15);V5(false);return [y,state().glide];},
  };
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"dungeon-sally-"));
const fixture=path.join(temp,"stage.html");
const oldFile=process.argv[4]&&path.resolve(process.argv[4]),priorStage=path.join(temp,"prior.html");
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(fixture,candidate.replace(mark,()=>capturePrevious+mark).replace(anchor,()=>"("+instruments.toString()+")();"+anchor));
(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true});
  try{
    let page=await browser.newPage({viewport:{width:1280,height:720}});
    page.setDefaultNavigationTimeout(90000);page.setDefaultTimeout(60000);
    const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
    await page.goto(pathToFileURL(fixture).href+"?qa=1");await page.locator("#mNew").click();await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.Be.started);
    const call=(name,...args)=>page.evaluate(([n,...a])=>__sallyTest[n](...a),[name,...args]);
    const press=()=>page.keyboard.press("KeyE");
    const shot=async(name,args)=>{await call("frame",args);await call("render");await page.waitForTimeout(175);await page.screenshot({path:path.join(out,name+".png")});await call("resume");};
    const front=[27.7,42.45,34,43.2,1.60],near=[29.8,43.8,34,43.04,1.68],rear=[41.45,46.25,35.4,43.1,1.45],side=[28.15,37.55,34.3,43.1,1.58];
    if(oldFile){
      const old=fs.readFileSync(oldFile,"utf8");assert(!old.includes(mark)&&old.includes(anchor));
      fs.writeFileSync(priorStage,old.replace(anchor,()=>"("+instruments.toString()+")();"+anchor));
      const next=page;page=await browser.newPage({viewport:{width:1280,height:720}});
      page.setDefaultNavigationTimeout(90000);page.setDefaultTimeout(60000);
      await page.route(/^https?:/,r=>r.abort());await page.goto(pathToFileURL(priorStage).href+"?qa=1");
      await page.locator("#mNew").click();await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.Be.started);
      await page.evaluate(()=>{requestAnimationFrame=()=>1;});await page.waitForTimeout(160);await call("load",1);
      await shot("before-port",front);await shot("before-keepers-face",near);await shot("before-prison-face",rear);await shot("before-key-approach",side);
      await page.close();page=next;
    }
    await page.evaluate(()=>{requestAnimationFrame=()=>1;});await page.waitForTimeout(160);
    await call("load",1);
    const diff=await call("mapDiff");assert(diff.others);assert.deepEqual(diff.grid.map(r=>r.slice(0,3)),[[17,20,"#"],[17,21,"#"],[17,22,"#"]]);
    assert.deepEqual(diff.decor.map(d=>[d.k,d.x,d.z]),[["brazier",16,20]]);assert.equal(diff.added.length,0);
    const shape=await call("observeDisposal");assert(shape.triangles<15000&&shape.meshes<16&&shape.lights===0,JSON.stringify(shape));
    await shot("sally-port",front);await shot("keepers-face",near);await shot("prison-face",rear);await shot("key-approach",side);
    // Native input is still dispatched by Chromium. Manual simulation ticks make
    // the two contact frames comparable on a busy machine, and avoid a second
    // RAF entering the nearby Guardian cinematic between staged positions.
    await call("settle");
    const initial=await call("state");assert(initial.closed&&initial.shut&&initial.warden===1&&initial.locked&&initial.marks.length===2);
    await call("aim","backDoor");await press();const barred=await call("state");assert(barred.closed&&barred.feedback.includes("OTHER SIDE"),JSON.stringify(barred));
    await call("aim","frontDoor");await press();assert((await call("state")).feedback.includes("ROTTEN OAK"));
    const blockedShots=await call("shootPrison");assert.deepEqual(blockedShots,[14,false]);
    await page.mouse.click(640,360,{button:"right"});await call("tick",36);assert(!(await call("state")).keeper);
    const shotPaths=await call("feel");assert.deepEqual(shotPaths,{gap:false,bar:true,brace:true,jamb:true,highStone:true,sideWall:true});
    const ballistics=await call("ballistics");for(const b of ballistics)assert.equal(b.bullet,b.name==="opening",JSON.stringify(b));
    for(const b of ballistics)assert.equal(b.stake,b.name==="opening",JSON.stringify(b));
    await call("load",1);const dispose=await call("disposed");assert(dispose.every(d=>d.count===1),JSON.stringify(dispose));
    // Shoot the chock through the ordinary weapon input, then walk both ways.
    await call("aim","front");await page.mouse.down();await call("tick",2);await page.mouse.up();
    const impact=await call("state");assert(impact.keeper&&impact.count===1&&impact.broken===1,JSON.stringify(impact));
    await call("tick",8);const lifting=await call("state");assert(lifting.shut&&lifting.glide<1.88);
    const pause=await call("pausedFixed");assert.equal(pause[1],pause[0]);await call("tick",90);const opened=await call("state");assert(!opened.shut&&!opened.closed&&opened.fall<.5);
    await shot("sally-open",front);await shot("open-prison-side",rear);
    const walks=[];
    for(const [x,tx] of [[33.2,37.2],[37.1,32.8]]){
      await call("setView",x,43,tx,43,1);await page.keyboard.down("KeyW");const end=await call("walkTick");await page.keyboard.up("KeyW");walks.push(end);assert(end.down);
      assert(x<34?end.x>35.7:end.x<34.45,JSON.stringify(end));
    }
    await call("aim","armoury");await press();assert(!(await call("state")).gate,"Shortcut cannot bypass the armoury key");
    const saved=await call("save");assert(saved.facts.opened.includes("17,21"));assert(saved.facts.broken.length>0);
    const tallies=await call("scores");await call("dieRise");assert.deepEqual(await call("scores"),tallies);assert(!(await call("state")).shut);
    // The same route is discoverable by a standing kick without spending ammunition.
    await call("load",1);await call("aim","front");await page.mouse.click(640,360,{button:"right"});await call("tick",45);
    const kicked=await call("state");assert(kicked.keeper&&kicked.ammo===6&&kicked.count===1,JSON.stringify(kicked));await call("openAll");
    const legacy={...saved.facts,opened:saved.facts.opened.filter(k=>k!=="17,21"),broken:[]};
    await call("load",1);await call("restore",legacy);assert((await call("state")).closed);
    const stays=[];for(const level of [5,1,0,1]){if(level!==1)await call("observeDisposal");await call("load",level);if(level!==1){const old=await call("disposed");assert(old.every(d=>d.count===1));stays.push(old.length);}}
    const flights=[];
    for(const open of [false,true]){
      await call("load",1);
      if(open){await call("aim","front");await page.mouse.down();await call("tick",2);await page.mouse.up();await call("openAll");}
      assert(await call("prepareKick"));await page.keyboard.down("ShiftLeft");await page.keyboard.down("KeyW");
      assert((await call("sprint"))>7);await page.mouse.click(640,360,{button:"right"});assert(await call("isDrop"));
      await page.keyboard.up("KeyW");await page.keyboard.up("ShiftLeft");const path=await call("fly");flights.push({open,...path});
      assert(path.launch&&path.land&&path.last.hp>0&&path.last.flung<=0&&path.last.stun<=0&&!path.touchedSolid,JSON.stringify(path));
      assert(open?path.maxX>36.25:path.maxX<34,JSON.stringify(path));
      assert(Math.hypot(path.last.x-path.land.x,path.last.z-path.land.z)>.15,"AI recovers after landing");
    }
    assert.deepEqual(errors,[]);assert.equal(hash(fs.readFileSync(input,"utf8")),hash(html));
    const report={inputSHA256:hash(html),candidateSHA256:hash(candidate),moduleSHA256:hash(moduleText),integrated,diff,shape,initial,barred,blockedShots,shotPaths,ballistics,impact,lifting,pause,opened,walks,kicked,flights,tallies,legacyClosed:true,disposed:stays,errors};
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(report,null,2)+"\n");console.log("PASS",JSON.stringify({shape,walks,ballistics,hash:hash(candidate)}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.unlinkSync(fixture);if(fs.existsSync(priorStage))fs.unlinkSync(priorStage);fs.rmdirSync(temp);});
