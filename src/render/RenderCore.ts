import * as THREE from "three";
import { renderState } from "./Renderer";
import { track } from "./DisposeRegistry";
import { save } from "../save/SaveGame";

/**
 * RENDER CORE — the camera and WebGL renderer construction, the
 * window-resize handler that keeps them sized, and the two raw Three.js
 * object builders (`addSprite`, `addBlob`) most other systems reach for.
 *
 * Moved verbatim from src/legacy.js's "THREE CORE" section (formerly lines
 * 51-59, `reference/sonsurum.html` lines 902-911) and its `addSprite`/
 * `addBlob` builders (formerly lines 67-73, `reference/sonsurum.html`
 * lines 1532-1543 — the reference declares `blobTexC`/`blobTex`/`addSprite`/
 * `addBlob` far from `sizeRender`, next to ITEMTEX; the port had already
 * pulled them up next to THREE CORE).
 *
 * Ordering hazard this module exists to avoid: legacy.js imports this
 * module, so this module's top-level body runs before legacy.js's own
 * top-level statements do. `sizeRender()` is called immediately below (not
 * from an init function called later — that would change when the
 * renderer is first sized) and dereferences `renderState.camera`/
 * `.renderer`. If only `sizeRender` moved here while the camera/renderer
 * construction stayed behind in legacy.js, this module's immediate call
 * would run first and dereference two still-null fields. So the
 * construction moved here too, ahead of `sizeRender`, preserving the
 * original build-then-size-then-listen order by construction rather than
 * by import placement.
 *
 * legacy.js imports this module after ./render/Overlay2D (which registers
 * its own `resize` listener, `sizeFx`, at its own module scope and calls
 * it immediately). That import order was already in place before this
 * module existed — Overlay2D's import preceded the old THREE CORE section
 * in legacy.js's file order — and is kept, so `sizeFx` still runs before
 * `sizeRender` on both the initial call and every future resize, exactly
 * as before. The two write disjoint state (the 2D overlay canvas vs. the
 * WebGL renderer/camera), so nothing depends on this order today, but it
 * is preserved deliberately rather than left to import-list accident.
 */

renderState.camera = new THREE.PerspectiveCamera(78, 4 / 3, 0.05, 90);
renderState.renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("game") as HTMLCanvasElement,
  antialias: false,
});
renderState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderState.renderer.toneMappingExposure = 1.15;
// The `!== undefined` guard is NOT defensive coding — it is a tripwire, and
// it currently points the wrong way. On the pinned three@0.128.0
// `THREE.sRGBEncoding` is 3001 and this line runs. On any modern three it is
// `undefined` (renamed to `SRGBColorSpace`, and `outputEncoding` renamed to
// `outputColorSpace`), so the line would silently do nothing and sRGB output
// encoding would quietly switch off — every colour in the game would shift,
// with no error, no test failure, and nothing in this repo able to see it.
// Plan 0F Task 11 evaluated the upgrade and deferred it for exactly that
// reason; see docs/known-issues.md KNOWN-14 for the full decision.
if (THREE.sRGBEncoding !== undefined) renderState.renderer.outputEncoding = THREE.sRGBEncoding;

/** Internal render widths, in pixels. 400 is the reference's hardcoded value and stays the default. */
export const RENDER_WIDTHS = [320, 400, 512, 640, 800] as const;

export function sizeRender(): void {
  const a=innerWidth/innerHeight,w=save.renderWidth,h=Math.round(w/a);
  renderState.renderer.setSize(w,h,false);renderState.camera.aspect=a;renderState.camera.updateProjectionMatrix();
  const c=renderState.renderer.domElement;c.style.width="100%";c.style.height="100%";
}
// This call runs during module evaluation, before main.ts's body — including
// its loadSave() — ever runs (main.ts imports this module transitively, and
// every module in an import graph evaluates before the importing module's
// own top-level statements do). So this first call always sizes the
// renderer at save.renderWidth's *module-load default* (400), never a
// stored value, no matter what's in localStorage. main.ts calls sizeRender()
// again immediately after loadSave() to apply whatever was actually loaded;
// see the comment there. Left here unchanged (not deferred into an init
// function) because the class-level comment above already depends on this
// call running immediately, before anything can read a still-null
// renderState.camera/.renderer.
addEventListener("resize",sizeRender);sizeRender();

const blobTexC=document.createElement("canvas");blobTexC.width=blobTexC.height=32;
{const g=blobTexC.getContext("2d") as CanvasRenderingContext2D;const gr=g.createRadialGradient(16,16,2,16,16,16);
 gr.addColorStop(0,"rgba(0,0,0,.55)");gr.addColorStop(1,"rgba(0,0,0,0)");
 g.fillStyle=gr;g.fillRect(0,0,32,32);}
const blobTex=new THREE.CanvasTexture(blobTexC);

export function addSprite(tex: THREE.Texture, wx: number, wz: number, sw: number, sh: number, y?: number): THREE.Sprite {
  // `tex` is always a shared, boot-time-baked texture (PX/ITEMTEX) passed in
  // by the caller — never owned or disposed here. The SpriteMaterial wrapping
  // it is created fresh on every call (one per enemy/item/torch/candle, every
  // level), so it is tracked for loadLevel's disposeAll().
  const m=track(new THREE.SpriteMaterial({map:tex,transparent:true}));
  const sp=new THREE.Sprite(m);sp.scale.set(sw,sh,1);
  sp.position.set(wx,y!==undefined?y:sh/2,wz);renderState.scene.add(sp);return sp;
}

export function addBlob(wx: number, wz: number, s: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  // blobTex (above) is the one shared, module-scope texture every blob
  // reuses — never tracked. The geometry/material pair built for each blob
  // mesh is per-instance (one per enemy/barrel, every level) and tracked.
  const m=new THREE.Mesh(track(new THREE.PlaneGeometry(s,s)),
    track(new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false})));
  m.rotation.x=-Math.PI/2;m.position.set(wx,.012,wz);renderState.scene.add(m);return m;
}
