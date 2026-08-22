/**
 * The weapon state machine's live values — everything that changes between
 * frames while a weapon is equipped, fired, reloaded or holstered. The
 * per-weapon *stats* are src/weapons/definitions.ts's WEAPON_STATS and do
 * not belong here; this is only the runtime.
 *
 * Every initial value is copied from the reference exactly. `wstate`
 * starts as `"equip"`, not `"idle"` — the player's weapon visibly draws at
 * level start. `pending` starts as `-1`, a plain number, not `null`:
 * `requestSwitch`'s completion check is `if(pending>=0){S.cur=pending;...}`,
 * and `null>=0` is `true` in JavaScript (null coerces to 0), so a nullable
 * type here would be one reachable code path away from silently corrupting
 * `S.cur` — match the reference's actual sentinel, not a nicer-looking one.
 *
 * `volleyHit` is the one field with a story. The reference declares
 * `let volleyHit=false` at line 2041, AFTER fire() reads it at line 2012 —
 * legal only because same-scope `let` hoists to the top of the script.
 * Split across modules that would be a real ordering bug, so moving it here
 * removes the hazard rather than preserving it. Its observable behavior is
 * unchanged: it is written before every read at runtime.
 *
 * `reloadFlags`'s value type is `unknown`, not `boolean`: `src/legacy.js`
 * assigns the *number* `1` to its keys (`weaponRuntime.reloadFlags.a=1`),
 * matching the reference exactly, which does the same. Every read only
 * ever tests truthiness (`!weaponRuntime.reloadFlags.a`), so `1` behaves
 * identically to `true` there — but declaring the field `boolean` would be
 * a typing lie the compiler can't catch (`checkJs` is off for legacy.js).
 * Do not "fix" the assigned values to real booleans; that would be an
 * unrequested behavior-adjacent change to a file this migration must leave
 * inert.
 */
export const weaponRuntime = {
  wstate: "equip",
  wtime: 0,
  wCool: 0,
  pending: -1,
  reloadFlags: {} as Record<string, unknown>,
  recoilPitch: 0,
  kickAmt: 0,
  kickRot: 0,
  muzzle: 0,
  zoomLerp: 0,
  kickAnim: 0,
  volleyHit: false,
};
