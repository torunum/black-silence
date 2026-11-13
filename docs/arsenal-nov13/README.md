# The coach gun and the lighter

[Watch the actual reloads with game audio](reload.webm). [Ready pose](shotgun.png) · [Shell insertion](loading.png) · [Wick ignition](ember.png).

The double-barrelled Shotgun now uses separately articulated parts traced against the [approved coach-gun board](../../assets/weapon-reference/shotgun-target-v1.png): two tubes, wooden fore-end, hinged breech, engraved lock and individually pivoting hammers. The guard is open. Both gloves are independent of the metal and wood. At reload the fore-end tips forwards, the support hand brings up the number of shells available and each inserted case disappears into its chamber except for its rim and primer. A live shell stays seated during a top-up. Shooting and ammunition rules remain unchanged.

The Dynamite reload gives the lighter a wind-up, ignition contact and withdrawal. Its flame grows from the wick end of the lighter; cinders briefly curl away from the lit fuse. All movement follows the existing weapon clock; none of the effects creates a world light or a particle emitter.

Review compared the native game to the [relics board](../../assets/weapon-reference/arsenal-target-6-9-v1.png) and the Shotgun board. The first pass left one hammer unsupported and made the gun too large; subsequent revisions restored the backing lug, exposed the trigger guard, and brought the loading fingertips closer to the shells. The old barrel tile, separate lockplate sheet and double-shell overlay are no longer embedded or decoded at startup. Their editable reference art stays in the repository.

The [verification record](verification.json) identifies the private weapon-only build used for the clip, captures and timing. The clip shows real keypresses and unmodified game audio. Three viewport sizes were tested; other weapons were compared via native presentation pixels. Shared-host timings are observations, not a general performance guarantee. Run `node tools/coach-reload-tests.cjs THE-BLACK-SILENCE.html .dream-loop/check-coach` to check the number of rendered cases against the actual ammunition transfer and cancel behaviour.
