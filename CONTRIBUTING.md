# Contributing to view0x

Thank you for your interest in contributing to view0x! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Environment details (OS, Node.js version, etc.)
- Screenshots if applicable

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:
- A clear description of the feature
- Use case and motivation
- Potential implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Test your changes** thoroughly
5. **Commit your changes** with clear, descriptive messages
6. **Push to your fork** and open a Pull Request

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/1cbyc/view0x.git
   cd view0x
   ```

2. Install dependencies:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. Set up environment variables (see `.env.example` files)

4. Start development servers:
   ```bash
   # Backend (from backend/)
   npm run dev
   
   # Frontend (from frontend/)
   npm run dev
   ```

5. Run tests:
   ```bash
   npm test
   ```

## Coding Standards

- **TypeScript**: Use TypeScript for all new code
- **Linting**: Follow ESLint rules (run `npm run lint`)
- **Formatting**: Use consistent formatting (see `.editorconfig`)
- **Commits**: Write clear, descriptive commit messages
- **Documentation**: Document complex logic and public APIs

## Code Review Process

- All PRs require review from maintainers
- Address feedback promptly
- Keep PRs focused and reasonably sized
- Ensure tests pass and code is linted

## Questions?

If you have questions, feel free to:
- Open an issue with the `question` label
- Check existing issues and discussions

Thank you for contributing to view0x!
