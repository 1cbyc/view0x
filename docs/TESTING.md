# Testing Guide for view0x

This document outlines the testing procedures and checklists for view0x.

## Functionality Testing

### Contract Scanning
- [ ] **Public endpoint (no auth)**: Test contract analysis without login
  - [ ] Submit a sample Solidity contract
  - [ ] Verify analysis completes successfully
  - [ ] Check that results display correctly
  - [ ] Verify vulnerability detection works

- [ ] **Authenticated endpoint**: Test contract analysis with login
  - [ ] Login as a registered user
  - [ ] Submit contract for analysis
  - [ ] Verify WebSocket real-time updates work
  - [ ] Check analysis history is saved

- [ ] **Error handling**: Test various error scenarios
  - [ ] Invalid contract code (syntax errors)
  - [ ] Empty contract code
  - [ ] Very large contracts (size limits)
  - [ ] Network errors/timeouts

### Authentication Flow
- [ ] **Registration**
  - [ ] Register with valid email/password
  - [ ] Verify email validation
  - [ ] Verify password strength requirements (min 8 chars)
  - [ ] Test duplicate email registration (should fail)
  - [ ] Verify optional company field works

- [ ] **Login**
  - [ ] Login with valid credentials
  - [ ] Login with invalid credentials (should fail)
  - [ ] Verify token is stored in localStorage
  - [ ] Verify redirect to main page after login
  - [ ] Test logout functionality

- [ ] **Session Management**
  - [ ] Verify token expiration handling
  - [ ] Test refresh token functionality
  - [ ] Verify logout clears all tokens

### Dashboard and Results
- [ ] **Dashboard Display**
  - [ ] Verify analysis history loads correctly
  - [ ] Check pagination (if implemented)
  - [ ] Test filtering/sorting (if implemented)
  - [ ] Verify "No analyses" state displays correctly

- [ ] **Analysis Results**
  - [ ] Verify vulnerability details display correctly
  - [ ] Check severity badges/colors
  - [ ] Test accordion expansion/collapse
  - [ ] Verify line number links work (if implemented)
  - [ ] Test report download/export (if implemented)

### API Endpoints
- [ ] **Health checks**
  - [ ] `/health` endpoint returns 200
  - [ ] `/api/analysis/health/check` works

- [ ] **Public endpoints**
  - [ ] `POST /api/analysis/public` works without auth
  - [ ] Verify CORS headers are correct

- [ ] **Protected endpoints**
  - [ ] `POST /api/analysis` requires authentication
  - [ ] `GET /api/analysis` returns user's analyses
  - [ ] `GET /api/auth/me` returns current user

### WebSocket Connections
- [ ] **Connection**
  - [ ] WebSocket connects on page load (when authenticated)
  - [ ] WebSocket disconnects on logout
  - [ ] Verify reconnection on network errors

- [ ] **Real-time Updates**
  - [ ] Subscribe to analysis updates
  - [ ] Receive progress updates during analysis
  - [ ] Receive completion notification
  - [ ] Handle error notifications

### Database Migrations
- [ ] **Initial Setup**
  - [ ] Run migrations on fresh database
  - [ ] Verify all tables are created
  - [ ] Check indexes are created

- [ ] **Data Integrity**
  - [ ] Test user creation
  - [ ] Test analysis creation and retrieval
  - [ ] Verify foreign key constraints

## UI/UX Testing

### Theme Consistency
- [ ] **Dark Theme**
  - [ ] All pages use dark theme consistently
  - [ ] Text contrast meets accessibility standards
  - [ ] Accent colors (purple/primary) are visible
  - [ ] No bright flashes or jarring transitions

- [ ] **Components**
  - [ ] Buttons use consistent styling
  - [ ] Cards have consistent shadows/borders
  - [ ] Input fields have consistent styling
  - [ ] Alerts/notifications use theme colors

