# Phase 2B — shadowed lighting

One task. Spec §5.1, the second of Part B's three, unblocked now that the
Three.js decision is made.

## Why it can happen now

`docs/superpowers/specs/2026-08-31-phase2-world.md` §5.1 sets two preconditions
and both are met:

- **"Sequence it after the merge"** — shadow cost scales with the number of
  casters, so measuring against the pre-merge scene would measure the wrong
  thing. Phase 2 Part A instanced the walls, pillars and platforms; the
  prologue went 237 → 33 scene children and level 1 295 → 93.
- **The renderer is settled.** Phase 2B Part A pinned three at 0.164.1 with
  `useLegacyLights`, verified on screen. Tuning shadows against r128 and then
  upgrading would have meant tuning twice, which is exactly why the spec said
  to do the upgrade first.

## What exists, measured

```
src/world/LevelLoader.ts   AmbientLight            Ldef.amb, Ldef.ambI*0.42
                           lamp        PointLight  0xffb060, 1.7, 9,  decay 1.6
                           lampCore    PointLight  0xffd890, 1.1, 4.5, decay 2
                           muzzleLight PointLight  0xffc878, 0,  14, decay 1.4
                           boomLight   PointLight  0xff7830, 0,  20, decay 1.4
                           torch  (per torch)      0xff9838, 1.6, 10, decay 1.8
                           window (per window)     col,      1.1, 9,  decay 1.5
                           candle (per candle)     0x6a4ab8, .7, 5,  decay 1
                           exit pad                0x4a6b8a, .9, 6,  decay 1
src/enemies/Death.ts       boss-death pad          0x4a6b8a, 1.1, 8, decay 1

castShadow / receiveShadow / shadowMap anywhere in src/:  NONE
```

Ten lights in the base set, plus one per torch, window and candle — level 1
alone adds several. **Nothing casts a shadow today.**

## The constraint that shapes the whole task

A `PointLight` shadow in three.js is a **cube map: six render passes per light,
per frame.** Turning it on for every light in a torch-lit dungeon would not be
a tuning problem, it would be unplayable.

So this is not "enable shadows". It is "decide which one or two lights earn a
shadow, and prove the rest still read correctly without one."

## What this environment can and cannot settle

**It can settle the look.** The game renders in the Browser pane — see
`docs/STATUS.md`'s Environment gotchas. Screenshots force a frame, so
before/after comparison at a fixed camera is available and is how the Three.js
decision was made.

**It cannot settle the cost.** `requestAnimationFrame` does not run sustained
here, so there is no frame rate to measure. Any claim about performance from
this environment is worthless, and the task must not make one.

That is a real split, not a hedge: **the deliverable is a look verified here
and a cost question handed to the player, stated plainly.**

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **No trace fixture may move.** `digestScene` records type, position, visible,
  material map and colour — not `castShadow`. So flags alone cannot move a
  fixture; if one moves, something else in the diff did, and you must find out
  what rather than regenerating.
- No `src/` file over 400 lines. **`src/world/LevelLoader.ts` is at 384 of 400**
  and is where most lights are created — extract rather than append.
- No import cycles: `npx madge --circular --extensions ts,js src/`, read the
  "Processed N files" line (~92). The bare form scans zero files and still
  reports success.
- `npm test` before committing; it runs `tsc --noEmit` first.
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **No `Co-Authored-By` in commit messages.** The owner is the sole author.

---

## Task 1 — one light that casts

### Step 1: decide which lights cast, and defend the count

Start from one — the player's lamp — and justify any second. Each additional
shadow-casting point light is six more render passes a frame.

State the reasoning per light you considered. The torches are the tempting
second, and they are also the numerous one.

### Step 2: the settings that suit this game

`renderer.shadowMap.enabled`, a type, and a map size. This game renders at a
few hundred pixels wide with `NearestFilter` everywhere and no antialiasing —
**a soft, filtered shadow would be the only soft edge on screen.** Consider
whether `BasicShadowMap` and a small map serve the look better than the
smoother defaults, and say why you chose what you chose.

### Step 3: who casts and who receives

Per-mesh flags. Work out, and state, what each of these should be:

- the instanced walls, pillars and platforms
- the floor and the ceiling — note the ceiling is now per-cell on levels that
  opt in (Phase 2B's ceiling work) and one plane elsewhere
- props — barrels, tables, pews
- doors
- enemies. **Check before assuming**: enemy bodies are `THREE.Sprite`, which
  three does not shadow, and every enemy already has a `blob` — a ground disc
  standing in for a shadow. Say how real shadows and that fake interact, and
  whether the blob should survive.

### Step 4: look at it

This is the half this environment can actually settle, and the reason the task
is worth doing now rather than blind.

Take **matched before/after frames at a fixed camera** — the way the Three.js
comparison was done: same level, same position, same yaw, shadows off and on.
At minimum a torch-lit corridor and a room with a pillar in it, since a pillar
is the clearest test of whether a shadow reads as geometry.

Put what you saw in the report, including if it looks wrong. A shadow that
makes the game muddier is a finding, not a failure.

### Step 5: hand the cost over honestly

Write down, for the player: what casts, what that costs in render passes, and
what to look for if it stutters. Include how to turn it off — if there is no
switch, consider whether there should be one, given that the person who has to
judge the cost cannot edit the code.

### Prove it

Mutations, each turning a **named** test red:

- `renderer.shadowMap.enabled` back to false
- a caster's `castShadow` flag off
- a receiver's `receiveShadow` flag off

A test asserting flags is weak on its own — say plainly what it does and does
not establish, the way `walkFrames.test.ts` does for sprite frames.

### Commit

`git commit -m "feat: the player's lamp casts a shadow"` — or whatever the
decision in Step 1 actually turns out to be.

---

## Definition of done

- A defended decision about which lights cast, with the count justified.
- Shadow settings chosen for a pixelated renderer, with the reasoning stated.
- Per-mesh flags decided deliberately, including what happens to the enemy
  blob.
- Matched before/after frames in the report, and an honest verdict on the look.
- A written hand-off of the cost question, which this environment cannot answer.
- No fixture moved; `npm test` clean; madge over ~92 files.
