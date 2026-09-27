import * as W from "../audio/sounds/weapons";
import * as F from "../audio/sounds/foley";
import * as M from "../audio/sounds/monsters";
import * as WO from "../audio/sounds/world";
import * as UI from "../audio/sounds/ui";
import * as X from "../audio/sounds/explosions";
import { startBossMusic, stopBossMusic } from "../audio/Ambient";
import { after } from "../core/Timers";
import { ENEMY_DEFS } from "../enemies/EnemyDefs";
import { WEAPON_STATS } from "../weapons/definitions";
import { PREVIOUS } from "./previous";
import { playReload } from "../weapons/Foley";
import { voiceOf } from "../audio/VoiceTable";
import { SURFACES, WALL_MATERIALS, type Surface } from "../audio/Surface";
import { PICKUPS } from "../audio/sounds/pickups";

/**
 * THE SOUND BOARD'S LIST — every distinct sound in the game, by a human
 * name, in the five groups the board shows. Player feedback round 2, Task 1
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * **Every row plays the game's own sound code**, never a copy: each `play`
 * calls a function from `src/audio/sounds/` (the catalogue the game's call
 * sites call) or, for the boss pulse alone, the engine's own
 * `startBossMusic`. (Since player feedback round 2 Task 2 the monster
 * alerts, doors, bells, organ and piano are catalogue functions too —
 * `monsterAlert`, `doorOpens`, … — so each plays at its level.)
 * `tests/soundboard/soundboard.test.ts`
 * checks that every catalogue function appears in a row, and that this
 * folder makes no WebAudio call of its own.
 *
 * **The game never imports this folder** (the same test enforces it), and
 * the board is built by its own Vite config (`vite.soundboard.config.ts`), so
 * none of this is in the game's bundle.
 *
 * ## Old and new
 *
 * From Task 2 on, a row whose sound a task replaced shows two buttons,
 * **old** and **new**, instead of one. The new one is `play` here, because
 * the game's code *is* the new sound. The old one is registered in
 * `./previous.ts` under the row's `id` — see that file for how.
 */

export type Category = "Weapons" | "Monsters" | "World" | "UI" | "Explosions";
export const CATEGORIES: readonly Category[] = ["Weapons", "Monsters", "World", "UI", "Explosions"];

export interface SoundVersion {
  /** "current" when nothing replaced the sound yet; "old"/"new" once a task has. */
  label: "current" | "old" | "new";
  play: () => void;
}

export interface SoundRow {
  /** Stable key: what `./previous.ts` registers an old version under. */
  id: string;
  name: string;
  category: Category;
  /** One line under the name: when the game plays it, or who shares it. */
  detail?: string;
  versions: SoundVersion[];
}

interface Entry { id: string; name: string; category: Category; detail?: string; play: () => void }

