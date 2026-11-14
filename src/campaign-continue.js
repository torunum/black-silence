// One local campaign slot. The native entry inventory and the most recent
// shrine are the same objects used by Restart Level and Rise Again.
(() => {
  const storageKey = "black-silence.campaign.v1";
  const canvas=J.renderer.domElement;
  const requestLock=canvas.requestPointerLock;
  if(requestLock) {
    let pending=null;
    canvas.requestPointerLock=function(...args) {
      if(document.pointerLockElement===this || !this.isConnected) return;
      if(pending) return pending;
      const result=requestLock.apply(this,args);
      if(!result?.then) return result;
      // A closed/reloaded tab or expired user activation can reject this
      // optional request. The existing canvas click retries it on the next
      // gesture. Keep all other pointer-lock failures observable.
      pending=result.catch(error=>{
        if(!["WrongDocumentError","NotAllowedError","SecurityError","AbortError"].includes(error.name)) throw error;
      }).finally(()=>{pending=null;});
      return pending;
    };
  }
  const canPersist = !new URLSearchParams(location.search).has("qa") &&
    !location.hash.includes("dev");
  const tallies = ["kills","gibs","secrets","shots","hitsLanded","propsBroken"];
  const counters = ["pianoNotes","kickK","beheads"];
  const achievementById = new Map(Object.values(gn).map(a=>[a.id,a]));
  const record = value => value && typeof value === "object" && !Array.isArray(value);
  const number = (value, max) => Number.isFinite(value) && value >= 0 && value <= max;
  const integer = (value, max=10000000) => Number.isInteger(value) && number(value,max);
  const arrayOf = (values, limit, check) => Array.isArray(values) &&
    values.length<=limit && values.every(check);
  const clock = value => number(value,365*24*3600*1000);
  const ammoKeys = Object.keys(T.ammo);
  const ids = value => arrayOf(value,4096,n=>integer(n,4095)) &&
    new Set(value).size === value.length;
  function topology() {
    let hash=2166136261;
    for(const row of v.grid) for(const cell of row)
      hash=Math.imul(hash^cell.charCodeAt(0),16777619);
    return (hash>>>0).toString(16);
  }
  function mapDigest(bits,signature) {
    let hash=2166136261;
    for(let i=0;i<signature.length;i++)
      hash=Math.imul(hash^signature.charCodeAt(i),16777619);
    for(let i=0;i<bits.length;i++) hash=Math.imul(hash^bits.charCodeAt(i),16777619);
    return (hash>>>0).toString(16);
  }
  function captureMap() {
    Gk();
    const size=We.W*We.H;
    if(!size || size>65536 || We.seen.length!==size) return null;
    const bytes=new Uint8Array(Math.ceil(size/8));
    for(let i=0;i<size;i++) if(We.seen[i]) bytes[i>>3]|=1<<(i%8);
    const data=btoa(String.fromCharCode(...bytes));
    const layout=topology(), w=We.W, h=We.H;
    return {v:1,w,h,layout,data,check:mapDigest(data,[T.level,w,h,layout].join("/"))};
  }
  function restoreMap(map) {
    Gk();
    const size=We.W*We.H, count=Math.ceil(size/8);
    if(!record(map) || map.v!==1 || !size || size>65536 || map.w!==We.W || map.h!==We.H ||
        typeof map.data!=="string" || map.data.length!==4*Math.ceil(count/3)) return;
    const layout=topology();
    // The sally port rebuilt three cells in the shipped 58×44 dungeon. Keep
    // a signed old chart everywhere the floor plan is still identical.
    const oldDungeon=T.level===1 && We.W===58 && We.H===44 &&
      map.layout==="7a18b2bb" && layout==="269c7657";
    if((map.layout!==layout && !oldDungeon) ||
        map.check!==mapDigest(map.data,[T.level,We.W,We.H,map.layout].join("/"))) return;
    try {
      const bytes=atob(map.data);
      if(bytes.length!==count || btoa(bytes)!==map.data ||
          (size%8 && bytes.charCodeAt(count-1)>>(size%8))) return;
      for(let i=0;i<size;i++) We.seen[i]=(bytes.charCodeAt(i>>3)>>(i%8))&1;
      if(oldDungeon) for(let z=20;z<=22;z++) We.seen[z*We.W+17]=0;
    } catch { /* An old or damaged overlay must not invalidate the shrine. */ }
  }
  function inventory(value) {
    return record(value) && number(value.hp,1000) && value.hp>0 && number(value.armor,1000) &&
      typeof value.key==="boolean" && record(value.ammo) &&
      Object.keys(value.ammo).length===ammoKeys.length && ammoKeys.every(k=>integer(value.ammo[k])) &&
      arrayOf(value.mag,Th.length,n=>integer(n,1000)) && value.mag.length===Th.length &&
      arrayOf(value.weapons,Th.length,n=>typeof n==="boolean") && value.weapons.length===Th.length &&
      integer(value.cur,Th.length-1) && value.weapons[value.cur] &&
      ["totKills","totGibs","totSecrets"].every(k=>integer(value[k]));
  }
  function snapshot(s) {
    if (!record(s) || !integer(s.mark,255) || !ids(s.lit) || !s.lit.includes(s.mark) ||
        !record(s.at) || !number(s.at.x,8192) || !number(s.at.z,8192) ||
        !Number.isFinite(s.at.yaw) || Math.abs(s.at.yaw)>1e7 || !inventory(s.inv) ||
        !record(s.tallies) || Object.keys(s.tallies).length!==tallies.length ||
        !tallies.every(k=>integer(s.tallies[k]))) return false;
    const f=s.facts;
    return record(f) && ids(f.killed) && ids(f.taken) && ids(f.broken) &&
      arrayOf(f.opened,4096,k=>typeof k==="string" && /^\d{1,4},\d{1,4}$/.test(k)) &&
      arrayOf(f.spawned,2048,item=>record(item) && typeof item.kind==="string" &&
        /^[A-Za-z][A-Za-z0-9]{0,23}$/.test(item.kind) &&
        number(item.x,8192) && number(item.z,8192)) && integer(f.challenge,2) &&
      (!("sidereal" in f) || (Array.isArray(f.sidereal) && f.sidereal.length===2 &&
        f.sidereal.every(n=>integer(n,3)))) &&
      (!("sewerPrimed" in f) || typeof f.sewerPrimed==="boolean");
  }
  function read() {
    if (!canPersist) return null;
    try {
      const text=localStorage.getItem(storageKey);
      if (!text || text.length>131072) return null;
      const r=JSON.parse(text);
      if (!record(r) || r.version!==1 || typeof r.id!=="string" || !/^[0-9a-f]{32}$/.test(r.id) ||
          !dh.includes(r.level) || !inventory(r.entry) ||
          !integer(r.deaths) || !clock(r.totalMs) || !clock(r.levelMs) ||
          !record(r.counts) || !counters.every(k=>integer(r.counts[k])) ||
          !arrayOf(r.achievements,achievementById.size,id=>achievementById.has(id)) ||
          !(r.shrine===null || snapshot(r.shrine))) return null;
      return r;
    } catch { return null; }
  }
  let campaign=false, restoring=null, runId=null, claimSlot=false;
  function newId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,"0")).join("");
  }
  function save() {
    if (!campaign || restoring || !canPersist || !Q0.entry) return;
    const now=T.dead ? Q0.deadAt : performance.now();
    const value={
      version:1,id:runId,level:T.level,entry:Q0.entry,shrine:Q0.snap,deaths:T.deaths,
      totalMs:Math.max(0,now-T.t0),levelMs:Math.max(0,now-T.levelT0),
      achievements:Object.keys(T.ach).filter(k=>achievementById.has(k)),
      counts:Object.fromEntries(counters.map(k=>[k,T[k]||0])),
    };
    try {
      if (!claimSlot && read()?.id!==runId) return;
      const text=JSON.stringify(value);
      if(text.length>131072) return;
      localStorage.setItem(storageKey,text);
      claimSlot=false;
    } catch {}
  }
  function fitsLevel(s) {
    if(!s) return false;
    const f=s.facts, nearby=Q0.marks[s.mark];
    return nearby && Math.hypot(nearby.x-s.at.x,nearby.z-s.at.z)<=aR+.01 &&
      !d0(s.at.x,s.at.z) && s.lit.every(i=>i<Q0.marks.length) &&
      f.killed.every(i=>i<Q0.base.enemies) && f.taken.every(i=>i<Q0.base.items) &&
      f.broken.every(i=>i<Q0.base.props) && f.opened.every(k=>Object.hasOwn(v.doors,k)) &&
      f.spawned.every(i=>Object.hasOwn(f0,i.kind) && i.x<v.GW*P && i.z<v.GH*P);
  }
  const load=rp;
  rp=function(level, options) {
    const r=restoring;
    const result=load.call(this,level,r?.shrine ? {} : options);
    if (r) {
      Q0.entry=r.entry;
      Q0.snap=null;
      lk(r.entry);
      T.deaths=r.deaths;
      for(const id of r.achievements) {
        const {title,desc}=achievementById.get(id);
        T.ach[id]={title,desc};
      }
      for(const k of counters) T[k]=r.counts[k];
      if (fitsLevel(r.shrine)) {
        const s=Q0.snap=r.shrine;
        C.px=s.at.x; C.pz=s.at.z; C.pyy=Yo+ie(C.px,C.pz);
        Ct.yaw=s.at.yaw; Ct.pitch=0;
        lk(s.inv); Object.assign(T,s.tallies);
        a_(s.facts); jH();
        for(const index of s.lit) qk(Q0.marks[index],index);
        restoreMap(s.automap);
        Be.inputLock=false;
        le("THE SHRINE REMEMBERS",2.6);
      } else if (r.shrine) {
        // A structurally valid save can refer to a previous edition's map.
        // Re-enter through the normal chapter load so its camera/intro agrees
        // with the spawn. The entry inventory still belongs to this campaign.
        load.call(this,level);
        Q0.entry=r.entry; lk(r.entry); T.deaths=r.deaths;
        le("CONTINUING FROM THE CHAPTER START",3.2);
      }
      T.levelT0=performance.now()-r.levelMs;
      ap();
    } else if (!options) save();
    return result;
  };
  const mark=QX;
  QX=function(...args) {
    const previous=Q0.snap;
    const result=mark.apply(this,args);
    if(Q0.snap!==previous && campaign) {
      const map=captureMap();
      if(map) Q0.snap.automap=map;
      save();
    }
    return result;
  };
  const restart=r_, rise=s_, died=V_, victory=h9;
  s_=function(...args) { const result=rise.apply(this,args);
    if(result && campaign) restoreMap(Q0.snap?.automap);
    return result;
  };
  r_=function(...args) { const result=restart.apply(this,args); if(result) save(); return result; };
  V_=function(...args) { const result=died.apply(this,args); save(); return result; };
  h9=function(...args) {
    const result=victory.apply(this,args);
    if(campaign && T.won && T.level===dh[dh.length-1]) {
      campaign=false;
      try { if(read()?.id===runId) localStorage.removeItem(storageKey); } catch {}
    }
    return result;
  };
  // Set campaign intent only on the actual New Game menu. Chapter Select
  // shares the same native launch function and must not replace a campaign.
  const fresh=Jt("mNew");
  fresh.addEventListener("click",()=>{
    if(Be.started || !canPersist) return;
    campaign=true; runId=newId(); claimSlot=true;
  },{capture:true});
  const start=J$;
  J$=function(...args) {
    const wasStarted=Be.started;
    if(!wasStarted && navigator.userActivation?.isActive) canvas.requestPointerLock?.();
    const result=start.apply(this,args);
    if(!wasStarted && campaign) {
      if(restoring) T.t0=performance.now()-restoring.totalMs;
      else save();
    }
    return result;
  };
  const saved=read();
  if(!saved) return;
  const button=document.createElement("button");
  button.type="button"; button.id="mContinue"; button.className="mbtn";
  button.style.cssText="appearance:none;box-sizing:content-box;background-color:transparent;font-family:inherit";
  const sub=document.createElement("small");
  sub.style.cssText="display:block;font-size:.74em;letter-spacing:.08em;line-height:1.5";
  sub.textContent=Ow(saved.level)+" · "+(saved.shrine?"SHRINE":"CHAPTER START");
  button.append("[ CONTINUE ]",sub); fresh.before(button);
  button.addEventListener("click",()=>{
    if(Be.started) return;
    const slot=read();
    if(!slot) { button.remove(); return; }
    restoring=slot; runId=slot.id; campaign=true;
    try { J$(slot.level); } finally { restoring=null; }
  });
})();
