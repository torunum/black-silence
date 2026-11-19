// The native snapshot stores defeated actors. Rebuild their progression
// effects without replaying the death, achievements or combat audio.
(() => {
  const restoreFacts = a_;
  a_ = function (facts) {
    const result = restoreFacts.call(this, facts);
    for (const index of facts.killed) {
      const actor = v.enemies[index];
      if (!actor?.boss || !actor.dead) continue;
      if (!v.exitPos && cR.includes(actor.key)) {
        const [cellX, cellZ] = Xg();
        v.exitPos = { x: (cellX + .5) * P, z: (cellZ + .5) * P };
        YJ(J.scene, gV[T.level]);
      }
      if (actor.key === "G" && T.level === dh.at(-1)) {
        // Run the normal finale on the first unpaused update. A chapter
        // change clears this queue before any callback can fire.
        Xq(() => h9(), 0);
      }
    }
    return result;
  };
})();
