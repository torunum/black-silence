// @vitest-environment jsdom
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent, type TraceFrame } from "./gameplayTrace";
import { MONOLOGUE } from "../../src/content/monologue";

/**
 * The Plan 0D characterization test: 900 frames of the real game, played
 * from a fixed script, compared against a committed recording (every 10th
 * frame is kept, so the fixture and `trace` array both hold 90 frames).
 *
 * Read `gameplayTrace.ts`'s header for what is recorded and why. This file
 * owns the script and the fixture.
 *
 * **When this test fails during Plan 0D, the migration is wrong.** Nothing
 * in that plan may change what the game does, so any divergence is a
 * rewritten call site that no longer means what it did. The failure message
 * names the first frame that diverged and which of camera/hud/scene it was.
 *
 * Regenerating the fixture is how this test is silenced, so it must never
 * be done to make a red build green. Set `WRITE_TRACE=1` only when the
 * divergence has been explained and deliberately accepted, and say so in
 * the commit message.
 *
 * ## Proven to catch (measured, not assumed)
 *
 * `px`/`pz` transposed in the movement integration, `vx`/`vz` transposed,
 * `sin`/`cos` transposed in the heading, gravity `20`→`21`, and the shake
 * decay `1.6`→`1.7` all fail this test.
 *
 * ## Combat is only half covered by this fixture — read this before trusting a test name
 *
 * **Rewritten for the rebuilt prologue** (the ninth regeneration, at the end
 * of this comment). Until then the prologue loaded with zero enemies and
 * none of the combat path was reached here at all. The rebuilt one loads
 * with **six** — four zombies and two crawlers, all in its hell — and this
 * script walks down the crypt stair and stops at its foot, short of hell, so
 * it meets two of them. Measured with a throwaway probe of the same run (not
 * committed): 12 shots fired, **0 hits**, 0 kills; at the end a crawler
 * (`w`, which climbed out of the burning pit) and a zombie stand at the
 * stair's foot, aware, and the player is at 44 hp. Across the 90 recorded
 * frames:
 *
 * - `hud.hp` is `"HEALTH100"` to frame 520, then falls in 8s — 92 at 530,
 *   84 at 590, … 44 at 890. **`damagePlayer` is exercised now**; the enemy
 *   melee that calls it is too.
 * - `hud.subt` holds the level-opening line (`lvl0`, frames 10-60, said as
 *   the script's first key press skips the grave opening — see the tenth
 *   regeneration below), then ADEM's crypt line (`p0_down`, 70-320, said by
 *   `src/world/Zones.ts` as the player walks through the mausoleum door, and
 *   no longer overwritten), then `""`, then the zombie sighting bark
 *   (`see_z`, 840-900).
 * - `scene.count` rises monotonically, 108 to 120, with zero frames where it
 *   decreases: the sweeping fire never finds the two enemies (they come up
 *   behind the sweep), so nothing dies and nothing is removed.
 *
 * So **`damageEnemy`, `killEnemy`, `severLimb`, `endLevel` and the rest of
 * the shot-resolution path are still not exercised by this fixture.** The
 * `scene.count` growth this file checks for is muzzle flashes, ejected
 * casings and impact decals — FX of firing, not evidence that anything got
 * hit. A test name that implies otherwise is wrong; do not add one back.
 * `combatTrace.test.ts` (level 1) and `bossTrace.test.ts` (level 2) are the
 * combat recordings.
 *
 * Two constants fall out of that same gap and survive sabotage here:
 *
 * - **`hitStop`'s `dt*=.08`** — only reached after a shot connects.
 * - **`spawnGuard`'s `2.0`** — only observable if the player is damaged
 *   during the entry window.
 *
 * Both became *directly* testable once their group was migrated, which was
 * a small piece of luck worth using rather than working around: since Plan
 * 0D Task 2, `screenShake.hitStop` is an exported property a test can
 * assign (see `wiring.test.ts`), and since Task 9 the same is true of
 * `player.spawnGuard`. Those tests own combat's edge behavior; this file
 * does not grow a combat fixture for them.
 *
 * ## Phase 2 Part A Task 3 — regenerated twice, for two different reasons
 *
 * **First regeneration: `gameplayTrace.ts` stopped letting three.js's own
 * object bookkeeping consume the seeded gameplay stream.** See
 * `gameplayTrace.ts`'s `installUuidStub` doc comment for the mechanism.
 * `src/` was unchanged for that commit; this fixture's zero-enemy script
 * has nothing for the shifted stream to change *behaviorally* (no enemies
 * means no `spawnEnemy` random timers to reseed), so — checked frame by
 * frame, not assumed — camera and hud came back **byte-identical** to the
 * pre-stub fixture; only `scene.digest` moved (positions/visibility of the
 * torches' and item's cosmetic timers shifted with the stream, changing
 * nothing camera/hud reads). combatTrace.test.ts's header has the fuller
 * story for level 1, where the shift did reach observable behavior.
 *
 * **Second regeneration: instancing the level's wall/pillar/platform
 * geometry** (`src/world/LevelLoader.ts`). With the stub already in place,
 * this moved only `scene.count`/`scene.digest` (237→33 at frame 10, a
 * constant 204-object delta at every sampled frame through 249→45 at
 * frame 900) — `camera` and `hud` were unchanged across all 90 sampled
 * frames. See that commit's report for the full frame-by-frame
 * confirmation.
 *
 * ## Phase 3 Part B Task 1 — third regeneration: the digest now records textures
 *
 * `digestScene` (`gameplayTrace.ts`) recorded type, position and `visible`
 * and nothing else, so which *texture* a sprite was showing was invisible
 * to this fixture and to `combatTrace.test.ts`'s. Phase 3 Part A Task 2
 * proved what that costs: a change chartered as type-only inverted
 * `Behaviors.ts`'s walk-cycle guard and all 463 tests passed. The digest now
 * also records, for each child that has a material, the **name** of that
 * material's texture (`z.a`, `item.torch[1]`, `tex.hellWall~clone` — see
 * `buildTextureIndex`, and note it is deliberately not `texture.uuid`) and
 * the material's **colour**. `scale` was considered and deliberately left
 * out; the reasoning, and the measurement behind it, are in `digestScene`'s
 * doc comment.
 *
 * That is a recording change with **no runtime effect**, and the
 * regeneration was checked against exactly that claim before being
 * accepted, frame by frame rather than at the first divergence:
 *
 * - `camera` — all seven fields, **byte-identical in all 90 sampled
 *   frames**. Compared field by field, not by whole-object equality.
 * - `hud` — all eight fields (`hp ar wname msg subt lvltitle bossname
 *   keys`), **identical in all 90 frames**, each key counted separately.
 * - `scene.count` — **identical in all 90 frames**, same 33 → 45 shape and
 *   the same min/max as before.
 * - `scene.digest` — changed in all 90 frames, which is expected rather
 *   than alarming: every frame of this level contains textured children
 *   (walls, floor, ceiling, torches), so every frame's part list gains
 *   `:m=`/`:c=` fields. First: frame 10, `313756e7` → `c1fe0472` at an
 *   unchanged count of 33. Last: frame 900, `ba3dd963` → `18e7fa44` at an
 *   unchanged count of 45. 90 distinct digests before and 90 after — the
 *   widening lost no resolution.
 *
 * **This fixture still has zero enemies**, so it gains far less than
 * `combatTrace.test.ts` does. The one `material.map=` assignment site it
 * now covers is the torch flicker (`player/Interact.ts`): both
 * `item.torch[0]` and `item.torch[1]` appear in its sampled frames, so a
 * frozen or reversed torch animation is no longer invisible here. Nothing
 * else changed: it records the same camera, the same HUD and the same
 * object count it always has.
 *
 * ## Player feedback round 1, fix round — fourth regeneration: two causes, kept separate
 *
 * Two of this round's player-requested changes reach this fixture, for two
 * different reasons, and `installAudioStub` (see `gameplayTrace.ts`, KNOWN-22)
 * was deliberately **not** wired in to remove either — that ruling costs three
 * fixtures and a boss-script retune, paid for in a future plan, not this one.
 * Both causes were isolated by temporarily reverting one constant at a time
 * (`KICK_CD` back to `15`, then `SPRINT_BOB_RATE` back to `1.9`), regenerating
 * against each in turn, and restoring `src/` afterward — `git diff --stat --
 * src/` empty before this commit. All frame numbers below are the 90 sampled
 * frames (every 10th of 900); "the fixture" means this commit's regeneration
 * against the pre-round (`010ddae`) committed copy.
 *
 * **Cause 1 — the sprint camera bob (`Player.ts`'s `SPRINT_BOB_RATE`,
 * `1.9`→`1.6`, task 3).** Isolated by regenerating with `KICK_CD` held at the
 * old `15` (so no kick-audio draw can fire inside the window) and the new bob
 * rate in place, diffed against the pre-round fixture:
 * - `camera` — index 1 (`py`) only, in 18 of 90 frames, first at **frame
 *   80** (the frame the script presses `ShiftLeft`), largest at **frame
 *   200** (`-0.009355`). `px`, `pz`, and all three rotation/`fov` fields are
 *   identical in every one of the 90 frames — the signature of a vertical
 *   head bob and nothing else, matching `Player.ts:161`'s `bobSin*.025`
 *   term exactly. This is a real motion change the trace exists to record.
 * - `scene.digest` — also moves, starting **frame 100**, 20 frames before
 *   the kick is even pressed (frame 120). Cause: `footstep()` (`Player.ts`)
 *   calls `bang()` (`src/audio/Sfx.ts`) on every `bobT` zero-crossing while
 *   grounded, so retuning the sprint bob *rate* also retimes when a
 *   sprint-phase footstep sound fires (script sprints frames 80-110); each
 *   shifted footstep is one draw earlier or later against the shared seeded
 *   `Math.random()` stream (see KNOWN-22), which is what actually moves the
 *   digest, not the bob itself. `hud` and `scene.count` are untouched in
 *   all 90 frames of this isolated run.
 *
 * **Cause 2 — the kick's ready-click (`WeaponState.ts`'s `KICK_CD`,
 * `15`→`1`, task 2).** Isolated by regenerating with the new `KICK_CD=1` and
 * the bob rate held at the old `1.9`, diffed against the pre-round fixture:
 * - `camera` — **zero frames differ.** The kick contributes no motion.
 * - `hud` and `scene.count` — **zero frames differ.**
 * - `scene.digest` — moves starting **frame 190** (kicked at frame 120;
 *   `KICK_CD=1`s later resolves under this fixture's 60fps clock right
 *   around there — under the old `KICK_CD=15` this could never happen
 *   inside a 900-frame/15s trace at all, see the task 2 report), through
 *   frame 900. The ready branch's `click(.12)`→`bang()` fills a noise
 *   buffer; in this harness `domStubs.ts`'s `createBuffer()` returns a
 *   1-sample `Float32Array` regardless of requested length, so the fill is
 *   **one** `Math.random()` draw, not the ~1100 a real browser's sample
 *   rate would produce (corrected in the task 2/3 report; the mechanism is
 *   the same, only the earlier magnitude claim was wrong). One draw is
 *   still enough to re-index every later draw in the shared stream.
 *
 * **Combined (this fixture, both changes live, stub not wired):** `camera`
 * diverges in exactly the same 18 frames as Cause 1 alone (Cause 2
 * contributes none) — confirms the two causes don't interact on `camera`.
 * `scene.digest` diverges in all 81 frames from **frame 100** onward (9
 * unaffected frames at the start, 10-90) and none before — Cause 1's
 * earlier onset (100) swallows Cause 2's later one (190) in the union, so
 * the combined fixture's first divergence is Cause 1's, not Cause 2's, even
 * though Cause 2 is the one this task set out to test. `hud` and
 * `scene.count` are identical in all 90 frames, for both causes and
 * combined — the `"kickready"` bark is real (see the task 2 report: it
 * loses `say`'s 3-second throttle race against the level-opening line and
 * is spent silently, never reaching the DOM), so nothing about it shows up
 * in `hud`.
 *
 * ## Phase 2B gothic trim — fifth regeneration: one more scene child
 *
 * `src/world/Trim.ts` adds pillar bases/capitals and wall courses as at most
 * two `InstancedMesh` scene children per level. The prologue has no pillars,
 * so it gains exactly one (`wallCourse`). A purely visual change: no
 * `Math.random()` draw (the module draws none, and `installUuidStub` keeps
 * three's own UUID draws out of the stream), and nothing reads the scene
 * back for gameplay. Compared field by field against the pre-trim fixture,
 * all 90 sampled frames:
 *
 * - `camera` — all seven components **identical in all 90 frames**.
 * - `hud` — all eight fields **identical in all 90 frames**.
 * - `scene.count` — **+1 in every one of the 90 frames**, no other delta
 *   (33..45 → 34..46).
 * - `scene.digest` — differs in all 90, necessarily, since the child list
 *   gained a member. First: frame 10, `c1fe0472` → `037ed69c`. Last: frame
 *   900, `455ad8bc` → `8d4e01de`. 90 distinct digests before and after.
 *
 * That the digest moved *only* because of the added child was checked
 * directly rather than inferred: with `digestScene` temporarily filtering out
 * children named `wallCourse`/`pillarTrim`, this run reproduced the
 * **pre-trim fixture byte for byte** (and so did the other two fixtures).
 * The filter was then removed; `gameplayTrace.ts` is unchanged by this
 * commit. Worth knowing: the digest records an `InstancedMesh` by its own
 * position and material, never by its instance matrices, so *where* the trim
 * sits is invisible to every trace — `tests/world/trim.test.ts` owns that.
 *
 * ## Trim bands — sixth regeneration: the course changes texture
 *
 * The wall courses stopped wearing the level's wall texture and wear the
 * theme's stone band instead (`src/render/BandTextures.ts`; on this level
 * `tex.hellWall` -> `band.hell`). The bands are built at boot from an
 * integer hash, not `Math.random`, and `installUuidStub` keeps three's
 * texture UUIDs out of the stream, so nothing had a mechanism to move but
 * the course's texture name. Field by field against the pre-band fixture,
 * all 90 sampled frames:
 *
 * - `camera` — all seven components **identical in all 90 frames**.
 * - `hud` — all eight fields **identical in all 90 frames**.
 * - `scene.count` — **identical in all 90 frames** (34..46).
 * - `scene.digest` — differs in all 90, necessarily: `wallCourse` is a
 *   scene child from the first frame to the last, and its part string
 *   carries the texture name. First: frame 10, `037ed69c` -> `fd28e136`.
 *   Last: frame 900, `8d4e01de` -> `c482baf4`. 90 distinct digests before
 *   and after.
 *
 * Confirmed rather than inferred, and with a stronger test than the trim
 * regeneration's filter: with `loadLevel` temporarily handing `buildTrim`
 * the wall texture again — the four bands still built at boot by
 * `startGame`, still indexed as `band.*` — this run and both other traces
 * reproduced the pre-band fixtures byte for byte. So building the bands
 * took nothing from the seeded stream, adding `BANDTEX` to
 * `buildTextureIndex` renamed nothing, and that one argument is the whole
 * of this diff. `gameplayTrace.ts` changed in this commit only by indexing
 * `BANDTEX` as a fourth source.
 *
 * ## Door arches — not regenerated
 *
 * `src/world/Arches.ts` adds a `doorArch` scene child on levels with
 * archable doors. The prologue has no doors, so it gains nothing, and this
 * fixture is byte-identical before and after (md5 checked); the level 1 and
 * level 2 fixtures moved, and their headers carry the account.
 *
 * ## Player feedback round 2 Task 1 — seventh regeneration: sound stopped rolling the game's dice
 *
 * `docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md` Task 1,
 * closing `docs/known-issues.md` KNOWN-22 (filed as KNOWN-20 in the round-1
 * fix round and renumbered — see that row). Until this commit every sound
 * drew from the same `Math.random()` this harness seeds for gameplay: each
 * noise sound filled a fresh buffer from it (one draw here, since
 * `domStubs.ts`'s `createBuffer()` hands back a 1-sample buffer), a dozen
 * sounds took pitch jitter from it, the drone bed's four LFO rates came from
 * it, and the ambient layer timed its stingers and breathing with it. Sound
 * now draws from its own generator (`src/audio/SoundRandom.ts`) and plays
 * shared noise at an offset (`src/audio/Noise.ts`), so all of those draws
 * left the gameplay stream at once, and every gameplay draw after the first
 * one of them re-indexed. That is the sanctioned move, and the only one:
 *
 * - **79 sound draws** left this run's stream (53 sample/pitch/rate values,
 *   26 that decide whether or when a later sound plays — the ricochet roll,
 *   the stinger choice and its timers, the breathing timer, the casing
 *   clink's delay). Counted by instrumenting every sound draw site.
 * - `camera` — all seven components **identical in all 90 frames**.
 * - `hud` — all eight fields **identical in all 90 frames**.
 * - `scene.count` — **identical in all 90 frames** (34..46).
 * - `scene.digest` — differs in **all 90**, first at frame 10
 *   (`fd28e136` -> `ba716fe7`), last at frame 900 (`c482baf4` ->
 *   `35e44eb6`); 90 distinct digests before and after. The same shape the
 *   round-1 note predicted for this level: no enemies, so the re-indexed
 *   stream reaches only cosmetic timers (torch flicker, particle jitter).
 *
 * **The proof that it is only that**, done in a throwaway worktree of the
 * commit before (the sound catalogue extraction, itself proven to leave all
 * three fixtures and the full 82,401-event audio call log of the three runs
 * byte-identical), with every sound draw site routed through one probe:
 *
 * 1. Probe returning `Math.random()` — the old code exactly — reproduced
 *    all three old fixtures byte for byte (the instrumentation is faithful).
 * 2. Probe making **the same draw at the same point but throwing its value
 *    away** (0.5 instead) for every sample/pitch/rate draw, and keeping the
 *    value only for the 26 draws that decide whether or when a later sound
 *    draw happens (without those, the *count* itself would change):
 *    **all three old fixtures reproduced byte for byte.** What sound drew
 *    never reached gameplay; only how many draws it took, and where.
 * 3. Probe **making no draw at all**, answered from a local generator:
 *    identical fixtures under two different local seeds (7 and 99), and
 *    **byte-identical to this commit's regenerated fixtures** — all three.
 *    So the new code is exactly the old code with sound's draws removed.
 *
 * From this commit on `runTrace` runs under `installAudioDrawGuard`
 * (`gameplayTrace.ts`), which fails the run if any `Math.random()` call
 * comes from `src/audio/` — so the next sound change cannot move this
 * fixture silently, and Tasks 2-5 of that plan are required to move none.
 *
 * ## Player feedback round 2, the stride — eighth regeneration: the camera bob slowed down
 *
 * The owner played again and reported the weapon swaying left and right
 * very fast, the footsteps with it. `Player.ts`'s `WALK_BOB_RATE` =
 * `SPRINT_BOB_RATE` went `1.6` -> `0.45`: a footstep per 2π of `bobT*4`,
 * so `spd*rate*4/2π` steps a second — 7.1 -> **2.0** walking, 10.7 ->
 * **3.0** sprinting (`tests/player/Player.test.ts` has the arithmetic).
 * Speed, acceleration and everything else are untouched. The one thing the
 * rate reaches that this harness records is the camera's head bob,
 * `bobSin*.025*min(1,spd/7)` in `playerTick`'s `camera.position.set` — so
 * every frame the player is walking moves in `y`. Field by field against the
 * pre-change fixture, all 90 sampled frames:
 *
 * - `camera` — `y` in **25 frames**, first at **10** (`1.015548` ->
 *   `1.008503`), last at 300, largest at 40 (0.0337, a bob is ±0.025).
 *   `x`, `z`, `rx`, `ry`, `rz`, `fov` — **identical in all 90**.
 * - `hud` — all eight fields **identical in all 90**.
 * - `scene.count` — **identical in all 90** (34..46).
 * - `scene.digest` — differs in **64**, every frame from **270** (the first
 *   sampled frame after the script opens fire at 260: `e51f132c` ->
 *   `3d6035c0`) to 900 (`35e44eb6` -> `df1c7acf`); 90 distinct digests
 *   before and after. **This is still the bob.** Three things the game puts
 *   in the scene take their height from the camera: the muzzle light
 *   (`fire()` copies `camera.position` into it), and the bullet holes and
 *   blood splats `hitscan` leaves where a ray *from the camera* meets a wall.
 *   Compared part by part (131 differing parts: 125 holes, 6 muzzle
 *   lights), **every differing part differs in `position.y` alone** — same
 *   type, `x`, `z`, visibility, texture and colour.
 *
 * **The proof that the bob is the whole of it**, all three fixtures, with a
 * throwaway probe in `runTrace` (removed; `gameplayTrace.ts` is unchanged by
 * this commit) that wrapped `camera.position.set` to record, at the moment
 * `playerTick` calls it, the `y` it is given and the bob term inside it
 * (recomputed from `player.bobT`/`grounded`/`vx`/`vz`, which nothing touches
 * between that line and the end of the tick):
 *
 * 1. The probed run at the old rate reproduced the old fixtures exactly, and
 *    the probed run at the new rate this commit's fixtures exactly — the
 *    probe changes nothing.
 * 2. **Old `y` minus old bob equals new `y` minus new bob in every sampled
 *    frame of all three runs**, to 1.1e-16 here (2.2e-16 at worst, the boss
 *    run) — floating-point rounding of the subtraction, nothing more. On the
 *    fixtures' own 6-place numbers the same identity holds to under 1e-6.
 * 3. With the bob term temporarily taken out of `camera.position.set`, the
 *    old rate and the new one produced **byte-identical fixtures, all three,
 *    and identical scene part lists in every frame**. So the rate reaches the
 *    recording through that one term and nothing else: footsteps (which draw
 *    from sound's own dice, and `installAudioDrawGuard` would have failed the
 *    run otherwise), the weapon's stride and everything else that reads
 *    `bobT` move nothing here.
 *
 * ## The prologue rebuilt — ninth regeneration: a new map, a new route
 *
 * Player feedback round 2, `docs/superpowers/plans/2026-09-27-player-feedback-2-prologue.md`
 * Task 1. The owner: the prologue climbs out of a grave and passes through
 * hell. The reference's map did the reverse (a hell cavern, then a stair up
 * to a tomb), so `src/world/levels/prologue.ts` is a new map — a churchyard
 * under the sky, a mausoleum and a crypt stair down, a hell crossing, a
 * climb out — with zones (`src/world/Zones.ts`), set dressing
 * (`src/world/Decor.ts`) and six enemies; ADEM's `lvl0` lines are rewritten
 * and three zone lines added. Every section above this one describes the
 * old map and is kept as history. This fixture was expected to move, and it
 * moved everywhere: against the pre-change fixture, `camera` differs in all
 * 90 sampled frames (the spawn itself moved), `hud` in 66, `scene.count` in
 * all 90 (34..46 became 108..120 — the churchyard's walls, floor, ceiling
 * and trim are one mesh per zone look, plus torches, candles, items,
 * enemies, the decor meshes, the moon and the stars), `scene.digest` in all
 * 90 (first `45592394`, last `a0359cea`; 90 distinct).
 *
 * **The script was rewritten**, because the old one walked into the old
 * cavern's south wall and never climbed anything (its `y` never left 1.0
 * but for the jump). It keeps the old one's shape — walk and look for four
 * seconds, then twenty swept bursts with a reload every five — and now:
 *
 * - **walks**: from beside the grave (`x 19, z 9.3` at frame 10) due south
 *   across the churchyard, through the mausoleum door and down the stair to
 *   `z 34.06`, where it stops (frame 205);
 * - **changes height for real**: `y` 5.21 (the churchyard, floor 4.2) falls
 *   from frame 130 to 3.10 at frame 230 (floor 2.1) — the crypt stair's five
 *   0.42 steps, taken as step-downs;
 * - **turns**: a paired look (yaw 3.142 -> 3.010 -> 3.142 by frame 50,
 *   kept small so the walk stays inside the doorway and the 4-unit stair),
 *   then the sweep, 3.021 at 260 to 0.722 at 830;
 * - **kicks at frame 120** (in the crypt chamber, into the air: the camera's
 *   roll reads 0.004 in that frame), **jumps at 150** on the stair, sprints
 *   80-110 and strafes;
 * - **fires**: 12 shots and `"— RELOADING"` in the HUD; the count grows
 *   108 -> 120 as decals and flashes accumulate.
 *
 * What it records of enemies is in the combat section above: two come up
 * the stair, the player loses 56 hp to them, no shot hits.
 *
 * **The proof that the map is the whole of this diff**, and that the loader
 * work under it (zones, `LevelMeshes.ts`, `ZoneLook.ts`, `Decor.ts`, the
 * zone branches in `Ceiling.ts` and `Trim.ts`, the `y0`/`y` lifts in
 * `Interact.ts`) changes nothing a level without zones can see: with the
 * reference's old prologue (`prologue.ts` at `9b6abea`), the old `lvl0`
 * lines (`monologue.ts` at `9b6abea`) and the old script put back — and
 * every other file as committed here — **this test passed against the old
 * fixture, byte for byte, all 90 frames**. The old files were then restored.
 * The other two fixtures, `trace-level1.json` and `trace-level2-boss.json`,
 * are byte-identical to `9b6abea` (`git diff` empty), so the loader
 * refactor moved nothing on levels 1 and 2 either. And the run is seeded as
 * before: no new code draws from `Math.random` at load or per tick
 * (`tests/world/zones.test.ts` counts: the only draws the zones cause are
 * `say()`'s own line picks, one per zone line), and `installAudioDrawGuard`
 * still passes.
 *
 * ## The grave opening — tenth regeneration: the first line moved, and only that
 *
 * The prologue plan's Task 2 (`src/world/Opening.ts`): the prologue now opens
 * with ADEM clawing out of his grave — 5.5 seconds, input locked, **any key
 * or click skips it**. **This script skips it, at frame 5**, with the
 * `KeyW` press it has always opened with: the opening runs for frames 1-4,
 * the keydown skips it, and the same press walks him south as before. It
 * is skipped rather than recorded because this fixture's job is the walk,
 * the stair, the fight and the HUD, and recording 330 frames of a camera
 * on rails would push all of that out of a 900-frame run or double its
 * length; the opening's own behaviour — the lock, the pose from lying to
 * standing, the skip by key and by click, the hidden weapon, the line — is
 * owned by `tests/world/opening.test.ts`. The skip is at a known frame
 * because the script says so, not because of a harness hook: it goes
 * through the game's own listener.
 *
 * What moved, field by field against the ninth regeneration, all 90
 * sampled frames:
 *
 * - `camera` — all seven components **identical in all 90**. The opening
 *   places the camera in frames 1-4 and the skip hands it to `playerTick`
 *   at the spawn, before the first sample.
 * - `hud` — `subt` alone, in 32 frames: `lvl0` is now said at the skip
 *   (frames 10-60) instead of by `loadLevel`'s 1.4-second timer (90-340),
 *   so the crypt's line (`p0_down`) is no longer overwritten and holds from
 *   70 to 320. The other seven fields are identical in all 90.
 * - `scene.count` — **identical in all 90** (108..120).
 * - `scene.digest` — differs in all 90, from frame 10 (`45592394` ->
 *   `813482c6`) to 900 (`a0359cea` -> `0787c628`); 90 distinct before and
 *   after. The `say()` pick of the `lvl0` line is one `Math.random()` draw;
 *   made at frame 5 instead of frame 84, it re-indexes every draw between —
 *   the torches' flicker and embers, which the digest records.
 *
 * **The proof that the line's timing is the whole of it**: with the
 * opening running and skipped exactly as committed, but its line left
 * unsaid and `loadLevel`'s 1.4-second `lvl0` timer put back, this test
 * passed against the ninth regeneration's fixture **byte for byte, all 90
 * frames**; and with the prologue's `grave` removed (no opening at all) the
 * same held — and so did `combatTrace` and `bossTrace` against theirs. So
 * the opening itself — the lock for four frames, the camera, the lamp, the
 * lid, the hidden weapon, the new sounds and the dirt — takes nothing from
 * the seeded stream and changes nothing this fixture records;
 * `tests/world/opening.test.ts` counts its draws (one: `say()`'s pick).
 * `trace-level1.json` and `trace-level2-boss.json` did not move.
 */

