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
  10. surchargePercent                      = max(0, (dieselThisWeek - baseline) / baseline)
  11. fuelSurcharge                         = deliveryFee * surchargePercent
  12. Tax                                   = (delivery + materials + forkliftFee + fuelSurcharge) * taxRate
                                              (OR default 0)
  13. total                                 = delivery + materials + forkliftFee + fuelSurcharge + tax
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
    const baseRaw = Number(b.dieselBaseline);
    const dieselPrice = isFinite(dieselRaw) ? dieselRaw : null;
    const dieselBaseline = isFinite(baseRaw) ? baseRaw : null;
    const dieselWeekOf = b.dieselWeekOf || "";
    let surchargePercent = 0;
    if (dieselPrice != null && dieselBaseline != null && dieselBaseline > 0) {
      const dieselMilli = Math.round(dieselPrice * 1000);
      const baseMilli = Math.round(dieselBaseline * 1000);
      if (baseMilli > 0) surchargePercent = Math.max(0, (dieselMilli - baseMilli) / baseMilli);
    }
    const fuelSurcharge = Number(((Number(deliveryFee) || 0) * surchargePercent).toFixed(2));
    return { dieselPrice, dieselBaseline, dieselWeekOf, surchargePercent, fuelSurcharge };
  },

  quote({
    oneWaySeconds,
    truck,
    billing,
    materials,
    forkliftFee,
  }) {
    const b = billing || {};
    const loadCount = 1;
    const extraSite = 0;
    const extraWait = 0;
    const extra = 0;
    const fee = Math.max(0, Number(forkliftFee) || 0);
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
    const subtotal = Number((deliveryFee + materialsTotal + fee + fuel.fuelSurcharge).toFixed(2));
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
      dieselPrice: fuel.dieselPrice,
      dieselBaseline: fuel.dieselBaseline,
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
        materialsTotal, forkliftFee: fee, fuelSurcharge: fuel.fuelSurcharge,
        surchargePercent: fuel.surchargePercent, dieselPrice: fuel.dieselPrice,
        dieselBaseline: fuel.dieselBaseline, dieselWeekOf: fuel.dieselWeekOf,
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
    const week = this.weekLabel(q.dieselWeekOf) || "—";
    const preTax = (Number(q.deliveryFee) || 0) + (Number(q.materialsTotal) || 0) + (Number(q.forkliftFee) || 0) + (Number(q.fuelSurcharge) || 0);
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
      `EIA week of ${week} · West Coast PADD 5 on-highway diesel, all types · ${this.dollarsPerGal(q.dieselPrice, 3)}/gal · baseline ${this.dollarsPerGal(q.dieselBaseline, 2)}/gal`,
      `surchargePercent = max(0, (dieselThisWeek - baseline) / baseline) = ${this.percentText(q.surchargePercent)}`,
      `fuelSurcharge = deliveryFee * surchargePercent = ${this.money(q.fuelSurcharge)}`,
      `total = delivery + materials + forkliftFee + fuelSurcharge = ${this.money(preTax)}`,
      q.tax ? `Tax: ${this.money(q.tax)}` : null,
      `TOTAL: ${this.money(q.total)}`,
    ].filter(Boolean).join("\n");
  },
};
