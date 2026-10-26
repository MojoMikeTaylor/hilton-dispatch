/* Month board: Monday-first grid, live-ticket counts, day list sorted by time.
   Run: node js/month.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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
const ctx = vm.createContext(window);
for (const f of ["data.js", "engine.js", "desk.js", "receipt.js", "app.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), "utf8"), ctx, { filename: f });
}
const run = (code) => vm.runInContext(code, ctx);
const json = (code) => JSON.parse(run("JSON.stringify(" + code + ")"));

function grid(year, month) {
  return json("monthGrid(" + year + ", " + month + ")");
}

// October 2026 starts on Thursday, so the Monday-first grid leads with Sep 28.
const oct = grid(2026, 9);
assert.strictEqual(oct[0].date, "2026-09-28");
assert.strictEqual(oct[0].weekday, "Monday");
assert.strictEqual(oct[3].date, "2026-10-01");
assert.strictEqual(oct[3].weekday, "Thursday");
assert.strictEqual(oct[3].inMonth, true);
assert.strictEqual(oct[oct.length - 1].date, "2026-11-01");
assert.strictEqual(oct[oct.length - 1].weekday, "Sunday");
assert.strictEqual(oct.filter((c) => c.inMonth).length, 31);
assert.strictEqual(oct.length % 7, 0);
assert.deepStrictEqual(json("MONTH_HEADS"), ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

// February in a non-leap year has 28 days. Feb 1 2026 is a Sunday.
const feb = grid(2026, 1);
assert.strictEqual(feb.filter((c) => c.inMonth).length, 28);
assert.strictEqual(feb[0].date, "2026-01-26");
assert.strictEqual(feb[0].weekday, "Monday");
assert.strictEqual(feb.find((c) => c.date === "2026-02-01").weekday, "Sunday");
assert.strictEqual(feb.find((c) => c.date === "2026-02-29"), undefined);
assert.strictEqual(feb[feb.length - 1].date, "2026-03-01");

// Prev / Next cross the year boundary.
assert.deepStrictEqual(json("shiftMonth(2026, 0, -1)"), { year: 2025, month: 11 });
assert.deepStrictEqual(json("shiftMonth(2025, 11, 1)"), { year: 2026, month: 0 });
const dec = grid(2025, 11);
assert.strictEqual(dec.find((c) => c.inMonth).date, "2025-12-01");
assert.strictEqual(dec[0].weekday, "Monday");
const jan = grid(2026, 0);
assert.strictEqual(jan.find((c) => c.date === "2026-01-01").weekday, "Thursday");

const jobs = [
  { id: "LATE", status: "new", customer: "Later Co", yardId: "medford", truck: "small", deliverOn: "2026-10-14T15:00" },
  { id: "EARLY", status: "done", customer: "Early Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-14T08:15" },
  { id: "TIE-B", status: "out", customer: "Tie B", yardId: "willow", truck: "forklift", deliverOn: "2026-10-14T09:00" },
  { id: "TIE-A", status: "open", customer: "Tie A", yardId: "cp", truck: "dump", deliverOn: "2026-10-14T09:00" },
  { id: "QUOTE", status: "quote", customer: "Quote Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-14T07:00" },
  { id: "VOID", status: "void", customer: "Void Co", yardId: "medford", truck: "small", deliverOn: "2026-10-14T12:00" },
  { id: "OTHER", status: "new", customer: "Other Day", yardId: "cp", truck: "dump", deliverOn: "2026-10-01T10:00" },
  { id: "NODATE", status: "new", customer: "No Date", yardId: "cp", truck: "dump", deliverOn: "" },
];
const counts = json("countLiveByDate(" + JSON.stringify(jobs) + ")");
assert.strictEqual(counts["2026-10-14"], 4, "quote and void are not counted");
assert.strictEqual(counts["2026-10-01"], 1);
assert.ok(!counts[""]);
const day = json("monthDayTickets(" + JSON.stringify(jobs) + ", '2026-10-14').map(function (j) { return j.id; })");
assert.deepStrictEqual(day, ["EARLY", "TIE-A", "TIE-B", "LATE"]);

run(`
  db.jobs = ${JSON.stringify(jobs)};
  state.boardView = "month";
  state.monthCursor = { year: 2026, month: 9 };
  state.monthDay = "2026-10-14";
  state.filter = "";
  renderBoard();
`);
const html = els["job-table"].innerHTML;
assert.ok(html.includes("October 2026"));
assert.ok(html.includes("data-month-nav=\"prev\"") && html.includes("data-month-nav=\"next\"") && html.includes("data-month-nav=\"today\""));
assert.strictEqual((html.match(/class="month-dow"/g) || []).length, 7);
assert.ok(html.includes('data-month-day="2026-10-01"'));
assert.ok(html.indexOf(">1<") > -1);
const list = html.slice(html.indexOf("October 14"));
assert.ok(list.indexOf("EARLY") < list.indexOf("LATE"));
assert.ok(list.includes("Early Co") && list.includes("Later Co"));
assert.ok(list.includes("Hilton Landscape Supply (Mothership)") && list.includes("Hilton Landscape Supply (Phoenix) #2"));
assert.ok(list.includes("Dump") && list.includes("8:15 AM"));
assert.ok(list.includes("Small Truck 550") && list.includes("3:00 PM"));
assert.ok(!list.includes("Quote Co") && !list.includes("Void Co"));
assert.ok(html.includes('data-month-day="2026-10-14"') && html.includes("month-count\">4<"));

console.log("month.test.js OK");
