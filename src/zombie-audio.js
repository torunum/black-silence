// Zombie pain uses two existing low-voiced recordings. Other creatures and
// events retain the native bank, timing, randomization and spatial mix.
(() => {
  const paths = [
    "../../assets/sfx/moan.pain.0.mp3",
    "../../assets/sfx/moan.pain.2.mp3",
  ];
  const voices = new Set();
  const qa = new URLSearchParams(location.search).has("qa");
  const history = [];
  let context = null, clips = [], pending = null;
  const record = (entry) => {
    if (!qa) return;
    history.push(entry);
    if (history.length > 128) history.shift();
  };
  function release(voice) {
    voices.delete(voice);
    for (const node of voice.nodes) node.disconnect();
  }
  function stop(reason) {
    let count = 0;
    for (const voice of voices) {
      if (voice.stopping) continue;
      voice.stopping = true;
      count++;
      if (voice.context.state !== "running") {
        try { voice.source.stop(); } catch (_) {}
        release(voice);
      } else {
        const now = voice.context.currentTime;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0, now, 0.003);
        try { voice.source.stop(now + 0.015); } catch (_) { release(voice); }
      }
    }
    if (count) record({ type: "stop", reason, count });
  }
  function prepare() {
    const next = It();
    if (!next || next.state === "closed" || !next.decodeAudioData) return null;
    if (context === next) return next;
    stop("context");
    context = next;
    clips = [];
    // Preserve authored order; native asynchronous bank order is not stable.
    pending = Promise.all(paths.map((path) =>
      Promise.resolve().then(() => next.decodeAudioData(CQ(IQ[path])))
        .then((buf) => ({ buf, start: TQ(buf), path }))
    )).then((loaded) => {
      if (context === next && next.state !== "closed") clips = loaded;
      return loaded.length;
    }, () => 0); // Native lazy playback remains available after a decode failure.
    return next;
  }
  const initialize = qI;
  qI = function (...args) {
    const result = initialize.apply(this, args);
    prepare();
    return result;
  };
  const nativeVoice = d6;
  d6 = function (kind, event, extra = []) {
    if (kind !== "z" || event !== "pain")
      return nativeVoice.apply(this, arguments);
    const ctx = prepare();
    if (!ctx || clips.length !== 2 || ctx.state !== "running")
      return nativeVoice.apply(this, arguments);
    // Match native rate-then-selection RNG calls, gain and release duration.
    const rate = BQ(kind) * (0.96 + l0() * 0.08);
    const clip = clips[Math.floor(l0() * clips.length) % clips.length];
    const volume = 0.85 * Math.pow(10, Xu(kind).gain / 20);
    const now = ctx.currentTime, duration = clip.buf.duration - clip.start;
    const end = now + duration / rate;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    const high = ctx.createBiquadFilter(), low = ctx.createBiquadFilter();
    source.buffer = clip.buf;
    source.playbackRate.value = rate;
    high.type = "highpass";
    high.frequency.value = 45;
    high.Q.value = 0.707;
    low.type = "lowpass";
    low.frequency.value = 2200;
    low.Q.value = 0.707;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, Math.max(now, end - 0.04));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(high);
    high.connect(low);
    low.connect(gain);
    // ar() retains the current native event trim, room send and emitter panner.
    // Its shared mix nodes are not owned or disconnected by this module.
    gain.connect(ar());
    const voice = { source, gain, context: ctx, nodes: [source, high, low, gain] };
    voices.add(voice);
    source.onended = () => release(voice);
    for (const layer of extra) jm(gain, now + (layer.at ?? 0), layer);
    source.start(now, clip.start);
    source.stop(end + 0.01);
    record({ type: "play", path: clip.path, rate, gain: volume, duration });
    return true;
  };
  const pause = V5;
  V5 = function (value) {
    if (value) stop("pause");
    return pause.apply(this, arguments);
  };
  const damage = ta;
  ta = function (...args) {
    const result = damage.apply(this, args);
    if (T.dead) stop("death");
    return result;
  };
  const load = rp;
  rp = function (...args) { stop("map"); return load.apply(this, args); };
  const reset = pz;
  pz = function (...args) { stop("reset"); return reset.apply(this, args); };
  const volume = p5;
  p5 = function (value) {
    if (value <= 0) stop("mute");
    return volume.apply(this, arguments);
  };
  addEventListener("blur", () => stop("blur"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop("hidden");
  });
  if (qa) window.__BLACK_SILENCE_QA.zombieAudio = {
    history, paths, prepare, stop,
    ready: () => clips.length === 2,
    pending: () => pending,
    active: () => voices.size,
    buffers: () => clips.map(({ buf, start, path }) => ({ buf, start, path })),
  };
})();
