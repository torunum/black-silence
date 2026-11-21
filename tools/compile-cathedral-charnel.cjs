// Bake the key keeper's carved chantry and its matching sanctuary seal.
// The source image is the approved DreamLoop study seen from the real key tile.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const {PNG} = require("pngjs");
const root = path.resolve(__dirname,"..");
const reference = PNG.sync.read(fs.readFileSync(path.join(root,"assets/cathedral/charnel-vigil-target.png")));
const surfaces = PNG.sync.read(fs.readFileSync(path.join(root,"assets/cathedral/charnel-stone-atlas.png")));
const runtime = path.join(root,"src/cathedral-charnel-tomb.js");
assert.deepEqual([reference.width,reference.height],[1672,941]);
const crop = {x:286, y:147, w:1112, h:607};
const width = 768, height = 448;
const front = {x:1,y:1,w:511,h:278};
const tiles = {end:[516,1,123,122],lid:[643,1,123,122],back:[516,126,123,123],
  body:[520,249,244,88],relief:[1,282,510,160]};
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const mix = (a,b,t) => a+(b-a)*t;

function albedo() {
  const colors = new Map(), texels = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx=crop.x+(x-front.x+.5)*crop.w/front.w,sy=crop.y+(y-front.y+.5)*crop.h/front.h;
    let sampleX=sx,sampleY=sy, art=reference, gain=[1.12,1.095,1.06];
    // Two pre-existing floor sprites occlude the bottom lip in the study.
    // Borrow the neighboring run of the same stone course for those texels.
    if (sy > 708 && sx > 390 && sx < 468) sampleX += 88;
    if (sy > 713 && sx > 1178 && sx < 1255) sampleX -= 83;
    const inFront=x>=front.x&&x<front.x+front.w&&y>=front.y&&y<front.y+front.h;
    const rect=Object.entries(tiles).find(([,r])=>x>=r[0]&&x<r[0]+r[2]&&y>=r[1]&&y<r[1]+r[3]);
    if(!inFront&&rect&&rect[0]==="relief"){
      const [left,top,w,h]=rect[1];
      sampleX=525+(x-left+.5)*621/w; sampleY=428+(y-top+.5)*277/h;
      art=reference;gain=[1.22,1.185,1.14];
    }else if (!inFront&&rect) {
      const [name,[left,top,w,h]]=rect;
      const u=(x-left+.5)/w, v=(y-top+.5)/h, m=surfaces.width/2;
      const sample={end:[6,5,m-12,m-12,.67],lid:[m+5,5,m-10,m-10,.76],
        back:[m+8,m+7,m-16,m-16,.99],body:[9,830,606,169,.99]}[name];
      sampleX=sample[0]+u*sample[2];sampleY=sample[1]+v*sample[3];
      art=surfaces; gain=[sample[4],sample[4],sample[4]];
    } else if(!inFront){ art=surfaces;sampleX=645;sampleY=912;gain=[.9,.9,.9]; }
    if(inFront&&sx>526&&sx<1144&&sy>429&&sy<700){
      // The exposed niche behind the solid effigy and lid has its own basalt.
      // Giving it a clean surface prevents a second, flat effigy appearing side-on.
      const m=surfaces.width/2;
      art=surfaces;sampleX=m+8+(sx-526)*.89;sampleY=m+12+(sy-429)*1.7;
      const shade=.87-.30*clamp((sy-527)/150,0,1);
      gain=[shade*1.05,shade,shade*.93];
    }
    if (inFront&&sx>745&&sx<925&&sy>306&&sy<384)gain=[1.35,1.28,1.13];
    if(inFront&&sx>1115&&sx<1369&&sy>467){
      const spill=clamp(1-Math.hypot((sx-1233)/163,(sy-620)/174),0,1);
      gain=[1.1+.26*spill,1.09+.10*spill,1.05-.04*spill];
    }
    const rgb=[0,0,0], wide=[0,0,0];
    for (const dy of [-.96,0,.96]) for (const dx of [-.7,.7]) {
      const at=(u,v)=>4*(clamp(Math.round(v),0,art.height-1)*art.width+clamp(Math.round(u),0,art.width-1));
      const p=at(sampleX+dx,sampleY+dy), q=at(sampleX+dx*7,sampleY+dy*6);
      for(let c=0;c<3;c++){rgb[c]+=art.data[p+c]/6;wide[c]+=art.data[q+c]/6;}
    }
    const color=rgb.map((v,c)=>clamp(Math.round((v+.5*(v-wide[c]))*gain[c]),0,255));
    const key = (color[0]>>2)*4096+(color[1]>>2)*64+(color[2]>>2);
    let entry = colors.get(key);
    if (!entry) {
      entry = {n:0,sum:[0,0,0],rgb:color,slot:0};
      colors.set(key,entry);
    }
    entry.n++;
    color.forEach((v,c)=>entry.sum[c]+=v);
    texels.push(entry);
  }
  const entries = [...colors.values()];
  for (const e of entries) e.rgb=e.sum.map(v=>v/e.n);
  const boxes = [entries];
  function spread(box) {
    const low=[255,255,255],high=[0,0,0];
    let count=0;
    for (const e of box) {
      count+=e.n;
      for (let k=0;k<3;k++) {low[k]=Math.min(low[k],e.rgb[k]);high[k]=Math.max(high[k],e.rgb[k]);}
    }
    const ranges = high.map((v,i)=>(v-low[i])*[1,.96,.70][i]);
    const axis=ranges.indexOf(Math.max(...ranges));
    return {axis,count,score:box.length===1?-1:ranges[axis]*Math.sqrt(count)};
  }
  while (boxes.length < 256) {
    const rankings = boxes.map(spread);
    const n=rankings.reduce((best,s,i)=>s.score>rankings[best].score?i:best,0);
    const {axis,count}=rankings[n], box=boxes[n].sort((a,b)=>a.rgb[axis]-b.rgb[axis]);
    let sum=0,cut=0;
    while (cut<box.length-1&&sum<count*.5) sum+=box[cut++].n;
    boxes.splice(n,1,box.slice(0,cut),box.slice(cut));
  }
  const palette=Buffer.alloc(boxes.length*3);
  boxes.forEach((box,i)=>{
    const count=box.reduce((s,e)=>s+e.n,0);
    for (let k=0;k<3;k++) palette[i*3+k]=Math.round(box.reduce((s,e)=>s+e.sum[k],0)/count);
    for(const e of box)e.slot=i;
  });
  const runs=[],data=texels.map(e=>e.slot);
  for(let i=0;i<data.length;){
    let repeated=1;
    while(repeated<128&&i+repeated<data.length&&data[i+repeated]===data[i])repeated++;
    if(repeated>=3){runs.push(127+repeated,data[i]);i+=repeated;continue;}
    const start=i++;
    while(i<data.length&&i-start<128&&
      !(i+2<data.length&&data[i]===data[i+1]&&data[i]===data[i+2]))i++;
    runs.push(i-start-1,...data.slice(start,i));
  }
  return {width,height,palette:palette.toString("base64"),albedo:Buffer.from(runs).toString("base64")};
}

