# Google Calendar OAuth Setup Guide

## Overview
To enable Google Calendar integration, you need to create a Google Cloud Project and obtain OAuth credentials. This guide walks you through the process step-by-step.

## Prerequisites
- A Google account
- Access to Google Cloud Console
- 15-20 minutes of time

## Step-by-Step Instructions

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top (next to "Google Cloud")
3. Click "NEW PROJECT"
4. Enter Project Name: "RoundRobin Calendar Integration"
5. Click "CREATE"
6. Wait for the project to be created (notification will appear in top-right)
7. Select your new project from the dropdown

### Step 2: Enable Google Calendar API
1. In the left sidebar, click "APIs & Services" → "Library"
2. In the search box, type "Google Calendar API"
3. Click on "Google Calendar API"
4. Click the blue "ENABLE" button
5. Wait for it to enable (takes a few seconds)

### Step 3: Configure OAuth Consent Screen
1. In the left sidebar, click "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace account)
3. Click "CREATE"
4. Fill in the form:
   - App name: "RoundRobin"
   - User support email: [Your email]
   - Developer contact: [Your email]
5. Click "SAVE AND CONTINUE"
6. On the Scopes page, click "ADD OR REMOVE SCOPES"
7. Filter for "Google Calendar API"
8. Select these scopes:
   - `.../auth/calendar.readonly` (See your calendar events)
   - `.../auth/calendar.events` (Create and edit events)
9. Click "UPDATE" then "SAVE AND CONTINUE"
10. On Test users page, click "ADD USERS"
11. Add your email addresses that will test the integration
12. Click "SAVE AND CONTINUE"

### Step 4: Create OAuth Credentials
1. In the left sidebar, click "Credentials"
2. Click "+ CREATE CREDENTIALS" at the top
3. Select "OAuth client ID"
4. Application type: "Web application"
5. Name: "RoundRobin OAuth Client"
6. Under "Authorized redirect URIs", click "ADD URI"
7. Add your callback URL:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
8. Click "CREATE"
9. A popup will show your credentials:
   - **Client ID**: Copy this (starts with something like `123456789-abc...apps.googleusercontent.com`)
   - **Client Secret**: Copy this
10. Click "OK"

### Step 5: Add Credentials to Your Application
1. Open your `.env` file in the project root
2. Add these lines (replacing with your actual credentials):
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```
3. Save the file
4. Restart your development server

### Step 6: Test the Integration
1. Navigate to Settings in your RoundRobin app
2. Click "Connect Google Calendar"
3. You should be redirected to Google's login page
4. Sign in and grant permissions
5. You should be redirected back to your app with a success message

## Troubleshooting

**Error: "Access blocked: This app's request is invalid"**
- Make sure you added your email as a test user in Step 3
- Verify your redirect URI matches exactly in both Google Console and .env

**Error: "redirect_uri_mismatch"**
- Check that your GOOGLE_REDIRECT_URI in .env matches what you set in Google Console
- Ensure there are no trailing slashes or typos

**Error: "invalid_client"**
- Verify your Client ID and Secret are correctly copied
- Make sure there are no extra spaces in your .env file

## Production Deployment
When ready for production:
1. Add your production URL to Authorized redirect URIs
2. Update GOOGLE_REDIRECT_URI in your production environment
3. Submit your app for OAuth verification (required if > 100 users)

## Security Notes
- Never commit your .env file to version control
- Keep your Client Secret secure
- Rotate credentials if they're ever exposed
