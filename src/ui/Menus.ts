import { save } from "../save/SaveGame";
import { LEVELS } from "../world/levels/index";
import { getMasterVolume, setMasterVolume } from "../audio/AudioEngine";
import { el } from "./dom";

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
    el(s).classList.toggle("hidden",s!==id));}

export function initMenus(startGame: (idx: number) => void): void {
  /**
   * NEW GAME used to also do `save.maxLevel=0` here — an in-memory reset
   * that cost nothing because nothing persisted. Now that `persist.ts`
   * exists, an unlock record survives a reload only if something flushes
   * it, and this click is reachable by accident from the title screen.
   * Flushing a reset here would let one misclick permanently erase every
   * chapter the player had unlocked; resetting only in memory (no flush)
   * is worse — it silently sets up the *next* legitimate flush (`endLevel`,
   * on finishing this fresh prologue run) to overwrite the real save with
   * the reset value, so the loss just happens later and looks like normal
   * play. NEW GAME therefore leaves `save.maxLevel` — and storage —
   * untouched and only restarts the run: chapter select still shows every
   * previously unlocked level throughout the session, and a misclick here
   * costs the player nothing but their current run's position.
   */
  el("mNew").addEventListener("click",()=>{startGame(0);});
  el("mSettings").addEventListener("click",()=>showScreen("settings"));
  el("setBack").addEventListener("click",()=>showScreen("intro"));
  el("chapBack").addEventListener("click",()=>showScreen("intro"));
  el("mChapter").addEventListener("click",()=>{
    const list=el("chaplist");
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
    const sl=document.getElementById("volSlider") as HTMLInputElement,vv=el("volVal");
    sl.value=Math.round(getMasterVolume()*100) as unknown as string;vv.textContent=sl.value;
    sl.addEventListener("input",()=>{
      setMasterVolume((sl.value as unknown as number)/100);vv.textContent=sl.value;});
  })();
}
