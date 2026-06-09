#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# en.ke Chrome Extension — Package dist/ into dist/enke.zip
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

ZIPFILE="enke.zip"

# ── Clean macOS junk files ──────────────────────────────────
echo "=== Cleaning macOS junk files ==="
find dist -name '.DS_Store' -type f -delete 2>/dev/null || true
find dist -name '__MACOSX' -type d -exec rm -rf {} + 2>/dev/null || true

# ── Remove old zip ──────────────────────────────────────────
if [ -f "dist/$ZIPFILE" ]; then
  echo "=== Removing old $ZIPFILE ==="
  rm -f "dist/$ZIPFILE"
fi

# ── Package ─────────────────────────────────────────────────
echo "=== Packaging: dist/$ZIPFILE ==="
cd dist
zip -r "$ZIPFILE" . -x "*.zip" "*.map" "*.tsbuildinfo"
cd ..

echo "Package size: $(du -h "dist/$ZIPFILE" | cut -f1)"
echo "=== Done ==="
