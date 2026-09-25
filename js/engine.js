/* Hilton Dispatch — rate + time engine
   Formula (printed on every invoice so accounting can reconcile):

   1. Mapped one-way drive minutes          = T_one
   2. Trip minutes                          = (roundtrip ? T_one * 2 : T_one)
                                              Billing is always 1 load.
   3. Dump-truck road buffer                = dump ? tripMinutes * 1.08 : tripMinutes
                                              (8% only on road time — big truck is slower)
   4. Site minutes                          = loadMinutes + unloadMinutes
                                              Extra site minutes and extra wait minutes are 0.
   5. Raw hours                             = (adjustedDrive + site) / 60
   6. Billable hours                        = max(minimumHours, ceil to incrementMinutes)
   7. Delivery fee                          = billableHours * ($160 dump | $100 small | $160 forklift)
   8. Materials                             = Σ qty * unitPrice
   9. Forklift / extra fee                  = ticket dollars (default 0)
  10. Tote / bagging fee                    = ticket dollars typed by hand (default 0)
  11. surchargePercent                      = the percent typed in Settings (15 means 15%). Default 0.
                                              Diesel price and week-of are printed as the EIA index only.
  12. fuelSurcharge                         = deliveryFee * (surchargePercent / 100)
  13. Tax                                   = (delivery + materials + forkliftFee + toteFee + fuelSurcharge) * taxRate
                                              (OR default 0)
  14. total                                 = delivery + materials + forkliftFee + toteFee + fuelSurcharge + tax
*/

