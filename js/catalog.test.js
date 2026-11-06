/* Node smoke test for catalog merge helpers. Run: node js/catalog.test.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), sandbox);
const D = sandbox.window.HD_DEFAULTS;
const C = sandbox.window.HDCatalog;
const W = sandbox.window.HD_YARD_WEIGHTS;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok —", msg);
  }
}

assert(D.security.pin === "", "no default crew PIN ships in code — it comes from .env / Settings");
assert(D.security.adminPassword === "", "no default admin password ships in code");
assert(D.billing.smallRate === 90 && D.billing.dumpRate === 150 && D.billing.transferRate === 160 && D.billing.forkliftRate === 160, "small 550 $90, dump $150, transfer $160, forklift $160");
const rateKeys = Object.keys(D.billing);
assert(rateKeys.indexOf("smallRate") < rateKeys.indexOf("dumpRate") && rateKeys.indexOf("dumpRate") < rateKeys.indexOf("transferRate") && rateKeys.indexOf("transferRate") < rateKeys.indexOf("forkliftRate"), "default rate fields follow Small, Dump, Transfer, Forklift");
const deskHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const deskOrder = ["f-truck-small", "f-truck-dump", "f-truck-transfer", "f-truck-forklift"];
let deskAt = -1;
deskOrder.forEach((id) => {
  const at = deskHtml.indexOf('id="' + id + '"');
  assert(at > deskAt, "desk truck order includes " + id);
  deskAt = at;
});
assert(deskHtml.includes("Small Truck 550") && deskHtml.includes("Transfer Truck") && deskHtml.includes("$90 / hour") && deskHtml.includes("$150 / hour"), "desk labels name Small Truck 550, Transfer, and the new rates");
const settingsOrder = ["s-small", "s-dump", "s-transfer", "s-forklift"];
let settingsAt = -1;
settingsOrder.forEach((id) => {
  const at = deskHtml.indexOf('id="' + id + '"');
  assert(at > settingsAt, "settings rate order includes " + id);
  settingsAt = at;
});
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
assert(willow.every((m) => m.unit === "ton"), "Willow Creek catalog units stay tons so the phone line can show $/ton");
const asphalt = willow.find((m) => m.id === "q-crushed-asphalt");
assert(asphalt.price === 20 && asphalt.tonsPerYard === 1.3 && asphalt.tonsPerYardSource === "mike", "Crushed Asphalt keeps $20/ton and Mike's 1.3 t/yd");
assert(W.length === 1 && W[0].source === "mike" && W[0].tonsPerYard === 1.3 && W[0].name === "Crushed Asphalt", "the only applied multiplier is Mike's Crushed Asphalt 1.3");
const stayTon = ["q-jaw-run", "q-15-minus", "q-4-minus", "q-ogb", "q-38-12-clean", "q-34-12-clean", "q-34-1-clean", "q-4-8-clean", "q-rip-rap", "q-deco-rip-rap", "q-fill-dirt-dump", "q-dg-38-gold", "q-dg-34-gold", "q-cs-38-silver", "q-34-minus"];
stayTon.forEach((id) => {
  const row = willow.find((m) => m.id === id);
  assert(row && row.unit === "ton" && !C.tonsPerYardOf(row) && C.missingYardWeight(row), id + " stays tons and is flagged missing yard weight");
});
assert(!C.tonsPerYardOf(willow.find((m) => m.id === "q-dg-38-gold")) && !C.tonsPerYardOf(willow.find((m) => m.id === "q-34-minus")), "3/8 gold and 3/4 minus are not inferred from a generic name");
const multi = [
  { name: "3/4 or 1 1/4 Granite", tonsPerYard: 1.4, source: "sheet" },
  { name: "Crushed Asphalt", tonsPerYard: 9, source: "sheet" },
];
assert(C.matchYardWeight("3/4 Minus", multi) == null, "a multi-size granite name does not match 3/4 Minus");
assert(C.matchYardWeight("Decomposed Granite 3/8 Minus Gold Decorative", multi) == null, "3/8 gold does not match a generic DG row");
assert(C.matchYardWeight("Crushed Asphalt", multi).tonsPerYard === 9, "an exact name matches one row");
W.forEach((w) => {
  const hits = willow.filter((m) => C.normName(m.name) === C.normName(w.name));
  assert(hits.length === 1, "applied yard weight " + w.name + " matches one catalog row");
});
const helper = deskHtml.split('id="truck-cap-helper"')[1].split("</p>")[0];
const helperText = helper.slice(helper.indexOf(">") + 1).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
assert(helperText === "Small 550 — 3 rock, 4 soil, 5 bark.\nDump — 10 rock, 12 soil, 20 bark.\nTransfer — 20 rock, 24 topsoil, 30 forest loam and topsoil plus, 50 bark.", "forklift helper is only the three truck-cap lines");
assert(!/quote|void|willow|forklift fee|fuel surcharge/i.test(helperText), "helper block has no quote, void, quarry, fee, or fuel copy");
assert(deskHtml.includes("<strong>Bobtail truck</strong>") && deskHtml.includes("Bobtail truck $/hr") && deskHtml.includes("$150 / hour"), "Dump truck label is Bobtail truck at $150/hour");
assert(!deskHtml.includes("<strong>Dump</strong>") && deskHtml.includes("Dump-road buffer"), "settings keep the dump-road buffer name");
const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
assert(appJs.includes("Dump route buffer"), "Dump route buffer name stays");
assert(appJs.includes('return "Bobtail truck"'), "ticket truck name is Bobtail truck");
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
assert(!store.some((m) => m.id === "black-cinder"), "unsized Black Cinder is retired");
assert(store.find((m) => m.id === "black-cinder-34").price === 78 && store.find((m) => m.id === "black-cinder-34").name === "Black Cinder 3/4\"", "Black Cinder 3/4 is $78/yd");
assert(store.find((m) => m.id === "black-cinder-112").price === 95 && store.find((m) => m.id === "black-cinder-112").name.indexOf("1 1/2") >= 0, "Black Cinder 1 1/2 is $95/yd");
assert(store.find((m) => m.id === "pea-gravel").name === "3/8 Pea Gravel", "pea gravel shows the size");
assert(store.find((m) => m.id === "topsoil").transferPrice === 16, "topsoil transfer-only price is $16");
assert(store.find((m) => m.id === "forest-loam").transferPrice === 20, "forest loam transfer-only price is $20");
assert(store.find((m) => m.id === "topsoil-plus").transferPrice === 26 && store.find((m) => m.id === "topsoil-plus").price === 34, "topsoil plus POS stays $34 and transfer-only is $26");
assert(willow.find((m) => m.id === "q-fill-dirt-dump").price === 6, "fill dirt dump fee is $6/ton");
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

const published = C.publishedSheet();
assert(published.length === D.materials.length, "published sheet is the current book");
const bouldersBook = D.materials.filter((m) => C.inBook(m, "boulders"));
["Pami Pebble 3/4\"", "Pami Pebble 1 1/2\"", "Mexi Black 1/2 - 1\"", "Mexi Mix 3/8\"", "Sierra Desert 3/4\"", "Sierra Desert 1 1/2\"", "Salt & Pepper 3/8\"", "Salt & Pepper 1 1/2\""].forEach((name) => {
  assert(bouldersBook.some((m) => m.name === name), "sized POS row is on the book: " + name);
});
["pami-pebble", "mexi-pebble", "mexi-buttons", "salt-pepper", "sierra-desert", "aspen-mountain", "br-color-pami", "br-color-mexi-pebble"].forEach((id) => {
  assert(!D.materials.some((m) => m.id === id), "unsized generic is not a pick row: " + id);
});
const sizedTicket = bouldersBook.find((m) => m.id === "pami-pebble-34");
assert(sizedTicket.name.indexOf("3/4") >= 0, "Pami ticket name carries the size");
const fromGeneric = C.mergeMissing([
  { id: "pami-pebble", name: "Pami Pebble", category: "Rock / lb", unit: "lb", price: 0.16, book: "store" },
  { id: "salt-pepper", name: "Salt & Pepper", category: "Rock / lb", unit: "lb", price: 0.12, book: "store" },
  { id: "q-fill-dirt-dump", name: "Fill Dirt Dump Fee", category: "Willow Creek quarry", unit: "ton", price: 4, book: "willow" },
  { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 99, book: "store" },
  { id: "sku-job-note", name: "Do not touch jobs", category: "Custom", unit: "yd", price: 1, book: "store" },
]);
assert(!fromGeneric.some((m) => m.id === "pami-pebble"), "merge retires the unsized Pami row");
assert(fromGeneric.find((m) => m.id === "pami-pebble-34").name === "Pami Pebble 3/4\"", "merge installs the sized Pami name");
assert(fromGeneric.find((m) => m.id === "pami-pebble-34").price === 0.16, "merge keeps the Pami price on the sized rows");
assert(fromGeneric.find((m) => m.id === "salt-pepper-112").name.indexOf("1 1/2") >= 0, "merge installs sized Salt & Pepper");
assert(fromGeneric.find((m) => m.id === "q-fill-dirt-dump").price === 6, "merge corrects fill dirt from $4/ton to $6/ton");
assert(fromGeneric.find((m) => m.id === "topsoil").price === 99, "merge still keeps a punched POS price");
assert(fromGeneric.find((m) => m.id === "sku-job-note").price === 1, "merge keeps rows it does not know");
const punchedFill = C.mergeMissing([
  { id: "q-fill-dirt-dump", name: "Fill Dirt Dump Fee", unit: "ton", price: 7, book: "willow" },
]);
assert(punchedFill.find((m) => m.id === "q-fill-dirt-dump").price === 7, "a punched fill dirt price other than $4 stays");
const blackSplit = C.mergeMissing([
  { id: "black-cinder", name: "Black Cinder", category: "Rock / yard", unit: "yd", price: 78, book: "store" },
]);
assert(blackSplit.find((m) => m.id === "black-cinder-112").price === 95, "unsized Black Cinder at the old $78 does not overwrite the $95 size");
assert(blackSplit.find((m) => m.id === "black-cinder-34").price === 78, "Black Cinder 3/4 keeps $78");
assert(!published.some((m) => m.id === "sku-custom"), "published sheet drops added rows");
published[0].price = 1;
assert(D.materials[0].price !== 1, "published sheet is a copy");

if (process.exitCode) {
  console.error("Catalog tests failed.");
} else {
  console.log("All catalog tests passed.");
}
