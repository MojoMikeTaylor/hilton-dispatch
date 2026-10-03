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

  // Yellow waiver. The driver keeps it, the customer signs it. Printed word for word — do not shorten.
  WAIVER_TITLE: "DELIVERY TO WORKSITE POLICY TERMS",
  WAIVER: [
    "Hilton Trucking Company d.b.a. Hilton Landscape Supply (\"Hilton's\") standard policy is to deliver materials to the nearest public roadway to the work site. If the Authorized Representative on a given project requests that Hilton's deliver materials beyond the public roadway, that Authorized Representative must do so at his own risk and must accept responsibility for any damages resulting from that request.",
    "The Authorized Representative listed below has asked Hilton's to deliver materials to a work site in a location that goes beyond the public roadway. The Authorized Representative agrees to provide roadways or approaches permitting safe access of Hilton's trucks under their own power to the point of delivery. Hilton's reserves the right to stop delivery if such access is not provided.",
    "Authorized Representative assumes full responsibility, and agrees to indemnify, hold harmless, and defend Hilton's from any damage or cost incurred to any person, property or equipment as a result of Hilton's equipment being placed off the public roadway. Such damage includes but is not limited to any bodily injury, any damage to the property or equipment of the owner, authorized representative, Hilton's, or any third party.",
  ],
  WAIVER_REQUEST: "REQUEST TO DELIVER MATERIALS TO A WORK SITE NOT SERVED BY A PUBLIC ROAD:",

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
