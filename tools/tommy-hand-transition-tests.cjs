// Check the actual authored hand curves against the native charging interval.
// node tools/tommy-hand-transition-tests.cjs [viewmodels.js] [built.html]
const fs = require('node:fs'), assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || 'src/viewmodels.js', 'utf8');
const html = fs.readFileSync(process.argv[3] || 'THE-BLACK-SILENCE.html', 'utf8');
const body = source.slice(source.indexOf('Ret.draw=function'), source.indexOf('// Cross sections of the oiled walnut stock'));
const reachExpression = body.match(/const knob=[^\n]+,reach=([^;]+);/)[1];
const finishExpression = body.match(/const finish=([^;]+);/)[1];
const native = Function('return (' + html.match(/Ac=({[^}]+})/)[1] + ')')();
const smooth = (t, a, b) => { const x = Math.max(0, Math.min(1, (t-a)/(b-a))); return x*x*(3-2*x); };
const windowCurve = (t, a, b, ramp) => Math.min(smooth(t,a,a+ramp), 1-smooth(t,b-ramp,b));
const curves = Function('t', 'K0', 'Qe', `return [${reachExpression},${finishExpression}];`);
const points = [...body.matchAll(/(?:home|drumContact|stud)=P\(([^)]+)\)/g)].map(m => m[1].split(',').map(Number));
assert.equal(points.length, 3, 'Read the actual foregrip, drum and stud contacts');
const [home, drum, stud] = points;
const position = (reach, finish) => home.map((v,i) => { const grip=v+(drum[i]-v)*reach; return grip+(stud[i]-grip)*finish; });
assert.deepEqual(curves(-1,smooth,windowCurve),[0,0], 'Idle stays at the foregrip');
assert.equal(curves(native.knob[0],smooth,windowCurve)[1],1, 'Hand reaches the stud before native charging starts');
let previous = null;
for (let n=0; n<=1000; n++) {
  const t=n/1000, [reach,finish]=curves(t,smooth,windowCurve), p=position(reach,finish);
  assert(reach>=0 && reach<=1 && finish>=0 && finish<=1, 'Bounded contact blend');
  if (t>=.64 && t<=native.knob[0]) {
    assert.equal(reach,1,'Approach must not detour back toward the foregrip');
    if(previous) assert(finish>=previous,'Approach progresses toward the stud');
    previous=finish;
  }
  if(t<=.64 || t>=.808) {
    const before=position(windowCurve(t,.005,.76,.12),windowCurve(t,.72,.99,.088));
    assert.deepEqual(p,before,'Extraction and late recovery contacts stay exact');
  }
}
assert.deepEqual(position(...curves(.99,smooth,windowCurve)),home,'Recovery returns to the foregrip');
console.log('PASS: 1001 samples; direct approach, native charging contact, unchanged extraction/recovery.');
