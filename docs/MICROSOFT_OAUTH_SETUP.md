# Microsoft Outlook Calendar OAuth Setup Guide

## Overview
To enable Outlook Calendar integration, you need to register your application in Azure Active Directory. This guide walks you through the process step-by-step.

## Prerequisites
- A Microsoft account (personal or work/school)
- Access to Azure Portal
- 15-20 minutes of time

## Step-by-Step Instructions

### Step 1: Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. If prompted to start a free trial, you can skip this (not needed)

### Step 2: Register Your Application
1. In the search bar at the top, type "Azure Active Directory" or "Microsoft Entra ID"
2. Click on the result (it's the same thing, Microsoft renamed it)
3. In the left sidebar, click "App registrations"
4. Click "+ New registration" at the top
5. Fill in the form:
   - Name: "RoundRobin Calendar Integration"
   - Supported account types: Select "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI:
     - Platform: "Web"
     - URL: `http://localhost:3000/api/auth/microsoft/callback`
6. Click "Register"

### Step 3: Note Your Application IDs
1. You'll see the "Overview" page for your app
2. Copy these values (you'll need them):
   - **Application (client) ID**: Copy this (looks like `12345678-1234-1234-1234-123456789abc`)
   - **Directory (tenant) ID**: Copy this (same format)

### Step 4: Create a Client Secret
1. In the left sidebar, click "Certificates & secrets"
2. Click the "Client secrets" tab
3. Click "+ New client secret"
4. Description: "RoundRobin Production Secret"
5. Expires: Choose "24 months" (you'll need to rotate it before expiry)
6. Click "Add"
7. **IMPORTANT**: Copy the "Value" immediately (you can't see it again!)
   - This is your Client Secret

### Step 5: Configure API Permissions
1. In the left sidebar, click "API permissions"
2. You should see "Microsoft Graph: User.Read" already there
3. Click "+ Add a permission"
4. Click "Microsoft Graph"
5. Click "Delegated permissions"
6. Search for and select these permissions:
   - `Calendars.Read` (Read your calendars)
   - `Calendars.ReadWrite` (Read and write to your calendars)
   - `offline_access` (Maintain access to data)
7. Click "Add permissions"
8. Click "Grant admin consent for [Your Name]" (blue button at top)
9. Click "Yes" to confirm

### Step 6: Configure Redirect URIs for Production
1. In the left sidebar, click "Authentication"
2. Under "Platform configurations", you should see your Web platform
3. Click "Add URI" to add your production URL:
   - `https://yourdomain.com/api/auth/microsoft/callback`
4. Under "Implicit grant and hybrid flows", ensure nothing is checked
5. Click "Save" at the bottom

### Step 7: Add Credentials to Your Application
1. Open your `.env` file in the project root
2. Add these lines (replacing with your actual values):
   ```
   MICROSOFT_CLIENT_ID=your_application_client_id_here
   MICROSOFT_CLIENT_SECRET=your_client_secret_here
   ```
3. Note: We use "common" for tenant ID (already in .env) to support both personal and work accounts
4. Save the file
5. Restart your development server

### Step 8: Test the Integration
1. Navigate to Settings in your RoundRobin app
2. Click "Connect Outlook Calendar"
3. You should be redirected to Microsoft's login page
4. Sign in and grant permissions
5. You should be redirected back to your app with a success message

## Troubleshooting

**Error: "AADSTS50011: The redirect URI does not match"**
- Verify your redirect URI in .env matches what's in Azure Portal
- Check for trailing slashes or http vs https mismatches

**Error: "AADSTS700016: Application not found"**
- Verify your Client ID is correct
- Make sure you're using the Application (client) ID, not the Object ID

**Error: "invalid_client"**
- Your Client Secret may be incorrect or expired
- Create a new secret in Azure Portal and update .env

**Error: "Need admin approval"**
- Go back to Step 5 and click "Grant admin consent"

## Production Deployment
When ready for production:
1. Add your production URL to Redirect URIs in Azure Portal
2. Update MICROSOFT_REDIRECT_URI in your production environment
3. Consider creating a new Client Secret for production

## Security Notes
- Client Secrets expire! Set a calendar reminder to rotate them
- Never commit your .env file to version control
- Keep your Client Secret secure
- If you suspect a secret is compromised, delete it in Azure Portal immediately

## Multi-Tenant vs Single-Tenant
We use "common" tenant to support:
- Personal Microsoft accounts (Outlook.com, Hotmail, Live)
- Work/School accounts (Office 365)

If you only need work accounts, change tenant ID to your Directory (tenant) ID.
