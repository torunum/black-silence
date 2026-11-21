const fs=require('node:fs'), path=require('node:path'), { PNG }=require('pngjs');
const root=path.resolve(__dirname,'..'), target=PNG.sync.read(fs.readFileSync(path.join(root,'docs/bone-sovereign-nov21/target.png')));
const img=new PNG({width:610,height:480});PNG.bitblt(target,img,630,130,610,480,0,0);
const pieces={
  skull:{ bounds:[151,96,65,73],w:47,h:53,shape:[[151,103],[164,98],[181,100],[204,95],[214,99],[212,124],[214,148],[206,165],[191,168],[177,158],[168,147],[160,119],[153,115]] },
  vault:{bounds:[154,156,113,114],w:48,h:49,shape:[[165,178],[180,170],[194,170],[210,157],[238,159],[259,182],[264,208],[255,231],[240,253],[231,268],[213,257],[193,258],[170,244],[157,219]]},
  vest:{bounds:[63,131,121,108],w:49,h:44,shape:[[64,226],[88,188],[115,147],[136,132],[157,133],[171,128],[176,144],[183,157],[168,172],[153,194],[139,228],[137,239],[122,222],[100,214],[79,218]]},
  stole:{bounds:[242,119,123,219],w:48,h:86,shape:[[242,124],[260,119],[281,125],[297,142],[310,151],[330,154],[348,160],[360,166],[351,182],[347,219],[341,216],[337,250],[331,239],[326,261],[317,257],[318,286],[308,276],[295,327],[279,297],[274,320],[261,285],[254,247],[258,212],[257,173],[248,149]]},
  grip:{bounds:[442,140,55,43],w:32,h:25,shape:[[443,171],[450,156],[460,143],[470,138],[481,142],[492,148],[497,155],[491,163],[486,163],[488,170],[480,175],[472,175],[466,183],[454,179],[445,177]]},
  palm:{bounds:[135,253,69,54],w:39,h:30,shape:[[136,286],[147,276],[151,263],[165,255],[179,253],[174,263],[161,267],[158,280],[167,279],[184,271],[195,260],[202,259],[197,276],[203,274],[198,287],[192,291],[199,289],[188,300],[160,304],[145,304],[136,299]]},
  hem:{bounds:[101,270,177,191],w:69,h:74,shape:[[164,274],[194,268],[245,271],[249,291],[261,336],[263,386],[275,446],[266,448],[256,439],[235,440],[229,454],[207,452],[182,460],[156,452],[136,446],[113,450],[102,448],[120,399],[136,350],[151,303]]}
};
const inside=(x,y,poly)=>poly.reduce((hit,[a,b],i)=>{let [c,d]=poly[(i+1)%poly.length];return (b>y)!=(d>y)&&x<(c-a)*(y-b)/(d-b)+a?!hit:hit},false);
const pool=[],maps={};
for(const [key,part] of Object.entries(pieces)){
  const {bounds:[sx,sy,sw,sh],shape,w,h}=part, pixels=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const X=Math.floor(sx+(x+.5)*sw/w),Y=Math.floor(sy+(y+.5)*sh/h);
    const at=(Y*img.width+X)*4, color=Array.from(img.data.subarray(at,at+3));
    const clear=!inside(X,Y,shape)||(key==='skull'&&Y<109&&Math.max(...color)<44);
    pixels.push(clear?null:color);if(!clear)pool.push(color);
  }
  maps[key]={w,h,pixels};
}
let buckets=[pool];
while(buckets.length<104){
  let at=0,axis=0,best=-1;
  for(let i=0;i<buckets.length;i++){
    const b=buckets[i];if(b.length<2)continue;
    for(let c=0;c<3;c++){
      let lo=255,hi=0;for(const rgb of b){lo=Math.min(lo,rgb[c]);hi=Math.max(hi,rgb[c])}
      const score=(hi-lo)*Math.sqrt(b.length)*[1,1.1,.8][c];if(score>best){best=score;axis=c;at=i}
    }
  }
  if(best<=0)break;const b=buckets[at].sort((a,b)=>a[axis]-b[axis]),half=b.length>>1;
  buckets.splice(at,1,b.slice(0,half),b.slice(half));
}
const colors=buckets.map(b=>[0,1,2].map(c=>Math.round(b.reduce((a,rgb)=>a+rgb[c],0)/b.length)));
const ivory=["0b0909","131316","191a1b","242322","302f2b","3d3c36","4e4d44","626054",
  "757468","8b8a7e","9e9c90","afaea0","c0beb0","ceccbc","dddbc8","ece8d4"];
colors.push(...ivory.map(hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16))));
const output={rgb:Buffer.from(colors.flat()).toString('base64'),pieces:{}};
for(const [key,{w,h,pixels}] of Object.entries(maps)){
  const raw=pixels.map((rgb,ix)=>{if(!rgb)return 0;
    const bone=(key==="vault"||key==="grip"||key==="palm"||(key==="skull"&&ix>=w*13));
    if(bone && rgb[1]>rgb[0]*.52) {
      const lum=Math.min(255,(rgb[0]*.30+rgb[1]*.57+rgb[2]*.13)*1.16);
      let k=0;while(k<15 && lum>(colors[104+k][1]+colors[105+k][1])*.5)k++;
      return 240+k;
    }
    let best=Infinity,at=0;for(const [i,p] of colors.slice(0,104).entries()){
    const ds=(p[0]-rgb[0])**2+1.35*(p[1]-rgb[1])**2+.65*(p[2]-rgb[2])**2;if(ds<best){best=ds;at=i}
  }return at+136});
  output.pieces[key]=[w,h,Buffer.from(raw).toString('base64')];
}

