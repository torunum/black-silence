// Focused checks against the actual distributable and its release module order.
// Run after npm run build: node tools/enemy-animation-tests.cjs
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const target = path.resolve(process.env.GAME_HTML || path.join(root, "THE-BLACK-SILENCE.html"));
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      requestAnimationFrame = () => 1;
    });
    await page.goto(pathToFileURL(target).href + "?qa=1");
    await page.locator("#mNew").click();
    const results = await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA,
        tests = [];
      const check = (value, name) => {
        if (!value) throw new Error(name);
        tests.push(name);
      };
      const random = Math.random;
      Math.random = () => 0.5;
      try {
        q.Be.inputLock = false;
        q.pause(false);
        q.v.cine = null;
        q.v.props = [];
        for (const id of ["dead", "win", "levelend"])
          document.getElementById(id).classList.add("hidden");
        let arena;
        for (let z = 3; z < q.v.GH - 1 && !arena; z++)
          for (let x = 1; x < q.v.GW - 1; x++) {
            const px = (x + 0.5) * q.cellSize,
              pz = (z + 0.5) * q.cellSize;
            if (
              !q.solid(px, pz) &&
              !q.solid(px, pz - 5) &&
              q.line(px, pz, px, pz - 5) &&
              q.floor(px, pz) === q.floor(px, pz - 5)
            ) {
              arena = { px, pz };
              break;
            }
          }
        if (!arena) throw new Error("Test corridor unavailable");
        const reset = (distance = 4, key = "z") => {
          q.resetCombat();
          q.v.enemies = [];
          Object.assign(q.C, arena, {
            pyy: q.floor(arena.px, arena.pz) + q.eyeHeight,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            spawnGuard: 100,
          });
          Object.assign(q.Ct, { yaw: 0, pitch: 0, firing: false });
          q.T.dead = q.T.won = false;
          q.T.hp = 100;
          q.setCamera();
          const enemy = q.spawn(key, arena.px, arena.pz - distance, true);
          enemy.aware = true;
          enemy.cool = 1;
          enemy.flingCD = 100;
          enemy.flank = 0;
          return enemy;
        };
        const walker = reset();
        const start = walker.z;
        q.enemyStep(0.12);
        const normalTime = walker.animT,
          normalTravel = walker.z - start;
        check(
          normalTime > 0 && q.enemyAnimation(walker).moving > 0,
          "native gait and body weight advance while actually moving",
        );
        const slow = reset();
        slow.slow = 0.5;
        const slowStart = slow.z;
        q.enemyStep(0.12);
        check(
          Math.abs(slow.animT / normalTime - 0.5) < 0.02 &&
            Math.abs((slow.z - slowStart) / normalTravel - 0.5) < 0.02,
          "slow movement halves gait cadence without changing stride length",
        );
        const stopped = reset();
        stopped.stun = 1;
        const phase = stopped.animT;
        q.enemyStep(0.1);
        check(
          stopped.animT === phase && !q.enemyAnimation(stopped).moving,
          "stunned actors do not walk in place",
        );
        const attacker = reset(1.4);
        attacker.cool = 0.15;
        const hp = q.T.hp;
        q.enemyStep(0.03);
        check(
          q.enemyAnimation(attacker).anticipation &&
            q.enemyAnimation(attacker).pose === "atk",
          "ready melee attack shows native anticipation frame before damage",
        );
        check(
          q.T.hp === hp && attacker.cool > 0,
          "anticipation does not apply or reschedule damage",
        );
        q.enemyStep(0.13);
        check(
          q.enemyAnimation(attacker).attack > 0 &&
            attacker.sp.scale.x === attacker.w &&
            attacker.sp.scale.y === attacker.h,
          "contact has recovery motion without inflating the sprite",
        );
        for (const key of ["t", "j"]) {
          const rangedMelee = reset(1, key);
          rangedMelee.cool = 0.15;
          q.C.spawnGuard = 0;
          q.T.armor = 0;
          const beforeContact = q.T.hp;
          q.enemyStep(0.03);
          check(q.enemyAnimation(rangedMelee).anticipation &&
            q.enemyAnimation(rangedMelee).pose === "atk" && q.T.hp === beforeContact,
            `${key}: native close melee receives a pre-contact pose without early damage`);
          q.enemyStep(0.13);
          check(q.T.hp === beforeContact - rangedMelee.mel && rangedMelee.cool === 1,
            `${key}: close melee retains native damage and cooldown`);
          for (const distance of [1.56, 2.5, 3, 4]) {
            const ranged = reset(distance, key);
            ranged.cool = 0.15;
            q.enemyStep(0.03);
            check(q.enemyAnimation(ranged).anticipation === (distance > 3),
              `${key}: reach ${distance} preserves the native gap and distant attack band`);
          }
        }
        const struck = reset();
        const fullHP = struck.hp;
        q.damage(struck, 5, { wIdx: 0, dir: { x: 1, z: 0 } });
        q.enemyStep(0.04);
        check(
          struck.hp === fullHP - 5 &&
            q.enemyAnimation(struck).recoil > 0 &&
            struck.sp.material.rotation < 0,
          "directional recoil responds to the actual hit without changing damage",
        );
        const staggering = reset(2);
        staggering.stagger = 0.7;
        staggering.staggerTried = true;
        const physical = [
          staggering.x,
          staggering.z,
          staggering.h,
          staggering.w,
        ];
        q.enemyStep(0.15);
        check(
          q.enemyAnimation(staggering).staggered &&
            staggering.sp.position.y <
              q.floor(staggering.x, staggering.z) + staggering.h / 2,
          "stagger visibly settles weight below the standing pose",
        );
        check(
          physical.every(
            (value, i) =>
              value ===
              [staggering.x, staggering.z, staggering.h, staggering.w][i],
          ),
          "stagger animation preserves position and hitbox dimensions",
        );
        q.enemyStep(0.6);
        check(
          !q.enemyAnimation(staggering).staggered &&
            q.enemyAnimation(staggering).recover > 0,
          "stagger expiry blends into recovery",
        );
        const flying = reset(2);
        flying.flung = 1;
        flying.flungT = 0;
        flying.kz = -6;
        q.enemyStep(0.03);
        check(
          flying.sp.position.y > q.floor(flying.x, flying.z) + flying.h / 2 &&
            Math.abs(flying.sp.material.rotation) > 0.01,
          "flung trajectory and spin retain priority",
        );
        check(q.enemyAnimation(flying).pose === "airborne",
          "living throw uses native reeling rig instead of a frozen walk frame");
        for (let i = 0; i < 160 && flying.flung > 0; i++) q.enemyStep(1 / 120);
        check(!flying.flung && q.enemyAnimation(flying).landing > 0,
          "landing starts bounded presentation recovery after physical flight ends");
        const landingPhysical = [flying.x, flying.z, flying.h, flying.w, flying.hp];
        flying.stun = 1;
        q.enemyStep(0.06);
        check(q.enemyAnimation(flying).pose === "landing" &&
          flying.sp.position.y < flying.fy + flying.h / 2 &&
          landingPhysical.every((n,i)=>n === [flying.x,flying.z,flying.h,flying.w,flying.hp][i]),
          "landing weight changes sprite only, preserving root, hitbox and health");
        const remaining = q.enemyAnimation(flying).landing;
        q.enemyStep(0);
        check(q.enemyAnimation(flying).landing === remaining,
          "zero game time does not advance landing recovery");
        q.damage(flying, 1, {wIdx:0,dir:{x:1,z:0}});
        q.enemyStep(0.32);
        check(q.enemyAnimation(flying).landing === 0 &&
          Math.abs(flying.sp.position.y - flying.fy - flying.h/2) < 0.007,
          "repeated hit does not restart landing or retain a body offset");
        const landingCorpse = reset(2);
        landingCorpse.flung=0.04; landingCorpse.flungT=1;
        q.enemyStep(0.05);
        q.damage(landingCorpse,landingCorpse.hp+1,{wIdx:0});
        q.enemyStep(0.01);
        check(landingCorpse.dead && q.enemyAnimation(landingCorpse).landing===0,
          "death immediately returns landing sprite ownership to native corpse animation");
        const distant = reset(2);
        distant.stun=2; q.enemyStep(0.01);
        const restingMap=distant.sp.material.map;
        distant.flung=0.04; distant.flungT=1.01;
        q.enemyStep(0.05);
        check(q.enemyAnimation(distant).landing>0,"short remaining throw still enters landing recovery");
        q.C.px+=40;
        q.enemyStep(0.4);
        check(q.enemyAnimation(distant).landing===0 && distant.sp.material.map===restingMap,
          "far actor releases the impact texture even when native distance culling skips its rig");
        const urgent = reset(1.4);
        urgent.stun=2; urgent.flung=0.04; urgent.flungT=1.01;
        q.enemyStep(0.05);
        urgent.stun=0; urgent.cool=0.15;
        q.C.spawnGuard=0; q.T.armor=0;
        const hpBeforeUrgent=q.T.hp;
        q.enemyStep(0.03);
        check(q.enemyAnimation(urgent).landing>0 && q.enemyAnimation(urgent).anticipation &&
          q.enemyAnimation(urgent).pose==='atk' && q.T.hp===hpBeforeUrgent,
          "landing preserves an urgent attack telegraph without advancing its damage");
        q.enemyStep(0.13);
        check(urgent.atkAnim>0 && q.enemyAnimation(urgent).pose==='atk' && q.T.hp<hpBeforeUrgent,
          "native contact still damages on its normal cooldown during landing recovery");
        urgent.stagger=1; q.enemyStep(0.01);
        check(q.enemyAnimation(urgent).staggered && q.enemyAnimation(urgent).pose==='pain' &&
          Math.abs(urgent.sp.material.rotation)<0.04 && urgent.sp.material.color.r===1,
          "stagger cue takes priority over ongoing landing weight and pain frames");
        const executed = reset(2);
        executed.stagger = 4;
        check(
          q.finish(),
          "finisher starts with enemy animation module installed",
        );
        q.finishStep(0.4);
        const rotation = executed.sp.material.rotation;
        q.enemyStep(0.01);
        check(
          executed.executing &&
            !q.enemyAnimation(executed).recoil &&
            executed.sp.material.rotation === rotation,
          "execution retains its own target rotation",
        );
        q.finishEnd();
        const boss = reset(4, "E");
        boss.dormant = true;
        boss.sp.scale.set(boss.w * 1.1, boss.h * 0.9, 1);
        q.enemyStep(0.03);
        check(
          boss.sp.scale.x === boss.w * 1.1 && boss.sp.scale.y === boss.h * 0.9,
          "boss silhouette and dormant animation remain native",
        );
        const corpse = reset();
        q.damage(corpse, corpse.hp + 1, { wIdx: 0 });
        q.enemyStep(0.1);
        check(
          corpse.dead &&
            !q.enemyAnimation(corpse).moving &&
            !q.enemyAnimation(corpse).recoil,
          "death owns the sprite and clears living recoil",
        );
        q.resetCombat();
        check(
          q.enemyAnimation(corpse) === null,
          "scene reset discards transient animation state",
        );
        return { passed: tests.length, tests, arena };
      } finally {
        Math.random = random;
      }
    });
    if (errors.length) throw new Error(errors.join("; "));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
