# Security

## Secrets and environment

- **One file:** All secrets live in repo-root `.env` only (see `STRUCTURE.md`).
- **Never commit:** `.env`, `backend/.env`, `frontend/.env`, `python/.env`, backups (`*.env.bak`).
- **Templates only in git:** `.env.example` uses placeholders — run `./scripts/generate-env-secrets.sh` for real values.

```bash
cp .env.example .env
./scripts/generate-env-secrets.sh >> /tmp/view0x-secrets.txt
# Paste JWT_SECRET, REFRESH_TOKEN_SECRET, POSTGRES_PASSWORD, DATABASE_URL into .env
chmod 600 .env
rm /tmp/view0x-secrets.txt
```

To rotate without editing by hand:

```bash
./scripts/rotate-env-secrets.sh
```

## After a leak or old `backend/.env` in git history

1. Run `./scripts/rotate-env-secrets.sh` (local and on VPS).
2. Restart stack: `docker compose up -d --build`.
3. All existing JWTs/sessions are invalidated — users sign in again.
4. If the repo was public with `backend/.env` committed, history was scrubbed with `git filter-repo`; coordinate `git push --force` with your team after rotation.

## VPS / SSH

- **Never commit your server IP** in README, docs, scripts, or screenshots. Use a domain (`view0x.com`) or GitHub Actions secrets (`VPS_HOST`) only.
- Prefer **HTTPS on a domain** in front of the server (Caddy/nginx + Let's Encrypt). Users and the frontend should call `https://yourdomain.com`, not `http://x.x.x.x`.
- Optional: put **Cloudflare** in front of the domain so the origin IP is harder to discover (not a substitute for firewalling).
- Use **SSH keys**, disable password login in `sshd` when keys work.
- **Rotate** any password or IP shared in chat, tickets, or old git commits.
- Deploy via GitHub Actions: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` — set in repo **Secrets**, not in code.
- Firewall: `ufw allow 22,80,443` — do not expose Postgres/Redis publicly.

## Application

- Auth: `Authorization: Bearer <accessToken>` only (no `?token=` query auth).
- API keys: returned once on generate; excluded from `withoutSecrets` user scope.
- Startup logs redact DB credentials in `DATABASE_URL` / `REDIS_URL`.
- Production requires `JWT_SECRET` and `REFRESH_TOKEN_SECRET` ≥ 32 characters.

## Reporting

Email security issues to the maintainers privately; do not open public issues for undisclosed vulnerabilities.
