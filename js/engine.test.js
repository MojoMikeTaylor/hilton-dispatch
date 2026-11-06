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
assert(withTote.formula.indexOf("tote bagging, spread, additional service: $40.00") >= 0, "invoice names the tote line when it is more than zero");
assert(withTote.formula.indexOf("total = delivery + materials + forkliftFee + toteFee + fuelSurcharge") >= 0, "invoice total formula includes the tote fee");
assert(fueled.formula.indexOf("tote bagging, spread, additional service") >= 0, "the blank tote line is on the formula");
assert(fueled.formula.indexOf("tote bagging, spread, additional service:") < 0, "a blank tote line has no invented amount");
assert(!/spread fee|spreading fee/i.test(fueled.formula), "spreading is not a separate fee");

const blankTote = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing,
  materials: [],
  toteFee: "",
});
assert(blankTote.toteFee == null, "an empty tote fee stays blank");
assert(blankTote.formula.indexOf(E.FEE_LINE) >= 0 && blankTote.formula.indexOf(E.FEE_LINE + ":") < 0, "blank tote line prints the name and no dollars");

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
  return q.loads.map((load) => (load.truck === "transfer" ? "T" : load.truck === "small" ? "B" : load.truck === "dump" ? "D" : load.truck)).join("+");
}
const wc = { id: "q-jaw-run", name: "Jaw Run", unit: "ton", price: 12.5, book: "willow", source: "quarry", truckload_only: true };
assert(splitOf(30, wc) === "T+B", "30 yd Willow Creek rock stays 1 transfer + 1 bobtail");
assert(splitOf(40, wc) === "T+T", "40 yd Willow Creek rock is 2 transfers");
assert(splitOf(10, wc) === "B", "10 yd Willow Creek rock is 1 bobtail");
assert(E.TRUCK_CAPS.willow.dump === 0 && E.TRUCK_CAPS.willow.small === 10 && E.TRUCK_CAPS.willow.transfer === 20, "Willow Creek named rule stays bobtail 10 / transfer 20 with no dump");
assert(E.TRUCK_CAPS.rock.small === 3 && E.TRUCK_CAPS.rock.dump === 10 && E.TRUCK_CAPS.rock.transfer === 20, "rock class is 3 / 10 / 20");
assert(E.TRUCK_CAPS.topsoil.small === 4 && E.TRUCK_CAPS.topsoil.dump === 12 && E.TRUCK_CAPS.topsoil.transfer === 24, "topsoil class is 4 / 12 / 24");
assert(E.TRUCK_CAPS.loam.transfer === 30 && E.TRUCK_CAPS.bark.small === 5 && E.TRUCK_CAPS.bark.dump === 20 && E.TRUCK_CAPS.bark.transfer === 50, "loam transfer is 30 and bark is 5 / 20 / 50");
assert(splitOf(3, { id: "three-quarter-minus", name: "3/4\" Minus", category: "Rock / yard", unit: "yd", price: 28, book: "store" }) === "B", "3 yd rock fits Small 550");
assert(splitOf(4, { id: "three-quarter-minus", name: "3/4\" Minus", category: "Rock / yard", unit: "yd", price: 28, book: "store" }) === "D", "4 yd rock needs a dump");
assert(splitOf(4, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "B", "4 yd topsoil fits Small 550");
assert(splitOf(12, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "D", "12 yd topsoil is one dump");
assert(splitOf(24, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T", "24 yd topsoil is 1 transfer");
assert(splitOf(25, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T+B", "25 yd topsoil is 1 transfer + 1 small");
assert(splitOf(30, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T+D", "30 yd topsoil is transfer 24 plus a dump");
assert(splitOf(36, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T+D", "36 yd topsoil remainder fits a dump");
assert(splitOf(37, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T+T", "37 yd topsoil remainder needs another transfer");
assert(splitOf(5, { id: "fresh-fines", name: "Fresh Fines Bark", unit: "yd", price: 34, book: "store" }) === "B", "5 yd bark fits Small 550");
assert(splitOf(20, { id: "fresh-fines", name: "Fresh Fines Bark", unit: "yd", price: 34, book: "store" }) === "D", "20 yd bark is one dump");
assert(splitOf(50, { id: "fresh-fines", name: "Fresh Fines Bark", unit: "yd", price: 34, book: "store" }) === "T", "50 yd bark is one transfer");
assert(splitOf(15, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T", "15 yd forest loam is 1 transfer");
assert(splitOf(16, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T", "16 yd forest loam is 1 transfer");
assert(splitOf(30, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T", "30 yd forest loam is 1 transfer");
assert(splitOf(31, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T+B", "31 yd forest loam remainder fits Small 550");
assert(splitOf(45, { id: "topsoil-plus", name: "Topsoil Plus", unit: "yd", price: 34 }) === "T+T", "45 yd topsoil plus remainder is another transfer");
assert(splitOf(46, { id: "topsoil-plus", name: "Topsoil Plus", unit: "yd", price: 34 }) === "T+T", "46 yd topsoil plus is 2 transfers");
assert(splitOf(40, { id: "fresh-fines", name: "Fresh Fines Bark", unit: "yd", price: 34, book: "store" }, "dump") === "T", "40 yd bark is 1 transfer");
assert(splitOf(40, { name: "Topsoil", unit: "yd", price: 38 }, "dump") === "D", "a topsoil line without the store id stays one load");
assert(splitOf(24, { name: "Topsoil", unit: "yd", price: 38, book: "store" }, "dump") === "T", "topsoil without an id still uses the 24 yd cap when the line is store soil");

const wc30 = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  yardId: "willow",
  materials: [{ ...wc, qty: 30 }],
});
assert(wc30.planned && wc30.loadCount === 2 && wc30.split === "Transfer 20 + Bobtail 10", "30 yd split label");
assert(Math.abs(wc30.loads[0].deliveryFee - 280) < 0.01 && Math.abs(wc30.loads[1].deliveryFee - 135) < 0.01, "transfer $280 and bobtail $135");
assert(Math.abs(wc30.deliveryFee - 415) < 0.01, "delivery fee is the sum of the load fees");
assert(Math.abs(wc30.materialsTotal - 375) < 0.01, "material price is charged once");
assert(wc30.environmentalLoads === 2 && Math.abs(wc30.environmentalFee - 10) < 0.01, "Willow Creek environmental fee is $5 per load and visible on the quote");
assert(wc30.formula.indexOf("Environmental fee (Willow Creek)") >= 0, "environmental fee is printed, not hidden in the material price");
assert(Math.abs(wc30.willowFuelPerYd - 1.3) < 0.001 && Math.abs(wc30.willowFuel - 30) < 0.01, "Willow Creek material fuel is $1/ton, shown as $1.30/yd");
assert(wc30.formula.indexOf("$1.30/yd") >= 0, "the yard fuel rate is on the formula");
assert(Math.abs(wc30.total - 830) < 0.01, "invoice total includes delivery, materials, the $10 env fee, and the $30 fuel");
assert(wc30.loads[0].tripMin === wc30.loads[1].tripMin, "each load uses the same route");
const lines = E.dispatchLines(wc30, "HD-30");
assert(lines.length === 2 && lines[0].ticketId === "HD-30" && lines[1].ticketId === "HD-30", "two dispatch lines under one ticket");
assert(lines[0].truck === "transfer" && lines[1].truck === "small", "dispatch lines follow the split");

const wc40 = E.quote({ oneWaySeconds: 30 * 60, truck: "small", billing: shop, materials: [{ ...wc, qty: 40 }] });
assert(wc40.split === "Transfer 20 + Transfer 20" && Math.abs(wc40.deliveryFee - 560) < 0.01, "40 yd is two transfer fees");
assert(E.dispatchLines(wc40, "HD-40").length === 2, "40 yd prints two dispatch lines");
const wc10 = E.quote({ oneWaySeconds: 30 * 60, truck: "transfer", billing: shop, materials: [{ ...wc, qty: 10 }] });
assert(wc10.loadCount === 1 && wc10.split === "Bobtail 10" && wc10.truck === "small", "10 yd is one bobtail even if transfer was selected");
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
assert(soils.loadCount === 1 && soils.truck === "transfer", "forest loam and topsoil plus share the 30 yd transfer");
const mixed = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [
    { id: "topsoil", name: "Topsoil", category: "Soils", qty: 12, unit: "yd", price: 25, book: "store" },
    { id: "fresh-fines", name: "Fresh Fines Bark", category: "Bark", qty: 20, unit: "yd", price: 34, book: "store" },
  ],
});
assert(mixed.loadCount === 2 && mixed.loads[0].truck === "dump" && mixed.loads[1].truck === "dump", "12 yd topsoil and 20 yd bark are two dumps");

const rock = { id: "three-quarter-minus", name: "3/4\" Minus", category: "Rock / yard", unit: "yd", price: 28, book: "store" };
const rock40 = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "small",
  billing: shop,
  materials: [{ ...rock, qty: 40 }],
});
assert(rock40.planned && rock40.loadCount === 2, "40 yd store rock is 2 loads");
assert(rock40.loads.every((load) => load.truck === "transfer" && load.yards === 20), "40 yd store rock is 2 transfer loads of 20");
assert(rock40.split === "Transfer 20 + Transfer 20", "40 yd store rock split is Transfer 20 + Transfer 20");
assert(rock40.loads.every((load) => load.rate === 160 && Math.abs(load.multiplier - 1.08) < 0.001), "each transfer stays $160 with the 8% buffer");
assert(Math.abs(rock40.deliveryFee - 560) < 0.01, "40 yd store rock delivery is two transfer fees");
assert(Math.abs(rock40.materialsTotal - 1120) < 0.01, "40 yd of 3/4 minus at $28 is $1,120");
assert(Math.abs(rock40.total - 1680) < 0.01, "40 yd store rock at 30 min one-way totals $1,680");
assert(E.dispatchLines(rock40, "HD-ROCK").length === 2, "40 yd store rock is still one invoice with two dispatch lines");
assert(E.dispatchLines(rock40, "HD-ROCK").every((line) => line.ticketId === "HD-ROCK"), "both rock loads stay on the same ticket");
console.log("40-yard store rock: 2 loads: " + rock40.split + " total " + E.money(rock40.total) + " (3/4\" Minus @ $28/yd, 30 min one-way, delivery " + E.money(rock40.deliveryFee) + " + materials " + E.money(rock40.materialsTotal) + ")");

const rock30 = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [{ ...rock, qty: 30 }],
});
assert(rock30.loadCount === 2 && rock30.loads[0].truck === "transfer" && rock30.loads[0].yards === 20, "30 yd store rock starts with a transfer");
assert(rock30.loads[1].truck === "dump" && rock30.loads[1].kind === "dump" && rock30.loads[1].yards === 10, "30 yd store rock remainder is a dump, not a second transfer");
assert(rock30.split === "Transfer 20 + Dump 10", "30 yd store rock is 1 transfer + 1 dump");
assert(rock30.loads[1].rate === 150 && Math.abs(rock30.loads[1].multiplier - 1.08) < 0.001, "the dump stays $150 with the road buffer");
assert(Math.abs(rock30.loads[0].deliveryFee - 280) < 0.01 && Math.abs(rock30.loads[1].deliveryFee - 262.5) < 0.01, "30 yd rock delivery is transfer $280 plus dump $262.50");
assert(Math.abs(rock30.materialsTotal - 840) < 0.01, "30 yd of 3/4 minus at $28 is $840");
assert(Math.abs(rock30.total - 1382.5) < 0.01, "30 yd rock is one invoice: delivery plus materials");
assert(E.dispatchLines(rock30, "HD-ROCK30").length === 2, "30 yd rock prints two dispatch lines on one ticket");
assert(E.dispatchLines(rock30, "HD-ROCK30").every((line) => line.ticketId === "HD-ROCK30"), "both rock loads stay on the same ticket");
console.log("30-yard store rock: " + rock30.loadCount + " loads: " + rock30.split + " total " + E.money(rock30.total) + " (transfer " + E.money(rock30.loads[0].deliveryFee) + " + dump " + E.money(rock30.loads[1].deliveryFee) + " + materials " + E.money(rock30.materialsTotal) + ")");

const rock10 = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "transfer",
  billing: shop,
  materials: [{ ...rock, qty: 10 }],
});
assert(rock10.loadCount === 1 && rock10.truck === "dump" && rock10.rate === 150, "10 yd store rock selects the dump at $150");

const top30 = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [{ id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 25, qty: 30, book: "store" }],
});
assert(top30.loadCount === 2 && top30.split === "Transfer 24 + Dump 6", "30 yd topsoil is transfer 24 plus the 6 yd remainder");
assert(top30.loads[0].truck === "transfer" && top30.loads[0].yards === 24, "the first topsoil load is a 24 yd transfer");
assert(top30.loads[1].truck === "dump" && top30.loads[1].yards === 6, "6 yd of topsoil fits the dump, not Small 550");
assert(!top30.lines[0].transferOnly && Math.abs(top30.lines[0].price - 25) < 0.01, "a split topsoil order keeps the $25 yard POS price");
assert(Math.abs(top30.materialsTotal - 750) < 0.01, "30 yd topsoil at POS is $750");
assert(E.dispatchLines(top30, "HD-SOIL").every((line) => line.ticketId === "HD-SOIL"), "30 yd topsoil stays one invoice");
console.log("30-yard topsoil: " + top30.loadCount + " loads: " + top30.split + " total " + E.money(top30.total) + " materials " + E.money(top30.materialsTotal));

const top24 = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [{ id: "topsoil", name: "Topsoil", unit: "yd", price: 25, qty: 24, book: "store" }],
});
assert(top24.loadCount === 1 && top24.truck === "transfer" && top24.lines[0].transferOnly, "24 yd topsoil is transfer-only");
assert(Math.abs(top24.lines[0].price - 16) < 0.01 && Math.abs(top24.materialsTotal - 384) < 0.01, "transfer-only topsoil is $16/yd");
const loam30 = E.quote({
  oneWaySeconds: 0,
  truck: "dump",
  billing: shop,
  materials: [{ id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27, qty: 30 }],
});
assert(loam30.lines[0].transferOnly && Math.abs(loam30.lines[0].price - 20) < 0.01, "transfer-only forest loam is $20/yd");
const plus30 = E.quote({
  oneWaySeconds: 0,
  truck: "small",
  billing: shop,
  materials: [{ id: "topsoil-plus", name: "Topsoil Plus", unit: "yd", price: 34, qty: 30 }],
});
assert(plus30.lines[0].transferOnly && Math.abs(plus30.lines[0].price - 26) < 0.01, "transfer-only topsoil plus is $26/yd");
const customTop = E.quote({
  oneWaySeconds: 0,
  truck: "transfer",
  billing: shop,
  materials: [{ id: "topsoil", name: "Topsoil", unit: "yd", price: 99, qty: 24 }],
});
assert(!customTop.lines[0].transferOnly && Math.abs(customTop.lines[0].price - 99) < 0.01, "a punched topsoil price is not replaced");
const posSmall = E.quote({
  oneWaySeconds: 0,
  truck: "small",
  billing: shop,
  materials: [{ id: "topsoil", name: "Topsoil", unit: "yd", price: 25, qty: 4 }],
});
assert(!posSmall.lines[0].transferOnly && Math.abs(posSmall.materialsTotal - 100) < 0.01, "Small 550 topsoil stays at the $25 POS price");

const fill = E.quote({
  oneWaySeconds: 0,
  truck: "dump",
  billing: shop,
  materials: [{ id: "q-fill-dirt-dump", name: "Fill Dirt Dump Fee", unit: "ton", price: 6, qty: 10, book: "willow", source: "quarry", truckload_only: true }],
});
assert(Math.abs(fill.lines[0].price - 6) < 0.01 && Math.abs(fill.materialsTotal - 60) < 0.01, "fill dirt dump fee is $6/ton");
assert(fill.environmentalLoads === 1 && Math.abs(fill.environmentalFee - 5) < 0.01, "one Willow Creek load adds the $5 environmental fee");
assert(Math.abs(fill.willowFuel - 10) < 0.01, "10 ton of Willow Creek material fuel is $10");

assert(splitOf(40, { id: "compost-omri", name: "Compost (OMRI Listed)", category: "Soils", unit: "yd", price: 35, book: "store" }) === "T", "compost uses the bark/mulch/compost cap");
assert(splitOf(24, { id: "topsoil", name: "Topsoil", unit: "yd", price: 25 }) === "T", "topsoil cap stays 24 yd on one transfer");
assert(splitOf(30, { id: "forest-loam", name: "Forest Loam", unit: "yd", price: 27 }) === "T", "forest loam cap stays 30 yd on one transfer");
assert(splitOf(30, { id: "topsoil-plus", name: "Topsoil Plus", unit: "yd", price: 34 }) === "T", "topsoil plus cap stays 30 yd on one transfer");

function staysOn(qty, material, truck) {
  const q = E.quote({
    oneWaySeconds: 30 * 60,
    truck,
    billing: shop,
    materials: [{ ...material, qty }],
  });
  return !q.planned && q.loadCount === 1 && q.truck === truck && q.split === "";
}
assert(staysOn(40, { id: "beach-sand", name: "Beach Sand", category: "Rock / lb", unit: "lb", price: 0.10, book: "store" }, "small"), "by-the-pound rock stays one load on Small Truck 550");
assert(staysOn(40, { id: "boulder-granite", name: "Large Granite Boulders", category: "Boulders / lb", unit: "lb", price: 0.10, book: "store" }, "dump"), "boulders stay one load");
assert(staysOn(40, { id: "br-b-basalt", name: "Basalt Boulder", category: "Boulders / lb", unit: "lb", price: 0.25, book: "boulders" }, "small"), "boulder-book boulders stay one load");
assert(staysOn(40, { id: "boulder-yd", name: "Garden Boulder", category: "Boulders", unit: "yd", price: 50, book: "boulders" }, "dump"), "a boulder line sold by the yard does not take the bulk split");
assert(staysOn(40, { id: "fs-flat-az-roeder", name: "Az Roeder — flat stack", category: "Flagstone / flat stack", unit: "lb", price: 0.20, book: "flagstone", requires_forklift: true }, "forklift"), "flagstone stays one load");
assert(staysOn(40, { id: "fs-slab-yd", name: "Oregon Rustic slab", category: "Flagstone / slabs", unit: "yd", price: 0.20, book: "flagstone", requires_forklift: true }, "forklift"), "forklift stone does not take the yard split");
assert(splitOf(40, { id: "br-granite-38", name: "Granite 3/8\"", category: "Granite / yd", unit: "yd", price: 65, book: "boulders" }) === "T+T", "granite sold by the yard uses the bulk split");

const separatePiles = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [
    { id: "q-jaw-run", qty: 10, unit: "ton", price: 12.5, book: "willow", source: "quarry" },
    { ...rock, qty: 10 },
  ],
});
assert(separatePiles.loadCount === 2 && separatePiles.loads[0].truck === "small" && separatePiles.loads[1].truck === "dump", "10 yd pit rock is a bobtail and 10 yd store rock is a dump");
const piledRocks = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing: shop,
  materials: [
    { id: "pea-gravel", name: "Pea Gravel", category: "Rock / yard", qty: 10, unit: "yd", price: 36, book: "store" },
    { ...rock, qty: 10 },
  ],
});
assert(piledRocks.loadCount === 1 && piledRocks.truck === "transfer", "two store rocks that add to 20 yd are one transfer");

const stageStill = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "forklift",
  yardId: "medford",
  billing: shop,
  materials: [],
});
assert(stageStill.southStage === 40 && Math.abs(stageStill.deliveryFee - 280) < 0.01, "South Stage forklift adder stays $40");

