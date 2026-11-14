// The two-headed carrier and the brown, red-eyed brute share this ground-pound.
// Their native 0.48 s scheduler and damage radius live in qtt. Each pose here
// is baked by the existing software sprite renderer with the current limb mask.
(() => {
  const slamPoses = [
    // Feet apart, elbows wide, hips dropping under the weight.
    Bi({
      spine: [.30, .06, -.04], chest: [.22, -.12, .03], head: [-.31, .06, 0],
      aL: { f: .08, out: .58, e: 1.22 }, aR: { f: .18, out: .70, e: 1.14 },
      lL: { f: .82, k: 1.35, out: .15 }, lR: { f: .65, k: 1.13, out: .19 },
      jaw: .60, sway: -.4, tilt: .35,
    }),
    // Keep a gap between the face and the two raised hands at sprite resolution.
    Bi({
      spine: [-.03, .06, -.03], chest: [-.10, -.05, .06], head: [.08, 0, 0],
      aL: { f: 2.60, out: .53, e: .70 }, aR: { f: 2.41, out: .70, e: .78 },
      lL: { f: .42, k: .76, out: .15 }, lR: { f: .34, k: .60, out: .19 },
      jaw: .82, sway: -.8, tilt: .85,
    }),
    // Lead with one shoulder so the downward arc reads from the front.
    Bi({
      spine: [.61, .04, .05], chest: [.42, -.12, -.11], head: [-.48, .10, .05],
      aL: { f: .57, out: .24, e: .08 }, aR: { f: .46, out: .28, e: .10 },
      lL: { f: 1.20, k: 1.83, out: .18 }, lR: { f: 1.06, k: 1.57, out: .20 },
      jaw: .63, sway: 1, tilt: -.6,
    }),
    Bi({
      spine: [.30, -.06, .05], chest: [.22, .13, -.02], head: [-.30, -.08, 0],
      aL: { f: .31, out: .37, e: .38 }, aR: { f: .22, out: .22, e: .60 },
      lL: { f: .68, k: 1.20, out: .16 }, lR: { f: .48, k: .86, out: .19 },
      jaw: .40, sway: .35, tilt: -.3,
    }),
  ];
  Z7.poses.slam = slamPoses;

  // Keep the mace head and knuckles inside their frames throughout the arc.
  // The native atlas has space only for the actor at rest. Added transparent
  // margins are undone by the sprite's presentation scale and floor alignment.
  const pad = 48;
  const slamRigs = new WeakMap();
  function slamTexture(native, frame, mask, mirror) {
    let atlas = slamRigs.get(native);
    if (!atlas) {
      const source = native.rig, old = source.frame;
      const height = old.h + pad * 2;
      const padded = { ...old, w:old.w+pad*2, h:height,
        worldH:old.worldH*height/old.h, floor:(old.h*old.floor+pad)/height };
      atlas = new nz({ ...source, frame:padded });
      slamRigs.set(native, atlas);
    }
    return atlas.tex("slam",frame,mask,mirror);
  }
  function register(actor) {
    const native = actor.rig;
    const getTexture = native.tex;
    native.tex = function (action, frame, mask = 0, mirror = false) {
      const texture = action === "slam" ? slamTexture(this,frame,mask,mirror)
        : getTexture.call(this,action,frame,mask,mirror);
      // This new palette is authored in display sRGB. Declare its color space
      // so the renderer doesn't brighten the face and gray out the red eyes.
      if (this.rig.key === "B" && texture.colorSpace !== "srgb") {
        texture.colorSpace = "srgb";
        texture.needsUpdate = true;
      }
      return texture;
    };
  }

  // B originally has a fourteen-by-twelve, brown sprite with two red eyes,
  // square shoulders and fists reaching its knees. Keep those landmarks in
  // the same native joint space as the two-headed actor, with its own meshes.
  const hide = tt, belly = tt + 1, ridge = tt + 2, iron = tt + 3, eye = tt + 4;
  const palette = m0({
    [hide]: { ramp: ["#170f10","#251a19","#382720","#4d362a","#694a35","#876448","#ac8966"], amb: .41, spec: .18 },
    [belly]: { ramp: ["#100c12","#1b1419","#302025","#42302d","#584239","#735945"], amb: .34, spec: .16 },
    [ridge]: { ramp: ["#322422","#4c362c","#674d3c","#886b50","#aa8c6b"], amb: .5, spec: .26 },
    [iron]: { ramp: ["#141416","#292629","#413b39","#5c534a","#827665","#a6977e"], amb: .45, spec: .7 },
    [eye]: { ramp: ["#a20d08","#fb2a10","#ff6030"], emissive: true },
  });
  const grain = Ue(.78, .95, -1.12);
  const rough = { tex: grain };
  const part = (joint, group, draw) => ({ joint, group, draw: ({ b }) => draw(b) });
  const parts = [
    part("pelvis", "body", b => {
      b.cbox(-.38,-.16,-.22,.38,.16,.22,.09,belly,rough);
      b.cbox(-.39,-.04,-.23,.39,.05,.23,.035,iron);
      b.cbox(-.08,-.07,-.26,.07,.07,-.22,.02,ridge);
    }),
    part("spine", "body", b => {
      b.cbox(-.36,-.12,-.25,.36,.37,.22,.11,belly,rough);
      for (const y of [.02,.14,.25]) b.cbox(-.21,y,-.27,.23,y+.06,-.19,.028,hide,rough);
    }),
    part("chest", "body", b => {
      b.cbox(-.51,-.08,-.27,.51,.34,.23,.12,hide,rough);
      for (const side of [-1,1]) {
        const x = side * .24;
        b.cbox(x-.18,.03,-.32,x+.18,.28,-.18,.07,hide,rough);
        b.ball(side*.47,.25,.015,.225,hide,7,rough);
        b.cbox(x-.13,.25,-.26,x+.12,.32,-.14,.024,ridge);
      }
    }),
    part("neck", "body", b => G(b,0,0,-.09,.11,.19,.17,belly,7,rough)),
    part("head", "head", b => {
      b.cbox(-.26,-.095,-.22,.26,.25,.19,.07,hide,rough);
      b.cbox(-.225,-.04,-.26,.225,.107,-.19,.025,Q.CAVITY);
      for (const side of [-1,1]) {
        const x = side * .125;
        b.cbox(x-.054,.019,-.277,x+.054,.078,-.255,.009,eye);
        b.cbox(x-.09,.085,-.29,x+.09,.145,-.20,.018,ridge,rough);
      }
      b.cbox(-.055,-.047,-.302,.055,.08,-.23,.018,hide);
    }),
    part("jaw", "head", b => {
      b.cbox(-.185,-.14,-.22,.185,-.052,-.02,.025,belly,rough);
      b.cbox(-.14,-.11,-.234,.14,-.083,-.204,.008,Q.CAVITY);
      for (const x of [-.132,.132]) b.cbox(x-.015,-.099,-.242,x+.015,-.049,-.215,.006,Q.TOOTH);
    }),
  ];
  const arm = {
    joint: .145,
    upper: { r0: .177, r1: .121, mat: hide, tex: grain,
      deco: ({ b }, length) => G(b,0,0,-length*.81,-length*.98,.132,.119,belly,7) },
    fore: { r0: .137, r1: .163, mat: hide, tex: grain,
      deco: ({ b }, length) => G(b,0,0,-length*.74,-length*.93,.170,.172,iron,8) },
    hand: ({ b }, side) => {
      b.cbox(-.154,-.22,-.143,.154,.034,.12,.045,hide,rough);
      for (const x of [-.092,0,.092]) b.ball(x,-.143,-.13,.057,ridge,5,rough);
      b.ball(-side*.118,-.059,-.067,.067,belly,6);
    },
  };
  const leg = {
    joint: .12,
    upper: { r0: .175, r1: .13, mat: belly, tex: grain },
    lower: { r0: .136, r1: .10, mat: hide, tex: grain },
    foot: ({ b }) => b.cbox(-.138,-.055,-.222,.138,.081,.102,.043,belly,rough),
  };
  const rig = {
    ...Z7, key: "B", palette, frame: { ...Z7.frame, yaw: .24 },
    parts: [...parts, ...qe(_l,"lArm",arm), ...qe(_l,"rArm",arm),
      ...H0(_l,"L",leg), ...H0(_l,"R",leg)],
    walkStep: .16,
  };
  // Let the native sprite initializer consume its usual random stream. Install
  // the render rig afterwards and retain the original hit-region definition.
  const createSprites = rz;
  rz = function () {
    createSprites();
    const flat = Ze.B;
    rig.regions = flat.regions;
    Ze.B = iz(rig);
    register(Ze.n);
    register(Ze.B);
    Ze.B.rig.tex("idle",0);
    for (const value of new Set(Object.values(flat))) {
      if (value?.isTexture) value.dispose();
    }
  };
  // The broad coal store can fit the brute and gives the player room to
  // retreat. The Factory's other two carriers and its boss stay at their sites.
  const factory = gV[6].build;
  gV[6].build = function (...args) {
    const map = factory.apply(this,args);
    if (map.g[4][38] === "n") map.g[4][38] = "B";
    return map;
  };
})();
