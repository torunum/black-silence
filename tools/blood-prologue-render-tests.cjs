// Native Blood-inspired prologue captures, plus five scoped texture disposal cycles.
// node tools/hell-material-resource-tests.cjs game.html output-directory [before|after] [standard|lancet]
// Before mode only captures the baseline. Resource counts are not FPS claims.
const fs=require('fs'),{chromium}=require('playwright'),{pathToFileURL}=require('url');
const path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const input=path.resolve(process.argv[2]||'THE-BLACK-SILENCE.html');
const dir=path.resolve(process.argv[3]||'.dream-loop/hell-material-resources');
const stage=process.argv[4]||'after';
assert(['before','after'].includes(stage),'Stage must be before or after');
const preset=process.argv[5]||'standard';
assert(['standard','lancet'].includes(preset),'Preset must be standard or lancet');
const cameras=[['grave',19,9,19,16,5.0],['grave-side',18.4,11.4,15.8,11.6,4.5],['crypt-entry',19,19,20,26,4.8],['crypt-deep',19.4,27,20,34,3.6],['crypt-bay',20.2,27,18,27,4.4],['crypt-open',19.7,31,22,31,3.7],['arena',67,105,71,110,4.5],['arena-floor',71,99,71,106,2.7],['arena-focus',71,105,71,119,7],['arena-side',65,114,71,120,8],['bridge',21,53,38,53,3.5]];
const canonical=p=>fs.realpathSync(p).toLowerCase();
const isWithin=(file,directory)=>{const rel=path.relative(directory,file);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
// No fixture, report or PNG may overwrite an input within the output tree.
assert(!isWithin(input.toLowerCase(),dir.toLowerCase()),'Input must be outside output directory');
fs.mkdirSync(dir,{recursive:true});
assert(!isWithin(canonical(input),canonical(dir)),'Input resolves inside output directory');
const source=fs.readFileSync(input,'utf8');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const sha256=hash(fs.readFileSync(input)),anchor='Jk();ju();Yy();X$(J$);D0t();';
assert.equal(source.split(anchor).length,2,'Exactly one native startup anchor');
const seam=`window.__HELL_CAPTURE = {syncZone() {
  // Paused camera placement skips native VJ. Settle the original zone update,
  // rather than substituting an arbitrary brightness for the target camera.
  TR(0,true);
  const index=v.zones.map[C.pz/P|0][C.px/P|0],theme=v.zones.themes[index],colors=rJ(theme);
  return {index,active:Wa.cur,id:theme.id,
    player:[C.px,C.pyy,C.pz],camera:J.camera.position.toArray(),expectedEyeY:ie(C.px,C.pz)+Yo,
    fog:J.scene.fog.color.toArray(),expectedFog:colors.fog.toArray(),
    density:J.scene.fog.density,expectedDensity:theme.fogD*1.5,
    ambient:J.ambLight.color.toArray(),expectedAmbient:colors.amb.toArray(),
    intensity:J.ambLight.intensity,expectedIntensity:theme.ambI*.42};
}};`;
const fixture=path.join(dir,'capture-'+sha256.slice(0,16)+'.html');
fs.writeFileSync(fixture,source.replace(anchor,()=>seam+anchor));
const fixtureSHA256=hash(fs.readFileSync(fixture));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{let seed=123456;Math.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};});await page.goto(pathToFileURL(fixture).href+'?qa=1');await page.locator('#mNew').click();await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.Be.started&&!q.Be.inputLock&&q.paintedGloves.ready();});await page.evaluate((weapon)=>{const q=window.__BLACK_SILENCE_QA;q.pause(true);q.T.cur=weapon;q.T.weapons[weapon]=true;q.T.mag[weapon]=q.weapons[weapon].magSize;q.St.wstate='idle';q.viewPose={...q.pose(),reload:-1,recoil:0,action:0,heat:0};document.getElementById('pause').classList.add('hidden');document.getElementById('subt').textContent='';},preset==='lancet'?0:1);
const records=[];for(const[name,x,z,tx,tz,ty]of cameras){const zone=await page.evaluate(({x,z,tx,tz,ty})=>{const q=window.__BLACK_SILENCE_QA;q.C.px=x;q.C.pz=z;q.C.pyy=q.floor(x,z)+q.eyeHeight;q.C.vx=q.C.vz=q.C.vy=0;q.Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;q.Ct.pitch=Math.atan2(ty-q.C.pyy,Math.hypot(tx-x,tz-z));q.setCamera();return window.__HELL_CAPTURE.syncZone();}, {x,z,tx,tz,ty});
assert.equal(zone.active,zone.index,name+': native zone matches player position');

assert(Math.abs(zone.player[1]-zone.expectedEyeY)<1e-10,name+': native standing eye height');
for(const [actual,expected] of [[zone.player,zone.camera],[zone.fog,zone.expectedFog],[zone.ambient,zone.expectedAmbient]])
  actual.forEach((value,index)=>assert(Math.abs(value-expected[index])<1e-10,name+': camera/zone color aligned'));
assert(Math.abs(zone.density-zone.expectedDensity)<1e-10,name+': native fog density');
assert(Math.abs(zone.intensity-zone.expectedIntensity)<1e-10,name+': native ambient intensity');
records.push({name,...zone});await page.waitForTimeout(150);await page.screenshot({path:dir+'/'+stage+'-'+name+'.png'});records.at(-1).render=await page.evaluate(()=>({...window.__BLACK_SILENCE_QA.J.renderer.info.render}));}
const resources=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA,images=new Set(),textures=new Set(),materials=new Set(),maps=[];q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);if(m.map){textures.add(m.map);images.add(m.map.image);maps.push({name:o.name,texture:m.map.id,image:m.map.image?.toDataURL?.().slice(-64),mapName:m.map.name,baked:!!m.userData.hellBaked});}}});return{textures:textures.size,images:images.size,materials:materials.size,renderer:q.J.renderer.info.memory,maps};});
const lifecycle=[];
if(stage==='after')for(let cycle=0;cycle<5;cycle++){
 const departed=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;window.__oldHellTextures=new Set();q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map&&(m.userData.hellBaked||m.map.name.match(/^prologue(?:Hell|RitualIvory|CryptFloor|CryptStone)/)))window.__oldHellTextures.add(m.map);});window.__hellDispose=0;window.__cryptFloors=[...window.__oldHellTextures].filter(t=>t.name==='prologueCryptFloor');window.__cryptFloorDisposed=0;for(const t of window.__cryptFloors)t.addEventListener('dispose',()=>window.__cryptFloorDisposed++);for(const t of window.__oldHellTextures)t.addEventListener('dispose',()=>window.__hellDispose++);q.load(9);let tagged=0;q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.userData.hellBaked||m?.userData.hellPyreFlame||m?.map?.name.match(/^prologue(?:Hell|RitualIvory|CryptFloor|CryptStone)/))tagged++;});return{oldTextures:window.__oldHellTextures.size,cryptFloorTextures:window.__cryptFloors.length,cryptFloorDisposed:window.__cryptFloorDisposed,disposed:window.__hellDispose,taggedNextLevel:tagged};});
 await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.load(0);q.pause(true);document.getElementById('pause').classList.add('hidden');});await page.waitForTimeout(160);
 const returned=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;let reused=0,flames=0;const textures=new Set(),images=new Set();q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){if(m.userData.hellPyreFlame)flames++;if(m.map){textures.add(m.map);images.add(m.map.image);if(window.__oldHellTextures.has(m.map))reused++;}}});return{reusedDisposedTextures:reused,flames,textures:textures.size,images:images.size,resident:q.J.renderer.info.memory.textures};});
 if(departed.cryptFloorTextures<1||departed.cryptFloorDisposed!==departed.cryptFloorTextures||departed.taggedNextLevel||returned.reusedDisposedTextures||!returned.flames||departed.disposed<departed.oldTextures)throw Error('Resource lifecycle isolation failed '+JSON.stringify({departed,returned}));lifecycle.push({cycle,...departed,...returned});
}
assert.deepEqual(errors,[],'No runtime errors');assert.equal(hash(fs.readFileSync(input)),sha256,'Input preserved byte-for-byte');
fs.writeFileSync(dir+'/'+stage+'-report.json',JSON.stringify({passed:true,input,sha256,fixtureSHA256,zoneSynchronized:true,freshNativeLevelBeforeCaptures:false,cameras:records,errors,resources,lifecycle},null,2));console.log(JSON.stringify({errors,counts:{textures:resources.textures,images:resources.images,materials:resources.materials,renderer:resources.renderer}}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
