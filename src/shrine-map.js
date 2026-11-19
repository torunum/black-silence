// Both native maps use Bk for known items and draw the player above that layer.
(() => {
  const shrineColor = "#83d1c5";
  const ink = "#af9d7d";
  const levels = [1, 2, 4];
  let zoom = 0, grid = null, layout = null;
  // This layer uses device pixels at the visible canvas's exact origin and
  // scale. Keep the moving player, trail, icons and labels on the live canvas.
  const backdrop = {
    canvas: null, context: null, current: false, pending: false,
    view: {}, discovery: null, mappedGrid: null, heights: null, liftHeight: null,
    doorKeys: [], openDoors: null
  };

  function lamp(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#132623";
    ctx.lineWidth = .46;
    ctx.fillStyle = shrineColor;
    ctx.beginPath();
    ctx.moveTo(0, -1.2);
    ctx.bezierCurveTo(.05, -.7, .57, -.48, .48, -.1);
    ctx.bezierCurveTo(.36, .32, -.5, .34, -.5, -.12);
    ctx.bezierCurveTo(-.51, -.53, -.18, -.62, 0, -1.2);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-.84,.31); ctx.lineTo(.84,.31); ctx.lineTo(.5,.75);
    ctx.lineTo(.19,.75); ctx.lineTo(.19,.92); ctx.lineTo(.57,.92);
    ctx.lineTo(.57,1.12); ctx.lineTo(-.57,1.12); ctx.lineTo(-.57,.92);
    ctx.lineTo(-.19,.92); ctx.lineTo(-.19,.75); ctx.lineTo(-.5,.75);
    ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }

  const nativeSymbols = Bk;
  Bk = function (ctx, map, cell, time) {
    nativeSymbols(ctx, map, cell, time);
    const shrine = Q0.marks[Q0.snap?.mark];
    if (!shrine?.lit) return;
    const x = shrine.x / P, y = shrine.z / P;
    if (!map.seen[Math.floor(y) * map.W + Math.floor(x)]) return;
    ctx.save();
    ctx.translate(x, y);
    // The minimap rotates the world. Keep the lamp upright like a map symbol.
    if (ctx === We.cv?.mg) ctx.rotate(-Ct.yaw);
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    lamp(ctx, 0, 0, Math.max(.26, 5.4 * pixelRatio / cell));
    ctx.restore();
  };

  const legend = [...E0t, ["SHRINE", shrineColor, lamp]];
  const drawCompass = g0t;
  g0t = function (surfaces, map, time) {
    // The larger chart covers most of the compass. Skip the covered terrain
    // pass entirely while it is open. v0t restores visibility on the next tick.
    if (map.open || map.tabHeld) { surfaces.mini.style.display = "none"; return; }
    return drawCompass(surfaces, map, time);
  };
  function fitLegend(ctx, width, height, unit) {
    if (layout?.width === width && layout.height === height && layout.unit === unit) return layout;
    const pad = 1.25 * unit, icon = unit * .46, line = unit * 1.45;
    const font = Math.round(unit * .87) + 'px "Courier New",monospace';
    ctx.font = font;
    let x = pad, row = 0;
    const symbols = legend.map(([label, color, draw]) => {
      const space = icon * 2.7 + ctx.measureText(label).width + .95 * unit;
      if (x > pad && x + space > width - pad) { x = pad; row++; }
      const entry = {label, color, draw, x, row};
      x += space;
      return entry;
    });
    const footer = height - (row + 1) * line - unit * 2.4;
    layout = {width, height, unit, pad, icon, line, font, symbols, footer};
    return layout;
  }

  function drawTerrain(ctx, map, width, pad, top, footer, ratio, cell, ox, oy, x1, y1, x2, y2) {
    ctx.save();
    ctx.beginPath(); ctx.rect(pad, top, width - 2 * pad, Math.max(0, footer - top)); ctx.clip();
    if (cell >= 7 * ratio) {
      ctx.strokeStyle = "rgba(226,200,144,.045)";
      ctx.lineWidth = ratio;
      ctx.beginPath();
      for (let x = x1; x <= x2; x++) {
        ctx.moveTo(ox + x * cell, oy + y1 * cell); ctx.lineTo(ox + x * cell, oy + y2 * cell);
      }
      for (let y = y1; y <= y2; y++) {
        ctx.moveTo(ox + x1 * cell, oy + y * cell); ctx.lineTo(ox + x2 * cell, oy + y * cell);
      }
      ctx.stroke();
    }
    ctx.translate(ox, oy); ctx.scale(cell, cell);
    Yk(ctx, map, x1 - 1, y1 - 1, x2 + 1, y2 + 1, cell);
    ctx.restore();
  }

  function updateDiscovery(map) {
    const discovery = backdrop.discovery;
    if (!discovery || discovery.length !== map.seen.length || backdrop.mappedGrid !== map.grid) {
      backdrop.discovery = map.seen.slice();
      backdrop.mappedGrid = map.grid;
      return true;
    }
    // A persisted shrine can restore the visibility bits directly. Compare
    // their values instead of relying on a specific discovery/write path.
    for (let i = 0; i < discovery.length; i++) {
      if (discovery[i] !== map.seen[i]) {
        discovery.set(map.seen);
        return true;
      }
    }
    return false;
  }

  function updateDoors(mapChanged) {
    // The chapter build populates the table. Keep only keys and bits so a
    // closed chart cannot retain an outgoing scene through its door meshes.
    const doors = v.doors;
    if (mapChanged) {
      backdrop.doorKeys = Object.keys(doors);
      backdrop.openDoors = new Uint8Array(backdrop.doorKeys.length);
    }
    const {doorKeys, openDoors} = backdrop;
    let changed = false;
    for (let i = 0; i < doorKeys.length; i++) {
      const open = Number(!!doors[doorKeys[i]].open);
      if (openDoors[i] !== open) {
        openDoors[i] = open;
        changed = true;
      }
    }
    return changed;
  }

  function paintBackground(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(5,4,3,0.93)";
    ctx.fillRect(0, 0, width, height);
  }

  function paintChart(ctx, map, width, height, pad, top, footer, ratio, cell, ox, oy, x1, y1, x2, y2) {
    // Avoid reserving another very large pixel surface for extreme viewports.
    if (width * height > 2500000) {
      if (backdrop.canvas) {
        backdrop.canvas = backdrop.context = null;
        backdrop.current = backdrop.pending = false;
      }
      return false;
    }
    const doorsChanged = updateDoors(backdrop.mappedGrid !== map.grid);
    const mapChanged = updateDiscovery(map);
    const liftHeight = de.def?.lift ? de.lift.h : null;
    const view = backdrop.view;
    const stable = view && view.width === width && view.height === height &&
      view.pad === pad && view.top === top && view.footer === footer && view.ratio === ratio &&
      view.cell === cell && view.ox === ox && view.oy === oy &&
      view.x1 === x1 && view.y1 === y1 && view.x2 === x2 && view.y2 === y2;
    if (!stable || mapChanged || doorsChanged || backdrop.heights !== v.heightMap || backdrop.liftHeight !== liftHeight) {
      if (!stable) {
        view.width = width; view.height = height;
        view.pad = pad; view.top = top; view.footer = footer; view.ratio = ratio;
        view.cell = cell; view.ox = ox; view.oy = oy;
        view.x1 = x1; view.y1 = y1; view.x2 = x2; view.y2 = y2;
      }
      backdrop.heights = v.heightMap;
      backdrop.liftHeight = liftHeight;
      backdrop.current = false;
      backdrop.pending = true;
      return false;
    }
    if (backdrop.pending) {
      if (!backdrop.canvas) {
        const canvas = document.createElement("canvas");
        backdrop.context = canvas.getContext("2d", ctx.getContextAttributes?.());
        backdrop.canvas = canvas;
      }
      const cache = backdrop.context;
      if (!cache) return false;
      if (backdrop.canvas.width !== width) backdrop.canvas.width = width;
      if (backdrop.canvas.height !== height) backdrop.canvas.height = height;
      paintBackground(cache, width, height);
      drawTerrain(cache, map, width, pad, top, footer, ratio, cell, ox, oy, x1, y1, x2, y2);
      backdrop.pending = false;
      backdrop.current = true;
    }
    if (!backdrop.current) return false;
    ctx.save();
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(backdrop.canvas, 0, 0);
    ctx.restore();
    return true;
  }

  M0t = function (surfaces, map, time) {
    if (grid !== map.grid) { grid = map.grid; zoom = 0; }
    const canvas = surfaces.auto, ctx = surfaces.ag;
    Nk(canvas);
    const width = canvas.width, height = canvas.height;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const unit = Math.max(11 * ratio, Math.min(height * .022, 18 * ratio));
    const {pad, icon, line, font, symbols, footer} = fitLegend(ctx, width, height, unit);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const titleFont = 'bold ' + Math.round(unit * 1.22) + 'px "Courier New",monospace';
    ctx.font = titleFont;
    const title = mh(T.level).toUpperCase(), titleWidth = ctx.measureText(title).width;
    const totals = "KILLS " + T.kills + "/" + T.enemiesTotal + "    SECRETS " + T.secrets + "/" + T.secretsTotal;
    ctx.font = font;
    const stack = titleWidth + ctx.measureText(totals).width + pad * 3 > width;
    const top = (stack ? 3.75 : 2.65) * unit;
    const [left, upper, right, lower] = x0t(map);
    const cols = right - left + 3, rows = lower - upper + 3;
    const fit = Math.min(unit * 2.4, (width - pad * 2) / cols, Math.max(1, footer - top) / rows);
    const cell = Math.max(.01, fit * levels[zoom]);
    const px = C.px / P, py = C.pz / P;
    const ox = zoom ? width / 2 - px * cell : (width - cols * cell) / 2 - (left - 1) * cell;
    const oy = zoom ? (top + footer) / 2 - py * cell : top + (footer - top - rows * cell) / 2 - (upper - 1) * cell;
    const x1 = Math.max(left - 1, Math.floor((pad - ox) / cell));
    const x2 = Math.min(right + 2, Math.ceil((width - pad - ox) / cell));
    const y1 = Math.max(upper - 1, Math.floor((top - oy) / cell));
    const y2 = Math.min(lower + 2, Math.ceil((footer - oy) / cell));
    const stored = paintChart(ctx, map, width, height, pad, top, footer, ratio, cell, ox, oy, x1, y1, x2, y2);
    if (!stored) paintBackground(ctx, width, height);
    ctx.font = titleFont;
    ctx.fillStyle = ge.text;
    ctx.fillText(title, pad, unit * 1.25, width - 2 * pad);
    ctx.font = font;
    ctx.textAlign = stack ? "left" : "right";
    ctx.fillStyle = ink;
    ctx.fillText(totals, stack ? pad : width - pad, (stack ? 2.75 : 1.25) * unit);
    if (!stored) drawTerrain(ctx, map, width, pad, top, footer, ratio, cell, ox, oy, x1, y1, x2, y2);
    ctx.save();
    ctx.beginPath(); ctx.rect(pad, top, width - 2 * pad, Math.max(0, footer - top)); ctx.clip();
    ctx.save(); ctx.translate(ox, oy); ctx.scale(cell, cell);
    Bk(ctx, map, cell, time);
    ctx.restore();
    ctx.translate(ox + px * cell, oy + py * cell); ctx.rotate(-Ct.yaw);
    const arrow = Math.max(unit * 1.1, Math.min(cell * 1.3, unit * 2.1));
    Ok(ctx, Math.max(unit * 3, arrow * 2.8)); n5(ctx, arrow);
    ctx.restore();
    ctx.strokeStyle = ge.rim;
    ctx.lineWidth = ratio;
    ctx.beginPath();
    for (const y of [top - .2 * unit, footer + .2 * unit]) {
      ctx.moveTo(pad, y); ctx.lineTo(width - pad, y);
    }
    ctx.stroke();
    ctx.textAlign = "left"; ctx.font = font;
    for (const entry of symbols) {
      const y = footer + unit * 1.2 + entry.row * line;
      ctx.fillStyle = entry.color; entry.draw(ctx, entry.x + icon, y, icon);
      ctx.fillStyle = ink; ctx.fillText(entry.label, entry.x + icon * 2.7, y);
    }
    ctx.fillStyle = ge.text;
    const help = width >= 38 * unit ? "×   WHEEL / + / −  ZOOM" : "×   + / −  ZOOM";
    ctx.fillText(levels[zoom] + help, pad, height - unit);
    ctx.textAlign = "right";
    const closeHint = map.open
      ? (map.tabHeld ? "M  UNPIN" : "M  CLOSE")
      : "RELEASE TAB TO CLOSE";
    ctx.fillStyle = ink;
    ctx.fillText(closeHint, width - pad, height - unit);
  };

  const visible = () => Be.started && !T.dead && !T.won && !Wk() && !Qm() && !Lw() && (We.open || We.tabHeld);
  function adjust(event, delta) {
    zoom = Math.max(0, Math.min(levels.length - 1, zoom + delta));
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  window.addEventListener("wheel", event => {
    if (visible() && event.deltaY && !event.ctrlKey && !event.metaKey) adjust(event, event.deltaY < 0 ? 1 : -1);
  }, {capture:true, passive:false});
  window.addEventListener("keydown", event => {
    if (!visible() || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
    if (event.code === "Equal" || event.code === "NumpadAdd" || event.key === "+") adjust(event, 1);
    if (event.code === "Minus" || event.code === "NumpadSubtract" || event.key === "-") adjust(event, -1);
  }, true);
})();
