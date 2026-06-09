#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# en.ke Chrome Extension — Build & Publish to Chrome Web Store
#
# Uses Chrome Web Store V2 API (chromewebstore.googleapis.com)
# Reuses existing Google Cloud project (zenkee) — just enable
# the "Chrome Web Store API" on it.
# ═══════════════════════════════════════════════════════════════


SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Load credentials ──────────────────────────────────────
if [ -f .env.publish ]; then
  set -a; source .env.publish; set +a
else
  echo "ERROR: .env.publish not found."
  echo "Copy .env.publish.example and fill in the required values."
  exit 1
fi

required_vars=(CLIENT_ID CLIENT_SECRET REFRESH_TOKEN EXTENSION_ID PUBLISHER_ID)
missing=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then missing+=("$var"); fi
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "ERROR: Missing required vars in .env.publish: ${missing[*]}"
  exit 1
fi

# ── Build ─────────────────────────────────────────────────
echo "=== Building extension ==="
npm run build

# ── Package ───────────────────────────────────────────────
ZIPFILE="enke-chrome-ext-v$(node -p "require('./package.json').version").zip"
echo "=== Packaging: $ZIPFILE ==="
cd dist
zip -r "../$ZIPFILE" . -x "*.map" "*.tsbuildinfo"
cd ..

echo "Package size: $(du -h "$ZIPFILE" | cut -f1)"

# ── Get access token ──────────────────────────────────────
echo "=== Getting access token ==="
TOKEN_RESPONSE=$(curl -sS -X POST "https://oauth2.googleapis.com/token" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "grant_type=refresh_token")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "ERROR: Failed to get access token. Response:"
  echo "$TOKEN_RESPONSE"
  exit 1
fi
echo "Access token obtained."

# ── Upload ────────────────────────────────────────────────
echo "=== Uploading to Chrome Web Store ==="
UPLOAD_URL="https://chromewebstore.googleapis.com/upload/v2/publishers/$PUBLISHER_ID/items/$EXTENSION_ID:upload"

UPLOAD_RESPONSE=$(curl -sS -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-api-client: enke-publish-script" \
  --data-binary "@$ZIPFILE" \
  -H "Content-Type: application/zip" \
  "$UPLOAD_URL")

echo "Upload response: $UPLOAD_RESPONSE"

if echo "$UPLOAD_RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo "Upload OK."
else
  echo "ERROR: Upload may have failed. Check response above."
  exit 1
fi

# ── Publish ───────────────────────────────────────────────
echo "=== Publishing ==="
PUBLISH_URL="https://chromewebstore.googleapis.com/v2/publishers/$PUBLISHER_ID/items/$EXTENSION_ID:publish"

PUBLISH_RESPONSE=$(curl -sS -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$PUBLISH_URL")

echo "Publish response: $PUBLISH_RESPONSE"

if echo "$PUBLISH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('status') in ('OK','SUBMITTED_FOR_REVIEW','IN_REVIEW','PUBLISHED') else 1)" 2>/dev/null; then
  echo "=== Published successfully! ==="
else
  echo "NOTE: Publish returned unexpected status. Check response above."
fi

# ── Cleanup ───────────────────────────────────────────────
rm -f "$ZIPFILE"
echo "=== Done ==="
