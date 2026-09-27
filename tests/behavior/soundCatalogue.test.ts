// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { compareSoundLogs, recordModuleSound, recordReferenceSnippet, referenceSite } from "../support/soundOracle";
import * as W from "../../src/audio/sounds/weapons";
import * as M from "../../src/audio/sounds/monsters";
import * as WO from "../../src/audio/sounds/world";
import * as OW from "../../src/soundboard/previous/world";
import * as P from "../../src/soundboard/previous/weapons";
import * as OM from "../../src/soundboard/previous/monsters";

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
 * PLAYER FEEDBACK ROUND 2 TASK 3 — A DELIBERATE DIVERGENCE. Task 3
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`) rebuilt
 * every weapon report and replaced the generic clicks of the reload, the
 * switch, the pump and the dry fire with mechanism foley
 * (`src/audio/sounds/foley.ts`), so those catalogue functions no longer
 * match any reference call site, on purpose. Their cases below are not
 * deleted: they now run the sound board's "old" versions
 * (`src/soundboard/previous/weapons.ts`, the catalogue functions as they
 * stood at `f9a1ac0`) against the same reference sites — which is what
 * keeps the board's "old" button honest: it is the reference's sound. The
 * new sounds are pinned by `tests/audio/weaponSounds.test.ts` and
 * `tests/weapons/foley.test.ts`. Likewise round 1's six `gunshot()`
 * reports, whose oracle is `tests/behavior/weaponReport.test.ts`, are
 * checked here as the board's old ones.
 *
 * PLAYER FEEDBACK ROUND 2 TASK 4 — THE SAME, FOR THE MONSTERS. Task 4 gave
 * every enemy a voice (`src/audio/VoiceTable.ts`, `src/audio/Speak.ts`):
 * the alert, pain, attack and death, the dog's lunge, the lost soul's
 * charge, the brute's wind-up, the wailer's scream, the orbs' launch, the
 * flesh-flinger's throw, and the bosses' waking, roar, summons and death no
 * longer match any reference call site, on purpose. Their cases below run
 * the board's "old" versions (`src/soundboard/previous/monsters.ts`, the
 * catalogue functions as they stood at `f198dea`) against the same
 * reference sites. The voices are pinned by
 * `tests/audio/monsterVoices.test.ts`.
 *
 * PLAYER FEEDBACK ROUND 2 TASK 5 — THE SAME, FOR THE WORLD. Task 5 rebuilt
 * the footstep (now one per floor) and the landing, the jump, the kick's
 * swing and impact, the bullet on a crate and the ricochet, a prop
 * breaking, the doors, the locked door, the pickups, the exit, the three
 * explosions and the UI cues, so those catalogue functions no longer match
 * any reference call site, on purpose. Their cases below run the board's
 * "old" versions (`src/soundboard/previous/world.ts`, the catalogue
 * functions as they stood at `e34815c`) against the same reference sites.
 * The new sounds are pinned by `tests/audio/worldSounds.test.ts` and
 * `tests/integration/worldSoundWiring.test.ts`.
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
  // (the old ones — see "A DELIBERATE DIVERGENCE" above)
  { name: "old crossLauncherFire", site: 'blip(520,.3,"sine",.12,780,true);bang(.1,.2,800);', module: P.OLD_FIRE[5] },
  { name: "old soulReaperFire", site: 'blip(70,.5,"sawtooth",.16,360,true);bang(.28,.45,500);growl(90,.4,.3,true);', module: P.OLD_FIRE[7] },
  { name: "old weaponLower", site: 'wstate="unequip";wtime=0;click(.12);', snippet: "click(.12)", module: P.oldWeaponLower },
  { name: "old weaponRaise", site: 'wstate="equip";wtime=0;click(.16);', snippet: "click(.16)", module: P.oldWeaponRaise },
  { name: "old reloadOut", site: "reloadFlags.a=1;click(.16);", snippet: "click(.16)", module: P.oldReloadOut },
  { name: "old reloadIn", site: "reloadFlags.b=1;click(.14);", snippet: "click(.14)", module: P.oldReloadIn },
  { name: "old reloadDone", site: 'wstate="idle";wtime=0;click(.2);', snippet: "click(.2)", module: P.oldReloadDone },
  { name: "old dryFire", site: "click(.1);wCool=.3;", snippet: "click(.1)", module: P.oldDryFire },
  { name: "old shotgunPump", site: "ejectCasing(2);click(.12);", snippet: "click(.12)", module: P.oldShotgunPump },
  { name: "old kickSwing", site: "shake(.3);bang(.15,.5,900);", snippet: "bang(.15,.5,900)", module: OW.oldKickSwing },
  { name: "old kickImpact", site: "if(hitAny){bang(.12,.4,500);", snippet: "bang(.12,.4,500)", module: OW.oldKickImpact },
  { name: "casingTinkle", site: 'setTimeout(()=>blip(rnd(1800,2600),.04,"square",.025),rnd(250,450));', module: W.casingTinkle },
  // ---- UI
  { name: "old achievementChime", site: 'blip(160,.5,"sine",.05,120,true);', module: OW.oldAchievementChime },
  { name: "old kickReady", site: 'say("kickready");click(.12);', snippet: "click(.12)", module: OW.oldKickReady },
  { name: "old scrapSmgAssembled", site: 'showMsg("SCRAP SMG ASSEMBLED FROM THE DEAD",3);blip(330,.12,"square",.08);', snippet: 'blip(330,.12,"square",.08);', module: OW.oldScrapSmgAssembled },
  // ---- explosions
  { name: "old barrelExplosion", site: "boom(1.1)", module: OW.oldBarrelExplosion },
  { name: "old holyCrossExplosion", site: "boom(.7)", module: OW.oldHolyCrossExplosion },
  { name: "old afritDeathExplosion", site: "boom(.8)", module: OW.oldAfritDeathExplosion },
  // ---- monsters
  { name: 'old orbLaunch("toxic")', site: 'blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90)', vars: { tox: true, ot: "cult" }, module: () => OM.oldOrbLaunch("toxic") },
  { name: 'old orbLaunch("heavy")', site: 'blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90)', vars: { tox: false, ot: "manc" }, module: () => OM.oldOrbLaunch("heavy") },
  { name: 'old orbLaunch("normal")', site: 'blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90)', vars: { tox: false, ot: "caco" }, module: () => OM.oldOrbLaunch("normal") },
  { name: "old fleshThrow", site: "gurgle(.22,.32);growl(150,.22,.22);", module: OM.oldFleshThrow },
  { name: "fleshHitsPlayer", site: "gurgle(.2,.35);", module: M.fleshHitsPlayer },
  { name: "fleshSplat", site: "gurgle(.16,.25);", module: M.fleshSplat },
  { name: "shockwaveRing", site: 'bang(.3,.5,250);blip(60,.5,"sawtooth",.16,30,true);', module: M.shockwaveRing },
  { name: "debrisWarning", site: 'blip(1200,.4,"sine",.05,300)', module: M.debrisWarning },
  { name: "debrisImpact", site: "bang(.25,.5,400)", module: M.debrisImpact },
  { name: "wallSplat", site: "bang(.18,.5,600)", module: M.wallSplat },
  { name: "chargeCrash", site: "bang(.2,.5,400)", module: M.chargeCrash },
  { name: "old screamerCall", site: 'growl(180,.9,.4,true);blip(500,.7,"sawtooth",.1,180,true);', module: OM.oldScreamerCall },
  { name: "old lostSoulCharge", site: 'blip(700,.3,"sawtooth",.12,1400)', module: OM.oldLostSoulCharge },
  { name: "old slamWindup", site: 'blip(80,.4,"sawtooth",.14,40)', module: OM.oldSlamWindup },
  { name: "slamImpact", site: "bang(.3,.6,300)", module: M.slamImpact },
  { name: "old houndLunge", site: 'blip(500,.2,"sawtooth",.1,260)', module: OM.oldHoundLunge },
  { name: "old monsterClaw", site: 'blip(140,.12,"sawtooth",.1,60)', module: OM.oldMonsterClaw },
  { name: "old bossWakes", site: 'blip(40,1.6,"sawtooth",.2,30,true);bang(.5,.4,300);', module: OM.oldBossWakes },
  { name: "old bossRoar", site: "growl(rnd(42,60),1.0,.6,true);setTimeout(()=>growl(rnd(50,70),.6,.4,true),200);", module: OM.oldBossRoar },
  { name: "priestVanish", site: 'blip(700,.25,"sine",.1,140,true)', module: M.priestVanish },
  { name: "priestAppear", site: 'blip(140,.25,"sine",.12,700,true)', module: M.priestAppear },
  { name: "old priestSummons", site: 'blip(180,.6,"sawtooth",.12,60,true)', module: OM.oldPriestSummons },
  { name: "shieldBlock", site: "bang(.04,.3,3000,800)", module: M.shieldBlock },
  { name: "armourPlateHit", site: "bang(.05,.32,2800,700)", module: M.armourPlateHit },
  { name: "armourShatter", site: "bang(.15,.35,900)", module: M.armourShatter },
  // pain/death: one low stat (clamped up), one mid, one high (clamped down for pain's 360 / death's 200).
  // the old first-sighting bark: every snarl branch, and the generic moan
  ...["C", "A", "L", "j", "n", "k", "q", "R", "y", "s", "z"].map((k): Case => ({ name: `old monsterAlert(${k})`, site: "snarl(e.key)", vars: { e: { key: k } }, module: () => OM.oldMonsterAlert(k) })),
  ...[40, 240, 1200].map((p): Case => ({ name: `old monsterPain(${p})`, site: "pain(clamp(e.pain*.35,70,360),.08+Math.random()*.04)", vars: { e: { pain: p } }, module: () => OM.oldMonsterPain(p) })),
  ...[40, 240, 1200].map((p): Case => ({ name: `old monsterDeath(${p})`, site: "deathCry(clamp(e.pain*.3,42,200))", vars: { e: { pain: p } }, module: () => OM.oldMonsterDeath(p) })),
  { name: "limbTorn", site: "gurgle(.25,.4)", module: M.limbTorn },
  { name: "gibBurst", site: "bang(.2,.45,800);gurgle(.45,.5);", module: M.gibBurst },
  { name: "decapitation", site: "gurgle(.32,.45)", module: M.decapitation },
  { name: "headBounce", site: "gurgle(.1,.18)", module: M.headBounce },
  { name: "headKicked", site: "bang(.08,.3,500)", module: M.headKicked },
  { name: "old bossDies", site: 'bang(.6,.7,400);blip(50,1.4,"sawtooth",.2,28,true);', module: OM.oldBossDies },
  // ---- world
  ...[[false, false], [true, false], [false, true], [true, true]].map(([sprinting, marble]): Case => ({
    name: `old footstep(${sprinting},${marble})`,
    site: 'bang(.05,sprinting?.09:.06,marble?2400:700,marble?600:0);\n  if(marble)blip(rnd(800,1000),.05,"sine",.02);',
    vars: { sprinting, marble },
    module: () => OW.oldFootstep(sprinting, marble),
  })),
  { name: "old jump", site: 'blip(140,.06,"sine",.04,90)', module: OW.oldJump },
  { name: "playerHurt", site: 'bang(.1,.3,700);blip(90,.2,"sawtooth",.12,40);', module: WO.playerHurt },
  { name: "old lockedDoor", site: "growl(80,.3,.25,true)", module: OW.oldLockedDoor },
  { name: "old itemPickup", site: 'blip(330,.14,"sine",.1,210,true);gurgle(.12,.12);', module: OW.oldItemPickup },
  { name: "old exitOpens", site: 'blip(120,.7,"sine",.09,90,true);growl(70,.4,.2,true);', module: OW.oldExitOpens },
  { name: "gauntletBegins", site: 'blip(70,1,"sawtooth",.15,40,true);', module: WO.gauntletBegins },
  { name: "gauntletCleared", site: 'blip(523,.3,"sine",.1,1046,true);', module: WO.gauntletCleared },
  { name: "old bulletHitsProp", site: "bang(.04,.12,1500,300)", module: OW.oldBulletHitsProp },
  { name: "ricochetRoll + old bulletRicochet", site: "if(Math.random()<.3)bang(.03,.08,4000,800);", module: () => { if (WO.ricochetRoll()) OW.oldBulletRicochet(); }, maySkip: true },
  { name: "old propBreaks", site: "bang(.12,.32,1200);bang(.08,.2,500);", module: OW.oldPropBreaks },
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
    const outcomes = new Set(SEEDS.map((seed) => recordModuleSound(() => { if (WO.ricochetRoll()) OW.oldBulletRicochet(); }, seed).length > 0));
    expect([...outcomes].sort()).toEqual([false, true]);
  });
});

describe("round 1's six firearm reports (the board's old ones) are gunshot() at their profile", () => {
  it.each([0, 1, 2, 3, 4, 6])("slot %i", (slot) => {
    expectCallLogEqual(recordModuleSound(P.OLD_FIRE[slot], 7), recordModuleSound(() => P.gunshot(P.OLD_REPORTS[slot]), 7), `slot ${slot}`);
  });

  it("the game's slots are the eight catalogue reports, in slot order", () => {
    expect(W.WEAPON_FIRE_SOUNDS).toEqual([
      W.flarePistolFire, W.shotgunFire, W.combatRifleFire, W.tommyGunFire, W.sniperFire, W.crossLauncherFire, W.nailCannonFire, W.soulReaperFire,
    ]);
  });
});
