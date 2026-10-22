// Deterministic browser checks against the final distributable HTML.
// Run: npm install && npm run build && node tools/combat-tests.cjs
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "THE-BLACK-SILENCE.html");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
    });
    await page.goto(pathToFileURL(output).href + "?qa=1");
    await page.locator("#mNew").click();
    await page.waitForFunction(
      () =>
        window.__BLACK_SILENCE_QA?.Be.started &&
        window.__BLACK_SILENCE_QA.v.enemies.length > 0,
    );
    const result = await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA;
      const walls = [...q.v.wallSegs];
      const results = [];
      const assert = (condition, message) => {
        if (!condition) throw new Error(message);
        results.push(message);
      };
      q.Be.inputLock = false;
      q.Be.pianoOpen = false;
      q.pause(false);
      for (const id of ["levelend", "win", "dead"])
        document.getElementById(id).classList.add("hidden");
      q.v.cine = null;
      let arena;
      for (let z = 1; z < q.v.GH - 1 && !arena; z++)
        for (let x = 1; x < q.v.GW - 1; x++) {
          const px = (x + 0.5) * q.cellSize,
            pz = (z + 0.5) * q.cellSize;
          if (
            !q.solid(px, pz) &&
            !q.solid(px, pz - 6) &&
            q.line(px, pz, px, pz - 6)
          ) {
            arena = { px, pz };
            break;
          }
        }
      if (!arena) throw new Error("No clear test corridor found");
      function reset() {
        q.resetCombat();
        q.v.enemies = [];
        q.v.props = [];
        q.v.wallSegs = [...walls];
        Object.assign(q.C, arena, {
          pyy: q.floor(arena.px, arena.pz) + q.eyeHeight,
          vx: 0,
          vy: 0,
          vz: 0,
          grounded: true,
        });
        Object.assign(q.T, { dead: false, won: false, kickCd: 0, hp: 70 });
        Object.assign(q.Ct, { yaw: 0, pitch: 0, firing: false });
        Object.assign(q.St, { wstate: "idle", wtime: 0, wCool: 0 });
        for (const key of Object.keys(q.li)) q.li[key] = false;
        q.setCamera();
      }
      const enemy = (distance = 2) =>
        q.spawn("z", q.C.px, q.C.pz - distance, true);
      const random = (value, fn) => {
        const old = Math.random;
        Math.random = () => value;
        try {
          return fn();
        } finally {
          Math.random = old;
        }
      };
      reset();
      const normal = enemy();
      assert(
        normal.hp === normal.maxhp &&
          normal.maxhp === Math.round(50 * 1.4 * 1.25),
        "spawn health receives the intended 25 percent increase",
      );
      normal.hp = normal.maxhp * 0.5;
      random(0, () => q.stagger(normal));
      assert(
        !normal.stagger && !normal.staggerTried,
        "healthy enemies cannot stagger",
      );
      normal.hp = normal.maxhp * 0.17;
      random(0.9, () => q.stagger(normal));
      random(0, () => q.stagger(normal));
      assert(
        normal.staggerTried && !normal.stagger,
        "failed critical-health roll cannot be retried",
      );
      const weak = enemy(1.8);
      weak.hp = weak.maxhp * 0.17;
      random(0, () => q.stagger(weak));
      assert(
        weak.stagger === q.balance.staggerSeconds && q.target() === weak,
        "successful critical-health roll enables close-range finisher",
      );
      q.C.grounded = false;
      assert(q.target() === null, "airborne player cannot start finisher");
      q.C.grounded = true;
      q.v.wallSegs.push({
        x1: q.C.px - 2,
        x2: q.C.px + 2,
        z1: q.C.pz - 0.8,
        z2: q.C.pz - 0.8,
      });
      assert(
        q.target() === null && !q.finish(),
        "wall blocks finisher selection",
      );
      q.v.wallSegs.pop();
      q.finishStep(0); // Let the normal nearby-target prompt appear first.
      assert(q.finish(), "E action starts finisher on a valid target");
      assert(
        document.getElementById("execPrompt").style.opacity === "0",
        "finisher hides the interaction prompt during its animation",
      );
      const hp = weak.hp;
      q.damage(weak, 999, { wIdx: 0 });
      assert(
        weak.hp === hp,
        "other attacks cannot steal a committed finisher kill",
      );
      q.li.KeyW = q.li.Space = true;
      q.moveStep(0.016);
      assert(
        q.C.grounded && q.li.KeyW && q.li.Space,
        "finisher suppresses movement and jumping without losing held input",
      );
      q.finishStep(0.31);
      assert(!weak.dead, "finisher does not kill before contact frames");
      q.finishStep(0.52);
      assert(
        weak.dead && q.T.hp === 85,
        "finisher final contact kills target and restores 15 health",
      );
      const impactPitch = q.Ct.pitch;
      q.finishStep(0.5);
      assert(
        !q.oo.busy && !q.oo.exec,
        "finisher recovery releases combat lock",
      );
      assert(
        Math.abs(q.Ct.pitch - impactPitch) < 1e-9,
        "finisher final recovery frame preserves the head framing",
      );
      reset();
      const canceled = enemy();
      canceled.stagger = 4;
      q.finish();
      q.resetCombat();
      assert(
        !canceled.executing && !q.oo.busy && !q.oo.exec,
        "level reset clears active finisher and target execution state",
      );
      reset();
      const kicked = enemy();
      const before = kicked.hp;
      q.kick();
      q.weaponStep(0.12);
      assert(
        kicked.hp === before,
        "standing kick damage waits for boot contact",
      );
      q.weaponStep(0.02);
      assert(
        kicked.hp === before - 18,
        "standing kick delivers its contact damage once",
      );
      q.weaponStep(0.1);
      assert(
        kicked.hp === before - 18,
        "kick recovery cannot damage the same enemy again",
      );
      reset();
      const launched = enemy();
      launched.hp = launched.maxhp = 180;
      q.li.ShiftLeft = true;
      q.C.vz = -10;
      q.St.wstate = "reload";
      q.Ct.zoomOn = true;
      q.kick();
      assert(
        q.melee()?.drop && q.C.vz === -q.Ki.launch && !q.C.grounded,
        "forward sprint produces airborne dropkick",
      );
      assert(
        q.St.wstate === "idle" && !q.Ct.zoomOn,
        "dropkick cancels reload and zoom",
      );
      q.C.pz -= 3.5;
      random(0.9, () => q.weaponStep(0.2));
      assert(
        launched.hp === 142 && launched.flung > 0 && launched.kz < -29,
        "swept dropkick catches enemy crossed before contact and launches it",
      );
      q.weaponStep(0.1);
      assert(
        launched.hp === 142,
        "dropkick multi-frame contact cannot hit one target twice",
      );
      const wallZ = launched.z - 1;
      q.v.wallSegs.push({
        x1: launched.x - 2,
        x2: launched.x + 2,
        z1: wallZ,
        z2: wallZ,
      });
      q.enemyStep(0.1);
      assert(
        launched.z > wallZ && launched.flung === 0 && launched.hp === 102,
        "thin authored walls stop launched enemies and apply collision damage",
      );
      reset();
      const blocked = enemy();
      const blockedHP = blocked.hp;
      q.v.wallSegs.push({
        x1: q.C.px - 2,
        x2: q.C.px + 2,
        z1: q.C.pz - 0.8,
        z2: q.C.pz - 0.8,
      });
      q.kick();
      q.weaponStep(0.2);
      assert(
        blocked.hp === blockedHP,
        "standing kick cannot damage through a wall",
      );
      reset();
      const originalHeights = q.v.heightMap;
      const highProp = {
        x: q.C.px,
        z: q.C.pz - 2,
        hgt: 1,
        dead: false,
        explosive: false,
      };
      const upperFloor = q.floor(highProp.x, highProp.z) + 6;
      q.v.heightMap = Array.from({ length: q.v.GH }, (_, z) =>
        Array.from(
          { length: q.v.GW },
          (_, x) => originalHeights?.[z]?.[x] || 0,
        ),
      );
      q.v.heightMap[Math.floor(highProp.z / q.cellSize)][
        Math.floor(highProp.x / q.cellSize)
      ] = upperFloor;
      q.v.props = [highProp];
      try {
        q.kick();
        q.weaponStep(0.2);
        assert(!highProp.dead, "kick cannot break a prop on a different floor");
      } finally {
        q.v.heightMap = originalHeights;
      }
      reset();
      q.li.ShiftLeft = true;
      q.C.vx = 10;
      q.kick();
      assert(!q.melee().drop, "sideways sprint remains a standing kick");
      reset();
      q.pause(true);
      q.kick();
      assert(q.melee() === null, "paused game blocks new kicks");
      q.pause(false);
      // Fire through the real weapon update/raycast/pellet path. These targets
      // keep their spawned HP; a manually weakened target cannot catch damage
      // breakpoints that accidentally make the finisher unreachable in play.
      function armedTarget(weapon, head = false) {
        reset();
        q.T.cur = weapon;
        q.T.weapons[weapon] = true;
        q.T.mag[weapon] = q.weapons[weapon].magSize;
        const target = enemy();
        q.Ct.pitch = Math.atan2(
          (target.fy || 0) + target.h * (head ? 0.85 : 0.5) - q.C.pyy,
          2,
        );
        q.Ct.firing = true;
        q.setCamera();
        return target;
      }
      const pistol = armedTarget(0);
      random(0, () => q.weaponStep(1));
      assert(
        pistol.hp === 54 && !pistol.staggerTried,
        "real first pistol bodyshot leaves 54HP without a stagger roll",
      );
      random(0, () => q.weaponStep(1));
      assert(
        pistol.hp === 20 && pistol.stagger > 0,
        "real second pistol bodyshot can stagger a naturally damaged zombie",
      );
      q.Ct.firing = false;
      assert(
        q.finish(),
        "naturally wounded pistol target can be finished without editing its HP",
      );
      q.finishStep(1.3);
      assert(
        pistol.dead && !q.oo.busy,
        "natural pistol-to-finisher flow reaches a clean kill and recovery",
      );
      const headshot = armedTarget(0, true);
      random(0, () => q.weaponStep(1));
      assert(
        headshot.hp === 20 && headshot.stagger > 0,
        "real pistol headshot also exposes the occasional finisher window",
      );
      const shotgun = armedTarget(1);
      random(0, () => q.weaponStep(1));
      assert(
        shotgun.hp === 16 && shotgun.stagger > 0,
        "real eight-pellet shotgun volley can stagger a naturally damaged zombie",
      );
      const failedRoll = armedTarget(0);
      random(0.9, () => {
        q.weaponStep(1);
        q.weaponStep(1);
      });
      assert(
        failedRoll.hp === 20 && failedRoll.staggerTried && !failedRoll.stagger,
        "real weapon damage still respects a failed stagger chance",
      );
      random(0, () => q.weaponStep(1));
      assert(
        failedRoll.dead,
        "a final ordinary shot kills normally instead of forcing a finisher",
      );
      return { passed: results.length, results, arena };
    });
    if (errors.length) throw new Error("Browser errors: " + errors.join("; "));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
