/* Node smoke test for catalog merge helpers. Run: node js/catalog.test.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), sandbox);
const D = sandbox.window.HD_DEFAULTS;
const C = sandbox.window.HDCatalog;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok —", msg);
  }
}

assert(D.security.pin === "1956", "crew PIN stays 1956");
assert(D.security.adminPassword === "4357", "admin password is 4357");
assert(D.billing.dumpRate === 160 && D.billing.smallRate === 100, "dump $160 / small $100");
assert(C.books.map((b) => b.id).join(",") === "store,flagstone,boulders,willow", "four isolated books");

const store = D.materials.filter((m) => C.inBook(m, "store"));
const flag = D.materials.filter((m) => C.inBook(m, "flagstone"));
const boulders = D.materials.filter((m) => C.inBook(m, "boulders"));
const willow = D.materials.filter((m) => C.inBook(m, "willow"));
assert(store.some((m) => m.id === "topsoil" && m.price === 25), "Store tab keeps Topsoil $25");
assert(store.every((m) => m.book === "store"), "store rows are tagged store");
assert(flag.find((m) => m.id === "fs-flat-cherokee").price === 0.27, "Cherokee flat stack is $0.27/lb");
assert(flag.find((m) => m.id === "fs-gator-maxx2").unit === "bag", "Gator Maxx2 is a bag");
assert(boulders.find((m) => m.id === "br-b-basalt").price === 0.25, "Basalt boulder is on the boulders book");
assert(willow.find((m) => m.id === "q-jaw-run").price === 12.5, "Willow Creek Jaw Run is $12.50/ton");
assert(willow.find((m) => m.id === "q-dg-38-gold").price === 35, "Willow Creek 3/8 gold decorative is $35/ton");
assert(willow.every((m) => m.unit === "ton"), "Willow Creek is tons only");
assert(!willow.some((m) => m.id === "topsoil"), "store soils do not leak into Willow Creek");
assert(D.weights.rock === 2500 && D.weights.bark === 900, "weight helper numbers are on the defaults");

const existing = [
  { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 99 },
  { id: "q-jaw-run", name: "Jaw Run", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
];
const merged = C.mergeMissing(existing);
assert(merged.find((m) => m.id === "topsoil").price === 99, "merge keeps punched retail prices");
assert(merged.find((m) => m.id === "q-jaw-run").price === 12.5, "merge fills $0 quarry rows from the Willow Creek sheet");
assert(merged.some((m) => m.id === "fs-flat-cherokee"), "merge appends missing flagstone SKUs");
assert(merged.some((m) => m.id === "br-b-moss-rock"), "merge appends missing boulder SKUs");
assert(C.bookOf(merged.find((m) => m.id === "q-jaw-run")) === "willow", "Jaw Run stays on Willow Creek book");

const reloaded = C.reloadRetailKeepExtras([
  { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 99 },
  { id: "sku-custom", name: "Custom mix", category: "Custom", unit: "yd", price: 12, book: "store" },
]);
assert(reloaded.find((m) => m.id === "topsoil").price === 25, "reload restores published store prices");
assert(reloaded.find((m) => m.id === "sku-custom").price === 12, "reload keeps custom rows");
assert(reloaded.find((m) => m.id === "q-jaw-run").price === 12.5, "reload restores Willow Creek sheet prices");

if (process.exitCode) {
  console.error("Catalog tests failed.");
} else {
  console.log("All catalog tests passed.");
}
