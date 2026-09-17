// @vitest-environment jsdom
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent, type TraceFrame } from "./gameplayTrace";
import { S } from "../../src/core/State";
import { player } from "../../src/player/PlayerState";
import { world } from "../../src/world/WorldState";

/**
 * The boss trace — a recording of `priestThink` (`src/enemies/Boss.ts`)
 * playing out all three of its phases, made **before** Phase 3 replaces the
 * one shared priest brain with three distinct boss brains.
 *
 * `trace.test.ts` plays the prologue, which loads with zero enemies.
 * `combatTrace.test.ts` plays level 1, which has fifteen — but level 1's
 * only boss is `U`, THE CATHEDRAL GUARDIAN (`EnemyDefs.ts`: `boss:true,
 * stone:true`, **no** `priest`), so `priestThink` never runs in either.
 * That is why `combatTrace.test.ts`'s honest-gaps list names `Boss.ts`'s two
 * `material.map=` sites as unreachable "in *both* fixtures regardless of
 * script". This file is the third fixture that reaches them.
 *
 * **This fixture was recorded before that rewrite.** Its entire value is
 * being a pre-rewrite recording. See "When Phase 3 replaces `priestThink`"
 * at the bottom of this comment for the one regeneration this file is
 * *for*, and `trace.test.ts`'s header for the general argument against any
 * other one.
 *
 * ## Getting to a priest boss at all
 *
 * Level 2, THE ABANDONED CHURCH, is the first level with a `priest` boss:
 * `src/world/levels/level2.ts`'s `putAbs(L,16,20,"Q")` — THE CORRUPTED
 * PRIEST, 1800 hp — which `loadLevel` spawns at world (33,41), since a grid
 * cell (x,z) becomes world ((x+.5)*CELL,(z+.5)*CELL) at `CELL=2`.
 * `runTrace`'s `level` option gets there through chapter select exactly the
 * way `combatTrace` reaches level 1.
 *
 * Three things then stand between the harness's scripted input and a priest
 * fight, all three measured rather than assumed:
 *
 * 1. **The player arrives in the narthex**, at level 2's `"P"` cell
 *    (`put(L,1,0,3,1,"P")`, world (25,5)) — confirmed live, printed
 *    straight out of `player` after `loadLevel`. The priest is at (33,41),
 *    36.9 units away through seven doored rooms of the level's outer ring
 *    (narthex → chapel → priest chambers → sacristy → catacombs east →
 *    ossuary → crypt). A script that walked it would have to solve the
 *    level, and would be re-tuned by every enemy it met on the way.
 * 2. **Bosses spawn dormant.** `spawnEnemy` sets `dormant:!!d.boss`, and
 *    `Behaviors.ts`'s `enemyTick` only wakes one when
 *    `d0<(e.priest?13:9)&&los(...)`. A boss the player never approaches
 *    never wakes, and `hitscan` skips `e.dormant` outright, so it cannot
 *    even be shot awake from range.
 * 3. **`priestThink` is gated behind `seen`** — `enemyTick` runs the boss
 *    brains inside `if(seen)`, i.e. `los(...)&&dist<22`.
 *
 * ## What this run seeds, and why `beforeAll` alone could not do it
 *
 * `combatTrace.test.ts` established the technique: assign a live exported
 * state field in `beforeAll`, before `runTrace` boots the game, to reach a
 * branch the scripted input cannot otherwise produce (there, `S.armor=50`).
 * Two of the three things below are seeded exactly that way. The third
 * could not be, and that distinction is the whole reason `runTrace` grew an
 * `afterLoad` option for this file:
 *
 * - **`beforeAll`, before boot — the nail cannon** (`S.weapons[6]`,
 *   `S.cur`, `S.mag[6]`, `S.ammo.nails`). `loadLevel` never touches the
 *   inventory, so these survive it, the same way `S.armor` does. Level 2
 *   does carry a Holy Cross Launcher (`putAbs(L,16,21,"6")`) — on the altar
 *   *next to the priest*, which is no use to a player who has not walked
 *   there. The nail cannon is chosen for one measured reason: at 11 damage
 *   every 0.05s it has the highest sustained damage of the eight weapons
 *   (220/s on target, against the BMG sniper's 114/s), and a blind sweep's
 *   expected damage rate is exactly (damage rate) x (target's angular
 *   width / 2pi) — see "the sweep, and why it is slow" below.
 * - **`afterLoad`, after the level is built — the player's position.**
 *   `player.px`/`player.pz` are **not** seedable in `beforeAll`:
 *   `loadLevel` writes them from the grid's `"P"` cell during its scan
 *   (`if(ch==="P"){player.px=wx;player.pz=wz;}`), and `loadLevel` runs
 *   *inside* `runTrace`. Measured, not reasoned: a `beforeAll` assignment
 *   of (43,43) read back as (25,5) after boot. So the player is placed at
 *   world (43,43) — grid (21,21), an empty floor cell of the crypt, 10.2
 *   units east of the priest with clear line of sight along the two open
 *   rows the priest's doorway cell sits in. That is inside the priest's
 *   13-unit wake radius, so the boss wakes on the first gameplay frame.
 * - **`afterLoad` — `S.hp=5000`.** `loadLevel` sets `S.hp=100`, so this too
 *   has to be post-load. It is the price of the sweep below: the recorded
 *   fight runs 45 seconds of game time, during which a phase-2 priest
 *   volleys five 15-damage orbs every 2.8s and its summons close in. The
 *   committed run ends with the player at `"HEALTH3847"`, i.e. having taken
 *   1153 real points of damage through the real `damagePlayer`; nothing
 *   about the damage path is stubbed or softened, only the pool it draws
 *   down. The pool is kept at 5000 rather than trimmed to fit: when this
 *   script ran 5400 frames it drained 2798, an earlier tuning that seeded
 *   only 3000 had the player dead before frame 5500, and a fixture of a
 *   corpse watching a frozen scene records nothing (`Loop.ts` stops ticking
 *   gameplay on `S.dead`) — the headroom is what keeps a retune of the run's
 *   length from turning into a silent recording of nothing. No armour is
 *   seeded here — `combatTrace` already covers `damagePlayer`'s absorb arm.
 *
 * **This is a seeded start, and it is not a played approach.** What the
 * trace proves is what `priestThink` does once a priest boss is awake, in
 * sight and being shot. It proves nothing about whether a player can reach
 * the priest, about level 2's locked red-key doors (the nave is behind two
 * `locked` links; the priest is not, but the ring walk to it is long), or
 * about the seven rooms of enemies between the narthex and the crypt. The
 * fixture must not be read as a recording of level 2 being played.
 *
 * ## The script: stand still, hold the trigger, turn slowly
 *
 * - **Frame 2** locks the pointer, as both other traces do.
 * - **Frames 1-~165 belong to the game, not the script.** The boss wakes on
 *   frame 1 and `wakeBoss` sets `game.inputLock=true`, `input.firing=false`
 *   and `world.cine` for a 2.7s wake cinematic, which `cineTick` spends
 *   lerping `input.yaw`/`input.pitch` onto the boss. That is why this
 *   script needs none of `combatTrace`'s careful `Math.PI/SENS` entry turn:
 *   **the game aims the player at the priest for free**, and far more
 *   accurately than a scripted turn could.
 * - **Frame 220: `mousedown`, never released.** The nail cannon is fully
 *   automatic (`weaponTick`'s `if(input.firing&&...)` fires whenever
 *   `wCool<=0`) and reloads itself (`if(wstate==="idle"&&S.mag[S.cur]===0
 *   &&S.ammo[w.ammo]>0&&wtime>.4)startReload()`), so one held button is the
 *   entire firing script — no `KeyR` cadence, unlike `combatTrace`.
 * - **From frame 620: a steady full-circle sweep**, one revolution every 9
 *   seconds, emitted as a constant `movementX` every 4 frames and computed
 *   from `Input.ts`'s exact sensitivity the way `combatTrace` computes its
 *   turns. The player never moves — a standing turret, like that file's
 *   second phase.
 *
 * ### The sweep, and why it is slow on purpose
 *
 * Phase 1 needs no sweep: the priest walks to the player
 * (`if(dist>1.6){moving=moveEnemy(...)}`) and stays there, so the
 * cinematic's aim is still on it and 612 damage lands in about 6 seconds.
 * The sweep exists for **phase 2**, which is where this run spends 80% of
 * its frames, for a reason that is a property of `priestThink` and not of
 * this script:
 *
 * - Crossing 66% hp runs `priestTeleport(e,true)`, which puts the boss
 *   7-11 units from the player.
 * - The phase-2 branch has **no `moveEnemy` call at all** and teleports
 *   again only `if(dist<5&&e.tpT<=0)`. A stationary player never triggers
 *   that, so the boss stands still for the whole phase. Measured: in the
 *   committed run the priest teleports **exactly once**, on frame 546, from
 *   (41.5,42.7) to (33.3,41.6), and stays there until phase 3 at frame 2244.
 *   (Before level 2's pews stopped being bosses it was the same single
 *   teleport, to (35.6,45.6), from frame ~530 to frame ~4900 — see the
 *   KNOWN-4 section.)
 * - A blind sweep's expected damage rate is (damage rate) x (target's
 *   angular width / 2pi) — **independent of how fast the sweep turns**,
 *   because turning slower buys proportionally more dwell per pass and
 *   proportionally fewer passes. The priest is `w=2.71` wide, so hitscan's
 *   `dd<e.w*.45+.1` test gives it a 1.32-unit half-width: at the 9.8 units
 *   it now stands off it subtends ~0.27 rad, about 4.3% of a revolution.
 *   Phase 2 costs 605 hp, measured, and takes **1691 frames (28.2s)** — 38
 *   landed hits at ~15.9 damage each, over ~3.1 revolutions of the sweep.
 *
 * A narrower sweep aimed at where the boss *happened* to teleport would cut
 * that by 5x, and was rejected: it would be tuned to this seed's one
 * teleport, and if a future change moved that teleport the run would
 * degrade into a boss that never reaches phase 3 — silently, and green.
 * The full circle costs frames and cannot fail that way.
 *
 * ## The five observables, and what a degraded script cannot fake
 *
 * The failure this file exists to avoid is a trace where the boss is
 * present but never fights — green, and worthless. Four of the five checks
 * below are reachable **only** through `priestThink`; the fifth is the one
 * `combatTrace`'s header is careful to label as not combat-specific, kept
 * here for the same narrow reason.
 *
 * 1. **`hud.bossname` reaches `"THE CORRUPTED PRIEST — PHASE 3"`.**
 *    `Hud.ts` renders `boss.name+(boss.priest?" — PHASE "+boss.phase:"")`
 *    for the first `e.boss&&!e.dead&&!e.dormant` enemy — so the string
 *    alone proves the boss is **awake** (`dormant` false), alive, a priest,
 *    and in phase 3. `e.phase` is assigned in exactly two places in all of
 *    `src/` (grepped, not assumed): `Boss.ts:166` and `Boss.ts:169`, both
 *    inside `priestThink`. `spawnEnemy` initialises it to 1 and nothing
 *    else ever writes it. A run where the boss never wakes, or wakes and is
 *    never hit, cannot produce this string.
 * 2. **`hud.msg` holds `"THE PRIEST CALLS HIS FLOCK"`** at some frame —
 *    `showMsg` is called from one place in `src/`, `priestThink`'s phase-2
 *    summon block, and only when fewer than five summons are alive.
 * 3. **Summoned minions exist afterwards** (`world.enemies` with
 *    `summoned`). Three call sites in `src/` pass `summoned=true` to
 *    `spawnEnemy`: two in `priestThink` (phase 2 and phase 3) and one in
 *    `playerTick`'s challenge-plate block, which needs a `"Y"` grid cell —
 *    level 2 has none. So on this level a summoned enemy is a priest
 *    summon, necessarily.
 * 4. **The boss took real damage and changed form** — checked against the
 *    live enemy object rather than a `TraceFrame` field: `hp` below
 *    `maxhp*.33`, `dead` false, `dormant` false, and `formKey==="Q2"`,
 *    which `priestThink`'s phase-3 block is the only writer of. This is the
 *    same reason `combatTrace` reads `S.kills` directly: `formKey` moves no
 *    camera and no HUD element.
 * 5. **`hud.wname` takes more than one value, one of them `"— RELOADING"`.**
 *    **Not combat-specific** — `trace-level0.json`, the zero-enemy
 *    prologue fixture, satisfies the same shape. It is kept for the reason
 *    that file's header gives: it catches the script silently degrading
 *    into one that never touches the fire/reload state machine at all.
 *
 * `hud.hp` dropping is deliberately *not* on that list: with `S.hp` seeded
 * it proves the player was hit, which the summons alone could do.
 *
 * ## What this fixture now sees that no other one could
 *
 * `digestScene` (`gameplayTrace.ts`) records each scene child's material
 * texture *name*, so `src/`'s nine `material.map=` assignment sites are
 * visible to a trace at all. Phase 3 Part B listed four of them as reached
 * by no committed fixture. **This one reaches all four**, each confirmed by
 * mutation — changed, the fixture's digest moved, `"diverges from the
 * fixture nowhere"` went red, reverted with a targeted edit:
 *
 * All four were **re-run against the regenerated fixture** when level 2's
 * pews stopped being bosses (see the KNOWN-4 section) — the old frame
 * numbers were measured against the old recording and would otherwise have
 * become quietly false. Every one of the four is still covered, three of
 * them with a wider margin than before. Measured over the 150 sampled
 * frames, each mutation moving `scene.digest` only (camera, hud and
 * scene.count all differ in **0** frames in all four cases):
 *
 * - **`Boss.ts`'s phase-3 form swap** (`e.sp.material.map=PX[e.formKey].a`),
 *   rewritten to `PX[e.key].a`: red in exactly **1** frame, **2250** — the
 *   single sample inside the measured window [2244,2258), which is the
 *   window the `EVERY` constant was retuned to hit. Still the fragile one;
 *   still guarded by the named test below rather than by this paragraph.
 * - **`Boss.ts`'s boss walk cycle** (`e.sp.material.map=set[e.frame]`),
 *   pinned to `set[0]`: red in **30** of 150 frames — eight in 180-432 (the
 *   phase-1 `Q` walk-in) and twenty-two in 2268-2700 (the phase-3 `Q2`
 *   walk-in), so both forms are still covered. Was 20 of 270.
 * - **`Behaviors.ts`'s two-stage death collapse** (`P.die1`/`P.die2`),
 *   rewritten to `P.a`/`P.b`: red in **137** of 150 frames, from 252 on.
 * - **`Death.ts`'s headless corpse** (`PX[e.key].noHead||PX[e.key].hl`),
 *   rewritten to `PX[e.key].a`: red in **117** of 150 frames, from 612 on.
 *
 * The last two are the ones `combatTrace`'s header reports as genuinely
 * unreached there: level 1's single kill severs a limb rather than
 * decapitating, while this run's nail cannon produces both kinds of kill
 * among its many. Both mutations were also re-run against the other two
 * fixtures and left them green, which is the same result that file already
 * recorded — the coverage is new, not a re-reading of theirs.
 *
 * ### The form swap is pinned by exactly one sampled frame — and that is
 * ### now a structural guard, not just this paragraph
 *
 * Measured, and the most fragile thing in this file. Regenerating a
 * throwaway fixture under the form-swap mutation and comparing field by
 * field: `camera` differs in **0** of 150 frames, `hud` in **0**,
 * `scene.count` in **0**, and `scene.digest` in exactly **1** — frame 2250.
 * That is not sampling bad luck, it is the shape of the site: the swap
 * writes `PX[formKey].a` once, and within at most 15 frames the walk cycle
 * three lines below overwrites the same `material.map` with `set[e.frame]`
 * (also a `Q2` texture), so the mutation's whole visible window is the
 * handful of frames between the two — measured here as **[2244,2258)**.
 * **Any change to `TOTAL_FRAMES`, `EVERY`, `dtMs`, the sweep or the seed can
 * move that one frame out of the window and silently drop this site's
 * coverage while every test stays green** — that was this file's own
 * first-round review finding.
 *
 * **It then happened, on the guard's first real occasion.** Level 2's pews
 * ceasing to be bosses moved the swap from frame ~4900 to 2244, and no
 * multiple of the old `EVERY`(20) fell in the new window. The fixture
 * comparison alone would have gone green after a regeneration with this
 * site's coverage silently gone; the named test below went red instead and
 * forced `EVERY` to 18. The guard is the reason the number above is 1 and
 * not 0.
 *
 * **The fix, added in review round 1**: `afterLoad` installs a `configurable`
 * accessor on the priest's own `sp.material`'s `map` property (once the
 * priest is found, after the position/hp seeding below) that records, on
 * every write, the frame index derived the same way `runTrace`'s own loop
 * derives it (`(performance.now()-t0)/dtMs`, rounded) and `priest.phase` at
 * that instant. The getter returns exactly what the setter stored, so this
 * changes nothing about what the game does or renders — confirmed by
 * re-running the fixture comparison with the accessor installed and
 * confirming the fixture's digest is byte-identical to the one recorded
 * before it existed: the accessor is now installed unconditionally in
 * `beforeAll` below, so the "the run matches the committed recording" test
 * at the bottom of this file *is* that comparison, on every run. The named
 * test
 * `"the phase-3 form swap always lands inside a sampled frame"` then reads
 * that write log rather than trusting the numbers above: it finds the first
 * write recorded with `phase===3` (necessarily the form swap itself — the
 * phase transition and the swap happen in the same `priestThink` call,
 * before any phase-3 walk-cycle write can exist), the very next write after
 * it (the walk cycle overwriting it), and asserts some multiple of `EVERY`
 * falls in that half-open window. A retune that moves the swap's frame (or
 * widens/narrows `EVERY`) out of alignment with that window now fails this
 * *named* test — not just the fixture comparison's single frame, and not
 * only if a future reader remembers to re-run the mutation by hand.
 *
 * `every:18` rather than `combatTrace`'s `every:10`: sampling this run as
 * finely as that one would make the fixture several times the size of the
 * other two put together, for a run whose interesting events (a 0.25s boss
 * walk flip, a phase transition, a summon) are all coarser than that. The
 * exact value 18 is not free, though — see the `EVERY` constant's own
 * comment below: it is the coarsest small divisor that puts a sampled frame
 * inside the form swap's measured visible window, and the named guard test
 * at the bottom of this file is what enforces that rather than this
 * paragraph.
 *
 * ## Level 2 used to spawn eight *other* priest bosses — that was KNOWN-4,
 * ## and this fixture was regenerated when it was fixed
 *
 * **This is the regeneration the section above anticipated**, and the second
 * one this fixture has had a reason for. Until player-feedback round 1 task
 * 1 (2026-09-17), level 2's eight `"V"` cells, written under a "nave pews"
 * comment, each spawned THE FACTORY FOREMAN (2600 hp, `boss`, `priest`,
 * `sovereign`) rather than a pew, because `loadLevel` checks `EDEF[ch]`
 * before the prop set. That was KNOWN-4, and this run had confirmed it
 * live: nine `priest` enemies loaded — `V@43,9 V@11,17 V@25,17 V@41,17
 * V@25,21 V@41,21 V@25,27 V@41,27` and `Q@33,41`. All eight stayed dormant
 * for the whole run (the player never moves, and the nearest, `V@41,27`, is
 * a constant 16.1 units away against a 13-unit priest wake radius), which
 * is why `hud.bossname` named the Corrupted Priest unambiguously throughout
 * — and still does.
 *
 * The project owner played the game and reported that boss as much too
 * hard. All eight cells are now `v`, a prop-only pew. **One `priest` enemy
 * loads now, `Q@33,41`.**
 *
 * ### What moved in the fixture, and why each field had to
 *
 * This file's "Regenerating this fixture" rule below asks for a field-by-field
 * account, and the sampling constants changed in the same commit (see
 * `TOTAL_FRAMES`/`EVERY`), which would make a naive old-vs-new comparison
 * meaningless — different frame numbers, different frame count. So the diff
 * below was taken against a **throwaway run of the new content at the old
 * sampling** (5400/20), so that the only variable is the level's contents.
 * All 270 sampled frames, measured not argued:
 *
 * - **`scene.count`: differs in 268 of 270 frames**, and the load-time delta
 *   is exactly **−8** — frame 20 moves **163 → 155**, and −8 is the most
 *   common delta in the run (13 frames). That number is derivable and was
 *   confirmed rather than assumed: an enemy contributes **2** scene children
 *   (`spawnEnemy`'s `sp` sprite and its `blob` shadow); a pew contributes
 *   **1** (the `THREE.Group` `spawnProp` adds, whose four boxes are the
 *   group's children rather than the scene's), and the pew branch calls no
 *   `addBlob`. 8 × 2 − 8 × 1 = 8 fewer children. The delta does not stay at
 *   −8 because the rest of the run diverges too — see `camera`/`hud` below —
 *   and later frames range roughly ±50 as particles, gibs and summons land
 *   differently.
 * - **`scene.digest`: differs in all 270 frames**, necessarily: it hashes
 *   every child's type, position, visibility, texture name and colour, and
 *   sixteen children were replaced by eight different ones at load.
 * - **`camera`: differs in 236 of 270 frames; `hud` in 264** (by field:
 *   `hp` 249, `msg` 150, `bossname` 133, `subt` 63, `wname` 18). This is the
 *   part worth being explicit about, because "removing eight *dormant*
 *   enemies the player never approaches" sounds like it should change nothing
 *   the player sees. It changes the **seeded RNG stream**. `spawnEnemy` draws
 *   six values per enemy (`dodgeT`, `flank`'s sign and its magnitude,
 *   `lungeT`, `slamT`, `flingCD`) plus the elite roll; `spawnProp`'s pew
 *   branch draws **none** — the `rnd(0,6)` rotation belongs to the `C` chair,
 *   not the pew. The harness seeds one PRNG for the whole run precisely so
 *   gameplay is deterministic, so removing ~50 draws at load time shifts
 *   every later draw: the priest's attack cadence, its teleport target, its
 *   summons, every particle and gib. The visible consequence is that **the
 *   whole fight compresses** — phase 3 now begins at frame **2244** instead
 *   of ~4900, and over a like-for-like 5400-frame run the player takes 1685
 *   damage instead of 2798.
 *
 *   The compression is worth one more sentence, because the obvious reading
 *   of it is wrong and was checked rather than assumed. It is **not** that
 *   the boss teleported closer: measured, the single phase-2 teleport moved
 *   from (35.6,45.6) to (33.3,41.6), i.e. from 7.8 units away to **9.8**,
 *   which by the angular-width argument above should make the sweep *slower*.
 *   What actually changed is the hit rate per pass. Phase 2 needs about the
 *   same number of landed hits either way (37 before, 38 now, ~15.9 damage
 *   each), but it now collects them in ~3.1 revolutions of the sweep instead
 *   of ~8 — roughly 12 hits per pass against 4.6. The best-supported reading,
 *   and it is a reading rather than a proof: the run's aim *pitch* is set
 *   once by the wake cinematic, while the boss is still 1.6 units away, and
 *   never changes afterwards; `hitscan` then requires the ray's height at
 *   closest approach to fall inside the sprite's band (`cy>ecy-e.h*.55 &&
 *   cy<ecy+e.h*.55`, `h=3.53`), and that vertical intercept depends on how
 *   far away the boss ends up. The old teleport left the aim near the edge of
 *   that band and lost roughly half its potential nails per pass; the new one
 *   leaves it centred. Either way it is downstream of the same seeded stream.
 *   This is the same coupling Phase 2 Part A measured when instancing
 *   geometry changed enemy timing, and it is why that phase took UUID draws
 *   *out* of the stream: what is left coupled is real gameplay randomness,
 *   which a change to a level's contents is entitled to move.
 * - **Nothing this fixture exists to record changed.** `hud.bossname` takes
 *   the identical four values across the run, in the same order; all five
 *   named tests below still pass; the priest still wakes, reaches all three
 *   phases, calls its flock, and ends awake/hurt/`Q2`/alive; the phase-3 form
 *   swap still lands inside a sampled frame — after `EVERY` was retuned for
 *   it, which is itself recorded at that constant.
 * - **The other two committed fixtures did not move.** `trace-level0.json`
 *   (`e3a56b3d…`) and `trace-level1.json` (`97bd7c67…`) are byte-identical
 *   before and after — checksummed, not assumed. Neither plays level 2.
 *
 * ## Regenerating this fixture
 *
 * Same rule as the other two, for the same reason. `WRITE_TRACE=1` exists
 * for deliberate, explained updates, never to turn a red build green. If
 * this file goes red after a change that was not meant to alter what the
 * priest does, the change is wrong, not the recording.
 *
 * **When Phase 3 replaces `priestThink`**, this fixture is *expected* to
 * move, and that regeneration is the one this whole recording exists to
 * make meaningful. Doing it properly means: run the new brains against this
 * same script and seed, regenerate with `WRITE_TRACE=1`, and then — before
 * committing — diff the new fixture against this one field by field, the
 * way `combatTrace`'s header records doing for its own three regenerations,
 * and write down which of `camera`/`hud`/`scene.count`/`scene.digest` moved
 * in how many frames and why each one had to. A regeneration that cannot
 * account for its own diff is not a regeneration; it is a deletion.
 */

