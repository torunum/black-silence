# Where this project stands

Written to survive session loss. If you are picking this up cold, read this
file, then `docs/direction.md`, then the current plan under
`docs/superpowers/plans/`. Trust this file and `git log` over any recollection.

Last updated: 2026-08-13, after Plan 0C Task 3's follow-up (KNOWN-6 closed).

---

## What this is

`THE BLACK SILENCE — The Hollow Parish`, a retro FPS that existed as a single
3967-line HTML file with an inline `<script>` and a CDN Three.js tag. It is
being turned into a professional indie retro FPS. The original is frozen at
`reference/sonsurum.html` and is **never edited** — it is the golden master
every fidelity test compares against.

`docs/direction.md` holds the approved creative decisions: five hand-carved
levels instead of eight, an enemy roster cut from 25 to 9 plus 3 bosses with
distinct brains, and a hybrid asset policy (procedural world, real audio and
type files).

## Phase 0 — the mechanical port

The whole of Phase 0 changes **no behavior at all**. It exists so that every
later phase has a foundation. Existing bugs are preserved deliberately and
pinned by characterization tests.

| Plan | Scope | Status |
|---|---|---|
| 0A | Vite + TypeScript scaffold, pure data layers, level tables | **merged** |
| 0B | Procedural textures, sprite baker, item textures, the whole audio layer | **merged** |
| 0C | Behavioral oracle, FX layer, weapon viewmodel art, subtitles, input | **in progress** |
| 0D | The global-to-state migration (~40 mutable globals) | not started |
| 0E | Systems: renderer, level loader, weapons, enemy AI, player, interaction | not started |
| 0F | UI, piano, loop and boot; then hardening — gameplay `setTimeout` removal, dispose registry, `strict: true`, the Three.js upgrade | not started |

The spec originally sized the remainder as two plans; the real shape is four.

### Progress metric

`src/legacy.js` holds whatever has not been carved out yet. Its line count is
printed by `npm test` as the port burn-down. When it reaches zero the port is
done.

```
3759 → 3040 (0A) → 2224 (0B) → 1682 (0C, in progress)
```

Tests: 0 → 114 → 167 → 299.

## Plan 0C status

Branch: `phase-0c-oracle-and-fx`, HEAD `df2efe1`, merged from `master`.

| Task | State |
|---|---|
| 1 — behavioral oracle | complete, reviewed clean |
| 2 — FX layer (particles, decals, gibs) | complete, reviewed clean |
| 3 — weapon viewmodel art (447 lines) | complete, reviewed; KNOWN-6 closed |
| 4 — subtitles, achievements, HUD messages | not started |
| 5 — input | not started |

KNOWN-6 (Overlay2D untested) is closed by `tests/behavior/overlay2d.test.ts`
— 26 cases, no source changes, verified by re-running the seven sabotages
that originally exposed the gap plus five chosen independently. One literal,
the casing's `life:1.6`, is provably unobservable, and finding out why turned
up **KNOWN-7: spent casings never reach the screen at all** (spawned in
`FW`/`FH` space, culled in `VW`/`VH` space), with most blood splats drawn
off-canvas for the same reason.

**The immediate next action** is Task 4, then Task 5, then the final
whole-branch review, then merge to `master`.

Task 4 must finally build `src/content/achievements.ts` — deferred since Plan
0A because the reference has no achievements table; all 20 are inline literals
at their trigger sites. The ids are `behead boot curious deadeye digger exec
first foreman gauntlet guard heart leviathan organ pianist priest punt recital
redec sixty sovereign`.

## How fidelity is guarded

Three mechanisms, and they are **not** interchangeable:

- **`tests/behavior/`** — a recorder. Runs the reference's code and the ported
  module's side by side against instrumented canvas and WebAudio stubs, under a
  seeded PRNG, and compares ordered call logs. Survives renames, reformatting,
  type annotations and state refactors. This is what makes Plan 0D possible.
- **`tests/fidelity.test.ts`** — byte-identical comparison. Correct for pure
  **data** only. It was once written as the rule for code too, which was
  incoherent for code the port necessarily annotates.
- **Ordinary unit tests** — for math over state that draws nothing.

KNOWN-5 in `docs/known-issues.md` documents the recorder in full, including an
honest list of what it still cannot reach.

## Method

Work goes through `superpowers:subagent-driven-development`: a fresh
implementer subagent per task, a task review after each, and a whole-branch
review before merge. Reviews have repeatedly caught real defects, so the loop
earns its cost.

Two practices that have mattered most:

1. **Reviewers must sabotage with their own choices, not repeat the
   implementer's.** This is what caught a string-blind normalizer rule, a
   torch frame-order bug, gib velocities with no coverage, and the whole of
   KNOWN-6.
2. **Every line number in every plan has been wrong at least once.** Confirm
   ranges by reading content, never by arithmetic on a documented number.

## Environment gotchas

- **Node is not on PATH in a fresh shell here.** It is installed at
  `C:\Program Files\nodejs` (v24.19.0 / npm 11.17.0) and the machine PATH in
  the registry contains it, but shells started before the install carry a
  stale environment. Prefix every command:
  - Bash: `export PATH="/c/Program Files/nodejs:$PATH"`
  - PowerShell: `$env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"; `
  A restart of the session fixes it properly.
- **The browser harness cannot drive this game.** Automated key events arrive
  with an empty `code` field and the game reads `e.code`; pointer lock is
  blocked; and the animation-frame pipeline has frozen entirely on several
  sessions (a bare `requestAnimationFrame` counter with no game code involved
  gets zero callbacks). Menu clicks and level loads do work. Substitute
  evidence that has worked: dynamically importing the live-served module in the
  running page and exercising it directly.
- **`npm run build` plus inlining produces a single playable file.** The
  gitignored `THE-BLACK-SILENCE.html` at the repo root is that artifact — it
  loads from `file://` with no network.

## Three bugs a player will actually hit

All predate the port, all are preserved on purpose, all are pinned by tests
so they cannot change unnoticed. See `docs/known-issues.md`.

- **KNOWN-1** — Level 1 has a red key and a miniboss guarding it, but no locked
  door anywhere. The key does nothing.
- **KNOWN-4** — `loadLevel` checks the enemy table before the prop table, and
  `C` and `V` are in both. Level 2's eight `V` tiles, written under a comment
  reading "nave pews", spawn **eight Factory Foreman bosses** (2600 hp each).
  The chair in the priest's chambers is a Cacodemon. Do not "fix" the character
  collision without deciding what Level 2's furniture should be — removing
  eight bosses is a balance change.
- **KNOWN-7** — Spent shell casings are spawned in `FW`/`FH` coordinates but
  culled and drawn in `VW`/`VH` space, so every casing is spliced away before
  its first draw. The whole casing art path is unreachable in a real window.
  Screen-blood splats share the mix-up without the cull: about three quarters
  of each flash lands off-canvas.
