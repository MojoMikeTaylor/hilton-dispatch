/* Node test for the server's PIN gate. Starts server.js on a free port with a scratch
   store, then checks /api/login, /api/health, and the /api/store gate. Run: node js/api.test.js */
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");

function startServer(env, dataDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
      env: { ...process.env, PORT: "0", DATA_DIR: dataDir, CREW_PIN: "", ADMIN_PASSWORD: "", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    const onData = (buf) => {
      out += String(buf);
      const m = /http:\/\/0\.0\.0\.0:(\d+)/.exec(out);
      if (m) resolve({ child, port: Number(m[1]) });
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error("server exited " + code + "\n" + out)));
    setTimeout(() => reject(new Error("server did not start\n" + out)), 8000).unref();
  });
}

async function call(port, method, p, { headers, body } = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* non-JSON */ }
  return { status: res.status, json };
}

function scratchDir(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hilton-" + name + "-"));
  return dir;
}

function seedStore(dir, security) {
  fs.writeFileSync(path.join(dir, "store.json"), JSON.stringify({
    settings: { security, materials: [{ id: "m1", name: "Topsoil" }], company: { name: "Hilton" } },
    jobs: [{ id: "HD-1" }], customers: [{ name: "A" }, { name: "B" }], savedAt: "2026-10-01T00:00:00.000Z",
  }));
}

async function withServer(env, security, fn) {
  const dir = scratchDir("store");
  seedStore(dir, security);
  const { child, port } = await startServer(env, dir);
  try { await fn(port, dir); } finally { child.kill(); }
}

