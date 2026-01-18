# view0x

**Smart Contract Security Analysis Platform**

view0x is a cloud-native SaaS platform for automated smart contract security analysis, providing developers with comprehensive vulnerability detection, gas optimization suggestions, and code quality assessments.

## Project Structure

```bash
view0x/
├── scanner-engine/     # Core analysis engine
├── backend/           # Express.js API server
├── frontend/          # React application
├── python/            # Python analysis worker (Slither)
└── docker-compose.yml # Container orchestration
```

## Screenshots

![Contract Analyzer](screenshots/screenshot-2026-01-18-at-1.13.07-am.png)

![Login Page](screenshots/screenshot-2026-01-18-at-1.13.28-am.png)

## Features

- **Automated Security Scanning** - Detect vulnerabilities in Solidity smart contracts
- **Real-time Analysis** - Get instant results with WebSocket updates
- **Modern UI** - Beautiful dark theme interface
- **Public & Authenticated** - Scan contracts without login, save history with account
- **Detailed Reports** - Comprehensive vulnerability analysis with severity levels
- **Fast & Scalable** - Built for performance and reliability

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
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=24h
   REFRESH_TOKEN_SECRET=your-refresh-secret-here
   REFRESH_TOKEN_EXPIRES_IN=7d
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
   - PostgreSQL: localhost:5432

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
   npm run dev  # Runs on http://localhost:5173 (Vite default)
   ```

4. **Python Worker (Optional):**
   ```bash
   cd python
   pip install -r requirements.txt
   python main.py  # Runs on http://localhost:8000
   ```

5. **Scanner Engine (Optional):**
   ```bash
   cd scanner-engine
   npm install
   npm run build
   npm start
   ```

### Environment Variables

Key environment variables needed for the backend (in `backend/.env`):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `PYTHON_API_URL` - URL for Python analysis worker
- `PORT` - Backend server port (default: 3001)

## Deployment

### Production

- **Frontend**: Deployed on [Cloudflare Pages](https://pages.cloudflare.com) at `view0x.com`
- **Backend**: Deployed on [Railway](https://railway.app) at `api.view0x.com`
- **Database**: PostgreSQL on Railway
- **Cache**: Redis on Railway

See [CLOUDFLARE.md](CLOUDFLARE.md) and [RAILWAY.md](RAILWAY.md) for detailed deployment instructions.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Links

- **Website**: https://view0x.com
- **API**: https://api.view0x.com
- **GitHub**: https://github.com/1cbyc/view0x