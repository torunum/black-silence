# Mouse capture and keyboard menus

New Game, Continue, Restart and other native capture requests hold gameplay at the pause screen until the browser grants mouse capture. If capture is denied, the pause screen explains how to retry or open the standalone HTML in its own tab. Returning to the game clears held movement, fire and the temporary Tab map input. The same scene and weapon inventory carry across the pause.

The title menu initially focuses **Continue** for an existing campaign or **New Game** for a fresh game. **Tab** and **Shift+Tab** move through menu controls, and **Enter** or **Space** activates the focused choice. Opening Chapter Select moves focus to its first available chapter. **Tab** still opens the map temporarily while playing.

## Reproduction and verification

On the previous standalone build `b8b77ff`, a genuine shot took the revolver from six rounds to five. Releasing browser capture while holding the mouse button and releasing over the pause control left the fire input set. Pressing **Enter** to resume took the magazine from five rounds to two without another shot command. The same offline Chrome test on the updated build leaves all five rounds in place.

In an actual iframe without the browser's `allow-pointer-lock` permission, the previous build hid the title and ran the level with no mouse capture. The updated game displays the recovery prompt and freezes the Prologue before it hands control to the player. A separate controlled browser-API rejection tests a retry with an actual click and the original browser capture request. [Recovery screen from offline Chrome](player-input-nov19/capture-blocked.png)

The test exercises the standalone HTML without a `qa` query or game-state mutations. It dispatches the browser's `blur` event because headless tabs stay active during the test. It observes the game request the real native exit and the player recapture the mouse by clicking to return. Run `node tools/player-input-tests.cjs THE-BLACK-SILENCE.html .dream-loop/player-input` to generate the report and its screenshots. `GAME_CHANNEL=msedge` uses Microsoft Edge in the same test. [Standalone browser results](verification-data/nov19-player-input.json)
