/* Node smoke test for the billing engine. Run: node js/engine.test.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const code = fs.readFileSync(path.join(__dirname, "engine.js"), "utf8");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const E = sandbox.window.HDEngine;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok —", msg);
  }
}

const billing = {
  dumpRate: 160,
  smallRate: 100,
  dumpTimeMultiplier: 1.08,
  tripMode: "roundtrip",
  minimumHours: 1,
  incrementMinutes: 15,
  loadMinutes: 15,
  unloadMinutes: 15,
  taxRate: 0,
};

// 30 min one-way, dump, 1 load, round trip
// trip = 60, *1.08 = 64.8, site = 30, raw = 94.8 min = 1.58 hr → 1.75 hr * 160 = 280
const dump = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing,
  materials: [{ name: "Topsoil", qty: 8, unit: "yd", price: 38 }],
  loads: 1,
});
assert(Math.abs(dump.tripMin - 60) < 0.01, "round trip is 2× one-way");
assert(Math.abs(dump.adjustedDriveMin - 64.8) < 0.01, "dump truck +8% on road time");
assert(Math.abs(dump.siteMin - 30) < 0.01, "load+unload not given the 8% bump");
assert(Math.abs(dump.billableHours - 1.75) < 0.001, "rounds up to next 15 min with 1 hr minimum");
assert(Math.abs(dump.deliveryFee - 280) < 0.01, "1.75 hr × $160 = $280");
assert(Math.abs(dump.materialsTotal - 304) < 0.01, "8 yd × $38 = $304");
assert(Math.abs(dump.total - 584) < 0.01, "delivery + materials = $584");

const small = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "small",
  billing,
  materials: [],
  loads: 1,
});
assert(Math.abs(small.adjustedDriveMin - 60) < 0.01, "small truck gets no 8% buffer");
assert(Math.abs(small.rate - 100) < 0.01, "small truck is $100/hr");

const twoLoads = E.quote({
  oneWaySeconds: 20 * 60,
  truck: "dump",
  billing,
  materials: [],
  loads: 2,
});
assert(twoLoads.loadCount === 1, "a passed load count does not add loads");
assert(Math.abs(twoLoads.tripMin - 40) < 0.01, "a passed load count does not multiply the trip");
assert(Math.abs(twoLoads.adjustedDriveMin - 43.2) < 0.01, "8% still applies to the one-load road time");

const short = E.quote({
  oneWaySeconds: 5 * 60,
  truck: "small",
  billing,
  materials: [],
  loads: 1,
});
assert(short.billableHours === 1, "1 hour minimum still applies on a short hop");

const extraWait = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing,
  materials: [{ name: "Topsoil", qty: 8, unit: "yd", price: 38 }],
  loads: 1,
  extraMinutes: 30,
});
assert(Math.abs(extraWait.adjustedDriveMin - 64.8) < 0.01, "road time is unchanged");
assert(extraWait.extra === 0 && extraWait.siteMin === 30, "extra minutes stay 0");
assert(Math.abs(extraWait.deliveryFee - 280) < 0.01, "extra minutes do not change the delivery fee");

const withFee = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing,
  materials: [{ name: "Topsoil", qty: 8, unit: "yd", price: 38 }],
  loads: 1,
  extraMinutes: 0,
  forkliftFee: 75,
});
assert(Math.abs(withFee.forkliftFee - 75) < 0.01, "forklift fee is $75");
assert(Math.abs(withFee.deliveryFee - 280) < 0.01, "delivery still $280 with a fee");
assert(Math.abs(withFee.materialsTotal - 304) < 0.01, "materials still $304 with a fee");
assert(Math.abs(withFee.total - 659) < 0.01, "delivery + materials + $75 fee = $659");

const forklift = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "forklift",
  billing: { ...billing, forkliftRate: 160 },
  materials: [],
  loads: 1,
  extraMinutes: 0,
  forkliftFee: 50,
});
assert(Math.abs(forklift.adjustedDriveMin - 60) < 0.01, "forklift truck gets no 8% dump buffer");
assert(Math.abs(forklift.rate - 160) < 0.01, "forklift truck is $160/hr");
assert(Math.abs(forklift.deliveryFee - 240) < 0.01, "1.5 hr × $160 = $240");
assert(Math.abs(forklift.forkliftFee - 50) < 0.01, "forklift extra fee sits on top of hourly");
assert(Math.abs(forklift.total - 290) < 0.01, "forklift delivery + fee = $290");
assert(forklift.formula.indexOf("forklift") >= 0, "formula names forklift truck");
assert(forklift.formula.indexOf("extra fee") >= 0, "formula shows forklift extra fee");

const splitMins = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing,
  materials: [],
  loads: 1,
  extraSiteMinutes: 20,
  extraWaitMinutes: 10,
});
assert(Math.abs(splitMins.adjustedDriveMin - 64.8) < 0.01, "road time ignores site and wait minutes");
assert(splitMins.siteMin === 30, "site and wait minutes do not change load and unload");
assert(splitMins.extraSite === 0, "extra site minutes stay 0");
assert(splitMins.extraWait === 0, "extra wait minutes stay 0");

const fuelBilling = {
  ...billing,
  surchargePercent: 15,
  dieselPrice: 7.456,
  dieselBaseline: 4,
  dieselWeekOf: "2026-09-21",
};
const at150 = E.fuelFrom({ surchargePercent: 15, dieselPrice: 7.456, dieselBaseline: 4, dieselWeekOf: "2026-09-21" }, 150);
assert(Math.abs(at150.fuelSurcharge - 22.5) < 0.001, "$150 delivery at 15% is $22.50");
assert(Math.abs(E.fuelFrom({ surchargePercent: 10, dieselBaseline: 99 }, 150).fuelSurcharge - 15) < 0.001, "$150 delivery at 10% is $15.00");
assert(E.fuelFrom({ surchargePercent: 0, dieselPrice: 7.456, dieselBaseline: 4 }, 150).fuelSurcharge === 0, "0% fuel surcharge is $0");
const fueled = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: fuelBilling,
  materials: [{ name: "Topsoil", qty: 8, unit: "yd", price: 38 }],
  loads: 2,
  extraSiteMinutes: 20,
  extraWaitMinutes: 10,
  extraMinutes: 30,
  forkliftFee: 75,
});
assert(fueled.surchargePercent === 15, "surcharge percent is the typed percent");
assert(fueled.loadCount === 1 && fueled.extra === 0, "loads and extra minutes do not enter the fuel ticket");
assert(Math.abs(fueled.deliveryFee - 280) < 0.01, "delivery fee is the surcharge base");
assert(Math.abs(fueled.materialsTotal - 304) < 0.01, "materials are not surcharged");
assert(Math.abs(fueled.fuelSurcharge - 42) < 0.001, "15% of the $280 delivery fee is $42.00");
assert(Math.abs(fueled.total - (280 + 304 + 75 + 42)) < 0.01, "total adds delivery, materials, forklift, and fuel");
assert(fueled.formula.indexOf("Fuel surcharge: 15% of delivery. EIA West Coast diesel $7.456/gal, week of 21 Sep 2026 (index only).") >= 0, "invoice prints the index sentence");
assert(fueled.formula.indexOf("dieselThisWeek") < 0 && fueled.formula.indexOf("baseline") < 0, "invoice does not print the baseline formula");
assert(fueled.formula.indexOf("total = delivery + materials + forkliftFee + fuelSurcharge") >= 0, "invoice prints the total formula");
assert(code.indexOf("86.4") < 0 && code.indexOf("0.864") < 0, "surcharge percent is not hardcoded");

const ignoredIndex = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: { ...fuelBilling, dieselPrice: 3.5, dieselBaseline: 0 },
  materials: [{ name: "Topsoil", qty: 8, unit: "yd", price: 38 }],
  forkliftFee: 75,
});
assert(ignoredIndex.surchargePercent === 15, "diesel price and baseline do not change the typed percent");
assert(Math.abs(ignoredIndex.fuelSurcharge - fueled.fuelSurcharge) < 0.001, "diesel price does not change the fuel dollars");
assert(Math.abs(ignoredIndex.deliveryFee - fueled.deliveryFee) < 0.01, "diesel price does not change hourly delivery");

const withTote = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: fuelBilling,
  materials: [{ name: "Topsoil", qty: 8, unit: "yd", price: 38 }],
  forkliftFee: 75,
  toteFee: 40,
});
assert(Math.abs(withTote.deliveryFee - fueled.deliveryFee) < 0.01, "tote fee does not change the hourly delivery fee");
assert(Math.abs(withTote.billableHours - fueled.billableHours) < 0.001, "tote fee does not change billable hours");
assert(Math.abs(withTote.fuelSurcharge - fueled.fuelSurcharge) < 0.01, "tote fee is not fuel-surcharged");
assert(Math.abs(withTote.toteFee - 40) < 0.01, "tote fee is the typed amount");
assert(Math.abs(withTote.total - (fueled.total + 40)) < 0.01, "tote fee is added on top of delivery, materials, fuel, and forklift");
assert(withTote.formula.indexOf("Tote / bagging fee: $40.00") >= 0, "invoice names the tote fee when it is more than zero");
assert(withTote.formula.indexOf("total = delivery + materials + forkliftFee + toteFee + fuelSurcharge") >= 0, "invoice total formula includes the tote fee");
assert(fueled.formula.toLowerCase().indexOf("tote") < 0, "a blank tote fee stays off the formula");

const blankTote = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing,
  materials: [],
  toteFee: "",
});
assert(blankTote.toteFee === 0, "an empty tote fee is $0");

const shop = {
  dumpRate: 150,
  smallRate: 90,
  transferRate: 160,
  forkliftRate: 160,
  dumpTimeMultiplier: 1.08,
  tripMode: "roundtrip",
  minimumHours: 1,
  incrementMinutes: 15,
  loadMinutes: 15,
  unloadMinutes: 15,
  taxRate: 0,
};

const transfer = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "transfer",
  billing: shop,
  materials: [],
});
assert(transfer.isTransfer && !transfer.isDump, "transfer is its own truck");
assert(Math.abs(transfer.adjustedDriveMin - 64.8) < 0.01, "transfer gets the same 8% road buffer as dump");
assert(Math.abs(transfer.siteMin - 30) < 0.01, "transfer buffer stays off load and unload");
assert(Math.abs(transfer.rate - 160) < 0.01, "transfer truck is $160/hr");
assert(Math.abs(transfer.deliveryFee - 280) < 0.01, "transfer 1.75 hr × $160 = $280");
assert(transfer.formula.indexOf("transfer-truck buffer") >= 0, "formula names the transfer buffer");

function stageFee(yardId) {
  return E.quote({
    oneWaySeconds: 30 * 60,
    truck: "forklift",
    yardId,
    billing: shop,
    materials: [],
    forkliftFee: 0,
  });
}
const medfordFork = stageFee("medford");
const cpFork = stageFee("cp");
const willowFork = stageFee("willow");
assert(Math.abs(cpFork.deliveryFee - 240) < 0.01, "cp forklift has no South Stage adder");
assert(Math.abs(willowFork.deliveryFee - 240) < 0.01, "willow forklift has no South Stage adder");
assert(medfordFork.southStage === 40 && Math.abs(medfordFork.deliveryFee - 280) < 0.01, "medford forklift adds $40 inside the delivery fee");
assert(medfordFork.forkliftFee === 0, "South Stage adder is not the separate forklift fee");
assert(Math.abs(medfordFork.total - medfordFork.deliveryFee) < 0.01, "the $40 is not added a second time");
assert(Math.abs(stageFee("dump-yard-missing").deliveryFee - cpFork.deliveryFee) < 0.01, "an unknown yard does not get the adder");
const medfordDump = E.quote({ oneWaySeconds: 30 * 60, truck: "dump", yardId: "medford", billing: shop, materials: [] });
assert(medfordDump.southStage === 0 && Math.abs(medfordDump.deliveryFee - (medfordDump.billableHours * 150)) < 0.01, "dump from medford does not get the forklift adder");
const medfordFueled = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "forklift",
  yardId: "medford",
  billing: { ...shop, surchargePercent: 10 },
  materials: [],
});
assert(Math.abs(medfordFueled.fuelSurcharge - 28) < 0.01, "fuel surcharge uses the delivery fee after the $40 is included");

function splitOf(qty, material, truck) {
  const q = E.quote({
    oneWaySeconds: 30 * 60,
    truck: truck || "dump",
    billing: shop,
    materials: [{ ...material, qty }],
  });
  return q.loads.map((load) => (load.truck === "transfer" ? "T" : load.truck === "small" ? "B" : load.truck)).join("+");
}
const wc = { id: "q-jaw-run", name: "Jaw Run", unit: "ton", price: 12.5, book: "willow", source: "quarry", truckload_only: true };
assert(splitOf(30, wc) === "T+B", "30 yd Willow Creek rock is 1 transfer + 1 bobtail");
assert(splitOf(40, wc) === "T+T", "40 yd Willow Creek rock is 2 transfers");
assert(splitOf(10, wc) === "B", "10 yd Willow Creek rock is 1 bobtail");
assert(splitOf(12, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "B", "12 yd topsoil is 1 bobtail");
assert(splitOf(24, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T", "24 yd topsoil is 1 transfer");
assert(splitOf(25, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T+B", "25 yd topsoil is 1 transfer + 1 bobtail");
assert(splitOf(36, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T+B", "36 yd topsoil is 1 transfer + 1 bobtail");
assert(splitOf(37, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T+T", "37 yd topsoil is 2 transfers");
assert(splitOf(15, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "B", "15 yd forest loam is 1 bobtail");
assert(splitOf(16, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T", "16 yd forest loam is 1 transfer");
assert(splitOf(30, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T", "30 yd forest loam is 1 transfer");
assert(splitOf(31, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T+B", "31 yd forest loam is 1 transfer + 1 bobtail");
assert(splitOf(45, { id: "topsoil-plus", name: "Topsoil Plus", unit: "yd", price: 34 }) === "T+B", "45 yd topsoil plus is 1 transfer + 1 bobtail");
assert(splitOf(46, { id: "topsoil-plus", name: "Topsoil Plus", unit: "yd", price: 34 }) === "T+T", "46 yd topsoil plus is 2 transfers");
assert(splitOf(40, { id: "fresh-fines", name: "Fresh Fines Bark", unit: "yd", price: 34 }, "dump") === "dump", "bark stays one load on the selected truck");
assert(splitOf(40, { name: "Topsoil", unit: "yd", price: 38 }, "dump") === "dump", "a topsoil line without the store id stays one load");

const wc30 = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  yardId: "willow",
  materials: [{ ...wc, qty: 30 }],
});
assert(wc30.planned && wc30.loadCount === 2 && wc30.split === "1 transfer + 1 bobtail", "30 yd split label");
assert(Math.abs(wc30.loads[0].deliveryFee - 280) < 0.01 && Math.abs(wc30.loads[1].deliveryFee - 135) < 0.01, "transfer $280 and bobtail $135");
assert(Math.abs(wc30.deliveryFee - 415) < 0.01, "delivery fee is the sum of the load fees");
assert(Math.abs(wc30.materialsTotal - 375) < 0.01, "material price is charged once");
assert(Math.abs(wc30.total - 790) < 0.01, "invoice total is delivery sum plus materials");
assert(wc30.loads[0].tripMin === wc30.loads[1].tripMin, "each load uses the same route");
const lines = E.dispatchLines(wc30, "HD-30");
assert(lines.length === 2 && lines[0].ticketId === "HD-30" && lines[1].ticketId === "HD-30", "two dispatch lines under one ticket");
assert(lines[0].truck === "transfer" && lines[1].truck === "small", "dispatch lines follow the split");

const wc40 = E.quote({ oneWaySeconds: 30 * 60, truck: "small", billing: shop, materials: [{ ...wc, qty: 40 }] });
assert(wc40.split === "2 transfers" && Math.abs(wc40.deliveryFee - 560) < 0.01, "40 yd is two transfer fees");
assert(E.dispatchLines(wc40, "HD-40").length === 2, "40 yd prints two dispatch lines");
const wc10 = E.quote({ oneWaySeconds: 30 * 60, truck: "transfer", billing: shop, materials: [{ ...wc, qty: 10 }] });
assert(wc10.loadCount === 1 && wc10.split === "1 bobtail" && wc10.truck === "small", "10 yd is one bobtail even if transfer was selected");
assert(E.dispatchLines(wc10, "HD-10").length === 0, "one load stays a single delivery row");
const ignoredLoads = E.quote({ oneWaySeconds: 30 * 60, truck: "dump", billing: shop, loads: 99, materials: [{ ...wc, qty: 10 }] });
assert(ignoredLoads.loadCount === 1 && ignoredLoads.truck === "small", "the loads argument does not override the split");

const piled = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [
    { id: "q-jaw-run", qty: 10, unit: "ton", price: 12.5, book: "willow" },
    { id: "q-34-minus", qty: 10, unit: "ton", price: 13, book: "willow" },
  ],
});
assert(piled.loadCount === 1 && piled.truck === "transfer", "two pit rocks that add up to a transfer are one load");
const soils = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [
    { id: "forest-loam", qty: 15, unit: "yd", price: 27 },
    { id: "topsoil-plus", qty: 15, unit: "yd", price: 34 },
  ],
});
assert(soils.loadCount === 1 && soils.truck === "transfer", "forest loam and topsoil plus share the 15/30 capacity");
const mixed = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [
    { id: "topsoil", qty: 12, unit: "yd", price: 25 },
    { id: "fresh-fines", qty: 20, unit: "yd", price: 34 },
  ],
});
assert(mixed.loadCount === 1 && mixed.truck === "small", "bark riding with topsoil does not add a load");

// The desk's $1,785 figure needs that job's drive time. Catalog prices alone do not reproduce it, so it is not asserted.

const dupes = E.duplicateQuotes([
  { id: "Q-LOW", status: "quote", customer: "Ada Lovelace", address: "1 Oak St.", phone: "111", quote: { total: 400 } },
  { id: "Q-HIGH", status: "quote", customer: "Other", address: "9 Pine St", phone: "", quote: { total: 900 } },
  { id: "Q-PHONE", status: "quote", customer: "Phone Co", address: "elsewhere", phone: "(541) 555-0100", quote: { total: 900 } },
  { id: "Q-BOOKED", status: "new", customer: "Ada Lovelace", address: "9 Pine St", phone: "5415550100", quote: { total: 5000 } },
  { id: "Q-VOID", status: "void", customer: "Ada Lovelace", address: "9 Pine St", phone: "", quote: { total: 9999 } },
  { id: "Q-SELF", status: "quote", customer: "Ada Lovelace", address: "9 Pine St", phone: "541-555-0100", quote: { total: 2000 } },
], {
  id: "Q-SELF",
  customer: "ada  lovelace",
  address: "9 pine st",
  phone: "541.555.0100",
});
assert(dupes.map((d) => d.id).join(",") === "Q-HIGH,Q-PHONE,Q-LOW", "live quotes match name, address, or phone; booked and void do not");
assert(dupes[0].highlight && dupes[1].highlight && !dupes[2].highlight, "the higher total is highlighted, including a tie");
assert(!dupes.some((d) => d.id === "Q-SELF"), "the open quote is not a duplicate of itself");
const none = E.duplicateQuotes([{ id: "Q", status: "quote", customer: "", address: "", phone: "", quote: { total: 1 } }], { customer: "", address: "", phone: "" });
assert(none.length === 0, "blank fields do not match every quote");

if (process.exitCode) {
  console.error("Engine tests failed.");
} else {
  console.log("All engine tests passed.");
}
