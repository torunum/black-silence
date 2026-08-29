/**
 * A behavioral AudioContext stub, the audio equivalent of
 * tests/support/recordingCanvas.ts: instead of no-op'ing every WebAudio
 * call like tests/support/domStubs.ts's AudioContext stub, this one logs
 * node creation, connect edges, parameter assignments and scheduled
 * automation (setValueAtTime/exponentialRampToValueAtTime/
 * linearRampToValueAtTime), plus start/stop — in order. Comparing two
 * ordered logs (reference vs. module) proves the same WebAudio graph was
 * built and driven, regardless of how the surrounding code is shaped — see
 * tests/behavior/audio.test.ts.
 *
 * Unlike recordingCanvas's Proxy-over-anything approach, the WebAudio
 * surface this codebase actually calls is small and closed (createGain,
 * createOscillator, createBiquadFilter, createDelay, createBufferSource,
 * createBuffer, createPanner, plus each node's own connect/start/stop/param
 * methods), so this is hand-written per node type rather than a generic
 * Proxy — clearer for a fixed, known method set, and it lets each
 * AudioParam-shaped property (gain, frequency, Q, delayTime, positionX/Y/Z)
 * share one small factory instead of guessing at property semantics from a
 * bare method name.
 *
 * Every created node/buffer is tagged with a stable, creation-ordered id
 * (e.g. "GainNode#3"). connect() and buffer-assignment log the *id* of
 * their target/value rather than the object itself, so two independent
 * recording sessions (reference vs. module) that build an identical graph
 * in an identical order produce byte-identical, deep-equal event logs even
 * though every underlying object is a distinct instance.
 *
 * currentTime and sampleRate are fixed constants rather than real wall-clock
 * values: the functions under test only ever use them to compute relative
 * offsets (t0, t0+dur, ...), so a fixed base makes those offsets — and the
 * buffer lengths derived from sampleRate*dur — reproducible without any
 * special-casing.
 */

export interface AudioEvent {
  kind: "create" | "connect" | "param" | "start" | "stop";
  detail: Record<string, unknown>;
}

const SAMPLE_RATE = 44100;

