#!/bin/bash
# Startup script for Railway deployment
# Handles PORT environment variable properly

set -e

# Get PORT from environment or default to 8000
PORT=${PORT:-8000}

# Start gunicorn with proper port binding
exec gunicorn main:app \
    --workers 1 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:${PORT}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
