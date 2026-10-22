// Actual movement/pickup/exit QA. Enemy AI runs through the first encounter;
// the remaining route isolates geometry/elevation, not full combat balance.
// node tools/prologue-navigation-test.cjs [game.html] [output-directory]
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const input = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const output = path.resolve(process.argv[3] || path.join(root, ".dream-loop", "navigation"));
fs.mkdirSync(output, { recursive: true });
const source = fs.readFileSync(input, "utf8");
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
assert.equal(source.split(anchor).length, 2, "Expected the original engine initialization");
const study = `
window.__PROLOGUE_NAV = {
  solid: fu,
  step(dt, ai) {
    V5(false);
    m_(dt); H_(dt); VJ(dt); v$(dt);
    if (ai) { qtt(dt); htt(dt); ntt(dt); itt(dt); att(dt); }
    G$(dt); F$(dt); z$(dt); SK(dt); Wb(dt); KX(dt);
    V5(true);
  },
  reload: Bm,
  exit: () => ({x:z0.exit.x,z:z0.exit.z,nx:z0.exit.nx,nz:z0.exit.nz,phase:oe.phase}),
};
`;
const fixture = path.join(output, "navigation-study.html");
fs.writeFileSync(fixture, source.replace(anchor, study + anchor));

(async () => {
  const browser = await chromium.launch({
    headless: true, channel: "chrome", args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [], results = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(pathToFileURL(fixture).href + "?qa=1");
    await page.locator("#mNew").click();
    await page.waitForFunction(() => {
      const q = window.__BLACK_SILENCE_QA;
      return q?.Be.started && !q.Be.inputLock && q.C.px === 19;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA, study = window.__PROLOGUE_NAV;
      q.pause(true);
      document.getElementById("pause").classList.add("hidden");
      window.navAim = (x, z, y = q.C.pyy) => {
        q.Ct.yaw = Math.atan2(x - q.C.px, z - q.C.pz) + Math.PI;
        q.Ct.pitch = Math.atan2(y - q.C.pyy, Math.hypot(x - q.C.px, z - q.C.pz));
        q.setCamera();
      };
      window.navWalk = (tx, tz, ai, stopEnemy) => {
        const start = [Math.round(q.C.px), Math.round(q.C.pz)];
        const key = (x, z) => x + "," + z;
        // Use the player's real radius collision plus ledge clearance. Tile
        // connectivity alone misses props, narrow stairs and pit-edge inertia.
        const safe = (x, z) => !study.solid(x, z) &&
          [[0,0],[.34,0],[-.34,0],[0,.34],[0,-.34]].every(([dx,dz]) => q.floor(x+dx,z+dz) >= 2.09);
        const queue = [start], prev = new Map([[key(...start), null]]);
        let found = false;
        for (let cursor = 0; cursor < queue.length; cursor++) {
          const [x,z] = queue[cursor];
          if (x === tx && z === tz) { found = true; break; }
          for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
            const nx=x+dx,nz=z+dz,k=key(nx,nz);
            if (nx<1 || nz<1 || nx>126 || nz>122 || prev.has(k) ||
              !safe(nx,nz) || !safe(x+dx*.5,z+dz*.5) || q.floor(nx,nz)-q.floor(x,z)>1.2) continue;
            prev.set(k,[x,z]); queue.push([nx,nz]);
          }
        }
        if (!found) return {error:"No safe route",from:start,to:[tx,tz]};
        const route = [];
        for (let node=[tx,tz];node;node=prev.get(key(...node))) route.unshift(node);
        let ticks=0,minHP=q.T.hp;
        for (const [x,z] of route) {
          let frames=0;
          while (Math.hypot(q.C.px-x,q.C.pz-z)>.16 && frames++<360) {
            if (q.T.dead) return {error:"Player died",ticks,minHP};
            if (stopEnemy && q.v.enemies.some(e=>!e.dead &&
              Math.hypot(e.x-q.C.px,e.z-q.C.pz)<6 && q.line(q.C.px,q.C.pz,e.x,e.z))) {
              q.li.KeyW=false;
              return {encounter:true,at:[q.C.px,q.C.pz],ticks,minHP,hp:q.T.hp};
            }
            window.navAim(x,z);
            const distance=Math.hypot(x-q.C.px,z-q.C.pz);
            const forward=(q.C.vx*(x-q.C.px)+q.C.vz*(z-q.C.pz))/distance;
            q.li.KeyW=forward<Math.min(6,Math.max(.45,distance*4));
            study.step(1/60,ai); ticks++; minHP=Math.min(minHP,q.T.hp);
          }
          if (frames>=360) { q.li.KeyW=false; return {error:"Movement stalled",node:[x,z],at:[q.C.px,q.C.pz]}; }
        }
        q.li.KeyW=false;
        for(let frame=0;frame<16;frame++) study.step(1/60,ai);
        return {at:[q.C.px,q.C.pz],ticks,minHP,hp:q.T.hp,shotgun:!!q.T.weapons[1],shells:q.T.ammo.shells};
      };
    });
    async function walk(name,x,z,ai=false,stopEnemy=false) {
      const result=await page.evaluate(args=>window.navWalk(...args),[x,z,ai,stopEnemy]);
      results.push({name,ai,...result});
      assert(!result.error, name+": "+JSON.stringify(result));
      console.log(name,JSON.stringify(result));
      return result;
    }
    async function capture(name,x,z,y) {
      // Let the existing dialogue timer finish naturally, without hiding text
      // or changing dialogue settings. The geometry stage keeps enemy AI paused.
      await page.evaluate(() => {
        const q=window.__BLACK_SILENCE_QA,study=window.__PROLOGUE_NAV;
        q.li.KeyW=false; q.Ct.firing=false;
        for(let frame=0;frame<300;frame++) study.step(1/60,false);
      });
      await page.evaluate(args=>window.navAim(...args),[x,z,y]);
      await page.evaluate(()=>document.getElementById("pause").classList.add("hidden"));
      await page.waitForTimeout(150);
      assert.equal(await page.locator("#subt").textContent(),"","Dialogue finished before capture");
      await page.screenshot({path:path.join(output,name+".png")});
    }
    const chapel=await walk("chapel",59,9,true);
    assert(chapel.shotgun,"Optional shotgun is obtained through actual movement");
    await capture("chapel",59,6,6.5);
    await walk("crypt-landing",19,19,true);
    await capture("crypt",19,25,5.2);
    const encounter=await walk("first-encounter",19,45,true,true);
    assert(encounter.encounter && encounter.hp>0,"First encounter is reached alive");
    await page.evaluate(()=>{
      const q=window.__BLACK_SILENCE_QA;
      const e=q.v.enemies.filter(e=>!e.dead).sort((a,b)=>Math.hypot(a.x-q.C.px,a.z-q.C.pz)-Math.hypot(b.x-q.C.px,b.z-q.C.pz))[0];
      window.navAim(e.x,e.z,e.fy+e.h*.65);
    });
    await page.evaluate(()=>document.getElementById("pause").classList.add("hidden"));
    await page.screenshot({path:path.join(output,"first-encounter.png")});
    await walk("first-bridge-near",21,53);
    await capture("first-bridge",38,53,3.5);
    await walk("first-bridge-far",37,53);
    await walk("east-passage",59,45);
    await walk("second-bridge-near",81,55);
    await capture("second-bridge",81,63,3.5);
    await walk("second-bridge-far",81,61);
    await walk("arena-entry",79,85);
    await walk("arena-platform",67,105);
    await capture("arena",71,110,4.5);
    await walk("arena-east-bridge",91,105);
    await walk("ascent-turn",109,105);
    await capture("ascent-turn",113,101,3.6);
    await walk("stair-foot",113,97);
    await walk("climb-refuge",119,53);
    await capture("climb-refuge",123,53,5.4);
    const exit=await page.evaluate(()=>window.__PROLOGUE_NAV.exit());
    await walk("exit-approach",Math.round(exit.x+exit.nx*1.5),Math.round(exit.z+exit.nz*1.5));
    await capture("exit-ladder",exit.x,exit.z,6.2);
    await page.evaluate(({x,z})=>{
      window.navAim(x,z);
      window.__BLACK_SILENCE_QA.pause(false);
    },exit);
    await page.keyboard.press("KeyE");
    await page.waitForFunction(()=>window.__PROLOGUE_NAV.exit().phase!=="idle",null,{timeout:4000});
    const exitPhase=await page.evaluate(()=>window.__PROLOGUE_NAV.exit().phase);
    assert.deepEqual(errors,[],"No runtime errors during traversal");
    const report={passed:true,scope:"Live AI through first encounter; remaining route validates movement, collision, elevation and E exit interaction",results,exitPhase,errors};
    fs.writeFileSync(path.join(output,"navigation-results.json"),JSON.stringify(report,null,2));
    console.log(JSON.stringify({passed:true,checkpoints:results.length,exitPhase,errors}));
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
