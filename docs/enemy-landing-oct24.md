# Surviving-enemy landing reaction — 24 October

The existing throw could finish at a visible 30-degree roll and switch straight to upright idle on the next frame. The flight branch also retained whichever walking or idle texture preceded the launch. This change uses the existing native pain/reeling frames while a living enemy is airborne and gives ground contact a 0.32-second visual recovery. The remaining roll settles along its shortest angle over 0.14 seconds; body weight adds at most 4 cm of sprite offset (1.8 cm for crawlers). This is not extra stun or a new physical knockdown.

Only `src/enemy-animation.js` changes gameplay presentation. Damage, health, stagger probability, hitboxes, launch trajectory, collision, AI timers and impact sounds stay unchanged. Native attack windup/contact and stagger cues take precedence. Corpses, bosses and finishers keep their own animation. Recovery expires on game time, clears on death/reset, and releases its texture even when a distant actor's native rig update is skipped.

Frozen source SHA-256: `5dbcfaf8908f8bde69d7c1625bce9ef163e874aab3ff22ded58d08040f1cec54`.
Private candidate SHA-256: `011c6789104a8db4d99ea7e6c604ea626d21c239db0e61f65ee6d8dce815258e`.
Baseline: release `41f9646703cce0a5da5b6b063df10bf60de84c9c821ffb5f65255ce0a6443448`.

Validation passed:

- 27 enemy-animation checks, including urgent attack anticipation/contact, stagger priority, zero-time recovery, repeat hits, distant texture release, death and reset.
- 35 existing combat checks, including natural weapon-to-stagger-to-finisher flows.
- 76 wall/height/death collision cases and three actual RAF cases; the surviving actor resumed movement and attacks, and both corpse cases grounded normally.
- Ten identical fixed-step samples preserved enemy x/z, floor, height, HP, stun and flight timers exactly. The final resting sprite height/rotation also matched baseline.
- Actual Shift+W and right-click input launched and landed the enemy in both builds. Both left the normal zombie at 10 HP after the native wall impact; neither produced runtime errors.

The four images in `enemy-landing-oct24/` compare identical controlled scene/timing. They use native enemy updates with a deliberately initialized flight; they are not captures of live input. `native-sprint-dropkick.webm` and the separate live traces record actual input and RAF. Reports and exact provenance are under `verification-data/enemy-landing-oct24-*.json` and `enemy-landing-oct24/provenance.json`. Timings from functional captures are not performance benchmarks.

Reproduce on a chosen candidate with `GAME_HTML` set, then run `tools/enemy-animation-tests.cjs`, `tools/combat-tests.cjs`, and `tools/wall-impact-tests.cjs`. Proof runners accept HTML and output directory: `tools/enemy-landing-capture.cjs` and `tools/enemy-landing-live-test.cjs`.

Both portable proof runners were subsequently executed successfully on combined build `791b9d33e267ccdd78346c772e2860927fdb2ec324a472da5afa40eaf80efe42`; their reports identify that exact input. They assert finite/error-free state and the live runner asserts actual launch and living landing. Six lexical/case/junction-alias refusal cases verified that inputs cannot be overwritten by output artifacts; successful runs verify input hashes afterward. These are combined enemy smoke checks, not certification of a later viewmodel revision.
