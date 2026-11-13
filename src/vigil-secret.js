/* CHAPEL_VIGIL_BEGIN */
// The sexton's bell belongs to the east wall of the ruined shotgun chapel.
// The shutter is a native S door. Its cell, pickup and score are consequently
// covered by the ordinary interaction, collision and shrine snapshot paths.
(() => {
  const cellX = 34, cellZ = 5, key = "34,5";
  const face = cellX * P, centre = (cellZ + .5) * P;
  let vigil = null;

  const build = gV[0].build;
  gV[0].build = function (...args) {
    const map = build.apply(this, args);
    map.g[cellZ][cellX] = "S";
    map.g[cellZ][cellX + 1] = "#"; // The niche has a solid back on the yard side.
    return map;
  };

  // An open, hollow casting. The split at the lip tapers out before the crown.
  // Varying the patina per facet leaves the crack legible at the native raster.
  function casting(bronze) {
    const pos = [], colors = [], uv = [];
    const contour = [[.07,-.05],[.17,-.11],[.21,-.21],[.25,-.48],
      [.31,-.64],[.42,-.73],[.43,-.78],[.36,-.80],[.29,-.71],[.18,-.51],[.11,-.23]];
    const segments = 18;
    const point = (i, row) => {
      const [radius,y] = contour[row];
      const split = Math.max(0, -y - .21);
      const angle = -.39 + i * Math.PI * 2 / segments +
        (i === 0 ? split * .36 : i === segments ? -split * .19 : 0);
      return [radius*Math.sin(angle), y, radius*Math.cos(angle)];
    };
    for (let row=0; row<contour.length-1; row++) {
      for (let i=0; i<segments; i++) {
        const a=point(i,row), b=point(i+1,row), c=point(i,row+1), d=point(i+1,row+1);
        pos.push(...a,...c,...b,...b,...c,...d);
        const u=i/segments, next=(i+1)/segments, v=1+a[1], w=1+c[1];
        uv.push(u,v,u,w,next,v,next,v,u,w,next,w);
        const angle=(i+.5)*Math.PI*2/segments+.25;
        const keyLight=Math.max(0,Math.cos(angle));
        const falloff=.29+.56*keyLight+.60*Math.pow(keyLight,16);
        const rim=row===5 || row===1, inner=row>=7;
        const color=new xe(inner ? 0x705649 : rim ? 0xffe1b5 : i%6===3 ? 0xb5c9a5 : 0xefcf9b);
        color.multiplyScalar(falloff);
        for(let n=0;n<6;n++) colors.push(color.r,color.g,color.b);
      }
    }
    const geo=Z(new h0());
    geo.setAttribute("position",new y0(new Float32Array(pos),3));
    geo.setAttribute("color",new y0(new Float32Array(colors),3));
    geo.setAttribute("uv",new y0(new Float32Array(uv),2));
    return new pt(geo,bronze);
  }

  function addVigil(scene, door) {
    const floor = ie(face-.2, centre);
    const stone=Z(iR("prologuePatinatedStone")), wood=Z(iR("wood"));
    const bronze=Z(iR("hellBronze"));
    bronze.side=hi;
    const gold=Z(new $e({map:bronze.map,color:0xd1aa73,toneMapped:false}));
    const iron=Z(new $e({map:Ft.dungeonWall,color:0x85837a,toneMapped:false}));
    const cloth=Z(new $e({map:Ft.wood,color:0xad332c,toneMapped:false}));
    const dark=Z(new $e({color:0x302826,toneMapped:false}));
    const wax=Z(new $e({color:0xb19871,toneMapped:false}));
    const frame=new n0();
    frame.name="chapelVigil"; frame.position.set(face,floor,centre); frame.rotation.y=-Math.PI/2;
    scene.add(frame);
    // Coordinates below are relative to the mouth of the niche (+z into the chapel).
    const batch=new Map();
    const box=(mat,w,h,d,x,y,z,rz=0) => Yd(batch,mat,new Ne(w,h,d),E(x,y,z,0,0,rz));
    const cylinder=(mat,top,bottom,h,x,y,z) => Yd(batch,mat,new Eo(top,bottom,h,10),E(x,y,z));
    const flush=group => {
      for(const [material,pieces] of batch) group.add(new pt(Z(BR(pieces)),material));
      batch.clear();
    };
    box(stone,2,3.4,.15,0,1.7,-1.88);
    box(wood,1.62,2.8,.12,0,1.41,-1.76);
    box(stone,1.84,.22,1.72,0,.11,-1.02);
    for(const side of [-1,1]){
      box(stone,.24,3.31,1.98,side*1.02,1.655,-.80);
      box(stone,.38,.19,.44,side*1.02,.15,.12);
      box(stone,.35,.16,.44,side*1.02,2.71,.12);
      box(wood,.14,2.55,.13,side*.88,1.39,.12);
      box(gold,.04,.23,.14,side*.88,2.44,.19);
      box(wood,.17,1.15,.23,side*.44,2.97,.16,-side*Math.atan2(.85,.55));
    }
    box(wood,2.15,.18,.55,0,2.70,.04);
    box(iron,.46,.11,.45,0,2.55,.16);
    flush(frame);

    const hanging=new n0();
    hanging.name="vigilBell"; hanging.position.set(0,2.55,.36);
    hanging.add(casting(bronze));
    cylinder(iron,.055,.045,.67,0,-.51,0);
    cylinder(gold,.082,.071,.14,0,-.89,0);
    box(gold,.68,.07,.09,.02,-.025,0);
    // A tied mourning ribbon and pale knot pick out the pull against the wall.
    box(wax,.043,.64,.052,.31,-.36,.02,.05);
    box(wax,.055,.43,.06,.28,-.88,.025,-.10);
    box(cloth,.10,.20,.065,.315,-1.18,.03,-.15);
    box(gold,.092,.065,.073,.31,-1.095,.035);
    box(cloth,.06,.19,.05,.355,-1.35,.025,.27);
    flush(hanging);
    frame.add(hanging);
    // A bound book, stubbed votives and a red shelf cloth become visible only
    // after the memorial stone sinks. Leave the centre shelf clear for shells.
    box(stone,1.72,.15,1.06,0,.49,-1.25);
    box(cloth,.86,.025,.89,.12,.578,-1.22);
    box(cloth,.86,.24,.03,.12,.47,-.78);
    for(const x of [-.63,-.46,.65]){
      const height=x<-.5?.24:.13;
      cylinder(wax,.042,.05,height,x,.57+height/2,-1.44);
      cylinder(dark,.008,.013,.035,x,.58+height,-1.44);
    }
    box(cloth,.43,.095,.26,-.54,.61,-1.06,-.04);
    box(wax,.39,.035,.26,-.54,.615,-1.055,-.04);
    box(iron,.55,1.07,.08,0,1.59,-1.65);
    box(gold,.075,.64,.055,0,1.65,-1.59);
    box(gold,.37,.065,.055,0,1.78,-1.59);
    flush(frame);

    // The engine animates and restores this same mesh. The broad iron bands
    // and the three taper marks descend with it, including on shrine restore.
    const shutter=new n0();
    shutter.position.set(-P/2-.03,-door.h/2,0); shutter.rotation.y=-Math.PI/2;
    door.mesh.add(shutter);
    box(wood,1.62,1.18,.10,0,.77,.02);
    for(const y of [.26,1.27]) {
      box(iron,1.67,.11,.12,0,y,.06);
      for(const x of [-.68,.68]) box(gold,.06,.06,.04,x,y,.14);
    }
    for(const [x,height] of [[-.30,.28],[0,.51],[.30,.36]]){
      box(wax,.074,height,.035,x,.54+height/2,.09);
      box(gold,.069,.09,.035,x,.62+height,.09,-.3);
    }
    flush(shutter);
    // Appending to the base items preserves every previous pickup index.
    const x=face+1.07, z=centre-.29;
    const shells={kind:"shells",x,z,bob:0,y0:floor+.82,
      sp:Js(f0.shells,x,z,.60,.60,floor+.82)};
    v.items.push(shells);
    return {door,hanging,age:0,swing:false,hinted:false,floor};
  }

  const decorate = FJ;
  FJ = function(scene,map) {
    decorate(scene,map);
    vigil = T.level===0 && map.grave && v.doors[key] ? addVigil(scene,v.doors[key]) : null;
  };

  const interact = N$;
  N$ = function(...args) {
    const closed=vigil && !vigil.door.open;
    const result=interact.apply(this,args);
    if(closed && vigil.door.open){
      vigil.swing=true;
      // One cracked bell: twin, beating strike partials over a long low hum.
      Nt(face-.36,vigil.floor+2.1,centre,()=>nt("churchBells",()=>gt([
        ...wl(0,226,.89,1.62),
        {tone:"sine",f:230.2,env:{a:.004,d:1.83},level:.24},
        {at:.124,tone:"sine",f:535,env:{a:.002,d:.5},level:.085}
      ])));
    }
    return result;
  };

  const doorsUpdate = F$;
  F$ = function(dt) {
    doorsUpdate(dt);
    if(!vigil) return;
    if(vigil.swing){
      vigil.age+=dt;
      const t=vigil.age;
      vigil.hanging.rotation.z=t<2.7 ? Math.sin(t*9)*Math.exp(-t*1.85)*.36 : 0;
      if(t>=2.7) vigil.swing=false;
    } else if(!vigil.hinted && !vigil.door.open && !Be.inputLock && !T.dead && !oo.busy &&
        !Wk() && !Qm() && mf<=0 && C.px>face-2.1 && C.px<face &&
        Math.abs(C.pz-centre)<.69 && Math.abs(C.pyy-vigil.floor-1)<.8 &&
        -Math.sin(Ct.yaw)>.90 && Math.abs(Ct.pitch)<.58){
      le("PRESS E — TOLL THE VIGIL BELL",2.4);
      vigil.hinted=true;
    }
  };
})();
/* CHAPEL_VIGIL_END */
