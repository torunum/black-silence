import * as THREE from "three";

/**
 * COLOUR POLICY — the one global Three.js setting that has to be in place
 * before the first `THREE.Color` in the process is constructed.
 *
 * ## What this line does
 *
 * Three.js r152 turned `ColorManagement` on by default. With it on,
 * `Color.setHex(0xffb060)` no longer stores `(1.0, 0.690, 0.376)`; it treats
 * the hex as sRGB and decodes it into the linear-sRGB working space, storing
 * `(1.0, 0.418, 0.117)`. Every authored colour constant in this game — the
 * ten hand-tuned light colours, the fog and background colours, the gib and
 * decal materials, the elite tint — would silently change meaning, while
 * reading exactly the same on the way back out (`Color.getHex()` re-encodes
 * to sRGB, so the round trip is lossless — measured over all 2^24 hex values
 * at three@0.186.0, zero mismatches, with the flag both on and off).
 *
 * Turning it **off** makes `Color` behave numerically exactly as it did on
 * the pinned three@0.128.0 this project was ported from.
 *
 * ## Why off, and why that is not a retune
 *
 * This is the Phase 2B upgrade's deliberate choice to hold one variable
 * fixed, not a compensation. The r128 -> r186 upgrade already forces one
 * unavoidable change to the lighting model that no flag at this version can
 * opt out of (see `RenderCore.ts`'s note on tone mapping and
 * `docs/known-issues.md` KNOWN-14): diffuse lighting is now pi times dimmer,
 * point-light falloff changed shape, and `MeshLambertMaterial` shades per
 * fragment instead of per vertex. Leaving colour management on would stack a
 * second, entirely optional, independent colour shift on top of that one, and
 * the human doing the side-by-side against `reference/sonsurum.html` would
 * have no way to attribute what they see to either cause.
 *
 * Note what it does **not** touch: textures. Every texture in this game is a
 * `CanvasTexture` built by `ProcTextures`/`SpriteBaker`/`ItemTextures`, and
 * `Texture.colorSpace` defaults to `NoColorSpace` in modern three exactly as
 * `Texture.encoding` defaulted to `LinearEncoding` in r128 — no decode is
 * applied either way. So this flag's entire reach is `THREE.Color` values.
 *
 * ## Why this is a module of its own, imported for side effect
 *
 * The flag is read by `Color.setHex`/`Color.set` at the moment a colour is
 * constructed, so it must be set before any of them run. Several modules
 * build materials with colours at *module scope* — `fx/Decals.ts`,
 * `fx/Gibs.ts`, `weapons/WeaponState.ts`, `enemies/ai/Attacks.ts` — and ES
 * modules evaluate their imports before their own body, so each of those
 * imports this file first and the ordering is guaranteed by the module
 * graph rather than by luck. A module with colours at module scope that
 * forgets this import would get colour-managed colours while the rest of the
 * game does not; `tests/render/colorPolicy.test.ts` pins the flag and the
 * raw channel values of one such module-scope material so the mixture is not
 * silent.
 *
 * **If the side-by-side says the upgraded build looks wrong, this is not the
 * first line to change** — see the reversal order in
 * `.superpowers/sdd/2026-09-14-phase2b-threejs-evaluated/task-1-report.md`.
 */
THREE.ColorManagement.enabled = false;
