import { ctx, echoBus, masterBus, voiced } from "./AudioEngine";
import { soundRandom } from "./SoundRandom";
import { layer, type Layer } from "./Layers";

/**
 * RECORDED SOUNDS (owner, 2026-10-20: "gerçekçi sesler koyamaz mıyız ? korkunc sesler olsun istiyorum. silah sesleri de
 * gerçekçi degil") — real recordings for the guns and the monsters' throats, on top of the synthesized catalogue.
 *
 * Every clip is CC0 (credits in `THIRD-PARTY-NOTICES.md`): the guns are Still North Media's free firearm library, the
 * voices and the ambience are opengameart.org's creature, zombie and undead packs. They are cut, mono, short and
 * encoded small by hand (`assets/sfx/`, about 660 KB), and inlined into the bundle as data URLs, so the single-file
 * build still opens from `file://` with nothing to fetch.
 *
 * A clip's name is `bank.n.mp3`; the banks are `gun.<weapon>`, `<voice family>.<event>` (`./VoiceTable.ts`'s
 * families and events) and `amb.*`. `loadSamples()` decodes them all when the game starts; until a bank is decoded —
 * and always in the tests, which have no decoder — `playSample` returns false and the caller plays the synthesized
 * sound it always did. So nothing goes silent, and nothing pinned by a test moves.
 */

const FILES = import.meta.glob("../../assets/sfx/*.mp3", { query: "?inline", import: "default", eager: true }) as Record<string, string>;

interface Clip { buf: AudioBuffer; start: number }
const banks = new Map<string, Clip[]>();
let loading: BaseAudioContext | null = null;

/** The bank a file belongs to: `moan.alert.2.mp3` → `moan.alert`, `gun.rifle.mp3` → `gun.rifle`. */
export function bankOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1).replace(/\.mp3$/, "");
  return base.replace(/\.\d+$/, "");
}
/** Every bank the bundle carries, and how many clips each has (for tests and the docs). */
export function sampleBanks(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of Object.keys(FILES)) out[bankOf(p)] = (out[bankOf(p)] ?? 0) + 1;
  return out;
}
/** Whether `bank` has a decoded clip ready to play. */
export function hasSample(bank: string): boolean {
  return (banks.get(bank)?.length ?? 0) > 0;
}

function bytes(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Where the sound begins: the first sample a fiftieth of the peak, less a millisecond — past any encoder padding. */
function onset(buf: AudioBuffer): number {
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  const th = peak * 0.02;
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > th) return Math.max(0, i / buf.sampleRate - 0.001);
  return 0;
}

/** Decodes every clip on `ac` (once per context). Safe to call before or without audio; a clip that fails is skipped. */
export function loadSamples(ac: BaseAudioContext | null = ctx()): void {
  if (!ac || loading === ac || typeof ac.decodeAudioData !== "function") return;
  loading = ac;
  banks.clear();
  for (const [path, url] of Object.entries(FILES)) {
    if (typeof url !== "string" || !url.startsWith("data:")) continue;
    const bank = bankOf(path);
    ac.decodeAudioData(bytes(url)).then((buf) => {
      if (loading !== ac) return;
      const clip = { buf: bank === "amb.bed" ? loopable(buf) : buf, start: bank.startsWith("amb.") ? 0 : onset(buf) };
      const list = banks.get(bank) ?? [];
      list.push(clip);
      banks.set(bank, list);
      if (bank === "amb.bed") startBed();
    }, () => { /* an undecodable clip: its bank keeps the synthesized sound */ });
  }
}

/** The clip with its last two seconds folded into its first, so it loops with no seam. */
function loopable(buf: AudioBuffer): AudioBuffer {
  const X = Math.min(Math.floor(buf.sampleRate * 2), buf.length >> 2), N = buf.length - X;
  const ac = ctx();
  const out = ac.createBuffer(1, N, buf.sampleRate);
  const a = buf.getChannelData(0), o = out.getChannelData(0);
  for (let i = 0; i < N; i++) o[i] = a[i];
  for (let i = 0; i < X; i++) { const k = i / X; o[i] = a[i] * Math.sqrt(k) + a[N + i] * Math.sqrt(1 - k); }
  return out;
}

export interface SampleOpts {
  /** Playback rate: pitch and speed together (1 = as recorded). */
  rate?: number;
  /** Linear gain on top of the level in scope. */
  gain?: number;
  /** Through the room (`echoBus`) rather than dry. */
  echo?: boolean;
  /** Cut it short after this many seconds (of the clip), with a 40 ms fade — a rapid weapon's shots must not wash. */
  dur?: number;
  /** Synthesized layers played into the same output (a rake under a claw swipe, a rumble under a boss waking). */
  extra?: readonly Layer[];
}

/**
 * Plays one clip of `bank`, chosen by sound's own dice, at the position `at()` has armed and the level `lv()` has in
 * scope. Returns false — and rolls no dice, makes no node — when the bank is not decoded, so the caller can fall back.
 */
export function playSample(bank: string, o: SampleOpts = {}): boolean {
  const list = banks.get(bank);
  if (!list || list.length === 0 || !ctx()) return false;
  const ac = ctx();
  const clip = list[Math.floor(soundRandom() * list.length) % list.length];
  const rate = o.rate ?? 1;
  const len = Math.min(clip.buf.duration - clip.start, o.dur ?? Infinity);
  const t0 = ac.currentTime, end = t0 + len / rate;
  const src = ac.createBufferSource();
  src.buffer = clip.buf;
  src.playbackRate.value = rate;
  const out = ac.createGain();
  const g = o.gain ?? 1;
  out.gain.setValueAtTime(g, t0);
  out.gain.setValueAtTime(g, Math.max(t0, end - 0.04));
  out.gain.linearRampToValueAtTime(0, end);
  src.connect(out);
  out.connect(o.echo ? echoBus() : masterBus());
  src.start(t0, clip.start);
  src.stop(end + 0.01);
  for (const l of o.extra ?? []) layer(out, t0 + (l.at ?? 0), l);
  return true;
}

/** The ambience bed: a low, slow horror drone, looped under the game's own oscillator drones from the first frame it is decoded. */
let bed: AudioBufferSourceNode | null = null;
export const BED_GAIN = 0.32;
function startBed(): void {
  const clip = banks.get("amb.bed")?.[0];
  if (!clip || bed || !ctx()) return;
  const ac = ctx();
  voiced({ gain: BED_GAIN, room: 0.6 }, () => {
    const src = ac.createBufferSource();
    src.buffer = clip.buf;
    src.loop = true;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(1, ac.currentTime + 4);
    src.connect(g);
    g.connect(echoBus());
    src.start();
    bed = src;
  });
}
