# Hilton Dispatch

Private yard app for **Hilton Landscape Supply / Hilton Trucking**. Shop-floor tool. Not a public customer portal.

Crew takes the call, punches the delivery address, picks the loading yard, maps the route, adds materials from the correct book, adds extra site/wait minutes and optional forklift fee, prints invoice + routing paperwork, and emails Nick at **dispatch@hiltonlandscaping.com**.

## Daily workflow

1. Customer calls. Hit **New ticket**.
2. Name, phone, delivery address, which yard is loading the truck.
3. Dump truck ($160/hr) or small truck ($100/hr). Forklift truck is optional for palletized stone. The dump-road buffer stays in Settings.
4. Loads (1 = one out-and-back). Extra site minutes and extra wait minutes default to **0**. Forklift / extra equipment $ defaults to **0**.
5. Search the **active material tab** (Store, Flagstone, Boulders / colored rock, Willow Creek). Choosing Willow Creek as origin defaults the picker to the Willow Creek tab. Crew can switch tabs on purpose.
6. **Calculate route** — map draws, delivery fee locks, status becomes Routed.
7. **Print invoice + route sheet** — page 1 full math for accounting, page 2 driver sheet.
8. **Email Nick / dispatch** — reconciliation email to dispatch@hiltonlandscaping.com.
9. Board shows today’s delivery count, window, status (New, Routed, Printed, Emailed, Out, Done).

## How the money is calculated

Printed on every invoice.

1. Map one-way drive minutes from the chosen yard to the job (Google if a key is saved; else OpenStreetMap + OSRM).
2. Trip minutes = (roundtrip ? one-way × 2 : one-way) × loads.
3. Dump truck: multiply **road** minutes by the admin dump-road buffer (default 1.08). Small / forklift trucks use mapped road time.
4. Site minutes = (load + unload) × loads + extra site minutes + extra wait minutes.
5. Raw hours = (adjusted road + site) / 60.
6. Billable hours = max(1 hour, round up to 15 minutes).
7. Delivery fee = billable hours × $160 dump / $100 small / $160 forklift (or admin rates).
8. Materials = qty × book price.
9. Forklift / extra equipment fee = the dollar amount typed on the ticket.
10. Total = delivery + materials + forklift fee. Oregon tax off unless admin turns it on.

Totals update as you type. Save persists the ticket and the book.

## Four material books — do not mix

| Tab | Source | Unit |
|---|---|---|
| Store | Store Price Sheet 2026 (2026-08-26) | yd / lb / ea |
| Flagstone | Flagstone 2026 sheet | lb (bags are bag) |
| Boulders / colored rock | Hilton boulders flyer | yd / lb |
| Willow Creek | Pit pricing only | ton |

Willow Creek never inherits Central Point / Medford store prices. Weight helper on the boulders tab: rock 2500, sand 2600, bark 900, cinder 1500 lb/yd.

## Yards

- Hilton Landscape Supply (Mothership) — 8087 Blackwell Road, Central Point, Oregon 97502 — 541-664-3374
- Hilton Landscape Supply (Phoenix) #2 — 5 South Stage Road, Medford, Oregon 97501 — 541-600-2640
- Willow Creek Aggregate — 4825 Old Stage Road, Central Point, Oregon 97502 — 541-664-1254

## First-run setup

1. `node server.js` (or `./serve.sh`). PIN **1956**. Settings admin **4357**.
2. Shop rates, dump-road buffer percent, load/unload defaults, emails, Google key, tax, and book-price edits live in **Settings**. Saving a rate change asks for a second confirm. Crew ticket screen cannot edit the dump-road percent. This ticket $/hr is behind an Admin checkbox, default off.
3. Paste a Google Maps API key in Settings (Maps JavaScript API + Directions API + Geocoding API + Places API (New)). Or set `GOOGLE_MAPS_API_KEY` on Railway. **Do not commit the key.** Leave it blank and the desk still routes on OpenStreetMap.
4. Email stays **dispatch@hiltonlandscaping.com** unless you change it in Settings.

Tickets, books, and settings persist on the Railway server (`/api/store` → `store.json`). Mount a volume at `/data` and set `DATA_DIR=/data` so the board survives redeploys.

## Files

```
index.html      app shell
css/app.css     yard ticket look
js/data.js      four material books + yards
js/engine.js    billing formula
js/maps.js      Google Places / Directions, OSM fallback
js/app.js       board, tickets, print, email, settings lock
server.js       static files + JSON store + Places proxy
package.json    start: node server.js
```

No build step.
