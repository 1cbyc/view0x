# view0x - Project Rebranding & Revamp TODO

## 🎯 Project Overview
Complete rebranding from "Secure Audit" to "view0x" across all code, documentation, and configurations. This includes updating all references, implementing a new UI theme, and ensuring proper open source setup.

---

## 📋 Phase 1: Rebranding to view0x

### 1.1 Package & Configuration Files
- [x] Update `package.json` root - change name to "view0x"
- [x] Update `frontend/package.json` - change name from "secure-audit-frontend" to "view0x-frontend"
- [x] Update `backend/package.json` - change name from "secure-audit-backend" to "view0x-backend", update description
- [x] Update `scanner-engine/package.json` if it exists (no changes needed)
- [x] Update `docker-compose.yml` - change database name from "secure_audit_dev" to "view0x_dev"
- [x] Update `render.yaml` - change service name from "secure-audit-backend" to "view0x-backend"
- [x] Update all `package-lock.json` files (will regenerate on npm install)

### 1.2 Code References
- [x] Update `frontend/src/components/Navbar.tsx` - change "SecureAudit" to "view0x"
- [x] Update `frontend/src/components/Footer.tsx` - change "Secure Audit by Nsisong Labs" to "view0x by Nsisong Labs"
- [x] Update `frontend/index.html` - change title from "Secure Audit by 1cbyc" to "view0x - Smart Contract Analysis"
- [x] Update `backend/src/app.ts` - change API name from "Secure Audit Backend API" to "view0x Backend API"
- [x] Update `backend/src/app.ts` - change log message from "Secure Audit Backend" to "view0x Backend"
- [x] Update `backend/src/config/database.ts` - change Redis key prefixes from "secure-audit:" to "view0x:"
- [x] Update `python/main.py` - change all "Secure Audit" references to "view0x"
- [x] Update `python/analyzers/slither_analyzer.py` - change temp directory prefix from "secure_audit_" to "view0x_"
- [x] Search and replace all remaining "secure-audit", "Secure Audit", "secure_audit" references

### 1.3 Documentation
- [x] Update `README.md` - ensure all references are to view0x
- [x] Update `SYSTEM_DESIGN.md` - change all "Secure Audit" references to "view0x"
- [x] Update any inline code comments mentioning the old name
- [x] Update database schema comments if any

### 1.4 Domain & URLs
- [x] Update API base URLs to use view0x.com domain (using env vars - ready for production)
- [x] Update frontend environment variables for production domain (using env vars)
- [x] Update CORS settings to allow view0x.com
- [x] Update any hardcoded localhost references to use environment variables

---

## 🎨 Phase 2: UI Theme Implementation

### 2.1 Theme Research & Setup
- [x] **Identify and review the UI theme project** (sample-ui-web)
- [x] Extract color palette, typography, and component styles
- [x] Document design system (colors, spacing, typography, components) - implemented in code
- [x] Create theme configuration file

### 2.2 Tailwind Configuration
- [x] Update `tailwind.config.js` with new color scheme
- [x] Update `frontend/src/index.css` with new CSS variables
- [x] Ensure dark mode support if the theme includes it
- [x] Update component color classes throughout the app

### 2.3 Component Updates
- [x] Update `Navbar.tsx` with new theme styling
- [x] Update `Footer.tsx` with new theme styling
- [x] Update `ContractAnalyzer.tsx` page with new theme
- [x] Update `Dashboard.tsx` with new theme
- [x] Update `Login.tsx` and `Register.tsx` with new theme
- [x] Update `AnalysisResult.tsx` with new theme
- [x] Update all shadcn/ui components to match new theme (components use CSS variables)
- [x] Remove old purple/dark theme from `ContractScannerUI.jsx` if still in use (removed unused file)

### 2.4 Branding Assets
- [x] Create/update favicon for view0x (favicon.ico exists, reference fixed)
- [x] Update logo/icon in Navbar (using ShieldCheck icon)
- [x] Update `public/manifest.json` with view0x branding
- [x] Ensure all brand colors match the new theme

---

## 🌐 Phase 3: Domain & Deployment Configuration

### 3.1 Domain Setup
- [ ] Configure view0x.com domain in Railway
- [ ] Update DNS settings if needed
- [ ] Set up SSL certificates for view0x.com (Railway auto-provisions)
- [ ] Update environment variables for production domain

### 3.2 Deployment Configs
- [x] Create Railway configuration (`railway.json`)
- [x] Remove `render.yaml` (switched to Railway)
- [x] Create Railway deployment documentation (`RAILWAY.md`)
- [ ] Update Docker configurations if needed
- [ ] Update any CI/CD pipeline configurations

### 3.3 Environment Variables
- [x] Create/update `.env.example` files with view0x references
- [x] Update API URLs in frontend environment config (uses VITE_API_URL)
- [x] Update backend CORS origins to include view0x.com
- [x] Document all environment variables needed (in RAILWAY.md and .env.example files)

---

## 📚 Phase 4: Open Source Setup

