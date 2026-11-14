// The cartridges and case share one transparent, camera-facing pickup sprite.
// Those items continue to use the native placement, bob, size and collection code.
(() => {
  const rows = [
    "                                ",
    "                                ",
    "                                ",
    "                                ",
    "                                ",
    "     csvgooiogoogo              ",
    "   hcllssgoooooooooooioioo      ",
    "  cooooogovgovvvggoooooooooout  ",
    "   kdddiioiiiiiiioovoggvvutddt  ",
    "   dkkkkkkkkkdddiioooiooutdddd  ",
    "   okkdbdkubkkobkkkbkdioutdkdd  ",
    "  likdtabduabtuabuoabsdkkkkddd  ",
    "  vooggogosaaasutotdtuddkddddd  ",
    "  osioooiiotahbtooogoggvstdddd  ",
    "  iddiiiidbbbbtdiiiooooouddddd  ",
    "  giiioiioabutddiiidddttoddddd  ",
    "  giiiiiilbbbbdiiiiiooiitddddd  ",
    "  oigiiiiiddtdiiioioiiiitddddd  ",
    "  oiiiiiiidigslisgisiiiotddddd  ",
    "  oiiiooiiissvsslisiiiiotddddd  ",
    "  oiiooiiigsvlovoiviiiiotddddd  ",
    "  oudiiiiisovvosiiiioogotddddd  ",
    "  voioggoiiiiiiiiiiovggotdddkk  ",
    "  iiiiiiiioiooooioooiiidtddk    ",
    "  dddddiidddiiodiidiiiooodk     ",
    "              kddddddddidk      ",
    "                                ",
    "                                ",
    "                                ",
    "                                ",
    "                                ",
    "                                "
  ];
  const paint = {
    k: "#171715",
    d: "#25281f",
    i: "#363a2b",
    o: "#484b35",
    g: "#5b5c40",
    s: "#777552",
    l: "#918567",
    t: "#423320",
    u: "#765433",
    b: "#a78249",
    a: "#cb9d59",
    h: "#e2bb76",
    v: "#635c47",
    c: "#a18f70"
  };
  const nativePickupArt = Z$;
  Z$ = function() {
    nativePickupArt();
    const tin = Jn(rows, paint);
    tin.colorSpace = "srgb";
    f0.bullets.dispose();
    f0.bullets = tin;
  };
})();
