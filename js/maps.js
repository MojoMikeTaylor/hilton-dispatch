/* Hilton Dispatch — routing
   Prefers Google Maps JavaScript API (Geocoder + DirectionsService) when a key is saved.
   Falls back to Nominatim + OSRM so the yard can run on day one with no key. */

window.HDMaps = {
  lastRoute: null,
  _googleLoading: null,
  _suggestTimer: null,

  async ensureGoogle(key) {
    if (!key) return false;
    if (window.google && window.google.maps && window.google.maps.DirectionsService) return true;
    if (this._googleLoading) return this._googleLoading;
    this._googleLoading = new Promise((resolve) => {
      const existing = document.getElementById("hd-google-js");
      if (existing) {
        existing.addEventListener("load", () => resolve(!!(window.google && window.google.maps)));
        existing.addEventListener("error", () => resolve(false));
        return;
      }
      const s = document.createElement("script");
      s.id = "hd-google-js";
      s.async = true;
      s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) + "&libraries=places";
      s.onload = () => resolve(!!(window.google && window.google.maps));
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
    return this._googleLoading;
  },

  geocodeNominatim(address) {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=us&q=" +
      encodeURIComponent(address);
    return fetch(url, { headers: { Accept: "application/json" } }).then((res) => {
      if (!res.ok) throw new Error("Geocoder unavailable (" + res.status + ")");
      return res.json();
    }).then((data) => {
      if (!data || !data[0]) throw new Error("Could not find that address. Check spelling and try again.");
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
    });
  },

  suggestNominatim(query) {
    const q = (query || "").trim();
    if (q.length < 4) return Promise.resolve([]);
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&countrycodes=us&q=" +
      encodeURIComponent(q);
    return fetch(url, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => (data || []).map((hit) => ({
        label: hit.display_name,
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
      })))
      .catch(() => []);
  },

  debounceSuggest(query, cb, googleKey) {
    clearTimeout(this._suggestTimer);
    this._suggestTimer = setTimeout(() => {
      this.suggestAddress(query, googleKey).then(cb);
    }, 280);
  },

  async suggestAddress(query, googleKey) {
    const q = (query || "").trim();
    if (q.length < 3) return [];
    const key = (googleKey || "").trim();
    if (key) {
      try {
        const viaServer = await this.suggestPlacesNew(q, key);
        if (viaServer.length) return viaServer;
      } catch (e) { /* fall through */ }
      try {
        const ready = await this.ensureGoogle(key);
        if (ready) {
          const jsHits = await this.suggestGoogleJs(q);
          if (jsHits.length) return jsHits;
        }
      } catch (e) { /* fall through */ }
    }
    return this.suggestNominatim(q);
  },

  suggestPlacesNew(query, key) {
    return fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: query, key }),
    }).then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data) => data.suggestions || [])
      .catch(() => []);
  },

  suggestGoogleJs(query) {
    return new Promise((resolve) => {
      if (!window.google || !google.maps || !google.maps.places) {
        resolve([]);
        return;
      }
      const svc = new google.maps.places.AutocompleteService();
      svc.getPlacePredictions({
        input: query,
        componentRestrictions: { country: "us" },
      }, (preds, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !preds) {
          resolve([]);
          return;
        }
        resolve(preds.map((p) => ({ label: p.description, placeId: p.place_id })));
      });
    });
  },

  routeOSRM(from, to) {
    const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true`;
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error("Router unavailable (" + res.status + ")");
      return res.json();
    }).then((data) => {
      if (!data.routes || !data.routes[0]) throw new Error("No driving route found between yard and job.");
      const r = data.routes[0];
      const steps = [];
      (r.legs || []).forEach((leg) => {
        (leg.steps || []).forEach((s) => {
          const name = s.name || "";
          const type = (s.maneuver && s.maneuver.type) || "continue";
          const modifier = (s.maneuver && s.maneuver.modifier) || "";
          const verb = [type, modifier].filter(Boolean).join(" ");
          const road = name ? ` onto ${name}` : "";
          steps.push({
            instruction: `${verb}${road}`.replace(/^\w/, (c) => c.toUpperCase()),
            miles: (s.distance || 0) / 1609.34,
            minutes: (s.duration || 0) / 60,
          });
        });
      });
      return {
        provider: "osrm",
        seconds: r.duration,
        meters: r.distance,
        miles: r.distance / 1609.34,
        geometry: r.geometry,
        steps,
      };
    });
  },

  geocodeGoogle(address) {
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address, componentRestrictions: { country: "US" } }, (results, status) => {
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng(), label: results[0].formatted_address });
        } else {
          reject(new Error("Google Geocoding: " + status));
        }
      });
    });
  },

  routeGoogle(from, to) {
    return new Promise((resolve, reject) => {
      const svc = new google.maps.DirectionsService();
      svc.route({
        origin: { lat: from.lat, lng: from.lng },
        destination: { lat: to.lat, lng: to.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        if (status !== "OK" || !result.routes[0]) {
          reject(new Error("Google Directions: " + status));
          return;
        }
        const route = result.routes[0];
        const leg = route.legs[0];
        const steps = (leg.steps || []).map((s) => ({
          instruction: (s.instructions || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          miles: (s.distance && s.distance.value ? s.distance.value : 0) / 1609.34,
          minutes: (s.duration && s.duration.value ? s.duration.value : 0) / 60,
        }));
        const path = [];
        route.overview_path.forEach((p) => path.push([p.lng(), p.lat()]));
        resolve({
          provider: "google",
          seconds: leg.duration.value,
          meters: leg.distance.value,
          miles: leg.distance.value / 1609.34,
          geometry: path.length ? { type: "LineString", coordinates: path } : null,
          steps,
          textDuration: leg.duration.text,
          textDistance: leg.distance.text,
        });
      });
    });
  },

  async route(fromAddr, toAddr, fromHint, googleKey) {
    let from = fromHint && fromHint.lat ? { lat: fromHint.lat, lng: fromHint.lng, label: fromHint.address || fromAddr } : null;
    let to = null;
    const key = (googleKey || "").trim();

    if (key) {
      const ready = await this.ensureGoogle(key);
      if (ready) {
        try {
          if (!from) from = await this.geocodeGoogle(fromAddr);
          to = await this.geocodeGoogle(toAddr);
          const r = await this.routeGoogle(from, to);
          this.lastRoute = { from, to, ...r };
          return this.lastRoute;
        } catch (err) {
          console.warn("Google routing failed, falling back to OSM", err);
        }
      }
    }

    if (!from) from = await this.geocodeNominatim(fromAddr);
    to = await this.geocodeNominatim(toAddr);
    const r = await this.routeOSRM(from, to);
    this.lastRoute = { from, to, ...r };
    return this.lastRoute;
  },
};