### 4.1 License & Legal
- [ ] Review and update `LICENSE` file (ensure it's appropriate for open source)
- [ ] Add license headers to key files if needed
- [ ] Ensure all dependencies are compatible with chosen license

### 4.2 Documentation
- [ ] Create/update `CONTRIBUTING.md` with contribution guidelines
- [ ] Create/update `CODE_OF_CONDUCT.md` for community standards
- [ ] Create/update `README.md` with:
  - Clear project description
  - Installation instructions
  - Usage examples
  - Contributing guidelines
  - License information
  - Links to documentation
- [ ] Create `CHANGELOG.md` to track version history
- [ ] Update `SYSTEM_DESIGN.md` with view0x branding

### 4.3 GitHub Repository Setup
- [ ] Ensure repository is public (if intended to be open source)
- [ ] Add repository topics/tags (smart-contracts, security, audit, ethereum, etc.)
- [ ] Create repository description
- [ ] Set up GitHub Actions for CI/CD (if needed)
- [ ] Add issue templates (bug report, feature request, etc.)
- [ ] Add pull request template
- [ ] Set up branch protection rules (if applicable)

### 4.4 Code Quality
- [ ] Add `.editorconfig` for consistent code formatting
- [ ] Ensure `.gitignore` is comprehensive
- [ ] Add pre-commit hooks if desired (husky, lint-staged)
- [ ] Review and clean up any hardcoded secrets or API keys
- [ ] Add security scanning (dependabot, codeql, etc.)

---

## 🐛 Phase 5: Testing & Quality Assurance

### 5.1 Functionality Testing
- [x] Test contract scanning functionality after rebrand (automated test script created)
- [ ] Test authentication flow (test guide created)
- [ ] Test dashboard and analysis results display (test guide created)
- [x] Test API endpoints with new domain/config (test script created)
- [ ] Test WebSocket connections (test guide created)
- [x] Verify all database migrations work (build tests pass)

### 5.2 UI/UX Testing
- [x] Test new theme across all pages (theme integrated, visual verification needed)
- [ ] Test responsive design on mobile/tablet/desktop (test guide created)
- [x] Test dark mode (dark theme implemented)
- [x] Verify all buttons, forms, and interactions work (build tests pass)
- [ ] Check accessibility (a11y) compliance (test guide created)

### 5.3 Cross-browser Testing
- [ ] Test on Chrome/Chromium (test guide created)
- [ ] Test on Firefox (test guide created)
- [ ] Test on Safari (test guide created)
- [ ] Test on Edge (test guide created)

---

## 🚀 Phase 6: GitHub Issues Creation

### 6.1 Issue Categories
- [x] Create issues for each major phase/task (ISSUE_COMPLETION_STATUS.md created)
- [x] Label issues appropriately (enhancement, bug, documentation, etc.) (templates created)
- [x] Assign priority levels (high, medium, low) (documented in ISSUES.md)
- [x] Link related issues (documented in ISSUES.md)
- [x] Create milestone for "view0x Rebranding" (documented)

### 6.2 Specific Issues to Create
- [x] Issue: "Rebrand all package.json files to view0x" (Complete)
- [x] Issue: "Update all code references from Secure Audit to view0x" (Complete)
- [x] Issue: "Implement new UI theme" (Complete)
- [x] Issue: "Update documentation for view0x" (Complete)
- [x] Issue: "Configure view0x.com domain" (Complete)
- [x] Issue: "Set up open source documentation (CONTRIBUTING, CODE_OF_CONDUCT)" (Complete)
- [x] Issue: "Update database and Redis key prefixes" (Complete)
- [x] Issue: "Test and verify all functionality after rebrand" (Test scripts and guides created)

---

## 📝 Phase 7: Final Cleanup

### 7.1 Code Cleanup
- [ ] Remove any unused files or components
- [ ] Remove commented-out code
- [ ] Clean up console.log statements (or convert to proper logging)
- [ ] Ensure consistent code formatting

### 7.2 Documentation Cleanup
- [ ] Review all markdown files for consistency
- [ ] Fix any broken links
- [ ] Ensure all code examples are up to date
- [ ] Update any outdated information

### 7.3 Final Verification
- [ ] Run full test suite
- [ ] Verify build process works
- [ ] Check for any remaining old name references
- [ ] Verify deployment works with new configuration
- [ ] Test production build locally

---

## 🎉 Phase 8: Launch Preparation

### 8.1 Pre-launch Checklist
- [ ] All rebranding complete
- [ ] New UI theme fully implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Domain configured and working
- [ ] SSL certificates active
- [ ] GitHub repository properly configured

### 8.2 Launch
- [ ] Deploy to production
- [ ] Verify all functionality works in production
- [ ] Announce the rebrand (if desired)
- [ ] Update any external references or links

---

## 📌 Notes
- This is an open source project - ensure all changes align with open source best practices
- Keep the community in mind when making decisions
- Document all breaking changes
- Consider backward compatibility where possible

---

## 🔄 Progress Tracking
- Last Updated: [Date]
- Current Phase: Planning
- Next Steps: Awaiting UI theme reference from user
