/* Hilton Dispatch — UI + persistence */

const STORE_KEY = "hilton-dispatch-v2";
const LEGACY_KEY = "hilton-dispatch-v1";

const state = {
  session: false,
  admin: false,
  view: "board",
  draft: blankDraft(),
  quote: null,
  route: null,
  map: null,
  mapLayer: null,
  filter: "",
  persistTimer: null,
  serverReady: false,
  book: "store",
  catalogBook: "store",
  boardView: "live",
};

function blankDraft() {
  const when = new Date();
  when.setMinutes(when.getMinutes() - when.getTimezoneOffset());
  return {
    id: null,
    createdAt: null,
    customer: "",
    phone: "",
    email: "",
    jobName: "",
    address: "",
    city: "",
    notes: "",
    status: "new",
    yardId: "cp",
    truck: "dump",
    driver: "",
    truckUnit: "",
    po: "",
    loads: 1,
    extraMinutes: 0,
    extraSiteMinutes: 0,
    extraWaitMinutes: 0,
    forkliftFee: 0,
    rateOverride: null,
    adminRate: false,
    deliverOn: when.toISOString().slice(0, 16),
    materials: [],
    route: null,
    quote: null,
    quarryDirect: false,
    qbId: "",
    qbName: "",
    billTo: "",
    ccEmail: "",
    noAccount: true,
    cod: false,
    jobFromAccount: false,
  };
}

function applyOfficialYards(existing) {
  const official = HD_DEFAULTS.yards || [];
  if (!Array.isArray(existing) || !existing.length) {
    return JSON.parse(JSON.stringify(official));
  }
  return official.map((def) => {
    const prev = existing.find((y) => y.id === def.id) || {};
    return {
      ...def,
      phone: prev.phone || def.phone,
    };
  });
}

function normalizeStore(data) {
  data = data || {};
  data.settings = {
    ...HD_DEFAULTS,
    ...data.settings,
    company: { ...HD_DEFAULTS.company, ...(data.settings && data.settings.company) },
    billing: { ...HD_DEFAULTS.billing, ...(data.settings && data.settings.billing) },
    security: { ...HD_DEFAULTS.security, ...(data.settings && data.settings.security) },
    maps: { ...HD_DEFAULTS.maps, ...(data.settings && data.settings.maps) },
  };
  if (!data.settings.security.adminPassword) data.settings.security.adminPassword = HD_DEFAULTS.security.adminPassword;
  if (!data.settings.billing.forkliftRate) data.settings.billing.forkliftRate = HD_DEFAULTS.billing.forkliftRate;
  if (!Array.isArray(data.jobs)) data.jobs = [];
  data.settings.yards = applyOfficialYards(data.settings.yards);
  const oldAcct = (data.settings.company.accountingEmail || "").toLowerCase();
  if (!oldAcct || oldAcct.indexOf("accounting@hilton") === 0) {
    data.settings.company.accountingEmail = HD_DEFAULTS.company.accountingEmail;
  }
  if (!Array.isArray(data.settings.materials) || !data.settings.materials.length) {
    data.settings.materials = JSON.parse(JSON.stringify(HD_DEFAULTS.materials));
  } else {
    data.settings.materials = HDCatalog.mergeMissing(data.settings.materials);
  }
  data.settings.priceSheet = HD_DEFAULTS.priceSheet;
  data.settings.catalogConfirmed = !catalogNeedsPricesFrom(data.settings.materials);
  data.jobs.forEach((j) => { j.status = normalizeStatus(j.status); });
  if (!Array.isArray(data.customers)) data.customers = [];
  return data;
}

function normalizeStatus(s) {
  const map = { open: "new", sent: "emailed", delivered: "done" };
  return map[s] || s || "new";
}

function isQuoteStatus(s) {
  return normalizeStatus(s) === "quote";
}

function isOffBoard(s) {
  const st = normalizeStatus(s);
  return st === "quote" || st === "void";
}

function matchesBoardView(j) {
  const st = normalizeStatus(j.status);
  const view = state.boardView || "live";
  if (view === "all") return true;
  if (view === "quotes") return st === "quote";
  if (view === "parked") return st === "done" || st === "void";
  return st !== "quote" && st !== "void" && st !== "done";
}

function catalogNeedsPricesFrom(materials) {
  return (materials || []).some((m) => {
    if (HDCatalog.isQuarry(m) || HDCatalog.isStone(m)) return false;
    return !Number(m.price);
  });
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function cacheLocal(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) { /* quota */ }
}

function seedStore() {
  return { settings: JSON.parse(JSON.stringify(HD_DEFAULTS)), jobs: [], customers: [] };
}

async function putStore(data) {
  cacheLocal(data);
  try {
    const res = await fetch("/api/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: data.settings, jobs: data.jobs, customers: data.customers || [] }),
    });
    if (res.ok) state.serverReady = true;
  } catch (e) {
    state.serverReady = false;
  }
}

function saveStore(data, immediate) {
  cacheLocal(data);
  clearTimeout(state.persistTimer);
  if (immediate) {
    putStore(data);
    return;
  }
  state.persistTimer = setTimeout(() => putStore(data), 300);
}

async function bootStore() {
  const local = readLocal();
  try {
    const res = await fetch("/api/store");
    if (res.ok) {
      const payload = await res.json();
      const empty = payload.seeded || !payload.settings || (!(payload.jobs || []).length && !(payload.settings && payload.settings.materials && payload.settings.materials.length));
      if (empty && local && ((local.jobs || []).length || (local.settings && local.settings.materials))) {
        db = normalizeStore(local);
        await putStore(db);
        return;
      }
      if (payload.settings) {
        db = normalizeStore(payload);
        cacheLocal(db);
        state.serverReady = true;
        return;
      }
    }
  } catch (e) {
    state.serverReady = false;
  }
  db = normalizeStore(local || seedStore());
  cacheLocal(db);
  await putStore(db);
}

async function applyEnvGoogleKey() {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return;
    const cfg = await res.json();
    const envKey = (cfg && cfg.googleMapsKey) || "";
    if (envKey && !(db.settings.maps.googleKey || "").trim()) {
      db.settings.maps.googleKey = envKey;
    }
  } catch (e) { /* static host */ }
}

async function loadCustomerSeed() {
  try {
    const res = await fetch("/api/customers-seed");
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
}

async function ensureCustomers() {
  if (!Array.isArray(db.customers)) db.customers = [];
  if (db.customers.length) return;
  db.customers = await loadCustomerSeed();
  if (db.customers.length) saveStore(db, true);
}

function splitQbName(qbName) {
  const raw = String(qbName || "");
  const i = raw.indexOf(":");
  if (i < 0) return { account: raw.trim(), job: "" };
  return { account: raw.slice(0, i).trim(), job: raw.slice(i + 1).trim() };
}

function accountPhone(acct) {
  return (acct && (acct.phone || acct.workPhone || acct.mobile)) || "";
}

function isReservedCashQuery(q) {
  return /^(cash|cod|c\.o\.d\.)$/i.test(String(q || "").trim());
}

function searchCustomers(q) {
  const s = (q || "").trim().toLowerCase();
  if (s.length < 2) return [];
  if (isReservedCashQuery(s)) return [];
  const list = db.customers || [];
  const hits = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const blob = ((a.qbName || "") + " " + (a.company || "") + " " + (a.first || "") + " " + (a.last || "")).toLowerCase();
    if (blob.indexOf(s) >= 0) {
      hits.push(a);
      if (hits.length >= 12) break;
    }
  }
  return hits;
}

function customerMatchesSelected(typed, qbName) {
  if (!qbName) return false;
  const t = String(typed || "").trim();
  if (!t) return false;
  const parts = splitQbName(qbName);
  return t === qbName || t === parts.account;
}

function clearQbLeftovers() {
  const jobFrom = state.draft.jobFromAccount;
  state.draft.qbId = "";
  state.draft.qbName = "";
  state.draft.billTo = "";
  state.draft.ccEmail = "";
  state.draft.phone = "";
  state.draft.email = "";
  if (jobFrom) {
    state.draft.jobName = "";
    if ($("f-job")) $("f-job").value = "";
  }
  state.draft.jobFromAccount = false;
  if (!state.draft.cod) state.draft.noAccount = true;
  if ($("f-phone")) $("f-phone").value = "";
  if ($("f-email")) $("f-email").value = "";
  renderAccountStrip();
}

