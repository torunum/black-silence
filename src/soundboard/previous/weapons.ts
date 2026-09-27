import { ctx, masterBus, voiced } from "../../audio/AudioEngine";
import { bang, blip, click } from "../../audio/Sfx";
import { growl } from "../../audio/Voice";
import { noise, noiseOffset } from "../../audio/Noise";
import { after } from "../../core/Timers";
import { WEAPON_STATS } from "../../weapons/definitions";

/**
 * THE WEAPONS AS THEY SOUNDED BEFORE PLAYER FEEDBACK ROUND 2 TASK 3 — the
 * sound board's "old" buttons for every weapon sound Task 3 replaced
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). The game
 * never imports this file.
 *
 * Each function is the catalogue function as it stood at `f9a1ac0`, copied
 * with what it called that Task 3 changed or removed: `gunshot()` and its
 * six profiles (round 1's report, which lived in `src/audio/Sfx.ts`), and
 * the generic clicks the reload, the switch, the pump and the dry fire used
 * to make. Each plays at the level it had then — the same trim from
 * `src/audio/Levels.ts` at `f9a1ac0`, written down below because the table
 * no longer has those entries or no longer has those numbers — so "old"
 * on the board is exactly what the game played, through whichever mix the
 * board is set to.
 *
 * `tests/behavior/soundCatalogue.test.ts` and
 * `tests/behavior/weaponReport.test.ts` still compare these with the frozen
 * reference and with round 1's design, so the record of what the game used
 * to sound like stays pinned.
 */

/** A level from `f9a1ac0`'s table: trim in dB, room factor 1 (none of these had one). */
function at(trimDb: number, emit: () => void): void {
  voiced({ gain: Math.pow(10, trimDb / 20), room: 1 }, emit);
}

/** Round 1's report profile (player feedback round 1 task 4) — see `gunshot` below. */
export interface GunshotProfile {
  split: number; crack: number; body: number; bodyDur: number; bodyEndHz: number;
  punch: number; punchHz: number; punchEndHz: number; punchDur: number;
}

const CRACK_DUR = 0.004;
const FLAT_Q = 0.707;

/**
 * Round 1's weapon report, verbatim from `src/audio/Sfx.ts` at `f9a1ac0`:
 * one noise source split at `split` Hz into a 4 ms highpassed crack and a
 * lowpassed body whose corner and gain both fall, plus a low sine thump,
 * summed into one unity gain and one `masterBus()` call.
 */
export function gunshot(p: GunshotProfile): void {
  if(!ctx())return;
  const t0=ctx().currentTime;
  const out=ctx().createGain();out.connect(masterBus());
  const n=ctx().createBufferSource();n.buffer=noise();
  const hp=ctx().createBiquadFilter();hp.type="highpass";
  hp.frequency.value=p.split;hp.Q.value=FLAT_Q;
  const cg=ctx().createGain();
  cg.gain.setValueAtTime(p.crack,t0);cg.gain.exponentialRampToValueAtTime(.001,t0+CRACK_DUR);
  n.connect(hp);hp.connect(cg);cg.connect(out);
  const lp=ctx().createBiquadFilter();lp.type="lowpass";lp.Q.value=FLAT_Q;
  lp.frequency.setValueAtTime(p.split,t0);
  lp.frequency.exponentialRampToValueAtTime(p.bodyEndHz,t0+p.bodyDur);
  const bg=ctx().createGain();
  bg.gain.setValueAtTime(p.body,t0);bg.gain.exponentialRampToValueAtTime(.001,t0+p.bodyDur);
  n.connect(lp);lp.connect(bg);bg.connect(out);
  n.start(t0,noiseOffset(p.bodyDur));n.stop(t0+p.bodyDur);
  const o=ctx().createOscillator();o.type="sine";
  o.frequency.setValueAtTime(p.punchHz,t0);
  o.frequency.exponentialRampToValueAtTime(p.punchEndHz,t0+p.punchDur);
  const pg=ctx().createGain();
  pg.gain.setValueAtTime(p.punch,t0);pg.gain.exponentialRampToValueAtTime(.001,t0+p.punchDur);
  o.connect(pg);pg.connect(out);o.start(t0);o.stop(t0+p.punchDur);}

/** Round 1's six firearm profiles, `WEAPON_REPORTS` at `f9a1ac0`, by slot. */
export const OLD_REPORTS: Readonly<Record<number, GunshotProfile>> = {
  0: { split:2400, crack:.16, body:.20, bodyDur:.09, bodyEndHz:380, punch:.16, punchHz:150, punchEndHz:48, punchDur:.07 },
  1: { split:1400, crack:.25, body:.34, bodyDur:.17, bodyEndHz:240, punch:.36, punchHz:120, punchEndHz:36, punchDur:.12 },
  2: { split:2600, crack:.13, body:.16, bodyDur:.05, bodyEndHz:420, punch:.11, punchHz:165, punchEndHz:55, punchDur:.04 },
  3: { split:3000, crack:.09, body:.10, bodyDur:.04, bodyEndHz:520, punch:.07, punchHz:180, punchEndHz:62, punchDur:.03 },
  4: { split:1900, crack:.22, body:.26, bodyDur:.21, bodyEndHz:210, punch:.24, punchHz:110, punchEndHz:33, punchDur:.15 },
  6: { split:3200, crack:.12, body:.10, bodyDur:.03, bodyEndHz:750, punch:.05, punchHz:220, punchEndHz:88, punchDur:.022 },
};

/** The eight firing sounds as the game played them at `f9a1ac0`, in slot order, each at its trim then. */
export const OLD_FIRE: readonly (() => void)[] = [
  () => at(10, () => { gunshot(OLD_REPORTS[0]); }),
  () => at(2.5, () => { gunshot(OLD_REPORTS[1]); }),
  () => at(10.7, () => { gunshot(OLD_REPORTS[2]); }),
  () => at(14.3, () => { gunshot(OLD_REPORTS[3]); }),
  () => at(5.9, () => { gunshot(OLD_REPORTS[4]); }),
  () => at(9.8, () => { blip(520,.3,"sine",.12,780,true); bang(.1,.2,800); }),
  () => at(13.2, () => { gunshot(OLD_REPORTS[6]); }),
  () => at(2.1, () => { blip(70,.5,"sawtooth",.16,360,true); bang(.28,.45,500); growl(90,.4,.3,true); }),
];

/** The old switch, pump and dry-fire clicks (each a `click()` at a gain), at their trims then. */
export const oldWeaponLower = (): void => at(10.2, () => { click(.12); });
export const oldWeaponRaise = (): void => at(7.7, () => { click(.16); });
export const oldDryFire = (): void => at(11.8, () => { click(.1); });
export const oldShotgunPump = (): void => at(10.2, () => { click(.12); });
/** The three reload clicks every weapon made, at 18%, 62% and the end of its reload. */
export const oldReloadOut = (): void => at(7.7, () => { click(.16); });
export const oldReloadIn = (): void => at(8.8, () => { click(.14); });
export const oldReloadDone = (): void => at(5.7, () => { click(.2); });

/** A whole reload of `slot` as it used to sound: the same three clicks for every weapon, at its own reload time. */
export function oldReload(slot: number): void {
  const ms = WEAPON_STATS[slot].reload * 1000;
  after(oldReloadOut, 0.18 * ms);
  after(oldReloadIn, 0.62 * ms);
  after(oldReloadDone, ms);
}
