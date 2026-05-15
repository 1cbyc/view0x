# view0x

view0x is a smart contract security analysis app. It scans Solidity contracts, returns security findings, gas suggestions, and code-quality issues, and lets signed-in users save analysis history.

## Current Architecture

```text
browser
  -> web nginx container :80
    -> /api/*       -> api container :3001
    -> /socket.io/* -> api container :3001
api container
  -> postgres
  -> redis / Bull queue
  -> python-worker :8000 /analyze
python-worker
  -> Slither
  -> gas optimizer
  -> code quality analyzer
```

Authenticated analysis is asynchronous: the API creates an `Analysis` row, queues a Bull job, the backend worker calls the Python worker, normalizes the result shape, saves it, and emits Socket.IO updates. Public analysis is synchronous and currently uses the lightweight TypeScript `SimpleScanner`.

## Ports

The default host ports are intentionally uncommon so they are less likely to conflict on a Mac or VPS:

- App/web: `18088`
- API direct bind: `18091`
- PostgreSQL local bind: `15433`
- Redis local bind: `16380`

Inside Docker, services still use normal internal ports: web `80`, API `3001`, Python `8000`, Postgres `5432`, Redis `6379`.

## Quick Start

```bash
cp .env.example .env
# edit .env secrets before using this anywhere public
npm run up
npm run smoke
```

Open `http://localhost:18088`.

Useful commands:

```bash
npm run ps
npm run logs
npm run health
npm run verify
npm run down
```

## Environment

Docker uses the single root `.env`. Do not create separate Docker env files under `backend/` or `frontend/`.

Required production secrets:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`

Recommended frontend values for the Docker stack:

```env
VITE_API_URL=/api
VITE_SOCKET_URL=
```

That keeps browser traffic same-origin through the web nginx container.

## VPS Deploy

The VPS path is `/home/view0x/app`. The VPS should have Docker, Docker Compose, a root `.env`, and no requirement for Git checkout/pull. GitHub Actions syncs files over SSH and runs Docker Compose.

Manual deploy command on the VPS, if needed:

```bash
cd /home/view0x/app
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

Production URL with the default port is:

```text
http://<server-ip>:18088
```

## GitHub Actions Secrets

Set these repository secrets:

- `VPS_HOST`: VPS IP or hostname
- `VPS_USER`: SSH user, currently `view0x`
- `VPS_SSH_KEY`: private SSH key that can log in as `view0x`

The workflow preserves the VPS `.env` and does not run `git pull` on the VPS.

## Verification

Local verification:

```bash
npm run verify
```

Smoke a running instance:

```bash
BASE_URL=http://localhost:18088 npm run smoke
# Remote (use your server host, not committed to git):
# BASE_URL=http://YOUR_SERVER:18088 npm run smoke
```

## Known Next Work

- Make public analysis use the same normalized result contract as authenticated analysis.
- Improve scanner depth for unchecked external calls, delegatecall, access control, weak randomness, and multi-file contracts.
- Polish the analyzer UI after the backend result contract is stable.
