/* Hilton Dispatch — static files + shared JSON store for Railway. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8756;

function resolveStorePath() {
  if (process.env.DATA_DIR) return path.join(process.env.DATA_DIR, "store.json");
  try {
    if (fs.existsSync("/data") && fs.statSync("/data").isDirectory()) {
      return path.join("/data", "store.json");
    }
  } catch (e) { /* no /data */ }
  return path.join(ROOT, "data", "store.json");
}

const STORE = resolveStorePath();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".map": "application/json",
};

function send(res, code, body, headers) {
  res.writeHead(code, headers || { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

function sendJson(res, code, obj) {
  send(res, code, JSON.stringify(obj), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
}

function readStore() {
  try {
    const raw = fs.readFileSync(STORE, "utf8");
    const data = JSON.parse(raw);
    return { seeded: false, settings: data.settings || null, jobs: Array.isArray(data.jobs) ? data.jobs : [] };
  } catch (e) {
    return { seeded: true, settings: null, jobs: [] };
  }
}

function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, text, "utf8");
  try {
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.copyFileSync(tmp, file);
    try { fs.unlinkSync(tmp); } catch (err) { /* ignore */ }
  }
}

function blocked(rel) {
  const n = rel.replace(/\\/g, "/").toLowerCase();
  if (n === "server.js" || n === "procfile" || n === "package.json") return true;
  if (n.startsWith("data/") || n === "data") return true;
  if (n.includes("store.json")) return true;
  if (n.startsWith(".git")) return true;
  return false;
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  rel = rel.replace(/^\/+/, "");
  const abs = path.normalize(path.join(ROOT, rel));
  if (!abs.startsWith(ROOT) || blocked(rel)) {
    send(res, 404, "Not found");
    return;
  }
  fs.readFile(abs, (err, buf) => {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    send(res, 200, buf, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=60",
    });
  });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  const method = req.method || "GET";

  if (url.split("?")[0] === "/api/store" && method === "GET") {
    sendJson(res, 200, readStore());
    return;
  }

  if (url.split("?")[0] === "/api/store" && method === "PUT") {
    try {
      const raw = await readBody(req, 8 * 1024 * 1024);
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") throw new Error("bad store");
      const out = {
        settings: data.settings || null,
        jobs: Array.isArray(data.jobs) ? data.jobs : [],
        savedAt: new Date().toISOString(),
      };
      atomicWrite(STORE, JSON.stringify(out, null, 2));
      sendJson(res, 200, { ok: true });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message || "bad store" });
    }
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    send(res, 405, "Method not allowed");
    return;
  }

  serveStatic(req, res, url);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Hilton Dispatch → http://0.0.0.0:" + PORT);
  console.log("Store file: " + STORE);
});
