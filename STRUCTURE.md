# view0x structure

## Environment (one file)

All services read **`/.env`** at the repo root only.

```bash
cp .env.example .env
./scripts/generate-env-secrets.sh   # paste secrets into .env
chmod 600 .env
```

Do **not** create `backend/.env`, `frontend/.env`, or `python/.env` — those were removed on purpose.

| Run mode | Who loads `.env` |
|----------|------------------|
| `docker compose up` | Compose injects root `.env` into every container |
| `cd backend && npm run dev` | `backend/src/config/loadEnv.ts` loads `../../.env` |
| `cd frontend && npm run dev` | Use root `.env` for Docker; Vite uses `vite.config` proxy + build args |

## Layout

```
view0x/
├── .env.example      # template (committed)
├── .env              # your secrets (gitignored)
├── docker-compose.yml
├── frontend/         # React app — npm deps in frontend/node_modules only
├── backend/          # Express API — npm deps in backend/node_modules only
├── python/           # Slither worker
└── scripts/
```

There is **no** root `node_modules` — only `frontend/` and `backend/` install packages.

## Run

```bash
docker compose up -d --build
# http://localhost:8088
```

## Production (no IP in the repo)

- Point a **domain** at your server (DNS A/AAAA record) — do not document the raw IP in git.
- Set `VPS_HOST` only in GitHub **Secrets** for deploy workflows.
- Build the frontend with `VITE_API_URL` / `VITE_SOCKET_URL` aimed at your **API domain** (e.g. Render or `api.view0x.com`), not `localhost` or a bare IP.
