/* Hilton Dispatch — yards, rates, and the 2026 store price sheet.
   Source: Store Price Sheet 2026.xlsx dated 2026-08-26.
   Decorative rock / boulders on that sheet are priced per pound. Bark, soils, and
   most aggregates are per yard. Quarry and flagstone seed at $0. Edit in Material Book — it saves on the server. */

window.HD_DEFAULTS = {
  company: {
    name: "Hilton Landscape Supply",
    dba: "Hilton Dispatch",
    tagline: "Southern Oregon's Finest Since 1956",
    email: "info@hiltonlandscaping.com",
    phone: "1-800-632-1510",
    accountingEmail: "dispatch@hiltonlandscaping.com",
    website: "hiltonlandscapesupply.com",
  },
  security: {
    pin: "1956",
    adminPassword: "4357",
  },
  billing: {
    dumpRate: 160,
    smallRate: 100,
    forkliftRate: 160,
    dumpTimeMultiplier: 1.08,
    tripMode: "roundtrip",
    minimumHours: 1,
    incrementMinutes: 15,
    loadMinutes: 15,
    unloadMinutes: 15,
    taxRate: 0,
  },
  maps: {
    googleKey: "",
  },
  catalogConfirmed: true,
  priceSheet: "2026-08-26",
  yards: [
    {
      id: "cp",
      name: "Central Point Yard",
      address: "8087 Blackwell Rd, Central Point, OR 97502",
      phone: "541-664-3374",
      lat: 42.3916,
      lng: -122.9124,
    },
    {
      id: "medford",
      name: "Medford Yard",
      address: "5 S Stage Rd, Medford, OR 97501",
      phone: "541-600-2640",
      lat: 42.3266,
      lng: -122.8747,
    },
    {
      id: "willow",
      name: "Willow Creek Aggregate",
      address: "4825 Old Stage Rd, Central Point, OR 97502",
      phone: "541-664-1254",
      lat: 42.4089,
      lng: -122.9398,
    },
  ],
  materials: [
    { id: "fresh-fines", name: "Fresh Fines Bark", category: "Bark", unit: "yd", price: 34 },
    { id: "dark-fines", name: "Dark Fines", category: "Bark", unit: "yd", price: 34 },
    { id: "multi-walk-on", name: "Multi Bark / Walk On (Fir)", category: "Bark", unit: "yd", price: 34 },
    { id: "gorilla-hair", name: "Gorilla Hair (Redwood)", category: "Bark", unit: "yd", price: 20 },
    { id: "redwood-fines", name: "Redwood Fines", category: "Bark", unit: "yd", price: 25 },
    { id: "mini-pebble", name: "Mini Pebble (Fir)", category: "Bark", unit: "yd", price: 40 },
    { id: "small-nugget", name: "Small Nugget (Fir)", category: "Bark", unit: "yd", price: 40 },
    { id: "medium-nugget", name: "Medium Nugget (Fir)", category: "Bark", unit: "yd", price: 40 },
    { id: "mulch", name: "Mulch", category: "Bark", unit: "yd", price: 33 },
    { id: "fir-chips", name: "Fir Chips", category: "Bark", unit: "yd", price: 34 },
    { id: "playground-chips", name: "Playground Chips", category: "Bark", unit: "yd", price: 44 },
    { id: "dark-hemlock", name: "Dark Hemlock (Sliverless)", category: "Bark", unit: "yd", price: 70 },
    { id: "red-hemlock", name: "Red Hemlock (Sliverless)", category: "Bark", unit: "yd", price: 70 },
    { id: "forest-floor", name: "Forest Floor", category: "Bark", unit: "yd", price: 15 },

    { id: "fresh-sawdust", name: "Fresh Sawdust", category: "Sawdust", unit: "yd", price: 30 },
    { id: "aged-sawdust", name: "Aged Sawdust", category: "Sawdust", unit: "yd", price: 30 },
    { id: "horse-bedding", name: "Horse Bedding", category: "Sawdust", unit: "yd", price: 15 },

    { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 25 },
    { id: "forest-loam", name: "Forest Loam", category: "Soils", unit: "yd", price: 27 },
    { id: "topsoil-plus", name: "Topsoil Plus", category: "Soils", unit: "yd", price: 34 },
    { id: "compost-omri", name: "Compost (OMRI Listed)", category: "Soils", unit: "yd", price: 35 },
    { id: "compost-plus", name: "Compost Plus", category: "Soils", unit: "yd", price: 38 },
    { id: "ground-compost", name: "Ground Compost", category: "Soils", unit: "yd", price: 40 },
    { id: "compost-plus-rhyolite", name: "Compost Plus w/ Rhyolite", category: "Soils", unit: "yd", price: 50 },
    { id: "gard-n-grow", name: "Gard-N-Grow", category: "Soils", unit: "yd", price: 55 },
    { id: "chets-mix", name: "Chet's Mix", category: "Soils", unit: "yd", price: 55 },
    { id: "super-chets", name: "Super Chet's Mix", category: "Soils", unit: "yd", price: 60 },
    { id: "living-soil", name: "Living Soil", category: "Soils", unit: "yd", price: 86 },
    { id: "wild-scenic-rhyolite", name: "Wild-N-Scenic w/ Rhyolite", category: "Soils", unit: "yd", price: 70 },
    { id: "wild-scenic", name: "Wild-N-Scenic", category: "Soils", unit: "yd", price: 80 },
    { id: "clay-buster", name: "Clay Buster", category: "Soils", unit: "yd", price: 50 },
    { id: "worm-castings", name: "Worm Castings", category: "Soils", unit: "yd", price: 375 },

    { id: "red-cinder", name: "Red Cinder (1 1/2\" or 3/8\" minus)", category: "Rock / yard", unit: "yd", price: 40 },
    { id: "black-cinder", name: "Black Cinder", category: "Rock / yard", unit: "yd", price: 78 },
    { id: "fill-sand", name: "Fill Sand", category: "Rock / yard", unit: "yd", price: 48 },
    { id: "pea-gravel", name: "Pea Gravel", category: "Rock / yard", unit: "yd", price: 36 },
    { id: "round-drain", name: "3/4\" Round – 1 1/2\" Drain", category: "Rock / yard", unit: "yd", price: 36 },
    { id: "quarter-10", name: "1/4\" x #10", category: "Rock / yard", unit: "yd", price: 46 },
    { id: "crushed-clean-river", name: "Crushed Clean River (3/4\"x1/2\" or 1/4\"x1/2\")", category: "Rock / yard", unit: "yd", price: 48 },
    { id: "silver-fines", name: "Silver Fines", category: "Rock / yard", unit: "yd", price: 45 },
    { id: "three-quarter-minus", name: "3/4\" Minus", category: "Rock / yard", unit: "yd", price: 28 },
    { id: "clean-granite", name: "Clean Granite (1 1/2\"–3/4\")", category: "Rock / yard", unit: "yd", price: 45 },
    { id: "clean-granite-38", name: "3/8\" Clean Granite", category: "Rock / yard", unit: "yd", price: 65 },
    { id: "dg", name: "DG (Screened Granite)", category: "Rock / yard", unit: "yd", price: 28 },
    { id: "rogue-valley-gold", name: "Rogue Valley Gold", category: "Rock / yard", unit: "yd", price: 65 },
    { id: "blue-ridge-yd", name: "Blue Ridge (1 1/2\", 3/4\", 3/4\" minus)", category: "Rock / yard", unit: "yd", price: 50 },
    { id: "rhyolite", name: "Rhyolite (Pumice)", category: "Rock / yard", unit: "yd", price: 45 },

    { id: "beach-sand", name: "Beach Sand", category: "Rock / lb", unit: "lb", price: 0.10 },
    { id: "river-cobble", name: "River Cobblestone", category: "Rock / lb", unit: "lb", price: 0.10 },
    { id: "salt-pepper", name: "Salt & Pepper", category: "Rock / lb", unit: "lb", price: 0.12 },
    { id: "aspen-mountain", name: "Aspen Mountain", category: "Rock / lb", unit: "lb", price: 0.14 },
    { id: "sierra-desert", name: "Sierra Desert", category: "Rock / lb", unit: "lb", price: 0.14 },
    { id: "dolomite", name: "Dolomite 1 1/2\"–3\"", category: "Rock / lb", unit: "lb", price: 0.45 },
    { id: "pami-pebble", name: "Pami Pebble", category: "Rock / lb", unit: "lb", price: 0.16 },
    { id: "white-silica", name: "White Silica", category: "Rock / lb", unit: "lb", price: 0.18 },
    { id: "jade-green", name: "Jade Green", category: "Rock / lb", unit: "lb", price: 0.20 },
    { id: "palm-desert", name: "Palm Desert Gold", category: "Rock / lb", unit: "lb", price: 0.30 },
    { id: "ivans-gold", name: "Ivans Gold 3/4\" or 1 1/2\"", category: "Rock / lb", unit: "lb", price: 0.18 },
    { id: "mexi-pebble", name: "Mexi Pebble", category: "Rock / lb", unit: "lb", price: 0.30 },
    { id: "mexi-buttons", name: "Mexi Buttons", category: "Rock / lb", unit: "lb", price: 0.55 },

    { id: "boulder-granite", name: "Large Granite Boulders", category: "Boulders / lb", unit: "lb", price: 0.10 },
    { id: "boulder-moss", name: "Moss Rock Boulders", category: "Boulders / lb", unit: "lb", price: 0.15 },
    { id: "boulder-blue-ridge", name: "Blue Ridge Boulders", category: "Boulders / lb", unit: "lb", price: 0.18 },
    { id: "boulder-sierra", name: "Sierra Moonlite Purple Boulders", category: "Boulders / lb", unit: "lb", price: 0.25 },
    { id: "boulder-basalt", name: "Basalt Boulders", category: "Boulders / lb", unit: "lb", price: 0.25 },

    { id: "guard-8", name: "Guard Rail Post 8\"x8\"x8'", category: "Site materials", unit: "ea", price: 22 },
    { id: "guard-6", name: "Guard Rail Post 8\"x8\"x6'", category: "Site materials", unit: "ea", price: 12 },
    { id: "eco-block", name: "Eco Blocks (check availability)", category: "Site materials", unit: "ea", price: 125 },
    { id: "k-rail", name: "K-Rails", category: "Site materials", unit: "ea", price: 500 },

    { id: "q-dg-38-gold", name: "Decomposed Granite Screened 3/8\" minus gold", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-dg-58-gold", name: "Decomposed Granite Screened 5/8\" minus gold", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-cs-38-silver", name: "Crushed Screened Granite 3/8\" minus silver", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-34-minus", name: "3/4\" minus", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-15-minus", name: "1 1/2\" minus", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-2-minus", name: "2\" minus", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-4-minus", name: "4\" minus", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-jaw-run", name: "Jaw Run", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-ogb", name: "Open Graded Base", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-38-12-clean", name: "3/8-1/2\" clean", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-34-12-clean", name: "3/4-1/2\" clean", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-34-1-clean", name: "3/4-1\" clean", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-1-4-clean", name: "1-4\" clean", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-4-8-clean", name: "4-8\" clean", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-8-12-clean", name: "8-12\" clean", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-rip-rap", name: "Rip Rap", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },
    { id: "q-deco-rip-rap", name: "Deco Rip Rap", category: "Willow Creek quarry", unit: "ton", price: 0, source: "quarry", truckload_only: true },

    { id: "ns-cherokee", name: "Cherokee (flat stack)", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-sunset-charcoal", name: "Sunset Charcoal (flat stack)", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-az-chocolate-standup", name: "Arizona Chocolate Stand-Up", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-az-roeder-standup", name: "Arizona Roeder Stand-Up", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-az-rose-standup", name: "Arizona Rose Stand-Up", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-ct-blue-standup", name: "Connecticut Blue Stand-Up", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-copper-ridge-standup", name: "Copper Ridge Stand-Up", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-ok-blue-standup", name: "Oklahoma Blue Stand-Up", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-az-gold-tumbled", name: "Arizona Gold Tumbled", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-ct-blue-tumbled", name: "Connecticut Blue Tumbled", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-ok-brown-tread", name: "Oklahoma Brown Tread Slab", category: "Natural Stone / Flagstone", unit: "lb", price: 0, requires_forklift: true },
    { id: "ns-flagstone-pallet", name: "Flagstone pallet (describe on ticket)", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
    { id: "ns-natural-stone-pallet", name: "Natural stone pallet (describe on ticket)", category: "Natural Stone / Flagstone", unit: "pallet", price: 0, requires_forklift: true },
  ],
};

window.HDCatalog = {
  isQuarry(m) {
    return !!(m && (m.source === "quarry" || m.truckload_only));
  },
  isStone(m) {
    return !!(m && (m.requires_forklift || (m.category || "").indexOf("Flagstone") >= 0));
  },
  isRetail(m) {
    return !this.isQuarry(m) && !this.isStone(m);
  },
  mergeMissing(existing) {
    const have = new Set((existing || []).map((m) => m.id));
    const out = (existing || []).slice();
    (window.HD_DEFAULTS.materials || []).forEach((def) => {
      if (!have.has(def.id)) out.push(JSON.parse(JSON.stringify(def)));
    });
    return out;
  },
  reloadRetailKeepExtras(existing) {
    const keep = (existing || []).filter((m) => this.isQuarry(m) || this.isStone(m));
    const retail = window.HD_DEFAULTS.materials.filter((m) => this.isRetail(m));
    const extras = window.HD_DEFAULTS.materials.filter((m) => this.isQuarry(m) || this.isStone(m));
    const out = JSON.parse(JSON.stringify(retail));
    extras.forEach((def) => {
      const prev = keep.find((k) => k.id === def.id);
      out.push(prev ? prev : JSON.parse(JSON.stringify(def)));
    });
    keep.forEach((m) => {
      if (!out.some((x) => x.id === m.id)) out.push(m);
    });
    return out;
  },
};
