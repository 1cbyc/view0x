# Test Execution Guide

This guide helps you systematically run all tests from `TESTING.md`.

## Prerequisites

1. **Start Services**
   ```bash
   # Start database and Redis
   docker-compose up db redis -d
   
   # Start backend (in one terminal)
   cd backend
   npm run dev
   
   # Start frontend (in another terminal)
   cd frontend
   npm run dev
   ```

2. **Verify Services**
   - Backend: http://localhost:3001/health
   - Frontend: http://localhost:3000
   - Database: Check with `docker ps`

## Automated Tests

Run the automated test suite:
```bash
./scripts/test-all.sh
```

This will test:
- Service availability
- API endpoints
- Build processes
- TypeScript compilation

## Manual Testing Checklist

### 1. Contract Scanning (Public Endpoint)

**Test Steps:**
1. Open http://localhost:3000
2. Without logging in, paste sample contract code
3. Click "Analyze Contract"
4. Verify results appear

**Expected Results:**
- Analysis completes without requiring login
- Results display with vulnerabilities
- No 401 errors

**Sample Contract:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableContract {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function setOwner(address newOwner) public {
        owner = newOwner;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function transfer(address to, uint256 amount) public {
        require(tx.origin == owner, "Not authorized");
        balances[to] += amount;
    }
}
```

### 2. Authentication Flow

**Registration:**
1. Go to /register
2. Fill in: Name, Email, Password (min 8 chars)
3. Submit
4. Verify redirect to login page
5. Verify success message

**Login:**
1. Go to /login
2. Enter registered credentials
3. Submit
4. Verify redirect to main page
5. Verify Navbar shows user name/logout button

**Logout:**
1. Click logout button
2. Verify redirect to login
3. Verify tokens cleared from localStorage

### 3. Contract Scanning (Authenticated)

**Test Steps:**
1. Login as registered user
2. Submit contract for analysis
3. Watch for WebSocket connection
4. Verify real-time progress updates
5. Check analysis appears in dashboard

### 4. Dashboard

**Test Steps:**
1. Login
2. Go to /dashboard
3. Verify analysis history loads
4. Click on an analysis
5. Verify detailed results display

### 5. API Endpoints

**Test with curl:**

```bash
# Health check
curl http://localhost:3001/health

# Public analysis
curl -X POST http://localhost:3001/api/analysis/public \
  -H "Content-Type: application/json" \
  -d '{"contractCode":"pragma solidity ^0.8.0; contract Test {}"}'

# Protected endpoint (requires token)
curl -X GET http://localhost:3001/api/analysis \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. WebSocket

**Test Steps:**
1. Open browser DevTools → Network → WS
2. Login to application
3. Submit contract analysis
4. Verify WebSocket connection established
5. Watch for real-time updates

### 7. Responsive Design

**Test on Different Screen Sizes:**
1. Open DevTools → Toggle device toolbar
2. Test mobile (375px)
3. Test tablet (768px)
4. Test desktop (1920px)
5. Verify layout adapts correctly

### 8. Cross-Browser

**Test in:**
- Chrome/Chromium
- Firefox
- Safari
- Edge

**Check:**
- All features work
- No console errors
- UI renders correctly

### 9. Accessibility

**Tools:**
- Chrome DevTools → Lighthouse → Accessibility
- axe DevTools extension
- Keyboard navigation

**Check:**
- All interactive elements keyboard accessible
- Color contrast meets WCAG AA
- Screen reader compatibility

## Test Results Template

```
Test Date: [date]
Tester: [name]
Environment: [local/production]

Functionality Tests:
- Contract Scanning (Public): [ ] Pass [ ] Fail
- Authentication: [ ] Pass [ ] Fail
- Dashboard: [ ] Pass [ ] Fail
- API Endpoints: [ ] Pass [ ] Fail
- WebSocket: [ ] Pass [ ] Fail

UI/UX Tests:
- Theme Consistency: [ ] Pass [ ] Fail
- Responsive Design: [ ] Pass [ ] Fail
- Interactions: [ ] Pass [ ] Fail
- Accessibility: [ ] Pass [ ] Fail

Cross-Browser:
- Chrome: [ ] Pass [ ] Fail
- Firefox: [ ] Pass [ ] Fail
- Safari: [ ] Pass [ ] Fail
- Edge: [ ] Pass [ ] Fail

Issues Found:
[list any issues]

```