const FIXTURE_DIR = join(__dirname, "__fixtures__");
const FIXTURE = join(FIXTURE_DIR, "trace-level2-boss.json");
const WRITE = process.env.WRITE_TRACE === "1";

/** src/player/Input.ts's mouse sensitivity at zoomLerp=0 — the nail cannon has no scope. */
const SENS = 0.0022;
/** One full revolution's worth of movementX. */
const REV = (2 * Math.PI) / SENS;

/**
 * Measured, not chosen — and **re-measured after level 2's pews stopped
 * being bosses** (player-feedback round 1 task 1; see the KNOWN-4 section of
 * the module doc comment). Both numbers moved, and the reason each had to is
 * worth keeping:
 *
 * - **`TOTAL_FRAMES` 5400 → 2700.** The phase-3 transition used to land at
 *   frame ~4900; it now lands at **2244**. Phase 2 used to cost 4360 frames
 *   because the priest's one teleport put it 7.8 units away and a blind
 *   sweep's damage rate scales with the target's angular width; the new
 *   seeded RNG stream teleports it closer, so phase 2 costs ~1830 frames
 *   instead. At the old 5400 the priest was **dead** by the cutoff (measured:
 *   `hp=-4` at frame 5400), which would have turned 2500 of the recorded
 *   frames into a corpse and broken the "awake, hurt, transformed and still
 *   alive" check below. 2700 keeps the original design intent — a few hundred
 *   frames of live phase 3 after the swap, here 456 of them (7.6s), with the
 *   boss still alive at the cutoff.
 * - **`EVERY` 20 → 18.** Not a style choice: the form-swap guard below
 *   *demands* it. The swap's visible window is the half-open interval between
 *   the phase-3 `material.map` write and the walk cycle's next one, measured
 *   here as **[2244,2258)**, and no multiple of 20 falls inside it (2240 and
 *   2260 straddle it). 18 does: 18 x 125 = 2250. This is the guard added in
 *   review round 1 doing exactly the job it was added for, on its first real
 *   occasion — the paragraph it replaced predicted that a retune could
 *   silently drop this site's coverage, and a retune just did.
 *
 * 2700/18 = 150 recorded frames, down from 270, so the fixture shrinks too.
 * 18 frames is 0.3s, slightly finer than the 20 it replaces.
 */
