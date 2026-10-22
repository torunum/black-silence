// Actual game engine, fixed-step geometry matrix plus a live RAF recovery test.
// npm run build && node tools/wall-impact-tests.cjs
// GAME_HTML can point to a private build during parallel development.
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const target = path.resolve(
  process.env.GAME_HTML || path.join(root, "THE-BLACK-SILENCE.html"),
);
const artifacts = path.join(root, ".dream-loop");

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  const errors = [];
  const report = { deterministic: [], raf: [] };
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      requestAnimationFrame = () => 1;
    });
    await page.goto(pathToFileURL(target).href + "?qa=1");
    await page.locator("#mNew").click();
    report.deterministic = await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA;
      const random = Math.random;
      Math.random = () => 0.5;
      const results = [];
      const check = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const segmentDistance = (x, z, s) => {
        const dx = s.x2 - s.x1,
          dz = s.z2 - s.z1;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - s.x1) * dx + (z - s.z1) * dz) / (dx * dx + dz * dz),
          ),
        );
        return Math.hypot(x - s.x1 - dx * t, z - s.z1 - dz * t);
      };
      try {
        q.Be.inputLock = false;
        q.pause(false);
        q.v.cine = null;
        for (const id of ["dead", "win", "levelend"])
          document.getElementById(id).classList.add("hidden");
        for (const fixture of [
          "grid",
          "thin",
          "grid-corner",
          "thin-corner",
          "thin-endpoint",
          "mass",
          "lower-floor",
          "open-lower-floor",
        ])
          for (const life of ["alive", "wall-kill", "dead-on-kick"])
            for (const dt of [1 / 144, 1 / 60, 0.1]) {
              const name = `${fixture}/${life}/${dt.toFixed(4)}`;
              q.resetCombat();
              for (const e of q.v.enemies) {
                q.J.scene.remove(e.sp);
                q.J.scene.remove(e.blob);
              }
              q.v.enemies = [];
              q.v.props = [];
              q.v.doors = {};
              q.v.masses = new Map();
              q.v.GW = q.v.GH = 40;
              const corner = fixture.endsWith("corner");
              const lower = fixture.includes("lower-floor");
              const open = fixture === "open-lower-floor";
              q.v.grid = Array.from({ length: 40 }, (_, z) =>
                Array.from({ length: 40 }, (_, x) =>
                  x === 0 ||
                  z === 0 ||
                  x === 39 ||
                  z === 39 ||
                  ((fixture === "grid" || fixture === "lower-floor") &&
                    x === 8) ||
                  (fixture === "grid-corner" && x >= 8 && z >= 8)
                    ? "#"
                    : ".",
                ),
              );
              q.v.heightMap = Array.from({ length: 40 }, () =>
                Array.from({ length: 40 }, (_, x) => (lower && x < 7 ? 4 : 0)),
              );
              q.v.wallSegs =
                fixture === "thin"
                  ? [{ x1: 16, z1: 2, x2: 16, z2: 76 }]
                  : fixture === "thin-endpoint"
                    ? [{ x1: 16, z1: 11.3, x2: 16, z2: 76 }]
                    : fixture === "thin-corner"
                      ? [
                          { x1: 16, z1: 16, x2: 16, z2: 76 },
                          { x1: 16, z1: 16, x2: 76, z2: 16 },
                        ]
                      : [];
              if (fixture === "mass")
                for (let z = 1; z < 39; z++)
                  q.v.masses.set(z * 4096 + 8, [
                    { x0: 16, z0: 2, x1: 16.2, z1: 76 },
                  ]);
              const dx = corner ? Math.SQRT1_2 : 1,
                dz = corner ? Math.SQRT1_2 : 0;
              const ex = 13,
                ez = corner ? 13 : 11;
              Object.assign(q.C, {
                px: ex - dx * 2,
                pz: ez - dz * 2,
                pyy: (lower ? 4 : 0) + q.eyeHeight,
                vx: dx * 10,
                vz: dz * 10,
                vy: 0,
                grounded: true,
                spawnGuard: 0,
              });
              Object.assign(q.Ct, {
                yaw: Math.atan2(-dx, -dz),
                pitch: 0,
                firing: false,
              });
              q.T.dead = q.T.won = false;
              q.T.hp = 100;
              q.T.armor = 0;
              q.T.kickCd = 0;
              q.St.wstate = "idle";
              for (const key of Object.keys(q.li)) q.li[key] = false;
              q.li.ShiftLeft = true;
              q.setCamera();
              const enemy = q.spawn("z", ex, ez, true);
              const initialHP =
                life === "alive" ? 200 : life === "wall-kill" ? 70 : 25;
              Object.assign(enemy, {
                hp: initialHP,
                maxhp: 200,
                aware: true,
                flingCD: 100,
                flank: 0,
              });
              q.kick();
              check(q.melee()?.drop, name + ": real sprint kick started");
              q.weaponStep(0.2);
              check(
                enemy.flung > 0 && enemy.kx > 0,
                name + ": real kick contacted and launched enemy",
              );
              const launchHP = enemy.hp;
              let impact = null,
                landed = null,
                fallFrames = 0,
                previousHeight = null;
              for (let time = 0; time < 5; time += dt) {
                q.enemyStep(dt);
                // Independent known geometry checks: no body may enter a wall.
                if (
                  fixture === "grid" ||
                  fixture === "lower-floor" ||
                  fixture === "mass"
                )
                  check(
                    enemy.x + enemy.r <= 16 + 1e-5,
                    name + ": body penetrated flat wall",
                  );
                if (fixture === "grid-corner")
                  check(
                    Math.hypot(
                      Math.max(0, 16 - enemy.x),
                      Math.max(0, 16 - enemy.z),
                    ) >=
                      enemy.r - 1e-5,
                    name + ": body penetrated grid corner",
                  );
                for (const s of q.v.wallSegs)
                  check(
                    segmentDistance(enemy.x, enemy.z, s) >= enemy.r - 1e-5,
                    name + ": body penetrated thin wall/endpoint",
                  );
                if (
                  !impact &&
                  enemy.flung > 0 &&
                  Math.hypot(enemy.kx, enemy.kz) < 0.001
                )
                  impact = {
                    x: enemy.x,
                    z: enemy.z,
                    y: enemy.sp.position.y,
                    time,
                  };
                if (impact && enemy.flung > 0) {
                  if (previousHeight !== null)
                    check(
                      enemy.sp.position.y <= previousHeight + 0.04,
                      name + ": impact fall rose or froze",
                    );
                  previousHeight = enemy.sp.position.y;
                  fallFrames++;
                }
                if (!landed && enemy.flung <= 0)
                  landed = {
                    x: enemy.x,
                    z: enemy.z,
                    y: enemy.sp.position.y,
                    time,
                  };
              }
              check(
                landed && landed.time < 2,
                name + ": flight failed to terminate",
              );
              check(
                !enemy.flung &&
                  !enemy.flungT &&
                  Math.hypot(enemy.kx, enemy.kz) < 1e-5,
                name + ": leftover flight/spin/pushback state",
              );
              check(
                enemy.fy === q.floor(enemy.x, enemy.z),
                name + ": stale floor after landing",
              );
              check(
                enemy.dead ===
                  ((life !== "alive" && !open) || life === "dead-on-kick"),
                name + ": wrong live/dead result",
              );
              check(
                enemy.hp ===
                  launchHP - (!open && life !== "dead-on-kick" ? 40 : 0),
                name + ": repeated or missing wall damage",
              );
              if (enemy.dead)
                check(
                  Math.abs(enemy.sp.position.y - enemy.fy - enemy.h * 0.18) <
                    0.015,
                  name + ": corpse floating above floor",
                );
              else if (!lower && !open) {
                check(
                  Math.hypot(enemy.x - landed.x, enemy.z - landed.z) > 0.7,
                  name + ": AI cannot walk after impact",
                );
                check(q.T.hp < 100, name + ": AI cannot attack after impact");
              }
              if (lower)
                check(
                  fallFrames >= 3,
                  name + ": missing visible descent across lower floor",
                );
              results.push({
                name,
                wallDamage: launchHP - enemy.hp,
                landedAt: +landed.time.toFixed(3),
                fallFrames,
                recovered: enemy.dead ? "corpse grounded" : "alive",
                playerHP: q.T.hp,
              });
            }
        // Keep the original overkill case: 50 - 38 - 40 = -28 triggers native
        // dismemberment, so there is no corpse left to land or damage again.
        q.resetCombat();
        q.v.enemies = [];
        q.v.wallSegs = [];
        q.v.masses = new Map();
        q.v.heightMap = null;
        q.v.grid = Array.from({ length: 40 }, (_, z) =>
          Array.from({ length: 40 }, (_, x) =>
            x === 0 || z === 0 || x === 39 || z === 39 || x === 8 ? "#" : ".",
          ),
        );
        Object.assign(q.C, {
          px: 11,
          pz: 11,
          pyy: q.eyeHeight,
          vx: 10,
          vz: 0,
          vy: 0,
          grounded: true,
          spawnGuard: 0,
        });
        q.Ct.yaw = -Math.PI / 2;
        q.T.kickCd = 0;
        q.T.dead = q.T.won = false;
        const gib = q.spawn("z", 13, 11, true);
        Object.assign(gib, { hp: 50, maxhp: 200, aware: true, flingCD: 100 });
        q.kick();
        q.weaponStep(0.2);
        const kills = q.T.totKills;
        for (let i = 0; i < 180; i++) q.enemyStep(1 / 60);
        check(
          gib.gone && gib.hp === -28 && q.T.totKills === kills + 1,
          "overkill: native gib occurs once",
        );
        check(
          !gib.flung && !gib.flungT && !gib.kx && !gib.kz && !gib.sp.parent,
          "overkill: removed actor retains no flight or landing state",
        );
        results.push({
          name: "overkill-gib-cleanup",
          hp: gib.hp,
          kills: q.T.totKills - kills,
        });
        // Bullet pushback is not a new launch: preserve the descent while
        // checking both an impulse into the contacted wall and away from it.
        q.resetCombat();
        q.v.enemies = [];
        for (let row = 1; row < 39; row++) {
          q.v.grid[row][8] = ".";
          q.v.grid[row][10] = "#";
        }
        Object.assign(q.C, {
          px: 11,
          pz: 11,
          pyy: q.eyeHeight,
          vx: 10,
          vz: 0,
          vy: 0,
          grounded: true,
        });
        q.T.kickCd = 0;
        const falling = q.spawn("z", 13, 11, true);
        Object.assign(falling, {
          hp: 200,
          maxhp: 200,
          aware: true,
          flingCD: 100,
        });
        q.kick();
        q.weaponStep(0.2);
        for (
          let frame = 0;
          frame < 60 && Math.hypot(falling.kx, falling.kz) > 0.001;
          frame++
        )
          q.enemyStep(1 / 60);
        check(
          falling.flung > 0 && falling.hp === 122,
          "bullet during fall: wall impact reached before shooting",
        );
        const beforeBullet = falling.sp.position.y;
        q.damage(falling, q.weapons[0].dmg, { wIdx: 0, dir: { x: 1, z: 0 } });
        q.enemyStep(1 / 60);
        check(
          falling.flung > 0 &&
            beforeBullet - falling.sp.position.y < 0.2 &&
            falling.sp.position.y <= beforeBullet,
          "bullet during fall: wall-directed shot restarted vertical arc",
        );
        check(
          falling.x + falling.r <= 20 && falling.hp === 88,
          "bullet during fall: repeated wall damage or penetration",
        );
        const beforeAway = { x: falling.x, y: falling.sp.position.y };
        q.damage(falling, q.weapons[0].dmg, { wIdx: 0, dir: { x: -1, z: 0 } });
        q.enemyStep(1 / 60);
        check(
          falling.x < beforeAway.x &&
            beforeAway.y - falling.sp.position.y < 0.2,
          "bullet during fall: sideways impulse lost height continuity",
        );
        for (let frame = 0; frame < 180; frame++) q.enemyStep(1 / 60);
        check(
          falling.hp === 54 &&
            !falling.flung &&
            !falling.flungT &&
            !falling.kx &&
            !falling.kz,
          "bullet during fall: landing failed to terminate cleanly",
        );
        results.push({
          name: "pistol-knockback-during-landing",
          hp: falling.hp,
          initialHeight: beforeBullet,
        });
        function rotationFixture(hp, lowerFloor = false) {
          q.resetCombat();
          q.v.enemies = [];
          q.v.heightMap = lowerFloor
            ? Array.from({ length: 40 }, (_, row) =>
                Array(40).fill(row >= 6 ? -4 : 0),
              )
            : null;
          Object.assign(q.C, {
            px: 11,
            pz: 11.8,
            pyy: q.eyeHeight,
            vx: 10,
            vz: 0,
            vy: 0,
            grounded: true,
          });
          q.T.dead = q.T.won = false;
          q.T.hp = 100;
          q.T.kickCd = 0;
          const enemy = q.spawn("z", 13, 11.8, true);
          Object.assign(enemy, { hp, maxhp: 200, aware: true, flingCD: 100 });
          q.kick();
          q.weaponStep(0.2);
          for (
            let frame = 0;
            frame < 60 && Math.hypot(enemy.kx, enemy.kz) > 0.001;
            frame++
          )
            q.enemyStep(1 / 60);
          check(
            enemy.flung > 0 && !enemy.kx,
            "rotation fixture reached wall while airborne",
          );
          return enemy;
        }
        const corpse = rotationFixture(110);
        const control = q.spawn("z", 25, 11.8, true);
        control.hp = 32;
        q.damage(corpse, q.weapons[0].dmg, { wIdx: 0, dir: { x: -1, z: 0 } });
        q.damage(control, q.weapons[0].dmg, { wIdx: 0, dir: { x: 0, z: 0 } });
        q.enemyStep(1 / 60);
        check(
          corpse.dead &&
            corpse.flung > 0 &&
            Math.abs(
              corpse.sp.material.rotation - control.sp.material.rotation,
            ) < 1e-7,
          "landing kill: lateral bullet impulse adds unintended corpse spin",
        );
        results.push({ name: "landing-corpse-spin-matches-native-pose" });
        const ledge = rotationFixture(200, true);
        q.damage(ledge, 1, { wIdx: 1, dir: { x: 0, z: 1 } });
        q.enemyStep(0.36);
        check(
          ledge.flung > 0 &&
            ledge.fy === -4 &&
            Math.abs(ledge.sp.material.rotation) < 1e-7,
          "lower-floor impulse: extended landing reverses settled rotation",
        );
        results.push({
          name: "extended-fall-rotation-stays-settled",
          floor: ledge.fy,
        });
        return results;
      } finally {
        Math.random = random;
      }
    });
    await page.close();

    // Let the shipped RAF, hit-stop, camera, AI and animation wrappers all run.
    const live = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    live.on("pageerror", (error) => errors.push(error.message));
    await live.goto(pathToFileURL(target).href + "?qa=1");
    await live.locator("#mNew").click();
    await live.waitForFunction(
      () => !window.__BLACK_SILENCE_QA.Be.inputLock,
      null,
      { timeout: 30000 },
    );
    for (const life of ["alive", "wall-kill", "dead-on-kick"]) {
      await live.evaluate((life) => {
        const q = window.__BLACK_SILENCE_QA;
        q.resetCombat();
        q.pause(false);
        q.Be.inputLock = false;
        q.v.cine = null;
        q.v.props = [];
        for (const e of q.v.enemies) {
          q.J.scene.remove(e.sp);
          q.J.scene.remove(e.blob);
        }
        q.v.enemies = [];
        let arena;
        for (let row = 2; row < q.v.GH - 2 && !arena; row++)
          for (let col = 3; col < q.v.GW - 2; col++) {
            const wall = col * q.cellSize,
              z = (row + 0.5) * q.cellSize;
            if (
              q.solid(wall + 0.05, z) &&
              !q.solid(wall - 0.1, z) &&
              !q.solid(wall - 5, z) &&
              q.line(wall - 5, z, wall - 0.5, z) &&
              q.floor(wall - 5, z) === q.floor(wall - 0.5, z)
            ) {
              arena = { wall, z };
              break;
            }
          }
        if (!arena)
          throw new Error("No authored wall with a clear kick approach");
        const floor = q.floor(arena.wall - 3, arena.z);
        Object.assign(q.C, {
          px: arena.wall - 4.5,
          pz: arena.z,
          pyy: floor + q.eyeHeight,
          vx: 10,
          vz: 0,
          vy: 0,
          grounded: true,
          spawnGuard: 0,
        });
        Object.assign(q.Ct, { yaw: -Math.PI / 2, pitch: 0, firing: false });
        q.T.hp = 100;
        q.T.armor = 0;
        q.T.dead = q.T.won = false;
        q.T.kickCd = 0;
        q.St.wstate = "idle";
        for (const key of Object.keys(q.li)) q.li[key] = false;
        q.li.ShiftLeft = true;
        const e = q.spawn("z", arena.wall - 2, arena.z, true);
        Object.assign(e, {
          hp: life === "alive" ? 200 : life === "wall-kill" ? 70 : 25,
          maxhp: 200,
          aware: true,
          cool: 1,
          flingCD: 100,
          flank: 0,
        });
        q.setCamera();
        const run = (window.__wallRun = {
          enemy: e,
          arena,
          frames: [],
          previous: 0,
          maxX: e.x,
          maxY: e.sp.position.y,
          impacted: false,
          landed: false,
          returnedPlayer: false,
          active: true,
        });
        const frame = (time) => {
          if (!run.active) return;
          if (run.previous) run.frames.push(time - run.previous);
          run.previous = time;
          run.maxX = Math.max(run.maxX, e.x);
          run.maxY = Math.max(run.maxY, e.sp.position.y);
          if (e.flung > 0 && Math.hypot(e.kx, e.kz) < 0.001)
            run.impacted = true;
          if (run.impacted && e.flung <= 0 && !run.landed) {
            run.landed = true;
            run.landedX = e.x;
          }
          if (!q.melee() && !run.returnedPlayer) {
            // The target must actively approach the player after stun recovery.
            q.C.px = arena.wall - 3.2;
            q.C.pz = arena.z;
            q.C.vx = q.C.vz = 0;
            q.C.pyy = floor + q.eyeHeight;
            q.C.grounded = true;
            run.returnedPlayer = true;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        q.kick();
      }, life);
      await live.waitForFunction(() => window.__wallRun.landed, null, {
        timeout: 12000,
      });
      if (life === "alive")
        await live.waitForFunction(
          () =>
            window.__BLACK_SILENCE_QA.T.hp < 100 &&
            window.__wallRun.landedX - window.__wallRun.enemy.x > 0.7,
          null,
          { timeout: 12000 },
        );
      else
        await live.waitForFunction(() => window.__wallRun.enemy.deathT > 1.5);
      const result = await live.evaluate(() => {
        const q = window.__BLACK_SILENCE_QA,
          r = window.__wallRun,
          e = r.enemy;
        r.active = false;
        const sorted = r.frames.slice().sort((a, b) => a - b);
        return {
          wall: r.arena.wall,
          x: e.x,
          maxX: r.maxX,
          radius: e.r,
          y: e.sp.position.y,
          floor: e.fy,
          height: e.h,
          landedX: r.landedX,
          flung: e.flung,
          flungT: e.flungT,
          kx: e.kx,
          dead: e.dead,
          hp: e.hp,
          playerHP: q.T.hp,
          frames: sorted.length,
          p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        };
      });
      assert(
        result.maxX + result.radius <= result.wall + 1e-5,
        `${life}: actual RAF body penetrated authored wall`,
      );
      assert(
        !result.flung && !result.flungT && !result.kx,
        `${life}: actual RAF retained flight state`,
      );
      if (life === "alive")
        assert(
          result.landedX - result.x > 0.7 && result.playerHP < 100,
          "live RAF AI did not resume movement and attacks",
        );
      else
        assert(
          result.dead &&
            Math.abs(result.y - result.floor - result.height * 0.18) < 0.015,
          "actual RAF corpse remains airborne",
        );
      report.raf.push({ life, ...result });
    }
    assert.deepEqual(errors, [], "Browser runtime errors");
    fs.mkdirSync(artifacts, { recursive: true });
    fs.writeFileSync(
      path.join(artifacts, "wall-impact-results.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          matrixCases: report.deterministic.length,
          raf: report.raf,
          browserErrors: errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
