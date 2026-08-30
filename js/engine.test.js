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

if (process.exitCode) {
  console.error("Engine tests failed.");
} else {
  console.log("All engine tests passed.");
}
