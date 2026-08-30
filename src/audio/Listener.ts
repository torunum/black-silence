import * as THREE from "three";
import { ctx, isReady } from "./AudioEngine";
import { renderState } from "../render/Renderer";

/**
 * Keeps the WebAudio listener glued to the camera, so a panned sound (see
 * `AudioEngine.ts`'s `emitAt()`/`masterBus()`/`echoBus()`) is heard relative
 * to where the player is looking, not a fixed point at the origin.
 * `updateListener()` is called once per frame from `src/core/Loop.ts`,
 * inside the existing `if(renderState.scene){...}` block — same place
 * everything else that reads the camera every frame already runs
 * (`partTick`/`gibTick`/`poolTick`/`headTick`/`torchTick`/`fxTick`).
 *
 * MODULE-SCOPE STATE CHECK (Phase 1 Task 2's two bugs were both "module
 * scope reads state boot has not loaded yet"): this file holds exactly one
 * piece of module state, `_fwd`, a scratch `THREE.Vector3` reused every call
 * purely to avoid a per-frame allocation — it is only ever *written* (by
 * `camera.getWorldDirection`) before being read in the same call, never read
 * across calls, and it does not depend on anything `loadSave()` or any other
 * boot step provides. So there is no boot-ordering hazard here: unlike a
 * persisted value, a scratch buffer has no "before it's loaded" state to be
 * caught out by. The two live things `updateListener()` actually reads —
 * `ctx()`/`isReady()` from `AudioEngine.ts` and `renderState.camera` — are
 * both accessed at call time (inside the function body, called every frame
 * from `Loop.ts`), never hoisted to this module's own top level, for the
 * same reason the audio accessors themselves are never cached: `isReady()`
 * is false and `renderState.camera` is still the pre-`RenderCore.ts` stub
 * until boot has actually run.
 *
 * FALLBACK: `AudioListener.positionX`/`forwardX`/`upX` (the modern,
 * automatable form) are used when present; `setPosition()`/`setOrientation()`
 * (deprecated, but still what jsdom and older Safari expose — Plan 1 Task
 * 3's brief) are the fallback. Guarded on presence rather than assumed,
 * exactly like `AudioEngine.ts`'s own `if(!ctx())return;` idiom: the DOM
 * lib's `AudioListener` type declares every one of these as always present
 * (the same "TYPE HONESTY" gap `AudioEngine.ts`'s accessors already
 * document — the type is stricter than the runtime guarantee), so only a
 * runtime presence check catches an environment that is missing one form.
 *
 * Does NOT use `THREE.PositionalAudio` or `THREE.AudioListener` — see
 * `docs/known-issues.md` KNOWN-14 and the Plan 1 Task 3 brief: routing game
 * audio through Three's audio layer would be invisible to
 * `tests/behavior/audio.test.ts`'s recorder and would couple audio behavior
 * to the pinned three@0.128.0 API. This talks to the real `AudioListener`
 * on the WebAudio graph `AudioEngine.ts` already owns.
 */

const _fwd = new THREE.Vector3();

/** Positions and orients the WebAudio listener at the camera. No-op before `audioInit()` has run. */
export function updateListener(): void {
  if (!isReady()) return;
  const listener = ctx().listener;
  if (!listener) return;

  const camera = renderState.camera;
  const pos = camera.position;
  camera.getWorldDirection(_fwd);
  const up = camera.up;

  if (listener.positionX) {
    listener.positionX.value = pos.x;
    listener.positionY.value = pos.y;
    listener.positionZ.value = pos.z;
    listener.forwardX.value = _fwd.x;
    listener.forwardY.value = _fwd.y;
    listener.forwardZ.value = _fwd.z;
    listener.upX.value = up.x;
    listener.upY.value = up.y;
    listener.upZ.value = up.z;
  } else if (typeof listener.setPosition === "function") {
    listener.setPosition(pos.x, pos.y, pos.z);
    if (typeof listener.setOrientation === "function") {
      listener.setOrientation(_fwd.x, _fwd.y, _fwd.z, up.x, up.y, up.z);
    }
  }
}