const FIXTURE_DIR = join(__dirname, "__fixtures__");
const FIXTURE = join(FIXTURE_DIR, "trace-level0.json");
const WRITE = process.env.WRITE_TRACE === "1";

/**
 * Deliberately not a still player, and deliberately long enough that a
 * level with enemies in it would have given combat a chance to happen —
 * which the rebuilt prologue now is: two of its enemies find the player at
 * the foot of the crypt stair (see the module doc comment above).
 *
 * A trace of someone standing at spawn exercises none of
 * px/pz/vx/vz/grounded/bobT — the largest and riskiest group in the plan.
 * A *short* trace exercises even less: `spawnGuard` gives 2 seconds of
 * entry invulnerability, so nothing shorter than that could ever show a
 * hit landing even in a level that had enemies to hit. The first version
 * of this script ran 4 seconds and proved nothing about `spawnGuard` or
 * `hitStop` either way.
 *
 * So: move and look for the first four seconds, then fire in swept bursts
 * for ten more. That second phase does exercise the weapon state machine
 * through fire/reload cycles and the FX firing produces (muzzle flashes,
 * casings, impact decals) — it does not exercise shot resolution: the sweep
 * never finds the two enemies that come up behind it (12 shots, 0 hits).
 */
const FIGHT_START = 260;

