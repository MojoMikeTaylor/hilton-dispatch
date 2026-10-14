/* Two desks saving at once must not wipe tickets.
   Desk A writes Harry Hawk (and the order after it). Desk B then saves a stale
   job list that does not include those tickets. They have to still be on disk.
   A job leaves only when its id is in deletedIds. A write that would empty a
   non-empty job list is refused and does not touch the file.
   Run: node js/store.test.js */
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PIN = "2468";

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
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* non-JSON */ }
  return { status: res.status, json };
}

function scratchDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hilton-" + name + "-"));
}

function readDisk(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, "store.json"), "utf8"));
}

function idsOf(store) {
  return (store.jobs || []).map((j) => j.id);
}

function jobById(store, id) {
  return (store.jobs || []).find((j) => j.id === id);
}

const old = { id: "HD-OLD", customer: "Existing", notes: "original", status: "new" };
const harry = { id: "HD-HAWK", customer: "Harry Hawk", notes: "yard A", status: "new" };
const next = { id: "HD-NEXT", customer: "Order after Harry", notes: "yard A", status: "new" };

function seedTwoDesks(dir) {
  fs.writeFileSync(path.join(dir, "store.json"), JSON.stringify({
    settings: { security: {}, materials: [{ id: "m1", name: "Topsoil" }], marker: "original" },
    jobs: [old],
    customers: [{ name: "Seed Co" }, { name: "Other Co" }],
    savedAt: "2026-10-01T00:00:00.000Z",
  }, null, 2));
}

function pinHeaders() {
  return { "X-Crew-Pin": PIN };
}

