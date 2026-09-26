// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { compareSoundLogs, recordModuleSound, recordReferenceSnippet, referenceSite } from "../support/soundOracle";
import * as W from "../../src/audio/sounds/weapons";
import * as M from "../../src/audio/sounds/monsters";
import * as WO from "../../src/audio/sounds/world";
import * as UI from "../../src/audio/sounds/ui";
import * as X from "../../src/audio/sounds/explosions";
import { gunshot } from "../../src/audio/Sfx";

/**
 * THE SOUND CATALOGUE IS THE CALL SITES, MOVED — player feedback round 2,
 * Task 1 (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * `src/audio/sounds/*.ts` gave every sound in the game a name, so the sound
 * board can play "the shotgun pump" on its own. Before that, most sounds
 * were inline `blip`/`bang` calls at their call sites, and the extraction
 * was chartered as a pure refactor: the same calls, the same arguments, the
 * same order. This file is that charter, checked sound by sound.
 *
 * Each case names the **reference's own call-site text** (`site`, which
 * must occur in `reference/sonsurum.html` exactly once, so it pins one
 * place) and the executable part of it (`snippet`, a substring of `site`).
 * The snippet is run through the reference's own audio engine, the
 * catalogue function through the port's, both against the same recording
 * WebAudio surface and the same seed, and the two call logs must match
 * event for event — including every random pitch or delay the sound draws,
 * which shows up in the logged frequencies and timings, and every timer,
 * which is drained.
 *
 * The second half of Task 1 took sound off the game's dice (KNOWN-22): the
 * port draws its jitter from `src/audio/SoundRandom.ts` and plays shared
 * noise at an offset (`src/audio/Noise.ts`) instead of drawing
 * `Math.random()` and filling fresh buffers. `tests/support/soundOracle.ts`
 * hands the reference the port's jitter generator and checks the noise
 * source against a positive contract before setting it aside — see its
 * header. So these cases still prove "the same calls, the same arguments,
 * the same order", and now also that every catalogue sound draws nothing
 * from the gameplay generator (`recordModuleSound` counts).
 *
 * Six of the eight weapon reports have no reference counterpart: player
 * feedback round 1 rebuilt them on purpose (`gunshot()`), and
 * `tests/behavior/weaponReport.test.ts` is their oracle. For those this file
 * checks only that the catalogue function is `gunshot(WEAPON_REPORTS[i])`.
 */

interface Case {
  name: string;
  site: string;
  snippet?: string;
  vars?: Record<string, unknown>;
  module: () => void;
  /** For a sound behind a roll: some seeds legitimately play nothing. The case still has to play something on at least one. */
  maySkip?: boolean;
}

