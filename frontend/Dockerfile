FROM node:20-bookworm-slim AS build

WORKDIR /app

# walletconnect / ws optional deps may compile native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./

ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=/
ARG VITE_APP_TITLE="view0x - Smart Contract Analysis"
ARG VITE_APP_DESCRIPTION="Analyze your Solidity smart contracts for vulnerabilities, gas optimizations, and code quality issues"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION

ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
