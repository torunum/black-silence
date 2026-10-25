// Bounded module contract tests; no browser or production HTML mutation.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sourcePath = path.resolve(process.argv[2] || path.join(__dirname, '../src/render-warmup.js'));
const source = fs.readFileSync(sourcePath, 'utf8');
const checks = [];
function rig(poses = { pain: 2, atk: 3 }, fail = false) {
  return { rig: { poses }, calls: [], frames: new Map(), tex(action, frame, mask) {
    this.calls.push([action, frame, mask]);
    if (fail && frame === 1) throw new Error('optional bake failure');
    const key = `${action}${frame}:${mask}`;
    if (!this.frames.has(key)) this.frames.set(key, { key });
    return this.frames.get(key);
  } };
}
function context(enemies, load) {
  const c = { rp: load, v: { enemies }, wk: e => e.rig, Vu: (r, a) => r.poses[a], J: {}, Math: Object.create(Math) };
  c.Math.random = () => { throw new Error('unexpected gameplay RNG'); };
  vm.runInNewContext(source, c, { filename: sourcePath });
  return c;
}
const a = rig(), b = rig({ pain: 1 }), token = {}, args = ['chapter', 4];
const actors = [{ rig: a, hp: 88, x: 4 }, { rig: a, hp: 72, x: 8 }, { rig: b, hp: 90, x: 12 }];
const state = JSON.stringify(actors.map(({ hp, x }) => ({ hp, x })));
let forwarded;
const c = context(actors, (...value) => { forwarded = value; return token; });
assert.equal(c.rp(...args), token);
assert.deepEqual(forwarded, args);
assert.equal(a.calls.length, 5); assert.equal(b.calls.length, 1);
assert.equal(a.frames.size, 5); assert.equal(b.frames.size, 1);
assert.equal(JSON.stringify(actors.map(({ hp, x }) => ({ hp, x }))), state);
checks.push('native return/arguments; five frames per unique present rig; pose bounds; gameplay state/RNG preserved');
const cached = [...a.frames.values()]; c.rp(...args);
assert.deepEqual([...a.frames.values()], cached); assert.equal(a.frames.size, 5);
checks.push('global native cache objects reused on repeated load');
const broken = rig(undefined, true), healthy = rig();
const fallback = context([{ rig: broken }, { rig: broken }, { rig: healthy }], () => token);
assert.equal(fallback.rp(), token);
assert.equal(broken.calls.length, 2); assert.equal(broken.frames.size, 1);
assert.equal(healthy.frames.size, 5);
checks.push('throwing optional rig retains partial cache, deduplicates and continues next unique rig');
const nativeError = new Error('native load failure');
const failure = context([{ rig: healthy }], () => { throw nativeError; });
assert.throws(() => failure.rp(), e => e === nativeError);
assert.equal(healthy.calls.length, 5);
checks.push('native load exceptions still propagate; no warmup after failed load');
console.log(JSON.stringify({ pass: true, sourcePath, sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'), checks }, null, 2));