const TOTAL_FRAMES = 2700;
const EVERY = 18;
/**
 * The fifth knob the structural guard depends on, alongside `TOTAL_FRAMES`
 * and `EVERY`: `runTrace`'s own frame clock and the guard's write-log frame
 * math (`afterLoad` below) both have to derive frame indices the same way,
 * or the guard silently desyncs from the harness it is checking. Hoisted to
 * one constant, used in both places, instead of the two independent
 * `1000 / 60` literals an earlier version of this file carried.
 */
const DT_MS = 1000 / 60;

/** Where the priest is placed by `putAbs(L,16,20,"Q")`, in world units. */
const PRIEST_X = 33, PRIEST_Z = 41;
/** Grid (21,21) — an empty crypt floor cell, 10.2 units from the priest with clear LOS. */
const START_X = 43, START_Z = 43;

function bossScript(): InputEvent[] {
  const s: InputEvent[] = [{ frame: 2, kind: "pointerlock", locked: true }];
  // Hold the trigger from just after the 2.7s wake cinematic (which ends
  // around frame 165 and clears input.firing on the way in). The nail
  // cannon is automatic and self-reloading, so this one event is the whole
  // firing script.
  s.push({ frame: 220, kind: "button", type: "mousedown", button: 0 });
  // Standing-turret sweep, one revolution every SWEEP_SECS, from after the
  // phase-1 melee exchange has resolved. See the module doc comment for why
  // it covers the whole circle instead of the wedge the boss happens to
  // teleport into.
  const SWEEP_START = 620, SWEEP_STEP = 4, SWEEP_SECS = 9;
  const perStep = REV / ((SWEEP_SECS * 60) / SWEEP_STEP);
  for (let f = SWEEP_START; f <= TOTAL_FRAMES; f += SWEEP_STEP) {
    s.push({ frame: f, kind: "move", movementX: perStep, movementY: 0 });
  }
  return s;
}

