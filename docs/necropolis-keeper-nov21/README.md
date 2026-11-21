# The ossuary lantern keeper

Enter the Necropolis ossuary from the plaza and open its wooden doors with **E**. An old woman lifts a brass lantern over the stair, turns and walks toward the upper landing. Adem remembers her walking him home from his father's funeral. You keep control of movement, weapons and camera throughout. If you run past her, the light fades as you pass. Reduced-motion mode shows the raised lantern in one stationary pose.

[Raised lantern in game](lantern-raised.png) · [Doorway and upper landing with game audio](lantern-vigil.webm) · [Eight painted poses](../../assets/necropolis/lantern-keeper-atlas.png)

The portrait uses eight original transparent poses made from an ImageGen study of the native doorway. The second art pass gave the lantern a contained flame and brass cage, lit the near glove, and picked out the hood's cool edge. Its pool folds from the tread down the existing riser. When the bail moves, one positional three-part clink plays at the lamp. The scene uses a sprite and one four-triangle light surface. The keeper has no collision body or combat target.

The focused test compares the offline game with its previous build. It stages the doorway and holds enemies still. Actual key presses open the door and traverse both approaches. The old closed shrine can still trigger the memory, and saves and Rises at an already opened door bypass it. The test also covers native subtitle priority, the last line clearing, pause/resume, a continuous sprint, reduced motion, 4,200 collision samples, and disposal of the two textures, two materials and geometry. In the clip the approach is staged and the door, lantern sequence, subtitle and final walk use ordinary gameplay. [Focused verification](verification.json)

```powershell
node tools/compile-necropolis-vigil.cjs
node tools/necropolis-vigil-tests.cjs THE-BLACK-SILENCE.html previous.html .dream-loop/keeper-check
```
