// Attach a test fixture at the native entry point without changing the tested HTML bytes.
const assert = require("node:assert/strict");
const entry = "Jk();ju();Yy();X$(J$);D0t();";

module.exports = async function observeGameEntry(page, url, content, fixture) {
  const offset = content.indexOf(entry);
  assert(offset >= 0 && content.indexOf(entry,offset+1) === -1,"Expected one native startup");
  const prefix = content.slice(0,offset);
  const client = await page.context().newCDPSession(page);
  let attached = false, error;
  try {
    await client.send("Debugger.enable");
    const bp = await client.send("Debugger.setBreakpointByUrl",{
      url,lineNumber:prefix.split("\n").length-1,columnNumber:prefix.length-prefix.lastIndexOf("\n")-1
    });
    client.on("Debugger.paused", async event => {
      try {
        const check = await client.send("Debugger.evaluateOnCallFrame",{
          callFrameId:event.callFrames[0].callFrameId,expression:"("+fixture.toString()+")();true;"
        });
        attached = check.result.value === true && !check.exceptionDetails;
        error = check.exceptionDetails?.exception?.description;
      } finally { await client.send("Debugger.resume"); }
    });
    await page.goto(url,{waitUntil:"domcontentloaded"});
    await client.send("Debugger.removeBreakpoint",{breakpointId:bp.breakpointId});
    await client.send("Debugger.disable");
    assert(attached,error||"Scoped observer was not available");
  } finally { await client.detach(); }
};
