// Compare immutable model-only candidates around the shared Cross loading path.
// Usage: node tools/cross-load-path-tests.cjs before.html after.html report.json
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const args=process.argv.slice(2);assert.equal(args.length,3,'Supply two inputs and one report');
const inputs=args.slice(0,2).map(p=>path.resolve(p)),output=path.resolve(args[2]);
function resolved(p){let q=p,tail=[];while(!fs.existsSync(q)){tail.unshift(path.basename(q));const n=path.dirname(q);assert.notEqual(n,q);q=n;}return path.join(fs.realpathSync(q),...tail).toLowerCase();}
assert(!inputs.some(p=>resolved(p)===resolved(output)),'Output must not overwrite an input');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),texts=inputs.map(p=>fs.readFileSync(p,'utf8')),hashes=texts.map(sha);
const finalVariant=texts[0].includes('a.move(m,-.090*load,-.015*load,-.028*load)')&&texts[1].includes('a.move(m,-.075*load,.010*load,-.028*load)');
const old=finalVariant?'a.move(m,-.090*load,-.015*load,-.028*load)':'a.move(m,-.035*load,.055*load,-.015*load)',next=finalVariant?'a.move(m,-.075*load,.010*load,-.028*load)':'a.move(m,-.090*load,-.015*load,-.028*load)';
assert.equal(texts[0].split(old).length,3);assert.equal(texts[1].split(next).length,3);
assert.equal(texts[0].replaceAll(old,next),texts[1],'Only the paired hand/relic translations may change');
const k='function K0(t,e,n){const o=Math.min(1,Math.max(0,(t-e)/(n-e)));return o*o*(3-2*o)}';
const q='function Qe(t,e,n,o){return Math.min(K0(t,e,e+o),1-K0(t,n-o,n))}';
for(const s of texts){assert.equal(s.split(k).length,2);assert.equal(s.split(q).length,2);assert(s.includes('load=t<0?0:Qe(t,.27,.68,.12)'));}
const envelope=new Function(k+q+';return t=>t<0?0:Qe(t,.27,.68,.12)')();
const oldVector=finalVariant?[-.090,-.015,-.028]:[-.035,.055,-.015],newVector=finalVariant?[-.075,.010,-.028]:[-.090,-.015,-.028],point=(vector,t)=>vector.map(v=>v*envelope(t));
let samples=0;for(let i=0;i<=2000;i++){const t=i/2000,w=envelope(t);assert(w>=0&&w<=1&&Number.isFinite(w));for(const v of[oldVector,newVector])assert(point(v,t).every(Number.isFinite));samples++;}
const endpoints=[-1,0,.27,.68,.88,1].map(t=>{const before=point(oldVector,t),after=point(newVector,t);assert(before.every((v,i)=>v===after[i]));return{phase:t,offset:after};});
const epsilon=1e-7,boundaries=[.27,.39,.56,.68].map(t=>{const left=(envelope(t)-envelope(t-epsilon))/epsilon,right=(envelope(t+epsilon)-envelope(t))/epsilon;assert(Math.abs(left-right)<.0001);return{phase:t,leftSlope:left,rightSlope:right};});
assert.deepEqual(inputs.map(p=>sha(fs.readFileSync(p))),hashes,'Inputs remain immutable');
const report={passed:true,inputs:inputs.map((file,i)=>({file,sha256:hashes[i]})),scope:'Two shared local translations only; exact native envelope, unchanged attach endpoints and timing, finite bounded samples and C1 joins. This is not a visual contact proof.',samples,oldVector,newVector,endpoints,boundaries};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,samples,boundaries:boundaries.length,endpoints:endpoints.length}));
