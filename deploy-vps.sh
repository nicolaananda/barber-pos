#!/bin/bash
# Production deployment script for VPS.
# Architecture: frontend runs in Docker/Nginx, backend runs in PM2.

set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_SERVICE="frontend"
PM2_APP="${PM2_APP:-bagus-engine}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3001/health}"

cd "$APP_DIR"

echo "🚀 Deploying Staycool Hairlab..."

# 1. Git pull
echo "📥 Pulling latest code..."
git pull origin main

# 2. Install backend dependencies reproducibly
echo "📦 Installing backend dependencies..."
npm ci --prefix "$BACKEND_DIR"

# 3. Prepare Prisma client and apply committed migrations when present
echo "🧬 Preparing database client..."
npm exec --prefix "$BACKEND_DIR" -- prisma generate
if [ -d "$BACKEND_DIR/prisma/migrations" ] && [ "$(find "$BACKEND_DIR/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | wc -l)" -gt 0 ]; then
    if [ -f "$BACKEND_DIR/scripts/preflight-phase2.js" ]; then
        echo "🔎 Running Phase 2 database preflight..."
        node "$BACKEND_DIR/scripts/preflight-phase2.js"
    fi

    echo "🗄️  Applying Prisma migrations..."
    npm exec --prefix "$BACKEND_DIR" -- prisma migrate deploy
else
    echo "ℹ️  No Prisma migration history found; skipping migrate deploy."
fi

# 4. Deploy frontend via Docker (Nginx)
echo "🐳 Building & deploying frontend container..."
docker compose up -d --build "$FRONTEND_SERVICE"

# 5. Restart backend (PM2)
echo "🔄 Restarting backend..."
pm2 restart "$PM2_APP" --update-env

# 6. Health check backend
echo "🩺 Checking backend health..."
for attempt in {1..12}; do
    if curl -fsS "$HEALTH_URL" >/dev/null; then
        echo "✅ Backend healthy: $HEALTH_URL"
        break
    fi

    if [ "$attempt" -eq 12 ]; then
        echo "❌ Backend health check failed: $HEALTH_URL"
        pm2 logs "$PM2_APP" --lines 40 --nostream || true
        exit 1
    fi

    sleep 5
done

# 7. Show status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Docker status:"
docker compose ps
echo ""
echo "📊 PM2 status:"
pm2 status
echo ""
echo "📋 Backend logs:"
pm2 logs bagus-engine --lines 10 --nostream
