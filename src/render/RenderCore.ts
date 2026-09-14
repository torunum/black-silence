import * as THREE from "three";
// Side-effect import. Must precede anything that constructs a THREE.Color —
// see ColorPolicy.ts for why it is a module and not a line in this file.
import "./ColorPolicy";
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
// Restores r128's light model. Without it the game renders almost unlit —
// verified by eye, not predicted: matched frames of the prologue and of
// level 1 were captured on r128, on r186, and on this build, and r186's
// torch-lit walls go nearly black in both scenes. `useLegacyLights` brings
// back the pi intensity scale and the old point-light falloff branch, and
// the two scenes come back to the r128 look.
//
// The residual difference is `MeshLambertMaterial` shading per fragment
// instead of per vertex, which r164 already does and the flag does not
// undo. It reads as slightly smoother and slightly brighter than r128 —
// most visible on the dungeon ceiling, which r128 left dark.
//
// THE COST, stated plainly: this flag was deleted in r165, so taking it
// pins the project at 0.164.1 until someone retunes the ten lights for the
// modern model with a human at the game. The alternative is r186 plus that
// retune, now, which is real art work and not a mechanical change.
(renderState.renderer as unknown as { useLegacyLights: boolean }).useLegacyLights = true;
// Tone mapping, unchanged from the reference (`reference/sonsurum.html:904`).
// The ACES fit itself is byte-identical between three@0.128.0 and
// three@0.186.0 — the two `ACESFilmicToneMapping( vec3 color )` shader
// functions were diffed and match character for character, matrices, the
// `toneMappingExposure / 0.6` prescale and all — so nothing about this
// operator changed in the upgrade. **What changed is its input.** For this
// game's MeshLambertMaterial, r128's lights_lambert_vertex applied
// `directLightColor_Diffuse = PI * directLight.color` unconditionally for
// every point/spot/directional light (not the `#ifndef
// PHYSICALLY_CORRECT_LIGHTS`-guarded `irradiance *= PI` in
// getAmbientLightIrradiance, which only ever covered the ambient/hemi path).
// r186 has no such multiply anywhere in the direct-light path either, so
// every diffuse contribution now arrives at this curve pi times smaller —
// ambient included — and point lights additionally arrive through a
// different falloff shape. ACES is
// nearly linear in the toe and only rolls off near the shoulder, so the
// expected result is a picture that is roughly pi times darker **and**
// visibly flatter — most of the filmic highlight compression this exposure
// was tuned for no longer gets reached — except immediately next to a point
// light, where the new inverse-power falloff spikes and ACES will clip
// toward white. Neither the operator nor the 1.15 exposure is retuned here;
// that is a decision for the human who can actually see the two builds.
renderState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderState.renderer.toneMappingExposure = 1.15;
// sRGB output encoding. **Unconditional, deliberately.** Until the Phase 2B
// upgrade this line read `if (THREE.sRGBEncoding !== undefined)
// renderState.renderer.outputEncoding = THREE.sRGBEncoding;` — a tripwire for
// the upgrade, because on three@0.128.0 `sRGBEncoding` is 3001 and the line
// ran, while on any modern three it is `undefined`, so the guard would have
// made the line a silent no-op and switched sRGB output off with no error and
// no failing test (docs/known-issues.md KNOWN-14).
//
// It is written without a guard now for the same reason the guard was wrong:
// a conditional that quietly does nothing is exactly the failure this line
// has to stop being capable of. If a future three renames or removes
// `SRGBColorSpace`, `tsc --noEmit` fails here and the upgrade is a decision
// again rather than an accident.
//
// `SRGBColorSpace` is also the modern default for `outputColorSpace`, so this
// assignment is a no-op on r186 in the same sense the old one was a real
// change on r128. It stays written out because the value is a deliberate
// choice, and because a default that changes underneath a silent reliance is
// how this row was created in the first place.
//
// Equivalence to the old line was checked in three's own source rather than
// assumed: `getEncodingComponents` (build/three.module.js) emits
// `sRGBTransferOETF` for `SRGBColorSpace` and is **not** gated on
// `ColorManagement.enabled`, so the shader-side encode this performs is the
// same one r128's `outputEncoding = sRGBEncoding` performed, independently of
// the `ColorPolicy.ts` decision above.
renderState.renderer.outputColorSpace = THREE.SRGBColorSpace;

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
