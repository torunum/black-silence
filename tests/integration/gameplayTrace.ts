import * as THREE from "three";
import { installDomStubs, loadGameHtml, installFakeClock } from "../support/domStubs";
import { seedRandom } from "../support/seededRandom";
import { getScene } from "../../src/render/SceneRef";
import { save } from "../../src/save/SaveGame";

/**
 * A deterministic recording of the real game playing itself — the safety
 * net Plan 0D's 633 call-site rewrites lean on.
 *
 * `tests/behavior/*` compares each extracted module against
 * reference/sonsurum.html and would not notice a botched call site in
 * legacy.js. `tests/integration/wiring.test.ts` runs two frames and checks
 * what legacy.js *passes* to those modules, not what the game *does*.
 * Neither would catch `px` and `pz` swapped inside a movement formula,
 * which is the single most likely mistake in this plan.
 *
 * ## What it records, and why those things
 *
 * Only observables that sit downstream of the whole migration and do not
 * change shape as it proceeds:
 *
 * - **the camera** — its position is px/pyy/pz plus shake, its rotation is
 *   yaw/pitch plus recoil, its fov is zoomLerp. Six of the eleven groups
 *   being migrated are visible here, and none of them by name, so the trace
 *   keeps working when `px` becomes `player.px`.
 * - **the scene graph** — every child's position and visibility, plus (since
 *   Phase 3 Part B Task 1) the *name* of the texture on each child's
 *   material and that material's colour, which covers enemies, props,
 *   items, doors, gibs, decals and particles moving, spawning, despawning,
 *   changing sprite frame or changing tint. See `buildTextureIndex` and
 *   `digestScene` below for the naming scheme and why `texture.uuid` is not
 *   it.
 * - **the HUD** — health, armour, weapon name, level title, messages and
 *   subtitles, which covers `S`.
 *
 * ## How it stays deterministic
 *
 * Seeded `Math.random`, synthetic frame timestamps at a fixed dt, and a
 * fake clock (see installFakeClock) drained at each frame boundary so the
 * game's 17 gameplay `setTimeout`s land on the same frames every run.
 *
 * ## The one constraint on callers
 *
 * `runTrace` imports `src/main.ts`, which is a module singleton with side
 * effects at import — it builds a renderer, registers listeners and starts
 * a loop. It can therefore run **once per test file**. A second call in the
 * same file gets the already-booted game and records nonsense, so it
 * throws instead.
 */

/** One scripted input event, delivered at the start of the given frame. */
export type InputEvent =
  | { frame: number; kind: "key"; type: "keydown" | "keyup"; code: string }
  | { frame: number; kind: "button"; type: "mousedown" | "mouseup"; button: number }
  | { frame: number; kind: "move"; movementX: number; movementY: number }
  | { frame: number; kind: "wheel"; deltaY: number }
  | { frame: number; kind: "pointerlock"; locked: boolean };

