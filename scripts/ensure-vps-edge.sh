#!/usr/bin/env sh
set -eu

EDGE_CONTAINER="${EDGE_CONTAINER:-koreshield-caddy}"
VIEW0X_NETWORK="${VIEW0X_NETWORK:-view0x_default}"
VIEW0X_WEB_UPSTREAM="${VIEW0X_WEB_UPSTREAM:-172.17.0.1:18088}"
VIEW0X_API_UPSTREAM="${VIEW0X_API_UPSTREAM:-view0x-api-1:3001}"

if ! docker ps --format '{{.Names}}' | grep -qx "$EDGE_CONTAINER"; then
  echo "Missing edge container: $EDGE_CONTAINER" >&2
  exit 1
fi

if ! docker network inspect "$VIEW0X_NETWORK" >/dev/null 2>&1; then
  echo "Missing view0x Docker network: $VIEW0X_NETWORK" >&2
  exit 1
fi

if ! docker inspect "$EDGE_CONTAINER" --format '{{json .NetworkSettings.Networks}}' | grep -q "\"$VIEW0X_NETWORK\""; then
  docker network connect "$VIEW0X_NETWORK" "$EDGE_CONTAINER"
fi

docker exec -i \
  -e VIEW0X_WEB_UPSTREAM="$VIEW0X_WEB_UPSTREAM" \
  -e VIEW0X_API_UPSTREAM="$VIEW0X_API_UPSTREAM" \
  "$EDGE_CONTAINER" sh -s <<'EOF'
set -eu

caddyfile="/etc/caddy/Caddyfile"
tmp="/tmp/Caddyfile.view0x"

awk '
  /^# BEGIN view0x managed routes$/ { skip = 1; next }
  /^# END view0x managed routes$/ { skip = 0; next }
  /^(view0x\.com, www\.view0x\.com|api\.view0x\.com) \{$/ {
    skip = 1
    depth = 1
    next
  }
  skip == 1 {
    depth += gsub(/\{/, "{")
    depth -= gsub(/\}/, "}")
    if (depth <= 0) {
      skip = 0
    }
    next
  }
  { print }
' "$caddyfile" > "$tmp"

cat >> "$tmp" <<ROUTES

# BEGIN view0x managed routes
view0x.com, www.view0x.com {
    encode gzip
    reverse_proxy ${VIEW0X_WEB_UPSTREAM}
}

api.view0x.com {
    encode gzip
    reverse_proxy ${VIEW0X_API_UPSTREAM}
}
# END view0x managed routes
ROUTES

cat "$tmp" > "$caddyfile"
caddy validate --config "$caddyfile"
caddy reload --config "$caddyfile"
EOF

docker exec "$EDGE_CONTAINER" sh -lc "getent hosts view0x-api-1 >/dev/null && wget -qO- http://view0x-api-1:3001/health >/dev/null"
