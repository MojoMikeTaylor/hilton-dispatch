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
    { id: "br-color-mexi-pebble", name: "Mexi Pebble", category: "Colored rock", unit: "lb", price: 0.30, book: "boulders" },
    { id: "br-color-mexi-buttons", name: "Mexi Buttons", category: "Colored rock", unit: "lb", price: 0.55, book: "boulders" },
    { id: "br-color-aspen", name: "Aspen Mountain", category: "Colored rock", unit: "lb", price: 0.14, book: "boulders" },
    { id: "br-color-pami", name: "Pami", category: "Colored rock", unit: "lb", price: 0.16, book: "boulders" },
    { id: "br-color-white-silica", name: "White Silica", category: "Colored rock", unit: "lb", price: 0.18, book: "boulders" },
    { id: "br-color-sierra-purple", name: "Sierra Moonlight Purple rock", category: "Colored rock", unit: "lb", price: 0.15, book: "boulders" },
    { id: "br-color-palm-desert", name: "Palm Desert Gold rock", category: "Colored rock", unit: "lb", price: 0.30, book: "boulders" },

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
    { id: "q-fill-dirt-dump", name: "Fill Dirt Dump Fee", category: "Willow Creek quarry", unit: "ton", price: 4, book: "willow", source: "quarry", truckload_only: true },
  ],
  weights: { rock: 2500, sand: 2600, bark: 900, cinder: 1500 },
};

window.HD_DEFAULTS.materials.forEach((m) => {
  if (!m.book) m.book = "store";
});

window.HDCatalog = {
  books: [
    { id: "store", label: "Store" },
    { id: "flagstone", label: "Flagstone" },
    { id: "boulders", label: "Boulders / colored rock" },
    { id: "willow", label: "Willow Creek" },
  ],
  bookOf(m) {
    if (!m) return "store";
    if (m.book) return m.book;
    if (m.source === "quarry" || m.truckload_only) return "willow";
    if (m.requires_forklift || (m.category || "").indexOf("Flagstone") >= 0) return "flagstone";
    return "store";
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
  mergeMissing(existing) {
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
    const publishedIds = new Set(window.HD_DEFAULTS.materials.map((m) => m.id));
    const extras = (existing || []).filter((m) => !publishedIds.has(m.id));
    return JSON.parse(JSON.stringify(window.HD_DEFAULTS.materials)).concat(extras);
  },
};
