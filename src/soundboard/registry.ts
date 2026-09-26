import * as W from "../audio/sounds/weapons";
import * as M from "../audio/sounds/monsters";
import * as WO from "../audio/sounds/world";
import * as UI from "../audio/sounds/ui";
import * as X from "../audio/sounds/explosions";
import { startBossMusic, stopBossMusic } from "../audio/Ambient";
import { after } from "../core/Timers";
import { ENEMY_DEFS } from "../enemies/EnemyDefs";
import { WEAPON_STATS } from "../weapons/definitions";
import { PREVIOUS } from "./previous";

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
const title = (s: string): string => (s.charAt(0) + s.slice(1).toLowerCase()).replace(/^Bmg /, "BMG ");

/** The `snarl` kinds with a sound of their own (`src/audio/Voice.ts`); every other monster gets the generic moan. */
const ALERT_KINDS = ["C", "A", "L", "j", "n", "k", "q", "R", "y", "s"];

/**
 * Rows for a sound whose pitch comes from a monster's `pain` stat: one row
 * per distinct pitch, named after the first monster in roster order that
 * makes it, with every other monster that makes the identical sound listed
 * underneath — so the list holds each distinct sound once.
 */
function byPitch(kind: "pain" | "death", pitchOf: (p: number) => number, play: (p: number) => void): Entry[] {
  const groups = new Map<number, string[]>();
  for (const k of ROSTER) {
    const pitch = pitchOf(ENEMY_DEFS[k].pain);
    groups.set(pitch, [...(groups.get(pitch) ?? []), k]);
  }
  return [...groups.entries()].map(([pitch, keys]): Entry => {
    const rest = keys.slice(1);
    const bosses = rest.filter((k) => ENEMY_DEFS[k].boss);
    const allBosses = ROSTER.filter((k) => ENEMY_DEFS[k].boss);
    const shared = [
      ...rest.filter((k) => !ENEMY_DEFS[k].boss).map(monsterName),
      ...(bosses.length === allBosses.length ? ["every boss"] : bosses.map(monsterName)),
    ];
    return {
      id: `monster-${kind}-${keys[0]}`,
      name: `${monsterName(keys[0])} ${kind === "pain" ? "hurt" : "dies"}`,
      category: "Monsters",
      detail: `${Math.round(pitch)} Hz voice${shared.length ? ` — same sound: ${shared.join(", ")}` : ""}`,
      play: () => play(ENEMY_DEFS[keys[0]].pain),
    };
  });
}

