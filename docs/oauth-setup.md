# Chrome Web Store Publish API — Setup Guide

Reuse your existing Google Cloud project (**zenkee**) — no need to create a new one.

## One-Time Setup (5 minutes)

### 1. Enable Chrome Web Store API

1. https://console.cloud.google.com/ → select project **zenkee**
2. APIs & Services → Library → search "Chrome Web Store API" → **Enable**

### 2. Create OAuth Client

In the same project (**zenkee**):

1. APIs & Services → Credentials → **Create Credentials** → OAuth client ID
2. Application type: **Web application**
3. Name: `enke-chrome-ext-publish`
4. Authorized redirect URIs → Add: `https://developers.google.com/oauthplayground`
5. Create → copy:
   - **Client ID** (ends with `.apps.googleusercontent.com`)
   - **Client Secret**

### 3. Get Refresh Token

1. Open https://developers.google.com/oauthplayground
2. Click ⚙️ gear icon → ✅ "Use your own OAuth credentials"
3. Enter your **Client ID** + **Client Secret** → Close
4. Step 1: In "Input your own scopes", paste:
   ```
   https://www.googleapis.com/auth/chromewebstore
   ```
   Click **Authorize APIs**
5. Sign in with your Chrome Web Store developer Google account
6. Step 2: Click **Exchange authorization code for tokens**
7. Copy the **Refresh token** from the response

> ⚠️ If the refresh token expires after 7 days: go to OAuth consent screen in Google Cloud Console → Publishing status → **Publish App** (no verification needed for personal use)

### 4. Get Publisher ID

1. Go to https://chrome.google.com/webstore/devconsole
2. Click ⚙️ (top-right) → **Publisher** → **Settings**
3. Copy your **Publisher ID** (hex string)

### 5. First Upload (get Extension ID)

1. In the Developer Dashboard, click **New Item**
2. Upload a zip of `dist/` manually
3. Fill in store listing (description, screenshots, etc.)
4. After submission, the **Extension ID** is visible in the item URL

### 6. Create .env.publish

```bash
cd enke-chrome-ext
cp .env.publish.example .env.publish
```

Fill in all 5 values:

```bash
CLIENT_ID=1234567890-xxxxx.apps.googleusercontent.com
CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
REFRESH_TOKEN=1//xxxxxxxxxxxxx
EXTENSION_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLISHER_ID=xxxxxxxxxxxx
```

### 7. Publish

```bash
./publish.sh
```

This does: **build → zip → get OAuth token → upload (V2 API) → publish (V2 API)**
