# Calendar Integration Issue Report

## Executive Summary

**Issue**: Users see "Calendar not available, showing default slots" when trying to book meetings through forms.

**Root Cause**: No calendar is connected for user ID `cmjp5xpi20000fsl3ifqa7fug` (Sarah Johnson).

**Status**: OAuth credentials are properly configured, but the OAuth flow has not been completed.

---

## Test Results

### 1. Calendar Connection Status ❌
- **Endpoint**: `/api/calendar/status?userId=cmjp5xpi20000fsl3ifqa7fug`
- **Response**: `{"connected":false}`
- **Finding**: No calendar connection exists for this user

### 2. Availability API ❌
- **Endpoint**: `/api/calendar/availability`
- **Response**: `{"error":"Failed to fetch availability","details":"No calendar connected for this user"}`
- **Finding**: API correctly rejects requests when calendar is not connected

### 3. OAuth Credentials ✅
- **Client ID**: `729268256374-f8oecae34p24hg1a0hrslltnf2e0qha7.apps.googleusercontent.com`
- **Client Secret**: Configured
- **Redirect URI**: `http://localhost:3000/api/auth/google/callback`
- **Finding**: OAuth credentials are properly configured in `.env`

### 4. Database State ❌
- **CalendarSync table**: 0 records
- **Finding**: No calendar connections exist in the database

---

## How the Error Occurs

```
┌─────────────────────────────────────────────────────────────┐
│                    Form Submission Flow                      │
└─────────────────────────────────────────────────────────────┘

1. User submits form at /f/{formId}
   └─> Contact is created
   └─> User is assigned via round-robin
   └─> Frontend shows "Thank You" page with booking option

2. User clicks "Schedule a Call"
   └─> Frontend calls: POST /api/calendar/availability
       {
         "userId": "cmjp5xpi20000fsl3ifqa7fug",
         "startDate": "2025-12-28T00:00:00.000Z",
         "endDate": "2026-01-04T00:00:00.000Z",
         "duration": 30
       }

3. Backend tries to fetch calendar credentials
   └─> calendarService.getCredentials(userId)
   └─> Queries: SELECT * FROM CalendarSync WHERE userId = ?
   └─> Result: No rows found
   └─> Throws: "No calendar connected for this user"

4. Frontend receives error response
   └─> Displays alert: "Calendar not available, showing default slots"
   └─> Falls back to hardcoded time slots (9AM-5PM, weekdays)
```

---

## Code Flow Analysis

### File: `/Users/julianlohnes/roundrobin/app/f/[id]/page.tsx`
**Line 134-159**: Availability fetching logic

```typescript
const response = await fetch('/api/calendar/availability', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: assignedUser.id,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    duration: 30,
  }),
});

if (response.ok) {
  const data = await response.json();
  setTimeSlots(data.slots.map((slot: any) => new Date(slot.start)));
} else {
  // THIS IS WHERE THE ERROR OCCURS
  alert('Calendar not available, showing default slots');
  setTimeSlots(generateFallbackTimeSlots());
}
```

### File: `/Users/julianlohnes/roundrobin/lib/calendar/calendar-service.ts`
**Line 52-69**: Credential fetching with fallback logic

```typescript
private async getCredentials(userId: string) {
  let sync = await db.calendarSync.findUnique({
    where: { userId },
  });

  // FALLBACK: If user doesn't have a calendar, use shared calendar (for testing)
  if (!sync) {
    // Try to find any connected calendar as fallback
    sync = await db.calendarSync.findFirst({
      where: { syncEnabled: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!sync) {
      throw new Error('No calendar connected for this user');
      // THIS ERROR IS THROWN ^^^
    }
  }
  // ...
}
```

---

## Solution Steps

### Option 1: Connect Calendar via UI (Recommended)

1. **Navigate to Settings Page**
   ```
   http://localhost:3000/settings
   ```

2. **Verify Calendar Status**
   - Look for "Calendar Integration" card
   - Should show "Calendar Required" warning with yellow badge
   - "Connect Google Calendar" button should be visible

3. **Click "Connect Google Calendar"**
   - You'll be redirected to: `/api/auth/google/connect?userId=cmjp5xpi20000fsl3ifqa7fug`
   - This generates OAuth URL and redirects to Google

4. **Complete Google OAuth Flow**
   - Google will show consent screen asking for permissions:
     - Read calendar events
     - Create/edit calendar events
     - View email address
   - Click "Allow" to grant permissions

5. **Callback Processing**
   - Google redirects to: `/api/auth/google/callback?code=...&state=cmjp5xpi20000fsl3ifqa7fug`
   - Backend exchanges code for access & refresh tokens
   - Tokens are encrypted and stored in CalendarSync table
   - Redirected back to: `/settings?success=google_connected`

