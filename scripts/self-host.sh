#!/bin/bash
# Self-host setup script for Health OS

cd ~/projects/xenus-health/my-app

echo "Building Health OS..."
npm run build

echo "Installing PM2..."
npm install -g pm2

echo "Starting Health OS..."
pm2 start npm --name "health-os" -- start

echo "Setting up auto-start..."
pm2 startup
pm2 save

echo ""
echo "Health OS is running!"
echo "Local: http://localhost:3000"
echo "Network: http://192.168.1.67:3000"
echo ""
echo "To stop: pm2 stop health-os"
echo "To restart: pm2 restart health-os"
echo "To view logs: pm2 logs health-os"
