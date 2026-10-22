// Capture real rendered weapons and combat from the shipped game.
// QA staging supplies a nearby enemy; all attacks use the actual game rules.
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const game = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const docs = path.resolve(process.argv[3] || path.join(root, "docs"));
const out = path.resolve(process.argv[4] || path.join(root, ".dream-loop", "video"));
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(docs, { recursive: true });
let browser;
(async () => {
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: out, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Capture the game's actual post-volume WebAudio output. This hook exists
  // only in the QA browser; it is never embedded in the delivered HTML.
  await page.addInitScript(() => {
    const nativeConnect = AudioNode.prototype.connect;
    const taps = new Map();
    AudioNode.prototype.connect = function(destination, ...args) {
      const result = nativeConnect.call(this, destination, ...args);
      if (destination === this.context.destination) {
        let tap = taps.get(this.context);
        if (!tap) {
          tap = this.context.createMediaStreamDestination();
          taps.set(this.context, tap);
        }
        nativeConnect.call(this, tap);
      }
      return result;
    };
    let recorder, chunks, startedAt;
    window.__startPreviewAudio = () => {
      const entry = [...taps].find(([context]) => context.state === "running");
      if (!entry) throw new Error("No running game audio output to record");
      chunks = [];
      recorder = new MediaRecorder(entry[1].stream, {mimeType:"audio/webm;codecs=opus",audioBitsPerSecond:128000});
      recorder.ondataavailable = event => { if(event.data.size) chunks.push(event.data); };
      recorder.start(250);
      startedAt = performance.now();
      return {startedAt, sampleRate:entry[0].sampleRate, contexts:taps.size};
    };
    window.__stopPreviewAudio = () => new Promise((resolve, reject) => {
      recorder.onerror = reject;
      recorder.onstop = () => {
        const blob = new Blob(chunks, {type:"audio/webm;codecs=opus"});
        const reader = new FileReader();
        reader.onload = () => resolve({base64:reader.result.split(",")[1],bytes:blob.size,duration:(performance.now()-startedAt)/1000});
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    });
  });
  const started = Date.now();
  await page.goto(
    pathToFileURL(game).href + "?qa=1",
  );
  await page.locator("#mNew").click();
  await page.waitForFunction(
    () => {
      const q = window.__BLACK_SILENCE_QA;
      return q.raster.canvas && !q.raster.skipped && !q.Be.inputLock;
    },
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(300);
  const waitForDialogue = () => page.waitForFunction(
    () => !document.getElementById("subt").textContent.trim(),
    null,
    { timeout: 15000 },
  );
  await waitForDialogue();
  // A preroll-only sync frame anchors video timestamps to the audio start.
  // The encoder trims this marker away; no overlay appears in the final clip.
  await page.evaluate(() => {
    const marker=document.createElement("div"); marker.id="preview-sync-marker";
    marker.style.cssText="position:fixed;inset:0;background:rgb(255,0,255);z-index:2147483647";
    document.body.appendChild(marker);
  });
  await page.waitForTimeout(280);
  const trimStart = (Date.now() - started) / 1000;
  const audioStart = await page.evaluate(() => {
    document.getElementById("preview-sync-marker").remove();
    return window.__startPreviewAudio();
  });
  await page.screenshot({ path: path.join(docs, "prologue.png") });
  await page.waitForTimeout(1300);
  // A shot followed by the full mechanical reload.
  await page.evaluate(() => {
    window.__BLACK_SILENCE_QA.Ct.firing = true;
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    window.__BLACK_SILENCE_QA.Ct.firing = false;
  });
  await page.waitForFunction(
    () => window.__BLACK_SILENCE_QA.St.wstate === "idle",
  );
  await page.keyboard.press("r");
  await page.waitForFunction(
    () => window.__BLACK_SILENCE_QA.St.wstate === "reload",
  );
  await page.waitForFunction(() => {
    const q=window.__BLACK_SILENCE_QA;
    return q.St.wtime/q.weapons[q.T.cur].reload>=0.53;
  });
  await page.screenshot({path:path.join(docs,"pistol-reload.png")});
  await page.waitForFunction(
    () => window.__BLACK_SILENCE_QA.St.wstate === "idle",
  );
  await page.evaluate(() => {
    const q = window.__BLACK_SILENCE_QA;
    q.T.weapons[1] = true;
    q.T.mag[1] = 5;
    q.T.ammo.shells = 12;
  });
  await page.keyboard.press("2");
  await page.waitForTimeout(800);
  await waitForDialogue();
  await page.screenshot({ path: path.join(docs, "shotgun.png") });
  await page.evaluate(() => {
    window.__BLACK_SILENCE_QA.Ct.firing = true;
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    window.__BLACK_SILENCE_QA.Ct.firing = false;
  });
  await page.waitForFunction(
    () => window.__BLACK_SILENCE_QA.St.wstate === "idle",
  );
  await page.keyboard.press("r");
  await page.waitForFunction(
    () => window.__BLACK_SILENCE_QA.St.wstate === "reload",
  );
  await page.waitForFunction(() => {
    const q=window.__BLACK_SILENCE_QA;
    return q.St.wtime/q.weapons[q.T.cur].reload>=0.53;
  });
  await page.screenshot({path:path.join(docs,"shotgun-reload.png")});
  await page.waitForFunction(
    () => window.__BLACK_SILENCE_QA.St.wstate === "idle",
  );
  await page.keyboard.press("1");
  await page.waitForTimeout(700);
  await waitForDialogue();
  // A real leap into a normal enemy, followed through landing and recovery.
  await page.evaluate(() => {
    const q = window.__BLACK_SILENCE_QA;
    Object.assign(q.C, {
      px: 19,
      pz: 9,
      pyy: 5.2,
      vx: 0,
      vz: 0,
      vy: 0,
      grounded: true,
    });
    q.Ct.yaw = Math.PI;
    q.Ct.pitch = 0;
    q.setCamera();
    const enemy = q.spawn("z", 19, 14.5, true);
    enemy.stun = 10;
    window.__captureDropkickTarget = enemy;
  });
  await page.waitForTimeout(450);
  await waitForDialogue();
  await page.evaluate(() => {
    const q = window.__BLACK_SILENCE_QA;
    q.C.vz = 10;
    window.__captureDropkickTarget.stun = 3;
    q.li.ShiftLeft = q.li.KeyW = true;
    q.kick();
  });
  await page.waitForTimeout(330);
  await page.screenshot({ path: path.join(docs, "dropkick.png") });
  await page.evaluate(() => {
    const q = window.__BLACK_SILENCE_QA;
    q.li.KeyW = q.li.ShiftLeft = false;
  });
  await page.waitForTimeout(1600);
  // Demonstrate the same E interaction used in normal play.
  await page.evaluate(() => {
    const q = window.__BLACK_SILENCE_QA;
    q.resetCombat();
    Object.assign(q.C, {
      px: 19,
      pz: 9,
      pyy: 5.2,
      vx: 0,
      vz: 0,
      vy: 0,
      grounded: true,
    });
    q.Ct.yaw = Math.PI;
    q.Ct.pitch = 0;
    q.setCamera();
    const enemy = q.spawn("z", 19, 11.2, true);
    enemy.hp = 20;
    enemy.stun = 10;
    window.__captureFinisherTarget = enemy;
  });
  await page.waitForTimeout(650);
  await waitForDialogue();
  await page.evaluate(() => {
    window.__captureFinisherTarget.stagger = 4.6;
    window.__captureFinisherTarget.stun = 3;
  });
  await page.keyboard.press("e");
  await page.waitForFunction(() => window.__BLACK_SILENCE_QA.oo.exec?.t > 0.4);
  await page.screenshot({ path: path.join(docs, "finisher.png") });
  await page.waitForFunction(() => !window.__BLACK_SILENCE_QA.oo.busy);
  await page.waitForTimeout(1000);
  const audio = await page.evaluate(() => window.__stopPreviewAudio());
  const audioFile = path.join(out, "game-output.webm");
  fs.writeFileSync(audioFile, Buffer.from(audio.base64, "base64"));
  if (audio.bytes < 10000) throw new Error("Recorded audio output unexpectedly empty");
  const video = page.video();
  await context.close();
  await browser.close();
  const file = await video.path();
  if (errors.length) throw new Error(errors.join("; "));
  fs.writeFileSync(
    path.join(out, "capture.json"),
    JSON.stringify({ file, trimStart, syncMarker:true, errors, audio:{file:audioFile,bytes:audio.bytes,duration:audio.duration,...audioStart}, scope:"Actual post-volume WebAudio mixed output, recorded alongside real game animation. QA stages nearby targets." }, null, 2),
  );
  console.log(JSON.stringify({ file, trimStart, errors, audioFile, audioBytes:audio.bytes, audioDuration:audio.duration }));
})().catch(async (error) => {
  console.error(error);
  await browser?.close();
  process.exitCode = 1;
});
