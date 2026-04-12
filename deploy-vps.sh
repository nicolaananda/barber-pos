#!/bin/bash
# Quick deployment script for VPS

echo "🚀 Deploying Staycool Hairlab..."

# 1. Git pull
echo "📥 Pulling latest code..."
git pull origin main

# 2. Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..

# 3. Deploy frontend via Docker (Nginx)
echo "🐳 Building & deploying frontend container..."
docker compose up -d --build frontend

# 4. Restart backend (PM2)
echo "🔄 Restarting backend..."
pm2 restart bagus-engine

# 5. Show status
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
