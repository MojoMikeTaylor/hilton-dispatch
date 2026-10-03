/* Node smoke test for the ticket slip helpers. Run: node js/receipt.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function load(file) {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox);
  return sandbox.window;
}

const R = load("receipt.js").HDReceipt;
// Arrays cross the vm boundary with a different prototype; compare by value.
const same = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

// Email always goes to Nick and Grace; customer only when they asked and gave an address.
same(R.recipients({ email: "jo@example.com" }), {
  to: ["dispatch@hiltonlandscaping.com", "control@hiltonlandscaping.com"], cc: [] });
same(R.recipients({ email: "jo@example.com", customerCopy: true }).cc, ["jo@example.com"]);
same(R.recipients({ email: "", customerCopy: true }).cc, []);
const href = R.mailtoHref(R.recipients({ email: "jo@example.com", customerCopy: true }), "S", "B");
assert.ok(href.startsWith("mailto:dispatch%40hiltonlandscaping.com%2Ccontrol%40hiltonlandscaping.com?subject=S&cc=jo%40example.com&body=B"), href);
assert.ok(R.mailtoHref(R.recipients({}), "S", "B").indexOf("cc=") < 0);

// Payment methods are exactly the four Grace locked.
same(R.METHODS.map((m) => m.label), ["COD (check)", "Credit", "Cash", "Charge"]);
assert.strictEqual(R.methodLabel("cod"), "COD (check)");
assert.strictEqual(R.methodLabel("visa"), "");

// Paid needs a name; unpaid clears the name and time.
assert.strictEqual(R.validate({ paid: true, paidBy: "" }), "Who marked it paid? Put a name in 'Marked paid by'.");
assert.strictEqual(R.validate({ paid: true, paidBy: "Grace" }), "");
assert.strictEqual(R.validate({ paid: false }), "");
const old = R.normalize({ customer: "legacy ticket", paidBy: "x", paidAt: "2026-01-01" });
same([old.payMethod, old.paid, old.paidBy, old.paidAt, old.customerCopy], ["", false, "", null, false]);
assert.strictEqual(R.normalize({ payMethod: "visa" }).payMethod, "");

// One payment line everywhere.
assert.strictEqual(R.paymentLine({ payMethod: "cash" }), "Cash — NOT PAID");
assert.strictEqual(R.paymentLine({}), "Payment method: ____________ — NOT PAID");
const line = R.paymentLine({ payMethod: "credit", paid: true, paidBy: "Grace", paidAt: "2026-10-02T15:12:00" });
assert.ok(/^Credit — PAID, marked by Grace /.test(line), line);

// Yards or tons on the receipt.
assert.strictEqual(R.loadSummary([{ qty: 2, unit: "yd" }, { qty: 1.5, unit: "yd" }, { qty: 2, unit: "ton" }]), "3.5 yd · 2 ton");
assert.strictEqual(R.loadSummary([]), "");

// Card numbers never print or mail.
assert.strictEqual(R.scrubCardNumbers("gate 4421, card 4111 1111 1111 1111 ok"), "gate 4421, card [card number removed] ok");
assert.strictEqual(R.scrubCardNumbers("PO 123456 call 541-555-0100"), "PO 123456 call 541-555-0100");

// Waiver prints word for word.
assert.strictEqual(R.WAIVER_TITLE, "DELIVERY TO WORKSITE POLICY TERMS");
assert.strictEqual(R.WAIVER.length, 3);
assert.ok(R.WAIVER[0].startsWith("Hilton Trucking Company d.b.a. Hilton Landscape Supply (\"Hilton's\") standard policy is to deliver materials to the nearest public roadway to the work site."));
assert.ok(R.WAIVER[0].endsWith("must accept responsibility for any damages resulting from that request."));
assert.ok(R.WAIVER[1].startsWith("The Authorized Representative listed below has asked Hilton's"));
assert.ok(R.WAIVER[1].endsWith("Hilton's reserves the right to stop delivery if such access is not provided."));
assert.ok(R.WAIVER[2].startsWith("Authorized Representative assumes full responsibility, and agrees to indemnify, hold harmless, and defend Hilton's"));
assert.ok(R.WAIVER[2].endsWith("authorized representative, Hilton's, or any third party."));
assert.strictEqual(R.WAIVER_REQUEST, "REQUEST TO DELIVER MATERIALS TO A WORK SITE NOT SERVED BY A PUBLIC ROAD:");

console.log("receipt.test.js OK");
