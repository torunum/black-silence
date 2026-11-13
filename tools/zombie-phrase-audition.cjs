// Render a deterministic same-emitter burst through both actual voice modules.
// node tools/zombie-phrase-audition.cjs BASELINE_MODULE CANDIDATE_MODULE GAME.html OUTPUT
const fs = require("node:fs"), assert = require("node:assert/strict"), path = require("node:path");
const { chromium } = require("playwright");
const [before, after, input, out] = process.argv.slice(2);
if (!out) throw Error("Expected baseline JS, candidate JS, HTML and output directory");
const html = fs.readFileSync(input, "utf8");
const samples = Object.fromEntries([0, 2].map(i => {
  const key = "../../assets/sfx/moan.pain." + i + ".mp3";
  const variable = html.split('"' + key + '":')[1].match(/^\w+/)[0];
  return [key, html.split(',' + variable + '="')[1].split('"')[0]];
}));
fs.mkdirSync(out, {recursive:true});
function wav(values, hz) {
  const b = Buffer.alloc(44 + values.length*2);
  b.write("RIFF"); b.writeUInt32LE(b.length-8,4); b.write("WAVEfmt ",8);
  b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22);
  b.writeUInt32LE(hz,24); b.writeUInt32LE(hz*2,28); b.writeUInt16LE(2,32);
  b.writeUInt16LE(16,34); b.write("data",36); b.writeUInt32LE(b.length-44,40);
  for (let i=0;i<values.length;i++) b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,values[i]))*32767),44+i*2);
  return b;
}
(async () => {
  const browser = await chromium.launch({channel:"chrome",headless:true});
  try {
    const report={};
    for (const [label,file] of [["before",before],["after",after]]) {
      const page = await browser.newPage(); await page.goto("about:blank?qa=1");
      const data=await page.evaluate(async ({src,samples})=>{
        const sampleRate=24000, offline=new OfflineAudioContext(1,sampleRate*2,sampleRate);
        // Offline rendering suspends at each scripted impact, whereas the live
        // context keeps running. Only mirror "running" at those schedule points.
        const ctx=new Proxy(offline,{get(target,key){if(key==="state")return "running";const value=target[key];return typeof value==="function"?value.bind(target):value}});
        const It=()=>ctx, ar=()=>offline.destination, IQ=samples, CQ=s=>Uint8Array.from(atob(s.split(",")[1]),c=>c.charCodeAt(0)).buffer;
        const TQ=b=>{const x=b.getChannelData(0);let peak=0;for(const v of x)peak=Math.max(peak,Math.abs(v));const i=x.findIndex(v=>Math.abs(v)>peak*.02);return Math.max(0,i/b.sampleRate-.001)};
        const BQ=()=>Math.sqrt(120/140), Xu=()=>({gain:-.9}), NQ={}, jam=()=>{};
        let draws=0; const l0=()=>{draws++;return draws%2 ? .5 : .1};
        let qI=jam,V5=jam,ta=jam,rp=jam,pz=jam,p5=jam,d6=jam;
        let g6=(kind,event,delay,extra)=>d6(kind,event,extra);
        window.__BLACK_SILENCE_QA={}; eval(src); qI(); const api=__BLACK_SILENCE_QA.zombieAudio;await api.pending();
        if(!api.ready())throw Error("decode failed");
        const actors=[{},{}], frames=[];
        // Repeating RNG picks illustrate the common worst case of three identical hits.
        const hits=[[.08,0],[.20,0],[.32,0],[.35,1],[1.10,0]];
        const events=hits.map(([time,actor])=>offline.suspend(time).then(async()=>{
          g6("z","pain",.04,[],actors[actor]);frames.push({time,actor,voices:api.active(),path:api.history.at(-1).path});await offline.resume();
        }));
        const mixed=await offline.startRendering();await Promise.all(events);
        return {frames,draws,sampleRate,pcm:Array.from(mixed.getChannelData(0))};
      },{src:fs.readFileSync(file,"utf8"),samples});
      const {pcm,...stats}=data;
      stats.peak=Math.max(...pcm.map(Math.abs));
      assert(stats.peak>0.1 && stats.peak<1,"unclipped waveform"); assert.equal(stats.draws,10);
      fs.writeFileSync(path.join(out,label+".wav"),wav(pcm,data.sampleRate));report[label]=stats;await page.close();
    }
    assert.deepEqual(report.after.frames.map(f=>f.path.split(".").at(-2)),["0","0","2","0","0"]);
    assert(report.after.frames[3].voices < report.before.frames[3].voices, "After fade, prior hits don't stack");
    assert.equal(report.after.frames[3].voices,2,"two different monsters may speak");
    fs.writeFileSync(path.join(out,"audition.json"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
