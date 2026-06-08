#!/bin/bash
set -euo pipefail

# ─── en.ke Chrome Extension — Build & Publish to Chrome Web Store ───
#
# Required environment variables (set in .env.publish):
#   CLIENT_ID       Google OAuth2 client ID
#   CLIENT_SECRET   Google OAuth2 client secret
#   REFRESH_TOKEN   Google OAuth2 refresh token
#   EXTENSION_ID    Chrome Web Store extension ID

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load credentials from .env.publish
if [ -f .env.publish ]; then
  set -a
  source .env.publish
  set +a
else
  echo "ERROR: .env.publish file not found."
  echo "Create it with:"
  echo ""
  echo "  CLIENT_ID=your-google-oauth-client-id"
  echo "  CLIENT_SECRET=your-google-oauth-client-secret"
  echo "  REFRESH_TOKEN=your-refresh-token"
  echo "  EXTENSION_ID=your-extension-id"
  exit 1
fi

# Verify required vars
for var in CLIENT_ID CLIENT_SECRET REFRESH_TOKEN EXTENSION_ID; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is not set in .env.publish"
    exit 1
  fi
done

echo "=== Building extension ==="
npm run build

echo ""
echo "=== Uploading & Publishing to Chrome Web Store ==="
npx chrome-webstore-upload \
  --source dist \
  --extension-id "$EXTENSION_ID"

echo ""
echo "=== Done! Extension published to Chrome Web Store ==="
