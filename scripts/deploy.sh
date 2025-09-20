#!/bin/bash

# MVP28 Backend Deployment Script
set -e

echo "🚀 Starting MVP28 Backend deployment..."

# Check required tools
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npm run db:generate

# Type check
echo "🔍 Running type check..."
npm run type-check

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if command -v vercel >/dev/null 2>&1; then
    vercel --prod
else
    echo "📱 Vercel CLI not found. Installing..."
    npm install -g vercel
    vercel --prod
fi

echo "✅ Deployment completed!"
echo "🔗 Your API is now available at your Vercel domain"
echo "📋 Don't forget to:"
echo "   1. Configure environment variables in Vercel Dashboard"
echo "   2. Update database connection"
echo "   3. Configure WeChat Mini Program domain whitelist"
echo "   4. Test all endpoints"