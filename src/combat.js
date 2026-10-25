// Combat upgrade. The original bundle remains intact; these bindings extend its
// public-in-module functions before the game initializes. Units are world metres.
(() => {
  // 23% admits the zombie's 20HP remainder after two pistol body shots (or
  // one headshot), and 16HP after a full shotgun volley, without saving kills.
  const balance = {
    health: 1.25,
    staggerHP: 0.23,
    staggerChance: 0.38,
    staggerSeconds: 4.6,
  };
  const originalSpawn = Du;
  Du = function (...args) {
    const enemy = originalSpawn(...args);
    if (!enemy.boss)
      enemy.hp = enemy.maxhp = Math.round(enemy.maxhp * balance.health);
    return enemy;
  };

  B_ = function (enemy) {
    if (
      enemy.boss ||
      enemy.dead ||
      enemy.hp <= 0 ||
      enemy.staggerTried ||
      enemy.hp > enemy.maxhp * balance.staggerHP
    )
      return;
    enemy.staggerTried = true; // One roll per enemy, never re-roll by shooting limbs.
    if (Math.random() >= balance.staggerChance) return;
    enemy.stagger = balance.staggerSeconds;
    // Keep a launched enemy airborne; the stagger starts being visible on landing.
    if (!(enemy.flung > 0)) {
      enemy.kx *= 0.3;
      enemy.kz *= 0.3;
    }
    Nt(enemy.x, (enemy.fy || 0) + enemy.h * 0.6, enemy.z, () =>
      Mg(enemy.key, enemy),
    );
  };

  let melee = null;
  let flights = new WeakMap();
  const canAct = () =>
    Be.started &&
    !T.dead &&
    !T.won &&
    !Be.inputLock &&
    !Be.pianoOpen &&
    !Wk() &&
    !Qm();
  const inSight = (x, z) => lm(C.px, C.pz, x, z);
  Rk = function () {
    if (!canAct() || !C.grounded || oo.busy || melee) return null;
    const dx = -Math.sin(Ct.yaw),
      dz = -Math.cos(Ct.yaw);
    let target = null,
      nearest = 2.7;
    for (const enemy of v.enemies) {
      if (!O_(enemy) || enemy.executing || enemy.flung > 0) continue;
      const x = enemy.x - C.px,
        z = enemy.z - C.pz;
      const distance = Math.hypot(x, z);
      if (
        distance < 0.02 ||
        distance > nearest ||
        (x * dx + z * dz) / distance < 0.65
      )
        continue;
      if (
        Math.abs((enemy.fy || 0) - (C.pyy - Yo)) > 1.1 ||
        !inSight(enemy.x, enemy.z)
      )
        continue;
      target = enemy;
      nearest = distance;
    }
    return target;
  };
  const originalInteract = N$;
  N$ = function () {
    if (!canAct() || oo.busy || melee) return;
    // A staggered enemy has priority over nearby props, but requires a clear path.
    if (K_()) return;
    originalInteract();
  };
  const originalSwitch = Ik;
  Ik = function (index) {
    if (canAct() && !oo.busy && !melee) originalSwitch(index);
  };
  const originalReload = Bm;
  Bm = function () {
    if (canAct() && !melee) originalReload();
  };
  const originalDamage = qr;
  qr = function (enemy, amount, hit) {
    // Other projectiles cannot interrupt a committed finisher or award its kill twice.
    if (enemy.executing && hit?.wIdx !== -3) return;
    originalDamage(enemy, amount, hit);
    if (enemy.gone) {
      flights.delete(enemy);
      enemy.flung = enemy.flungT = enemy.kx = enemy.kz = 0;
    }
  };

  Object.assign(Ki, {
    launch: 18,
    hop: 5.4,
    reach: 3.1,
    dmg: 38,
    kb: 43,
    kbHeavy: 30,
    kbBoss: 8,
    cd: 1.2,
  });
  Object.assign(Lu, { secs: 1.05, arc: 2.25, turns: 1.1 });

  function strike(action) {
    const drop = action.drop;
    let landed = false,
      body = false;
    // Sweep the leap since the last contact check. A fast leap must not pass
    // through an enemy before the extended boots reach their impact frame.
    const origins = [{ x: C.px, y: C.pyy, z: C.pz }];
    if (drop) {
      const start = action.sweep;
      const steps = Math.ceil(Math.hypot(C.px - start.x, C.pz - start.z) / 0.3);
      for (let i = 0; i < steps; i++) {
        const p = i / steps;
        origins.push({
          x: start.x + (C.px - start.x) * p,
          y: start.y + (C.pyy - start.y) * p,
          z: start.z + (C.pz - start.z) * p,
        });
      }
      action.sweep = origins[0];
    }
    for (const enemy of v.enemies) {
      if (enemy.dead || enemy.executing || action.hit.has(enemy)) continue;
      const origin = origins.find((from) => {
        const dx = enemy.x - from.x,
          dz = enemy.z - from.z,
          distance = Math.hypot(dx, dz);
        return (
          distance >= 0.001 &&
          distance <= (drop ? Ki.reach : 2.45) &&
          (dx * action.dx + dz * action.dz) / distance >=
            (drop ? 0.48 : 0.58) &&
          Math.abs(Sa(enemy) - from.y) <= (drop ? 2.5 : 1.6) &&
          lm(from.x, from.z, enemy.x, enemy.z)
        );
      });
      if (!origin) continue;
      const dx = enemy.x - origin.x,
        dz = enemy.z - origin.z,
        distance = Math.hypot(dx, dz);
      action.hit.add(enemy);
      landed = body = true;
      const push = drop
        ? enemy.boss
          ? Ki.kbBoss
          : enemy.maxhp > 240
            ? Ki.kbHeavy
            : Ki.kb
        : enemy.boss
          ? 4
          : 18;
      enemy.kx = (dx / distance) * push;
      enemy.kz = (dz / distance) * push;
      enemy.stun = Math.max(enemy.stun, enemy.boss ? 0.2 : drop ? 1.5 : 0.65);
      if (!enemy.boss && drop) {
        // An explicit second kick starts a new arc at the current height.
        // Ordinary bullet knockback during landing must not restart that arc.
        flights.set(enemy, {
          floor:
            (enemy.fy || 0) +
            (enemy.flung > 0
              ? Math.max(0, enemy.sp.position.y - Sa(enemy))
              : 0),
          lastT: 0,
          landing: false,
        });
        enemy.flung = Lu.secs;
        enemy.flungT = 0;
      }
      qr(enemy, drop ? Ki.dmg : 18, {
        dir: { x: dx / distance, z: dz / distance },
        wIdx: -1,
      });
      io(enemy.x, (enemy.fy || 0) + enemy.h * 0.6, enemy.z, drop ? 12 : 5, 2.5);
    }
    for (const prop of v.props) {
      if (prop.dead || action.hit.has(prop)) continue;
      const dx = prop.x - C.px,
        dz = prop.z - C.pz,
        distance = Math.hypot(dx, dz);
      if (
        distance > 2.5 ||
        (dx * action.dx + dz * action.dz) / Math.max(0.01, distance) < 0.6 ||
        !inSight(prop.x, prop.z)
      )
        continue;
      const height = ie(prop.x, prop.z) + (prop.hgt || 1) * 0.5;
      if (Math.abs(height - C.pyy) > (drop ? 2.5 : 1.6)) continue;
      action.hit.add(prop);
      landed = true;
      prop.explosive ? ur(prop) : fr(prop);
    }
    // Retain the original loose-head kick interaction and wall/air feedback.
    const head = !action.swung && !body && T9(action.dx, action.dz) > 0;
    if (landed || head) {
      Df.met = true;
      Nt(C.px, C.pyy - 0.4, C.pz, () => zI(body || head ? "flesh" : "stone"));
      M0(drop ? 0.48 : 0.25);
      He.hitStop = Math.max(He.hitStop, drop ? 0.075 : 0.045);
      gh(drop ? 1.1 : 0.55, 0);
      n$(body ? "body" : head ? "head" : "prop", action.dx, action.dz, T.shots);
      if (drop && !action.feedback) {
        le("DROP KICK", 0.9);
        action.feedback = true;
      }
    } else if (!action.swung) {
      const sound = i4(false, false, { x: action.dx, z: action.dz });
      zI(sound);
      n$(sound === "stone" ? "wall" : "air", action.dx, action.dz, T.shots);
    }
    action.swung = true;
  }

  B$ = function () {
    if (!canAct() || T.kickCd > 0 || oo.busy || melee) return;
    const dx = -Math.sin(Ct.yaw),
      dz = -Math.cos(Ct.yaw);
    const speed = Math.hypot(C.vx, C.vz);
    const forward = (C.vx * dx + C.vz * dz) / Math.max(speed, 0.01);
    const drop =
      C.grounded &&
      !!(li.ShiftLeft || li.ShiftRight) &&
      speed > 7.4 &&
      forward > 0.65;
    melee = {
      t: 0,
      duration: drop ? 0.72 : 0.42,
      drop,
      dx,
      dz,
      hit: new Set(),
      scene: J.scene,
      swung: false,
      sweep: { x: C.px, y: C.pyy, z: C.pz },
    };
    T.kickCd = drop ? Ki.cd : 0.72;
    St.kickAnim = os;
    Df.met = false;
    oo.drop = drop;
    Ct.firing = false;
    Ct.zoomOn = false;
    // A reload interrupted by a kick must not silently insert rounds offscreen.
    if (St.wstate === "reload") {
      St.wstate = "idle";
      St.wtime = 0;
    }
    OI();
    if (drop) {
      C.vx = dx * Ki.launch;
      C.vz = dz * Ki.launch;
      C.vy = Ki.hop;
      C.grounded = false;
      M0(0.18);
    }
  };

  const originalWeaponUpdate = v$;
  v$ = function (dt) {
    // Melee owns the arms until recovery, including if LMB is held down.
    const firing = Ct.firing;
    if (melee) Ct.firing = false;
    originalWeaponUpdate(dt);
    Ct.firing = firing;
    if (!melee) return;
    const action = melee;
    if (action.scene !== J.scene || T.dead || T.won) {
      melee = null;
      St.kickAnim = 0;
      oo.drop = false;
      return;
    }
    const before = action.t;
    action.t += dt;
    const impact = action.drop ? 0.19 : 0.13;
    if (
      action.t >= impact &&
      (before < impact || (action.drop && action.t < 0.44))
    )
      strike(action);
    if (action.t >= action.duration) {
      melee = null;
      St.kickAnim = 0;
      oo.drop = false;
    } else {
      St.kickAnim = os * (1 - action.t / action.duration);
      oo.drop = action.drop;
    }
  };
  const originalReset = pz;
  pz = function () {
    melee = null;
    flights = new WeakMap();
    St.kickAnim = 0;
    heldFinisherArm = null;
    Kw();
    originalReset();
  };

  const originalMove = m_;
  m_ = function (dt) {
    if (!oo.busy) return originalMove(dt);
    // Gravity/camera updates continue, but held movement cannot pull the player
    // out of the choreography or start a jump during a finisher.
    const keys = ["KeyW", "KeyA", "KeyS", "KeyD", "Space"];
    const held = keys.map((key) => li[key]);
    for (const key of keys) li[key] = false;
    try {
      originalMove(dt);
    } finally {
      keys.forEach((key, i) => {
        li[key] = held[i];
      });
    }
  };

  // Fling used point collision, but walking uses the body's radius. A point
  // could stop inside the wall's radius and leave every subsequent AI step
  // blocked. Sweep the existing body radius, including authored thin walls.
  function bodyBlocked(enemy, x, z) {
    const r = enemy.r;
    const overlaps = (x0, z0, x1, z1) => {
      const dx = x - Math.max(x0, Math.min(x1, x));
      const dz = z - Math.max(z0, Math.min(z1, z));
      return dx * dx + dz * dz < r * r;
    };
    for (
      let row = Math.floor((z - r) / P);
      row <= Math.floor((z + r) / P);
      row++
    )
      for (
        let col = Math.floor((x - r) / P);
        col <= Math.floor((x + r) / P);
        col++
      ) {
        const cell = v.grid[row]?.[col];
        const door = v.doors[col + "," + row];
        const solid =
          cell === undefined ||
          cell === "#" ||
          cell === "I" ||
          cell === "W" ||
          ((cell === "+" || cell === "D" || cell === "S") &&
            door &&
            !door.open);
        if (solid && overlaps(col * P, row * P, (col + 1) * P, (row + 1) * P))
          return true;
        for (const mass of v.masses.get(row * 4096 + col) || [])
          if (overlaps(mass.x0, mass.z0, mass.x1, mass.z1)) return true;
      }
    return wg(x, z, r);
  }

  function sweepBody(enemy, dx, dz) {
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-8) return null;
    const samples = Math.max(
      1,
      Math.ceil(distance / Math.max(0.04, enemy.r * 0.2)),
    );
    let safe = 0;
    for (let i = 1; i <= samples; i++) {
      const fraction = i / samples;
      if (
        !bodyBlocked(enemy, enemy.x + dx * fraction, enemy.z + dz * fraction)
      ) {
        safe = fraction;
        continue;
      }
      let blocked = fraction;
      for (let j = 0; j < 12; j++) {
        const middle = (safe + blocked) * 0.5;
        if (bodyBlocked(enemy, enemy.x + dx * middle, enemy.z + dz * middle))
          blocked = middle;
        else safe = middle;
      }
      // A millimetre of contact skin avoids roundoff at the cell boundary;
      // the collision radius and the enemy's actual hitbox are unchanged.
      safe = Math.max(0, safe - 0.001 / distance);
      return { x: enemy.x + dx * safe, z: enemy.z + dz * safe, fraction: safe };
    }
    return null;
  }

  const bodyY = (enemy) => {
    if (!enemy.dead) return Sa(enemy);
    const fallen = Gg(enemy.deathKind, enemy.deathT);
    return (
      enemy.fy +
      enemy.h * 0.5 * (1 - fallen) +
      enemy.h * 0.18 * fallen +
      U_(enemy) * (1 - fallen)
    );
  };
  function settle(enemy) {
    flights.delete(enemy);
    enemy.flung = enemy.flungT = 0;
    enemy.kx = enemy.kz = 0;
    enemy.fy = ie(enemy.x, enemy.z);
    if (!enemy.dead) enemy.sp.material.rotation = 0;
    enemy.sp.position.set(enemy.x, bodyY(enemy), enemy.z);
    enemy.blob.position.set(enemy.x, enemy.fy + 0.012, enemy.z);
    s4(enemy.x, enemy.fy, enemy.z, 0, 0);
  }
  function beginFall(enemy, state, height) {
    state.landing = true;
    state.floor = enemy.fy;
    state.height = Math.max(0, height);
    state.time = 0;
    state.duration = Math.sqrt((2 * state.height) / 28);
    state.rotation = Math.atan2(
      Math.sin(enemy.sp.material.rotation),
      Math.cos(enemy.sp.material.rotation),
    );
    enemy.kx = enemy.kz = 0;
    enemy.flungT = 0;
    enemy.stun = Math.max(enemy.stun, 1.2);
    if (state.duration < 0.015) settle(enemy);
  }

  // Normal pushback must use the same body clearance, otherwise a surviving
  // enemy can be pushed back into the wall immediately after its landing.
  // Ground AI already checks grid clearance; extend that check to thin walls.
  const originalEnemyMove = El;
  El = function (enemy, dx, dz, speed, dt) {
    if (
      !enemy.boss &&
      v.wallSegs.length &&
      sweepBody(enemy, dx * speed * dt, dz * speed * dt)
    )
      return false;
    return originalEnemyMove(enemy, dx, dz, speed, dt);
  };

  const originalEnemies = qtt;
  qtt = function (dt) {
    const fast = v.enemies.some(
      (enemy) => enemy.flung > 0 && Math.hypot(enemy.kx, enemy.kz) * dt > 0.35,
    );
    const steps = fast ? Math.max(1, Math.ceil(dt / 0.007)) : 1;
    let danger = false;
    for (let i = 0; i < steps; i++) {
      const step = dt / steps;
      const active = [];
      for (const enemy of v.enemies) {
        // Bosses retain their native movement and are never launched by a kick.
        if (
          enemy.boss ||
          enemy.gone ||
          enemy.executing ||
          (v.cine && !enemy.dead)
        )
          continue;
        let state = flights.get(enemy);
        if (!(enemy.flung > 0)) {
          flights.delete(enemy);
          const decay = enemy.dead ? Math.exp(-4 * step) : 1;
          const hit = sweepBody(
            enemy,
            enemy.kx * step * decay,
            enemy.kz * step * decay,
          );
          if (hit) {
            enemy.x = hit.x;
            enemy.z = hit.z;
            enemy.fy = ie(enemy.x, enemy.z);
            enemy.kx = enemy.kz = 0;
          }
          continue;
        }
        if (!state || (!state.landing && enemy.flungT < state.lastT)) {
          state = { floor: enemy.fy || 0, lastT: enemy.flungT, landing: false };
          flights.set(enemy, state);
        }
        if (state.landing) {
          // A gunshot can push a falling body sideways, but cannot restart its
          // vertical arc or award a second wall-impact hit during one throw.
          const hit = sweepBody(enemy, enemy.kx * step, enemy.kz * step);
          if (hit) {
            enemy.x = hit.x;
            enemy.z = hit.z;
            enemy.kx = enemy.kz = 0;
          }
        } else {
          const dx = enemy.kx * step,
            dz = enemy.kz * step;
          const hit = sweepBody(enemy, dx, dz);
          if (hit) {
            enemy.x = hit.x;
            enemy.z = hit.z;
            enemy.fy = ie(enemy.x, enemy.z);
            const speed = Math.hypot(enemy.kx, enemy.kz) || 1;
            Vtt(
              enemy,
              enemy.x + (enemy.kx / speed) * enemy.r,
              enemy.z + (enemy.kz / speed) * enemy.r,
            );
            if (!enemy.dead) {
              qr(enemy, 40, { wIdx: -2 });
              w0(Math.random() < 0.5 ? "kicksplat" : "wallkill", true);
              mn(gn.punt, T.ach);
            }
            if (enemy.gone) continue;
            beginFall(
              enemy,
              state,
              state.floor + Q1(enemy.flungT + step * hit.fraction) - enemy.fy,
            );
            if (!flights.has(enemy)) continue;
          }
        }
        state.ending = !state.landing && enemy.flung <= step;
        // Keep native flight/death rendering in control until the feet land.
        // This also prevents the normal animation layer taking an airborne pose.
        if (state.landing) enemy.flungT = 0;
        if (state.landing || state.ending) enemy.flung = step + 0.001;
        active.push([enemy, state]);
      }
      danger = originalEnemies(step) || danger;
      for (const [enemy, state] of active) {
        enemy.fy = ie(enemy.x, enemy.z);
        if (state.landing) {
          state.time += step;
          const height = Math.max(
            0,
            state.floor +
              state.height -
              14 * state.time * state.time -
              enemy.fy,
          );
          if (enemy.dead)
            enemy.sp.material.rotation -= Jd(step, Xd(enemy.kx, enemy.kz));
          if (height <= 0) {
            settle(enemy);
            continue;
          }
          enemy.sp.position.set(enemy.x, bodyY(enemy) + height, enemy.z);
          if (!enemy.dead)
            enemy.sp.material.rotation =
              state.rotation * Math.max(0, 1 - state.time / state.duration);
          const decay = Math.exp((enemy.dead ? -4 : -6) * step);
          enemy.kx *= decay;
          enemy.kz *= decay;
        } else {
          const height = Math.max(0, state.floor + Q1(enemy.flungT) - enemy.fy);
          enemy.sp.position.set(enemy.x, bodyY(enemy) + height, enemy.z);
          state.lastT = enemy.flungT;
          if (state.ending || height <= 0) {
            beginFall(enemy, state, height);
            if (flights.has(enemy)) enemy.flung = step + 0.001;
          }
        }
        enemy.blob.position.set(enemy.x, enemy.fy + 0.012, enemy.z);
      }
    }
    return danger;
  };

  // The tear sequence holds the left arm in its first-person hand. Keep the
  // native sever wound/blood/sound, but do not also launch that same arm into
  // the world until the hand has lowered out of view at normal completion.
  let heldFinisherArm = null;
  const originalLimbBurst = G9;
  G9 = function (enemy, part, side, hit) {
    if (enemy !== ve.e || enemy.boss || ve.kind !== 2 || !enemy.executing ||
        part !== "arm" || side !== "L" || heldFinisherArm)
      return originalLimbBurst.apply(this, arguments);
    const spawn = xu;
    xu = function (kind, host, launch, life) {
      if (kind !== 1) return spawn.apply(this, arguments);
      heldFinisherArm = { enemy, kind, host, launch: { ...launch }, life, spawn };
      // G9 uses xu only for its side effect; it does not consume this result.
      return null;
    };
    try {
      return originalLimbBurst.apply(this, arguments);
    } catch (error) {
      heldFinisherArm = null;
      throw error;
    } finally {
      xu = spawn;
    }
  };

  const originalFinishStart = K_;
  let lastKind = -1;
  K_ = function () {
    if (!canAct() || melee || oo.busy || !originalFinishStart()) return false;
    // Alternate three choreographies rather than accidentally replaying one.
    if (ve.kind === lastKind)
      ve.kind = (ve.kind + 1 + (Math.random() < 0.5 ? 0 : 1)) % 3;
    lastKind = ve.kind;
    oo.exec.kind = ve.kind;
    if (ve.prompt) ve.prompt.style.opacity = "0";
    Ct.firing = false;
    Ct.zoomOn = false;
    if (St.wstate === "reload") {
      St.wstate = "idle";
      St.wtime = 0;
    }
    le(["BREAK THE NECK", "CRUSH THE SKULL", "TEAR AND STRIKE"][ve.kind], 1.25);
    return true;
  };
  const originalFinisherUpdate = H_;
  H_ = function (dt) {
    const target = ve.e;
    // A live target cannot be pulled through geometry after it has moved away.
    if (target && (T.won || (!target.dead && !inSight(target.x, target.z))))
      Kw();
    // Keep the target for this frame: the native update clears ve.e when the
    // animation ends, after applying its older chest-height camera pose.
    const frameTarget = ve.e;
    originalFinisherUpdate(dt);
    if (frameTarget && !T.dead && v.enemies.includes(frameTarget)) {
      // Frame the body part the hands are attacking. Keep this framing through
      // the final impact so a dead target cannot make the camera snap downward.
      const focus = ve.kind === 2 ? 0.63 + 0.17 * K0(ve.t, 0.58, 0.76) : 0.8;
      const pitch = Math.atan2(
        (frameTarget.fy || 0) + frameTarget.h * focus - C.pyy,
        Qd,
      );
      Ct.pitch = ve.from.pitch + (pitch - ve.from.pitch) * P_(ve.t / 0.2);
    }
    if (ve.e && !ve.e.dead) {
      const p = ve.t;
      ve.e.sp.material.rotation =
        Math.sin(p * 22) * 0.045 +
        (ve.kind === 0 ? K0(p, 0.42, 0.8) * 0.32 : 0);
      ve.e.sp.position.y =
        Sa(ve.e) - (ve.kind === 1 ? K0(p, 0.26, 0.8) * 0.25 : 0);
    }
    if (ve.prompt && !ve.e) {
      const enemy = Rk();
      ve.prompt.textContent = enemy
        ? "E — FINISH  ·  " + Math.max(1, Math.ceil(enemy.stagger)) + "s"
        : "E — FINISH";
    }
  };
  const originalFinisherEnd = Kw;
  Kw = function () {
    const held = heldFinisherArm;
    const completed = held && held.enemy === ve.e && ve.kind === 2 &&
      ve.t >= Sk && ve.fired === Lm.length && held.enemy.dead &&
      !T.dead && !T.won && v.enemies.includes(held.enemy);
    heldFinisherArm = null;
    if (ve.e && !ve.e.dead) ve.e.sp.material.rotation = 0;
    originalFinisherEnd();
    Ct.firing = false;
    if (completed) {
      const forwardX = -Math.sin(Ct.yaw), forwardZ = -Math.cos(Ct.yaw);
      const leftX = -Math.cos(Ct.yaw), leftZ = Math.sin(Ct.yaw);
      let x = C.px + forwardX * 0.9 + leftX * 0.3;
      let z = C.pz + forwardZ * 0.9 + leftZ * 0.3;
      if (d0(x, z)) { x = held.enemy.x; z = held.enemy.z; }
      held.spawn(held.kind, held.host, {
        ...held.launch, x, z,
        y: Math.max(ie(x, z) + 0.2, C.pyy - 0.95),
        vx: forwardX * 0.6 + leftX * 0.35,
        vz: forwardZ * 0.6 + leftZ * 0.35,
        vy: -0.4,
      }, held.life);
    }
  };
  // Release held input after losing focus, so sprint/fire cannot become stuck.
  addEventListener("blur", () => {
    for (const key of Object.keys(li)) li[key] = false;
    Ct.firing = false;
  });

  // Explicit opt-in inspection seam; never enabled by a regular game launch.
  if (new URLSearchParams(location.search).has("qa")) {
    window.__BLACK_SILENCE_QA = {
      T,
      C,
      v,
      Ct,
      St,
      Be,
      oo,
      J,
      li,
      balance,
      Ki,
      spawn: (...args) => Du(...args),
      damage: (...args) => qr(...args),
      stagger: (enemy) => B_(enemy),
      target: () => Rk(),
      kick: () => B$(),
      finish: () => K_(),
      finishStep: (dt) => H_(dt),
      finishEnd: () => Kw(),
      weaponStep: (dt) => v$(dt),
      enemyStep: (dt) => qtt(dt),
      moveStep: (dt) => m_(dt),
      resetCombat: () => pz(),
      load: (level) => rp(level),
      floor: (x, z) => ie(x, z),
      solid: (x, z) => d0(x, z),
      line: (...args) => lm(...args),
      cellSize: P,
      eyeHeight: Yo,
      pause: (value) => V5(value),
      melee: () => melee,
      weapons: Th,
      models: vk,
      pose: () => Btt(),
      renderModel: (...args) => h0t(...args),
      raster: Te,
      setCamera() {
        J.camera.position.set(C.px, C.pyy, C.pz);
        J.camera.rotation.set(Ct.pitch, Ct.yaw, 0, "YXZ");
        J.camera.updateMatrixWorld(true);
      },
    };
  }
})();
