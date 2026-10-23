# Weapon reference assets

Generated with the built-in `image_gen` tool using `imagegen` skill. No external asset download or CLI/API fallback. The original user-selected art reference is `../hand-reference/original-target.png`.

- `forged-charcoal-v1.png`: seamless aged charcoal steel material reference. A 128×128 luminance derivative is embedded in `src/viewmodels.js` and sampled in model-local coordinates. Native material lighting and depth stay active.
- `skull-relief-v1.png`: transparent frontal horned ivory skull derived from the reference. Embedded RGBA, rendered on the native weapon rig above a physical relief backing, with native depth occlusion. This is a painted relief surface, not a fully modeled anatomical skull.
- `shotgun-target-v1.png`: concept target screenshot, not a gameplay capture. Reference for shorter double barrels, brass chamber collars, fitted lock plates, walnut fore-end and external hammers.
- `pistol-barrel-rgb-v1.png`: full-color reference-derived metal, deep amber vents and brass collar. Wrapped onto articulated curved barrel faces; its original color bypasses the native 32-material palette.
- `shotgun-lockplate-v1.png`: transparent engraved ivory/brass sideplate. Mounted outside the native chamber tangent so the barrel cannot erase the skull. Transparent margins are cropped in UV, with separate UV bands enlarging the centerpiece. A 256-pixel runtime prefilter keeps fine engraving stable at game resolution.
- `clean-blued-steel-v1.png`: quiet dark steel for the shotgun's cylindrical surfaces. Replaces coarse speckled metal on this weapon; curved mesh strips supply narrow highlights. Runtime prefilter is 512 pixels; the source PNG is unmodified.
- `../hand-reference/glove-double-load-v1.png`: transparent left glove with two adjacent grip channels for the two native shotgun shells. Channels match the unchanged shell spacing; a small UV mesh tapers the palm/forearm. Reload transfer still occurs at phase `.59`.

All PNGs are embedded in the local HTML by the existing viewmodel build path. No external image request is required. The accepted hands and pistol remain on their original decoder path; the small plate and clean tube surface alone use runtime prefiltering.

Final generation prompts:

**Steel:** A seamless square albedo tile of the reference gun's warm near-black charcoal forged metal; evenly lit, flat orthographic surface, subtle broad hammered planes, tiny irregular pitting, rubbed warm gray high points and sparse oxidized bronze scratches. Dense painterly pixel-friendly detail. No green/teal, objects, borders or text.

**Skull:** Isolate/recreate only the horned ivory skull on the reference gun as a centered straight-on orthographic frontal relief on transparency. Long narrow human skull, recessed dark eyes with tiny amber pupils, raised cheekbones, triangular nose, long upper teeth and continuous narrow jaw, compact curved lateral horns. Warm aged ivory, brown cracks, carved relief and upper-left illumination. No weapon, backing, hands, environment, labels or watermark.

**Shotgun target:** Edit only the shotgun in the current gameplay screenshot using the original reference's quality/material/style and approved glove. Functional short side-by-side break-action shotgun in rear-right first-person 3/4 view: sculpted compact receiver, two separate thick short barrels, scalloped breech, two external hammers, narrow aged brass chamber collars, fitted screws, recessed openings, carved walnut fore-end, small bone receiver relief. Keep environment, HUD and leather hands. No green metal, neon, oversized horns, extra hands or guns.

**Shotgun plate:** Extract/recreate the reference's pale aged ivory and worn brass lock plate as a straight-on orthographic horizontal 2:1 transparent asset. Small human skull relief at center-right, etched scrollwork, fitted screws, cream bone inset, thin worn brass bevel and dark recessed edges. Muzzle at left, grip at right; compact asymmetric rounded trapezoid. No gun, hand, background or text.

**Clean blued steel:** Square tileable albedo of the target shotgun's clean dark blued steel, flat and evenly lit, nearly black warm charcoal-gray polished surface with subtle long soft gray variation and very sparse fine longitudinal wear scratches. No baked object, borders, bright flecks, coarse pitting, stone texture, gold dust, rust patches or text. Broad quiet material for runtime cylindrical lighting.

**Double loading glove:** Reference-matched dark brown leather left glove and diagonal lower-left forearm on transparency, palm/fingers shaped to hold two adjacent parallel shotgun shells. Two clear adjacent grip channels, thumb spanning both, index outside and middle digit between; no rendered cartridges, weapon or background. Leather, seams, cuff and brass button match the approved single-loading glove.
