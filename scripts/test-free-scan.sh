#!/bin/bash

# Base URL - change if running on different port
BASE_URL="http://localhost:3000"

echo "🔍 Testing Free Scan API at $BASE_URL/api/free-scan"
echo "---------------------------------------------------"

echo -e "\n1️⃣  Testing Validation (Empty Brand Name)..."
curl -s -X POST "$BASE_URL/api/free-scan" \
  -H "Content-Type: application/json" \
  -d '{"brandName": ""}' | python3 -m json.tool || echo "Failed to parse JSON"

echo -e "\n\n2️⃣  Testing Rate Limiting / Success (Brand: OpenAI)..."
# This might hit the rate limit if run multiple times
curl -s -X POST "$BASE_URL/api/free-scan" \
  -H "Content-Type: application/json" \
  -d '{"brandName": "OpenAI"}' | python3 -m json.tool || echo "Failed to parse JSON"

echo -e "\n\n---------------------------------------------------"
echo "✅ Test Complete"