/** The game's own words for its monsters, where the enemy table has no name (bosses and three Hexen/Blood monsters do). */
const MONSTER_NAMES: Record<string, string> = {
  z: "Zombie", f: "Fast zombie", g: "Zombie dog", m: "Armoured zombie", t: "Toxic zombie", w: "Crawler",
  s: "Wailer", C: "Cacodemon", A: "Mancubus", L: "Lost soul", j: "Cultist", n: "Ettin", B: "Brute",
};
/** Roster order: common monsters first, then the named ones, then bosses. */
const ROSTER = Object.keys(ENEMY_DEFS).sort((a, b) => rank(a) - rank(b));
function rank(k: string): number {
  const i = Object.keys(MONSTER_NAMES).indexOf(k);
  if (i >= 0) return i;
  return ENEMY_DEFS[k].boss ? 200 : 100;
}
function monsterName(k: string): string {
  if (MONSTER_NAMES[k]) return MONSTER_NAMES[k];
  const n = ENEMY_DEFS[k].name ?? k;
  return n.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
/** How the board names each floor, and where it is (player feedback round 2 Task 5, `src/audio/Surface.ts`). */
const FLOOR_NAME: Readonly<Record<Surface, string>> = {
  stone: "stone", marble: "marble", ash: "ash", flesh: "flesh", metal: "metal grating", water: "water", dirt: "dirt and grass",
};
const FLOOR_WHERE: Readonly<Record<Surface, string>> = {
  stone: "the church, the necropolis", marble: "level 1, the dungeon", ash: "the prologue, in hell", flesh: "the womb",
  metal: "the factory", water: "the sewers", dirt: "the graveyard",
};
const title = (s: string): string => (s.charAt(0) + s.slice(1).toLowerCase()).replace(/^Bmg /, "BMG ");

/** What each report is made of (player feedback round 2 Task 3, src/audio/sounds/weapons.ts), in slot order. */
const FIRE_DETAIL = [
  "hollow pop, a fizz of the flare catching",
  "two barrels, a wide low chesty boom",
  "supersonic crack, tight body, the bolt cycling",
  "rattly .45 thump, fifteen a second",
  "enormous crack, a long rolling tail",
  "launch whoosh and a bell",
  "pneumatic thwack, twenty a second",
  "crackling discharge and a choir sliding down",
];

/**
 * Every enemy's voice (player feedback round 2 Task 4, `src/audio/VoiceTable.ts`),
 * one row per enemy per vocal event, in roster order, so the owner can say
 * "the zombie is wrong": its alert, its pain, its death, and its attack (the
 * melee bark with the claw's rake — the priests have none, they strike in
 * silence). Each row's "old" is what that enemy used to make
 * (`./previous.ts`).
 */
function voiceRows(): Entry[] {
  const rows: Entry[] = [];
  const voiced = (k: string): string => { const v = voiceOf(k); return `${v.family} voice, ${v.f0} Hz`; };
  for (const k of ROSTER) {
    const d = ENEMY_DEFS[k], n = monsterName(k), who = voiced(k);
    rows.push({ id: `monster-alert-${k}`, name: `${n} alert`, category: "Monsters", detail: `when it first sees you — ${who}`, play: () => M.monsterAlert(k) });
    rows.push({ id: `monster-pain-${k}`, name: `${n} hurt`, category: "Monsters", detail: who, play: () => M.monsterPain(k) });
    if (d.boss) rows.push({ id: `boss-dies-${k}`, name: `${n} dies`, category: "Monsters", detail: `${who}, and the crash`, play: () => M.bossDies(k) });
    else rows.push({ id: `monster-death-${k}`, name: `${n} dies`, category: "Monsters", detail: who, play: () => M.monsterDeath(k) });
    if (!d.priest) rows.push({ id: `monster-attack-${k}`, name: `${n} claws you`, category: "Monsters", detail: `its attack bark, and the rake — ${who}`, play: () => M.monsterClaw(k) });
    if (d.fling) rows.push({ id: `flesh-throw-${k}`, name: `${n} tears off its flesh and throws it`, category: "Monsters", play: () => M.fleshThrow(k) });
    if (d.slam) rows.push({ id: `slam-windup-${k}`, name: `${n} slam: wind-up`, category: "Monsters", play: () => M.slamWindup(k) });
    if (d.boss) {
      rows.push({ id: `boss-wakes-${k}`, name: `${n} awakens`, category: "Monsters", detail: "the cinematic's first sound", play: () => M.bossWakes(k) });
      rows.push({ id: `boss-roar-${k}`, name: `${n} roars`, category: "Monsters", detail: "a roar, and a shorter one 0.2 s later", play: () => M.bossRoar(k) });
    }
    if (d.priest) rows.push({ id: `priest-summons-${k}`, name: `${n} calls his flock`, category: "Monsters", detail: "phase 2", play: () => M.priestSummons(k) });
  }
  return rows;
}

const ENTRIES: Entry[] = [
  // ---- Weapons
  ...W.WEAPON_FIRE_SOUNDS.map((play, i): Entry => ({
    id: `weapon-fire-${i}`, name: `${title(WEAPON_STATS[i].name)} fires`, category: "Weapons", play,
    detail: `${FIRE_DETAIL[i]} — rebuilt in feedback round 2`,
  })),
  ...WEAPON_STATS.map((w, i): Entry => ({
    id: `reload-${i}`, name: `${title(w.name)} reloads (the whole ${w.reload} s)`, category: "Weapons",
    detail: "every mechanism sound at the moment the animation shows it; old: the same three clicks for every weapon",
    play: () => playReload(i, w.reload),
  })),
  { id: "weapon-lower", name: "Weapon lowered (switching)", category: "Weapons", play: F.weaponLower },
  { id: "weapon-raise", name: "Weapon raised", category: "Weapons", play: F.weaponRaise },
  { id: "weapon-ready", name: "Weapon arrives in the hands", category: "Weapons", detail: "at the end of the raise", play: F.weaponReady },
  { id: "dry-fire", name: "Dry fire (out of ammo)", category: "Weapons", play: F.dryFire },
  { id: "shotgun-pump", name: "Shotgun pump", category: "Weapons", detail: "300 ms after each shotgun blast: back, and home", play: F.shotgunPump },
  { id: "flare-cock", name: "Flare pistol: hammer thumbed back", category: "Weapons", detail: "after each shot", play: F.flareHammerCock },
  { id: "flare-open", name: "Flare pistol: barrel breaks open", category: "Weapons", play: F.flareOpen },
  { id: "flare-shell-in", name: "Flare pistol: shell pushed in", category: "Weapons", play: F.flareShellIn },
  { id: "flare-shut", name: "Flare pistol: snapped shut", category: "Weapons", play: F.flareShut },
  { id: "shotgun-open", name: "Shotgun: barrels break open", category: "Weapons", play: F.shotgunOpen },
  { id: "shotgun-hulls", name: "Shotgun: spent hulls kicked out", category: "Weapons", play: F.shotgunHullsOut },
  { id: "shotgun-shells-in", name: "Shotgun: two shells in", category: "Weapons", play: F.shotgunShellsIn },
  { id: "shotgun-shut", name: "Shotgun: snapped shut", category: "Weapons", play: F.shotgunShut },
  { id: "rifle-mag-out", name: "Combat rifle: magazine out", category: "Weapons", play: F.rifleMagOut },
  { id: "rifle-mag-in", name: "Combat rifle: magazine in", category: "Weapons", play: F.rifleMagIn },
  { id: "rifle-charge-back", name: "Combat rifle: charging handle back", category: "Weapons", play: F.rifleChargeBack },
  { id: "rifle-charge-forward", name: "Combat rifle: charging handle let fly", category: "Weapons", play: F.rifleChargeForward },
  { id: "tommy-drum-out", name: "Tommy gun: drum out", category: "Weapons", play: F.tommyDrumOut },
  { id: "tommy-drum-in", name: "Tommy gun: drum in", category: "Weapons", play: F.tommyDrumIn },
  { id: "tommy-knob-back", name: "Tommy gun: cocking knob back", category: "Weapons", play: F.tommyKnobBack },
  { id: "tommy-knob-forward", name: "Tommy gun: cocking knob released", category: "Weapons", play: F.tommyKnobForward },
  { id: "sniper-bolt-lift", name: "BMG sniper: bolt handle up", category: "Weapons", detail: "after each shot, and in the reload", play: F.sniperBoltLift },
  { id: "sniper-bolt-back", name: "BMG sniper: bolt drawn back", category: "Weapons", detail: "after each shot, and in the reload", play: F.sniperBoltBack },
  { id: "sniper-bolt-forward", name: "BMG sniper: bolt run forward", category: "Weapons", detail: "after each shot, and in the reload", play: F.sniperBoltForward },
  { id: "sniper-bolt-lock", name: "BMG sniper: bolt locked", category: "Weapons", detail: "after each shot, and in the reload", play: F.sniperBoltLock },
  { id: "sniper-mag-out", name: "BMG sniper: magazine out", category: "Weapons", play: F.sniperMagOut },
  { id: "sniper-mag-in", name: "BMG sniper: magazine in", category: "Weapons", play: F.sniperMagIn },
  { id: "cross-rises", name: "Cross launcher: next cross rises", category: "Weapons", detail: "after each shot", play: F.crossRises },
  { id: "cross-lid-open", name: "Cross launcher: roof opens", category: "Weapons", play: F.crossLidOpen },
  { id: "cross-laid-in", name: "Cross launcher: cross laid in", category: "Weapons", play: F.crossLaidIn },
  { id: "cross-lid-shut", name: "Cross launcher: roof closes", category: "Weapons", play: F.crossLidShut },
  {
    id: "nail-spin", name: "Nail cannon: motor spins up and down", category: "Weapons", detail: "1.5 s of the trigger held, then released",
    play: () => { for (let t = 0; t <= 1500; t += 50) after(() => F.nailCannonSpin(true), t); after(() => F.nailCannonSpin(false), 1550); },
  },
  { id: "nail-hopper-off", name: "Nail cannon: empty hopper off", category: "Weapons", play: F.nailHopperOff },
  { id: "nail-hopper-on", name: "Nail cannon: full hopper on", category: "Weapons", play: F.nailHopperOn },
  { id: "reaper-gutter", name: "Soul reaper: spent core gutters out", category: "Weapons", play: F.reaperGutter },
  { id: "reaper-pluck", name: "Soul reaper: husk plucked out", category: "Weapons", play: F.reaperPluck },
  { id: "reaper-charge", name: "Soul reaper: charge", category: "Weapons", detail: "as the core re-forms after each shot, and as a fresh soul goes in", play: F.reaperCharge },
  { id: "reaper-claws", name: "Soul reaper: claws close", category: "Weapons", play: F.reaperClawsClose },
  { id: "casing", name: "Shell casing lands", category: "Weapons", detail: "comes 0.25-0.45 s after the click", play: W.casingTinkle },
  { id: "kick-swing", name: "Kick: swing", category: "Weapons", detail: "the whoosh — all a kick into the air makes", play: W.kickSwing },
  { id: "kick-impact", name: "Kick: connects with a monster", category: "Weapons", detail: "110 ms after the swing, as the game resolves it", play: () => W.kickImpact("flesh") },
  { id: "kick-impact-stone", name: "Kick: connects with a wall or a prop", category: "Weapons", detail: "old: the same sound as a monster, and a wall made none", play: () => W.kickImpact("stone") },

  // ---- Monsters
  ...voiceRows(),
  { id: "orb-normal", name: "Monster fireball launched", category: "Monsters", detail: "the whoosh, and the Cacodemon's bark (every thrower barks in its own voice)", play: () => M.orbLaunch("normal", "C") },
  { id: "orb-heavy", name: "Mancubus fireball launched", category: "Monsters", play: () => M.orbLaunch("heavy", "A") },
  { id: "orb-toxic", name: "Toxic spit launched", category: "Monsters", detail: "the toxic zombie", play: () => M.orbLaunch("toxic", "t") },
  { id: "flesh-hit", name: "Thrown flesh hits you", category: "Monsters", play: M.fleshHitsPlayer },
  { id: "flesh-splat", name: "Thrown flesh splatters", category: "Monsters", play: M.fleshSplat },
  { id: "screamer", name: "Wailer screams (wakes the dead)", category: "Monsters", play: M.screamerCall },
  { id: "lost-soul-charge", name: "Lost soul charges", category: "Monsters", play: M.lostSoulCharge },
  { id: "hound-lunge", name: "Zombie dog lunges", category: "Monsters", play: M.houndLunge },
  { id: "slam-impact", name: "Brute slam: impact", category: "Monsters", play: M.slamImpact },
  { id: "charge-crash", name: "Executioner's charge hits a wall", category: "Monsters", play: M.chargeCrash },
  { id: "wall-splat", name: "Kicked monster hits a wall", category: "Monsters", play: M.wallSplat },
  { id: "shield-block", name: "Slaughtaur's shield blocks a shot", category: "Monsters", play: M.shieldBlock },
  { id: "plate-hit", name: "Shot rings off armour plating", category: "Monsters", play: M.armourPlateHit },
  { id: "plate-shatter", name: "Armour plating shatters", category: "Monsters", play: M.armourShatter },
  { id: "limb-torn", name: "Limb torn off", category: "Monsters", play: M.limbTorn },
  { id: "decapitation", name: "Head torn off", category: "Monsters", play: M.decapitation },
  { id: "head-bounce", name: "Severed head bounces", category: "Monsters", play: M.headBounce },
  { id: "head-kicked", name: "Severed head kicked", category: "Monsters", play: M.headKicked },
  { id: "gib-burst", name: "Body bursts into gibs", category: "Monsters", play: M.gibBurst },
  { id: "priest-vanish", name: "Priest vanishes (teleport out)", category: "Monsters", play: M.priestVanish },
  { id: "priest-appear", name: "Priest appears (teleport in)", category: "Monsters", play: M.priestAppear },
  { id: "shockwave", name: "Shockwave ring", category: "Monsters", play: M.shockwaveRing },
  { id: "debris-warning", name: "Falling debris: warning", category: "Monsters", play: M.debrisWarning },
  { id: "debris-impact", name: "Falling debris: impact", category: "Monsters", play: M.debrisImpact },

  // ---- World
  ...SURFACES.flatMap((s): Entry[] => [false, true].map((run): Entry => ({
    id: `step-${s}${run ? "-run" : ""}`, name: `Footstep (${FLOOR_NAME[s]}${run ? ", running" : ""})`, category: "World",
    detail: `${FLOOR_WHERE[s]} — every step varies; old: the one stone step${s === "marble" ? " with its ring" : ""}`,
    play: () => WO.footstep(run, s === "marble", s),
  }))),
  ...([[4, "stepping off a ledge", "soft"], [7.4, "from a jump", "jump"], [12, "from a gallery (12 m/s)", "fall"]] as const).map(([v, how, id]): Entry => ({
    id: `landing-${id}`, name: `Landing, ${how}`, category: "World", detail: "scaled by the fall; old: a running footstep", play: () => WO.landing(v, false, "stone"),
  })),
  { id: "jump", name: "Jump", category: "World", play: WO.jump },
  { id: "player-hurt", name: "You are hit", category: "World", play: WO.playerHurt },
  { id: "heartbeat", name: "Heartbeat (low health)", category: "World", play: WO.heartbeat },
  { id: "breath", name: "Breathing (low health)", category: "World", play: WO.breath },
  ...PICKUPS.map(([kind, what]): Entry => ({
    id: `pickup-${kind}`, name: `Pickup: ${what}`, category: "World", detail: "old: one sound for every pickup", play: () => WO.itemPickup(kind),
  })),
  { id: "door-stone", name: "Stone door opens", category: "World", detail: "grinds as long as the door sinks, then settles", play: () => WO.doorOpens("stone") },
  { id: "door-secret", name: "Secret door opens", category: "World", detail: "a piece of the wall: breaks free, grinds heavier", play: () => WO.doorOpens("secret") },
  { id: "door-gate", name: "Red-key gate opens", category: "World", detail: "unbolted, then sinks", play: () => WO.doorOpens("gate") },
  { id: "door-flesh", name: "Flesh door opens", category: "World", play: () => WO.doorOpens("flesh") },
  { id: "door-locked", name: "Locked door (needs the red key)", category: "World", detail: "rattled, and a tone that says no", play: WO.lockedDoor },
  { id: "exit-opens", name: "Exit opens", category: "World", play: WO.exitOpens },
  ...WALL_MATERIALS.map((m): Entry => ({
    id: `bullet-wall-${m}`, name: `Bullet hits a ${m} wall`, category: "World", detail: `${m === "stone" ? "every level but two" : m === "metal" ? "the factory" : "the womb"} — new: a wall hit made no sound but the ricochet`, play: () => WO.bulletHitsWall(m),
  })),
  { id: "bullet-flesh", name: "Bullet hits a monster", category: "World", detail: "new: one thwack per monster per shot, however many pellets", play: () => WO.bulletHitsFlesh() },
  { id: "bullet-prop", name: "Bullet hits a crate or pew", category: "World", play: WO.bulletHitsProp },
  { id: "ricochet", name: "Bullet ricochet", category: "World", detail: "3 in 10 wall hits", play: WO.bulletRicochet },
  { id: "prop-breaks", name: "Crate, pew or chair breaks", category: "World", play: WO.propBreaks },
  { id: "stinger-scream", name: "Ambience: distant scream", category: "World", play: WO.distantScream },
  { id: "stinger-machinery", name: "Ambience: machinery", category: "World", play: WO.machinery },
  { id: "stinger-static", name: "Ambience: static", category: "World", play: WO.staticCrackle },
  { id: "stinger-drip", name: "Ambience: drip", category: "World", play: WO.drip },
  { id: "stinger-random", name: "Ambience: one of the four, at random", category: "World", detail: "what the game does every 8-18 seconds", play: WO.ambientStinger },
  { id: "event-blackout", name: "Event: blackout", category: "World", play: WO.blackout },
  { id: "event-bells", name: "Event: church bells", category: "World", play: WO.churchBells },
  { id: "event-whispers", name: "Event: whispers", category: "World", play: WO.whispers },
  { id: "organ", name: "Organ chord", category: "World", detail: "the priest's phase change, and the piano's recital", play: WO.organSting },
  { id: "piano", name: "Piano key (middle C)", category: "World", play: () => WO.pianoKey(60) },
  { id: "boss-music", name: "Boss music (4 seconds of it)", category: "World", detail: "a beat every 300 ms, as always", play: () => { startBossMusic(); after(stopBossMusic, 4000); } },
  { id: "boss-beat", name: "Boss music: one bar, beat by beat", category: "World", detail: "the kick, the off-beat knock, the bass note on the fourth", play: () => { for (let b = 0; b < 4; b++) after(() => WO.bossBeat(b), b * 300); } },
  { id: "gauntlet-begins", name: "Gauntlet plate: the dead come", category: "World", detail: "not placed in any level yet", play: WO.gauntletBegins },
  { id: "gauntlet-cleared", name: "Gauntlet cleared", category: "World", detail: "not placed in any level yet", play: WO.gauntletCleared },

  // ---- UI
  { id: "achievement", name: "Achievement unlocked", category: "UI", play: UI.achievementChime },
  { id: "kick-ready", name: "Kick ready", category: "UI", play: UI.kickReady },
  { id: "smg-assembled", name: "Scrap SMG assembled", category: "UI", play: UI.scrapSmgAssembled },
  { id: "ui-hover", name: "Menu: pointer on a row", category: "UI", detail: "new — the menus had no sound", play: UI.uiHover },
  { id: "ui-select", name: "Menu: a row chosen", category: "UI", detail: "new — the menus had no sound", play: UI.uiSelect },

  // ---- Explosions
  { id: "boom-barrel", name: "Barrel explodes", category: "Explosions", play: X.barrelExplosion },
  { id: "boom-cross", name: "Holy cross explodes", category: "Explosions", play: X.holyCrossExplosion },
  { id: "boom-afrit", name: "Afrit bursts", category: "Explosions", play: X.afritDeathExplosion },
];

/** Every row, with its old/new pair where `./previous.ts` has registered an old version. */
export const SOUND_ROWS: readonly SoundRow[] = ENTRIES.map(({ play, ...row }) => ({
  ...row,
  versions: PREVIOUS[row.id]
    ? [{ label: "old", play: PREVIOUS[row.id] }, { label: "new", play }]
    : [{ label: "current", play }],
}));
