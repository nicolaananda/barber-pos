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

# 3. Deploy frontend files
echo "🚚 Deploying frontend files to server directories..."
TARGET_1="/home/staycoolhairlab.id/public_html"
TARGET_2="/home/staycoolhairlab.id/pos.staycoolhairlab.id"

if [ -d "$TARGET_1" ]; then
    echo "Cleaning and copying to $TARGET_1..."
    rm -rf "$TARGET_1"/*
    cp -r frontend/dist/* "$TARGET_1"/
else
    echo "⚠️ Directory $TARGET_1 not found, skipping..."
fi

if [ -d "$TARGET_2" ]; then
    echo "Cleaning and copying to $TARGET_2..."
    rm -rf "$TARGET_2"/*
    cp -r frontend/dist/* "$TARGET_2"/
else
    echo "⚠️ Directory $TARGET_2 not found, skipping..."
fi

# 4. Run database migration
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
