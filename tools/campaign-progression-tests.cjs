// Play every authored chapter in sequence from New Game through victory.
// node tools/campaign-progression-tests.cjs [game.html] [output-directory]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const input = path.resolve(process.argv[2] || process.env.GAME_HTML || path.join(root, "THE-BLACK-SILENCE.html"));
const folder = path.resolve(process.argv[3] || path.join(root, ".dream-loop", "campaign-progression"));
fs.mkdirSync(folder,{recursive:true});
const source = fs.readFileSync(input, "utf8");
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
assert.equal(source.split(anchor).length, 2);
const fixture = path.join(folder,"navigation.html");
assert.notEqual(path.normalize(fixture).toLowerCase(),path.normalize(input).toLowerCase());
const sha = createHash("sha256").update(source).digest("hex");

const probe = `
window.campaignRoute = (() => {
  const dt = 1/60, cardinal = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const distanceTo=(x,z)=>Math.hypot(x-C.px,z-C.pz);
  const records=()=>({
    index:Kg(T.level), level:T.level, name:mh(T.level), position:[C.px,C.pz],
    phase:oe.phase, card:oe.card, cardAfter:pc.cardAfter,
    started:Be.started, locked:Be.inputLock, dead:T.dead, won:T.won,
    bell:de.bell,
    exit:v.exitPos, opened:Object.keys(v.doors).filter(key=>v.doors[key].open),
    acquired:v.items.filter(item=>item.taken && /^(key|seal_|w)/.test(item.kind)).map(it=>it.kind),
    required:v.items.filter(item=>/^(key|seal_ash|seal_bell)$/.test(item.kind)).map(item=>item.kind),
    marks:Q0.marks.map(mark=>mark.lit), boss:v.enemies.flatMap((e,i)=>e.boss?[[i,e.key,e.dead]]:[]),
    tallies:[T.kills,T.totKills,T.secrets,T.deaths], inventory:ck()
  });
  const aim=(x,z,y=C.pyy)=>{
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch=Math.atan2(y-C.pyy,distanceTo(x,z));
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);
  };
  function isolate() {
    C.spawnGuard=999;
    for(const e of v.enemies)e.stun=999;
    if(v.cine)stt(v.cine.dur+dt);
  }
  function step() {
    m_(dt); G$(dt); F$(dt); HH(dt);
  }
  function brake() {
    li.KeyW=li.KeyA=li.KeyS=li.KeyD=false;
    for(let i=0;i<34;i++)step();
  }
  function targets() {
    const jobs=[];
    if(T.level===0&&!T.weapons[1]) jobs.push({kind:"gear", x:59,z:9, id:"chapel"});
    for(const [i,item] of v.items.entries()) {
      if(!item.taken && /^(key|seal_ash|seal_bell)$/.test(item.kind)) {
        jobs.push({kind:"item",id:i, x:item.x,z:item.z,name:item.kind});
      }
    }
    for(const [i,e] of v.enemies.entries()) {
      if(e.boss&&!e.dead)jobs.push({kind:e.key==="G"?"heart":"boss",id:i,x:e.x,z:e.z,name:e.key});
    }
    return jobs.sort((a,b)=>(a.kind==="heart")-(b.kind==="heart"));
  }
  function goal(job,x,z) {
    if(job.kind==="exit"){
      const fit=jR(z0.exit,x,z,Ct.yaw);
      return fit.out>=1 && fit.out<=2.25 && Math.abs(fit.across)<=.57;
    }
    const dist=Math.hypot(job.x-x,job.z-z);
    if(job.kind==="boss"||job.kind==="heart") {
      return dist<=5.5 && dist>=1.6 && Math.abs(ie(x,z)-ie(job.x,job.z))<=1.25 && lm(x,z,job.x,job.z);
    }
    if(job.kind==="bell") return dist<=1.65;
    return dist<=.8;
  }
  function openable() {
    const doors=[];
    for(const [key,door] of Object.entries(v.doors)) {
      if(door.open||door.secret||door.locked&&!T.key||de.def?.niches?.some(p=>p.join(",")===key)&&!de.bell)continue;
      const gate=de.def?.gates?.find(g=>g.at.join(",")===key);
      if(gate && !gate.needs.every(requirement=>de.seals.has(requirement)))continue;
      doors.push(key);
    }
    return doors;
  }
  function pathTo(job) {
    // The search may plan routes through eligible doors. The temporary flags
    // exist only within this synchronous search. Native N$ must open each
    // door in play before movement can cross it.
    const eligible=openable();
    const barred=new Map((de.def?.oneWay??[]).filter(rule=>!v.doors[rule.at.join(",")]?.open)
      .map(rule=>[rule.at.join(","),rule]));
    for(const key of eligible)v.doors[key].open=true;
    try {
      const width=v.GW*P,height=v.GH*P;
      const seen=new Int32Array(width*height).fill(-1), pass=new Uint8Array(width*height), queue=[];
      const safeFloor=(x,z)=>T.level!==0||[[0,0],[.34,0],[-.34,0],[0,.34],[0,-.34]]
        .every(([dx,dz])=>ie(x+dx,z+dz)>=2.09);
      const valid=(x,z)=>{
        if(x<1||z<1||x>=width-1||z>=height-1)return false;
        const key=z*width+x;
        return (pass[key]||(pass[key]=Number(!fu(x+.5,z+.5)&&safeFloor(x+.5,z+.5))+1))===2;
      };
      // Offset nodes from exact tile boundaries so that the controller's
      // stop tolerance cannot straddle different floors on either side.
      const leg=(x,z,nx,nz)=>{
        const mx=(x+nx)/2,mz=(z+nz)/2;
        const from=ie(x,z), middle=ie(mx,mz), to=ie(nx,nz);
        if(fu(mx,mz)||!safeFloor(mx,mz)||to-from>1.2||middle-from>1.2||to-middle>1.2)return false;
        if(fu((3*x+nx)/4,(3*z+nz)/4)||fu((x+3*nx)/4,(z+3*nz)/4))return false;
        // The engine resolves X and Z separately. Take stairs along their
        // cardinal axis so controller tolerance cannot clip a high corner.
        if(Math.abs(x-nx)>.2&&Math.abs(z-nz)>.2&&
          (from!==to||from!==middle||from!==ie(x,nz)||from!==ie(nx,z)))return false;
        return true;
      };
      const startCandidates=[];
      for(let z=Math.floor(C.pz)-1;z<=Math.floor(C.pz)+1;z++) {
        for(let x=Math.floor(C.px)-1;x<=Math.floor(C.px)+1;x++){
          if(!valid(x,z)||!leg(C.px,C.pz,x+.5,z+.5))continue;
          startCandidates.push([x,z,distanceTo(x+.5,z+.5)]);
        }
      }
      startCandidates.sort((a,b)=>a[2]-b[2]);
      for(const [x,z] of startCandidates) {
        const node=z*width+x;
        seen[node]=-2;
        queue.push(node);
      }
      for(let cursor=0;cursor<queue.length;cursor++){
        const node=queue[cursor],x=node%width,z=node/width|0;
        if(goal(job,x+.5,z+.5)){
          const route=[];
          for(let q=node;q>=0;q=seen[q])route.unshift([q%width+.5,(q/width|0)+.5]);
          return route;
        }
        for(const [dx,dz] of cardinal){
          const nx=x+dx,nz=z+dz,next=nz*width+nx;
          if(seen[next]!==-1||!valid(nx,nz)||!leg(x+.5,z+.5,nx+.5,nz+.5))continue;
          const cell=((nx+.5)/P|0)+","+((nz+.5)/P|0);
          const sideRule=barred.get(cell);
          if(sideRule && cell!==(((x+.5)/P|0)+","+((z+.5)/P|0)) && LH(sideRule.at,x+.5,z+.5,P)!==sideRule.from)continue;
          seen[next]=node;
          queue.push(next);
        }
      }
      return null;
    } finally { for(const key of eligible)v.doors[key].open=false; }
  }
  function clearDoor(x,z,operated) {
    // Native body radius can encounter a door even when the movement node
    // is on its edge. Check the actual solidity both before and after N$.
    const openInRange=openable().map(key=> {
      const [a,b]=key.split(",").map(Number);
      const cx=(a+.5)*P,cz=(b+.5)*P;
      const pointDist=Math.hypot(x-cx,z-cz),playerDist=distanceTo(cx,cz);
      return {key,cx,cz,pointDist,playerDist};
    }).filter(c=>c.pointDist<1.65&&c.playerDist<=3.1).sort((a,b)=>a.pointDist-b.pointDist);
    for(const d of openInRange) {
      aim(d.cx,d.cz);
      N$();
      if(!v.doors[d.key].open)continue;
      operated.push(d.key);
      for(let i=0;i<66;i++){F$(dt);HH(dt);}
      return;
    }
  }
  function walk(route) {
    isolate();
    V5(false);
    const operated=[];
    let ticks=0,metres=0,prev=[C.px,C.pz];
    for(const [x,z] of route) {
      if(fu(x,z)||fu((x+C.px)/2,(z+C.pz)/2)){
        brake();
        clearDoor(x,z,operated);
      }
      let samples=0;
      while(distanceTo(x,z)>.16){
        if(++samples>250||T.dead||Be.inputLock||T.won){
          brake();
          return {fail:{target:[x,z],position:[C.px,C.pz],hits:fu(x,z),level:T.level,
            floors:[ie(C.px,C.pz),ie(x,z)],grounded:C.grounded,velocity:[C.vx,C.vy,C.vz],
            prior:prev, obstructions:[.1,.25,.5,.75].map(f=>fu(C.px+(x-C.px)*f,C.pz+(z-C.pz)*f)),
            doorNear:Object.entries(v.doors).filter(([key,d])=>{const [a,b]=key.split(",").map(Number);
            return distanceTo((a+.5)*P,(b+.5)*P)<4}).map(([k,d])=>[k,d.open])},
            ticks,metres,operated};
        }
        aim(x,z);
        const distance=distanceTo(x,z);
        const speed=(C.vx*(x-C.px)+C.vz*(z-C.pz))/distance;
        li.KeyW=speed<Math.min(6,Math.max(.45,distance*4));
        step();
        ticks++;
      }
      metres+=Math.hypot(C.px-prev[0],C.pz-prev[1]);
      prev=[C.px,C.pz];
    }
    brake();
    V5(true);
    return {ticks,metres,operated};
  }
  function work() {
    isolate();
    const tries=targets();
    if(!tries.length){
      if(T.won)return {done:records()};
      if(z0.exit&&v.exitPos)tries.push({kind:"exit",x:z0.exit.x,z:z0.exit.z});
    }
    if(de.def?.lever&&!de.bell){
      const [x,z]=de.def.lever.map(c=>(c+.5)*P);
      const bell={kind:"bell",x,z};
      if(de.def.seals?.every(seal=>de.seals.has(seal.kind))) tries.unshift(bell);
      else tries.push(bell);
    }
    for(const job of tries) {
      if(job.kind==="heart"&&tries.some(candidate=>candidate.kind==="boss"&&pathTo(candidate)))continue;
      const route=pathTo(job);
      if(!route)continue;
      const result=walk(route);
      if(result.fail)return {job,...result,state:records()};
      if(job.kind==="bell"||job.kind==="exit"){
        aim(job.x,job.z);
        V5(false);
        return {job,...result,state:records(),press:true};
      }
      if(job.kind==="boss"||job.kind==="heart"){
        const enemy=v.enemies[job.id];
        // The target is reached through native collision. Isolate the
        // terminal damage path without retuning campaign combat for QA.
        if(enemy.dormant){bk(enemy);stt(v.cine.dur+dt)}
        qr(enemy,enemy.hp+1,{explosive:true,wIdx:1});
        if(job.kind==="heart")V5(false);
        return {job,...result,state:records()};
      }
      if(job.kind==="item"&&!v.items[job.id]?.taken)return {fail:"Item not acquired",job,...result,state:records()};
      if(job.kind==="gear"&&!T.weapons[1])return {fail:"Shotgun not acquired",job,...result,state:records()};
      return {job,...result,state:records()};
    }
    return {fail:"No collision-safe route to any remaining objective",tries,state:records(),possibleDoors:openable(),
      script:de.def,lift:de.lift.h};
  }
  return {records,work,chapterCount:dh.length,settle(){isolate();V5(true);}};
})();
`;
fs.writeFileSync(fixture,source.replace(anchor,()=>probe+anchor));

