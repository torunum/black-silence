# Phase 0 — Modular Port

**THE BLACK SILENCE / The Hollow Parish**
Date: 2026-08-05
Status: approved for planning

---

## 1. Purpose

Move the game from a single 3967-line HTML file into a Vite + TypeScript modular
project **without changing how it plays**.

This phase produces no visible improvement. That is intentional. Every later phase
(8-directional sprites, positional audio, pathfinding, level rebuilds, boss brains)
is written on top of this foundation. Doing those first means writing them twice.

### Non-goals

Explicitly out of scope for Phase 0. Violating any of these is how ports fail:

- No gameplay changes. No balance changes. No new features.
- No art changes. No new textures, sprites, sounds, or music.
- No level design changes.
- No performance optimization.
- **Existing bugs are preserved**, unless a bug physically blocks the port.

If something is obviously wrong and tempting to fix, it goes in `docs/known-issues.md`
and is fixed in the phase that owns it.

---

## 2. Success criteria

Phase 0 is done when all of these are true:

| # | Criterion | How it is verified |
|---|---|---|
| 1 | `npm run dev` serves a playable game | manual |
| 2 | `npm run build` produces a working `dist/` | manual, load `dist/index.html` |
| 3 | `npm run typecheck` passes with zero errors | CI command |
| 4 | `npm test` passes | CI command |
| 5 | Three.js is a local dependency; **the game runs with no network** | DevTools offline mode |
| 6 | No file in `src/` exceeds 400 lines | `scripts/check-file-size.mjs` |
| 7 | Prologue + Level 1 play identically to the reference | smoke checklist, §8 |

The original file is vendored at `reference/sonsurum.html` and is **never edited**.
It is the golden reference to diff behavior against for the life of the project.

---

## 3. The one unavoidable structural change

ES module bindings are immutable across module boundaries. You cannot `export let px`
and have another module assign to it. The original file relies on ~40 bare mutable
top-level bindings.

**Every cross-module mutable global becomes a property on an owning state object.**
This is the only structural change permitted in Phase 0, and it is forced by the
module system, not by preference.

Complete inventory, taken from the reference file:

| Reference globals | New owner |
|---|---|
| `px pz vx vy vz pyy grounded bobT lastBobSin spawnGuard` | `player/PlayerState.ts` |
| `yaw pitch locked swayX swayY firing zoomOn keys` | `player/InputState.ts` |
| `trauma hitStop zoomT` | `fx/ShakeState.ts` |
| `scene camera renderer lamp lampCore muzzleLight boomLight ambLight` | `render/Renderer.ts` |
| `grid GW GH heightMap wallSegs doors enemies props items torches candles exitPos pianoPos challenge bossRef poisonZones rings strikes cine eventT idleT` | `world/WorldState.ts` |
| `wstate wtime wCool pending reloadFlags recoilPitch kickAmt kickRot muzzle zoomLerp kickAnim volleyHit` | `weapons/WeaponRuntime.ts` |
| `nails orbs` | `fx/Projectiles.ts` |
| `pools wallDecals gibs heads` | `fx/DecalState.ts` |
| `pGeo pPos pCol points parts pNext` | `fx/Particles.ts` |
| `AC masterG echoG bossPulse masterVol` | `audio/AudioEngine.ts` |
| `ambT heartT breathT darkT savedAmb` | `world/AmbienceState.ts` |
| `FW FH VW VH casings puffs bloodHits fx fg` | `render/Overlay2D.ts` |
| `onceSaid subT lastSayT msgT msgEl` | `ui/Subtitles.ts` |
| `keyEls noteHist` | `ui/Piano.ts` |
| `started inputLock pianoOpen last` | `core/Game.ts` |
| `maxLevel` | `save/SaveGame.ts` |
| `S` | `core/State.ts` (typed, otherwise unchanged) |

### Note on `volleyHit`

In the reference, `let volleyHit=false` is declared at line 2041, *after* `fire()`
uses it at line 2012. This works only because of same-scope hoisting. Split across
modules it becomes a real ordering bug. It moves into `WeaponRuntime` and the
hoisting dependency disappears.

### Note on `S.killsTotal`

`spawnEnemy` does `S.killsTotal=(S.killsTotal||0)+1` — it counts enemies *spawned*,
not killed, and feeds the end-of-level grade. The behavior is correct; the name lies.
Renamed to `S.enemiesTotal`. This is a rename with no behavior change, which is the
only category of cleanup allowed in Phase 0.

---

## 4. Cross-module communication

Two mechanisms, introduced together:

