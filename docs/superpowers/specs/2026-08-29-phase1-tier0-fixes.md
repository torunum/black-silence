# Phase 1 — Tier 0 Fixes

**Status:** spec. Written 2026-08-29, immediately after Phase 0 merged (`50ac234`).

## 1. Purpose

Three fixes the port inherited as gaps rather than bugs: sound that does not
come from anywhere, a render resolution nobody can change, and a save system
that saves nothing.

`docs/direction.md`'s roadmap originally listed a fourth — 8-directional
sprites. It was **moved to Phase 3** on 2026-08-29 after the cost was measured;
see that document's amendment. The short version: every sprite is generated
from one front-facing pixel grid, so eight facings means authoring seven new
angles per enemy by hand, and the roster is due to be cut from 25 to 9+3 first.

## 2. The framing that changes everything

**Phase 0's oracle was "match the frozen reference." From this phase on, that
stops being true for anything deliberately changed.**

Phase 0 preserved bugs on purpose and proved fidelity three ways: a behavioural
recorder (`tests/behavior/`), byte-identity source comparison
(`tests/fidelity.test.ts`), and characterization traces
(`tests/integration/`). All three answer the same question — *does the port do
what `reference/sonsurum.html` does?*

Phase 1 answers a different one. Positional audio is, by definition, not what
the reference does. So:

- **Where this phase changes behaviour deliberately, the reference stops being
  the oracle** and the byte-identity test for that function must be retired —
  not worked around, and not silently left passing against a body it no longer
  describes.
- **Where it does not, every existing guard stays.** A regression in untouched
  code is still a regression.
- **Retiring a byte test requires replacing its coverage first.** Plan 0C
  retired `growl`, `snarl`, `blip`, `bang`, `boom` and `audioInit`'s byte tests
  only because `tests/behavior/audio.test.ts` had taken over. `pianoNote`,
  `gurgle`, `pain`, `deathCry`, `wetDoor`, `stoneDoor`, `bellToll`,
  `organChord`, `click` and `noiseBuf` have **no recorder coverage today** —
  byte identity is their only guard. Any of those this phase touches needs
  recorder coverage written *before* its byte test goes.

That sequencing is the single most important constraint in this spec.

## 3. Success criteria

- A sound emitted at a world position is quieter and directional when the
  player is far from it or facing away; the same sound emitted at the player is
  not.
- Music plays, changes between exploration and combat, and stops on death.
- The player can change render resolution in Settings and the change survives a
  reload.
- Progress survives a reload, and a save written by an older build does not
  crash a newer one.
- `npm test`, `npm run typecheck` and `madge --circular --extensions ts,js src/`
  stay green; no `src/` file over 400 lines.
- Every third-party asset has a row in `docs/assets.md`.

## 4. What is in scope

### 4.1 Positional audio

**Measured starting point:** `src/audio/AudioEngine.ts` builds one graph —
`masterG` → destination, with an `echoG` → delay → feedback → `masterG` send.
**No emitter takes a position.** Every function in `Sfx.ts`, `Voice.ts` and
`Ambient.ts` has a signature like `blip(freq, dur, type?, vol?, slide?, echo?)`
and connects straight to `masterBus()` or `echoBus()`.

So "add positional audio" is not a parameter change to one function; it is a
routing decision affecting every emitter. Two shapes are viable:

**(a) Pass a position into each emitter.** Honest and explicit. Changes every
signature and every body — which breaks the byte-identity tests for ten
functions that have no other guard (see §2).

**(b) Route through a per-emission destination.** Emitters keep their
signatures and bodies; a caller that knows where a sound is coming from sets
the destination for the emission, and `masterBus()`/`echoBus()` return a
`PannerNode` chained into the master instead of the master itself.

**(b) is the recommended shape**, because it isolates the change to
`AudioEngine.ts` and leaves the ten unguarded bodies untouched — but it
introduces per-emission global state, which is a real cost and must be
documented, not hidden. The plan should confirm (b) is workable before
committing to it, and fall back to (a) *with recorder coverage written first*
if not.

**Do not use `THREE.PositionalAudio`.** It would mean routing game audio
through Three's audio layer, which the recorder tests do not observe, and it
couples the audio system to a renderer version this project has deliberately
pinned (KNOWN-14).

The listener is the camera: `renderState.camera`'s position and orientation.

### 4.2 Music

Layered adaptive tracks — exploration / combat / boss — per
`docs/direction.md`'s asset policy.

