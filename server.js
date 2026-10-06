/* Hilton Dispatch — static files + shared JSON store for Railway. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = process.env.PORT === undefined || process.env.PORT === "" ? 8756 : Number(process.env.PORT); // PORT=0 = pick a free port (tests)

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

/* Credentials: process.env (or ROOT/.env) is the authority; store.json is the fallback.
   Set CREW_PIN and ADMIN_PASSWORD in .env on the yard computer or as Railway variables. */
function loadDotEnv(file) {
  try {
    fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m || line.trim().startsWith("#")) return;
      const val = m[2].replace(/^["']|["']$/g, "");
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    });
  } catch (e) { /* no .env */ }
}
loadDotEnv(path.join(ROOT, ".env"));

function envSecurity() {
  const out = {};
  if (process.env.CREW_PIN) out.pin = String(process.env.CREW_PIN).trim();
  if (process.env.ADMIN_PASSWORD) out.adminPassword = String(process.env.ADMIN_PASSWORD).trim();
  return out;
}

/* Credentials the server checks against: env first, store.json settings.security as the fallback.
   They are never sent to the browser; the browser proves it knows them via /api/login and the
   X-Crew-Pin / X-Admin-Password headers on /api/store. */
function credentials() {
  const env = envSecurity();
  let stored = {};
  try {
    const data = JSON.parse(fs.readFileSync(STORE, "utf8"));
    stored = (data.settings && data.settings.security) || {};
  } catch (e) { /* no store yet */ }
  return {
    pin: String(env.pin || stored.pin || "").trim(),
    adminPassword: String(env.adminPassword || stored.adminPassword || "").trim(),
  };
}

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ""), "utf8");
  const B = Buffer.from(String(b || ""), "utf8");
  if (!A.length || A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

// Returns "crew", "admin", or "" (not allowed). With no credentials configured anywhere the
// store is open, as it was before — that is the local-dev / first-run case only.
function authRole(req) {
  const creds = credentials();
  if (!creds.pin && !creds.adminPassword) return "crew";
  if (creds.adminPassword && safeEqual(req.headers["x-admin-password"], creds.adminPassword)) return "admin";
  if (creds.pin && safeEqual(req.headers["x-crew-pin"], creds.pin)) return "crew";
  return "";
}

// Brute-force brake on /api/login: 10 failures per IP per minute.
const loginFailures = new Map();
function loginThrottled(ip) {
  const now = Date.now();
  const rec = loginFailures.get(ip) || { count: 0, since: now };
  if (now - rec.since > 60 * 1000) { rec.count = 0; rec.since = now; }
  loginFailures.set(ip, rec);
  return rec.count >= 10;
}
function noteLoginFailure(ip) {
  const rec = loginFailures.get(ip) || { count: 0, since: Date.now() };
  rec.count += 1;
  loginFailures.set(ip, rec);
}
function clientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || "?";
}

// What the browser receives: the store with the secrets blanked.
function publicStore(store) {
  if (!store || !store.settings) return store;
  const settings = { ...store.settings };
  settings.security = { ...(settings.security || {}), pin: "", adminPassword: "" };
  return { ...store, settings };
}

// What goes to disk: keep the stored credentials unless the client sent new non-empty ones.
function mergeSecurityForWrite(incoming, existing) {
  const inc = (incoming && incoming.security) || {};
  const ex = (existing && existing.security) || {};
  const security = { ...ex, ...inc };
  if (!String(inc.pin || "").trim()) security.pin = ex.pin || "";
  if (!String(inc.adminPassword || "").trim()) security.adminPassword = ex.adminPassword || "";
  return { ...incoming, security };
}

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
    return {
      seeded: false,
      settings: data.settings || null,
      jobs: Array.isArray(data.jobs) ? data.jobs : [],
      customers: Array.isArray(data.customers) ? data.customers : [],
      savedAt: data.savedAt || null,
    };
  } catch (e) {
    return { seeded: true, settings: null, jobs: [], customers: [] };
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

function latestFredObservation(csv) {
  let last = null;
  String(csv || "").split(/\r?\n/).forEach((line) => {
    const parts = line.trim().replace(/^\uFEFF/, "").split(",");
    if (parts.length < 2) return;
    const weekOf = parts[0].trim();
    const raw = parts[1].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return;
    if (!/^\d+(\.\d+)?$/.test(raw)) return;
    last = { weekOf, dieselPrice: Number(raw) };
  });
  return last;
}

function fetchText(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || 12000);
  return fetch(url, {
    signal: ctrl.signal,
    headers: {
      "User-Agent": "HiltonDispatch/1.0 (yard fuel surcharge)",
      "Accept": "text/csv,text/plain,*/*",
    },
  }).then(async (res) => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.text();
  }).finally(() => clearTimeout(timer));
}

async function pullWestCoastDiesel() {
  const csv = await fetchText("https://fred.stlouisfed.org/graph/fredgraph.csv?id=GASDESWCW", 12000);
  const obs = latestFredObservation(csv);
  if (!obs || !(obs.dieselPrice > 0)) throw new Error("no price");
  return obs;
}

