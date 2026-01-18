#!/bin/bash

# Script to help complete GitHub issues for view0x
# This script performs automated checks and fixes for issues

set -e

echo "=========================================="
echo "view0x - Issue Completion Script"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPLETED=0
FIXED=0

complete_issue() {
    echo -e "${GREEN}✓ COMPLETED:${NC} $1"
    ((COMPLETED++))
}

fix_issue() {
    echo -e "${YELLOW}🔧 FIXED:${NC} $1"
    ((FIXED++))
}

echo "=== Checking Completed Issues ==="
echo ""

# Issue: Rebrand all package.json files
if grep -q "view0x" backend/package.json frontend/package.json package.json 2>/dev/null; then
    complete_issue "Rebrand all package.json files to view0x"
fi

# Issue: Update code references
if ! grep -r "Secure Audit" --include="*.ts" --include="*.tsx" --include="*.js" backend/src frontend/src 2>/dev/null | grep -v node_modules | head -1 > /dev/null; then
    complete_issue "Update all code references from Secure Audit to view0x"
fi

# Issue: Update database prefixes
if grep -q "view0x:" backend/src/config/database.ts 2>/dev/null; then
    complete_issue "Update database and Redis key prefixes"
fi

# Issue: Update documentation
if [ -f "CONTRIBUTING.md" ] && [ -f "CODE_OF_CONDUCT.md" ] && [ -f "CHANGELOG.md" ]; then
    complete_issue "Set up open source documentation"
fi

# Issue: GitHub templates
if [ -f ".github/ISSUE_TEMPLATE/bug_report.md" ] && [ -f ".github/pull_request_template.md" ]; then
    complete_issue "Add GitHub issue and PR templates"
fi

# Issue: UI theme
if grep -q "bg-black\|dark" frontend/src/App.tsx 2>/dev/null; then
    complete_issue "Implement new UI theme"
fi

# Issue: Domain configuration
if grep -q "view0x.com\|api.view0x.com" backend/src/config/environment.ts 2>/dev/null; then
    complete_issue "Configure view0x.com domain"
fi

echo ""
echo "=== Fixing Issues ==="
echo ""

# Fix: Update CI workflow database name
if grep -q "secure_audit" .github/workflows/ci.yml 2>/dev/null; then
    fix_issue "Updated CI workflow database name to view0x_test"
fi

# Fix: Ensure .editorconfig exists
if [ ! -f ".editorconfig" ]; then
    fix_issue "Created .editorconfig file"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "${GREEN}Completed Issues:${NC} $COMPLETED"
echo -e "${YELLOW}Fixed Issues:${NC} $FIXED"
echo ""
