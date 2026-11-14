# The Black Silence gameplay

[Watch the 18-second gameplay cut](gameplay.webm) · [Twelve frames from the delivered video](frames.png) · [Decode, level and timing measurements](verification.json)

The cut opens at the sewer discharge valve as the mechanism starts. It cuts to the coupled flywheel and piston, then to the monastery's star dial, opening portcullis and walk into the library passage. The closing shot walks toward the prologue's three stained-glass lancets.

All three scenes came from the same standalone HTML, SHA-256 `52933da3ee9e4a7ea9730653ab49b5e62e1df486d9eff1d32578f06f1fcb684c`. Each chapter ran offline in its own Chrome page. A private capture fixture staged the player at native eye height, set the view direction, kept enemies dormant and hid chapter titles and subtitles. The game rendered and simulated each shot. The fixture sent E through the game's keyboard handler to start the pump and advance the dials, including their setup turns, and W through the same handler to walk through the gate and approach the glass. The camera cuts between viewpoints.

The soundtrack comes from each page's live post-volume WebAudio output. The edit trims the picture and the corresponding stereo sound together. The delivered WebM uses 960 × 540 VP9 at 25 fps with 48 kHz stereo Opus. Chrome reported 18.058 seconds for playback and 18.120 seconds for the decoded audio. Every complete second had measured signal. The maximum absolute audio sample was 0.426.

All 450 video frames were decoded. At 96 × 54, 448 were distinct and the longest repeated run was three frames. The final encode contained zero near-white, near-black or magenta marker frames under the thresholds in the verification test. Its SHA-256 is `508ac39228ca446511ce61016bd70c357109b7ee56e7e19ab6edfee547435ee6`.
