/* Hilton Dispatch — UI + persistence */

const STORE_KEY = "hilton-dispatch-v2";
const LEGACY_KEY = "hilton-dispatch-v1";

const state = {
  session: false,
  view: "board",
  draft: blankDraft(),
  quote: null,
  route: null,
  map: null,
  mapLayer: null,
  filter: "",
};

function blankDraft() {
  const when = new Date();
  when.setMinutes(when.getMinutes() - when.getTimezoneOffset());
  return {
    id: null,
    createdAt: null,
    status: "open",
    customer: "",
    phone: "",
    email: "",
    jobName: "",
    address: "",
    city: "",
    notes: "",
    yardId: "cp",
    truck: "dump",
    driver: "",
    truckUnit: "",
    po: "",
    loads: 1,
    extraMinutes: 0,
    rateOverride: null,
    bufferOverride: null,
    deliverOn: when.toISOString().slice(0, 16),
    materials: [],
    route: null,
    quote: null,
  };
}

function normalizeStore(data) {
  data.settings = {
    ...HD_DEFAULTS,
    ...data.settings,
    company: { ...HD_DEFAULTS.company, ...(data.settings && data.settings.company) },
    billing: { ...HD_DEFAULTS.billing, ...(data.settings && data.settings.billing) },
    security: { ...HD_DEFAULTS.security, ...(data.settings && data.settings.security) },
    maps: { ...HD_DEFAULTS.maps, ...(data.settings && data.settings.maps) },
  };
  if (!Array.isArray(data.jobs)) data.jobs = [];
  if (!Array.isArray(data.settings.yards) || !data.settings.yards.length) data.settings.yards = HD_DEFAULTS.yards;
  const oldAcct = (data.settings.company.accountingEmail || "").toLowerCase();
  if (!oldAcct || oldAcct.indexOf("accounting@hilton") === 0) {
    data.settings.company.accountingEmail = HD_DEFAULTS.company.accountingEmail;
  }
  if (data.settings.priceSheet !== HD_DEFAULTS.priceSheet || !Array.isArray(data.settings.materials) || !data.settings.materials.length) {
    data.settings.materials = JSON.parse(JSON.stringify(HD_DEFAULTS.materials));
    data.settings.priceSheet = HD_DEFAULTS.priceSheet;
    data.settings.catalogConfirmed = true;
  }
  return data;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return seedStore();
    const data = normalizeStore(JSON.parse(raw));
    saveStore(data);
    return data;
  } catch (e) {
    return seedStore();
  }
}

function seedStore() {
  const data = { settings: JSON.parse(JSON.stringify(HD_DEFAULTS)), jobs: [] };
  saveStore(data);
  return data;
}

