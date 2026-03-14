FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./frontend
WORKDIR /app/frontend/frontend

ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=/
ARG VITE_APP_TITLE="view0x - Smart Contract Analysis"
ARG VITE_APP_DESCRIPTION="Analyze your Solidity smart contracts for vulnerabilities, gas optimizations, and code quality issues"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION

RUN npm run build

FROM node:20-bookworm-slim AS backend-builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend ./
RUN npm run build

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    nginx \
    supervisor \
    redis-server \
    postgresql-15 \
    postgresql-client-15 \
    netcat-openbsd \
    gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY python/requirements-minimal.txt /tmp/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip "setuptools<81" wheel \
    && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

COPY --from=backend-builder /app/backend /app/backend
COPY python /app/python
COPY --from=frontend-builder /app/frontend/frontend/dist /var/www/view0x

COPY docker/single/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/single/supervisord.conf /etc/supervisor/conf.d/view0x.conf
COPY docker/single/start-view0x.sh /usr/local/bin/start-view0x.sh

RUN chmod +x /usr/local/bin/start-view0x.sh \
    && chmod +x /app/python/start.sh \
    && mkdir -p /var/lib/postgresql/data /var/lib/redis /var/log/supervisor /var/run/postgresql \
    && mkdir -p /app/backend/uploads /app/backend/logs \
    && chown -R postgres:postgres /var/lib/postgresql /var/run/postgresql \
    && chown -R redis:redis /var/lib/redis \
    && rm -f /etc/nginx/sites-enabled/default

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1/health >/dev/null || exit 1

CMD ["/usr/local/bin/start-view0x.sh"]
