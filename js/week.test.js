/* Week board grouping and the matching ticket number on both print sheets.
   Run: node js/week.test.js */
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

function dates(nowExpr) {
  return json("weekColumns(" + nowExpr + ").map(function (d) { return d.date; })");
}
function weekdays(nowExpr) {
  return json("weekColumns(" + nowExpr + ").map(function (d) { return d.weekday; })");
}

// Tuesday 13 Oct 2026 → the following Monday 19 Oct through Saturday 24 Oct.
assert.deepStrictEqual(dates("new Date(2026, 9, 13, 12)"), [
  "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24",
]);
assert.deepStrictEqual(weekdays("new Date(2026, 9, 13, 12)"), [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
]);

// Monday has already started, so the tab jumps to the next Monday.
assert.deepStrictEqual(dates("new Date(2026, 9, 19, 8)"), [
  "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31",
]);

// Sunday is never a column. A Sunday clock rolls forward one day, not back a week.
assert.deepStrictEqual(dates("new Date(2026, 9, 18, 15)")[0], "2026-10-19");
assert.ok(!dates("new Date(2026, 9, 18, 15)").includes("2026-10-18"));
assert.notStrictEqual(dates("new Date(2026, 9, 18, 15)")[0], "2026-10-12");

// Saturday still shows the coming Monday, not the Monday that already passed.
assert.strictEqual(dates("new Date(2026, 9, 17, 12)")[0], "2026-10-19");
assert.deepStrictEqual(dates("new Date(2026, 9, 24, 12)"), [
  "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31",
]);

const grouped = json(`groupWeek([
  { id: "LATE", status: "new", customer: "Later Co", yardId: "medford", truck: "small", deliverOn: "2026-10-20T15:00" },
  { id: "EARLY", status: "done", customer: "Early Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-20T08:15" },
  { id: "TIE-B", status: "out", customer: "Tie B", yardId: "willow", truck: "forklift", deliverOn: "2026-10-21T09:00" },
  { id: "TIE-A", status: "open", customer: "Tie A", yardId: "cp", truck: "dump", deliverOn: "2026-10-21T09:00" },
  { id: "DELIVERED", status: "delivered", customer: "Done Co", yardId: "medford", truck: "dump", deliverOn: "2026-10-22T11:30" },
  { id: "QUOTE", status: "quote", customer: "Quote Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-20T09:00" },
  { id: "VOID", status: "void", customer: "Void Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-21T09:30" },
  { id: "SUN", status: "new", customer: "Sunday Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-18T09:00" },
  { id: "SUN2", status: "new", customer: "Next Sunday", yardId: "medford", truck: "small", deliverOn: "2026-10-25T09:00" },
  { id: "NODATE", status: "new", customer: "No Date", yardId: "cp", truck: "dump", deliverOn: "", createdAt: "2026-10-20T08:00" }
], new Date(2026, 9, 13, 12)).map(function (d) { return { date: d.date, ids: d.jobs.map(function (j) { return j.id; }), yards: d.jobs.map(function (j) { return j.yardId; }) }; })`);

assert.strictEqual(grouped.length, 6, "six columns");
assert.deepStrictEqual(grouped[0], { date: "2026-10-19", ids: [], yards: [] });
assert.deepStrictEqual(grouped[1].ids, ["EARLY", "LATE"], "same day sorts by time, not input order");
assert.deepStrictEqual(grouped[1].yards, ["cp", "medford"], "both yards stay on the same week");
assert.deepStrictEqual(grouped[2].ids, ["TIE-A", "TIE-B"], "same time sorts by ticket id");
assert.deepStrictEqual(grouped[3].ids, ["DELIVERED"], "done deliveries stay on the week");
const shown = grouped.reduce((ids, day) => ids.concat(day.ids), []);
for (const dropped of ["QUOTE", "VOID", "SUN", "SUN2", "NODATE"]) {
  assert.ok(!shown.includes(dropped), dropped + " is not a week card");
}

// On Monday itself, a ticket dated that Monday is outside the displayed week.
const boundary = json(`groupWeek([
  { id: "THIS-MON", status: "new", customer: "This Monday", yardId: "cp", truck: "dump", deliverOn: "2026-10-19T10:00" },
  { id: "NEXT-MON", status: "new", customer: "Next Monday", yardId: "medford", truck: "small", deliverOn: "2026-10-26T07:45" }
], new Date(2026, 9, 19, 9)).map(function (d) { return { date: d.date, ids: d.jobs.map(function (j) { return j.id; }) }; })`);
assert.deepStrictEqual(boundary.map((d) => d.date), [
  "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31",
]);
assert.deepStrictEqual(boundary[0].ids, ["NEXT-MON"]);
assert.ok(!boundary.some((d) => d.ids.includes("THIS-MON")), "the Monday that just started is not a column");

