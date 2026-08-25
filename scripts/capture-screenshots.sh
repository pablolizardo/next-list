#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/screenshots"
PORT=8765

python3 -m http.server "$PORT" --directory "$ROOT/brand" >/tmp/next-list-brand-http.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 0.4

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() {
  local size="$1" file="$2" url="$3" color="$4"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size="$size" --virtual-time-budget=4000 \
    --default-background-color="$color" \
    --screenshot="$OUT/$file" "$url"
}

shot 1440,900 brand-kit.png "http://127.0.0.1:$PORT/index.html" 10140F
shot 1160,640 cli-pages.png "http://127.0.0.1:$PORT/shots/cli-pages.html" 0B0E0A
shot 1000,480 cli-api.png "http://127.0.0.1:$PORT/shots/cli-api.html" 0B0E0A
shot 800,480 cli-json.png "http://127.0.0.1:$PORT/shots/cli-json.html" 0B0E0A
shot 960,420 github-action.png "http://127.0.0.1:$PORT/shots/github-action.html" 0B0E0A

echo "Wrote screenshots to $OUT"
