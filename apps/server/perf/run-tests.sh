#!/bin/bash

# Performance Test Runner
# Runs k6 performance tests for BridgeAI API

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
RESULTS_DIR="${RESULTS_DIR:-./perf/results}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to check if k6 is installed
check_k6() {
  if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Please install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
  fi
}

# Function to check if server is running
check_server() {
  echo -e "${YELLOW}Checking if server is running at $BASE_URL...${NC}"
  if ! curl -s "$BASE_URL/api/v1/health" > /dev/null; then
    echo -e "${RED}Error: Server is not running at $BASE_URL${NC}"
    echo "Please start the server first:"
    echo "  cd apps/server && npm run dev"
    exit 1
  fi
  echo -e "${GREEN}Server is running${NC}"
}

# Function to run a test
run_test() {
  local test_file=$1
  local test_name=$2
  local output_file="$RESULTS_DIR/$(basename "$test_file" .js)-$(date +%Y%m%d-%H%M%S)"

  echo -e "${YELLOW}=========================================${NC}"
  echo -e "${YELLOW}Running: $test_name${NC}"
  echo -e "${YELLOW}=========================================${NC}"

  # Run test with JSON output for analysis
  k6 run \
    --env BASE_URL="$BASE_URL" \
    --out json="${output_file}.json" \
    --summary-export="${output_file}-summary.json" \
    "$test_file"

  echo -e "${GREEN}Test completed. Results saved to:${NC}"
  echo -e "  - ${output_file}.json"
  echo -e "  - ${output_file}-summary.json"
  echo ""
}

# Function to generate report
generate_report() {
  echo -e "${YELLOW}Generating performance report...${NC}"

  local report_file="$RESULTS_DIR/performance-report-$(date +%Y%m%d-%H%M%S).md"

  cat > "$report_file" << EOF
# BridgeAI Infrastructure Performance Test Report

**Date:** $(date)
**Base URL:** $BASE_URL

## Summary

This report contains the results of performance tests for BridgeAI infrastructure.

### Test Files

EOF

  # List all test result files
  for file in "$RESULTS_DIR"/*-summary.json; do
    if [ -f "$file" ]; then
      local test_name=$(basename "$file" -summary.json)
      echo "- $test_name" >> "$report_file"
    fi
  done

  echo "" >> "$report_file"
  echo "## Performance Thresholds" >> "$report_file"
  echo "" >> "$report_file"
  echo "| Metric | Target | Status |" >> "$report_file"
  echo "|--------|--------|--------|" >> "$report_file"
  echo "| API P95 Response Time | < 200ms | TBD |" >> "$report_file"
  echo "| API P99 Response Time | < 500ms | TBD |" >> "$report_file"
  echo "| Database Query P95 | < 50ms (simple), < 300ms (complex) | TBD |" >> "$report_file"
  echo "| Error Rate | < 1% | TBD |" >> "$report_file"
  echo "" >> "$report_file"

  echo -e "${GREEN}Report generated: $report_file${NC}"
}

# Main execution
main() {
  echo -e "${GREEN}BridgeAI Performance Test Runner${NC}"
  echo ""

  # Check prerequisites
  check_k6
  check_server

  # Parse command line arguments
  case "${1:-all}" in
    baseline)
      run_test "./perf/api-baseline-test.js" "Baseline Performance Test"
      ;;
    load)
      run_test "./perf/api-load-test.js" "Load Test"
      ;;
    stress)
      run_test "./perf/api-rate-limit-test.js" "Rate Limiter Stress Test"
      ;;
    db)
      run_test "./perf/db-performance-test.js" "Database Performance Test"
      ;;
    all)
      run_test "./perf/api-baseline-test.js" "Baseline Performance Test"
      run_test "./perf/api-load-test.js" "Load Test"
      run_test "./perf/api-rate-limit-test.js" "Rate Limiter Stress Test"
      run_test "./perf/db-performance-test.js" "Database Performance Test"
      generate_report
      ;;
    *)
      echo "Usage: $0 [baseline|load|stress|db|all]"
      echo ""
      echo "Commands:"
      echo "  baseline  - Run baseline performance test"
      echo "  load      - Run load test with ramping"
      echo "  stress    - Run rate limiter stress test"
      echo "  db        - Run database performance test"
      echo "  all       - Run all tests (default)"
      exit 1
      ;;
  esac
}

main "$@"
