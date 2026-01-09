#!/bin/bash
# Quick deployment script for VPS

echo "🚀 Deploying Staycool Backend Updates..."

# 1. Git pull
echo "📥 Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install
cd ../frontend && npm install && npm run build
cd ..

# 3. Run database migration
echo "⚡ Running database migration..."
cd backend
mysql -u stay_cool -p stay_cool < migrations/add_performance_indexes.sql
cd ..

# 4. Restart PM2
echo "🔄 Restarting backend..."
pm2 restart 4

# 5. Show logs
echo "✅ Deployment complete! Showing logs..."
pm2 logs 4 --lines 20