// Oct 26 target is $1,785. Catalog yard prices and two $160 transfer loads do not land on it
// for a one-way drive of 1 to 180 minutes, so the test reports the computed figure.
const dataCode = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
const dataBox = { window: {} };
vm.createContext(dataBox);
vm.runInContext(dataCode, dataBox);
const yardRocks = (dataBox.window.HD_DEFAULTS.materials || []).filter((m) => m.category === "Rock / yard" && m.unit === "yd");
let closest = null;
yardRocks.forEach((mat) => {
  for (let min = 1; min <= 180; min += 0.5) {
    const q = E.quote({
      oneWaySeconds: min * 60,
      truck: "dump",
      billing: shop,
      materials: [{ id: mat.id, name: mat.name, category: mat.category, unit: "yd", price: mat.price, qty: 40, book: "store" }],
    });
    const gap = Math.abs(q.total - 1785);
    if (!closest || gap < closest.gap) closest = { gap, total: q.total, min, name: mat.name, price: mat.price, split: q.split, loads: q.loadCount };
  }
});
const oct26 = Math.abs(rock40.total - 1785) < 0.01;
console.log(oct26
  ? "Oct 26 $1,785 matches the 30 min 3/4\" Minus quote."
  : "Oct 26 $1,785 is not reproduced. Computed 40 yd 3/4\" Minus at 30 min one-way is " + E.money(rock40.total) + ". Closest catalog Rock/yard over 1–180 min one-way: " + closest.name + " @ $" + closest.price + "/yd, " + closest.min + " min, " + closest.loads + " loads (" + closest.split + "), total " + E.money(closest.total) + ", gap " + E.money(closest.gap) + ".");
