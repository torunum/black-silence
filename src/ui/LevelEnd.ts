import { S } from "../core/State";
import { save } from "../save/SaveGame";
import { LEVELS } from "../world/levels/index";
import { loadLevel } from "../world/LevelLoader";
import { stopBossMusic } from "../audio/Ambient";
import { ach } from "./Toasts";
import { ACHIEVEMENTS } from "../content/achievements";
import { renderState } from "../render/Renderer";
import { el } from "./dom";

/**
 * Level end, the win screen, and the two scoring helpers they both call.
 * Moved verbatim from `src/legacy.js`'s "LEVEL END + WIN + HUD" section
 * (formerly lines 106-139: `gradeOf` 106-112, `statsHtml` 113-118,
 * `endLevel` 119-127, the `#lebtn` click listener 128-132, `showWin`
 * 133-139; `reference/sonsurum.html` lines 3833-3866 for the same five).
 * `hud` — the section's sixth function — moves separately to
 * `src/ui/Hud.ts`: it calls none of these four and nothing here calls it,
 * so the split is two independent leaves, not one file needing to import
 * the other.
 *
 * `endLevel` used to be reached from `src/player/Player.ts`'s `playerTick`
 * exit-pad branch through `src/core/Context.ts`'s locator, and `showWin`
 * from `src/enemies/Death.ts`'s `bossDeath` (inside a `setTimeout`) the
 * same way, because both still lived in `legacy.js`. Both call sites now
 * import this file directly, and `Context.ts` retires both entries,
 * leaving only `wakeBoss` — see that file's own doc comment and
 * `docs/known-issues.md` KNOWN-2 for why `wakeBoss` stays.
 *
 * The `#lebtn` click listener sits between `endLevel` and `showWin` in the
 * original section. It is boot-time DOM wiring, the same kind as the
 * piano's `mousedown` handlers in `src/ui/Piano.ts`, so it moves here at
 * module scope, unchanged, rather than becoming a function of its own.
 */

export function gradeOf(): string {
  const acc=S.shots>0?S.hitsLanded/S.shots:0;
  const score=(S.enemiesTotal?S.kills/S.enemiesTotal:1)*40+
    (S.secretsTotal?S.secrets/S.secretsTotal:1)*25+Math.min(1,acc)*25+
    Math.min(1,S.propsBroken/10)*10;
  if(acc>=.7)ach(ACHIEVEMENTS.deadeye,S.ach);
  return score>=85?"S":score>=70?"A":score>=55?"B":score>=40?"C":"D";}
export function statsHtml(): string {
  const t=((performance.now()-S.levelT0)/1000)|0;
  const acc=S.shots>0?Math.round(100*S.hitsLanded/S.shots):0;
  return `KILLS <b>${S.kills} / ${S.enemiesTotal}</b> · GIBBED <b>${S.gibs}</b><br>`+
    `SECRETS <b>${S.secrets} / ${S.secretsTotal}</b> · OBJECTS BROKEN <b>${S.propsBroken}</b><br>`+
    `ACCURACY <b>${acc}%</b> · TIME <b>${(t/60|0)}:${String(t%60).padStart(2,"0")}</b>`;}
export function endLevel(): void {
  if(S.won)return;S.won=true;
  save.maxLevel=Math.max(save.maxLevel,Math.min(S.level+1,LEVELS.length-1));
  stopBossMusic();document.exitPointerLock();
  el("legrade").textContent=gradeOf();
  el("lestats").innerHTML=statsHtml();
  const nextName=LEVELS[S.level+1]?LEVELS[S.level+1].name.replace(/^LEVEL \d+ — /,""):"";
  el("lebtn").textContent="[ DESCEND TO "+nextName+" ]";
  el("levelend").classList.remove("hidden");}
el("lebtn").addEventListener("click",()=>{
  el("levelend").classList.add("hidden");
  S.won=false;
  loadLevel(S.level+1);
  renderState.renderer.domElement.requestPointerLock();});
export function showWin(): void {
  if(S.dead)return;S.won=true;
  stopBossMusic();document.exitPointerLock();
  el("wingrade").textContent=gradeOf();
  el("winstats").innerHTML=statsHtml()+
    `<br>ACHIEVEMENTS <b>${Object.keys(S.ach).length}</b> · TOTAL KILLS <b>${S.totKills}</b>`;
  el("win").classList.remove("hidden");}
