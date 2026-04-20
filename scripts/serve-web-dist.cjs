const http = require("http");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const root = path.join(repoRoot, "apps", "web", "dist");
const port = Number(process.env.PORT || process.argv[2] || 8081);
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(res, file) {
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "cache-control": "no-cache",
      "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!relativePath || relativePath.endsWith("/")) {
    relativePath += "index.html";
  }

  let file = path.resolve(root, relativePath);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(file, (error, stat) => {
    if (error || stat.isDirectory()) {
      file = path.join(root, "index.html");
    }
    send(res, file);
  });
});

server.listen(port, host, () => {
  console.log(`Creators web at http://${host}:${port}`);
});