// Profiles run along the tracing of the carved stone, in study pixels.
function profile(points,x) {
  if(x<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++)if(x<=points[i][0]){
    const a=points[i-1],b=points[i];
    return mix(a[1],b[1],(x-a[0])/(b[0]-a[0]));
  }
  return points.at(-1)[1];
}
const crown = [[290,699],[299,691],[300,659],[306,647],[308,412],[300,401],[303,380],
  [330,375],[341,333],[359,295],[384,266],[426,240],[453,258],[479,287],[496,319],
  [508,347],[515,369],[535,337],[561,313],[611,285],[686,250],[761,214],[814,185],[835,174],
  [863,192],[916,218],[1000,253],[1071,288],[1110,316],[1144,346],[1160,364],
  [1171,315],[1191,275],[1217,244],[1244,221],[1275,245],[1309,280],[1326,313],
  [1336,351],[1340,367],[1365,370],[1368,388],[1361,407],[1360,636],[1369,662],
  [1373,687],[1391,703]];
const floorEdge = [[290,734],[482,738],[800,742],[1080,746],[1391,749]];
function cylinder(distance,r) {
  return Math.sqrt(Math.max(0,1-(distance/r)**2));
}
function dome(x,y,cx,cy,rx,ry){
  return Math.sqrt(Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2));
}
function segment(x,y,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1], t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
  return Math.hypot(a[0]+t*dx-x,a[1]+t*dy-y);
}
function trace(x,y,points){
  let d=Infinity;
  for(let i=1;i<points.length;i++)d=Math.min(d,segment(x,y,points[i-1],points[i]));
  return d;
}
const orders=[
  [[500,404],[526,365],[564,331],[617,301],[688,268],[755,238],[806,211],[835,193],
   [863,213],[926,244],[996,272],[1062,303],[1111,332],[1142,364],[1164,403]],
  [[341,400],[351,346],[374,302],[399,273],[426,252],[451,274],[476,306],[492,347],[501,392]],
  [[1167,386],[1180,329],[1200,286],[1225,254],[1245,234],[1273,258],[1300,288],[1320,332],[1331,393]]];