const ENTRIES: Entry[] = [
  // ---- Weapons
  ...W.WEAPON_FIRE_SOUNDS.map((play, i): Entry => ({
    id: `weapon-fire-${i}`, name: `${title(WEAPON_STATS[i].name)} fires`, category: "Weapons", play,
    detail: W.REBUILT_REPORT_SLOTS.includes(i) ? "rebuilt in feedback round 1: crack, body, thump" : "unchanged from the original game",
  })),
  { id: "weapon-lower", name: "Weapon lowered (switching)", category: "Weapons", play: W.weaponLower },
  { id: "weapon-raise", name: "Weapon raised", category: "Weapons", play: W.weaponRaise },
  { id: "reload-out", name: "Reload: rounds out", category: "Weapons", play: W.reloadOut },
  { id: "reload-in", name: "Reload: rounds in", category: "Weapons", play: W.reloadIn },
  { id: "reload-done", name: "Reload: ready", category: "Weapons", play: W.reloadDone },
  { id: "dry-fire", name: "Dry fire (out of ammo)", category: "Weapons", play: W.dryFire },
  { id: "shotgun-pump", name: "Shotgun pump", category: "Weapons", detail: "300 ms after each shotgun blast", play: W.shotgunPump },
  { id: "casing", name: "Shell casing lands", category: "Weapons", detail: "comes 0.25-0.45 s after the click", play: W.casingTinkle },
  { id: "kick-swing", name: "Kick: swing", category: "Weapons", play: W.kickSwing },
  { id: "kick-impact", name: "Kick: connects", category: "Weapons", play: W.kickImpact },

  // ---- Monsters
  ...ALERT_KINDS.map((k): Entry => ({ id: `monster-alert-${k}`, name: `${monsterName(k)} alert`, category: "Monsters", detail: "when it first sees you", play: () => M.monsterAlert(k) })),
  {
    id: "monster-alert-other", name: "Monster moan (alert)", category: "Monsters", play: () => M.monsterAlert("z"),
    detail: `every other monster: ${ROSTER.filter((k) => !ALERT_KINDS.includes(k) && !ENEMY_DEFS[k].boss).map(monsterName).join(", ")}, and the bosses`,
  },
  ...byPitch("pain", M.painPitch, M.monsterPain),
  ...byPitch("death", M.deathPitch, M.monsterDeath),
  { id: "monster-claw", name: "Monster claws you", category: "Monsters", play: M.monsterClaw },
  { id: "orb-normal", name: "Monster fireball launched", category: "Monsters", detail: "Cacodemon, Cultist, Slaughtaur, Afrit, Reiver, Gargoyle, bosses", play: () => M.orbLaunch("normal") },
  { id: "orb-heavy", name: "Mancubus fireball launched", category: "Monsters", play: () => M.orbLaunch("heavy") },
  { id: "orb-toxic", name: "Toxic spit launched", category: "Monsters", play: () => M.orbLaunch("toxic") },
  { id: "flesh-throw", name: "Flesh torn off and thrown", category: "Monsters", play: M.fleshThrow },
  { id: "flesh-hit", name: "Thrown flesh hits you", category: "Monsters", play: M.fleshHitsPlayer },
  { id: "flesh-splat", name: "Thrown flesh splatters", category: "Monsters", play: M.fleshSplat },
  { id: "screamer", name: "Wailer screams (wakes the dead)", category: "Monsters", play: M.screamerCall },
  { id: "lost-soul-charge", name: "Lost soul charges", category: "Monsters", play: M.lostSoulCharge },
  { id: "hound-lunge", name: "Zombie dog lunges", category: "Monsters", play: M.houndLunge },
  { id: "slam-windup", name: "Brute slam: wind-up", category: "Monsters", play: M.slamWindup },
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
  { id: "boss-wakes", name: "Boss awakens", category: "Monsters", play: M.bossWakes },
  { id: "boss-roar", name: "Boss roars", category: "Monsters", detail: "two growls, 0.2 s apart", play: () => M.bossRoar() },
  { id: "boss-dies", name: "Boss dies", category: "Monsters", play: M.bossDies },
  { id: "priest-vanish", name: "Priest vanishes (teleport out)", category: "Monsters", play: M.priestVanish },
  { id: "priest-appear", name: "Priest appears (teleport in)", category: "Monsters", play: M.priestAppear },
  { id: "priest-summons", name: "Priest calls his flock", category: "Monsters", play: M.priestSummons },
  { id: "shockwave", name: "Shockwave ring", category: "Monsters", play: M.shockwaveRing },
  { id: "debris-warning", name: "Falling debris: warning", category: "Monsters", play: M.debrisWarning },
  { id: "debris-impact", name: "Falling debris: impact", category: "Monsters", play: M.debrisImpact },

  // ---- World
  { id: "step-stone", name: "Footstep (stone)", category: "World", play: () => WO.footstep(false, false) },
  { id: "step-stone-run", name: "Footstep (stone, running)", category: "World", play: () => WO.footstep(true, false) },
  { id: "step-marble", name: "Footstep (marble, level 1)", category: "World", play: () => WO.footstep(false, true) },
  { id: "step-marble-run", name: "Footstep (marble, running)", category: "World", play: () => WO.footstep(true, true) },
  { id: "jump", name: "Jump", category: "World", play: WO.jump },
  { id: "player-hurt", name: "You are hit", category: "World", play: WO.playerHurt },
  { id: "heartbeat", name: "Heartbeat (low health)", category: "World", play: WO.heartbeat },
  { id: "breath", name: "Breathing (low health)", category: "World", play: WO.breath },
  { id: "pickup", name: "Pickup (health, ammo, armour, key, weapon)", category: "World", play: WO.itemPickup },
  { id: "door-stone", name: "Stone door opens", category: "World", play: () => WO.doorOpens(false) },
  { id: "door-flesh", name: "Flesh door opens", category: "World", play: () => WO.doorOpens(true) },
  { id: "door-locked", name: "Locked door (needs the red key)", category: "World", play: WO.lockedDoor },
  { id: "exit-opens", name: "Exit opens", category: "World", play: WO.exitOpens },
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
  { id: "boss-music", name: "Boss music (4 seconds of it)", category: "World", play: () => { startBossMusic(); after(stopBossMusic, 4000); } },
  { id: "gauntlet-begins", name: "Gauntlet plate: the dead come", category: "World", detail: "not placed in any level yet", play: WO.gauntletBegins },
  { id: "gauntlet-cleared", name: "Gauntlet cleared", category: "World", detail: "not placed in any level yet", play: WO.gauntletCleared },

  // ---- UI
  { id: "achievement", name: "Achievement unlocked", category: "UI", play: UI.achievementChime },
  { id: "kick-ready", name: "Kick ready", category: "UI", play: UI.kickReady },
  { id: "smg-assembled", name: "Scrap SMG assembled", category: "UI", play: UI.scrapSmgAssembled },

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
