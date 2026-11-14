// A normal file:// launch in Chromium; no ?qa or different save transport.
// The private fixture exposes placement, native level transitions and state
// reads. New/Continue/Select Chapter, interaction and respawn use real input.
const fs=require("node:fs"), path=require("node:path"), os=require("node:os");
const assert=require("node:assert/strict");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const target=path.resolve(process.env.GAME_HTML||path.join(root,"THE-BLACK-SILENCE.html"));
const work=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-campaign-"));
const file=path.join(work,"game.html"), url=pathToFileURL(file).href;
const storageKey="black-silence.campaign.v1";
const anchor="Jk();ju();Yy();X$(J$);D0t();";
let html=fs.readFileSync(target,"utf8");
assert.equal(html.split(anchor).length,2);
assert(html.includes("black-silence.campaign.v1"),"Campaign module is missing");
const seam=`
window.campaignProbe={
  state(){return {level:T.level,inv:ck(),entry:Q0.entry,snap:Q0.snap,deaths:T.deaths,
    totals:[T.kills,T.shots,T.secrets,T.totSecrets],position:[C.px,C.pz,Ct.yaw],
    elapsed:[performance.now()-T.t0,performance.now()-T.levelT0],ach:Object.keys(T.ach),
    dials:FX().sidereal,seals:[...de.seals],doors:FX().opened,primed:FX().sewerPrimed===true,
    needle:J.scene?.getObjectByName("worksGaugeNeedle")?.rotation.z,locked:Be.inputLock,dead:T.dead,
    marks:Q0.marks.map(m=>m.lit),started:Be.started};},
  pose(x,z,tx,tz,dy=0){C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vz=C.vy=0;C.grounded=true;
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(dy,Math.hypot(tx-x,tz-z));
    J.camera.position.set(x,C.pyy,z);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);if(T.level===0)TR(0,true);},
  calm(){sk();Be.inputLock=false;V5(false);C.spawnGuard=999;for(const e of v.enemies)e.stun=999;},
  next(){oe.phase="card";oe.card=3;uk();Fd();this.calm();},
  supply(){T.ammo.bullets=143;T.ammo.shells=8;T.weapons[1]=true;T.mag[1]=2;T.cur=1;T.hp=61;T.armor=19;},
  extra(){const e=v.enemies.find(e=>!e.boss&&!e.dead);qr(e,e.hp+1,{wIdx:0});
    T.shots+=9;T.beheads=2;},
  collect(kind){const it=v.items.find(i=>i.kind===kind&&!i.taken);
    if(!it)throw Error("Missing collectible "+kind);this.pose(it.x,it.z,it.x+1,it.z);G$(1/60);},
  shrine(i){const m=Q0.marks[i];if(!m)throw Error("Missing shrine "+i);this.pose(m.x,m.z,m.x+1,m.z);
    T0t(C.px,C.pz);QX(1/60);},
  explore(x,z){this.pose(x,z,x+1,z);T0t(x,z);},
  map(){Gk();const layer=document.createElement("canvas");layer.width=We.W*3;layer.height=We.H*3;
    const ctx=layer.getContext("2d");ctx.scale(3,3);Yk(ctx,We,0,0,We.W-1,We.H-1,3);
    return {seen:Array.from(We.seen).flatMap((val,index)=>val?[index]:[]),
      terrain:layer.toDataURL(),level:T.level};},
  death(){C.spawnGuard=0;ta(9999,true);},
  balancePump(){const guard=v.bossRef;if(guard?.dormant)bk(guard);if(v.cine)stt(v.cine.dur+1/60);
    this.calm();this.pose(104,36.58,105.41,36.58,ie(86.72,32.45)+1.38-ie(104,36.58)-Yo);},
  advancePump(){for(let i=0;i<190;i++)F$(1/60);},
  final(){rp(8);h9();}
};`;
fs.writeFileSync(file,html.replace(anchor,()=>seam+anchor));
(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true});
  const context=await browser.newContext({viewport:{width:960,height:600}});
  const checks=[],errors=[];
  let lastAction="initial menu";
  function watch(page){page.on("pageerror",e=>{
    errors.push({action:lastAction,url:page.url(),message:e.message,stack:e.stack});
  });}
  const page=await context.newPage(); watch(page);
  const freshPage=async()=>{const p=await context.newPage();watch(p);await p.goto(url);return p;};
  const call=(name,...args)=>{lastAction=name;return page.evaluate(([name,args])=>campaignProbe[name](...args),[name,args]);};
  const settle=async p=>{
    await p.waitForTimeout(160);
    await p.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});
    await p.waitForTimeout(100);
  };
  const data=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
  const reload=async()=>{lastAction="reload";await settle(page);await page.reload();await page.locator("#mContinue").waitFor();};
  const begin=async(id)=>{lastAction="begin "+id;await page.locator(id).click();await page.waitForFunction(()=>campaignProbe.state().started);await call("calm");};
  const note=(name)=>{checks.push(name);console.log("PASS",name);};
  try {
    await page.goto(url);
    assert.equal(await page.locator("#mContinue").count(),0);
    await begin("#mNew");
    const initial=await data();
    assert(initial && !initial.shrine && initial.level===0 && initial.entry.mag[0]===6);
    await reload(); assert.match(await page.locator("#mContinue").innerText(),/OUT OF THE PIT.*CHAPTER START/s);
    await begin("#mContinue");
    assert.deepEqual((await call("state")).entry,initial.entry);
    await page.waitForFunction(()=>document.pointerLockElement===document.getElementById("game"));
    const yaw=await call("state").then(state=>state.position[2]);
    await page.mouse.move(590,270);
    await page.waitForFunction(yaw=>Math.abs(campaignProbe.state().position[2]-yaw)>.001,yaw);
    note("New Game and a fresh document restore the Prologue entry inventory");
    await call("explore",59,13);await call("explore",19,13);
    await call("pose",66.18,10.60,68,11,.2); await page.keyboard.press("KeyE");
    assert((await call("state")).doors.includes("34,5"),"Real E opens the vigil shutter");
    await call("supply"); await call("extra"); await call("shrine",0);
    const vigil=await data(); assert(vigil.shrine && vigil.shrine.facts.opened.includes("34,5"));
    await page.keyboard.down("Tab");await page.locator("#automap").waitFor();
    const litMap=await call("map");await page.keyboard.up("Tab");
    await reload(); assert.match(await page.locator("#mContinue").innerText(),/SHRINE/);
    if(process.env.CAMPAIGN_PROOF) {
      const out=path.resolve(process.env.CAMPAIGN_PROOF); fs.mkdirSync(out,{recursive:true});
      for(const [width,height] of [[1280,720],[800,460]]) {
        await page.setViewportSize({width,height});
        await page.screenshot({path:path.join(out,"menu-"+width+".png")});
        const button=await page.locator("#mContinue").boundingBox();
        assert(button && button.y>=0 && button.y+button.height<=height);
      }
      await page.setViewportSize({width:960,height:600});
    }
    await begin("#mContinue");
    let st=await call("state");
    await page.keyboard.press("KeyM");await page.locator("#automap").waitFor();
    const freshMap=await call("map");await page.keyboard.press("KeyM");
    assert.deepEqual(freshMap.seen,litMap.seen,"A fresh document restores exactly the discovered cells");
    assert.equal(freshMap.terrain,litMap.terrain,"Native terrain-layer pixels survive the page reload");
    assert(litMap.seen.length>50 && litMap.seen.length<3000);
    assert.deepEqual(st.inv,vigil.shrine.inv); assert.deepEqual(st.ach,vigil.achievements);
    assert(st.doors.includes("34,5") && st.marks[0]&&!st.dead);
    assert.equal(st.totals[1],vigil.shrine.tallies.shots);
    assert(st.elapsed[1]>=vigil.levelMs && st.elapsed[1]<vigil.levelMs+7000);
    assert.deepEqual(st.position,[vigil.shrine.at.x,vigil.shrine.at.z,vigil.shrine.at.yaw]);
    await call("pose",66.18,10.60,68,11,.2); await page.keyboard.press("KeyE");
    assert.equal((await call("state")).totals[3],vigil.shrine.inv.totSecrets);
    await call("death");await page.waitForTimeout(1100);await page.keyboard.press("Space");
    await page.waitForFunction(()=>!campaignProbe.state().dead);
    assert.equal((await call("state")).deaths,1);assert.equal((await data()).deaths,1);
    assert.deepEqual((await call("map")).seen,litMap.seen);
    note("Real Tab/M, shrine reload and native Rise Again preserve the explored cells and terrain pixels");
    note("Real E, map facts, inventory, clock, achievements and native shrine respawn survive reload");
    await call("next");
    const monastery=await data();
    assert.equal(monastery.level,9);assert(!monastery.shrine);
    assert((await call("map")).seen.length<litMap.seen.length);
    assert.deepEqual(monastery.entry.mag,vigil.shrine.inv.mag);
    await reload();await begin("#mContinue");st=await call("state");
    assert.equal(st.level,9);assert.deepEqual(st.inv.mag,monastery.entry.mag);
    await call("collect","seal_ash");await call("pose",152.28,89.8,152.28,88.38,.3);
    await page.keyboard.press("KeyE");
    const turned=(await call("state")).dials;
    assert.deepEqual(turned,[1,2]);
    await call("shrine",0);const partial=await data();
    assert.deepEqual(partial.shrine.facts.sidereal,turned);
    await reload();await begin("#mContinue");st=await call("state");
    assert.deepEqual(st.dials,turned);assert(st.seals.includes("seal_ash"));
    note("Native chapter transition, carried weapons, real dial input and a collected seal round-trip");
    await call("next"); const crypt=await data();assert.equal(crypt.level,1);assert(!crypt.shrine);
    await reload();await begin("#mContinue");assert.equal((await call("state")).level,1);
    note("A second campaign transition resumes the Gothic Dungeon from chapter start");
    if(html.includes("/* SEWER_WORKS_END */")) {
      while((await call("state")).level!==5) await call("next");
      await call("balancePump");
      await page.keyboard.press("KeyE");await call("advancePump");
      const pressure=await call("state");assert(pressure.primed);
      await call("shrine",0);await reload();await begin("#mContinue");st=await call("state");
      assert(st.primed&&!st.doors.includes("53,19"));
      assert(Number.isFinite(st.needle) && Math.abs(st.needle-pressure.needle)<.13);
      await call("pose",104.5,39,106.99,39,-.75);await page.keyboard.press("KeyE");
      await call("advancePump");const beforeReward=await call("state");
      assert(beforeReward.doors.includes("53,19"));
      await call("collect","w6");await call("shrine",1);
      const earned=await data();assert(earned.shrine.inv.weapons[6]);
      await reload();await begin("#mContinue");const returned=await call("state");
      assert(returned.primed&&returned.inv.weapons[6]&&returned.doors.includes("53,19"));
      await call("pose",104.5,39,106.99,39,-.75);await page.keyboard.press("KeyE");
      assert.equal((await call("state")).totals[3],earned.shrine.inv.totSecrets);
      const corrupt=JSON.parse(JSON.stringify(earned));corrupt.shrine.facts.sewerPrimed={};
      await page.evaluate(([key,r])=>localStorage.setItem(key,JSON.stringify(r)),[storageKey,corrupt]);
      await page.reload();assert.equal(await page.locator("#mContinue").count(),0);
      await page.evaluate(([key,r])=>localStorage.setItem(key,JSON.stringify(r)),[storageKey,crypt]);
      await reload();await begin("#mContinue");
      note("Sewers pressure, gauge, secret door and single reward restore after actual document reload");
    }
    const other=await freshPage();
    await other.locator("#mChapter").click();await other.locator("#chaplist .mbtn").first().click();
    assert.deepEqual(await data(),crypt);await settle(other);await other.close();
    const qa=await context.newPage();watch(qa);await qa.goto(url+"?qa=1");
    await qa.locator("#mNew").click();assert.deepEqual(await data(),crypt);await settle(qa);await qa.close();
    note("Chapter Select and QA do not replace the campaign slot");
    const old=await freshPage();await old.locator("#mContinue").click();await settle(old);
    await page.reload();await begin("#mNew");const separate=await data();
    assert.notEqual(separate.id,crypt.id);
    await old.evaluate(()=>{campaignProbe.calm();campaignProbe.shrine(0);campaignProbe.final();});
    assert.deepEqual(await data(),separate);await settle(old);await old.close();
    note("An older tab cannot replace or clear a newer campaign");
    await call("final");assert.equal(await data(),null);
    await page.reload();assert.equal(await page.locator("#mContinue").count(),0);
    note("Victory in the final chapter clears the campaign slot");
    await page.evaluate(([key,value])=>localStorage.setItem(key,value),[storageKey,"{broken"]);
    await page.reload();assert.equal(await page.locator("#mContinue").count(),0);
    await page.evaluate(([key,r])=>{r.shrine.tallies.unexpected="<b>";localStorage.setItem(key,JSON.stringify(r));},[storageKey,vigil]);
    await page.reload();assert.equal(await page.locator("#mContinue").count(),0);
    await page.evaluate(([key,r])=>{r.shrine.at.x=8000;localStorage.setItem(key,JSON.stringify(r));},[storageKey,vigil]);
    await reload();await begin("#mContinue");st=await call("state");
    assert(!st.snap && st.level===0 && st.inv.hp===vigil.entry.hp);
    note("Malformed saves and map-incompatible shrines leave a playable chapter entry");
    for (const kind of ["changed","old"]) {
      await page.evaluate(([key,r,kind])=>{
        if(kind==="old")delete r.shrine.automap;
        else r.shrine.automap.data="AAAA";
        localStorage.setItem(key,JSON.stringify(r));
      },[storageKey,vigil,kind]);
      await reload();await begin("#mContinue");st=await call("state");
      assert(st.marks[0] && st.doors.includes("34,5"));
      assert.deepEqual(st.inv,vigil.shrine.inv);
      const after=await call("map");assert(after.seen.length<litMap.seen.length);
      assert(after.seen.every(i=>litMap.seen.includes(i)));
    }
    note("Damaged automap payloads and older shrine records still restore the shrine and inventory");
    const blocked=await browser.newContext();const denied=await blocked.newPage();watch(denied);
    await denied.addInitScript(()=>Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Denied","SecurityError");}}));
    await denied.goto(url);assert.equal(await denied.locator("#mContinue").count(),0);
    await denied.locator("#mNew").click();assert(await denied.evaluate(()=>campaignProbe.state().started));
    await settle(denied);
    await blocked.close();note("Storage denial leaves the native New Game playable");
    assert.deepEqual(errors,[]);
    const report={passed:true,htmlSha256:require("node:crypto").createHash("sha256").update(fs.readFileSync(target)).digest("hex"),checks};
    if(process.env.CAMPAIGN_REPORT)fs.writeFileSync(process.env.CAMPAIGN_REPORT,JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
