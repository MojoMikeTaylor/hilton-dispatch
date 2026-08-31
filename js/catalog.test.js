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
assert(D.billing.forkliftRate === 160, "forklift hourly is $160");

const quarry = D.materials.filter((m) => C.isQuarry(m));
const stone = D.materials.filter((m) => C.isStone(m));
const retail = D.materials.filter((m) => C.isRetail(m));
assert(quarry.length === 17, "17 quarry SKUs seeded");
assert(stone.length === 13, "13 flagstone / natural stone SKUs seeded");
assert(retail.length >= 40, "Aug 26 retail catalog still loaded");
assert(quarry.every((m) => m.price === 0 && m.unit === "ton"), "quarry prices are 0, unit ton");
assert(stone.every((m) => m.price === 0 && m.requires_forklift), "flagstone prices are 0, requires forklift");
assert(retail.some((m) => m.id === "topsoil" && m.price === 25), "Topsoil $25 still on the retail sheet");

const existing = [{ id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 99 }];
const merged = C.mergeMissing(existing);
assert(merged.find((m) => m.id === "topsoil").price === 99, "merge keeps punched retail prices");
assert(merged.some((m) => m.id === "q-jaw-run"), "merge appends missing quarry SKUs");
assert(merged.some((m) => m.id === "ns-cherokee"), "merge appends missing flagstone SKUs");

const reloaded = C.reloadRetailKeepExtras([
  { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 99 },
  { id: "q-jaw-run", name: "Jaw Run", category: "Willow Creek quarry", unit: "ton", price: 12, source: "quarry", truckload_only: true },
]);
assert(reloaded.find((m) => m.id === "topsoil").price === 25, "reload restores published retail prices");
assert(reloaded.find((m) => m.id === "q-jaw-run").price === 12, "reload keeps punched quarry price");

if (process.exitCode) {
  console.error("Catalog tests failed.");
} else {
  console.log("All catalog tests passed.");
}
