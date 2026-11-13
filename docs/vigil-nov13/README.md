# The sexton's vigil

From the prologue shotgun altar, face the chapel's east wall. The bell has a split bronze lip, a pale cord and a red mourning ribbon. Step within arm's reach and press **E**. The bell swings and tolls once. A stone shutter sinks beneath it, exposing six shotgun shells on the sexton's shelf. The shotgun is optional. The catacomb entrance remains accessible throughout.

The shutter uses the engine's secret-door tile. Opening it adds one prologue secret and one career secret. The chapter now has one discoverable secret in its existing grade formula. With all enemies killed, six hits in ten shots and no broken props, finding the vigil moves the native grade from B to A.

## Native game captures

- [Chapel entrance](approach.png) and [view from the altar](altar-view.png)
- [Closed shutter](closed.png), [bell in motion](strike.png) and [exposed shelf](opened.png), all from the same player position
- [Positional bell recording](toll.wav), isolated at the native positional output during the E press. It includes the strike and fading partials. The normal game also plays its secret-door sound and discovery line.

## Verification

Run `node tools/vigil-secret-tests.cjs THE-BLACK-SILENCE.html .dream-loop/vigil-tests` from the project root with the project's Playwright dependency and Chrome available. The fixture inserts observation hooks into a temporary copy of the game. The [recorded run](verification.json) used the integrated HTML with SHA-256 `31a05e9b68138b7f8c3aaa83a923175db8507b81ba07e2dbf6338ba395f7604c`.

The test uses player movement for the altar-to-niche approach and for picking up the shells. It positions the player for the distant, obstructed and facing-away E checks, and at the actual prologue checkpoint for two separate death-and-restore histories. The first restored the open shutter with the shells still available. The second restored the open shutter after collection, retaining the ammo count. Repeated E and re-entry awarded nothing extra. A staggered enemy in front of the bell received the finisher. The dungeon retained its two existing secrets and a fresh prologue rebuilt the closed vigil. The run produced zero page errors and zero network requests.
