/**
 * The 20 achievements, deferred from Plan 0A and built here in Plan 0C
 * Task 4.
 *
 * Unlike every other content table in src/content and src/world,
 * reference/sonsurum.html has **no achievements table** — all 20 exist only
 * as inline literals at their trigger sites,
 * `ach("punt","FIELD GOAL","Kick an enemy into a wall")`, scattered across
 * kill handlers, the piano, the level-end summary and the secret-room
 * counter. So this table cannot be pinned by a byte-for-byte range
 * comparison the way REF.monologue or REF.levels are. What pins it instead
 * is tests/content/achievements.test.ts, which re-extracts all 20 triples
 * from the reference by regex and asserts this table reproduces them
 * exactly, and that every `ach(...)` call site in src/legacy.js names an id
 * this table defines — a typo'd id would otherwise produce a toast with no
 * text at all.
 *
 * Entry order is the reference's own call-site order, not alphabetical:
 * that ordering is the one fact about these strings the reference actually
 * records, and it reads as a rough progression (first kills, then the
 * bosses, then the odd corners).
 *
 * Every string is content, copied verbatim — including the typographic
 * quirks (`70%+`, the apostrophe in HEADSMAN'S HOLIDAY).
 */

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly desc: string;
}

export const ACHIEVEMENTS = {
  redec: { id: "redec", title: "REDECORATOR", desc: "Destroy 15 objects" },
  boot: { id: "boot", title: "PERCUSSIVE DIPLOMACY", desc: "3 kick kills" },
  first: { id: "first", title: "FIRST BLOOD", desc: "The parish notices you" },
  sixty: { id: "sixty", title: "EXTERMINATOR", desc: "60 kills" },
  organ: { id: "organ", title: "ORGAN DONOR", desc: "Gib 10 enemies" },
  behead: { id: "behead", title: "OFF WITH THEIR HEADS", desc: "Decapitate 5 enemies" },
  exec: { id: "exec", title: "HEADSMAN'S HOLIDAY", desc: "Slay the Executioner" },
  guard: { id: "guard", title: "ICONOCLAST", desc: "Fell the Cathedral Guardian" },
  priest: { id: "priest", title: "DEFROCKED", desc: "End the Corrupted Priest" },
  sovereign: { id: "sovereign", title: "NO MORE CROWNS", desc: "End the Bone Sovereign" },
  digger: { id: "digger", title: "FILLED HIS OWN GRAVE", desc: "End the Gravedigger" },
  leviathan: { id: "leviathan", title: "DRAINED", desc: "End the Hollow Leviathan" },
  foreman: { id: "foreman", title: "CLOCKED OUT", desc: "End the Factory Foreman" },
  heart: { id: "heart", title: "STILL LIFE", desc: "Stop the Living Heart" },
  punt: { id: "punt", title: "FIELD GOAL", desc: "Kick an enemy into a wall" },
  gauntlet: { id: "gauntlet", title: "THE GAUNTLET", desc: "Survive the challenge plate" },
  curious: { id: "curious", title: "TRUST ISSUES", desc: "Find 2 secret rooms" },
  pianist: { id: "pianist", title: "NOCTURNE FOR THE DEAD", desc: "Play 12 notes" },
  recital: { id: "recital", title: "RECITAL", desc: "Perform a melody for no one" },
  deadeye: { id: "deadeye", title: "DEADEYE", desc: "Finish a level with 70%+ accuracy" },
} as const satisfies Record<string, Achievement>;

/** Every achievement id, in the reference's own call-site order. */
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as Array<keyof typeof ACHIEVEMENTS>;
