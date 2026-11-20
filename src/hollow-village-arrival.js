/* HOLLOW_VILLAGE_ARRIVAL_BEGIN */
// Keep attention on the village square while the church door closes behind Adem.
(() => {
  const church = 2, village = 10;
  const line = "village_from_church";
  const caption = "No lights in the tower. The Ash Bell reached this place before I did.";
  const horizonPitch = Math.atan2(4.15 - 2.2, 22.2);
  let arrival = null;

  function restoreSubtitle() {
    if (!arrival.announce) return;
    if (arrival.subtitle.getAttribute("aria-live") === "polite") arrival.subtitle.removeAttribute("aria-live");
    arrival.announce = false;
  }

  const advance = uk;
  uk = function () {
    const comingFromChurch = T.level === church && oe.phase === "card";
    const result = advance.apply(this, arguments);
    if (!comingFromChurch || T.level !== village || oe.phase !== "arrive" ||
        z0.entrance?.rig.style !== "church" || !J.scene.getObjectByName("hollowVillage_squareWell")) return result;

    if (arrival) restoreSubtitle();
    const subtitle = Jt("subt");
    const announce = !subtitle.hasAttribute("aria-live");
    if (announce) subtitle.setAttribute("aria-live", "polite");
    arrival = { scene: J.scene, x: C.px, z: C.pz, yaw: J.camera.rotation.y, subtitle, announce,
      reduce: matchMedia("(prefers-reduced-motion: reduce)").matches, moved: false, lineDone: false };
    return result;
  };

  const drawPose = Vr;
  Vr = function (x, y, z, yaw, pitch) {
    if (arrival?.scene !== J.scene || T.level !== village || oe.phase !== "arrive") {
      return drawPose.apply(this, arguments);
    }
    if (arrival.reduce) return drawPose(C.px, C.pyy, C.pz, Ct.yaw, Ct.pitch);

    const look = Ge(.12, 1.08, oe.t);
    const settle = Ge(1.55, pc.arrive, oe.t);
    const forward = arrival.yaw + lr(arrival.yaw, Ct.yaw) * look;
    return drawPose(x, y, z, forward, pitch + horizonPitch * look * (1 - settle));
  };

  const nativeLine = w0;
  zb[line] = [caption];
  w0 = function (key) {
    if (arrival?.scene === J.scene && T.level === village && key === k5(village)) return;
    return nativeLine.apply(this, arguments);
  };

  const move = m_;
  m_ = function () {
    const moved = move.apply(this, arguments);
    if (!arrival) return moved;
    if (arrival.scene !== J.scene || T.dead || T.won) {
      restoreSubtitle();
      arrival = null;
      return moved;
    }
    if (arrival.lineDone) {
      if (arrival.announce && !arrival.subtitle.textContent.includes(caption)) restoreSubtitle();
      return moved;
    }
    if (oe.phase !== "idle" || Be.inputLock) return moved;
    const distance = Math.hypot(C.px - arrival.x, C.pz - arrival.z);
    if ((li.KeyW || li.KeyA || li.KeyS || li.KeyD) && distance >= .24) arrival.moved = true;
    if (!arrival.moved) return moved;
    // Yield to active native quips. Leave the line behind with the square.
    if (distance > 10 || Math.cos(Ct.yaw) > .3) {
      arrival.lineDone = true;
      restoreSubtitle();
      return moved;
    }
    if (arrival.subtitle.textContent.trim()) return moved;
    arrival.lineDone = true;
    w0(line, true);
    return moved;
  };
})();
/* HOLLOW_VILLAGE_ARRIVAL_END */