function applyQbAccount(acct) {
  if (!acct) return;
  const parts = splitQbName(acct.qbName);
  state.draft.cod = false;
  if ($("f-cod")) $("f-cod").checked = false;
  state.draft.qbId = acct.id;
  state.draft.qbName = acct.qbName;
  state.draft.customer = parts.account || acct.qbName;
  state.draft.billTo = acct.billTo || "";
  state.draft.ccEmail = acct.ccEmail || "";
  state.draft.noAccount = false;
  state.draft.phone = accountPhone(acct);
  state.draft.email = acct.email || "";
  if (parts.job) {
    state.draft.jobName = parts.job;
    state.draft.jobFromAccount = true;
  } else {
    state.draft.jobFromAccount = false;
  }
  $("f-customer").value = state.draft.customer;
  $("f-phone").value = state.draft.phone;
  $("f-email").value = state.draft.email;
  if (parts.job) $("f-job").value = parts.job;
  $("cust-suggest").classList.add("hidden");
  $("cust-suggest").innerHTML = "";
  renderAccountStrip();
}

function setCodMode(on) {
  state.draft.cod = !!on;
  if ($("f-cod")) $("f-cod").checked = !!on;
  if (on) {
    state.draft.noAccount = true;
    state.draft.qbId = "";
    state.draft.qbName = "";
    state.draft.billTo = "";
    state.draft.ccEmail = "";
    state.draft.jobFromAccount = false;
    const box = $("cust-suggest");
    if (box) { box.classList.add("hidden"); box.innerHTML = ""; }
  } else if (!state.draft.qbName) {
    state.draft.noAccount = true;
  }
  renderAccountStrip();
}

function renderAccountStrip() {
  const el = $("account-strip");
  if (!el) return;
  const d = state.draft;
  if (d.cod) {
    el.classList.remove("hidden");
    el.classList.add("noacct");
    el.innerHTML = `<div class="k">COD / no account</div><div>${esc(d.customer || "—")} — not billed to a QuickBooks account. Type the person or company, not the word Cash.</div>`;
    return;
  }
  if (d.qbName) {
    el.classList.remove("hidden", "noacct");
    el.innerHTML = `
      <div class="k">Account — QuickBooks</div>
      <div><strong>${esc(d.qbName)}</strong></div>
      <div>${esc(d.billTo || "—")}</div>
      <div>${esc(d.email || "—")}${d.ccEmail ? " · CC " + esc(d.ccEmail) : ""}</div>
      <div>${esc(d.phone || "—")}</div>`;
    return;
  }
  el.classList.add("hidden");
  el.innerHTML = "";
}

function onCustomerFieldChange() {
  const typed = ($("f-customer").value || "").trim();
  state.draft.customer = typed;
  if (!typed) {
    clearQbLeftovers();
    const box = $("cust-suggest");
    if (box) { box.classList.add("hidden"); box.innerHTML = ""; }
    return;
  }
  if (state.draft.cod) return;
  if (state.draft.qbName && !customerMatchesSelected(typed, state.draft.qbName)) {
    clearQbLeftovers();
  }
}

let qbEditId = null;

function renderQbEditor(acct) {
  const a = acct || {
    id: "qb-" + Date.now(),
    qbName: "", company: "", first: "", last: "",
    primaryContact: "", secondaryContact: "",
    email: "", ccEmail: "", phone: "", workPhone: "", mobile: "",
    billTo: "", street1: "", street2: "", city: "", state: "", zip: "",
  };
  qbEditId = a.id;
  $("qb-editor").innerHTML = `
    <div class="row"><div><label>QuickBooks name (exact)</label><input id="qb-name" value="${escAttr(a.qbName)}"></div>
    <div><label>Company</label><input id="qb-company" value="${escAttr(a.company)}"></div></div>
    <div class="row"><div><label>Main phone</label><input id="qb-phone" value="${escAttr(a.phone)}"></div>
    <div><label>Main email</label><input id="qb-email" value="${escAttr(a.email)}"></div></div>
    <div class="row"><div><label>CC email</label><input id="qb-cc" value="${escAttr(a.ccEmail)}"></div>
    <div><label>Work / mobile</label><input id="qb-mobile" value="${escAttr(a.workPhone || a.mobile)}"></div></div>
    <label>Bill-to (billing, not dump site)</label>
    <textarea id="qb-billto">${esc(a.billTo)}</textarea>`;
}

function saveQbEditor() {
  if (!qbEditId) { toast("Search or add an account first"); return; }
  const rec = {
    id: qbEditId,
    qbName: $("qb-name").value.trim(),
    company: $("qb-company").value.trim(),
    first: "", last: "",
    primaryContact: "", secondaryContact: "",
    email: $("qb-email").value.trim(),
    ccEmail: $("qb-cc").value.trim(),
    phone: $("qb-phone").value.trim(),
    workPhone: "",
    mobile: $("qb-mobile").value.trim(),
    billTo: $("qb-billto").value.trim(),
    street1: "", street2: "", city: "", state: "", zip: "",
  };
  if (!rec.qbName) { toast("QuickBooks name is required"); return; }
  const idx = (db.customers || []).findIndex((a) => a.id === rec.id);
  if (idx >= 0) {
    db.customers[idx] = { ...db.customers[idx], ...rec };
  } else {
    db.customers.push(rec);
  }
  saveStore(db, true);
  toast("Account saved");
}

let db = seedStore();

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.style.display = "none"; }, 2800);
}

function nextTicket() {
  const year = new Date().getFullYear();
  const seq = String(db.jobs.length + 1).padStart(4, "0");
  return `HD-${year}-${seq}`;
}

function yardById(id) {
  return db.settings.yards.find((y) => y.id === id) || db.settings.yards[0];
}

function isQuarryYard(id) {
  return (id || state.draft.yardId) === "willow";
}

function ticketNeedsForklift(materials) {
  return (materials || state.draft.materials || []).some((m) => m.requires_forklift || HDCatalog.isStone(m));
}

function $(id) { return document.getElementById(id); }

function show(view) {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.classList.toggle("hidden", el.getAttribute("data-view") !== view);
  });
  document.querySelectorAll(".nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.go === view);
  });
  if (view === "board") renderBoard();
  if (view === "new") renderForm();
  if (view === "settings") renderSettings();
  if (view === "catalog") renderCatalog();
}

function requestView(view) {
  if (view === "settings") {
    if (state.admin) show("settings");
    else openAdminLock();
    return;
  }
  if (view === "new") newTicket();
  else show(view);
}

function openAdminLock() {
  $("admin-lock").classList.remove("hidden");
  $("admin-pass").value = "";
  setTimeout(() => $("admin-pass").focus(), 50);
}

function closeAdminLock() {
  $("admin-lock").classList.add("hidden");
  $("admin-pass").value = "";
}

function attemptAdmin() {
  const typed = ($("admin-pass").value || "").trim();
  const want = String((db.settings.security && db.settings.security.adminPassword) || "4357");
  if (typed && typed === want) {
    state.admin = true;
    closeAdminLock();
    show("settings");
  } else {
    toast("Admin password required");
    $("admin-pass").value = "";
    $("admin-pass").focus();
  }
}

function lock() {
  state.session = false;
  state.admin = false;
  closeAdminLock();
  $("app").classList.add("hidden");
  $("login").classList.remove("hidden");
  document.querySelectorAll(".pin-digit").forEach((i) => i.value = "");
  const first = document.querySelector(".pin-digit");
  if (first) first.focus();
}

function unlock() {
  state.session = true;
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  show("board");
}

function pinValue() {
  return Array.from(document.querySelectorAll(".pin-digit")).map((i) => i.value).join("");
}

function attemptLogin() {
  const pin = pinValue();
  if (pin && pin === String(db.settings.security.pin || "1956")) {
    unlock();
  } else {
    toast("Wrong PIN");
    document.querySelectorAll(".pin-digit").forEach((i) => i.value = "");
    document.querySelector(".pin-digit").focus();
  }
}

function bindPin() {
  const boxes = Array.from(document.querySelectorAll(".pin-digit"));
  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(-1);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
      if (pinValue().length === boxes.length) attemptLogin();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && boxes[i - 1]) boxes[i - 1].focus();
      if (e.key === "Enter") attemptLogin();
    });
  });
}