(async () => {
  // 1. Env-managed credentials (production shape).
  await withServer({ CREW_PIN: "2468", ADMIN_PASSWORD: "open-sesame" }, {}, async (port, dir) => {
    let r = await call(port, "GET", "/api/store");
    assert.strictEqual(r.status, 401, "store without PIN is refused");
    r = await call(port, "GET", "/api/store", { headers: { "X-Crew-Pin": "0000" } });
    assert.strictEqual(r.status, 401, "store with wrong PIN is refused");
    r = await call(port, "PUT", "/api/store", { body: { settings: {}, jobs: [], customers: [] } });
    assert.strictEqual(r.status, 401, "store write without PIN is refused");

    r = await call(port, "GET", "/api/store", { headers: { "X-Crew-Pin": "2468" } });
    assert.strictEqual(r.status, 200, "store with the PIN opens");
    assert.strictEqual(r.json.settings.security.pin, "", "PIN never comes back to the browser");
    assert.strictEqual(r.json.settings.security.adminPassword, "", "admin password never comes back");
    assert.strictEqual(r.json.customers.length, 2);
    assert.ok(!JSON.stringify(r.json).includes("2468"), "PIN not anywhere in the payload");
    assert.ok(!JSON.stringify(r.json).includes("open-sesame"), "admin password not anywhere in the payload");

    r = await call(port, "GET", "/api/store", { headers: { "X-Admin-Password": "open-sesame" } });
    assert.strictEqual(r.status, 200, "admin password also opens the store");

    r = await call(port, "POST", "/api/login", { body: { pin: "1111" } });
    assert.strictEqual(r.status, 401, "wrong PIN login");
    r = await call(port, "POST", "/api/login", { body: { pin: "2468" } });
    assert.deepStrictEqual([r.status, r.json.role], [200, "crew"], "crew login");
    r = await call(port, "POST", "/api/login", { body: { adminPassword: "nope" } });
    assert.strictEqual(r.status, 401, "wrong admin login");
    r = await call(port, "POST", "/api/login", { body: { adminPassword: "open-sesame" } });
    assert.deepStrictEqual([r.status, r.json.role], [200, "admin"], "admin login");

    r = await call(port, "GET", "/api/health");
    assert.strictEqual(r.status, 200, "health is public");
    assert.deepStrictEqual(
      [r.json.ok, r.json.customers, r.json.jobs, r.json.materials, r.json.managedCredentials.pin],
      [true, 2, 1, 1, true], "health reports counts and managed flags");
    assert.ok(!("settings" in r.json) && !JSON.stringify(r.json).includes("2468"), "health carries no data or secrets");

    // A write with the PIN lands, and the blanked security block does not wipe anything on disk.
    r = await call(port, "PUT", "/api/store", {
      headers: { "X-Crew-Pin": "2468" },
      body: { settings: { security: { pin: "", adminPassword: "" }, materials: [] }, jobs: [{ id: "HD-2" }], customers: [] },
    });
    assert.strictEqual(r.status, 200, "store write with the PIN lands");
    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, "store.json"), "utf8"));
    assert.strictEqual(onDisk.jobs[0].id, "HD-2");
    assert.ok(!JSON.stringify(onDisk).includes("2468"), "env PIN is not copied into the store file");

    // Brute-force brake: 10 misses then 429.
    for (let i = 0; i < 9; i++) await call(port, "POST", "/api/login", { body: { pin: "9999" } });
    r = await call(port, "POST", "/api/login", { body: { pin: "9999" } });
    assert.strictEqual(r.status, 429, "eleventh miss in a minute is throttled");
    console.log("ok — env-managed PIN gate");
  });

  // 2. Store-managed credentials (no env): the store's own PIN gates it, and a PIN change sticks.
  await withServer({}, { pin: "1357", adminPassword: "yard" }, async (port, dir) => {
    let r = await call(port, "GET", "/api/store");
    assert.strictEqual(r.status, 401, "store PIN gates when env is unset");
    r = await call(port, "POST", "/api/login", { body: { pin: "1357" } });
    assert.strictEqual(r.status, 200, "store PIN logs in");
    r = await call(port, "GET", "/api/health");
    assert.strictEqual(r.json.managedCredentials.pin, false);

    r = await call(port, "PUT", "/api/store", {
      headers: { "X-Crew-Pin": "1357" },
      body: { settings: { security: { pin: "", adminPassword: "" } }, jobs: [], customers: [] },
    });
    assert.strictEqual(r.status, 200);
    let onDisk = JSON.parse(fs.readFileSync(path.join(dir, "store.json"), "utf8"));
    assert.deepStrictEqual([onDisk.settings.security.pin, onDisk.settings.security.adminPassword], ["1357", "yard"],
      "blank security from the browser keeps the stored credentials");

    r = await call(port, "PUT", "/api/store", {
      headers: { "X-Crew-Pin": "1357" },
      body: { settings: { security: { pin: "8642", adminPassword: "" } }, jobs: [], customers: [] },
    });
    assert.strictEqual(r.status, 200);
    onDisk = JSON.parse(fs.readFileSync(path.join(dir, "store.json"), "utf8"));
    assert.strictEqual(onDisk.settings.security.pin, "8642", "a typed new PIN is saved");
    r = await call(port, "GET", "/api/store", { headers: { "X-Crew-Pin": "1357" } });
    assert.strictEqual(r.status, 401, "old PIN stops working");
    r = await call(port, "GET", "/api/store", { headers: { "X-Crew-Pin": "8642" } });
    assert.strictEqual(r.status, 200, "new PIN works");
    console.log("ok — store-managed PIN gate");
  });

  // 3. Nothing configured anywhere: open, as before (first run / local dev).
  await withServer({}, {}, async (port) => {
    let r = await call(port, "GET", "/api/store");
    assert.strictEqual(r.status, 200, "no credentials configured = open store");
    r = await call(port, "POST", "/api/login", { body: { pin: "1234" } });
    assert.deepStrictEqual([r.status, r.json.error], [409, "no_pin"], "login says no PIN is set");
    console.log("ok — unconfigured server stays open");
  });

  console.log("api.test.js OK");
})().catch((e) => { console.error(e); process.exit(1); });