**`core/Events.ts`** — a typed pub/sub bus. Fire-and-forget notifications:
`enemy:died`, `player:damaged`, `level:loaded`, `secret:found`, `boss:phase`.

**`core/Context.ts`** — a service locator holding live references to the systems
(`world`, `player`, `audio`, `fx`, …).

The long-term rule is *systems talk over Events, never reach into each other's state*.
Phase 0 does **not** achieve that. A mechanical port that also rewrites every
interaction into messages is not a mechanical port — it is a rewrite, and it will
break the game.

So: **Phase 0 ports using `Context`. Each later phase migrates the systems it touches
onto `Events`.** By the end of Phase 5, `Context` should hold only the renderer and
audio engine. This is tracked in `docs/known-issues.md` as debt, not hidden.

---

## 5. Target structure

```
src/
  main.ts                  boot + canvas + loop wiring only
  core/
    Game.ts                start/pause/level transitions
    Loop.ts                fixed-timestep accumulator, hitstop, pause
    Time.ts                scaled clock + schedule()
    Events.ts              typed pub/sub
    Context.ts             service locator (temporary, shrinks each phase)
    State.ts               S, typed
    Random.ts              seeded RNG
  utils/
    math.ts                rnd, clamp, pick
  render/
    Renderer.ts            WebGLRenderer, scene, camera, lights
    ProcTextures.ts        makeTex, noiseFill, TEX
    Overlay2D.ts           the fx2d canvas: casings, puffs, blood hits
    Viewmodel.ts           weapon viewmodel drawing
  audio/
    AudioEngine.ts         graph + master bus
    Sfx.ts                 blip, bang, boom, click
    Voice.ts               growl, gurgle, pain, deathCry, snarl
    Ambient.ts             drones, bells, organ, piano notes, boss pulse
  world/
    Grid.ts                char grid model + solidAt/floorHeightAt/los
    LevelBuilder.ts        emptyGrid, link, put, carve, hall, aperture, pillarsRing
    LevelGeometry.ts       grid -> meshes (+ dispose registry)
    LevelLoader.ts         loadLevel / unloadLevel
    WorldState.ts
    Doors.ts  Props.ts  Pickups.ts  Ambience.ts  Events.ts
    levels/
      prologue.ts  level1.ts  level2.ts  level3.ts
      level4.ts    level5.ts  level6.ts  level7.ts
      index.ts               the LEVELS table
  player/
    Player.ts  Movement.ts  Camera.ts  Interact.ts
    PlayerState.ts  InputState.ts  Kick.ts
  weapons/
    WeaponState.ts         the equip/idle/fire/reload FSM
    WeaponRuntime.ts
    Hitscan.ts
    definitions.ts         the WEAPONS table
    sprites/               the pixel viewmodel art
  enemies/
    Enemy.ts  EnemyDefs.ts  Spawn.ts  Damage.ts  Death.ts
    PixelDefs/             PXDEF, split by enemy family
    SpriteBaker.ts         texFromPx + dismemberment masks
    ai/
      Perception.ts        los, alertSound
      Movement.ts          moveEnemy
      Behaviors.ts         the enemyTick brain
      Projectiles.ts       fireOrb, throwFlesh
      BossBrains/
        priest.ts  executioner.ts  guardian.ts
  fx/
    Particles.ts  Gibs.ts  Decals.ts  Blood.ts  Shake.ts  Projectiles.ts
  ui/
    Hud.ts  Menus.ts  Subtitles.ts  Toasts.ts  BossBar.ts  Piano.ts
    Cinematic.ts           letterbox bars, boss titles
  save/
    SaveGame.ts            localStorage, versioned schema
  content/
    monologue.ts           ADEM's lines
    achievements.ts
reference/
  sonsurum.html            the golden reference, never edited
```

`PXDEF` alone is ~360 lines of ASCII sprite data. It is split by enemy family
(`grunts.ts`, `beasts.ts`, `bosses.ts`) to respect the 400-line rule.

---

## 6. Extraction order

Leaf-first. Each step ends with a playable game and a commit — never a broken tree.

1. **Scaffold.** Vite, TypeScript (`allowJs: true`, `strict: false`), Vitest,
   `three@0.128.0` from npm. `index.html` loads `src/main.ts`. Game still one blob,
   but building and running offline.
2. **Pure leaves.** `utils/math`, `content/monologue`, `content/achievements`,
   `weapons/definitions`, `enemies/EnemyDefs`.
3. **Level data.** `world/LevelBuilder` + `world/levels/*`. The reference already
   marks these pure with `/*BUILDER-BEGIN*/ … /*BUILDER-END*/` — the original author
   knew. **Connectivity tests are written here** (§7).
