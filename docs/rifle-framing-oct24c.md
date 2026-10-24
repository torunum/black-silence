# Combat Rifle reload framing — independent QA

An audit of actual R-key reloads on release `9cecdb74` found that the Combat Rifle's support hand and extracted magazine moved almost entirely below the visible frame. The accepted change raises the complete reload assembly using the existing smooth envelope and shortens the shared magazine/hand extraction from 0.108 to 0.065 model units. The shared transform preserves their relative contact. Idle placement, models, reload duration, ammunition and the other weapons are unchanged by this scoped edit.

Independent functional verification tested candidate SHA-256 `d5a41a6872cb7b58f0e7f4b95c58e55d466f520070a64adfa2cf66cc1df564df` with the actual R key and native RAF/presentation. Inventory was initialized through the QA seam; each screenshot paused the current native pose without overriding its transform.

- 18 captures: six reload phases at 1024×768, 1280×720 and 1680×720.
- All three reloads completed with 24 rounds loaded and 76 in reserve from a total of 100.
- Native tilt was observed in the middle phases and returned to zero at idle. Projected model anchors remained finite; no page errors occurred.
- Visual inspection confirmed that the support hand remains visible during extraction, the extracted assembly clears the magazine well, and seating/late recovery retains contact. The magazine's lower end can still approach the bottom of the frame; this is a targeted framing improvement, not a redesigned reload.

The [exact candidate report](verification-data/rifle-framing-oct24c-d5a41a68.json) records the actual sampled phases, native pose fields and ammunition endpoints. It is evidence for that private candidate, not a test attributed to a subsequently rebuilt release hash. Final combined-build tests are recorded separately. These functional captures are not performance benchmarks, and no rejected renderer optimization is part of this change.
