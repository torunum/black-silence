// Produce a listening artifact from the actual embedded samples/settings and
// native effects master/limiter. Offline rendering is not a subjective review.
const fs = require("node:fs"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
function wav(data, rate) {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++)
    b.writeInt16LE(
      Math.max(-32768, Math.min(32767, Math.round(data[i] * 32767))),
      44 + i * 2,
    );
  return b;
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      requestAnimationFrame = () => 1;
    });
    await page.goto(
      pathToFileURL(
        path.resolve(
          process.env.GAME_HTML || path.join(root, "THE-BLACK-SILENCE.html"),
        ),
      ).href + "?qa=1",
    );
    await page.locator("#mNew").click();
    const result = await page.evaluate(async () => {
      const q = window.__BLACK_SILENCE_QA,
        a = q.reloadAudio;
      const rate = 32000,
        ctx = new OfflineAudioContext(1, Math.ceil(5.1 * rate), rate),
        mix = a.auditMix(ctx, 0.5),
        timeline = [];
      for (const weapon of [0, 1]) {
        const start = weapon === 0 ? 0.15 : 2.7;
        for (const event of Object.keys(a.specs)) {
          const spec = a.parameters(weapon, event),
            source = ctx.createBufferSource(),
            gain = ctx.createGain(),
            buffer = a.buffer(spec.clip);
          source.buffer = buffer;
          source.playbackRate.value = spec.rate;
          gain.gain.value = spec.gain;
          source.connect(gain);
          gain.connect(mix.route({ gain: 1, send: 0 }));
          const at = start + a.timing[event] * q.weapons[weapon].reload;
          source.start(at);
          timeline.push({
            weapon,
            event,
            phase: a.timing[event],
            reloadSeconds: q.weapons[weapon].reload,
            clip: spec.clip,
            atSeconds: at,
            duration: buffer.duration / spec.rate,
            rate: spec.rate,
            gain: spec.gain,
          });
        }
      }
      const output = await ctx.startRendering();
      return { rate, samples: Array.from(output.getChannelData(0)), timeline };
    });
    const samples = result.samples;
    let peak = 0,
      sum = 0,
      dc = 0,
      clipped = 0;
    for (const x of samples) {
      peak = Math.max(peak, Math.abs(x));
      sum += x * x;
      dc += x;
      clipped += Math.abs(x) >= 1;
    }
    const metrics = {
      peak,
      rms: Math.sqrt(sum / samples.length),
      dc: dc / samples.length,
      clipped,
    };
    fs.mkdirSync(path.join(root, "docs/audio"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "docs/audio/reload-audit.wav"),
      wav(samples, result.rate),
    );
    fs.writeFileSync(
      path.join(root, "docs/audio/reload-timeline.json"),
      JSON.stringify(
        {
          label:
            "Flare pistol first (start 0.15s); shotgun second (start 2.70s). Native effects master volume 0.5; actual sample settings; no ambience or gunshots.",
          sampleRate: result.rate,
          seconds: samples.length / result.rate,
          metrics,
          events: result.timeline,
          listeningStatus:
            "Prepared for human listening; current agent environment does not support audio input.",
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        {
          path: "docs/audio/reload-audit.wav",
          metrics,
          events: result.timeline.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