function carvingDepth(x,y) {
  if(x>526&&x<1144&&y>429&&y<700)return .060;
  let d=.055;
  for(const line of orders){
    const distance=trace(x,y,line);
    d=Math.max(d,.072+.082*cylinder(distance,22)+.036*cylinder(Math.abs(distance-11),5));
  }
  // Separate round shafts, capitals, plinth courses and the sarcophagus cornice.
  for(const cx of [338,499,1168,1335]){
    const capY=cx>900?394:401, radius=y<capY+24?34:y<635?21:y<662?27:32;
    if(y>capY-24&&y<695&&Math.abs(x-cx)<radius+2){
      d=Math.max(d,.079+.134*cylinder(x-cx,radius));
      if(Math.abs(y-capY+14)<8||Math.abs(y-649)<8||Math.abs(y-673)<8) d+=.031;
    }
  }
  if(y>690) d=Math.max(d,.15+.064*cylinder(y-706,15));
  // Hinged trefoil key bow and beard in the dark upper recess.
  for (const [cx,cy] of [[780,347],[792,334],[795,358]]) {
    const ring=Math.abs(Math.hypot(x-cx,y-cy)-12);
    d=Math.max(d,.066+.071*cylinder(ring,5));
  }
  if(x>805&&x<913&&Math.abs(y-348)<8)d=Math.max(d,.072+.068*cylinder(y-348,8));
  if(x>881&&x<908&&y>=349&&y<374)d=Math.max(d,.112);
  // The votives sit in front of the side lancet, each with its own rounded body.
  if(x>1161&&x<1294&&y>658&&y<696)d=Math.max(d,.205);
  for(const [cx,top,h,r] of [[1192,632,30,10],[1227,607,48,13],[1262,638,26,10]]){
    if(y>=top&&y<top+h&&Math.abs(x-cx)<r)d=Math.max(d,.181+.082*cylinder(x-cx,r));
    if(y<top&&y>top-27)d=Math.max(d,.058+.164*dome(x,y,cx,top-10,4,15));
  }
  return Math.min(.296,d);
}

