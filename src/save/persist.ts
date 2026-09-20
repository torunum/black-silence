import { save } from "./SaveGame";

/**
 * Reads and writes `save` (see `SaveGame.ts`) to `localStorage`, under a
 * versioned schema.
 *
 * There is no `localStorage` call anywhere else in `src/` — this is the
 * first and only place the game touches storage. `save` itself stays a
 * plain mutable object; nothing here wraps it in a getter, a proxy, or a
 * promise, because `tests/integration/gameplayTrace.ts` assigns
 * `save.maxLevel` directly and reads it back synchronously, mid-run, with
 * no boot step. `loadSave`/`flushSave` are the only two functions that talk
 * to storage — everything else keeps reading and writing `save` exactly as
 * it always has.
 *
 * **Neither function ever throws.** Private browsing, a full quota, and a
 * blocked or absent `localStorage` (some embedders remove the global
 * entirely) all raise on `getItem`/`setItem`, and even the property access
 * `localStorage` itself can throw in some browsers' private mode. A lost
 * save is recoverable; a crash on boot or on level-end is not, so both
 * functions catch everything and fall back to leaving `save` as it is.
 */

/**
 * Bumped whenever the schema below changes shape. `loadSave` refuses to
 * read anything written under a different version rather than guessing at
 * a migration, so a future version bump makes old saves fall back to
 * defaults instead of loading partially-wrong data.
 */
export const SAVE_VERSION = 1;

const KEY = "blacksilence.save";

/**
 * Reads persisted values into `save`, in place. Never throws.
 *
 * Each field is read only if it is present *and* the right type — a
 * hand-edited or corrupted store must not be able to put a string into
 * `maxLevel`, for instance. A field that fails the check, or is simply
 * absent, leaves `save`'s current value (its module-load default, if this
 * runs at boot) untouched. Missing data, corrupt JSON, a future version,
 * and a blocked store all fall back to defaults the same way: silently,
 * with nothing left mutated beyond what was valid.
 */
export function loadSave(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.v !== SAVE_VERSION) return;
    if (typeof data.maxLevel === "number") save.maxLevel = data.maxLevel;
    if (typeof data.masterVolume === "number") save.masterVolume = data.masterVolume;
    if (typeof data.renderWidth === "number") save.renderWidth = data.renderWidth;
    // `shadows` (Phase 2B) was added without bumping SAVE_VERSION, and that
    // is deliberate. The version guard above is a *refusal*, not a
    // migration: bumping it would make every existing save unreadable and
    // silently reset the player's unlocked chapters, volume and resolution
    // to defaults, to gain nothing — a v1 store simply has no `shadows`
    // key, the check below fails, and `save.shadows` keeps its default of
    // `true`, which is exactly the intended fallback. A bump is for a field
    // whose *meaning* changed, not for one that was added.
    if (typeof data.shadows === "boolean") save.shadows = data.shadows;
  } catch {
    /* corrupt JSON, a blocked store, or storage throwing on access —
       defaults (or whatever save already held) stand. */
  }
}

/**
 * Writes the current `save` to storage, tagged with `SAVE_VERSION`. Never
 * throws — private mode, a full quota, or a blocked store all raise inside
 * `setItem`, and losing this write beats crashing whatever caller just
 * changed `save`.
 */
export function flushSave(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, ...save }));
  } catch {
    /* private mode, quota, or a blocked store — the in-memory save still
       holds the new value, only the write to disk was lost. */
  }
}
