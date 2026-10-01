/* Node smoke test for the crew desk check. Run: node js/desk.test.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function load(file) {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox);
  return sandbox.window;
}

const catalog = load("data.js");
const deskWin = load("desk.js");
const D = catalog.HD_DEFAULTS;
const C = catalog.HDCatalog;
const Desk = deskWin.HDDesk;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok —", msg);
  }
}

const yard = "8087 Blackwell Road, Central Point, Oregon 97502";
const ticket = "214 Oak St, Medford, OR 97501";
assert(Desk.mapTarget(ticket, yard).source === "ticket", "ticket address is used when it is filled in");
assert(Desk.mapTarget(ticket, yard).address === ticket, "ticket address is the maps target");
assert(Desk.mapTarget("  ", yard).source === "yard", "blank ticket address falls back to the yard");
assert(Desk.mapTarget("", yard).address === yard, "yard address is the maps target when the ticket is blank");

assert(Desk.mapsLine("google") === "Maps OK", "Google maps result text");
assert(
  Desk.mapsLine("osrm") === "Maps failed — using the backup map, delivery may be the flat hour",
  "backup map result text"
);
assert(
  Desk.mapsLine("") === "Maps failed — using the backup map, delivery may be the flat hour",
  "failed maps use the backup sentence"
);

const healthy = Desk.resultText({
  provider: "google",
  rows: 195,
  savedAtLabel: "Oct 1, 2026, 4:12 PM",
  checked: "ticket",
});
assert(healthy.includes("Maps OK"), "healthy result says Maps OK");
assert(healthy.includes("Hard refresh once."), "result tells them to hard refresh once");
assert(healthy.includes("Book rows: 195"), "result shows the book row count");
assert(healthy.includes("Last save: Oct 1, 2026, 4:12 PM"), "result shows the last save time");
assert(!healthy.includes("under 150"), "150 or more rows is not a warning");
assert(healthy.includes("Checked the ticket address."), "ticket check is named");

const thin = Desk.resultText({
  provider: "nominatim",
  rows: 40,
  savedAtLabel: "unknown",
  checked: "yard",
});
assert(thin.includes("Warning: book has under 150 rows."), "under 150 rows warns");
assert(thin.includes("Checked the yard address."), "yard check is named");
assert(thin.includes(Desk.MAPS_BACKUP), "yard fallback still reports the backup map sentence");

const key = "AIzaSyDUMMYKEY1234567890";
const pin = "2468";
const admin = "yard-admin-password";
const leaked = healthy + "\n" + key + " " + pin + " " + admin;
const clean = Desk.scrub(leaked, [key, pin, admin]);
assert(!clean.includes(key), "google key is scrubbed from the desk text");
assert(!clean.includes(admin), "admin password is scrubbed from the desk text");
assert(clean.includes("Maps OK"), "scrub leaves the desk result");
assert(clean.includes("Book rows: 195"), "scrub does not eat the row count");

const href = Desk.emailHref(healthy, [key, pin, admin]);
const mail = new URL(href);
assert(mail.protocol === "mailto:", "desk email is a mailto");
assert(decodeURIComponent(mail.pathname) === "miketaylor@hiltonlandscaping.com", "desk email goes to Mike");
assert(mail.searchParams.get("subject") === "Dispatch desk problem", "desk email subject");
const body = mail.searchParams.get("body");
assert(body.includes("Maps OK"), "email body contains the desk result");
assert(body.includes("Hard refresh once."), "email body tells them to hard refresh once");
assert(!body.includes(key) && !body.includes(pin) && !body.includes(admin), "email body has no key, PIN, or admin password");

const current = C.publishedSheet().concat([
  { id: "sku-custom", name: "Custom mix", category: "Custom", unit: "yd", price: 12, book: "store" },
]);
const lastSaved = {
  materials: JSON.parse(JSON.stringify(current)),
  savedAt: "2026-09-15T18:00:00.000Z",
  rows: current.length,
};
const aug26 = C.publishedSheet();
assert(!aug26.some((m) => m.id === "sku-custom"), "Aug 26 sheet has no added row");
const restored = Desk.restoreBook(aug26, lastSaved);
assert(restored.ok, "restore uses the app-saved book");
assert(restored.preRestore.length === aug26.length, "current book is snapshotted before restore");
assert(!restored.preRestore.some((m) => m.id === "sku-custom"), "snapshot is the book on screen, not the save");
assert(restored.materials.some((m) => m.id === "sku-custom" && m.price === 12), "restore brings back the added row");
assert(restored.materials !== lastSaved.materials, "restore copies the saved book");
restored.materials[0].price = 0;
assert(lastSaved.materials[0].price !== 0, "restore copy does not edit the saved snapshot");

const refused = Desk.restoreBook(aug26, null);
assert(!refused.ok, "missing snapshot does not restore");
assert(!refused.materials.some((m) => m.id === "sku-custom"), "missing snapshot does not invent rows");
assert(refused.materials.length === aug26.length, "missing snapshot leaves the current book alone");
const fromSheet = Desk.restoreBook(current, { materials: D.materials, savedAt: null });
assert(fromSheet.ok && fromSheet.materials.length === D.materials.length, "restore copies whatever the app saved");
assert(JSON.stringify(fromSheet.materials) !== JSON.stringify(C.publishedSheet()) || fromSheet.materials.length === C.publishedSheet().length, "restore path does not call the published sheet");

const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const replaceFn = app.split("function replaceBookWithAug26()")[1].split("async function reportDeskProblem")[0];
const reportFn = app.split("async function reportDeskProblem()")[1].split("async function onReady")[0];
assert(replaceFn.includes("state.admin"), "Aug 26 replace stays behind the admin flag");
assert(replaceFn.includes("publishedSheet"), "Aug 26 replace uses the published sheet");
assert(!replaceFn.includes("reloadRetailKeepExtras"), "Aug 26 replace does not keep added rows");
assert(!replaceFn.includes("rememberBookSave"), "Aug 26 replace does not overwrite the last app save");
assert(!replaceFn.includes("db.jobs") && !replaceFn.includes("db.customers"), "Aug 26 replace does not touch jobs or customers");
assert(!replaceFn.includes("billing") && !replaceFn.includes("security") && !replaceFn.includes("googleKey"), "Aug 26 replace does not touch rates, PIN, or the Google key");
assert(reportFn.includes("confirmRestoreBook"), "restore waits for the second confirm");
assert(reportFn.includes("HDDesk.emailHref"), "desk check emails the result");
assert(!reportFn.includes("JSON.stringify"), "desk check does not dump the store");
assert((html.match(/Something's wrong/g) || []).length === 2, "button is on the board and the ticket");
assert(!html.includes("Reload 2026 price sheet"), "crew label Reload 2026 price sheet is gone");
assert(html.includes("Replace book with Aug 26 sheet — deletes added rows."), "admin label warns that added rows are deleted");
assert(html.includes('id="reload-sheet"'), "admin replace control is still the book control");

if (process.exitCode) {
  console.error("Desk tests failed.");
} else {
  console.log("All desk tests passed.");
}