window.HDEngine = {
  hoursFromMinutes(mins) {
    return Math.max(0, Number(mins) || 0) / 60;
  },

  roundUpHours(rawHours, minimumHours, incrementMinutes) {
    const minH = Number(minimumHours) || 0;
    const step = (Number(incrementMinutes) || 15) / 60;
    let h = Math.max(0, Number(rawHours) || 0);
    if (step > 0) {
      h = Math.ceil(h / step - 1e-9) * step;
    }
    return Math.max(minH, Number(h.toFixed(4)));
  },

  formatHours(h) {
    const n = Number(h) || 0;
    const hrs = Math.floor(n + 1e-9);
    const mins = Math.round((n - hrs) * 60);
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
  },

  money(n) {
    const v = Number(n);
    if (!isFinite(v)) return "$0.00";
    return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
  },

  dollarsPerGal(n, places) {
    const v = Number(n);
    if (!isFinite(v)) return "—";
    return "$" + v.toFixed(places);
  },

  percentText(ratio) {
    const pct = Math.round((Number(ratio) || 0) * 1000) / 10;
    if (!isFinite(pct)) return "0%";
    const shown = Math.abs(pct - Math.round(pct)) < 1e-9 ? String(Math.round(pct)) : pct.toFixed(1);
    return shown + "%";
  },

  weekLabel(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[Number(m[2]) - 1];
    if (!month) return "";
    return Number(m[3]) + " " + month + " " + m[1];
  },

  fuelFrom(billing, deliveryFee) {
    const b = billing || {};
    const dieselRaw = Number(b.dieselPrice);
    const dieselPrice = isFinite(dieselRaw) ? dieselRaw : null;
    const dieselWeekOf = b.dieselWeekOf || "";
    const pctRaw = Number(b.surchargePercent);
    const surchargePercent = isFinite(pctRaw) && pctRaw > 0 ? pctRaw : 0;
    const fuelSurcharge = Number(((Number(deliveryFee) || 0) * (surchargePercent / 100)).toFixed(2));
    return { dieselPrice, dieselWeekOf, surchargePercent, fuelSurcharge };
  },

  fuelSentence(q) {
    const pct = Number(q && q.surchargePercent);
    const n = isFinite(pct) && pct > 0 ? pct : 0;
    const rounded = Math.round(n * 10) / 10;
    const shown = Math.abs(rounded - Math.round(rounded)) < 1e-9 ? String(Math.round(rounded)) : rounded.toFixed(1);
    const week = this.weekLabel(q && q.dieselWeekOf) || "—";
    const gal = this.dollarsPerGal(q && q.dieselPrice, 3);
    return `Fuel surcharge: ${shown}% of delivery. EIA West Coast diesel ${gal}/gal, week of ${week} (index only).`;
  },

  quote({
    oneWaySeconds,
    truck,
    billing,
    materials,
    forkliftFee,
    toteFee,
  }) {
    const b = billing || {};
    const loadCount = 1;
    const extraSite = 0;
    const extraWait = 0;
    const extra = 0;
    const fee = Math.max(0, Number(forkliftFee) || 0);
    const tote = Math.max(0, Number(toteFee) || 0);
    const oneWayMin = Math.max(0, (Number(oneWaySeconds) || 0) / 60);
    const tripFactor = (b.tripMode || "roundtrip") === "oneway" ? 1 : 2;
    const tripMin = oneWayMin * tripFactor * loadCount;
    const isDump = truck === "dump";
    const isForklift = truck === "forklift";
    const multiplier = isDump ? Number(b.dumpTimeMultiplier) || 1.08 : 1;
    const adjustedDriveMin = tripMin * multiplier;
    const siteMin = ((Number(b.loadMinutes) || 0) + (Number(b.unloadMinutes) || 0)) * loadCount + extra;
    const rawMin = adjustedDriveMin + siteMin;
    const rawHours = rawMin / 60;
    const billableHours = this.roundUpHours(rawHours, b.minimumHours, b.incrementMinutes);
    const rate = isDump
      ? Number(b.dumpRate) || 160
      : isForklift
        ? Number(b.forkliftRate) || Number(b.dumpRate) || 160
        : Number(b.smallRate) || 100;
    const deliveryFee = Number((billableHours * rate).toFixed(2));

    const lines = (materials || []).map((m) => {
      const qty = Number(m.qty) || 0;
      const price = Number(m.price) || 0;
      return {
        ...m,
        qty,
        price,
        amount: Number((qty * price).toFixed(2)),
      };
    });
    const materialsTotal = Number(lines.reduce((s, l) => s + l.amount, 0).toFixed(2));
    const fuel = this.fuelFrom(b, deliveryFee);
    const subtotal = Number((deliveryFee + materialsTotal + fee + fuel.fuelSurcharge + tote).toFixed(2));
    const taxRate = Number(b.taxRate) || 0;
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    return {
      oneWayMin,
      tripFactor,
      loadCount,
      extra,
      extraSite,
      extraWait,
      forkliftFee: fee,
      toteFee: tote,
      dieselPrice: fuel.dieselPrice,
      dieselWeekOf: fuel.dieselWeekOf,
      surchargePercent: fuel.surchargePercent,
      fuelSurcharge: fuel.fuelSurcharge,
      tripMin,
      isDump,
      isForklift,
      truck: isDump ? "dump" : isForklift ? "forklift" : "small",
      multiplier,
      adjustedDriveMin,
      siteMin,
      rawMin,
      rawHours,
      billableHours,
      rate,
      deliveryFee,
      lines,
      materialsTotal,
      subtotal,
      taxRate,
      tax,
      total,
      formula: this.describe({
        oneWayMin, tripFactor, loadCount, extra, extraSite, extraWait, tripMin, isDump, isForklift, multiplier,
        adjustedDriveMin, siteMin, rawHours, billableHours, rate, deliveryFee,
        materialsTotal, forkliftFee: fee, toteFee: tote, fuelSurcharge: fuel.fuelSurcharge,
        surchargePercent: fuel.surchargePercent, dieselPrice: fuel.dieselPrice,
        dieselWeekOf: fuel.dieselWeekOf,
        tax, total, billing: b,
      }),
    };
  },

  describe(q) {
    const tripLabel = q.tripFactor === 2 ? "round trip" : "one way";
    const dumpNote = q.isDump
      ? ` × ${Number(q.multiplier).toFixed(2)} dump-truck buffer`
      : q.isForklift
        ? " (no dump buffer — forklift truck)"
        : " (no buffer — small truck)";
    const preTax = (Number(q.deliveryFee) || 0) + (Number(q.materialsTotal) || 0) + (Number(q.fuelSurcharge) || 0) + (Number(q.forkliftFee) || 0) + (Number(q.toteFee) || 0);
    const totalLine = q.toteFee
      ? `total = delivery + materials + forkliftFee + toteFee + fuelSurcharge = ${this.money(preTax)}`
      : `total = delivery + materials + forkliftFee + fuelSurcharge = ${this.money(preTax)}`;
    return [
      `Mapped one-way drive: ${q.oneWayMin.toFixed(1)} min`,
      `Trip mode: ${tripLabel} → ${q.tripMin.toFixed(1)} min road time`,
      `Drive after buffer${dumpNote}: ${q.adjustedDriveMin.toFixed(1)} min`,
      `Yard load + site unload: ${q.siteMin.toFixed(0)} min`,
      `Raw time: ${q.rawHours.toFixed(2)} hr (${this.formatHours(q.rawHours)})`,
      `Billable (min ${q.billing.minimumHours} hr, ${q.billing.incrementMinutes}-min steps): ${q.billableHours.toFixed(2)} hr @ $${q.rate}/hr`,
      `Delivery fee: ${this.money(q.deliveryFee)}`,
      `Materials: ${this.money(q.materialsTotal)}`,
      q.forkliftFee ? `Forklift / extra fee: ${this.money(q.forkliftFee)}` : `Forklift / extra fee: ${this.money(0)}`,
      q.toteFee ? `Tote / bagging fee: ${this.money(q.toteFee)}` : null,
      this.fuelSentence(q),
      totalLine,
      q.tax ? `Tax: ${this.money(q.tax)}` : null,
      `TOTAL: ${this.money(q.total)}`,
    ].filter(Boolean).join("\n");
  },
};
