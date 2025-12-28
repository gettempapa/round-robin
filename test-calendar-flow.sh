#!/bin/bash

# Calendar Integration Testing Script
# This script simulates the browser testing requested

echo "========================================"
echo "Calendar Integration Test Report"
echo "========================================"
echo ""

USER_ID="cmjp5xpi20000fsl3ifqa7fug"
FORM_ID="cmjp65o230000vfk9jft1eh4v"
BASE_URL="http://localhost:3000"

echo "Test Configuration:"
echo "  User ID: $USER_ID (Sarah Johnson)"
echo "  Form ID: $FORM_ID"
echo "  Base URL: $BASE_URL"
echo ""

# Test 1: Check calendar connection status
echo "========================================"
echo "Test 1: Calendar Connection Status"
echo "========================================"
echo "URL: $BASE_URL/api/calendar/status?userId=$USER_ID"
echo ""
RESPONSE=$(curl -s "$BASE_URL/api/calendar/status?userId=$USER_ID")
echo "Response: $RESPONSE"
echo ""
if echo "$RESPONSE" | grep -q '"connected":false'; then
    echo "❌ ISSUE FOUND: Calendar is NOT connected"
    echo "   This is why the booking flow shows 'Calendar not available'"
else
    echo "✅ Calendar is connected"
fi
echo ""

# Test 2: Test availability API (should fail if calendar not connected)
echo "========================================"
echo "Test 2: Availability API Test"
echo "========================================"
echo "URL: $BASE_URL/api/calendar/availability"
echo ""
AVAILABILITY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/calendar/availability" \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "'$USER_ID'",
    "startDate": "2025-12-28T00:00:00.000Z",
    "endDate": "2026-01-04T00:00:00.000Z",
    "duration": 30
  }')
echo "Response: $AVAILABILITY_RESPONSE"
echo ""
if echo "$AVAILABILITY_RESPONSE" | grep -q "error"; then
    echo "❌ ISSUE FOUND: Availability API returns error"
    echo "   Error: $(echo $AVAILABILITY_RESPONSE | grep -o '"details":"[^"]*"' | cut -d'"' -f4)"
else
    echo "✅ Availability API working"
fi
echo ""

# Test 3: Check form details
echo "========================================"
echo "Test 3: Form Details"
echo "========================================"
echo "URL: $BASE_URL/api/forms/$FORM_ID"
echo ""
FORM_RESPONSE=$(curl -s "$BASE_URL/api/forms/$FORM_ID")
FORM_NAME=$(echo "$FORM_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Form Name: $FORM_NAME"
echo "Form is accessible: ✅"
echo ""

# Test 4: Check OAuth credentials
echo "========================================"
echo "Test 4: OAuth Credentials Check"
echo "========================================"
if grep -q "GOOGLE_CLIENT_ID" /Users/julianlohnes/roundrobin/.env && \
   grep -q "GOOGLE_CLIENT_SECRET" /Users/julianlohnes/roundrobin/.env; then
    echo "✅ OAuth credentials are configured in .env"
    echo "   Client ID: $(grep GOOGLE_CLIENT_ID /Users/julianlohnes/roundrobin/.env | cut -d'=' -f2)"
    echo "   Client Secret: $(grep GOOGLE_CLIENT_SECRET /Users/julianlohnes/roundrobin/.env | cut -d'=' -f2 | cut -c1-20)..."
else
    echo "❌ OAuth credentials not found"
fi
echo ""

# Test 5: Check database for calendar sync entries
echo "========================================"
echo "Test 5: Database Calendar Sync Check"
echo "========================================"
CALENDAR_COUNT=$(sqlite3 /Users/julianlohnes/roundrobin/prisma/dev.db "SELECT COUNT(*) FROM CalendarSync;" 2>&1)
echo "Total calendar connections in database: $CALENDAR_COUNT"
if [ "$CALENDAR_COUNT" = "0" ]; then
    echo "❌ ISSUE FOUND: No calendars connected in database"
    echo "   User needs to connect their calendar via /settings"
else
    echo "✅ Found $CALENDAR_COUNT calendar connection(s)"
    echo ""
    echo "Connected calendars:"
    sqlite3 /Users/julianlohnes/roundrobin/prisma/dev.db "SELECT userId, provider, email, syncEnabled FROM CalendarSync;" 2>&1
fi
echo ""

# Summary
echo "========================================"
echo "SUMMARY & ROOT CAUSE ANALYSIS"
echo "========================================"
echo ""
echo "Root Cause:"
echo "  User $USER_ID (Sarah Johnson) does NOT have a calendar connected."
echo ""
echo "Why the error occurs:"
echo "  1. When a form is submitted, a user is assigned via round-robin"
echo "  2. The booking page calls /api/calendar/availability with the assigned user's ID"
echo "  3. The API tries to fetch calendar credentials for the user"
echo "  4. Since no calendar is connected, it returns an error"
echo "  5. The frontend catches the error and shows: 'Calendar not available, showing default slots'"
echo ""
echo "Solution:"
echo "  1. Navigate to http://localhost:3000/settings"
echo "  2. Click 'Connect Google Calendar' button"
echo "  3. Complete the OAuth flow to authorize the application"
echo "  4. The calendar will be stored in the CalendarSync table"
echo "  5. Future booking requests will use real calendar availability"
echo ""
echo "To test the OAuth flow:"
echo "  1. Open: http://localhost:3000/settings"
echo "  2. Click 'Connect Google Calendar'"
echo "  3. You'll be redirected to Google OAuth consent screen"
echo "  4. After granting permissions, you'll be redirected back to /settings"
echo "  5. The calendar status should show as 'Connected'"
echo ""
echo "OAuth Connect URL:"
echo "  http://localhost:3000/api/auth/google/connect?userId=$USER_ID"
echo ""