export interface TraceOptions {
  seed: number;
  frames: number;
  /** Fixed milliseconds per frame — never wall clock. */
  dtMs: number;
  input: readonly InputEvent[];
  /** Record every Nth frame. Every frame would make a multi-megabyte fixture for no extra signal. */
  every: number;
  /**
   * Which level to start. Defaults to 0 (the prologue), taken through
   * exactly the path `trace.test.ts` has always used — the `NEW GAME` menu
   * row, which runs `startGame(0)` — so that fixture stays
   * bit-for-bit unaffected by this option's existence.
   *
   * Any other value opens the chapter-select screen instead (`#mChapter`),
   * after unlocking it via `save.maxLevel`, and clicks that level's row —
   * see `src/ui/Menus.ts`'s `mChapter` click handler, which builds `#chaplist`
   * fresh from `LEVELS` in order, so `#chaplist`'s Nth child is always level
   * N's row without needing to match its text.
   */
  level?: number;
  /**
   * Run once after the level has loaded and before frame 1, to seed state
   * that `loadLevel` itself writes.
   *
   * ## Why this exists, and why `beforeAll` is not enough
   *
   * `tests/integration/combatTrace.test.ts` establishes the seeding
   * technique this option extends: assign a live exported state field in
   * `beforeAll`, before `runTrace` boots the game, to reach a branch the
   * harness's own scripted input cannot otherwise produce (there,
   * `S.armor=50`, which makes `damagePlayer`'s armour-absorb arm reachable
   * at all). That works for `S.armor` for one specific reason —
   * **`loadLevel` never touches it.** `S.ammo`, `S.weapons`, `S.mag` and
   * `S.cur` are in the same position and can still be seeded that way.
   *
   * `player.px`/`player.pz` are **not**. `loadLevel`
   * (`src/world/LevelLoader.ts`) writes them from the grid's `"P"` cell
   * during its scan — `if(ch==="P"){player.px=wx;player.pz=wz;}` — and
   * `loadLevel` runs *inside* `runTrace`, after the chapter-select click
   * below. A `beforeAll` assignment to the player's position is therefore
   * overwritten before frame 1 and has no effect; measured, not assumed
   * (see `tests/integration/bossTrace.test.ts`'s header for the
   * measurement). The same is true of anything else `loadLevel` resets
   * (`S.hp`, `player.vx/vy/vz`, `input.yaw`) and of everything that does not
   * exist until `loadLevel` has run at all — `world.enemies`,
   * `world.bossRef`.
   *
   * So this hook is the *post-load* half of the same technique, not a new
   * one, and it is deliberately a plain callback rather than a set of
   * named knobs: the harness should not grow an opinion about which state a
   * fixture wants to seed.
   *
   * **Default `undefined` — nothing is called, and nothing about a run that
   * does not pass it changes.** `trace.test.ts` and `combatTrace.test.ts`
   * both omit it, which is why adding this option left both of their
   * committed fixtures byte-identical (verified, not assumed).
   */
  afterLoad?: () => void;
}

export interface TraceFrame {
  frame: number;
  /** x,y,z,rx,ry,rz,fov. */
  camera: number[];
  hud: Record<string, string>;
  /** Child count plus a digest of every child's position, visibility, texture name and colour. */
  scene: { count: number; digest: string };
}

const HUD_IDS = ["hp", "ar", "wname", "msg", "subt", "lvltitle", "bossname", "keys"];

/**
 * Floats are rounded to 6 places: the migration must not perturb arithmetic
 * at all, so this is far stricter than needed while staying immune to
 * print-formatting noise.
 *
 * `-0` is normalised to `0`, and that is not cosmetic. `JSON.stringify(-0)`
 * writes `0`, so a fixture can never hold a negative zero — but a live run
 * produces them freely (any `-x` where x rounds to zero), and Vitest's
 * `toEqual` uses Object.is, which separates them. Without this the test
 * fails on a run that is in fact bit-identical, and the failure reads like
 * nondeterminism.
 */
