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
assert(Math.abs(twoLoads.tripMin - 80) < 0.01, "2 loads × round trip 40 min = 80 min road");
assert(Math.abs(twoLoads.adjustedDriveMin - 86.4) < 0.01, "8% applies after loads");

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
assert(Math.abs(extraWait.adjustedDriveMin - 64.8) < 0.01, "extra minutes do not get the 8% dump buffer");
assert(Math.abs(extraWait.siteMin - 60) < 0.01, "extra 30 min stacks on 15+15 load/unload");
assert(Math.abs(extraWait.billableHours - 2.25) < 0.001, "124.8 raw min rounds to 2.25 hr");
assert(Math.abs(extraWait.deliveryFee - 360) < 0.01, "2.25 hr × $160 = $360");

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
assert(Math.abs(splitMins.adjustedDriveMin - 64.8) < 0.01, "site/wait minutes are not on the dump road buffer");
assert(Math.abs(splitMins.siteMin - 60) < 0.01, "20 site + 10 wait stack on 15+15 load/unload");
assert(Math.abs(splitMins.extraSite - 20) < 0.01, "extra site minutes recorded");
assert(Math.abs(splitMins.extraWait - 10) < 0.01, "extra wait minutes recorded");

if (process.exitCode) {
  console.error("Engine tests failed.");
} else {
  console.log("All engine tests passed.");
}
