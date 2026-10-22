// Prepare the native gore shader during chapter loading, before first contact.
// These meshes never enter the world and do not consume gameplay randomness.
(() => {
  const load = rp;
  rp = function (...args) {
    const result = load(...args);
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
