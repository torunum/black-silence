/* HEART_ANIMATION_BEGIN */
// Display the Living Heart's existing wind-up, release and settling poses.
(() => {
  const windupTime = .42, strikeTime = .10, settleTime = .34;
  const states = new WeakMap();
  let activeCast = null;

  // Keep the roots at the original idle stance. Bend the arteries inward and
  // contract the body just before the rig's original forward release.
  function coil(ruptured) {
    const pose = Di({spine:[.018,.015,-.025],chest:[-.055,.035,-.03],neck:[.02,0,.025],
      aL:{f:.14,out:.28,e:.10,w:.14},aR:{f:.08,out:.39,e:.14,w:.22},
      beat:ruptured?-.24:-.70,gape:ruptured?.60:.42});
    pose.rot.elbowL[2] = -.92;
    pose.rot.elbowR[2] = 1.08;
    pose.x.coil = 1;
    return pose;
  }

  const coreRim = E1("chest", "body", ({b,x}) => {
    if (!x("coil")) return;
    const core = Lo(b,1+x("beat")*.06);
    const radius = .09+x("gape")*.08;
    const arcPoint = (angle,edge) => [-.06+Math.cos(angle)*radius*edge, .02+Math.sin(angle)*radius*1.30*edge];
    for (const [near,far] of [[2.38,2.88],[3.08,3.74],[4.12,4.64],[4.88,5.28]]) {
      core.prz([arcPoint(near,.96),arcPoint(near,1.11),arcPoint(far,1.11),arcPoint(far,.96)],-.448,-.443,hh);
    }
  });
  for (const [rig, ruptured] of [[e7,false],[A7,true]]) {
    rig.poses = {...rig.poses, atk:[coil(ruptured), ...rig.poses.atk.slice(1)]};
    rig.parts = [...rig.parts, coreRim];
  }

  const updatePriest = rtt;
  rtt = function(heart, dt, distance, dx, dz) {
    if (heart.key !== "G") return updatePriest(heart, dt, distance, dx, dz);
    let state = states.get(heart);
    if (!state) {
      state = {volleyReset: -Infinity, melee: 0, stride: 0, priestAttack: false};
      states.set(heart, state);
    }
    state.beforeVolley = heart.atkT;
    state.beforeMelee = heart.cool;
    const previous = activeCast;
    activeCast = state;
    try {
      return updatePriest(heart, dt, distance, dx, dz);
    } finally {
      activeCast = previous;
    }
  };

  const updatePose = Yu;
  Yu = function(heart, dt, moving, stopped) {
    if (heart.key !== "G" || heart.dead || heart.dormant)
      return updatePose(heart, dt, moving, stopped);
    const state = states.get(heart);
    if (!state) return updatePose(heart, dt, moving, stopped);
    const casting = state === activeCast;

    // The cast resets atkT exactly when the orbs have already been emitted.
    // Native priest logic never decays atkAnim while it owns the visible AI.
    if (casting) {
      const volley = heart.atkT > state.beforeVolley;
      const melee = heart.cool > state.beforeMelee;
      if (volley) state.volleyReset = heart.atkT;
      if (volley || melee) state.priestAttack = true;
      state.melee = melee ? R_ : Math.max(0, state.melee - dt);
    } else {
      // Outside the caster branch, native AI can still carry the previous
      // attack timer. Let it decay without replaying that attack visually.
      state.volleyReset = -Infinity;
      state.melee = 0;
      if (!(heart.atkAnim > 0)) state.priestAttack = false;
      if (!state.priestAttack) return updatePose(heart, dt, moving, stopped);
    }
    if (stopped || heart.hurt > 0) return updatePose(heart, dt, moving, stopped);

    const rig = wk(heart), mask = Mk(heart), crawling = (mask & wc) !== 0;
    const age = state.volleyReset - heart.atkT;
    const releasing = age >= 0 && age < settleTime;
    let action, frame = 0;
    if (casting && (releasing || state.melee > 0 || heart.atkT <= windupTime)) {
      action = crawling ? "crawlAtk" : "atk";
      if (releasing) frame = age < strikeTime ? 1 : 2;
      else if (state.melee > 0) frame = state.melee > R_ * .6 ? 1 : 2;
    } else if (moving) {
      action = crawling ? "crawl" : "walk";
      const count = Vu(rig.rig, action);
      const interval = rig.rig.walkStep * (crawling ? 1.7 : 1);
      state.stride = (state.stride + dt) % (count * interval);
      frame = Math.min(count - 1, Math.floor(state.stride / interval));
    } else {
      action = crawling ? "crawlIdle" : "idle";
    }
    Ym(heart, rig.tex(action, frame, mask));
  };
})();
/* HEART_ANIMATION_END */