const r6 = (n: number): number => {
  const v = Math.round(n * 1e6) / 1e6;
  return v === 0 ? 0 : v;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/**
 * Reaching the camera, which `legacy.js` never exports.
 *
 * The obvious route — patching `WebGLRenderer.prototype.render` to grab the
 * `(scene, camera)` the loop hands it — does not work: three r128 assigns
 * `this.render = function (scene, camera)` inside the constructor
 * (build/three.js:17847), an *instance* property, so the prototype is never
 * consulted and the patch silently captures nothing.
 *
 * `PerspectiveCamera`'s methods are real class methods on the prototype
 * (build/three.js:9033), so patching `updateProjectionMatrix` does work.
 * `legacy.js` calls it every frame from the sniper-zoom line and again on
 * every resize. The camera is built once at module scope and never
 * rebuilt, so the first capture is the camera for the whole run — but the
 * patch keeps updating anyway rather than assuming that.
 *
 * The scene needs no trick: `loadLevel` already mirrors it into
 * src/render/SceneRef.ts for the FX modules, and that accessor is a plain
 * import.
 */
function captureCamera(): { camera: () => Any | null; restore: () => void } {
  const proto = THREE.PerspectiveCamera.prototype as unknown as Record<string, Any>;
  const real = proto.updateProjectionMatrix;
  let captured: Any = null;
  proto.updateProjectionMatrix = function (this: Any, ...args: Any[]): Any {
    captured = this;
    return real.apply(this, args);
  };
  return {
    camera: () => captured,
    restore: () => { proto.updateProjectionMatrix = real; },
  };
}

/**
 * Decouples three.js's own object bookkeeping from the seeded gameplay
 * stream `seedRandom` installs, so a trace's recorded run depends only on
 * `rnd`/`pick` and nothing else that happens to call `Math.random()`.
 *
 * Found during Phase 2 Part A Task 3 (instancing the level's wall/pillar/
 * platform geometry): every `THREE.Object3D`/`BufferGeometry`/`Material`
 * constructor calls `MathUtils.generateUUID()` (build/three.js:286),
 * which burns exactly four `Math.random()` calls for a UUID nothing in
 * this codebase ever reads. Collapsing level 1's 204 individual wall/
 * pillar `Mesh` objects into 2 `InstancedMesh` objects cut the
 * `Math.random()` calls made during that level's `loadLevel` from 1824 to
 * 1016 — a 808-call shift, exactly 202 fewer objects × 4 — and every later
 * draw in the run shifted with it: `spawnEnemy`'s dodge/flank/scream/
 * attack timers, which monologue line got picked, then (via different
 * enemy melee timing) the player's own camera position by fractions of a
 * unit. None of that is a gameplay bug — `world.grid`/`world.wallSegs`
 * (what `src/world/Collision.ts` actually reads) are untouched by an
 * instancing change, and the run still fires, reloads, takes damage and
 * kills an enemy either way (see this task's report) — but left alone, it
 * means a fixture's camera track moves on *any* change to how many
 * rendering objects a level or a frame of play happens to construct,
 * forever: Phase 2 Part B's shadow casters, Phase 3's ~8x sprite-texture
 * multiplication for 8-directional enemies, Phase 4's level rebuilds. That
 * coupling is a bug in this harness, not in the game.
 *
 * `MathUtils.generateUUID` itself can't be monkey-patched — three's build
 * wraps its `MathUtils` re-export in `Object.freeze()` (confirmed live:
 * assigning `THREE.MathUtils.generateUUID` throws "Cannot assign to read
 * only property"), and every call site inside `Object3D`/`Material`/
 * `BufferGeometry` (build/three.js:4987, 6030, 7428) closes over its own
 * module-local `generateUUID` binding (build/three.js:286), not the
 * mutable exported one — reassigning `THREE.Object3D` etc. from outside
 * doesn't reach those call sites either, for the same reason (also
 * confirmed live: it changes what `new THREE.Object3D()` returns from
 * *this* module, not what `Mesh`'s `extends Object3D` resolves to inside
 * three's own closure).
 *
 * `Math.random` is the one shared, genuinely mutable primitive both kinds
 * of draw come through, so this wraps it and uses `Error().stack` to tell
 * the two callers apart: `generateUUID` calls `Math.random()` four times
 * synchronously with no application code able to interleave (JS has no
 * preemption), and its own stack frame names it — confirmed live as `at
 * generateUUID (…/three/build/three.js:286:…)`, not assumed. A call whose
 * stack includes that frame is answered from an independent monotonic
 * counter — not another random source, since nothing ever reads these
 * UUIDs, so there is nothing for a counter to get "wrong" — instead of the
 * seeded stream; every other call (`rnd`/`pick`, and anything else)
 * passes straight through untouched.
 */
function installUuidStub(): () => void {
  const real = Math.random;
  let counter = 0;
  let intercepted = 0;
  Math.random = (): number => {
    if (new Error().stack?.includes("generateUUID")) {
      intercepted++;
      counter = (counter + 1) % 0xffffffff;
      return counter / 0xffffffff;
    }
    return real();
  };
  return () => {
    Math.random = real;
    // The whole mechanism rests on a stack frame being named `generateUUID`.
    // That is true of three's source build today, and it is exactly the kind
    // of thing that can stop being true silently — a bundled or minified
    // three, a renamed internal, a different engine's stack format. If the
    // check ever stops matching, every UUID draw quietly rejoins the gameplay
    // stream and the fixtures drift with nothing saying why. This project's
    // signature failure is a guard that reports success while examining
    // nothing, so the guard gets a guard: loading any level constructs
    // hundreds of THREE objects, so a run that intercepted ZERO draws means
    // the sniffing broke, not that the game stopped creating objects.
    if (intercepted === 0) {
      throw new Error(
        "installUuidStub intercepted no Math.random() calls. The `generateUUID` stack-frame " +
        "check has stopped matching, so three's UUID draws are consuming the seeded gameplay " +
        "stream again and any fixture recorded now would be wrong. Fix the detection before " +
        "trusting or regenerating a trace.",
      );
    }
  };
}

function readCamera(camera: Any): number[] {
  return [
    r6(camera.position.x), r6(camera.position.y), r6(camera.position.z),
    r6(camera.rotation.x), r6(camera.rotation.y), r6(camera.rotation.z),
    r6(camera.fov),
  ];
}

/**
 * Names a texture object. Returns a short, human-readable, run-stable string
 * — never a uuid, never `undefined`.
 */
type TexNamer = (t: Any) => string;

/**
 * A reverse index from texture object to a readable name, built **once**,
 * after `startGame` has run every boot-time baker.
 *
 * ## Why this exists
 *
 * Until Phase 3 Part B Task 1, `digestScene` recorded type, position and
 * `visible` and nothing else. Which *texture* a sprite was showing was
 * invisible to both fixtures, so the entire enemy sprite-frame system —
 * walk cycle, attack pose, hurt/sever frames, the two-stage death collapse,
 * the headless corpse, the torch flicker — could be rewired without either
 * trace noticing. Phase 3 Part A Task 2 did exactly that: a change
 * chartered as type-only rewrote `Behaviors.ts`'s walk guard from
 * `e.atkAnim!==undefined&&e.atkAnim<=0` to `(e.atkAnim??0)<=0`, inverting it
 * for every enemy that had not yet attacked, and all 463 tests passed. It
 * was caught by reading the diff. `tests/enemies/walkFrames.test.ts` now
 * pins that one line; this index is what lets the *traces* see the whole
 * class.
 *
 * ## Why a name and not `texture.uuid`
 *
 * The decisive reason is stability. `THREE.MathUtils.generateUUID()` is four
 * `Math.random()` draws, which is precisely what `installUuidStub` above
 * exists to keep *out* of the seeded gameplay stream. A uuid in the digest
 * would therefore be unstable across runs — the stub answers those draws
 * from a monotonic counter whose value depends on how many THREE objects
 * have been constructed so far, so the same frame of the same script could
 * hash differently between two clean runs, which a fixture cannot tolerate
 * regardless of how the name is spelled.
 *
 * Readability is the second reason, and it is narrower than it sounds:
 * `digestScene` below folds every part string into one opaque FNV-1a
 * `digest` field (see that function's doc comment for why), so a real
 * regression's committed fixture diff shows only `"digest": "007a29fb"` ->
 * `"ed3e1688"` — a human reading the JSON never sees `"z.a"`, `"z.b"`, or a
 * uuid either way. The benefit is real but occasional: a developer who
 * dumps `digestScene`'s pre-hash `parts` for a failing frame while bisecting
 * sees `"z.a"` / `"z.b"` / `"z.atk"`, which says which sprite frame a ghoul
 * is showing, where a uuid would say nothing — and, being unstable, would
 * not even repeat between that dump and a re-run.
 *
 * ## The three sources, and the two fallbacks
 *
 * - **`PX`** (`src/enemies/SpriteBaker.ts`) — every enemy texture, named
 *   `"<enemyKey>.<slot>"`: `z.a`, `z.b`, `z.hl`, `z.atk`, `z.die1`,
 *   `z.noHead`, … The `head`/`regions` fields of a `BakedSprite` are a
 *   number and an object, so the `isTexture` guard skips them.
 * - **`ITEMTEX`** (`src/render/ItemTextures.ts`) — pickups and the two light
 *   props, named `"item.<key>"`. `ITEMTEX.torch` is the one array-valued
 *   entry (the two-frame flicker `Interact.ts` swaps between), so its
 *   frames are `item.torch[0]` and `item.torch[1]`. Indexed rather than
 *   lumped into the fallback, because the torch flicker is one of the nine
 *   `material.map=` assignment sites this task is trying to make visible,
 *   and it is the only one the enemy-less prologue fixture reaches at all.
 * - **`TEX`** (`src/render/ProcTextures.ts`) — walls, floors, ceilings,
 *   doors, props, named `"tex.<key>"`.
 *
 * **Fallback 1, shared canvas.** `loadLevel` does not put `TEX.churchFloor`
 * on the floor mesh — it puts `TEX.churchFloor.clone()` on it, so it can set
 * `repeat` per level without mutating the shared texture (same for the
 * ceiling). A clone is a different object but three's `Texture.copy()`
 * assigns `this.image = source.image`, so the clone shares the source's
 * canvas element. Looking the canvas up gives `tex.churchFloor~clone`,
 * which is both stable and readable. Two clones of the same source would
 * share that name; nothing in the game currently makes two.
 *
 * **Fallback 2, genuinely unknown.** Anything still unmatched gets
 * `unnamed#N` from a monotonic counter, assigned on first sight and
 * remembered per texture object in a `WeakMap`. It must be per-object and
 * not a single constant: a shared `"unnamed"` for every unnamed texture
 * would silently re-create the exact blind spot this whole index exists to
 * close, one level down. Today there is exactly one such texture in the
 * whole game — `blobTex`, the shared radial-gradient shadow under every
 * enemy and barrel, a module-private in `src/render/RenderCore.ts` — and it
 * is genuinely one object shared by every blob, so one name for all of them
 * is correct rather than lossy. The counter is deterministic because the
 * order textures are first seen is the scene-child order of a deterministic
 * run.
 *
 * **Exported for `tests/integration/textureIndex.test.ts`.** Fallback 2's
 * per-object counter is the one piece of this index with no fixture behind
 * it — the two committed fixtures happen to exercise it, but nothing pins
 * that a collapsed fallback (one shared `"unnamed"` string) would fail
 * anything, since a hash difference from a name collision just gets
 * regenerated away like any other digest change. That test drives this
 * function directly against synthetic unnamed textures to pin the one
 * property a collapse would silently lose: distinct objects get distinct
 * names, and the same object gets the same name back.
 */
export async function buildTextureIndex(): Promise<TexNamer> {
  const { PX } = await import("../../src/enemies/SpriteBaker");
  const { ITEMTEX } = await import("../../src/render/ItemTextures");
  const { TEX } = await import("../../src/render/ProcTextures");

  const byTexture = new Map<Any, string>();
  const byImage = new Map<Any, string>();
  const put = (t: Any, name: string): void => {
    if (!t || !t.isTexture) return;
    if (!byTexture.has(t)) byTexture.set(t, name);
    const img = t.image ?? t.source?.data;
    if (img && !byImage.has(img)) byImage.set(img, name);
  };

  // Sorted so a name is a function of the data, not of key insertion order.
  for (const key of Object.keys(PX).sort()) {
    const baked = PX[key] as unknown as Record<string, Any>;
    for (const slot of Object.keys(baked).sort()) put(baked[slot], `${key}.${slot}`);
  }
  for (const key of Object.keys(ITEMTEX).sort()) {
    const v = ITEMTEX[key] as Any;
    if (Array.isArray(v)) v.forEach((t: Any, i: number) => put(t, `item.${key}[${i}]`));
    else put(v, `item.${key}`);
  }
  for (const key of Object.keys(TEX).sort()) put(TEX[key], `tex.${key}`);

  if (byTexture.size === 0) {
    // The same guard-the-guard reflex as installUuidStub's: this index is
    // built after startGame(), which calls buildTextures/buildSprites/
    // buildItemTex unconditionally. An empty index means the boot path
    // changed and every sprite in the digest would silently collapse onto
    // `unnamed#N` — recording nothing about frame selection while still
    // looking like it does.
    throw new Error(
      "buildTextureIndex found no textures in PX/ITEMTEX/TEX. The boot-time bakers did not run " +
      "before the index was built, so every texture in the digest would fall back to a placeholder " +
      "and the trace's sprite-frame coverage would be silently gone.",
    );
  }

  let unnamed = 0;
  const fallback = new WeakMap<Any, string>();
  return (t: Any): string => {
    const exact = byTexture.get(t);
    if (exact !== undefined) return exact;
    const img = t.image ?? t.source?.data;
    const fromImage = img ? byImage.get(img) : undefined;
    if (fromImage !== undefined) return `${fromImage}~clone`;
    let f = fallback.get(t);
    if (f === undefined) { f = `unnamed#${++unnamed}`; fallback.set(t, f); }
    return f;
  };
}

/** FNV-1a. Any change to any child's type, position, visibility, texture or colour changes the hash. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * The scene as a child count plus a hash of every child's type, rounded
 * position, visibility, material texture name and material colour.
 *
 * Hashed rather than stored raw: a level holds ~240 objects, so the raw
 * digest is ~9KB per recorded frame and turns the fixture into a
 * quarter-megabyte blob. The hash is equally sensitive — any object that
 * moves, spawns, despawns, hides, swaps sprite frame or changes tint
 * changes it — and a failure still names the exact frame, which is what a
 * developer actually needs to start bisecting.
 *
 * ## What Phase 3 Part B Task 1 added, and what it deliberately did not
 *
 * **Texture name (`:m=…`).** The nine `material.map=` assignment sites in
 * `src/` (four in `enemies/ai/Behaviors.ts`, two in `enemies/Boss.ts`, one
 * each in `enemies/Damage.ts`, `enemies/Death.ts` and `player/Interact.ts`)
 * were all invisible here. Every one of them writes a texture that
 * `buildTextureIndex` can name.
 *
 * **Material colour (`:c=…`).** `spawnEnemy`'s elite tint
 * (`color.setHex(0xd8c878)`) and `Damage.ts`'s white hit-flash and its
 * restore (`e.sp.material.color.setHex(e.elite?0xd8c878:0xffffff)`) are
 * enemy state with a real bug class behind them — an elite that stops being
 * tinted, or a hit flash that never clears — and, like the sprite frame,
 * they move nothing and so were invisible in every field recorded here.
 * One extra field, one more bug class.
 *
 * **Scale: deliberately left out.** Measured rather than assumed. `scale`
 * is written in eleven places in `src/`; the ones that animate it are
 * `Behaviors.ts`'s attack-lunge grow (`1+lunge*0.22`) and
 * `Decals.ts`'s blood-pool grow-in. The lunge case carries no
 * information this digest does not already hold at 1e-6: the same `lunge`
 * value simultaneously offsets `sp.position` by `lunge*0.35` toward the
 * player two lines later, so any change to the lunge curve already moves a
 * recorded position (the sole exception is a player standing within 0.01
 * units of the enemy's centre, where `ldx`/`ldz` are forced to 0). The
 * decal case is real but cosmetic, and every field added here widens the
 * fixture diff a human has to interpret at the next regeneration. Colour
 * buys a bug class; scale buys a redundancy and an FX timing tell. If a
 * later task wants decal grow-in covered, add it then, with its own
 * regeneration and its own analysis.
 *
 * Children with no material at all (lights, `Group`s), and materials with
 * neither a map nor a colour, produce **exactly** the string they produced
 * before this task. That is a narrower set than "no map": every material
 * with a `.color` but no `.map` — the exit pad and torch post in
 * `LevelLoader.ts`, the blood-pool mesh in `Decals.ts`, among others — now
 * gains a `:c=` segment of its own, which is the point of adding colour at
 * all (see above). The fixture diff at the regeneration is attributable to
 * every material that has a map, a colour, or both, and to nothing else. An
 * array-valued `material` (the platform `InstancedMesh`'s six box faces)
 * contributes each of its materials, joined with `+`.
 */
function digestScene(scene: Any, texName: TexNamer): { count: number; digest: string } {
  const parts = (scene.children as Any[]).map((o) => {
    let part = `${o.type}:${r6(o.position.x)},${r6(o.position.y)},${r6(o.position.z)}:${o.visible ? 1 : 0}`;
    if (!o.material) return part;
    const mats: Any[] = Array.isArray(o.material) ? o.material : [o.material];
    const maps = mats.filter((m) => m && m.map).map((m) => texName(m.map));
    if (maps.length) part += `:m=${maps.join("+")}`;
    const cols = mats.filter((m) => m && m.color)
      .map((m) => m.color.getHex().toString(16).padStart(6, "0"));
    if (cols.length) part += `:c=${cols.join("+")}`;
    return part;
  });
  return { count: parts.length, digest: hash(parts.join("|")) };
}

function readHud(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of HUD_IDS) out[id] = (document.getElementById(id)?.textContent ?? "").trim();
  return out;
}