### Responsive Design
- [ ] **Mobile (< 640px)**
  - [ ] Navigation menu is accessible
  - [ ] Contract editor is usable
  - [ ] Results display correctly
  - [ ] Forms are easy to fill
  - [ ] Buttons are easily tappable

- [ ] **Tablet (640px - 1024px)**
  - [ ] Layout adapts appropriately
  - [ ] No horizontal scrolling
  - [ ] All features are accessible

- [ ] **Desktop (> 1024px)**
  - [ ] Full layout displays correctly
  - [ ] Side-by-side editor/results work
  - [ ] Hover states work correctly

### Interactions
- [ ] **Forms**
  - [ ] Input validation messages display
  - [ ] Form submission works
  - [ ] Loading states show during submission
  - [ ] Success/error messages display

- [ ] **Buttons**
  - [ ] All buttons respond to clicks
  - [ ] Disabled states work correctly
  - [ ] Loading spinners show when appropriate

- [ ] **Navigation**
  - [ ] All links work correctly
  - [ ] Active route highlighting works
  - [ ] Browser back/forward works
  - [ ] Direct URL access works (no 404s)

### Accessibility (a11y)
- [ ] **Keyboard Navigation**
  - [ ] All interactive elements are keyboard accessible
  - [ ] Tab order is logical
  - [ ] Focus indicators are visible
  - [ ] Escape key closes modals/dropdowns

- [ ] **Screen Readers**
  - [ ] All images have alt text
  - [ ] Form inputs have labels
  - [ ] ARIA labels are present where needed
  - [ ] Semantic HTML is used

- [ ] **Color Contrast**
  - [ ] Text meets WCAG AA standards (4.5:1 for normal text)
  - [ ] Interactive elements meet contrast requirements
  - [ ] Information isn't conveyed by color alone

## Cross-Browser Testing

### Chrome/Chromium
- [ ] Latest version works correctly
- [ ] All features function properly
- [ ] No console errors
- [ ] Performance is acceptable

### Firefox
- [ ] Latest version works correctly
- [ ] WebSocket connections work
- [ ] CSS renders correctly
- [ ] JavaScript executes without errors

### Safari
- [ ] Latest version works correctly
- [ ] WebSocket connections work
- [ ] CSS animations work
- [ ] No Safari-specific issues

### Edge
- [ ] Latest version works correctly
- [ ] All features function properly
- [ ] Compatibility with Chromium features

## Performance Testing

- [ ] **Page Load**
  - [ ] Initial page load < 2 seconds
  - [ ] Time to interactive < 3 seconds
  - [ ] No unnecessary large assets

- [ ] **Analysis Performance**
  - [ ] Simple contracts analyze in < 5 seconds
  - [ ] Complex contracts analyze in < 30 seconds
  - [ ] Progress updates are smooth

- [ ] **Network Requests**
  - [ ] API calls are optimized
  - [ ] No unnecessary requests
  - [ ] Caching works where appropriate

## Security Testing

- [ ] **Authentication**
  - [ ] Passwords are not logged or exposed
  - [ ] Tokens are stored securely
  - [ ] Invalid tokens are rejected
  - [ ] Rate limiting works

- [ ] **Input Validation**
  - [ ] SQL injection attempts are blocked
  - [ ] XSS attempts are sanitized
  - [ ] File upload size limits enforced
  - [ ] Malicious contract code is handled safely

- [ ] **CORS**
  - [ ] Only allowed origins can access API
  - [ ] Preflight requests work correctly
  - [ ] Credentials are handled correctly

## Test Checklist Template

Use this checklist for each release:

```
Release: [version]
Date: [date]
Tester: [name]

Functionality: [ ] Pass [ ] Fail [ ] N/A
UI/UX: [ ] Pass [ ] Fail [ ] N/A
Cross-Browser: [ ] Pass [ ] Fail [ ] N/A
Performance: [ ] Pass [ ] Fail [ ] N/A
Security: [ ] Pass [ ] Fail [ ] N/A

Notes:
[Any issues or observations]

```
