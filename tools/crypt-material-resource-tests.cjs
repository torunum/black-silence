// Native-eye crypt captures and scoped crypt texture disposal/alias tests.
// node tools/crypt-material-resource-tests.cjs game.html output-directory [before|after]
// Before mode only captures the baseline. Resource counts are not FPS claims.
const fs=require('fs'),{chromium}=require('playwright'),{pathToFileURL}=require('url');
const path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const input=path.resolve(process.argv[2]||'THE-BLACK-SILENCE.html');
const dir=path.resolve(process.argv[3]||'.dream-loop/chapel-material-resources');
const stage=process.argv[4]||'after';
assert(['before','after'].includes(stage),'Stage must be before or after');
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
const seam=`window.__CRYPT_PROBE={texture:()=>Ft.prologueCryptStone,hell:()=>Ft.hellAshWall};window.__HELL_CAPTURE = {syncZone() {
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
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{let seed=123456;Math.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};});await page.goto(pathToFileURL(fixture).href+'?qa=1');await page.locator('#mNew').click();await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.Be.started&&!q.Be.inputLock&&q.paintedGloves.ready();});await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.pause(true);q.T.cur=0;q.T.weapons[0]=true;q.T.mag[0]=6;q.St.wstate='idle';q.viewPose={...q.pose(),reload:-1,recoil:0,action:0,heat:0};document.getElementById('pause').classList.add('hidden');document.getElementById('subt').textContent='';});
const records=[];for(const[name,x,z,tx,tz,ty]of[['crypt-entry',19,20,19,28,1.2],['crypt-deeper',19,25,19,32,1.2],['crypt-wall',19,29,18,29,1.2],['crypt-enemy',19,34,17,45,1.2]]){const zone=await page.evaluate(({x,z,tx,tz,ty})=>{const q=window.__BLACK_SILENCE_QA;q.C.px=x;q.C.pz=z;q.C.pyy=q.floor(x,z)+q.eyeHeight;q.C.vx=q.C.vz=q.C.vy=0;q.Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;q.Ct.pitch=Math.atan2(q.floor(tx,tz)+ty-q.C.pyy,Math.hypot(tx-x,tz-z));q.setCamera();return window.__HELL_CAPTURE.syncZone();}, {x,z,tx,tz,ty});
assert.equal(zone.active,zone.index,name+': native zone matches player position');
assert(Math.abs(zone.player[1]-zone.expectedEyeY)<1e-10,name+': native standing eye height');
for(const [actual,expected] of [[zone.player,zone.camera],[zone.fog,zone.expectedFog],[zone.ambient,zone.expectedAmbient]])
  actual.forEach((value,index)=>assert(Math.abs(value-expected[index])<1e-10,name+': camera/zone color aligned'));
assert(Math.abs(zone.density-zone.expectedDensity)<1e-10,name+': native fog density');
assert(Math.abs(zone.intensity-zone.expectedIntensity)<1e-10,name+': native ambient intensity');
records.push({name,...zone});await page.waitForTimeout(150);await page.screenshot({path:dir+'/'+stage+'-'+name+'.png'});records.at(-1).render=await page.evaluate(()=>({...window.__BLACK_SILENCE_QA.J.renderer.info.render}));}
const resources=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA,images=new Set(),textures=new Set(),materials=new Set(),maps=[];q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m.uuid);if(m.map){textures.add(m.map.uuid);images.add(m.map.image);maps.push({name:o.name,texture:m.map.uuid,image:m.map.image?.toDataURL?.().slice(-64),mapName:m.map.name,baked:!!m.userData.hellBaked});}}});return{textures:textures.size,images:images.size,materials:materials.size,renderer:q.J.renderer.info.memory,maps};});
const lifecycle=[];
if(stage==='after')for(let cycle=0;cycle<5;cycle++){
 const departed=await page.evaluate(()=>{
  const q=window.__BLACK_SILENCE_QA,c=window.__CRYPT_PROBE.texture(),h=window.__CRYPT_PROBE.hell();
  if(!c||c===h||c.image!==h.image||c.name!=='prologueCryptStone'||h.name!=='prologueHellWall')throw Error('Texture alias/isolation contract');
  window.__oldCrypt=new Set([c]);let risers=0,courses=0;
  q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map?.name==='prologueCryptStone'){window.__oldCrypt.add(m.map);if(o.name==='ceilingRisers'&&o.visible)risers++;if(o.name==='wallCourse'&&o.visible)courses++;}});
  if(!risers||!courses)throw Error('Crypt risers/course lost');
  window.__cryptDisposed=0;for(const t of window.__oldCrypt)t.addEventListener('dispose',()=>window.__cryptDisposed++);
  q.load(9);let next=0;q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map?.name==='prologueCryptStone')next++;});
  return{oldTextures:window.__oldCrypt.size,disposed:window.__cryptDisposed,nextCryptTextures:next,visibleRisers:risers,visibleCourses:courses,sharedExistingImage:true,independentTextureObject:true};
 });
 assert.equal(departed.disposed,departed.oldTextures);assert.equal(departed.nextCryptTextures,0);
 await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.load(0);q.pause(true);document.getElementById('pause').classList.add('hidden');});await page.waitForTimeout(160);
 const returned=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA,c=window.__CRYPT_PROBE.texture(),h=window.__CRYPT_PROBE.hell();let reused=0;const crypt=new Set();q.J.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.map){if(window.__oldCrypt.has(m.map))reused++;if(m.map.name==='prologueCryptStone')crypt.add(m.map);}});return{reusedDisposed:reused,registeredReused:window.__oldCrypt.has(c),cryptTextures:crypt.size,sharedExistingImage:c.image===h.image,distinctTexture:c!==h,resident:q.J.renderer.info.memory.textures};});
 assert.equal(returned.reusedDisposed,0);assert.equal(returned.registeredReused,false);assert.equal(returned.cryptTextures,1);assert(returned.sharedExistingImage&&returned.distinctTexture);lifecycle.push({cycle,...departed,...returned});
}
assert.deepEqual(errors,[],'No runtime errors');assert.equal(hash(fs.readFileSync(input)),sha256,'Input preserved byte-for-byte');
fs.writeFileSync(dir+'/'+stage+'-report.json',JSON.stringify({passed:true,input,sha256,fixtureSHA256,zoneSynchronized:true,cameras:records,errors,resources,lifecycle},null,2));console.log(JSON.stringify({errors,counts:{textures:resources.textures,images:resources.images,materials:resources.materials,renderer:resources.renderer}}));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