const INPUT: readonly InputEvent[] = bossScript();

let trace: TraceFrame[];
/** The Corrupted Priest itself, captured in `afterLoad` and read after the run. */
let priest: (typeof world.enemies)[number];
/**
 * Every write to the priest's `sp.material.map`, in chronological order —
 * the structural guard for the phase-3 form swap (review round 1, Important
 * 1). Installed by the accessor in `afterLoad` below; see this file's
 * module doc comment, "The form swap is pinned by exactly one sampled
 * frame", for what it proves and why.
 */
let mapWrites: Array<{ frame: number; phase: number }>;

beforeAll(async () => {
  // Pre-boot seeding, the `combatTrace` way: loadLevel never touches the
  // inventory, so this survives it. Slot 6 is the NAIL CANNON.
  S.weapons[6] = true;
  S.cur = 6;
  S.mag[6] = 50;
  S.ammo.nails = 100_000;

  trace = await runTrace({
    seed: 20260913,
    frames: TOTAL_FRAMES,
    dtMs: DT_MS,
    input: INPUT,
    every: EVERY,
    level: 2,
    // Post-load seeding, for the two fields loadLevel itself writes. See
    // `TraceOptions.afterLoad` and this file's doc comment.
    afterLoad: () => {
      const found = world.enemies.find((e) => e.key === "Q");
      if (!found) {
        throw new Error(
          "level 2 loaded without a `Q` enemy — this trace exists to record THE CORRUPTED " +
          "PRIEST, and a run that silently recorded some other level's layout would still pass " +
          "its fixture comparison after a regeneration",
        );
      }
      priest = found;
      if (found.x !== PRIEST_X || found.z !== PRIEST_Z) {
        throw new Error(
          `the priest spawned at (${found.x},${found.z}), not (${PRIEST_X},${PRIEST_Z}) — the ` +
          "player's seeded start below was chosen for that position's line of sight and wake " +
          "radius, so a moved boss silently invalidates the whole script",
        );
      }
      player.px = START_X;
      player.pz = START_Z;
      S.hp = 5000;

      // The structural guard itself (review round 1, Important 1). A
      // `configurable` accessor on the priest's own material — not a
      // `src/` change, and not a new stub: `sp.material.map` is a plain,
      // writable, configurable instance property (three's `SpriteMaterial`
      // assigns it directly in its constructor), so redefining it here with
      // a getter/setter that stores-and-forwards is safe. The getter always
      // returns exactly what the setter last stored, so nothing that reads
      // `material.map` afterward — three's own renderer included — can tell
      // the difference; this was confirmed, not assumed — the accessor is
      // installed on every run (not toggled), so the "the run matches the
      // committed recording" test below re-proves it every time: an
      // accessor that perturbed the run would have moved the fixture.
      //
      // `performance.now()` here is `runTrace`'s own faked clock, read at
      // the same instant (`fakeNow===t0`, before frame 1) its frame loop
      // will start counting from — so `(performance.now()-t0)/DT_MS`, at any
      // later write, reproduces the exact frame index `runTrace` itself
      // would assign that tick. `DT_MS` is the same module constant passed
      // to `runTrace` as `dtMs` above — one knob, not two independent
      // literals that could silently drift apart.
      mapWrites = [];
      const t0 = performance.now();
      const material = priest.sp.material as unknown as { map: unknown };
      let currentMap: unknown = material.map;
      Object.defineProperty(material, "map", {
        configurable: true,
        get(): unknown { return currentMap; },
        set(v: unknown): void {
          currentMap = v;
          mapWrites.push({ frame: Math.round((performance.now() - t0) / DT_MS), phase: priest.phase });
        },
      });
    },
  });
  // Written here, in beforeAll right after runTrace, matching the model
  // trace.test.ts/combatTrace.test.ts both use — review round 1, Minor: an
  // earlier version of this file wrote the fixture from inside the
  // comparison test instead, which means a filtered regeneration run
  // (vitest -t "some other test name") would silently write nothing.
  if (WRITE) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(FIXTURE, JSON.stringify(trace, null, 1) + "\n");
  }
}, 600_000);

