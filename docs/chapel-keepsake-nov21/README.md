# The sexton's family photograph

Ring the cracked bell on the east wall of the Prologue shotgun chapel with **E**. A framed photograph stands on the red cloth beside the six shells. It shows a hooded woman, a young boy and the brass lantern seen later on the Necropolis stairs. If you linger facing the open niche after the secret discovery line, Adem recalls where the mourning ribbon came from.

[View from the open niche](family-portrait.png) · [Original painted tintype](../../assets/chapel/family-tintype.png)

The frame is a shallow walnut case with clipped corners, a recessed plate, raised brass caps, a folded ribbon and a hinged foot. Its single mesh sits on the existing shelf. The two faces and the lantern use a 92 × 130 pixel texture compiled into the offline HTML. The visual study used an ImageGen edit of the original shelf camera followed by an orthographic portrait. The in-game comparison moved the frame inward to leave the right candle visible.

The original secret test rings the bell, collects the six shells, checks the secret grade and the finisher's priority, and covers shrine restores before and after the pickup. The Dungeon check compares each authored secret cell with its native door. [Bell and reward test](native-secret.json)

The focused comparison uses files opened at the same offline URL. It reads saves written by the previous game and checks the frame, the optional line, old and new Continue, and resource disposal. For these focused checks the doorway and shrine approaches are staged and nearby monsters are held still. [Keepsake test](verification.json)

```powershell
node tools/compile-chapel-keepsake.cjs
node tools/chapel-keepsake-tests.cjs THE-BLACK-SILENCE.html previous.html .dream-loop/keepsake-check
node tools/vigil-secret-tests.cjs THE-BLACK-SILENCE.html .dream-loop/vigil-check
```
