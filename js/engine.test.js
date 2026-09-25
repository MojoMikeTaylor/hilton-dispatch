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
assert(twoLoads.loadCount === 1, "billing is always 1 load");
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
  dieselPrice: 7.456,
  dieselBaseline: 4,
  dieselWeekOf: "2026-09-21",
};
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
const pct = Math.max(0, (Math.round(7.456 * 1000) - Math.round(4 * 1000)) / Math.round(4 * 1000));
assert(Math.abs(pct - 0.864) < 1e-12, "example ratio is 86.4% of the delivery fee");
assert(Math.abs(fueled.surchargePercent - pct) < 1e-12, "surcharge percent is computed from diesel and baseline");
assert(fueled.loadCount === 1 && fueled.extra === 0, "loads and extra minutes do not enter the fuel ticket");
assert(Math.abs(fueled.deliveryFee - 280) < 0.01, "delivery fee is the surcharge base");
assert(Math.abs(fueled.materialsTotal - 304) < 0.01, "materials are not surcharged");
assert(Math.abs(fueled.fuelSurcharge - Number((280 * pct).toFixed(2))) < 0.001, "fuel surcharge is delivery fee times the percent");
assert(Math.abs(fueled.total - (280 + 304 + 75 + fueled.fuelSurcharge)) < 0.01, "total adds delivery, materials, forklift, and fuel");
assert(fueled.formula.indexOf("surchargePercent = max(0, (dieselThisWeek - baseline) / baseline)") >= 0, "invoice prints the percent formula");
assert(fueled.formula.indexOf("fuelSurcharge = deliveryFee * surchargePercent") >= 0, "invoice prints the fuel formula");
assert(fueled.formula.indexOf("total = delivery + materials + forkliftFee + fuelSurcharge") >= 0, "invoice prints the total formula");
assert(fueled.formula.indexOf("21 Sep 2026") >= 0, "invoice prints the EIA week");
assert(fueled.formula.indexOf(E.percentText(pct)) >= 0, "printed percent is the computed percent");
assert(code.indexOf("86.4") < 0 && code.indexOf("0.864") < 0, "surcharge percent is not hardcoded");

const cheap = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "small",
  billing: { ...fuelBilling, dieselPrice: 3.5 },
  materials: [],
});
assert(cheap.surchargePercent === 0 && cheap.fuelSurcharge === 0, "diesel under the baseline adds no surcharge");

const zeroBase = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "small",
  billing: { ...fuelBilling, dieselBaseline: 0 },
  materials: [],
});
assert(zeroBase.surchargePercent === 0 && zeroBase.fuelSurcharge === 0, "a zero baseline does not divide");

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
assert(withTote.formula.indexOf("total = delivery + materials + fuelSurcharge + forkliftFee + toteFee") >= 0, "invoice total formula includes the tote fee");
assert(fueled.formula.toLowerCase().indexOf("tote") < 0, "a blank tote fee stays off the formula");

const blankTote = E.quote({
  oneWaySeconds: 30 * 60,
  truck: "dump",
  billing,
  materials: [],
  toteFee: "",
});
assert(blankTote.toteFee === 0, "an empty tote fee is $0");

if (process.exitCode) {
  console.error("Engine tests failed.");
} else {
  console.log("All engine tests passed.");
}
