// Verify a lone, unmodified HTML file from the release ZIP using normal input.
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");

(async()=>{
  assert(process.argv[2],"Pass the extracted HTML in an otherwise empty directory");
  const file=path.resolve(process.argv[2]);
  assert.deepEqual(fs.readdirSync(path.dirname(file)),[path.basename(file)]);
  const htmlSha256=crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const browser=await chromium.launch({channel:"chrome"});
  try {
    const page=await browser.newPage({offline:true,viewport:{width:960,height:600}});
    const errors=[],requests=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("request",r=>{if(/^(https?|file):/.test(r.url()))requests.push(r.url());});
    // A silent measurement tap observes the game's own master output. The
    // original connection and every normal Web Audio input remain as authored.
    await page.addInitScript(()=>{
      const connect=AudioNode.prototype.connect;
      window.deliveryAudio={peak:0};
      AudioNode.prototype.connect=function(target,...args){
        const result=connect.call(this,target,...args);
        if(target instanceof AudioDestinationNode && !deliveryAudio.analyser){
          const meter=this.context.createAnalyser(),data=new Float32Array(1024);
          meter.fftSize=data.length;
          connect.call(this,meter);
          deliveryAudio.analyser=meter;
          setInterval(()=>{meter.getFloatTimeDomainData(data);for(const v of data)deliveryAudio.peak=Math.max(deliveryAudio.peak,Math.abs(v));},12);
        }
        return result;
      };
    });
    const url=pathToFileURL(file).href;
    await page.goto(url);
    assert.equal(await page.evaluate(()=>typeof window.__BLACK_SILENCE_QA),"undefined");
    await page.locator("#mNew").click();
    await page.waitForFunction(()=>document.pointerLockElement===document.getElementById("game"));
    const ammo=()=>page.locator("#am .num").evaluate(el=>[Number(el.firstChild.data),Number(el.querySelector(".sub2").textContent.split("|")[1])]);
    await page.waitForFunction(()=>Number(document.querySelector("#am .num").firstChild.data)>0);
    const initial=await ammo();
    // New Game owns the Prologue intro. Click after it releases combat input;
    // stop immediately after the first accepted shot appears on the real HUD.
    const deadline=Date.now()+90000;
    let fired=initial;
    do {
      await page.mouse.click(470,290);
      await page.waitForTimeout(200);
      fired=await ammo();
    } while(fired[0]===initial[0] && Date.now()<deadline);
    assert.deepEqual(fired,[initial[0]-1,initial[1]],"New Game did not discharge exactly one round");
    await page.keyboard.press("r");
    await page.waitForFunction(()=>document.getElementById("wname").textContent.includes("RELOADING"),null,{timeout:10000});
    await page.waitForFunction(n=>Number(document.querySelector("#am .num").firstChild.data)===n,initial[0],{timeout:30000});
    const reloaded=await ammo();
    assert.deepEqual(reloaded,[initial[0],initial[1]-1]);
    const peak=await page.evaluate(()=>deliveryAudio.peak);
    assert(peak>.001,"The running game did not produce measurable audio");
    assert.deepEqual(requests,[url]);
    assert.deepEqual(errors,[]);
    const report={passed:true,htmlSha256,offline:true,ordinaryLaunch:true,isolatedFiles:1,networkRequests:0,qaBridge:false,initial,fired,reloaded,masterPeak:peak,errors};
    if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