function fightingScript(): InputEvent[] {
  // The rebuilt prologue's route (see the module doc comment): from beside
  // the grave, straight south across the churchyard, through the mausoleum
  // door and down the crypt stair — the height change — stopping on the
  // stair, short of hell. Turns are paired so the walk stays inside the
  // doorway and the 4-unit-wide stair.
  const script: InputEvent[] = [
    { frame: 2, kind: "pointerlock", locked: true },
    // skips the grave opening (src/world/Opening.ts) — any key does — and, held, walks south
    { frame: 5, kind: "key", type: "keydown", code: "KeyW" },
    { frame: 20, kind: "move", movementX: 60, movementY: -30 },
    { frame: 40, kind: "key", type: "keydown", code: "KeyA" },
    { frame: 50, kind: "move", movementX: -60, movementY: 15 },
    { frame: 55, kind: "key", type: "keyup", code: "KeyA" },
    { frame: 80, kind: "key", type: "keydown", code: "ShiftLeft" },
    { frame: 110, kind: "key", type: "keyup", code: "ShiftLeft" },
    { frame: 120, kind: "button", type: "mousedown", button: 2 },  // kick
    { frame: 122, kind: "button", type: "mouseup", button: 2 },
    { frame: 150, kind: "key", type: "keydown", code: "Space" },   // jump
    { frame: 152, kind: "key", type: "keyup", code: "Space" },
    { frame: 185, kind: "key", type: "keydown", code: "KeyD" },
    { frame: 195, kind: "key", type: "keyup", code: "KeyD" },
    { frame: 205, kind: "key", type: "keyup", code: "KeyW" },
  ];
  // Ten seconds of sweeping fire: turn a little, fire a burst, repeat. In a
  // level that had enemies, sweeping the aim rather than firing at one spot
  // would be what let shots connect without knowing where they were placed
  // — but on this route the enemies arrive behind the sweep (see the module
  // doc comment), so what this loop actually exercises is the weapon state
  // machine's fire/reload path and the FX firing produces, not a hit landing.
  for (let i = 0; i < 20; i++) {
    const f = FIGHT_START + i * 30;
    script.push({ frame: f, kind: "move", movementX: 55, movementY: i % 4 === 0 ? 8 : -6 });
    script.push({ frame: f + 4, kind: "button", type: "mousedown", button: 0 });
    script.push({ frame: f + 16, kind: "button", type: "mouseup", button: 0 });
    if (i % 5 === 4) {
      script.push({ frame: f + 20, kind: "key", type: "keydown", code: "KeyR" }); // reload
      script.push({ frame: f + 22, kind: "key", type: "keyup", code: "KeyR" });
    }
  }
  return script;
}

