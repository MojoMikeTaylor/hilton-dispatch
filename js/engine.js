/* Hilton Dispatch — rate + time engine
   Formula (printed on every invoice so accounting can reconcile):

   1. Mapped one-way drive minutes          = T_one
   2. Trip minutes                          = (roundtrip ? T_one * 2 : T_one)
                                              Each load is its own trip. A passed load count does not multiply it.
   3. Road buffer                           = dump or transfer ? tripMinutes * 1.08 : tripMinutes
                                              (8% only on road time — big truck is slower)
   4. Site minutes                          = loadMinutes + unloadMinutes, once per load
                                              Extra site minutes and extra wait minutes are 0.
   5. Raw hours                             = (adjustedDrive + site) / 60
   6. Billable hours                        = max(minimumHours, ceil to incrementMinutes)
   7. Delivery fee                          = billableHours * ($90 small 550 | $150 dump | $160 transfer | $160 forklift)
                                              Forklift from yard medford (5 South Stage) adds $40 inside this fee.
                                              Named soils, Willow Creek, and store bulk sold by the yard may be
                                              several loads; the invoice delivery fee is the sum. By-the-pound
                                              items, flagstone, boulders, and forklift stone stay one load.
   8. Materials                             = Σ qty * unitPrice (once, not once per load)
   9. Forklift / extra fee                  = ticket dollars (default 0). Not the South Stage adder.
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

  // Yard id medford is 5 South Stage. The adder is inside the delivery fee.
  SOUTH_STAGE_YARD: "medford",
  SOUTH_STAGE_FORKLIFT: 40,

  // Bobtail / transfer capacities in yards. Willow Creek rows are priced per ton;
  // the load split uses the quantity number as yards, the same way the desk says "30 yd".
  // bulk-yard is the default for store products sold by the yard. It is not a product id.
  LOAD_CAPS: {
    topsoil: { bobtail: 12, transfer: 24, pile: "topsoil" },
    "forest-loam": { bobtail: 15, transfer: 30, pile: "loam" },
    "topsoil-plus": { bobtail: 15, transfer: 30, pile: "loam" },
    willow: { bobtail: 10, transfer: 20, pile: "willow" },
    "bulk-yard": { bobtail: 10, transfer: 20, pile: "bulk-yard" },
  },

  normText(s) {
    return String(s || "").trim().toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ");
  },

  normPhone(s) {
    return String(s || "").replace(/\D/g, "");
  },

  // Store soils by their book id. A lookalike name with a different id is not these soils.
  // Willow Creek quarry rock is the pit book: book willow, source quarry, truckload_only,
  // an id starting with q-, or a Willow Creek category.
  // Any other store product sold by the yard uses the 20/10 bulk split.
  // By-the-pound items, flagstone, boulders, and forklift stone do not.
  isWillow(material) {
    if (!material) return false;
    if (material.source === "quarry" || material.truckload_only || material.book === "willow") return true;
    if (String(material.id || "").indexOf("q-") === 0) return true;
    return String(material.category || "").indexOf("Willow Creek") >= 0;
  },

  isBulkYard(material) {
    if (!material || material.requires_forklift) return false;
    const unit = this.normText(material.unit);
    if (unit !== "yd" && unit !== "yard" && unit !== "yards") return false;
    if (material.book === "flagstone" || material.book === "willow") return false;
    if (material.source === "quarry" || material.truckload_only) return false;
    const cat = String(material.category || "");
    const name = String(material.name || "");
    if (cat.indexOf("Flagstone") >= 0 || cat.indexOf("Willow Creek") >= 0) return false;
    if (/boulder/i.test(cat) || /boulder/i.test(name)) return false;
    // A bare line with no catalog id and no store or aggregates book stays one load
    // on the selected truck. Named soils without an id are handled above.
    const book = material.book;
    if (book === "store" || book === "boulders") return true;
    return !!String(material.id || "");
  },

  capacityFor(material) {
    if (!material) return null;
    const id = String(material.id || "");
    if (this.LOAD_CAPS[id]) return this.LOAD_CAPS[id];
    if (this.isWillow(material)) return this.LOAD_CAPS.willow;
    if (!id) {
      const name = this.normText(material.name);
      const named = {
        topsoil: this.LOAD_CAPS.topsoil,
        "forest loam": this.LOAD_CAPS["forest-loam"],
        "topsoil plus": this.LOAD_CAPS["topsoil-plus"],
      };
      if (named[name] && (material.book === "store" || material.category === "Soils")) return named[name];
    }
    if (this.isBulkYard(material)) return this.LOAD_CAPS["bulk-yard"];
    return null;
  },

  // Full transfers first. A remainder that fits a bobtail is one small load; otherwise another transfer.
  planQuantity(qty, cap) {
    const q = Math.round((Number(qty) || 0) * 1000) / 1000;
    const transferCap = cap && Number(cap.transfer);
    const bobtailCap = cap && Number(cap.bobtail);
    if (!(q > 0) || !(transferCap > 0) || !(bobtailCap > 0)) return [];
    const full = Math.floor((q + 1e-9) / transferCap);
    let rem = Math.round((q - full * transferCap) * 1000) / 1000;
    if (rem < 0.001) rem = 0;
    const loads = [];
    for (let i = 0; i < full; i++) loads.push({ truck: "transfer", kind: "transfer", yards: transferCap });
    if (rem > 0) {
      if (rem <= bobtailCap + 1e-9) loads.push({ truck: "small", kind: "bobtail", yards: rem });
      else loads.push({ truck: "transfer", kind: "transfer", yards: rem });
    }
    return loads;
  },

  loadTitle(load) {
    if (!load) return "Truck";
    if (load.kind === "bobtail" || load.truck === "small") return "Bobtail";
    if (load.kind === "transfer" || load.truck === "transfer") return "Transfer";
    if (load.truck === "forklift") return "Forklift";
    if (load.truck === "dump") return "Dump";
    return "Truck";
  },

  yardText(n) {
    const v = Math.round(Number(n) * 1000) / 1000;
    if (!isFinite(v)) return "";
    return String(v);
  },

  // "Transfer 20 + Bobtail 10" — yards on each load so the board can allot time.
  splitLabel(loads) {
    return (loads || []).map((load) => {
      const title = this.loadTitle(load);
      if (!load || load.yards == null || load.yards === "") return title;
      return title + " " + this.yardText(load.yards);
    }).join(" + ");
  },

  // Same capacity class is one pile (all pit rock together, Forest Loam with Topsoil Plus,
  // store by-the-yard bulk together). Pit rock does not pile with store bulk.
  // By-the-pound items, flagstone, boulders, and forklift stone do not add a load.
  planMaterials(materials, selectedTruck) {
    const groups = new Map();
    const order = [];
    (materials || []).forEach((material) => {
      const cap = this.capacityFor(material);
      if (!cap) return;
      const key = cap.pile || (cap.bobtail + "/" + cap.transfer);
      if (!groups.has(key)) {
        groups.set(key, { cap, qty: 0 });
        order.push(key);
      }
      groups.get(key).qty += Number(material.qty) || 0;
    });
    const loads = [];
    order.forEach((key) => {
      this.planQuantity(groups.get(key).qty, groups.get(key).cap).forEach((load) => loads.push(load));
    });
    if (!loads.length) {
      return {
        planned: false,
        loads: [{ truck: selectedTruck || "dump", kind: "", yards: null }],
        split: "",
      };
    }
    return { planned: true, loads, split: this.splitLabel(loads) };
  },

  priceLoad({ oneWaySeconds, truck, billing, yardId, yards, kind }) {
    const b = billing || {};
    const oneWayMin = Math.max(0, (Number(oneWaySeconds) || 0) / 60);
    const tripFactor = (b.tripMode || "roundtrip") === "oneway" ? 1 : 2;
    const tripMin = oneWayMin * tripFactor;
    const isDump = truck === "dump";
    const isTransfer = truck === "transfer";
    const isForklift = truck === "forklift";
    const multiplier = (isDump || isTransfer) ? (Number(b.dumpTimeMultiplier) || 1.08) : 1;
    const adjustedDriveMin = tripMin * multiplier;
    const siteMin = (Number(b.loadMinutes) || 0) + (Number(b.unloadMinutes) || 0);
    const rawMin = adjustedDriveMin + siteMin;
    const rawHours = rawMin / 60;
    const billableHours = this.roundUpHours(rawHours, b.minimumHours, b.incrementMinutes);
    const rate = isDump
      ? Number(b.dumpRate) || 150
      : isTransfer
        ? Number(b.transferRate) || 160
        : isForklift
          ? Number(b.forkliftRate) || Number(b.dumpRate) || 160
          : Number(b.smallRate) || 90;
    const southStage = (isForklift && yardId === this.SOUTH_STAGE_YARD) ? this.SOUTH_STAGE_FORKLIFT : 0;
    const hourlyFee = Number((billableHours * rate).toFixed(2));
    const deliveryFee = Number((hourlyFee + southStage).toFixed(2));
    return {
      truck: isDump ? "dump" : isTransfer ? "transfer" : isForklift ? "forklift" : "small",
      kind: kind || (isTransfer ? "transfer" : (!isDump && !isForklift ? "bobtail" : "")),
      yards: yards == null ? null : yards,
      oneWayMin,
      tripFactor,
      tripMin,
      isDump,
      isTransfer,
      isForklift,
      multiplier,
      adjustedDriveMin,
      siteMin,
      rawMin,
      rawHours,
      billableHours,
      rate,
      southStage,
      hourlyFee,
      deliveryFee,
    };
  },

  // One printed dispatch line per load, all under the same ticket. A single load stays one delivery row.
  dispatchLines(quote, ticketId) {
    const loads = quote && Array.isArray(quote.loads) ? quote.loads : [];
    if (loads.length < 2) return [];
    const id = ticketId == null ? "" : String(ticketId);
    return loads.map((load, i) => ({
      ticketId: id,
      index: i + 1,
      count: loads.length,
      truck: load.truck,
      deliveryFee: load.deliveryFee,
    }));
  },

  // Live quotes only. Match on name, address, or phone. Highest total is highlighted. Never a save block.
  duplicateQuotes(jobs, draft) {
    const current = draft || {};
    const name = this.normText(current.customer);
    const addr = this.normText(current.address);
    const phone = this.normPhone(current.phone);
    const self = current.id == null || current.id === "" ? "" : String(current.id);
    const matches = [];
    (jobs || []).forEach((job) => {
      if (!job || job.status !== "quote") return;
      const id = job.id == null ? "" : String(job.id);
      if (self && id === self) return;
      const jobName = this.normText(job.customer);
      const jobAddr = this.normText(job.address);
      const jobPhone = this.normPhone(job.phone);
      const nameHit = !!(name && jobName && name === jobName);
      const addrHit = !!(addr && jobAddr && addr === jobAddr);
      const phoneHit = phone.length >= 7 && jobPhone.length >= 7 && phone === jobPhone;
      if (!nameHit && !addrHit && !phoneHit) return;
      matches.push({
        id,
        customer: job.customer || "",
        address: job.address || "",
        phone: job.phone || "",
        total: Number(job.quote && job.quote.total) || 0,
        highlight: false,
      });
    });
    matches.sort((a, b) => (b.total - a.total) || String(a.id).localeCompare(String(b.id)));
    const top = matches.length ? matches[0].total : 0;
    matches.forEach((hit) => { hit.highlight = hit.total === top; });
    return matches;
  },

  quote({
    oneWaySeconds,
    truck,
    billing,
    materials,
    forkliftFee,
    toteFee,
    yardId,
  }) {
    const b = billing || {};
    const extraSite = 0;
    const extraWait = 0;
    const extra = 0;
    const fee = Math.max(0, Number(forkliftFee) || 0);
    const tote = Math.max(0, Number(toteFee) || 0);
    const plan = this.planMaterials(materials, truck);
    const priced = plan.loads.map((load) => this.priceLoad({
      oneWaySeconds,
      truck: load.truck,
      billing: b,
      yardId,
      yards: load.yards,
      kind: load.kind,
    }));
    const primary = priced[0];
    const loadCount = priced.length;
    const deliveryFee = Number(priced.reduce((s, load) => s + load.deliveryFee, 0).toFixed(2));
    const southStage = Number(priced.reduce((s, load) => s + load.southStage, 0).toFixed(2));
    const billableHours = loadCount > 1
      ? Number(priced.reduce((s, load) => s + load.billableHours, 0).toFixed(4))
      : primary.billableHours;

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

    const result = {
      oneWayMin: primary.oneWayMin,
      tripFactor: primary.tripFactor,
      loadCount,
      loads: priced,
      split: plan.split,
      planned: plan.planned,
      extra,
      extraSite,
      extraWait,
      forkliftFee: fee,
      toteFee: tote,
      southStage,
      dieselPrice: fuel.dieselPrice,
      dieselWeekOf: fuel.dieselWeekOf,
      surchargePercent: fuel.surchargePercent,
      fuelSurcharge: fuel.fuelSurcharge,
      tripMin: primary.tripMin,
      isDump: loadCount === 1 ? primary.isDump : false,
      isTransfer: loadCount === 1 ? primary.isTransfer : false,
      isForklift: loadCount === 1 ? primary.isForklift : false,
      truck: primary.truck,
      multiplier: primary.multiplier,
      adjustedDriveMin: primary.adjustedDriveMin,
      siteMin: primary.siteMin,
      rawMin: primary.rawMin,
      rawHours: primary.rawHours,
      billableHours,
      rate: primary.rate,
      deliveryFee,
      lines,
      materialsTotal,
      subtotal,
      taxRate,
      tax,
      total,
      billing: b,
    };
    result.formula = this.describe(result);
    delete result.billing;
    return result;
  },

  describe(q) {
    if (q.loads && q.loads.length > 1) return this.describeLoads(q);
    const tripLabel = q.tripFactor === 2 ? "round trip" : "one way";
    const dumpNote = q.isDump
      ? ` × ${Number(q.multiplier).toFixed(2)} dump-truck buffer`
      : q.isTransfer
        ? ` × ${Number(q.multiplier).toFixed(2)} transfer-truck buffer`
        : q.isForklift
          ? " (no dump buffer — forklift truck)"
          : " (no buffer — small truck)";
    const preTax = (Number(q.deliveryFee) || 0) + (Number(q.materialsTotal) || 0) + (Number(q.fuelSurcharge) || 0) + (Number(q.forkliftFee) || 0) + (Number(q.toteFee) || 0);
    const totalLine = q.toteFee
      ? `total = delivery + materials + forkliftFee + toteFee + fuelSurcharge = ${this.money(preTax)}`
      : `total = delivery + materials + forkliftFee + fuelSurcharge = ${this.money(preTax)}`;
    return [
      q.planned && q.split ? `${q.loadCount} ${q.loadCount === 1 ? "load" : "loads"}: ${q.split}` : null,
      `Mapped one-way drive: ${q.oneWayMin.toFixed(1)} min`,
      `Trip mode: ${tripLabel} → ${q.tripMin.toFixed(1)} min road time`,
      `Drive after buffer${dumpNote}: ${q.adjustedDriveMin.toFixed(1)} min`,
      `Yard load + site unload: ${q.siteMin.toFixed(0)} min`,
      `Raw time: ${q.rawHours.toFixed(2)} hr (${this.formatHours(q.rawHours)})`,
      `Billable (min ${q.billing.minimumHours} hr, ${q.billing.incrementMinutes}-min steps): ${q.billableHours.toFixed(2)} hr @ $${q.rate}/hr`,
      `Delivery fee: ${this.money(q.deliveryFee)}`,
      q.southStage ? `South Stage forklift ${this.money(q.southStage)} is included in the delivery fee.` : null,
      `Materials: ${this.money(q.materialsTotal)}`,
      q.forkliftFee ? `Forklift / extra fee: ${this.money(q.forkliftFee)}` : `Forklift / extra fee: ${this.money(0)}`,
      q.toteFee ? `Tote / bagging fee: ${this.money(q.toteFee)}` : null,
      this.fuelSentence(q),
      totalLine,
      q.tax ? `Tax: ${this.money(q.tax)}` : null,
      `TOTAL: ${this.money(q.total)}`,
    ].filter(Boolean).join("\n");
  },

  describeLoads(q) {
    const tripLabel = q.tripFactor === 2 ? "round trip" : "one way";
    const preTax = (Number(q.deliveryFee) || 0) + (Number(q.materialsTotal) || 0) + (Number(q.fuelSurcharge) || 0) + (Number(q.forkliftFee) || 0) + (Number(q.toteFee) || 0);
    const totalLine = q.toteFee
      ? `total = delivery + materials + forkliftFee + toteFee + fuelSurcharge = ${this.money(preTax)}`
      : `total = delivery + materials + forkliftFee + fuelSurcharge = ${this.money(preTax)}`;
    const loadLines = (q.loads || []).map((load, i) => {
      const name = load.truck === "transfer" ? "Transfer" : load.truck === "small" ? "Bobtail" : load.truck === "forklift" ? "Forklift" : "Dump";
      const buf = (load.isDump || load.isTransfer) ? `, road × ${Number(load.multiplier).toFixed(2)}` : "";
      const stage = load.southStage ? ` including ${this.money(load.southStage)} South Stage` : "";
      return `Load ${i + 1} of ${q.loads.length}: ${name}${buf}, ${load.billableHours.toFixed(2)} hr @ $${load.rate}/hr = ${this.money(load.deliveryFee)}${stage}`;
    });
    return [
      `${q.loadCount} loads: ${q.split}`,
      `Mapped one-way drive: ${q.oneWayMin.toFixed(1)} min (${tripLabel}, each load)`,
    ].concat(loadLines, [
      `Delivery fee (sum of loads): ${this.money(q.deliveryFee)}`,
      `Materials: ${this.money(q.materialsTotal)}`,
      q.forkliftFee ? `Forklift / extra fee: ${this.money(q.forkliftFee)}` : `Forklift / extra fee: ${this.money(0)}`,
      q.toteFee ? `Tote / bagging fee: ${this.money(q.toteFee)}` : null,
      this.fuelSentence(q),
      totalLine,
      q.tax ? `Tax: ${this.money(q.tax)}` : null,
      `TOTAL: ${this.money(q.total)}`,
    ]).filter(Boolean).join("\n");
  },
};
