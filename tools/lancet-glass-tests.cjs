// Characterise the actual native apse batch, camera coverage and per-level resources.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict");
const crypto=require("node:crypto"),{pathToFileURL}=require("node:url"),{chromium}=require("playwright");
const root=path.resolve(__dirname,".."),input=path.resolve(process.argv[2]||"THE-BLACK-SILENCE.html");
const out=path.resolve(process.argv[3]||".dream-loop/lancets-check"),sha=v=>crypto.createHash("sha256").update(v).digest("hex");
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(input,"utf8"),moduleSource=fs.readFileSync(path.join(root,"src/prologue-stained-glass.js"),"utf8").trim();
const anchor="Jk();ju();Yy();X$(J$);D0t();",marker="/* PROLOGUE_STAINED_GLASS_BEGIN */",endMarker="/* PROLOGUE_STAINED_GLASS_END */";
const hasSluice=source.includes("/* PROLOGUE_CINDER_VIADUCT_BEGIN */");
assert(source.includes(moduleSource),"Test a standalone assembled with this exact glass source");
assert.equal(source.split(marker).length,2);assert.equal(source.split(endMarker).length,2);assert.equal(source.split(anchor).length,2);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"lancet-")),fixture=path.join(tmp,"proof.html");
const probe=`
const glassObject=()=>J.scene.getObjectByName("hellFiguredWindows");
const binding=window.__BLACK_SILENCE_QA;let old=[],disposed=[];
window.__glass={
 map(){
   function seeded(build){const keep=Math.random;let seed=9337;Math.random=()=>{seed=Math.imul(1664525,seed)+1013904223>>>0;return seed/4294967296};try{return build();}finally{Math.random=keep;}}
   const original=seeded(window.__beforeGlassMap),afterGlass=seeded(window.__afterGlassMap),current=seeded(gV[0].build);
   const dampers=current.decor.filter(p=>p.k==="cinderSluiceDampers"),slats=[];
   if(dampers.length)di.cinderSluiceDampers.build((...args)=>slats.push(args),()=>{},dampers[0]);
   return {glassExact:JSON.stringify(original)===JSON.stringify(afterGlass),exact:JSON.stringify(original)===JSON.stringify(current),
     site:current.decor.filter(p=>p.k==="hellLancetShrine"),formerSites:original.decor.filter(p=>p.k==="hellLancetShrine"),dampers,
     slats:slats.filter(([t,w,h,d])=>t==="wrought"&&w===.64&&h===.105&&d===.11).length,
     embers:slats.filter(([t,w,h,d])=>t==="hellGlass"&&h===.039&&d===.025).length,
     points:current.decor.filter(p=>p.k==="light"),shrineMass:di.hellLancetShrine.mass??null};
 },
 stats(){
   const o=glassObject();if(!o)return null;
   const g=o.geometry,map=o.material.map,pixels=map.image.getContext("2d").getImageData(0,0,512,256).data;
   const hists=[0,1,2].map(t=>{
     const coarse=Array.from({length:32},()=>0);
     let amber=0,shade=0;
     for(let y=6;y<252;y+=2)for(let x=2;x<126;x+=2){
       const i=(y*512+t*128+x)*4;
       if(pixels[i]>200&&pixels[i+1]>125&&pixels[i+2]<215)amber++;
       if(pixels[i]<64&&pixels[i+1]<64)shade++;
       coarse[(y>>5)*4+(x>>5)]+=pixels[i]+pixels[i+1]*2;
     }
     return {amber,shade,coarse};
   });
   return {triangles:g.getAttribute("position").count/3,maps:[...new Set([o.material.map.uuid])],
     hists,textures:[map.image.width,map.image.height],mapName:map.name,lightChildren:o.children.filter(c=>c.isLight).length,
     fog:o.material.fog,nearestMips:map.minFilter===YC,nearestMag:map.magFilter===i0,above:ie(71,120)};
 },
 pose(x,z,tx,tz,ty){
   V5(true);C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vz=C.vy=0;
   Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(ty-C.pyy,Math.hypot(tx-x,tz-z));
   J.camera.position.set(x,C.pyy,z);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);TR(0,true);
   // Camera staging leaves static lighting and weapon intact. The transient intro UI is hidden.
   Jt("pause").classList.add("hidden");Jt("subt").style.visibility="hidden";le("",0);
   return {id:v.zones.themes[Wa.cur].id,eye:C.pyy,solid:fu(x,z)};
 },
 depart(){
   const o=glassObject();old=[o.geometry,o.material,o.material.map];disposed=[0,0,0];
   old.forEach((v,i)=>v.addEventListener("dispose",()=>disposed[i]++));
   window.__BLACK_SILENCE_QA.load(9);
   let fig=0,hell=0;J.scene.traverse(n=>{for(const m of Array.isArray(n.material)?n.material:[n.material]){
     if(m?.map?.name==="prologueFiguredLancets"||m?.name==="hellFiguredGlass")fig++;
     if(m?.userData.hellBaked)hell++;
   }});
   return {disposed:disposed.slice(),inMonastery:fig,bakedHellInMonastery:hell};
 },
 return(){
   window.__BLACK_SILENCE_QA.load(0);sk();const o=glassObject();
   return {fresh:[o.geometry,o.material,o.material.map].every((n,i)=>n!==old[i]),size:o.material.map.image.width};
 },
 skip(){sk();}, metrics(){return {...J.renderer.info.render,textureCount:J.renderer.info.memory.textures};}
};`;
fs.writeFileSync(fixture,source.replace(marker,()=>"window.__beforeGlassMap=gV[0].build;\n"+marker)
 .replace(endMarker,()=>endMarker+"\nwindow.__afterGlassMap=gV[0].build;").replace(anchor,()=>probe+anchor));
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
   const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],network=[];
   p.setDefaultTimeout(120000);
   p.on("pageerror",e=>{console.error(e);errors.push(e.message);});
   await p.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
   await p.addInitScript(()=>{let s=123456;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};});
   await p.goto(pathToFileURL(fixture).href+"?qa=1",{waitUntil:"commit"});
   await p.waitForFunction(()=>!!window.__glass && document.readyState!=="loading");
   await p.locator("#mNew").focus();await p.keyboard.press("Enter");
   await p.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started);await p.evaluate(()=>__glass.skip());
   await p.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock && __BLACK_SILENCE_QA.paintedGloves.ready());
   const map=await p.evaluate(()=>__glass.map());
   assert(map.glassExact&&!map.shrineMass,"The stained glass module preserves native routes, lights, pickups and collisions");
   if(hasSluice){
     assert.equal(map.formerSites.length,3);
     const isSluice=p=>p.x===40&&p.z===39.7;
     assert.deepEqual(map.site,map.formerSites.filter(p=>!isSluice(p)),"Both other stained-glass sites are intact");
     assert.deepEqual(map.dampers,map.formerSites.filter(isSluice).map(p=>({...p,k:"cinderSluiceDampers"})));
     assert.equal(map.slats,12);assert.equal(map.embers,4);
   } else assert(map.exact&&map.site.length===3,"Map and all native route data, lights and pickups unchanged");
   const art=await p.evaluate(()=>__glass.stats());assert(art.fog===false&&art.nearestMips&&art.nearestMag);
   assert.deepEqual(art.textures,[512,256]);assert.equal(art.lightChildren,0);assert(art.triangles>0&&art.triangles<300);
   assert.equal(new Set(art.hists.map(x=>JSON.stringify(x.coarse))).size,3);
   art.hists.forEach((p,i)=>{assert(p.amber>160 && p.shade>500,"Both transmitted light and opaque painting in panel "+i);});
   const cams=[];
   for(const [name,...pose]of [["arena-focus",71,105,71,119,9],["arena-side",65,114,71,120,8],["arena-east",77.1,113,71,120,7.9],
       ["bridge",21,53,38,53,3.5],["bridge-focus",27,53,54,53,9],["transept",81,71,81,80.4,8.1]]){
     const pos=await p.evaluate(a=>__glass.pose(...a),pose);assert.equal(pos.id,"hell");
     // The historic straight-on comparison camera at [71,105] overlaps the
     // ritual pyre base. It is staged at native eye height. The remaining
     // gameplay views, and especially the bridge, are independently checked.
     if(name!=="arena-focus")assert(!pos.solid,"Reachable camera "+name);
     await p.waitForTimeout(170);await p.screenshot({path:path.join(out,name+".png")});cams.push({name,pose,...pos,render:await p.evaluate(()=>__glass.metrics())});
   }
   const cycles=[];
   for(let i=0;i<3;i++){
     const depart=await p.evaluate(()=>__glass.depart());assert.deepEqual(depart.disposed,[1,1,1]);
     assert.equal(depart.inMonastery,0);assert.equal(depart.bakedHellInMonastery,0);
     const back=await p.evaluate(()=>__glass.return());assert(back.fresh&&back.size===512);cycles.push({depart,back});
   }
   assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
   const report={standaloneSHA256:sha(source),moduleSHA256:sha(moduleSource),targetSHA256:sha(fs.readFileSync(path.join(root,"assets/hell/lancet-triptych-nov14.png"))),
     fixtureSHA256:sha(fs.readFileSync(fixture)),map,art,cams,cycles,errors,network};
   fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(report,null,2)+"\n");
   console.log("PASS figured lancets",JSON.stringify({windows:map.site.length*3,glassTriangles:art.triangles,cycles:cycles.length,poses:cams.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.unlinkSync(fixture);fs.rmdirSync(tmp);});
