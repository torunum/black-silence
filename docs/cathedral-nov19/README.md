# Bone Cathedral reliquary

The first southern pier in the nave now holds a carved limestone rib relief, patinated bronze bands and three votives. It marks the turn toward the vaults on the route from the porch to the sanctuary key. The original blocked pier cell is `(46, 24)`, centered at world `(93, 49)`.

[Original DreamLoop study](../../assets/cathedral/reliquary-dreamloop-target.png) · [Before](before.png) · [After](after.png) · [Oblique](oblique.png)

The matched captures use the same native camera at world `(94.2, 2.2, 43.7)`. The HUD and weapon are hidden in the image comparison to expose the lower edge of the pier and floor light. The game renders an opaque mesh and a local baked light mesh with 5,335 total triangles and two small atlas textures. The candles use modeled flames.

The native Chrome run followed the original route offline using W and E. It opened the porch and vault gates, collected the original key and traversed the sanctuary lock. Combat was suspended for this route fixture. The comparison matched level data and 5,037 collision samples. All six resources retired exactly once on both chapter transitions. [Scene study](scope.json) · [Published build verification](../verification-data/nov19-execution-release.json)

Run the comparison against a previous standalone build with the same layout. Omitting the second HTML path compares against the first build with just the reliquary module removed.

```powershell
node tools/cathedral-reliquary-tests.cjs THE-BLACK-SILENCE.html previous.html
```

The surface swatches are embedded for offline playback. Regenerate them with `node tools/compile-cathedral-reliquary.cjs` and rebuild the HTML with `npm run build`.
