#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Victoria VR Dashboard — One-command GitHub setup
# Run this from inside the victoria-vr-dashboard/ folder.
#
# Prerequisites:
#   - GitHub CLI installed: https://cli.github.com
#   - Logged in: gh auth login
# ─────────────────────────────────────────────────────────────────

set -e

REPO_NAME="victoria-vr-dashboard"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Victoria VR Dashboard — GitHub Setup        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check gh CLI
if ! command -v gh &> /dev/null; then
  echo "❌  GitHub CLI not found. Install it from: https://cli.github.com"
  exit 1
fi

# Check auth
if ! gh auth status &> /dev/null; then
  echo "❌  Not logged into GitHub CLI. Run: gh auth login"
  exit 1
fi

echo "✓  GitHub CLI authenticated"
GH_USER=$(gh api user --jq .login)
echo "✓  User: $GH_USER"

# Init git if needed
if [ ! -d ".git" ]; then
  git init
  git add -A
  git commit -m "initial: Victoria VR on-chain intelligence dashboard"
  echo "✓  Git repo initialised"
fi

# Create private GitHub repo and push
echo ""
echo "Creating private repo: $REPO_NAME ..."
gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
echo "✓  Repo created and pushed: https://github.com/$GH_USER/$REPO_NAME"

# Optional: add CoinGecko key
echo ""
read -p "Do you have a CoinGecko Demo API key? (y/N) " yn
if [ "$yn" = "y" ] || [ "$yn" = "Y" ]; then
  read -p "  Paste your CoinGecko key: " cg_key
  gh secret set COINGECKO_API_KEY --body "$cg_key" --repo "$GH_USER/$REPO_NAME"
  echo "  ✓  CoinGecko key saved to repo secrets"
fi

# Trigger first data fetch
echo ""
echo "Triggering first data fetch via GitHub Actions..."
gh workflow run "fetch-data.yml" --repo "$GH_USER/$REPO_NAME"
echo "✓  Workflow triggered. Check progress:"
echo "   https://github.com/$GH_USER/$REPO_NAME/actions"

# GitHub Pages setup
echo ""
echo "──────────────────────────────────────────────"
echo "Enabling GitHub Pages..."
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$GH_USER/$REPO_NAME/pages" \
  -f "source[branch]=main" \
  -f "source[path]=/" \
  2>/dev/null && echo "✓  GitHub Pages enabled." \
  || echo "⚠  GitHub Pages requires GitHub Pro for private repos."
echo "   Free alternative: go to https://vercel.com → New Project → Import from GitHub"
echo ""

# Summary
echo "╔══════════════════════════════════════════════╗"
echo "║                   DONE ✓                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Repo:    https://github.com/$GH_USER/$REPO_NAME"
echo "  Actions: https://github.com/$GH_USER/$REPO_NAME/actions"
echo "  Pages:   https://$GH_USER.github.io/$REPO_NAME  (if Pages enabled)"
echo ""
echo "  Data fetches automatically every 10 minutes."
echo "  To view locally:"
echo "    cd victoria-vr-dashboard"
echo "    python -m http.server 8080"
echo "    → open http://localhost:8080"
echo ""
