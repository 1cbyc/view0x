#!/bin/bash

# view0x - Comprehensive Test Script
# This script runs through the testing checklist from TESTING.md

set -e

echo "=========================================="
echo "view0x - Comprehensive Testing Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

test_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

test_skip() {
    echo -e "${YELLOW}⊘ SKIP:${NC} $1"
    ((SKIPPED++))
}

# Check if services are running
check_service() {
    local service=$1
    local url=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

echo "=== Phase 1: Environment Check ==="
echo ""

# Check if backend is running
if check_service "backend" "http://localhost:3001/health"; then
    test_pass "Backend service is running"
else
    test_fail "Backend service is not running (http://localhost:3001/health)"
fi

# Check if frontend is running
if check_service "frontend" "http://localhost:3000"; then
    test_pass "Frontend service is running"
else
    test_fail "Frontend service is not running (http://localhost:3000)"
fi

# Check if database is accessible
if docker ps | grep -q "db"; then
    test_pass "PostgreSQL container is running"
else
    test_fail "PostgreSQL container is not running"
fi

# Check if Redis is accessible
if docker ps | grep -q "redis"; then
    test_pass "Redis container is running"
else
    test_fail "Redis container is not running"
fi

echo ""
echo "=== Phase 2: API Endpoint Testing ==="
echo ""

# Test health endpoint
if curl -s -f "http://localhost:3001/health" > /dev/null 2>&1; then
    test_pass "Health endpoint responds"
else
    test_fail "Health endpoint does not respond"
fi

# Test public analysis endpoint
PUBLIC_ANALYSIS_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/analysis/public" \
    -H "Content-Type: application/json" \
    -d '{"contractCode":"pragma solidity ^0.8.0; contract Test {}"}' 2>&1)

if echo "$PUBLIC_ANALYSIS_RESPONSE" | grep -q "success\|vulnerabilities"; then
    test_pass "Public analysis endpoint works"
else
    test_fail "Public analysis endpoint failed"
    echo "Response: $PUBLIC_ANALYSIS_RESPONSE"
fi

echo ""
echo "=== Phase 3: Build Testing ==="
echo ""

# Test backend build
if [ -d "backend" ]; then
    cd backend
    if npm run build > /dev/null 2>&1; then
        test_pass "Backend builds successfully"
    else
        test_fail "Backend build failed"
    fi
    cd ..
else
    test_skip "Backend directory not found"
fi

# Test frontend build
if [ -d "frontend" ]; then
    cd frontend
    if npm run build > /dev/null 2>&1; then
        test_pass "Frontend builds successfully"
    else
        test_fail "Frontend build failed"
    fi
    cd ..
else
    test_skip "Frontend directory not found"
fi

echo ""
echo "=== Phase 4: Code Quality ==="
echo ""

# Check for TypeScript errors in backend
if [ -d "backend" ]; then
    cd backend
    if npx tsc --noEmit > /dev/null 2>&1; then
        test_pass "Backend TypeScript compiles without errors"
    else
        test_fail "Backend has TypeScript errors"
    fi
    cd ..
fi

# Check for TypeScript errors in frontend
if [ -d "frontend" ]; then
    cd frontend
    if npx tsc --noEmit > /dev/null 2>&1; then
        test_pass "Frontend TypeScript compiles without errors"
    else
        test_fail "Frontend has TypeScript errors"
    fi
    cd ..
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
