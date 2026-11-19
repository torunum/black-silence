// node tools/gravedigger-summon-audio-tests.cjs [candidate.html] [baseline.html] [output-directory]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const output = path.resolve(process.argv[4] || ".dream-loop/gravedigger-summon-audio");

function installEncounterProbe() {
  const q = window.__BLACK_SILENCE_QA;
  const projectors = [];
  const setters = [];
  const emitters = [];
  let cue = "", boss, living, births, listener;
  const emitted = Nt;
  Nt = function(x, y, z, emit) {
    const sample = {coordinates: [x,y,z].map(String)};
    const index = emitters.push(sample) - 1;
    const previous = listener;
    listener = index;
    try { return emitted(x, y, z, emit); }
    finally { listener = previous; }
  };
  const playCue = nt;
  nt = function(name, emit) {
    const previous = cue;
    cue = name;
    if (listener !== undefined) emitters[listener].cue = name;
    try { return playCue(name, emit); }
    finally { cue = previous; }
  };

  // Observe the actual Chrome panner/value setter. The analyser is attached
  // only to this cue, upstream of its native room and master routing.
  const axes = ["positionX", "positionY", "positionZ"];
  const paramNames = new WeakMap();
  const createPanner = BaseAudioContext.prototype.createPanner;
  BaseAudioContext.prototype.createPanner = function() {
    const node = createPanner.call(this);
    if (cue !== "spurtPulse") return node;
    for (const key of axes) paramNames.set(node[key], key);
    const meter = this.createAnalyser();
    meter.fftSize = 1024;
    node.connect(meter);
    projectors.push({node, meter, emitter: listener});
    return node;
  };
  const value = Object.getOwnPropertyDescriptor(AudioParam.prototype, "value");
  Object.defineProperty(AudioParam.prototype, "value", {
    ...value,
    set(next) {
      try { return value.set.call(this, next); }
      catch (error) {
        setters.push({cue, param: paramNames.get(this), value: String(next), message: error.message});
        throw error;
      }
    },
  });

  function position(actor) {
    return [actor.x, actor.z, actor.fy, actor.h, actor.w, actor.hp, actor.kx, actor.kz];
  }
  function pose(actor) {
    const state = q.enemyAnimation(actor);
    const sprite = actor.sp;
    const values = [...sprite.position.toArray(), sprite.material.rotation, state.moving, state.gait];
    return {
      physical: position(actor), values: values.map(String), finite: values.every(Number.isFinite),
      pose: state.pose, texture: [sprite.material.map.image.width, sprite.material.map.image.height],
    };
  }
  function arena(roll) {
    const originalRandom = Math.random;
    let seed = 137437 + Math.round(roll * 100);
    Math.random = () => {
      seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
      return seed / 2**32;
    };
    try { q.load(9); }
    finally { Math.random = originalRandom; }
    V5(true);
    Be.inputLock = false;
    v.cine = null;
    C.spawnGuard = 100;
    boss = v.enemies.find(actor => actor.key === "N");
    if (!boss) throw Error("Ash Bell did not load the Gravedigger");
    for (let step=0; step<72; step++) {
      const angle = step * Math.PI / 36;
      const x = boss.x + Math.sin(angle) * 5.3, z = boss.z + Math.cos(angle) * 5.3;
      const spawnX = x + Math.sin(roll * 6.28) * (3 + 3 * roll);
      const spawnZ = z + Math.cos(roll * 6.28) * (3 + 3 * roll);
      if (fu(x,z) || !lm(x,z,boss.x,boss.z) || fu(spawnX,spawnZ) || !lm(x,z,spawnX,spawnZ)) continue;
      Object.assign(C, {px:x, pz:z, pyy:ie(x,z)+Yo, grounded:true, vx:0, vy:0, vz:0});
      Ct.yaw = angle;
      Ct.pitch = 0;
      J.camera.position.set(C.px,C.pyy,C.pz);
      J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
      J.camera.updateMatrixWorld(true);
      p0t();
      return;
    }
    throw Error("No authored arena location for the selected summon roll");
  }

  window.gravediggerAudioProof = {
    summon(roll) {
      projectors.length = emitters.length = setters.length = 0;
      arena(roll);
      living = v.enemies.slice();
      const originalRandom = Math.random;
      try {
        Math.random = () => roll;
        Object.assign(boss, {phase:2, hp:boss.maxhp*.55, dormant:false, aware:true, sumT:0, tpT:999, atkT:999});
        // Native qtt calls rtt and appends two live enemies before its
        // presentation pass. The fixture sets the encounter clock only.
        qtt(1/60);
        births = v.enemies.filter(actor => !living.includes(actor));
        if (births.length !== 2 || births.some(actor => !actor.summoned)) throw Error("Native phase 2 did not summon two creatures");
        const first = births.map(pose);
        for (let i=0; i<24; i++) qtt(1/60);
        const advanced = births.map(pose);
        const actors = births.map(actor => actor.key);
        const beforeHit = living.map(position);
        // Use the normal hit/sever path with a deterministic arm shot. B9
        // receives a normal fixed tick and computes its own spatial source.
        const target = births[0];
        qr(target,22,{wIdx:0,arm:true,armSide:"L",dir:{x:.6,z:.8},hx:target.x,hy:target.fy+target.h*.55,hz:target.z});
        if (!target.sever?.lArm) throw Error("Native damage did not sever the intended arm");
        let exception = null;
        try { z9(1/60); }
        catch (error) { exception = {name:error.name,message:error.message,stack:error.stack}; }
        const camera = [...J.camera.position.toArray(),...J.camera.quaternion.toArray()];
        return {actors, first, advanced, beforeHit, afterHit:position(target), exception, camera};
      } finally { Math.random = originalRandom; }
    },
    finish() {
      const measured = projectors.map(({node,meter,emitter})=>{
        const pcm = new Float32Array(meter.fftSize);
        meter.getFloatTimeDomainData(pcm);
        const count = pcm.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0);
        return {source:emitters[emitter],param:axes.map(key=>node[key].value),peak:count};
      });
      // Validate the post-summon draw independently from the audio observer.
      p0t();
      J.renderer.render(J.scene,J.camera);
      const gl = J.renderer.getContext();
      const render = {frame:J.renderer.info.render.frame, calls:J.renderer.info.render.calls, error:gl.getError()};
      const active = It()?.state;
      // A real level transition retires both summoned actors and their wounds.
      q.load(8);
      if (v.enemies.some(actor=>births.includes(actor)) || Bg.some(wound=>wound.on)) throw Error("Retired actors or wounds survived the transition");
      return {measured, setters:setters.slice(), render, active, cleared:true};
    },
  };
}

