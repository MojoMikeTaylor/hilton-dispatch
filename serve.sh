#!/usr/bin/env bash
# Serve Hilton Dispatch on http://127.0.0.1:8756
cd "$(dirname "$0")"
PORT="${PORT:-8756}"
echo "Hilton Dispatch → http://127.0.0.1:${PORT}"
echo "Crew PIN 1956  ·  Settings admin 4357  ·  Ctrl+C to stop"
if command -v node >/dev/null 2>&1; then
  exec node server.js
fi
if command -v python3 >/dev/null 2>&1; then
  echo "Node not found — static only, tickets will not sync across yards."
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi
if command -v python >/dev/null 2>&1; then
  echo "Node not found — static only, tickets will not sync across yards."
  exec python -m http.server "$PORT" --bind 127.0.0.1
fi
echo "Need node (preferred) or python3 to serve the folder."
exit 1
