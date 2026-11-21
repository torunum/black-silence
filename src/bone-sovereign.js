/* BONE_SOVEREIGN_BEGIN */
// Painted reliquary details live on the Sovereign's original articulated rig.
(() => {
  const paint = boneSovereignPaint;
  function bytes(value) {
    const text=atob(value),data=new Uint8Array(text.length);
    for(let i=0;i<text.length;i++)data[i]=text.charCodeAt(i);
    return data;
  }
  const ink = bytes(paint.rgb);
  const pieces = {};
  for (const [name, [w, h, encoded]] of Object.entries(paint.pieces))
    pieces[name] = { w, h, pixels: bytes(encoded) };

  const bone = ae, brass = no, velvet = rh, charcoal = gg, lining = kS;
  const ramp = (list, amb, spec) => ({ ramp:list.split(" "), amb, spec });
  const palette = m0({
    ...IS.materials,
    [bone]:ramp("#171919 #383632 #59594f #78776b #969688 #b9b8a8 #ddd8bf", .38,.18),
    [brass]:ramp("#1d140d #3b291a #5c4026 #805e36 #a67d46 #c79d58 #e6bc78", .36,.4),
    [velvet]:ramp("#10090b #220b10 #371016 #54171f #74252c #913735 #a74a42", .38,.1),
    [charcoal]:ramp("#0d0b0b #171315 #251d1d #352928 #493c35 #5f5044", .38,.08),
    [lining]:ramp("#180a0b #2c0c13 #461117 #64151d #7c232c", .4,.10),
    [Q.TOOTH]:ramp("#41301c #685133 #8e7247 #b5945f #d5b57e #e7ca92", .67,.34),
    [nu]:{ramp:["#2c1b38","#392846","#543d73","#745897","#9f79af"],emissive:true},
  });
  // The software rasterizer supports 256 indexed colors per rig. Slots 17–31
  // hold the lit paint, while the sculpted surfaces still use the material ramps.
  for (let i=0; i<ink.length/3; i++) {
    const rgb=ink.subarray(i*3,i*3+3);
    // Lift the midtones for the cathedral's dim sprite light; deepest gaps remain open.
    const level=Math.max(...rgb), gain=level<17?1:1.19;
    palette.lut.set([...rgb].map(c=>Math.min(255,Math.round(c*gain))).concat(255),(136+i)*4);
  }

  function enamel(b, piece, x0, bottom, x1, top, z, mirror = false) {
    // Front-facing paint follows the joint including pitch and yaw. The ordinary
    // depth buffer keeps fingers, the hovering jaw and the far shoulder ordered.
    const topLeft=b.project(x0,top,z), topRight=b.project(x1,top,z), bottomLeft=b.project(x0,bottom,z);
    const ux=topRight[0]-topLeft[0], uy=topRight[1]-topLeft[1];
    const vx=bottomLeft[0]-topLeft[0], vy=bottomLeft[1]-topLeft[1], det=ux*vy-uy*vx;
    if(det<.05)return;
    const r=b.r, lastX=topRight[0]+vx, lastY=topRight[1]+vy;
    const xMin=Math.max(0,Math.floor(Math.min(topLeft[0],topRight[0],bottomLeft[0],lastX)));
    const yMin=Math.max(0,Math.floor(Math.min(topLeft[1],topRight[1],bottomLeft[1],lastY)));
    const xMax=Math.min(r.w,Math.ceil(Math.max(topLeft[0],topRight[0],bottomLeft[0],lastX)));
    const yMax=Math.min(r.h,Math.ceil(Math.max(topLeft[1],topRight[1],bottomLeft[1],lastY)));
    const depth=b.toCam(x0,top,z)[2], du=b.toCam(x1,top,z)[2]-depth, dv=b.toCam(x0,bottom,z)[2]-depth;
    const part=b.part();
    for(let y=yMin;y<yMax;y++)for(let x=xMin;x<xMax;x++){
      const dx=x+.5-topLeft[0],dy=y+.5-topLeft[1],u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
      if(u<0 || u>=1 || v<0 || v>=1) continue;
      const col=Math.floor(u*piece.w), color=piece.pixels[Math.floor(v*piece.h)*piece.w+(mirror?piece.w-1-col:col)];
      const at=y*r.w+x, zz=depth+du*u+dv*v;
      if(!color || zz>=r.z[at])continue;
      r.col[at]=color; r.z[at]=zz; r.part[at]=part;
    }
    if(xMax>xMin && yMax>yMin){ r.grow(xMin,yMin);r.grow(xMax-1,yMax-1); }
  }

  const wear={tex:Ue(.85,.8,-.75)};
  function head({b}, broken) {
    const size=broken?1.33:1.07;
    b.cbox(-.097*size,-.016*size,-.065*size,.098*size,.157*size,.07*size,.033*size,bone,wear);
    b.cbox(-.124*size,.139*size,-.07*size,.123*size,.186*size,.085*size,.022*size,brass,wear);
    // Three broken points in different planes leave visible gaps above the band.
    for(const [x,tip,height] of [[-.102,-.159,.416],[.004,-.018,.522],[.105,.155,.448]]){
      b.prz([[(x-.043)*size,.190*size],[(x+.038)*size,.190*size],[(x+.024)*size,.294*size],
        [tip*size,height*size],[(x-.011)*size,.307*size]],-.108*size,-.064*size,brass,wear);
      b.prz([[(x-.024)*size,.240*size],[(x-.013)*size,.240*size],[tip*size,height*size]],
        -.113*size,-.108*size,bone);
    }
    enamel(b,pieces.skull,-.138*size,-.065*size,.164*size,.258*size,-.125*size);
    for(const [cx,cy,side] of [[-.030,.100,-1],[.092,.119,1]]){
      b.prz([[(cx-.041)*size,(cy+.024)*size],[(cx+.036)*size,(cy+.032*side)*size],
        [(cx+.026)*size,(cy-.030)*size],[(cx-.033)*size,(cy-.024)*size]],-.138*size,-.131*size,Q.CAVITY);
      b.prz([[(cx-.016)*size,cy*size],[cx*size,(cy+.018)*size],[(cx+.016)*size,cy*size],
        [cx*size,(cy-.014)*size]],-.142*size,-.138*size,IV);
    }
  }
  function chest({b,x}, broken) {
    const s=broken?1.23:1, sway=x("sway");
    b.push();
    for(const side of [-1,1]){
      const edge=side*.39*s;
      b.prz([[0,.38],[side*.32*s,.40],[edge,.30],[side*.41*s,-.22],
        [side*.48*s,-.77-sway*side*.025],[side*.40*s,-.67],[side*.37*s,-.82],[side*.30*s,-.58],[side*.17*s,-.49]],
        .045,.116,lining,wear);
      b.prz([[side*.20*s,.33],[side*.31*s,.32],[side*.39*s,-.38],[side*.36*s,-.53],[side*.32*s,-.24]],
        -.012,.06,lining,wear);
      if(side>0) {
        b.prz([[.26*s,.36],[.49*s,.29],[.54*s,-.02],[.61*s,-.49],[.54*s,-.43],
          [.553*s,-.67],[.47*s,-.57],[.44*s,-.74],[.39*s,-.57],[.32*s,-.13]],
          .012,.085,charcoal,wear);
      }
      const min=side<0?-.55:.135,max=side<0?-.135:.61;
      enamel(b,pieces.stole,min*s,-.59,max*s,.391,-.094,side<0);
    }
    b.cbox(-.20*s,.029,-.09,.20*s,.33,.09,.051,charcoal);
    enamel(b,pieces.vault,-.282*s,-.215,.289*s,.404*s,-.149);
    if(broken) {
      // Ossuary mantle: the two smaller skulls inhabit opposite pauldrons.
      for(const side of [-1,1]) {
        b.push();b.translate(side*.43,.29,-.012);b.roll(-side*.45);xg(Lo(b,.77),Ju);b.pop();
      }
    }
    b.pop();
  }
  function mantle({b},side,broken) {
    const s=broken?1.17:1;
    b.ball(0,0,0,.091*s,velvet,7,wear);
    b.prz([[-.105*s,.037],[.107*s,.05],[.14*s,-.08],[.12*s,-.33],[.035*s,-.21],[-.09*s,-.27]],
      -.029,.087,velvet,wear);
    enamel(b,pieces.vest,-.24*s,-.303*s,.24*s,.124*s,-.105,side>0);
  }
  function hangingSleeve({b,x},side,broken) {
    b.push();
    b.translate(side*.013,-.19,.025);
    // Velvet hangs under the raised elbow. Only the upper pleat inherits the
    // entire shoulder rotation, preventing a rigid spear-like sleeve on release.
    const m=b.m, gravity=.74;
    for(const i of [0,1,2,4,5,6,8,9,10])m[i]+=(Number(i===0||i===5||i===10)-m[i])*gravity;
    b.roll(-side*(.11+x("sway")*.04));
    const width=(broken?.21:.18)*(side>0?1.20:1), drop=(broken?.68:.62)+(side>0?.075:0);
    b.prz([[-width*.7,0],[width*.78,.02],[width,.02-drop*.45],[width*.61,-drop*.88],
      [width*.38,-drop*.7],[-width*.17,-drop],[-width*.54,-drop*.68],[-width,-drop*.33]],
      -.032,.084,lining,wear);
    enamel(b,pieces.stole,-width,-drop,width,.028,-.048,side<0);
    b.pop();
  }
  function jaw({b},broken) {
    const s=broken?1.36:1;
    b.prz([[-.085*s,-.004],[-.070*s,-.063*s],[-.012*s,-.091*s],[.054*s,-.073*s],
      [.084*s,-.009],[.055*s,-.036*s],[.001,-.049*s],[-.054*s,-.032*s]],-.096*s,-.052*s,bone,wear);
    for(const x of [-.047,-.018,.011,.039])
      b.prz([[x*s,-.049*s],[(x+.020)*s,-.052*s],[(x+.013)*s,-.035*s]],-.103*s,-.095*s,bone);
  }
  function openHand({b,x},broken) {
    const s=broken?1.35:1;
    b.cbox(-.044*s,-.083*s,-.031*s,.046*s,.018*s,.035*s,.018*s,bone,wear);
    for(const [i,len] of [.089,.112,.121,.098].entries()) {
      b.push();b.translate((i-1.5)*.025*s,-.071*s,0);b.roll((1.5-i)*.10);
      G(b,0,0,0,-len*s*.7,.014*s,.010*s,bone,5);
      b.translate(0,-len*s*.7,0);b.pitch(-.70);
      G(b,0,0,0,-len*s*.55,.011*s,.006*s,bone,5);b.pop();
    }
    G(b,-.057*s,0,-.028*s,-.072*s,.017*s,.010*s,bone,5);
    b.push();
    b.translate(0,-.093*s,-.024*s);
    const m=b.m;
    for(const i of [0,1,2,4,5,6,8,9,10])m[i]+=(Number(i===0||i===5||i===10)-m[i])*.72;
    enamel(b,pieces.palm,-.055*s,-.056*s,.115*s,.078*s,-.044*s);
    b.pop();
    if(broken && x("cast")>.55) b.ball(.003,-.131*s,-.005,.040,nu,5);
  }
  function forearm({b},side,broken) {
    const len=broken?.42:.32, s=broken?1.33:1;
    b.ball(0,-.008,0,.044*s,bone,6,wear);
    for(const n of [-1,1]){
      b.push();b.translate(n*.023*s,-.012,0);b.roll(n*.044);
      G(b,0,n*.006,0,-len*.86,.024*s,.013*s,bone,6,wear);
      b.ball(0,-len*.89,0,.023*s,bone,5);
      b.pop();
    }
    G(b,0,0,-len*.77,-len*.85,.042*s,.039*s,brass,7,wear);
    b.ball(side*.034*s,-len*.81,-.018,.012*s,charcoal,5);
  }
  function foot({b},broken) {
    const s=broken?1.37:1;
    b.cbox(-.050*s,-.025,-.095*s,.049*s,.036*s,.053*s,.020*s,charcoal);
    for(const [i,length] of [.163,.179,.17,.147].entries()){
      const x=(i-1.5)*.025*s;
      b.cyl(x,-.018,-length*s,-.038*s,.013*s,.010*s,5,bone,wear);
      b.ball(x,-.014,-.105*s,.016*s,bone,5);
    }
  }
  function spine({b},broken) {
    const width=broken?.148:.080;
    b.cbox(-width,.014,-.096,width,.321,.085,.035,charcoal,wear);
    for(let i=0;i<4;i++){
      b.prz([[-width*.72,.032+i*.070],[-width*.84,.062+i*.070],[0,.082+i*.070],
        [width*.75,.068+i*.070],[width*.86,.047+i*.070],[width*.22,.035+i*.070]],-.126,-.09,bone,wear);
    }
  }
  function girdle({b},broken) {
    const s=broken?1.20:1;
    b.cbox(-.169*s,-.060,-.116,.165*s,.059,.09,.025,charcoal,wear);
    b.prz([[-.173*s,.037],[.172*s,.040],[.160*s,.008],[.015,-.025],[-.150*s,.006]],-.141,-.117,brass,wear);
    b.prz([[-.041,.046],[.036,.046],[.026,-.021],[.002,-.054],[-.034,-.010]],-.16,-.139,bone,wear);
  }
  function skirt({b,x},broken) {
    const s=broken?1.24:1;
    for(const side of [-1,1]) {
      b.push();b.roll(side*.025*x("sway"));
      b.prz([[side*.035,0],[side*.168*s,0],[side*.337*s,-.74],[side*.248*s,-.817],[side*.065,-.742]],-.035,.101,charcoal,wear);
      b.pop();
    }
    enamel(b,pieces.hem,-.343*s,-.831,.331*s,-.01,-.175);
  }
  function crozier({b,x},broken) {
    b.cbox(-.045,-.066,-.036,.046,.015,.031,.016,bone,wear);
    for(const offset of [-.031,0,.031])G(b,offset,-.039,-.043,-.104,.015,.008,bone,5);
    b.push();b.translate(0,-.063,0);
    // He retains an upright grip as his elbow turns underneath the crozier.
    // During collapse it follows the wrist so the discarded prop lies with him.
    const upright=Math.max(0,Math.min(1,(b.toCam(0,0,0)[1]-.37)*3.2));
    if(upright>.01) {
      const m=b.m;
      for(const i of [0,1,2,4,5,6,8,9,10])m[i] += ((i===0||i===5||i===10?1:0)-m[i])*upright;
    }
    const margin=(b.r.w-3-b.project(0,0,0)[0])*b.toCam(0,0,0)[2]/b.F;
    const lean=Math.max(-.12,Math.min(.30+x("cast")*.68,(margin-.14)/.89));
    b.roll(lean);
    const lower=broken?-.31:-.83;
    G(b,0,0,lower,.61,.024,.029,brass,7,wear);
    G(b,-.018,-.010,lower+.010,.600,.011,.013,charcoal,6);
    for(const y of (broken?[-.19,.18,.44]:[-.62,-.26,.26,.48]))
      b.prz([[.006,y-.055],[.017,y-.009],[.014,y+.082],[.006,y+.046]],-.032,-.025,Q.TOOTH);
    for(const y of [-.32,.18,.52,.60])G(b,0,0,y,y+.029,.031,.029,brass,6);
    for(const side of [-1,1]){
      if(broken && side<0){
        b.prz([[0,.62],[-.079,.682],[-.093,.753],[-.061,.732],[-.043,.701]],-.021,.023,brass,wear);
        continue;
      }
      b.prz([[0,.62],[side*.082,.686],[side*.115,.784],[side*.039,.847],[0,.938],
        [side*.007,.845],[side*.079,.776],[side*.052,.699]],-.024,.024,brass,wear);
    }
    const glow=x("cast");
    b.prz([[-.044,.744],[.006,.818],[.052,.777],[.014,.699]],-.029,.011,nu);
    if(glow>.6)b.prz([[-.018,.747],[.005,.788],[.014,.773],[.003,.740]],-.034,-.028,IV);
    const grip=broken?1.32:1;
    enamel(b,pieces.grip,-.078*grip,-.062*grip,.064*grip,.064*grip,-.044*grip);
    b.pop();
  }

  function cast(broken) {
    const pose=broken?bi:Ii, crouch=broken?.10:0;
    return [
      pose({spine:[.11,.06,.025],chest:[.08,.07,.03],head:[-.1,-.13,0],jaw:.16,
        aR:{f:.30,out:.41,e:.8,w:0},aL:{f:.36,out:.37,e:1.05},tilt:.37,cast:.15,sway:.25}),
      pose({spine:[.15,.10,.043],chest:[.015,.08,.045],head:[-.06,-.16,-.04],jaw:.23,
        aR:{f:.33,out:1.05,e:.60,w:.05},aL:{f:.45,out:-.17,tw:-.18,e:1.08},tilt:.16,cast:.50,sway:.6,
        lL:{f:.20,k:.37+crouch,out:.12},lR:{f:-.06,k:.23+crouch,out:.18}}),
      pose({spine:[.19,.14,.070],chest:[-.036,.11,.065],head:[-.07,-.17,-.055],jaw:.34,
        aR:{f:.42,out:1.26,e:.45,w:.10},aL:{f:.36,out:-.04,tw:-.19,e:.92},tilt:.10,cast:.86,sway:1,
        lL:{f:.27,k:.47+crouch,out:.16},lR:{f:-.11,k:.24+crouch,out:.2}}),
      pose({spine:[.24,-.15,-.08],chest:[.12,-.13,-.06],head:[-.29,.14,.045],jaw:.60,
        aR:{f:1.13,out:.93,e:.19,w:.03},aL:{f:.90,out:broken?.91:.67,e:.39},tilt:.08,cast:1,sway:-1,
        lL:{f:.27,k:.4+crouch,out:.17},lR:{f:.14,k:.43+crouch,out:.22}}),
      pose({spine:[.16,-.085,-.045],chest:[.075,-.075,-.038],head:[-.17,.14,.03],jaw:.39,
        aR:{f:1.12,out:.56,e:.50},aL:{f:.59,out:.55,e:.74},tilt:.21,cast:.52,sway:-.58}),
      pose({spine:[.08,-.035,-.018],chest:[.055,-.03,-.015],head:[-.075,.065,.017],jaw:.16,
        aR:{f:.62,out:.44,e:.71},aL:{f:.42,out:.40,e:.85},tilt:.40,cast:.14,sway:-.20}),
    ];
  }

  const widthFactors=new Map();
  for(const [rig,broken] of [[vG,false],[QG,true]]) {
    const originalRatio=rig.frame.w/rig.frame.h, h=170;
    const w=Math.round(originalRatio*h*1.47);
    widthFactors.set(rig,w/h/originalRatio);
    rig.frame={...rig.frame,w,h};
    rig.palette=palette;
    rig.parts=rig.parts.map(part=>{
      let draw=part.draw;
      if(part.joint==="head")draw=state=>head(state,broken);
      if(part.joint==="jaw")draw=state=>jaw(state,broken);
      if(part.joint==="chest")draw=state=>chest(state,broken);
      if(part.joint==="spine")draw=state=>spine(state,broken);
      if(part.joint==="pelvis" && part.group==="body")draw=state=>girdle(state,broken);
      if(part.joint==="pelvis" && part.group==="legs")draw=state=>skirt(state,broken);
      if(part.joint==="shoulderL" && part.group==="body")draw=state=>mantle(state,-1,broken);
      if(part.joint==="shoulderR" && part.group==="body")draw=state=>mantle(state,1,broken);
      if(part.joint==="wristR")draw=state=>crozier(state,broken);
      if(part.joint==="wristL")draw=state=>openHand(state,broken);
      if(part.joint==="elbowL")draw=state=>forearm(state,-1,broken);
      if(part.joint==="elbowR")draw=state=>forearm(state,1,broken);
      if(part.joint==="ankleL" || part.joint==="ankleR")draw=state=>foot(state,broken);
      return {...part,draw};
    });
    for(const [joint,group,side] of [["shoulderL","lArm",-1],["shoulderR","rArm",1]])
      rig.parts.push({joint,group,draw:state=>hangingSleeve(state,side,broken)});
    const frames=cast(broken);
    rig.poses={...rig.poses,regalCast:frames};
    if(!broken)rig.poses.regalFan=frames.map((pose,i)=>({
      ...pose,rot:{...pose.rot,chest:[pose.rot.chest[0],pose.rot.chest[1]-.11,pose.rot.chest[2]-.04],
        shoulderL:[-.46-i*.10,-.18,.44+i*.08],elbowL:[-.85+i*.065,0,0]},
    }));
  }
  // Intact frames use the exact palette indices produced by the articulated
  // model at build time. Dismembered poses continue through the native baker.
  const packedByPose=new WeakMap();
  for(const rig of [vG,QG]){
    const packed=boneSovereignFrames[rig.key];
    if(!packed)continue;
    for(const action of Object.keys(rig.poses))for(let i=0;i<Vu(rig,action);i++){
      const frame=packed[action+i];
      if(frame)packedByPose.set(tz(rig,action,i),frame);
    }
  }
  const rasterize=X7;
  X7=function(rig,pose,mask,crawl,mirror=false){
    const packed=(rig===vG || rig===QG) && !mask && !crawl && packedByPose.get(pose);
    if(!packed)return rasterize.call(this,rig,pose,mask,crawl,mirror);
    const {w,h}=rig.frame, count=w*h, input=bytes(packed), pixels=new Uint8Array(count);
    let dst=0,src=0;
    while(dst<count) {
      const flags=input[src++];
      for(let bit=0;bit<8 && dst<count;bit++){
        if(!(flags&(1<<bit))){pixels[dst++]=input[src++];continue;}
        const low=input[src++],high=input[src++],distance=low+((high>>4)<<8);
        let length=3+(high&15);
        if(length===18){let extra;do{extra=input[src++];length+=extra;}while(extra===255);}
        for(let n=0;n<length;n++,dst++)pixels[dst]=pixels[dst-distance];
      }
    }
    const data=new Uint8ClampedArray(count*4), out=new Uint32Array(data.buffer), colors=new Uint32Array(rig.palette.lut.buffer);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)out[y*w+(mirror?w-1-x:x)]=colors[pixels[y*w+x]];
    return {w,h,data};
  };
  const bake=iz;
  iz=function(rig) {
    const sprites=bake.call(this,rig);
    if(rig!==vG && rig!==QG)return sprites;
    const atlas=sprites.rig, tex=atlas.tex, part=atlas.part, measured=new WeakSet();
    function light(texture){if(texture.colorSpace!==ha){texture.colorSpace=ha;texture.needsUpdate=true;}return texture;}
    atlas.tex=function(...args){return light(tex.apply(this,args));};
    atlas.part=function(...args){
      const item=part.apply(this,args);light(item.tex);
      if(!measured.has(item)){item.cw*=widthFactors.get(rig);measured.add(item);}
      return item;
    };
    for(const item of atlas.all())light(item);
    return sprites;
  };
  // Expand only the art quad's transparent margins. The actor's position, scale,
  // native hit regions and collision radius retain the dimensions set by Du.
  const quads=new Map(), spawn=Du;
  let defaultQuad=null;
  function widenArt(enemy,rig) {
    let geometry=quads.get(rig);
    if(!geometry){
      defaultQuad??=enemy.sp.geometry;
      geometry=cs(()=>defaultQuad.clone().scale(widthFactors.get(rig),1,1));
      quads.set(rig,geometry);
    }
    enemy.sp.geometry=geometry;
  }
  Du=function(key,...args){
    const enemy=spawn.call(this,key,...args);
    if(key==="Z")widenArt(enemy,vG);
    return enemy;
  };
  const cues=new WeakMap();
  function cueFor(enemy) {
    let cue=cues.get(enemy);
    if(!cue || cue.phase!==enemy.phase){
      cue={phase:enemy.phase,age:Infinity,fired:false,contact:0,previousCool:enemy.cool,stride:enemy.animT,texture:null};
      cues.set(enemy,cue);
    }
    return cue;
  }
  const think=rtt;
  rtt=function(enemy,...args){
    if(enemy.key==="Z")cueFor(enemy).previousCool=enemy.cool;
    return think.call(this,enemy,...args);
  };
  const emit=Qo;
  Qo=function(enemy,...args){
    const result=emit.call(this,enemy,...args);
    if(enemy.key==="Z")cueFor(enemy).fired=true;
    return result;
  };
  // The native priest leaves atkAnim raised between casts. Keep advancing
  // native AI/stride fields while submitting one final texture for this actor.
  const setTexture=Ym, draw=Yu;
  let paintedActor=null, paintedTexture=null;
  Ym=function(enemy,texture){return setTexture.call(this,enemy,enemy===paintedActor?paintedTexture:texture);};
  Yu=function(enemy,dt,moving,stopped) {
    if(enemy.key!=="Z")return draw.call(this,enemy,dt,moving,stopped);
    const cue=cueFor(enemy);
    cue.age=cue.fired?0:cue.age+dt;
    cue.fired=false;
    cue.contact=enemy.cool>cue.previousCool ? .22 : Math.max(0,cue.contact-dt);
    if(stopped || enemy.hurt>0 || enemy.sever?.legs)return draw.call(this,enemy,dt,moving,stopped);
    if(enemy.formKey==="Z2" && enemy.sp.geometry!==quads.get(QG))widenArt(enemy,QG);
    const atlas=wk(enemy), step=atlas.rig.walkStep, n=Vu(atlas.rig,"walk");
    if(moving)cue.stride=(cue.stride+dt)%(n*step);
    let action=enemy.phase===2?"regalFan":"regalCast", frame;
    if(cue.age<.325)frame=cue.age<.085?3:cue.age<.195?4:5;
    else if(cue.contact>0){ action="atk";frame=cue.contact>.12?1:2; }
    else if(enemy.atkT>0 && enemy.atkT<.46)frame=enemy.atkT>.29?0:enemy.atkT>.115?1:2;
    else if(enemy.atkAnim>0){action=moving?"walk":"idle";frame=moving?Math.floor(cue.stride/step):0;}
    else return draw.call(this,enemy,dt,moving,stopped);
    const previousActor=paintedActor, previousTexture=paintedTexture;
    paintedActor=enemy;paintedTexture=atlas.tex(action,frame,Mk(enemy));
    try{return draw.call(this,enemy,dt,moving,stopped);}
    finally{paintedActor=previousActor;paintedTexture=previousTexture;}
  };
})();
/* BONE_SOVEREIGN_END */
