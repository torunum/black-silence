// Authored hand silhouettes and three melee sequences, using the native rasterizer.
// Impact times stay aligned with the original combat/audio events (.32/.56/.82).
(() => {
  const smooth = (t, a, b) => Ia(t, a, b);
  const mix = (a, b, t) => Ml(a, b, t);
  const leather = (x, y, z) =>
    window.__silenceMaterialTone?.(0, x, y, z) ?? cp(x, y, z);
  const sphereTemplates = new Map();

  function sphereTemplate(segments) {
    if (sphereTemplates.has(segments)) return sphereTemplates.get(segments);
    const rows = Math.max(3, segments - 2),
      faces = [];
    const point = (row, column) => {
      const latitude = (Math.PI * row) / rows,
        longitude = (2 * Math.PI * column) / segments;
      return [
        Math.sin(latitude) * Math.cos(longitude),
        Math.cos(latitude),
        Math.sin(latitude) * Math.sin(longitude),
      ];
    };
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < segments; column++) {
        const latitude = (Math.PI * (row + 0.5)) / rows,
          longitude = (2 * Math.PI * (column + 0.5)) / segments;
        const points = [
          point(row, column),
          point(row, column + 1),
          point(row + 1, column + 1),
          point(row + 1, column),
        ];
        faces.push({
          points:
            row === 0
              ? [points[0], points[2], points[3]]
              : row === rows - 1
                ? [points[0], points[1], points[2]]
                : points,
          normal: [
            Math.sin(latitude) * Math.cos(longitude),
            Math.cos(latitude),
            Math.sin(latitude) * Math.sin(longitude),
          ],
        });
      }
    sphereTemplates.set(segments, faces);
    return faces;
  }

  // Identical native geometry, with reusable trigonometry and bounded vector
  // lengths. Hands retain smooth normals and the original specular response.
  function fastEll(x, y, z, rx, ry, rz, material, segments = 8, options) {
    const part = options?.part ?? this.part(),
      inverse = options?.tex ? this.inverse() : undefined;
    const normalAt = (px, py, pz) => {
      const nx = (px - x) / (rx * rx),
        ny = (py - y) / (ry * ry),
        nz = (pz - z) / (rz * rz),
        length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      return [nx / length, ny / length, nz / length];
    };
    for (const face of sphereTemplate(segments)) {
      const n = face.normal,
        nx = n[0] / rx,
        ny = n[1] / ry,
        nz = n[2] / rz,
        length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const points = face.points.map((p) => [
        x + rx * p[0],
        y + ry * p[1],
        z + rz * p[2],
      ]);
      this.face(
        points,
        [nx / length, ny / length, nz / length],
        material,
        part,
        options,
        inverse,
        normalAt,
      );
    }
  }
  function fastBall(x, y, z, radius, material, segments = 6, options) {
    fastEll.call(
      this,
      x,
      y,
      z,
      radius,
      radius,
      radius,
      material,
      segments,
      options,
    );
  }
  function fastShade(palette, material, nx, ny, nz, position, smooth = false) {
    const entry = palette.materials[material];
    if (!entry) return 0;
    const maximum = entry.ramp.length - 1;
    if (entry.emissive) return maximum - 0.2;
    const ambient = entry.amb ?? 0.2,
      diffuse = Math.max(0, nx * N3 + ny * G3 + nz * F3);
    let light = ambient + (0.84 - ambient) * diffuse;
    if (entry.spec) {
      const [x, y, z] = position,
        length = Math.sqrt(x * x + y * y + z * z) || 1;
      let hx = N3 - x / length,
        hy = G3 - y / length,
        hz = F3 - z / length;
      const halfLength = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
      hx /= halfLength;
      hy /= halfLength;
      hz /= halfLength;
      const d = Math.max(0, nx * hx + ny * hy + nz * hz),
        d2 = d * d,
        d4 = d2 * d2,
        d8 = d4 * d4;
      light += entry.spec * (d8 * d8 * d8) * 0.8;
      if (smooth) light += entry.spec * (d4 * d) * 0.45;
    }
    return Math.min(maximum, light * maximum);
  }

  function finger(mesh, points, radius) {
    // limb already rounds its end; do not stack duplicate joint spheres.
    mesh.ball(...points[0], radius, O.GLOVE, 6, { tex: leather });
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i],
        r = radius * (1 - i * 0.12);
      mesh.limb(p, points[i + 1], r, r * 0.88, O.GLOVE, 6, { tex: leather });
    }
  }

  function hand(mesh, side, curl, blood) {
    const part = mesh.part();
    // The wrist narrows into the palm; four knuckles form a transverse row.
    mesh.ell(0, -0.002, -0.019, 0.021, 0.013, 0.023, O.GLOVE, 8, {
      tex: leather,
      part,
    });
    mesh.ell(0, 0.001, 0.003, 0.029, 0.014, 0.027, O.GLOVE, 8, {
      tex: leather,
      part,
    });
    mesh.ell(side * -0.025, -0.007, -0.003, 0.012, 0.013, 0.019, O.GLOVE, 7, {
      tex: leather,
      part,
    });
    for (let i = 0; i < 4; i++) {
      const x = side * (-0.022 + i * 0.0145),
        length = [0.054, 0.06, 0.056, 0.045][i];
      const spread = side * (i - 1.4) * 0.15 * (1 - curl);
      let angle = 0.05 + curl * 0.18;
      const points = [[x, 0.003, 0.023]];
      for (let j = 0; j < 3; j++) {
        angle += 0.06 + curl * (j === 0 ? 1.04 : 1.17);
        const previous = points[j],
          segment = length * [0.44, 0.33, 0.23][j];
        points.push([
          previous[0] + Math.sin(spread) * segment,
          previous[1] - Math.sin(angle) * segment,
          previous[2] + Math.cos(angle) * segment,
        ]);
      }
      finger(mesh, points, i === 3 ? 0.0068 : 0.0079);
      mesh.ell(x, 0.009, 0.024, 0.007, 0.0044, 0.009, O.BOOT, 7, {
        tex: leather,
      });
      // Subtle stitched channels separate the tendons on the glove back.
      mesh.limb(
        [x * 0.65, 0.014, -0.011],
        [x, 0.015, 0.015],
        0.0009,
        0.0008,
        O.CUFF,
        5,
      );
    }
    finger(
      mesh,
      [
        [side * -0.029, -0.007, -0.009],
        [side * (-0.042 + 0.01 * curl), -0.014, 0.012],
        [side * (-0.033 + 0.025 * curl), -0.023 - 0.008 * curl, 0.028],
      ],
      0.009,
    );
    if (blood > 0) {
      for (let i = 0; i < blood; i++)
        mesh.ell(
          side * (-0.019 + i * 0.012),
          0.01,
          0.028,
          0.0034,
          0.0016,
          0.005,
          O.RED,
          5,
        );
    }
  }

  function drawHand(mesh, side, pose, fade, blood = 0) {
    mesh.push();
    mesh.translate(pose.p[0], pose.p[1] - 0.32 * (1 - fade), pose.p[2]);
    mesh.yaw(pose.yaw ?? 0);
    mesh.roll(pose.roll);
    mesh.pitch(pose.pitch);
    hand(mesh, side, pose.curl, blood);
    // The sleeve follows the actual wrist instead of attaching below the fist.
    sleeve(mesh, side);
    mesh.pop();
  }

  function sleeve(mesh, side) {
    mesh.push();
    mesh.translate(0, -0.004, -0.032);
    const [x, y, z] = mesh.dirFromCam([side * 0.46, -0.66, -1]);
    mesh.yaw(Math.atan2(x, z));
    mesh.pitch(Math.atan2(y, Math.hypot(x, z)));
    mesh.cyl(0, 0, -0.014, 0.055, 0.021, 0.027, 8, O.GLOVE, { tex: leather });
    mesh.cyl(0, 0, 0.026, 0.041, 0.028, 0.028, 8, O.BOOT, { tex: leather });
    mesh.cbox(-0.006, 0.027, 0.027, 0.006, 0.032, 0.04, 0.0015, O.BRASS);
    mesh.cyl(0, 0, 0.054, 0.079, 0.03, 0.034, 8, 27, { tex: leather });
    // Flat native facets preserve the pixel-lit coat while avoiding costly
    // per-pixel smooth normals across two screen-filling sleeves.
    const ring = (radius) =>
      Array.from({ length: 12 }, (_, i) => [
        Math.cos((i * Math.PI) / 6) * radius,
        Math.sin((i * Math.PI) / 6) * radius,
      ]);
    // Match the dark leather gauntlet palette authored by viewmodels.js.
    mesh.prz(ring(0.035), 0.074, 0.19, 27, { tex: leather, r1: 1.17 });
    mesh.prz(ring(0.041), 0.19, 0.46, 27, { tex: leather, r1: 1.27 });
    mesh.prz(ring(0.037), 0.084, 0.091, 27, { tex: leather, r1: 1.01 });
    mesh.ball(0.029, 0.023, 0.095, 0.003, O.BRASS, 5);
    mesh.pop();
  }

  function neck(side, time) {
    const reach = smooth(time, 0.05, 0.25),
      clamp = smooth(time, 0.25, 0.32);
    const crank = smooth(time, 0.38, 0.56),
      snap = smooth(time, 0.77, 0.825);
    const release = smooth(time, 0.97, 1.2),
      left = side < 0;
    let p = mix(
      [side * 0.17, -0.18, 0.14],
      left ? [-0.046, 0.032, 0.42] : [0.046, -0.002, 0.415],
      reach,
    );
    p = mix(p, left ? [-0.038, 0.049, 0.405] : [0.04, -0.008, 0.4], crank);
    p = mix(p, left ? [-0.085, 0.055, 0.34] : [0.1, -0.025, 0.34], snap);
    p = mix(p, [side * 0.21, -0.2, 0.18], release);
    return {
      p,
      roll: -side * (0.62 + 0.22 * crank + 0.55 * snap),
      pitch: 0.62 - 0.25 * snap,
      yaw: -side * (0.24 + 0.12 * snap),
      curl: 0.14 + 0.46 * clamp + 0.12 * crank - 0.25 * release,
    };
  }

  function punch(side, time) {
    const reach = smooth(time, 0.06, 0.28),
      release = smooth(time, 0.96, 1.2);
    if (side < 0) {
      const recoil = Math.max(0, 1 - Math.abs(time - 0.56) / 0.055) * 0.015;
      const p = mix(
        [-0.17, -0.16, 0.15],
        [-0.085, 0.025 - recoil, 0.445],
        reach,
      );
      return {
        p: mix(p, [-0.18, -0.21, 0.18], release),
        roll: 0.96,
        pitch: 0.55,
        yaw: 0.35,
        curl: 0.12 + 0.49 * reach,
      };
    }
    let active = 0,
      hit = 0;
    for (let i = 0; i < 3; i++) {
      const pulse = i0t(time, Xn[i]);
      if (pulse !== -1) {
        active = pulse;
        hit = i;
      }
    }
    const rest = [0.165, -0.085, 0.19],
      windup = [0.215, -0.12, 0.12];
    const target =
      hit === 2
        ? [0.005, 0.072, 0.48]
        : hit === 1
          ? [-0.005, 0.025, 0.485]
          : [0.025, 0.045, 0.48];
    let p = active < 0 ? mix(rest, windup, -active) : mix(rest, target, active);
    p = mix(p, [0.2, -0.22, 0.15], release);
    return {
      p,
      roll: -0.38 - 0.7 * Math.max(0, active),
      pitch: 0.38 + 0.34 * Math.max(0, active),
      yaw: -0.18 + 0.15 * Math.max(0, active),
      curl: 0.96,
    };
  }

  function tear(side, time) {
    const reach = smooth(time, 0.08, 0.3),
      grip = smooth(time, 0.27, 0.32);
    const tension = smooth(time, 0.38, 0.49),
      rip = smooth(time, 0.515, 0.568);
    const release = smooth(time, 1.0, 1.22);
    if (side < 0) {
      let p = mix([-0.17, -0.17, 0.16], [-0.068, -0.016, 0.43], reach);
      p = mix(p, [-0.09, -0.004, 0.395], tension);
      p = mix(p, [-0.205, 0.018, 0.265], rip);
      p = mix(p, [-0.23, -0.21, 0.17], release);
      return {
        p,
        roll: 0.4 + 0.6 * rip,
        pitch: 0.5 - 0.65 * rip,
        yaw: 0.16 + 0.35 * rip,
        curl: 0.16 + 0.57 * grip,
        rip,
      };
    }
    const blow = Math.max(0, i0t(time, 0.82));
    let p = mix([0.18, -0.16, 0.16], [0.068, 0.015, 0.43], reach);
    p = mix(p, [0.14, 0.025, 0.31], rip);
    p = mix(p, [0.012, 0.06, 0.48], blow);
    p = mix(p, [0.21, -0.2, 0.18], release);
    return {
      p,
      roll: -0.55 - 0.5 * blow,
      pitch: 0.6 + 0.18 * blow,
      yaw: -0.25,
      curl: 0.17 + 0.46 * grip + 0.32 * smooth(time, 0.63, 0.72),
    };
  }

  function render(mesh, side, kind, time, fade) {
    const pose =
      kind === 0
        ? neck(side, time)
        : kind === 1
          ? punch(side, time)
          : tear(side, time);
    drawHand(mesh, side, pose, fade, time > 0.56 ? 3 : time > 0.32 ? 1 : 0);
    if (kind === 2 && side < 0 && pose.rip > 0.45) {
      // Retain the existing torn-arm prop, now held clearly beside the target.
      mesh.push();
      mesh.translate(
        pose.p[0],
        pose.p[1] - 0.32 * (1 - fade) - 0.02,
        pose.p[2] + 0.025,
      );
      mesh.roll(pose.roll);
      mesh.pitch(-0.72);
      mesh.cyl(0, 0, 0, 0.14, 0.024, 0.018, 7, O.SKIN);
      mesh.ball(0, 0, 0, 0.025, O.RED, 6);
      mesh.cyl(0, 0, -0.023, 0, 0.008, 0.008, 5, O.BONE);
      mesh.ball(0, 0, 0.15, 0.019, O.SKIN, 6);
      mesh.pop();
    }
  }
  function optimizedRender(mesh, side, kind, time, fade) {
    const shade = z3,
      ell = mesh.ell,
      ball = mesh.ball;
    mesh.ell = fastEll;
    mesh.ball = fastBall;
    z3 = fastShade;
    try {
      render(mesh, side, kind, time, fade);
    } finally {
      mesh.ell = ell;
      mesh.ball = ball;
      z3 = shade;
    }
  }
  s0t = (mesh, kind, time, fade) => optimizedRender(mesh, -1, kind, time, fade);
  r0t = (mesh, kind, time, fade) => optimizedRender(mesh, 1, kind, time, fade);

  // Kick rendering creates separate weapon and leg meshes. Scope the same
  // pixel-identical helpers around that synchronous draw, then restore them
  // even if a model throws; idle weapons keep the untouched native path.
  const nativeViewRender = e0t;
  e0t = function (raster, model, pose, centerX, centerY) {
    if (!(pose.kick >= 0))
      return nativeViewRender(raster, model, pose, centerX, centerY);
    const shade = z3,
      ell = Xf.prototype.ell,
      ball = Xf.prototype.ball;
    Xf.prototype.ell = fastEll;
    Xf.prototype.ball = fastBall;
    z3 = fastShade;
    try {
      return nativeViewRender(raster, model, pose, centerX, centerY);
    } finally {
      Xf.prototype.ell = ell;
      Xf.prototype.ball = ball;
      z3 = shade;
    }
  };
})();
