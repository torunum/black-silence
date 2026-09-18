# Third-Party Assets

Per `docs/direction.md`, the world stays procedural; audio and typography use real
files. Every third-party asset ships with a row here. No row, no ship.

| Asset | Type | License | Source | Why chosen | Modifications |
|---|---|---|---|---|---|
| _(none yet — Phase 1 Task 6 adds the first audio)_ | | | | | |

---

## Where to drop audio files

Phase 1 Task 6 — real, user-supplied CC0 `.ogg` files — has been outstanding
since 2026-08-29 and is the actual fix for the game's sound. Everything in
`src/audio/` today is procedural WebAudio, which `docs/direction.md` says
plainly "cannot produce a convincing shotgun." This section exists so that
supplying the files is a drop-in rather than a design conversation.

**Drop them in `src/assets/audio/`.** That directory does not exist yet;
create it. One file per sound, lowercase, hyphenated, named after the thing
it is, not the weapon slot:

```
src/assets/audio/weapon-pistol.ogg          # FLARE PISTOL      (slot 0)
src/assets/audio/weapon-shotgun.ogg         # SAWED-OFF SHOTGUN (slot 1)
src/assets/audio/weapon-rifle.ogg           # COMBAT RIFLE      (slot 2)
src/assets/audio/weapon-tommy.ogg           # TOMMY GUN         (slot 3)
src/assets/audio/weapon-sniper.ogg          # BMG SNIPER        (slot 4)
src/assets/audio/weapon-nailgun.ogg         # NAIL CANNON       (slot 6)
```

Those six are the ballistic weapons — every `kind:"hit"` slot. Slots 5 (HOLY
CROSS LAUNCHER) and 7 (SOUL REAPER) are not firearms and are not waiting on a
file; their synthesis is deliberate character.

**Add the row here first, in the same commit as the file.** Name, type,
license, source URL, why it was chosen, what was modified. That is
`docs/direction.md`'s rule and it is not a formality: a CC0 claim that nobody
recorded a source URL for is unshippable.

### What the code change looks like

Small, by design. `src/weapons/WeaponState.ts`'s `WEAPON_SOUNDS` table maps
each slot to one closure. A real file replaces the synthesis inside that
closure with an `AudioBufferSourceNode`, and **connects to the same
`masterBus()` accessor** — so it inherits positional audio for free, which is
the entire point of the shape Phase 1 Task 3 built. Nothing else moves:

- `src/audio/Sfx.ts`'s `gunshot()` (the current procedural placeholder) can be
  deleted along with `WeaponState.ts`'s `REPORTS` table, once every ballistic
  slot has a file. Until then the two coexist per slot — a file for the ones
  that have one, `gunshot()` for the ones that do not.
- `tests/behavior/weaponReport.test.ts` is the oracle for those closures. A
  slot that switches to a file will diverge from every assertion in it that
  describes synthesis; retire that slot's cases and replace them with a check
  that the buffer is wired to the bus, rather than loosening the ones that
  remain.
- `docs/known-issues.md` KNOWN-20 matters here: every `Math.random()` draw in
  `src/audio/` comes out of the same seeded stream the trace fixtures use. A
  `.ogg` makes **no** draws where the synthesis made one, so swapping any
  weapon that a committed trace fires (the pistol, in `trace.test.ts` and
  `combatTrace.test.ts`; the nail cannon, in `bossTrace.test.ts`) will
  re-index the stream and move that fixture. Expect it, analyse it, and write
  the analysis into the fixture's own header.

### The one unresolved constraint: the single-file build

`npm run build:single` (`scripts/inline-single-file.mjs`) inlines the JS and
CSS into one double-clickable `THE-BLACK-SILENCE.html` and then **fails the
build** if anything in the output still references `assets/`. That check is
deliberate — it exists so the game cannot silently ship a file that fetches
something it will never find from `file://`. It also means a `.ogg` emitted as
a separate file breaks the single-file build, so **do not put audio in
`public/`**: Vite copies that directory through verbatim and the inliner will
reject the result.

Two ways through, neither yet tried:

1. **Base64-inline them.** Raise `build.assetsInlineLimit` in `vite.config.ts`
   above the largest audio file, and Vite emits the `.ogg` as a `data:` URL
   inside the bundle, which the inliner then swallows with the rest of the
   JS. Costs roughly 33% size inflation per file on top of the already-large
   single-file build, and the single file is what a player double-clicks.
2. **Teach the inliner about media.** Extend `scripts/inline-single-file.mjs`
   to base64 the emitted asset files itself and rewrite their references, the
   way it already rewrites `<script src>` and `<link href>`. More code, but it
   keeps the dev build serving real files and only pays the base64 cost in the
   shipped artifact.

Option 2 is the better shape; option 1 is one line. Whoever takes Phase 1
Task 6 should pick deliberately and say which, because "it worked on `npm run
dev`" is not evidence that the shipped file works — the dev server serves
assets over HTTP and the shipped game has no server at all.