assert(closest && closest.loads === 2, "catalog store rock still prices as two loads while searching for $1,785");

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

const asphalt10 = E.quote({
  oneWaySeconds: 0,
  truck: "dump",
  billing: shop,
  materials: [{
    id: "q-crushed-asphalt",
    name: "Crushed Asphalt",
    unit: "yd",
    qty: 10,
    price: 20 * 1.3,
    tonPrice: 20,
    tonsPerYard: 1.3,
    tonsPerYardSource: "mike",
    book: "willow",
    source: "quarry",
    truckload_only: true,
  }],
});
assert(Math.abs(asphalt10.materialsTotal - 260) < 0.01, "10 yd Crushed Asphalt at $20/ton × 1.3 t/yd is $260 before delivery");
assert(asphalt10.lines[0].unit === "yd" && asphalt10.lines[0].qty === 10 && Math.abs(asphalt10.lines[0].price - 26) < 0.001, "the ticket qty stays yards and the yard price is not converted again");
assert(!asphalt10.lines[0].missingYardWeight, "Crushed Asphalt has Mike's yard weight");
assert(asphalt10.environmentalLoads === 1 && Math.abs(asphalt10.environmentalFee - 5) < 0.01, "the $5 per load environmental fee stays outside the $260");
assert(Math.abs(asphalt10.willowFuelPerYd - 1.3) < 0.001 && Math.abs(asphalt10.willowFuel - 13) < 0.01, "Willow fuel stays $1.30/yd on the yard qty, separate from the material");
assert(asphalt10.formula.indexOf("$1.30/yd") >= 0 && asphalt10.split === "Bobtail 10", "10 yd of pit rock is one bobtail and the fuel rate still prints");
assert(Math.abs(asphalt10.total - (asphalt10.deliveryFee + 260 + 5 + 13)) < 0.01, "delivery, the $260, the $5 fee, and the fuel stay separate");
const asphaltAgain = E.priceLines(asphalt10.lines);
assert(asphaltAgain[0].qty === 10 && Math.abs(asphaltAgain[0].price - 26) < 0.001 && Math.abs(asphaltAgain[0].amount - 260) < 0.01, "pricing the yard line again does not invert it");
const tonQty = 13;
const yardsFromTons = tonQty / 1.3;
const beforeSwitch = 20 * tonQty;
const afterSwitch = E.priceLines([{
  name: "Crushed Asphalt", unit: "yd", qty: yardsFromTons, price: 20 * 1.3, tonPrice: 20, tonsPerYard: 1.3, book: "willow",
}])[0];
assert(Math.abs(beforeSwitch - afterSwitch.amount) < 0.001 && Math.abs(beforeSwitch - 260) < 0.001, "ton price × tons equals yard price × yards");
const asphalt26 = E.quote({
  oneWaySeconds: 0,
  truck: "dump",
  billing: shop,
  materials: [{ id: "q-crushed-asphalt", name: "Crushed Asphalt", unit: "yd", qty: 26, price: 26, tonPrice: 20, tonsPerYard: 1.3, book: "willow" }],
});
assert(asphalt26.split === "Transfer 20 + Bobtail 6" && Math.abs(asphalt26.materialsTotal - 676) < 0.01, "the load plan uses the yard qty, not a second ton conversion");
const jawMissing = E.quote({
  oneWaySeconds: 0,
  truck: "dump",
  billing: shop,
  materials: [{ id: "q-jaw-run", name: "Jaw Run", unit: "ton", qty: 10, price: 12.5, book: "willow", source: "quarry" }],
});
assert(jawMissing.lines[0].missingYardWeight && jawMissing.lines[0].unit === "ton" && Math.abs(jawMissing.materialsTotal - 125) < 0.01, "a row with no yard weight stays tons and is flagged");
assert(Math.abs(jawMissing.willowFuel - 10) < 0.01 && Math.abs(jawMissing.environmentalFee - 5) < 0.01, "missing yard weight keeps $1 per ton fuel and the $5 load fee");
const fillStill = E.quote({
  oneWaySeconds: 0,
  truck: "dump",
  billing: shop,
  materials: [{ id: "q-fill-dirt-dump", name: "Fill Dirt Dump Fee", unit: "ton", qty: 10, price: 6, book: "willow", source: "quarry", truckload_only: true }],
});
assert(fillStill.lines[0].unit === "ton" && fillStill.lines[0].missingYardWeight && Math.abs(fillStill.materialsTotal - 60) < 0.01, "fill dirt dump fee stays $6/ton");
const dumpBuffer = E.quote({ oneWaySeconds: 30 * 60, truck: "dump", billing: shop, materials: [] });
assert(dumpBuffer.formula.indexOf("dump-truck buffer") >= 0, "the dump-truck buffer name stays on a bobtail-truck load");
const minusPhone = 13;
const minusWeight = 1.3095;
const minusUnit = minusPhone * minusWeight;
const minus10 = E.quote({
  oneWaySeconds: 0,
  truck: "dump",
  billing: shop,
  materials: [{
    id: "q-34-minus",
    name: "3/4 Minus",
    unit: "yd",
    qty: 10,
    price: minusPhone,
    tonPrice: minusPhone,
    unitPrice: minusUnit,
    tonsPerYard: minusWeight,
    tonsPerYardSource: "sheet",
    book: "willow",
    source: "quarry",
  }],
});
assert(Math.abs(minus10.materialsTotal - 170.24) < 0.001, "10 yd of $13/ton 3/4 Minus at 1.3095 t/yd is $170.24");
assert(minus10.lines[0].tonPrice === 13 && Math.abs(minus10.lines[0].unitPrice - minusUnit) < 1e-9 && Math.abs(minus10.lines[0].price - minusUnit) < 1e-9, "phone $/ton stays separate from the yard unit price");
const minusAgain = E.priceLines(minus10.lines);
assert(Math.abs(minusAgain[0].amount - 170.24) < 0.001 && minusAgain[0].qty === 10, "the sheet yard price is not multiplied by tons per yard a second time");
assert(Math.abs(minus10.environmentalFee - 5) < 0.01 && Math.abs(minus10.willowFuelPerYd - 1.3) < 0.001, "3/4 Minus keeps the $5 load fee and the $1.30/yd fuel rate");

if (process.exitCode) {
  console.error("Engine tests failed.");
} else {
  console.log("All engine tests passed.");
}
