#!/usr/bin/env bash
# bump-version.sh — Bump all version strings consistently.
#
# Usage:
#   ./bump-version.sh              # bump patch (0.9.2 → 0.9.3)
#   ./bump-version.sh 0.10.0       # set specific version
#   ./bump-version.sh --minor      # bump minor (0.9.2 → 0.10.0)
#   ./bump-version.sh --major      # bump major (0.9.2 → 1.0.0)
#
# Source of truth: package.json ("version" field)
# Synced to: _e3cnc_shared.py (VERSION constant)
# Also adds a stub entry to CHANGELOG.md.

set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "$0")")"

# ── read current version from package.json ────────────────────────────────────
CURRENT=$(grep '"version"' package.json | sed 's/.*"version": "\(.*\)",/\1/')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
MAJOR="${MAJOR#v}"

# ── determine new version ────────────────────────────────────────────────────
if [[ $# -eq 0 ]]; then
    NEW="$MAJOR.$MINOR.$((PATCH + 1))"
elif [[ "$1" == "--major" ]]; then
    NEW="$((MAJOR + 1)).0.0"
elif [[ "$1" == "--minor" ]]; then
    NEW="$MAJOR.$((MINOR + 1)).0"
elif [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    NEW="$1"
else
    echo "Usage: $0 [--major | --minor | <semver>]"
    exit 1
fi

echo "Bumping version: $CURRENT → $NEW"

# ── update package.json ──────────────────────────────────────────────────────
if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json
else
    sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json
fi
echo "  ✓ package.json"

# ── update _e3cnc_shared.py ──────────────────────────────────────────────────
if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "s/^VERSION = \"$CURRENT\"/VERSION = \"$NEW\"/" _e3cnc_shared.py
else
    sed -i "s/^VERSION = \"$CURRENT\"/VERSION = \"$NEW\"/" _e3cnc_shared.py
fi
echo "  ✓ _e3cnc_shared.py"

# ── add stub entry to CHANGELOG.md ───────────────────────────────────────────
TODAY=$(date +%Y-%m-%d)
STUB="## v$NEW ($TODAY)
- _No changelog entry yet. Describe changes here before releasing._

"
# Insert after the first line (# Changelog)
python3 -c "
import sys
with open('CHANGELOG.md') as f:
    lines = f.readlines()
lines.insert(1, '''$STUB''')
with open('CHANGELOG.md', 'w') as f:
    f.writelines(lines)
"
echo "  ✓ CHANGELOG.md (stub added — edit before commit)"

# ── done ─────────────────────────────────────────────────────────────────────
echo ""
echo "All version files synced to $NEW."
echo "Run 'git diff' to verify, then commit."
