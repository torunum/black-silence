const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {pathToFileURL}=require("node:url"),{chromium}=require("playwright");
const html=path.resolve(process.env.GAME_HTML||path.join(__dirname,"../THE-BLACK-SILENCE.html"));
const href=pathToFileURL(html).href+"?qa=1";
(async()=>{
  const b=await chromium.launch({channel:"chrome"});
  const p=await b.newPage({viewport:{width:960,height:600}}),errors=[],checks=[];
  p.on("pageerror",e=>errors.push(e.message));
  const q=async fn=>p.evaluate(fn);
  // Chromium can expose the captured canvas before the game's lock event runs.
  const waitLock=()=>p.waitForFunction(()=>document.pointerLockElement===document.querySelector("#game")&&
    __BLACK_SILENCE_QA.Ct.locked&&document.getElementById("pause").classList.contains("hidden"));
  try{
    await p.goto(href);await p.locator("#mNew").click();await waitLock();
    await p.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);
    // Read the actual relative deltas Chromium delivered to the original
    // document listener, immediately around its native yaw/pitch writes.
    await p.evaluate(()=>{
      const q=__BLACK_SILENCE_QA; q.C.spawnGuard=100;
      window.lookSamples=[];
      window.addEventListener("mousemove",e=>{window.lookBefore={
        yaw:q.Ct.yaw,pitch:q.Ct.pitch,zoom:q.St.zoomLerp,
        x:e.movementX,y:e.movementY,locked:q.Be.inputLock
      };},true);
      document.addEventListener("mousemove",()=>{
        lookSamples.push({...lookBefore,afterYaw:q.Ct.yaw,afterPitch:q.Ct.pitch});
      });
    });
    let pointerX=425,pointerY=245;
    async function move(dx,dy,gain=1,sign=1,options={}) {
      const size=await p.evaluate(options=>{
        const q=__BLACK_SILENCE_QA;
        if("pitch" in options)q.Ct.pitch=options.pitch;
        if("locked" in options)q.Be.inputLock=options.locked;
        if("zoom" in options)q.St.zoomLerp=options.zoom;
        return lookSamples.length;
      },options);
      pointerX+=dx;pointerY+=dy;
      await p.mouse.move(pointerX,pointerY);
      await p.waitForFunction(size=>lookSamples.length>size,size);
      const f=await q(()=>lookSamples.at(-1));
      const rate=.0022*(1-.68*f.zoom);
      const y=f.locked?f.yaw:f.yaw-f.x*gain*rate;
      const v=f.locked?f.pitch:Math.max(-1.45,Math.min(1.45,f.pitch-f.y*gain*sign*rate));
      assert(Math.abs(f.afterYaw-y)<1e-8 && Math.abs(f.afterPitch-v)<1e-8,JSON.stringify({f,gain,sign,y,v}));
      return f;
    }
    await move(0,0); await move(38,15);
    checks.push("Default real mouse input matches the original gain, zoom and clamp");
    const save=await q(()=>({s:__BLACK_SILENCE_QA.J.scene.uuid,level:__BLACK_SILENCE_QA.T.level,
      mag:__BLACK_SILENCE_QA.T.mag.slice(),ammo:{...__BLACK_SILENCE_QA.T.ammo},x:__BLACK_SILENCE_QA.C.px,z:__BLACK_SILENCE_QA.C.pz}));
    const open=async()=>{
      await p.evaluate(()=>document.exitPointerLock());await p.locator("#pauseSettings").waitFor();
      await p.locator("#pauseSettings").click();await p.locator("#lookSensitivity").waitFor();
    };
    await open();
    if(process.env.SETTINGS_PROOF) {
      const out=path.resolve(process.env.SETTINGS_PROOF);fs.mkdirSync(out,{recursive:true});
      await p.screenshot({path:path.join(out,"in-game-settings.png")});
    }
    await p.setViewportSize({width:360,height:480});
    const slider=p.locator("#lookSensitivity"),flip=p.locator("#invertLook");
    await slider.focus();await p.keyboard.press("End");assert.equal(await slider.inputValue(),"200");
    await flip.focus();await p.keyboard.press("Space");assert(await flip.isChecked());
    for(const id of ["volSlider","resSlider","shadowSlider","scanlineStrength"]) {
      await p.locator("#"+id).focus();await p.keyboard.press("ArrowLeft");
    }
    await p.keyboard.press("KeyR");await p.keyboard.press("KeyE");await p.keyboard.press("Digit3");
    await p.mouse.wheel(0,220);await p.waitForTimeout(80);
    const preserved=await q(()=>({s:__BLACK_SILENCE_QA.J.scene.uuid,level:__BLACK_SILENCE_QA.T.level,
      mag:__BLACK_SILENCE_QA.T.mag.slice(),ammo:{...__BLACK_SILENCE_QA.T.ammo},x:__BLACK_SILENCE_QA.C.px,z:__BLACK_SILENCE_QA.C.pz}));
    assert.deepEqual(preserved,save);assert(await q(()=>!__BLACK_SILENCE_QA.Ct.firing&&!document.pointerLockElement));
    const back=p.locator("#setBack");await back.scrollIntoViewIfNeeded();await back.focus();
    const bounds=await back.boundingBox();assert(bounds && bounds.y+bounds.height<=481);
    await p.keyboard.press("Space");await p.locator("#pauseSettings").waitFor();
    if(process.env.SETTINGS_PROOF)
      await p.screenshot({path:path.join(path.resolve(process.env.SETTINGS_PROOF),"pause-short.png")});
    assert.equal(await q(()=>document.activeElement.id),"pauseSettings");
    await p.locator("#pauseResume").focus();await p.keyboard.press("Enter");await waitLock();
    checks.push("Short-screen controls, Back and Resume preserve the same scene and player inventory");
    // Restoring the viewport changes the browser's relative-movement origin.
    await p.setViewportSize({width:960,height:600});
    await move(10,10,2,-1,{pitch:0});await move(4,11,2,-1,{pitch:1.447});
    const retreat=await move(-1,-2,2,-1);
    assert(retreat.afterPitch<1.45,"First reverse movement leaves the upper boundary");
    await move(10,-15,2,-1,{pitch:-1.445});
    const other=await move(2,3,2,-1);assert(other.afterPitch> -1.45);
    await move(12,-11,2,-1,{zoom:.85,pitch:0});
    await move(9,7,2,-1,{locked:true});
    await p.evaluate(()=>{__BLACK_SILENCE_QA.Be.inputLock=false;});
    checks.push("Custom sensitivity and inverted Y preserve native zoom, input lock and both pitch limits");
    await open();await p.keyboard.press("Escape");assert(await p.locator("#pauseResume").isVisible());
    await p.locator("#pauseResume").click();await waitLock();
    assert.equal(await q(()=>__BLACK_SILENCE_QA.T.shots),0,"Mouse resume does not fire the weapon");
    await p.reload();await p.locator("#mSettings").click();assert.equal(await slider.inputValue(),"200");
    assert(await flip.isChecked());checks.push("Settings survive reopening the file; normal Settings and mouse Resume remain usable");
    await p.evaluate(()=>localStorage.setItem("black-silence.look.v1",'{"sensitivity":0,"inverted":"yes"}'));
    await p.reload();await p.locator("#mSettings").click();assert.equal(await slider.inputValue(),"100");assert(!(await flip.isChecked()));
    const denied=await b.newContext();const deniedPage=await denied.newPage();
    await deniedPage.addInitScript(()=>Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Blocked","SecurityError");}}));
    await deniedPage.goto(href);await deniedPage.locator("#mSettings").click();
    assert.equal(await deniedPage.locator("#lookSensitivity").inputValue(),"100");
    await deniedPage.locator("#lookSensitivity").focus();await deniedPage.keyboard.press("Home");
    assert.equal(await deniedPage.locator("#lookSensitivity").inputValue(),"25");await denied.close();
    checks.push("Invalid saved values use defaults and storage denial still permits session changes");
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks}));
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
