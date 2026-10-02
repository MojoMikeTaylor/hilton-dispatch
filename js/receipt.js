/* Hilton Dispatch — ticket slip: payment, receipt, and who gets the email.
   Locked by Grace. Pure helpers, no DOM, so they run in the browser and in node tests.
   No card numbers live anywhere in this app. Clover takes the money; nothing auto-charges. */

window.HDReceipt = {
  // Every ticket email goes to Nick and Grace. The customer is CC'd only when the
  // "customer asked for a copy" box is ticked on the ticket.
  TO: ["dispatch@hiltonlandscaping.com", "control@hiltonlandscaping.com"],

  METHODS: [
    { id: "cod", label: "COD (check)" },
    { id: "credit", label: "Credit" },
    { id: "cash", label: "Cash" },
    { id: "charge", label: "Charge" },
  ],

  WORKSITE:
    "Hilton delivers to the nearest public road. Past that road, the customer accepts the risk. " +
    "We can stop if the approach is not safe. They are responsible for damage once the truck leaves the public road.",

  CLOVER_NOTE: "No card numbers on this ticket. Clover takes the money. Nothing auto-charges.",

  methodLabel(id) {
    const m = this.METHODS.find((x) => x.id === id);
    return m ? m.label : "";
  },

  // Fill in payment fields on tickets saved before this feature existed.
  normalize(ticket) {
    const t = ticket || {};
    if (typeof t.payMethod !== "string" || !this.methodLabel(t.payMethod)) t.payMethod = "";
    t.paid = !!t.paid;
    t.paidBy = String(t.paidBy || "").trim();
    t.paidAt = t.paid ? (t.paidAt || null) : null;
    if (!t.paid) t.paidBy = "";
    t.customerCopy = !!t.customerCopy;
    return t;
  },

  // "Paid" needs a name. Returns an error string or "".
  validate(ticket) {
    const t = this.normalize({ ...ticket });
    if (t.paid && !t.paidBy) return "Who marked it paid? Put a name in 'Marked paid by'.";
    return "";
  },

  // One line for the invoice, receipt, and email.
  paymentLine(ticket, now) {
    const t = this.normalize({ ...ticket });
    const method = this.methodLabel(t.payMethod) || "Payment method: ____________";
    if (!t.paid) return `${method} — NOT PAID`;
    const when = t.paidAt ? new Date(t.paidAt) : (now || new Date());
    return `${method} — PAID, marked by ${t.paidBy} ${when.toLocaleString()}`;
  },

  // Who the ticket email goes to. Customer only on request, and only if there is an address.
  recipients(ticket) {
    const t = ticket || {};
    const email = String(t.email || "").trim();
    const cc = t.customerCopy && email ? [email] : [];
    return { to: this.TO.slice(), cc };
  },

  mailtoHref(rcpt, subject, body) {
    const cc = rcpt.cc && rcpt.cc.length ? `&cc=${encodeURIComponent(rcpt.cc.join(","))}` : "";
    return `mailto:${encodeURIComponent(rcpt.to.join(","))}?subject=${encodeURIComponent(subject)}${cc}&body=${encodeURIComponent(body)}`;
  },

  // "3 yd · 2 ton" — quantities summed by unit, in the order they appear.
  loadSummary(lines) {
    const byUnit = [];
    (lines || []).forEach((l) => {
      const unit = String(l.unit || "").trim() || "ea";
      const qty = Number(l.qty) || 0;
      const hit = byUnit.find((b) => b.unit === unit);
      if (hit) hit.qty += qty;
      else byUnit.push({ unit, qty });
    });
    return byUnit.map((b) => `${Number(b.qty.toFixed(2))} ${b.unit}`).join(" · ");
  },

  // Belt and braces: if anyone types a card number into notes, it never prints or mails.
  scrubCardNumbers(text) {
    return String(text || "").replace(/\b\d(?:[ -]?\d){12,18}\b/g, "[card number removed]");
  },
};