4. **Asset generation.** `render/ProcTextures`, `enemies/SpriteBaker`,
   `enemies/PixelDefs/*`, item textures.
5. **Audio.** `AudioEngine`, `Sfx`, `Voice`, `Ambient`. Self-contained, low risk.
6. **FX.** `Particles`, `Gibs`, `Decals`, `Blood`, `Shake`, `Projectiles`.
7. **State objects.** `core/State`, `PlayerState`, `WorldState`, `WeaponRuntime`.
   The §3 global migration lands here. Highest-risk step — commit alone.
8. **Systems.** `Renderer`, `world/*`, `player/*`, `weapons/*`, `enemies/*`.
9. **UI.** `Hud`, `Menus`, `Subtitles`, `Toasts`, `BossBar`, `Piano`, `Cinematic`.
10. **Loop.** `core/Loop`, `core/Time`, `core/Game`, `main.ts`.
11. **Kill `setTimeout`.** Replace all 9 gameplay uses with `Time.schedule()`.
12. **Dispose registry.** `unloadLevel()` frees geometries, materials, textures.
13. **Tighten TypeScript.** `strict: true`, remove `allowJs`, type the remaining
    `any`s.
14. **Upgrade Three.js.** Isolated final step, own verification pass (§9).

---

## 7. Testing

Vitest. Pure logic only — rendering is not unit tested.

**Level connectivity (highest value).** For every level: flood-fill from `P` and
assert `X` is reachable; assert `K` is reachable *without* passing a `D`; assert
every `S` secret door has floor on both sides; assert exactly one `P` and at least
one `X`.

Nothing in the reference validates this today. A copy-paste error in the level
tables could ship an unfinishable level and no one would find out until a player did.

**Builder helpers.** `carve`, `hall`, `link`, `pillarsRing`, `aperture` produce the
expected grids for known inputs.

**Sprite baker.** `texFromPx` mask math: a head mask blanks the right rows, stump
pixels land on the correct row.

**Weapon FSM.** `equip → idle → fire → idle`, reload interrupt on fire, dry-fire
when the magazine is empty and no reserve.

**Save schema.** Round-trip write/read, and an unknown future version is rejected
without throwing.

---

## 8. Smoke checklist

"Plays identically" is not unit-testable. After each extraction step, run this by hand:

1. Main menu → New Game → pointer locks, prologue loads
2. WASD + sprint + jump; the staircase climbs and the tomb ledge steps up correctly
3. Reach the exit pad → Level 1 loads, no console errors
4. Fire the revolver: muzzle flash, casing ejects, shake, blood on hit, wall decal on miss
5. Reload mid-magazine; interrupt it by firing
6. Kick an enemy into a wall → gib splat, FIELD GOAL achievement toast
7. Shoot a barrel → chain explosion, enemy knockback, scorch decal
8. Red key → locked door opens
9. Find the secret door in the east wing
10. Kill the Cathedral Guardian → boss bar, cinematic bars, boss music stops
11. Die → death overlay with an ADEM quip
12. DevTools offline → reload → game still runs

---

## 9. Risks

**Three.js upgrade (highest).** The reference pins r128 (2021). Modern Three renames
`outputEncoding`→`outputColorSpace` and `sRGBEncoding`→`SRGBColorSpace`, and changes
color-management defaults — which will shift every color in the game.

Mitigation: install `three@0.128.0` from npm in step 1. That removes the CDN
dependency and gets the game offline with **zero** API risk. The upgrade to modern
Three is step 14, isolated, with its own before/after screenshot comparison. If it
turns out to shift the art direction, it is deferred to Phase 2 where lighting is
being reworked anyway.

**The global migration (step 7).** Touches every system at once. Mitigation: it gets
its own commit, and the smoke checklist runs before and after.

**Scope creep.** The single most likely cause of failure. Mitigation: the non-goals
in §1, and `docs/known-issues.md` as the pressure valve for every "while I'm here".

**Circular imports.** `enemies` damages `player`; `player` queries `enemies`.
Mitigation: `Context` (§4), plus `madge --circular` in the test command.

---

## 10. What Phase 0 explicitly leaves broken

Recorded here so the next phase inherits an honest list, not a surprise:

- Enemies are still single-facing billboards
- No positional audio, no music
- Internal render resolution still hardcoded at 400px
- No shadows
- No pathfinding — enemies still snag on corners
- Levels 2–7 still share one copy-pasted layout
- Six bosses still share `priestThink`
- Enemy names still reference Doom/Hexen monsters
- Save system exists in structure but only persists `maxLevel`

Every one of these is owned by a later phase.
