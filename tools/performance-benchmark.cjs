// RESEARCH HARNESS: interleaved, real-RAF A/B; not a release acceptance test.
// Profiling hooks live only in private artifacts. Candidate optimization was
// rejected in polish pass 4: byte parity passed, but real-RAF benefit did not.
// node tools/performance-benchmark.cjs baseline.html candidate.html
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
  artifacts = path.join(root, ".dream-loop");
const inputs = process.argv.slice(2).map((p) => path.resolve(p));
if (inputs.length !== 2)
  throw new Error("Provide baseline.html and candidate.html");
const stats = (values) => {
  const sorted = values.slice().sort((a, b) => a - b),
    n = sorted.length;
  return {
    n,
    mean: n ? values.reduce((a, b) => a + b, 0) / n : 0,
    p50: sorted[Math.floor(n * 0.5)] || 0,
    p95: sorted[Math.floor(n * 0.95)] || 0,
    max: sorted.at(-1) || 0,
    over33ms: values.filter((v) => v > 33.5).length,
  };
};
const instrumentation = `(()=>{
  const perf=window.__runtimePerf={active:false,calls:{},frames:[],gpu:[],slowGL:[],last:0,loads:[],warmup:[]};
  const privateDraw=e0t;e0t=function(raster,model,pose,...args){if(raster===Te.raster)return privateDraw(raster,model,pose,...args);const start=performance.now(),random=window.__randomCalls,player=JSON.stringify(C),key=Te.lastKey,anchors=Te.anchors,children=J.scene?.children.length;try{return privateDraw(raster,model,pose,...args);}finally{perf.warmup.push({ms:performance.now()-start,rngCalls:window.__randomCalls-random,playerUnchanged:JSON.stringify(C)===player,viewmodelUnchanged:Te.lastKey===key&&Te.anchors===anchors,sceneUnchanged:J.scene?.children.length===children});}};
  const wrap=(name,fn)=>function(...args){if(!perf.active)return fn.apply(this,args);const start=performance.now();try{return fn.apply(this,args)}finally{(perf.calls[name]||(perf.calls[name]=[])).push(performance.now()-start);}};
  h0t=wrap('rasterCPU',h0t);qtt=wrap('enemyCPU',qtt);v0t=wrap('minimapCPU',v0t);Fk=wrap('frameCPU',Fk);
  const load=rp;rp=function(...args){const start=performance.now(),result=load(...args),renderer=J.renderer;perf.loads.push(performance.now()-start);if(!renderer.__benchmarkWrapped){renderer.__benchmarkWrapped=true;const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');perf.adapter=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);perf.gpuTimerSupported=!!ext;const pending=[],free=[];const render=wrap('threeSubmitCPU',renderer.render.bind(renderer));renderer.render=function(...a){for(let i=pending.length-1;i>=0;i--){const item=pending[i];if(gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE)){if(perf.active&&item.stage===perf.stage&&!gl.getParameter(ext.GPU_DISJOINT_EXT))perf.gpu.push(gl.getQueryParameter(item.query,gl.QUERY_RESULT)/1e6);pending.splice(i,1);free.push(item.query);}}if(!ext||!perf.active)return render(...a);const query=free.pop()||gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);try{return render(...a)}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query,stage:perf.stage});}};}return result;};
  const track=t=>{if(perf.active&&perf.last)perf.frames.push(t-perf.last);perf.last=perf.active?t:0;requestAnimationFrame(track);};requestAnimationFrame(track);
})();`;
fs.mkdirSync(artifacts, { recursive: true });
const targets = inputs.map((input, index) => {
  const html = fs.readFileSync(input, "utf8"),
    anchor = "Jk();ju();Yy();X$(J$);D0t();";
  if (html.split(anchor).length !== 2)
    throw new Error("Unexpected engine bootstrap");
  const target = path.join(artifacts, `benchmark-${index}.html`);
  fs.writeFileSync(
    target,
    html.replace(anchor, () => instrumentation + anchor),
  );
  return {
    target,
    source: input,
    sha256: crypto.createHash("sha256").update(html).digest("hex"),
  };
});
(async () => {
  const runs = [];
  for (const variant of [0, 1, 1, 0]) {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--allow-file-access-from-files"],
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => {
        let seed = 0x12345678;
        window.__randomCalls = 0;
        Math.random = () => {
          window.__randomCalls++;
          seed ^= seed << 13;
          seed ^= seed >>> 17;
          seed ^= seed << 5;
          return (seed >>> 0) / 4294967296;
        };
        for (const name of [
          "getProgramInfoLog",
          "getShaderInfoLog",
          "compileShader",
          "linkProgram",
          "texImage2D",
          "texSubImage2D",
        ]) {
          const original = WebGL2RenderingContext.prototype[name];
          WebGL2RenderingContext.prototype[name] = function (...args) {
            const start = performance.now();
            try {
              return original.apply(this, args);
            } finally {
              const ms = performance.now() - start;
              if (ms > 2 && window.__runtimePerf?.active)
                window.__runtimePerf.slowGL.push({ name, ms });
            }
          };
        }
      });
      const navigationStart = Date.now();
      await page.goto(pathToFileURL(targets[variant].target).href + "?qa=1");
      const navigationMs = Date.now() - navigationStart;
      const inputStart = Date.now();
      await page.locator("#mNew").click();
      await page.waitForFunction(
        () => {
          const q = window.__BLACK_SILENCE_QA;
          return q.raster.canvas && !q.raster.skipped && !q.Be.inputLock;
        },
        null,
        { timeout: 45000 },
      );
      const inputReadyMs = Date.now() - inputStart;
      await page.evaluate(() => {
        const q = window.__BLACK_SILENCE_QA;
        window.__prepareBenchmark = (weapon) => {
          q.resetCombat();
          q.pause(false);
          q.Be.inputLock = false;
          q.Be.pianoOpen = false;
          q.v.cine = null;
          q.T.dead = q.T.won = false;
          q.T.hp = 100;
          q.T.kickCd = 0;
          for (const id of ["dead", "win", "levelend"])
            document.getElementById(id).classList.add("hidden");
          for (const e of q.v.enemies) {
            q.J.scene.remove(e.sp);
            q.J.scene.remove(e.blob);
          }
          q.v.enemies = [];
          q.v.props = [];
          let arena;
          for (let z = 2; z < q.v.GH - 1 && !arena; z++)
            for (let x = 1; x < q.v.GW - 1; x++) {
              const px = (x + 0.5) * q.cellSize,
                pz = (z + 0.5) * q.cellSize;
              if (
                !q.solid(px, pz) &&
                !q.solid(px, pz - 6) &&
                q.line(px, pz, px, pz - 6) &&
                q.floor(px, pz) === q.floor(px, pz - 6)
              ) {
                arena = { px, pz };
                break;
              }
            }
          if (!arena) throw new Error("No fixed benchmark corridor");
          Object.assign(q.C, arena, {
            pyy: q.floor(arena.px, arena.pz) + q.eyeHeight,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
            spawnGuard: 100,
          });
          Object.assign(q.Ct, { yaw: 0, pitch: 0, firing: false });
          for (const key of Object.keys(q.li)) q.li[key] = false;
          q.T.cur = weapon;
          q.T.weapons[weapon] = true;
          q.T.ammo[q.weapons[weapon].ammo] = 100;
          q.T.mag[weapon] = q.weapons[weapon].magSize;
          q.St.wstate = "idle";
          q.St.wtime = 0;
          const e = q.spawn("z", q.C.px, q.C.pz - 2, true);
          e.hp = e.maxhp = 250;
          e.stun = 10;
          window.__benchmarkEnemy = e;
          q.setCamera();
        };
      });
      const stages = [];
      const start = (name) =>
        page.evaluate((name) => {
          const p = window.__runtimePerf;
          p.stage = name;
          p.calls = {};
          p.frames = [];
          p.gpu = [];
          p.slowGL = [];
          p.last = 0;
          p.active = true;
        }, name);
      const finish = async (name) => {
        const raw = await page.evaluate(() => {
          const p = window.__runtimePerf;
          p.active = false;
          return {
            frames: p.frames,
            calls: p.calls,
            gpu: p.gpu,
            slowGL: p.slowGL,
            renderer: window.__BLACK_SILENCE_QA.J.renderer.info.render,
          };
        });
        const stage = {
          name,
          frames: stats(raw.frames),
          cpu: Object.fromEntries(
            Object.entries(raw.calls).map(([key, values]) => [
              key,
              stats(values),
            ]),
          ),
          gpu: stats(raw.gpu),
          slowGL: raw.slowGL,
          renderer: raw.renderer,
        };
        stages.push(stage);
        console.log(
          JSON.stringify({
            variant,
            stage: name,
            frames: stage.frames,
            raster: stage.cpu.rasterCPU,
            gpu: stage.gpu,
            slowGL: stage.slowGL,
          }),
        );
      };
      for (let repeat = 0; repeat < 3; repeat++) {
        await page.evaluate(() => window.__prepareBenchmark(0));
        const name = repeat ? "warm-drop-" + repeat : "first-drop";
        await start(name);
        await page.evaluate(() => {
          const q = window.__BLACK_SILENCE_QA;
          q.li.ShiftLeft = q.li.KeyW = true;
          q.C.vz = -10;
          q.kick();
        });
        await page.waitForFunction(
          () => !window.__BLACK_SILENCE_QA.melee(),
          null,
          { timeout: 15000 },
        );
        await finish(name);
      }
      for (let repeat = 0; repeat < 2; repeat++) {
        await page.evaluate(() => {
          window.__prepareBenchmark(0);
          const e = window.__benchmarkEnemy;
          e.hp = 10;
          e.stagger = 4;
        });
        const name = repeat ? "warm-finisher" : "first-finisher";
        await start(name);
        await page.evaluate(() => {
          if (!window.__BLACK_SILENCE_QA.finish())
            throw new Error("Cannot start finisher");
        });
        await page.waitForFunction(
          () => !window.__BLACK_SILENCE_QA.oo.busy,
          null,
          { timeout: 15000 },
        );
        await finish(name);
      }
      for (const weapon of [0, 1]) {
        await page.evaluate(
          (weapon) => window.__prepareBenchmark(weapon),
          weapon,
        );
        let name = "fire-" + weapon;
        await start(name);
        await page.evaluate(() => (window.__BLACK_SILENCE_QA.Ct.firing = true));
        await page.waitForTimeout(1500);
        await page.evaluate(
          () => (window.__BLACK_SILENCE_QA.Ct.firing = false),
        );
        await finish(name);
        await page.evaluate(() => {
          const q = window.__BLACK_SILENCE_QA;
          q.T.mag[q.T.cur] = 0;
          q.St.wstate = "idle";
          q.St.wtime = 0;
        });
        name = "reload-" + weapon;
        await start(name);
        await page.keyboard.press("r");
        await page.waitForFunction(
          () => window.__BLACK_SILENCE_QA.St.wstate === "reload",
        );
        await page.waitForFunction(
          () => window.__BLACK_SILENCE_QA.St.wstate === "idle",
          null,
          { timeout: 15000 },
        );
        await finish(name);
      }
      await page.evaluate(() => {
        const q = window.__BLACK_SILENCE_QA;
        q.load(3);
        q.T.dead = q.T.won = false;
        q.C.spawnGuard = 100;
        q.pause(false);
        q.Be.inputLock = false;
        q.v.cine = null;
      });
      await page.waitForTimeout(1000);
      await start("crowded-map-3");
      await page.waitForTimeout(5000);
      await finish("crowded-map-3");
      if (errors.length) throw new Error(errors.join("\n"));
      const context = await page.evaluate(() => ({
        adapter: window.__runtimePerf.adapter,
        gpuTimerSupported: window.__runtimePerf.gpuTimerSupported,
        enemies: window.__BLACK_SILENCE_QA.v.enemies.length,
        loads: window.__runtimePerf.loads,
        warmup: window.__runtimePerf.warmup,
      }));
      runs.push({
        variant,
        ...targets[variant],
        ...context,
        inputReadyMs,
        navigationMs,
        stages,
        errors,
      });
      fs.writeFileSync(
        path.join(artifacts, "performance-benchmark-report.json"),
        JSON.stringify(
          { viewport: "1280x720", order: [0, 1, 1, 0], runs },
          null,
          2,
        ),
      );
    } finally {
      await browser.close();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
