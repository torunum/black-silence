// Native chart pixels must match when the canvas backdrop is cached or drawn
// directly. The test-only switch is installed in a private copy of the HTML.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const source = fs.readFileSync(process.argv[2] || "THE-BLACK-SILENCE.html", "utf8");
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const body = "    // Avoid reserving another very large pixel surface for extreme viewports.";
assert.equal(source.split(anchor).length, 2);
assert.equal(source.split(body).length, 2);

function chartTest() {
  let terrainPaints = 0;
  const paints = Yk;
  Yk = function(...args) {
    terrainPaints++;
    return paints.apply(this,args);
  };
  function place(x,z,yaw) {
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
    Ct.yaw=yaw;
    Ct.pitch=0;
    J.camera.position.set(x,C.pyy,z);
    J.camera.rotation.set(0,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);
  }
  function survey() {
    for (let z=1;z<v.GH;z+=4) for (let x=1;x<v.GW;x+=4) {
      if (v.grid[z][x]===".") T0t((x+.55)*P,(z+.62)*P);
    }
    We.castT=10;
  }
  window.chartProbe={
    load(level) {
      rp(level);sk();if(v.cine)stt(v.cine.dur+.1);
      V5(false);Be.inputLock=false;C.spawnGuard=200;
      for(const enemy of v.enemies)enemy.stun=200;
      survey();
    },
    compare() {
      const surfaces=I0t(),canvas=surfaces.auto;
      for(let pass=0;pass<3;pass++)M0t(surfaces,We,22);
      terrainPaints=0;
      M0t(surfaces,We,22);
      const active=canvas.toDataURL(), draws=terrainPaints;
      this.bypass=true;
      try {
        M0t(surfaces,We,22);
        return {draws,pixels:canvas.width*canvas.height,matches:active===canvas.toDataURL()};
      } finally {this.bypass=false;}
    },
    discover() {
      // Restores can write bits directly without using the closed-over ray cast.
      const index=We.seen.findIndex((seen,i)=>seen&&v.grid[Math.floor(i/We.W)]?.[i%We.W]===".");
      if(index<0)throw Error("Expected a charted tile");
      We.seen[index]=0;
    },
    door() {
      for (const [key,door] of Object.entries(v.doors)) {
        if(door.secret||door.locked||door.open)continue;
        const [i,j]=key.split(",").map(Number),x=(i+.5)*P,z=(j+.5)*P;
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if(fu(x+dx*1.8,z+dz*1.8))continue;
          place(x+dx*1.8,z+dz*1.8,Math.atan2(-dx,-dz)+Math.PI);
          T0t(C.px,C.pz);
          return key;
        }
      }
      throw Error("Expected an interactable native door");
    },
    opened:key=>v.doors[key].open,
    lift(which) {
      const lift=de.def.lift,[x,z]=lift.cells[0];
      place((x+.5)*P,(z+.5)*P,0);
      T0t(C.px,C.pz);
      pR(lift[which]);
      C.pyy=ie(C.px,C.pz)+Yo;
    },
  };
}

async function run() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-chart-"));
  const file=path.join(dir,"chart.html");
  fs.writeFileSync(file,source.replace(body,()=>"    if (window.chartProbe?.bypass) return false;\n"+body)
    .replace(anchor,()=>"("+chartTest.toString()+")();\n"+anchor));
  const browser=await chromium.launch({channel:"chrome"});
  const checks=[], errors=[];
  try {
    for (const [width,height,pixel] of [[1280,720,1],[360,640,2],[2560,1440,1]]) {
      const context=await browser.newContext({offline:true,viewport:{width,height},deviceScaleFactor:pixel});
      try {
        const page=await context.newPage();
        page.on("pageerror",e=>errors.push(e.message));
        const call=(name,...args)=>page.evaluate(([name,args])=>chartProbe[name](...args),[name,args]);
        await page.goto(pathToFileURL(file).href+"?qa=1");
        await page.locator("#mNew").click();
        await page.waitForFunction(()=>__BLACK_SILENCE_QA.Be.started&&!__BLACK_SILENCE_QA.Be.inputLock,null,{timeout:60000});
        await call("load",9);
        await page.keyboard.press("KeyM");
        await page.locator("#automap").waitFor({state:"visible"});
        const compare=async label=>{
          const frame=await call("compare");
          assert(frame.matches,`${label}, ${width}×${height} DPR ${pixel}`);
          assert.equal(frame.draws,frame.pixels>2500000?1:0,`${label} uses the intended render path`);
          checks.push({viewport:[width,height,pixel],label,...frame});
        };
        await compare("explored 1× overview");
        await page.keyboard.press("Equal");
        await compare("2× from keyboard");
        await page.mouse.wheel(0,-120);
        await compare("4× from wheel");
        await call("discover");
        await compare("changed exploration bits");
        await page.keyboard.press("Minus");await page.keyboard.press("Minus");
        const key=await call("door");
        await compare("closed door");
        await page.keyboard.press("KeyE");
        await page.waitForFunction(key=>chartProbe.opened(key),key);
        await compare("door opened by KeyE");
        await call("lift","high");
        await compare("raised lift");
        await call("lift","low");
        await compare("lowered lift");
        await call("load",2);
        await compare("second chapter");
      } finally {await context.close();}
    }
    assert.deepEqual(errors,[]);
    const report={htmlSHA256:crypto.createHash("sha256").update(source).digest("hex"),checks,errors};
    if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
    console.log(`PASS ${checks.length} native pixel-identical chart frames, three viewport/DPR combinations`);
  } finally {
    await browser.close();
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