export function recordingAudioContext(): { ctx: unknown; events: AudioEvent[] } {
  const events: AudioEvent[] = [];
  const idOfNode = new WeakMap<object, string>();
  const counts: Record<string, number> = {};

  function nextId(kind: string): string {
    counts[kind] = (counts[kind] ?? 0) + 1;
    return `${kind}#${counts[kind]}`;
  }

  /** Resolves a connect()/buffer-assignment argument to its recorded id, falling back to the raw value for primitives (e.g. connect() is never called with one here, but keeps this honest for anything untracked). */
  function idFor(value: unknown): unknown {
    if (value && typeof value === "object") {
      const id = idOfNode.get(value as object);
      if (id !== undefined) return id;
    }
    return value;
  }

  function makeParam(nodeId: string, prop: string): Record<string, unknown> {
    let current = 0;
    const param = {
      get value() {
        return current;
      },
      set value(v: unknown) {
        current = v as number;
        events.push({ kind: "param", detail: { node: nodeId, prop, method: "value", value: v } });
      },
      setValueAtTime(value: unknown, time: unknown) {
        events.push({ kind: "param", detail: { node: nodeId, prop, method: "setValueAtTime", value, time } });
        return this;
      },
      exponentialRampToValueAtTime(value: unknown, time: unknown) {
        events.push({
          kind: "param",
          detail: { node: nodeId, prop, method: "exponentialRampToValueAtTime", value, time },
        });
        return this;
      },
      linearRampToValueAtTime(value: unknown, time: unknown) {
        events.push({ kind: "param", detail: { node: nodeId, prop, method: "linearRampToValueAtTime", value, time } });
        return this;
      },
    };
    // AudioParams (gain, frequency, Q, delayTime) are themselves legal
    // connect() targets in this codebase — audioInit connects an LFO
    // straight into another oscillator's gain param
    // (`lfo.connect(lg);lg.connect(og.gain);`) — so a param object needs an
    // id too, or idFor() below falls through to logging the live object
    // itself, and two independently-created param objects (reference vs.
    // module) are never `toEqual`-equal because their methods are distinct
    // function instances.
    idOfNode.set(param, `${nodeId}.${prop}`);
    return param;
  }

  function attachTypeProp(node: Record<string, unknown>, id: string, initial: string): void {
    let current = initial;
    Object.defineProperty(node, "type", {
      enumerable: true,
      get() {
        return current;
      },
      set(v: string) {
        current = v;
        events.push({ kind: "param", detail: { node: id, prop: "type", method: "value", value: v } });
      },
    });
  }

  /**
   * Generalizes attachTypeProp to an arbitrary plain (non-AudioParam)
   * property — added for PannerNode's panningModel/distanceModel/
   * refDistance/maxDistance/rolloffFactor, which (like type) are logged as
   * `{prop, method: "value"}` on assignment rather than modeled with
   * makeParam's setValueAtTime/exponentialRampToValueAtTime surface,
   * because the real Web Audio API never schedules them — they are plain
   * gettable/settable fields, not AudioParams.
   */
  function attachPlainProp<T>(node: Record<string, unknown>, id: string, prop: string, initial: T): void {
    let current = initial;
    Object.defineProperty(node, prop, {
      enumerable: true,
      get() {
        return current;
      },
      set(v: T) {
        current = v;
        events.push({ kind: "param", detail: { node: id, prop, method: "value", value: v } });
      },
    });
  }

  function attachLifecycle(node: Record<string, unknown>, id: string): void {
    node.connect = (...args: unknown[]) => {
      events.push({ kind: "connect", detail: { from: id, to: idFor(args[0]) } });
      return args[0];
    };
    node.disconnect = (...args: unknown[]) => {
      events.push({ kind: "connect", detail: { from: id, to: null, args: args.map(idFor) } });
    };
    node.start = (...args: unknown[]) => {
      events.push({ kind: "start", detail: { node: id, args } });
    };
    node.stop = (...args: unknown[]) => {
      events.push({ kind: "stop", detail: { node: id, args } });
    };
  }

  function recordCreate(kind: string, args: unknown[]): string {
    const id = nextId(kind);
    events.push({ kind: "create", detail: { node: id, type: kind, args } });
    return id;
  }

  const destination = {};
  idOfNode.set(destination, "destination");

  const ctx: Record<string, unknown> = {
    currentTime: 0,
    sampleRate: SAMPLE_RATE,
    destination,

    createGain(...args: unknown[]) {
      const id = recordCreate("GainNode", args);
      const node: Record<string, unknown> = { gain: makeParam(id, "gain") };
      idOfNode.set(node, id);
      attachLifecycle(node, id);
      return node;
    },

    createOscillator(...args: unknown[]) {
      const id = recordCreate("OscillatorNode", args);
      const node: Record<string, unknown> = {
        frequency: makeParam(id, "frequency"),
        detune: makeParam(id, "detune"),
      };
      idOfNode.set(node, id);
      attachTypeProp(node, id, "sine");
      attachLifecycle(node, id);
      return node;
    },

    createBiquadFilter(...args: unknown[]) {
      const id = recordCreate("BiquadFilterNode", args);
      const node: Record<string, unknown> = {
        frequency: makeParam(id, "frequency"),
        Q: makeParam(id, "Q"),
        gain: makeParam(id, "gain"),
      };
      idOfNode.set(node, id);
      attachTypeProp(node, id, "lowpass");
      attachLifecycle(node, id);
      return node;
    },

    createDelay(...args: unknown[]) {
      const id = recordCreate("DelayNode", args);
      const node: Record<string, unknown> = { delayTime: makeParam(id, "delayTime") };
      idOfNode.set(node, id);
      attachLifecycle(node, id);
      return node;
    },

    // Added for Plan 1 Task 3 (src/audio/AudioEngine.ts's masterBus()/
    // echoBus() per-emission panner) — positionX/Y/Z modeled as AudioParams
    // via makeParam (real PannerNode has scheduled them since positionX/Y/Z
    // shipped, matching what busFor() in AudioEngine.ts writes);
    // panningModel/distanceModel/refDistance/maxDistance/rolloffFactor are
    // plain fields via attachPlainProp, matching the real API (the Web Audio
    // spec never lets those be scheduled).
    createPanner(...args: unknown[]) {
      const id = recordCreate("PannerNode", args);
      const node: Record<string, unknown> = {
        positionX: makeParam(id, "positionX"),
        positionY: makeParam(id, "positionY"),
        positionZ: makeParam(id, "positionZ"),
      };
      idOfNode.set(node, id);
      attachPlainProp(node, id, "panningModel", "equalpower");
      attachPlainProp(node, id, "distanceModel", "inverse");
      attachPlainProp(node, id, "refDistance", 1);
      attachPlainProp(node, id, "maxDistance", 10000);
      attachPlainProp(node, id, "rolloffFactor", 1);
      attachLifecycle(node, id);
      return node;
    },

    createBufferSource(...args: unknown[]) {
      const id = recordCreate("AudioBufferSourceNode", args);
      const node: Record<string, unknown> = {};
      let bufferValue: unknown = null;
      Object.defineProperty(node, "buffer", {
        enumerable: true,
        get() {
          return bufferValue;
        },
        set(v: unknown) {
          bufferValue = v;
          events.push({ kind: "param", detail: { node: id, prop: "buffer", method: "value", value: idFor(v) } });
        },
      });
      idOfNode.set(node, id);
      attachLifecycle(node, id);
      return node;
    },

    createBuffer(...args: unknown[]) {
      const id = recordCreate("AudioBuffer", args);
      const length = Math.max(0, (args[1] as number) | 0);
      const channels: Float32Array[] = [];
      const node = {
        getChannelData(channel: number) {
          if (!channels[channel]) channels[channel] = new Float32Array(length);
          return channels[channel];
        },
      };
      idOfNode.set(node, id);
      return node;
    },
  };

  return { ctx, events };
}
