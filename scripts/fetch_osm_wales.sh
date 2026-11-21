#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$ROOT/scripts/fetch_osm_wales.py"
python3 "$ROOT/scripts/build_river_reaches.py"
echo "Re-run: cd web && npm run etl (if sites stale)"