6. **Verify Connection**
   - Settings page should now show:
     - Green "Connected" badge
     - Provider: Google Calendar
     - Account email address
     - Last synced timestamp

### Option 2: Direct OAuth URL (For Testing)

```bash
# Open this URL in your browser to initiate OAuth flow
open "http://localhost:3000/api/auth/google/connect?userId=cmjp5xpi20000fsl3ifqa7fug"
```

---

## Verification Steps

After connecting the calendar, verify with these commands:

```bash
# 1. Check database for calendar connection
sqlite3 /Users/julianlohnes/roundrobin/prisma/dev.db \
  "SELECT userId, provider, email, syncEnabled, lastSyncAt FROM CalendarSync;"

# 2. Test calendar status API
curl -s "http://localhost:3000/api/calendar/status?userId=cmjp5xpi20000fsl3ifqa7fug"
# Expected: {"connected":true,"provider":"google","email":"your-email@gmail.com"}

# 3. Test availability API
curl -s -X POST "http://localhost:3000/api/calendar/availability" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "cmjp5xpi20000fsl3ifqa7fug",
    "startDate": "2025-12-28T00:00:00.000Z",
    "endDate": "2026-01-04T00:00:00.000Z",
    "duration": 30
  }'
# Expected: {"slots":[{"start":"2025-12-30T14:00:00.000Z","end":"2025-12-30T14:30:00.000Z","available":true},...]}}

# 4. Test full booking flow
# Submit form: http://localhost:3000/f/cmjp65o230000vfk9jft1eh4v
# Click "Schedule a Call"
# Should now show real available time slots from Google Calendar
```

---

## Expected Behavior After Fix

### Before (Current):
- ❌ "Calendar not available, showing default slots" alert
- ❌ Shows hardcoded 9AM-5PM weekday slots
- ❌ No conflict checking with real calendar
- ❌ Bookings may conflict with existing meetings

### After (Fixed):
- ✅ Real-time calendar availability checking
- ✅ Only shows time slots when user is actually free
- ✅ Automatic conflict prevention
- ✅ Calendar events created in Google Calendar
- ✅ Google Meet links generated automatically
- ✅ Email invitations sent to contacts

---

## Additional Notes

### Fallback Behavior
The code includes a fallback mechanism (line 56-68 in `calendar-service.ts`) that attempts to use ANY connected calendar if the assigned user doesn't have one. However:
- This only works if at least ONE user has connected their calendar
- Currently, NO users have connected calendars, so the fallback also fails
- This is intended for testing/demo purposes

### Token Refresh
The system automatically refreshes expired access tokens:
- Access tokens typically expire after 1 hour
- Refresh tokens are used to get new access tokens
- Token refresh happens automatically in `calendar-service.ts` (line 75-106)
- No user action required after initial connection

### Security
- Tokens are encrypted using AES-256-GCM before storage
- Encryption key: Set in `.env` as `ENCRYPTION_KEY`
- Calendar credentials are never exposed to the frontend

---

## Browser Console Debugging

When testing in the browser, check for these console messages:

### Expected Console Logs:
```javascript
// When calendar NOT connected (current state)
"Failed to fetch availability: Error: No calendar connected for this user"

// When calendar IS connected (after fix)
"Loading available slots..."
// No errors - slots load successfully
```

### Network Tab:
```
POST /api/calendar/availability
Status: 500 (currently - no calendar)
Response: {"error":"Failed to fetch availability","details":"No calendar connected for this user"}

After fix:
Status: 200
Response: {"slots":[...]}
```

---

## Test Script

A comprehensive test script has been created at:
```
/Users/julianlohnes/roundrobin/test-calendar-flow.sh
```

Run it with:
```bash
./test-calendar-flow.sh
```

This script tests:
- Calendar connection status
- Availability API
- Form accessibility
- OAuth credentials configuration
- Database state

---

## Contact & Support

If you encounter issues during the OAuth flow:

1. **"Access Denied" Error**: User declined permissions
   - Solution: Retry and click "Allow" on Google consent screen

2. **"Invalid Redirect URI" Error**: OAuth app not configured correctly
   - Solution: Verify redirect URI in Google Cloud Console matches `.env`
   - Should be: `http://localhost:3000/api/auth/google/callback`

3. **"Invalid Client" Error**: Wrong Client ID or Secret
   - Solution: Verify credentials in Google Cloud Console
   - Re-copy Client ID and Secret to `.env`

For detailed OAuth setup instructions, see:
- `/Users/julianlohnes/roundrobin/docs/GOOGLE_OAUTH_SETUP.md`

---

**Generated**: 2025-12-27
**Test Environment**: http://localhost:3000
**User Tested**: Sarah Johnson (cmjp5xpi20000fsl3ifqa7fug)
