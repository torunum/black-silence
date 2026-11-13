// A player-adjustable scanline layer; scene-specific CRT opacity and the
// separate damage/vignette layers still belong to their original owners.
(() => {
  function install() {
    const panel = document.getElementById("settings");
    const crt = document.getElementById("crt");
    const before = panel?.querySelector(".setsection");
    if (!before || !crt || document.getElementById("scanlineStrength")) return;
    const key = "black-silence.scanlines.v1";
    const style = document.createElement("style");
    style.textContent = `
      #settings .setrow input { min-width:0 }
      #settings :focus-visible, #mSettings:focus-visible { outline:2px solid #b8a26a; outline-offset:4px }
      @media (max-width:560px), (max-height:680px) {
        #settings { display:block; overflow-y:auto; overflow-x:hidden; padding:18px 0; box-sizing:border-box; text-align:center }
        #settings .setwrap { margin:18px auto 0; width:min(560px,92vw) }
        #settings .setrow { gap:8px; letter-spacing:1px }
        #settings .setlabel { flex-basis:min(34vw,150px) }
        #settings .ctrlgrid { gap:6px 12px; letter-spacing:1px }
        #settings .back { margin:18px auto 8px; width:fit-content }
      }`;
    document.head.appendChild(style);
    const row = document.createElement("div");
    row.className = "setrow";
    row.innerHTML = '<label class="setlabel" for="scanlineStrength">CRT SCANLINES</label><input type="range" id="scanlineStrength" min="0" max="100" step="5" value="100"><span class="setval"></span>';
    before.before(row);
    const input = row.querySelector("input"), label = row.querySelector(".setval");
    function apply(value) {
      input.value = String(value);
      label.textContent = value ? value + "%" : "OFF";
      input.setAttribute("aria-valuetext", value ? value + " percent" : "off");
      if (value === 100) crt.style.removeProperty("background-image");
      else crt.style.backgroundImage = value === 0 ? "none" :
        `repeating-linear-gradient(0deg,rgba(0,0,0,${0.22*value/100}) 0 1px,transparent 1px 3px)`;
    }
    let saved = null;
    try { saved = localStorage.getItem(key); } catch (_) { /* session-only */ }
    const value = Number(saved);
    apply(saved !== null && saved.trim() !== "" && Number.isInteger(value) &&
      value >= 0 && value <= 100 && value % 5 === 0 ? value : 100);
    input.addEventListener("input", () => {
      const value = input.valueAsNumber;
      apply(value);
      try { localStorage.setItem(key, String(value)); } catch (_) { /* session-only */ }
    });
    const title = [...panel.querySelectorAll(".ctrlgrid span")].find(el => el.textContent.trim() === "WEAPONS");
    if (title?.nextElementSibling) title.nextElementSibling.textContent = "1–9, 0 / WHEEL";
    for (const id of ["mSettings","setBack"]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.setAttribute("role","button"); button.tabIndex = 0;
      button.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault(); e.stopPropagation();
        button.click();
        if (id === "mSettings") input.focus();
        else document.getElementById("mSettings")?.focus();
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