(async () => {
  // --- Server: stale save must not drop tickets the other desk just created. ---
  {
    const dir = scratchDir("merge");
    seedTwoDesks(dir);
    const { child, port } = await startServer({ CREW_PIN: PIN }, dir);
    try {
      let r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }], marker: "desk-a" },
          jobs: [old, harry, next],
          customers: [{ name: "Seed Co" }, { name: "Other Co" }],
        },
      });
      assert.strictEqual(r.status, 200, "desk A save lands");
      assert.deepStrictEqual(idsOf(readDisk(dir)), ["HD-OLD", "HD-HAWK", "HD-NEXT"]);

      r = await call(port, "PUT", "/api/store", {
        body: { jobs: [old], customers: [{ name: "Seed Co" }] },
      });
      assert.strictEqual(r.status, 401, "stale save without the PIN is refused");
      assert.deepStrictEqual(idsOf(readDisk(dir)), ["HD-OLD", "HD-HAWK", "HD-NEXT"], "refused save does not drop tickets");

      // Desk B loaded the board before Harry existed and now saves that stale list.
      r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }], marker: "desk-b" },
          jobs: [{ id: "HD-OLD", customer: "Existing", notes: "desk B edit", status: "new" }],
          customers: [{ name: "Seed Co" }],
        },
      });
      assert.strictEqual(r.status, 200, "desk B stale save still lands");
      let disk = readDisk(dir);
      assert.deepStrictEqual(idsOf(disk), ["HD-OLD", "HD-HAWK", "HD-NEXT"], "Harry Hawk and the order after it stay on the server");
      assert.strictEqual(jobById(disk, "HD-OLD").notes, "desk B edit", "this desk's copy wins for an id it sent");
      assert.strictEqual(jobById(disk, "HD-HAWK").customer, "Harry Hawk");
      assert.strictEqual(jobById(disk, "HD-HAWK").notes, "yard A", "a ticket this desk did not send is kept as stored");
      assert.strictEqual(jobById(disk, "HD-NEXT").customer, "Order after Harry");
      assert.deepStrictEqual(disk.customers, [{ name: "Seed Co" }], "customers are still replaced as a whole");
      assert.strictEqual(disk.settings.marker, "desk-b");
      assert.ok(!JSON.stringify(disk).includes(PIN), "PIN is not written into the store");

      r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }], marker: "desk-b" },
          jobs: [],
          customers: [{ name: "Seed Co" }],
        },
      });
      assert.strictEqual(r.status, 200, "an empty jobs array does not by itself wipe the board");
      assert.deepStrictEqual(idsOf(readDisk(dir)), ["HD-OLD", "HD-HAWK", "HD-NEXT"]);

      r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: disk.settings,
          jobs: [jobById(readDisk(dir), "HD-OLD")],
          customers: [{ name: "Seed Co" }],
          deletedIds: "HD-HAWK",
        },
      });
      assert.strictEqual(r.status, 200);
      assert.ok(idsOf(readDisk(dir)).includes("HD-HAWK"), "a deletedIds value that is not an array does not remove tickets");

      r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }], marker: "desk-b" },
          jobs: [
            { id: "HD-HAWK", customer: "Harry Hawk", notes: "should not stick", status: "quote" },
            { id: "HD-OLD", customer: "Existing", notes: "desk B edit", status: "new" },
            { id: "HD-NEXT", customer: "Order after Harry", notes: "yard A", status: "new" },
          ],
          customers: [{ name: "Seed Co" }],
          deletedIds: ["HD-HAWK"],
        },
      });
      assert.strictEqual(r.status, 200, "deleting one ticket is allowed");
      disk = readDisk(dir);
      assert.deepStrictEqual(idsOf(disk), ["HD-OLD", "HD-NEXT"], "deletedIds removes that ticket even if the body also sent it");
      assert.strictEqual(jobById(disk, "HD-NEXT").customer, "Order after Harry");

      const beforeWipe = fs.readFileSync(path.join(dir, "store.json"));
      r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, marker: "wiped" },
          jobs: [],
          customers: [],
          deletedIds: ["HD-OLD", "HD-NEXT"],
        },
      });
      assert.ok(r.status >= 400 && r.status < 500, "a write that would empty the job list is refused, got " + r.status);
      assert.notStrictEqual(r.status, 401, "the refusal is not the PIN gate");
      const afterWipe = fs.readFileSync(path.join(dir, "store.json"));
      assert.deepStrictEqual(afterWipe, beforeWipe, "refused wipe does not write");
      assert.deepStrictEqual(idsOf(readDisk(dir)), ["HD-OLD", "HD-NEXT"]);
      console.log("ok — stale desk cannot wipe Harry Hawk; deletedIds and empty-list refusal hold");
    } finally {
      child.kill();
    }
  }

  // --- Two desks mint the same HD-YYYY-NNNN for different customers. ---
  {
    const dir = scratchDir("mint");
    const year = new Date().getFullYear();
    const id = (n) => "HD-" + year + "-" + String(n).padStart(4, "0");
    const prior = [
      { id: id(1), customer: "One", status: "new" },
      { id: id(3), customer: "Three", status: "new" },
    ];
    fs.writeFileSync(path.join(dir, "store.json"), JSON.stringify({
      settings: { security: {}, materials: [{ id: "m1", name: "Topsoil" }] },
      jobs: prior,
      customers: [],
    }, null, 2));
    const { child, port } = await startServer({ CREW_PIN: PIN }, dir);
    try {
      let r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }] },
          jobs: prior.concat([{ id: id(4), customer: "Alpha Yard", status: "new", notes: "desk A" }]),
          customers: [],
        },
      });
      assert.strictEqual(r.status, 200, "desk A minted " + id(4));
      assert.strictEqual(jobById(readDisk(dir), id(4)).customer, "Alpha Yard");

      r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }] },
          jobs: prior.concat([{ id: id(4), customer: "Beta Yard", status: "new", notes: "desk B" }]),
          customers: [],
        },
      });
      assert.strictEqual(r.status, 200, "desk B save with the same number lands");
      let disk = readDisk(dir);
      const alpha = disk.jobs.filter((j) => j.customer === "Alpha Yard");
      const beta = disk.jobs.filter((j) => j.customer === "Beta Yard");
      assert.strictEqual(alpha.length, 1, "Alpha survives");
      assert.strictEqual(beta.length, 1, "Beta survives");
      assert.strictEqual(alpha[0].id, id(4), "the first ticket keeps the minted id");
      assert.notStrictEqual(beta[0].id, alpha[0].id, "the second desk gets a different id");
      assert.strictEqual(beta[0].id, id(5), "the fresh id is the next sequence, not jobs.length");
      assert.ok(idsOf(disk).includes(id(1)) && idsOf(disk).includes(id(3)), "earlier tickets stay");

      r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }] },
          jobs: [
            { id: id(1), customer: "One", status: "new" },
            { id: id(3), customer: "Three", status: "new" },
            { id: id(4), customer: "Alpha Yard", status: "new", notes: "revised" },
            { id: beta[0].id, customer: "Beta Yard", status: "new", notes: "desk B" },
          ],
          customers: [],
        },
      });
      assert.strictEqual(r.status, 200);
      disk = readDisk(dir);
      assert.strictEqual(disk.jobs.filter((j) => j.customer === "Alpha Yard").length, 1, "same customer still updates in place");
      assert.strictEqual(jobById(disk, id(4)).notes, "revised");
      assert.strictEqual(disk.jobs.filter((j) => j.id === id(4)).length, 1);
      console.log("ok — two desks minting the same number keep both tickets");
    } finally {
      child.kill();
    }
  }

  // --- Browser save path: merge before PUT, poll the board, delete only quote/void. ---
  {
    const dir = scratchDir("client");
    seedTwoDesks(dir);
    const { child, port } = await startServer({ CREW_PIN: PIN }, dir);
    try {
      let r = await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: { security: { pin: "", adminPassword: "" }, materials: [{ id: "m1", name: "Topsoil" }], marker: "desk-a" },
          jobs: [old, harry, next],
          customers: [{ name: "Seed Co" }, { name: "Other Co" }],
        },
      });
      assert.strictEqual(r.status, 200);

      const recorded = [];
      const els = {};
      function makeEl() {
        return {
          value: "", checked: false, innerHTML: "", textContent: "", style: {}, dataset: {},
          classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
          addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
          appendChild() {}, removeChild() {}, remove() {}, focus() {}, blur() {}, click() {}, closest() { return null; },
          querySelector() { return makeEl(); }, querySelectorAll() { return []; }, insertAdjacentHTML() {},
        };
      }
      const document = {
        getElementById: (id) => (els[id] = els[id] || makeEl()),
        querySelector: () => makeEl(),
        querySelectorAll: () => [],
        addEventListener() {},
        createElement: () => makeEl(),
        body: makeEl(),
        documentElement: makeEl(),
      };
      const storage = {};
      const sandbox = {
        document,
        location: { href: "", origin: "http://localhost", hostname: "localhost", search: "", reload() {} },
        localStorage: {
          getItem: (k) => (k in storage ? storage[k] : null),
          setItem: (k, v) => { storage[k] = String(v); },
          removeItem: (k) => { delete storage[k]; },
        },
        addEventListener() {},
        setTimeout, clearTimeout,
        setInterval() { return 0; },
        clearInterval() {},
        navigator: { userAgent: "node", onLine: true },
        fetch: async (url, opts) => {
          const target = String(url).startsWith("http") ? String(url) : ("http://127.0.0.1:" + port + url);
          const method = (opts && opts.method) || "GET";
          let body = null;
          if (opts && opts.body) body = JSON.parse(opts.body);
          recorded.push({ method, body, headers: (opts && opts.headers) || {} });
          return fetch(target, opts);
        },
        print() {}, open() {}, alert() {}, confirm: () => false, prompt: () => null,
        console, Date, Math, JSON, Number, String, Boolean, Array, Object, Promise, Map, Set,
        encodeURIComponent, decodeURIComponent, URL, URLSearchParams,
      };
      sandbox.window = sandbox;
      const ctx = vm.createContext(sandbox);
      for (const f of ["data.js", "engine.js", "desk.js", "receipt.js", "app.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, f), "utf8"), ctx, { filename: f });
      }
      const run = (code) => vm.runInContext(code, ctx);

      const merged = run(`mergeJobsById(
        [{ id: "HD-HAWK", customer: "Harry Hawk" }, { id: "HD-OLD", customer: "Existing", notes: "server" }],
        [{ id: "HD-OLD", customer: "Existing", notes: "this desk" }, { id: "HD-B", customer: "Desk B new" }],
        ["HD-GONE"]
      )`);
      assert.strictEqual(merged.find((j) => j.id === "HD-OLD").notes, "this desk");
      assert.strictEqual(merged.find((j) => j.id === "HD-HAWK").customer, "Harry Hawk");
      assert.ok(merged.some((j) => j.id === "HD-B"));
      assert.ok(!merged.some((j) => j.id === "HD-GONE"));

      const year = new Date().getFullYear();
      const minted = run(`
        db.jobs = [
          { id: "HD-${year}-0002", customer: "A" },
          { id: "HD-${year}-0010", customer: "B" },
          { id: "HD-${year - 1}-0099", customer: "Last year" },
          { id: "HD-OLD", customer: "Existing" }
        ];
        nextTicket();
      `);
      assert.strictEqual(minted, "HD-" + year + "-0011", "next number is the highest sequence, not jobs.length");
      const clash = JSON.parse(run(`JSON.stringify(mergeJobsById(
        [{ id: "HD-${year}-0004", customer: "Alpha Yard", status: "new" }],
        [{ id: "HD-${year}-0004", customer: "Beta Yard", status: "new" }],
        []
      ))`));
      assert.strictEqual(clash.length, 2);
      assert.strictEqual(clash.find((j) => j.customer === "Alpha Yard").id, "HD-" + year + "-0004");
      assert.strictEqual(clash.find((j) => j.customer === "Beta Yard").id, "HD-" + year + "-0005");
      const same = JSON.parse(run(`JSON.stringify(mergeJobsById(
        [{ id: "HD-${year}-0004", customer: "Alpha Yard", notes: "server" }],
        [{ id: "HD-${year}-0004", customer: "Alpha Yard", notes: "this desk" }],
        []
      ))`));
      assert.strictEqual(same.length, 1);
      assert.strictEqual(same[0].id, "HD-" + year + "-0004");
      assert.strictEqual(same[0].notes, "this desk");

      run(`
        state.pin = ${JSON.stringify(PIN)};
        state.view = "settings";
        state.session = false;
        db.customers = [{ name: "Seed Co" }];
        db.jobs = [{ id: "HD-OLD", customer: "Existing", notes: "desk B edit", status: "new" }];
      `);
      recorded.length = 0;
      await run("putStore(db)");
      assert.deepStrictEqual(recorded.map((c) => c.method), ["GET", "PUT"], "save fetches the store before it writes");
      const put = recorded[1];
      assert.strictEqual(put.headers["X-Crew-Pin"], PIN, "save still sends the PIN");
      assert.ok(put.body.jobs.some((j) => j.customer === "Harry Hawk"), "this desk's save keeps the other desk's ticket");
      assert.ok(put.body.jobs.some((j) => j.id === "HD-NEXT"), "the order after Harry is in the save");
      assert.strictEqual(put.body.jobs.find((j) => j.id === "HD-OLD").notes, "desk B edit");
      assert.ok(!put.body.deletedIds, "a normal save does not send deletedIds");
      let disk = readDisk(dir);
      assert.deepStrictEqual(idsOf(disk), ["HD-OLD", "HD-HAWK", "HD-NEXT"]);
      assert.strictEqual(jobById(disk, "HD-OLD").notes, "desk B edit");
      assert.deepStrictEqual(disk.customers, [{ name: "Seed Co" }], "client save still replaces customers as a whole");
      assert.ok(!JSON.stringify(disk).includes(PIN), "client save does not store the PIN");

      recorded.length = 0;
      run(`db.jobs = db.jobs.filter(j => j.id !== "HD-HAWK");`);
      await run(`putStore(db, ["HD-HAWK"])`);
      const del = recorded.filter((c) => c.method === "PUT").pop();
      assert.deepStrictEqual(del.body.deletedIds, ["HD-HAWK"]);
      assert.ok(!del.body.jobs.some((j) => j.id === "HD-HAWK"), "the deleted ticket is not written back from the fetch");
      disk = readDisk(dir);
      assert.deepStrictEqual(idsOf(disk), ["HD-OLD", "HD-NEXT"]);

      const beforeWipe = fs.readFileSync(path.join(dir, "store.json"));
      recorded.length = 0;
      run(`db.jobs = [];`);
      await run(`putStore(db, ["HD-OLD", "HD-NEXT"])`);
      const wipe = recorded.filter((c) => c.method === "PUT").pop();
      assert.deepStrictEqual(wipe.body.deletedIds, ["HD-OLD", "HD-NEXT"]);
      assert.deepStrictEqual(fs.readFileSync(path.join(dir, "store.json")), beforeWipe, "client wipe is refused and not written");
      assert.deepStrictEqual(JSON.parse(run("JSON.stringify(db.jobs.map(j => j.id))")), ["HD-OLD", "HD-NEXT"], "refused wipe puts the server tickets back on this desk");

      run(`
        __saves = [];
        __confirms = 0;
        confirm = function () { __confirms += 1; return true; };
        collectForm = function () {};
        saveStore = function (data, immediate, deletedIds) {
          __saves.push({ immediate: immediate, deletedIds: deletedIds, jobs: data.jobs.map(function (j) { return { id: j.id, status: j.status }; }) });
        };
        db.jobs = [
          { id: "Q1", status: "quote", customer: "Quote", address: "1 Main" },
          { id: "V1", status: "void", customer: "Voided", address: "2 Main" },
          { id: "L1", status: "new", customer: "Live", address: "3 Main" },
        ];
        state.draft = { id: "L1", status: "new", customer: "Live", address: "3 Main", materials: [] };
        state.session = false;
        deleteTicket();
      `);
      assert.strictEqual(run("__saves.length"), 0, "a live ticket is not deleted");
      assert.strictEqual(run("__confirms"), 0, "live delete does not ask to confirm a wipe");
      assert.ok(run(`db.jobs.some(j => j.id === "L1")`));

      run(`
        state.draft = { id: "Q1", status: "quote", customer: "Quote", address: "1 Main", materials: [] };
        deleteTicket();
      `);
      assert.deepStrictEqual(JSON.parse(run("JSON.stringify(__saves[0].deletedIds)")), ["Q1"], "deleting a quote sends deletedIds");
      assert.ok(run(`!db.jobs.some(j => j.id === "Q1")`));
      assert.strictEqual(run("__saves[0].immediate"), true);

      run(`deleteStoredJob("V1");`);
      assert.deepStrictEqual(JSON.parse(run("JSON.stringify(__saves[1].deletedIds)")), ["V1"], "deleting a void sends deletedIds");
      assert.ok(run(`!db.jobs.some(j => j.id === "V1")`));
      assert.strictEqual(run(`deleteStoredJob("L1")`), false, "a live ticket stays");
      assert.ok(run(`db.jobs.some(j => j.id === "L1")`));

      run(`
        __saves = [];
        state.draft = Object.assign(blankDraft(), { id: "L1", customer: "Live", address: "3 Main", status: "new", materials: [], paid: false, paidBy: "" });
        db.jobs = [{ id: "L1", customer: "Live", address: "3 Main", status: "new", materials: [], paid: false }];
        voidTicket();
      `);
      const voidSave = run("__saves[0]");
      assert.ok(!voidSave.deletedIds || !voidSave.deletedIds.length, "void keeps the ticket and does not send deletedIds");
      assert.strictEqual(voidSave.jobs[0].status, "void");
      assert.strictEqual(voidSave.jobs[0].id, "L1");

      run(`
        state.session = true;
        state.view = "board";
        state.saveInFlight = 0;
        state.persistTimer = null;
        db.jobs = [];
      `);
      await run("pollBoard()");
      assert.deepStrictEqual(JSON.parse(run("JSON.stringify(db.jobs.map(j => j.id))")), ["HD-OLD", "HD-NEXT"], "the board poll loads the server tickets");

      await call(port, "PUT", "/api/store", {
        headers: pinHeaders(),
        body: {
          settings: readDisk(dir).settings,
          jobs: readDisk(dir).jobs.concat([{ id: "HD-POLL", customer: "Polled in", status: "new" }]),
          customers: readDisk(dir).customers,
        },
      });
      run(`state.view = "settings";`);
      await run("pollBoard()");
      assert.ok(!run(`db.jobs.some(j => j.id === "HD-POLL")`), "poll does not replace jobs off the board");
      run(`state.view = "board"; state.saveInFlight = 1;`);
      await run("pollBoard()");
      assert.ok(!run(`db.jobs.some(j => j.id === "HD-POLL")`), "poll waits while a save is in flight");
      run(`state.saveInFlight = 0;`);
      await run("pollBoard()");
      assert.ok(run(`db.jobs.some(j => j.id === "HD-POLL")`), "the board picks up the other desk's ticket");

      const polls = [];
      sandbox.setInterval = (fn, ms) => { polls.push(ms); return 99; };
      sandbox.clearInterval = () => {};
      run("state.boardPollTimer = null; startBoardPoll(); startBoardPoll();");
      assert.deepStrictEqual(polls, [20000], "the board polls every 20 seconds and does not stack timers");
      run("stopBoardPoll();");
      assert.strictEqual(run("state.boardPollTimer"), null);

      console.log("ok — client merges before save, sends deletedIds for quote/void, polls every 20s");
    } finally {
      child.kill();
    }
  }

  console.log("store.test.js OK");
})().catch((e) => { console.error(e); process.exit(1); });
