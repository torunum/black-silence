// Prologue refinement: use the original map, props, lighting and message line.
// The map build owns this state so a restart/load cannot retain tutorial flags.
(() => {
  let chapter = null;
  // Reuse the existing votive mesh, with a local untone-mapped amber flame.
  // Other flames, torches and chapters retain their original shared materials.
  const nativeVotive = di.votive;
  di.prologueVotive = {
    ...nativeVotive,
    build(box, cylinder, ...args) {
      return nativeVotive.build(
        (material, ...shape) =>
          box(material === "flame" ? "prologueAmber" : material, ...shape),
        cylinder,
        ...args,
      );
    },
  };
  const originalDecorMaterial = iR;
  iR = function (name) {
    if (name === "prologuePatinatedStone")
      return new Wt({ map: Ft.churchWall, color: 0x696e67 });
    if (name === "prologueMemorialStone")
      return new Wt({ map: Ft.dungeonWall, color: 0x414846 });
    if (name === "prologueWatermark") {
      const texture = Z(e0((ctx, width, height) => {
        ctx.clearRect(0, 0, width, height);
        for (let x = 0; x < width; x++) {
          const length = 6 + ((x * 17 + x * x * 7) % (height - 8));
          for (let y = 0; y < length; y++) {
            if ((x * 13 + y * 5) % 9 < 2) continue;
            ctx.fillStyle = `rgba(30,37,29,${0.42 + 0.3 * (1 - y / length)})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }, 32, 64));
      return new Wt({ map: texture, transparent: true, alphaTest: 0.2, depthWrite: false });
    }
    const glass = {
      prologueAmber: 0xff8626,
      prologueWineGlass: 0x692523,
      prologueSmokeGlass: 0x424d51,
      prologueOldGold: 0x82613b,
    };
    return glass[name] !== undefined
      ? new $e({ color: glass[name], toneMapped: false })
      : originalDecorMaterial(name);
  };

  // A damaged lancet behind the chapel altar. The original stone, iron and
  // glass palette keeps the silhouette readable at the game's low resolution.
  // The wall is still solid: these shallow pieces never create a false exit.
  di.prologueReliquary = {
    mode: "wall",
    cls: "decor",
    build(box) {
      // The window belongs to a damaged stone altar bay, rather than floating
      // on the broad wall. These pieces remain against the original masonry.
      box("prologuePatinatedStone", 6.15, 0.24, 0.27, E(0, 0.13, -0.86));
      box("slate", 6.3, 0.1, 0.31, E(0, 0.3, -0.83));
      for (const side of [-1, 1]) {
        box("prologuePatinatedStone", 0.29, 2.62, 0.29, E(side * 2.8, 1.61, -0.83));
        box("stone", 0.43, 0.18, 0.38, E(side * 2.8, 0.42, -0.78));
        box("stone", 0.44, 0.16, 0.37, E(side * 2.8, 2.92, -0.78));
        box("prologueWatermark", 1.15, side < 0 ? 1.7 : 0.85, 0.009,
          E(side * 2.04, side < 0 ? 1.98 : 2.38, -0.94));
      }
      // The broken cornice leaves a gap beside the right-hand window shoulder.
      box("slate", 1.78, 0.14, 0.3, E(-2.01, 3.06, -0.82));
      box("slate", 0.73, 0.14, 0.3, E(2.6, 3.06, -0.82));
      box("stone", 0.58, 0.12, 0.33, E(2.39, 0.07, -0.45, 0.04, -0.27, 0.08));
      box("dark", 1.7, 1.7, 0.025, E(0, 1.78, -0.965));
      for (const side of [-1, 1]) {
        box("slate", 0.16, 1.55, 0.18, E(side * 0.94, 1.68, -0.86));
        box("stone", 0.3, 0.14, 0.26, E(side * 0.94, 0.93, -0.82));
        box("stone", 0.3, 0.12, 0.23, E(side * 0.94, 2.38, -0.82));
        box("slate", 0.16, 1.11, 0.18,
          E(side * 0.57, 2.79, -0.86, 0, 0, side * 0.74));
      }
      box("stone", 0.23, 0.26, 0.22, E(0.02, 3.17, -0.83, 0, 0, 0.09));
      box("slate", 2.15, 0.17, 0.34, E(0, 0.83, -0.82));
      // Irregular diagonal shards suggest a shattered sacred image, rather
      // than a regular grid of intact panes. Empty areas remain truly black.
      for (const [x, y, width, height, material, tilt] of [
        [-0.61, 1.26, 0.17, 0.46, "prologueWineGlass", -0.2],
        [-0.35, 1.54, 0.19, 0.83, "prologueWineGlass", -0.34],
        [-0.2, 2.07, 0.12, 0.57, "prologueOldGold", -0.51],
        [0.4, 1.32, 0.18, 0.54, "prologueWineGlass", 0.21],
        [0.59, 1.67, 0.18, 0.49, "prologueSmokeGlass", 0.37],
        [0.28, 1.91, 0.15, 0.66, "prologueOldGold", 0.51],
        [-0.57, 1.96, 0.12, 0.24, "prologueSmokeGlass", -0.62],
        [0.05, 2.47, 0.27, 0.27, "prologueWineGlass", 0.79],
        [-0.1, 1.16, 0.09, 0.2, "prologueOldGold", -0.23],
      ]) box(material, width, height, 0.024, E(x, y, -0.943, 0, 0, tilt));
      box("wrought", 0.035, 1.92, 0.04, E(0, 1.83, -0.9));
      box("wrought", 0.98, 0.035, 0.04, E(0, 1.99, -0.9));
      for (const side of [-1, 1])
        box("wrought", 0.025, 0.98, 0.035, E(side * 0.3, 1.57, -0.9, 0, 0, side * 0.34));
      box("stone", 0.48, 0.13, 0.31, E(-1.12, 0.07, -0.35, 0, 0.4, 0.12));
      box("slate", 0.32, 0.1, 0.24, E(0.95, 0.05, -0.23, 0, -0.45, -0.08));
    },
  };
  // Funerary bridge markers are deliberately thin and off the walking lane.
  // Their broken caps and low fire establish a destination across the dark pit.
  di.prologueBridgeMarker = {
    mode: "free",
    cls: "decor",
    build(box, cylinder, spec) {
      const broken = spec.h || 0;
      box("rock", 0.72, 0.18, 0.7, E(0, 0.09, 0));
      box("slate", 0.44, 1.14 - broken, 0.42,
        E(0, 0.75 - broken * 0.5, 0));
      box("stone", 0.6, 0.13, 0.56, E(0.025, 1.37 - broken, 0, 0, 0.08));
      box("dark", 0.13, 0.58, 0.018, E(0, 0.88 - broken * 0.5, 0.218));
      box("dark", 0.3, 0.075, 0.018, E(0, 0.96 - broken * 0.5, 0.218));
      cylinder("wrought", 0.22, 0.15, 0.16, E(0, 1.5 - broken, 0), 6);
      for (const [x, height, z] of [[-0.12, 0.15, 0], [0.05, 0.27, 0.04], [0.13, 0.12, -0.06]])
        box("prologueAmber", 0.08, height, 0.08,
          E(x, 1.58 - broken + height * 0.5, z, 0, 0.3));
      box("rock", 0.27, 0.14, 0.32, E(0.37, 0.07, 0.13, 0.15, 0.6));
    },
  };
  di.prologueRitualSpine = {
    mode: "free",
    cls: "decor",
    build(box, cylinder, spec) {
      const side = spec.h < 0 ? -1 : 1;
      box("rock", 0.78, 0.15, 0.65, E(0, 0.075, 0));
      box("char", 0.15, 2.45, 0.15, E(0, 1.27, 0, 0, 0, side * 0.045));
      for (let index = 0; index < 4; index++) {
        const y = 0.8 + index * 0.44;
        box("oldbone", 0.23, 0.17, 0.2, E(side * 0.06, y, 0.035));
        for (const rib of [-1, 1]) {
          box("oldbone", 0.56 - index * 0.06, 0.075, 0.08,
            E(rib * (0.27 - index * 0.03), y - 0.08, 0.06, 0, rib * 0.12, rib * 0.37));
        }
      }
      box("bone", 0.28, 0.32, 0.25, E(side * 0.12, 2.58, 0, 0, side * 0.2, -side * 0.12));
      for (const eye of [-1, 1])
        box("dark", 0.065, 0.07, 0.025, E(side * 0.12 + eye * 0.075, 2.62, 0.132));
      box("cloth", 0.31, 0.69, 0.025, E(side * 0.21, 1.57, -0.08, 0, 0, side * 0.13));
      box("cloth", 0.12, 0.3, 0.025, E(side * 0.31, 1.12, -0.08, 0, 0, -side * 0.1));
    },
  };
  // Small islands of broken paving interrupt broad, flat ground without
  // suggesting a ledge. The highest fragment is only eight centimetres high.
  // These use existing atlas materials and join the native material batches.
  di.prologuePaving = {
    mode: "flat",
    cls: "decor",
    build(box, cylinder, spec) {
      const flip = spec.h < 0 ? -1 : 1;
      for (const [x, z, w, d, y, r] of [
        [-0.48, -0.38, 0.65, 0.51, 0.018, -0.11],
        [0.39, -0.28, 0.45, 0.61, 0.012, 0.17],
        [-0.39, 0.41, 0.73, 0.43, 0.015, 0.23],
        [0.7, 0.66, 0.22, 0.3, 0.024, -0.42],
      ]) box("rock", w, y * 2, d, E(x * flip, y, z, 0, r * flip));
      box("rock", 0.25, 0.11, 0.31, E(-0.94 * flip, 0.045, 0.24, 0.06, 0.48));
      box("rock", 0.17, 0.07, 0.22, E(0.92 * flip, 0.025, -0.81, 0, -0.35));
    },
  };
  // A sunken burial frame with two displaced lid sections. It has an open
  // silhouette and a low profile, rather than forming a continuous low wall.
  di.prologueBrokenGrave = {
    mode: "free",
    cls: "decor",
    build(box, cylinder, spec) {
      const side = spec.h < 0 ? -1 : 1;
      box("earth", 1.12, 0.035, 1.92, E(0, 0.018, 0));
      box("slate", 0.16, 0.18, 1.9, E(-0.62, 0.09, 0));
      box("rock", 0.17, 0.22, 0.91, E(0.63, 0.1, -0.47, 0, 0.04));
      box("slate", 1.35, 0.17, 0.17, E(-0.02, 0.08, -0.98));
      box("stone", 1.24, 0.14, 1.08, E(-0.1 * side, 0.18, -0.36, 0.12, -0.06, side * 0.065));
      box("slate", 0.94, 0.12, 0.64, E(0.27 * side, 0.1, 0.78, -0.1, side * 0.3));
      // Eroded incised cross stays attached to the upper lid.
      box("dark", 0.055, 0.018, 0.55, E(-0.1 * side, 0.298, -0.36, 0.12, -0.06));
      box("dark", 0.35, 0.018, 0.055, E(-0.1 * side, 0.31, -0.52, 0.12, -0.06));
      box("rock", 0.42, 0.14, 0.33, E(-0.87 * side, 0.07, 0.61, 0.1, side * 0.6));
    },
  };
  // Shallow repeating wall bays give the descent a funerary structure while
  // retaining the original corridor width and every collision surface.
  di.prologueCryptBay = {
    mode: "wall",
    cls: "decor",
    build(box) {
      box("prologueMemorialStone", 1.76, 0.35, 0.15, E(0, 0.185, -0.925));
      box("slate", 1.84, 0.09, 0.22, E(0, 0.405, -0.88));
      for (const x of [-0.78, 0.78]) {
        box("slate", 0.13, 1.95, 0.13, E(x, 1.02, -0.9));
        box("stone", 0.24, 0.13, 0.2, E(x, 0.14, -0.86));
        box("stone", 0.23, 0.1, 0.18, E(x, 1.98, -0.87));
      }
      box("slate", 1.68, 0.13, 0.15, E(0, 2.08, -0.88));
      box("prologueWatermark", 0.91, 1.12, 0.008, E(0.28, 1.38, -0.955));
      box("dark", 0.72, 0.69, 0.025, E(0, 1.16, -0.968));
      box("rock", 0.85, 0.09, 0.17, E(0, 0.78, -0.87));
      box("oldbone", 0.36, 0.065, 0.08, E(-0.08, 0.86, -0.87, 0, 0.13));
      box("oldbone", 0.28, 0.06, 0.075, E(0.15, 0.92, -0.9, 0, -0.16));
    },
  };
  di.prologueStonePortal = {
    mode: "wall",
    cls: "decor",
    build(box) {
      // The jambs lie beyond the existing two-metre opening, against masonry.
      for (const side of [-1, 1]) {
        box("rock", 0.32, 2.24, 0.28, E(side * 1.15, 1.12, -0.92));
        for (const y of [0.15, 0.83, 1.56, 2.22])
          box("stone", 0.42, 0.13, 0.34, E(side * 1.15, y, -0.87));
        box("slate", 0.3, 0.67, 0.27,
          E(side * 0.83, 2.5, -0.92, 0, 0, side * 0.75));
      }
      box("stone", 1.32, 0.18, 0.31, E(0, 2.77, -0.9));
      box("slate", 0.3, 0.31, 0.38, E(0, 2.73, -0.86));
      box("dark", 0.06, 0.16, 0.015, E(0, 2.74, -0.66));
    },
  };
  di.prologuePrisonMemorial = {
    mode: "wall",
    cls: "decor",
    build(box) {
      // Damp cells sit in a continuous low masonry course. The trim follows
      // the corridor wall, while local missing cap stones break its rhythm.
      box("prologueMemorialStone", 3.7, 0.48, 0.16, E(0, 0.25, -0.92));
      box("slate", 3.74, 0.1, 0.24, E(0, 0.54, -0.88));
      for (const side of [-1, 1]) {
        box("rock", 0.22, 2.41, 0.18, E(side * 1.72, 1.49, -0.9));
        box("stone", 0.31, 0.13, 0.25, E(side * 1.72, 2.65, -0.86));
        box("prologueWatermark", 0.6, side < 0 ? 1.38 : 0.94, 0.008,
          E(side * 1.15, side < 0 ? 1.86 : 2.08, -0.95));
      }
      box("rock", 2.52, 0.15, 0.23, E(-0.54, 2.79, -0.88));
      box("rock", 0.53, 0.15, 0.23, E(1.59, 2.79, -0.88));
      box("dark", 1.3, 1.27, 0.025, E(0, 1.46, -0.97));
      for (const side of [-1, 1]) {
        box("rock", 0.18, 1.49, 0.2, E(side * 0.75, 1.44, -0.88));
        box("slate", 0.21, 0.53, 0.2,
          E(side * 0.48, 2.32, -0.88, 0, 0, side * 0.78));
      }
      box("stone", 1.73, 0.13, 0.32, E(0, 0.68, -0.81));
      box("slate", 0.28, 0.26, 0.25, E(0, 2.48, -0.86));
      for (const x of [-0.43, 0, 0.43])
        box("wrought", 0.055, 1.33, 0.06, E(x, 1.44, -0.83));
      box("wrought", 1.31, 0.055, 0.06, E(0, 1.22, -0.83));
      box("oldbone", 0.24, 0.075, 0.07, E(0.28, 0.79, -0.85, 0, 0.3));
      box("rock", 0.28, 0.08, 0.21, E(-0.52, 0.04, -0.66, 0, 0.2));
    },
  };
  // Sealed loculi and two exposed burial shelves give the monastery crypt an
  // actual funerary purpose. The narrow bases/caps are native static batches;
  // all openings are shallow visual recesses in the existing solid wall.
  di.prologueBurialWall = {
    mode: "wall",
    cls: "decor",
    build(box, cylinder, spec) {
      const flip = spec.h < 0 ? -1 : 1;
      box("prologueMemorialStone", 3.64, 0.3, 0.22, E(0, 0.16, -0.88));
      box("slate", 3.8, 0.12, 0.31, E(0, 0.37, -0.84));
      box("prologuePatinatedStone", 3.8, 0.16, 0.26, E(0, 2.7, -0.87));
      box("slate", 3.9, 0.08, 0.29, E(0, 2.82, -0.84));
      for (const x of [-1.72, 0, 1.72])
        box("prologuePatinatedStone", 0.14, 2.24, 0.18, E(x, 1.52, -0.88));
      for (const [x, y, opened] of [[-0.86, 0.95, true], [0.86, 0.95, false], [-0.86, 2.02, false], [0.86, 2.02, true]]) {
        const xx = x * flip;
        box(opened ? "dark" : "prologueMemorialStone", 1.33, 0.62, 0.035, E(xx, y, -0.96));
        box("stone", 1.47, 0.12, 0.26, E(xx, y - 0.36, -0.84));
        box("prologuePatinatedStone", 1.46, 0.1, 0.19, E(xx, y + 0.36, -0.89));
        if (opened) {
          box("oldbone", 0.57, 0.065, 0.07, E(xx - 0.15, y - 0.23, -0.85, 0, 0.13));
          box("bone", 0.18, 0.19, 0.18, E(xx + 0.35, y - 0.18, -0.86, 0, -0.2, 0.12));
          box("oldbone", 0.38, 0.055, 0.065, E(xx + 0.07, y - 0.19, -0.9, 0, -0.24));
        } else {
          box("prologuePatinatedStone", 0.48, 0.028, 0.02, E(xx - 0.06, y - 0.12, -0.935));
          box("prologuePatinatedStone", 0.36, 0.025, 0.02, E(xx + 0.03, y - 0.22, -0.935));
          box("oldbone", 0.04, 0.23, 0.02, E(xx, y + 0.1, -0.934));
          box("oldbone", 0.17, 0.04, 0.02, E(xx, y + 0.15, -0.934));
        }
      }
      box("prologueWatermark", 1.48, 1.2, 0.008, E(-0.82 * flip, 2.06, -0.725));
    },
  };
  // A complete funerary facade bay, attached to existing masonry. Its lower
  // course, recessed tablet and cap share a clear architectural hierarchy.
  // The dark stone and drips are local surfaces, not a global palette change.
  di.prologueFacadeBay = {
    mode: "wall",
    cls: "decor",
    build(box, cylinder, spec) {
      const damaged = spec.h < 0;
      box("prologuePatinatedStone", 3.48, 0.24, 0.32, E(0, 0.13, -0.86));
      box("slate", 3.64, 0.11, 0.34, E(0, 0.29, -0.84));
      for (const side of [-1, 1]) {
        box("prologuePatinatedStone", 0.26, 2.55, 0.25, E(side * 1.55, 1.58, -0.88));
        box("stone", 0.4, 0.18, 0.34, E(side * 1.55, 0.43, -0.83));
        box("stone", 0.4, 0.14, 0.32, E(side * 1.55, 2.79, -0.84));
      }
      box("prologuePatinatedStone", 3.62, 0.18, 0.31, E(0, 2.97, -0.85));
      box("slate", 3.75, 0.1, 0.37, E(0, 3.11, -0.81));
      box("prologueMemorialStone", 1.46, 1.86, 0.08, E(0, 1.46, -0.94));
      for (const side of [-1, 1]) {
        box("prologuePatinatedStone", 0.11, 1.94, 0.13, E(side * 0.8, 1.46, -0.9));
        box("prologuePatinatedStone", 0.13, 0.69, 0.14,
          E(side * 0.47, 2.58, -0.9, 0, 0, side * 0.8));
      }
      box("slate", 1.76, 0.13, 0.22, E(0, 0.49, -0.85));
      box("oldbone", 0.1, damaged ? 0.48 : 0.69, 0.035, E(0, 1.74, -0.878));
      box("oldbone", damaged ? 0.33 : 0.51, 0.085, 0.035,
        E(damaged ? -0.07 : 0, 1.86, -0.877));
      // Worn, unequal inscription lines, intentionally not pseudo-readable text.
      for (const [y, width, x] of [[1.18, 0.71, 0], [1.04, 0.49, -0.08], [0.91, 0.61, 0.03]])
        box("prologuePatinatedStone", width, 0.025, 0.018, E(x, y, -0.88));
      box("prologueWatermark", 3.11, 1.33, 0.008, E(0, 2.2, -0.719));
      box("rock", 0.39, 0.12, 0.31, E(damaged ? 1.3 : -1.2, 0.06, -0.59, 0, 0.4));
    },
  };
  const originalBuild = gV[0].build;
  gV[0].build = function (...args) {
    const map = originalBuild.apply(this, args);
    chapter = { elapsed: 0, quiet: 0, shown: new Set(), grid: map.g };
    const place = (kind, x, z, options = {}) =>
      map.decor.push({ k: kind, x, z, ...options });
    const pickup = (x, z, kind) => {
      if (map.g[z]?.[x] === ".") map.g[z][x] = kind;
    };
    const move = (kind, fromX, fromZ, toX, toZ) => {
      if (map.g[fromZ]?.[fromX] === kind && map.g[toZ]?.[toX] === ".") {
        map.g[fromZ][fromX] = ".";
        map.g[toZ][toX] = kind;
      }
    };

    // The ruined chapel becomes an optional, visible reward before the descent.
    // These were empty floor cells; the altar, existing health and ammo stay.
    pickup(29, 4, "2");
    pickup(30, 4, "b");
    place("bones", 28.5, 4.5, { r: 1.2, s: 0.65 });
    place("light", 29, 4, { s: 1.7, h: 7.5, r: 1.7 });
    place("prologueReliquary", 29, 3);
    place("bench", 25.1, 8.8, { r: Math.PI / 2, s: 0.9 });
    place("urn", 31.7, 3.25, { s: 1.15, r: -0.25 });
    place("prologueVotive", 26.2, 3.45, { s: 0.8, r: 0.12 });
    place("glass", 28.3, 3.7, { s: 0.6, r: 0.35 });

    // A low procession of candles points from the open grave to the crypt.
    // Stay outside the two-cell stair throat so the run-up remains clear.
    for (const [x, z, scale, rotation] of [
      [7.9, 5.7, 0.8, 0.16],
      [11, 6, 0.7, -0.23],
      [8.2, 7.1, 0.9, 0],
      [10.8, 7.1, 0.75, 0.08],
    ]) {
      place("prologueVotive", x, z, { s: scale, r: rotation });
    }
    // Weathered low fragments frame the approach, clear of the central runway.
    // Native rubble/fallen headstones have no extra mass collision volumes.
    place("headstone", 7.25, 5.8, { h: 1.15, r: 0.35, s: 0.95 });
    place("headstone", 11.75, 6, { h: -0.28, r: -0.17, s: 0.85 });
    for (const [x, z, scale, rotation] of [
      [7.5, 6.3, 0.6, 0.2],
      [11.45, 5.45, 0.5, 1.2],
    ]) {
      place("rubble", x, z, { s: scale, r: rotation });
    }
    place("prologueBrokenGrave", 7.65, 5.25, { s: 1.18, r: 0.2, h: -1 });
    place("prologueBrokenGrave", 11.55, 6.1, { s: 1.45, r: -0.38 });
    for (const [x, z, scale, rotation, side] of [
      [8.1, 4.45, 1.2, 0.16, -1], [10.65, 4.95, 1.15, -0.12, 1],
      [8.65, 6.05, 0.85, 0.2, 1], [10.3, 6.8, 0.8, -0.18, -1],
      [7.2, 6.9, 0.9, 0.42, 1], [12.05, 5.1, 0.85, -0.3, -1],
      [8.8, 5.2, 0.73, -0.24, -1], [9.8, 6.4, 0.65, 0.27, 1],
      [9.55, 7.65, 0.68, 0.1, 1],
    ]) place("prologuePaving", x, z, { s: scale, r: rotation, h: side });
    place("headstone", 6.7, 7, { h: -0.31, r: 0.16, s: 1.2 });
    place("headstone", 11.95, 7.15, { h: 0.23, r: -0.27, s: 1.05 });
    for (const [x, z, scale, rotation] of [
      [7.8, 5.25, 0.55, 1.1],
      [11.1, 5.45, 0.55, -0.6],
      [12, 7.3, 0.6, 0.3],
    ]) {
      place("rubble", x, z, { s: scale, r: rotation });
    }
    place("light", 9.5, 7.7, { s: 0.65, h: 8, r: 1.2 });
    place("prologueFacadeBay", 7.5, 7, { r: Math.PI, h: -1 });
    place("prologueFacadeBay", 11.5, 7, { r: Math.PI });
    place("prologueVotive", 8.3, 10.4, { s: 1 });
    place("prologueVotive", 10.7, 10.4, { s: 1 });
    place("prologueVotive", 9.3, 11, { s: 1.15 });
    // Original light decorator: s = intensity, h = range, r = height above floor.
    // Its ember-red color is already part of the game's lighting palette.
    place("light", 9.5, 10.5, { s: 4.2, h: 12, r: 0.8 });
    place("light", 9.5, 13, { s: 2.4, h: 10, r: 0.7 });
    place("light", 9.5, 15, { s: 1.2, h: 8, r: 1.1 });
    place("bones", 9.8, 16.5, { r: 0.4, s: 0.45 });
    // The crypt changes from individual memorials to exposed communal bones.
    // Recesses sit on the side walls, leaving the entire stair width intact.
    place("niche", 8, 10, { r: Math.PI / 2, s: 0.9 });
    place("niche", 11, 10, { r: -Math.PI / 2, s: 0.9 });
    place("urn", 8.2, 9.65, { s: 0.8, r: 0.4 });
    place("bonestack", 11, 11, { r: -Math.PI / 2, s: 0.7 });
    place("niche", 9, 14, { r: Math.PI / 2, s: 0.75 });
    place("niche", 10, 16, { r: -Math.PI / 2, s: 0.75 });
    place("shackles", 9, 17, { r: Math.PI / 2, s: 0.65 });
    place("prologueCryptBay", 9, 13, { r: Math.PI / 2 });
    place("prologueCryptBay", 10, 15, { r: -Math.PI / 2 });
    place("prologueCryptBay", 9, 17, { r: Math.PI / 2 });

    // Give the player time to read the first bank and build up a sprint.
    // Preserve the original enemy count and types, including all later fights.
    move("z", 5, 19, 8, 22);
    move("z", 19, 25, 21, 27);
    move("w", 26, 20, 25, 23);
    pickup(7, 20, "a");
    pickup(3, 24, "b");
    pickup(29, 22, "b");

    // Frame the safe bridge landings without changing walkable geometry.
    for (const [x, z] of [
      [9.5, 26],
      [18.5, 26],
      [28, 22],
      [40, 27],
      [40, 30],
      [45.5, 52.5],
    ]) {
      const landing = x === 18.5 || (x === 40 && z === 30);
      place("light", x, z, { s: landing ? 1.35 : 0.55, h: 7, r: landing ? 1.3 : 0.75 });
    }
    place("bones", 28.2, 21.3, { r: 1.5, s: 0.7 });
    // Pair the far banks with recognizable silhouettes. Never decorate the
    // narrow bridge tiles themselves or add decorative collision masses.
    for (const [x, z, scale, broken, rotation] of [
      [18.35, 25.05, 1, 0, -Math.PI / 2],
      [18.35, 26.95, 0.9, 0.24, -Math.PI / 2],
      [39.05, 30.35, 0.9, 0.16, 0],
      [40.95, 30.35, 1, 0, 0],
    ]) place("prologueBridgeMarker", x, z, { s: scale, h: broken, r: rotation });
    place("skullpile", 18.8, 27.5, { s: 0.6, r: 1.1 });
    place("chain", 19, 25, { h: 2.8 });

    // The existing arena pyre remains the focal point: two unequal funerary
    // standards and one collapsed offering cluster mark its rear edge.
    place("prologueRitualSpine", 33, 54.65, { s: 1.25, h: -1, r: 0.2 });
    place("prologueRitualSpine", 37.2, 54.5, { s: 1.06, h: 1, r: -0.3 });
    place("urn", 36.7, 54.8, { s: 0.85, r: 1.2 });
    place("bones", 37.2, 54.75, { s: 0.55, r: 0.55 });
    place("light", 35, 53, { s: 1.25, h: 9, r: 1.2 });
    place("prologueBridgeMarker", 46.3, 51.2, { s: 0.8, h: 0.2, r: -Math.PI / 2 });
    place("prologueVotive", 46.25, 54.2, { s: 0.85, r: 0.3 });
    // Keep the turning-point candle inside the climb corridor; the former
    // western coordinate sat in masonry and hid the cue from the arena exit.
    place("candelabra", 55.25, 49.8, { s: 0.85 });
    place("light", 55.5, 48, { s: 0.7, h: 9, r: 1.2 });
    place("candelabra", 51, 10.5, { s: 0.8 });
    place("candelabra", 55, 10.5, { s: 0.8 });
    // A quieter, abandoned vigil identifies the refuge halfway up the climb.
    place("niche", 61, 26, { r: -Math.PI / 2, s: 0.85 });
    place("prologueVotive", 60.8, 26.2, { s: 0.8 });
    place("light", 60, 26, { s: 0.75, h: 7, r: 0.65 });
    return map;
  };

  // Two later chapter thresholds get their own identity. These wrappers only
  // append shallow, collision-free decor; the authored room grids, doors,
  // encounters, elevation and existing props remain exactly as shipped.
  for (const [level, additions] of [
    [9, [
      ["prologueStonePortal", 83, 74],
      ["prologueBurialWall", 81, 74, { h: -1 }],
      ["prologueBurialWall", 85, 74],
      ["prologueCryptBay", 80, 77, { r: Math.PI / 2 }],
      ["prologueCryptBay", 86, 77, { r: -Math.PI / 2 }],
      ["prologueVotive", 81.2, 74.2, { s: 0.75 }],
      ["prologueVotive", 84.8, 74.2, { s: 0.65 }],
      ["prologuePaving", 82.8, 75.3, { s: 0.8, r: -0.12 }],
      ["prologuePaving", 83.25, 77.5, { s: 0.65, r: 0.22, h: -1 }],
      ["prologueBurialWall", 79, 62],
      ["prologueBurialWall", 85, 62, { h: -1 }],
      ["prologueBrokenGrave", 75, 68.5, { s: 0.8, r: 0.42 }],
    ]],
    [1, [
      ["prologuePrisonMemorial", 11, 2],
      ["prologuePrisonMemorial", 17, 2],
      ["prologuePrisonMemorial", 25, 2],
      ["prologueStonePortal", 8, 5, { r: Math.PI / 2 }],
      ["prologuePaving", 9.4, 4.6, { s: 0.7, r: 0.13 }],
      ["prologuePaving", 15.1, 3.4, { s: 0.8, r: -0.24, h: -1 }],
      ["prologuePaving", 22.4, 3.2, { s: 0.75, r: 0.17 }],
      ["bonesLoose", 25.2, 2.3, { s: 0.5, r: 0.4 }],
    ]],
  ]) {
    if (!gV[level]) continue;
    const build = gV[level].build;
    gV[level].build = function (...args) {
      const map = build.apply(this, args);
      for (const [kind, x, z, options = {}] of additions) {
        const cell = map.g[Math.floor(z + 0.5)]?.[Math.floor(x + 0.5)];
        if (cell && !"#WI+DS".includes(cell))
          map.decor.push({ k: kind, x, z, ...options });
      }
      return map;
    };
  }

  // Dense zone fog suppresses distant point lights. Give the inner votive a
  // local ember source using the engine's native sprites and additive materials.
  // Depth testing hides it behind masonry; it has no collision or gameplay role.
  const originalDecorBuild = FJ;
  FJ = function (scene, map) {
    originalDecorBuild(scene, map);
    if (T.level !== 0 || !map.grave || !chapter || map.g !== chapter.grid)
      return;
    const glowTexture = Z(
      e0(
        (ctx, width, height) => {
          const gradient = ctx.createRadialGradient(
            width / 2,
            height / 2,
            0,
            width / 2,
            height / 2,
            width / 2,
          );
          gradient.addColorStop(0, "rgba(255,255,255,1)");
          gradient.addColorStop(0.25, "rgba(255,255,255,0.78)");
          gradient.addColorStop(0.6, "rgba(255,255,255,0.23)");
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        },
        32,
        32,
      ),
    );
    const floorY = map.hmap[11][9];
    const haloMaterial = Z(
      new qV({
        map: glowTexture,
        color: 0xff0800,
        transparent: true,
        opacity: 0.72,
        blending: is,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
    const halo = new nh(haloMaterial);
    halo.name = "prologueEmberHalo";
    halo.position.set(19.65, floorY + 0.9, 21.9);
    halo.scale.set(3.6, 3.3, 1);
    scene.add(halo);
    const poolMaterial = Z(
      new $e({
        map: glowTexture,
        color: 0xc91102,
        transparent: true,
        opacity: 0.45,
        blending: is,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
    const pool = new pt(Z(new Xe(3.5, 2.8)), poolMaterial);
    pool.name = "prologueEmberPool";
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(19.65, floorY + 0.018, 22.3);
    scene.add(pool);
    // A faint, broken reflection anchors the ruined window to the altar aisle.
    // The same small canvas/nearest-filter texture path as native props keeps
    // its edges pixelated; it is a local stain of light rather than a beam.
    const glassSpillTexture = Z(e0((ctx, width, height) => {
      const pieces = [
        ["#924625", [[4, 8], [11, 3], [13, 15], [8, 19]]],
        ["#774f32", [[16, 3], [21, 8], [19, 21], [15, 14]]],
        ["#603333", [[22, 12], [28, 17], [25, 27], [21, 23]]],
        ["#6c5e45", [[8, 21], [12, 20], [16, 28], [10, 27]]],
      ];
      for (const [color, points] of pieces) {
        ctx.fillStyle = color;
        ctx.beginPath();
        points.forEach(([x, y], index) => index
          ? ctx.lineTo(x * width / 32, y * height / 32)
          : ctx.moveTo(x * width / 32, y * height / 32));
        ctx.closePath();
        ctx.fill();
      }
    }, 32, 32));
    const glassSpill = new pt(Z(new Xe(2.8, 3.2)), Z(new $e({
      map: glassSpillTexture,
      transparent: true,
      opacity: 0.18,
      blending: is,
      depthWrite: false,
      toneMapped: false,
    })));
    glassSpill.name = "prologueChapelGlassSpill";
    glassSpill.rotation.x = -Math.PI / 2;
    glassSpill.rotation.z = -0.1;
    glassSpill.position.set(59.1, map.hmap[4][29] + 0.021, 10);
    scene.add(glassSpill);
    const flameTexture = Z(
      Jn(["  y  ", "  Y  ", " yYy ", " oYo ", "  o  "], {
        y: "#ff7316",
        Y: "#ffe398",
        o: "#a91d04",
      }),
    );
    for (let index = 0; index < 9; index++) {
      const height = 0.1 + ((index * 7) % 5) * 0.035;
      const material = Z(
        new qV({
          map: flameTexture,
          transparent: true,
          depthWrite: false,
          fog: false,
          toneMapped: false,
        }),
      );
      const flame = new nh(material);
      flame.name = "prologueVotiveFlame";
      flame.position.set(
        19.6 + (-0.28 + (index % 5) * 0.14) * 1.15,
        floorY + (0.33 + height + 0.04) * 1.15,
        23 + (index < 5 ? -0.12 : 0.12) * 1.15,
      );
      flame.scale.set(0.1, 0.17, 1);
      scene.add(flame);
    }
    chapter.glow = [haloMaterial, poolMaterial];
    // Nine slow embers live only over the arena's existing pyre. One tiny
    // point cloud adds motion without a global particle field or extra lights.
    const ashPositions = new Float32Array(27);
    const ashGeometry = Z(new h0());
    ashGeometry.setAttribute("position", new me(ashPositions, 3));
    const ash = new Qu(ashGeometry, Z(new Sh({
      color: 0xc7844b,
      size: 0.065,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    })));
    ash.name = "prologuePyreAsh";
    ash.position.set(71, map.hmap[52][35] + 1.6, 105);
    ash.frustumCulled = false;
    scene.add(ash);
    chapter.ash = {
      node: ash,
      geometry: ashGeometry,
      positions: ashGeometry.attributes.position.array,
    };
  };

  function hint(key, text, seconds = 3.8) {
    if (chapter.shown.has(key) || chapter.quiet > 0 || mf > 0.05) return false;
    chapter.shown.add(key);
    chapter.quiet = seconds + 7;
    le(text, seconds);
    return true;
  }

  const originalDoorsUpdate = F$;
  F$ = function (dt) {
    originalDoorsUpdate(dt);
    if (
      !chapter ||
      T.level !== 0 ||
      v.grid !== chapter.grid ||
      !Be.started ||
      T.dead ||
      T.won ||
      Be.inputLock ||
      Be.pianoOpen ||
      Wk() ||
      Qm()
    )
      return;
    chapter.elapsed += dt;
    chapter.quiet = Math.max(0, chapter.quiet - dt);
    if (chapter.glow) {
      const flicker =
        1 +
        Math.sin(chapter.elapsed * 7.1) *
          Math.sin(chapter.elapsed * 3.3) *
          0.07;
      chapter.glow[0].opacity = 0.72 * flicker;
      chapter.glow[1].opacity = 0.45 * flicker;
    }
    if (chapter.ash) {
      const { positions, geometry, node } = chapter.ash;
      node.visible = Math.hypot(C.px - 71, C.pz - 105) < 34;
      if (node.visible) {
        for (let index = 0; index < 9; index++) {
          const age = (chapter.elapsed * (0.12 + (index % 3) * 0.018) + index * 0.117) % 1;
          positions[index * 3] = Math.sin(index * 2.4 + age * 2.3) * (0.3 + age * 0.65);
          positions[index * 3 + 1] = age * 2.7;
          positions[index * 3 + 2] = Math.cos(index * 1.7 + age * 1.2) * 0.48;
        }
        geometry.attributes.position.needsUpdate = true;
      }
    }
    if (chapter.elapsed < 5 || oo.busy) return;
    const x = C.px / P - 0.5,
      z = C.pz / P - 0.5;

    // Actual nearby stagger takes priority; never imply a guaranteed stagger.
    const staggered = v.enemies.some(
      (enemy) =>
        !enemy.dead &&
        enemy.stagger > 0 &&
        Math.hypot(enemy.x - C.px, enemy.z - C.pz) < 9 &&
        lm(C.px, C.pz, enemy.x, enemy.z),
    );
    if (
      staggered &&
      hint("finish", "A WOUNDED ENEMY FALTERS — CLOSE IN AND PRESS E", 3.5)
    )
      return;

    // The distant exit chamber also lies north of row 12. Restrict the opening
    // chapel hints to the churchyard so loading near the ladder stays useful.
    if (z < 12 && x < 38) {
      if (x > 22 && !T.weapons[1]) {
        hint("chapel", "THE CHAPEL ALTAR HOLDS A SHOTGUN");
      } else if (T.weapons[1] && !chapter.shown.has("shotgun")) {
        hint("shotgun", "SHOTGUN: CLOSE THE DISTANCE — R TO RELOAD");
      } else if (x < 22) {
        hint("descent", "FOLLOW THE CANDLES INTO THE CRYPT");
      }
      return;
    }
    if (z < 19 && x < 15) {
      hint("kick", "SHIFT + W TO SPRINT — RIGHT MOUSE TO DROP KICK", 4.5);
      return;
    }
    if (x < 18 && z >= 19 && z < 35) {
      if (
        !chapter.shown.has("kick") &&
        hint("kick", "SHIFT + W, THEN RIGHT MOUSE — DROP KICK", 4)
      )
        return;
      hint("bridge", "CROSS THE LIT STONE BRIDGE — KEEP OUT OF THE PIT");
      return;
    }
    if (x >= 18 && x < 32 && z >= 19 && z < 35) {
      hint("passage", "THE EASTERN PASSAGE LEADS DEEPER");
      return;
    }
    if (x >= 32 && x < 49 && z >= 16 && z < 41) {
      hint("second_bridge", "CROSS THE NARROW BRIDGE — THE ARENA LIES SOUTH");
      return;
    }
    if (z >= 41 && x < 51) {
      hint("arena", "PUSH THROUGH THE ARENA — FIND THE EASTERN STAIR");
      return;
    }
    if (x >= 51 && z > 15) {
      hint("ascent", "CLIMB TOWARD THE CANDLELIGHT");
      return;
    }
    if (x >= 48 && z <= 15)
      hint("exit", "THE LADDER IS YOUR WAY OUT — APPROACH AND PRESS E");
  };
})();