**Real `.ogg` files are a user-supplied dependency and this phase does not
block on them.** Build the layer-switching machinery against the existing
procedural sources (`startBossMusic`/`stopBossMusic` already prove the shape:
an interval-driven pulse that starts and stops). When real files arrive, only
the source nodes change.

The switch itself is the interesting part and is fully specifiable now: what
counts as "in combat", how long a layer cross-fades, what happens on death and
on level load. Note `loadLevel` now calls `clearAllTimers()` and
`clearScheduled()` (Plan 0F), so anything music-related built on timers is
already cancelled on level change — verify rather than assume.

### 4.3 Resolution setting

**Measured starting point:** `src/render/RenderCore.ts`'s `sizeRender()` reads
`const a=innerWidth/innerHeight,w=400,h=Math.round(w/a)`. The `400` is the only
thing standing between the player and a resolution control.

Scope: a Settings control alongside the existing volume slider (`src/ui/Menus.ts`
already owns that pattern), a small set of named widths, persisted via §4.4.

`sizeRender` is called on boot and on every `resize`. Changing the setting must
go through the same path, not a second one.

### 4.4 Save system

**Measured starting point:** `src/save/SaveGame.ts` is
`export const save = { maxLevel: 0 }`. There is **no `localStorage` call
anywhere** in `src/` or in the frozen reference — confirmed by grep. The Phase 0
spec's §10 said it "only persists `maxLevel`"; that overstated it and has been
corrected.

Scope: a versioned schema, written on change and read at boot, holding at
minimum `maxLevel`, master volume (currently in-memory in `AudioEngine.ts`) and
the §4.3 resolution.

**One property is load-bearing and must survive:** `save` is a plain mutable
object rather than an exported `let`, so a test can assign `save.maxLevel = 1`
and reach a level with enemies. That is what makes `combatTrace.test.ts`
possible, and therefore what gives the entire combat path any coverage at all.
A refactor that makes `save` read-only, lazily-loaded, or async breaks the
project's most important test. The plan must state how it keeps that working.

**Corrupt and old saves must not crash the game.** A version field, a
try/catch around parse, and a documented fallback to defaults.

## 5. What is explicitly out of scope

- 8-directional sprites — Phase 3, per the direction amendment
- Anything that needs the Three.js upgrade — deferred, KNOWN-14
- The fifteen duplicate enemy interfaces — KNOWN-13, Phase 1 *may* take it, but
  it is a separate cross-cutting refactor and must not ride along inside an
  audio or save task
- New enemy behaviour, new levels, balance changes

## 6. Testing

The project's existing mechanisms apply, with one addition.

**New for this phase:** the save system is the first feature with *no reference
to compare against*. Its oracle is round-tripping and version tolerance — write,
reload, read back; and read a hand-written old-version blob and confirm the
documented fallback. `tests/content/achievements.test.ts` is the closest
existing model for "no reference range exists, so derive the assertion another
way."

**Non-negotiable, learned the hard way in Phase 0** (see `docs/STATUS.md`'s
Plan 0F section and KNOWN-12):

- A guard that reports success while examining nothing is worse than no guard.
  When a tool prints how much work it did, read that number.
- A test must be proven to fail. Every new assertion in this phase gets a
  recorded mutation that turns it red.
- Neither trace fixture may be regenerated without a written analysis in the
  same commit.

## 7. Risks

**Retiring byte-identity tests to enable positional audio (highest).** Ten
functions have no other guard. Mitigation: §2's sequencing rule — recorder
coverage first, retirement second, in that order, in separate commits so a
reviewer can see the coverage landed before the guard left.

**The save system has no fidelity oracle.** It is new behaviour, so nothing
external says what "correct" is. Mitigation: keep the schema small, version it
from the first commit, and test the failure paths (corrupt, missing, old) as
carefully as the happy path.

**Audio assets are a user dependency.** Mitigation: §4.2 — build against
procedural sources so the phase never blocks, and treat file substitution as a
separate, later step with its own `docs/assets.md` rows.

**Scope creep into Phase 3.** The moment "positional audio" starts implying
"enemies should sound different per facing", it has become a sprite problem.
`docs/known-issues.md` is the pressure valve.

## 8. What this phase deliberately leaves broken

Recorded so Phase 2 inherits an honest list:

- Enemies remain single-facing billboards
- No shadows; internal geometry is still per-instance rather than merged
- No pathfinding — enemies still snag on corners
- Levels 2-7 still share one copy-pasted layout
- Six bosses still share `priestThink`
- Enemy names still reference Doom/Hexen monsters
- Three.js still pinned at 0.128.0 (KNOWN-14)
