# Zombie pain voice selection — October 26

Only the ordinary zombie (`z`) pain event changes. Its dedicated bank uses the existing authored `moan.pain.0.mp3` and `moan.pain.2.mp3` recordings. The three brighter variants, including a strongly periodic high variant, remain in the native shared bank for other creatures. Zombie alert, attack and death, other enemies, gunfire and reload audio retain their existing paths.

The new voice keeps native rate variation, rate-before-selection audio RNG order, gain, 40 ms release, per-emitter throttle and spatial/room routing. A mild 45 Hz high-pass and 2200 Hz low-pass affect only this voice. Two extra decoded mono recordings occupy approximately 151 KiB at 48 kHz. Decode starts at audio initialization; before readiness or after a decode failure, the original native playback is used. Context replacement ignores stale decoding results. End, pause, reset, map change, death, mute, blur and hidden-page cleanup disconnect owned nodes without disconnecting shared mix buses.

## Audition

- [Before: five native pain variants](zombie-audio-oct26/before.wav)
- [After: the two selected variants, repeated](zombie-audio-oct26/after.wav)

These are isolated offline WebAudio renders at the same native zombie base rate (0.92582), gain (0.76634) and release envelope, with no loudness normalization. They exclude the in-game spatial/master/reverb mix and are not recordings of gameplay. The after samples peak at 0.553 and 0.678 with no full-scale samples. This verifies headroom for these isolated examples, not all possible simultaneous combat mixes. Final timbre preference remains a listening judgment.

## Verification and provenance

- Source SHA-256: `bc974fbebcfeb7719ca785ca021af6bf7de465e2f0236b94b0b87f9f4525e7df`.
- Initial private HTML: `5a455752659c038d5aee45fb66d6165f91692b7a36344bfeb7425bc2013e8ffe`, based on released `4b03db10fcf7433e90e2f21e662224d79ce356f3e2bac392ab7ab21cd09c6198`.
- [Private runtime report](verification-data/zombie-audio-oct26-private.json): 14 checks, zero browser errors. Actual held mouse input injured and killed a zombie; custom pain played while native attack/death remained. Native function entry points checked non-z routing, throttle and lifecycle. Context replacement used real AudioContexts; decode failure was deliberately injected. Hidden cleanup was invoked directly, whereas blur used a dispatched browser event.
- [Audition parameters and measurements](verification-data/zombie-audio-oct26-audition.json).
- Reproduce runtime checks with `node tools/zombie-audio-tests.cjs INPUT.html OUTPUT_DIRECTORY`. The runner preserves input bytes and rejects an input contained inside its output tree.

The same 14 checks were subsequently executed with the portable runner on final combined HTML `56394da38ad2dff02bffb5a32900daa40cf7c6cd319be7e6a1b850145e6e376d`: [final routing/lifecycle report](verification-data/zombie-audio-oct26-final.json). All passed with zero browser errors; the report separately records the exact embedded audio source hash and verifies unchanged input bytes. The real held-fire encounter produced the new zombie pain, original attack/death and a normal kill. This final run retains the same native-input versus direct lifecycle-entry limitations described above.
