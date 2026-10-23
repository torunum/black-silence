/* BLACK_SILENCE_VILLAGE_PRESENTATION_BEGIN
 * Pass 2: original material grain, moonlit depth, restrained warm accents.
 * Presentation-only extension of the October 23 authoritative standalone.
 * No changes to map cells, elevation, collision masses, doors, enemies or combat.
 * Original weapons, hands, audio, animation and pixel-resolution settings survive.
 */
(() => {
  const LEVEL = 10;
  let textures = null;
  // Reuse the authored pixel textures, which already account for this game's
  // disabled color management and filmic output. No new texture/noise assets.
  function makeTextures() {
    return {wall:Ft.dungeonWall,slate:Ft.pillar,glow:to.spark};
  }

  // Patch the source themes, not the fog object overwritten by TR every frame.
  // Clone each theme so cached colors and subsequent chapter loads are isolated.
  const buildVillage = gV[LEVEL].build;
  gV[LEVEL].build = function (...args) {
    const map = buildVillage.apply(this,args);
    textures = makeTextures();
    map.zones = {...map.zones, themes: map.zones.themes.map(theme => {
      const result = {...theme};
      if (theme.sky) {
        result.fog = theme.id === 'v_burned' ? 0x100c09 : 0x080f19;
        result.fogD = theme.id === 'v_field' ? .019 : theme.id === 'v_graveyard' ? .018 : .013;
        result.amb = theme.id === 'v_burned' ? 0x786b59 : 0x647b99;
        result.ambI = theme.id === 'v_field' ? .96 : 1.18;
        // Keep each zone's original floor, masonry, sides and material grain.
      }
      return result;
    })};
    return map;
  };

  const materials = FP;
  FP = function () {
    const result = materials();
    if (textures && T.level === LEVEL) {
      result.villageSlate = () => new Wt({map:textures.slate,color:0x7c8b9a});
      result.villageStone = () => new Wt({map:textures.wall,color:0x8c8d89});
    }
    return result;
  };
  // Existing roofs retain exactly their dimensions/positions. Slate courses,
  // ridge caps and timber gable braces make their silhouette legible in moonlight.
  for (const kind of ['houseroof','roof']) {
    const original = di[kind].build;
    di[kind].build = function (box,cylinder,spec,headroom,...rest) {
      if (T.level !== LEVEL) return original(box,cylinder,spec,headroom,...rest);
      const mapped = (material,...args) => box(material === 'slate' ? 'villageSlate' : material === 'stone' ? 'villageStone' : material,...args);
      original(mapped,cylinder,spec,headroom,...rest);
      if (kind !== 'houseroof') return;
      const w=spec.s||8, d=spec.h||8, base=Math.max(headroom,Zt), rise=Math.min(2.4,w*.32);
      box('villageSlate',.36,.24,d+.9,E(0,base+rise+.09,0));
      for (const end of [-1,1]) {
        const z=end*(d/2+.13);
        box('wood',.16,rise,.18,E(0,base+rise/2,z));
        box('wood',w+.4,.19,.18,E(0,base+.04,z));
        for (const side of [-1,1]) {
          const half=w*.24, len=Math.hypot(half,rise*.8);
          box('wood',.13,len,.18,E(side*half/2,base+rise*.42,z,0,0,-side*Math.atan2(half,rise*.8)));
        }
      }
    };
  }

  const decorate = FJ;
  FJ = function (scene,map) {
    decorate(scene,map);
    if (T.level !== LEVEL || !textures) return;
    const batches = new Map();
    const addBox = (key,w,h,d,x,y,z,rz=0) => {
      const geometry = new Ne(w,h,d);
      const matrix=E(x,y,z,0,0,rz);
      Yd(batches,key,geometry,matrix);
    };
    // All facade additions hug already-solid wall faces, never doorway cells.
    // Their maximum projection is 3cm; no visual barriers are placed in lanes.
    const beam=Z(new Wt({map:Ft.wood,color:0x6a5844}));
    const stone=Z(new Wt({map:textures.wall,color:0x777d81}));
    const pane=Z(new $e({color:0x71300a}));
    const iron=Z(new Wt({color:0x211e1a}));
    const batchMaterials={beam,stone,pane,iron};
    const facade = (x0,x1,z,side) => {
      const face=z*P+(side>0?P:0), y=J0;
      for(let x=x0;x<=x1;x++) {
        if(map.g[z]?.[x]!=='#' && map.g[z]?.[x]!=='W') continue;
        const wx=(x+.5)*P, fz=face+side*.025;
        addBox('beam',P,.15,.045,wx,y+2.9,fz);
        addBox('stone',P,.16,.065,wx,y+.14,fz);
        if((x-x0)%3===0) addBox('beam',.16,2.85,.045,wx-.85,y+1.45,fz);
        if((x-x0)%4===1) {
          addBox('iron',.76,1.12,.05,wx,y+1.9,fz+side*.025);
          addBox('pane',.55,.86,.012,wx,y+1.9,fz+side*.06);
          addBox('beam',.055,.91,.025,wx,y+1.9,fz+side*.08);
          addBox('beam',.6,.055,.025,wx,y+1.88,fz+side*.08);
          addBox('stone',.86,.09,.18,wx,y+1.31,fz+side*.04);
        }
      }
    };
    facade(21,31,21,-1); facade(40,49,21,-1);
    facade(21,31,32,-1); facade(40,49,32,-1);
    // No invented skyline, buildings or distant route silhouettes. Depth is
    // supplied by the original village geometry and its graduated night fog.
    for(const [key,geometries] of batches) {
      const mesh=new pt(Z(BR(geometries)),batchMaterials[key]);
      mesh.name='villagePresentation_'+key;scene.add(mesh);
    }
    // Existing flames remain authoritative. Subtle pools provide local warmth
    // even with shadows disabled, without adding a dozen shader point lights.
    for(const torch of v.torches) {
      const x=torch.x,z=torch.z;
      if(!UV(Math.floor(x/P),Math.floor(z/P))?.sky) continue;
      torch.L.color.setHex(0xffa64c);
      torch.L.distance = Math.max(torch.L.distance,13);
      const pool=new pt(Z(new Xe(5,5)),Z(new $e({map:textures.glow,color:0x9b4610,
        transparent:true,opacity:.12,blending:is,depthWrite:false,polygonOffset:true,
        polygonOffsetFactor:-1,polygonOffsetUnits:-1})));
      pool.rotation.x=-Math.PI/2;pool.position.set(x,ie(x,z)+.012,z);
      pool.name='villageTorchPool';scene.add(pool);
      const halo=new nh(Z(new qV({map:textures.glow,color:0xffa54c,transparent:true,
        opacity:.22,blending:is,depthWrite:false})));
      halo.position.copy(torch.sp.position);halo.scale.set(.95,1.2,1);
      halo.name='villageTorchHalo';scene.add(halo);
    }
    const stars=scene.getObjectByName('stars');
    if(stars) {stars.material.size=1.15;stars.material.color.setHex(0xa9b4c0);}
  };

  // Scope the overlay treatment to the village; retain the native 90m camera,
  // original FOV, projection and all chapter transition behavior.
  const loadChapter = rp;
  rp = function (...args) {
    const result = loadChapter.apply(this,args);
    document.body.classList.toggle('village-presentation',T.level === LEVEL);
    return result;
  };

  // HUD remains the original live DOM, not a screenshot or duplicate display.
  // Higher contrast, carefully restrained frames and less crushed edge shading.
  const style=document.createElement('style');
  style.textContent=`
    #hud{padding:16px 24px;letter-spacing:2px;text-shadow:2px 2px 0 #090807,-1px -1px 0 #090807;}
    #hud .num{font-size:36px;line-height:1;font-weight:900;}
    #hud .stat{font-size:13px;letter-spacing:2px;color:#b0a38a;margin-bottom:4px;}
    #hp .num{color:#c94c35}#ar .num{color:#82a8c7}#am .num{color:#d6ba78}
    #hud .sub2{color:#afa185;font-size:13px;}#hud .ico{filter:drop-shadow(2px 2px 0 #080807);}
    #hud .istat{gap:9px;}#wname{color:#a69b81;font-size:12px;letter-spacing:3px;opacity:.8;}
    body.village-presentation #vig{background:radial-gradient(ellipse at center,transparent 52%,rgba(0,0,0,.56) 100%);}
    body.village-presentation #crt{opacity:.38;}
    @media(max-width:700px){#hud{padding:12px;}#hud .num{font-size:34px;}#wname{display:none;}}
  `;
  document.head.appendChild(style);
})();
/* BLACK_SILENCE_VILLAGE_PRESENTATION_END */
