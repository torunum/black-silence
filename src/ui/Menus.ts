import { save } from "../save/SaveGame";
import { LEVELS } from "../world/levels/index";
import { getMasterVolume, setMasterVolume } from "../audio/AudioEngine";

/**
 * The menu screens — new game, chapter select, settings — and the wiring
 * that switches between them. Moved verbatim from `src/legacy.js`'s "MAIN
 * LOOP + BOOT" section (formerly lines 83-110: `showScreen`, the five
 * `#mNew`/`#mSettings`/`#setBack`/`#chapBack`/`#mChapter` listeners, the
 * master-volume IIFE). `startGame` and `loop`, the section's other two
 * members, stay in `legacy.js` for Task 4.
 *
 * `startGame` isn't movable yet, so it arrives as a parameter, not a
 * `src/core/Context.ts` entry — that would be a bridge Task 4 removes one
 * task later. `legacy.js` calls `initMenus(startGame)` at module scope,
 * where the listeners used to register; in Task 4 the call moves to
 * `main.ts` and the argument becomes a direct import, with no line inside
 * this file changing either time.
 *
 * `showScreen` is called by three listeners and by `#mChapter`'s handler;
 * `grep -rn "showScreen" src/` found no caller outside this file, so it
 * stays unexported.
 *
 * The volume block reads `getMasterVolume()` and paints the slider at
 * *registration* time, so `initMenus` must run eagerly (it does, at module
 * scope) rather than lazily. It stays wrapped in its own IIFE, unchanged,
 * so `sl`/`vv` keep the block scope they had in the reference instead of
 * leaking into `initMenus`'s. The two `as unknown as` casts are
 * compile-time only — they let the same implicit number/string coercions
 * the reference relied on (an int assigned to `.value`, `.value` divided
 * by 100) satisfy the type checker without changing what runs.
 */
function showScreen(id: string): void {
  ["intro","chapsel","settings"].forEach(s=>
    document.getElementById(s).classList.toggle("hidden",s!==id));}

export function initMenus(startGame: (idx: number) => void): void {
  document.getElementById("mNew").addEventListener("click",()=>{save.maxLevel=0;startGame(0);});
  document.getElementById("mSettings").addEventListener("click",()=>showScreen("settings"));
  document.getElementById("setBack").addEventListener("click",()=>showScreen("intro"));
  document.getElementById("chapBack").addEventListener("click",()=>showScreen("intro"));
  document.getElementById("mChapter").addEventListener("click",()=>{
    const list=document.getElementById("chaplist");
    list.innerHTML="";
    LEVELS.forEach((lv,i)=>{
      const unlocked=i<=save.maxLevel;
      const row=document.createElement("div");
      const label=lv.name.replace(/^(LEVEL \d+|PROLOGUE)\s*—\s*/,"");
      const tag=i===0?"PROLOGUE":"CH "+i;
      row.className="mbtn"+(unlocked?"":" locked");
      row.textContent=unlocked?("[ "+tag+" · "+label+" ]"):("[ "+tag+" · LOCKED ]");
      if(unlocked)row.addEventListener("click",()=>startGame(i));
      list.appendChild(row);});
    showScreen("chapsel");});
  /* ---- settings: master volume ---- */
  (function(){
    const sl=document.getElementById("volSlider") as HTMLInputElement,vv=document.getElementById("volVal");
    sl.value=Math.round(getMasterVolume()*100) as unknown as string;vv.textContent=sl.value;
    sl.addEventListener("input",()=>{
      setMasterVolume((sl.value as unknown as number)/100);vv.textContent=sl.value;});
  })();
}
