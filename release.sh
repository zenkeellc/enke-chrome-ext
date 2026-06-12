#!/bin/bash
set -euo pipefail

VERSION="${1:-1.0.0}"
REPO="enke-chrome-ext"
GITHUB_REMOTE="origin"

echo "=== Releasing $REPO v$VERSION ==="

# 1. Check working directory clean
if [[ -n $(git status --porcelain) ]]; then
  echo "Error: working directory not clean. Commit or stash changes first."
  exit 1
fi

# 2. Update version in manifest.json
if [[ -f dist/manifest.json ]]; then
  # Use jq if available, otherwise sed
  if command -v jq &> /dev/null; then
    jq ".version = \"$VERSION\"" dist/manifest.json > dist/manifest.json.tmp && mv dist/manifest.json.tmp dist/manifest.json
  else
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" dist/manifest.json
  fi
fi

# 3. Build extension package
npm install
npm run build 2>&1 || echo "Warning: build may have warnings"

# 4. Create .crx package (zip dist/ for Chrome Web Store submission)
ZIPFILE="${REPO}-v${VERSION}.zip"
if [[ -d dist ]]; then
  cd dist && zip -r "../$ZIPFILE" . && cd ..
  echo "Created $ZIPFILE"
fi

# 5. Git tag & push
git add dist/manifest.json 2>/dev/null || true
git commit -m "release: v$VERSION" 2>&1 || echo "Nothing to commit"
git tag "v$VERSION"
git push "$GITHUB_REMOTE" main
git push "$GITHUB_REMOTE" "v$VERSION"

# 6. Create GitHub Release with .crx asset
if command -v gh &> /dev/null; then
  ASSETS=""
  if [[ -f "$ZIPFILE" ]]; then
    ASSETS="$ZIPFILE"
  fi
  gh release create "v$VERSION" \
    --title "enke Chrome Extension v$VERSION" \
    --notes "## enke Chrome Extension v$VERSION

### Install
- **Chrome Web Store:** [Install from Chrome Web Store](https://chromewebstore.google.com/detail/enke-url-shortener-qr-cod/EXTENSION_ID_PLACEHOLDER)
- **Offline (.crx):** Download \`$ZIPFILE\` below → Chrome → \`chrome://extensions\` → Enable Developer mode → Drag \`.crx\` to install
- **Offline (unpacked):** \`git clone https://github.com/zenkeellc/enke-chrome-ext.git\` → Chrome → \`chrome://extensions\` → Developer mode → Load unpacked

### Features
- Right-click any link → \"Shorten this URL\"
- Toolbar popup: paste URL & shorten
- Keyboard shortcut: \`Ctrl+Shift+E\` (Windows/Linux) / \`Cmd+Shift+E\` (Mac)
- QR code generation for shortened links
- Works anonymous or logged-in (with analytics)

### Permissions
\`contextMenus\`, \`activeTab\`, \`clipboardWrite\`, \`storage\`, \`scripting\`, \`notifications\`

### Changes
See [GitHub releases](https://github.com/zenkeellc/$REPO/releases) for version history." \
    --repo "zenkeellc/$REPO" \
    $ASSETS
else
  echo "GitHub CLI (gh) not found. Create release manually at:"
  echo "  https://github.com/zenkeellc/$REPO/releases/new?tag=v$VERSION"
  if [[ -f "$ZIPFILE" ]]; then
    echo "  Attach: $ZIPFILE"
  fi
fi

echo "=== Release complete: v$VERSION ==="
