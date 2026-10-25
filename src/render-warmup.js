// Prepare the native gore shader during chapter loading, before first contact.
// These meshes never enter the world and do not consume gameplay randomness.
(() => {
  const load = rp;
  rp = function (...args) {
    const result = load(...args);
    // Normal attack/pain frames share the native rig cache across chapters.
    // Prepare only intact actors already present in this chapter, while loading;
    // facing is not part of the native pose/frame/sever-mask/mirror cache key.
    const prepared = new Set();
    for (const enemy of v.enemies) {
      const rig = wk(enemy);
      if (!rig || prepared.has(rig)) continue;
      prepared.add(rig);
      try {
        for (const [action, count] of [["pain", 2], ["atk", 3]]) {
          if (!rig.rig?.poses[action]) continue;
          for (let frame = 0; frame < Math.min(count, Vu(rig.rig, action)); frame++)
            rig.tex(action, frame, 0);
        }
      } catch {
        // Optional preparation must not interrupt a successful native load.
        // Keep valid cached frames; remaining frames use the normal lazy path.
      }
    }

    const renderer = J.renderer;
    if (renderer?.compileAsync && J.camera && J.scene) {
      const preview = new kY();
      for (const material of mu) preview.add(new pt(uh, material));
      // Reuse the actual scene's lighting and fog variant. Geometry/materials
      // belong to the native effect pool and must not be disposed here.
      renderer.compileAsync(preview, J.camera, J.scene).catch(() => {
        // Normal lazy compilation remains the fallback on context loss.
      });
    }
    return result;
  };
})();