// Reverse the real perspective camera at (36.8,1,86.48), aimed at the back wall.
// The return depth changes the silhouette at other viewpoints as the player moves.
const yaw=Math.atan2(.2,3.52),pitch=Math.atan2(.52,Math.hypot(.2,3.52));
function sculptPoint(x,y,depth){
  const nx=(2*x/reference.width-1)/.6946296505509666;
  const ny=(1-2*y/reference.height)/1.2348971565350515;
  const horizontal=Math.cos(pitch)-ny*Math.sin(pitch);
  const dx=horizontal*Math.sin(yaw)-nx*Math.cos(yaw);
  const dz=horizontal*Math.cos(yaw)+nx*Math.sin(yaw);
  const dy=Math.sin(pitch)+ny*Math.cos(pitch);
  const ray=(3.52-depth)/dz;
  return [-.2+ray*dx,Math.max(.009,1+ray*dy),-depth];
}
function model(){
  const vertices=[],indices=[];
  function vertex(position,x,y,tile){
    let u,v;
    if(tile){
      const [left,top,w,h]=tiles[tile];
      if(tile==="relief"){x=(x-525)/621;y=(y-428)/277;}
      u=(left+.5+clamp(x,0,1)*(w-1))/width;
      v=1-(top+.5+clamp(y,0,1)*(h-1))/height;
    }else{
      u=(front.x+clamp((x-crop.x)/crop.w,0,1)*front.w)/width;
      v=1-(front.y+clamp((y-crop.y)/crop.h,0,1)*front.h)/height;
    }
    vertices.push([...position,u,v]);
    return vertices.length-1;
  }
  function quad(a,b,c,d){indices.push(a,c,b,a,d,c);}
  function pack() {
    const verts=Buffer.alloc(vertices.length*10), faces=Buffer.alloc(indices.length*2);
    vertices.forEach((v,i)=>{
      for(let a=0;a<3;a++)verts.writeInt16LE(Math.round(v[a]*4096),i*10+a*2);
      verts.writeUInt16LE(Math.round(v[3]*65535),i*10+6);
      verts.writeUInt16LE(Math.round(v[4]*65535),i*10+8);
    });
    indices.forEach((v,i)=>faces.writeUInt16LE(v,2*i));
    return {vertices:verts.toString("base64"),indices:faces.toString("base64")};
  }
  return {vertex,quad,pack};
}
function addSarcophagus(m) {
  // Each cornice has a full top return and carved end face. The narrower socle
  // leaves a real shadow line around the lower steps when seen from the aisle.
  const courses=[
    [.008,1.50,.715,739], [.080,1.55,.751,723], [.127,1.57,.770,703],
    [.146,1.54,.756,695], [.172,1.47,.704,692], [.252,1.43,.687,687],
    [.284,1.47,.718,683], [.316,1.53,.755,678], [.347,1.46,.722,665],
    [.833,1.46,.722,588], [.872,1.49,.744,578], [.894,1.52,.763,571],
    [.915,1.50,.738,568], [.940,1.53,.768,565], [.961,1.581,.806,560],
    [1.035,1.590,.822,550], [1.059,1.565,.799,548]];
  const back=.09;
  function panel(a,b,c,d){m.quad(a,b,c,d);}
  for(let row=1;row<courses.length;row++){
    const lower=courses[row-1],upper=courses[row];
    const face=(course,t)=>{
      const [y,w,z,sourceY]=course;
      const x=(1-2*t)*w;
      const ring=dome(t,y,.50,.62,.072,.166);
      const useRelief=sourceY<700;
      return m.vertex([x,y,-z-(row>8&&row<11?.035*ring:0)],
        mix(529,1142,t),sourceY,useRelief?"relief":undefined);
    };
    let left=[face(lower,0),face(upper,0)];
    for(let i=1;i<=32;i++){
      const t=i/32,right=[face(lower,t),face(upper,t)];
      panel(left[0],right[0],right[1],left[1]);
      left=right;
    }
    for (const side of [-1,1]){
      function end(course,t){
        const [y,w,z]=course;
        return m.vertex([side*w,y,-mix(z,back,t)],side>0?t:1-t,clamp(1-y/1.08,0,1),"end");
      }
      panel(end(lower,0),end(lower,1),end(upper,1),end(upper,0));
    }
    if(row===courses.length-1){
      const [y,w,z]=upper;
      const lid=(t,s)=>m.vertex([(1-2*t)*w,y,-mix(z,back,s)],t,s,"lid");
      panel(lid(0,0),lid(1,0),lid(1,1),lid(0,1));
    }
  }
  return {x0:-1.59,x1:1.59,z0:-.822,z1:-back,y1:1.059,profile:courses.map(course=>course.slice(0,3))};
}

