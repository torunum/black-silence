# Player feedback, round 2 — the weapons in your hands

The project owner played the game again (2026-09-24) and asked for five things,
in their words:

> Fix the weapon animations and designs.
> Fix the running animation.
> More animation. Fix the kick animation.
> Fix the sounds. The sounds are still very bad.
> Fix the start of the game: the main character climbs out of a grave and
> passes through hell. That is what the prologue was.

This plan is the first three — everything drawn in the player's hands, which is
one system (`src/render/viewmodel/`, `src/core/Loop.ts`'s overlay call,
`src/weapons/WeaponRuntime.ts`'s animation state). **The sound and the
prologue each get their own plan after this one**, in that order after this
merges; do not start them here.

## What exists, measured

```
src/render/viewmodel/pixels/weapons{0,1}.ts   8 weapons, ~25x21 character grids,
                                              baked 3x by pxCanvas, then scaled
                                              to 42% of screen height
src/render/viewmodel/draw.ts                  frameFor (idle / 2-3 fire / 3-4 reload
                                              baked frames, picked by time),
                                              drawKickBoot, drawViewmodel
src/weapons/WeaponState.ts                    wstate: idle/fire/reload/equip/unequip,
                                              kickAmt/kickRot recoil, kickAnim=.32
src/player/Player.ts                          bobT, footstep on sin(bobT*4) zero-crossing,
                                              camera bob sin*.025
```

Looked at on screen, all eight idle frames laid out side by side: **the weapons
do not read as weapons.** They are 63-pixel blobs seen from directly behind,
barrel pointing straight up, with brown lumps for hands. The pistol is a grey
column on a brown triangle; the tommy gun and the nail cannon are
indistinguishable grey boxes. Animation is picking one of two or three baked
frames plus a vertical dip for reload. The kick is a boot drawn with a few
rectangles sliding up from the bottom edge.

That is the frozen reference's art, ported byte-for-byte, and the owner has now
said it is not good enough. **This plan is a deliberate divergence from the
reference** for everything drawn in the player's hands.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **Procedural only**, per the asset policy: no imported images. Drawing with
  canvas primitives, then pixelating, is procedural.
- **Tests that pin the reference's viewmodel art are rewritten, not deleted.**
  `tests/behavior/viewmodel.test.ts` and `tests/fidelity.test.ts`'s
  `WEAPON_PIXELS` block assert call-for-call parity with the reference. Once
  the art is replaced, turn each into a test that (a) records the divergence
  is deliberate, citing this plan, and (b) pins something true about the new
  code. Keep the reference's pixel data file if a test still needs it; delete
  it only if nothing reads it, and say which.
- **Nothing here may change gameplay.** Fire rate, reload duration, kick
  cooldown and kick hit timing, damage and spread stay exactly as they are.
  Animation reads the existing timers; it never drives them.
- **Trace fixtures**: the viewmodel is drawn on the 2D overlay, not the scene,
  so Tasks 1, 3 and 4 must move **no** fixture. Task 2 may touch the camera
  (head bob); if it does, the camera moves in every fixture that walks, which
  is a sanctioned change — follow each fixture's regeneration procedure, prove
  that only the camera's bob term moved (HUD and scene identical), and write
  the analysis in each test file's header.
- **Do not draw from `Math.random` in anything that runs at boot or on a
  gameplay tick** unless the code you replace already did, at the same count —
  see KNOWN-20. Per-frame visual noise that the reference drew from
  `Math.random` (muzzle-flash radius, puffs) may keep doing so.
- The game renders at a low resolution with nearest-neighbour upscaling and no
  antialiasing. **Design against that**: hard-edged shading, few tones per
  material, silhouettes that read at the size they are actually drawn.
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/`, read the "Processed N files"
  line (~97). The bare form scans zero files and still reports success.
- `npm test` before every commit — capture the exit code
  (`npm test > log 2>&1; echo EXIT=$?`); never pipe it through `tail`.
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game renders in the Browser pane.** Read `docs/STATUS.md`'s Environment
  gotchas first: stale modules, the collapsed framebuffer, reload for a clean
  state, enter levels through the real menu.
- **Bash heredocs here eat backslashes** — use the Write tool for any script.
- Leave nothing untracked. **No `Co-Authored-By` in commit messages.** The
  owner is the sole author.

---

## Task 1 — eight weapons that read as weapons

Replace the baked pixel grids with a **parametric viewmodel**: each weapon is a
draw function of a pose, rendered every frame into a small offscreen canvas at
a fixed low logical resolution, then nearest-neighbour scaled onto the overlay.
A pose carries at least: recoil (0..1), a per-weapon action parameter (slide
travel, pump stroke, barrel spin, break-open angle — whatever the weapon has),
and a reload phase. That is what makes Tasks 2-4 possible: a baked frame cannot
be half-way through a pump stroke.

The look to aim for is the Doom / Blood / Quake viewmodel tradition: the weapon
held low and slightly right of centre, seen from behind and a little above so
its top surfaces and its length read, gloved hands on it, a coat sleeve. Each
of the eight must have a **distinct silhouette** — a player should tell them
apart from the outline alone:

| Slot | Weapon | What must read |
|---|---|---|
| 0 | FLARE PISTOL | a wide-bore signal pistol, one hand, brass and orange |
| 1 | SAWED-OFF SHOTGUN | two barrels side by side, short wooden stock; `pump: true` in the stats |
| 2 | COMBAT RIFLE | a magazine, a sight, a long receiver |
| 3 | TOMMY GUN | drum magazine, vertical foregrip, finned barrel, wood furniture |
| 4 | BMG SNIPER | long heavy barrel, muzzle brake, a scope on top |
| 5 | HOLY CROSS LAUNCHER | a gothic reliquary launcher with a cross bolt loaded |
| 6 | NAIL CANNON | a cluster of barrels that visibly spins while firing |
| 7 | SOUL REAPER | an arcane device with a glowing green soul core |

Per weapon, at minimum: an idle pose, a firing motion driven by the existing
`wstate`/`wtime` (recoil and the weapon's own action — the slide, the pump, the
spin), and a reload that shows the weapon's actual mechanism over the existing
reload duration (magazine out and in; shells into the barrels; a drum swap)
rather than a dip below the screen. Keep the muzzle flash anchored to each new
barrel tip; the flash's anchor was a fixed fraction of the old sprite's height,
so it will be wrong unless you move it.

Keep `drawViewmodel`'s outer contract (`ViewmodelFrame`, the call in
`Loop.ts`), the scoped-sniper hide, and the equip/unequip motion.

**Look at it.** All eight idle poses side by side at the in-game size; each
weapon mid-fire and mid-reload in the running game. Screenshots in the report.
**Say honestly which weapons still do not read**, and why.

Commit: `feat: the weapons are redrawn — eight distinct silhouettes, animated mechanisms`

## Task 2 — running that feels like running

The owner said "fix the running animation" after round 1 already cut the
sprint sway and footstep rate — so less was not the answer; *better* is.

- A **sprint pose**: while sprinting, ease the weapon down and canted (the
  modern FPS convention that tells you you are running, not aiming), and ease
  it back when the sprint ends. Not a snap.
- A **bob with shape**: the weapon traces a figure-eight (horizontal at half
  the vertical rate), not two independent sines; its phase locked to `bobT` so
  every footstep lands at the bottom of a stride.
- **Inertia**: the weapon lags a little behind mouse turns and strafes and
  settles back (there is `swayX/swayY` today; make it feel weighted).
- **Jump and land**: the weapon lifts slightly on take-off and dips on landing,
  scaled by fall speed.
- The **camera** head-bob: keep it subtle; if you change it, see the fixture
  rule in the Global Constraints.

Do not change the footstep cadence (`WALK_BOB_RATE`/`SPRINT_BOB_RATE`) — round
1 tuned it with the owner, and it is sound, not animation.

Commit: `feat: running has a sprint pose, a shaped stride, weight and landings`

## Task 3 — a kick with a body behind it

Replace `drawKickBoot`. A kick is: the weapon swings out of the way, the leg
comes up and **drives forward** into the centre of the screen with a clear
wind-up → strike → recover over the existing `kickAnim` window (0.32 s), the
camera leans into it, and the weapon comes back. The strike's peak must sit at
the moment the game resolves the kick's hit — read `WeaponState.ts`'s `doKick`
and find it; do not move it.

Draw the leg properly: trouser, boot with a sole and a heel, readable at the
game's resolution, lit like the weapons from Task 1.

Commit: `feat: the kick has a wind-up, a strike and a recovery`

## Task 4 — more animation

Small motions that make the hands feel alive. Each must read on screen, or it
is not worth its code:

- **Hurt flinch**: the weapon jolts when the player takes damage.
- **Dry fire**: firing an empty weapon with no reserve does something visible.
- **Pickup nod**: a small acknowledgement when a weapon or ammo is picked up.
- **Idle fidget**: after several seconds without input, a short inspect or
  adjustment, cancelled instantly by any input.
- **Switching**: the weapon going down and the new one coming up should rotate
  and arc, not only slide.

Commit: `feat: the hands flinch, fidget and react`

---

## Definition of done

- Eight redrawn weapons with distinct silhouettes and animated mechanisms.
- Sprint pose, figure-eight bob, inertia, jump and landing motion.
- A kick with wind-up, strike and recovery, peaking on the hit.
- Flinch, dry fire, pickup, fidget, switch.
- Gameplay timing provably unchanged; fixtures unmoved except a camera-bob
  change, if any, analysed.
- Screenshots of all of it and an honest verdict. `npm test` clean.
- Then a build of the single file for the owner to play — they are the judge.
