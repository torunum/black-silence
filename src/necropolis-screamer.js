/* NECROPOLIS_SCREAMER_BEGIN */
// The mourner uses the native screamer rig, pose slots and detachable parts.
(() => {
  const clasp=21, linen=22, leather=23;
  const shades=(ramp,amb,spec=0)=>({ramp:ramp.split(" "),amb,spec});
  OB.palette=m0({
    [X0]:shades("#241b26 #322837 #403447 #4f4054 #5e4d62 #715d75 #86758a",.39,.08),
    [Jf]:shades("#171319 #211923 #2b2230 #362939 #443649 #564659 #6d586e",.37,.08),
    [Os]:shades("#353039 #4a404d #605362 #756977 #897d88 #9d909a #b0a4a8",.44,.11),
    [fq]:shades("#645648 #85725b #a69275 #bca78a #cdbb9c #d8c7a9 #e2d1b1",.53,.02),
    [sf]:shades("#241416 #3b1c1d #532924 #693a30 #885244",.37,.10),
    [clasp]:shades("#28211c #51422d #6a563b #86724e #aa905f #c5a977",.45,.22),
    [linen]:shades("#302926 #473b36 #65564f #78685f #908074 #a79888",.45,.10),
    [leather]:shades("#1e1819 #2c2324 #3b2c2a #503b34 #674d40 #806254",.37,.14),
  });

  // Lower-frequency folds read at the same distance as the arms and boots.
  const canvasWeave={tex:(x,y,z)=>{
    const warp=Math.sin(x*57+6*y+Math.sin(z*23)*2.7);
    const wear=Math.sin(67*y+31*z+27*x)*Math.sin(39*x-13*y);
    return warp*.57+wear*.53;
  }};
  const replaced=new Set(["chest","spine","head","jaw","neck"]);
  OB.parts=OB.parts.filter(part=>!replaced.has(part.joint)&&!(part.joint==="pelvis"&&part.group==="legs"));
  OB.parts.push(
    gs("spine","body",({b})=>{
      b.ell(0,.145,-.015,.171,.198,.109,X0,8,canvasWeave);
      b.prz([[-.17,.04],[.165,.041],[.141,.282],[.039,.249],[-.134,.271]],-.110,-.070,Jf,canvasWeave);
      b.cbox(-.164,.004,-.148,.163,.069,-.109,.01,leather,canvasWeave);
      b.cyl(.027,.038,-.164,-.14,.041,.031,7,clasp);
      b.cyl(.027,.037,-.168,-.161,.022,.022,7,Jf);
    }),
    gs("chest","body",({b})=>{
      b.ell(0,.158,-.016,.248,.208,.147,X0,9,canvasWeave);
      b.prz([[-.357,.22],[-.268,.331],[-.11,.381],[.11,.368],[.305,.306],[.360,.215],[.233,.145],[-.235,.098]],
        -.096,.116,Jf,canvasWeave);
      // An asymmetrical shoulder shawl over a deliberately plainer vest.
      b.prz([[-.373,.212],[-.301,.331],[-.128,.359],[-.015,.255],[-.106,.186],[-.182,.158],[-.318,.118],[-.368,.082]],
        -.158,-.104,Os,canvasWeave);
      b.prz([[-.354,.185],[-.226,.287],[-.107,.277],[.049,.221],[-.019,.161],[-.256,.101]],
        -.181,-.151,Jf,canvasWeave);
      b.prz([[.002,.241],[.115,.343],[.265,.329],[.367,.278],[.335,.178],[.365,.085],
        [.310,.085],[.301,-.061],[.249,-.008],[.205,-.108],[.18,-.030],[.128,.054],[.090,.131]],
        -.161,-.087,linen,canvasWeave);
      b.prz([[.068,.232],[.167,.310],[.279,.294],[.335,.236],[.303,.169],[.326,.071],
        [.292,.088],[.287,-.059],[.246,-.022],[.213,-.123],[.182,-.040],[.149,-.066],[.132,.074]],
        -.248,-.175,linen,canvasWeave);
      b.prz([[.031,.221],[.129,.277],[.259,.259],[.316,.214],[.16,.151],[.065,.157]],
        -.172,-.137,Os,canvasWeave);
      b.prz([[-.343,.133],[-.137,.174],[.029,.232],[.072,.214],[-.116,.138],[-.331,.109]],
        -.199,-.182,Os,canvasWeave);
      b.prz([[.101,.236],[.155,.206],[.223,.137],[.269,.077],[.238,.078],[.208,.091],[.158,.154],[.102,.18]],
        -.252,-.231,Os,canvasWeave);
      // A curved fold stays in front of the ribcage and wraps both collarbones.
      b.prz([[-.344,.248],[-.255,.30],[-.126,.299],[-.029,.253],[.033,.226],[.094,.232],
        [.063,.196],[.015,.184],[-.129,.221],[-.232,.163],[-.305,.092],[-.339,.108]],
        -.219,-.195,Os,canvasWeave);
      b.prz([[-.331,.169],[-.227,.23],[-.080,.232],[.014,.183],[-.060,.161],[-.20,.132],[-.294,.078]],
        -.225,-.206,Jf,canvasWeave);
      b.cyl(.027,.202,-.227,-.191,.059,.054,9,clasp);
      b.cyl(.027,.203,-.232,-.225,.032,.034,7,Jf);
      b.ball(.023,.214,-.242,.021,clasp,5);
      b.ball(.044,.193,-.242,.013,clasp,5);
    }),
    gs("neck","body",({b})=>{
      b.ell(0,.08,-.044,.112,.121,.087,Jf,7,canvasWeave);
      b.prz([[-.138,.064],[-.103,.158],[-.049,.153],[.034,.141],[.113,.159],[.135,.06],[.055,.019],[-.062,.018]],
        -.124,-.078,X0,canvasWeave);
    }),
    gs("pelvis","legs",({b,x})=>{
      const movement=x("rag");
      // Worn lining breaks through the outer robe in two uneven hems.
      for(const [home,tip,width,hem,depth,material,roll] of [
        [-.183,-.256,.166,.748,-.184,linen,.23],[-.085,-.173,.19,.581,-.220,X0,.29],
        [.114,.173,.229,.575,-.211,Jf,-.33],[.192,.233,.130,.488,-.180,linen,-.28],
      ]) {
        b.push();
        b.translate(home,-.035,depth);
        b.roll(movement*roll);
        const torn=tip-home;
        b.prz([[-width*.5,0],[width*.5,0],[width*.47,-hem*.64],[torn+width*.44,-hem*.91],
          [torn+.019,-hem*.84],[torn-.018,-hem],[torn-width*.40,-hem*.88],[-width*.52,-hem*.57]],
          -.026,.037,material,canvasWeave);
        b.pop();
      }
      b.prz([[-.200,-.027],[.206,-.027],[.154,-.408],[.061,-.53],[-.029,-.456],[-.112,-.51],[-.195,-.425]],
        .017,.098,X0,canvasWeave);
      b.prz([[-.242,-.394],[-.155,-.425],[-.169,-.607],[-.238,-.663],[-.229,-.587],[-.266,-.611]],
        -.211,-.188,linen,canvasWeave);
      b.prz([[.147,-.386],[.199,-.365],[.225,-.522],[.212,-.568],[.195,-.534],[.172,-.547]],
        -.214,-.19,linen,canvasWeave);
    }),
    gs("head","head",({b})=>{
      const hood=Lo(b,U3);
      hood.translate(0,-.070,.007);
      hood.prz([[-.090,.050],[-.100,.121],[-.096,.218],[-.064,.282],[-.024,.309],[.014,.323],
        [.052,.299],[.082,.256],[.099,.176],[.087,.085],[.065,.035],[0,.002]],
        -.099,.115,Jf,{...canvasWeave,r1:.78});
      // A deep folded lip makes the small pointed bone mask sit inside the hood.
      hood.prz([[-.083,.107],[-.078,.217],[-.035,.275],[.008,.307],[.062,.266],[.090,.202],[.074,.098],[.042,.054],[0,.025],[-.039,.045]],
        -.121,-.095,Q.OUT);
      hood.prz([[-.100,.133],[-.096,.212],[-.063,.271],[-.025,.307],[.014,.320],[-.027,.270],[-.058,.208],[-.072,.139],[-.050,.085]],
        -.132,-.110,X0);
      hood.prz([[.01,.318],[.049,.299],[.083,.253],[.100,.177],[.088,.09],[.054,.055],[.067,.118],[.071,.192],[.043,.254]],
        -.128,-.109,X0,canvasWeave);
      hood.prz([[-.061,.257],[-.024,.304],[.013,.325],[.053,.292],[.074,.243],[.036,.265],[.008,.273],[-.024,.255]],
        -.143,-.113,X0,canvasWeave);
      hood.prz([[-.050,.206],[-.039,.244],[-.009,.27],[.011,.275],[.043,.249],[.057,.211],
        [.054,.166],[.04,.132],[.026,.096],[.01,.074],[-.014,.076],[-.033,.117],[-.05,.153]],
        -.129,-.105,fq,{r1:.96});
      for(const side of [-1,1]){
        hood.prz([[side*.033,.219],[side*.021,.222],[side*.011,.210],[side*.013,.190],[side*.028,.177],[side*.041,.188]],
          -.135,-.128,Q.OUT);
      }
      hood.prz([[-.010,.144],[-.005,.158],[.008,.156],[.01,.137],[.002,.13]],-.135,-.129,linen);
      hood.prz([[-.015,.105],[-.003,.112],[.011,.104],[.010,.091],[-.005,.087]],
        -.137,-.129,Q.OUT);
    }),
    gs("jaw","head",({b})=>{
      const throat=Lo(b,U3);
      throat.prz([[-.061,-.056],[-.045,-.123],[-.013,-.163],[.035,-.141],[.058,-.090],[.050,-.054]],
        -.103,-.049,Jf,canvasWeave);
      throat.prz([[-.041,-.063],[-.027,-.101],[-.007,-.122],[.023,-.113],[.041,-.084],[.035,-.06]],
        -.112,-.101,Q.CAVITY);
      throat.prz([[-.032,-.095],[-.019,-.109],[.020,-.105],[.035,-.088],[.026,-.113],[.006,-.125],[-.022,-.117]],
        -.116,-.111,sf);
    })
  );

  for(const [side,sign,group] of [["L",-1,"lArm"],["R",1,"rArm"]]) {
    OB.parts.push(gs("shoulder"+side,group,({b})=>{
      const longer=side==="R";
      b.ell(sign*.022,-.073,-.009,longer?.121:.101,.155,.103,longer?linen:Jf,8,canvasWeave);
      b.prz([[-.099,.039],[-.031,.065],[.090,.029],[.098,-.124],[.071,-.224],
        [0,longer?-.308:-.189],[-.024,-.186],[-.068,longer?-.258:-.163],[-.095,-.133]],
        -.108,-.048,longer?linen:Os,canvasWeave);
      b.prz([[-.07,.041],[-.021,.065],[.071,.015],[.057,-.068],[-.021,-.014],[-.063,-.031]],
        -.118,-.101,longer?Os:Jf,canvasWeave);
    }),gs("elbow"+side,group,({b})=>{
      b.ell(sign*.008,-.087,-.011,.055,.136,.055,side==="R"?Jf:X0,7,canvasWeave);
      G(b,0,0,-.10,-.14,.047,.05,linen,7,canvasWeave);
    }),gs("wrist"+side,group,({b})=>{
      b.ell(sign*.012,-.039,0,.044,.057,.028,leather,7,canvasWeave);
      b.ell(sign*.025,-.076,-.004,.017,.035,.019,Os,6);
    }),gs("ankle"+side,"legs",({b})=>{
      b.cbox(-.051,-.039,-.186,.054,.043,.035,.018,leather,canvasWeave);
      b.cbox(-.051,-.022,-.083,.054,.099,.052,.014,leather,canvasWeave);
      b.cbox(-.047,.059,-.086,.049,.092,-.074,.005,linen);
      b.cbox(-.055,-.048,-.191,.057,-.034,.036,.004,Jf);
    }));
  }

  OB.poses={...OB.poses,
    idle:Do({spine:[.03,-.03,-.031],chest:[.04,.02,.03],neck:[-.05,-.035,0],head:[-.10,-.14,-.025],
      jaw:.19,x:$o(.26,.04),aL:{f:.12,out:.34,e:.38},aR:{f:.18,out:.26,e:.44},
      lL:{f:.04,k:.08,out:.06},lR:{f:-.065,k:.10,out:.12}}),
    atk:[
      Do({spine:[.28,-.12,.075],chest:[.33,-.19,.06],neck:[.14,.03,-.08],head:[.12,-.025,-.09],
        jaw:.42,x:$o(.7,.14),aL:{f:.62,out:.19,e:.99,w:.24},aR:{f:.48,out:.31,e:.76,w:.16},
        lL:{f:.1,k:.25},lR:{f:-.12,k:.23},root:[0,0,-.04]}),
      Do({spine:[-.18,.08,-.03],chest:[-.27,.09,-.07],neck:[-.23,-.035,-.015],head:[-.39,.02,.04],
        jaw:1.36,x:$o(1,1),aL:{f:.91,out:1.12,e:.28},aR:{f:.98,out:1.00,e:.27},
        lL:{f:.10,k:.31,out:.11},lR:{f:-.10,k:.25,out:.11},root:[0,0,.06]}),
      OB.poses.atk[2]
    ]
  };

  // Canvas pixels from this second authored ramp use display sRGB. The native
  // cache slots keep their dimensions and count, including mirrored and masked
  // frames generated after first contact and detached clothing pieces.
  function useDisplayColors(texture){texture.colorSpace=ha;texture.needsUpdate=true;}
  const bake=iz;
  iz=function(rig){
    const sprites=bake.call(this,rig);
    if(rig!==OB)return sprites;
    const cache=sprites.rig;
    for(const texture of cache.all())useDisplayColors(texture);
    cache.frames.set=function(key,texture){useDisplayColors(texture);return Map.prototype.set.call(this,key,texture);};
    cache.bitmaps.set=function(key,bitmap){useDisplayColors(bitmap.tex);return Map.prototype.set.call(this,key,bitmap);};
    return sprites;
  };
})();
/* NECROPOLIS_SCREAMER_END */