describe("the recorded run actually fights a priest boss", () => {
  it("records the frames it was asked for", () => {
    expect(trace.length).toBe(TOTAL_FRAMES / EVERY);
  });

  it("the priest woke, and priestThink drove it to phase 3", () => {
    // `Hud.ts` only names a boss that is `!dead && !dormant`, and the
    // "— PHASE n" suffix is `boss.phase`, which only `priestThink` writes.
    const names = new Set(trace.map((f) => f.hud.bossname).filter(Boolean));
    expect([...names]).toContain("THE CORRUPTED PRIEST — PHASE 1");
    expect([...names]).toContain("THE CORRUPTED PRIEST — PHASE 2");
    expect([...names]).toContain("THE CORRUPTED PRIEST — PHASE 3");
  });

  it("the priest summoned its flock", () => {
    // showMsg("THE PRIEST CALLS HIS FLOCK") has exactly one call site in
    // src/: priestThink's phase-2 summon block.
    expect(trace.some((f) => f.hud.msg.includes("THE PRIEST CALLS HIS FLOCK"))).toBe(true);
    // And the summons are really in the world. Level 2 has no "Y" cell, so
    // the challenge plate — the only other `summoned` spawner in src/ —
    // cannot have produced these.
    expect(world.enemies.filter((e) => e.summoned).length).toBeGreaterThan(0);
  });

  it("the priest ends the run awake, hurt, transformed and still alive", () => {
    // None of this is visible in any field runTrace records, so it is read
    // off the live enemy — the same reason combatTrace checks `S.kills`
    // directly.
    expect(priest.dormant).toBe(false);
    expect(priest.dead).toBe(false);
    expect(priest.hp).toBeLessThan(priest.maxhp * 0.33);
    expect(priest.formKey).toBe("Q2");
  });

  it("the phase-3 form swap always lands inside a sampled frame — structural guard, review round 1", () => {
    // See the module doc comment's "The form swap is pinned by exactly one
    // sampled frame" section. `mapWrites` is every write to the priest's
    // material.map, in order; the first one recorded with phase===3 is
    // necessarily the form swap itself (`Boss.ts`'s phase transition sets
    // `e.phase=3` and performs the swap in the same call, before any
    // phase-3 walk-cycle write can exist), and the very next write after it
    // is the walk cycle overwriting it. Whatever that half-open window is,
    // a sampled frame (a multiple of EVERY) has to fall inside it, or this
    // site's coverage is gone regardless of what the fixture comparison says.
    const phase3Writes = mapWrites.filter((w) => w.phase === 3);
    expect(phase3Writes.length, "the priest never reached phase 3 — nothing to check the window against").toBeGreaterThan(0);

    const swap = phase3Writes[0]!;
    const swapIdx = mapWrites.indexOf(swap);
    const overwrite = mapWrites[swapIdx + 1];
    expect(
      overwrite,
      "nothing ever overwrote the phase-3 form swap's material.map — the window is open-ended, " +
      "which this test cannot check a sample against",
    ).toBeDefined();

    const lo = swap.frame, hi = overwrite!.frame;
    let sampledFrameInWindow = -1;
    for (let f = EVERY; f <= TOTAL_FRAMES; f += EVERY) {
      if (f >= lo && f < hi) { sampledFrameInWindow = f; break; }
    }
    expect(
      sampledFrameInWindow,
      `the form swap's visible window is [${lo},${hi}) and no multiple of EVERY(${EVERY}) falls in ` +
      "it — a retune of TOTAL_FRAMES/EVERY/DT_MS/the sweep/the seed has silently moved this site's " +
      "coverage out of the sampled frames",
    ).toBeGreaterThan(0);
  });

  it("the weapon state machine left idle (NOT boss-specific — see the module doc comment)", () => {
    const wnames = new Set(trace.map((f) => f.hud.wname));
    expect(wnames.size).toBeGreaterThan(1);
    expect([...wnames].some((w) => w.includes("RELOADING"))).toBe(true);
  });
});

describe("the run matches the committed recording", () => {
  it("diverges from the fixture nowhere", () => {
    if (WRITE) {
      // The write itself already happened in beforeAll, right after
      // runTrace — see this file's Minor fix (review round 1) and
      // combatTrace.test.ts's own model. Nothing left to do here but
      // confirm it landed.
      expect(existsSync(FIXTURE)).toBe(true);
      return; // just wrote it; nothing to compare against
    }
    expect(
      existsSync(FIXTURE),
      `${FIXTURE} is missing — generate it once with WRITE_TRACE=1 and commit it`,
    ).toBe(true);

    const expected = JSON.parse(readFileSync(FIXTURE, "utf8")) as TraceFrame[];
    expect(trace.length).toBe(expected.length);

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
    expect(trace).toEqual(expected);
  });
});