/** Delivers one scripted event to the same target the game listens on. */
function deliver(ev: InputEvent, canvas: HTMLElement): void {
  switch (ev.kind) {
    case "key":
      window.dispatchEvent(new KeyboardEvent(ev.type, { code: ev.code }));
      return;
    case "button":
      window.dispatchEvent(new MouseEvent(ev.type, { button: ev.button }));
      return;
    case "wheel":
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: ev.deltaY }));
      return;
    case "move": {
      // jsdom's MouseEventInit ignores movementX/movementY, so they are
      // defined on the instance — the same technique
      // tests/behavior/input.test.ts uses.
      const e = new MouseEvent("mousemove");
      Object.defineProperty(e, "movementX", { value: ev.movementX });
      Object.defineProperty(e, "movementY", { value: ev.movementY });
      document.dispatchEvent(e);
      return;
    }
    case "pointerlock":
      Object.defineProperty(document, "pointerLockElement", {
        value: ev.locked ? canvas : null, configurable: true, writable: true,
      });
      document.dispatchEvent(new Event("pointerlockchange"));
      return;
  }
}

let alreadyRan = false;

export async function runTrace(o: TraceOptions): Promise<TraceFrame[]> {
  if (alreadyRan) {
    throw new Error(
      "runTrace can only be called once per test file: src/main.ts is a module singleton " +
      "that boots the game at import, so a second run would record an already-running game.",
    );
  }
  alreadyRan = true;

  installDomStubs();
  loadGameHtml();

  /**
   * `performance.now()` has to be synthetic too, and this is not optional.
   * legacy.js reads it in three places that reach the recording: the screen
   * shake offset (`const sh=trauma*trauma,t=performance.now()`, which feeds
   * a sin/cos into the camera position), say()'s three-second subtitle
   * throttle, and the level timers S.t0/S.levelT0. Left on the wall clock,
   * two runs of the same script produce different camera positions and
   * different subtitles — the first version of this harness did exactly
   * that and failed its own comparison on the second run.
   */
  let fakeNow = 1_000_000; // an arbitrary but fixed epoch
  const realPerformance = globalThis.performance;
  Object.defineProperty(globalThis, "performance", {
    value: { now: () => fakeNow }, configurable: true, writable: true,
  });

  const clock = installFakeClock();
  const capture = captureCamera();

  /**
   * A minimal rAF queue, drained the way a browser drains it: every
   * callback pending *as of the start of the tick* runs once, in the order
   * it was requested, and the queue is cleared before any of them run.
   *
   * `loop` is not the only thing that calls `requestAnimationFrame` —
   * `src/ui/Toasts.ts`'s `ach()` does too, from inside a `loop` call, to
   * fade an achievement toast in. Taking only the *last* queued callback
   * (`raf[raf.length-1]`) is wrong the moment more than one is pending: the
   * toast's callback would get invoked instead of `loop` on the next tick,
   * nothing would re-request `loop`, and the game loop would stall silently
   * for the rest of the run. Draining every pending callback each tick, in
   * FIFO order, is what actually matches a browser and survives that case.
   */
  const raf: FrameRequestCallback[] = [];
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => raf.push(cb);
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  // jsdom has no pointer-lock implementation at all — legacy.js only ever
  // calls exitPointerLock() from damagePlayer()'s death branch. The
  // committed combat-level fixture never reaches it either (hp bottoms out
  // at 55, not 0), but a weakened armour-absorb sabotage against it does
  // make death reachable, so this stub is real insurance for that case —
  // and for any future level fixture that plays a run out to a death.
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  const restoreRandom = seedRandom(o.seed);
  // Installed on top of the seeded generator above (not before it), so its
  // fallback path — every draw that isn't a three.js UUID — reaches the
  // seeded stream, the same as if this stub didn't exist.
  const restoreUuid = installUuidStub();
  try {
    await import("../../src/main");
    const canvas = document.getElementById("game") as HTMLElement;
    const level = o.level ?? 0;
    if (level === 0) {
      // Exactly today's path — untouched — so trace.test.ts's committed
      // fixture never sees a byte of difference from this option existing.
      const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
      if (!newGame) throw new Error("the NEW GAME menu row is gone — the trace drives the game through it");
      (newGame as HTMLElement).click();
    } else {
      // Plan 0D made save.maxLevel a writable exported property, which is
      // what makes any level beyond the prologue reachable from a test at
      // all. Unlock it, then drive the chapter-select screen the same way a
      // player would: open it, click the row for this level.
      save.maxLevel = Math.max(save.maxLevel, level);
      const chapterBtn = document.getElementById("mChapter") as HTMLElement | null;
      if (!chapterBtn) throw new Error("the CHAPTER SELECT menu row is gone — the trace drives level selection through it");
      chapterBtn.click();
      // Scoped to #chaplist: the main menu's own mNew/mChapter/mSettings
      // buttons are ALSO .mbtn (index.html), so a bare
      // `.mbtn` query would risk matching those instead.
      const row = document.querySelectorAll("#chaplist .mbtn")[level] as HTMLElement | undefined;
      if (!row) throw new Error(`chapter select has no row for level ${level} — #chaplist didn't build as expected`);
      if (row.className.includes("locked")) {
        throw new Error(`level ${level}'s chapter row is locked — save.maxLevel wasn't raised far enough`);
      }
      row.click();
    }

    // After the click — so `loadLevel` has already run, `world.enemies` is
    // populated and nothing this seeds will be overwritten — and before the
    // first frame, so the run starts from the seeded state. See
    // `TraceOptions.afterLoad`.
    o.afterLoad?.();

    // After the click, never before: both menu paths end in `startGame`
    // (src/core/Boot.ts), which is where `buildTextures`/`buildSprites`/
    // `buildItemTex` run. PX, ITEMTEX and TEX are all empty until then, so
    // an index built any earlier would name nothing.
    const texName = await buildTextureIndex();

    const byFrame = new Map<number, InputEvent[]>();
    for (const ev of o.input) {
      if (!byFrame.has(ev.frame)) byFrame.set(ev.frame, []);
      byFrame.get(ev.frame)!.push(ev);
    }

    const out: TraceFrame[] = [];
    // The loop derives dt as (t - last)/1000 with `last` seeded from
    // performance.now() at boot — which is the fake clock above, so the
    // frame timestamps continue from it exactly and frame 1 gets a normal
    // dt rather than a large negative one.
    const t0 = fakeNow;
    for (let frame = 1; frame <= o.frames; frame++) {
      // Advance the wall clock in lockstep, before the frame's own work, so
      // anything reading performance.now() mid-frame sees this frame's time.
      fakeNow = t0 + frame * o.dtMs;
      for (const ev of byFrame.get(frame) ?? []) deliver(ev, canvas);
      if (raf.length === 0) throw new Error(`the main loop stopped requesting frames at frame ${frame}`);
      // Snapshot and clear before invoking: a callback that itself calls
      // requestAnimationFrame (loop always does; ach()'s toast fade
      // sometimes does) must be queued for the *next* tick, not appended to
      // and then re-run within this one.
      const due = raf.splice(0, raf.length);
      for (const cb of due) cb(fakeNow);
      clock.advance(o.dtMs);
      if (frame % o.every === 0) {
        const camera = capture.camera();
        if (!camera) {
          throw new Error(
            `the camera was never captured by frame ${frame} — updateProjectionMatrix stopped being ` +
            "called, so the trace would record empty placeholder rows and pass forever",
          );
        }
        out.push({
          frame,
          camera: readCamera(camera),
          hud: readHud(),
          scene: digestScene(getScene(), texName),
        });
      }
    }
    return out;
  } finally {
    restoreUuid();
    restoreRandom();
    clock.restore();
    capture.restore();
    Object.defineProperty(globalThis, "performance", {
      value: realPerformance, configurable: true, writable: true,
    });
  }
}
