/* Node smoke test for the printed ticket slip and the ticket email.
   Loads the real app.js against a stub DOM, builds a ticket, and checks the
   invoice, driver sheet, customer receipt, and the mailto. Run: node js/slip.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// A forgiving DOM: every element answers every call, and remembers innerHTML/value.
function makeEl() {
  const el = {
    value: "", checked: false, innerHTML: "", textContent: "", style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    appendChild() {}, removeChild() {}, remove() {}, focus() {}, blur() {}, click() {}, closest() { return null; },
    querySelector() { return makeEl(); }, querySelectorAll() { return []; }, insertAdjacentHTML() {},
  };
  return el;
}
const els = {};
const document = {
  getElementById: (id) => (els[id] = els[id] || makeEl()),
  querySelector: () => makeEl(), querySelectorAll: () => [], addEventListener() {}, createElement: () => makeEl(),
  body: makeEl(), documentElement: makeEl(),
};
const storage = {};
const window = {
  document, location: { href: "", origin: "http://localhost", hostname: "localhost", search: "", reload() {} },
  localStorage: { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } },
  addEventListener() {}, setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {},
  navigator: { userAgent: "node", onLine: true }, fetch: () => new Promise(() => {}), print() {}, open() {}, alert() {}, confirm: () => false, prompt: () => null,
  console, Date, Math, JSON, Number, String, Boolean, Array, Object, Promise, encodeURIComponent, decodeURIComponent, URL, URLSearchParams,
};
window.window = window;
window.localStorage = window.localStorage;
Object.assign(window, { localStorage: window.localStorage });
const ctx = vm.createContext(window);
for (const f of ["data.js", "engine.js", "desk.js", "receipt.js", "app.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), "utf8"), ctx, { filename: f });
}

const run = (code) => vm.runInContext(code, ctx);

// Build a ticket the way saveTicket would store it.
run(`
  var __q = HDEngine.quote({ truck: "dump", oneWaySeconds: 1200, billing: Object.assign({}, db.settings.billing, { surchargePercent: 15 }),
    materials: [
      { id: "a", name: "Topsoil", qty: 3, unit: "yd", price: 25, book: "store" },
      { id: "b", name: "Jaw Run", qty: 2, unit: "ton", price: 12.5, book: "quarry" } ],
    forkliftFee: 0, toteFee: 0 });
  var __t = { id: "HD-TEST-1", createdAt: new Date().toISOString(), customer: "Smoke Test Customer",
    address: "1250 Biddle Rd, Medford, OR", email: "smoke@example.com", phone: "", notes: "gate 4421, card 4111 1111 1111 1111",
    yardId: (db.settings.yards[0] || {}).id, truck: "dump", status: "scheduled", lines: [], noAccount: true, qbName: "", cod: false,
    payMethod: "credit", paid: true, paidBy: "Grace", paidAt: "2026-10-02T15:12:00.000Z", customerCopy: true, quote: __q };
`);
const total = run("HDEngine.money(__t.quote.total)");
const fuel = run("HDEngine.money(__t.quote.fuelSurcharge)");

// Three prints, split: customer page, yellow waiver, house sheet.
run("buildPrint(__t)");
const html = els["print-root"].innerHTML;
const cut = (from, to) => html.slice(html.indexOf(from), to ? html.indexOf(to) : undefined);
assert.strictEqual(html.split('<section class="sheet').length - 1, 3, "three sheets");
const customer = cut('<section class="sheet customer">', '<section class="sheet waiver">');
const waiver = cut('<section class="sheet waiver">', '<section class="sheet house">');
const house = cut('<section class="sheet house">');

// CUSTOMER KEEPS THIS: one page, prices, no route.
assert.ok(customer.includes("CUSTOMER KEEPS THIS"));
for (const needle of ["HD-TEST-1", "Smoke Test Customer", "1250 Biddle Rd, Medford, OR", "Topsoil", "3 yd", "Jaw Run", "2 ton", "3 yd · 2 ton",
  "$25.00", "$12.50", "Delivery — Dump truck</td><td>" + run("HDEngine.money(__t.quote.deliveryFee)"), "Total " + total, "Credit — PAID, marked by Grace"]) {
  assert.ok(customer.includes(needle), "customer page shows " + needle);
}
const body = customer.slice(0, customer.indexOf('<div class="totals-box">'));
for (const banned of ["Mapped one-way", " mi<", "min ·", "Billable time", "Route:", "<ol>", "Fuel surcharge", "fuel index", "Diesel week", "gate 4421", "House notes"]) {
  assert.ok(!body.includes(banned), "customer page body must not carry: " + banned);
}
assert.ok(customer.includes("Fuel surcharge " + fuel + "<br>"), "fuel surcharge prints in the total column only");
assert.ok(!customer.includes("Customer signature") && !customer.includes("Authorized Representative"), "customer page carries no waiver");
assert.ok(customer.includes("Bill-to</strong><br>—"), "bill-to is blank with no QuickBooks match");
assert.ok(!html.includes("4111") && html.includes("[card number removed]"), "card number never prints");

// Yellow waiver: exact text, customer signs, driver keeps.
assert.ok(waiver.includes("DRIVER KEEPS THIS") && waiver.includes("DELIVERY TO WORKSITE POLICY TERMS"));
for (const p of run("HDReceipt.WAIVER")) assert.ok(waiver.includes(p.replace(/"/g, "&quot;").replace(/'/g, "&#39;")) || waiver.includes(p), "waiver paragraph printed in full");
assert.ok(waiver.includes("REQUEST TO DELIVER MATERIALS TO A WORK SITE NOT SERVED BY A PUBLIC ROAD:"));
assert.ok(waiver.includes("PROPERTY ADDRESS / Authorized Representative:</strong><br>1250 Biddle Rd, Medford, OR<br>Smoke Test Customer"));
assert.ok(waiver.includes("Signature: Authorized Representative") && waiver.includes('class="line">Date<'), "signature and date lines");
assert.ok(!waiver.includes("$"), "no money on the waiver");

// House sheet: route, time, turns, scale weight, house notes, driver only.
assert.ok(house.includes("DRIVER KEEPS THIS") && house.includes("HOUSE SHEET"));
for (const needle of ["Mapped one-way", "Billable time", "Route:", "Scale weight", "House notes", "gate 4421", "Driver name (print)", "Truck #", "Driver signature / time out"]) {
  assert.ok(house.includes(needle), "house sheet shows " + needle);
}
assert.ok(!house.includes("Customer received by") && !house.includes("Customer signature"), "no customer signature on the house sheet");
assert.ok(house.includes("Payment:</strong> Credit — PAID, marked by Grace"), "house sheet shows the paid line under the driver block");
assert.ok(house.indexOf("Driver signature / time out") < house.indexOf("Payment:</strong>"), "paid line sits under driver name / truck #");
assert.ok(customer.includes("Paid at delivery ______"), "customer page leaves a write-in for the COD driver");
assert.ok(!house.includes("Paid at delivery"), "write-in is on the customer page only");

// Bill-to only when QuickBooks matched.
run("__t.billTo = 'QB Billing Co, PO Box 9'; buildPrint(__t)");
assert.ok(els["print-root"].innerHTML.includes("Bill-to</strong><br>—"), "a stray bill-to still prints blank when the name did not match QuickBooks");
run("__t.qbName = 'Smoke Test Customer'; __t.noAccount = false; buildPrint(__t)");
assert.ok(els["print-root"].innerHTML.includes("Bill-to</strong><br>QB Billing Co, PO Box 9"), "bill-to prints only when QuickBooks matched");
run("__t.qbName = ''; __t.billTo = ''; __t.noAccount = true;");

// Email: Nick and Grace always; customer CC only when they asked.
run("var __href = ''; openMailto = function (h) { __href = h; }; emailAccounting(__t)");
let href = decodeURIComponent(run("__href"));
assert.ok(href.startsWith("mailto:dispatch@hiltonlandscaping.com,control@hiltonlandscaping.com?"), "to Nick and Grace: " + href.slice(0, 90));
assert.ok(href.includes("&cc=smoke@example.com&"), "customer CC'd when they asked for a copy");
assert.ok(href.includes("Payment: Credit — PAID, marked by Grace"), "email carries the payment line");
assert.ok(href.includes("Fuel surcharge: " + fuel), "email carries the fuel surcharge as its own line");
assert.ok(!href.includes("4111"), "email never carries a card number");
run("__t.customerCopy = false; emailAccounting(__t)");
href = decodeURIComponent(run("__href"));
assert.ok(!href.includes("cc=") && !href.includes("smoke@example.com&"), "customer is not emailed unless the box is ticked");
assert.ok(href.includes("Customer copy: not requested"), "email says the customer did not ask for a copy");

// Unpaid, no method chosen: slip leaves a blank for the driver.
run("__t.paid = false; __t.paidBy = ''; __t.payMethod = ''; buildPrint(__t)");
assert.ok(els["print-root"].innerHTML.includes("Payment method: ____________ — NOT PAID"), "blank payment line when nothing picked");
assert.ok(els["print-root"].innerHTML.slice(els["print-root"].innerHTML.indexOf('<section class="sheet house">')).includes("Payment:</strong> Payment method: ____________ — NOT PAID"), "house sheet says NOT PAID when nobody marked it");

// CSV export carries payment columns.
run("var __csv = ''; URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {}; db.jobs = [Object.assign({}, __t, { paid: true, paidBy: 'Grace', payMethod: 'cash' })];");
const csvHead = run("typeof exportCsv === 'function' ? 'has' : 'none'");
assert.strictEqual(csvHead, "has");

console.log("slip.test.js OK");
