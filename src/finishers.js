// First-person choreography for the three native executions.
// The native impact, health and cleanup scheduler still owns .32/.56/.82.
(() => {
  const smooth = (t, a, b) => Ia(t, a, b);
  const leather = (x, y, z) =>
    (window.__silenceMaterialTone?.(0, x, y, z) ?? cp(x, y, z)) * .48;
  const cuffLeather = 27;
  const darkLeather = (x, y, z) => leather(x, y, z) - .47;
  const edgeLeather = (x, y, z) => leather(x, y, z) + .24;
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
      mesh.limb(p, points[i + 1], r, r * 0.88, O.GLOVE, 6, { tex: darkLeather });
      if (i > 0) mesh.ell(p[0], p[1] + r * .78, p[2], r * .92, r * .28, r * .31,
        cuffLeather, 5, { tex: leather });
    }
  }

  function hand(mesh, side, curl, spread, marks) {
    const part = mesh.part();
    // The wrist tapers into a broad, low dorsal palm. Draw the little finger
    // lower than the index so the open hand never reads as a flat comb.
    mesh.ell(0, -0.002, -0.019, 0.022, 0.012, 0.023, O.GLOVE, 8, {
      tex: leather,
      part,
    });
    mesh.ell(0, 0.001, 0.003, 0.030, 0.014, 0.027, O.GLOVE, 9, {
      tex: darkLeather,
      part,
    });
    mesh.ell(side * .002, .0115, -.003, .021, .006, .021, cuffLeather, 7, {
      tex: darkLeather, part,
    });
    mesh.ell(side * -0.025, -0.006, -0.003, 0.012, 0.013, 0.019, O.GLOVE, 7, {
      tex: leather,
      part,
    });
    for (let i = 0; i < 4; i++) {
      const x = side * (-0.022 + i * 0.0145),
        length = [0.054, 0.06, 0.056, 0.045][i];
      const fan = side * (i - 1.35) * (0.1 + spread * 0.24) * (1 - curl);
      const base = [0.024, 0.026, 0.023, 0.017][i];
      let angle = 0.04 + curl * 0.15;
      const points = [[x, 0.003, base]];
      for (let j = 0; j < 3; j++) {
        angle += 0.035 + curl * (j === 0 ? 1.13 : 1.20);
        const previous = points[j],
          segment = length * [0.44, 0.33, 0.23][j];
        points.push([
          previous[0] + Math.sin(fan) * segment,
          previous[1] - Math.sin(angle) * segment,
          previous[2] + Math.cos(angle) * segment,
        ]);
      }
      finger(mesh, points, i === 3 ? 0.0063 : 0.0074);
      mesh.ell(x, 0.009, base, 0.007, 0.0036, 0.0087, O.GLOVE, 7, {
        tex: leather,
      });
      if (i < 3) mesh.limb([x * .64, .0155, -.011], [x * .93, .015, .018],
        .00105, .00105, O.GLOVE, 4, { tex: edgeLeather });
    }
    finger(
      mesh,
      [
        [side * -0.029, -0.007, -0.009],
        [side * (-0.043 - 0.006 * spread + 0.010 * curl), -0.011, 0.011],
        [side * (-0.049 - 0.011 * spread + 0.036 * curl), -0.016 - 0.012 * curl, 0.029],
      ],
      0.0085,
    );
    if (marks > 0) {
      for (let i = 0; i < marks; i++)
        mesh.ell(
          side * (-0.019 + i * 0.012),
          0.012,
          0.027,
          0.0025,
          0.0011,
          0.003,
          O.RED,
          5,
        );
    }
  }

  function orientHand(mesh, pose) {
    mesh.translate(...pose.p);
    mesh.yaw(pose.yaw);
    mesh.roll(pose.roll);
    mesh.pitch(pose.pitch);
  }

  function drawHand(mesh, side, pose, marks = 0) {
    mesh.push();
    orientHand(mesh, pose);
    hand(mesh, side, pose.curl, pose.spread, marks);
    sleeve(mesh, side, pose.elbow);
    mesh.pop();
  }

  const sleeveRing = Array.from({ length: 12 }, (_, i) =>
    [Math.cos(i * Math.PI / 6), Math.sin(i * Math.PI / 6)]);
  const sleeveProfile = [
    [-.014, .023, cuffLeather, darkLeather], [.017, .025, cuffLeather, darkLeather],
    [.024, .031, O.GLOVE, edgeLeather], [.033, .033, O.GLOVE, leather],
    [.045, .032, cuffLeather, darkLeather], [.072, .033, cuffLeather, darkLeather],
    [.080, .037, O.GLOVE, edgeLeather], [.088, .038, O.GLOVE, leather],
    [.103, .036, cuffLeather, darkLeather], [.143, .038, cuffLeather, darkLeather],
    [.202, .042, cuffLeather, leather], [.305, .047, cuffLeather, darkLeather],
    [.49, .053, cuffLeather, darkLeather],
  ];

  function sleeveShell(mesh, side, elbow) {
    const part = mesh.part(), inv = mesh.inverse();
    let previous;
    for (const [z, radius, material, tex] of sleeveProfile) {
      const bend = Math.max(0, z - .095);
      const center = side * bend * (.1 + elbow * .14);
      const ring = sleeveRing.map(([x, y]) =>
        [center + x * radius, y * radius * .85 - bend * .13, z]);
      if (previous) {
        const options = { tex };
        for (let i = 0; i < ring.length; i++) {
          const j = (i + 1) % ring.length;
          const normal = [sleeveRing[i][0] + sleeveRing[j][0],
            (sleeveRing[i][1] + sleeveRing[j][1]) / .85, 0];
          const norm = Math.hypot(normal[0], normal[1]);
          normal[0] /= norm;
          normal[1] /= norm;
          mesh.face([previous[i], previous[j], ring[j], ring[i]], normal,
            material, part, options, inv);
        }
      }
      previous = ring;
    }
  }

  function sleeve(mesh, side, elbow) {
    mesh.push();
    mesh.translate(0, -0.004, -0.032);
    const [x, y, z] = mesh.dirFromCam([side * (0.37 + elbow * 0.15), -0.76, -1]);
    mesh.yaw(Math.atan2(x, z));
    mesh.pitch(Math.atan2(y, Math.hypot(x, z)));
    sleeveShell(mesh, side, elbow);
    for (const z of [0.052, 0.110]) {
      const radius = z < .08 ? .032 : .037;
      for (let seam = 0; seam < 5; seam++) {
        const angle = (.18 + seam * .16) * Math.PI;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * .86;
        mesh.cyl(x, y, z, z + .003, .0010, .0010, 4, O.GLOVE, { tex: edgeLeather });
      }
    }
    mesh.ell(side * -.010, .027, .043, .0033, .0022, .0038, O.BRASS, 6);
    mesh.ell(side * -.012, .031, .098, .0031, .0022, .0035, O.BRASS, 6);
    mesh.limb([side * -.012, .028, .052], [side * -.015, .032, .122],
      .00135, .00135, O.GLOVE, 5, { tex: edgeLeather });
    mesh.pop();
  }

  // Entries contain time, wrist x/y/depth, roll/pitch/yaw, finger curl,
  // contact weight, and elbow extension. Separate the returning hand from
  // the bracing hand, and key each impact instead of overlapping pulses.
  const leftGuard = [0, -.18, -.40, .18, -.13, .68, .09, .21, 0, .08];
  const rightGuard = [0, .16, -.37, .16, -.37, .46, -.14, .80, 0, .08];
  const leftExit = [Sk, -.22, -.42, .17, .07, .48, .04, .31, 0, .1];
  const rightExit = [Sk, .19, -.43, .14, -.31, .42, -.11, .31, 0, .1];
  const hands = [
    [
      [leftGuard,
        [.13, -.171, -.067, .24, -.37, 1.22, .26, .21, 0, .12],
        [.215, -.158, -.046, .30, -.27, 1.15, .31, .24, .27, .28],
        [.265, -.117, -.010, .35, -.08, 1.07, .34, .35, .65, .43],
        [.32, -.090, .005, .39, .25, .89, .35, .63, 1, .64],
        [.44, -.097, .014, .38, .34, .88, .38, .72, 1, .67],
        [.56, -.076, .008, .36, .62, .84, .52, .77, 1, .60],
        [.73, -.050, .027, .36, .73, .88, .51, .74, 1, .56],
        [.82, -.114, .028, .31, .96, .60, .56, .88, .92, .71],
        [.89, -.115, .020, .32, .89, .60, .54, .76, .65, .59],
        [1.04, -.132, -.096, .22, .49, .83, .19, .28, 0, .38],
        leftExit],
      [rightGuard,
        [.13, .151, -.099, .23, -.51, .67, -.20, .67, 0, .16],
        [.217, .130, -.089, .27, -.57, .72, -.27, .47, .27, .22],
        [.269, .106, -.048, .34, -.58, .86, -.33, .51, .67, .38],
        [.32, .091, -.031, .39, -.63, .93, -.37, .67, 1, .58],
        [.44, .090, -.030, .37, -.72, .95, -.39, .74, 1, .66],
        [.56, .066, -.042, .35, -.94, .83, -.47, .78, 1, .57],
        [.73, .061, -.045, .35, -.98, .81, -.43, .78, 1, .55],
        [.82, .127, -.015, .32, -1.13, .60, -.51, .89, .86, .68],
        [.91, .139, -.055, .31, -1.02, .59, -.47, .71, .48, .53],
        [1.06, .158, -.143, .20, -.46, .61, -.25, .33, 0, .35],
        rightExit],
    ],
    [
      [leftGuard,
        [.13, -.108, -.122, .246, .65, .83, .41, .17, 0, .18],
        [.19, -.118, -.086, .287, .77, .97, .46, .29, .10, .30],
        [.26, -.101, -.016, .39, .54, .90, .32, .48, .91, .58],
        [.32, -.097, -.021, .40, .61, .83, .39, .57, 1, .62],
        [.44, -.095, -.005, .39, .55, .92, .36, .53, 1, .60],
        [.56, -.101, -.031, .36, .74, .80, .41, .66, 1, .33],
        [.68, -.105, -.007, .39, .62, .92, .36, .49, 1, .61],
        [.82, -.085, -.049, .36, .89, .76, .47, .66, .83, .69],
        [.93, -.129, -.064, .32, .66, .74, .30, .43, .29, .56],
        [1.08, -.156, -.15, .23, .21, .78, .14, .23, 0, .33],
        leftExit],
      [rightGuard,
        [.13, .183, -.028, .207, -.70, .74, -.39, .95, 0, .2],
        [.23, .184, -.029, .175, -.48, .63, -.42, .96, 0, .16],
        [.28, .143, -.014, .30, -.58, .51, -.29, .94, .19, .49],
        [.32, .034, .026, .49, -.89, .72, -.22, .97, 1, .89],
        [.355, .016, -.002, .50, -.97, .61, -.30, .96, .88, .82],
        [.43, .158, -.072, .24, -.56, .52, -.30, .83, 0, .31],
        [.48, .188, -.092, .18, -.41, .47, -.39, .95, 0, .22],
        [.56, .020, -.016, .50, -.98, .63, -.31, .98, 1, .93],
        [.605, .010, -.048, .50, -1.05, .51, -.43, .91, .80, .78],
        [.68, .156, -.054, .22, -.57, .57, -.24, .93, 0, .35],
        [.74, .180, .019, .22, -.56, .76, -.26, .96, 0, .49],
        [.82, .014, .054, .53, -1.02, .72, -.13, .99, 1, .99],
        [.87, -.015, -.006, .52, -1.14, .58, -.29, .92, .68, .72],
        [.98, .113, -.116, .26, -.66, .50, -.25, .70, 0, .28],
        [1.08, .156, -.154, .19, -.60, .68, -.14, .45, 0, .19],
        rightExit],
    ],
    [
      [leftGuard,
        [.13, -.135, -.058, .25, -.24, 1.11, .26, .22, 0, .16],
        [.24, -.098, -.06, .34, .56, .63, .34, .32, .6, .41],
        [.32, -.094, -.039, .40, .72, .61, .49, .65, 1, .55],
        [.45, -.087, -.008, .39, .82, .71, .47, .74, 1, .54],
        [.53, -.081, .018, .38, 1.04, .60, .56, .82, 1, .68],
        [.585, -.154, -.002, .24, 1.23, .30, .46, .79, .13, .36],
        [.69, -.164, -.016, .27, 1.18, .19, .47, .70, 0, .37],
        [.82, -.158, -.043, .28, 1.22, .09, .41, .78, 0, .42],
        [.99, -.179, -.104, .24, .96, .26, .23, .57, 0, .26],
        [1.13, -.184, -.245, .23, .46, .34, .16, .46, 0, .18],
        leftExit],
      [rightGuard,
        [.13, .147, -.085, .23, -.25, .59, -.20, .49, 0, .16],
        [.25, .101, -.086, .32, -.63, .78, -.33, .27, .45, .48],
        [.32, .085, -.050, .44, -.75, .76, -.39, .63, 1, .59],
        [.46, .081, -.040, .44, -.85, .78, -.53, .65, 1, .62],
        [.56, .094, -.052, .37, -.94, .62, -.48, .71, .82, .48],
        [.675, .183, -.056, .23, -.32, .51, -.38, .91, 0, .30],
        [.735, .198, -.029, .22, -.37, .79, -.34, .96, 0, .49],
        [.82, .009, .041, .53, -.96, .76, -.24, .98, 1, .95],
        [.88, -.014, -.008, .52, -1.02, .63, -.38, .91, .64, .68],
        [1.05, .153, -.129, .22, -.59, .55, -.21, .45, 0, .28],
        rightExit],
    ],
  ];

  function sampleTrack(track, time) {
    for (let i = 1; i < track.length; i++) {
      const end = track[i];
      if (time > end[0]) continue;
      const start = track[i - 1];
      const blend = smooth(time, start[0], end[0]);
      return start.map((number, index) => number + (end[index] - number) * blend);
    }
    return track.at(-1);
  }

  const projected = new Y();
  const clamp = (number, lower, upper) => Math.max(lower, Math.min(number, upper));
  let executionPose = null;
  let contactRun = null;
  let leftArmAvailable = false;
  const contactPlane = new Float64Array(6);

  function alignToOpponent(mesh, pose, side, kind, time) {
    const view = executionPose;
    if (!view || !ve.e || ve.from !== contactRun || pose.bind === 0) return;
    const camera = J.camera;
    const world = camera.matrixWorld.elements;
    const [worldX, worldY, worldZ, actorWidth, actorHeight, angle] = contactPlane;
    // Target a point on the visible sprite plane, including its current lean.
    const striking = side > 0 && kind !== 0 && (kind !== 2 || time > .68);
    const sideReach = kind === 1 ? .26 : kind === 2 ? .31 : .28;
    const brace = side < 0 ? (kind === 2 ? .15 : .265) : (kind === 2 ? .15 : .14);
    const lateral = actorWidth * (striking ? .02 : side * sideReach);
    const height = actorHeight * (striking ? .345 : brace);
    const x = lateral * Math.cos(angle) - height * Math.sin(angle);
    const y = lateral * Math.sin(angle) + height * Math.cos(angle);
    projected.set(worldX + world[0] * x + world[4] * y,
      worldY + world[1] * x + world[5] * y,
      worldZ + world[2] * x + world[6] * y).project(camera);
    if (!(projected.z >= -1 && projected.z <= 1) || Math.abs(projected.x) > .93 ||
        Math.abs(projected.y) > .96) return;

    const width = bj();
    const heightPx = MR();
    const scale = heightPx / Dk / _r;
    const canvasX = (width - Wr * scale) / 2 + view.sx;
    const canvasY = heightPx - Xs * scale + view.sy;
    const targetX = (width * (1 + projected.x) / 2 - canvasX) / scale;
    const targetY = (heightPx * (1 - projected.y) / 2 - canvasY) / scale;
    mesh.push();
    orientHand(mesh, pose);
    const [handX, handY, depth] = mesh.toCam(0, -.006, striking ? .034 : .029);
    mesh.pop();
    if (!(depth > 0)) return;
    const dx = depth * (targetX - mesh.cx) / mesh.F - handX;
    const dy = depth * (mesh.cy - targetY) / mesh.F - handY;
    const shift = mesh.dirFromCam([clamp(dx, -.23, .23), clamp(dy, -.17, .17), 0]);
    for (let i = 0; i < 3; i++) pose.p[i] += shift[i] * pose.bind;
  }

  function render(mesh, side, kind, time) {
    const track = hands[kind]?.[side < 0 ? 0 : 1];
    if (!track) return;
    const values = sampleTrack(track, time);
    const [, x, y, z, roll, pitch, yaw, curl, bind, elbow] = values;
    const pose = { p: [x, y, z], roll, pitch, yaw, curl, bind, elbow, spread: side < 0 ? 1 : .6 };
    alignToOpponent(mesh, pose, side, kind, time);
    drawHand(mesh, side, pose, time > .56 && side > 0 ? 2 : time > .32 ? 1 : 0);
    const holdingArm = !ve.e || (leftArmAvailable && ve.e.sever?.lArm);
    if (kind === 2 && side < 0 && time >= Lm[1] && time < Sk && holdingArm) {
      // The native world prop remains latched until the hand drops below view.
      mesh.push();
      orientHand(mesh, pose);
      mesh.translate(0, -.024, .027);
      mesh.roll(-1.32);
      mesh.pitch(-.46);
      mesh.cyl(0, 0, -.060, .076, .015, .022, 8, O.COAT, { tex: leather, caps: true });
      mesh.cyl(0, 0, -.069, -.057, .017, .017, 8, O.BOOT);
      mesh.cyl(0, 0, .054, .066, .023, .023, 8, O.BOOT);
      mesh.ell(0, -.004, -.086, .018, .013, .028, O.SKIN, 7, { tex: darkLeather });
      mesh.pop();
    }
  }
  function optimizedRender(mesh, side, kind, time) {
    const shade = z3,
      ell = mesh.ell,
      ball = mesh.ball;
    mesh.ell = fastEll;
    mesh.ball = fastBall;
    z3 = fastShade;
    try {
      render(mesh, side, kind, time);
    } finally {
      mesh.ell = ell;
      mesh.ball = ball;
      z3 = shade;
    }
  }
  s0t = (mesh, kind, time) => optimizedRender(mesh, -1, kind, time);
  r0t = (mesh, kind, time) => optimizedRender(mesh, 1, kind, time);

  // The left prop borrows the target's own cloth and exposed-skin ramps.
  // Scope the donor palette to one software frame so world sprites, other
  // opponents and every weapon retain the normal palette object.
  let groundskeeperHeldPalette;
  const nativeHeldRaster = h0t;
  h0t = function (index, pose, center) {
    const held = pose.execKind === 2 && pose.exec >= Lm[1] && pose.exec < Sk &&
      leftArmAvailable && ve.e?.key === "z" && ve.e.sever?.lArm;
    const skin = held && zL.palette.materials[16];
    const wool = held && zL.palette.materials[19];
    if (!skin || !wool) return nativeHeldRaster(index, pose, center);
    const raster = Te.raster, previous = raster.pal;
    groundskeeperHeldPalette ??= { ...previous, ...By({ ...previous.materials,
      [O.COAT]: wool, [O.SKIN]: skin }) };
    raster.pal = groundskeeperHeldPalette;
    try {
      return nativeHeldRaster(index, pose, center);
    } finally {
      raster.pal = previous;
    }
  };

  const nativeExecutionRasterKey = q0t;
  q0t = function (index, pose, center) {
    const key = nativeExecutionRasterKey(index, pose, center);
    if (pose.exec < 0 || !ve.e) return key;
    const { position, rotation, fov } = J.camera;
    const sprite = ve.e.sp;
    const fields = [bj(), MR(), fov, position.x, position.y, position.z,
      rotation.x, rotation.y, rotation.z, sprite.position.x, sprite.position.y,
      sprite.position.z, sprite.material.rotation];
    return key + "," + fields.map(value => Math.round(value * 10000)).join(",");
  };
  const nativeExecutionDraw = A0t.draw;
  A0t.draw = function (mesh, pose) {
    const previous = executionPose;
    executionPose = pose;
    if (ve.e) {
      const sprite = ve.e.sp;
      if (!ve.e.dead && sprite.visible) {
        if (contactRun !== ve.from) leftArmAvailable = !ve.e.sever?.lArm;
        contactRun = ve.from;
        contactPlane[0] = sprite.position.x;
        contactPlane[1] = sprite.position.y;
        contactPlane[2] = sprite.position.z;
        contactPlane[3] = sprite.scale.x;
        contactPlane[4] = sprite.scale.y;
        contactPlane[5] = sprite.material.rotation;
      }
      J.camera.updateMatrixWorld();
    }
    try {
      return nativeExecutionDraw.call(this, mesh, pose);
    } finally {
      executionPose = previous;
    }
  };

  // Animate the presentation after native AI has settled its stagger pose.
  // The opponent's hitbox, facing, stagger timer and reward stay native.
  const opponentMotion = [
    [[0, 0, 0], [.125, -.04, -.205], [.20, -.03, -.17], [.28, -.02, -.037],
      [.32, -.02, -.025], [.355, -.14, -.065], [.46, -.04, -.018],
      [.58, .15, -.058], [.70, .19, -.029], [.79, .24, -.028], [.82, .31, -.045]],
    [[0, 0, 0], [.27, -.015, -.04], [.35, -.17, -.105], [.48, .012, -.043],
      [.59, .15, -.12], [.74, -.024, -.035], [.82, -.19, -.115]],
    [[0, 0, 0], [.29, .025, -.03], [.36, -.09, -.094], [.49, -.14, -.14],
      [.58, -.24, -.10], [.71, .026, -.08], [.82, .20, -.12]],
  ];
  const settlingOpponents = new Set();

  function showCollapse(landing) {
    const enemy = landing.target;
    if (landing.scene !== J.scene || !v.enemies.includes(enemy) || enemy.gone ||
        enemy.deathT >= W6 + H6) {
      settlingOpponents.delete(landing);
      return;
    }
    const time = enemy.deathT;
    const fall = smooth(time, .026, landing.kind === 0 ? .27 : .23);
    const sprite = enemy.sp;
    const rig = wk(enemy);
    if (rig?.rig?.poses.die) {
      let frame = 0;
      for (let i = 1; i < zw.length; i++) if (fall >= zw[i]) frame = i;
      Ym(enemy, rig.tex(enemy.sever?.legs ? "crawlDie" : "die", frame,
        Mk(enemy, true), enemy.deathDir < 0));
    }
    // Let the terminal actor drop before the native skid brings it nearer the
    // player's eyes. The blend stays on its original, collision-checked path.
    const skid = smooth(time, .13, .43);
    sprite.position.x = landing.x + (sprite.position.x - landing.x) * skid;
    sprite.position.z = landing.z + (sprite.position.z - landing.z) * skid;
    sprite.position.y = ie(sprite.position.x, sprite.position.z) +
      enemy.h * (.50 - .32 * fall) + U_(enemy) * (1 - fall);
    sprite.material.rotation += (landing.kind === 0 ? .19 : -.23) * Math.sin(Math.PI * fall);
    enemy.blob.position.x = sprite.position.x;
    enemy.blob.position.z = sprite.position.z;
    if (!landing.sounded && fall >= .91 && ve.e === enemy && !T.dead && !T.won && It()) {
      landing.sounded = true;
      Nt(sprite.position.x, sprite.position.y - enemy.h * .12, sprite.position.z,
        () => gt(releaseScuff));
    }
  }

  const animateFinisherOpponent = qtt;
  qtt = function (dt) {
    const danger = animateFinisherOpponent(dt);
    for (const landing of settlingOpponents) showCollapse(landing);
    const enemy = ve.e;
    if (!enemy || enemy.dead || !enemy.executing || !v.enemies.includes(enemy)) return danger;
    const [, lean, dip] = sampleTrack(opponentMotion[ve.kind], ve.t);
    const sprite = enemy.sp;
    const shift = Math.sin(lean) * enemy.h * .19;
    sprite.material.rotation = lean;
    sprite.position.set(enemy.x + Math.cos(Ct.yaw) * shift,
      Sa(enemy) + dip, enemy.z - Math.sin(Ct.yaw) * shift);
    if (ve.t < .25 && !enemy.sever?.legs) {
      const rig = wk(enemy);
      if (rig?.rig?.poses.idle) Ym(enemy, rig.tex("idle", 0, Mk(enemy)));
    }
    // Preserve the amber stagger cue through approach, then let the folds of
    // the actual enemy sprite read at the closer execution distance.
    sprite.material.color.lerp(finisherShade, smooth(ve.t, 0, .17) * .65);
    sprite.material.color.multiplyScalar(.94 - smooth(ve.t, 0, .19) * .105);
    return danger;
  };
  const finisherShade = new xe(0xdcc7b2);

  const sleeveBrush = [
    { noise: "pink", filters: [{ type: "bandpass", f: 910, to: 420, over: .10, q: .78 }],
      env: { a: .018, h: .014, d: .105 }, level: .19 },
    { noise: "brown", filters: [{ type: "bandpass", f: 185, q: .8 }],
      env: { a: .012, h: .022, d: .080 }, level: .24 },
  ];
  const sleeveSnap = [
    { noise: "pink", filters: [{ type: "bandpass", f: 710, to: 290, over: .082, q: .7 }],
      env: { a: .010, h: .008, d: .074 }, level: .18 },
    { noise: "brown", filters: [{ type: "bandpass", f: 238, q: .89 }],
      env: { a: .006, h: .013, d: .071 }, level: .18 },
  ];
  const releaseScuff = [
    { noise: "brown", filters: [{ type: "bandpass", f: 165, to: 99, over: .098, q: .72 }],
      env: { a: .006, h: .011, d: .13 }, level: .20 },
    { noise: "pink", filters: [{ type: "bandpass", f: 330, q: .76 }],
      env: { a: .014, h: .005, d: .073 }, level: .075 },
  ];
  const garmentCues = [
    [[.098, sleeveBrush, -1], [.485, sleeveSnap, 1]],
    [[.110, sleeveBrush, -1], [.245, sleeveSnap, 1], [.480, sleeveSnap, 1],
      [.738, sleeveSnap, 1], [.968, releaseScuff, 1]],
    [[.115, sleeveBrush, -1], [.452, sleeveSnap, -1], [.741, sleeveSnap, 1]],
  ];
  const stepExecution = H_;
  H_ = function (dt) {
    const time = ve.t, run = ve.from, enemy = ve.e;
    const startingCollapse = enemy && !enemy.dead && time < Lm[2] && time + dt >= Lm[2] &&
      ve.kind !== 1 && { target: enemy, x: enemy.x, z: enemy.z, kind: ve.kind, scene: J.scene };
    const result = stepExecution(dt);
    if (!enemy || ve.e !== enemy || ve.from !== run) return result;
    if (startingCollapse && enemy.dead && enemy.deathKind === 2)
      settlingOpponents.add(startingCollapse);
    if (!It()) return result;
    // Follow native execution time so pause, hitstop and cancellation also govern Foley.
    const yaw = Ct.yaw;
    for (const [at, sound, side] of garmentCues[ve.kind]) {
      if (time < at && ve.t >= at)
        Nt(C.px + Math.cos(yaw) * side * .32 - Math.sin(yaw) * .40, C.pyy - .40,
          C.pz - Math.sin(yaw) * side * .32 - Math.cos(yaw) * .40, () => gt(sound));
    }
    return result;
  };

  // Keep the same pooled particles, trajectories and random draws. Size only
  // the flourish particles here so regular combat and its decals stay intact.
  function installScaledPoints(geometry, material, count) {
    const attribute = new y0(new Float32Array(count).fill(1), 1);
    geometry.setAttribute("finisherScale", attribute);
    const compile = material.onBeforeCompile;
    material.onBeforeCompile = function (shader, renderer) {
      compile.call(this, shader, renderer);
      const size = "gl_PointSize = size;", nativeTail = "#include <logdepthbuf_vertex>";
      if (shader.vertexShader.includes(size) && shader.vertexShader.includes(nativeTail)) {
        // Limit the projected pixels after perspective scaling, even if a
        // particle flies almost into the eye during a close camera pass.
        const cap = "if (finisherScale < 1.0) gl_PointSize = min(gl_PointSize, 1.0 + 8.0 * finisherScale);";
        shader.vertexShader = "attribute float finisherScale;\n" + shader.vertexShader
          .replace(size, "gl_PointSize = size * finisherScale;")
          .replace(nativeTail, cap + "\n" + nativeTail);
      }
    };
    return attribute;
  }
  let particleScale;
  const nativeParticleInit = ZK;
  ZK = function () {
    nativeParticleInit.call(this);
    particleScale = installScaledPoints(hl, fd.material, ql);
  };
  const nativeParticle = Cn;
  const nearExecution = (enemy, x, z) =>
    enemy && Math.abs(enemy.x - x) < .65 && Math.abs(enemy.z - z) < .65;
  Cn = function (x, y, z, vx, vy, vz, red, green, blue, life, kind) {
    const executionParticle = (kind === 1 || kind === 4) && nearExecution(ve.e, x, z);
    if (particleScale) {
      const size = executionParticle ? (ve.t < Lm[0] ? .1875 : .375) : 1;
      if (particleScale.getX(Mf) !== size) {
        particleScale.setX(Mf, size);
        particleScale.needsUpdate = true;
      }
    }
    const color = executionParticle ? .76 : 1;
    return nativeParticle(x, y, z, vx, vy, vz, red * color, green * color,
      blue * color, life, kind);
  };

  const nativeDropPool = DM;
  DM = function (count) {
    const bucket = nativeDropPool.apply(this, arguments);
    bucket.finisherScale = installScaledPoints(bucket.geo, bucket.points.material, count);
    return bucket;
  };
  function fitDropSizes(bucket, first, count, size) {
    const attr = bucket?.finisherScale;
    if (!attr) return;
    let changed = false;
    for (let i = 0; i < count; i++) {
      const slot = (first + i) % bucket.max;
      if (attr.getX(slot) === size) continue;
      attr.setX(slot, size);
      changed = true;
    }
    if (changed) attr.needsUpdate = true;
  }
  const nativeWorldDrops = VA, nativeWorldMist = N6;
  VA = function (x, y, z, count) {
    const first = vg?.next;
    const result = nativeWorldDrops.apply(this, arguments);
    fitDropSizes(vg, first, count, nearExecution(ve.e, x, z) ? .15625 : 1);
    return result;
  };
  N6 = function (x, y, z, count) {
    const first = Ug?.next;
    const result = nativeWorldMist.apply(this, arguments);
    fitDropSizes(Ug, first, count, nearExecution(ve.e, x, z) ? .25 : 1);
    return result;
  };

  const nativeFragments = ss, nativeLargeFragment = s9, nativeBurst = w9;
  ss = function (x, y, z, count, speed, wood) {
    const result = nativeFragments.apply(this, arguments);
    if (!wood && nearExecution(ve.e, x, z))
      for (let i = Math.max(0, oA.length - count); i < oA.length; i++)
        oA[i].m.scale.multiplyScalar(.38);
    return result;
  };
  s9 = function (x, y, z) {
    const result = nativeLargeFragment.apply(this, arguments);
    if (nearExecution(ve.e, x, z)) oA.at(-1)?.m.scale.multiplyScalar(.20);
    return result;
  };
  const fragmentScales = new Float32Array(sn).fill(1);
  const fragmentMatrix = new fe(), fragmentUniform = new Y();
  const nativeFragmentTransform = Q6;
  Q6 = function (slot) {
    nativeFragmentTransform.call(this, slot);
    const scale = fragmentScales[slot];
    if (scale !== 1) {
      Zn.getMatrixAt(slot, fragmentMatrix);
      fragmentMatrix.scale(fragmentUniform.setScalar(scale));
      Zn.setMatrixAt(slot, fragmentMatrix);
    }
  };
  w9 = function (x, y, z, count) {
    if (Zn) {
      const scale = nearExecution(ve.e, x, z) ? .46 : 1;
      for (let i = 0; i < count; i++) fragmentScales[(wf + i) % sn] = scale;
    }
    return nativeBurst.apply(this, arguments);
  };

  // The native impact RNG advances as before. Screen splats recede during
  // an execution so the next contact can still be seen.
  const nativeFinisherSpatter = Rf;
  Rf = function () {
    const count = Zq.length;
    const result = nativeFinisherSpatter.apply(this, arguments);
    if (ve.e) {
      for (let i = count; i < Zq.length; i++) {
        Zq[i].r *= .34;
        Zq[i].life *= .54;
      }
    }
    return result;
  };

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
