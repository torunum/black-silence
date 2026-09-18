# Publication Media

Captured on 2026-09-18 from the local development build at game commit
`d6c7033`, without changes to gameplay source. All pictures and sound come
from the game's procedural renderer and WebAudio engine; no stock footage,
external music, or generated concept art is used.

- `black-silence-trailer.mp4`: approximately 26 seconds, 1280x720, 25 fps,
  H.264 video and AAC stereo audio, fast-start MP4.
- `preview.gif`: seven-second combat excerpt, 640x360, 10 fps.
- `cover.png`: promotional typography over the dungeon capture, 1280x720.
- `dungeon.png`, `church.png`: 1280x720 browser captures with trailer captions.

The sequence shows the prologue, level 1 combat, and the Corrupted Priest
in level 2. Filming stages chapter positions and camera aim, unlocks weapons,
supplies ammunition, and extends spawn protection. It demonstrates the actual
renderer, enemies, weapons, and sound, not normal progression or difficulty.

Capture tools: Playwright Chromium with a fresh temporary browser profile,
MediaRecorder for the game's master audio bus, and FFmpeg 7.1 for encoding.
Source captures and local helper scripts are excluded in `.release-work/`.
The public game has no recording helpers or filming modifications.
