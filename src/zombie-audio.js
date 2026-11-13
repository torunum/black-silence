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
  // g6 owns the native per-emitter cooldown. Keep its accepted emitter through
  // the synchronous d6 dispatch; don't interfere with its clock or RNG.
  let emitter = null, takes = new WeakMap();
  const nativeGate = g6;
  g6 = function (kind, event, delay, extra = [], owner = NQ) {
    if (kind !== "z" || event !== "pain") return nativeGate.apply(this, arguments);
    const previous = emitter;
    emitter = owner;
    try { return nativeGate.apply(this, arguments); }
    finally { emitter = previous; }
  };
  const record = (entry) => {
    if (!qa) return;
    history.push(entry);
    if (history.length > 128) history.shift();
  };
  function release(voice) {
    voices.delete(voice);
    if (voice.take?.voice === voice) voice.take.voice = null;
    for (const node of voice.nodes) node.disconnect();
  }
  function fade(voice) {
    voice.stopping = true;
    if (voice.context.state !== "running") {
      try { voice.source.stop(); } catch (_) {}
      release(voice);
      return;
    }
    const now = voice.context.currentTime;
    // Preserve the current level if a second hit arrives in the release tail.
    if (voice.gain.gain.cancelAndHoldAtTime) voice.gain.gain.cancelAndHoldAtTime(now);
    else voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, 0.003);
    try { voice.source.stop(now + 0.015); } catch (_) { release(voice); }
  }
  function stop(reason) {
    let count = 0;
    for (const voice of voices) {
      if (voice.stopping && voice.context.state === "running") continue;
      count++;
      fade(voice);
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
    takes = new WeakMap();
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
    // Consume exactly the native rate and selection draws. Two repeated takes
    // are plausible; a third from the same throat sounds like a looping sample.
    const rate = BQ(kind) * (0.96 + l0() * 0.08);
    let index = Math.floor(l0() * clips.length) % clips.length;
    let take = null;
    if (emitter) {
      take = takes.get(emitter);
      if (!take) { take = { index: -1, count: 0, voice: null }; takes.set(emitter, take); }
      if (take.index === index && take.count >= 2) index = 1 - index;
      take.count = take.index === index ? take.count + 1 : 1;
      take.index = index;
      if (take.voice && !take.voice.stopping) fade(take.voice);
    }
    const clip = clips[index];
    const volume = 0.85 * Math.pow(10, Xu(kind).gain / 20);
    const now = ctx.currentTime, duration = clip.buf.duration - clip.start;
    const tail = now + duration * 0.66 / rate;
    // The tail falls a little over two semitones. Account for its mean rate
    // so we still hear the recorded breath to its natural end.
    const end = tail + duration * 0.34 / (rate * 0.935);
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    const high = ctx.createBiquadFilter(), low = ctx.createBiquadFilter();
    source.buffer = clip.buf;
    source.playbackRate.setValueAtTime(rate, now);
    source.playbackRate.setValueAtTime(rate, tail);
    source.playbackRate.linearRampToValueAtTime(rate * 0.87, end);
    high.type = "highpass";
    high.frequency.value = 45;
    high.Q.value = 0.707;
    low.type = "lowpass";
    low.frequency.setValueAtTime(2200, now);
    low.frequency.setValueAtTime(2200, tail);
    low.frequency.exponentialRampToValueAtTime(1100, end);
    low.Q.value = 0.707;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, Math.min(now + 0.005, tail));
    gain.gain.setValueAtTime(volume, Math.max(now, end - 0.04));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(high);
    high.connect(low);
    low.connect(gain);
    // ar() retains the current native event trim, room send and emitter panner.
    // Its shared mix nodes are not owned or disconnected by this module.
    gain.connect(ar());
    const voice = { source, gain, take, context: ctx, nodes: [source, high, low, gain] };
    if (take) take.voice = voice;
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
