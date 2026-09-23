import { game } from "./Game";
import { S } from "./State";
import { renderState } from "../render/Renderer";
import { el } from "../ui/dom";
import { audioInit } from "../audio/AudioEngine";
import { buildTextures } from "../render/ProcTextures";
import { buildBandTextures } from "../render/BandTextures";
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
 * `buildBandTextures` (the trim bands, `src/render/BandTextures.ts`) was
 * added later, beside `buildTextures` rather than inside it; it draws
 * nothing from `Math.random`, so it moves no seeded draw after it.
 *
 * Passed to `src/ui/Menus.ts`'s `initMenus` as a parameter rather than
 * imported there directly, so that module never has to reach into this one.
 */
export function startGame(idx: number){
  if(game.started)return;
  el("intro").classList.add("hidden");
  el("chapsel").classList.add("hidden");
  el("settings").classList.add("hidden");
  game.started=true;
  audioInit();
  buildTextures();buildBandTextures();buildSprites();buildItemTex();buildWeaponSprites();buildPiano();
  loadLevel(idx||0);
  S.t0=performance.now();
  renderState.renderer.domElement.requestPointerLock();}
