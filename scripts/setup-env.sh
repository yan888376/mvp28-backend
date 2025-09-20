#!/bin/bash

# Environment setup script
set -e

echo "🔧 Setting up MVP28 Backend environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please fill in your actual values."
else
    echo "⚠️  .env file already exists. Skipping creation."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npm run db:generate

echo "✅ Environment setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file with your actual values"
echo "   2. Set up your PostgreSQL database"
echo "   3. Run 'npm run db:push' to create database tables"
echo "   4. Start development with 'npm run dev'"