async function run(){
  const browser=await chromium.launch({channel:"chrome",headless:true});
  const report={sha, chapters:[], errors:[], pass:false, scope:
    "Continuous native campaign from New Game. Fixed-step movement and door interaction through authored geometry. Actual Playwright E for bell and exits, Space for chapter cards. Bosses receive a seeded terminal hit through native damage. Hostile attacks are isolated during this route."};
  try{
    const page=await browser.newPage({viewport:{width:720,height:430},offline:true});
    page.on("pageerror",error=>report.errors.push(error.message));
    await page.goto(pathToFileURL(fixture).href,{timeout:120000});
    await page.locator("#mNew").click({timeout:90000});
    await page.waitForFunction(()=>campaignRoute.records().started&&!campaignRoute.records().locked,null,{timeout:90000});
    await page.evaluate(()=>campaignRoute.settle());
    const count=await page.evaluate(()=>campaignRoute.chapterCount);
    assert.equal(count,11,"Expected the published 11-chapter campaign");
    for(let index=0;index<count;index++){
      const entry=await page.evaluate(()=>campaignRoute.records());
      assert.equal(entry.index,index);
      const chapter={index,name:entry.name,entry,actions:[]};
      report.chapters.push(chapter);
      console.log("ENTER",entry.name,JSON.stringify(entry.position));
      for(let n=0;n<30;n++){
        const event=await page.evaluate(()=>campaignRoute.work());
        chapter.actions.push(event);
        if(event.fail){
          console.log("BLOCK",JSON.stringify({...event,state:{...event.state,inventory:undefined}}));
          throw Error(entry.name+": "+JSON.stringify(event.fail));
        }
        if(event.done)throw Error("Victory arrived before the intended final route interaction");
        const {job,press}=event;
        console.log(" ",job.kind,job.name??job.id??"",Math.round(event.metres)+"m",
          event.operated.join(" "),JSON.stringify(event.state.position));
        if(job.kind==="heart"){
          await page.locator("#win").waitFor({timeout:20000});
          chapter.completed=await page.evaluate(()=>campaignRoute.records());
          assert.equal(index,count-1);
          assert(chapter.completed.won && chapter.completed.boss.every(boss=>boss[2]));
          assert.equal(await page.evaluate(()=>localStorage.getItem("black-silence.campaign.v1")),null,
            "The actual victory clears the campaign slot");
          break;
        }
        if(press){
          await page.keyboard.press("KeyE");
          if(job.kind==="exit"){
            assert(index<count-1,"The Womb finishes with native victory");
            await page.waitForFunction(()=>{
              const s=campaignRoute.records();
              return s.phase==="card"&&s.card>=s.cardAfter;
            },null,{timeout:40000});
            chapter.exitCard=await page.evaluate(()=>campaignRoute.records());
            assert(chapter.exitCard.won && chapter.exitCard.boss.every(boss=>boss[2]));
            await page.keyboard.press("Space");
            await page.waitForFunction(i=>{
              const s=campaignRoute.records();
              return s.index===i&&!s.locked;
            },index+1,{timeout:60000});
            await page.evaluate(()=>campaignRoute.settle());
            chapter.completed=await page.evaluate(()=>campaignRoute.records());
            break;
          }
          assert((await page.evaluate(()=>campaignRoute.records())).bell,"Bell operation used real E");
        }
      }
      assert(chapter.completed, entry.name+" should reach the next chapter or victory");
      const final=chapter.exitCard||chapter.completed;
      assert(entry.required.every(kind=>final.acquired.includes(kind)),"Required objects were collected by movement");
      if(entry.level===9)assert(final.bell,"The authored Monastery bell was pulled");
      assert.deepEqual(report.errors,[]);
    }
    report.pass=true;
  }finally{
    fs.writeFileSync(path.join(folder,"report.json"),JSON.stringify(report,null,2));
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1});