const INPUT: readonly InputEvent[] = fightingScript();

let trace: TraceFrame[];

beforeAll(async () => {
  trace = await runTrace({ seed: 20260814, frames: 900, dtMs: 1000 / 60, input: INPUT, every: 10 });
  if (WRITE) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(FIXTURE, JSON.stringify(trace, null, 1) + "\n");
  }
}, 60_000);

describe("the recorded run is worth comparing", () => {
  it("records the frames it was asked for", () => {
    expect(trace.length).toBe(90); // 900 frames, every 10th
  });

  it("fires and reloads — the weapon state machine advances and FX accumulate in the scene", () => {
    // This does NOT check combat — see the module doc comment above: no
    // shot here ever lands (12 fired, 0 hits). What this
    // guards against is the script silently degrading into a walking tour
    // that never actually pulls the trigger: an earlier version of this
    // script did exactly that and let a `hitStop` sabotage pass unnoticed.
    const counts = trace.map((f) => f.scene.count);
    // Firing adds muzzle-flash, casing and decal objects to the scene; a
    // walking-only run would not grow the count anywhere near this much.
    expect(Math.max(...counts) - Math.min(...counts)).toBeGreaterThan(5);
    // In this fixture the count only ever grows — FX accumulate and nothing
    // is ever despawned, because no enemy is hit, so none dies.
    // Pin that shape: a future frame where it drops is a real behavior
    // change, not something that should pass silently.
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    // The weapon state machine left its idle pose and actually reloaded —
    // not just any two wname strings, but specifically the "RELOADING"
    // state the script's scripted KeyR presses should trigger.
    const wnames = new Set(trace.map((f) => f.hud.wname));
    expect(wnames.size).toBeGreaterThan(1);
    expect([...wnames].some((w) => w.includes("RELOADING"))).toBe(true);
  });

  it("goes down the crypt stair — a real height change, not just a jump", () => {
    // The churchyard stands at 4.2 and the stair's foot at 2.1: the eye
    // (EYE=1 above the floor) starts at ~5.2 and settles at ~3.1.
    expect(trace[0].camera[1]).toBeGreaterThan(5.1);
    expect(trace.at(-1)!.camera[1]).toBeLessThan(3.2);
    expect(trace.at(-1)!.camera[1]).toBeGreaterThan(3.0);
  });

  it("meets the prologue's enemies: the player is hurt, and a sighting bark is heard", () => {
    expect(trace[0].hud.hp).toBe("HEALTH100");
    expect(trace.at(-1)!.hud.hp).not.toBe("HEALTH100");
    expect(trace.some((f) => f.hud.subt.includes("Zombies"))).toBe(true);
  });

  it("skips the grave opening with its first key: the level's line at once, then the crypt's, never overwritten", () => {
    const lvl0 = (f: TraceFrame) => MONOLOGUE.lvl0.some((l) => f.hud.subt.includes(l));
    const down = (f: TraceFrame) => MONOLOGUE.p0_down.some((l) => f.hud.subt.includes(l));
    expect(lvl0(trace[0]), "frame 10: the opening was skipped at frame 5 and said its line").toBe(true);
    // standing at the spawn by frame 10: the opening's camera is gone
    expect(trace[0].camera[1]).toBeGreaterThan(5.1);
    const first = trace.findIndex(down);
    expect(first).toBeGreaterThan(0);
    expect(trace.slice(first).some(lvl0), "lvl0 forced over the crypt's line").toBe(false);
  });

  it("shows a player who actually moved and looked around", () => {
    const first = trace[0].camera, last = trace.at(-1)!.camera;
    expect(first).not.toEqual(last);
    // Position AND rotation, separately: a trace that only turned would
    // leave px/pz untested, which is the whole point of the script.
    expect([first[0], first[2]]).not.toEqual([last[0], last[2]]);
    expect(first[4]).not.toEqual(last[4]); // yaw
  });

  it("shows a world that changed — things spawned or moved", () => {
    const digests = new Set(trace.map((f) => f.scene.digest));
    expect(digests.size).toBeGreaterThan(20);
    expect(trace[0].scene.count).toBeGreaterThan(10);
  });

  it("shows the HUD reacting", () => {
    const hudStates = new Set(trace.map((f) => JSON.stringify(f.hud)));
    expect(hudStates.size).toBeGreaterThan(1);
    expect(trace[0].hud.hp).toMatch(/\d/);
  });
});