async function run(browser, filename, name) {
  const source = fs.readFileSync(filename, "utf8");
  assert.equal(source.split(anchor).length, 2, "Expected a unique standalone startup anchor");
  const input = path.join(output, `${name}-probe.html`);
  if (fs.existsSync(input)) assert.notEqual(fs.realpathSync(input),fs.realpathSync(filename),"The probe must not replace its input HTML");
  fs.writeFileSync(input,source.replace(anchor,()=>`(${installEncounterProbe.toString()})();\n${anchor}`));
  const report = {sha256:createHash("sha256").update(source).digest("hex"),cases:[],pageErrors:[]};
  const context = await browser.newContext({offline:true,viewport:{width:960,height:600}});
  try {
    const page = await context.newPage();
    page.on("pageerror",error=>report.pageErrors.push(error.message));
    await page.addInitScript(()=>{ window.requestAnimationFrame = () => 1; });
    await page.goto(pathToFileURL(input).href+"?qa=1");
    await page.locator("#mNew").click();
    for (const [roll, kind] of [[.31,"z"],[.71,"f"]]) {
      const state = await page.evaluate(roll=>gravediggerAudioProof.summon(roll),roll);
      await page.waitForTimeout(145);
      const audio = await page.evaluate(()=>gravediggerAudioProof.finish());
      report.cases.push({kind,...state,...audio});
    }
    return report;
  } finally { await context.close(); }
}

function assertCandidate(candidate) {
  assert.deepEqual(candidate.pageErrors,[]);
  for (const row of candidate.cases) {
    assert.deepEqual(row.actors,[row.kind,row.kind]);
    assert(row.camera.every(Number.isFinite),"Camera pose must stay finite");
    assert(row.first.every(actor=>actor.finite),"First-frame actor poses must be finite");
    assert(row.advanced.every(actor=>actor.finite),"Advancing actors must remain finite");
    assert(row.advanced.some((actor,index)=>actor.physical[0]!==row.first[index].physical[0] ||
      actor.physical[1]!==row.first[index].physical[1]),"Summons must move after their first tick");
    assert.equal(row.exception,null,"Wound cue completes without throwing");
    assert.deepEqual(row.setters,[],"Browser rejected no AudioParam");
    assert.equal(row.measured.length,1,"Wound retains its positional panner");
    const {source,param,peak} = row.measured[0];
    assert.equal(source.cue,"spurtPulse");
    source.coordinates.map(Number).forEach((coordinate,index)=>{
      assert(Number.isFinite(coordinate) && Math.abs(param[index]-coordinate)<.0001,"Native panner must use the projected world point");
    });
    assert.equal(row.active,"running");
    assert(peak>.00001,"Native wound cue reached the real panner as audible PCM");
    assert(row.render.calls>0 && row.render.error===0,"Native WebGL scene still draws");
    assert(row.cleared);
  }
}

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({channel:"chrome",headless:true});
  const report = {browser:browser.version()};
  try {
    if (process.argv[3]) report.baseline = await run(browser,path.resolve(process.argv[3]),"baseline");
    report.candidate = await run(browser,path.resolve(process.argv[2] || "THE-BLACK-SILENCE.html"),"candidate");
    assertCandidate(report.candidate);
    if (report.baseline) {
      assert.deepEqual(report.baseline.pageErrors,[]);
      report.baseline.cases.forEach((before,index)=>{
        const after = report.candidate.cases[index];
        assert.deepEqual(before.actors,after.actors);
        assert.deepEqual(before.first.map(a=>a.physical),after.first.map(a=>a.physical));
        assert.deepEqual(before.advanced.map(a=>a.physical),after.advanced.map(a=>a.physical));
        assert.deepEqual(before.beforeHit,after.beforeHit,"Authored actors keep their physical state");
        assert.deepEqual(before.afterHit,after.afterHit,"Arm-shot outcome keeps its physical state");
        assert(before.first.every(actor=>!actor.finite) && before.advanced.every(actor=>!actor.finite));
        assert.equal(before.exception?.name,"TypeError");
        assert.deepEqual(before.setters.map(({cue,param,value})=>[cue,param,value]),[["spurtPulse","positionX","NaN"]]);
      });
    }
    report.passed=true;
    console.log(`PASS: ${report.candidate.cases.length} native summon and wound cases in ${report.browser}`);
  } finally {
    fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n");
    await browser.close();
  }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
