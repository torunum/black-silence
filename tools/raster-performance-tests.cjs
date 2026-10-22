// EXPERIMENTAL: equivalence check for the rejected raster optimization candidate.
// This is not a release regression test. GAME_HTML must explicitly name a
// private candidate artifact containing the experimental raster QA hook.
const fs = require("node:fs"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
if (!process.env.GAME_HTML)
  throw new Error("Set GAME_HTML to an experimental raster candidate HTML");
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      requestAnimationFrame = () => 1;
    });
    await page.goto(
      pathToFileURL(path.resolve(process.env.GAME_HTML)).href + "?qa=1",
    );
    await page.locator("#mNew").click();
    const report = await page.evaluate(() => {
      const q = window.__BLACK_SILENCE_QA;
      if (!q.rasterPerformance)
        throw new Error("Missing raster performance module");
      if (
        !q.rasterPerformance.supported.inverse ||
        !q.rasterPerformance.supported.copy
      )
        throw new Error(
          "Upstream raster signature changed; optimizations correctly fell back to native",
        );
      const cases = [];
      for (const weapon of [0, 1, 2, 4]) {
        cases.push({ name: `weapon-${weapon}-idle`, weapon, pose: q.pose() });
        cases.push({
          name: `weapon-${weapon}-fire`,
          weapon,
          pose: {
            ...q.pose(),
            action: 0.22,
            recoil: 0.3,
            heat: 0.5,
            x: 0.01,
            yaw: 0.07,
          },
        });
        for (const reload of [0.15, 0.45, 0.8])
          cases.push({
            name: `weapon-${weapon}-reload-${reload}`,
            weapon,
            pose: { ...q.pose(), reload },
          });
      }
      for (const drop of [0, 1])
        for (const kick of [0, 0.1, 0.3, 0.55, 0.8])
          cases.push({
            name: `kick-${drop}-${kick}`,
            weapon: 0,
            pose: { ...q.pose(), kick, drop },
          });
      for (let execKind = 0; execKind < 3; execKind++)
        for (const exec of [0.15, 0.32, 0.56, 0.82, 1.1])
          cases.push({
            name: `finisher-${execKind}-${exec}`,
            weapon: 0,
            pose: { ...q.pose(), exec, execKind },
          });
      const previousModel = q.models[999];
      q.models[999] = {
        ...q.models[0],
        draw(mesh, pose) {
          mesh.m.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
          const vertices = [
            [-0.03, -0.03, 0.02],
            [0.03, -0.03, 0.07],
            [0.03, 0.03, 0.07],
            [-0.03, 0.03, 0.02],
          ];
          mesh.face(vertices, [0, 0, pose.empty ? 1 : -1], 24, 1);
          // Verify inverse cache invalidation even when a model edits m directly.
          mesh.inverse();
          mesh.m[3] += 0.02;
          mesh.inverse();
          mesh.m[7] -= 0.01;
          mesh.box(-0.01, -0.01, 0.06, 0.01, 0.01, 0.08, 24, {
            tex: (x, y, z) => Math.sin(x * 90 + y * 60 + z * 40),
          });
        },
      };
      for (const empty of [0, 1])
        cases.push({
          name: `near-clip-${empty ? "back" : "front"}`,
          weapon: 999,
          pose: { ...q.pose(), empty },
        });
      const bytes = (typed) =>
        new Uint8Array(
          typed.buffer,
          typed.byteOffset,
          typed.byteLength,
        ).slice();
      const capture = (test, mode) => {
        q.rasterPerformance.mode(mode);
        q.renderModel(test.weapon, test.pose, 90);
        return {
          rgba: bytes(q.raster.image.data),
          depth: bytes(q.raster.raster.z),
          parts: bytes(q.raster.raster.part),
          anchors: JSON.stringify(q.raster.anchors),
          bounds: JSON.stringify([
            q.raster.raster.x0,
            q.raster.raster.y0,
            q.raster.raster.x1,
            q.raster.raster.y1,
          ]),
        };
      };
      let comparisons = 0;
      try {
        for (const test of cases) {
          const baseline = capture(test, "native");
          for (const mode of ["inverse", "copy", "all"]) {
            const actual = capture(test, mode);
            for (const key of ["rgba", "depth", "parts"]) {
              for (let i = 0; i < actual[key].length; i++)
                if (actual[key][i] !== baseline[key][i])
                  throw new Error(
                    `${test.name}/${mode}: ${key} byte ${i}: ${actual[key][i]} != ${baseline[key][i]}`,
                  );
            }
            if (
              actual.anchors !== baseline.anchors ||
              actual.bounds !== baseline.bounds
            )
              throw new Error(`${test.name}/${mode}: anchors or bounds differ`);
            comparisons++;
          }
        }
        return {
          poses: cases.length,
          modeComparisons: comparisons,
          rgbaDepthPartsAnchorsBounds: "byte-identical",
          names: cases.map((test) => test.name),
        };
      } finally {
        q.models[999] = previousModel;
        q.rasterPerformance.mode("all");
      }
    });
    if (errors.length) throw new Error(errors.join("\n"));
    fs.mkdirSync(path.join(root, ".dream-loop"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".dream-loop/raster-parity-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
