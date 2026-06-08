# Chrome Web Store API — OAuth Credentials Setup

## Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing: **en.ke Extension**
3. Enable the **Chrome Web Store API**:
   - APIs & Services → Library → search "Chrome Web Store API" → Enable

## Step 2: Create OAuth 2.0 Client

1. APIs & Services → Credentials → Create Credentials → OAuth client ID
2. Application type: **Desktop app**
3. Name: `enke-chrome-ext-publish`
4. Create → Download JSON or note:
   - **Client ID** (ends with `.apps.googleusercontent.com`)
   - **Client Secret**

## Step 3: Generate Refresh Token

In terminal:

```bash
# Install CLI tool (already in devDependencies)
cd enke-chrome-ext

# Generate refresh token
npx chrome-webstore-upload-cli get-refresh-token \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET
```

This opens a browser for OAuth consent. After authorization, it prints a **Refresh Token**.

## Step 4: Create .env.publish

```bash
cp .env.publish.example .env.publish
```

Fill in:

```bash
CLIENT_ID=1234567890-xxxxx.apps.googleusercontent.com
CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
REFRESH_TOKEN=1//xxxxxxxxxxxxx
EXTENSION_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx  # From Chrome Web Store dashboard
```

## Step 5: Publish

```bash
./publish.sh
```

This builds the extension (type-check + vite build), then uploads and publishes to the Chrome Web Store.

---

## Getting the Extension ID

1. Go to https://chrome.google.com/webstore/devconsole
2. Register a new item → upload a zip of `dist/` manually the first time
3. The Extension ID will be assigned and visible in the dashboard
4. Copy it into `.env.publish`

After the first manual upload, subsequent updates can use `./publish.sh`.
