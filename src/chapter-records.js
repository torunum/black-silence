// Keep the native chapter result, which freezes before the exit walk begins.
(() => {
  const keyPrefix = "black-silence.chapter-record.v1.";
  const grades = ["D", "C", "B", "A", "S"];
  const memory = new Map();

  function valid(record) {
    return record && grades.includes(record.grade) && Number.isInteger(record.seconds) &&
      record.seconds >= 0 && record.seconds <= 0x7fffffff;
  }

  function read(level) {
    try {
      const text = localStorage.getItem(keyPrefix + level);
      if (text && text.length <= 96) {
        const record = JSON.parse(text);
        if (valid(record)) return record;
      }
    } catch { /* Storage can be disabled for local files. */ }
    return null;
  }

  function best(a, b) {
    if (!a || !b) return a || b;
    return {
      grade: grades.indexOf(a.grade) >= grades.indexOf(b.grade) ? a.grade : b.grade,
      seconds: Math.min(a.seconds, b.seconds),
    };
  }

  function remember(level, result) {
    const stored = read(level);
    const record = best(best(memory.get(level), stored), result);
    memory.set(level, record);
    if (record.grade !== stored?.grade || record.seconds !== stored?.seconds) {
      try { localStorage.setItem(keyPrefix + level, JSON.stringify(record)); }
      catch { /* The current session still has its results. */ }
    }
    return record;
  }

  function recordLine(record) {
    const line = document.createElement("div");
    line.className = "chapter-record";
    const time = Math.floor(record.seconds / 60) + ":" + String(record.seconds % 60).padStart(2, "0");
    for (const [label, value] of [["Best grade", record.grade], ["Best time", time]]) {
      const field = document.createElement("span");
      const number = document.createElement("b");
      number.textContent = value;
      field.append(label + " ", number);
      line.append(field);
    }
    return line;
  }

  function finish(grade, stats, panelId) {
    // Use the formatted time in B6's snapshot. Re-reading the clock on the
    // result card would include the cinematic and could round up a second.
    const time = /\bTIME <b>(\d{1,8}):([0-5]\d)<\/b>/.exec(stats);
    if (!time || !dh.includes(T.level)) return;
    const result = { grade, seconds: Number(time[1]) * 60 + Number(time[2]) };
    if (!valid(result)) return;
    const panel = Jt(panelId);
    panel.querySelector(".chapter-record")?.remove();
    panel.querySelector(".stats").after(recordLine(remember(T.level, result)));
  }

  // A piercing shot can record multiple contacts. Keep those totals for
  // grades and other systems, and cap only the result card's percentage.
  const nativeStats = B6;
  B6 = function (...args) {
    const stats = nativeStats.apply(this, args);
    return T.shots > 0 && T.hitsLanded > T.shots
      ? stats.replace(/ACCURACY <b>\d+%<\/b>/, "ACCURACY <b>100%</b>")
      : stats;
  };

  const exit = fk;
  fk = function (...args) {
    const accepted = exit.apply(this, args);
    if (accepted) finish(oe.grade, oe.stats, "levelend");
    return accepted;
  };

  const victory = h9;
  h9 = function (...args) {
    const result = victory.apply(this, args);
    if (T.level === dh[dh.length - 1] && T.won && !T.dead) {
      finish(Jt("wingrade").textContent, Jt("winstats").innerHTML, "win");
    }
    return result;
  };

  function decorateMenu() {
    const rows = Jt("chaplist").children;
    dh.forEach((level, index) => {
      const row = rows[index];
      if (!row || row.classList.contains("locked")) return;
      const record = best(memory.get(level), read(level));
      row.querySelector(".chapter-record")?.remove();
      if (record) row.append(recordLine(record));
    });
  }

  const showMenu = z1;
  z1 = function (id) {
    if (id === "chapsel") decorateMenu();
    return showMenu.apply(this, arguments);
  };

  // Merge concurrent tab results. Each event contains the original write
  // even if a competing writer has already replaced that key on disk.
  window.addEventListener("storage", event => {
    if (!event.key?.startsWith(keyPrefix) || !event.newValue || event.newValue.length > 96) return;
    const level = dh.find(id => event.key === keyPrefix + id);
    if (level === undefined) return;
    let incoming;
    try { incoming = JSON.parse(event.newValue); } catch { return; }
    if (!valid(incoming)) return;
    remember(level, incoming);
    if (!Jt("chapsel").classList.contains("hidden")) decorateMenu();
  });

  const style = document.createElement("style");
  style.textContent = `
    #chapsel,#levelend,#win {box-sizing:border-box;overflow-y:auto;justify-content:safe center}
    #chapsel > *,#levelend > *,#win > * {flex-shrink:0}
    #chaplist {width:min(32rem,100%);gap:6px;margin-top:22px}
    #chaplist > .mbtn {box-sizing:border-box;width:100%;min-width:0;padding:6px 12px;letter-spacing:.22em}
    .chapter-record {display:flex;justify-content:center;align-items:center;flex-wrap:wrap;
      column-gap:1.6em;row-gap:3px;font:11px/1.4 "Courier New",monospace;letter-spacing:.12em;
      text-transform:uppercase;color:#b1a48c;font-variant-numeric:tabular-nums}
    .chapter-record span {white-space:nowrap}
    .chapter-record b {color:#dfc388;font-weight:bold}
    #chaplist .chapter-record {margin-top:3px}
    #levelend .chapter-record,#win .chapter-record {margin-top:14px;padding:9px 14px 0;
      border-top:1px solid #51442f;max-width:100%;box-sizing:border-box}
    @media(max-width:560px),(max-height:640px) {
      #chapsel,#levelend,#win {padding:16px 12px}
      #chaplist {gap:4px;margin-top:16px}
      #chaplist > .mbtn {font-size:14px;letter-spacing:.14em}
      #chapsel .back {margin-top:16px}
    }`;
  document.head.append(style);
})();
