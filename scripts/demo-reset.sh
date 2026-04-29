#!/bin/bash
# Demo Reset Script
# Usage: bash scripts/demo-reset.sh [--mode=soft|full]
#   --mode=soft   Keep users, reset tasks/chats (default)
#   --mode=full   Full wipe and re-seed (destroys all data)

set -e

MODE="${1:---mode=soft}"
MODE="${MODE#--mode=}"

DEMO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$DEMO_DIR/.." && pwd)"

echo "=== BridgeAI Demo Reset ==="
echo "Mode: $MODE"
echo ""

if [ "$MODE" = "full" ]; then
  echo "[1/4] Stopping demo stack..."
  cd "$DEMO_DIR/deploy/demo"
  docker compose down -v
  echo "[2/4] Starting demo stack..."
  docker compose up -d
  echo "[3/4] Running migrations..."
  cd "$PROJECT_ROOT/apps/server"
  npm run db:migrate 2>/dev/null || echo "Migrations skipped (no migrations to run)"
  echo "[4/4] Seeding demo data..."
  npm run db:seed:demo
else
  echo "[1/2] Running demo seed (soft reset)..."
  cd "$PROJECT_ROOT/apps/server"
  npm run db:seed:demo
  echo "[2/2] Verification..."
  curl -sf http://localhost:3000/health > /dev/null && echo "API is healthy" || echo "Warning: API not responding"
fi

echo ""
echo "=== Done ==="