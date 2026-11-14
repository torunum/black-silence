// The module script runs after the standalone HUD markup has been parsed.
// Reuse its original ammo text, separator span and typography on every update.
(() => {
  const health = fp("#hp .num").firstChild;
  const armor = fp("#ar .num").firstChild;
  const ammo = fp("#am .num");
  const magazine = ammo.firstChild;
  const reserve = ammo.querySelector(".sub2").firstChild;
  const weaponName = Jt("wname").firstChild;
  const keys = Jt("keys");
  const bossBar = Jt("bossbar");
  const bossName = Jt("bossname");
  const bossFill = Jt("bossfill");
  const last = { rounds: NaN, spare: NaN };
  const carriedSeals = [];
  const isActiveBoss = enemy => enemy.boss && !enemy.dead && !enemy.dormant;

  m0t = function () {
    const hp = Math.max(0, Math.ceil(T.hp));
    const ar = Math.ceil(T.armor);
    const weapon = Th[T.cur];
    const rounds = T.mag[T.cur];
    const spare = T.ammo[weapon.ammo];
    const reloading = St.wstate === "reload";
    if (last.hp !== hp) {
      health.data = String(hp);
      last.hp = hp;
    }
    if (last.armor !== ar) {
      armor.data = String(ar);
      last.armor = ar;
    }
    if (last.rounds !== rounds) {
      magazine.data = String(rounds);
      last.rounds = rounds;
    }
    if (last.spare !== spare) {
      reserve.data = " | " + spare;
      last.spare = spare;
    }
    if (last.weaponName !== weapon.name || last.reloading !== reloading) {
      weaponName.data = weapon.name + (reloading ? " — RELOADING" : "");
      last.weaponName = weapon.name;
      last.reloading = reloading;
    }
    // The native icon cache records successful draws, so missing images still retry.
    if (last.index !== T.cur) {
      last.index = T.cur;
      last.icon = "w" + T.cur;
    }
    if (R4.icoHp !== "health" || R4.icoAr !== "armor" ||
        R4.icoAm !== weapon.ammo || R4.icoW !== last.icon) {
      d0t(T.cur, weapon.ammo);
    }

    const hasKey = !!T.key;
    const seals = de.def?.seals;
    const count = seals?.length || 0;
    let keysChanged = last.key !== hasKey || carriedSeals.length !== count;
    for (let i = 0; i < count; i++) {
      const seal = seals[i];
      const name = de.seals.has(seal.kind) ? seal.name : null;
      if (carriedSeals[i] !== name) {
        carriedSeals[i] = name;
        keysChanged = true;
      }
    }
    if (keysChanged) {
      carriedSeals.length = count;
      last.key = hasKey;
      const labels = QH();
      const text = hasKey ? "■ RED KEY" + (labels ? "   " + labels : "") : labels;
      if (keys.textContent !== text) keys.textContent = text;
    }

    // Search in native order each time so a waking, dead or replaced actor
    // takes effect immediately. Only displayed primitives survive a map load.
    const boss = !v.cine && v.enemies?.find(isActiveBoss);
    const visible = !!boss;
    if (last.bossVisible !== visible) {
      bossBar.style.display = visible ? "block" : "none";
      last.bossVisible = visible;
    }
    if (!visible) return;
    const phase = boss.priest ? boss.phase : null;
    if (last.bossName !== boss.name || last.phase !== phase) {
      bossName.textContent = boss.name + (boss.priest ? " — PHASE " + phase : "");
      last.bossName = boss.name;
      last.phase = phase;
    }
    const percent = 100 * boss.hp / boss.maxhp;
    if (last.percent !== percent) {
      bossFill.style.width = percent + "%";
      last.percent = percent;
    }
  };
})();
