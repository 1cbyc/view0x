# GitHub Issues Guide

This document lists the recommended GitHub issues to create for tracking view0x development work.

## How to Create Issues

1. Go to https://github.com/1cbyc/view0x/issues/new
2. Use the appropriate template (bug report or feature request)
3. Fill in the details from the list below
4. Assign appropriate labels and milestones

## Issue Categories

### Phase 1: Rebranding (Mostly Complete)
These issues track the rebranding from "Secure Audit" to "view0x":

- **Rebrand all package.json files to view0x** 
  - Status: Complete
  - Files: `package.json`, `backend/package.json`, `frontend/package.json`

- **Update all code references from Secure Audit to view0x**
  - Status: Complete
  - Includes: API names, log messages, database prefixes

- **Update database and Redis key prefixes**
  - Status: Complete
  - Changed to `view0x:` prefix

- **Update documentation for view0x**
  - Status: Complete
  - Files: `README.md`, `SYSTEM_DESIGN.md`, etc.

### Phase 2: UI/Theme (Mostly Complete)
- **Implement new UI theme**
  - Status: Complete
  - Dark theme integrated from sample-ui-web

- [ ] **Enhance responsive design for mobile/tablet**
  - Priority: Medium
  - Description: Improve mobile experience, ensure all features work on smaller screens

- [ ] **Improve accessibility (a11y) compliance**
  - Priority: Medium
  - Description: Ensure WCAG AA compliance, keyboard navigation, screen reader support

### Phase 3: Deployment (In Progress)
- **Configure view0x.com domain**
  - Status: In Progress
  - Backend: Railway with api.view0x.com
  - Frontend: Cloudflare Pages with view0x.com

- [ ] **Set up SSL certificates for production**
  - Priority: High
  - Status: Handled by Railway/Cloudflare

- [ ] **Configure environment variables for production**
  - Priority: High
  - Description: Ensure all production environment variables are set correctly

### Phase 4: Open Source Setup (Complete)
- **Set up open source documentation (CONTRIBUTING, CODE_OF_CONDUCT)**
  - Status: Complete
  - Files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`

- **Add GitHub issue templates**
  - Status: Complete
  - Templates: Bug report, Feature request

- **Add pull request template**
  - Status: Complete
  - File: `.github/pull_request_template.md`

### Phase 5: Testing & Verification (Current)
- [ ] **Test contract scanning functionality after rebrand**
  - Priority: High
  - Description: Verify all analysis features work correctly with new branding

- [ ] **Test authentication flow end-to-end**
  - Priority: High
  - Description: Test registration, login, logout, session management

- [ ] **Test dashboard and analysis results display**
  - Priority: Medium
  - Description: Verify all data displays correctly, UI components work

- [ ] **Test API endpoints with new domain/config**
  - Priority: High
  - Description: Verify all API endpoints work with api.view0x.com

- [ ] **Test WebSocket connections**
  - Priority: Medium
  - Description: Verify real-time updates work correctly

- [ ] **Verify all database migrations work**
  - Priority: High
  - Description: Test migrations on fresh database

- [ ] **Test new theme across all pages**
  - Priority: Medium
  - Description: Ensure consistent theming on all pages

- [ ] **Test responsive design on mobile/tablet/desktop**
  - Priority: Medium
  - Description: Verify layout works on all screen sizes

- [ ] **Test cross-browser compatibility**
  - Priority: Medium
  - Description: Test on Chrome, Firefox, Safari, Edge

- [ ] **Check accessibility (a11y) compliance**
  - Priority: Medium
  - Description: Verify WCAG AA compliance

### Phase 6: Future Enhancements
- [ ] **Add automated testing suite**
  - Priority: Low
  - Description: Set up unit tests, integration tests, E2E tests

- [ ] **Add CI/CD pipeline**
  - Priority: Medium
  - Description: Automate testing and deployment

- [ ] **Add security scanning (dependabot, codeql)**
  - Priority: Medium
  - Description: Set up automated security scanning

- [ ] **Add pre-commit hooks (husky, lint-staged)**
  - Priority: Low
  - Description: Automate code quality checks before commits

## Issue Template

When creating issues manually, use this format:

```markdown
**Priority:** [High/Medium/Low]
**Category:** [Rebranding/UI/Deployment/Testing/Enhancement]
**Labels:** [bug/enhancement/documentation/testing]

## Description
[Clear description of what needs to be done]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Related Issues
[Link to related issues using #issue_number]

## Additional Notes
[Any additional context or information]
```

## Milestones

Recommended milestones:
1. **view0x Rebranding** - Core rebranding work (mostly complete)
2. **UI Enhancement** - Theme and UI improvements (mostly complete)
3. **Testing & QA** - Testing and verification phase (current)
4. **Production Launch** - Final preparation for production
5. **v1.0.0 Release** - Initial stable release

## Labels

Recommended labels:
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `testing` - Testing and QA tasks
- `priority:high` - High priority items
- `priority:medium` - Medium priority items
- `priority:low` - Low priority items
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
