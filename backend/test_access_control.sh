#!/bin/bash

# Start the server in the background
export PORT=5050
export JWT_SECRET="test-secret"
export AUTH_USERS_FILE="./users_test.json"
export ADMIN_EMAIL="admin@test.com"
export ADMIN_PASSWORD="adminpassword"

# Cleanup from previous runs
rm -f $AUTH_USERS_FILE

echo "[*] Starting server on port $PORT..."
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

echo "[*] Registering complainant..."
COMPLAINANT_RESP=$(curl -s -X POST http://localhost:$PORT/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "complainant@test.com", "password": "password123", "displayName": "Complainant"}')

COMPLAINANT_TOKEN=$(echo $COMPLAINANT_RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "[*] Logging in as admin..."
ADMIN_RESP=$(curl -s -X POST http://localhost:$PORT/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "adminpassword"}')

ADMIN_TOKEN=$(echo $ADMIN_RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo ""
echo "--- TEST 1: Complainant accessing /api/cases (should be 403) ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $COMPLAINANT_TOKEN" http://localhost:$PORT/api/cases)
echo "HTTP Status: $STATUS"

echo ""
echo "--- TEST 2: Complainant accessing /api/cases/CF-1042 (should be 403) ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $COMPLAINANT_TOKEN" http://localhost:$PORT/api/cases/CF-1042)
echo "HTTP Status: $STATUS"

echo ""
echo "--- TEST 3: Admin accessing /api/cases (should be 200) ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:$PORT/api/cases)
echo "HTTP Status: $STATUS"

echo ""
echo "--- TEST 4: Complainant accessing /api/overview (should be 403) ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $COMPLAINANT_TOKEN" http://localhost:$PORT/api/overview)
echo "HTTP Status: $STATUS"

echo ""
echo "[*] Stopping server..."
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
rm -f $AUTH_USERS_FILE
echo "Done."