// Google Maps key is restricted to HTTP referrers (the app's own URLs). Server-side
// Places calls carry no browser referer, so send the request's own origin instead.
function placesReferer(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!host) return "";
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim()
    || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return proto + "://" + host + "/";
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

  if (url.split("?")[0] === "/api/customers-seed" && method === "GET") {
    const seedPath = path.join(ROOT, "data", "customers-seed.json");
    fs.readFile(seedPath, "utf8", (err, raw) => {
      if (err) {
        sendJson(res, 200, []);
        return;
      }
      try {
        sendJson(res, 200, JSON.parse(raw));
      } catch (e) {
        sendJson(res, 200, []);
      }
    });
    return;
  }

  if (url.split("?")[0] === "/api/eia-diesel" && method === "GET") {
    try {
      const obs = await pullWestCoastDiesel();
      sendJson(res, 200, {
        ok: true,
        dieselPrice: obs.dieselPrice,
        weekOf: obs.weekOf,
        source: "EIA via FRED GASDESWCW",
      });
    } catch (e) {
      sendJson(res, 200, { ok: false, error: "EIA did not answer" });
    }
    return;
  }

  if (url.split("?")[0] === "/api/config" && method === "GET") {
    const env = envSecurity();
    sendJson(res, 200, {
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
      managedCredentials: { pin: !!env.pin, adminPassword: !!env.adminPassword },
    });
    return;
  }

  if (url.split("?")[0] === "/api/places" && method === "POST") {
    try {
      const raw = await readBody(req, 8000);
      const body = JSON.parse(raw || "{}");
      const input = String(body.input || "").trim();
      const key = String(body.key || process.env.GOOGLE_MAPS_API_KEY || "").trim();
      if (!input || !key) {
        sendJson(res, 200, { suggestions: [] });
        return;
      }
      const gRes = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
          // Key is HTTP-referrer restricted; server-side calls must present the app's own origin.
          "Referer": placesReferer(req),
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["us"],
          regionCode: "US",
          includedPrimaryTypes: ["street_address", "premise", "subpremise"],
          locationBias: {
            // Places API (New) caps circle.radius at 50,000 m; larger values are rejected (400).
            circle: { center: { latitude: 42.35, longitude: -122.87 }, radius: 50000 },
          },
        }),
      });
      const gJson = await gRes.json();
      if (!gRes.ok) console.error("places autocomplete:", gRes.status, (gJson.error && gJson.error.message) || "");
      const suggestions = (gJson.suggestions || []).map((s) => {
        const p = s.placePrediction || {};
        const text = p.text && p.text.text;
        return { label: text || "", placeId: p.placeId || "" };
      }).filter((s) => s.label);
      sendJson(res, 200, { suggestions });
    } catch (e) {
      console.error("places autocomplete failed:", e.message || e);
      sendJson(res, 200, { suggestions: [] });
    }
    return;
  }

  if (url.split("?")[0] === "/api/login" && method === "POST") {
    const ip = clientIp(req);
    if (loginThrottled(ip)) {
      sendJson(res, 429, { ok: false, error: "Too many tries. Wait a minute." });
      return;
    }
    try {
      const body = JSON.parse((await readBody(req, 4000)) || "{}");
      const creds = credentials();
      if (body.adminPassword !== undefined) {
        if (!creds.adminPassword) { sendJson(res, 409, { ok: false, error: "no_admin" }); return; }
        if (safeEqual(body.adminPassword, creds.adminPassword)) { sendJson(res, 200, { ok: true, role: "admin" }); return; }
      } else {
        if (!creds.pin) { sendJson(res, 409, { ok: false, error: "no_pin" }); return; }
        if (safeEqual(body.pin, creds.pin)) { sendJson(res, 200, { ok: true, role: "crew" }); return; }
      }
      noteLoginFailure(ip);
      sendJson(res, 401, { ok: false, error: "wrong" });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: "bad request" });
    }
    return;
  }

  // Public, no secrets, no data: for the uptime watcher.
  if (url.split("?")[0] === "/api/health" && method === "GET") {
    const store = readStore();
    let bytes = 0;
    try { bytes = fs.statSync(STORE).size; } catch (e) { /* none */ }
    const env = envSecurity();
    sendJson(res, 200, {
      ok: true,
      seeded: !!store.seeded,
      storeBytes: bytes,
      customers: (store.customers || []).length,
      jobs: (store.jobs || []).length,
      materials: ((store.settings && store.settings.materials) || []).length,
      savedAt: store.savedAt || null,
      managedCredentials: { pin: !!env.pin, adminPassword: !!env.adminPassword },
    });
    return;
  }

  if (url.split("?")[0] === "/api/store" && method === "GET") {
    if (!authRole(req)) { sendJson(res, 401, { ok: false, error: "pin required" }); return; }
    sendJson(res, 200, publicStore(readStore()));
    return;
  }

  if (url.split("?")[0] === "/api/store" && method === "PUT") {
    if (!authRole(req)) { sendJson(res, 401, { ok: false, error: "pin required" }); return; }
    try {
      const raw = await readBody(req, 8 * 1024 * 1024);
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") throw new Error("bad store");
      const existing = readStore();
      const out = {
        settings: data.settings ? mergeSecurityForWrite(data.settings, existing.settings) : null,
        jobs: Array.isArray(data.jobs) ? data.jobs : [],
        customers: Array.isArray(data.customers) ? data.customers : [],
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
  console.log("Hilton Dispatch → http://0.0.0.0:" + server.address().port);
  console.log("Store file: " + STORE);
  const env = envSecurity();
  console.log("Credentials: " + (Object.keys(env).length
    ? "from env (" + Object.keys(env).map((k) => k === "pin" ? "CREW_PIN" : "ADMIN_PASSWORD").join(", ") + ")"
    : "from store.json settings.security (no CREW_PIN / ADMIN_PASSWORD set)"));
});
