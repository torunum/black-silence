# Phase 3 Part B — What the trace cannot see

Three structural jobs, all verifiable in this environment, all of them
prerequisites for the roster work rather than part of it.

The first is the reason this plan exists. The other two close holes that
Phase 3 Part A's reviews found and deferred.

## Why now

Phase 3 Part A introduced a runtime bug in a task chartered as type-only:
`e.atkAnim<=0` became `(e.atkAnim??0)<=0`, and since `atkAnim` is never
written by `spawnEnemy`, `undefined<=0` is false while `(undefined??0)<=0` is
true. Enemies cycled walk frames from spawn where the reference cycles none.

**All 463 tests passed.** It was caught by reading a diff.

The cause is structural and still open. `digestScene`
(`tests/integration/gameplayTrace.ts`) records, per scene child:

```ts
`${o.type}:${r6(o.position.x)},${r6(o.position.y)},${r6(o.position.z)}:${o.visible ? 1 : 0}`
```

Type, position, visible. **Not `material.map`** — so which sprite frame an
enemy is showing is invisible to both characterization traces, which are this
project's only defence against a mass rewrite.

Nine sites assign `material.map`, and the trace can see none of them:

```
ai/Behaviors.ts:166   dismemberment sprite swap
ai/Behaviors.ts:308   death-frame animation (headless variant included)
ai/Behaviors.ts:312   the attack pose
ai/Behaviors.ts:316   the walk cycle          <- where the Part A bug lived
enemies/Boss.ts:173   boss form change
enemies/Boss.ts:217   boss animation
enemies/Damage.ts:160 severed-limb sprite
enemies/Death.ts:204  the headless death sprite
player/Interact.ts:151 torch flicker
```

`tests/enemies/walkFrames.test.ts` closed exactly one of these nine as a unit
test. The other eight are uncovered, and **Phase 3 multiplies enemy sprites
roughly eightfold** — going into a roster rewrite with sprite state untraced
is how that rewrite silently breaks animation.

## Global Constraints

- `reference/sonsurum.html` is **never edited**.
- **Task 1 is the only task that may touch a trace fixture**, and it must
  follow the procedure below. Tasks 2 and 3 must leave both fixtures
  byte-identical; if one moves under them, stop and find out why.
- No `src/` file over 400 lines.
- No import cycles: `npx madge --circular --extensions ts,js src/`, and read
  the "Processed N files" line — it should say ~90. **The bare form scans
  zero files and still reports success** (KNOWN-12).
- `npm test` before every commit. It now runs `tsc --noEmit` first, so a type
  error stops the gate before vitest starts.
- Cold cache on each task's final run: `npx vitest run --no-cache`.
- Node is not on PATH in a fresh shell: prefix with
  `export PATH="/c/Program Files/nodejs:$PATH"`.
- **The game cannot be rendered in this environment** — `requestAnimationFrame`
  never fires in the browser pane, measured directly. Every claim must be
  structural. "It looks right" is not available.

---

## Task 1 — the trace sees sprite state

### Step 1: a stable, readable texture identity

`PX` (`src/enemies/SpriteBaker.ts:84`) is `Record<string, BakedSprite>`,
populated at `:97` with slots `a`, `b`, `hl`, `hlb`, plus `atk`, `noHead` and
the dismemberment variants. So every enemy texture has a natural name:
`"<enemyKey>.<slot>"`.

