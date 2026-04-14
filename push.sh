#!/bin/bash
# ─────────────────────────────────────────────────────────────
# VVR Dashboard — Push all fixes to GitHub
# Run this script from the vvr-deploy/ folder.
# Requires: git + either GitHub CLI (gh) or SSH/HTTPS git access
# ─────────────────────────────────────────────────────────────
set -e

REPO="https://github.com/xxmarsim/VVR.git"
TMPDIR_CLONE="/tmp/vvr-push-$$"

echo "Cloning VVR repo..."
git clone "$REPO" "$TMPDIR_CLONE"
cd "$TMPDIR_CLONE"

# Copy all files from vvr-deploy into the clone
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Copying files..."
cp "$SCRIPT_DIR/index.html"                        ./index.html
cp "$SCRIPT_DIR/fetch-data.js"                     ./fetch-data.js    2>/dev/null || true
mkdir -p .github/workflows data
cp "$SCRIPT_DIR/.github/workflows/fetch-data.yml"  .github/workflows/ 2>/dev/null || true
cp "$SCRIPT_DIR/data/"*.json                       data/              2>/dev/null || true

git add -A
git status

git commit -m "fix: remove limit= params, add Chart.js price timeline, add GitHub Actions"
git push

echo ""
echo "✅ Pushed. GitHub Pages will update in ~1 minute."
echo "   https://xxmarsim.github.io/VVR/"
echo ""
echo "Next: go to https://github.com/xxmarsim/VVR/actions"
echo "       → Fetch VR On-Chain Data → Run workflow"
echo "      (runs data fetcher immediately instead of waiting 10 min)"

# Cleanup
cd / && rm -rf "$TMPDIR_CLONE"
