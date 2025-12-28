# Quick Fix Guide: "Calendar not available, showing default slots"

## Problem
When booking a meeting through a form, users see an alert: **"Calendar not available, showing default slots"**

## Root Cause
The assigned user (Sarah Johnson) does not have their Google Calendar connected to the application.

## Solution (3 steps, 2 minutes)

### Step 1: Open Settings
```
http://localhost:3000/settings
```

### Step 2: Connect Calendar
1. Look for the **"Calendar Integration"** card
2. Click the **"Connect Google Calendar"** button
3. You'll be redirected to Google's authorization page
4. Click **"Allow"** to grant permissions:
   - Read calendar events
   - Create/edit calendar events
   - View email address
5. Wait to be redirected back to settings

### Step 3: Verify Connection
After redirect, you should see:
- ✅ Green **"Connected"** badge
- Your Google email address displayed
- Provider showing as "Google Calendar"

## Test the Fix

### Option A: Use the Test Script
```bash
cd /Users/julianlohnes/roundrobin
./test-calendar-flow.sh
```

Look for:
- ✅ Calendar connection status: connected
- ✅ Availability API: returns slots (not error)

### Option B: Test in Browser
1. Go to: `http://localhost:3000/f/cmjp65o230000vfk9jft1eh4v`
2. Fill out and submit the form
3. Click **"Schedule a Call"**
4. Should now show **real availability** from Google Calendar
5. No alert should appear

## Expected Behavior After Fix

### Before (Current):
- ❌ Alert: "Calendar not available, showing default slots"
- ❌ Shows fake 9-5 slots
- ❌ Booking will fail

### After (Fixed):
- ✅ Real calendar slots appear
- ✅ Only free times shown
- ✅ Bookings create Google Calendar events
- ✅ Google Meet links generated
- ✅ Email invitations sent

## Troubleshooting

### "Invalid Redirect URI" Error
**Fix**: Verify in Google Cloud Console that redirect URI is:
```
http://localhost:3000/api/auth/google/callback
```

### "Access Denied" Error
**Fix**: Click "Allow" on Google's consent screen (not "Deny")

### Still Showing Default Slots
**Fix**:
1. Check calendar status: `http://localhost:3000/api/calendar/status?userId=cmjp5xpi20000fsl3ifqa7fug`
2. Should return: `{"connected":true}`
3. If false, repeat OAuth flow

## Technical Details

### What Gets Stored
When you connect the calendar, this data is saved:
- Access token (encrypted)
- Refresh token (encrypted)
- Token expiry time
- Your Google email
- Provider type (google)

### Where It's Stored
```
Database: /Users/julianlohnes/roundrobin/prisma/dev.db
Table: CalendarSync
User ID: cmjp5xpi20000fsl3ifqa7fug
```

### Verify in Database
```bash
sqlite3 /Users/julianlohnes/roundrobin/prisma/dev.db \
  "SELECT userId, provider, email, syncEnabled FROM CalendarSync;"
```

Should show one row for Sarah Johnson.

## Quick Links

- Settings: http://localhost:3000/settings
- OAuth URL: http://localhost:3000/api/auth/google/connect?userId=cmjp5xpi20000fsl3ifqa7fug
- Test Form: http://localhost:3000/f/cmjp65o230000vfk9jft1eh4v
- Full Documentation: `/Users/julianlohnes/roundrobin/CALENDAR_ISSUE_REPORT.md`

## Still Need Help?

See detailed documentation:
- `CALENDAR_ISSUE_REPORT.md` - Full technical analysis
- `BROWSER_TEST_SIMULATION.md` - Simulated browser testing results
- `docs/GOOGLE_OAUTH_SETUP.md` - OAuth setup instructions

---

**Estimated Time to Fix**: 2 minutes
**Difficulty**: Easy
**Requires**: Google account with calendar access
