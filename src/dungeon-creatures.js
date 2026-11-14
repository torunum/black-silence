/* The dungeon warder and carrion hound use the original articulated sprite rigs. */
(() => {
  const leather = 16, brass = 17, shoulder = 18, scar = 19;
  const ramp = (colors, amb, spec = 0) => ({ramp: colors.split(" "), amb, spec});
  const worn = {tex: Hs};
  const skin = {tex: Ue(1.28, .67, -.93)};
  const brindle = {tex: (x,y,z) =>
    Math.sin(39*z+13*y+2*Math.sin(19*y+8*x))*.68+
    Math.sin(83*z-51*y+36*x)*.36};

  iB.palette = m0({
    [an]: ramp("#222421 #32362b #434838 #5a6048 #72765a #919370 #adad86", .37, .09),
    [Wi]: ramp("#151917 #262d23 #343c2c #434b35 #596247 #6f7857", .34),
    [ja]: {ramp: ["#68632c","#807737","#98924c","#b6ae62","#d1c77a"], emissive: true},
    [shoulder]: ramp("#35291c #564126 #77532a #966c36 #b18c4e #d1ab69", .43, .15),
    [leather]: ramp("#211b18 #322620 #463327 #5a4230 #76583c #927450", .36, .12),
    [brass]: ramp("#443325 #6b5033 #917549 #b79963 #d2b986", .42, .21),
    [scar]: ramp("#211915 #32231b #472b21 #633627 #814837 #9a6043", .38)
  });
  iB.palette.smooth = true;
  iB.parts = [...iB.parts.filter(part => part.joint !== "spine"),
    wr("spine", "body", ({b}) => {
      b.ell(0,.19,.0,.505,.474,.37,an,10,skin);
      b.ell(0,.035,-.118,.405,.318,.341,an,10,skin);
      // Separate the two pectorals from the gut, then break the healed central
      // seam with short perpendicular stitches. Every shape follows the spine.
      for (const sign of [-1,1]) {
        b.push();
        b.translate(sign*.157,.387,-.218);
        b.roll(sign*.17);
        b.ell(0,0,0,.232,.15,.193,an,8,skin);
        b.pop();
        b.ell(sign*.23,.27,-.31,.065,.034,.043,Wi,7);
      }
      for (const [x,y,z,rx,ry] of [
        [-.018,.305,-.392,.018,.065],[-.005,.203,-.419,.020,.054],
        [.012,.117,-.448,.025,.061],[.006,.032,-.457,.019,.052],
        [-.013,-.046,-.443,.017,.043]]) {
        b.ell(x,y,z,rx,ry,.015,scar,7);
        b.ell(x+.015,y+.01,z-.003,.038,.008,.009,leather,6);
      }
    }),
    wr("spine", "body", ({b,x}) => {
      const burst = x("burst");
      if (burst > .02) {
        b.ell(.008,.09,-.453,.017+burst*.061,.101+burst*.035,.019,scar,7);
        b.ell(.006,.095,-.472,.008+burst*.016,.05,.011,ja,6);
      }
      // A belt sits below the abdomen, with two unequal strips of old hide.
      b.prz([[-.41,-.11],[-.14,-.16],[.13,-.15],[.42,-.09],
        [.37,-.21],[.13,-.25],[-.15,-.25],[-.39,-.21]], -.462, -.396, leather, worn);
      b.prz([[-.27,-.22],[-.04,-.24],[-.064,-.53],[-.14,-.46],[-.24,-.53]], -.44, -.37, leather, worn);
      b.prz([[.0,-.23],[.20,-.21],[.17,-.42],[.10,-.47],[.02,-.41]], -.445, -.38, leather, worn);
      b.cbox(-.075,-.232,-.48,.061,-.13,-.453,.014,brass);
      b.box(-.045,-.21,-.487,.033,-.154,-.477,leather);
    }),
    wr("head", "head", ({b}) => {
      b.prz([[-.153,.167],[-.052,.153],[-.015,.134],[-.057,.144],[-.14,.145]],
        -.147,-.125,Wi);
      b.prz([[.015,.134],[.052,.153],[.153,.167],[.14,.145],[.057,.144]],
        -.147,-.125,Wi);
      b.prz([[-.028,.14],[.021,.14],[.035,.079],[-.012,.065],[-.038,.084]],
        -.153,-.13,an);
      b.ell(0,.194,-.014,.154,.091,.123,an,8,skin);
      // A single dark visor socket anchors two small eye points under the brow.
      b.cbox(-.117,.092,-.151,.117,.145,-.132,.012,Q.CAVITY);
      for (const sign of [-1,1]) {
        b.ell(sign*.072,.12,-.153,.017,.014,.011,ja,7);
        b.ell(sign*.041,.055,-.142,.014,.017,.010,Q.TOOTH,6);
      }
    })
  ];
  for (const [side, sign, group] of [["L",-1,"lArm"],["R",1,"rArm"]]) {
    iB.parts.push(
      wr("shoulder" + side, group, ({b}) => {
        b.ell(sign*.038,.015,-.039,.157,.161,.142,shoulder,9,skin);
        b.ball(sign*.093,.067,-.145,.044,shoulder,6);
        b.ball(sign*.017,.112,-.118,.035,brass,6);
        b.ball(sign*.127,-.013,-.118,.039,shoulder,6);
        G(b,0,0,-.13,-.17,.124,.116,leather,8,worn);
      }),
      wr("elbow" + side, group, ({b}) => {
        G(b,0,0,-.11,-.215,.099,.089,leather,8,worn);
        G(b,0,0,-.13,-.152,.104,.101,shoulder,8);
      }), wr("wrist" + side, group, ({b}) => {
        // Three bent knuckles outside the old clenched fist are readable in idle.
        for (const [x,y,z] of [[-.05,-.141,-.064],[.001,-.155,-.073],[.048,-.135,-.071]])
          b.ell(x,y,z,.029,.055,.028,an,7,skin);
      }),
      wr("ankle" + side, "legs", ({b}) => {
        b.cbox(-.087,-.047,-.20,.087,.054,.048,.031,leather,worn);
        b.cbox(-.073,.020,-.075,.073,.097,.043,.021,leather);
      })
    );
  }

  AO.palette = m0({
    [Fo]: ramp("#201813 #33261d #493225 #67452d #8a5e3b #a4774f #bb936a", .40, .10),
    [k2]: ramp("#171615 #25211c #373026 #4a3d2e #655039 #856e50", .38, .07),
    [ca]: ramp("#2c1e18 #432e21 #61402c #80523a #9c6c48 #b5835d", .36, .14),
    [Gs]: ramp("#483d30 #70614b #93836a #b6a788 #d3c7a8 #f0e3c3", .45, .14),
    [nl]: {ramp: ["#46211b","#693427","#874737","#ad6848","#d39462"], emissive: true},
    [Q.SINEW]: ramp("#35251d #503728 #71503b #927054 #b58b67", .4),
    [leather]: ramp("#25221e #403127 #5e4634 #806047 #a37c55 #ba9872", .4, .08)
  });
  AO.palette.smooth = true;
  // This lean chest keeps the ivory on the spine. The ribcage carries a broken
  // brindle coat; short slanted planes follow the shoulder rather than the camera.
  AO.parts = AO.parts.filter(part => !["chest","pelvis","spine","neck","head","jaw","tail2"].includes(part.joint));
  AO.parts.push(Sr("chest","body",({b}) => {
    b.ell(0,-.038,-.003,.186,.245,.289,Fo,10,brindle);
    b.ell(0,-.112,-.102,.14,.177,.185,k2,9,brindle);
    for (const side of [-1,1]) {
      b.ell(side*.121,.037,-.122,.084,.162,.18,ca,9,brindle);
      for (const [z,y,depth] of [[-.025,-.019,.14],[.067,-.025,.156],[.145,-.006,.125]]) {
        b.push();
        b.translate(side*(.168-z*.13),y,z);
        b.pitch(-.29);
        b.ell(0,0,0,.026,depth,.024,leather,8,brindle);
        b.pop();
      }
    }
    for (let i=0;i<5;i++) u1(b,0,.19,-.20+i*.09,.14-i*.012,.028);
  }),Sr("pelvis","body",({b}) => {
    b.ell(0,-.014,0,.183,.212,.224,Fo,10,brindle);
    for (const sign of [-1,1]) b.ell(sign*.116,-.06,.048,.086,.146,.128,Fo,8,brindle);
    for (let i=0;i<3;i++) u1(b,0,.139,-.098+i*.076,.084-i*.016,.022);
  }),Sr("spine","body",({b}) => {
    b.ell(0,-.02,.158,.158,.177,.236,Fo,9,brindle);
    b.ell(0,-.078,.17,.113,.123,.191,k2,8,brindle);
    for (let i=0;i<4;i++) u1(b,0,.134,.032+i*.077,.104-i*.008,.021);
  }),Sr("tail2","body",({b}) => {
    b.cyl(0,0,0,.26,.042,.012,7,Fo,brindle);
  }),Sr("neck","body",({b}) => {
    b.ell(0,.12,.0,.137,.216,.159,Fo,9,brindle);
    b.ell(0,.165,-.044,.105,.169,.124,k2,8,brindle);
    for(let i=0;i<3;i++) u1(b,0,.077+i*.07,.105,.090-i*.009,.021);
  }),Sr("head","head",({b}) => {
    b.ell(0,.084,-.058,.122,.128,.163,k2,10,brindle);
    b.ell(0,.058,-.217,.101,.080,.159,k2,9,brindle);
    b.ell(0,.045,-.333,.083,.067,.12,k2,9,brindle);
    b.ell(0,.051,-.419,.064,.046,.052,Q.CAVITY,8);
    for (const side of [-1,1]) {
      b.ell(side*.085,.095,-.13,.032,.035,.055,Q.OUT,8);
      b.ell(side*.107,.103,-.151,.018,.016,.014,Gs,7);
      b.ell(side*.075,.14,-.109,.036,.03,.077,k2,8);
      b.ell(side*.079,.154,.035,.055,.042,.079,k2,8);
      for (const [z,size] of [[.189,.032],[.237,.026],[.286,.032],[.355,.063]])
        G(b,side*.057,-z,-.004,-.004-size,.019,.004,Gs,5);
    }
  }),Sr("jaw","head",({b}) => {
    b.ell(0,-.032,-.147,.059,.041,.157,k2,9,brindle);
    b.ell(0,-.014,-.138,.049,.017,.127,ca,7);
    for(const side of [-1,1]) for(const z of [.156,.211,.264])
      G(b,side*.043,-z,-.021,.010,.014,.004,Gs,5);
  }));
  for (const [side,group] of [["L","lArm"],["R","rArm"]]) {
    for (const [joint,mask] of [["wrist"+side,group],["ankle"+side,"legs"]]) {
      AO.parts.push(Sr(joint,mask,({b}) => {
        b.cbox(-.047,-.059,-.138,.047,.032,.050,.021,k2,{tex:si});
        for (const x of [-.03,0,.03])
          b.cyl(x,-.035,-.15,-.09,.013,.020,5,leather);
      }));
    }
  }

  // Keep the attack slots and engine timing. The warder lifts one shoulder to
  // inhale; the hound puts its weight onto its hind legs before springing.
  iB.poses = {...iB.poses, atk: [
    W0({spine:[-.16,.05,-.05],chest:[-.20,-.13,-.09],neck:[-.28,.08,0],
      head:[-.48,.13,.05],jaw:.68,bile:.64,aL:{f:.73,out:.60,e:.85},
      aR:{f:.22,out:.66,e:.35},lL:{f:.18,k:.35,out:.16},lR:{f:-.12,k:.28,out:.16},root:[0,0,.07]}),
    ...iB.poses.atk.slice(1)
  ]};
  const idle = AO.poses.idle;
  AO.poses = {...AO.poses, idle: {...idle,rot:{...idle.rot,jaw:[.22,0,0]}}, atk: [
    tn({pelvis:[-.19,0,-.03],spine:[.14,.04,0],chest:[.39,-.10,-.03],
      neck:[.52,.08,0],head:[-.73,.05,.02],jaw:.29,tail:[-.32,.08,.23,.10],
      fL:{f:.78,k:.93},fR:{f:.55,k:.73},hL:{f:.98,k:1.52},hR:{f:.91,k:1.47},
      root:[0,0,.12],x:{drool:.68}}),
    ...AO.poses.atk.slice(1)
  ]};

  // Mark authored Canvas pixels before the GPU upload. Decorating cache writes
  // also handles lazy mirrored, masked, death, and detached limb frames, with
  // no work when a previously baked frame is sampled again.
  function markTexture(texture) {
    texture.colorSpace = "srgb";
    texture.needsUpdate = true;
  }
  const buildSprites = iz;
  iz = function(rig) {
    const sprites = buildSprites(rig);
    if (rig !== iB && rig !== AO) return sprites;
    const cache = sprites.rig;
    for (const texture of cache.all()) markTexture(texture);
    cache.frames.set = function(key, texture) {
      markTexture(texture);
      return Map.prototype.set.call(this, key, texture);
    };
    cache.bitmaps.set = function(key, bitmap) {
      markTexture(bitmap.tex);
      return Map.prototype.set.call(this, key, bitmap);
    };
    return sprites;
  };
})();