describe("the run matches the committed recording", () => {
  it("diverges from the fixture nowhere", () => {
    if (WRITE) {
      expect(existsSync(FIXTURE)).toBe(true);
      return; // just wrote it; nothing to compare against
    }
    expect(
      existsSync(FIXTURE),
      `${FIXTURE} is missing — generate it once with WRITE_TRACE=1 and commit it`,
    ).toBe(true);

    const expected = JSON.parse(readFileSync(FIXTURE, "utf8")) as TraceFrame[];
    expect(trace.length).toBe(expected.length);

    // Report the first divergence and stop, rather than letting Vitest
    // print a diff of 90 frames' worth of scene digests.
    for (let i = 0; i < expected.length; i++) {
      const a = trace[i], b = expected[i];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const what = a.camera.join() !== b.camera.join() ? "camera"
        : JSON.stringify(a.hud) !== JSON.stringify(b.hud) ? "hud"
        : "scene";
      expect(
        { frame: a.frame, what, actual: a[what as "camera"], expected: b[what as "camera"] },
      ).toEqual(
        { frame: b.frame, what, actual: b[what as "camera"], expected: b[what as "camera"] },
      );
    }
    // Nothing diverged in the scan; assert the whole thing for good measure.
    expect(trace).toEqual(expected);
  });
});
