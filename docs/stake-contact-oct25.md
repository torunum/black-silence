# Stake hand contact and execution-glove material

The Stake Gun's loading hand previously travelled below the wooden bolt, leaving a visible gap during the carry and insertion phase. Its local grip anchor now meets the underside of the shaft. The wooden bolt follows the same path, and both objects retain their shared extraction transform. The existing reach envelope smoothly returns the left hand to its original support position at phase `.52`; its later cocking-lever motion and the native firing/ammunition events are unchanged.

The right-hand grip anchor also moves from artwork coordinates `(1467,837)` to `(1395,780)`. This closes the palm/finger gap against the wooden handle in idle, fire and reload. Its existing basis, scale and depth remain unchanged. The accepted left-hand loading path is byte-identical. Only Stake’s right original hand/sleeve quad joins the existing side continuation pass, so its extended sleeve reaches the edge of an ultrawide viewport. The center depth mask prevents a second draw over the native weapon canvas; no new geometry or texture is added.

Execution gloves also use the existing dark `HAND_LEATHER` material ramp. This is a small material consistency change, not a replacement hand model. An `A0t.draw` wrapper maps only `O.GLOVE` face materials and restores the original face method in `finally`. Geometry, texture callbacks, lighting calculations, sleeves, blood and held enemy props remain unchanged.

## Evidence and scope

- [Stake before](stake-contact-oct25/stake-before.png) / [after](stake-contact-oct25/stake-after.png): actual keyboard-R and native RAF at the early carry phase.
- [Actual fire and reload with game audio](stake-contact-oct25/stake-fire-reload.webm): 25 FPS VP9/Opus capture. This is an actual final `b823d85f` mouse-fire and keyboard-R sequence, including game WebAudio.
- [Execution glove before](stake-contact-oct25/finisher-before.png) / [after](stake-contact-oct25/finisher-after.png): actual held-E execution. Background particles and dialogue differ between runs; these screenshots are visual evidence, not a pixel-difference test.
- [Media provenance](stake-contact-oct25/provenance.json) identifies the exact input hash of every asset. No target-board artwork is presented as an in-game capture.

| Check | Result and exact scope |
| --- | --- |
| Stake native R | 18 phase/aspect samples across 4:3, 16:9 and ultrawide; three full-ammunition/idle endpoints passed on Stake-only `0bd7ab47`. |
| Stake-only render comparison | 660 comparisons: 636 exact; 24 intentional differences confined to Stake's early reload. Other weapons, idle, late lever, kicks and finishers were exact. |
| Combined viewmodel comparison | 660 comparisons: 600 exact; 24 early-Stake and 36 execution-material differences; zero unexpected differences on `db1a400a`. |
| Execution material isolation | 21 poses on combined `697219ab`: depth and part buffers, glove coverage mask and all non-glove RGBA/palette pixels exact. Normal and thrown-error wrapper restoration also passed. |
| Native weapon runtime | All ten weapons passed actual R, ammo accounting, fire, switch, kick and cached/fresh-render restoration on combined `697219ab`. |
| Compositor kernel | 3,600 main/side-buffer cases exact against release `6dd69003`; compositor source is unchanged. |
| Final right-grip comparison | Final `b823d85f` versus intermediate `697219ab`: 660 comparisons, 600 exact and 60 intentional Stake9 differences. Other nine weapons, kicks and finishers are exact; this does not claim equality to the earlier `6dd69003` finisher palette. |
| Final native runtime | All ten weapons passed actual reload/fire/switch/kick/cache restoration on `b823d85f`; three-aspect right-grip/idle/ammo checks passed. Actual unpaused ultrawide sleeve continuation and native fire frames were visually accepted. |
| Final standard build | Exact tested candidate bytes, all live source modules embedded, unchanged native engine/Village, two idempotent builds and eight invalid-input no-write refusals. |
| Visual audit | 30 actual native-R early/middle/late frames on intermediate `697219ab` reviewed. Subsequent close inspection found the right-grip gap and ultrawide sleeve cutoff; both are corrected and visually checked in final `b823d85f`. |

These checks do not claim universal animation correctness or an FPS gain. Weapon artwork remains articulated textured surfaces with native depth/backing. The execution hands remain their existing procedural geometry; only their glove material changes.

The final combined build is `b823d85f6dd70b4eb795c4e17cde96cc455b3f11e1c44856a70e78444b9f2103`, with viewmodel source `ad2e2482ae2c01865833289dd5143d8ce5a0672ef297271d62d20865e6cf13fb`. Historical `697219ab` checks above retain their original input scope. It also includes independently verified combat cleanup and prologue glass changes; their scope and evidence are documented separately. Native engine and Village bytes are unchanged.

The material regression can be repeated with `node tools/finisher-material-tests.cjs before.html after.html output-directory`; it requires the existing Playwright dependency. Detailed reports are in [verification-data](verification-data/), prefixed `stake-contact-oct25`, `stake-finisher-oct25`, `finisher-oct25` and `polish-oct25`.

[Final ultrawide native reload](stake-contact-oct25/stake-ultrawide.png) shows the existing sleeve continuing beyond the native weapon canvas. Final right-grip reports use the `stake-right-grip-oct25-b823` prefix; their parity baseline is explicitly `697219ab`, not release `6dd69003`.
