# Hilton Dispatch

Private yard app for **Hilton Landscape Supply / Hilton Trucking**.

Crew takes the call, punches the delivery address, picks the loading yard, maps the route, adds materials from the book, prints the invoice and driver sheet, and emails accounting.

This is a shop-floor tool. Open it on a yard computer. It is not a public website.

## Daily workflow

1. Customer calls. Hit **New ticket**.
2. Name, phone, delivery address, which yard is loading the truck.
3. Dump truck ($160/hr + 8% road time) or small truck ($100/hr).
4. Loads (1 = one out-and-back). Extra wait minutes if the site will hold the truck.
5. Search the material book, add yards / tons / each.
6. **Calculate route** — map draws, delivery fee locks.
7. **Print invoice + route sheet** — page 1 customer/accounting invoice, page 2 driver sheet with load, notes, turn-by-turn, signature lines.
8. **Email Nick / dispatch** — opens a reconciliation email to dispatch@hiltonlandscaping.com with the same numbers.
9. Board keeps the ticket. Export CSV when you close the week.

## How the money is calculated

Printed on every invoice so accounting can reconcile it.

1. Map the drive from the chosen yard to the job (Google if a key is saved, otherwise OpenStreetMap + OSRM).
2. Default trip is **round trip** (out and back). Switch to one-way in Settings if that is how you bill.
3. Multiply by **loads**.
4. **Dump trucks only:** multiply mapped road time by **1.08** so the big truck being slower is on the ticket. Small trucks use mapped time.
5. Add load minutes + unload minutes per load (defaults 15 + 15). Those are not given the 8% bump — the bump is for road time. Extra wait minutes stack on top.
6. Round up to the next 15 minutes, with a **1 hour minimum**.
7. Delivery fee = billable hours × **$160** (dump) or **$100** (small).
8. Materials = qty × book price.
9. Total = delivery + materials. Oregon sales tax is off unless you turn it on.

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

1. Unzip. On a Mac/Linux box run `./serve.sh`. On Windows, double-click `index.html` or run any local static server in this folder.
2. PIN is **1956**. Change it under Settings immediately.
3. Material book is the **Aug 26, 2026 store price sheet**. Decorative rock and boulders are per pound on that sheet. Change a price in Material Book if the yard moves, or hit **Reload 2026 price sheet**.
4. Confirm dump / small rates and the extra-time buffer in Settings. Those are the yard defaults. Each ticket also has **This ticket $/hr** and **This ticket extra time %** so Nick can bump one job without changing the shop default.
5. Reconciliation email goes to **dispatch@hiltonlandscaping.com** (Nick). Change it in Settings if that inbox moves.
6. Paste a Google Maps API key in Settings (Maps JavaScript API + Directions API + Geocoding API). Hit **Test Google key**. Leave it blank and the desk still routes on OpenStreetMap.

Tickets live in this browser. Use **Settings → Download backup** if more than one desk needs the same book, or after a long day.

The PIN keeps casual walk-bys off the board. It is not bank-grade security. Put this on an internal PC, or behind your own host password / VPN if it ever lives on the internet.

## Files

```
index.html      app shell
css/app.css     yard ticket look
js/data.js      default yards + Hilton material book
js/engine.js    billing formula
js/maps.js      Google / OSM routing
js/app.js       board, tickets, print, email
serve.sh        one-command local server
```

No build step.
