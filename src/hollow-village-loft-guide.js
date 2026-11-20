/* HOLLOW_VILLAGE_LOFT_GUIDE_BEGIN */
(() => {
  const level=10, wallZ=119.955, lampX=32.83, lampZ=119.812;
  const names=["iron","ironEdge","oak","oakEdge","amber","dullGlass"];
  const atlasSource=/* BARN_LOFT_ATLAS_BEGIN */ "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" /* BARN_LOFT_ATLAS_END */;

  function atlas() {
    const raw=atob(atlasSource),size=32;
    const result=Z(e0(ctx=>{
      const image=ctx.createImageData(size*3,size*2);
      for(let i=0;i<image.data.length/4;i++){
        image.data[i*4]=raw.charCodeAt(i*3);
        image.data[i*4+1]=raw.charCodeAt(i*3+1);
        image.data[i*4+2]=raw.charCodeAt(i*3+2);
        image.data[i*4+3]=255;
      }
      ctx.putImageData(image,0,0);
    },size*3,size*2));
    result.colorSpace=ha;
    result.name="hollowVillageLoftGuideAtlas";
    return result;
  }

  function fittings(scene) {
    const material=Z(new $e({map:atlas(),vertexColors:true,toneMapped:false}));
    const pieces=new Map(),normal=new Y();
    function part(surface,tone,geo,transform) {
      const slot=names.indexOf(surface),u=slot%3*32,v=(slot/3|0)*32;
      const uv=geo.getAttribute("uv"),normals=geo.getAttribute("normal");
      const colors=new Float32Array(uv.count*3);
      for(let i=0;i<uv.count;i++){
        uv.setXY(i,(u+1.5+29*uv.getX(i))/96,1-(v+1.5+29*(1-uv.getY(i)))/64);
        normal.fromBufferAttribute(normals,i).transformDirection(transform);
        const bright=surface==="amber"||surface==="dullGlass";
        const lit=tone*(bright?1:.63+.28*Math.max(0,normal.y)+.28*Math.max(0,-normal.z)+.10*Math.max(0,normal.x));
        colors.set([lit,lit,lit],i*3);
      }
      geo.setAttribute("color",new y0(colors,3));
      Yd(pieces,material,geo,transform);
    }
    const box=(s,t,w,h,d,x,y,z,rz=0,ry=0)=>
      part(s,t,new Ne(w,h,d),E(x,y,z,0,ry,rz));

    function rod(surface,tone,a,b,radius,sides=7) {
      const from=new Y(...a),to=new Y(...b),span=to.clone().sub(from);
      const orientation=new Pn().setFromUnitVectors(new Y(0,1,0),span.clone().normalize());
      const transform=new fe().compose(from.add(to).multiplyScalar(.5),orientation,new Y(1,1,1));
      part(surface,tone,new Eo(radius,radius,span.length()+.006,sides),transform);
    }

    // The handrail stays over the outer wall margin of the existing treads.
    const foot=[32.12,2.29,119.813],head=[27.51,2.98,119.813];
    const railAngle=Math.atan2(head[1]-foot[1],head[0]-foot[0])-Math.PI;
    const rail=(surface,tone,w,h,d,dy,dz)=>
      box(surface,tone,w,h,d,(head[0]+foot[0])*.5,(head[1]+foot[1])*.5+dy,foot[2]+dz,railAngle);
    const length=Math.hypot(head[0]-foot[0],head[1]-foot[1]);
    rail("oak",1.12,length,.126,.12,0,0);
    rail("oakEdge",1.09,length-.06,.039,.033,.061,-.040);
    for(const p of [.09,.50,.91]){
      const x=foot[0]+(head[0]-foot[0])*p,y=foot[1]+(head[1]-foot[1])*p;
      box("iron",1.12,.143,.213,.032,x,y-.104,wallZ);
      box("ironEdge",.91,.082,.178,.044,x,y-.082,119.888);
      box("iron",1.03,.175,.041,.122,x,y+.013,119.808,railAngle);
      rod("ironEdge",.91,[x,y-.178,119.933],[x,y-.178,119.899],.020);
    }
    for(const [x,y] of [foot,head]){
      box("iron",1.08,.099,.137,.137,x,y,119.812,railAngle);
    }

    // Hammered bracket and circular loop, bolted into the original stone.
    box("iron",1.04,.19,.54,.042,33.45,3.47,wallZ);
    for(const y of [3.245,3.677])rod("ironEdge",1.09,[33.45,y,wallZ],[33.45,y,119.891],.041,6);
    const arch=[
      [33.42,3.60,119.924],[33.26,3.65,119.845],[33.01,3.72,119.800],
      [32.83,3.71,lampZ],[32.71,3.63,lampZ],[32.71,3.48,lampZ],
      [32.79,3.41,lampZ],[32.88,3.45,lampZ],[32.92,3.55,lampZ],[32.85,3.60,lampZ]
    ];
    for(let i=1;i<arch.length;i++)rod(i===2||i===3?"ironEdge":"iron",1.0,arch[i-1],arch[i],.041);
    rod("iron",.94,[33.43,3.28,119.926],[33.04,3.63,119.82],.035);
    for (const [a,b] of [
      [[lampX,3.49,lampZ],[lampX,3.27,lampZ]], [[lampX-.075,3.26,lampZ],[lampX,3.34,lampZ]],
      [[lampX+.076,3.26,lampZ],[lampX,3.34,lampZ]]
    ]) rod("ironEdge",1.02,a,b,.028);
    box("iron",.91,.252,.097,.198,lampX,3.204,lampZ);
    box("ironEdge",.95,.354,.052,.226,lampX,3.137,lampZ);
    box("iron",1.06,.407,.084,.250,lampX,3.068,lampZ);
    box("ironEdge",.91,.417,.040,.262,lampX,3.013,lampZ);
    box("iron",1.0,.386,.058,.244,lampX,2.317,lampZ);
    box("ironEdge",.88,.421,.040,.256,lampX,2.269,lampZ);
    box("iron",1.02,.369,.046,.216,lampX,2.232,lampZ);
    box("dullGlass",.84,.303,.639,.151,lampX,2.666,lampZ);
    box("amber",1.06,.210,.415,.164,lampX-.006,2.628,lampZ);
    box("amber",1.21,.096,.266,.172,lampX+.017,2.621,lampZ);
    for(const x of [-.167,-.057,.063,.171]) {
      box("iron",1.08,.031,.667,.027,lampX+x,2.667,lampZ-.106);
      if(Math.abs(x)>.14)box("ironEdge",.93,.015,.66,.016,lampX+x-.014,2.669,lampZ-.123);
    }
    for(const x of [-.168,.168])for(const dz of [-.082,.09])
      box("iron",1.0,.038,.671,.026,lampX+x,2.664,lampZ+dz);
    box("iron",1.08,.383,.025,.023,lampX,2.699,lampZ-.110);
    box("iron",1.03,.361,.028,.023,lampX,2.462,lampZ-.110);
    box("ironEdge",.88,.041,.084,.032,lampX-.168,2.782,lampZ-.130);

    const batches=pieces.get(material);
    const colors=new Float32Array(batches.reduce((sum,g)=>sum+g.getAttribute("color").array.length,0));
    let index=0;
    for(const geom of batches){
      const color=geom.getAttribute("color").array;
      colors.set(color,index);
      index+=color.length;
    }
    const geometry=Z(BR(batches));
    geometry.setAttribute("color",new y0(colors,3));
    const mesh=new pt(geometry,material);
    mesh.name="hollowVillageLoftFittings";
    scene.add(mesh);
  }

  function spill(scene) {
    const positions=[],colors=[];
    const blend=(a,b,t)=>a+(b-a)*t;
    function patch(a,b,c,d,cols,rows,illumination) {
      for(let v=0;v<rows;v++)for(let u=0;u<cols;u++){
        for(const [du,dv] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){
          const across=(u+du)/cols,up=(v+dv)/rows;
          const p=a.map((x,i)=>blend(blend(x,b[i],across),blend(d[i],c[i],across),up));
          positions.push(...p);
          colors.push(...illumination(...p));
        }
      }
    }
    function warm(alpha){return [.685,.304,.092,alpha];}
    const window=(distance,spread)=>Math.max(0,1-(distance/spread)**2);
    function wall(x,y) {
      const a=window(x-lampX,2.91)*window(y-2.56,1.52);
      return warm(Math.pow(a,2.08)*.25);
    }
    function tread(x,y,z) {
      const a=window(x-lampX,7.7)*window(z-119.29,1.62);
      return warm(Math.pow(a,1.82)*.21);
    }
    for (const x of [26,28,30,32,34]) {
      const foot=ie(x+1,119.3),top=4.55;
      patch([x,foot,wallZ],[x+2,foot,wallZ],[x+2,top,wallZ],[x,top,wallZ],7,8,wall);
    }
    for (const x of [26,28,30,32,34]) {
      const y=ie(x+1,119.1)+.009;
      patch([x,y,118.08],[x+2,y,118.08],[x+2,y,119.9],[x,y,119.9],7,6,tread);
      if(x<32){
        const next=ie(x+2.1,119.10)+.004,right=x+2+.005;
        patch([right,next,118.06],[right,y,118.06],[right,y,119.81],[right,next,119.81],2,7,
          (u,v,w)=>tread(u,v,w).map((k,i)=>i===3?k*.73:k));
      }
    }
    // Each stair has a short lit end and a worn leading edge.
    // The scene keeps its original tile surfaces under the light.
    for (const [x,rate] of [[32,.40],[30,.30],[28,.23]]) {
      const height=ie(x-.2,119.19),front=117.974,end=x+.024;
      const close=118.039,wall=119.842;
      const edge=(z,spread)=>.63+.37*window(z-118.98,spread);
      // Light the actual transverse riser and its top edge in the
      // direction of the authored climb, just outside the solid face.
      patch([end,height-.111,close],[end,height-.111,wall],
        [end,height-.007,wall],[end,height-.007,close],13,4,
        (u,v,w)=>warm(rate*edge(w,1.04)*(.46+.54*window(v-height,.116))));
      patch([x-.215,height+.013,close],[x-.009,height+.013,close],
        [x-.009,height+.013,wall],[x-.215,height+.013,wall],5,13,
        (u,v,w)=>warm(rate*.78*edge(w,1.04)*window(u-x,.235)));
      // Across the returned side of the timber, the same reflected
      // light recedes along the length as the steps rise away.
      patch([x-1.92,height-.087,front],[x-.032,height-.087,front],
        [x-.032,height-.008,front],[x-1.92,height-.008,front],13,4,
        (u,v)=>warm(rate*.76*window(u-(x-.54),1.52)*window(v-height,.10)));
      patch([x-1.92,height+.012,close],[x-.036,height+.012,close],
        [x-.036,height+.012,118.248],[x-1.92,height+.012,118.248],13,5,
        (u,v,w)=>warm(rate*.70*window(u-(x-.6),1.63)*window(w-118.03,.223)));
    }
    const geometry=Z(new h0());
    geometry.setAttribute("position",new y0(new Float32Array(positions),3));
    geometry.setAttribute("color",new y0(new Float32Array(colors),4));
    const material=Z(new $e({vertexColors:true,transparent:true,side:hi,forceSinglePass:true,
      depthWrite:false,blending:is,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,
      polygonOffsetUnits:-1}));
    const pool=new pt(geometry,material);
    pool.name="hollowVillageLoftSpill";
    pool.renderOrder=2;
    scene.add(pool);
  }

  const decorate=FJ;
  FJ=function(scene,map) {
    decorate.apply(this,arguments);
    if(T.level!==level||map.g?.[59]?.[15]!=='.'||map.g?.[60]?.[15]!=='#')return;
    fittings(scene);
    spill(scene);
  };
})();
/* HOLLOW_VILLAGE_LOFT_GUIDE_END */
