/* Hilton Dispatch — yards, rates, and the materials book.
   Store prices: Store Price Sheet 2026 (2026-08-26) plus Olivia Oct 31 sized POS rows.
   2026-11-05 ops call: class truck caps live in the engine, transfer-only soil prices
   sit on the three soil rows, Willow Creek fill dirt is $6/ton, and the fee lines
   (tote bagging / spread / additional service, $5 env per WC load, $1/ton WC fuel)
   are not material prices. Decorative rock is priced per pound. Quarry stays tons. */

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
    pin: "",
    adminPassword: "",
  },
  billing: {
    smallRate: 90,
    dumpRate: 150,
    transferRate: 160,
    forkliftRate: 160,
    dumpTimeMultiplier: 1.08,
    tripMode: "roundtrip",
    minimumHours: 1,
    incrementMinutes: 15,
    loadMinutes: 15,
    unloadMinutes: 15,
    taxRate: 0,
    dieselPrice: 7.456,
    dieselBaseline: 4,
    dieselWeekOf: "2026-09-21",
    surchargePercent: 0,
  },
  maps: {
    googleKey: "",
  },
  catalogConfirmed: true,
  priceSheet: "2026-08-26",
  yards: [
    {
      id: "cp",
      name: "Hilton Landscape Supply (Mothership)",
      address: "8087 Blackwell Road, Central Point, Oregon 97502",
      phone: "541-664-3374",
      lat: 42.3916,
      lng: -122.9124,
    },
    {
      id: "medford",
      name: "Hilton Landscape Supply (Phoenix) #2",
      address: "5 South Stage Road, Medford, Oregon 97501",
      phone: "541-600-2640",
      lat: 42.3266,
      lng: -122.8747,
    },
    {
      id: "willow",
      name: "Willow Creek Aggregate",
      address: "4825 Old Stage Road, Central Point, Oregon 97502",
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

    { id: "topsoil", name: "Topsoil", category: "Soils", unit: "yd", price: 25, transferPrice: 16 },
    { id: "forest-loam", name: "Forest Loam", category: "Soils", unit: "yd", price: 27, transferPrice: 20 },
    { id: "topsoil-plus", name: "Topsoil Plus", category: "Soils", unit: "yd", price: 34, transferPrice: 26 },
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

    { id: "red-cinder-112", name: "Red Cinder 1 1/2\"", category: "Rock / yard", unit: "yd", price: 40 },
    { id: "red-cinder-34", name: "Red Cinder 3/4\"", category: "Rock / yard", unit: "yd", price: 40 },
    { id: "red-cinder-fines", name: "Red Cinder Fines", category: "Rock / yard", unit: "yd", price: 40 },
    { id: "red-cinder-38-minus", name: "Red Cinder 3/8\" minus", category: "Rock / yard", unit: "yd", price: 40 },
    { id: "black-cinder-112", name: "Black Cinder 1 1/2\"", category: "Rock / yard", unit: "yd", price: 95 },
    { id: "black-cinder-34", name: "Black Cinder 3/4\"", category: "Rock / yard", unit: "yd", price: 78 },
    { id: "fill-sand", name: "Fill Sand", category: "Rock / yard", unit: "yd", price: 48 },
    { id: "pea-gravel", name: "3/8 Pea Gravel", category: "Rock / yard", unit: "yd", price: 36 },
    { id: "round-drain-34", name: "3/4\" Round drain", category: "Rock / yard", unit: "yd", price: 36 },
    { id: "drain-112", name: "1 1/2\" Drain", category: "Rock / yard", unit: "yd", price: 36 },
    { id: "quarter-10", name: "1/4\" x #10", category: "Rock / yard", unit: "yd", price: 46 },
    { id: "crushed-clean-river-34", name: "Crushed Clean River 3/4\"x1/2\"", category: "Rock / yard", unit: "yd", price: 48 },
    { id: "crushed-clean-river-14", name: "Crushed Clean River 1/4\"x1/2\"", category: "Rock / yard", unit: "yd", price: 48 },
    { id: "silver-fines", name: "Silver Fines", category: "Rock / yard", unit: "yd", price: 45 },
    { id: "three-quarter-minus", name: "3/4\" Minus", category: "Rock / yard", unit: "yd", price: 28 },
    { id: "clean-granite-112", name: "Clean Granite 1 1/2\"", category: "Rock / yard", unit: "yd", price: 45 },
    { id: "clean-granite-34", name: "Clean Granite 3/4\"", category: "Rock / yard", unit: "yd", price: 45 },
    { id: "clean-granite-38", name: "3/8\" Clean Granite", category: "Rock / yard", unit: "yd", price: 65 },
    { id: "dg", name: "DG (Screened Granite)", category: "Rock / yard", unit: "yd", price: 28 },
    { id: "rogue-valley-gold", name: "Rogue Valley Gold", category: "Rock / yard", unit: "yd", price: 65 },
    { id: "blue-ridge-112", name: "Blue Ridge 1 1/2\"", category: "Rock / yard", unit: "yd", price: 50 },
    { id: "blue-ridge-34", name: "Blue Ridge 3/4\"", category: "Rock / yard", unit: "yd", price: 50 },
    { id: "blue-ridge-34-minus", name: "Blue Ridge 3/4\" minus", category: "Rock / yard", unit: "yd", price: 50 },
    { id: "rhyolite", name: "Rhyolite (Pumice)", category: "Rock / yard", unit: "yd", price: 45 },

    { id: "beach-sand", name: "Beach Sand", category: "Rock / lb", unit: "lb", price: 0.10 },
    { id: "river-cobble", name: "River Cobblestone", category: "Rock / lb", unit: "lb", price: 0.10 },
    { id: "dolomite", name: "Dolomite 1 1/2\"–3\"", category: "Rock / lb", unit: "lb", price: 0.45 },
    { id: "white-silica", name: "White Silica", category: "Rock / lb", unit: "lb", price: 0.18 },
    { id: "ivans-gold-34", name: "Ivans Gold 3/4\"", category: "Rock / lb", unit: "lb", price: 0.18 },
    { id: "ivans-gold-112", name: "Ivans Gold 1 1/2\"", category: "Rock / lb", unit: "lb", price: 0.18 },

    { id: "boulder-granite", name: "Large Granite Boulders", category: "Boulders / lb", unit: "lb", price: 0.10 },
    { id: "boulder-moss", name: "Moss Rock Boulders", category: "Boulders / lb", unit: "lb", price: 0.15 },
    { id: "boulder-blue-ridge", name: "Blue Ridge Boulders", category: "Boulders / lb", unit: "lb", price: 0.18 },
    { id: "boulder-sierra", name: "Sierra Moonlite Purple Boulders", category: "Boulders / lb", unit: "lb", price: 0.25 },
    { id: "boulder-basalt", name: "Basalt Boulders", category: "Boulders / lb", unit: "lb", price: 0.25 },

    { id: "guard-8", name: "Guard Rail Post 8\"x8\"x8'", category: "Site materials", unit: "ea", price: 22 },
    { id: "guard-6", name: "Guard Rail Post 8\"x8\"x6'", category: "Site materials", unit: "ea", price: 12 },
    { id: "eco-block", name: "Eco Blocks (check availability)", category: "Site materials", unit: "ea", price: 125 },
    { id: "k-rail", name: "K-Rails", category: "Site materials", unit: "ea", price: 500 },

    { id: "fs-flat-az-roeder", name: "Az Roeder — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.20, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-az-rose", name: "Az Rose — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.20, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-az-chocolate", name: "Az Chocolate — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.26, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-birch-creek", name: "Birch Creek — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-cabinet-ridge", name: "Cabinet Ridge — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-cherokee", name: "Cherokee — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-copper-ridge", name: "Copper Ridge — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-ok-blue", name: "Oklahoma Blue — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-ok-brown", name: "Oklahoma Brown — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-oregon-rustic", name: "Oregon Rustic — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-sunset-charcoal", name: "Sunset Charcoal — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-sunset-gold", name: "Sunset Gold — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-sunset-silver", name: "Sunset Silver — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-sunset-white", name: "Sunset White — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-sockeye", name: "Sockeye — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-indian-paintbrush", name: "Indian Paintbrush — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-flat-stampede", name: "Stampede — flat stack 3/4\"-1 1/2\"", category: "Flagstone / flat stack", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },

    { id: "fs-ledge-az-roeder", name: "Az Roeder — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-az-rose", name: "Az Rose — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-az-chocolate", name: "Az Chocolate — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-birch-creek", name: "Birch Creek — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-cabinet-ridge", name: "Cabinet Ridge — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-cherokee", name: "Cherokee — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-copper-ridge", name: "Copper Ridge — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-ibex", name: "Ibex — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-ok-blue", name: "Oklahoma Blue — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.30, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-ok-brown", name: "Oklahoma Brown — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.30, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-oregon-rustic", name: "Oregon Rustic — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.25, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-honey", name: "Honey Ledge", category: "Flagstone / ledge", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-ledge-sunset-silver", name: "Sunset Silver — ledge stone", category: "Flagstone / ledge", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },

    { id: "fs-tread-cabinet-ridge", name: "Cabinet Ridge — stair tread", category: "Flagstone / stair tread", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-tread-sunset-silver", name: "Sunset Silver — stair tread", category: "Flagstone / stair tread", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-tread-sunset-white", name: "Sunset White — stair tread", category: "Flagstone / stair tread", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-tread-ok-brown", name: "Oklahoma Brown — stair tread", category: "Flagstone / stair tread", unit: "lb", price: 0.38, book: "flagstone", requires_forklift: true },
    { id: "fs-tread-ok-blue", name: "Oklahoma Blue — stair tread", category: "Flagstone / stair tread", unit: "lb", price: 0.38, book: "flagstone", requires_forklift: true },

    { id: "fs-tumbled-az-chocolate", name: "Az Chocolate — tumbled", category: "Flagstone / tumbled", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-tumbled-az-gold", name: "Az Gold — tumbled", category: "Flagstone / tumbled", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-tumbled-az-roeder", name: "Az Roeder — tumbled", category: "Flagstone / tumbled", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-tumbled-az-rose", name: "Az Rose — tumbled", category: "Flagstone / tumbled", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-tumbled-conn-blue", name: "Conn Blue — tumbled", category: "Flagstone / tumbled", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-tumbled-sunset-gold-so", name: "Sunset Gold — tumbled (special order)", category: "Flagstone / tumbled", unit: "lb", price: 0, book: "flagstone", requires_forklift: true, special: true },
    { id: "fs-tumbled-sunset-silver-so", name: "Sunset Silver — tumbled (special order)", category: "Flagstone / tumbled", unit: "lb", price: 0, book: "flagstone", requires_forklift: true, special: true },

    { id: "fs-stand-az-chocolate", name: "Az Chocolate — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-az-roeder", name: "Az Roeder — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-az-rose", name: "Az Rose — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.22, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-birch-creek", name: "Birch Creek — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-cabinet-ridge", name: "Cabinet Ridge — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-cherokee", name: "Cherokee — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-copper-ridge", name: "Copper Ridge — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.32, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-conn-blue", name: "Full Range Conn Blue — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.37, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-ok-brown", name: "Oklahoma Brown — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.37, book: "flagstone", requires_forklift: true },
    { id: "fs-stand-ok-blue", name: "Oklahoma Blue — 1\"-2\" stand up", category: "Flagstone / stand up", unit: "lb", price: 0.37, book: "flagstone", requires_forklift: true },

    { id: "fs-minus-copper-ridge", name: "Copper Ridge — 1\" minus stand up", category: "Flagstone / 1\" minus stand up", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-minus-sunset-gold", name: "Sunset Gold — 1\" minus stand up", category: "Flagstone / 1\" minus stand up", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-minus-sunset-silver", name: "Sunset Silver — 1\" minus stand up", category: "Flagstone / 1\" minus stand up", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },
    { id: "fs-minus-sunset-white", name: "Sunset White — 1\" minus stand up", category: "Flagstone / 1\" minus stand up", unit: "lb", price: 0.27, book: "flagstone", requires_forklift: true },

    { id: "fs-slab-buckskin", name: "Buckskin slab", category: "Flagstone / slabs", unit: "lb", price: 0.30, book: "flagstone", requires_forklift: true },
    { id: "fs-slab-oregon-rustic", name: "Oregon Rustic slab", category: "Flagstone / slabs", unit: "lb", price: 0.20, book: "flagstone", requires_forklift: true },

    { id: "fs-gator-maxx2", name: "Gator Maxx2 polymeric sand 50 lb Grey/Beige (joints to 4\")", category: "Flagstone / bags", unit: "bag", price: 60, book: "flagstone" },
    { id: "fs-gator-super", name: "Gator Super Sand 50 lb Grey/Beige (joints to 2\")", category: "Flagstone / bags", unit: "bag", price: 60, book: "flagstone" },
    { id: "ns-flagstone-pallet", name: "Flagstone pallet (describe on ticket)", category: "Flagstone", unit: "pallet", price: 0, book: "flagstone", requires_forklift: true },
    { id: "ns-natural-stone-pallet", name: "Natural stone pallet (describe on ticket)", category: "Flagstone", unit: "pallet", price: 0, book: "flagstone", requires_forklift: true },

    { id: "br-granite-38", name: "Granite 3/8\"", category: "Granite / yd", unit: "yd", price: 65, book: "boulders" },
    { id: "br-granite-34-minus", name: "Granite 3/4\" Minus", category: "Granite / yd", unit: "yd", price: 28, book: "boulders" },
    { id: "br-granite-34-12-clean", name: "Granite 3/4\"x1/2\" Clean Crushed", category: "Granite / yd", unit: "yd", price: 45, book: "boulders" },
    { id: "br-granite-15-clean", name: "1.5\" Clean Granite", category: "Granite / yd", unit: "yd", price: 45, book: "boulders" },
    { id: "br-granite-4-minus", name: "Granite 4\" Minus", category: "Granite / yd", unit: "yd", price: 28, book: "boulders" },
    { id: "br-rogue-valley-gold", name: "Rogue Valley Gold", category: "Granite / yd", unit: "yd", price: 65, book: "boulders" },
    { id: "br-dg", name: "Decomposed Granite", category: "Granite / yd", unit: "yd", price: 28, book: "boulders" },

    { id: "br-cobble-columbia-blue", name: "Columbia Blue cobble", category: "Cobble / lb", unit: "lb", price: 0.28, book: "boulders" },
    { id: "br-cobble-columbia-river", name: "Columbia River cobble", category: "Cobble / lb", unit: "lb", price: 0.22, book: "boulders" },
    { id: "br-cobble-pumice", name: "Pumice cobble", category: "Cobble / lb", unit: "lb", price: 1.00, book: "boulders" },
    { id: "br-cobble-quartz-4", name: "Quartz Creek cobble 4\"", category: "Cobble / lb", unit: "lb", price: 0.22, book: "boulders" },
    { id: "br-cobble-quartz-6", name: "Quartz Creek cobble 6\"", category: "Cobble / lb", unit: "lb", price: 0.22, book: "boulders" },
    { id: "br-cobble-river-6-10", name: "River Cobble 6-10\"", category: "Cobble / lb", unit: "lb", price: 0.10, book: "boulders" },
    { id: "br-cobble-river-10-20", name: "River Cobble 10-20\"", category: "Cobble / lb", unit: "lb", price: 0.10, book: "boulders" },
    { id: "br-cobble-pond-mix", name: "Pond Mix", category: "Cobble / lb", unit: "lb", price: 0.10, book: "boulders" },
    { id: "br-cobble-palm-desert", name: "Palm Desert Cobble", category: "Cobble / lb", unit: "lb", price: 0.25, book: "boulders" },
    { id: "br-cobble-pami", name: "Pami cobble", category: "Cobble / lb", unit: "lb", price: 0.22, book: "boulders" },

    { id: "br-b-basalt-column", name: "Basalt Column", category: "Boulders / lb", unit: "lb", price: 0.35, book: "boulders" },
    { id: "br-b-basalt", name: "Basalt Boulder", category: "Boulders / lb", unit: "lb", price: 0.25, book: "boulders" },
    { id: "br-b-blue-ridge", name: "Blue Ridge boulder", category: "Boulders / lb", unit: "lb", price: 0.18, book: "boulders" },
    { id: "br-b-cabinet-ridge", name: "Cabinet Ridge boulder", category: "Boulders / lb", unit: "lb", price: 0.22, book: "boulders" },
    { id: "br-b-granite-blasted", name: "Granite blasted", category: "Boulders / lb", unit: "lb", price: 0.10, book: "boulders" },
    { id: "br-b-granite-round", name: "Granite round", category: "Boulders / lb", unit: "lb", price: 0.30, book: "boulders" },
    { id: "br-b-jade-green", name: "Jade Green boulder", category: "Boulders / lb", unit: "lb", price: 0.22, book: "boulders" },
    { id: "br-b-mexi-bowl", name: "Mexi Bowl", category: "Boulders / lb", unit: "lb", price: 0.40, book: "boulders" },
    { id: "br-b-moss-rock", name: "Moss Rock boulder", category: "Boulders / lb", unit: "lb", price: 0.15, book: "boulders" },
    { id: "br-b-pami-rainbow", name: "Pami Rainbow boulder", category: "Boulders / lb", unit: "lb", price: 0.18, book: "boulders" },
    { id: "br-b-quartz-creek", name: "Quartz Creek boulder", category: "Boulders / lb", unit: "lb", price: 0.22, book: "boulders" },
    { id: "br-b-red-cinder", name: "Red Cinder boulder", category: "Boulders / lb", unit: "lb", price: 0.18, book: "boulders" },
    { id: "br-b-siskiyou-swirl", name: "Siskiyou Swirl", category: "Boulders / lb", unit: "lb", price: 0.35, book: "boulders" },
    { id: "br-b-sierra-moonlight", name: "Sierra Moonlight Purple boulder", category: "Boulders / lb", unit: "lb", price: 0.25, book: "boulders" },
    { id: "br-b-palm-desert", name: "Palm Desert Gold boulder", category: "Boulders / lb", unit: "lb", price: 0.25, book: "boulders" },

    { id: "br-color-blueridge", name: "Blueridge", category: "Colored rock", unit: "yd", price: 50, book: "boulders" },
    { id: "br-color-jade-crushed", name: "Jade Green crushed", category: "Colored rock", unit: "lb", price: 0.20, book: "boulders" },
    { id: "br-color-white-silica", name: "White Silica", category: "Colored rock", unit: "lb", price: 0.18, book: "boulders" },
    { id: "br-color-sierra-purple", name: "Sierra Moonlight Purple rock", category: "Colored rock", unit: "lb", price: 0.15, book: "boulders" },

    { id: "mexi-black-1-2", name: "Mexi Black 1' - 2\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-black-12-1", name: "Mexi Black 1/2 - 1\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-black-2-3", name: "Mexi Black 2\" - 3\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-black-3-5", name: "Mexi Black 3\" - 5\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-black-6-9", name: "Mexi Black 6\" - 9\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-black-buttons", name: "Mexi Black Buttons", category: "Mexi/deco", unit: "lb", price: 0.55, book: "boulders" },
    { id: "mexi-buff-1-2", name: "Mexi Buff 1\" - 2\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-buff-12-1", name: "Mexi Buff 1/2\"-1\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-buff-2-3", name: "Mexi Buff 2\" - 3\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-buff-buttons", name: "Mexi Buff Buttons", category: "Mexi/deco", unit: "lb", price: 0.55, book: "boulders" },
    { id: "mexi-cariba", name: "Mexi Cariba", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-mix-1-2", name: "Mexi Mix 1\" - 2\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-mix-12-1", name: "Mexi Mix 1/2 - 1\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-mix-14-12", name: "Mexi Mix 1/4 - 1/2", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-mix-3-5", name: "Mexi Mix 3\" - 5\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-mix-38", name: "Mexi Mix 3/8\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-mix-buttons", name: "Mexi Mix Buttons", category: "Mexi/deco", unit: "lb", price: 0.55, book: "boulders" },
    { id: "mexi-red-black-1-3", name: "Mexi Red & Black 1\" - 3\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-red-1-2", name: "Mexi Red 1\" - 2\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-red-12-1", name: "Mexi Red 1/2 - 1\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-red-2-3", name: "Mexi Red 2\" - 3\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "mexi-red-3-5", name: "Mexi Red 3\" -5\"", category: "Mexi/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "pami-pebble-112", name: "Pami Pebble 1 1/2\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "pami-pebble-3", name: "Pami Pebble 3\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "pami-pebble-34", name: "Pami Pebble 3/4\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "pami-pebble-12", name: "Pami Pebble 1/2\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "pami-pebble-38", name: "Pami Pebble 3/8\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "pami-pebble-14", name: "Pami Pebble 1/4\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "pami-fractured-34", name: "Pami Fractured 3/4\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "pami-fractured-38", name: "Pami Fractured 3/8\"", category: "Pami/deco", unit: "lb", price: 0.16, book: "boulders" },
    { id: "aspen-mountain-112", name: "Aspen Mountain 1 1/2\"", category: "Rock/deco", unit: "lb", price: 0.14, book: "boulders" },
    { id: "aspen-mountain-34", name: "Aspen Mountain 3/4\"", category: "Rock/deco", unit: "lb", price: 0.14, book: "boulders" },
    { id: "jade-34", name: "Jade 3/4\"", category: "Rock/deco", unit: "lb", price: 0.20, book: "boulders" },
    { id: "jade-112", name: "Jade 1 1/2\"", category: "Rock/deco", unit: "lb", price: 0.20, book: "boulders" },
    { id: "palm-desert-34", name: "Palm Desert Gold 3/4\"", category: "Rock/deco", unit: "lb", price: 0.30, book: "boulders" },
    { id: "salt-pepper-38", name: "Salt & Pepper 3/8\"", category: "Rock/deco", unit: "lb", price: 0.12, book: "boulders" },
    { id: "salt-pepper-112", name: "Salt & Pepper 1 1/2\"", category: "Rock/deco", unit: "lb", price: 0.12, book: "boulders" },
    { id: "sierra-desert-34", name: "Sierra Desert 3/4\"", category: "Rock/deco", unit: "lb", price: 0.14, book: "boulders" },
    { id: "sierra-desert-112", name: "Sierra Desert 1 1/2\"", category: "Rock/deco", unit: "lb", price: 0.14, book: "boulders" },
    { id: "black-lychen", name: "Black Lychen", category: "Rock/deco", unit: "lb", price: 0.20, book: "boulders" },
    { id: "cold-water-canyon", name: "Cold Water Canyon", category: "Rock/deco", unit: "lb", price: 0.26, book: "boulders" },
    { id: "moss-rock-head", name: "Moss Rock Head", category: "Rock/deco", unit: "lb", price: 0.15, book: "boulders" },
    { id: "moss-rock-double-head", name: "Moss Rock Double Head", category: "Rock/deco", unit: "lb", price: 0.15, book: "boulders" },
    { id: "moss-rock-doll-head", name: "Moss Rock Doll Head", category: "Rock/deco", unit: "lb", price: 0.15, book: "boulders" },

    { id: "q-dg-38-gold", name: "Decomposed Granite 3/8 Minus Gold Decorative", category: "Willow Creek quarry", unit: "ton", price: 35, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-dg-34-gold", name: "Decomposed Granite 3/4 Minus Gold", category: "Willow Creek quarry", unit: "ton", price: 13.50, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-cs-38-silver", name: "Crushed Screened Granite 3/8 Minus Silver Decorative", category: "Willow Creek quarry", unit: "ton", price: 35, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-34-minus", name: "3/4 Minus", category: "Willow Creek quarry", unit: "ton", price: 13, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-15-minus", name: "1 1/2 Minus", category: "Willow Creek quarry", unit: "ton", price: 13, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-4-minus", name: "4\" Minus", category: "Willow Creek quarry", unit: "ton", price: 12.50, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-jaw-run", name: "Jaw Run", category: "Willow Creek quarry", unit: "ton", price: 12.50, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-ogb", name: "Open Grade Base", category: "Willow Creek quarry", unit: "ton", price: 24, book: "willow", source: "quarry", truckload_only: true, note: "Call for availability" },
    { id: "q-38-12-clean", name: "3/8-1/2 Clean", category: "Willow Creek quarry", unit: "ton", price: 35, book: "willow", source: "quarry", truckload_only: true, note: "Call for availability" },
    { id: "q-34-12-clean", name: "3/4-1/2 Clean", category: "Willow Creek quarry", unit: "ton", price: 35, book: "willow", source: "quarry", truckload_only: true, note: "Call for availability" },
    { id: "q-34-1-clean", name: "3/4-1 Clean", category: "Willow Creek quarry", unit: "ton", price: 35, book: "willow", source: "quarry", truckload_only: true, note: "Call for availability" },
    { id: "q-4-8-clean", name: "4\"-8\" Clean", category: "Willow Creek quarry", unit: "ton", price: 35, book: "willow", source: "quarry", truckload_only: true, note: "Call for availability" },
    { id: "q-rip-rap", name: "Rip Rap (loaded with loader)", category: "Willow Creek quarry", unit: "ton", price: 25, book: "willow", source: "quarry", truckload_only: true },
    { id: "q-deco-rip-rap", name: "Deco Rip Rap (loaded with excavator) — Call Mike Taylor", category: "Willow Creek quarry", unit: "ton", price: 0, book: "willow", source: "quarry", truckload_only: true, special: true, note: "Special / Call Mike Taylor" },
    { id: "q-crushed-asphalt", name: "Crushed Asphalt", category: "Willow Creek quarry", unit: "ton", price: 20, book: "willow", source: "quarry", truckload_only: true, note: "Call for availability" },
    { id: "q-fill-dirt-dump", name: "Fill Dirt Dump Fee", category: "Willow Creek quarry", unit: "ton", price: 6, book: "willow", source: "quarry", truckload_only: true },
  ],
  weights: { rock: 2500, sand: 2600, bark: 900, cinder: 1500 },
};

window.HD_DEFAULTS.materials.forEach((m) => {
  if (!m.book) m.book = "store";
});

// Product weights sheet, column "Tons / yard", exact product names only.
// Willow Creek pit rows use HD_WILLOW_LB_PER_YD instead of this sheet.
window.HD_YARD_WEIGHTS = [
  { name: "3/4 Minus", tonsPerYard: 1.3095, source: "sheet" },
  { name: "Decomposed Granite", tonsPerYard: 1.458, source: "sheet" },
  { name: "3/4 or 1 1/4 Granite", tonsPerYard: 1.188, source: "sheet" },
  { name: "Fill Sand", tonsPerYard: 1.2285, source: "sheet" },
  { name: "Pea Gravel", tonsPerYard: 1.3635, source: "sheet" },
  { name: "3/4 Round or 1 3/4 Drain", tonsPerYard: 1.269, source: "sheet" },
  { name: "Red Cinder", tonsPerYard: 0.756, source: "sheet" },
  { name: "Black Cinder", tonsPerYard: 1.0395, source: "sheet" },
  { name: "Rhyolite Sand", tonsPerYard: 0.7695, source: "sheet" },
  { name: "3/8-7/8 Rhyolite", tonsPerYard: 0.486, source: "sheet" },
  { name: "3/16-3/8 Rhyolite", tonsPerYard: 0.459, source: "sheet" },
  { name: "Beach Sand", tonsPerYard: 1.188, source: "sheet" },
  { name: "White Silica", tonsPerYard: 1.2285, source: "sheet" },
  { name: "Sierra Desert", tonsPerYard: 1.0125, source: "sheet" },
  { name: "Aspen Mountain", tonsPerYard: 1.0125, source: "sheet" },
  { name: "Jade", tonsPerYard: 1.161, source: "sheet" },
  { name: "Pami", tonsPerYard: 1.3165, source: "sheet" },
  { name: "Mexi Pebble", tonsPerYard: 1.35, source: "sheet" },
  { name: "Mexi Button", tonsPerYard: 1.4715, source: "sheet" },
  { name: "Salt & Pepper 3/8", tonsPerYard: 1.323, source: "sheet" },
  { name: "Salt & Pepper 1 1/2", tonsPerYard: 1.296, source: "sheet" },
  { name: "Ivans Gold 3/4", tonsPerYard: 0.999, source: "sheet" },
  { name: "Ivans Gold 1 1/4", tonsPerYard: 1.0125, source: "sheet" },
  { name: "Top Soil", tonsPerYard: 1.0665, source: "sheet" },
  { name: "Forest Loam", tonsPerYard: 0.8235, source: "sheet" },
  { name: "Top Soil Plus", tonsPerYard: 0.81, source: "sheet" },
  { name: "Compost", tonsPerYard: 0.432, source: "sheet" },
  { name: "Clay Buster", tonsPerYard: 0.6615, source: "sheet" },
  { name: "Gard 'N' Grow", tonsPerYard: 0.459, source: "sheet" },
  { name: "Chef's Mix", tonsPerYard: 0.3915, source: "sheet" },
  { name: "Super Chef's", tonsPerYard: 0.486, source: "sheet" },
  { name: "Living Soil", tonsPerYard: 0.5535, source: "sheet" },
  { name: "Super Soil", tonsPerYard: 0.4185, source: "sheet" },
  { name: "Fresh Fines", tonsPerYard: 0.2295, source: "sheet" },
  { name: "Aged Sawdust", tonsPerYard: 0.2295, source: "sheet" },
  { name: "Multi-Bark", tonsPerYard: 0.2295, source: "sheet" },
  { name: "Walk-On Bark", tonsPerYard: 0.162, source: "sheet" },
  { name: "Fir Chips", tonsPerYard: 0.189, source: "sheet" },
  { name: "Playground Chips", tonsPerYard: 0.162, source: "sheet" },
  { name: "Mini Pebble", tonsPerYard: 0.216, source: "sheet" },
  { name: "Small Nugget", tonsPerYard: 0.2565, source: "sheet" },
  { name: "Medium Nugget", tonsPerYard: 0.2295, source: "sheet" },
  { name: "Red Hemlock", tonsPerYard: 0.243, source: "sheet" },
  { name: "Dark Silverless (Hemlock)", tonsPerYard: 0.324, source: "sheet" },
  { name: "Mulch", tonsPerYard: 0.8505, source: "sheet" },
];

// Mike's pit marks, pounds per cubic yard. Tons per yard is lb / 2000.
// These are not rows from the Product weights sheet.
window.HD_WILLOW_LB_PER_YD = {
  "q-dg-38-gold": 2916,
  "q-dg-34-gold": 2916,
  "q-cs-38-silver": 2916,
  "q-34-minus": 2619,
  "q-15-minus": 2619,
  "q-4-minus": 2619,
  "q-jaw-run": 2619,
  "q-ogb": 2376,
  "q-38-12-clean": 2376,
  "q-34-12-clean": 2376,
  "q-34-1-clean": 2376,
  "q-4-8-clean": 2916,
  "q-rip-rap": 2916,
  "q-deco-rip-rap": 2916,
  "q-crushed-asphalt": 2376,
  "q-fill-dirt-dump": 2376,
};

window.HDCatalog = {
  books: [
    { id: "store", label: "Bark/Mulch" },
    { id: "flagstone", label: "Flagstone" },
    { id: "boulders", label: "Boulders/Aggregates" },
    { id: "willow", label: "Willow Creek" },
  ],
  bookOf(m) {
    if (!m) return "store";
    if (m.book) return m.book;
    if (m.source === "quarry" || m.truckload_only) return "willow";
    if (m.requires_forklift || (m.category || "").indexOf("Flagstone") >= 0) return "flagstone";
    return "store";
  },
  normName(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  },
  // One exact name, or nothing. "3/4 or 1 1/4 Granite" does not match "3/4 Minus".
  matchYardWeight(name, rows) {
    const n = this.normName(name);
    if (!n) return null;
    const hits = (rows || []).filter((row) => row && this.normName(row.name) === n);
    return hits.length === 1 ? hits[0] : null;
  },
  tonsPerYardOf(m) {
    const n = Number(m && m.tonsPerYard);
    return isFinite(n) && n > 0 ? n : null;
  },
  missingYardWeight(m) {
    return this.isQuarry(m) && !this.tonsPerYardOf(m);
  },
  isQuarry(m) {
    return this.bookOf(m) === "willow";
  },
  isStone(m) {
    return this.bookOf(m) === "flagstone";
  },
  isRetail(m) {
    return this.bookOf(m) === "store";
  },
  inBook(m, book) {
    return this.bookOf(m) === book;
  },
  sizeSplits: [
    { fromId: "red-cinder", childIds: ["red-cinder-112", "red-cinder-38-minus"] },
    { fromId: "round-drain", childIds: ["round-drain-34", "drain-112"] },
    { fromId: "crushed-clean-river", childIds: ["crushed-clean-river-34", "crushed-clean-river-14"] },
    { fromId: "clean-granite", childIds: ["clean-granite-112", "clean-granite-34"] },
    { fromId: "blue-ridge-yd", childIds: ["blue-ridge-112", "blue-ridge-34", "blue-ridge-34-minus"] },
    { fromId: "ivans-gold", childIds: ["ivans-gold-34", "ivans-gold-112"] },
    { fromId: "black-cinder", childIds: ["black-cinder-112", "black-cinder-34"], keepDraftPrices: true, oldPrice: 78 },
    { fromId: "pami-pebble", childIds: ["pami-pebble-112", "pami-pebble-3", "pami-pebble-34", "pami-pebble-12", "pami-pebble-38", "pami-pebble-14", "pami-fractured-34", "pami-fractured-38"] },
    { fromId: "br-color-pami", childIds: ["pami-pebble-112", "pami-pebble-3", "pami-pebble-34", "pami-pebble-12", "pami-pebble-38", "pami-pebble-14", "pami-fractured-34", "pami-fractured-38"] },
    { fromId: "mexi-pebble", childIds: ["mexi-black-1-2", "mexi-black-12-1", "mexi-black-2-3", "mexi-black-3-5", "mexi-black-6-9", "mexi-buff-1-2", "mexi-buff-12-1", "mexi-buff-2-3", "mexi-cariba", "mexi-mix-1-2", "mexi-mix-12-1", "mexi-mix-14-12", "mexi-mix-3-5", "mexi-mix-38", "mexi-red-black-1-3", "mexi-red-1-2", "mexi-red-12-1", "mexi-red-2-3", "mexi-red-3-5"] },
    { fromId: "br-color-mexi-pebble", childIds: ["mexi-black-1-2", "mexi-black-12-1", "mexi-black-2-3", "mexi-black-3-5", "mexi-black-6-9", "mexi-buff-1-2", "mexi-buff-12-1", "mexi-buff-2-3", "mexi-cariba", "mexi-mix-1-2", "mexi-mix-12-1", "mexi-mix-14-12", "mexi-mix-3-5", "mexi-mix-38", "mexi-red-black-1-3", "mexi-red-1-2", "mexi-red-12-1", "mexi-red-2-3", "mexi-red-3-5"] },
    { fromId: "mexi-buttons", childIds: ["mexi-black-buttons", "mexi-buff-buttons", "mexi-mix-buttons"] },
    { fromId: "br-color-mexi-buttons", childIds: ["mexi-black-buttons", "mexi-buff-buttons", "mexi-mix-buttons"] },
    { fromId: "salt-pepper", childIds: ["salt-pepper-38", "salt-pepper-112"] },
    { fromId: "aspen-mountain", childIds: ["aspen-mountain-112", "aspen-mountain-34"] },
    { fromId: "br-color-aspen", childIds: ["aspen-mountain-112", "aspen-mountain-34"] },
    { fromId: "sierra-desert", childIds: ["sierra-desert-34", "sierra-desert-112"] },
    { fromId: "jade-green", childIds: ["jade-34", "jade-112"] },
    { fromId: "palm-desert", childIds: ["palm-desert-34"] },
    { fromId: "br-color-palm-desert", childIds: ["palm-desert-34"] },
  ],
  splitCombinedSizes(existing) {
    const splits = this.sizeSplits || [];
    const retired = new Set(splits.map((s) => s.fromId));
    const defs = new Map((window.HD_DEFAULTS.materials || []).map((m) => [m.id, m]));
    const present = new Set();
    const out = [];
    (existing || []).forEach((m) => {
      if (!m || retired.has(m.id)) return;
      present.add(m.id);
      out.push(m);
    });
    (existing || []).forEach((m) => {
      if (!m || !retired.has(m.id)) return;
      const spec = splits.find((s) => s.fromId === m.id);
      if (!spec) return;
      const price = Number(m.price);
      spec.childIds.forEach((id) => {
        if (present.has(id)) return;
        const def = defs.get(id);
        if (!def) return;
        const row = JSON.parse(JSON.stringify(def));
        const keepDraft = spec.keepDraftPrices && price === spec.oldPrice;
        if (isFinite(price) && !keepDraft) row.price = price;
        present.add(id);
        out.push(row);
      });
    });
    return out;
  },
  mergeMissing(existing) {
    existing = this.splitCombinedSizes(existing);
    const have = new Map((existing || []).map((m) => [m.id, m]));
    const out = [];
    (window.HD_DEFAULTS.materials || []).forEach((def) => {
      const prev = have.get(def.id);
      if (!prev) {
        out.push(JSON.parse(JSON.stringify(def)));
        return;
      }
      const row = { ...prev, ...def };
      if (Number(prev.price) > 0) row.price = prev.price;
      // The old book shipped fill dirt at $4/ton. That figure was the default, not a punched rate.
      if (def.id === "q-fill-dirt-dump" && Number(prev.price) === 4) row.price = def.price;
      row.book = def.book || this.bookOf(prev);
      out.push(row);
      have.delete(def.id);
    });
    have.forEach((m) => {
      if (!m.book) m.book = this.bookOf(m);
      out.push(m);
    });
    return out;
  },
  reloadRetailKeepExtras(existing) {
    const retired = new Set((this.sizeSplits || []).map((s) => s.fromId));
    const publishedIds = new Set(window.HD_DEFAULTS.materials.map((m) => m.id));
    const extras = (existing || []).filter((m) => m && !publishedIds.has(m.id) && !retired.has(m.id));
    return JSON.parse(JSON.stringify(window.HD_DEFAULTS.materials)).concat(extras);
  },
  publishedSheet() {
    return JSON.parse(JSON.stringify(window.HD_DEFAULTS.materials || []));
  },
};

window.HD_DEFAULTS.materials.forEach((m) => {
  if (window.HDCatalog.bookOf(m) !== "willow") return;
  const lb = window.HD_WILLOW_LB_PER_YD[m.id];
  if (!(lb > 0)) return;
  m.lbPerYard = lb;
  m.tonsPerYard = lb / 2000;
  m.tonsPerYardSource = "mike";
});
