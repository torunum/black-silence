// Local preview only. The released HTML also works directly from disk.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const file = path.resolve(__dirname, "..", "THE-BLACK-SILENCE.html");
const port = Number(process.env.PORT || 8765);
http
  .createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname !== "/" && pathname !== "/THE-BLACK-SILENCE.html") {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Play: http://127.0.0.1:${port}`),
  );
