# Chapter records

Completing a chapter adds its best grade and fastest time to the result screen and to its unlocked row in Select Chapter. The two records can come from different runs. Older saves keep their existing unlocks and start collecting records on their next clear.

Each time matches the whole seconds shown in the native results. The clock includes pauses. A shrine revival preserves elapsed chapter time and excludes the death-screen interval. Restarting the level starts a fresh clock. The ordinary exit takes its snapshot before the departure animation. The Heart takes its snapshot when the final victory screen opens.

Records use one browser-local key per native map ID, under `black-silence.chapter-record.v1.`. Finishing a chapter with storage disabled still displays its session record. Persistence across page reloads requires storage access.

## Browser verification

Run `node tools/chapter-records-tests.cjs` with desktop Chrome installed. Optional positional arguments specify the game HTML, a capture directory and an unmodified baseline HTML. The test opens temporary instrumented copies as local files in offline browser contexts.

The November 13 run used baseline `d4ec5d6` and integrated HTML SHA-256 `683dd31e70d2ecc4fd8755a2ea37e9abf8f4bf6a2e421a283bff8c29ed5c06b4`. The fixture positions the player by a native shrine and exit, sets replay tallies and elapsed times, and uses the real interaction, revive, chapter continuation and chapter-selection paths. A late-game save opens the final chapter through its menu row, and native damage kills its Heart boss.

| Prologue clear | Native result | Record shown |
| --- | --- | --- |
| Shrine revival | D · 1:38 | D · 1:38 |
| Higher grade | S · 6:00 | S · 1:38 |
| Faster clear | D · 0:42 | S · 0:42 |

The Heart victory recorded D · 0:06. The suite also checked refresh persistence, locked rows, malformed storage, blocked storage and the reachable Back button at 360 × 480. Chrome reported zero page errors and zero network requests.

[Chapter clear](chapter-records-nov13/clear.png) · [Chapter menu](chapter-records-nov13/menu.png) · [Narrow victory screen](chapter-records-nov13/small-victory.png)