const CASES: Case[] = [
  // ---- weapons
  { name: "crossLauncherFire", site: 'blip(520,.3,"sine",.12,780,true);bang(.1,.2,800);', module: W.crossLauncherFire },
  { name: "soulReaperFire", site: 'blip(70,.5,"sawtooth",.16,360,true);bang(.28,.45,500);growl(90,.4,.3,true);', module: W.soulReaperFire },
  { name: "weaponLower", site: 'wstate="unequip";wtime=0;click(.12);', snippet: "click(.12)", module: W.weaponLower },
  { name: "weaponRaise", site: 'wstate="equip";wtime=0;click(.16);', snippet: "click(.16)", module: W.weaponRaise },
  { name: "reloadOut", site: "reloadFlags.a=1;click(.16);", snippet: "click(.16)", module: W.reloadOut },
  { name: "reloadIn", site: "reloadFlags.b=1;click(.14);", snippet: "click(.14)", module: W.reloadIn },
  { name: "reloadDone", site: 'wstate="idle";wtime=0;click(.2);', snippet: "click(.2)", module: W.reloadDone },
  { name: "dryFire", site: "click(.1);wCool=.3;", snippet: "click(.1)", module: W.dryFire },
  { name: "shotgunPump", site: "ejectCasing(2);click(.12);", snippet: "click(.12)", module: W.shotgunPump },
  { name: "kickSwing", site: "shake(.3);bang(.15,.5,900);", snippet: "bang(.15,.5,900)", module: W.kickSwing },
  { name: "kickImpact", site: "if(hitAny){bang(.12,.4,500);", snippet: "bang(.12,.4,500)", module: W.kickImpact },
  { name: "casingTinkle", site: 'setTimeout(()=>blip(rnd(1800,2600),.04,"square",.025),rnd(250,450));', module: W.casingTinkle },
  // ---- UI
  { name: "achievementChime", site: 'blip(160,.5,"sine",.05,120,true);', module: UI.achievementChime },
  { name: "kickReady", site: 'say("kickready");click(.12);', snippet: "click(.12)", module: UI.kickReady },
  { name: "scrapSmgAssembled", site: 'showMsg("SCRAP SMG ASSEMBLED FROM THE DEAD",3);blip(330,.12,"square",.08);', snippet: 'blip(330,.12,"square",.08);', module: UI.scrapSmgAssembled },
  // ---- explosions
  { name: "barrelExplosion", site: "boom(1.1)", module: X.barrelExplosion },
  { name: "holyCrossExplosion", site: "boom(.7)", module: X.holyCrossExplosion },
  { name: "afritDeathExplosion", site: "boom(.8)", module: X.afritDeathExplosion },
  // ---- monsters
  { name: 'orbLaunch("toxic")', site: 'blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90)', vars: { tox: true, ot: "cult" }, module: () => M.orbLaunch("toxic") },
  { name: 'orbLaunch("heavy")', site: 'blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90)', vars: { tox: false, ot: "manc" }, module: () => M.orbLaunch("heavy") },
  { name: 'orbLaunch("normal")', site: 'blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90)', vars: { tox: false, ot: "caco" }, module: () => M.orbLaunch("normal") },
  { name: "fleshThrow", site: "gurgle(.22,.32);growl(150,.22,.22);", module: M.fleshThrow },
  { name: "fleshHitsPlayer", site: "gurgle(.2,.35);", module: M.fleshHitsPlayer },
  { name: "fleshSplat", site: "gurgle(.16,.25);", module: M.fleshSplat },
  { name: "shockwaveRing", site: 'bang(.3,.5,250);blip(60,.5,"sawtooth",.16,30,true);', module: M.shockwaveRing },
  { name: "debrisWarning", site: 'blip(1200,.4,"sine",.05,300)', module: M.debrisWarning },
  { name: "debrisImpact", site: "bang(.25,.5,400)", module: M.debrisImpact },
  { name: "wallSplat", site: "bang(.18,.5,600)", module: M.wallSplat },
  { name: "chargeCrash", site: "bang(.2,.5,400)", module: M.chargeCrash },
  { name: "screamerCall", site: 'growl(180,.9,.4,true);blip(500,.7,"sawtooth",.1,180,true);', module: M.screamerCall },
  { name: "lostSoulCharge", site: 'blip(700,.3,"sawtooth",.12,1400)', module: M.lostSoulCharge },
  { name: "slamWindup", site: 'blip(80,.4,"sawtooth",.14,40)', module: M.slamWindup },
  { name: "slamImpact", site: "bang(.3,.6,300)", module: M.slamImpact },
  { name: "houndLunge", site: 'blip(500,.2,"sawtooth",.1,260)', module: M.houndLunge },
  { name: "monsterClaw", site: 'blip(140,.12,"sawtooth",.1,60)', module: M.monsterClaw },
  { name: "bossWakes", site: 'blip(40,1.6,"sawtooth",.2,30,true);bang(.5,.4,300);', module: M.bossWakes },
  { name: "bossRoar", site: "growl(rnd(42,60),1.0,.6,true);setTimeout(()=>growl(rnd(50,70),.6,.4,true),200);", module: () => M.bossRoar() },
  { name: "priestVanish", site: 'blip(700,.25,"sine",.1,140,true)', module: M.priestVanish },
  { name: "priestAppear", site: 'blip(140,.25,"sine",.12,700,true)', module: M.priestAppear },
  { name: "priestSummons", site: 'blip(180,.6,"sawtooth",.12,60,true)', module: M.priestSummons },
  { name: "shieldBlock", site: "bang(.04,.3,3000,800)", module: M.shieldBlock },
  { name: "armourPlateHit", site: "bang(.05,.32,2800,700)", module: M.armourPlateHit },
  { name: "armourShatter", site: "bang(.15,.35,900)", module: M.armourShatter },
  // pain/death: one low stat (clamped up), one mid, one high (clamped down for pain's 360 / death's 200).
  ...[40, 240, 1200].map((p): Case => ({ name: `monsterPain(${p})`, site: "pain(clamp(e.pain*.35,70,360),.08+Math.random()*.04)", vars: { e: { pain: p } }, module: () => M.monsterPain(p) })),
  ...[40, 240, 1200].map((p): Case => ({ name: `monsterDeath(${p})`, site: "deathCry(clamp(e.pain*.3,42,200))", vars: { e: { pain: p } }, module: () => M.monsterDeath(p) })),
  { name: "limbTorn", site: "gurgle(.25,.4)", module: M.limbTorn },
  { name: "gibBurst", site: "bang(.2,.45,800);gurgle(.45,.5);", module: M.gibBurst },
  { name: "decapitation", site: "gurgle(.32,.45)", module: M.decapitation },
  { name: "headBounce", site: "gurgle(.1,.18)", module: M.headBounce },
  { name: "headKicked", site: "bang(.08,.3,500)", module: M.headKicked },
  { name: "bossDies", site: 'bang(.6,.7,400);blip(50,1.4,"sawtooth",.2,28,true);', module: M.bossDies },
  // ---- world
  ...[[false, false], [true, false], [false, true], [true, true]].map(([sprinting, marble]): Case => ({
    name: `footstep(${sprinting},${marble})`,
    site: 'bang(.05,sprinting?.09:.06,marble?2400:700,marble?600:0);\n  if(marble)blip(rnd(800,1000),.05,"sine",.02);',
    vars: { sprinting, marble },
    module: () => WO.footstep(sprinting, marble),
  })),
  { name: "jump", site: 'blip(140,.06,"sine",.04,90)', module: WO.jump },
  { name: "playerHurt", site: 'bang(.1,.3,700);blip(90,.2,"sawtooth",.12,40);', module: WO.playerHurt },
  { name: "lockedDoor", site: "growl(80,.3,.25,true)", module: WO.lockedDoor },
  { name: "itemPickup", site: 'blip(330,.14,"sine",.1,210,true);gurgle(.12,.12);', module: WO.itemPickup },
  { name: "exitOpens", site: 'blip(120,.7,"sine",.09,90,true);growl(70,.4,.2,true);', module: WO.exitOpens },
  { name: "gauntletBegins", site: 'blip(70,1,"sawtooth",.15,40,true);', module: WO.gauntletBegins },
  { name: "gauntletCleared", site: 'blip(523,.3,"sine",.1,1046,true);', module: WO.gauntletCleared },
  { name: "bulletHitsProp", site: "bang(.04,.12,1500,300)", module: WO.bulletHitsProp },
  { name: "ricochetRoll + bulletRicochet", site: "if(Math.random()<.3)bang(.03,.08,4000,800);", module: () => { if (WO.ricochetRoll()) WO.bulletRicochet(); }, maySkip: true },
  { name: "propBreaks", site: "bang(.12,.32,1200);bang(.08,.2,500);", module: WO.propBreaks },
  { name: "blackout", site: 'blip(50,2,"sine",.1,30,true);bang(.4,.1,300);', module: WO.blackout },
  { name: "whispers", site: 'for(let i=0;i<3;i++)setTimeout(()=>blip(rnd(300,500),.7,"sine",.025,rnd(120,200),true),i*600);', module: WO.whispers },
  { name: "distantScream", site: 'blip(rnd(480,720),1.4,"sine",.022,rnd(140,200),true);', module: WO.distantScream },
  { name: "machinery", site: "for(let i=0;i<3;i++)setTimeout(()=>bang(.08,.05,400),i*rnd(120,260));", module: WO.machinery },
  { name: "staticCrackle", site: "{bang(.3,.03,6000,1800);setTimeout(()=>bang(.15,.025,6000,1800),200);}", module: WO.staticCrackle },
  { name: "drip", site: 'blip(rnd(1200,2200),.08,"sine",.03,undefined,true);', module: WO.drip },
  { name: "heartbeat", site: 'blip(52,.1,"sine",.22,40);setTimeout(()=>blip(48,.12,"sine",.18,36),130);', module: WO.heartbeat },
  { name: "breath", site: "bang(.5,.04,900,300)", module: WO.breath },
];

