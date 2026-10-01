/* Hilton Dispatch — crew "Something's wrong" desk check.
   Result text is an allowlist. It never includes the Google key, PIN, or admin password. */

window.HDDesk = {
  MAIL_TO: "miketaylor@hiltonlandscaping.com",
  SUBJECT: "Dispatch desk problem",
  MAPS_OK: "Maps OK",
  MAPS_BACKUP: "Maps failed — using the backup map, delivery may be the flat hour",
  ROW_WARN: 150,

  mapTarget(ticketAddress, yardAddress) {
    const ticket = String(ticketAddress || "").trim();
    if (ticket) return { address: ticket, source: "ticket" };
    return { address: String(yardAddress || "").trim(), source: "yard" };
  },

  mapsLine(provider) {
    return provider === "google" ? this.MAPS_OK : this.MAPS_BACKUP;
  },

  resultText(opts) {
    const o = opts || {};
    const rows = Number(o.rows) || 0;
    const lines = [
      o.checked === "yard" ? "Checked the yard address." : "Checked the ticket address.",
      this.mapsLine(o.provider),
      "Hard refresh once.",
      "Book rows: " + rows,
      "Last save: " + (o.savedAtLabel || "unknown"),
    ];
    if (rows < this.ROW_WARN) lines.push("Warning: book has under 150 rows.");
    if (o.restored) lines.push("Restored the last book this app saved (" + o.restored + " rows).");
    if (o.extra) lines.push(String(o.extra));
    return lines.join("\n");
  },

  scrub(text, secrets) {
    let out = String(text == null ? "" : text);
    (secrets || []).forEach((secret) => {
      const value = String(secret == null ? "" : secret).trim();
      if (value.length < 8) return;
      if (out.indexOf(value) === -1) return;
      out = out.split(value).join("[redacted]");
    });
    return out;
  },

  emailHref(body, secrets) {
    const safe = this.scrub(body, secrets);
    return "mailto:" + encodeURIComponent(this.MAIL_TO)
      + "?subject=" + encodeURIComponent(this.SUBJECT)
      + "&body=" + encodeURIComponent(safe);
  },

  /* Restore only the snapshot this app saved. No published-sheet fallback. */
  restoreBook(currentMaterials, lastSaved) {
    const current = JSON.parse(JSON.stringify(currentMaterials || []));
    const saved = lastSaved && Array.isArray(lastSaved.materials) ? lastSaved.materials : null;
    if (!saved || !saved.length) {
      return { ok: false, materials: current, preRestore: null, savedAt: null };
    }
    return {
      ok: true,
      preRestore: current,
      materials: JSON.parse(JSON.stringify(saved)),
      savedAt: lastSaved.savedAt || null,
    };
  },
};
