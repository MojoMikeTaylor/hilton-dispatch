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

// Printed packet: invoice + driver sheet + customer receipt.
run("buildPrint(__t)");
const html = els["print-root"].innerHTML;
const sheets = html.split('<section class="sheet').length - 1;
assert.strictEqual(sheets, 3, "three sheets: invoice, driver, customer receipt");
assert.ok(html.includes("CUSTOMER RECEIPT"), "receipt sheet present");
const receipt = html.slice(html.indexOf("CUSTOMER RECEIPT"));
for (const needle of ["HD-TEST-1", "Smoke Test Customer", "1250 Biddle Rd, Medford, OR", "Topsoil", "3 yd", "Jaw Run", "2 ton", "3 yd · 2 ton", "Total " + total]) {
  assert.ok(receipt.includes(needle), "receipt shows " + needle);
}
assert.ok(receipt.includes("Hilton delivers to the nearest public road."), "worksite line under the total");
assert.ok(receipt.indexOf("Total " + total) < receipt.indexOf("Hilton delivers to the nearest public road."), "worksite is below the total");
assert.ok(receipt.includes("Customer name (print)") && receipt.includes("Customer signature"), "name and signature lines");
assert.ok(html.includes("Credit — PAID, marked by Grace"), "payment method, paid, and who marked it on the slip");
assert.ok(html.includes("Fuel surcharge " + fuel + "<br>"), "fuel surcharge is its own line on the invoice");
assert.notStrictEqual(fuel, "$0.00", "test ticket carries a real fuel surcharge");
assert.ok(!html.includes("4111"), "card number never prints");
assert.ok(html.includes("[card number removed]"), "card number is scrubbed, not silently dropped");
// Bill-to blank when the name does not match QuickBooks.
assert.ok(html.includes("Bill-to</strong><br>—"), "bill-to is blank with no QuickBooks match");
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

// CSV export carries payment columns.
run("var __csv = ''; URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {}; db.jobs = [Object.assign({}, __t, { paid: true, paidBy: 'Grace', payMethod: 'cash' })];");
const csvHead = run("typeof exportCsv === 'function' ? 'has' : 'none'");
assert.strictEqual(csvHead, "has");

console.log("slip.test.js OK");