function addEffigy(m){
  const forms=[];
  function carve(sections, centerDepth, topOffset=0) {
    const rings=[],solid=[];
    for(const [sx,top,bottom,radius,offset=0] of sections){
      const x=sculptPoint(sx,494,.61)[0]*.985, hi=sculptPoint(sx,top,.61)[1]+topOffset;
      const lo=Math.max(1.059,sculptPoint(sx,bottom,.61)[1]+topOffset);
      const center=centerDepth+offset;
      solid.push([x,(hi+lo)/2,Math.max(.006,(hi-lo)/2),center,radius]);
      rings.push({x,top,bottom,hi,lo,center,radius,sx});
    }
    const sides=18;
    for(let s=0;s<sides;s++){
      const theta=(s+.5)*2*Math.PI/sides;
      const frontal=Math.sin(theta)>.12;
      const vertex=(r,a)=>{
        const cosine=Math.cos(a),sine=Math.sin(a),t=(1-cosine)/2;
        const y=mix(r.hi,r.lo,t), z=-(r.center+r.radius*sine);
        if(frontal)return m.vertex([r.x,y,z],r.sx,mix(r.top,r.bottom,t),"relief");
        const across=clamp((r.sx-542)/587,.008,.992);
        return m.vertex([r.x,y,z],across,clamp(.49-.38*cosine,.08,.91),"body");
      };
      let left=[vertex(rings[0],s*2*Math.PI/sides),vertex(rings[0],(s+1)*2*Math.PI/sides)];
      for(const r of rings.slice(1)){
        const right=[vertex(r,s*2*Math.PI/sides),vertex(r,(s+1)*2*Math.PI/sides)];
        m.quad(left[0],right[0],right[1],left[1]);left=right;
      }
      // The end discs close the stone even close to the head or feet.
      for(const r of [rings[0],rings.at(-1)]){
        const center=m.vertex([r.x,(r.hi+r.lo)/2,-r.center],.43,.46,"lid");
        m.quad(center,vertex(r,s*2*Math.PI/sides),vertex(r,(s+1)*2*Math.PI/sides),center);
      }
    }
    forms.push(solid);
  }
  // The cushion, mitre and projecting facial profile have separate end silhouettes.
  carve([[540,524,535,.10],[548,512,545,.22],[568,503,547,.27],
    [601,501,547,.28],[620,506,546,.24],[633,521,543,.10]],.415);
  carve([[551,443,450,.028],[564,440,466,.109],[579,437,488,.187],
    [597,435,501,.224],[614,438,504,.221],[627,445,498,.175],[635,460,489,.074]],.44);
  carve([[613,455,490,.115],[625,450,503,.168],[634,455,509,.177],
    [644,451,508,.162],[651,456,500,.136],[657,463,497,.126],
    [665,467,489,.103],[674,469,482,.063],[677,474,479,.027]],.45,.007);
  // Broad shoulders taper into a long mantle, hem and two different stone boots.
  carve([[623,499,534,.111],[640,486,544,.209],[668,480,548,.266],
    [699,472,549,.281],[733,463,548,.281],[761,459,544,.255],
    [788,458,541,.234],[821,468,544,.237],[863,470,546,.233],
    [916,471,547,.216],[957,476,547,.201],[992,476,548,.179],
    [1024,484,548,.158],[1054,493,548,.136],[1082,492,545,.102],
    [1098,492,539,.059]],.415);
  carve([[768,461,480,.041],[779,453,478,.084],[788,446,471,.104],
    [797,444,471,.11],[807,447,469,.099],[816,452,468,.060],[824,460,469,.026]],.503,.005);
  for(const offset of [-.090,.087])carve([[1070,501,540,.055],[1084,492,547,.082],
    [1092,481,545,.085],[1106,468,543,.076],[1113,468,537,.060],
    [1121,474,519,.041],[1126,479,500,.023]],.423+offset);
  return forms;
}

