// Close mechanical foley for the first two reloads. Audio follows animation
// phase crossings, not wall-clock timers, and keeps the native ammo/state rules.
(() => {
  const timing = window.__BLACK_SILENCE_RELOAD_TIMING;
  if (!timing)
    throw new Error("Reload animation timing must load before audio");
  const voices = new Set(),
    buffers = new Map(),
    ejected = new WeakSet();
  let suppressReloadCasing = false;
  let context = null,
    token = null,
    weapon = -1,
    serial = 0;
  const qa = new URLSearchParams(location.search).has("qa");
  const history = [];
  const originalEvents = [J_[0], J_[1]];
  const specs = {
    release: { clip: "latch", gain: 0.3, rate: 1.05 },
    open: { clip: "hinge", gain: 0.37, rate: 1.0 },
    eject: { clip: "eject", gain: 0.36, rate: 1.0 },
    insert: { clip: "slide", gain: 0.28, rate: 1.0 },
    seat: { clip: "seat", gain: 0.42, rate: 1.02 },
    close: { clip: "close", gain: 0.45, rate: 1.0 },
    latch: { clip: "latch", gain: 0.27, rate: 0.94 },
  };
  const owned = () => T.cur < 2 && St.wstate === "reload";
  const parameters = (index, event) => ({
    clip: specs[event].clip,
    rate: specs[event].rate * (index === 1 ? 0.91 : 1.04),
    gain: specs[event].gain * (index === 1 ? 1.08 : 0.92),
  });
  const blocked = () =>
    !Be.started ||
    T.dead ||
    T.won ||
    Be.inputLock ||
    Be.pianoOpen ||
    Wk() ||
    document.hidden;
  function stop(reason) {
    let stopped = 0;
    for (const voice of voices) {
      if (voice.context.state !== "running") {
        // A suspended context cannot advance a 15ms fade or fire onended.
        // It is already silent, so release immediately instead of resurrecting
        // an interrupted click when the browser resumes its audio clock.
        try {
          voice.source.stop();
        } catch (_) {}
        voice.source.disconnect();
        voice.gain.disconnect();
        voices.delete(voice);
        stopped++;
        continue;
      }
      // State checks run every frame. A second stop() replaces the source's
      // scheduled stop time, so do not keep postponing an existing release.
      if (voice.stopping) continue;
      voice.stopping = true;
      stopped++;
      // A short gain release prevents discontinuity clicks during cancellation.
      const now = voice.context.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, 0.003);
      try {
        voice.source.stop(now + 0.015);
      } catch (_) {}
    }
    if (qa && stopped)
      history.push({ type: "stop", reason, serial, count: stopped });
    token = null;
    weapon = -1;
  }
  function prepare() {
    const next = It();
    if (!next || next.state === "closed") return null;
    if (context === next) return next;
    stop("context");
    context = next;
    buffers.clear();
    for (const [name, sample] of Object.entries(BLACK_SILENCE_RELOAD_PCM)) {
      const bytes = atob(sample.pcm),
        buffer = next.createBuffer(1, bytes.length / 2, sample.rate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) {
        const value =
          bytes.charCodeAt(i * 2) | (bytes.charCodeAt(i * 2 + 1) << 8);
        channel[i] = (value >= 32768 ? value - 65536 : value) / 32768;
      }
      buffers.set(name, buffer);
    }
    return next;
  }
  function begin() {
    if (token === St.reloadFlags && weapon === T.cur) return;
    stop("new-reload");
    token = St.reloadFlags;
    weapon = T.cur;
    serial++;
  }
  function play(index, event) {
    if (!owned() || T.cur !== index || blocked()) return;
    if (event === "eject" && !ejected.has(St.reloadFlags)) {
      ejected.add(St.reloadFlags);
      // Native reloadFlags.a controls only its old .18-phase casing emission.
      // Keep the exact native case count/trajectory, triggered by the shared
      // .27 animation event; suppression covers only this synchronous spawn.
      suppressReloadCasing = true;
      try {
        for (let i = 0; i < (index === 0 ? 6 : 2); i++) xl(index === 0 ? 1 : 2);
      } finally {
        suppressReloadCasing = false;
      }
    }
    const ctx = prepare();
    if (!ctx || ctx.state !== "running" || VI() <= 0) return;
    begin();
    const spec = parameters(index, event),
      buffer = buffers.get(spec.clip);
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = spec.rate;
    gain.gain.value = spec.gain;
    source.connect(gain);
    // The native effects bus supplies global volume and the existing limiter.
    // Retain the recordings' short room/metal tails; no long hall convolution.
    // This also makes cancellation stop the whole effect, including its tail.
    gain.connect(ir.route({ gain: 1, send: 0 }));
    const voice = { source, gain, context: ctx };
    voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      voices.delete(voice);
    };
    source.start();
    if (qa) {
      history.push({
        type: "play",
        serial,
        weapon: index,
        event,
        phase: St.wtime / Th[index].reload,
        target: timing[event],
        audioTime: ctx.currentTime,
        performanceTime: performance.now(),
        gain: gain.gain.value,
        rate: source.playbackRate.value,
      });
      if (history.length > 512) history.splice(0, 256);
    }
  }
  for (let index = 0; index < 2; index++)
    J_[index] = Object.keys(specs)
      .map((event) => ({ at: timing[event], play: () => play(index, event) }))
      .sort((a, b) => a.at - b.at);

  // Each native ejected casing otherwise queues a delayed square-wave chirp;
  // the recorded eject event replaces those only during these two reloads.
  const casingSound = kj;
  kj = function (...args) {
    if (!suppressReloadCasing) return casingSound(...args);
  };

  const initAudio = qI;
  qI = function (...args) {
    const result = initAudio(...args);
    prepare();
    return result;
  };
  const update = v$;
  v$ = function (...args) {
    if (
      !owned() ||
      blocked() ||
      (token && (token !== St.reloadFlags || weapon !== T.cur))
    )
      stop("state-before");
    if (owned() && (St.wtime + args[0]) / Th[T.cur].reload > 0.18)
      St.reloadFlags.a = 1;
    const result = update(...args);
    if (!owned() || blocked()) stop("state-after");
    return result;
  };
  const pause = V5;
  V5 = function (value) {
    if (value) stop("pause");
    return pause(value);
  };
  // The native frame loop skips weapon updates after death. Stop at the real
  // damage transition rather than waiting for a v$ call that will never run.
  const damagePlayer = ta;
  ta = function (...args) {
    const result = damagePlayer(...args);
    if (T.dead) stop("death");
    return result;
  };
  const volume = p5;
  p5 = function (value) {
    if (value <= 0) stop("mute");
    return volume(value);
  };
  const load = rp;
  rp = function (...args) {
    stop("map");
    return load(...args);
  };
  const reset = pz;
  pz = function (...args) {
    stop("reset");
    return reset(...args);
  };
  const change = Ik;
  Ik = function (...args) {
    const result = change(...args);
    if (!owned()) stop("switch");
    return result;
  };
  const kick = B$;
  B$ = function (...args) {
    const result = kick(...args);
    if (!owned()) stop("kick");
    return result;
  };
  const finish = K_;
  K_ = function (...args) {
    const result = finish(...args);
    if (!owned()) stop("finisher");
    return result;
  };
  addEventListener("blur", () => stop("blur"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop("hidden");
  });
  const resume = () => {
    const ctx = It();
    if (Be.started && !document.hidden && ctx?.state === "suspended")
      ctx.resume().catch(() => {});
  };
  addEventListener("pointerdown", resume, true);
  addEventListener("keydown", resume, true);
  if (qa)
    window.__BLACK_SILENCE_QA.reloadAudio = {
      history,
      timing,
      specs,
      parameters,
      buffer: (name) => buffers.get(name),
      auditMix: (ctx, volume) => cI(ctx, volume, "hall"),
      active: () => voices.size,
      state: () => It()?.state ?? "absent",
      volume: (value) => p5(value),
      context: () => It(),
      casingCount: () => Hq.length,
      pendingNativeSounds: () => Lf.size,
      clearTestEffects() {
        _k();
        Hq.length = 0;
      },
      prepare,
      stop,
      damagePlayer: (...args) => ta(...args),
      start: () => Bm(),
      switch: (index) => Ik(index),
      originalEvents,
    };
})();
