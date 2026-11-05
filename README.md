# Hilton Dispatch

Private yard app for **Hilton Landscape Supply / Hilton Trucking**. Shop-floor tool. Not a public customer portal.

Crew takes the call, punches the delivery address, picks the loading yard, maps the route, adds materials from the correct book, adds an optional forklift fee, prints invoice + routing paperwork, and emails Nick at **dispatch@hiltonlandscaping.com**.

## Daily workflow

1. Customer calls. Hit **New ticket**.
2. Name, phone, delivery address, which yard is loading the truck.
3. Small Truck 550 ($90/hr), Dump ($150/hr), Transfer Truck ($160/hr), or Forklift ($160/hr). The dump-road buffer stays in Settings and applies to dump and transfer trucks.
4. Store products sold by the yard use truck class limits, not a flat 10/20 split. Small 550: 3 yd aggregate/gravel, 4 yd soil, 5 yd bark/mulch/compost. Dump: 10 rock, 12 soil, 20 compost/bark/mulch. Transfer: 20 rock, 24 topsoil, 30 forest loam and topsoil plus, 50 compost/bark/mulch. A remainder goes on the smallest truck that can carry it. A 30 yd rock order is 1 transfer + 1 dump. A 30 yd topsoil order is 1 transfer (24) plus the remainder on the next truck that fits. One invoice. The board and the house sheet show the load count and the split. Willow Creek quarry rock keeps its own rule (bobtail 10 / transfer 20). The new rock class does not cover it: small rock is only 3 yd, so 30 yd of pit rock would become a transfer plus a dump. Named quarry math stays transfer + bobtail at 30 yd and two transfers at 40 yd. By-the-pound items, flagstone, boulders, and forklift stone stay one load. The delivery fee is the sum, still one invoice. Extra site minutes and extra wait minutes are **0**. Forklift / extra equipment $ defaults to **0**. A forklift leaving 5 South Stage (yard `medford`) includes $40 in the delivery fee. A driver or PO goes in Notes. Fuel surcharge is the percent typed in Settings, applied to the delivery fee only. Diesel price and week-of print as the EIA index. Willow Creek adds a visible $5 environmental fee per load and a $1/ton material fuel surcharge shown as $1.30/yd (1.3 t/yd).
5. Search the **active material tab** (Bark/Mulch, Flagstone, Boulders/Aggregates, Willow Creek). Choosing Willow Creek as origin defaults the picker to the Willow Creek tab. Crew can switch tabs on purpose.
6. **Calculate route** — map draws, delivery fee locks, status becomes Routed.
7. **Print invoice + route sheet** — page 1 full math for accounting, page 2 driver sheet.
8. **Email Nick / dispatch** — reconciliation email to dispatch@hiltonlandscaping.com.
9. Board shows today’s delivery count, window, status (New, Routed, Printed, Emailed, Out, Done).

## How the money is calculated

Printed on every invoice.

1. Map one-way drive minutes from the chosen yard to the job (Google if a key is saved; else OpenStreetMap + OSRM).
2. Trip minutes = roundtrip ? one-way × 2 : one-way. Each load is its own trip.
3. Dump and transfer trucks: multiply **road** minutes by the admin dump-road buffer (default 1.08). Small Truck 550 and forklift use mapped road time.
4. Site minutes = load + unload. Extra minutes are 0.
5. Raw hours = (adjusted road + site) / 60.
6. Billable hours = max(1 hour, round up to 15 minutes).
7. Delivery fee = billable hours × $90 Small Truck 550 / $150 dump / $160 transfer / $160 forklift (or admin rates). Forklift from Medford / 5 South Stage adds $40 inside that fee. Transfer keeps the 8% road buffer. Multi-load tickets sum one fee per load on one invoice.
8. Materials = qty × book price. Materials are not fuel-surcharged by the Settings percent. Topsoil is $16/yd, Forest Loam $20/yd, and Topsoil Plus $26/yd when the order is transfer-only. Yard POS prices stay $25 / $27 / $34. A split onto a dump or Small 550 keeps the POS price. Willow Creek material fuel ($1/ton, shown as $1.30/yd) is added on top and printed.
9. Forklift / extra equipment fee = the dollar amount typed on the ticket.
10. Fuel surcharge = delivery fee × (typed percent / 100). The office types the percent each week. Default is 0. Diesel $/gal and week-of are the EIA West Coast PADD 5 index on the invoice. Pull EIA week updates the price and the date, not the percent.
11. Total = delivery + materials + forklift fee + tote bagging, spread, additional service + delivery fuel surcharge + Willow Creek environmental fee + Willow Creek material fuel. The tote line is one line and starts blank. Spreading is that line, not a separate fee. Oregon tax off unless admin turns it on.

Totals update as you type. Save persists the ticket and the book.

## Four material books — do not mix

| Tab | Source | Unit |
|---|---|---|
| Bark/Mulch | Store Price Sheet 2026 (2026-08-26) | yd / lb / ea |
| Flagstone | Flagstone 2026 sheet | lb (bags are bag) |
| Boulders/Aggregates | Hilton boulders flyer | yd / lb |
| Willow Creek | Pit pricing only | ton |

Willow Creek never inherits Central Point / Medford store prices. Weight helper on the boulders tab: rock 2500, sand 2600, bark 900, cinder 1500 lb/yd.

## Yards

- Hilton Landscape Supply (Mothership) — 8087 Blackwell Road, Central Point, Oregon 97502 — 541-664-3374
- Hilton Landscape Supply (Phoenix) #2 — 5 South Stage Road, Medford, Oregon 97501 — 541-600-2640
- Willow Creek Aggregate — 4825 Old Stage Road, Central Point, Oregon 97502 — 541-664-1254

## First-run setup

1. `node server.js` (or `./serve.sh`). Crew PIN and Settings admin password come from `.env` (`CREW_PIN`, `ADMIN_PASSWORD`) or Railway variables; no default ships in code.
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
