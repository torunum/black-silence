// Recorded close mechanical foley follows the weapons' animation
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
  // All cues use the same recorded metal as the sidearms. Playback rate,
  // emphasis and the shape of the contact give each relic its own scale.
  const weaponCues = {
    2: {
      release: { at: BLACK_SILENCE_RIFLE_RELOAD.release, clip: "latch", rate: 1.08, gain: .32 },
      strip: { at: BLACK_SILENCE_RIFLE_RELOAD.strip, clip: "slide", rate: .94, gain: .33 },
      guide: { at: BLACK_SILENCE_RIFLE_RELOAD.guide, clip: "eject", rate: .97, gain: .24 },
      seat: { at: BLACK_SILENCE_RIFLE_RELOAD.seat, clip: "seat", rate: 1.02, gain: .46 },
      drawBolt: { at: BLACK_SILENCE_RIFLE_RELOAD.drawBolt, clip: "hinge", rate: 1.26, gain: .31 },
      catchBolt: { at: BLACK_SILENCE_RIFLE_RELOAD.catchBolt, clip: "close", rate: 1.10, gain: .39 },
    },
    3: {
      release: { at: Ac.out[0], clip: "latch", rate: .92, gain: .33 },
      lift: { at: Ac.out[1] - .045, clip: "slide", rate: .70, gain: .31 },
      align: { at: Ac.seat[0] + .095, clip: "eject", rate: .80, gain: .28 },
      seat: { at: Ac.seat[1], clip: "seat", rate: .82, gain: .50 },
      charge: { at: Ac.knob[0] + .028, clip: "hinge", rate: 1.08, gain: .32 },
      lock: { at: Ac.knob[1] - .012, clip: "close", rate: .94, gain: .40 },
    },
    5: {
      unseal: { at: uc.lid[0], clip: "latch", rate: .81, gain: .40 },
      hinge: { at: uc.lid[0] + .065, clip: "hinge", rate: .78, gain: .29 },
      lift: { at: .28, clip: "eject", rate: .83, gain: .35 },
      seat: { at: .645, clip: "seat", rate: .72, gain: .51 },
      shut: { at: .79, clip: "close", rate: .82, gain: .45 },
      catch: { at: uc.lid[1], clip: "latch", rate: 1.09, gain: .34 },
    },
    6: {
      unlatch: { at: BLACK_SILENCE_NAIL_RELOAD.unlatch, clip: "latch", rate: .75, gain: .38 },
      release: { at: BLACK_SILENCE_NAIL_RELOAD.release, clip: "hinge", rate: .81, gain: .31 },
      withdraw: { at: BLACK_SILENCE_NAIL_RELOAD.withdraw, clip: "slide", rate: .70, gain: .30 },
      guide: { at: BLACK_SILENCE_NAIL_RELOAD.guide, clip: "eject", rate: .73, gain: .29 },
      seat: { at: BLACK_SILENCE_NAIL_RELOAD.seat, clip: "seat", rate: .74, gain: .49 },
      lock: { at: BLACK_SILENCE_NAIL_RELOAD.lock, clip: "close", rate: .84, gain: .39 },
    },
    7: {
      unlock: { at: ya.claws[0], clip: "hinge", rate: .62, gain: .24 },
      pluck: { at: ya.pluck[0] + .035, clip: "glassLift", rate: 1.04, gain: .49 },
      turn: { at: ya.press[0], clip: "eject", rate: .74, gain: .25 },
      nest: { at: ya.press[1] - .028, clip: "glassSeat", rate: .91, gain: .56 },
      close: { at: ya.claws[1], clip: "close", rate: .63, gain: .35 },
    },
    9: {
      unpin: { at: .10, clip: "latch", rate: .86, gain: .24 },
      draw: { at: Br.lay[0] + .024, clip: "staveSlide", rate: .89, gain: .34 },
      bed: { at: .50, clip: "staveBed", rate: .94, gain: .44 },
      keeper: { at: .625, clip: "latch", rate: 1.08, gain: .30 },
      stroke: { at: .72, clip: "hinge", rate: .79, gain: .34 },
      catch: { at: .883, clip: "close", rate: .86, gain: .38 },
    },
  };
  const owned = () => (T.cur < 2 || !!weaponCues[T.cur]) && St.wstate === "reload";
  const parameters = (index, event) => weaponCues[index]?.[event] || ({
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
    // Strike two damped modes using the recorded contact's own first 12 ms.
    // Render once per context. The tail lives in the same buffer as the hit,
    // so pause, mute or a weapon switch releases the entire sound together.
    function glassContact(name, recording, modes) {
      const dry = buffers.get(recording), input = dry.getChannelData(0);
      const rate = dry.sampleRate, length = Math.max(input.length, Math.ceil(rate * .33));
      const out = next.createBuffer(1, length, rate), samples = out.getChannelData(0);
      samples.set(input);
      for (const [frequency, decay, mix] of modes) {
        const damp = Math.exp(-1 / (rate * decay)), step = 2 * Math.PI * frequency / rate;
        const a = 2 * damp * Math.cos(step), b = damp * damp;
        let prev = 0, prev2 = 0;
        for (let i = 0; i < length; i++) {
          const hit = i < rate * .012 ? input[i] * Math.sin(step) : 0;
          const y = a * prev - b * prev2 + hit;
          samples[i] += mix * y;
          prev2 = prev;
          prev = y;
        }
      }
      // Short cosine release lands the last sample at zero even after pitch shift.
      const tail = Math.ceil(.016 * rate);
      for (let i = 0; i < tail; i++)
        samples[length - tail + i] *= .5 + .5 * Math.cos(Math.PI * i / (tail - 1));
      buffers.set(name, out);
    }
    glassContact("glassLift", "eject", [[804, .080, .09], [1743, .052, .045]]);
    glassContact("glassSeat", "seat", [[474, .079, .065], [1266, .064, .055]]);
    // Soften the metal ring in two existing recordings for wood sliding into
    // the bed. The metal keepers and lever use the unfiltered recordings.
    function woodenContact(name, recording, cutoff, decay) {
      const source=buffers.get(recording),input=source.getChannelData(0);
      const rate=source.sampleRate,buffer=next.createBuffer(1,input.length,rate);
      const output=buffer.getChannelData(0),blend=1-Math.exp(-2*Math.PI*cutoff/rate);
      let low=0;
      for(let i=0;i<input.length;i++){
        low+=blend*(input[i]-low);
        output[i]=(.14*input[i]+.86*low)*Math.exp(-i/(rate*decay));
      }
      buffers.set(name,buffer);
    }
    woodenContact("staveSlide","slide",1760,.19);
    woodenContact("staveBed","seat",1280,.11);
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
        target: spec.at ?? timing[event],
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
  for (const [id, cues] of Object.entries(weaponCues)) {
    const index = Number(id);
    J_[index] = Object.entries(cues).map(([event, cue]) => ({
      at: cue.at, play: () => play(index, event),
    })).sort((a, b) => a.at - b.at);
  }

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
    if (owned() && T.cur < 2 && (St.wtime + args[0]) / Th[T.cur].reload > 0.18)
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
