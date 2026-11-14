// The guardian's blue visor and slate blocks are painted in display sRGB.
// The stock software atlas left them untagged at upload, washing both out.
(() => {
  const register=rz;
  // Reuse the guardian's own limestone, slate, moss and blue-glass ramps.
  // These pieces attach to its existing joints and disappear with each native
  // head/arm mask, including decapitation and the mirrored death atlas.
  M7.parts.push(
    bs("head","head",({b})=>{
      b.cbox(-.146,.126,-.176,.146,.24,-.139,.018,Vi);
      for(const side of [-1,1]) {
        const x=.074*side;
        b.box(x-.054,.155,-.187,x+.054,.200,-.171,Bq);
        b.cbox(x-.070,.205,-.184,x+.070,.247,-.135,.014,On,{tex:jn});
        b.cbox(x-.052,.055,-.172,x+.052,.127,-.147,.014,On,{tex:jn});
      }
      b.cbox(-.026,.087,-.20,.026,.242,-.164,.012,js);
      b.cbox(-.108,-.01,-.17,.108,.032,-.125,.012,Vi);
    }),
    bs("chest","body",({b})=>{
      for(const side of [-1,1]) {
        b.push();b.translate(side*.245,.159,-.16);b.roll(-side*.12);
        b.cbox(-.021,-.123,-.018,.021,.125,.018,.014,js,{tex:jn});b.pop();
        const x=side*.158;
        b.cbox(x-.055,.054,-.184,x+.055,.087,-.166,.011,Vi);
      }
      Jl(b,-.220,.094,-.173,.027);Jl(b,-.243,.078,-.174,.022);
    }),
    bs("elbowL","lArm",({b})=>{
      b.push();b.translate(-.1,-.2,-.04);b.pitch(Math.PI/2);
      for(const [x,y] of [[-.194,.249],[.194,.249],[-.17,-.14],[.17,-.14],[0,-.43]])
        b.ball(x,y,-.072,.028,js,5);
      b.prz([[0,.076],[.057,0],[0,-.076],[-.057,0]],-.095,-.074,js);
      b.prz([[0,.046],[.030,0],[0,-.046],[-.030,0]],-.101,-.095,Bq);
      b.pop();
    }),
    bs("wristR","rArm",({b})=>{
      // A narrow shadow on the blade's left bevel separates its cutting edge
      // from the lighter stone skirt in the downward follow-through.
      b.push();b.translate(0,-.06,0);
      b.prz([[-.048,-.105],[-.023,-.105],[-.023,-.84],[0,-1.00],[-.045,-.89]],
        -.019,-.016,Vi);
      b.pop();
    })
  );
  M7.poses.volley=[
    Yi({
      spine:[.12,-.15,.035],chest:[.12,-.20,.045],head:[-.11,.20,0],
      aL:{f:.62,out:.20,tw:-.68,e:1.17},aR:{f:.22,out:.40,tw:.08,e:1.35,w:.15},
      lL:{f:.45,k:.72},lR:{f:-.06,k:.38},sway:-.4,
    }),
    Yi({
      spine:[.015,-.26,-.055],chest:[-.02,-.27,-.05],head:[.06,.34,.05],
      aL:{f:.66,out:.18,tw:-.55,e:1.17},aR:{f:1.37,out:.64,tw:.12,e:1.22,w:.11},
      lL:{f:.30,k:.53},lR:{f:-.23,k:.28},sway:-.8,
    }),
    Yi({
      spine:[.27,.15,.045],chest:[.21,.28,.05],head:[-.14,-.19,-.04],
      aL:{f:.18,out:.20,tw:-.35,e:.83},aR:{f:1.38,out:.28,tw:.1,e:.07,w:.10},
      lL:{f:.57,k:.74},lR:{f:-.16,k:.23},sway:.85,
    }),
    Yi({
      spine:[.14,.06,.035],chest:[.12,.12,.025],head:[-.09,-.09,0],
      aL:{f:.32,out:.22,tw:-.50,e:1.04},aR:{f:.69,out:.32,tw:.04,e:.37,w:.16},
      lL:{f:.34,k:.50},lR:{f:-.10,k:.23},sway:.42,
    }),
  ];
  rz=function(...args) {
    const result=register.apply(this,args), rig=Ze.U.rig;
    const fetch=rig.tex;
    const frame=M7.frame, margin=39, height=frame.h+2*margin;
    // The raised sword extends beyond the resting sprite's roof. Keep its
    // feet and pixel density aligned with walking by padding both edges.
    const tall=new nz({...M7,frame:{...frame,h:height,
      worldH:frame.worldH*height/frame.h,floor:(frame.h*frame.floor+margin)/height}});
    rig.tex=function(action,index,mask=0,mirror=false) {
      const texture=action==="volley" && index===1 ? tall.tex(action,index,mask,mirror)
        : fetch.call(this,action,index,mask,mirror);
      if(texture.colorSpace!=="srgb"){texture.colorSpace="srgb";texture.needsUpdate=true;}
      return texture;
    };
    rig.tex("idle",0);
    return result;
  };

  let releaseTime=new WeakMap();
  const launch=Qo;
  Qo=function(e,angle,toxic) {
    const result=launch.call(this,e,angle,toxic);
    if(e.key==="U") releaseTime.set(e,.22);
    return result;
  };
  const pose=Yu;
  const cycle=qtt;
  let overhead=null, scaleRecords=new WeakMap();
  // Sprites can be slightly enlarged by native melee animation or by an
  // external finisher. Track only the exact display scale this volley wrote.
  qtt=function(dt) {
    if(overhead) {
      for(const [enemy,scale] of overhead) {
        if(enemy.sp.scale.y===scale.tall) enemy.sp.scale.y=scale.rest;
      }
      overhead.clear();
    }
    const result=cycle.call(this,dt);
    if(overhead) {
      for(const [enemy,scale] of overhead) {
        scale.rest=enemy.sp.scale.y;
        scale.tall=scale.rest*enemy.sp.material.map.image.height/M7.frame.h;
        enemy.sp.scale.y=scale.tall;
      }
    }
    return result;
  };
  Yu=function(e,dt,moving,stopped) {
    if(e.key!=="U") return pose.call(this,e,dt,moving,stopped);
    const left=releaseTime.get(e)||0;
    if(left>0) {
      if(left>dt)releaseTime.set(e,left-dt);
      else releaseTime.delete(e);
    }
    // Native movement owns the gait clock even when the upper body overrides
    // this frame. Never introduce an AI timer or a delayed projectile.
    const result=pose.call(this,e,dt,moving,stopped);
    if(e.dead || e.dormant || stopped || e.stun>0 || e.hurt>0 || e.executing ||
        e.flung>0 || v.cine || e.sever?.legs) return result;
    let frame;
    if(left>0 && e.atkAnim>0) frame=left>.105?2:3;
    else if(e.cool>0 && e.cool<=.40 && e.aware) {
      const distance=Math.hypot(C.px-e.x,C.pz-e.z);
      if(distance>3 && distance<e.range && lm(e.x,e.z,C.px,C.pz))
        frame=e.cool>.20?0:1;
    }
    if(frame!==undefined) {
      Ym(e,wk(e).tex("volley",frame,Mk(e)));
      if(frame===1) {
        overhead ||= new Map();
        let scale=scaleRecords.get(e);
        if(!scale) {scale={rest:0,tall:0};scaleRecords.set(e,scale);}
        overhead.set(e,scale);
      }
    }
    return result;
  };
  const reset=pz;
  pz=function(...args) { releaseTime=new WeakMap();scaleRecords=new WeakMap();
    overhead=null;return reset.apply(this,args); };
})();
