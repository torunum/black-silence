// Native pixel-raster models: keep the game's palette, lighting and CRT treatment.
(() => {
  const ease = (x, a, b) => K0(x, a, b);
  const keyframe=(time,keys)=>{
    if(time<=keys[0][0])return keys[0][1];
    for(let i=1;i<keys.length;i++)if(time<keys[i][0]){
      const a=keys[i-1],b=keys[i];return a[1]+(b[1]-a[1])*ease(time,a[0],b[0]);
    }
    return keys[keys.length-1][1];
  };
  const fireFrames=[
    [[0,0],[.018,1],[.055,.66],[.12,.2],[.20,-.045],[.29,0]],
    [[0,0],[.022,.88],[.055,1],[.13,.58],[.25,.12],[.33,-.045],[.43,0]],
  ];
  const reloadTiming = Object.freeze({
    release:.10, open:.14, opened:.26, eject:.27, enter:.32,
    insert:.46, seat:.59, releaseGrip:.60, released:.64, regrip:.74,
    closeStart:.75, close:.86, latch:.87, settle:.90, end:1,
  });
  window.__BLACK_SILENCE_RELOAD_TIMING = reloadTiming;
  const texture = (material, fallback) => (x, y, z) =>
    window.__silenceMaterialTone?.(material, x, y, z) ?? fallback(x, y, z);
  const leather = texture(0, cp),
    steel = texture(1, $d),
    timber = texture(2, y4),
    bone = texture(3, het);
  const seam = (x, y, z) =>
    Math.abs(Math.sin(z * 230)) < 0.22 ? 1 : leather(x, y, z);

  // Worn charcoal steel for the two rebuilt weapons. Other guns keep their palette.
  const WORN = 24,
    EDGE = 25,
    BRONZE = 26,
    GAUNTLET = 27,
    HAND_LEATHER = 28;
  ML[WORN] = {
    ramp: ["#0e1010", "#171b19", "#242b27", "#343e37", "#4e594d", "#75806b"],
    amb: 0.19,
    spec: 0.19,
    rim: false,
  };
  ML[EDGE] = {
    ramp: ["#171716", "#242722", "#353a32", "#4c5145", "#696d5d", "#898b72"],
    amb: 0.2,
    spec: 0.3,
    rim: false,
  };
  ML[BRONZE] = {
    ramp: ["#211b14", "#382b1b", "#59452b", "#806542", "#a28c60", "#c2b080"],
    amb: 0.2,
    spec: 0.3,
    rim: false,
  };
  ML[GAUNTLET] = {
    ramp: ["#100d0a", "#1b130d", "#2b1e13", "#40301f", "#5b422d", "#785b3d"],
    amb: 0.2,
    spec: 0.12,
    rim: false,
  };
  ML[HAND_LEATHER] = {
    ramp:["#130d09","#21160e","#322116","#493422","#62482f","#7b5e40"],
    amb:.26,spec:.12,rim:false,
  };
  Object.assign(Vg, By(ML));

  dc = function (mesh, points, radius) {
    const first = points[0];
    mesh.ball(first[0], first[1], first[2], radius * 1.05, O.GLOVE, 7, {
      tex: leather,
    });
    for (let i = 0; i < points.length - 1; i++) {
      const r = radius * (1 - i * 0.14);
      const p = points[i];
      mesh.limb(p, points[i + 1], r, r * 0.86, O.GLOVE, 7, { tex: leather });
    }
  };
  b0 = function (mesh, side, options = {}) {
    const w = options.w ?? 0.014,
      part = mesh.part();
    mesh.ell(
      side * (w + 0.004),
      -0.038,
      -0.023,
      0.0165,
      0.041,
      0.026,
      O.GLOVE,
      10,
      { tex: leather, part },
    );
    mesh.ell(
      -side * w * 0.12,
      -0.048,
      -0.032,
      w + 0.008,
      0.034,
      0.017,
      O.GLOVE,
      9,
      { tex: leather, part },
    );
    mesh.ell(
      side * (-w - 0.003),
      -0.033,
      -0.031,
      0.011,
      0.023,
      0.017,
      O.GLOVE,
      8,
      { tex: leather, part },
    );
    const count = options.fingers ?? 4,
      first = options.trigger ? 1 : 0;
    for (let finger = first; finger < count; finger++) {
      const y = -0.012 - finger * 0.0173,
        r = finger === 3 ? 0.0077 : 0.0087;
      dc(
        mesh,
        [
          [side * (w + 0.01), y, -0.002],
          [side * (w + 0.007), y, w + 0.009],
          [-side * w * 0.25, y - 0.002, w + 0.013],
          [-side * (w + 0.004), y - 0.004, 0.007],
        ],
        r,
      );
      // Individual reinforced knuckles, separated by the softer finger joints.
      mesh.ell(
        side * (w + 0.014),
        y,
        -0.005,
        0.0055,
        r * 0.75,
        0.01,
        O.BOOT,
        7,
        { tex: leather },
      );
    }
    if (options.trigger)
      dc(
        mesh,
        [
          [side * (w + 0.011), -0.012, -0.002],
          [side * (w + 0.009), -0.009, 0.021],
          [side * w * 0.45, -0.011, 0.042],
          [side * w * 0.1, -0.024, 0.048],
        ],
        0.0085,
      );
    if (options.thumb !== false)
      dc(
        mesh,
        [
          [-side * (w + 0.003), -0.012, -0.034],
          [-side * (w + 0.011), -0.003, -0.012],
          [-side * (w + 0.008), -0.006, 0.016],
        ],
        0.0105,
      );
    // A stitched back panel catches light while keeping the silhouette anatomical.
    mesh.limb(
      [side * (w + 0.018), -0.016, -0.037],
      [side * (w + 0.018), -0.058, -0.034],
      0.0013,
      0.0013,
      O.CUFF,
      5,
    );
    mesh.limb(
      [side * (w + 0.019), -0.058, -0.034],
      [side * (w + 0.018), -0.065, -0.01],
      0.0013,
      0.0013,
      O.CUFF,
      5,
    );
  };
  c0 = function (mesh, x, y, z, direction, r = 0.03, fullCuff = false) {
    mesh.push();
    mesh.translate(x, y, z);
    const [dx, dy, dz] = mesh.dirFromCam(direction);
    mesh.yaw(Math.atan2(dx, dz));
    mesh.pitch(Math.atan2(dy, Math.hypot(dx, dz)));
    mesh.cyl(0, 0, -0.014, 0.068, r * 0.86, r * 1.1, 10, O.GLOVE, {
      tex: leather,
    });
    if (!fullCuff) {
      mesh.cyl(0, 0, 0.028, 0.046, r * 1.16, r * 1.14, 10, O.BOOT, {
        tex: seam,
      });
      mesh.cbox(
        -r * 0.28,
        r * 1.04,
        0.03,
        r * 0.28,
        r * 1.22,
        0.044,
        0.002,
        O.BRASS,
      );
    }
    mesh.cyl(
      0,
      0,
      fullCuff ? 0.028 : 0.059,
      0.083,
      r * (fullCuff ? 1.07 : 1.22),
      r * 1.32,
      10,
      GAUNTLET,
      {
        tex: leather,
      },
    );
    mesh.cyl(
      0,
      0,
      0.076,
      0.19,
      r * (fullCuff ? 1.32 : 1.45),
      r * 1.7,
      10,
      GAUNTLET,
      {
        tex: leather,
      },
    );
    mesh.cyl(0, 0, 0.19, 0.46, r * 1.7, r * 1.94, 10, GAUNTLET, {
      tex: leather,
    });
    for (const z0 of [0.09, 0.183])
      mesh.cyl(
        0,
        0,
        z0,
        z0 + 0.007,
        r * (1.5 + (z0 - 0.09) * 2),
        r * (1.48 + (z0 - 0.09) * 2),
        10,
        GAUNTLET,
        { tex: seam },
      );
    // Broad leather wrist strap and brass stud match the reference gauntlet.
    mesh.cyl(0, 0, 0.123, 0.158, r * 1.61, r * 1.68, 10, GAUNTLET, {
      tex: leather,
    });
    mesh.cbox(
      -r * 0.42,
      r * 1.55,
      0.132,
      r * 0.42,
      r * 1.72,
      0.151,
      0.003,
      BRONZE,
      { tex: steel },
    );
    mesh.cbox(
      -r * 0.23,
      r * 1.7,
      0.137,
      r * 0.23,
      r * 1.75,
      0.146,
      0.001,
      O.BOOT,
      { tex: leather },
    );
    for (const side of [-1, 1])
      mesh.limb(
        [side * r * 0.95, r * 1.15, 0.086],
        [side * r * 1.17, r * 1.3, 0.185],
        0.0009,
        0.0009,
        O.CUFF,
        5,
      );
    mesh.ball(r * 1.18, r * 0.9, 0.102, r * 0.12, BRONZE, 6);
    mesh.pop();
  };

  function screw(mesh, x, y, z) {
    mesh.ball(x, y, z, 0.0036, BRONZE, 6);
    mesh.box(
      x - 0.0018,
      y - 0.0004,
      z - 0.0032,
      x + 0.0018,
      y + 0.0004,
      z - 0.0035,
      O.BLACK,
    );
  }
  // A closed leather shell joins the knuckles, palm heel and wrist. The
  // broad rear surface is continuous; only the flexing fingers are segmented.
  function leatherShell(mesh, outline, layers, material = GAUNTLET) {
    const part = mesh.part(), inv = mesh.inverse(), opts = { tex: leather };
    const cx = outline.reduce((s,p)=>s+p[0],0)/outline.length;
    const cy = outline.reduce((s,p)=>s+p[1],0)/outline.length;
    const rings = layers.map(([z,scale])=>outline.map(([x,y])=>[cx+(x-cx)*scale,cy+(y-cy)*scale,z]));
    mesh.face(rings[0],[0,0,-1],material,part,opts,inv);
    mesh.face(rings[rings.length-1],[0,0,1],material,part,opts,inv);
    for(let k=0;k<rings.length-1;k++)for(let i=0;i<outline.length;i++) {
      const j=(i+1)%outline.length,a=rings[k][i],b=rings[k][j],c=rings[k+1][j],d=rings[k+1][i];
      const u=[d[0]-a[0],d[1]-a[1],d[2]-a[2]],v=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n)||1;
      mesh.face([a,b,c,d],n.map(x=>x/length),material,part,opts,inv);
    }
  }
  function weaponSleeve(mesh, x, y, z, side=1, radius=.033) {
    mesh.push();mesh.translate(x,y,z);
    const [dx,dy,dz]=mesh.dirFromCam([side*.7,-.95,-.72]);
    mesh.yaw(Math.atan2(dx,dz));mesh.pitch(Math.atan2(dy,Math.hypot(dx,dz)));
    const outline=[[0,radius*.72],[radius*.7,radius*.54],[radius,0],[radius*.72,-radius*.54],[0,-radius*.72],[-radius*.72,-radius*.54],[-radius,0],[-radius*.7,radius*.54]];
    leatherShell(mesh,outline,[[-.02,.75],[.025,.87],[.095,1.44],[.28,1.85]],HAND_LEATHER);
    leatherShell(mesh,outline,[[.066,1.23],[.088,1.43]],HAND_LEATHER);
    mesh.cbox(-.012,radius*.93,.072,.012,radius*1.08,.09,.003,BRONZE,{tex:steel});
    mesh.cbox(-.007,radius*1.06,.076,.007,radius*1.13,.086,.001,HAND_LEATHER,{tex:leather});
    for(const side of [-1,1])mesh.limb([side*radius*.7,radius*.54,.017],[side*radius*1.05,radius*.78,.062],.001,.001,O.BOOT,5);
    mesh.pop();
  }
  function wrappedFinger(mesh,points,radius) {
    for(let i=0;i<points.length-1;i++)mesh.limb(points[i],points[i+1],radius*(1-i*.13),radius*(.86-i*.13),HAND_LEATHER,6,{tex:leather});
  }
  // The trigger grip keeps its fingers at the weapon while the heel of the
  // hand turns into the diagonal forearm, rather than forming an upright fist.
  function triggerGrip(mesh, wide = false, controls = {}) {
    const pull = controls.pull ?? 0,
      thumb = controls.thumb ?? 0;
    const w = wide ? 0.02 : 0.016,
      p = mesh.part();
    mesh.push();
    mesh.translate(.038,-.029,-.041);mesh.roll(-.8);
    mesh.ell(0,0,0,.034,.035,.012,HAND_LEATHER,10,{tex:leather,part:p});
    mesh.pop();
    mesh.ell(-.003,-.015,-.032,.017,.021,.021,O.GLOVE,8,{tex:leather,part:p});
    for (let i = 0; i < 3; i++) {
      const y = -0.023 - i * 0.013,
        r = 0.0091 - i * 0.0008,
        curl = i * 0.002;
      wrappedFinger(
        mesh,
        [
          [w + 0.009 - curl, y + 0.006, -0.018],
          [w + 0.011 - curl, y - 0.001, 0.008 - curl],
          [0.007, y - 0.007, 0.024 - curl],
          [-.006, y - 0.003, 0.012 - curl],
        ],
        r,
      );
    }
    dc(
      mesh,
      [
        [w + 0.007, -0.008, -0.006],
        [w + 0.007, -0.007, 0.016],
        [0.009, -0.008 - 0.004 * pull, 0.035 - 0.009 * pull],
        [0.003, -0.02, 0.042 - 0.011 * pull],
      ],
      0.008,
    );
    // The broad thumb pad crosses the rear of the grip and opposes the fingers.
    mesh.ell(.002,-.007,-.052,.018,.013,.012,HAND_LEATHER,8, {
      tex: leather,
    });
    dc(
      mesh,
      [
        [-0.018, -0.021, -0.033],
        [-0.021, -0.009 + 0.026 * thumb, -0.022],
        [-0.006, -0.006 + 0.035 * thumb, -0.017],
        [0.007, -0.012 + 0.043 * thumb, -0.02],
      ],
      0.0095,
    );
    mesh.push();
    mesh.translate(.038,-.029,-.041);
    mesh.roll(-.8);
    for (const y of [-.012,0,.012]) {
      mesh.limb([-.018,y,-.010],[.004,y-.004,-.012],.0008,.0008,O.BOOT,5);
      mesh.limb([.004,y-.004,-.012],[.018,y-.001,-.010],.0008,.00055,O.BOOT,5);
    }
    mesh.pop();
    weaponSleeve(mesh,.066,-.039,-.047,1,wide?.035:.034);
  }
  function supportGrip(mesh, w, h, release = 0) {
    const part = mesh.part();
    mesh.ell(-0.005, -h - 0.008, -0.002, w + 0.002, 0.013, 0.039, O.GLOVE, 9, {
      tex: leather,
      part,
    });
    mesh.ell(-w + 0.003, -h - 0.001, -0.005, 0.012, 0.017, 0.034, O.GLOVE, 8, {
      tex: leather,
      part,
    });
    for (let i = 0; i < 4; i++) {
      const z = -0.026 + i * 0.017,
        r = 0.0081 - i * 0.0004;
      dc(
        mesh,
        [
          [-w + 0.001, -h - 0.004, z],
          [-w - 0.005, -0.008, z],
          [-w - 0.002 - 0.009 * release, 0.011, z],
          [-w + 0.009 - 0.025 * release, 0.019 - 0.01 * release, z + 0.003],
        ],
        r,
      );
    }
    mesh.ell(w - 0.003, -h - 0.001, -0.022, 0.012, 0.012, 0.019, O.GLOVE, 8, {
      tex: leather,
      part,
    });
    dc(
      mesh,
      [
        [w - 0.003, -h - 0.002, -0.027],
        [w + 0.004, -0.006, -0.017],
        [w + 0.002, 0.007, 0.001],
      ],
      0.0095,
    );
    c0(mesh, -0.012, -h - 0.014, -0.033, [-0.52, -0.42, -1], 0.027);
  }
  function reloadPinch(mesh, wide = false, release = 0, grip = 0) {
    const x = wide ? -0.008 : -0.034;
    const mix=(a,b)=>a.map((n,i)=>n+(b[i]-n)*grip);
    mesh.ell(x-.012*grip, -.038+.025*grip, -.014, .022, .028-.008*grip, .016+.018*grip, O.GLOVE, 8, {
      tex: leather,
    });
    mesh.ell(x - .006-.012*grip, -.061+.026*grip, -.021, .018, .016, .017, O.GLOVE, 8, {
      tex: leather,
    });
    // Thumb opposes a bent index finger around the cartridge's brass base.
    dc(
      mesh,
      [
        mix([x-.014,-.027,-.012],[-.042,-.018,-.029]),
        mix([x-.012-.006*release,-.007,-.004],[-.035,.005,-.034]),
        mix([-.016-.023*release,.004-.005*release,.007],[-.009,.014,-.031]),
      ],
      0.009,
    );
    dc(
      mesh,
      [
        mix([x+.004,-.02,-.012],[-.034,-.011,.024]),
        mix([-.02,-.007,.018],[-.034,.017,.025]),
        mix([(wide?.026:.003)+.014*release,-.006,.023],[-.012,.028,.026]),
        mix([(wide?.035:.012)+.02*release,-.015+.009*release,.014],[.009,.013,.025]),
      ],
      0.0078,
    );
    for (let i = 0; i < 3; i++) {
      const y = -0.036 - i * 0.012;
      dc(
        mesh,
        [
          mix([x+.011,y,-.015],[-.036,-.014,.009-i*.014]),
          mix([x+.022,y+.006,.008],[-.032,.018,.009-i*.014]),
          mix([x+.012,y+.007,.016],[-.008,.025,.009-i*.014]),
        ],
        0.0075 - i * 0.0005,
      );
    }
    mesh.limb(
      [x - 0.018, -0.023, -0.027],
      [x - 0.018, -0.053, -0.03],
      0.0012,
      0.0012,
      O.CUFF,
      5,
    );
    weaponSleeve(mesh,x-.004-.012*grip,-.064+.026*grip,-.025,-1,.03);
  }

  function hingePin(mesh, x, y, z, radius = 0.006) {
    mesh.push();
    mesh.translate(x, y, z);
    mesh.yaw(Math.PI / 2);
    mesh.cyl(0, 0, -0.006, 0.006, radius, radius, 8, BRONZE, { tex: steel });
    mesh.box(-0.003, -0.0007, 0.006, 0.003, 0.0007, 0.0065, O.BLACK);
    mesh.pop();
  }
  function cartridge(mesh, wide = false, spent = false) {
    const r = wide ? 0.0105 : 0.017,
      length = wide ? 0.062 : 0.067;
    mesh.cyl(0, 0, 0.011, length, r, r, 8, spent ? O.BOOT : O.RED, {
      tex: timber,
    });
    mesh.cyl(0, 0, 0, 0.012, r * 1.12, r * 1.12, 8, BRONZE, { tex: steel });
    mesh.cyl(0, 0, -0.001, 0, r * 0.35, r * 0.35, 8, EDGE);
    if (spent)
      mesh.cyl(0, 0, length, length + 0.001, r * 0.72, r * 0.72, 8, O.BLACK);
    else mesh.cyl(0, 0, length, length + 0.001, r * 0.85, r * 0.85, 8, O.BOOT);
  }
  function skull(mesh, heat, cock) {
    mesh.push();
    mesh.translate(0, 0.055, -0.041);
    mesh.ell(0, 0.005, 0, 0.0165, 0.018, 0.013, O.BONE, 10, { tex: bone });
    mesh.ell(0, -0.009, -0.007, 0.01, 0.006, 0.009, O.BONE, 8, { tex: bone });
    for (const side of [-1, 1]) {
      mesh.ell(side * 0.009, 0.001, -0.0135, 0.007, 0.0055, 0.0045, O.BLACK, 7);
      mesh.ball(
        side * 0.009,
        0.0005,
        -0.017,
        0.00125 + heat * 0.0009,
        heat > 0.5 ? O.FLAME : O.EMBER,
        5,
      );
      mesh.push();
      mesh.translate(side * 0.009, 0.006, -0.015);
      mesh.roll(side * 0.18);
      mesh.ell(0, 0, 0, 0.007, 0.0025, 0.0025, O.BONE, 7, { tex: bone });
      mesh.pop();
      mesh.push();
      mesh.translate(side * 0.013, 0.013, -0.006);
      mesh.yaw(side * 0.9);
      mesh.pitch(0.8);
      mesh.cyl(0, 0, 0, 0.01, 0.004, 0.0026, 7, O.BONE, { tex: bone });
      mesh.translate(0, 0, 0.009);
      mesh.pitch(0.5);
      mesh.cyl(0, 0, 0, 0.011, 0.0026, 0.0005, 7, O.BONE, { tex: bone });
      mesh.pop();
      mesh.push();
      mesh.translate(side * 0.012, -0.008, -0.008);
      mesh.roll(side * -0.32);
      mesh.ell(0, 0, 0, 0.0045, 0.0035, 0.006, O.BONE, 7, {
        tex: bone,
      });
      mesh.pop();
    }
    mesh.prz(
      [
        [-0.0035, -0.011],
        [0.0035, -0.011],
        [0, -0.004],
      ],
      -0.017,
      -0.013,
      O.BLACK,
    );
    mesh.cbox(-0.009, -0.022, -0.011, 0.009, -0.013, -0.008, 0.001, O.BLACK);
    mesh.prz(
      [
        [-0.009, -0.014],
        [-0.0085, -0.024],
        [-0.006, -0.027],
        [0.006, -0.027],
        [0.0085, -0.024],
        [0.009, -0.014],
        [0.007, -0.016],
        [0.006, -0.023],
        [-0.006, -0.023],
        [-0.007, -0.016],
      ],
      -0.012,
      -0.003,
      O.BONE,
      { tex: bone },
    );
    for (let i = -2; i <= 2; i++) {
      mesh.cbox(
        i * 0.0035 - 0.0011,
        -0.018,
        -0.014,
        i * 0.0035 + 0.0011,
        -0.0125,
        -0.01,
        0.0004,
        O.BONE,
        { tex: bone },
      );
      mesh.cbox(
        i * 0.0035 - 0.001,
        -0.022,
        -0.014,
        i * 0.0035 + 0.001,
        -0.0195,
        -0.01,
        0.0004,
        O.BONE,
        { tex: bone },
      );
    }
    mesh.pop();
  }
  function reloadPose(mesh, time, shotgun) {
    if (time < 0) return { open: 0, unlock: 0, settle: 0 };
    const t=reloadTiming;
    const show=ease(time,0,t.open)*(1-ease(time,t.settle,t.end));
    const open=ease(time,t.open,t.opened)*(1-ease(time,t.closeStart,t.close));
    const unlock=ease(time,.035,t.release)*(1-ease(time,t.opened,t.enter));
    const settle=Z1(time,t.close,.028);
    mesh.translate(-.022*show,.009*show-.005*settle,-.026*show+.008*settle);
    mesh.roll(-(shotgun?.43:.48)*show+.052*settle);
    mesh.yaw((shotgun?.19:.16)*show);
    mesh.pitch(-.045*show+.035*open+.065*settle);
    return { open, unlock, settle };
  }
  function loadingHand(mesh, time, shotgun, seatZ, seatY) {
    const t=reloadTiming;
    const enter=ease(time,t.enter,t.insert),seat=ease(time,t.insert,t.seat),
      grip=ease(time,t.released,t.regrip),leave=shotgun?0:ease(time,t.settle,t.end);
    const shellX = shotgun ? [-0.023, 0.023] : [0];
    // Once seated, the rounds belong to the chamber, not the withdrawing hand.
    if (time >= t.seat)
      for (const x of shellX) {
        mesh.push();
        mesh.translate(x, seatY, seatZ);
        cartridge(mesh, shotgun);
        mesh.pop();
      }
    if (time <= t.enter || time >= t.end) return;
    mesh.push();
    mesh.translate(
      -.19*(1-enter)-.005*grip-.20*leave,
      seatY-.22*(1-enter)-.035*grip-.17*leave,
      seatZ-.09*(1-seat)+(.09+(shotgun?.08:.03)*ease(time,.80,.93)-seatZ)*grip-.055*leave,
    );
    mesh.roll(.22*(1-enter)-.15*leave);
    mesh.pitch(-.12*(1-enter));
    if (time < t.seat)
      for (const x of shellX) {
        mesh.push();
        mesh.translate(x, 0, 0);
        cartridge(mesh, shotgun);
        mesh.pop();
      }
    reloadPinch(mesh,shotgun,ease(time,t.releaseGrip,t.released)*(1-grip),grip);
    mesh.pop();
  }
  function topLatch(mesh, amount, wide = false) {
    mesh.push();
    mesh.translate(0, wide ? 0.049 : 0.036, wide ? -0.032 : 0.01);
    mesh.yaw(-0.72 * amount);
    mesh.cbox(-0.003, 0, -0.009, 0.003, 0.006, 0.029, 0.0015, EDGE, {
      tex: steel,
    });
    mesh.cbox(-0.008, 0.002, -0.018, 0.008, 0.008, -0.002, 0.002, BRONZE, {
      tex: steel,
    });
    mesh.pop();
  }
  Object.assign(det.hold, {
    x: 0.045,
    y: -0.02,
    z: 0.55,
    pitch: 0.32,
    yaw: -0.07,
    roll: 0,
  });
  Object.assign(det.kick, { back: 0.092, lift: 0.205 });
  det.present = { y: 0.055, pitch: 0.12, roll: -0.08 };
  det.draw = function (mesh, pose) {
    const time = pose.reload,
      reloading = time >= 0,
      phase = reloadPose(mesh, time, false),
      open = phase.open;
    const loaded = reloading
      ? 1 - ease(time, 0.1, 0.2) + ease(time, 0.84, 0.94)
      : pose.empty
        ? 0
        : 1;
    const glow = loaded > 0.5 ? (pose.heat > 0.5 ? O.FLAME : O.EMBER) : O.BLACK;
    const thumb = reloading
      ? Math.max(phase.unlock, Qe(time, 0.86, 0.98, 0.035))
      : pose.action * 0.55;
    mesh.cbox(-0.023, 0.018, -0.048, 0.023, 0.043, 0.066, 0.006, WORN, {
      tex: steel,
    });
    mesh.cbox(-0.021, 0.016, -0.049, 0.021, 0.028, 0.06, 0.003, EDGE, {
      tex: steel,
    });
    mesh.ext(
      [
        [-0.047, 0.006],
        [0.002, 0.005],
        [-0.019, -0.105],
        [-0.038, -0.122],
        [-0.073, -0.108],
        [-0.067, -0.065],
      ],
      -0.015,
      0.015,
      O.WOOD,
      { tex: timber },
    );
    for (const side of [-1, 1]) {
      mesh.ext(
        [
          [-0.047, 0.026],
          [-0.026, 0.043],
          [0.027, 0.043],
          [0.054, 0.029],
          [0.033, 0.021],
        ],
        side * 0.023 - 0.001,
        side * 0.023 + 0.001,
        EDGE,
        { tex: steel },
      );
      screw(mesh, side * 0.025, 0.03, -0.028);
      screw(mesh, side * 0.024, 0.028, 0.037);
      hingePin(mesh, side * 0.027, 0.012, 0.055, 0.007);
      mesh.cbox(
        side * 0.016 - 0.001,
        -0.088,
        -0.062,
        side * 0.016 + 0.001,
        -0.027,
        -0.035,
        0.001,
        O.BOOT,
        { tex: leather },
      );
    }
    mesh.ext(
      [
        [0.002, 0],
        [0.05, 0],
        [0.052, -0.012],
        [0.039, -0.038],
        [0.012, -0.038],
        [0.004, -0.029],
        [0.034, -0.03],
        [0.043, -0.01],
        [0.002, -0.008],
      ],
      -0.004,
      0.004,
      EDGE,
      { tex: steel },
    );
    mesh.push();
    mesh.translate(0, -0.002, 0.019);
    mesh.pitch(-0.24 * pose.action);
    mesh.cbox(-0.003, -0.023, 0.004, 0.003, -0.003, 0.01, 0.001, BRONZE);
    mesh.pop();
    topLatch(mesh, phase.unlock);
    // The skull is a fixed breech plate. A separate striker has its own pivot.
    skull(mesh, pose.heat, 0);
    mesh.push();
    mesh.translate(0, 0.069, -0.021);
    mesh.pitch(-0.58 + 0.61 * pose.action - 0.12 * thumb);
    mesh.cbox(-0.004, 0, -0.003, 0.004, 0.015, 0.006, 0.002, WORN, {
      tex: steel,
    });
    mesh.cbox(-0.006, 0.011, -0.009, 0.006, 0.017, 0.007, 0.002, EDGE, {
      tex: steel,
    });
    mesh.pop();
    mesh.push();
    mesh.translate(0, 0.012, 0.055);
    mesh.pitch(-0.64 * open);
    mesh.translate(0, -0.012, -0.055);
    mesh.cyl(0, 0.052, -0.028, 0.022, 0.032, 0.032, 12, WORN, { tex: steel });
    mesh.cyl(0, 0.052, 0.021, 0.041, 0.032, 0.026, 12, WORN, { tex: steel });
    mesh.cyl(0, 0.052, 0.039, 0.2, 0.026, 0.024, 12, WORN, { tex: steel });
    mesh.cyl(0, 0.052, 0.019, 0.024, 0.0326, 0.0326, 12, BRONZE, {
      tex: steel,
    });
    for (const z of [0.047, 0.1, 0.153]) {
      mesh.cyl(0, 0.052, z, z + 0.004, 0.0268, 0.0264, 12, EDGE, {
        tex: steel,
      });
      mesh.box(-0.006, 0.076, z + 0.011, 0.006, 0.078, z + 0.036, O.BLACK);
      mesh.box(-0.0024, 0.078, z + 0.015, 0.0024, 0.0783, z + 0.03, glow);
      for (const side of [-1, 1]) {
        mesh.cbox(
          side * 0.026 - 0.001,
          0.044,
          z + 0.009,
          side * 0.026 + 0.001,
          0.064,
          z + 0.036,
          0.001,
          O.BLACK,
        );
        mesh.box(
          side * 0.027 - 0.0002,
          0.048,
          z + 0.014,
          side * 0.027 + 0.0002,
          0.06,
          z + 0.03,
          glow,
        );
      }
    }
    for (const side of [-1, 1]) {
      mesh.cbox(
        side * 0.025 - 0.002,
        0.035,
        0.047,
        side * 0.025 + 0.002,
        0.039,
        0.18,
        0.001,
        WORN,
        { tex: steel },
      );
      for (const z of [0.052, 0.174]) screw(mesh, side * 0.027, 0.039, z);
    }
    mesh.cyl(0, 0.052, 0.195, 0.211, 0.026, 0.029, 12, EDGE, { tex: steel });
    mesh.cyl(0, 0.052, 0.211, 0.216, 0.0285, 0.0285, 12, WORN, { tex: steel });
    mesh.cyl(0, 0.052, 0.215, 0.217, 0.0218, 0.0218, 12, O.BLACK);
    mesh.cbox(-0.003, 0.078, 0.039, 0.003, 0.083, 0.182, 0.001, WORN, {
      tex: steel,
    });
    mesh.cbox(-0.003, 0.078, 0.195, 0.003, 0.092, 0.204, 0.001, EDGE);
    if (reloading && open > 0.05) {
      mesh.cyl(0, 0.052, -0.031, -0.028, 0.024, 0.024, 12, EDGE, {
        tex: steel,
      });
      mesh.cyl(0, 0.052, -0.032, -0.031, 0.019, 0.019, 10, O.BLACK);
      const extractor =
        0.009 * ease(time, reloadTiming.open, reloadTiming.opened) * (1 - ease(time, reloadTiming.releaseGrip, reloadTiming.regrip));
      mesh.cbox(
        -0.006,
        0.026,
        -0.035 - extractor,
        0.006,
        0.033,
        -0.025,
        0.001,
        BRONZE,
        { tex: steel },
      );
      if (time > reloadTiming.eject && time < reloadTiming.eject+.12) {
        const t = (time - reloadTiming.eject) / .12;
        mesh.push();
        mesh.translate(
          -.13 * t,
          0.052 - 0.055 * t - 0.07 * t * t,
          -0.032 + 0.075 * t,
        );
        mesh.roll(t * 1.6);
        mesh.pitch(t * .8);
        cartridge(mesh, false, true);
        mesh.pop();
      }
    }
    if(reloading) loadingHand(mesh, time, false, -0.033, 0.052);
    mesh.anchor("muzzle", 0, 0.052, 0.217);
    mesh.pop();
    mesh.push();
    mesh.translate(0, 0.007, -0.01);
    mesh.pitch(-0.18);
    triggerGrip(mesh, false, { pull: pose.action, thumb });
    mesh.pop();
  };

  Object.assign(met.hold, {
    x: 0.035,
    y: -0.03,
    z: 0.55,
    pitch: 0.3,
    yaw: -0.025,
    roll: 0,
  });
  Object.assign(met.kick, { back: 0.145, lift: 0.255 });
  met.present = { y: 0.065, pitch: 0.1, roll: -0.1 };
  met.draw = function (mesh, pose) {
    const time = pose.reload,
      reloading = time >= 0,
      phase = reloadPose(mesh, time, true),
      open = phase.open;
    mesh.cbox(-0.029, 0.006, -0.064, 0.029, 0.042, 0.052, 0.008, WORN, {
      tex: steel,
    });
    // A stationary, scalloped recoil shield closes the rear of both chambers.
    // The barrel assembly hinges away from this face during loading.
    mesh.prz(
      [
        [-0.032, 0.009],
        [-0.043, 0.035],
        [-0.043, 0.059],
        [-0.036, 0.073],
        [-0.024, 0.078],
        [-0.011, 0.075],
        [0, 0.066],
        [0.011, 0.075],
        [0.024, 0.078],
        [0.036, 0.073],
        [0.043, 0.059],
        [0.043, 0.035],
        [0.032, 0.009],
      ],
      -0.065,
      -0.057,
      WORN,
      { tex: steel },
    );
    for (const side of [-1, 1]) {
      mesh.ext(
        [
          [-0.062, 0.015],
          [-0.055, 0.037],
          [0.014, 0.044],
          [0.035, 0.034],
          [0.026, 0.013],
        ],
        side * 0.031 - 0.001,
        side * 0.031 + 0.001,
        BRONZE,
        { tex: steel },
      );
      mesh.cbox(
        side * 0.033 - 0.0005,
        0.024,
        -0.047,
        side * 0.033 + 0.0005,
        0.026,
        0.007,
        0.0004,
        EDGE,
      );
      screw(mesh, side * 0.033, 0.025, -0.049);
      screw(mesh, side * 0.033, 0.026, 0.019);
      hingePin(mesh, side * 0.033, 0.012, 0.052, 0.0075);
    }
    mesh.ext(
      [
        [-0.075, 0.02],
        [-0.006, 0.005],
        [-0.02, -0.099],
        [-0.04, -0.118],
        [-0.088, -0.09],
        [-0.1, -0.028],
      ],
      -0.02,
      0.02,
      O.WOOD,
      { tex: timber },
    );
    mesh.cbox(-0.021, -0.085, -0.084, 0.021, -0.072, -0.06, 0.003, O.BOOT, {
      tex: leather,
    });
    mesh.ext(
      [
        [0, 0.002],
        [0.062, 0.002],
        [0.062, -0.009],
        [0.047, -0.034],
        [0.014, -0.035],
        [0.004, -0.027],
        [0.042, -0.025],
        [0.053, -0.008],
        [0, -0.007],
      ],
      -0.004,
      0.004,
      EDGE,
      { tex: steel },
    );
    mesh.cbox(-0.003, -0.022, 0.019, 0.003, 0.002, 0.026, 0.001, BRONZE);
    topLatch(mesh, phase.unlock, true);
    for (const side of [-1, 1]) {
      const hammer = reloading
        ? pose.empty*(1-ease(time,reloadTiming.open,reloadTiming.opened))
        : Math.max(pose.empty,pose.action * (side < 0 ? .85 : 1));
      mesh.push();
      mesh.translate(side * 0.025, 0.045, -0.074);
      mesh.pitch(.42-.65*hammer);
      mesh.cbox(-0.004, 0, -0.005, 0.004, 0.026, 0.005, 0.002, EDGE, {
        tex: steel,
      });
      mesh.cbox(-0.007, 0.022, -0.014, 0.007, 0.031, 0.006, 0.002, WORN, {
        tex: steel,
      });
      for (const z of [-0.009, -0.004, 0.001])
        mesh.box(-0.006, 0.031, z, 0.006, 0.032, z + 0.001, EDGE);
      mesh.pop();
    }
    mesh.push();
    mesh.translate(0, 0.013, 0.052);
    mesh.pitch(-.86 * open);
    mesh.translate(0, -0.013, -0.052);
    mesh.cbox(-0.037, 0.028, -0.053, 0.037, 0.037, 0.065, 0.005, WORN, {
      tex: steel,
    });
    for (const x of [-0.023, 0.023]) {
      mesh.cyl(x, 0.057, -0.054, 0.061, 0.0205, 0.02, 12, WORN, { tex: steel });
      mesh.cyl(x, 0.057, 0.058, 0.362, 0.0172, 0.016, 12, WORN, { tex: steel });
      mesh.cyl(x, 0.057, 0.055, 0.06, 0.0205, 0.0205, 12, BRONZE, {
        tex: steel,
      });
      mesh.cyl(x, 0.057, 0.35, 0.369, 0.0175, 0.0175, 12, EDGE, { tex: steel });
      mesh.cyl(x, 0.057, 0.368, 0.372, 0.0168, 0.0168, 12, WORN, {
        tex: steel,
      });
      mesh.cyl(x, 0.057, 0.371, 0.373, 0.0125, 0.0125, 12, O.BLACK);
      if (open > 0.05) {
        mesh.cyl(x, 0.057, -0.057, -0.054, 0.015, 0.015, 10, EDGE);
        mesh.cyl(x, 0.057, -0.058, -0.057, 0.012, 0.012, 10, O.BLACK);
      }
    }
    mesh.cbox(-0.0025, 0.074, 0.064, 0.0025, 0.078, 0.347, 0.001, EDGE, {
      tex: steel,
    });
    mesh.ball(0, 0.082, 0.354, 0.0033, BRONZE, 5);
    // Fixed, scalloped walnut fore-end: the break-action barrels do not pump.
    mesh.cbox(-0.032, 0.002, 0.108, 0.032, 0.033, 0.251, 0.011, O.WOOD, {
      tex: timber,
    });
    mesh.cbox(-0.027, 0.002, 0.117, 0.027, 0.008, 0.243, 0.005, O.BOOT, {
      tex: leather,
    });
    for (const z of [0.128, 0.149, 0.17, 0.191, 0.212, 0.233])
      for (const side of [-1, 1])
        mesh.cbox(
          side * 0.031 - 0.001,
          0.011,
          z,
          side * 0.031 + 0.001,
          0.028,
          z + 0.003,
          0.0006,
          O.BOOT,
        );
    for (const z of [0.105, 0.25])
      mesh.cbox(-0.034, 0.024, z, 0.034, 0.034, z + 0.009, 0.002, EDGE, {
        tex: steel,
      });
    if (reloading && open > 0.05) {
      const extract =
        0.011 * ease(time, reloadTiming.open, reloadTiming.opened) * (1 - ease(time, reloadTiming.releaseGrip, reloadTiming.regrip));
      mesh.cbox(
        -0.028,
        0.034,
        -0.06 - extract,
        0.028,
        0.04,
        -0.052,
        0.001,
        BRONZE,
        { tex: steel },
      );
      if (time > reloadTiming.eject && time < reloadTiming.eject+.12)
        for (const x of [-0.023, 0.023]) {
          const t = (time - reloadTiming.eject) / .12;
          mesh.push();
          mesh.translate(
            x + Math.sign(x) * 0.11 * t,
            0.057 - 0.065 * t - 0.07 * t * t,
            -0.058 + 0.095 * t,
          );
          mesh.pitch(-t * .8);
          mesh.roll(Math.sign(x) * t * 1.6);
          cartridge(mesh, true, true);
          mesh.pop();
        }
    }
    if(reloading) loadingHand(mesh, time, true, -0.059, 0.057);
    mesh.anchor("muzzle", 0, 0.057, 0.373);
    const away=reloading?ease(time,reloadTiming.release,reloadTiming.opened):0;
    if (!reloading || time < reloadTiming.enter) {
      mesh.push();
      mesh.translate(-.005-.15*away,.022-.18*away,.17-.035*away);
      mesh.roll(-0.35 * away);
      reloadPinch(mesh,true,away,1-away);
      mesh.pop();
    }
    mesh.pop();
    mesh.push();
    mesh.pitch(-0.2);
    triggerGrip(mesh, true, { pull: pose.action, thumb: phase.unlock });
    mesh.pop();
  };

  Ltt = function (mesh) {
    const p = mesh.part(),
      s = Ht;
    mesh.push();
    // The ankle shaft rises toward the shin; the sole extends below the foot.
    mesh.pitch(Math.PI / 2);
    mesh.cyl(0, 0, s(-0.025), s(0.112), s(0.047), s(0.058), 10, GAUNTLET, {
      tex: leather,
      part: p,
    });
    for (const z of [0.04, 0.092]) {
      mesh.cyl(0, 0, s(z), s(z + 0.014), s(0.06), s(0.06), 10, O.BOOT, {
        tex: leather,
      });
      mesh.cbox(
        s(0.048),
        s(-0.011),
        s(z),
        s(0.066),
        s(0.011),
        s(z + 0.014),
        s(0.003),
        BRONZE,
      );
      mesh.cbox(
        s(0.062),
        s(-0.006),
        s(z + 0.004),
        s(0.067),
        s(0.006),
        s(z + 0.01),
        s(0.001),
        GAUNTLET,
      );
    }
    mesh.pop();
    mesh.ell(
      0,
      s(-0.033),
      s(-0.024),
      s(0.045),
      s(0.037),
      s(0.034),
      GAUNTLET,
      10,
      { tex: leather, part: p },
    );
    mesh.ell(
      0,
      s(-0.033),
      s(0.046),
      s(0.047),
      s(0.04),
      s(0.094),
      GAUNTLET,
      12,
      {
        tex: leather,
        part: p,
      },
    );
    mesh.ell(0, s(-0.039), s(0.137), s(0.048), s(0.031), s(0.056), O.BOOT, 12, {
      tex: leather,
      part: p,
    });
    // Extrude the actual footprint in the X/Z plane. A box here leaves square
    // corners behind the round toe when the boot faces the camera mid-kick.
    mesh.push();
    mesh.pitch(-Math.PI / 2);
    const forefoot = [
      [-0.034, 0.034],
      [-0.042, 0.06],
      [-0.047, 0.09],
      [-0.049, 0.126],
      [-0.046, 0.155],
      [-0.037, 0.176],
      [-0.022, 0.188],
      [0, 0.192],
      [0.022, 0.188],
      [0.037, 0.176],
      [0.046, 0.155],
      [0.049, 0.126],
      [0.047, 0.09],
      [0.042, 0.06],
      [0.034, 0.034],
    ];
    const sole = (outline, top, bottom, material) =>
      mesh.prz(
        outline.map(([x, z]) => [s(x), s(z)]),
        s(top),
        s(bottom),
        material,
      );
    sole(forefoot, 0.061, 0.081, O.BLACK);
    // The narrow, raised waist joins the forefoot to a rounded block heel.
    sole(
      [
        [-0.031, -0.014],
        [-0.029, 0.02],
        [-0.035, 0.043],
        [0.035, 0.043],
        [0.029, 0.02],
        [0.031, -0.014],
      ],
      0.06,
      0.069,
      O.BLACK,
    );
    sole(
      [
        [-0.031, -0.053],
        [-0.041, -0.044],
        [-0.043, -0.012],
        [-0.031, 0.011],
        [0.031, 0.011],
        [0.043, -0.012],
        [0.041, -0.044],
        [0.031, -0.053],
      ],
      0.062,
      0.102,
      O.BLACK,
    );
    // Every tread is inset from the footprint, including the taper at the toe.
    const widths = [
      [0.034, 0.034],
      [0.06, 0.042],
      [0.09, 0.047],
      [0.126, 0.049],
      [0.155, 0.046],
      [0.176, 0.037],
      [0.188, 0.022],
      [0.192, 0],
    ];
    const widthAt = (z) => {
      const hi = widths.findIndex(([at]) => at >= z),
        a = widths[Math.max(0, hi - 1)],
        b = widths[hi];
      return a[1] + ((b[1] - a[1]) * (z - a[0])) / (b[0] - a[0]) - 0.003;
    };
    for (const z of [0.048, 0.076, 0.104, 0.132, 0.16]) {
      const end = z + 0.012,
        a = widthAt(z),
        b = widthAt(end),
        c = 0.003;
      sole(
        [
          [-a + c, z],
          [-a, z + c],
          [-b, end - c],
          [-b + c, end],
          [b - c, end],
          [b, end - c],
          [a, z + c],
          [a - c, z],
        ],
        0.079,
        0.089,
        GAUNTLET,
      );
    }
    // A short heel lug stays inside the rounded heel, clear of the arch.
    sole(
      [
        [-0.031, -0.045],
        [-0.036, -0.039],
        [-0.036, -0.023],
        [-0.03, -0.017],
        [0.03, -0.017],
        [0.036, -0.023],
        [0.036, -0.039],
        [0.031, -0.045],
      ],
      0.1,
      0.106,
      GAUNTLET,
    );
    mesh.pop();
    // Leather toe cap has a shallow sewn edge, not an armored metal shell.
    for (const side of [-1, 1]) {
      mesh.limb(
        [s(side * 0.041), s(-0.034), s(0.108)],
        [s(side * 0.027), s(-0.015), s(0.111)],
        s(0.0012),
        s(0.0012),
        O.BOOT,
        5,
      );
      mesh.limb(
        [s(side * 0.027), s(-0.015), s(0.111)],
        [0, s(-0.005), s(0.113)],
        s(0.0012),
        s(0.0012),
        O.BOOT,
        5,
      );
      for (const x of [0.014, 0.03])
        mesh.limb(
          [s(side * x), s(x > 0.02 ? -0.018 : -0.008), s(0.11)],
          [s(side * x), s(x > 0.02 ? -0.018 : -0.008), s(0.115)],
          s(0.00065),
          s(0.00065),
          O.CUFF,
          4,
        );
    }
    // Laces cross the vamp, with discrete metal eyelets at each end.
    for (let z = 0.025; z < 0.105; z += 0.021) {
      mesh.limb(
        [s(-0.021), s(0.003), s(z)],
        [s(0.021), s(0.003), s(z + 0.016)],
        s(0.0022),
        s(0.0022),
        O.BOOT,
        5,
      );
      mesh.limb(
        [s(0.021), s(0.004), s(z)],
        [s(-0.021), s(0.004), s(z + 0.016)],
        s(0.0022),
        s(0.0022),
        O.BOOT,
        5,
      );
      for (const side of [-1, 1])
        mesh.ball(s(side * 0.024), s(0.003), s(z), s(0.0033), BRONZE, 5);
    }
  };
  const oldLeg = f4;
  f4 = function (mesh, pose) {
    oldLeg(mesh, pose);
    mesh.push();
    mesh.translate(pose.hx, pose.hy, pose.hz);
    mesh.yaw(pose.yaw);
    mesh.pitch(pose.thigh);
    mesh.roll(pose.twist);
    mesh.ell(0, 0.065, q4 - 0.01, 0.068, 0.03, 0.06, O.BOOT, 8, {
      tex: leather,
    });
    mesh.pop();
  };
  V4 = function (time, drop = false, left = false) {
    if (time < 0 || time >= os) return null;
    const p = time / os,
      wind = ease(p, 0, 0.17),
      drive = ease(p, 0.17, drop ? 0.32 : 0.34),
      recover = ease(p, drop ? 0.6 : 0.49, 1);
    const extend = drive * (1 - recover),
      draw = wind * (1 - recover),
      side = left ? -1 : 1;
    return {
      hx: drop ? side * 0.145 : 0.085,
      hy: (drop ? -0.39 : -0.35) - 0.16 * recover,
      hz: -0.05 + 0.19 * extend,
      yaw: drop ? side * 0.025 : -0.22 - 0.035 * extend,
      thigh: -1.1 + 1.42 * draw - 0.04 * extend,
      knee: 1.25 + 0.66 * draw - 1.84 * extend,
      ankle: 0.45 - 0.72 * extend,
      twist: drop ? side * 0.06 : 0.22 - 0.12 * extend,
      turn: drop ? -side * (0.12 + 0.1 * extend) : -0.22 - 0.47 * extend,
    };
  };
  // Keep the two feet visible throughout the leap, and lower the weapon cleanly.
  const oldAnimate = set.prototype.step;
  set.prototype.step = function (dt, now, state, weapon, model) {
    const pose = oldAnimate.call(this, dt, now, state, weapon, model);
    if (window.__BLACK_SILENCE_QA?.viewPose)
      Object.assign(pose, window.__BLACK_SILENCE_QA.viewPose);
    if (pose.kick >= 0) {
      const p = pose.kick / os,
        amount = Qe(p, 0, 1, 0.2);
      pose.y -= amount * (pose.drop ? 0.15 : 0.065);
      pose.roll -= amount * (pose.drop ? 0.12 : 0.04);
      pose.sx *= 1 - amount * 0.7;
      pose.sy *= 1 - amount * 0.7;
    }
    if (state.cur < 2 && state.wstate === "fire") {
      const t = state.wtime,
        shotgun = state.cur === 1;
      const impulse=keyframe(t,fireFrames[state.cur]);
      const resistance=keyframe(t,[[0,0],[shotgun?.07:.04,1],[shotgun?.24:.15,.24],[shotgun?.43:.29,0]]);
      pose.recoil=impulse;
      pose.y-=Math.max(0,impulse)*(shotgun?.008:.004);
      pose.pitch+=(shotgun?.018:.01)*resistance;
      pose.roll+=(shotgun?.035:-.022)*impulse-(shotgun?.014:-.009)*resistance;
      pose.yaw+=(shotgun?-.012:.01)*impulse;
      pose.action=Math.max(pose.action,ease(t,0,.012)*(1-ease(t,.04,.11)));
    }
    return pose;
  };
  // Finisher wrists now move around the target instead of only appearing at impact.
  const leftFinish = s0t,
    rightFinish = r0t;
  s0t = function (mesh, kind, time, fade) {
    mesh.push();
    const twist = kind === 0 ? ease(time, 0.39, 0.79) : 0;
    mesh.translate(-0.015 * twist, 0.018 * twist, 0);
    mesh.roll(0.22 * twist);
    leftFinish(mesh, kind, time, fade);
    mesh.pop();
  };
  r0t = function (mesh, kind, time, fade) {
    mesh.push();
    if (kind === 0) mesh.roll(-0.24 * ease(time, 0.39, 0.79));
    else mesh.yaw(-0.1 * Math.max(0, i0t(time, 0.82)));
    rightFinish(mesh, kind, time, fade);
    mesh.pop();
  };
})();
