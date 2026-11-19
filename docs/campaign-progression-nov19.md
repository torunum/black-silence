# Campaign progression and shrine recovery

Continuing or rising from a shrine after defeating an exit boss restores the exit at its original location. Any other boss in the chapter still has to be defeated. A shrine reached after the Heart dies resumes the native victory sequence. A save inside an already-open door restores the saved position when the player's body fits through the doorway.

## Standalone campaign route

A single offline Chrome run began at **New Game** and completed all 11 chapters through the Womb victory screen. The run used **E** at the Monastery bell and every exit, then **Space** on each of the ten chapter cards. It collected the nine red keys and both seals through movement and cleared the campaign save at victory. [Published build results](verification-data/nov19-finisher-campaign-release.json) · [Earlier campaign-only capture](verification-data/nov19-campaign-progression.json)

| Chapter | Progress observed |
| --- | --- |
| Out of the Pit | Chapel shotgun and exit ladder |
| Ash Bell Monastery | Both seals, bell, seal gate, Gravedigger and exit |
| Gothic Dungeon | Red key, Guardian and exit |
| Abandoned Church | Red key, Priest, Guardian and exit |
| Hollow Village | Red key, locked gate and exit |
| Necropolis | Red key, Executioner, Guardian, Sovereign and exit |
| Graveyard | Red key, Executioner, Guardian, Gravedigger and exit |
| Sewers | Red key, Executioner, Leviathan, Guardian and exit |
| Factory | Red key, Executioner, Foreman, Guardian and exit |
| Bone Cathedral | Red key, Sovereign, Guardian and exit |
| Womb | Red key, Executioner, Guardian, Heart and victory screen |

Movement uses the game's own collision and elevation code at a fixed simulation step. The route walks to each target, opens doors through the game's interaction handler and collects pickups through the ordinary pickup check. The fixture isolates hostile attacks and gives each of the 21 boss actors a scripted final hit through native damage. It covers authored traversal and campaign progression. Combat balance and optional secrets remain outside this run.

## Existing save compatibility

An isolated browser test created authentic shrine saves on `b8b77ff` and then resumed the same local storage on the updated HTML. The Monastery exit relit after both **Continue** and **Rise Again**. The Church exit still required its living Guardian. Two Womb saves made after the Heart died, one inside an open red gate and the other just beyond it, each reached victory once with the saved statistics. The test also rejected altered saves inside a closed gate or overlapping the adjoining wall. [Save recovery browser results](verification-data/nov19-campaign-boss-restore.json)

Run `node tools/campaign-progression-tests.cjs THE-BLACK-SILENCE.html .dream-loop/campaign-progression` to repeat the full route. Run `node tools/campaign-boss-restore-tests.cjs legacy.html THE-BLACK-SILENCE.html .dream-loop/campaign-boss-restore.json` with the pre-fix HTML to repeat the save recovery checks.
