const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict");
const {pathToFileURL}=require("node:url"),{chromium}=require("playwright"),{PNG}=require("pngjs");
const input=path.resolve(process.env.GAME_HTML||path.join(__dirname,"../THE-BLACK-SILENCE.html"));
const base=process.env.BASELINE==="1",out=process.env.GUARDIAN_PROOF;
if(out)fs.mkdirSync(out,{recursive:true});
const anchor="Jk();ju();Yy();X$(J$);D0t();";
const html=fs.readFileSync(input,"utf8");assert.equal(html.split(anchor).length,2);
const seam=`
window.guard={
  setup(level,distance,kind="U") {
    rp(level);V5(true);Jt("pause").classList.add("hidden");Be.inputLock=false;
    const e=v.enemies.find(e=>e.key===kind);
    if(!e)throw Error("Missing actor "+kind+" in "+level);
    this.e=e;
    const roster=v.enemies.map(o=>[o.key,o.x,o.z]);
    for(const o of v.enemies)if(o!==e)J.scene.remove(o.sp,o.blob);
    v.enemies=[e];v.cine=null;
    let found=false;
    for(let i=0;i<72;i++){
      const a=i*Math.PI/36, x=e.x+Math.sin(a)*distance, z=e.z+Math.cos(a)*distance;
      if(d0(x,z)||!lm(x,z,e.x,e.z)||ie(x,z)!==e.fy)continue;
      C.px=x;C.pz=z;Ct.yaw=a;found=true;break;
    }
    if(!found)throw Error("No clear staging point: "+[level,kind,distance]);
    C.pyy=ie(C.px,C.pz)+Yo;C.vx=C.vy=C.vz=0;Ct.pitch=0;C.grounded=true;C.spawnGuard=100;
    J.camera.position.set(C.px,C.pyy,C.pz);J.camera.rotation.set(0,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);
    Object.assign(e,{dormant:false,aware:true,cool:.52,flank:0,stun:0});this.frame=0;this.first=0;
    Jt("subt").textContent="";le("",0);Math.random=()=>.5;
    return {x:e.x,z:e.z,w:e.w,h:e.h,hp:e.hp,roster};
  },
  advance(count){const e=this.e;while(this.frame<count){qtt(1/60);this.frame++;
    if(hA.orbs.length&&!this.first)this.first=this.frame;}
    const texture=e.sp.material.map, cache=wk(e);
    let action=Array.from(cache.frames).find(([key,t])=>t===texture)?.[0];
    if(!action && cache.rig.poses.volley) {
      for(let i=0;i<4;i++)if(texture===cache.tex("volley",i,0))action="volley"+i+":0";
    }
    return {frame:this.frame,first:this.first,orbs:hA.orbs.map(o=>[o.vx,o.vy,o.vz]),hp:e.hp,
      box:[e.w,e.h],pos:[e.x,e.z],cool:e.cool,action,texture: texture.colorSpace,cache:cache.frames.size};},
  switches(){
    const e=this.e,r=wk(e);let results={};
    e.hurt=.1;Yu(e,0,false,false);results.pain=e.sp.material.map===r.tex("pain",0,0);
    e.hurt=0;e.cool=.15;e.atkAnim=0;const original=C.px;C.px+=100;Yu(e,0,false,false);
    results.far=e.sp.material.map===r.tex("idle",0,0);
    C.px=original;e.dormant=true;Yu(e,0,false,false);results.dormant=e.sp.material.map===r.tex("idle",0,0);
    e.dormant=false;e.stun=.5;Yu(e,0,false,true);results.stun=e.sp.material.map===r.tex("idle",0,0);
    const living=v.enemies.length;qr(e,e.hp+1,{wIdx:0});qtt(.15);
    results.dead=e.dead&&e.sp.material.map.colorSpace==="srgb"&&v.enemies.length===living;
    return results;
  },
  coverage(){
    const results=[];
    for(const chapter of [1,2,3,4,5,6,7,8]){
      rp(chapter);const g=v.enemies.find(e=>e.key==="U"),rig=wk(g);
      const colors=new Set(["idle","walk","pain","die"].map(action=>rig.tex(action,0).colorSpace));
      const frames=[0,1,2,3].map(i=>rig.tex("volley",i));
      const edges=frames.map(texture=>{
        const img=texture.image,p=img.getContext("2d").getImageData(0,0,img.width,img.height).data;
        let edge=0;
        for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)
          if((!x||!y||x===img.width-1||y===img.height-1)&&p[4*(y*img.width+x)+3])edge++;
        return edge;
      });
      const cache=frames.every((t,i)=>t===rig.tex("volley",i));
      const begin=performance.now();
      for(let n=0;n<1000;n++)rig.tex("volley",n%4);
      results.push({chapter,box:[g.w,g.h],colors:[...colors],edges,cache,
        cached1000Ms:performance.now()-begin,
        newPixels:frames.reduce((n,t)=>n+t.image.width*t.image.height,0)});
    }
    return results;
  }
};`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"guardian-"));
const file=path.join(dir,"game.html");fs.writeFileSync(file,html.replace(anchor,()=>seam+anchor));
(async()=>{
  const b=await chromium.launch({channel:"chrome"}),runs=[],errors=[];
  try{
    const p=await b.newPage({viewport:{width:960,height:540}});
    p.on("pageerror",e=>errors.push(e.message));
    await p.goto(pathToFileURL(file).href+"?qa=1");await p.locator("#mNew").click();
    await p.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);
    for(const [level,range] of [[5,6.4],[6,5.6],[2,7.2]]){
      const start=await p.evaluate(([l,d])=>guard.setup(l,d),[level,range]),frames=[],pics=[];
      await p.waitForTimeout(250);
      for(const n of [1,11,23,32,39,52]) {
        const f=await p.evaluate(n=>guard.advance(n),n);
        assert.deepEqual(f.box,[start.w,start.h]);assert.equal(f.hp,start.hp);
        if(out && (level===5 || level===6)) {
          await p.waitForTimeout(60);
          const shot=await p.screenshot();
          if(n===1 || n===23 || n===32) fs.writeFileSync(path.join(out,level+"-"+n+".png"),shot);
          pics.push(PNG.sync.read(shot));
        }
        frames.push(f);
      }
      if(pics.length){
        const width=170,height=205,sheet=new PNG({width:width*pics.length,height});
        for(let i=0;i<pics.length;i++) PNG.bitblt(pics[i],sheet,395,159,width,height,width*i,0);
        fs.writeFileSync(path.join(out,level+"-volley.png"),PNG.sync.write(sheet));
      }
      assert.equal(frames[3].first,32);assert.equal(frames[3].orbs.length,3);
      assert(frames.slice(0,3).every(f=>f.orbs.length===0));
      if(!base) {
        assert.deepEqual(frames.slice(1,5).map(f=>f.action),["volley0:0","volley1:0","volley2:0","volley3:0"]);
        assert(frames.every(f=>f.texture==="srgb"));
        const states=await p.evaluate(()=>guard.switches());assert(Object.values(states).every(Boolean),JSON.stringify(states));
      }
      runs.push({level,range,start,frames});
    }
    const coverage=base?[]:await p.evaluate(()=>guard.coverage());
    for(const row of coverage) {
      assert.equal(row.colors.join(","),"srgb");
      assert(row.cache && row.edges.every(n=>n===0),"Atlas clipping/cache in "+JSON.stringify(row));
    }
    assert.deepEqual(errors,[]);if(out)fs.writeFileSync(path.join(out,"runs.json"),JSON.stringify({runs,errors,coverage},null,2));
    console.log("PASS",runs.map(r=>[r.level,r.frames[3].first,r.frames[3].orbs.length]));
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
