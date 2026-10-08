import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels/index";
import { THEMES } from "../../src/world/decor/kit";
import { CHECKPOINTS, CHECKPOINT_PIECES, LIT_RADIUS, isCheckpointKind } from "../../src/world/decor/checkpoint";
import { PIECES, SETPIECES, VOCAB, themeOf } from "../../src/world/decor/registry";
import { addPiece, partMaterial, type Parts } from "../../src/world/decor/parts";
import { validateDecor } from "../../src/world/decor/place";
import { findAll, isWalkable } from "../../src/world/analysis";
import { decorCell } from "../../src/world/density";

/**
 * THE CHECKPOINT MARKERS AS DATA (deeper-levels plan, Task 1): one piece per theme in the decor kit, thin and
 * unlit, and a place for one or two in each level, on the way through it. What a marker does in the game —
 * catching, recording, being risen to — is `checkpoints.test.ts`.
 */

const markers = (t: string): string[] => SETPIECES[t as keyof typeof SETPIECES].filter(isCheckpointKind);

describe("the kit has a marker for each theme", () => {
  it("names exactly one for every one of the seven themes, all different, none scattered as clutter", () => {
    const all = THEMES.map((t) => markers(t));
    for (const [i, m] of all.entries()) expect(m, THEMES[i]).toHaveLength(1);
    expect(new Set(all.flat()).size).toBe(7);
    expect(Object.keys(CHECKPOINTS).sort()).toEqual(all.flat().sort());
    expect(Object.keys(CHECKPOINT_PIECES).sort()).toEqual(Object.keys(CHECKPOINTS).sort());
    for (const t of THEMES) for (const v of VOCAB[t]) expect(isCheckpointKind(v.k), `${t}'s clutter must not scatter markers`).toBe(false);
  });

  it("makes each a thin wall piece that is clutter — no shadow, no mass, no light of its own", () => {
    for (const k of Object.keys(CHECKPOINTS)) {
      const p = PIECES[k];
      expect(p.mode, k).toBe("wall");
      expect(p.cls, k).toBe("clutter");
      expect(p.mass, k).toBeUndefined();
      expect(p.light, `${k}: a light added mid-level, or per marker, would be a budget and a hitch`).toBeUndefined();
    }
  });

  it("stands unlit: nothing in a piece is a flame, a lamp's glow or an LED, so the lit state is visibly different", () => {
    for (const k of Object.keys(CHECKPOINTS)) {
      const parts: Parts = new Map();
      addPiece(parts, { k, x: 0, z: 0 });
      const mats = [...parts.keys()].map(partMaterial);
      expect(mats.length, k).toBeGreaterThan(0);
      for (const m of mats) expect(m, `${k} is built of ${m}`).not.toMatch(/flame|lamp|glow|led|coal/);
    }
  });

  it("puts every flame within reach of the piece, in front of the wall, and says something different when it catches", () => {
    const msgs = new Set<string>();
    for (const [k, look] of Object.entries(CHECKPOINTS)) {
      expect(look.anchors.length, k).toBeGreaterThan(0);
      for (const [x, y, z] of look.anchors) {
        expect(Math.abs(x), `${k} flame x`).toBeLessThan(.6);
        expect(y, `${k} flame y`).toBeGreaterThan(.5);
        expect(y, `${k} flame y`).toBeLessThan(2.4);
        expect(z, `${k} flame z (the wall is at -1)`).toBeGreaterThan(-1);
        expect(z, `${k} flame z`).toBeLessThan(-.2);
      }
      expect(look.msg, k).toMatch(/^[A-Z' ]+$/);
      expect(look.msg.length, k).toBeLessThanOrEqual(30);
      msgs.add(look.msg);
    }
    expect(msgs.size).toBe(7);
  });

  it("is reached from a corridor's width and not through a wall", () => {
    // a corridor is one cell (2 units) wide, so its far wall's marker is 2 away; a player across a one-cell wall is at least 3.3 from the marker's cell centre
    expect(LIT_RADIUS).toBeGreaterThanOrEqual(2);
    expect(LIT_RADIUS).toBeLessThan(3.3);
  });
});

describe("the levels place them on the way through", () => {
  /** The cells of a shortest route from the spawn to the exit chamber (or, where the exit is a boss's door, to the farthest cell), doors and the red-key gate passable. */
  function route(i: number): Set<string> {
    const g = LEVELS[i].build().g, [p] = findAll(g, "P"), key = (x: number, z: number) => x + "," + z;
    const prev = new Map<string, string>([[key(p.x, p.z), ""]]), dist = new Map<string, number>([[key(p.x, p.z), 0]]), q: Array<[number, number]> = [[p.x, p.z]];
    for (let h = 0; h < q.length; h++) {
      const [x, z] = q[h];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (prev.has(k) || !isWalkable(g[nz]?.[nx], true)) continue;
        prev.set(k, key(x, z)); dist.set(k, dist.get(key(x, z))! + 1); q.push([nx, nz]);
      }
    }
    const [x0] = findAll(g, "X");
    let goal = x0 ? key(x0.x, x0.z) : "", far = 0;
    if (!goal) for (const [k, d] of dist) if (d > far) { far = d; goal = k; }
    const out = new Set<string>();
    for (let c = goal; c; c = prev.get(c)!) out.add(c);
    return out;
  }

  it("gives each themed level one or two markers, of its own theme's kind, and the prologue (a grave, a pit and a bridge: no kit theme) none", () => {
    expect(LEVELS[0].build().decor!.filter((d) => isCheckpointKind(d.k))).toEqual([]);
    for (let i = 1; i <= 7; i++) {
      const L = LEVELS[i].build(), here = L.decor!.filter((d) => isCheckpointKind(d.k));
      expect(here.length, `level ${i}`).toBeGreaterThanOrEqual(1);
      expect(here.length, `level ${i}`).toBeLessThanOrEqual(i === 2 ? 3 : 2);   // the church, rebuilt, has three: the grand doors, the head of the way down, the way to the chancel
      for (const d of here) expect(markers(themeOf(LEVELS[i].sub)!), `level ${i}`).toContain(d.k);
      expect(validateDecor(L), `level ${i}`).toEqual([]);
    }
  });

  it("stands each within two cells of a shortest route from the spawn to the end, so the player passes it", () => {
    for (let i = 1; i <= 7; i++) {
      const path = route(i), cells = [...path].map((k) => k.split(",").map(Number));
      for (const d of LEVELS[i].build().decor!.filter((s) => isCheckpointKind(s.k))) {
        const c = decorCell(d), near = Math.min(...cells.map(([x, z]) => Math.hypot(x - c.x, z - c.z)));
        expect(near, `level ${i}: ${d.k} at (${c.x},${c.z})`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("is deterministic and draws no dice: the same markers on every build", () => {
    const run = (): string => JSON.stringify(LEVELS.map((l) => l.build().decor!.filter((d) => isCheckpointKind(d.k))));
    expect(run()).toBe(run());
  });
});
