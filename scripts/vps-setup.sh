#!/usr/bin/env bash
# Bootstrap view0x on Ubuntu VPS. Run as user with sudo.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/view0x/app}"
REPO_URL="${REPO_URL:-https://github.com/1cbyc/view0x.git}"

echo "==> Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi

if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
fi

echo "==> Firewall (ufw)..."
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH || true
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw allow "${WEB_PORT:-18088}/tcp" || true
  sudo ufw --force enable || true
fi

echo "==> App directory ${APP_DIR}..."
mkdir -p "$APP_DIR"
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — run scripts/generate-env-secrets.sh and merge values, then:"
  echo "  chmod 600 .env"
fi

echo "==> Build and start stack (VPS ports)..."
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build

echo "==> Health checks..."
sleep 20
set -a
# shellcheck disable=SC1091
[ -f .env ] && source .env
set +a
curl -fsS "http://127.0.0.1:${WEB_PORT:-18088}/health" || echo "web health pending"
curl -fsS "http://127.0.0.1:${API_PORT:-13001}/health" || echo "api health pending"

echo "Done. Configure TLS reverse proxy (Caddy/nginx) for your domain."