assert.strictEqual(run('deliverClock({ deliverOn: "2026-10-20T08:15" })'), "8:15 AM");
assert.strictEqual(run('deliverClock({ deliverOn: "2026-10-20T15:00" })'), "3:00 PM");
assert.strictEqual(run('deliverClock({ deliverOn: "2026-10-20T00:05" })'), "12:05 AM");
assert.strictEqual(run('deliverClock({ deliverOn: "2026-10-20T12:30" })'), "12:30 PM");

run(`
  db.jobs = [
    { id: "LATE", status: "new", customer: "Later Co", yardId: "medford", truck: "small", deliverOn: "2026-10-20T15:00" },
    { id: "EARLY", status: "done", customer: "Early Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-20T08:15" },
    { id: "QUOTE", status: "quote", customer: "Quote Co", yardId: "cp", truck: "dump", deliverOn: "2026-10-20T09:00" }
  ];
  state.boardView = "week";
  state.filter = "";
`);
const realNow = Date;
ctx.Date = function DateStub() {
  if (arguments.length === 0) return new realNow(2026, 9, 13, 12);
  return new realNow(...arguments);
};
ctx.Date.prototype = realNow.prototype;
ctx.Date.now = () => new realNow(2026, 9, 13, 12).getTime();
ctx.Date.parse = realNow.parse;
ctx.Date.UTC = realNow.UTC;
run("renderBoard()");
const board = els["job-table"].innerHTML;
assert.strictEqual((board.match(/class="week-col"/g) || []).length, 6);
assert.ok(board.indexOf("EARLY") < board.indexOf("LATE"), "cards render in time order");
assert.ok(board.includes("Early Co") && board.includes("Later Co"));
assert.ok(board.includes("Hilton Landscape Supply (Mothership)") && board.includes("Hilton Landscape Supply (Phoenix) #2"));
assert.ok(board.includes("Dump truck") && board.includes("8:15 AM"));
assert.ok(board.includes("Small truck") && board.includes("3:00 PM"));
assert.ok(board.includes('data-open="EARLY"') && board.includes('data-open="LATE"'));
assert.ok(!board.includes("Quote Co") && !board.includes("QUOTE"));
assert.ok(board.includes("No deliveries"));
run('state.filter = "Early"; renderBoard();');
assert.ok(els["job-table"].innerHTML.includes("EARLY") && !els["job-table"].innerHTML.includes("LATE"));

// Same ticket number at the top of the customer receipt and the house sheet.
run(`
  var __q = HDEngine.quote({ truck: "dump", oneWaySeconds: 600, billing: db.settings.billing, materials: [], forkliftFee: 0, toteFee: 0 });
  var __t = { id: "HD-WEEK-9", createdAt: "2026-10-13T16:00:00.000Z", customer: "Week Print", address: "1 Main", yardId: "cp", truck: "dump", status: "new", quote: __q };
  buildPrint(__t);
`);
const html = els["print-root"].innerHTML;
const customer = html.slice(html.indexOf('<section class="sheet customer">'), html.indexOf('<section class="sheet waiver">'));
const waiver = html.slice(html.indexOf('<section class="sheet waiver">'), html.indexOf('<section class="sheet house">'));
const house = html.slice(html.indexOf('<section class="sheet house">'));
const sheetId = (section) => {
  const m = section.match(/class="sheet-id"[^>]*>([^<]*)</);
  return m ? m[1] : "";
};
assert.strictEqual(sheetId(customer), "INVOICE HD-WEEK-9");
assert.strictEqual(sheetId(house), "HD-WEEK-9");
assert.ok(sheetId(customer).includes(sheetId(house)), "the two copies share one ticket number");
assert.ok(!waiver.includes('class="sheet-id"'), "waiver print layout is unchanged");
run('__t.status = "quote"; buildPrint(__t);');
const quoted = els["print-root"].innerHTML;
const qCustomer = quoted.slice(quoted.indexOf('<section class="sheet customer">'), quoted.indexOf('<section class="sheet waiver">'));
const qHouse = quoted.slice(quoted.indexOf('<section class="sheet house">'));
assert.strictEqual(sheetId(qCustomer), "QUOTE HD-WEEK-9");
assert.strictEqual(sheetId(qHouse), "HD-WEEK-9");

console.log("week.test.js OK");
