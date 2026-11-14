// Use the existing settings panel and native mouse-look handler while paused.
(() => {
  const key="black-silence.look.v1";
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
    before.before(look,invert);
    const slider=look.querySelector("input"),box=invert.querySelector("input");
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
    update();
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