function saveStore(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

let db = loadStore();

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

function lock() {
  state.session = false;
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
  const jobs = db.jobs.slice().reverse();
  const q = (state.filter || "").toLowerCase();
  const list = q
    ? jobs.filter((j) => JSON.stringify(j).toLowerCase().includes(q))
    : jobs;
  const today = new Date().toISOString().slice(0, 10);
  const todays = jobs.filter((j) => (j.createdAt || "").slice(0, 10) === today);
  const open = jobs.filter((j) => j.status === "open");
  const billed = jobs.reduce((s, j) => s + ((j.quote && j.quote.total) || 0), 0);

  $("kpi-today").textContent = String(todays.length);
  $("kpi-open").textContent = String(open.length);
  $("kpi-total").textContent = HDEngine.money(billed);

  if (!list.length) {
    $("job-table").innerHTML = `<div class="empty">No tickets yet. Take the call, punch the address, build the ticket.</div>`;
    return;
  }
  $("job-table").innerHTML = `
    <table>
      <thead><tr>
        <th>Ticket</th><th>Customer</th><th>Yard</th><th>Truck</th><th>Total</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map((j) => `
          <tr class="clickable" data-open="${j.id}">
            <td><strong>${j.id}</strong><div class="muted">${(j.createdAt || "").replace("T", " ").slice(0, 16)}</div></td>
            <td>${esc(j.customer) || "—"}<div class="muted">${esc(j.address)}</div></td>
            <td>${esc((yardById(j.yardId) || {}).name || "")}</td>
            <td><span class="badge ${j.truck}">${truckLabel(j.truck)}</span></td>
            <td>${j.quote ? HDEngine.money(j.quote.total) : "—"}</td>
            <td><span class="badge ${j.status}">${j.status}</span></td>
            <td class="actions">
              <button class="ghost" data-open="${j.id}">Open</button>
              <button class="ghost" data-dup="${j.id}">Copy</button>
              <button class="ghost" data-st="${j.id}|delivered">Done</button>
              <button class="ghost" data-st="${j.id}|void">Void</button>
            </td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function truckLabel(truck) {
  const b = db.settings.billing;
  return truck === "dump" ? `Dump $${b.dumpRate}` : `Small $${b.smallRate}`;
}

function catalogNeedsPrices() {
  return db.settings.materials.some((m) => !m.price);
}

function renderForm() {
  const d = state.draft;
  const b = db.settings.billing;
  $("f-customer").value = d.customer;
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
  $("f-extra").value = d.extraMinutes || 0;
  $("f-status").value = d.status || "open";
  $("f-truck-dump").checked = d.truck === "dump";
  $("f-truck-small").checked = d.truck === "small";
  const defaultRate = d.truck === "dump" ? b.dumpRate : b.smallRate;
  const defaultBuf = Math.round((b.dumpTimeMultiplier - 1) * 100);
  $("f-rate").value = d.rateOverride != null ? d.rateOverride : defaultRate;
  $("f-buffer").value = d.bufferOverride != null ? d.bufferOverride : defaultBuf;
  $("dump-rate-label").textContent = `$${b.dumpRate} / hour · +${defaultBuf}% route time · change below for this ticket`;
  $("small-rate-label").textContent = `$${b.smallRate} / hour · mapped time · change below for this ticket`;
  $("price-banner").classList.toggle("hidden", !catalogNeedsPrices());
  const yardSel = $("f-yard");
  yardSel.innerHTML = db.settings.yards.map((y) =>
    `<option value="${y.id}" ${y.id === d.yardId ? "selected" : ""}>${y.name} — ${y.address}</option>`
  ).join("");
  renderMaterialLines();
  renderQuoteBox();
}

function renderMaterialLines() {
  const wrap = $("material-lines");
  if (!state.draft.materials.length) {
    wrap.innerHTML = `<div class="empty">No materials yet. Search the book and add yards / tons / each.</div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr><th>Material</th><th>Qty</th><th>Unit</th><th>Price</th><th>Amount</th><th></th></tr></thead><tbody>
    ${state.draft.materials.map((m, i) => `
      <tr>
        <td>${esc(m.name)}<div class="muted">${esc(m.category || "")}</div></td>
        <td><input type="number" min="0" step="0.25" value="${m.qty}" data-qty="${i}" style="width:90px"></td>
        <td>${esc(m.unit)}</td>
        <td>${HDEngine.money(m.price)}</td>
        <td>${HDEngine.money((Number(m.qty) || 0) * (Number(m.price) || 0))}</td>
        <td><button class="ghost" data-del="${i}">Remove</button></td>
      </tr>`).join("")}
  </tbody></table>`;
}

function ticketBilling() {
  const b = { ...db.settings.billing };
  const rate = Number(state.draft.rateOverride);
  if (isFinite(rate) && rate > 0) {
    if (state.draft.truck === "dump") b.dumpRate = rate;
    else b.smallRate = rate;
  }
  const buf = Number(state.draft.bufferOverride);
  if (isFinite(buf) && buf >= 0) {
    b.dumpTimeMultiplier = 1 + buf / 100;
  }
  return b;
}

function currentQuote() {
  const seconds = state.route ? state.route.seconds : 0;
  return HDEngine.quote({
    oneWaySeconds: seconds,
    truck: state.draft.truck,
    billing: ticketBilling(),
    materials: state.draft.materials,
    loads: state.draft.loads,
    extraMinutes: state.draft.extraMinutes,
  });
}

function renderQuoteBox() {
  const q = currentQuote();
  state.quote = q;
  const routed = !!state.route;
  $("quote-box").innerHTML = `
    <div class="l muted" style="color:#d9c4a8">Delivery + materials</div>
    <div class="total">${HDEngine.money(q.total)}</div>
    <div style="margin-top:8px">${HDEngine.money(q.deliveryFee)} delivery · ${HDEngine.money(q.materialsTotal)} materials</div>
    <div class="break">${routed ? q.formula : "Punch the delivery address and hit Calculate route to lock time and delivery fee.\nMaterials can be added anytime."}</div>
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
  state.draft.deliverOn = $("f-when").value;
  state.draft.jobName = $("f-job").value.trim();
  state.draft.address = $("f-address").value.trim();
  state.draft.notes = $("f-notes").value.trim();
  state.draft.driver = $("f-driver").value.trim();
  state.draft.truckUnit = $("f-unit").value.trim();
  state.draft.po = $("f-po").value.trim();
  state.draft.yardId = $("f-yard").value;
  state.draft.truck = $("f-truck-dump").checked ? "dump" : "small";
  state.draft.loads = Math.max(1, Number($("f-loads").value) || 1);
  state.draft.extraMinutes = Math.max(0, Number($("f-extra").value) || 0);
  state.draft.status = $("f-status").value || "open";
  state.draft.rateOverride = Number($("f-rate").value);
  state.draft.bufferOverride = Number($("f-buffer").value);
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
    status: status || state.draft.status || "open",
    quote: q,
    route: state.route,
  };
  const idx = db.jobs.findIndex((j) => j.id === ticket.id);
  if (idx >= 0) db.jobs[idx] = ticket;
  else db.jobs.push(ticket);
  saveStore(db);
  state.draft = { ...ticket };
  toast("Saved " + ticket.id);
  return ticket;
}

function openTicket(id) {
  const job = db.jobs.find((j) => j.id === id);
  if (!job) return;
  state.draft = JSON.parse(JSON.stringify(job));
  state.route = job.route || null;
  state.quote = job.quote || null;
  show("new");
  if (state.route) setTimeout(() => drawMap(state.route), 100);
}

function newTicket() {
  state.draft = blankDraft();
  state.route = null;
  state.quote = null;
  show("new");
}

function materialSearch(q) {
  const s = (q || "").toLowerCase();
  if (!s) { $("mat-results").innerHTML = ""; return; }
  const hits = db.settings.materials.filter((m) =>
    (m.name + " " + m.category).toLowerCase().includes(s)
  ).slice(0, 12);
  $("mat-results").innerHTML = hits.map((m) =>
    `<div data-add="${m.id}"><strong>${esc(m.name)}</strong> · ${HDEngine.money(m.price)} / ${esc(m.unit)}
     <div class="cat">${esc(m.category)}</div></div>`
  ).join("") || `<div class="empty">No match — add it under Material Book</div>`;
}

function addMaterial(id) {
  const m = db.settings.materials.find((x) => x.id === id);
  if (!m) return;
  const qty = Number($("mat-qty").value) || 1;
  const existing = state.draft.materials.find((x) => x.id === id);
  if (existing) existing.qty = Number(existing.qty) + qty;
  else state.draft.materials.push({ id: m.id, name: m.name, category: m.category, unit: m.unit, price: m.price, qty });
  $("mat-search").value = "";
  $("mat-results").innerHTML = "";
  renderMaterialLines();
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
  $("s-mult").value = Math.round((s.billing.dumpTimeMultiplier - 1) * 100);
  $("s-trip").value = s.billing.tripMode;
  $("s-min").value = s.billing.minimumHours;
  $("s-inc").value = s.billing.incrementMinutes;
  $("s-load").value = s.billing.loadMinutes;
  $("s-unload").value = s.billing.unloadMinutes;
  $("s-pin").value = s.security.pin;
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
  s.company.name = $("s-company").value.trim() || s.company.name;
  s.company.email = $("s-email").value.trim();
  s.company.accountingEmail = $("s-acct").value.trim();
  s.company.phone = $("s-phone").value.trim();
  s.billing.dumpRate = Number($("s-dump").value) || 160;
  s.billing.smallRate = Number($("s-small").value) || 100;
  s.billing.dumpTimeMultiplier = 1 + (Number($("s-mult").value) || 8) / 100;
  s.billing.tripMode = $("s-trip").value;
  s.billing.minimumHours = Number($("s-min").value) || 1;
  s.billing.incrementMinutes = Number($("s-inc").value) || 15;
  s.billing.loadMinutes = Number($("s-load").value) || 0;
  s.billing.unloadMinutes = Number($("s-unload").value) || 0;
  s.security.pin = $("s-pin").value.trim() || "1956";
  s.maps.googleKey = $("s-gkey").value.trim();
  document.querySelectorAll("[data-y]").forEach((inp) => {
    const i = Number(inp.dataset.y);
    const k = inp.dataset.k;
    if (s.yards[i]) s.yards[i][k] = inp.value;
  });
  saveStore(db);
  toast("Settings saved");
}

function renderCatalog() {
  const rows = db.settings.materials.map((m, i) => `
    <tr>
      <td><input value="${escAttr(m.name)}" data-c="${i}" data-k="name"></td>
      <td><input value="${escAttr(m.category)}" data-c="${i}" data-k="category"></td>
      <td><input value="${escAttr(m.unit)}" data-c="${i}" data-k="unit" style="width:70px"></td>
      <td><input type="number" step="0.01" value="${m.price}" data-c="${i}" data-k="price" style="width:100px"></td>
      <td><button class="ghost" data-cd="${i}">Delete</button></td>
    </tr>`).join("");
  $("catalog-table").innerHTML = `<table><thead><tr><th>Material</th><th>Category</th><th>Unit</th><th>Price</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function saveCatalog() {
  document.querySelectorAll("[data-c]").forEach((inp) => {
    const i = Number(inp.dataset.c);
    const k = inp.dataset.k;
    if (!db.settings.materials[i]) return;
    db.settings.materials[i][k] = k === "price" ? Number(inp.value) || 0 : inp.value;
  });
  db.settings.catalogConfirmed = !catalogNeedsPrices();
  saveStore(db);
  toast(catalogNeedsPrices() ? "Book saved — some prices are still $0" : "Material book saved");
}

function addCatalogRow() {
  db.settings.materials.push({
    id: "sku-" + Date.now(),
    name: "New material",
    category: "Custom",
    unit: "yd",
    price: 0,
  });
  saveStore(db);
  renderCatalog();
}

function printPacket(kind) {
  const ticket = saveTicket(state.draft.status || "printed");
  if (!ticket) return;
  ticket.status = kind === "email" ? ticket.status : "printed";
  const idx = db.jobs.findIndex((j) => j.id === ticket.id);
  if (idx >= 0) { db.jobs[idx].status = ticket.status; saveStore(db); }
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
  const matRows = (q.lines || []).map((l) =>
    `<tr><td>${esc(l.name)}</td><td>${l.qty} ${esc(l.unit)}</td><td>${HDEngine.money(l.price)}</td><td>${HDEngine.money(l.amount)}</td></tr>`
  ).join("") || `<tr><td colspan="4">No materials</td></tr>`;
  const steps = ((ticket.route && ticket.route.steps) || []).slice(0, 18)
    .map((s, i) => `<li>${esc(s.instruction)} <span class="muted">(${s.miles.toFixed(1)} mi)</span></li>`).join("");

  $("print-root").innerHTML = `
    <section class="sheet">
      <div class="sheet-head">
        <div>
          <h1>${esc(co.name)}</h1>
          <div>${esc(co.tagline || "")}</div>
          <div>${esc(co.phone)} · ${esc(co.email)}</div>
          <div>${esc(yard.name)} — ${esc(yard.address)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700">INVOICE ${esc(ticket.id)}</div>
          <div>${when}</div>
          <div>PO: ${esc(ticket.po || "—")}</div>
        </div>
      </div>
      <div class="row">
        <div><strong>Bill To</strong><br>${esc(ticket.customer)}<br>${esc(ticket.phone)}<br>${esc(ticket.email || "")}<br>${esc(ticket.jobName)}</div>
        <div><strong>Deliver To</strong><br>${esc(ticket.address)}<br>Truck: ${ticket.truck === "dump" ? "Dump truck" : "Small truck"} @ ${HDEngine.money(q.rate)}/hr · ${q.loadCount || 1} load(s)<br>Driver / unit: ${esc(ticket.driver || "—")} ${esc(ticket.truckUnit || "")}<br>Deliver on: ${esc(ticket.deliverOn ? ticket.deliverOn.replace("T", " ") : "—")}</div>
      </div>
      <h3 style="margin-top:18px">Materials</h3>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${matRows}</tbody></table>
      <h3 style="margin-top:18px">Delivery</h3>
      <table>
        <tr><td>Mapped one-way</td><td>${q.oneWayMin.toFixed(1)} min · ${(ticket.route ? ticket.route.miles : 0).toFixed(1)} mi</td></tr>
        <tr><td>Trip</td><td>${q.tripFactor === 2 ? "Round trip" : "One way"} × ${q.loadCount || 1} load(s) = ${q.tripMin.toFixed(1)} min</td></tr>
        <tr><td>Dump-truck time buffer</td><td>${q.isDump ? "Applied × " + Number(q.multiplier).toFixed(2) : "Not applied (small truck)"} → ${q.adjustedDriveMin.toFixed(1)} min</td></tr>
        <tr><td>Load + unload + extra</td><td>${q.siteMin.toFixed(0)} min</td></tr>
        <tr><td>Billable time</td><td>${q.billableHours.toFixed(2)} hr @ ${HDEngine.money(q.rate)}/hr</td></tr>
      </table>
      <div class="totals-box">
        Materials ${HDEngine.money(q.materialsTotal)}<br>
        Delivery ${HDEngine.money(q.deliveryFee)}<br>
        ${q.tax ? "Tax " + HDEngine.money(q.tax) + "<br>" : ""}
        <strong style="font-size:22px">Total ${HDEngine.money(q.total)}</strong>
      </div>
      <p class="muted">${esc(ticket.notes || "")}</p>
      <div class="recon">${esc(q.formula || "")}</div>
      <p class="muted">Private dispatch ticket for Hilton internal billing and driver paperwork. Material prices per current yard book. Oregon — no sales tax unless set in Settings.</p>
    </section>
    <section class="sheet">
      <div class="sheet-head">
        <div>
          <h1>DRIVER ROUTE SHEET</h1>
          <div>${esc(co.name)} · ${esc(ticket.id)}</div>
        </div>
        <div style="text-align:right">
          <div>${when}</div>
          <div>${ticket.truck === "dump" ? "DUMP TRUCK" : "SMALL TRUCK"}</div>
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
      <p><strong>Route:</strong> ${(ticket.route ? ticket.route.miles.toFixed(1) : "—")} miles one-way.
         ${q.isDump ? "Dump truck — run easy, 8% time buffer already on the ticket." : ""}
         Driver: ${esc(ticket.driver || "unassigned")} · Unit ${esc(ticket.truckUnit || "—")}</p>
      ${steps ? `<ol>${steps}</ol>` : `<p class="muted">Turn-by-turn prints when the OSM router is used. Google Distance Matrix still bills time/miles.</p>`}
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
  const subject = `Hilton Dispatch ${ticket.id} — ${ticket.customer} — ${HDEngine.money(q.total)}`;
  const body = [
    `HILTON DISPATCH RECONCILIATION — send to Nick`,
    `Ticket: ${ticket.id}`,
    `Date: ${ticket.createdAt}`,
    `Customer: ${ticket.customer}  ${ticket.phone}`,
    `Job: ${ticket.jobName || ""}`,
    `Deliver to: ${ticket.address}`,
    `Origin yard: ${yard.name} — ${yard.address}`,
    `Truck: ${ticket.truck === "dump" ? "Dump" : "Small"} @ ${HDEngine.money(q.rate)}/hr × ${q.loadCount || 1} load(s)`,
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
  ].join("\n");
  ticket.status = "sent";
  const idx = db.jobs.findIndex((j) => j.id === ticket.id);
  if (idx >= 0) { db.jobs[idx].status = "sent"; saveStore(db); }
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
  toast("Opened email to accounting");
}

function exportCsv() {
  const rows = [["ticket", "date", "customer", "phone", "address", "yard", "truck", "hours", "delivery", "materials", "total", "status"]];
  db.jobs.forEach((j) => {
    const y = yardById(j.yardId);
    rows.push([
      j.id, j.createdAt, j.customer, j.phone, j.address, y && y.name, j.truck,
      j.quote && j.quote.billableHours, j.quote && j.quote.deliveryFee, j.quote && j.quote.materialsTotal, j.quote && j.quote.total, j.status
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
  });
  db.jobs.push({
    id: "HD-2026-0001",
    createdAt: when,
    updatedAt: when,
    status: "open",
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
    materials,
    quote,
    route: { provider: "osrm", seconds: 18 * 60, miles: 8.4, from: { lat: 42.3916, lng: -122.9124 }, to: { lat: 42.3266, lng: -122.8756 } },
  });
  saveStore(db);
}

function onReady() {
  bindPin();
  $("login-btn").addEventListener("click", attemptLogin);
  if (location.search.indexOf("preview=1") >= 0) {
    try { seedPreview(); } catch (e) { console.warn(e); }
    unlock();
    const view = (new URLSearchParams(location.search).get("view") || "board");
    if (view === "new" && db.jobs[0]) openTicket(db.jobs[0].id);
    else show(view === "new" ? "new" : view);
  }
  document.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.go === "new") newTicket();
    else show(b.dataset.go);
  }));
  $("logout").addEventListener("click", lock);
  $("board-search").addEventListener("input", (e) => { state.filter = e.target.value; renderBoard(); });
  $("export-csv").addEventListener("click", exportCsv);
  $("calc-btn").addEventListener("click", calculateRoute);
  $("save-btn").addEventListener("click", () => saveTicket("open"));
  $("print-inv").addEventListener("click", () => printPacket("print"));
  $("email-acct").addEventListener("click", () => printPacket("email"));
  $("f-truck-dump").addEventListener("change", () => {
    state.draft.truck = "dump";
    $("f-rate").value = db.settings.billing.dumpRate;
    state.draft.rateOverride = db.settings.billing.dumpRate;
    renderQuoteBox();
  });
  $("f-truck-small").addEventListener("change", () => {
    state.draft.truck = "small";
    $("f-rate").value = db.settings.billing.smallRate;
    state.draft.rateOverride = db.settings.billing.smallRate;
    renderQuoteBox();
  });
  $("f-rate").addEventListener("input", () => {
    state.draft.rateOverride = Number($("f-rate").value);
    renderQuoteBox();
  });
  $("f-buffer").addEventListener("input", () => {
    state.draft.bufferOverride = Number($("f-buffer").value);
    renderQuoteBox();
  });
  $("f-yard").addEventListener("change", () => { state.draft.yardId = $("f-yard").value; });
  $("f-loads").addEventListener("input", () => { state.draft.loads = Math.max(1, Number($("f-loads").value) || 1); renderQuoteBox(); });
  $("f-extra").addEventListener("input", () => { state.draft.extraMinutes = Math.max(0, Number($("f-extra").value) || 0); renderQuoteBox(); });
  $("f-address").addEventListener("input", (e) => {
    const box = $("addr-suggest");
    HDMaps.debounceSuggest(e.target.value, (hits) => {
      if (!hits.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
      box.classList.remove("hidden");
      box.innerHTML = hits.map((h) => `<div data-addr="${escAttr(h.label)}">${esc(h.label)}</div>`).join("");
    });
  });
  $("addr-suggest").addEventListener("click", (e) => {
    const row = e.target.closest("[data-addr]");
    if (!row) return;
    $("f-address").value = row.dataset.addr;
    $("addr-suggest").classList.add("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".addr-wrap")) $("addr-suggest").classList.add("hidden");
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
  $("material-lines").addEventListener("input", (e) => {
    if (e.target.dataset.qty != null) {
      const i = Number(e.target.dataset.qty);
      state.draft.materials[i].qty = Number(e.target.value) || 0;
      renderQuoteBox();
    }
  });
  $("material-lines").addEventListener("click", (e) => {
    if (e.target.dataset.del != null) {
      state.draft.materials.splice(Number(e.target.dataset.del), 1);
      renderMaterialLines();
      renderQuoteBox();
    }
  });
  $("job-table").addEventListener("click", (e) => {
    const st = e.target.closest("[data-st]");
    if (st) {
      e.stopPropagation();
      const [id, status] = st.dataset.st.split("|");
      const job = db.jobs.find((j) => j.id === id);
      if (job) { job.status = status; job.updatedAt = new Date().toISOString(); saveStore(db); renderBoard(); toast(id + " → " + status); }
      return;
    }
    const dup = e.target.closest("[data-dup]");
    if (dup) {
      e.stopPropagation();
      const job = db.jobs.find((j) => j.id === dup.dataset.dup);
      if (!job) return;
      state.draft = { ...JSON.parse(JSON.stringify(job)), id: null, createdAt: null, status: "open" };
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
    if (!confirm("Replace the material book with the Aug 26, 2026 store price sheet? Custom rows you added will be removed.")) return;
    db.settings.materials = JSON.parse(JSON.stringify(HD_DEFAULTS.materials));
    db.settings.priceSheet = HD_DEFAULTS.priceSheet;
    db.settings.catalogConfirmed = true;
    saveStore(db);
    renderCatalog();
    toast("2026 price sheet loaded");
  });
  $("test-google").addEventListener("click", async () => {
    const key = $("s-gkey").value.trim();
    if (!key) { toast("Paste a Google Maps API key first"); return; }
    db.settings.maps.googleKey = key;
    saveStore(db);
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
  $("catalog-table").addEventListener("click", (e) => {
    if (e.target.dataset.cd != null) {
      db.settings.materials.splice(Number(e.target.dataset.cd), 1);
      saveStore(db);
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
      db = data;
      saveStore(db);
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
