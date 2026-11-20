/* FACTORY_FOREMAN_BEGIN */
// Art and animation for the Factory's existing furnace construct.
(() => {
  const steel = ho, dark = qh, carcass = zs, copper = ru, oxide = su, soot = Qs;
  const coreWarm = 16, coreHot = 17, furnaceEdge = 18, eyeLight = 19, castEdge = 20;
  const shades = (colors, amb, spec = 0) => ({ ramp: colors.split(" "), amb, spec });
  const forgePalette = m0({
    [carcass]: shades("#12110f #201e19 #2e2b25 #3a3731 #49443a #5a5144 #6b5f4e", .36, .13),
    [steel]: shades("#161614 #23221f #34322d #45413a #59534a #6e6454 #887965", .38, .22),
    [dark]: shades("#111110 #191817 #23211f #302c27 #403a33 #534b41 #695e4f", .33, .12),
    [copper]: shades("#1f120a #372217 #513323 #744b30 #9a6d44 #bd8d5b #d2ae7b", .49, .28),
    [oxide]: shades("#17100d #322017 #4f3020 #653f27 #865335 #a36c45", .43, .12),
    [soot]: shades("#070606 #0d0a08 #17120e #211a14", .51),
    [pi]: { ramp: ["#672107", "#a63509", "#e55313", "#ff8622", "#ffbe50"], emissive: true },
    [coreWarm]: { ramp: ["#351008", "#56200a", "#71280b", "#92340d", "#b0440e"], emissive: true },
    [coreHot]: { ramp: ["#a63108", "#b4400b", "#d45912", "#e96c20", "#ff913c"], emissive: true },
    [furnaceEdge]: shades("#2a190c #482a15 #634126 #865537 #a37358 #c0936b", .52, .3),
    [eyeLight]: { ramp: ["#bc4b0c", "#dd6916", "#f98a24", "#ffa632"], emissive: true },
    [castEdge]: shades("#22201d #2b2823 #3a372f #50493d #666054 #7d7362 #938673", .40, .25),
  });

  const grain = (x, y, z) => Math.sin(x * 89 + z * 41 + Math.sin(y * 67) * 2) * .13 +
    Math.sin(y * 109 - z * 71) * .12 - (Math.cos(x * 158 + z * 72) > .98 ? .52 : 0);
  const beaten = { tex: grain };
  const rivet = (b, x, y, z, r = .020) => b.ball(x, y, z, r, copper, 5);

  function draftStack(b, side, pressure, ruptured) {
    b.push();
    b.translate(side * .18, .335, .142);
    b.roll(side * (ruptured ? .085 : .036));
    G(b, 0, 0, -.04, .61, .073, .065, dark, 8, beaten);
    for (const y of [.105, .385, .583]) G(b, 0, 0, y, y + .036, .079, .082, y === .385 ? copper : steel, 8, beaten);
    G(b, 0, 0, .617, .624, .054, .054, soot, 8);
    if (pressure > .6) G(b, 0, 0, .625, .631, .036, .038, coreWarm, 7);
    b.pop();
  }

  function furnace(b, x, ruptured) {
    const open = Math.min(1, x("draft") + (ruptured ? .34 : .15));
    const pressure = x("pressure");
    const hot = pressure > .57 || ruptured;
    b.cbox(-.205, .051, -.311, .205, .363, -.161, .027, steel, beaten);
    b.cbox(-.171, .077, -.325, .171, .337, -.305, .013, soot);
    // The lit faces sit behind the black pivot rails, which open in sequence.
    const halfWidth = .014 + open * .012;
    for (const [index, center] of [-.110,-.037,.037,.110].entries()) {
      const base = index === 0 || index === 3 ? .117 : .106;
      const top = index === 0 || index === 3 ? .300 : .313;
      b.box(center-halfWidth, base, -.331, center+halfWidth, top, -.329, hot ? coreHot : coreWarm);
      if (pressure > .80 && (index === 1 || index === 2))
        b.box(center-.009, base+.023, -.334, center+.009, base+.069, -.330, pi);
    }
    for (const [index, center] of [-.075,0,.075].entries()) {
      b.push();
      b.translate(center, .210, -.351);
      b.yaw(-.10 + Math.max(0, open - index*.05) * .65);
      b.cbox(-.012, -.107, -.014, .012, .105, .011, .004, dark);
      b.pop();
    }
    for (const side of [-1, 1]) {
      b.cbox(side * .178 - .015, .094, -.365, side * .178 + .015, .326, -.302, .009, oxide, beaten);
      for (const y of [.096, .325]) rivet(b, side * .173, y, -.368, .012);
    }
    b.cbox(-.189, .060, -.360, .189, .102, -.312, .009, dark, beaten);
    b.cbox(-.191, .318, -.364, .191, .352, -.312, .011, castEdge, beaten);
    if (!ruptured) return;

    // The native wider form has displaced iron and two narrow ember seams.
    b.prz([[-.315,.341],[-.252,.356],[-.195,.326],[-.201,.270],[-.228,.283],[-.265,.321]],
      -.257, -.229, oxide, beaten);
    b.prz([[-.298,.330],[-.266,.342],[-.219,.314],[-.207,.283],[-.227,.303],[-.263,.331]],
      -.264, -.258, pressure > .66 ? coreHot : coreWarm);
    b.prz([[.193,.140],[.223,.159],[.245,.139],[.298,.147],[.255,.125],[.224,.136],[.204,.125]],
      -.268, -.260, coreWarm);
  }

  function chest({ b, x }, ruptured) {
    b.cbox(-.390, -.022, -.185, .390, .407, .204, .083, carcass, beaten);
    b.prz([[-.374,.356],[-.297,.411],[.302,.411],[.369,.348],[.274,.318],[-.299,.319]],
      -.219, -.158, steel, beaten);
    for (const s of [-1,1]) {
      b.cbox(s * .292 - .05, .064, -.237, s * .292 + .05, .347, -.163, .027, dark, beaten);
      b.cbox(s * .288 - .029, .087, -.253, s * .288 + .029, .323, -.218, .014, steel, beaten);
      for (const y of [.102, .305]) rivet(b, s * .299, y, -.263, .017);
      b.push();
      b.translate(s * .246, .30, -.160);
      b.roll(s * .17);
      G(b, 0, 0, -.21, .105, .027, .029, copper, 7, beaten);
      G(b, 0, 0, .021, .055, .035, .035, soot, 7);
      b.pop();
      draftStack(b, s, x("pressure"), ruptured);
    }
    furnace(b, x, ruptured);
  }

  function helmet({ b }, ruptured) {
    const mask = [[-.137,-.036],[.137,-.036],[.162,.034],[.153,.231],[.098,.275],
      [-.098,.275],[-.153,.231],[-.162,.034]];
    b.ell(0, .112, .007, .160, .161, .151, dark, 9, beaten);
    b.prz(mask, -.166, .122, steel, { ...beaten, r1: .91 });
    b.cbox(-.136, .097, -.203, .136, .179, -.168, .014, soot);
    b.cbox(-.145, .174, -.215, .145, .204, -.169, .009, castEdge, beaten);
    b.cbox(-.145, .081, -.207, .145, .104, -.170, .008, steel, beaten);
    for (const s of [-1,1]) {
      b.box(s*.065-.024, .125, -.217, s*.065+.024, .153, -.207, eyeLight);
      rivet(b, s * .114, .202, -.177, .015);
      rivet(b, s * .117, .004, -.174, .012);
    }
    b.prz([[-.106,.068],[.106,.068],[.093,-.022],[-.094,-.022]], -.184, -.154, dark, beaten);
    for (const x of [-.065, -.033, 0, .033, .065])
      b.cbox(x-.006, -.005, -.189, x+.006, .049, -.178, .002, soot);
    b.cbox(-.018, .198, -.179, .018, .264, -.147, .010, ruptured ? steel : castEdge, beaten);
  }

  function shoulder({ b }, side, ruptured) {
    b.ell(0, .008, .002, .177, .163, .159, dark, 9, beaten);
    const cap = [[-.169,-.020],[-.153,.081],[-.102,.141],[.101,.137],[.162,.074],
      [.173,-.006],[.128,-.036],[-.139,-.037]];
    b.ell(0, .030, -.003, .177, .121, .168, steel, 9, beaten);
    b.prz(cap, -.155, .112, steel, { ...beaten, r1: .92 });
    const rim = [[-.169,-.021],[-.145,.081],[-.095,.133],[.103,.132],[.155,.069],
      [.170,-.007],[.143,-.016],[.131,.055],[.091,.109],[-.087,.109],[-.126,.064],[-.142,-.026]];
    b.prz(rim, -.177, -.160, ruptured && side < 0 ? oxide : castEdge, beaten);
    b.cbox(-.172, -.083, -.177, .175, -.025, .114, .022, dark, beaten);
    b.cbox(-.156, -.096, -.179, .159, -.059, .100, .018, steel, beaten);
    b.prz([[-.123,.085],[-.096,.112],[.086,.111],[.122,.085],[.097,.069],[-.095,.070]],
      -.178, -.157, dark, beaten);
    b.prz([[-.125,.092],[-.096,.119],[.090,.117],[.118,.096],[.088,.106],[-.089,.108]],
      -.181, -.169, copper);
    rivet(b, side*.104, -.041, -.199, .018);
    rivet(b, side*-.108, -.042, -.198, .017);
  }

  function forearm({ b, x }) {
    G(b, 0, 0, .024, -tA.foreArm, .109, .090, dark, 8, beaten);
    b.ell(0, .008, 0, .116, .123, .124, dark, 8, beaten);
    b.cbox(-.114, -.200, -.120, .114, -.060, .083, .028, steel, beaten);
    for (const y of [-.223,-.115]) {
      G(b, 0, 0, y, y+.027, .125, .120, oxide, 8, beaten);
      rivet(b, -.076, y+.014, -.132, .013);
      rivet(b, .076, y+.014, -.132, .013);
    }
    G(b, 0, 0, -.297, -.265, .119, .114, x("pressure") > .92 ? furnaceEdge : copper, 8, beaten);
  }

  function gauntlet({ b }, side) {
    b.cbox(-.094, -.076, -.099, .094, .045, .092, .027, dark, beaten);
    b.cbox(-.100, .019, -.109, .100, .051, .105, .017, copper, beaten);
    b.cbox(-.092, -.083, -.111, .093, -.026, -.051, .015, steel, beaten);
    for (const x of [-.066,-.022,.022,.066]) {
      b.cbox(x-.018, -.126, -.105, x+.018, -.065, -.021, .011, steel, beaten);
      b.box(x-.013, -.114, -.110, x+.013, -.105, -.104, dark);
    }
    b.cbox(side*.084-.026, -.096, -.040, side*.084+.026, -.028, .042, .015, dark, beaten);
  }

  function cuisse({ b }) {
    G(b, 0, 0, .008, -tA.thigh, .140, .117, carcass, 8, beaten);
    b.cbox(-.134, -.260, -.142, .134, -.069, .100, .049, dark, beaten);
    b.cbox(-.126, -.225, -.163, .127, -.097, -.100, .028, carcass, beaten);
    b.cbox(-.113, -.356, -.139, .113, -.250, -.081, .028, dark, beaten);
    for (const y of [-.229,-.322]) {
      b.cbox(-.109, y, -.158, .110, y+.019, -.090, .007, castEdge, beaten);
      rivet(b, -.071, y+.010, -.163, .012);
      rivet(b, .071, y+.010, -.163, .012);
    }
  }

  function greave({ b }) {
    G(b, 0, 0, 0, -tA.shin, .124, .105, carcass, 8, beaten);
    b.ell(0, .001, -.004, .124, .128, .122, dark, 8, beaten);
    b.cbox(-.101, -.084, -.144, .101, .077, -.095, .028, steel, beaten);
    for (const y of [-.390,-.281,-.174]) {
      b.cbox(-.115, y, -.132, .115, y+.096, .076, .033, dark, beaten);
      b.cbox(-.110, y+.012, -.151, .110, y+.083, -.054, .026, steel, beaten);
      b.cbox(-.094, y+.073, -.154, .094, y+.085, -.088, .006, castEdge, beaten);
      rivet(b, -.073, y+.037, -.158, .011);
      rivet(b, .073, y+.037, -.158, .011);
    }
  }

  function boot({ b }) {
    b.cbox(-.112, -.067, -.247, .112, .071, .091, .032, dark, beaten);
    b.cbox(-.115, -.067, -.252, .115, -.036, .090, .013, steel, beaten);
    b.cbox(-.109, -.027, -.253, .109, .035, -.145, .024, steel, beaten);
    for (const x of [-.074,0,.074]) rivet(b, x, .006, -.255, .011);
  }

  const stockParts = FF.parts;
  const formParts = ruptured => stockParts.map(part => {
    if (part.joint === "chest" && part.group === "body") return { ...part, draw: state => chest(state, ruptured) };
    if (part.joint === "head" && part.group === "head") return { ...part, draw: state => helmet(state, ruptured) };
    if (part.joint === "shoulderL" && part.group === "body") return { ...part, draw: state => shoulder(state, -1, ruptured) };
    if (part.joint === "shoulderR" && part.group === "body") return { ...part, draw: state => shoulder(state, 1, ruptured) };
    if (part.joint === "elbowL" || part.joint === "elbowR") return { ...part, draw: forearm };
    if (part.joint === "wristL" || part.joint === "wristR") return { ...part, draw: state => gauntlet(state, part.joint === "wristL" ? -1 : 1) };
    if (part.joint === "hipL" || part.joint === "hipR") return { ...part, draw: cuisse };
    if (part.joint === "kneeL" || part.joint === "kneeR") return { ...part, draw: greave };
    if (part.joint === "ankleL" || part.joint === "ankleR") return { ...part, draw: boot };
    return part;
  });

  function castPose(settings, draft, pressure) {
    const pose = Ui(settings);
    pose.x = { ...pose.x, draft, pressure };
    return pose;
  }

  function castFrames(ruptured) {
    const crouch = ruptured ? .15 : .05;
    const flank = ruptured ? -.195 : -.105;
    return [
      castPose({ spine:[-.027,.025,flank*.56], chest:[-.055,.050,flank], head:[.045,-.025,.045],
        aL:{f:.39,out:.47,e:.83}, aR:{f:.77,out:.43,e:.90},
        lL:{f:.23+crouch,k:.38+crouch,out:.14},lR:{f:.11+crouch,k:.36+crouch,out:.18} }, .30, .24),
      castPose({ spine:[.063,-.025,flank*.74], chest:[-.029,.015,flank*.85], head:[.032,-.107,.040], root:[-.032,0,0],
        aL:{f:.80,out:.31,e:.90,tw:.16,w:.12}, aR:{f:.075,out:.47,e:.34},
        lL:{f:.33+crouch,k:.63+crouch,out:.20},lR:{f:.35+crouch,k:.66+crouch,out:.26} }, .67, .60),
      castPose({ spine:[.10,-.034,flank], chest:[-.079,.027,flank*.87], head:[.045,-.121,.04], root:[-.044,0,0],
        aL:{f:.91,out:.29,e:.97,tw:.19,w:.19}, aR:{f:.00,out:.49,e:.39},
        lL:{f:.40+crouch,k:.75+crouch,out:.22},lR:{f:.40+crouch,k:.77+crouch,out:.25} }, .99, .82),
      castPose({ spine:[.16,-.081,.06], chest:[.05,-.125,.08], head:[-.043,.084,-.04],
        aL:{f:.47,out:.46,e:.55}, aR:{f:1.43,out:.29,e:.32}, fire: .6,
        lL:{f:.53+crouch,k:.78+crouch,out:.23},lR:{f:.15+crouch,k:.59+crouch,out:.27} }, 1, 1),
      castPose({ spine:[.085,-.063,.038], chest:[.045,-.076,.044], head:[-.028,.043,-.022],
        aL:{f:.45,out:.39,e:.60}, aR:{f:1.0,out:.38,e:.81}, fire: .16,
        lL:{f:.27+crouch,k:.42+crouch,out:.19},lR:{f:.12+crouch,k:.37+crouch,out:.23} }, .75, .57),
      castPose({ spine:[.043,-.026,.020], chest:[.02,-.038,.023], head:[.027,.024,0],
        aL:{f:.35,out:.35,e:.81}, aR:{f:.60,out:.37,e:.86},
        lL:{f:.16+crouch,k:.25+crouch,out:.13},lR:{f:.10+crouch,k:.22+crouch,out:.16} }, .32, .29),
    ];
  }

  for (const [rig, ruptured] of [[FF, false], [WF, true]]) {
    rig.frame = { ...rig.frame, w: Math.round(rig.frame.w * 1.5), h: rig.frame.h * 1.5 };
    rig.palette = forgePalette;
    rig.parts = formParts(ruptured);
    rig.poses = { ...rig.poses, foremanCast: castFrames(ruptured) };
  }
  FF.poses.foremanHotIdle = castPose({ spine:[.09,-.03,.02], chest:[.025,-.06,.055], head:[.04,.034,-.026],
    aL:{f:.41,out:.40,e:.83},aR:{f:.57,out:.37,e:.68},
    lL:{f:.15,k:.185,out:.15},lR:{f:.04,k:.13,out:.17} }, .23, .39);

  const bake = iz;
  iz = function (rig) {
    const sprites = bake.call(this, rig);
    if (rig !== FF && rig !== WF) return sprites;
    const atlas = sprites.rig;
    function useDisplayColors(texture) {
      if (texture.colorSpace !== ha) {
        texture.colorSpace = ha;
        texture.needsUpdate = true;
      }
      return texture;
    }
    const tex = atlas.tex, part = atlas.part;
    atlas.tex = function (...args) { return useDisplayColors(tex.apply(this, args)); };
    atlas.part = function (...args) {
      const bitmap = part.apply(this, args);
      useDisplayColors(bitmap.tex);
      return bitmap;
    };
    for (const texture of atlas.all()) useDisplayColors(texture);
    return sprites;
  };

  const canUseIdle = typeof requestIdleCallback === "function";
  const scheduleWarmup = callback => canUseIdle ? requestIdleCallback(callback) : requestAnimationFrame(callback);
  const cancelWarmup = handle => canUseIdle ? cancelIdleCallback(handle) : cancelAnimationFrame(handle);
  let warmup = null;

  function warmChapter(scene, foremen) {
    const jobs = [];
    for (const key of ["V", "V2"]) {
      const atlas = Ze[key].rig;
      for (let frame = 0; frame < Vu(atlas.rig, "foremanCast"); frame++)
        if (!atlas.frames.has(`foremanCast${frame}:0`)) jobs.push([atlas, "foremanCast", frame]);
    }
    const normal = Ze.V.rig;
    if (!normal.frames.has("foremanHotIdle0:0")) jobs.push([normal, "foremanHotIdle", 0]);
    if (!jobs.length) return;

    const run = { handle: null };
    warmup = run;
    const next = deadline => {
      if (warmup !== run) return;
      // Beyond the entry guard, leave active combat to the native lazy cache.
      if (J.scene !== scene || (C.spawnGuard <= 0 && foremen.some(enemy => !enemy.dormant))) {
        warmup = null;
        return;
      }
      if (!canUseIdle || deadline.timeRemaining() >= 6) {
        const [atlas, action, frame] = jobs.shift();
        atlas.tex(action, frame);
      }
      if (jobs.length) run.handle = scheduleWarmup(next);
      else warmup = null;
    };
    run.handle = scheduleWarmup(next);
  }

  const loadChapter = rp;
  rp = function (...args) {
    if (warmup) {
      cancelWarmup(warmup.handle);
      warmup = null;
    }
    const result = loadChapter.apply(this, args);
    const foremen = v.enemies.filter(enemy => enemy.key === "V");
    if (foremen.length) warmChapter(J.scene, foremen);
    return result;
  };

  const cues = new WeakMap();
  let active = null;
  const think = rtt;
  rtt = function (enemy, dt, distance, dx, dz) {
    if (enemy.key !== "V") return think.call(this, enemy, dt, distance, dx, dz);
    let cue = cues.get(enemy);
    if (!cue) {
      cue = { phase: enemy.phase, release: Infinity, contact: 0, stride: enemy.animT };
      cues.set(enemy, cue);
    }
    cue.fired = false;
    cue.coolBefore = enemy.cool;
    const previous = active;
    active = enemy;
    try {
      return think.call(this, enemy, dt, distance, dx, dz);
    } finally {
      active = previous;
    }
  };

  const sendOrb = Qo;
  Qo = function (enemy, ...args) {
    const result = sendOrb.call(this, enemy, ...args);
    if (active === enemy) cues.get(enemy).fired = true;
    return result;
  };

  const drawPose = Yu;
  Yu = function (enemy, dt, moving, stopped) {
    if (active !== enemy) return drawPose.call(this, enemy, dt, moving, stopped);
    const cue = cues.get(enemy);
    if (cue.phase !== enemy.phase) {
      cue.phase = enemy.phase;
      cue.release = Infinity;
      cue.contact = 0;
    }
    cue.release = cue.fired ? 0 : cue.release + dt;
    cue.contact = enemy.cool > cue.coolBefore ? R_ : Math.max(0, cue.contact - dt);

    if (stopped || enemy.hurt > 0 || enemy.sever?.legs)
      return drawPose.call(this, enemy, dt, moving, stopped);

    const atlas = wk(enemy), mask = Mk(enemy);
    let action, frame = 0;
    if (cue.release < .32) {
      action = "foremanCast";
      frame = cue.release < .083 ? 3 : cue.release < .199 ? 4 : 5;
    } else if (cue.contact > 0) {
      action = "atk";
      frame = cue.contact > R_ * .55 ? 1 : 2;
    } else if (enemy.atkT <= .42) {
      action = "foremanCast";
      frame = enemy.atkT > .28 ? 0 : enemy.atkT > .105 ? 1 : 2;
    } else if (moving) {
      action = "walk";
      const count = Vu(atlas.rig, action), step = atlas.rig.walkStep;
      cue.stride = (cue.stride + dt) % (count * step);
      frame = Math.min(count - 1, Math.floor(cue.stride / step));
    } else {
      action = enemy.phase === 2 ? "foremanHotIdle" : "idle";
    }
    Ym(enemy, atlas.tex(action, frame, mask));
  };
})();
/* FACTORY_FOREMAN_END */
