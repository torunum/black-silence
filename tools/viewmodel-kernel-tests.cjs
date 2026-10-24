// Pixel-equivalence stress test for the RGBA compositor, without a browser.
// Usage: node tools/viewmodel-kernel-tests.cjs baseline.html candidate.html report.json
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const inputs=process.argv.slice(2,4);if(inputs.length!==2)throw Error('Two immutable source/HTML inputs required');
const out=path.resolve(process.argv[4]||'.dream-loop/kernel-parity.json');
if(inputs.some(input=>path.resolve(input).toLowerCase()===out.toLowerCase()))throw Error('Output must not overwrite an input');
const hash=a=>crypto.createHash('sha256').update(a).digest('hex');
const make=file=>{const s=fs.readFileSync(file,'utf8'),a=s.indexOf('  function compositePaintedGloves()'),b=s.indexOf('  const nativePaintedRaster',a);if(a<0||b<0)throw Error('Compositor missing');return{sha256:hash(s),run:new Function('Te','gloveTriangles',`let gloveDepth=null,glovePreviousBounds=null;${s.slice(a,b)};compositePaintedGloves();return glovePreviousBounds;`)};};
const before=make(inputs[0]),after=make(inputs[1]);
let seed=243776,random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
const w=96,h=64,data=new Uint8ClampedArray(13*17*4);for(let i=0;i<data.length;i++)data[i]=(i%4===3?[0,15,16,63,128,254,255][Math.floor(i/4)%7]:random()*255);
const failures=[];
for(let test=0;test<1800;test++){
 const asset={width:13,height:17,data,rearDigit:test%3===0,...(test%4===0?{extend:[.75,.66]}:{})},tri=[];
 for(let t=0;t<1+test%4;t++){
  const magnitude=test%10===0?1e7:test%7===0?.00001:180;
  const p=Array.from({length:3},()=>({x:(random()-.45)*magnitude+32,y:(random()-.45)*magnitude+20,z:.08+random(),u:random()*1.5-.2,v:random()*1.6-.2}));
  if(test%11===0){p[1].y=p[0].y;p[2].y=p[0].y+(test%22?1e-8:0);}
  tri.push({v:p,asset,light:test%5?1:.87});
 }
 const image=new Uint8ClampedArray(w*h*4),z=new Float32Array(w*h);for(let i=0;i<z.length;i++){z[i]=i%3?Infinity:.31;image[i*4]=i%251;image[i*4+3]=i%2?255:128;}
 const te=()=>({image:{data:image.slice()},raster:{z:z.slice(),w,h},ctx:{putImageData(){}}}),A=te(),B=te();
 const ba=before.run(A,tri),bb=after.run(B,tri);if(hash(A.image.data)!==hash(B.image.data)||JSON.stringify(ba)!==JSON.stringify(bb))failures.push({test,triangles:tri.map(x=>x.v)});
}
const report={cases:1800,passed:!failures.length,inputs:inputs.map((input,i)=>({input:path.resolve(input),sha256:i?after.sha256:before.sha256})),failures};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.cases,passed:report.passed,failures:failures.length}));if(failures.length)process.exitCode=1;
