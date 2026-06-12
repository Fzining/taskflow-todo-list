import { createServer } from "node:http";
import { appendFileSync, readFile } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const host = "127.0.0.1";
const log = (message) => appendFileSync("server.log", `${new Date().toISOString()} ${message}\n`);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

process.on("uncaughtException", (error) => {
  log(`uncaughtException ${error.stack || error.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  log(`unhandledRejection ${error?.stack || error}`);
  process.exit(1);
});

createServer((request, response) => {
  let urlPath = decodeURIComponent(request.url.split("?")[0]);
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  const filePath = resolve(join(root, urlPath));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(data);
  });
}).listen(port, host, () => {
  log(`TaskFlow running at http://${host}:${port}`);
  console.log(`TaskFlow running at http://${host}:${port}`);
});