// Encode the native palette indices in groups of eight literals/backreferences.
// The decoder needs no network, image decoder, worker or asynchronous startup.
function compress(bytes) {
  const packed=[], matches=new Map();
  const signature=i=>bytes[i]*65536+bytes[i+1]*256+bytes[i+2];
  for(let pos=0;pos<bytes.length;){
    const flag=packed.length;packed.push(0);
    for(let bit=0;bit<8 && pos<bytes.length;bit++){
      let length=0, distance=0;
      const key=signature(pos), choices=matches.get(key)||[];
      for(let c=choices.length-1;c>=0;c--){
        const off=pos-choices[c];
        if(off>4095)break;
        let n=0;while(n<514 && pos+n<bytes.length && bytes[pos+n]===bytes[pos-off+n])n++;
        if(n>length){length=n;distance=off;}
        if(length===514)break;
      }
      const take=length<3?1:length;
      if(take===1)packed.push(bytes[pos]);
      else{
        packed[flag]|=1<<bit;
        packed.push(distance&255,((distance>>8)<<4)|Math.min(15,take-3));
        if(take>=18){
          let extra=take-18;
          while(extra>=255){packed.push(255);extra-=255;}
          packed.push(extra);
        }
      }
      for(let i=pos;i<pos+take;i++){
        if(i+2>=bytes.length)continue;
        const k=signature(i),seen=matches.get(k)||[];
        if(!seen.length)matches.set(k,seen);
        seen.push(i);if(seen.length>40)seen.shift();
      }
      pos+=take;
    }
  }
  return Buffer.from(packed).toString("base64");
}

const {chromium}=require("playwright"),{pathToFileURL}=require("node:url"),os=require("node:os");
const source=fs.readFileSync(path.join(root,"src/bone-sovereign.js"),"utf8");
const runtime=fs.readFileSync(path.join(root,"THE-BLACK-SILENCE.html"),"utf8")
  .replace(/\/\* BONE_SOVEREIGN_ART_BEGIN \*\/[\s\S]*?\/\* BONE_SOVEREIGN_ART_END \*\//g,"")
  .replace(/\/\* BONE_SOVEREIGN_BEGIN \*\/[\s\S]*?\/\* BONE_SOVEREIGN_END \*\//g,"");
const startup="Jk();ju();Yy();X$(J$);D0t();", paintRow="const boneSovereignPaint="+JSON.stringify(output)+";";
if(runtime.split(startup).length!==2)throw Error("Unknown game startup");
const probe=`window.renderSovereignFrames=()=>{
  const result={};
  for(const rig of [vG,QG]){
    const lut=rig.palette.lut,byColor=new Map();
    const rgba=(a,i)=>((a[i]*256+a[i+1])*256+a[i+2])*256+a[i+3];
    for(let i=0;i<256;i++)byColor.set(rgba(lut,i*4),i);
    byColor.set(0,0);
    const actions=["idle","walk","atk","pain","die","regalCast"];
    if(rig===vG)actions.push("regalFan");
    const frames={};result[rig.key]=frames;
    for(const action of actions)for(let i=0;i<Vu(rig,action);i++){
      const bmp=X7(rig,tz(rig,action,i),0,false,false), indices=new Uint8Array(bmp.w*bmp.h);
      for(let j=0;j<indices.length;j++){
        const color=rgba(bmp.data,j*4),index=byColor.get(color);
        if(index===undefined)throw Error("Missing palette entry in "+action+i);
        indices[j]=index;
      }
      let text="";for(const byte of indices)text+=String.fromCharCode(byte);
      frames[action+i]=btoa(text);
    }
  }
  return result;
};`;
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sovereign-bake-")),file=path.join(dir,"fixture.html");
  fs.writeFileSync(file,runtime.replace(startup,()=>paintRow+"\nconst boneSovereignFrames={};\n"+source+"\n"+probe+"\n"+startup));
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try{
    const page=await browser.newPage({offline:true});
    page.on("pageerror",error=>console.error(error));
    await page.goto(pathToFileURL(file).href,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>typeof renderSovereignFrames==="function");
    const frames=await page.evaluate(()=>renderSovereignFrames());
    for(const poses of Object.values(frames))for(const [key,raw] of Object.entries(poses))
      poses[key]=compress(Buffer.from(raw,"base64"));
    const artifact=["/* BONE_SOVEREIGN_ART_BEGIN */","// Generated by tools/compile-bone-sovereign.cjs.",
      paintRow,"const boneSovereignFrames="+JSON.stringify(frames)+";","/* BONE_SOVEREIGN_ART_END */",""].join("\n");
    const outputFile=path.join(root,"src/bone-sovereign-art.js");
    if(process.argv.includes("--check")){
      if(fs.readFileSync(outputFile,"utf8").replace(/\r\n/g,"\n")!==artifact)
        throw Error("The generated Sovereign atlas differs from the committed source");
    }else fs.writeFileSync(outputFile,artifact);
    console.log("Verified",Object.values(frames).reduce((n,poses)=>n+Object.keys(poses).length,0),"intact poses;",artifact.length,"bytes");
  }finally{await browser.close();fs.rmSync(file,{force:true});fs.rmdirSync(dir);}
})().catch(error=>{console.error(error);process.exitCode=1;});
