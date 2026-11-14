// Bake the commissioned concept's individual carvings into a single offline palette atlas.
// The gate, wall, tunnel, sky, lighting, moving pointers and weapon are separate in-game geometry.
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const root = path.resolve(__dirname, "..");
const source = PNG.sync.read(fs.readFileSync(path.join(root,"assets/monastery/sidereal-target-v1.png")));
if (source.width !== 1672 || source.height !== 941) throw Error("Unexpected monastery concept size");
const texels = new Uint8Array(512*512*4);
const tiles = {};
const left = [[302,492],[318,468],[328,440],[338,424],[325,431],[325,418],[342,395],[365,374],[407,351],[425,354],[437,339],[453,335],[468,343],[476,356],[502,354],[529,363],[557,380],[584,409],[588,432],[575,425],[584,455],[594,474],[601,499],[597,525],[588,542],[590,565],[578,577],[573,595],[562,606],[547,595],[531,612],[508,624],[482,630],[477,650],[467,668],[453,674],[435,667],[427,649],[423,632],[402,627],[381,614],[360,603],[349,612],[339,593],[332,582],[327,555],[315,553],[309,534],[304,518]];
// The concept's first-person weapon covers the bottom of the right bezel.
// Finish that area in cast bronze with the matching unoccluded left carving.
const rightTop = [[1069,499],[1076,470],[1087,452],[1097,432],[1082,442],[1084,426],[1100,401],[1127,378],[1160,360],[1195,354],[1200,331],[1211,336],[1220,344],[1234,332],[1241,331],[1235,354],[1265,358],[1294,371],[1327,395],[1350,424],[1354,445],[1341,434],[1354,462],[1367,483],[1371,508],[1364,536],[1358,555],[1351,575],[1339,599],[1325,612],[1316,598],[1298,612],[1271,628],[1242,634],[1217,635],[1195,633],[1168,628],[1147,613],[1131,608],[1119,597],[1106,609],[1096,591],[1085,573],[1084,555],[1073,548],[1074,526]];
const moon = [[455,486],[465,488],[480,485],[494,475],[501,462],[505,438],[509,431],[515,446],[516,459],[512,476],[503,487],[490,496],[472,500],[459,497]];
const star = [[1258,491],[1264,515],[1282,505],[1273,522],[1294,529],[1270,535],[1279,552],[1263,542],[1257,567],[1252,541],[1235,554],[1243,536],[1220,529],[1241,524],[1231,507],[1252,517]];
function enclosed(x,y,poly) {
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
  }
  return hit;
}
function original(x,y) {
  const p=(Math.round(y)*source.width+Math.round(x))*4;
  return [source.data[p],source.data[p+1],source.data[p+2]];
}
function project(name,bounds,atlas,sample) {
  const [x0,y0,x1,y1]=bounds, [left,top,w,h]=atlas; tiles[name]=atlas;
  for(let row=0;row<h;row++)for(let col=0;col<w;col++) {
    const total=[0,0,0];let count=0;
    for(const oy of [.25,.75])for(const ox of [.25,.75]){
      const x=x0+(col+ox)*(x1-x0)/w, y=y0+(row+oy)*(y1-y0)/h;
      const value=sample(x,y);
      if(value){ for(let c=0;c<3;c++) total[c]+=value[c]; count++; }
    }
    if(count<2)continue;
    const p=((row+top)*512+left+col)*4;
    for(let c=0;c<3;c++)texels[p+c]=Math.min(255,Math.round(total[c]/count*1.22));
    texels[p+3]=255;
  }
}
const arch=[[619,133],[1053,133],[1053,165],[1043,186],[1043,428],[1056,430],[1055,454],[1047,474],[1047,635],[1051,643],[1051,679],[978,679],[978,474],[976,443],[968,419],[951,390],[930,364],[904,338],[873,312],[836,287],[800,312],[768,338],[741,364],[720,390],[705,419],[698,443],[696,475],[696,679],[621,679],[621,642],[626,634],[626,473],[618,454],[618,430],[628,428],[628,186],[619,161]];
project("portal",[615,131,1058,681],[2,2,222,275],(x,y)=>enclosed(x,y,arch)?original((x>836&&y>415)?1672-x:x,y):null);
for(const [name,cx,poly,dst] of [["moonBezel",452,left,226],["starBezel",1220,rightTop,376]]) {
  project(name,[cx-151,330,cx+151,676],[dst,2,134,153],(x,y)=>{
    const dx=x-cx,dy=y-499;
    if(name==="starBezel"&&y>570){x=452+dx;if(!enclosed(x,y,left))return null;}
    else if(!enclosed(x,y,poly))return null;
    // Remove the fixed hub and hand from the painted disk. Rotating reliefs occupy this socket.
    if(dx*dx+dy*dy<83*83 && ((name==="moonBezel"&&dx>0&&dy<5)||(name==="starBezel"&&dx>0&&dy>-12))){
      x=cx-dx; y=499-dy;
    }
    const rgb=original(x,y);
    if(dx*dx+dy*dy<79*79){
      const lum=.30*rgb[0]+.56*rgb[1]+.14*rgb[2];
      return [lum*.55,lum*.72,lum*.89];
    }
    return rgb;
  });
}
project("moonHand",[453,429,518,502],[227,158,46,51],(x,y)=>enclosed(x,y,moon)?original(x,y):null);
project("starHand",[1218,490,1296,569],[276,158,49,49],(x,y)=>enclosed(x,y,star)?original(x,y):null);
// Quantise by recursive median cut. Hot samples retain the silver/gold separation,
// while transparent texels all use palette entry 0, which makes the atlas small.
const hist=new Map();
for(let i=0;i<texels.length;i+=4)if(texels[i+3]){
  const key=(texels[i]>>2)*4096+(texels[i+1]>>2)*64+(texels[i+2]>>2);
  const h=hist.get(key)||{n:0,sum:[0,0,0]};
  h.n++;for(let c=0;c<3;c++)h.sum[c]+=texels[i+c];hist.set(key,h);
}
let boxes=[[...hist].map(([key,data])=>({key,n:data.n,rgb:data.sum.map(c=>c/data.n)}))];
function span(box){
  const min=[255,255,255],max=[0,0,0];let n=0;
  for(const p of box){n+=p.n; for(let i=0;i<3;i++){min[i]=Math.min(min[i],p.rgb[i]);max[i]=Math.max(max[i],p.rgb[i]);}}
  const s=max.map((m,i)=>(m-min[i])*[.88,1,.76][i]); return {axis:s.indexOf(Math.max(...s)),score:Math.max(...s)*Math.sqrt(n),n};
}
while(boxes.length<255){
  let best=-1,rank=0;
  boxes.forEach((b,i)=>{if(b.length>1){const v=span(b).score;if(v>rank){rank=v;best=i;}}});
  if(best<0)break;
  const box=boxes[best],{axis,n}=span(box);box.sort((a,b)=>a.rgb[axis]-b.rgb[axis]);
  let cut=0,mass=0;while(cut<box.length-1 && mass<n/2)mass+=box[cut++].n;
  boxes[best]=box.slice(0,cut);boxes.push(box.slice(cut));
}
const palette=[0,0,0],indices=new Map();
for(const [i,box] of boxes.entries()){
  const count=box.reduce((s,b)=>s+b.n,0);
  for(let c=0;c<3;c++)palette.push(Math.round(box.reduce((s,b)=>s+b.rgb[c]*b.n,0)/count));
  for(const p of box)indices.set(p.key,i+1);
}
const packed=[];
for(const [name,[l,t,w,h]] of Object.entries(tiles)){
  const ids=Buffer.alloc(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=((t+y)*512+l+x)*4, key=(texels[p]>>2)*4096+(texels[p+1]>>2)*64+(texels[p+2]>>2);
    ids[y*w+x]=texels[p+3]?indices.get(key):0;
  }
  packed.push([name,l,t,w,h,ids.toString("base64")]);
}
const file=path.join(root,"src/monastery-nov14.js"),js=fs.readFileSync(file,"utf8");
const marker=/\/\* SIDEREAL_ATLAS_BEGIN \*\/.*?\/\* SIDEREAL_ATLAS_END \*\//s;
if(!marker.test(js))throw Error("Missing sidereal atlas injection point");
const data={colors:Buffer.from(palette).toString("base64"),tiles:packed};
fs.writeFileSync(file,js.replace(marker,()=> "/* SIDEREAL_ATLAS_BEGIN */ "+JSON.stringify(data)+" /* SIDEREAL_ATLAS_END */"));