function renderBoard() {
  document.querySelectorAll("#board-filters [data-board]").forEach((b) => {
    b.classList.toggle("active", b.dataset.board === (state.boardView || "live"));
  });
  const jobs = db.jobs.slice().reverse();
  const q = (state.filter || "").toLowerCase();
  const searched = q
    ? jobs.filter((j) => JSON.stringify(j).toLowerCase().includes(q))
    : jobs;
  const list = searched.filter(matchesBoardView);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = (j) => {
    const a = (j.deliverOn || j.createdAt || "").slice(0, 10);
    return a === today;
  };
  const liveToday = jobs.filter((j) => isToday(j) && !isOffBoard(j.status));
  const open = jobs.filter((j) => ["new", "routed", "printed", "emailed", "out", "open"].indexOf(normalizeStatus(j.status)) >= 0);
  const billed = liveToday.reduce((s, j) => s + ((j.quote && j.quote.total) || 0), 0);

  $("kpi-today").textContent = String(liveToday.length);
  $("kpi-open").textContent = String(open.length);
  $("kpi-total").textContent = HDEngine.money(billed);

  if (!list.length) {
    const empty = (state.boardView === "quotes")
      ? "No quotes parked. Check Quote only on a ticket when the customer is just asking for a number."
      : (state.boardView === "parked")
        ? "No done or voided tickets in this list."
        : "No live deliveries. Quotes and voids are under the other board tabs.";
    $("job-table").innerHTML = `<div class="empty">${empty}</div>`;
    return;
  }
  $("job-table").innerHTML = `
    <table>
      <thead><tr>
        <th>Ticket</th><th>Customer</th><th>Yard</th><th>Truck</th><th>Window</th><th>Total</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map((j) => {
          const st = normalizeStatus(j.status);
          const actions = st === "quote"
            ? `<button class="ghost" data-open="${j.id}">Open</button>
               <button class="ghost" data-st="${j.id}|new">Book it</button>
               <button class="ghost" data-del-job="${j.id}">Delete</button>`
            : st === "void"
            ? `<button class="ghost" data-open="${j.id}">Open</button>
               <button class="ghost" data-st="${j.id}|new">Restore</button>
               <button class="ghost" data-del-job="${j.id}">Delete</button>`
            : `<button class="ghost" data-open="${j.id}">Open</button>
               <button class="ghost" data-dup="${j.id}">Copy</button>
               <button class="ghost" data-st="${j.id}|out">Out</button>
               <button class="ghost" data-st="${j.id}|done">Done</button>
               <button class="ghost" data-st="${j.id}|void">Void</button>`;
          return `
          <tr class="clickable" data-open="${j.id}">
            <td><strong>${j.id}</strong><div class="muted">${(j.createdAt || "").replace("T", " ").slice(0, 16)}</div></td>
            <td>${esc(j.customer) || "—"}${st === "quote" ? `<div class="muted">Quote</div>` : ""}${j.quarryDirect || isQuarryYard(j.yardId) ? `<div class="muted">Willow Creek — truckload</div>` : ""}<div class="muted">${esc(j.address)}</div></td>
            <td>${esc((yardById(j.yardId) || {}).name || "")}</td>
            <td><span class="badge ${j.truck}">${truckLabel(j.truck)}</span></td>
            <td>${esc((j.deliverOn || "").replace("T", " "))}</td>
            <td>${j.quote ? HDEngine.money(j.quote.total) : "—"}</td>
            <td><span class="badge ${st}">${esc(st)}</span></td>
            <td class="actions">${actions}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function truckName(truck) {
  if (truck === "forklift") return "Forklift truck";
  if (truck === "small") return "Small truck";
  return "Dump truck";
}

function truckLabel(truck) {
  const b = db.settings.billing;
  if (truck === "forklift") return `Forklift $${b.forkliftRate || b.dumpRate}`;
  return truck === "dump" ? `Dump $${b.dumpRate}` : `Small $${b.smallRate}`;
}

function defaultRateFor(truck) {
  const b = db.settings.billing;
  if (truck === "dump") return b.dumpRate;
  if (truck === "forklift") return b.forkliftRate || b.dumpRate || 160;
  return b.smallRate;
}

function catalogNeedsPrices() {
  return catalogNeedsPricesFrom(db.settings.materials);
}

function selectedTruck() {
  if ($("f-truck-forklift") && $("f-truck-forklift").checked) return "forklift";
  if ($("f-truck-small") && $("f-truck-small").checked) return "small";
  return "dump";
}

function setTruck(truck, resetRate) {
  state.draft.truck = truck;
  if ($("f-truck-dump")) $("f-truck-dump").checked = truck === "dump";
  if ($("f-truck-small")) $("f-truck-small").checked = truck === "small";
  if ($("f-truck-forklift")) $("f-truck-forklift").checked = truck === "forklift";
  if (resetRate !== false && state.draft.adminRate) {
    const rate = defaultRateFor(truck);
    state.draft.rateOverride = rate;
    if ($("f-rate")) $("f-rate").value = rate;
  } else if (!state.draft.adminRate) {
    state.draft.rateOverride = null;
  }
  updateTicketChrome();
  renderQuoteBox();
}

function updateTicketChrome() {
  const hot = state.draft.truck === "forklift" || ticketNeedsForklift();
  if ($("forklift-fee-wrap")) $("forklift-fee-wrap").classList.toggle("fee-hot", hot);
  if ($("quarry-banner")) $("quarry-banner").classList.toggle("hidden", !isQuarryYard(state.draft.yardId));
  if ($("f-rate")) $("f-rate").classList.toggle("hidden", !state.draft.adminRate);
  if ($("f-admin-rate")) $("f-admin-rate").checked = !!state.draft.adminRate;
  syncBookTabs();
}

function setBook(book) {
  state.book = book || "store";
  syncBookTabs();
  if ($("mat-search")) materialSearch($("mat-search").value);
}

function syncBookTabs() {
  document.querySelectorAll("#book-tabs [data-book]").forEach((b) => {
    b.classList.toggle("active", b.dataset.book === state.book);
  });
  const hints = {
    store: "Store Price Sheet 2026 — yard retail. Search this tab only.",
    flagstone: "Flagstone 2026 — prices per pound unless bag. Forklift fee is extra.",
    boulders: "Boulders / colored rock flyer. Approx. weights: rock 2500 · sand 2600 · bark 900 · cinder 1500 lb/yd.",
    willow: "Willow Creek pit prices in tons. Isolated from store yard prices.",
  };
  if ($("book-hint")) $("book-hint").textContent = hints[state.book] || "";
}

function applyYardRules() {
  const quarry = isQuarryYard(state.draft.yardId);
  state.draft.quarryDirect = quarry;
  if (quarry) setBook("willow");
  if (ticketNeedsForklift() && state.draft.truck !== "forklift") setTruck("forklift");
  updateTicketChrome();
  if ($("mat-search")) materialSearch($("mat-search").value);
  renderQuoteBox();
}

function materialsForActiveBook() {
  const book = state.book || "store";
  return (db.settings.materials || []).filter((m) => HDCatalog.inBook(m, book));
}

function renderForm() {
  const d = state.draft;
  const b = db.settings.billing;
  $("f-customer").value = d.customer;
  if ($("f-cod")) $("f-cod").checked = !!d.cod;
  renderAccountStrip();
  $("f-phone").value = d.phone;
  $("f-email").value = d.email || "";
  $("f-when").value = d.deliverOn || "";
  $("f-job").value = d.jobName;
  $("f-address").value = d.address;
  $("f-notes").value = d.notes;
  $("f-driver").value = d.driver;
  $("f-unit").value = d.truckUnit;
  $("f-po").value = d.po;
  $("f-loads").value = d.loads || 1;
  $("f-site-min").value = d.extraSiteMinutes || 0;
  $("f-wait-min").value = d.extraWaitMinutes || 0;
  $("f-forklift-fee").value = d.forkliftFee || 0;
  $("f-status").value = normalizeStatus(d.status);
  if ($("f-quote")) $("f-quote").checked = isQuoteStatus(d.status);
  const truck = d.truck || "dump";
  $("f-truck-dump").checked = truck === "dump";
  $("f-truck-small").checked = truck === "small";
  $("f-truck-forklift").checked = truck === "forklift";
  const defaultRate = defaultRateFor(truck);
  $("f-rate").value = d.rateOverride != null ? d.rateOverride : defaultRate;
  $("f-admin-rate").checked = !!d.adminRate;
  $("dump-rate-label").textContent = `$${b.dumpRate} / hour`;
  $("small-rate-label").textContent = `$${b.smallRate} / hour`;
  $("forklift-rate-label").textContent = `$${b.forkliftRate || b.dumpRate} / hour · extra fee below`;
  $("price-banner").classList.toggle("hidden", !catalogNeedsPrices());
  const yardSel = $("f-yard");
  yardSel.innerHTML = db.settings.yards.map((y) =>
    `<option value="${y.id}" ${y.id === d.yardId ? "selected" : ""}>${y.name} — ${y.address}</option>`
  ).join("");
  if (isQuarryYard(d.yardId)) state.book = "willow";
  else if (!state.book) state.book = "store";
  updateTicketChrome();
  renderMaterialLines();
  renderQuoteBox();
  materialSearch($("mat-search") ? $("mat-search").value : "");
}

function renderMaterialLines() {
  const wrap = $("material-lines");
  if (!state.draft.materials.length) {
    wrap.innerHTML = `<div class="empty">No materials yet. Search the book and add yards / tons / pallets.</div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr><th>Material</th><th>Qty</th><th>Unit</th><th>Price</th><th>Amount</th><th></th></tr></thead><tbody>
    ${state.draft.materials.map((m, i) => `
      <tr>
        <td>
          <input value="${escAttr(m.name)}" data-line="${i}" data-k="name">
          <div class="muted">${esc(m.category || "")}</div>
        </td>
        <td><input type="number" min="0" step="0.25" value="${m.qty}" data-line="${i}" data-k="qty" style="width:90px"></td>
        <td><input value="${escAttr(m.unit)}" data-line="${i}" data-k="unit" style="width:80px"></td>
        <td><input type="number" min="0" step="0.01" value="${m.price}" data-line="${i}" data-k="price" style="width:100px"></td>
        <td class="line-amt" data-amt="${i}">${HDEngine.money((Number(m.qty) || 0) * (Number(m.price) || 0))}</td>
        <td><button class="ghost" data-del="${i}">Remove</button></td>
      </tr>`).join("")}
  </tbody></table>`;
}

function onLineEdit(e) {
  const t = e.target;
  if (t.dataset.k == null || t.dataset.line == null) return;
  const i = Number(t.dataset.line);
  const m = state.draft.materials[i];
  if (!m) return;
  const k = t.dataset.k;
  if (k === "qty" || k === "price") m[k] = Number(t.value) || 0;
  else m[k] = t.value;
  if (HDCatalog.isQuarry(m) && k === "unit" && String(t.value).toLowerCase() !== "ton") {
    m.unit = "ton";
    t.value = "ton";
    toast("Quarry is truckload — tons only");
  }
  if (HDCatalog.isQuarry(m) && k === "qty" && (Number(m.qty) || 0) < 1) {
    m.qty = 1;
    t.value = 1;
  }
  const amt = $("material-lines").querySelector(`[data-amt="${i}"]`);
  if (amt) amt.textContent = HDEngine.money((Number(m.qty) || 0) * (Number(m.price) || 0));
  if (m.requires_forklift && state.draft.truck !== "forklift") setTruck("forklift");
  else {
    updateTicketChrome();
    renderQuoteBox();
  }
}

function ticketBilling() {
  const b = { ...db.settings.billing };
  if (state.draft.adminRate) {
    const rate = Number(state.draft.rateOverride);
    if (isFinite(rate) && rate > 0) {
      if (state.draft.truck === "dump") b.dumpRate = rate;
      else if (state.draft.truck === "forklift") b.forkliftRate = rate;
      else b.smallRate = rate;
    }
  }
  return b;
}

function currentQuote() {
  const seconds = state.route ? state.route.seconds : 0;
  const q = HDEngine.quote({
    oneWaySeconds: seconds,
    truck: state.draft.truck,
    billing: ticketBilling(),
    materials: state.draft.materials,
    loads: state.draft.loads,
    extraSiteMinutes: state.draft.extraSiteMinutes,
    extraWaitMinutes: state.draft.extraWaitMinutes,
    forkliftFee: state.draft.forkliftFee,
  });
  if (isQuarryYard(state.draft.yardId)) {
    q.quarryDirect = true;
    q.formula = "Quarry direct — truckload\n" + q.formula;
  }
  return q;
}

function renderQuoteBox() {
  const q = currentQuote();
  state.quote = q;
  const routed = !!state.route;
  const feeBit = q.forkliftFee ? ` · ${HDEngine.money(q.forkliftFee)} forklift fee` : "";
  const quarryBit = q.quarryDirect ? `<div style="margin-top:8px;color:#f3d7b5">Quarry direct — truckload</div>` : "";
  $("quote-box").innerHTML = `
    <div class="l muted" style="color:#d9c4a8">Delivery + materials</div>
    <div class="total">${HDEngine.money(q.total)}</div>
    <div style="margin-top:8px">${HDEngine.money(q.deliveryFee)} delivery · ${HDEngine.money(q.materialsTotal)} materials${feeBit}</div>
    ${quarryBit}
    <div class="break">${routed ? q.formula : "Punch the delivery address and hit Calculate route to lock time and delivery fee.\nMaterials, minutes, and fees update the total as you type."}</div>
    ${state.route ? `<div style="margin-top:10px;font-size:13px">Mapped ${state.route.miles.toFixed(1)} mi one-way via ${state.route.provider === "google" ? "Google" : "OSM / OSRM"}</div>` : ""}
  `;
}

async function calculateRoute() {
  const address = $("f-address").value.trim();
  if (!address) { toast("Enter the delivery address first"); return; }
  const yard = yardById($("f-yard").value);
  $("calc-btn").disabled = true;
  $("calc-btn").textContent = "Mapping route…";
  try {
    const route = await HDMaps.route(yard.address, address, yard, db.settings.maps.googleKey);
    state.route = route;
    state.draft.address = address;
    state.draft.yardId = yard.id;
    if (normalizeStatus(state.draft.status) === "new") {
      state.draft.status = "routed";
      $("f-status").value = "routed";
    }
    drawMap(route);
    renderQuoteBox();
    toast("Route locked");
  } catch (err) {
    toast(err.message || "Routing failed");
  } finally {
    $("calc-btn").disabled = false;
    $("calc-btn").textContent = "Calculate route";
  }
}

function drawMap(route) {
  const el = $("map");
  if (!window.L) return;
  if (!state.map) {
    state.map = L.map(el);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(state.map);
  }
  if (state.mapLayer) state.map.removeLayer(state.mapLayer);
  const group = L.featureGroup();
  if (route.from) L.marker([route.from.lat, route.from.lng]).addTo(group);
  if (route.to) L.marker([route.to.lat, route.to.lng]).addTo(group);
  if (route.geometry) {
    L.geoJSON(route.geometry, { style: { color: "#6b1518", weight: 4 } }).addTo(group);
  } else if (route.from && route.to) {
    L.polyline([[route.from.lat, route.from.lng], [route.to.lat, route.to.lng]], { color: "#6b1518" }).addTo(group);
  }
  group.addTo(state.map);
  state.mapLayer = group;
  setTimeout(() => {
    state.map.invalidateSize();
    if (group.getBounds && group.getBounds().isValid()) state.map.fitBounds(group.getBounds(), { padding: [24, 24] });
  }, 80);
}

function collectForm() {
  state.draft.customer = $("f-customer").value.trim();
  state.draft.phone = $("f-phone").value.trim();
  state.draft.email = $("f-email").value.trim();
  state.draft.cod = !!($("f-cod") && $("f-cod").checked);
  if (state.draft.cod) {
    state.draft.noAccount = true;
    state.draft.qbId = "";
    state.draft.qbName = "";
    state.draft.billTo = "";
    state.draft.ccEmail = "";
  } else {
    onCustomerFieldChange();
    state.draft.noAccount = !state.draft.qbName;
  }
  state.draft.deliverOn = $("f-when").value;
  state.draft.jobName = $("f-job").value.trim();
  state.draft.address = $("f-address").value.trim();
  state.draft.notes = $("f-notes").value.trim();
  state.draft.driver = $("f-driver").value.trim();
  state.draft.truckUnit = $("f-unit").value.trim();
  state.draft.po = $("f-po").value.trim();
  state.draft.yardId = $("f-yard").value;
  state.draft.truck = selectedTruck();
  state.draft.loads = Math.max(1, Number($("f-loads").value) || 1);
  state.draft.extraSiteMinutes = Math.max(0, Number($("f-site-min").value) || 0);
  state.draft.extraWaitMinutes = Math.max(0, Number($("f-wait-min").value) || 0);
  state.draft.extraMinutes = state.draft.extraSiteMinutes + state.draft.extraWaitMinutes;
  state.draft.forkliftFee = Math.max(0, Number($("f-forklift-fee").value) || 0);
  if ($("f-quote") && $("f-quote").checked) state.draft.status = "quote";
  else {
    const st = normalizeStatus($("f-status").value);
    state.draft.status = st === "quote" ? "new" : st;
  }
  state.draft.adminRate = !!($("f-admin-rate") && $("f-admin-rate").checked);
  state.draft.rateOverride = state.draft.adminRate ? Number($("f-rate").value) : null;
  state.draft.quarryDirect = isQuarryYard(state.draft.yardId);
}

function voidTicket() {
  const ticket = saveTicket("void");
  if (!ticket) return;
  toast(ticket.id + " voided — off the live board");
  show("board");
}

function deleteTicket() {
  collectForm();
  const id = state.draft.id;
  if (!id) {
    state.draft = blankDraft();
    state.route = null;
    state.quote = null;
    show("board");
    toast("Cleared unsaved ticket");
    return;
  }
  if (!confirm("Delete " + id + " for good? Void keeps a record. Delete is for quotes and mishaps only.")) return;
  const idx = db.jobs.findIndex((j) => j.id === id);
  if (idx >= 0) db.jobs.splice(idx, 1);
  saveStore(db, true);
  state.draft = blankDraft();
  state.route = null;
  state.quote = null;
  toast("Deleted " + id);
  show("board");
}

function saveTicket(status) {
  collectForm();
  if (!state.draft.customer || !state.draft.address) {
    toast("Customer and delivery address are required");
    return null;
  }
  const q = currentQuote();
  const existing = state.draft.id && db.jobs.find((j) => j.id === state.draft.id);
  const ticket = {
    ...state.draft,
    id: state.draft.id || nextTicket(),
    createdAt: (existing && existing.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: normalizeStatus(status || state.draft.status || "new"),
    quote: q,
    route: state.route,
    quarryDirect: isQuarryYard(state.draft.yardId),
  };
  const idx = db.jobs.findIndex((j) => j.id === ticket.id);
  if (idx >= 0) db.jobs[idx] = ticket;
  else db.jobs.push(ticket);
  saveStore(db, true);
  state.draft = { ...ticket };
  toast("Saved " + ticket.id);
  return ticket;
}

function openTicket(id) {
  const job = db.jobs.find((j) => j.id === id);
  if (!job) return;
  state.draft = JSON.parse(JSON.stringify(job));
  if (state.draft.forkliftFee == null) state.draft.forkliftFee = 0;
  if (state.draft.extraSiteMinutes == null) state.draft.extraSiteMinutes = 0;
  if (state.draft.extraWaitMinutes == null) state.draft.extraWaitMinutes = Number(state.draft.extraMinutes) || 0;
  state.draft.status = normalizeStatus(state.draft.status);
  state.route = job.route || null;
  state.quote = job.quote || null;
  show("new");
  if (state.route) setTimeout(() => drawMap(state.route), 100);
}

function newTicket() {
  state.draft = blankDraft();
  state.route = null;
  state.quote = null;
  state.book = "store";
  show("new");
}

function materialSearch(q) {
  const s = (q || "").toLowerCase();
  const pool = materialsForActiveBook();
  const hits = (s
    ? pool.filter((m) => (m.name + " " + m.category + " " + (m.note || "")).toLowerCase().includes(s))
    : pool
  ).slice(0, 16);
  $("mat-results").innerHTML = hits.map((m) =>
    `<div data-add="${m.id}"><strong>${esc(m.name)}</strong> · ${HDEngine.money(m.price)} / ${esc(m.unit)}
     <div class="cat">${esc(m.category)}${m.requires_forklift ? " · forklift" : ""}${m.special ? " · special order" : ""}${m.note ? " · " + esc(m.note) : ""}</div></div>`
  ).join("") || (s ? `<div class="empty">No match in this book — switch tabs or add it under Material Book</div>` : `<div class="empty">Type to search this book</div>`);
}

function addMaterial(id) {
  const m = db.settings.materials.find((x) => x.id === id);
  if (!m) return;
  let qty = Number($("mat-qty").value) || 1;
  if (HDCatalog.isQuarry(m) && qty < 1) qty = 1;
  const existing = state.draft.materials.find((x) => x.id === id);
  if (existing) existing.qty = Number(existing.qty) + qty;
  else {
    state.draft.materials.push({
      id: m.id,
      name: m.name,
      category: m.category,
      unit: HDCatalog.isQuarry(m) ? "ton" : m.unit,
      price: m.price,
      qty,
      source: m.source,
      book: HDCatalog.bookOf(m),
      truckload_only: m.truckload_only,
      requires_forklift: m.requires_forklift,
      special: m.special,
      note: m.note,
    });
  }
  if (m.requires_forklift) setTruck("forklift");
  $("mat-search").value = "";
  materialSearch("");
  renderMaterialLines();
  updateTicketChrome();
  renderQuoteBox();
}

function renderSettings() {
  const s = db.settings;
  $("s-company").value = s.company.name;
  $("s-email").value = s.company.email;
  $("s-acct").value = s.company.accountingEmail;
  $("s-phone").value = s.company.phone;
  $("s-dump").value = s.billing.dumpRate;
  $("s-small").value = s.billing.smallRate;
  $("s-forklift").value = s.billing.forkliftRate || s.billing.dumpRate;
  $("s-mult").value = Math.round((s.billing.dumpTimeMultiplier - 1) * 100);
  $("s-trip").value = s.billing.tripMode;
  $("s-min").value = s.billing.minimumHours;
  $("s-inc").value = s.billing.incrementMinutes;
  $("s-load").value = s.billing.loadMinutes;
  $("s-unload").value = s.billing.unloadMinutes;
  $("s-tax").value = s.billing.taxRate || 0;
  $("s-pin").value = s.security.pin;
  $("s-admin").value = s.security.adminPassword || "";
  $("s-gkey").value = s.maps.googleKey || "";
  $("yard-editor").innerHTML = s.yards.map((y, i) => `
    <div class="card" style="box-shadow:none;margin-bottom:10px">
      <div class="row">
        <div><label>Yard name</label><input data-y="${i}" data-k="name" value="${escAttr(y.name)}"></div>
        <div><label>Phone</label><input data-y="${i}" data-k="phone" value="${escAttr(y.phone || "")}"></div>
      </div>
      <label>Address</label><input data-y="${i}" data-k="address" value="${escAttr(y.address)}">
    </div>`).join("");
}

function saveSettings() {
  const s = db.settings;
  const nextDump = Number($("s-dump").value) || 160;
  const nextSmall = Number($("s-small").value) || 100;
  const nextFork = Number($("s-forklift").value) || 160;
  const nextBuf = Number($("s-mult").value);
  const ratesChanged = nextDump !== s.billing.dumpRate || nextSmall !== s.billing.smallRate
    || nextFork !== (s.billing.forkliftRate || s.billing.dumpRate)
    || nextBuf !== Math.round((s.billing.dumpTimeMultiplier - 1) * 100);
  if (ratesChanged && !confirm("Save shop rates and dump-road buffer? This changes every new ticket.")) return;
  s.company.name = $("s-company").value.trim() || s.company.name;
  s.company.email = $("s-email").value.trim();
  s.company.accountingEmail = $("s-acct").value.trim();
  s.company.phone = $("s-phone").value.trim();
  s.billing.dumpRate = Number($("s-dump").value) || 160;
  s.billing.smallRate = Number($("s-small").value) || 100;
  s.billing.forkliftRate = Number($("s-forklift").value) || 160;
  s.billing.dumpTimeMultiplier = 1 + (Number($("s-mult").value) || 8) / 100;
  s.billing.tripMode = $("s-trip").value;
  s.billing.minimumHours = Number($("s-min").value) || 1;
  s.billing.incrementMinutes = Number($("s-inc").value) || 15;
  s.billing.loadMinutes = Number($("s-load").value) || 0;
  s.billing.unloadMinutes = Number($("s-unload").value) || 0;
  s.billing.taxRate = Number($("s-tax").value) || 0;
  const nextPin = $("s-pin").value.trim() || "1956";
  const pinChanged = nextPin !== String(s.security.pin || "1956");
  s.security.pin = nextPin;
  s.security.adminPassword = $("s-admin").value.trim() || "4357";
  s.maps.googleKey = $("s-gkey").value.trim();
  document.querySelectorAll("[data-y]").forEach((inp) => {
    const i = Number(inp.dataset.y);
    const k = inp.dataset.k;
    if (s.yards[i]) s.yards[i][k] = inp.value;
  });
  saveStore(db, true);
  toast(pinChanged ? "PIN updated" : "Settings saved");
}

function renderCatalog() {
  const book = state.catalogBook || "store";
  document.querySelectorAll("#catalog-tabs [data-book]").forEach((b) => {
    b.classList.toggle("active", b.dataset.book === book);
  });
  if ($("weight-helper")) $("weight-helper").classList.toggle("hidden", book !== "boulders");
  const rows = db.settings.materials.map((m, i) => {
    if (HDCatalog.bookOf(m) !== book) return "";
    return `
    <tr>
      <td><input value="${escAttr(m.name)}" data-c="${i}" data-k="name"></td>
      <td><input value="${escAttr(m.category)}" data-c="${i}" data-k="category"></td>
      <td><input value="${escAttr(m.unit)}" data-c="${i}" data-k="unit" style="width:70px"></td>
      <td><input type="number" step="0.01" value="${m.price}" data-c="${i}" data-k="price" style="width:100px"></td>
      <td class="muted">${esc(book)}${m.special ? " · special" : ""}${m.note ? " · " + esc(m.note) : ""}</td>
      <td><button class="ghost" data-cd="${i}">Delete</button></td>
    </tr>`;
  }).join("");
  $("catalog-table").innerHTML = `<table><thead><tr><th>Material</th><th>Category</th><th>Unit</th><th>Price</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function onCatalogEdit(e) {
  const inp = e.target;
  if (inp.dataset.c == null) return;
  const i = Number(inp.dataset.c);
  const k = inp.dataset.k;
  if (!db.settings.materials[i]) return;
  db.settings.materials[i][k] = k === "price" ? Number(inp.value) || 0 : inp.value;
  db.settings.catalogConfirmed = !catalogNeedsPrices();
  saveStore(db, false);
}

function saveCatalog() {
  document.querySelectorAll("[data-c]").forEach((inp) => {
    const i = Number(inp.dataset.c);
    const k = inp.dataset.k;
    if (!db.settings.materials[i]) return;
    db.settings.materials[i][k] = k === "price" ? Number(inp.value) || 0 : inp.value;
  });
  db.settings.catalogConfirmed = !catalogNeedsPrices();
  saveStore(db, true);
  toast(catalogNeedsPrices() ? "Book saved — some yard prices are still $0" : "Material book saved");
}

function addCatalogRow() {
  db.settings.materials.push({
    id: "sku-" + Date.now(),
    name: "New material",
    category: "Custom",
    unit: state.catalogBook === "willow" ? "ton" : "yd",
    price: 0,
    book: state.catalogBook || "store",
  });
  saveStore(db, true);
  renderCatalog();
}

function printPacket(kind) {
  collectForm();
  const keepQuote = isQuoteStatus(state.draft.status);
  const ticket = saveTicket(keepQuote ? "quote" : (kind === "email" ? "emailed" : "printed"));
  if (!ticket) return;
  if (!keepQuote) ticket.status = kind === "email" ? "emailed" : "printed";
  const idx = db.jobs.findIndex((j) => j.id === ticket.id);
  if (idx >= 0) { db.jobs[idx].status = ticket.status; saveStore(db, true); }
  buildPrint(ticket);
  if (kind === "email") {
    emailAccounting(ticket);
    return;
  }
  window.print();
}

function buildPrint(ticket) {
  const yard = yardById(ticket.yardId);
  const q = ticket.quote || currentQuote();
  const co = db.settings.company;
  const when = new Date(ticket.createdAt || Date.now()).toLocaleString();
  const quarry = ticket.quarryDirect || isQuarryYard(ticket.yardId);
  const matRows = (q.lines || []).map((l) =>
    `<tr><td>${esc(l.name)}</td><td>${l.qty} ${esc(l.unit)}</td><td>${HDEngine.money(l.price)}</td><td>${HDEngine.money(l.amount)}</td></tr>`
  ).join("") || `<tr><td colspan="4">No materials</td></tr>`;
  const steps = ((ticket.route && ticket.route.steps) || []).slice(0, 18)
    .map((s) => `<li>${esc(s.instruction)} <span class="muted">(${s.miles.toFixed(1)} mi)</span></li>`).join("");
  const feeRow = q.forkliftFee
    ? `<tr><td>Forklift / extra fee</td><td>${HDEngine.money(q.forkliftFee)}</td></tr>`
    : "";
  const truckLine = `${truckName(ticket.truck)} @ ${HDEngine.money(q.rate)}/hr · ${q.loadCount || 1} load(s)`;

  $("print-root").innerHTML = `
    <section class="sheet">
      <div class="sheet-head">
        <div>
          <h1>${esc(co.name)}</h1>
          <div>${esc(co.tagline || "")}</div>
          <div>${esc(co.phone)} · ${esc(co.email)}</div>
          <div>${esc(yard.name)} — ${esc(yard.address)}</div>
          ${quarry ? `<div><strong>Quarry direct — truckload</strong></div>` : ""}
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700">${isQuoteStatus(ticket.status) ? "QUOTE" : "INVOICE"} ${esc(ticket.id)}</div>
          <div>${when}</div>
          <div>PO: ${esc(ticket.po || "—")}</div>
        </div>
      </div>
      <div class="row">
        <div>
          <strong>Sold to / QuickBooks account</strong><br>
          ${ticket.cod || (ticket.noAccount && !ticket.qbName)
            ? "COD / no account<br>" + esc(ticket.customer || "—")
            : esc(ticket.qbName || ticket.customer)}<br>
          ${esc(ticket.phone || "")}${ticket.email ? "<br>" + esc(ticket.email) : ""}${!ticket.cod && ticket.ccEmail ? "<br>CC " + esc(ticket.ccEmail) : ""}
        </div>
        <div>
          <strong>Bill-to</strong><br>${ticket.cod || !ticket.qbName ? "—" : esc(ticket.billTo || "—")}<br><br>
          <strong>Job / site</strong><br>${esc(ticket.jobName || "—")}
        </div>
      </div>
      <div class="row" style="margin-top:12px">
        <div><strong>Deliver to (truck)</strong><br>${esc(ticket.address)}<br>Truck: ${esc(truckLine)}<br>Driver / unit: ${esc(ticket.driver || "—")} ${esc(ticket.truckUnit || "")}<br>Deliver on: ${esc(ticket.deliverOn ? ticket.deliverOn.replace("T", " ") : "—")}</div>
        <div></div>
      </div>
      <h3 style="margin-top:18px">Materials</h3>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${matRows}</tbody></table>
      <h3 style="margin-top:18px">Delivery</h3>
      <table>
        <tr><td>Mapped one-way</td><td>${q.oneWayMin.toFixed(1)} min · ${(ticket.route ? ticket.route.miles : 0).toFixed(1)} mi</td></tr>
        <tr><td>Trip</td><td>${q.tripFactor === 2 ? "Round trip" : "One way"} × ${q.loadCount || 1} load(s)</td></tr>
        <tr><td>Extra site minutes</td><td>${q.extraSite || 0}</td></tr>
        <tr><td>Extra wait minutes</td><td>${q.extraWait || 0}</td></tr>
        <tr><td>Billable time</td><td>${q.billableHours.toFixed(2)} hr @ ${HDEngine.money(q.rate)}/hr</td></tr>
        ${feeRow}
      </table>
      <div class="totals-box">
        Materials ${HDEngine.money(q.materialsTotal)}<br>
        Delivery ${HDEngine.money(q.deliveryFee)}<br>
        ${q.forkliftFee ? "Forklift / extra equipment " + HDEngine.money(q.forkliftFee) + "<br>" : ""}
        ${q.tax ? "Tax " + HDEngine.money(q.tax) + "<br>" : ""}
        <strong style="font-size:22px">Total ${HDEngine.money(q.total)}</strong>
      </div>
      <div class="recon">${esc(q.formula || "")}</div>
      <p class="muted">${esc(ticket.notes || "")}</p>
    </section>
    <section class="sheet">
      <div class="sheet-head">
        <div>
          <h1>DRIVER ROUTE SHEET</h1>
          <div>${esc(co.name)} · ${esc(ticket.id)}</div>
          ${quarry ? `<div><strong>Quarry direct — truckload</strong></div>` : ""}
        </div>
        <div style="text-align:right">
          <div>${when}</div>
          <div>${truckName(ticket.truck).toUpperCase()}</div>
        </div>
      </div>
      <div class="row">
        <div>
          <strong>Load at</strong><br>${esc(yard.name)}<br>${esc(yard.address)}<br>${esc(yard.phone)}
        </div>
        <div>
          <strong>Deliver to</strong><br>${esc(ticket.customer)} · ${esc(ticket.phone)}<br>${esc(ticket.address)}<br>${esc(ticket.jobName)}<br>Window: ${esc(ticket.deliverOn ? ticket.deliverOn.replace("T", " ") : "—")} · ${q.loadCount || 1} load(s)
        </div>
      </div>
      <h3>Load</h3>
      <table><thead><tr><th>Material</th><th>Qty</th></tr></thead><tbody>
        ${(ticket.materials || []).map((m) => `<tr><td>${esc(m.name)}</td><td>${m.qty} ${esc(m.unit)}</td></tr>`).join("") || "<tr><td colspan=2>See dispatcher</td></tr>"}
      </tbody></table>
      <p><strong>Notes for driver:</strong> ${esc(ticket.notes || "None")}</p>
      <p><strong>Time:</strong> Extra site ${q.extraSite || 0} min · extra wait ${q.extraWait || 0} min.
         ${q.isDump ? "Dump route buffer × " + Number(q.multiplier).toFixed(2) + " already on the ticket." : q.isForklift ? "Forklift truck — no dump buffer." : "Small truck — no dump buffer."}
         ${q.forkliftFee ? " Forklift / extra fee " + HDEngine.money(q.forkliftFee) + "." : ""}
         Driver: ${esc(ticket.driver || "unassigned")} · Unit ${esc(ticket.truckUnit || "—")}</p>
      <p><strong>Route:</strong> ${(ticket.route ? ticket.route.miles.toFixed(1) : "—")} miles one-way from ${esc(yard.address)}.</p>
      ${steps ? `<ol>${steps}</ol>` : `<p class="muted">Turn-by-turn prints when the OSM router is used. Google Distance Matrix still bills time/miles.</p>`}
      <div class="recon">${esc(q.formula || "")}</div>
      <div class="sig">
        <div><div class="line">Driver signature / time out</div></div>
        <div><div class="line">Customer received by / time in</div></div>
      </div>
    </section>`;
}

function emailAccounting(ticket) {
  const q = ticket.quote;
  const yard = yardById(ticket.yardId);
  const to = db.settings.company.accountingEmail || db.settings.company.email;
  const quarry = ticket.quarryDirect || isQuarryYard(ticket.yardId);
  const quoting = isQuoteStatus(ticket.status);
  const subject = quoting
    ? `Hilton Dispatch QUOTE ${ticket.id} — ${ticket.customer} — ${HDEngine.money(q.total)}`
    : `Hilton Dispatch ${ticket.id} — ${ticket.customer} — ${HDEngine.money(q.total)}`;
  const body = [
    quoting ? `HILTON DISPATCH QUOTE — not a live delivery` : `HILTON DISPATCH RECONCILIATION — send to Nick`,
    `Ticket: ${ticket.id}`,
    quarry ? `Label: Quarry direct — truckload` : null,
    `Date: ${ticket.createdAt}`,
    ticket.cod || (ticket.noAccount && !ticket.qbName)
      ? `Sold to: COD / no account — ${ticket.customer || "—"}`
      : `Sold to / QuickBooks: ${ticket.qbName || ticket.customer}`,
    `Bill-to: ${ticket.cod || !ticket.qbName ? "—" : (ticket.billTo || "—")}`,
    `Job / site: ${ticket.jobName || ""}`,
    `Deliver to (truck): ${ticket.address}`,
    `Phone: ${ticket.phone || ""}`,
    `Email: ${ticket.email || ""}${ticket.ccEmail ? "  CC " + ticket.ccEmail : ""}`,
    `Origin yard: ${yard.name} — ${yard.address}`,
    `Truck: ${truckName(ticket.truck)} @ ${HDEngine.money(q.rate)}/hr × ${q.loadCount || 1} load(s)`,
    `Mapped one-way: ${(q.oneWayMin || 0).toFixed(1)} min`,
    `Extra site minutes: ${q.extraSite || 0}`,
    `Extra wait minutes: ${q.extraWait || 0}`,
    q.forkliftFee ? `Forklift / extra equipment fee: ${HDEngine.money(q.forkliftFee)}` : `Forklift / extra equipment fee: $0.00`,
    `Driver / unit: ${ticket.driver || "—"} / ${ticket.truckUnit || "—"}`,
    `PO: ${ticket.po || "—"}`,
    ``,
    q.formula,
    ``,
    `Materials:`,
    ...(q.lines || []).map((l) => `  - ${l.qty} ${l.unit} ${l.name} @ ${HDEngine.money(l.price)} = ${HDEngine.money(l.amount)}`),
    ``,
    `TOTAL DUE: ${HDEngine.money(q.total)}`,
    ``,
    `Notes: ${ticket.notes || "none"}`,
  ].filter((line) => line !== null).join("\n");
  if (!quoting) {
    ticket.status = "emailed";
    const idx = db.jobs.findIndex((j) => j.id === ticket.id);
    if (idx >= 0) { db.jobs[idx].status = "emailed"; saveStore(db, true); }
  }
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
  toast("Opened email to accounting");
}

function exportCsv() {
  const rows = [["ticket", "date", "customer", "phone", "address", "yard", "truck", "hours", "delivery", "materials", "forklift_fee", "total", "status"]];
  db.jobs.forEach((j) => {
    const y = yardById(j.yardId);
    rows.push([
      j.id, j.createdAt, j.customer, j.phone, j.address, y && y.name, j.truck,
      j.quote && j.quote.billableHours, j.quote && j.quote.deliveryFee, j.quote && j.quote.materialsTotal,
      j.quote && j.quote.forkliftFee, j.quote && j.quote.total, j.status
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  download("hilton-dispatch-jobs.csv", csv, "text/csv");
}

function exportJson() {
  download("hilton-dispatch-backup.json", JSON.stringify(db, null, 2), "application/json");
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function escAttr(s) {
  return String(s ?? "").replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" }[c]));
}

function seedPreview() {
  if (db.jobs.length) return;
  const when = new Date().toISOString();
  const materials = [
    { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 25, qty: 8 },
    { id: "fresh-fines", name: "Fresh Fines Bark", category: "Bark", unit: "yd", price: 34, qty: 4 },
  ];
  const quote = HDEngine.quote({
    oneWaySeconds: 18 * 60,
    truck: "dump",
    billing: db.settings.billing,
    materials,
    loads: 1,
    extraMinutes: 0,
    forkliftFee: 0,
  });
  db.jobs.push({
    id: "HD-2026-0001",
    createdAt: when,
    updatedAt: when,
    status: "new",
    customer: "Rogue Valley Landscaping",
    phone: "541-555-0142",
    email: "",
    jobName: "Oak Street driveway",
    address: "214 Oak St, Medford, OR 97501",
    notes: "Dump at the end of the drive. Call 10 minutes out. Stay off new asphalt.",
    yardId: "cp",
    truck: "dump",
    driver: "Carlos",
    truckUnit: "DT-12",
    po: "RV-4418",
    loads: 1,
    extraMinutes: 0,
    extraSiteMinutes: 0,
    extraWaitMinutes: 0,
    forkliftFee: 0,
    materials,
    quote,
    route: { provider: "osrm", seconds: 18 * 60, miles: 8.4, from: { lat: 42.3916, lng: -122.9124 }, to: { lat: 42.3266, lng: -122.8756 } },
  });
  saveStore(db, true);
}

async function onReady() {
  await bootStore();
  await ensureCustomers();
  await applyEnvGoogleKey();
  bindPin();
  $("login-btn").addEventListener("click", attemptLogin);
  $("admin-unlock").addEventListener("click", attemptAdmin);
  $("admin-cancel").addEventListener("click", closeAdminLock);
  $("admin-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") attemptAdmin(); });
  if (location.search.indexOf("preview=1") >= 0) {
    try { seedPreview(); } catch (e) { console.warn(e); }
    unlock();
    const view = (new URLSearchParams(location.search).get("view") || "board");
    if (view === "new" && db.jobs[0]) openTicket(db.jobs[0].id);
    else show(view === "new" ? "new" : view);
  }
  document.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => {
    if (b.id === "logout") return;
    requestView(b.dataset.go);
  }));
  $("logout").addEventListener("click", lock);
  $("board-search").addEventListener("input", (e) => { state.filter = e.target.value; renderBoard(); });
  $("export-csv").addEventListener("click", exportCsv);
  $("calc-btn").addEventListener("click", calculateRoute);
  $("save-btn").addEventListener("click", () => saveTicket());
  $("void-btn").addEventListener("click", voidTicket);
  $("delete-btn").addEventListener("click", deleteTicket);
  $("f-quote").addEventListener("change", () => {
    if ($("f-quote").checked) {
      $("f-status").value = "quote";
      state.draft.status = "quote";
    } else if (normalizeStatus($("f-status").value) === "quote") {
      $("f-status").value = "new";
      state.draft.status = "new";
    }
  });
  $("board-filters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-board]");
    if (!btn) return;
    state.boardView = btn.dataset.board;
    renderBoard();
  });
  $("print-inv").addEventListener("click", () => printPacket("print"));
  $("email-acct").addEventListener("click", () => printPacket("email"));
  $("f-truck-dump").addEventListener("change", () => setTruck("dump"));
  $("f-truck-small").addEventListener("change", () => setTruck("small"));
  $("f-truck-forklift").addEventListener("change", () => setTruck("forklift"));
  $("f-yard").addEventListener("change", () => {
    state.draft.yardId = $("f-yard").value;
    applyYardRules();
  });
  function liveField(id, apply) {
    const el = $(id);
    if (!el) return;
    ["input", "change", "keyup"].forEach((ev) => el.addEventListener(ev, apply));
  }
  liveField("f-loads", () => { state.draft.loads = Math.max(1, Number($("f-loads").value) || 1); renderQuoteBox(); });
  liveField("f-site-min", () => { state.draft.extraSiteMinutes = Math.max(0, Number($("f-site-min").value) || 0); renderQuoteBox(); });
  liveField("f-wait-min", () => { state.draft.extraWaitMinutes = Math.max(0, Number($("f-wait-min").value) || 0); renderQuoteBox(); });
  liveField("f-forklift-fee", () => { state.draft.forkliftFee = Math.max(0, Number($("f-forklift-fee").value) || 0); renderQuoteBox(); });
  liveField("f-rate", () => { state.draft.rateOverride = Number($("f-rate").value); renderQuoteBox(); });
  $("f-admin-rate").addEventListener("change", () => {
    state.draft.adminRate = $("f-admin-rate").checked;
    if (!state.draft.adminRate) state.draft.rateOverride = null;
    else state.draft.rateOverride = Number($("f-rate").value) || defaultRateFor(state.draft.truck);
    updateTicketChrome();
    renderQuoteBox();
  });
  $("book-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-book]");
    if (btn) setBook(btn.dataset.book);
  });
  $("catalog-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-book]");
    if (!btn) return;
    state.catalogBook = btn.dataset.book;
    renderCatalog();
  });
  function applyAddressPick(suggestion) {
    $("f-address").value = HDMaps.keepHouseNumber($("f-address").value, suggestion);
    $("addr-suggest").classList.add("hidden");
    $("addr-suggest").innerHTML = "";
    HDMaps.hoverSuggest = false;
  }
  let custHover = false;
  let custTimer = null;
  function showCustHits(hits) {
    const box = $("cust-suggest");
    if (!hits.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
    box.classList.remove("hidden");
    box.innerHTML = hits.map((a) =>
      `<div data-qb="${escAttr(a.id)}"><strong>${esc(a.qbName)}</strong>${a.company && a.company !== a.qbName ? `<div class="muted">${esc(a.company)}</div>` : ""}</div>`
    ).join("");
  }
  $("f-customer").addEventListener("input", (e) => {
    onCustomerFieldChange();
    if (custHover) return;
    clearTimeout(custTimer);
    const val = e.target.value;
    custTimer = setTimeout(() => {
      if (custHover) return;
      if (state.draft.cod || isReservedCashQuery(val)) {
        showCustHits([]);
        return;
      }
      showCustHits(searchCustomers(val));
    }, 200);
  });
  $("f-customer").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (state.draft.cod || isReservedCashQuery($("f-customer").value)) return;
    const first = document.querySelector("#cust-suggest [data-qb]");
    if (first) {
      const acct = (db.customers || []).find((a) => a.id === first.dataset.qb);
      if (acct) applyQbAccount(acct);
    }
  });
  $("f-cod").addEventListener("change", () => setCodMode($("f-cod").checked));
  $("cust-suggest").addEventListener("mouseenter", () => { custHover = true; });
  $("cust-suggest").addEventListener("mouseleave", () => { custHover = false; });
  $("cust-suggest").addEventListener("mousedown", (e) => {
    const row = e.target.closest("[data-qb]");
    if (!row) return;
    e.preventDefault();
    const acct = (db.customers || []).find((a) => a.id === row.dataset.qb);
    if (acct) applyQbAccount(acct);
  });
  $("reload-customers").addEventListener("click", async () => {
    if (!confirm("Replace the customer list with the shipped QuickBooks file? Manual account edits will be overwritten.")) return;
    db.customers = await loadCustomerSeed();
    saveStore(db, true);
    $("qb-results").innerHTML = "";
    $("qb-editor").innerHTML = "";
    toast("Customer list reloaded — " + db.customers.length + " accounts");
  });
  $("qb-search").addEventListener("input", (e) => {
    const hits = searchCustomers(e.target.value);
    $("qb-results").innerHTML = hits.map((a) =>
      `<div data-qbedit="${escAttr(a.id)}">${esc(a.qbName)}</div>`
    ).join("") || (e.target.value.trim().length >= 2 ? `<div class="empty">No match</div>` : "");
  });
  $("qb-results").addEventListener("click", (e) => {
    const row = e.target.closest("[data-qbedit]");
    if (!row) return;
    const acct = (db.customers || []).find((a) => a.id === row.dataset.qbedit);
    if (acct) renderQbEditor(acct);
  });
  $("qb-save").addEventListener("click", saveQbEditor);
  $("qb-add").addEventListener("click", () => renderQbEditor(null));
  $("f-address").addEventListener("input", (e) => {
    const box = $("addr-suggest");
    if (HDMaps.hoverSuggest) return;
    HDMaps.debounceSuggest(e.target.value, (hits) => {
      if (HDMaps.hoverSuggest) return;
      if (!hits.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
      box.classList.remove("hidden");
      box.innerHTML = hits.map((h) => `<div data-addr="${escAttr(h.label)}">${esc(h.label)}</div>`).join("");
    }, db.settings.maps.googleKey);
  });
  $("addr-suggest").addEventListener("mouseenter", () => { HDMaps.hoverSuggest = true; });
  $("addr-suggest").addEventListener("mouseleave", () => { HDMaps.hoverSuggest = false; });
  $("addr-suggest").addEventListener("mousedown", (e) => {
    const row = e.target.closest("[data-addr]");
    if (!row) return;
    e.preventDefault();
    applyAddressPick(row.dataset.addr);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".addr-wrap")) {
      $("addr-suggest").classList.add("hidden");
      HDMaps.hoverSuggest = false;
    }
  });
  $("mat-search").addEventListener("input", (e) => materialSearch(e.target.value));
  $("mat-add-btn").addEventListener("click", () => {
    const first = document.querySelector("#mat-results [data-add]");
    if (first) addMaterial(first.dataset.add);
  });
  $("mat-results").addEventListener("click", (e) => {
    const row = e.target.closest("[data-add]");
    if (row) addMaterial(row.dataset.add);
  });
  $("material-lines").addEventListener("input", onLineEdit);
  $("material-lines").addEventListener("change", onLineEdit);
  $("material-lines").addEventListener("keyup", onLineEdit);
  $("material-lines").addEventListener("click", (e) => {
    if (e.target.dataset.del != null) {
      state.draft.materials.splice(Number(e.target.dataset.del), 1);
      renderMaterialLines();
      updateTicketChrome();
      renderQuoteBox();
    }
  });
  $("job-table").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del-job]");
    if (del) {
      e.stopPropagation();
      const id = del.dataset.delJob;
      if (!confirm("Delete " + id + " for good?")) return;
      const idx = db.jobs.findIndex((j) => j.id === id);
      if (idx >= 0) db.jobs.splice(idx, 1);
      saveStore(db, true);
      renderBoard();
      toast("Deleted " + id);
      return;
    }
    const st = e.target.closest("[data-st]");
    if (st) {
      e.stopPropagation();
      const [id, status] = st.dataset.st.split("|");
      const job = db.jobs.find((j) => j.id === id);
      if (job) { job.status = status; job.updatedAt = new Date().toISOString(); saveStore(db, true); renderBoard(); toast(id + " → " + status); }
      return;
    }
    const dup = e.target.closest("[data-dup]");
    if (dup) {
      e.stopPropagation();
      const job = db.jobs.find((j) => j.id === dup.dataset.dup);
      if (!job) return;
      state.draft = { ...JSON.parse(JSON.stringify(job)), id: null, createdAt: null, status: "new" };
      if (state.draft.forkliftFee == null) state.draft.forkliftFee = 0;
      state.route = job.route || null;
      state.quote = job.quote || null;
      show("new");
      toast("Copied " + job.id + " — save to issue a new ticket number");
      return;
    }
    const row = e.target.closest("[data-open]");
    if (row) openTicket(row.dataset.open);
  });
  $("save-settings").addEventListener("click", saveSettings);
  $("save-catalog").addEventListener("click", saveCatalog);
  $("add-catalog").addEventListener("click", addCatalogRow);
  $("reload-sheet").addEventListener("click", () => {
    if (!confirm("Reload published Store / Flagstone / Boulders / Willow Creek sheets? Custom rows you added stay.")) return;
    db.settings.materials = HDCatalog.reloadRetailKeepExtras(db.settings.materials);
    db.settings.priceSheet = HD_DEFAULTS.priceSheet;
    db.settings.catalogConfirmed = true;
    saveStore(db, true);
    renderCatalog();
    toast("2026 price sheet loaded — quarry and flagstone kept");
  });
  $("test-google").addEventListener("click", async () => {
    const key = $("s-gkey").value.trim();
    if (!key) { toast("Paste a Google Maps API key first"); return; }
    db.settings.maps.googleKey = key;
    saveStore(db, true);
    $("test-google").disabled = true;
    $("test-google").textContent = "Testing Google…";
    try {
      const from = db.settings.yards[0];
      const to = db.settings.yards[1] || db.settings.yards[0];
      const route = await HDMaps.route(from.address, to.address, from, key);
      if (route.provider !== "google") throw new Error("Google did not answer — check the key and that Maps JavaScript, Directions, and Geocoding are enabled.");
      toast("Google Maps live · " + route.miles.toFixed(1) + " mi " + from.name + " → " + to.name);
    } catch (err) {
      toast(err.message || "Google key failed");
    } finally {
      $("test-google").disabled = false;
      $("test-google").textContent = "Test Google key";
    }
  });
  $("catalog-table").addEventListener("input", onCatalogEdit);
  $("catalog-table").addEventListener("change", onCatalogEdit);
  $("catalog-table").addEventListener("keyup", onCatalogEdit);
  $("catalog-table").addEventListener("click", (e) => {
    if (e.target.dataset.cd != null) {
      db.settings.materials.splice(Number(e.target.dataset.cd), 1);
      saveStore(db, true);
      renderCatalog();
    }
  });
  $("export-json").addEventListener("click", exportJson);
  $("import-json").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.settings || !Array.isArray(data.jobs)) throw new Error("bad file");
      db = normalizeStore(data);
      saveStore(db, true);
      toast("Backup restored");
      renderSettings();
      renderCatalog();
    } catch (err) {
      toast("Could not read that backup");
    }
  });
}

document.addEventListener("DOMContentLoaded", onReady);
window.HDApp = { show, newTicket, openTicket, saveTicket, printPacket };
