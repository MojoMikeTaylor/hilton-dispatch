# Hilton Dispatch

Private yard app for **Hilton Landscape Supply / Hilton Trucking**.

Crew takes the call, punches the delivery address, picks the loading yard, maps the route, adds materials from the book, prints the invoice and driver sheet, and emails accounting.

This is a shop-floor tool. Open it on a yard computer. It is not a public website.

## Daily workflow

1. Customer calls. Hit **New ticket**.
2. Name, phone, delivery address, which yard is loading the truck.
3. Dump truck ($160/hr + 8% road time), small truck ($100/hr), or forklift truck ($160/hr, no dump buffer) for palletized stone.
4. Loads (1 = one out-and-back). Extra site / wait minutes if the site will hold the truck. Forklift / extra fee as a dollar field (crew types it).
5. Search the material book, add yards / tons / pallets. Willow Creek is quarry direct — truckload tons only.
6. **Calculate route** — map draws, delivery fee locks.
7. **Print invoice + route sheet** — page 1 customer/accounting invoice, page 2 driver sheet with load, notes, turn-by-turn, signature lines.
8. **Email Nick / dispatch** — opens a reconciliation email to dispatch@hiltonlandscaping.com with the same numbers.
9. Board keeps the ticket. Export CSV when you close the week.

## How the money is calculated

Printed on every invoice so accounting can reconcile it.

1. Map the drive from the chosen yard to the job (Google if a key is saved, otherwise OpenStreetMap + OSRM).
2. Default trip is **round trip** (out and back). Switch to one-way in Settings if that is how you bill.
3. Multiply by **loads**.
4. **Dump trucks only:** multiply mapped road time by **1.08** so the big truck being slower is on the ticket. Small trucks and forklift trucks use mapped time.
5. Add load minutes + unload minutes per load (defaults 15 + 15). Those are not given the 8% bump — the bump is for road time. Extra wait minutes stack on top.
6. Round up to the next 15 minutes, with a **1 hour minimum**.
7. Delivery fee = billable hours × **$160** (dump or forklift) or **$100** (small).
8. Materials = qty × book price. Forklift / extra fee is a dollar add-on the crew types.
9. Total = delivery + materials + forklift fee. Oregon sales tax is off unless you turn it on.

Example: 30 min one-way, dump truck, 1 load, 8 yd of material at $38.

- Round trip 60 min × 1.08 = 64.8 min road
- Plus 30 min load/unload = 94.8 min raw → **1.75 billable hours × $160 = $280 delivery**
- Materials $304
- **Ticket total $584**

## Yards on day one

- Central Point — 8087 Blackwell Rd, Central Point, OR 97502 — 541-664-3374
- Medford — 5 S Stage Rd, Medford, OR 97501 — 541-600-2640
- Willow Creek Aggregate — 4825 Old Stage Rd, Central Point, OR 97502 — 541-664-1254

## First-run setup

1. Unzip. On a Mac/Linux box run `./serve.sh`. On Windows run `node server.js` (preferred) so yards share the same book.
2. Crew PIN is **1956**. Settings admin password is **4357**. Crew can run Board, New ticket, and Material book. Settings is locked.
3. Material book is the **Aug 26, 2026 store price sheet** plus Willow Creek quarry ($0) and flagstone ($0). Decorative rock and boulders are per pound on that sheet. Change a price in Material Book — the line total updates as you type. Save book writes it for every yard. Reload 2026 price sheet restores retail prices and keeps quarry / flagstone rows.
4. Confirm dump / small / forklift rates and the dump-truck 8% road buffer in Settings (admin). Each ticket also has **This ticket $/hr**, **Dump route buffer %**, **Extra site / wait min**, and **Forklift / extra fee**.
5. Reconciliation email goes to **dispatch@hiltonlandscaping.com** (Nick). Change it in Settings if that inbox moves.
6. Paste a Google Maps API key in Settings (Maps JavaScript API + Directions API + Geocoding API). Hit **Test Google key**. Leave it blank and the desk still routes on OpenStreetMap.

Tickets, the material book, and settings live on the Railway server (`/api/store` → `store.json`). Mount a Railway volume at `/data` and set `DATA_DIR=/data` so the board survives redeploys.

The PIN keeps casual walk-bys off the board. It is not bank-grade security.

## Files

```
index.html      app shell
css/app.css     yard ticket look
js/data.js      default yards + Hilton material book + quarry + flagstone
js/engine.js    billing formula
js/maps.js      Google / OSM routing
js/app.js       board, tickets, print, email, settings lock
server.js       static files + shared JSON store
package.json    Railway start: node server.js
serve.sh        one-command local server
```

No build step. `npm start` / `node server.js`.
