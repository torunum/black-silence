// Use the existing settings panel for input and presentation preferences.
(() => {
  const key="black-silence.look.v1";
  const shakeKey = "black-silence.impact-shake.v1";
  const shakeLabels = { 0: "Off", 50: "Reduced", 100: "Full" };
  let impactShake = 100;
  let sensitivity=100, inverted=false, fromPause=false;
  try {
    const text=localStorage.getItem(key);
    if(text && text.length<=80) {
      const s=JSON.parse(text);
      if(Number.isInteger(s?.sensitivity) && s.sensitivity>=25 && s.sensitivity<=200 &&
          s.sensitivity%5===0 && typeof s.inverted==="boolean") {
        sensitivity=s.sensitivity; inverted=s.inverted;
      }
    }
  } catch { /* Keep the session defaults. */ }
  try {
    const savedShake = localStorage.getItem(shakeKey);
    if (Object.hasOwn(shakeLabels, savedShake)) impactShake = Number(savedShake);
  } catch { /* Keep the session default. */ }
  // The original listener observes this event later at the document. Adjust
  // its relative motion before the native zoom gain, sway limits and pitch
  // clamp are applied. Default input has no event allocation or mutation.
  document.addEventListener("mousemove",event=>{
    if((sensitivity===100 && !inverted) || !Ct.locked || Be.inputLock || Wk()) return;
    const gain=sensitivity/100;
    Object.defineProperties(event,{
      movementX:{configurable:true,value:event.movementX*gain},
      movementY:{configurable:true,value:event.movementY*gain*(inverted?-1:1)},
    });
  },true);

  // Hitscan and projectiles read the native camera. Sample the movement
  // camera's trauma offset and adjust it only inside the two render passes.
  // Both contact projections and world geometry use the same display pose.
  let shakeView = null;
  const movePlayer = m_;
  m_ = function (dt) {
    shakeView = null;
    const result = movePlayer(dt);
    if (impactShake === 100 || Be.inputLock || T.dead || T.won || !He.trauma) return result;
    const camera = J.camera;
    const bob = C.grounded ? C.lastBobSin * 0.025 * Math.min(1, Math.hypot(C.vx, C.vz) / 7) : 0;
    shakeView = {
      camera, scene: J.scene,
      x: camera.position.x, y: camera.position.y, roll: camera.rotation.z,
      steadyX: C.px, steadyY: C.pyy + bob,
    };
    return result;
  };

  function drawWithImpactShake(camera, view, draw) {
    const { position, rotation } = camera;
    // A level handoff or scripted camera may have replaced the sampled pose.
    if (Be.inputLock || view.camera !== camera || view.scene !== J.scene ||
        view.x !== position.x || view.y !== position.y || view.roll !== rotation.z) return draw();
    const gain = impactShake / 100;
    position.x = view.steadyX + (view.x - view.steadyX) * gain;
    position.y = view.steadyY + (view.y - view.steadyY) * gain;
    rotation.z = view.roll * gain;
    try {
      camera.updateMatrixWorld(true);
      return draw();
    } finally {
      position.x = view.x;
      position.y = view.y;
      rotation.z = view.roll;
      camera.updateMatrixWorld(true);
    }
  }

  const drawViewmodel = Tj;
  Tj = function (dt, time, zoom, drawBoot, drawHands) {
    if (impactShake === 100 || !shakeView) return drawViewmodel(dt, time, zoom, drawBoot, drawHands);
    return drawWithImpactShake(J.camera, shakeView, () => drawViewmodel(dt, time, zoom, drawBoot, drawHands));
  };
  const drawWorld = Utt;
  Utt = function (camera, kick, draw, drop) {
    if (impactShake === 100 || !shakeView) return drawWorld(camera, kick, draw, drop);
    return drawWithImpactShake(camera, shakeView, () => drawWorld(camera, kick, draw, drop));
  };

  function install() {
    const pause=Jt("pause"), settings=Jt("settings"), back=Jt("setBack");
    const open=document.createElement("button");
    open.type="button";open.id="pauseSettings";open.className="mbtn";
    open.textContent="[ SETTINGS ]";
    open.style.cssText="appearance:none;box-sizing:content-box;background:transparent;font-family:inherit";
    Jt("pauseMenu").before(open);
    const before=settings.querySelector(".setsection");
    const look=document.createElement("div");
    look.className="setrow";
    look.innerHTML='<label class="setlabel" for="lookSensitivity">MOUSE SENSITIVITY</label><input id="lookSensitivity" type="range" min="25" max="200" step="5"><span class="setval"></span>';
    const invert=document.createElement("div");
    invert.className="setrow";
    invert.innerHTML='<label class="setlabel" for="invertLook">INVERT Y</label><input id="invertLook" type="checkbox"><span class="setval"></span>';
    const shake = document.createElement("div");
    shake.className = "setrow";
    shake.innerHTML = '<label class="setlabel" for="impactShake">IMPACT SHAKE</label><input id="impactShake" type="range" min="0" max="100" step="50"><span class="setval" style="flex-basis:70px;font-size:11px"></span>';
    before.before(look,invert,shake);
    const slider=look.querySelector("input"),box=invert.querySelector("input");
    const shakeSlider = shake.querySelector("input");
    function update() {
      slider.value=String(sensitivity);
      slider.setAttribute("aria-valuetext",sensitivity+" percent");
      look.lastElementChild.textContent=sensitivity+"%";
      box.checked=inverted;
      invert.lastElementChild.textContent=inverted?"ON":"OFF";
    }
    function store() {
      update();
      try { localStorage.setItem(key,JSON.stringify({sensitivity,inverted})); } catch {}
    }
    slider.addEventListener("input",()=>{sensitivity=slider.valueAsNumber;store();});
    box.addEventListener("change",()=>{inverted=box.checked;store();});
    function updateShake() {
      const label = shakeLabels[impactShake];
      shakeSlider.value = String(impactShake);
      shakeSlider.setAttribute("aria-valuetext", label);
      shake.lastElementChild.textContent = label;
    }
    shakeSlider.addEventListener("input", () => {
      impactShake = shakeSlider.valueAsNumber;
      updateShake();
      try { localStorage.setItem(shakeKey, String(impactShake)); } catch {}
    });
    update();
    updateShake();
    function enter() {
      if(!Wk()) return;
      fromPause=true;
      Ct.firing=false;
      for(const name of Object.keys(li)) li[name]=false;
      pause.classList.add("hidden");settings.classList.remove("hidden");
      slider.focus({preventScroll:true});
    }
    function leave() {
      fromPause=false;
      settings.classList.add("hidden");pause.classList.remove("hidden");
      open.focus({preventScroll:true});
    }
    function resume() {
      J.renderer.domElement.requestPointerLock?.();
    }
    open.addEventListener("click",enter);
    back.addEventListener("click",event=>{
      if(!fromPause) return;
      event.stopImmediatePropagation();
      leave();
    },true);
    // Native gameplay listens at window. Let each control perform its normal
    // slider, checkbox and keyboard action, then stop it at the overlay.
    for(const event of ["mousedown","mouseup","wheel","keydown","keyup"])
      settings.addEventListener(event,e=>{
        if(!fromPause)return;
        e.stopPropagation();
        if(event==="keydown" && e.key==="Escape"){e.preventDefault();leave();}
      });
    for(const event of ["mousedown","mouseup","wheel","keydown","keyup"])
      pause.addEventListener(event,e=>e.stopPropagation());
    Jt("pauseResume").addEventListener("click",resume);
    for(const id of ["pauseResume","pauseMenu"]) {
      const action=Jt(id);
      action.setAttribute("role","button");action.tabIndex=0;
      action.addEventListener("keydown",e=>{
        if(e.key!==" " && e.key!=="Enter") return;
        e.preventDefault();e.stopPropagation();action.click();
      });
    }
    // The display panel's native key handler focuses its main-menu trigger
    // after Space on Back. Keep keyboard focus inside this in-game flow.
    back.addEventListener("keydown",e=>{
      if(!fromPause || (e.key!==" " && e.key!=="Enter"))return;
      e.preventDefault();e.stopImmediatePropagation();leave();
    },true);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
