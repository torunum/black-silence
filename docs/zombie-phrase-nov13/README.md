# Zombie hurt voices, enemy posing and display settings

When multiple hits land close together, one zombie now fades its previous hurt voice over 15 ms. Different monsters can still answer together. The same recording plays at most twice consecutively for each emitter. The last third of each recording falls by a little over two semitones and loses brightness as the exhale dies away. Regular attacks, alerts, deaths, other enemies and spatial buses keep their original routing.

**Hear the difference:** [before](before.wav) · [after](after.wav). These are isolated, equal-gain, 24 kHz offline Web Audio renders of the actual baseline and changed modules using the same five scheduled hits, two actors, existing recordings, and identical pitch/selection draws. At 0.35 s the old clip had four source voices active; the new one has two. The demo deliberately repeats the same random take; it is not live gameplay or a recording of a whole room. [Event and peak measurements](audition.json).

**Enemy poses:** Four enemies stepped for 240 deterministic ticks produced 950 pose applications. The old renderer allocated 950 different transient pose records; the updated renderer reused four. A controlled finisher ownership handoff and stagger occurred during the comparison. Positions, sprite rotations and pose tags matched at every tick. This measures these allocations, not general frame rate. [Trace comparison](pose-parity.json).

**Display:** Settings → CRT Scanlines supports Off through 100%, including keyboard adjustment and memory across page loads when the browser allows local storage. The default preserves the original image; the setting does not change the vignette, combat flashes or HUD. Compact screens can scroll to the controls and Back button.
