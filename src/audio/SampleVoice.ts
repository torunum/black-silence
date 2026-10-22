import { hasSample, playSample } from "./Samples";
import { soundRandom } from "./SoundRandom";
import { voiceOf, type Family, type VocalEvent } from "./VoiceTable";
import type { Layer } from "./Layers";

/**
 * A MONSTER'S RECORDED THROAT — `./Speak.ts` asks here first. A kind speaks with its family's bank for the event
 * (`moan.pain`, `titan.roar`, …: `./Samples.ts`), pitched by how far its fundamental sits from its family's middle,
 * so a dog snarls higher than a slaughtaur and the Living Heart lower than the Gravedigger. Where a family has no clip
 * for an event, the nearest bank that fits stands in; where none does, the synthesized voice speaks as it always did.
 */

/** The fundamental each family's recordings sound at, roughly — a kind at its family's middle plays its clips as recorded. */
export const FAMILY_F0: Readonly<Record<Family, number>> = { skitter: 300, moan: 140, hiss: 115, bellow: 72, titan: 48 };

/** Which banks may voice `event` for `family`, in order. */
export function banksFor(family: Family, event: VocalEvent): string[] {
  const own = `${family}.${event}`;
  switch (event) {
    case "alert": return [own, ...(family === "titan" ? ["titan.roar"] : [])];
    case "scream": return [own, "moan.scream"];
    case "heave": return [own, "bellow.heave"];
    case "summon": return [own, "titan.summon"];
    case "wake": return [own, "titan.wake"];
    case "roar": return [own, "titan.roar", "bellow.attack"];
    case "charge": return [own, "skitter.attack"];
    default: return [own];
  }
}

/** The playback rate for a kind: the square root of its fundamental over its family's, held to a fifth either way. */
export function sampleRate(kind: string): number {
  const v = voiceOf(kind);
  return Math.min(1.32, Math.max(0.76, Math.sqrt(v.f0 / FAMILY_F0[v.family])));
}

/**
 * Plays `kind`'s recorded `event`, with `extra` synthesized layers under it. True when it played (or, for a roar's
 * tail, when the recorded roar already carries one) — the caller then makes no synthesized voice.
 */
export function sampleVoice(kind: string, event: VocalEvent, extra: readonly Layer[] = []): boolean {
  const v = voiceOf(kind);
  if (event === "roarTail") return banksFor(v.family, "roar").some(hasSample);
  const bank = banksFor(v.family, event).find(hasSample);
  if (!bank) return false;
  const rate = sampleRate(kind) * (event === "charge" ? 1.25 : 1) * (0.96 + soundRandom() * 0.08);
  const echo = v.family === "titan" || event === "death" || event === "roar" || event === "scream";
  return playSample(bank, { rate, gain: 0.85 * Math.pow(10, v.gain / 20), echo, extra });
}
