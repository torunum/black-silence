const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {createHash}=require("node:crypto");

const file=path.resolve(process.argv[2]||path.join(__dirname,"..","src","ash-bell-arrival.js"));
const contents=fs.readFileSync(file,"utf8");
const results=[];
const requireNear=(actual,expected,tolerance=1e-6)=>assert(Math.abs(actual-expected)<tolerance,`${actual} expected ${expected}`);

function harness(){
  const listeners={}, docListeners={};
  let now=0;
  const element=()=>({hidden:false,children:[],textContent:"",listeners:{},attributes:{},
    append(...children){this.children.push(...children);},
    setAttribute(name,value){this.attributes[name]=value;},
    addEventListener(name,callback){this.listeners[name]=callback;}, focus(){document.activeElement=this;}, blur(){document.activeElement=null;}});
  const document={createElement:element,head:element(),body:element(),hidden:false,
    addEventListener(type,fn){docListeners[type]=fn;},activeElement:null};
  document.body.classList={toggle(){}};
  const {T,C,Ct,oe}= {
    T:{level:0,levelT0:0,t0:-13000},C:{px:167,pyy:1,pz:153},Ct:{yaw:Math.PI,pitch:0},oe:{t:0,phase:"card"},
  };
  const J={scene:{},camera:{position:{x:167,y:1,z:153},rotation:{y:Math.PI/2,x:0}}};
  const An={paused:false,finished:0,tolls:0,lastPose:null};
  const door={mesh:{position:{x:167,y:0,z:147}}};
  const c=vm.createContext({
    console,document,T,C,Ct,oe,J,li:{KeyW:true,KeyE:false},v:{doors:{"83,73":door},grid:[]},z0:{entrance:{rig:{style:"hatch"}}},
    performance:{now:()=>now},pc:{arrive:2.3},hR:()=>9,matchMedia:()=>({matches:false}),fu:()=>false,k5:()=>"ash",
    Wk:()=>An.paused,Qm:()=>false,ie:()=>0,FJ(){},w0(){},P4(){An.tolls++;},Nt(x,y,z,f){f();},
    kn:(a,b,t)=>a+(b-a)*t,lr:(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a)),dA:(x,z)=>Math.atan2(-x,-z),
    Ge:(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);},
    Vr(...args){An.lastPose=args;}, Fd(){An.finished++;oe.phase="idle";},
    uk(){T.level=9;T.levelT0=now;oe.phase="arrive";oe.t=0;},
    o_(){if(oe.t>=2.3){An.finished++;oe.phase="idle";}},
    addEventListener(type,fn){listeners[type]=fn;},
  });
  vm.runInContext("function i_(dt) { if (oe.phase === 'arrive') { oe.t += dt; o_(); } }",c);
  vm.runInContext(contents,c);
  const step=(dt,ms=dt*1000)=>{now+=ms;c.i_(dt);};
  const visibility=(hidden)=>{document.hidden=hidden;docListeners.visibilitychange?.();};
  const key=(code,repeat=false)=>{let canceled=false;listeners.keydown({code,repeat,preventDefault(){canceled=true;},stopImmediatePropagation(){}});return canceled;};
  const click=()=>{let stopped=false;listeners.mousedown({button:0,preventDefault(){stopped=true;},stopImmediatePropagation(){}});return stopped;};
  const begin=()=>{c.uk();step(1.75);};
  const finishAt=(dt,ms)=>{for(let i=0;i<600&&!An.finished;i++)step(dt,ms);assert.equal(An.finished,1);};
  const advanceWall=ms=>{now+=ms;};
  return {c,T,Ct,oe,J,An,document,begin,step,key,click,visibility,finishAt,advanceWall,now:()=>now};
}

{
  const h=harness();h.begin();assert(h.key("Space",true));assert.equal(h.An.finished,0);
  assert(h.key("Space"));assert.equal(h.An.finished,1);assert.equal(h.T.levelT0,0);
  assert.equal(h.T.t0,-13000);assert.equal(h.An.tolls,0);assert(!h.c.li.KeyW);
  results.push({name:"fresh early keyboard skip credits zero, native repeats blocked",elapsed:h.now()-h.T.levelT0});
}
for(const [name,dt,ms,expected] of [["warm_50fps",.02,20,5650],["wall_hitch_5fps",.05,200,22600]]){
  const h=harness();h.begin();h.finishAt(dt,ms);
  requireNear(h.T.levelT0,expected);requireNear(h.T.t0,-13000+expected);
  assert(h.now()>=h.T.levelT0&&h.now()>=h.T.t0);assert.equal(h.An.tolls,1);
  results.push({name,wallCredit:h.T.levelT0,scoredTime:h.now()-h.T.levelT0});
}
{
  const h=harness();h.begin();
  for(let i=0;i<14;i++)h.step(.05,50);
  const startCredit=h.T.levelT0;
  assert(startCredit>0);
  h.visibility(true);h.step(.05,10000);h.advanceWall(46000);h.visibility(false);
  h.step(.05,50);assert.equal(h.T.levelT0,startCredit);
  h.step(.05,50);requireNear(h.T.levelT0,startCredit+50);
  h.advanceWall(23);assert(h.click());requireNear(h.T.levelT0,startCredit+73);
  assert.equal(h.An.finished,1);
  results.push({name:"hidden pause time preserved, actual resumed late-click tail excluded",before:startCredit,after:h.T.levelT0,wallPaused:56000});
}
{
  const h=harness();h.begin();for(let i=0;i<15;i++)h.step(.05,50);
  h.J.scene={};h.oe.phase="idle";h.T.levelT0=h.now()-10;h.step(.05,50);
  assert.equal(h.T.levelT0,h.now()-60);assert(!h.key("Space"));assert.equal(h.An.finished,0);
  results.push({name:"new/restarted scene cancels previous story/clock"});
}
const report={sourceSHA256:createHash("sha256").update(contents).digest("hex"),scope:"Monotonic-clock/pose stubs drive the real cinematic module with synthetic native/render deltas, independent of Chromium flow.",results};
console.log(JSON.stringify(report));
