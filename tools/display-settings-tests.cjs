// Usage: node tools/display-settings-tests.cjs GAME.html
const assert = require("node:assert/strict"), path=require("node:path");
const {pathToFileURL}=require("node:url"), {chromium}=require("playwright");
const url=pathToFileURL(path.resolve(process.argv[2] || "THE-BLACK-SILENCE.html")).href;
(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true});
  try {
    for(const denied of [false,true]){
      const page=await browser.newPage({viewport:{width:360,height:480}});
      const errors=[];page.on("pageerror",e=>errors.push(e.message));
      if(denied)await page.addInitScript(()=>{Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Blocked","SecurityError")}})});
      await page.goto(url); const trigger=page.locator("#mSettings"),slider=page.getByRole("slider",{name:"CRT SCANLINES"});
      await trigger.focus(); await page.keyboard.press("Enter"); await slider.waitFor();
      assert.equal(await slider.inputValue(),"100");
      const layers=()=>page.evaluate(()=>["crt","vig"].map(id=>getComputedStyle(document.getElementById(id)).backgroundImage));
      const initial=await layers();assert.match(initial[0],/0\.22/);assert.match(initial[1],/gradient/);
      assert.equal(await page.evaluate(()=>document.activeElement.id),"scanlineStrength");
      await page.keyboard.press("Home");assert.deepEqual(await layers(),["none",initial[1]]);
      await page.keyboard.press("ArrowRight");assert.equal(await slider.inputValue(),"5");
      const dim=await layers();assert.match(dim[0],/0\.01/);assert.equal(dim[1],initial[1]);
      assert.equal(await page.locator("#settings .ctrlgrid").getByText("1–9, 0 / WHEEL").count(),1);
      const size=await page.locator("#settings").evaluate(p=>[p.scrollWidth,p.clientWidth,p.scrollHeight,p.clientHeight]);assert(size[0]<=size[1]+1);
      const back=page.locator("#setBack");await back.scrollIntoViewIfNeeded();
      assert(await back.evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1));
      await back.focus();await page.keyboard.press("Space");assert(await trigger.isVisible());
      await page.reload();await trigger.click();assert.equal(await slider.inputValue(),denied?"100":"5");
      await slider.focus();await page.keyboard.press("End");assert.deepEqual(await layers(),initial);
      assert.deepEqual(errors,[]);console.log(JSON.stringify({denied,default:"native",off:"none",narrow:size,persistence:denied?"session-only":"passed"}));await page.close();
    }
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
