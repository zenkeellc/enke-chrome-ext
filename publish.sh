#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# en.ke Chrome Extension — Build, Publish & Release
#
# 1. Build extension
# 2. Upload & publish to Chrome Web Store
# 3. Create GitHub release with packaged .zip
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

GITHUB_REPO="zenkeellc/enke-chrome-ext"
VERSION="$(node -p "require('./package.json').version")"
ZIPFILE="enke-chrome-ext-v${VERSION}.zip"

echo "══════════════════════════════════════════════"
echo "  en.ke Chrome Extension — Publish v${VERSION}"
echo "══════════════════════════════════════════════"
echo ""

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
echo "── 1/5  Building extension ──"
npm run build

# ── Package ───────────────────────────────────────────────
echo "── 2/5  Packaging: $ZIPFILE ──"
cd dist
zip -r "../$ZIPFILE" . -x "*.map" "*.tsbuildinfo"
cd ..

echo "  Package size: $(du -h "$ZIPFILE" | cut -f1)"

# ── Get access token ──────────────────────────────────────
echo "── 3/5  Authenticating with Google ──"
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

# ── Upload to Chrome Web Store ────────────────────────────
echo "── 4/5  Uploading to Chrome Web Store ──"
UPLOAD_URL="https://chromewebstore.googleapis.com/upload/v2/publishers/$PUBLISHER_ID/items/$EXTENSION_ID:upload"

UPLOAD_RESPONSE=$(curl -sS -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-api-client: enke-publish-script" \
  --data-binary "@$ZIPFILE" \
  -H "Content-Type: application/zip" \
  "$UPLOAD_URL")

echo "  Upload response: $UPLOAD_RESPONSE"

if echo "$UPLOAD_RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo ""
else
  echo "  WARNING: Upload may have failed. Check response above."
fi

# ── Publish ───────────────────────────────────────────────
echo "── 5/5  Publishing to Chrome Web Store ──"
PUBLISH_URL="https://chromewebstore.googleapis.com/v2/publishers/$PUBLISHER_ID/items/$EXTENSION_ID:publish"

PUBLISH_RESPONSE=$(curl -sS -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$PUBLISH_URL")

echo "  Publish response: $PUBLISH_RESPONSE"

STATUS=$(echo "$PUBLISH_RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# V2 API returns 'status', V1.1 API returns 'state'
s = d.get('status') or d.get('state') or 'UNKNOWN'
print(s)
" 2>/dev/null || echo "UNKNOWN")

# ── Status & URLs ─────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  Chrome Web Store Publish Status: $STATUS"
echo "══════════════════════════════════════════════"
echo ""
echo "  Listing URL:    https://chrome.google.com/webstore/detail/$EXTENSION_ID"
echo "  Developer Dash: https://chrome.google.com/webstore/devconsole"
echo "  Status meanings:"
echo "    PUBLISHED           — Live on Chrome Web Store"
echo "    IN_REVIEW           — Under review by Google"
echo "    SUBMITTED_FOR_REVIEW— Queued for review"
echo "    PENDING_REVIEW      — Awaiting human review"
echo ""

# ── GitHub Release ────────────────────────────────────────
echo "── Creating GitHub Release ──"

# Check if tag already exists
if git rev-parse "v${VERSION}" >/dev/null 2>&1; then
  echo "  Tag v${VERSION} already exists, skipping GitHub release."
  echo "  To re-release, delete the tag first: git tag -d v${VERSION} && git push github :v${VERSION}"
else
  # Commit version bump if manifest changed
  if [[ -n $(git status --porcelain dist/manifest.json 2>/dev/null) ]]; then
    git add dist/manifest.json
    git commit -m "release: v${VERSION}" 2>&1 || echo "  Nothing to commit"
  fi

  # Tag & push
  git tag "v${VERSION}"
  git push github master 2>&1 || echo "  Push warning (may already be up to date)"
  git push github "v${VERSION}" 2>&1

  # Create GitHub release
  if command -v gh &> /dev/null; then
    gh release create "v${VERSION}" \
      --repo "$GITHUB_REPO" \
      --title "enke Chrome Extension v${VERSION}" \
      --notes "## enke Chrome Extension v${VERSION}

### Install
- **[Install from Chrome Web Store](${CWS_URL:-https://chrome.google.com/webstore/detail/$EXTENSION_ID})**
- **Offline (.zip):** Download \`$ZIPFILE\` below → Chrome → \`chrome://extensions\` → Enable Developer mode → **Load unpacked** and select the unzipped folder

### Recent Changes
See [full changelog](https://github.com/$GITHUB_REPO/releases) for version history." \
      "$ZIPFILE" 2>&1

    echo ""
    echo "  GitHub Release: https://github.com/$GITHUB_REPO/releases/tag/v${VERSION}"
  else
    echo "  GitHub CLI (gh) not found. Create release manually at:"
    echo "  https://github.com/$GITHUB_REPO/releases/new?tag=v${VERSION}"
    echo "  Attach: $ZIPFILE"
  fi
fi

# ── Done ──────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  Publish complete — v${VERSION}"
echo "  Status: $STATUS"
echo "  CWS URL: https://chrome.google.com/webstore/detail/$EXTENSION_ID"
echo "══════════════════════════════════════════════"
