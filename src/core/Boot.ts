import { game } from "./Game";
import { S } from "./State";
import { renderState } from "../render/Renderer";
import { audioInit } from "../audio/AudioEngine";
import { buildTextures } from "../render/ProcTextures";
import { buildSprites } from "../enemies/SpriteBaker";
import { buildItemTex } from "../render/ItemTextures";
import { buildWeaponSprites } from "../render/viewmodel/sprites";
import { buildPiano } from "../ui/Piano";
import { loadLevel } from "../world/LevelLoader";

/**
 * Starts a run: hides the menu screens, builds every procedural texture and
 * sprite sheet, loads the level and takes pointer lock. Moved verbatim from
 * `src/legacy.js`'s `startGame` — it calls `audioInit`, the five builders
 * and `loadLevel`, all of which were already modules before this task.
 *
 * Passed to `src/ui/Menus.ts`'s `initMenus` as a parameter rather than
 * imported there directly, so that module never has to reach into this one.
 */
export function startGame(idx: number){
  if(game.started)return;
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("chapsel").classList.add("hidden");
  document.getElementById("settings").classList.add("hidden");
  game.started=true;
  audioInit();
  buildTextures();buildSprites();buildItemTex();buildWeaponSprites();buildPiano();
  loadLevel(idx||0);
  S.t0=performance.now();
  renderState.renderer.domElement.requestPointerLock();}