function tomb(){
  const m=model();
  // Adaptive samples keep corners and curled profiles while the simple backstone is sparse.
  const xs = [...new Set([...crown.map(p=>p[0]),...Array.from({length:90},(_,i)=>290+i*12),
    1391,335,499,1168,1335,541,549,610,628,647,777,804,836,1090,1123,1192,1227,1262])].sort((a,b)=>a-b);
  const ys=[0,7,16,27,38,54,72,95,119,146,175,203,231,256,277,297,315,331,344,357,371,
    385,398,411,426,439,452,467,480,493,507,520,536,548,560,574,582];
  let previous;
  for(const x of xs){
    const cornice=profile([[290,700],[299,535],[307,404],[317,270],[342,190],[424,186],
      [610,184],[834,175],[1000,170],[1237,164],[1328,161],[1348,229],
      [1364,384],[1373,683],[1391,704]],x);
    const top=Math.min(profile(crown,x),cornice),bottom=profile(floorEdge,x),column=[];
    const add=(sy,d)=>m.vertex(sculptPoint(x,sy,d),x,sy);
    column.push(add(top,.011));
    for(const t of ys){
      const y=mix(top,bottom,t/582);
      const stoneLip = y<cornice+47 ? .085+.061*cylinder(y-cornice-10,11):.044;
      column.push(add(y,Math.max(stoneLip,carvingDepth(x,y))));
    }
    column.push(add(bottom,.011));
    if(previous)for(let j=1;j<column.length;j++)m.quad(previous[j-1],column[j-1],column[j],previous[j]);
    if(!previous||x===xs.at(-1)){
      for(let j=2;j<column.length-1;j++){
        const a=mix(top,bottom,ys[j-2]/582),b=mix(top,bottom,ys[j-1]/582);
        m.quad(column[j-1],column[j],add(b,.011),add(a,.011));
      }
    }
    previous=column;
  }
  const plinth=addSarcophagus(m),effigy=addEffigy(m);
  return {...m.pack(),plinth,effigy};
}
function seal(){
  const m=model(),loops=[];
  const cx=836,cy=631;
  // The quatrefoil is raised out of a hammered bronze edge, with a dark keyway.
  for(const [fraction,depth] of [[.015,.110],[.33,.122],[.72,.130],[.88,.122],[.98,.099],[1,.083],[1,.034]]){
    const ring=[];
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16;
      const radius=fraction*(.175+.037*Math.cos(4*a));
      const x=Math.cos(a)*radius,y=Math.sin(a)*radius*1.06;
      ring.push(m.vertex([x,y,depth+(i%2)*.001],cx+x*218,cy-y*214,"relief"));
    }
    if(loops.length)for(let i=0;i<32;i++){
      const next=(i+1)%32,old=loops.at(-1);
      m.quad(old[i],old[next],ring[next],ring[i]);
    }
    loops.push(ring);
  }
  return m.pack();
}

const sculpture={...albedo(),tomb:tomb(),seal:seal()};
const source=fs.readFileSync(runtime,"utf8");
const slot=/\/\* CHARNEL_SCULPTURE_BEGIN \*\/[\s\S]*?\/\* CHARNEL_SCULPTURE_END \*\//;
assert(slot.test(source),"Missing Cathedral sculpture slot");
fs.writeFileSync(runtime,source.replace(slot,()=>`/* CHARNEL_SCULPTURE_BEGIN */ ${JSON.stringify(sculpture)} /* CHARNEL_SCULPTURE_END */`));
console.log("Baked Cathedral chantry",sculpture.width,sculpture.height,
  "texels;",Buffer.from(sculpture.tomb.indices,"base64").length/6,"tomb triangles");
