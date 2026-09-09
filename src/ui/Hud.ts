import { S } from "../core/State";
import { world } from "../world/WorldState";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { WEAPONS } from "../weapons/WeaponState";
import { el, q } from "./dom";
import type { Enemy } from "../enemies/Enemy";

/**
 * The per-frame HUD painter — health, armour, ammo, weapon name, the key
 * indicator, the kick meter, and the boss bar. `src/ui/HudMessages.ts` is
 * the timed centre-screen message queue and the two damage flashes; this
 * is a different thing with a similar name, the same distinction
 * `src/weapons/WeaponRuntime.ts`/`WeaponState.ts` already draw for
 * themselves in their own doc comments.
 *
 * Moved verbatim from `src/legacy.js`'s "LEVEL END + WIN + HUD" section
 * (formerly lines 140-161; `reference/sonsurum.html` lines 3867-3887).
 * `gradeOf`/`statsHtml`/`endLevel`/`showWin` — the section's other four
 * functions — move separately to `src/ui/LevelEnd.ts`: `hud` calls none of
 * them and nothing calls `hud` except `loop`, so the split is two
 * independent leaves.
 *
 * The boss bar is `hud`'s last eleven lines, not a separate file: the
 * spec's §5 layout lists a `ui/BossBar.ts`, but this plan's file-structure
 * section deliberately does not create it — the boss bar has no state or
 * behavior of its own beyond what `hud` already computes each frame, so it
 * stays here.
 *
 * `document.querySelector`/`getElementById` results are read here through
 * `src/ui/dom.ts`'s `q()`/`el()` (Plan 0F Task 10) rather than bare —
 * `#hp .num`/`#ar .num`'s `.textContent` assignments take `String(...)`
 * where the reference assigns numbers directly; `Node.textContent`'s DOM
 * type is `string | null`, and a plain `HTMLElement` stringifies a number
 * identically, the same reasoning `src/ui/HudMessages.ts`'s
 * `flashDmg`/`flashHoly` already used for `style.opacity`.
 */

/** world.enemies elements, cast for hud's boss-bar lookup. */
type BossEnemy = Pick<Enemy, "boss" | "dead" | "dormant" | "priest" | "phase" | "name" | "hp" | "maxhp">;

export function hud(): void {
  q("#hp .num").textContent=String(Math.max(0,Math.ceil(S.hp)));
  q("#ar .num").textContent=String(Math.ceil(S.armor));
  const w=WEAPONS[S.cur];
  q("#am .num").innerHTML=
    S.mag[S.cur]+'<span class="sub2"> | '+S.ammo[w.ammo]+"</span>";
  el("wname").textContent=
    w.name+(weaponRuntime.wstate==="reload"?" — RELOADING":"");
  el("keys").textContent=S.key?"■ RED KEY":"";
  const kw=el("kickwrap");
  el("kickfill").style.width=(100*(1-S.kickCd/15))+"%";
  el("kicklabel").textContent=
    S.kickCd>0?("KICK "+Math.ceil(S.kickCd)+"s"):"KICK [RMB]";
  kw.classList.toggle("ready",S.kickCd<=0);
  const boss=world.enemies&&(world.enemies as unknown as BossEnemy[]).find(e=>e.boss&&!e.dead&&!e.dormant);
  const bb=el("bossbar");
  if(boss&&!world.cine){bb.style.display="block";
    el("bossname").textContent=
      boss.name+(boss.priest?" — PHASE "+boss.phase:"");
    el("bossfill").style.width=(100*boss.hp/boss.maxhp)+"%";}
  else bb.style.display="none";}
