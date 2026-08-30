#!/usr/bin/env bash
# Serve Hilton Dispatch on http://127.0.0.1:8756
cd "$(dirname "$0")"
PORT="${PORT:-8756}"
echo "Hilton Dispatch → http://127.0.0.1:${PORT}"
echo "PIN 1956  ·  Ctrl+C to stop"
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi
if command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT" --bind 127.0.0.1
fi
echo "Need python3 to serve the folder. You can also just open index.html in Chrome."
exit 1
