#!/bin/bash
#
# Redis Health Check Script
# Usage: ./redis-healthcheck.sh [REDIS_URL]
# Default: redis://localhost:6379
#

set -e

REDIS_URL="${1:-${REDIS_URL:-redis://localhost:6379}}"
REDIS_HOST="${REDIS_URL#redis://}"
REDIS_HOST="${REDIS_HOST%:6379}"
REDIS_PORT="${REDIS_URL##*:}"
TIMEOUT=5

echo "Checking Redis health: $REDIS_HOST:$REDIS_PORT"

if ! command -v redis-cli > /dev/null 2>&1; then
    echo "ERROR: redis-cli not found. Please install Redis CLI."
    exit 2
fi

# Test connection with timeout
PING_RESULT=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --no-auth-warning -t "$TIMEOUT" PING 2>&1) || true

if [ "$PING_RESULT" = "PONG" ]; then
    echo "✓ Redis is healthy"
    exit 0
elif [[ "$PING_RESULT" == *"NOAUTH"* ]]; then
    # Try with password if available
    if [ -n "$REDIS_PASSWORD" ]; then
        PING_RESULT=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning PING 2>&1) || true
        if [ "$PING_RESULT" = "PONG" ]; then
            echo "✓ Redis is healthy (authenticated)"
            exit 0
        fi
    fi
    echo "✗ Redis requires authentication. Set REDIS_PASSWORD env variable."
    exit 2
else
    echo "✗ Redis is unhealthy: $PING_RESULT"
    exit 2
fi