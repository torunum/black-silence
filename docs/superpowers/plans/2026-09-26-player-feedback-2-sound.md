# Player feedback, round 2 — the sound

The owner, 2026-09-24: "Fix the sounds. The sounds are still very bad."

Round 1 rebuilt the gunshot's synthesis (`gunshot()` in `src/audio/Sfx.ts`) and
said plainly that nobody who wrote it had heard it. The owner has now heard it,
and everything else, and the verdict is "still very bad". So this round is not
a tweak. It is a rebuild of how the game makes sound, and it changes one thing
about how that rebuild is judged.

## What exists, measured

```
src/audio/Sfx.ts        blip  (46 call sites) — one oscillator, square by default,
                              a pitch sweep, a lowpass: the chiptune "pew"
                        bang  (41)  — white noise, one static lowpass, (1-t)^2 fade
                        click (9), boom (4), gunshot (9)
src/audio/AudioEngine.ts  master bus, an "echo" bus built on a feedback delay,
                          per-emission HRTF panners
src/audio/{Music,Ambient,Voice,Listener}.ts
```

Across 17 files, nearly every sound in the game — monsters, doors, pickups,
impacts, footsteps — is a `blip` or a `bang`: a single swept square wave or a
single filtered noise burst. That is the whole palette, and it is why the game
sounds like a 1990s sound chip no matter what any one sound's numbers are.

## Two things change about the method

**1. The owner judges by ear, so give them something to judge with.** The first
task builds a **sound board**: a page served by the dev server (and reachable
from the published site) that lists every sound in the game by name and plays
it — the current version and the new one side by side. The owner can then say
"the shotgun is good, the zombie is wrong" instead of "the sounds are bad", and
every later round gets cheaper.

**2. Nobody here can hear, but everything here can measure.** Every sound can
be rendered offline with `OfflineAudioContext` in the browser pane and measured:
peak and RMS level, attack time, decay to -60 dB, spectral centroid over time,
clipping, DC offset, a click at the start or end. Spectrogram images of the
render can be looked at. That does not replace ears; it catches the defects
that make procedural audio sound cheap — clipped peaks, clicks, hiss tails,
one sound ten times louder than its neighbours, a whole palette sitting in the
same frequency band.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **Procedural only**, per the asset policy — no sample files. (Real `.ogg`
  files remain the owner's option; `docs/assets.md` says where they would go.
  Keep that path working.)
- **Audio and the seeded RNG.** Today every `bang` fills its noise buffer from
  `Math.random` at the moment it plays, so sound draws from the same stream the
  trace harness seeds for gameplay (see `gunshot()`'s comment, and
  `tests/support` for the unwired `installAudioStub`). Task 1 cuts that
  coupling; **after Task 1, no sound may draw from `Math.random`**, and Tasks
  2-5 must move no fixture.
- **Tests that pin the reference's audio call logs** (`tests/behavior/audio.test.ts`
  and friends) are rewritten, not deleted: record the deliberate divergence,
  citing this plan, and pin something true about the new code.
- **Loudness is a design decision, not an accident**: every task states the
  level of what it changed relative to the gunshot, measured offline.
- No `src/` file over 400 lines. No import cycles:
  `npx madge --circular --extensions ts,js src/` (~114 files).
- `npm test` before every commit, exit code captured
  (`npm test > log 2>&1; echo EXIT=$?`).
- Node is not on PATH: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **Bash heredocs here eat backslashes** — Write tool for scripts.
- Never `git checkout --`. Commit verified progress early.
- Leave nothing untracked. **No `Co-Authored-By`.** The owner is the sole author.

---

## Task 1 — noise that does not touch the game's dice, and a sound board

**Decouple.** Build the noise the game needs once — a few seconds of white noise
(and whatever coloured variants later tasks want) from a small locally seeded
generator — and have every noise-based sound play a random offset into those
buffers instead of filling a new buffer from `Math.random`. The offset must not
come from `Math.random` either; a local counter or local PRNG.

That removes audio's draws from the gameplay stream, so **the trace fixtures
will move** wherever a sound played during a recorded run — enemies, AI and
drops will roll differently. That is sanctioned, and it is the only fixture move
this plan allows. Prove it is only that: show that the old code with its audio
draws replaced by a no-op draw of the same count reproduces the old fixtures,
and that the new code equals the old code with audio's draws removed. Write the
analysis into each fixture's test header, regenerate with `WRITE_TRACE=1`.
Close or update whichever known-issues row tracks this coupling.

**The sound board.** A page — e.g. `soundboard.html` beside `index.html`, built
into the published site — that lists every distinct sound by a human name
("Shotgun fire", "Zombie alert", "Door opens", "Pickup: health") with a play
button, grouped by category, and, from Task 2 on, an **old / new** pair for each
sound that a task replaced. It must call the game's real sound functions, not
copies. It must be reachable from the published site so the owner can use it on
their own machine. Keep its code out of the game bundle.

Commit: `feat: sound draws no dice, and a sound board to hear every sound`

## Task 2 — the mix: a space to sound in

Before redesigning individual sounds, give them a room and a master chain:

- **Reverb.** Replace the feedback-delay "echo" with a convolution reverb whose
  impulse response is generated procedurally (decaying filtered noise, early
  reflections) — a stone hall for dungeon/church/crypt levels, something larger
  and darker for hell, something wet and close for flesh. Per level, chosen
  from the level's theme. Sounds send to it by amount, not by an on/off flag.
- **Master chain.** A gentle compressor and a final limiter so layered sounds
  glue and nothing ever clips; measure that a worst case (explosion + shotgun +
  several monsters) peaks under 0 dBFS.
- **A loudness table.** Every sound rendered offline, its peak and RMS level
  listed; set a target level per category (weapons loudest, then explosions,
  monsters, impacts, footsteps, UI quietest) and bring every sound to it.

Commit: `feat: the game sounds in a room, through a master chain, at a planned level`

## Task 3 — the weapons

All eight weapon reports redesigned as layered sounds: a transient, a body with
its own character per weapon (a flare pistol's hollow pop is not a BMG's
crack), a mechanical tail, and the room from Task 2. Plus the **mechanism
foley** the animation now shows: pump stroke, break-open and shells going in,
magazine out and in, bolt, drum, spin-up and spin-down of the nail cannon, the
cross launcher's reload, the reaper's charge, the dry click, the switch. Time
foley to the reload animation's phases (they are readable from the viewmodel's
animation code), without changing any reload timing.

Commit: `feat: the weapons sound like weapons, and their mechanisms are heard`

## Task 4 — the monsters

Every enemy's alert, pain, attack and death — today swept square waves — as
voices: formant-filtered sawtooth and noise with pitch jitter, vibrato, breath,
growl (amplitude modulation), per-enemy vocal character by size (a Ghoul is not
a Baron). Bosses get a heavier voice. Keep each sound positional through the
existing panner.

Commit: `feat: the monsters have voices`

## Task 5 — the world

Footsteps (varied per step, surface-aware if the level theme allows), landing,
the kick's impact, bullet impacts on stone and flesh, doors (stone grinding as a
door sinks), pickups, keys, the exit, UI. And the explosion.

Commit: `feat: the world has weight — steps, impacts, doors, pickups`

---

## Definition of done

- Sound decoupled from the gameplay RNG; fixtures moved once, analysed.
- A sound board the owner can open on the published site, old and new side by
  side.
- Reverb per theme, a master chain that cannot clip, a planned loudness table.
- Weapons, mechanisms, monsters and world rebuilt, each measured offline with
  spectrograms looked at.
- `npm test` clean. Then a build for the owner to listen to — they are the judge.