/**
 * `ambientStinger` picks one of four sounds from a draw, so a single seed
 * covers one branch. Its reference site is the whole of `ambience()`'s
 * choice, comments and all.
 */
const STINGER_SITE =
  "const r=Math.random();\n" +
  '  if(r<.28)blip(rnd(480,720),1.4,"sine",.022,rnd(140,200),true);      // distant scream\n' +
  "  else if(r<.5)for(let i=0;i<3;i++)setTimeout(()=>bang(.08,.05,400),i*rnd(120,260)); // machinery\n" +
  "  else if(r<.72){bang(.3,.03,6000,1800);setTimeout(()=>bang(.15,.025,6000,1800),200);} // static\n" +
  '  else blip(rnd(1200,2200),.08,"sine",.03,undefined,true);            // drip';

/** Seeds whose first draw lands in each stinger branch (and on the ricochet's both sides) — checked, not assumed, below. */
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

describe("every catalogue sound makes exactly the calls its reference call site made", () => {
  it.each(CASES)("$name", (c) => {
    const snippet = c.snippet ?? c.site;
    expect(referenceSite(c.site)).toContain(snippet);
    let longest = 0;
    for (const seed of c.maySkip ? SEEDS : [31, 32]) {
      const ref = recordReferenceSnippet(snippet, c.vars ?? {}, seed);
      const mod = recordModuleSound(c.module, seed);
      longest = Math.max(longest, ref.length);
      compareSoundLogs(mod, ref, `${c.name} (seed ${seed})`);
    }
    expect(longest, "a snippet that records nothing proves nothing").toBeGreaterThan(3);
  });

  it("ambientStinger picks the same stinger, and plays it the same, as ambience() did", () => {
    referenceSite(STINGER_SITE);
    const firstEvents = new Set<string>();
    for (const seed of SEEDS) {
      const ref = recordReferenceSnippet(STINGER_SITE, {}, seed);
      const mod = recordModuleSound(WO.ambientStinger, seed);
      compareSoundLogs(mod, ref, `ambientStinger (seed ${seed})`);
      // The node types plus every stop time: the scream and the drip are both a lone sine blip, and only their lengths tell them apart.
      firstEvents.add(JSON.stringify(ref.filter((e) => e.kind === "create" || e.kind === "stop").map((e) => e.detail.type ?? e.detail.args)));
    }
    // Four branches, four different graphs: the seeds really covered all of them.
    expect(firstEvents.size).toBe(4);
  });

  it("the ricochet case saw both outcomes of its roll across the seeds", () => {
    const outcomes = new Set(SEEDS.map((seed) => recordModuleSound(() => { if (WO.ricochetRoll()) WO.bulletRicochet(); }, seed).length > 0));
    expect([...outcomes].sort()).toEqual([false, true]);
  });
});

describe("the six rebuilt firearm reports are gunshot() at their profile", () => {
  const fire = [W.flarePistolFire, W.shotgunFire, W.combatRifleFire, W.tommyGunFire, W.sniperFire, undefined, W.nailCannonFire];
  it.each(W.REBUILT_REPORT_SLOTS)("slot %i", (slot) => {
    const f = fire[slot]!;
    expect(W.WEAPON_FIRE_SOUNDS[slot]).toBe(f);
    expectCallLogEqual(recordModuleSound(f, 7), recordModuleSound(() => gunshot(W.WEAPON_REPORTS[slot]), 7), `slot ${slot}`);
  });

  it("slots 5 and 7 are the two unrebuilt closures, in slot order", () => {
    expect(W.WEAPON_FIRE_SOUNDS[5]).toBe(W.crossLauncherFire);
    expect(W.WEAPON_FIRE_SOUNDS[7]).toBe(W.soulReaperFire);
    expect(W.WEAPON_FIRE_SOUNDS).toHaveLength(8);
  });
});
