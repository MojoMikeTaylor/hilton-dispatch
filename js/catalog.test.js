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

const retired = ["red-cinder", "round-drain", "crushed-clean-river", "clean-granite", "blue-ridge-yd", "ivans-gold"];
retired.forEach((id) => assert(!D.materials.some((m) => m.id === id), "combined row " + id + " is gone from the book"));
function row(name) { return store.find((m) => m.name === name); }
assert(row("Red Cinder 1 1/2\"").price === 40 && row("Red Cinder 1 1/2\"").unit === "yd", "Red Cinder 1 1/2 is $40/yd");
assert(row("Red Cinder 3/8\" minus").price === 40, "Red Cinder 3/8 minus is $40/yd");
assert(row("3/4\" Round drain").price === 36, "3/4 Round drain is $36/yd");
assert(row("1 1/2\" Drain").price === 36, "1 1/2 Drain is $36/yd");
assert(row("Crushed Clean River 3/4\"x1/2\"").price === 48, "Crushed Clean River 3/4x1/2 is $48/yd");
assert(row("Crushed Clean River 1/4\"x1/2\"").price === 48, "Crushed Clean River 1/4x1/2 is $48/yd");
assert(row("Clean Granite 1 1/2\"").price === 45, "Clean Granite 1 1/2 is $45/yd");
assert(row("Clean Granite 3/4\"").price === 45, "Clean Granite 3/4 is $45/yd");
assert(store.find((m) => m.id === "clean-granite-38").price === 65, "3/8 Clean Granite stays $65");
assert(row("Blue Ridge 1 1/2\"").price === 50 && row("Blue Ridge 1 1/2\"").unit === "yd", "Blue Ridge 1 1/2 is $50/yd");
assert(row("Blue Ridge 3/4\"").price === 50, "Blue Ridge 3/4 is $50/yd");
assert(row("Blue Ridge 3/4\" minus").price === 50, "Blue Ridge 3/4 minus is $50/yd");
assert(row("Ivans Gold 3/4\"").price === 0.18 && row("Ivans Gold 3/4\"").unit === "lb", "Ivans Gold 3/4 is $0.18/lb");
assert(row("Ivans Gold 1 1/2\"").price === 0.18, "Ivans Gold 1 1/2 is $0.18/lb");
assert(store.find((m) => m.id === "black-cinder").price === 78, "Black Cinder stays");
assert(store.find((m) => m.id === "boulder-blue-ridge").price === 0.18, "Blue Ridge boulders stay on the store book");
assert(!D.materials.some((m) => /baja|wall block|fabric|tie/i.test(m.name)), "no unpriced Baja, wall block, fabric, or ties");

const splitFromEdited = C.mergeMissing([
  { id: "red-cinder", name: "Red Cinder (1 1/2\" or 3/8\" minus)", category: "Rock / yard", unit: "yd", price: 42, book: "store" },
  { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 99, book: "store" },
  { id: "q-jaw-run", name: "Jaw Run", category: "Willow Creek quarry", unit: "ton", price: 12.5, book: "willow", source: "quarry" },
  { id: "sku-custom", name: "Custom mix", category: "Custom", unit: "yd", price: 12, book: "store" },
]);
assert(!splitFromEdited.some((m) => m.id === "red-cinder"), "edited combined Red Cinder row is replaced");
assert(splitFromEdited.find((m) => m.id === "red-cinder-112").price === 42, "split keeps the existing Red Cinder price");
assert(splitFromEdited.find((m) => m.id === "red-cinder-38-minus").price === 42, "both Red Cinder sizes keep that price");
assert(splitFromEdited.filter((m) => m.id === "red-cinder-112").length === 1, "Red Cinder 1 1/2 is not duplicated");
assert(splitFromEdited.find((m) => m.id === "topsoil").price === 99, "other punched prices stay");
assert(splitFromEdited.find((m) => m.id === "sku-custom").price === 12, "custom rows stay");
assert(C.bookOf(splitFromEdited.find((m) => m.id === "q-jaw-run")) === "willow", "Willow Creek stays isolated");
const splitAgain = C.mergeMissing(splitFromEdited);
assert(splitAgain.filter((m) => m.id === "red-cinder-112").length === 1, "splitting twice does not duplicate");
assert(splitAgain.find((m) => m.id === "red-cinder-112").price === 42, "a second merge keeps the split price");

const dropped = C.reloadRetailKeepExtras([
  { id: "red-cinder", name: "Red Cinder (1 1/2\" or 3/8\" minus)", category: "Rock / yard", unit: "yd", price: 42, book: "store" },
  { id: "sku-custom", name: "Custom mix", category: "Custom", unit: "yd", price: 12, book: "store" },
]);
assert(!dropped.some((m) => m.id === "red-cinder"), "reload does not bring the combined row back");
assert(dropped.find((m) => m.id === "red-cinder-112").price === 40, "reload uses the published split price");
assert(dropped.find((m) => m.id === "sku-custom").price === 12, "reload still keeps custom rows");

if (process.exitCode) {
  console.error("Catalog tests failed.");
} else {
  console.log("All catalog tests passed.");
}
