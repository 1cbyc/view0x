# Changelog

All notable changes to view0x will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Public contract analysis endpoint (no authentication required)
- Solidity syntax highlighting in code editor
- Dark theme UI integration
- CodeMirror editor for contract input
- GitHub "Star on GitHub" button in footer
- Improved error handling and user feedback
- Support for unauthenticated contract scanning

### Changed
- Rebranded from "Secure Audit" to "view0x"
- Updated all documentation with view0x branding
- Improved login/registration flow
- Enhanced contract analysis error handling

### Fixed
- CORS configuration for production domains
- Authentication token validation
- Registration form validation
- WebSocket connection handling

## [0.1.0] - 2026-01-18

### Added
- Initial release of view0x
- Smart contract security analysis with Slither
- User authentication and registration
- Analysis history tracking
- Real-time analysis updates via WebSocket
- Docker Compose setup for local development
- Railway deployment configuration
- Cloudflare Pages deployment configuration

[Unreleased]: https://github.com/1cbyc/view0x/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/1cbyc/view0x/releases/tag/v0.1.0
