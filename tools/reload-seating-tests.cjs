// Verify the authored Rifle/Tommy seating curves against the immutable native timing tables.
// node tools/reload-seating-tests.cjs before.html after.html report.json
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
assert(process.argv[2]&&process.argv[3]&&process.argv[4],'before, after and report paths required');
const paths=process.argv.slice(2,4).map(p=>path.resolve(p)),out=path.resolve(process.argv[4]);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function resolved(p){let cur=p,tail=[];while(!fs.existsSync(cur)){tail.unshift(path.basename(cur));const parent=path.dirname(cur);assert.notEqual(cur,parent);cur=parent;}return path.join(fs.realpathSync(cur),...tail).toLowerCase();}
for(const p of paths)assert.notEqual(resolved(p),resolved(out),'Report must not overwrite an input');
const inputs=paths.map(file=>({file,text:fs.readFileSync(file,'utf8')}));
for(const input of inputs)input.sha256=hash(input.text);
const K0=(t,a,b)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
const Qe=(t,a,b,r)=>Math.min(K0(t,a,a+r),1-K0(t,b-r,b));
const specs=[{index:2,table:'rc',end:.62,ramp:.13,extractEnd:.23,seat:[.42,.60],suffix:'charge'},
 {index:3,table:'Ac',end:.63,ramp:.14,extractEnd:.24,seat:[.40,.60],suffix:'knob'}];
const changes=[],curves=[];
for(const p of specs){
 const old=`out=t<0?0:Qe(t,.10,${String(p.end).replace('0.','.')},${String(p.ramp).replace('0.','.')}),${p.suffix}=`;
 const next=`out=t<0?0:K0(t,.10,.10+${String(p.ramp).replace('0.','.')})*(1-K0(t,...${p.table}.seat)),${p.suffix}=`;
 assert.equal(inputs[0].text.split(old).length,2,'Unique old curve');assert.equal(inputs[1].text.split(next).length,2,'Unique new curve');changes.push([old,next]);
 const re=new RegExp(p.table+'=\\{[^}]*seat:\\[([^\\]]+)\\]');
 for(const input of inputs)assert.deepEqual(input.text.match(re)[1].split(',').map(Number),p.seat,'Native seat table must stay unchanged');
 const before=t=>t<0?0:Qe(t,.10,p.end,p.ramp),after=t=>t<0?0:K0(t,.10,.10+p.ramp)*(1-K0(t,...p.seat));
 const samples=[];
 for(let i=0;i<=1000;i++){const t=i/1000,a=after(t);assert(a>=0&&a<=1);if(t<=p.seat[0]||t>=p.end)assert.equal(a,before(t),'Extraction and completed seating must stay exact');if(t>=p.seat[1])assert.equal(a,0,'Seated at native event');samples.push({phase:t,before:before(t),after:a});}
 assert.equal(after(-1),0);
 const epsilon=1e-7,joins=[.10,p.extractEnd,...p.seat];
 const continuity=joins.map(t=>{const left=(after(t)-after(t-epsilon))/epsilon,right=(after(t+epsilon)-after(t))/epsilon;assert(Math.abs(left-right)<.0001,'No velocity jump at smoothstep joins');return{phase:t,leftDerivative:left,rightDerivative:right};});
 curves.push({index:p.index,seat:p.seat,continuity,samples});
}
// Verify that both magazine and support hand still consume the same `out` value.
const sharedTransforms=['a.move(m,-.012*out,.065*out,.005*out);m.roll(-.07*out);','a.move(m,-.012*out+.035*charge*chargeReach,.065*out,.005*out);m.roll(-.07*out);','a.move(m,-.025*out,.045*out,.012*out);m.roll(-.13*out);','a.move(m,-.025*out+.035*knob*knobReach,.045*out,.012*out);m.roll(-.13*out);'];
for(const text of sharedTransforms)for(const input of inputs)assert.equal(input.text.split(text).length,2,'Shared contact transform unchanged');
let expected=inputs[0].text;for(const [old,next]of changes)expected=expected.replace(old,next);
assert.equal(inputs[1].text,expected,'This comparison must contain only the two seating-curve changes');
for(const input of inputs)assert.equal(hash(fs.readFileSync(input.file)),input.sha256);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({passed:true,inputs:inputs.map(({text,...meta})=>meta),scope:'Only two authored shared magazine/hand curves changed; native timing, geometry, audio and every other source byte exact. 2002 curve samples and eight C1 joins.',curves},null,2));
console.log('PASS: 2002 samples, eight continuous joins, two shared rigs and exact two-change source scope');
