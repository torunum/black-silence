# Publication Media

The stills, `preview.gif` and `cover.png` were captured on 2026-10-05 from the
local development build at game commit `38319e2` (master), without changes to
gameplay source. All pictures come from the game's procedural renderer; no
stock footage, external music, or generated concept art is used.

**The trailer is older.** `black-silence-trailer.mp4` was recorded on
2026-09-18 from game commit `d6c7033` and has not been re-recorded: it shows
the earlier weapons, the earlier prologue and no sound rebuild. Everything
else in this folder is from the current game.

- `black-silence-trailer.mp4`: approximately 26 seconds, 1280x720, 25 fps,
  H.264 video and AAC stereo audio, fast-start MP4. From the 2026-09-18 build.
- `preview.gif`: seven-second excerpt, 640x360, 10 fps: the coffin lid
  cracking and bursting, ADEM sitting up in the grave; the west bank of hell
  walking toward the bridge; a fight in the church with the tommy gun; a
  fight in level 1's torture hall with the Soul Reaper.
- `cover.png`: promotional typography over `01-churchyard.png`, 1280x720.
- 1280x720 browser captures, HUD on, subtitles and level title hidden:
  - `01-churchyard.png`: the prologue's churchyard, flare pistol, standing
    west of the grave looking east (moon, mausoleum, headstone, open grave).
  - `02-grave-rising.png`: the opening cinematic frozen at 2.6 s, ADEM lying
    in the grave looking up at the stars as the earth falls in.
  - `03-hell-lava.png`: hell from the west bank, tommy gun: lava river, the
    stone bridge, a brazier, the lava fall.
  - `04-torture-hall.png`: level 1's torture hall, Soul Reaper, a zombie
    and a second enemy closing in under the hanging cages.
  - `05-church-altar.png`: level 2's chapel, combat rifle, the altar under
    its banners with two zombies.
  - `06-womb.png`: level 7, The Womb, nail cannon, a zombie by the growths.
  - `07-hell-crawler.png`: hell from the bridge's end, tommy gun: a crawler
    in the lava below the south lava fall.
- `08-weapons.png`: 1280x1280 contact sheet of all eight weapons, cropped from
  1920x1080 captures with the HUD hidden, against a churchyard wall.

## How they were staged

The shots stage the camera by importing the game's own modules through a Vite
dev server and setting the player's position and aim; they unlock all weapons,
fill the ammunition, extend spawn protection, and equip a chosen weapon. They
demonstrate the actual renderer, enemies and weapons, not normal progression
or difficulty.

| Still | Level | Position (cell) and aim | Weapon |
| --- | --- | --- | --- |
| `01-churchyard` | Prologue | (3, 4), yaw 4.16 rad (east-southeast), pitch +0.12 | Flare pistol |
| `02-grave-rising` | Prologue | opening cinematic, clock frozen at 2.6 s | none (hidden) |
| `03-hell-lava` | Prologue | (9, 22), yaw -2.4, pitch -0.12 | Tommy gun |
| `04-torture-hall` | Level 1 | (21, 16), yaw 0.59; auto-aim at the nearest enemy, 0.1 s into a burst | Soul Reaper |
| `05-church-altar` | Level 2 | (20, 5), yaw 0 | Combat rifle |
| `06-womb` | Level 7 | (16, 12), yaw 0 | Nail cannon |
| `07-hell-crawler` | Prologue | (10, 24), yaw -1.9, pitch -0.1 | Tommy gun |
| `08-weapons` | Prologue | (12, 1) beside the north wall, yaw 0, 1920x1080, HUD hidden | each in turn |

`preview.gif` was recorded as a 640x360 Playwright video of the same staged
scenes (the cinematic started at 1.55 s, W held from cell (8, 22) in hell, auto-aim and fire
in the two fights), cut to seven seconds, and encoded to a 96-colour GIF.

Capture tools: Playwright Chromium (software GL) with a fresh temporary
browser profile, Playwright's bundled FFmpeg for frame extraction, and Pillow
for the GIF and the contact sheet. The original trailer used MediaRecorder on
the game's master audio bus and FFmpeg 7.1. Source captures and helper scripts
are not in the repository (the older ones were excluded in `.release-work/`).
The public game has no recording helpers or filming modifications.