Build a reverse index from texture object to that name, once, at trace setup.
**Do not use `texture.uuid`** — it is four `Math.random()` draws (see Phase 2
Part A's finding), it is not stable across runs, and it is unreadable in a
fixture diff. A fixture whose diff a human cannot interpret is worth much less
than one they can.

Items have their own textures (`ITEMTEX`, used by the torch at
`player/Interact.ts:151`). Index those too, or record them under a clearly
marked fallback — decide, and say which in the report. A texture the index
cannot name must produce a **stable** placeholder, never a uuid and never
`undefined`, because an unnamed texture silently equal to every other unnamed
texture would reintroduce the blind spot inside the fix.

### Step 2: widen the digest

Add the texture name to each child's digest part, for children that have one.
Most scene children are not sprites; they must keep producing exactly what
they produce today, so that the diff in Step 3 is attributable.

Consider whether `scale` and the material's `color` belong too — the elite
tint (`spawnEnemy`'s `color.setHex(0xd8c878)`) is another invisible piece of
enemy state. **Recommendation: add colour, leave scale.** Colour is one more
field with a real bug class behind it; scale is written at spawn and rarely
after, and every added field widens the fixture diff you must interpret in
Step 3. If you disagree after measuring, say so in the report and choose.

### Step 3: the fixtures WILL change — analyse before regenerating

This is **the second sanctioned fixture regeneration in this project's
history** (Phase 2 Part A's geometry instancing was the first). Follow the
procedure that one established:

1. Run and read **which** frames diverge and by how much.
2. Confirm the divergence is consistent with recording more per child **and
   nothing else**. Specifically: `count` must not change at all, and the
   camera track and every HUD field must be identical. A changed camera track
   means something you did has runtime effect, which a digest widening must
   not — **stop and fix the code, not the fixture**.
3. Write the analysis into both test files' headers and into your report,
   with the before/after digests and the confirmation from (2).
4. Only then regenerate with `WRITE_TRACE=1`, in the **same commit**.

**A fixture regenerated without its camera track being checked is the most
dangerous thing in this plan.**

### Step 4: prove the new coverage is real

The point of the task is that the trace now catches what it missed. Prove it
with the bug that motivated the plan:

- Restore `(e.atkAnim??0)<=0` at `ai/Behaviors.ts` — **a trace test must now
  fail**, not only `walkFrames.test.ts`. If it does not, the widening did not
  reach the walk cycle and the task is not done.
- Choose a second mutation at one of the other eight sites — the attack pose
  and the headless death sprite are the most interesting, since neither has
  any coverage at all today.

Record both, and revert each with a targeted edit.

If a mutation at one of the nine sites still cannot be seen — for instance
because the prologue has no enemies and level 1's script never reaches that
state — **say so plainly and list which of the nine remain uncovered.** An
honest list of what this still cannot reach is worth more than a claim that it
reaches everything. `docs/known-issues.md`'s KNOWN-5 is the model for that
kind of honesty.

### Commit

One commit, with the analysis in it.
`git commit -m "test: the trace records which sprite frame each enemy shows"`

---

## Task 2 — `noUnusedLocals`

Phase 3 Part A's final reviewer demonstrated a hole: a consumer binds
`const enemies: readonly SomePick[] = world.enemies`, and **widening that
annotation to `readonly Enemy[]` orphans the local `Pick<>` with zero
warning** — no tsc error, all tests green. The narrowness convention that
Part A worked to preserve can be dismantled one file at a time without
anything noticing.

`noUnusedLocals` closes it: an orphaned `Pick<>` becomes a compile error, and
`tsc --noEmit` is now the first gate in `npm test`.

Turn it on in `tsconfig.json`, fix whatever it reports, and **report the
count** — it is a number worth knowing. Do not turn on `noUnusedParameters` at
the same time; it flags a different and noisier class, and bundling them makes
the diff unreadable.

**Prove it**: widen one of the ten narrow bindings to `readonly Enemy[]`,
confirm `npm test` now fails naming the orphaned type, revert with a targeted
edit.

If a genuinely-needed local trips the flag, prefer restructuring over
`// @ts-expect-error` or an `_`-prefix escape; if you must use an escape,
name it in the report.

---

## Task 3 — two deferred rows

Both were found by Part A's reviews, deferred deliberately, and are small.

### KNOWN-16, first half — `addBlob`'s lost type

`addBlob` (`src/render/RenderCore.ts`) is declared to return `THREE.Mesh` but
always builds `PlaneGeometry` + `MeshBasicMaterial`. So `Enemy.blob` is
declared more loosely than reality, and `ai/Behaviors.ts:324` buys the
information back with `(e.blob.material as THREE.MeshBasicMaterial)`.

Give `addBlob` the precise return type and delete that cast. Check every other
caller of `addBlob` — narrowing a return type cannot break a caller, but a
caller that was itself casting should have its cast removed too.

### KNOWN-16, second half — `deathBoom`

`EnemyDef.deathBoom` is authored on enemy `q` and **read nowhere** — not from
the def, not from a spawned enemy. It is a different class from KNOWN-15's
ten: those are read but never written, this is written but never read.

**Do not delete it.** It is authored data in a file that mirrors the frozen
reference, and deleting authored content is the roster phase's call. Pin it
the way KNOWN-15's ten are pinned — a test asserting it is authored on exactly
one def and read by nothing — and leave the row open.

### KNOWN-17 — the test shim

`tests/integration/musicCancellationWiring.test.ts` re-declares `world`, `S`
and `player` as local shapes and assigns through `as unknown as typeof X`, so
it silently absorbs any future retype of all three. `world.enemies` is already
`Enemy[]`; that file still thinks it is `Array<Record<string, unknown>>`.

Remove the casts if the real objects are assignable to the narrow shapes —
they were in `walkFrames.test.ts`, where exactly this was fixed. If they are
not, say precisely why, and leave the row open rather than forcing it.

---

## Definition of done

- Both trace fixtures record sprite texture identity; restoring the Part A
  `atkAnim` bug turns a trace test red.
- An honest list of which of the nine `material.map` sites the traces still
  cannot reach.
- `noUnusedLocals` on, with the orphaned-`Pick<>` hole demonstrated closed.
- `addBlob` precisely typed and its cast gone; `deathBoom` pinned; KNOWN-17
  resolved or explained.
- `npm test` clean: `tsc`, the suite, the file-size gate, madge over ~90 files.
