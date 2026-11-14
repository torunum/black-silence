// Actual M, Tab, wheel and native checkpoint behaviour in an offline game page.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const input = path.resolve(process.argv[2] || "THE-BLACK-SILENCE.html");
const out = path.resolve(process.argv[3] || ".dream-loop/shrine-map");
const raw = fs.readFileSync(input, "utf8");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "black-silence-shrine-map-"));
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
assert.equal(raw.split(anchor).length, 2);
const file = path.join(work, "play.html");
function fixture() {
  let sample = null;
  const proto = CanvasRenderingContext2D.prototype;
  const curve = proto.bezierCurveTo, fillText = proto.fillText;
  proto.bezierCurveTo = function (...args) {
    // The first curve in the lamp catches its actual center and canvas transform.
    if (sample && this.fillStyle === "#83d1c5" && args[0] === .05) {
      const m = this.getTransform();
      sample.lamps.push({x:m.e, y:m.f, rotation:Math.atan2(m.b,m.a)});
    }
    return curve.apply(this, args);
  };
  proto.fillText = function (label, x, y, max) {
    if (sample && this.canvas.id === "automap") {
      const m = this.getTransform(), width = Math.min(this.measureText(label).width, max ?? Infinity);
      sample.labels.push({label, x:m.e + x - (this.textAlign === "right" ? width : 0), y, width});
    }
    return fillText.apply(this, arguments);
  };
  function calm() {
    sk(); V5(false); Be.inputLock = false; C.spawnGuard = 999;
    for (const e of v.enemies) e.stun = 999;
  }
  function pose(x, z) {
    C.px=x; C.pz=z; C.pyy=Yo+ie(x,z); C.vx=C.vy=C.vz=0; C.grounded=true;
    Ct.yaw=0; Ct.pitch=0; T0t(x,z);
  }
  window.mapFixture = {
    calm, level:id => {rp(id); calm();},
    mark(i) {
      const m=Q0.marks[i]; if (!m) throw Error("No native checkpoint at " + i);
      pose(m.x,m.z); QX(1/60);
    },
    peek(i) { const m=Q0.marks[i]; return [m.x,m.z]; },
    pose(x,z,yaw=0) {pose(x,z); Ct.yaw=yaw;},
    survey(i) {
      const target=Q0.marks[i], start=[Math.floor(C.px/P), Math.floor(C.pz/P)];
      const end=[Math.floor(target.x/P),Math.floor(target.z/P)], width=v.GW;
      const queue=[start[1]*width+start[0]], prev=new Map([[queue[0],-1]]);
      const goal=end[1]*width+end[0];
      for(let n=0;n<queue.length&&!prev.has(goal);n++) {
        const at=queue[n], x=at%width, z=Math.floor(at/width);
        for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]]) {
          const nx=x+dx,nz=z+dz,k=nz*width+nx;
          if(nx<0 || nx>=width || nz<0 || nz>=v.GH || prev.has(k) || [1,2,3].includes(Da(nx,nz)))continue;
          prev.set(k,at);queue.push(k);
        }
      }
      if(!prev.has(goal)) throw Error("No surveyed route to this shrine");
      for(let k=goal; k!==-1; k=prev.get(k)) T0t((k%width+.5)*P,(Math.floor(k/width)+.5)*P);
    },
    inventory() {T.weapons[1]=true; St.wCool=0; St.wstate="idle";},
    state() {return {x:C.px,z:C.pz,weapon:T.cur, pending:St.pending, zoom:St.zoomLerp, open:We.open, held:We.tabHeld,
      marks:Q0.marks.map(m=>[m.x,m.z,m.lit]), active:Q0.snap?.mark ?? null, level:T.level};},
    draw(which) {
      const cv=I0t(), a=which==="mini"?cv.mini:cv.auto;
      sample={lamps:[],labels:[]};
      // The game controls projection and clipping; call its unmodified render entry.
      if(which==="mini") g0t(cv,We,22); else M0t(cv,We,22);
      const result={...sample,width:a.width,height:a.height};sample=null;
      return result;
    },
    fog(i, seen) {const m=Q0.marks[i]; We.seen[Math.floor(m.z/P)*We.W+Math.floor(m.x/P)]=seen;},
    death() {C.spawnGuard=0; ta(9999,true);},
    started:()=>Be.started,
    clearOverlay() {le("",0); Jt("lvltitle").style.visibility="hidden";Jt("subt").style.visibility="hidden";},
    next() {oe.phase="card";oe.card=3;uk();Fd();calm();},
  };
}
fs.writeFileSync(file, raw.replace(anchor, () => "(" + fixture.toString() + ")();\n" + anchor));
fs.mkdirSync(out,{recursive:true});
async function test() {
  const b = await chromium.launch({channel:"chrome"});
  try {
    const p = await b.newPage({viewport:{width:1280,height:720},offline:true}), errors=[], checks=[];
    const cdp=await p.context().newCDPSession(p);
    p.on("pageerror",e=>errors.push(e.message));
    const run = (name,...args) => p.evaluate(([name,args]) => mapFixture[name](...args),[name,args]);
    const at = (n,msg) => {checks.push(msg);assert(n,msg);};
    const lamps = frame => frame.lamps.slice(0, -1); // full-map legend also paints one lamp
    const zoom = frame => frame.labels.find(e=>e.label.includes("ZOOM"))?.label[0];
    const visible = () => p.locator("#automap").waitFor({state:"visible"});
    const start = async id => {
      await p.locator(id).click();await p.waitForFunction(()=>mapFixture.started());
      await run("calm");
    };
    await p.goto(pathToFileURL(file).href);
    await start("#mNew"); await run("inventory");
    const spawn=await run("state");
    await p.keyboard.down("KeyW");
    try {await p.waitForFunction(({x,z})=>Math.hypot(mapFixture.state().x-x,mapFixture.state().z-z)>1,spawn);}
    finally {await p.keyboard.up("KeyW");}
    await p.keyboard.down("Tab"); await visible();
    at(lamps(await run("draw","full")).length===0 && (await run("draw","mini")).lamps.length===0,
      "Unknown checkpoints expose no symbol on either map");
    await run("survey",0);await run("mark",0);
    const [x,z] = await run("peek",0);
    // Move a few cells so the player arrow no longer covers the physical lamp.
    await run("pose",x+4,z+2); await run("clearOverlay");
    const f=await run("draw","full");
    at((await run("draw","mini")).lamps.length===0 && await p.locator("#minimap").isHidden(),
      "The full map hides the compass and skips its terrain and symbol pass");
    await p.keyboard.up("Tab"); await p.locator("#automap").waitFor({state:"hidden"});
    const m=await run("draw","mini");
    at(lamps(f).length===1 && m.lamps.length===1,"A native lit checkpoint appears once per map");
    const r=m.width/2, rim=Math.max(3,m.width*.045), scale=(r-rim)/12;
    assert(Math.abs(m.lamps[0].x-(r-2*scale))<1 && Math.abs(m.lamps[0].y-(r-scale))<1);
    await run("pose",x+4,z+2,Math.PI/2);
    const turn=await run("draw","mini");
    at(Math.abs(turn.lamps[0].x-(r+scale))<1 && Math.abs(turn.lamps[0].y-(r-2*scale))<1 &&
      Math.abs(turn.lamps[0].rotation)<.01,"Compass rotates the checkpoint position while the wick stays upright");
    await run("pose",x+4,z+2,Math.PI);
    const walkStart=await run("state");
    await p.keyboard.down("KeyW");
    try {await p.waitForFunction(({x,z})=>Math.hypot(mapFixture.state().x-x,mapFixture.state().z-z)>1,walkStart);}
    finally {await p.keyboard.up("KeyW");}
    await run("clearOverlay");
    await p.locator("#minimap").screenshot({path:path.join(out,"compass.png")});
    await p.keyboard.down("Tab");await visible();
    await p.locator("#automap").screenshot({path:path.join(out,"map-overview.png")});
    await run("fog",0,0);
    const hidden=await run("draw","full");
    at(lamps(hidden).length===0,"An undiscovered shrine cell is excluded even if a current checkpoint is present");
    await run("fog",0,1);
    const before=await run("state");
    await p.mouse.wheel(0,-130); await p.waitForTimeout(120);
    assert.equal(zoom(await run("draw","full")),"2");
    await p.keyboard.press("Equal"); const closer=await run("draw","full");
    assert.equal(zoom(closer),"4");
    const after=await run("state");
    at(before.weapon===after.weapon && before.pending===after.pending && before.zoom===after.zoom,
      "Wheel and keyboard change chart scale without changing weapon or optic");
    await p.keyboard.press("Minus"); assert.equal(zoom(await run("draw","full")),"2");
    await p.locator("#automap").screenshot({path:path.join(out,"map-local.png")});
    await p.keyboard.up("Tab"); await p.locator("#automap").waitFor({state:"hidden"});
    await p.mouse.wheel(0,230); await p.waitForFunction(()=>mapFixture.state().weapon===1);
    at(true,"Wheel selection resumes after releasing Tab");
    await p.keyboard.press("KeyM"); await visible();
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:360,height:640,deviceScaleFactor:2,mobile:false});
    const narrow=await run("draw","full");
    const labels=narrow.labels;
    for(const a of labels) assert(a.x>=-.01 && a.x+a.width<=narrow.width+1,JSON.stringify(a));
    for(let i=0;i<labels.length;i++)for(const c of labels.slice(i+1)) {
      const a=labels[i]; if(Math.abs(a.y-c.y)>.01)continue;
      assert(a.x+a.width<=c.x+1 || c.x+c.width<=a.x+1,JSON.stringify([a,c]));
    }
    at(new Set(labels.filter(e=>["YOU","DOOR","SHRINE"].includes(e.label)).map(e=>e.y)).size>1,
      "Narrow legend wraps and every title, key and control label fits its row");
    await p.locator("#automap").screenshot({path:path.join(out,"map-compact.png")});
    await p.keyboard.press("KeyM"); await cdp.send("Emulation.clearDeviceMetricsOverride");
    await p.setViewportSize({width:1280,height:720});
    while ((await run("state")).level !== 5) await run("next");
    await run("mark",0); await run("mark",1); await p.keyboard.down("Tab"); await visible();
    at((await run("state")).active===1 && lamps(await run("draw","full")).length===1,
      "A second shrine replaces the first marker immediately");
    await p.keyboard.up("Tab");
    await run("death"); await p.waitForTimeout(1100); await p.keyboard.press("Space");
    await p.waitForFunction(()=>!document.querySelector("#dead") || document.querySelector("#dead").classList.contains("hidden"));
    at((await run("state")).active===1 && (await run("draw","mini")).lamps.length===1,
      "Native Rise Again restores the active shrine");
    await p.reload(); await start("#mContinue");
    at((await run("state")).active===1 && lamps(await run("draw","full")).length===1,
      "A fresh document restores the saved marker through Continue");
    await run("next"); await p.keyboard.press("KeyM"); await visible();
    at(lamps(await run("draw","full")).length===0 && zoom(await run("draw","full"))==="1",
      "Changing chapters resets the shrine and overview");
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify({htmlSha256:hash(raw),checks,
      miniPixels:{unturned:m.lamps[0],quarterTurn:turn.lamps[0]},compact:narrow.labels,errors},null,2)+"\n");
    console.log(checks);
  } finally {await b.close();}
}
test().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.unlinkSync(file); fs.rmdirSync(work);});
