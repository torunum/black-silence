/* ENEMY_ANIMATION_UPGRADE_BEGIN */
// Re-time the native rig frames and add bounded, presentation-only body weight.
// Enemy x/z/h/w, combat timers, damage and original sprite assets remain intact.
(() => {
  let states = new WeakMap();
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const stateFor = (enemy) => {
    let state = states.get(enemy);
    if (!state) {
      state = {
        clock: (enemy.x * 0.37 + enemy.z * 0.61) % 6.28,
        walked: 0,
        gait: 0,
        moving: 0,
        recoil: 0,
        recoilX: 0,
        recoilZ: 0,
        hitSide: 0,
        attack: 0,
        staggerTime: 0,
        staggered: false,
        recover: 0,
        anticipation: false,
        landing: 0,
        landingRotation: 0,
        landingMap: null,
        slamElapsed: null,
        slamMap: null,
        slamBaseMap: null,
        slamScaleX: 0,
        slamScaleY: 0,
        visual: null,
        visualApplied: false,
        pose: "idle",
      };
      states.set(enemy, state);
    }
    return state;
  };
  const ownsPose = (enemy) =>
    !enemy.boss &&
    !enemy.dead &&
    !enemy.gone &&
    !enemy.executing &&
    !(enemy.flung > 0) &&
    !enemy.dormant &&
    !v.cine;

  // Only undo values we last wrote. The finisher may have taken ownership and
  // changed the target pose earlier in the current frame.
  function removeVisual(enemy, state) {
    const previous = state.visual;
    if (!state.visualApplied) return;
    const p = enemy.sp.position;
    if (Math.abs(p.x - previous.x) < 1e-7) p.x = previous.basex;
    if (Math.abs(p.y - previous.y) < 1e-7) p.y = previous.basey;
    if (Math.abs(p.z - previous.z) < 1e-7) p.z = previous.basez;
    if (Math.abs(enemy.sp.material.rotation - previous.rotation) < 1e-7)
      enemy.sp.material.rotation = previous.baseRotation;
    state.visualApplied = false;
  }

  function rigPose(enemy, action, frame) {
    const rig = wk(enemy);
    if (!rig?.rig?.poses[action]) return false;
    Ym(enemy, rig.tex(action, frame, Mk(enemy)));
    stateFor(enemy).pose = action;
    return true;
  }

  function releaseSlam(enemy, state) {
    if (state.slamMap && state.slamMap === enemy.sp.material.map) {
      Ym(enemy, state.slamBaseMap);
      state.pose = "native";
    }
    state.slamMap = state.slamBaseMap = null;
  }

  function showSlam(enemy, state, dt) {
    // The native AI starts both the 4 s cooldown and the 0.5 s actor stun
    // when it queues the hit. Its delayed callback ticks later in this frame.
    if (state.beforeSlam < 4 && enemy.slamT === 4 && enemy.stun === 0.5)
      state.slamElapsed = 0;
    if (state.slamElapsed === null) return;
    state.slamElapsed += dt;
    const elapsed = state.slamElapsed;
    if (elapsed >= .76 || Math.hypot(C.px-enemy.x,C.pz-enemy.z) > 30) {
      state.slamElapsed = null;
      releaseSlam(enemy, state);
      return;
    }
    if (enemy.stagger > 0 || enemy.hurt > 0 || enemy.sever?.legs || state.landing ||
        (elapsed > .55 && (state.anticipation || enemy.atkAnim > 0))) {
      releaseSlam(enemy, state);
      return;
    }
    const nativeMap = enemy.sp.material.map;
    const frame = elapsed < .12 ? 0 : elapsed < .48 ? 1 : elapsed < .60 ? 2 : 3;
    if (rigPose(enemy, "slam", frame)) {
      if (nativeMap !== state.slamMap) state.slamBaseMap = nativeMap;
      state.slamMap = enemy.sp.material.map;
      const frame = wk(enemy).rig.frame;
      const image = state.slamMap.image;
      state.slamScaleX = enemy.w * image.width / frame.w;
      state.slamScaleY = enemy.h * image.height / frame.h;
      enemy.sp.scale.set(state.slamScaleX, state.slamScaleY, 1);
    }
  }

  // Successful physical travel advances the feet. A blocked enemy cannot keep
  // moonwalking, and slowed/frenzied enemies retain their normal stride length.
  const originalMoveEnemy = El;
  El = function (enemy, dx, dz, speed, dt) {
    const x = enemy.x,
      z = enemy.z;
    const moved = originalMoveEnemy(enemy, dx, dz, speed, dt);
    if (ownsPose(enemy))
      stateFor(enemy).walked += Math.hypot(enemy.x - x, enemy.z - z);
    return moved;
  };

  const originalRigUpdate = Yu;
  Yu = function (enemy, dt, moving, stopped) {
    if (!ownsPose(enemy)) return originalRigUpdate(enemy, dt, moving, stopped);
    const state = stateFor(enemy);
    const crawling = !!enemy.sever?.legs;
    const prefix = crawling ? "crawl" : "";
    if (!(enemy.hurt > 0) && !stopped && (enemy.atkAnim || 0) > 0) {
      // Damage/projectile release already happened when atkAnim was set. Show
      // the strike there; the windup is presented before the cooldown expires.
      const elapsed = 0.22 - enemy.atkAnim;
      if (
        rigPose(enemy, crawling ? "crawlAtk" : "atk", elapsed < 0.075 ? 1 : 2)
      )
        return;
    }
    if (state.anticipation && !(enemy.hurt > 0) && !stopped) {
      if (rigPose(enemy, crawling ? "crawlAtk" : "atk", 0)) return;
    }
    const lunging =
      enemy.lunge && 2.6 - enemy.lungeT >= 0 && 2.6 - enemy.lungeT < 0.4;
    const gaitAllowed =
      moving &&
      !stopped &&
      !(enemy.hurt > 0) &&
      !(enemy.atkAnim > 0) &&
      !lunging;
    if (gaitAllowed) {
      const travel = state.walked;
      const baseSpeed = Math.max(0.1, tr[enemy.key]?.sp || enemy.speed || 1);
      originalRigUpdate(enemy, travel / baseSpeed, travel > 0.0001, stopped);
      state.walked = 0;
      state.pose =
        travel > 0.0001
          ? crawling
            ? "crawl"
            : "walk"
          : (prefix + "Idle").replace(/^Idle$/, "idle");
      const rig = wk(enemy);
      const action = crawling ? "crawl" : "walk";
      if (rig?.rig) {
        const period =
          Vu(rig.rig, action) * rig.rig.walkStep * (crawling ? 1.7 : 1);
        state.gait = (enemy.animT / Math.max(period, 0.01)) * Math.PI * 2;
      }
      return;
    }
    originalRigUpdate(enemy, dt, moving, stopped);
  };

  const originalDamage = qr;
  qr = function (enemy, amount, hit) {
    const hp = enemy.hp,
      plate = enemy.plate;
    const result = originalDamage(enemy, amount, hit);
    if (ownsPose(enemy) && (enemy.hp < hp || enemy.plate < plate)) {
      const state = stateFor(enemy);
      let dx = hit?.dir?.x ?? enemy.x - C.px;
      let dz = hit?.dir?.z ?? enemy.z - C.pz;
      const length = Math.hypot(dx, dz) || 1;
      dx /= length;
      dz /= length;
      state.recoil = 0.24;
      state.recoilX = dx * 0.055;
      state.recoilZ = dz * 0.055;
      state.hitSide = clamp(
        dx * Math.cos(Ct.yaw) - dz * Math.sin(Ct.yaw),
        -1,
        1,
      );
    }
    return result;
  };

  function anticipate(enemy) {
    if (
      !ownsPose(enemy) ||
      enemy.stagger > 0 ||
      enemy.stun > 0 ||
      enemy.hurt > 0 ||
      enemy.atkAnim > 0
    )
      return false;
    if (!(enemy.cool > 0 && enemy.cool <= 0.18) || !enemy.aware) return false;
    const distance = Math.hypot(enemy.x - C.px, enemy.z - C.pz);
    const inReach = enemy.range
      ? distance < 1.55 || (distance > 3 && distance < enemy.range)
      : distance < 1.9;
    return (
      inReach &&
      Math.abs((enemy.fy || 0) - (C.pyy - Yo)) < 1.3 &&
      lm(enemy.x, enemy.z, C.px, C.pz)
    );
  }

  const originalEnemies = qtt;
  qtt = function (dt) {
    const seconds = Math.max(0, dt);
    for (const enemy of v.enemies) {
      const state = stateFor(enemy);
      removeVisual(enemy, state);
      if (state.slamScaleX) {
        if (enemy.sp.scale.x === state.slamScaleX && enemy.sp.scale.y === state.slamScaleY)
          enemy.sp.scale.set(enemy.w, enemy.h, 1);
        state.slamScaleX = state.slamScaleY = 0;
      }
      state.beforeX = enemy.x;
      state.beforeZ = enemy.z;
      state.beforeAttack = enemy.atkAnim || 0;
      if (enemy.slam) state.beforeSlam = enemy.slamT;
      state.beforeFlight = enemy.flung > 0;
      state.beforeRotation = state.beforeFlight ? Math.atan2(
        Math.sin(enemy.sp.material.rotation),
        Math.cos(enemy.sp.material.rotation),
      ) : 0;
      state.walked = 0;
      state.anticipation = anticipate(enemy);
    }
    const danger = originalEnemies(dt);
    for (const enemy of v.enemies) {
      const state = stateFor(enemy);
      if (!ownsPose(enemy)) {
        if (state.slamElapsed !== null) {
          state.slamElapsed = null;
          releaseSlam(enemy, state);
        }
        state.recoil = state.attack = state.recover = state.moving = 0;
        state.landing = 0;
        state.landingMap = null;
        state.staggered = false;
        // Native flight owns trajectory/spin. Its early return otherwise leaves
        // the last walking/idle frame frozen throughout the throw.
        if (
          enemy.flung > 0 && !enemy.dead && !enemy.gone && !enemy.boss &&
          !enemy.executing && !enemy.dormant && !v.cine
        ) {
          rigPose(enemy, enemy.sever?.legs ? "crawlPain" : "pain",
            enemy.flungT < Lu.secs * 0.5 ? 0 : 1);
          state.pose = "airborne";
        }
        continue;
      }
      // The original melee scale ballooned the whole sprite by 22%. Keep the
      // authored silhouette; weight comes from the rig and a small body shift.
      enemy.sp.scale.set(enemy.w, enemy.h, 1);
      state.clock += seconds;
      state.recoil = Math.max(0, state.recoil - seconds);
      state.attack = Math.max(0, state.attack - seconds);
      state.recover = Math.max(0, state.recover - seconds);
      state.landing = Math.max(0, state.landing - seconds);
      if (!state.landing && state.landingMap) {
        // Distant actors skip native rig updates. Release our last pose there
        // too; do not leave a recovered actor frozen in the impact frame.
        if (enemy.sp.material.map === state.landingMap) {
          originalRigUpdate(enemy, 0, false, true);
          state.pose = "native";
        }
        state.landingMap = null;
      }
      if (state.beforeFlight && !enemy.fly) {
        state.landing = 0.32;
        // Keep the final visible roll through contact, then settle it quickly.
        // Ground collision, hitbox, stun and AI timers remain native.
        state.landingRotation = clamp(state.beforeRotation, -0.65, 0.65);
      }
      if ((enemy.atkAnim || 0) > state.beforeAttack + 0.001)
        state.attack = 0.31;

      const dx = enemy.x - state.beforeX,
        dz = enemy.z - state.beforeZ;
      const speed = Math.hypot(dx, dz) / Math.max(seconds, 0.001);
      const locomotion =
        !(enemy.stun > 0) && !(enemy.stagger > 0) && !state.recoil;
      const desired = locomotion
        ? clamp(speed / Math.max(0.1, enemy.speed), 0, 1.3)
        : 0;
      state.moving += (desired - state.moving) * (1 - Math.exp(-seconds * 12));
      const crawling = !!enemy.sever?.legs;
      let x = enemy.x,
        z = enemy.z,
        y = Sa(enemy),
        rotation = 0;
      const rightX = Math.cos(Ct.yaw),
        rightZ = -Math.sin(Ct.yaw);

      if (enemy.stagger > 0) {
        state.staggerTime = state.staggered ? state.staggerTime + seconds : 0;
        state.staggered = true;
        state.pose = "stagger";
        const enter = clamp(state.staggerTime / 0.2, 0, 1);
        const fade = clamp(enemy.stagger / 0.6, 0, 1);
        const sway =
          Math.sin(state.clock * 3.4) * 0.028 +
          Math.sin(state.clock * 7.1) * 0.009;
        rotation = sway * fade;
        x += rightX * sway * 0.32 * fade;
        z += rightZ * sway * 0.32 * fade;
        y -= (0.035 + enter * 0.025) * fade;
        rigPose(
          enemy,
          crawling ? "crawlPain" : "pain",
          Math.sin(state.clock * 4.1) > 0 ? 1 : 0,
        );
      } else {
        if (state.staggered) {
          state.recover = 0.24;
          state.staggered = false;
        }
        const weight = state.moving * (crawling ? 0.45 : 1);
        if (enemy.fly) {
          y += Math.sin(state.clock * 2.4) * 0.1;
        } else {
          y -= (1 - Math.cos(state.gait * 2)) * 0.012 * weight;
          y += Math.sin(state.clock * 2.1) * 0.006 * (1 - Math.min(1, weight));
          rotation += Math.sin(state.gait) * 0.018 * weight;
        }
        if (state.anticipation) {
          const wind = 1 - clamp(enemy.cool / 0.18, 0, 1);
          y -= wind * 0.035;
          rotation -= wind * 0.018;
        }
        if (state.attack > 0) {
          const t = 0.31 - state.attack;
          const reach =
            t < 0.07
              ? 1 - t / 0.07
              : -0.2 * Math.sin(clamp((t - 0.07) / 0.24, 0, 1) * Math.PI);
          const distance = Math.hypot(C.px - enemy.x, C.pz - enemy.z) || 1;
          x += ((C.px - enemy.x) / distance) * reach * 0.075;
          z += ((C.pz - enemy.z) / distance) * reach * 0.075;
          y -= Math.max(0, reach) * 0.025;
        }
        if (state.recover > 0) y -= 0.025 * (state.recover / 0.24);
      }
      if (state.recoil > 0) {
        const progress = 1 - state.recoil / 0.24;
        const pulse = Math.sin(progress * Math.PI) * Math.exp(-progress * 1.5);
        x += state.recoilX * pulse;
        z += state.recoilZ * pulse;
        rotation -= state.hitSide * pulse * 0.075;
      }
      if (state.landing > 0 && !(enemy.stagger > 0)) {
        const elapsed = 0.32 - state.landing;
        const compress = elapsed < 0.065
          ? elapsed / 0.065
          : Math.pow(Math.max(0, 1 - (elapsed - 0.065) / 0.255), 2);
        const roll = Math.pow(Math.max(0, 1 - elapsed / 0.14), 2);
        rotation += state.landingRotation * roll;
        y -= compress * (crawling ? 0.018 : 0.04);
        if (!state.anticipation && !(enemy.hurt > 0) && !(enemy.atkAnim > 0)) {
          if (rigPose(enemy, crawling ? "crawlPain" : "pain", elapsed < 0.11 ? 1 : 0)) {
            state.landingMap = enemy.sp.material.map;
            state.pose = "landing";
          }
        }
      }
      if (enemy.slam) showSlam(enemy, state, seconds);
      // One scratch record for the lifetime of this actor, including handoffs.
      const visual = state.visual || (state.visual = {});
      visual.basex = enemy.sp.position.x;
      visual.basey = enemy.sp.position.y;
      visual.basez = enemy.sp.position.z;
      visual.baseRotation = enemy.sp.material.rotation;
      visual.x = x;
      visual.y = y;
      visual.z = z;
      visual.rotation = rotation;
      enemy.sp.position.set(x, y, z);
      enemy.sp.material.rotation = rotation;
      state.visualApplied = true;
    }
    return danger;
  };

  const originalReset = pz;
  pz = function () {
    for (const enemy of v.enemies) {
      const state = states.get(enemy);
      if (state) removeVisual(enemy, state);
    }
    states = new WeakMap();
    return originalReset();
  };
  if (window.__BLACK_SILENCE_QA) {
    window.__BLACK_SILENCE_QA.enemyAnimation = (enemy) => {
      const state = states.get(enemy);
      return state
        ? {
            gait: state.gait,
            moving: state.moving,
            recoil: state.recoil,
            attack: state.attack,
            staggered: state.staggered,
            recover: state.recover,
            anticipation: state.anticipation,
            landing: state.landing,
            slamElapsed: state.slamElapsed,
            pose: state.pose,
          }
        : null;
    };
  }
})();
/* ENEMY_ANIMATION_UPGRADE_END */
