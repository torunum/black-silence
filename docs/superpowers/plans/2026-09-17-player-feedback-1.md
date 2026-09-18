# Player feedback, round 1

The project owner played the game through and reported four things. This plan
is those four, in their words:

> 2. The first boss in level 2, the Foreman, is much too hard.
> 3. The kick's cooldown is too long. Make it 1 second.
> 4. The sounds are bad — I really don't like them. The gun firing sound is bad.
> 5. Running makes far too much footstep noise, and the weapon sways far too much.

**This is the first player feedback this project has ever had.** Twelve plans
were built on tests, source reading and inference. Where any of that conflicts
with what the player says the game feels like, the player is right.

## What each one actually is, measured

### 2 — the Foreman is KNOWN-4, and a player just walked into it

`src/world/levels/level2.ts` places **eight `V` tiles**, six of them directly
under the comment `/* nave pews + altar + boss + cross launcher */`, the others
in the chapel and the side aisle. `V` in `ENEMY_DEFS` is **THE FACTORY FOREMAN:
2600 hp, `boss: true`, `priest: true`, `sovereign: true`**.

`loadLevel` dispatches the enemy table before the prop table, and `V` is in
both — so every tile the level author wrote as a pew spawns a boss. The level's
intended boss is the `Q` at the altar, the Corrupted Priest.

So the player is fighting **8 × 2600 = 20,800 hp of church furniture** before
reaching the actual boss. "Much too hard" is an understatement, and this is
KNOWN-4 — open since Plan 0E, preserved deliberately because fixing it is a
balance decision — being confirmed from the far side.

**The balance decision has now been made by the person who gets to make it.**

### 3 — the kick cooldown is fifteen seconds

`src/weapons/WeaponState.ts`'s `doKick` sets `S.kickCd = 15`, and
`weaponTick` decrements it by `dt` — so it is fifteen real seconds. The HUD
hardcodes `15` twice more (`src/ui/Hud.ts`: the fill bar's divisor and the
countdown label).

### 5 — both halves are the same system

```
src/player/Player.ts       player.bobT += spd*dt*(sprint?1.9:1.6)
                           footstep fires on each positive zero-crossing of sin(bobT*4)
src/render/viewmodel/draw.ts  bobAmt = moveAmt*(sprint?0.55:0.28)
                              bx = sin(bobT*4)*2.4*bobAmt
                              by = |cos(bobT*4)|*1.8*bobAmt
```

Sprinting raises the cadence by 19% **and** roughly doubles the swing. The two
complaints are one cause.

### 4 — the honest position

**Nobody on this task can hear the game.** Every other item here is verifiable;
this one is not, by me or by any subagent. Three things follow:

1. Changes to the synthesis must be **argued from what the code does**, not
   from how they sound, and the report must say so plainly.
2. The player judges. Ship a build and let them.
3. Phase 1 Task 6 — real `.ogg` files, user-supplied — has been outstanding
   since 2026-08-29 and is the actual answer. This plan improves the
   placeholder and makes the swap easy; it does not pretend to finish the job.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **Task 1 will move `trace-level2-boss.json`.** That is correct and expected:
  the fixture records level 2, the task changes level 2's contents, and a
  deliberate gameplay change that the fixture *cannot* see would be the
  worrying outcome. Follow the regeneration procedure the fixture's own header
  sets out — analyse the diff field by field, write it up, regenerate in the
  same commit. **The other two fixtures must not move.**
- Tests that encode the old behaviour are **rewritten, never deleted** — they
  are the proof the change landed. `tests/world/levels.test.ts` pins KNOWN-4's
  ambiguous tiles today.
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/`, read the "Processed N files"
  line (~91). The bare form scans zero files and still reports success.
- `npm test` before every commit; it runs `tsc --noEmit` first.
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game renders in the Browser pane** — see `docs/STATUS.md`'s Environment
  gotchas, and read the stale-module warning there before probing anything.
  Screenshots force a frame; sustained rAF does not work.

---

## Task 1 — the pews are pews (feedback 2)

Level 2 is a church. Make its furniture furniture.

Decide, and state, whether all eight `V` tiles are furniture or whether any was
meant as a real encounter — the chapel and side-aisle ones are not under the
"pews" comment, so they need their own judgement rather than being swept along.

**Do not fix this by reordering `loadLevel`'s dispatch.** `C` is an intentional
Cacodemon in levels 6 and 7 and a chair in level 2; a global reorder trades this
bug for that one. Fix level 2.

`docs/known-issues.md`'s KNOWN-4 and KNOWN-11 both describe this collision
class. Update KNOWN-4 with what changed and what is still open — the
*mechanism* remains, since the tables still overlap.

Then **load level 2 and look at the nave**. Pews should be pews.

## Task 2 — a one-second kick (feedback 3)

Make the cooldown one second. Extract the literal so the HUD's fill bar and
countdown read the same constant instead of repeating `15`.

`tests/` pins the current value somewhere; find it, rewrite it rather than
delete it, and record the mutation.

Then **kick something in the running game** and confirm the HUD's bar refills in
about a second.

## Task 3 — quieter, steadier running (feedback 5)

Both halves come from the bob. Reduce the sprint footstep cadence and the
sprint bob amplitude.

The player said "far too much" for both, which is direction, not a number.
**Propose values, state your reasoning, and say what you would try next if
these are still wrong** — this will take a round or two with them, and a report
that names the next step makes that cheap.

Keep the walk feeling intact: the complaint was about running. Do not flatten
the bob to zero — it is what sells the movement.

**Watch the footstep trigger.** It fires on a zero-crossing of `sin(bobT*4)`,
so changing the cadence multiplier changes *when* steps fire, not just how
often. Check it still fires in step with the visual bob rather than drifting
against it.

## Task 4 — the gun sound (feedback 4)

Read `src/audio/Sfx.ts` and find what the weapons actually fire through.

Then make it better, with each change argued from the synthesis: a firearm
report is a very short broadband transient followed by a short body with fast
decay, and thin or buzzy usually means the transient is missing or the decay is
too long. **Say what you changed and why, in those terms.**

Constraints that make this safe to attempt blind:

- `tests/behavior/audio.test.ts` compares call logs against the frozen
  reference. A changed sound **will** diverge from it. That is a deliberate
  Phase-2 divergence — assert the new behaviour and the reference's old
  behaviour side by side, each commented, exactly as KNOWN-7 and KNOWN-8's
  fixes did. **Do not weaken `expectCallLogEqual` and do not delete the
  reference side.**
- Ten audio functions have no recorder coverage at all and are guarded only by
  byte-identity against the reference (KNOWN-5 item 2). If you touch one of
  those, you are removing its only guard — say so, and pin it with a recorder
  test in the same commit.
- Change **only** the weapon report in this task. The player named it; the
  others are a separate round.

Finally: `docs/assets.md` is where user-supplied audio was always going to land
(Phase 1 Task 6). Check it says clearly what file to drop where, so the real
fix is a drag-and-drop when they get to it.

---

## Definition of done

- Level 2's nave has pews; the Corrupted Priest is the level's boss again.
  `trace-level2-boss.json` regenerated with a written analysis in the same
  commit; the other two untouched.
- Kick cooldown is one second, from one constant.
- Running is quieter and steadier, with the proposed numbers and a stated next
  step if they are still wrong.
- The weapon report is rebuilt, argued from the synthesis, with the reference
  comparison kept as a record rather than dropped.
- A fresh `npm run build:single` for the player, and screenshots of the nave.
- `npm test` clean; madge over ~91 files.
