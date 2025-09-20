#!/bin/bash

# API endpoint testing script
set -e

# Default to local development server
BASE_URL=${1:-"http://localhost:3001"}

echo "🧪 Testing MVP28 Backend API endpoints..."
echo "Base URL: $BASE_URL"

# Test health endpoint
echo ""
echo "1️⃣ Testing health check..."
curl -s -X GET "$BASE_URL/api/health" | jq '.' || echo "❌ Health check failed"

# Test WeChat auth endpoint (will fail without valid code, but should return proper error)
echo ""
echo "2️⃣ Testing WeChat auth endpoint..."
curl -s -X POST "$BASE_URL/api/auth/wechat" \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code"}' | jq '.' || echo "❌ WeChat auth test failed"

# Test chat endpoint (will fail without auth, but should return proper error)
echo ""
echo "3️⃣ Testing chat endpoint (without auth)..."
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}' | jq '.' || echo "❌ Chat endpoint test failed"

# Test upload presign endpoint (will fail without auth)
echo ""
echo "4️⃣ Testing upload presign endpoint (without auth)..."
curl -s -X POST "$BASE_URL/api/upload/presign" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.jpg", "mimeType": "image/jpeg", "fileSize": 1024}' | jq '.' || echo "❌ Upload presign test failed"

echo ""
echo "✅ Basic API endpoint tests completed!"
echo "💡 Note: Auth-protected endpoints will return 401 errors without valid JWT tokens."