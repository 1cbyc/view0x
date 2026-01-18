# view0x

A cloud-native SaaS platform for automated smart contract security analysis, providing developers with comprehensive vulnerability detection, gas optimization suggestions, and code quality assessments.

## Screenshots

![Contract Analyzer](screenshots/screenshot-2026-01-18-at-1.13.07-am.png)

![Login Page](screenshots/screenshot-2026-01-18-at-1.13.28-am.png)

## Features

- **Automated Security Scanning** - Detect vulnerabilities in Solidity smart contracts using multiple analysis engines
- **Real-time Analysis** - Get instant results with WebSocket updates
- **Modern UI** - Beautiful dark theme interface
- **Public & Authenticated** - Scan contracts without login, save history with account
- **Detailed Reports** - Comprehensive vulnerability analysis with severity levels
- **Fast & Scalable** - Built for performance and reliability
- **Multi-Engine Analysis** - Uses both TypeScript scanner-engine and Python-based tools (Slither, Mythril, Semgrep)

## Project Structure

```
view0x/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── scanner-engine/    # TypeScript-based analysis engine (moved from root)
│   │   ├── services/          # Business logic services
│   │   ├── controllers/       # API route handlers
│   │   ├── models/            # Database models
│   │   └── workers/           # Background job processors
│   └── package.json
├── frontend/                   # React + Vite application
├── python/                     # Python analysis worker (FastAPI)
│   ├── analyzers/             # Slither, Mythril, Semgrep wrappers
│   └── main.py               # FastAPI server
├── docs/                      # Documentation
└── docker-compose.yml         # Container orchestration
```

## Analysis Engines

view0x uses multiple analysis engines for comprehensive security scanning:

1. **Scanner Engine** (TypeScript) - Fast, lightweight static analysis
   - Located in `backend/src/scanner-engine/`
   - Detects common vulnerabilities, gas optimizations, and code quality issues
   - Uses AST traversal for pattern detection

2. **Python Worker** (FastAPI) - Professional-grade analysis tools
   - Located in `python/`
   - **Slither** - Industry-standard Solidity static analyzer
   - **Mythril** - Symbolic execution tool for vulnerability detection
   - **Semgrep** - Pattern-based security scanner
   - Gas optimization and code quality analyzers

The backend can be configured to use either engine or both via the `ANALYSIS_ENGINE` environment variable:
- `python` - Use Python worker only (default)
- `scanner-engine` - Use TypeScript scanner only
- `both` or `all` - Use both engines and merge results

## How to Run

### Option 1: Using Docker Compose (Recommended)

The easiest way to run the entire project is using Docker Compose:

1. **Prerequisites:**
   - Docker and Docker Compose installed
   - Create environment files (if needed)

2. **Create environment files:**

   Create `backend/.env`:
   ```env
   NODE_ENV=development
   PORT=3001
   DATABASE_URL=postgresql://postgres:password@db:5432/view0x_dev
   REDIS_URL=redis://redis:6379
   PYTHON_API_URL=http://python-worker:8000
   JWT_SECRET=your-secret-key-here-minimum-32-characters
   JWT_EXPIRES_IN=24h
   REFRESH_TOKEN_SECRET=your-refresh-secret-here-minimum-32-characters
   REFRESH_TOKEN_EXPIRES_IN=7d
   ANALYSIS_ENGINE=python
   ```

   Create `python/.env` (if needed):
   ```env
   REDIS_URL=redis://redis:6379
   ```

3. **Start all services:**
   ```bash
   docker-compose up
   ```

   Or run in detached mode:
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs
   - Python Worker: http://localhost:8000
   - PostgreSQL: localhost:5433 (Note: Port 5433 to avoid conflict with local PostgreSQL)

5. **Stop services:**
   ```bash
   docker-compose down
   ```

### Option 2: Manual Setup (Development)

If you prefer to run services individually:

1. **Start PostgreSQL and Redis:**
   ```bash
   docker-compose up db redis -d
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create .env file with your configuration
   npm run build
   npm run dev  # Runs on http://localhost:3001
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev  # Runs on http://localhost:3000
   ```

4. **Python Worker (Optional but Recommended):**
   ```bash
   cd python
   pip install -r requirements.txt
   python main.py  # Runs on http://localhost:8000
   ```
   
   The Python worker provides professional-grade analysis using Slither, Mythril, and Semgrep.

### Environment Variables

Key environment variables needed for the backend (in `backend/.env`):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens (minimum 32 characters)
- `REFRESH_TOKEN_SECRET` - Secret for refresh tokens (minimum 32 characters)
- `PYTHON_API_URL` - URL for Python analysis worker (default: http://localhost:8000)
- `ANALYSIS_ENGINE` - Which engine to use: `python`, `scanner-engine`, `both`, or `all` (default: `python`)
- `PORT` - Backend server port (default: 3001)

## Deployment

### Production

- **Frontend**: Deployed on [Cloudflare Pages](https://pages.cloudflare.com) at `view0x.com`
- **Backend**: Deployed on [Railway](https://railway.app) at `api.view0x.com`
- **API Documentation**: Available at `https://api.view0x.com/api-docs` (Swagger/OpenAPI)
- **Database**: PostgreSQL on Railway
- **Cache**: Redis on Railway
- **Python Worker**: Can be deployed as a separate service on Railway (see [RAILWAY.md](docs/RAILWAY.md))

See [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md) and [docs/RAILWAY.md](docs/RAILWAY.md) for detailed deployment instructions.

### Railway Deployment Notes

For Railway deployment, you have two options:

1. **Backend Only** (Simpler): Deploy just the backend with `ANALYSIS_ENGINE=scanner-engine` to use the built-in TypeScript scanner
2. **Backend + Python Worker** (Recommended): Deploy both services separately on Railway:
   - Backend service with `PYTHON_API_URL` pointing to the Python worker service
   - Python worker service running on port 8000
   - Set `ANALYSIS_ENGINE=python` or `ANALYSIS_ENGINE=both` for comprehensive analysis

The Python worker provides more accurate analysis using industry-standard tools (Slither, Mythril, Semgrep), while the scanner-engine provides faster, lightweight analysis.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Links

- **Website**: https://view0x.com
- **API**: https://api.view0x.com
- **API Documentation**: https://api.view0x.com/api-docs
- **GitHub**: https://github.com/1cbyc/view0x
