#!/bin/bash

# Master Test Runner Script
# Runs all automated tests in sequence

echo "🧪 EMBROIDERY INVENTORY MANAGER - COMPLETE TEST SUITE"
echo "======================================================"
echo ""
echo "📅 Started: $(date)"
echo ""

# Track results
PASSED=0
FAILED=0

# Function to run test and track result
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔬 Running: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if $test_command; then
        echo ""
        echo "✅ $test_name PASSED"
        ((PASSED++))
        return 0
    else
        echo ""
        echo "❌ $test_name FAILED"
        ((FAILED++))
        return 1
    fi
}

# Check server is running
if ! curl -s http://localhost:3002 > /dev/null; then
    echo "❌ Server is not running on http://localhost:3002"
    echo "   Please start the server with: npm start"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Run all tests
run_test "Data Integrity Test" "node data-integrity-test.js"
run_test "API Endpoint Test" "node api-test.js"
run_test "Security Test" "node security-test.js"
run_test "Server-Side Test" "node server-side-test.js"
run_test "Mobile Interaction Test" "node mobile-test.js"
run_test "Accessibility Test" "node accessibility-test.js"

# Skip performance test if it's slow, make it optional
# run_test "Performance Test" "node performance-test.js"

# Optionally run browser-based test (takes longer)
if [ "$1" == "--full" ]; then
    run_test "Browser Comprehensive Test" "node comprehensive-test.js"
fi

# Final Report
echo ""
echo "======================================================"
echo "📊 FINAL TEST SUMMARY"
echo "======================================================"
echo ""
echo "✅ Tests Passed: $PASSED"
echo "❌ Tests Failed: $FAILED"
echo ""
echo "📅 Completed: $(date)"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED!"
    exit 0
else
    echo "⚠️  SOME TESTS FAILED"
    echo ""
    echo "💡 Tip: Run './run-all-tests.sh --full' to include browser tests"
    exit 1
fi

