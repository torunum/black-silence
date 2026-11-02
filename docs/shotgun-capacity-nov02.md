# Two-chamber shotgun — 2 November 2026

The sawed-off shotgun's model and reload show two chambers, but its original gameplay magazine held five rounds. Its capacity now matches the model: two shots before reloading. Damage, pellets, shot interval and the 2.1-second reload duration are unchanged. The original unused `pump` metadata is retained; this change does not replace the viewmodel's mechanical animation.

Existing loaded ammunition is preserved. Restoring an in-memory checkpoint with five loaded shells moves three into reserve, leaving two loaded. Repeatedly restoring the same checkpoint does not accumulate extra ammunition or mutate the stored snapshot. The game's persistent localStorage save contains settings and progress, not inventory; this is not a new disk-save migration system.

Pickup grants are explicit:

| Pickup state | Result |
| --- | --- |
| First shotgun, no previous shells | 2 loaded + 7 reserve = the original 9 total |
| Another shotgun, both chambers full | +5 reserve |
| Owned shotgun, one chamber loaded | One chamber topped up +5 reserve; +6 total |
| Owned shotgun, empty | Two chambers topped up +5 reserve; +7 total |
| Two shotguns collected together on first acquisition | 2 loaded +12 reserve; first-acquisition bonus applied once |

The free top-up on an owned empty/partial weapon is intentionally limited to its two real chambers. It does not retain an invisible five-round magazine. Ordinary shell and other ammunition pickups retain their original grants. Pickup accounting uses allocation-free counts around the native collection function; no weapon metadata is temporarily changed during a frame.

`tools/shotgun-capacity-tests.cjs` verifies the actual prologue weapon pickup through the native gameplay RAF, then tests the real native pickup and checkpoint functions with isolated item fixtures. Real held mouse input fires exactly two shots and triggers the existing automatic reload; real R reload with one reserve shell, partial-magazine fire cancellation and weapon-switch cancellation conserve ammunition. The new capacity tests and existing all-weapon runtime tests are recorded separately; neither is represented as a complete campaign balance test.

Reports: [capacity and native input](verification-data/blood-nov02-shotgun-capacity.json), [source scope](verification-data/blood-nov02-shotgun-scope.json). The entire previous combat body, including damage, enemy health, stagger, kick, collision and finisher code, remains byte-identical after the new capacity/pickup/restore block.
