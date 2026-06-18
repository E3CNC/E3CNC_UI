#!/usr/bin/env bash
# Download pre-built frontend from GitHub nightly release.
# Falls back to local build if the download fails or bun is available.
#
# Usage: ./scripts/download_frontend.sh [web_root]
#   web_root: target directory (default: ~/mainsail)

set -euo pipefail

WEB_ROOT="${1:-$HOME/mainsail}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OWNER="isaaceliape"
REPO="mainsail-cnc"

echo "=== Downloading pre-built frontend ==="

# Try to download from the latest nightly-main release asset first
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

PKG_VER="v$(node -p "require('$REPO_ROOT/package.json').version")"
ASSET_NAME="mainsail-cnc-${PKG_VER}.zip"
ZIP_FILE="$TMP_DIR/$ASSET_NAME"

RELEASES_API_URL="https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=10"
ZIP_URL=$(curl -sfL "$RELEASES_API_URL" | node -e "
let data = '';
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  try {
    const releases = JSON.parse(data);
    for (const release of releases) {
      const asset = (release.assets || []).find(a => a.name === '$ASSET_NAME');
      if (asset) {
        console.log(asset.browser_download_url);
        return;
      }
    }
    console.log('');
  } catch (e) {
    console.log('');
  }
});
")

if [[ -n "$ZIP_URL" ]] && curl -sfL "$ZIP_URL" -o "$ZIP_FILE" && [[ -s "$ZIP_FILE" ]]; then
    echo "    downloaded nightly build ($(du -h "$ZIP_FILE" | cut -f1))"

    mkdir -p "$WEB_ROOT"
    find "$WEB_ROOT" -type f -not -name 'config.json' -delete 2>/dev/null || true
    find "$WEB_ROOT" -mindepth 1 -type d -empty -delete 2>/dev/null || true

    unzip -oq "$ZIP_FILE" -d "$WEB_ROOT"

    if [[ ! -f "$WEB_ROOT/version.json" ]]; then
        echo "{\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"commit\":\"$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)\"}" > "$WEB_ROOT/version.json"
    fi

    echo "    extracted to $WEB_ROOT"

    # Reload nginx
    if command -v sudo &>/dev/null; then
        sudo systemctl reload nginx 2>/dev/null || true
    elif command -v systemctl &>/dev/null; then
        systemctl reload nginx 2>/dev/null || true
    fi

    echo "=== Frontend updated via nightly release ==="
else
    ARCH=$(uname -m)
    echo "    WARNING: could not download nightly build" >&2
    echo "    Falling back to local build..." >&2

    cd "$REPO_ROOT"

    if [[ "$ARCH" == "armv7l" ]]; then
        # 32-bit ARM — Bun is not available; use npm
        if ! command -v npm &>/dev/null; then
            echo "    ERROR: npm not found on 32-bit ARM. Install Node.js via nvm." >&2
            exit 1
        fi
        echo "    (32-bit ARM detected, using npm instead of bun)" >&2
        npm install --legacy-peer-deps
        npm run build
    else
        export PATH="${HOME}/.bun/bin:${PATH}"
        if command -v bun &>/dev/null; then
            bun install --frozen-lockfile
            bun run build
        else
            echo "    WARNING: bun not found, trying npm..." >&2
            if ! command -v npm &>/dev/null; then
                echo "    ERROR: neither bun nor npm found" >&2
                exit 1
            fi
            npm install --legacy-peer-deps
            npm run build
        fi
    fi

    mkdir -p "$WEB_ROOT"
    find "$WEB_ROOT" -type f -not -name 'config.json' -delete 2>/dev/null || true
    find "$WEB_ROOT" -mindepth 1 -type d -empty -delete 2>/dev/null || true
    cp -a "$REPO_ROOT/dist/"* "$WEB_ROOT/"
    cp "$REPO_ROOT"/dist/.* "$WEB_ROOT/" 2>/dev/null || true
    echo "{\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"commit\":\"$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)\"}" > "$WEB_ROOT/version.json"

    echo "    local build deployed to $WEB_ROOT"

    if command -v sudo &>/dev/null; then
        sudo systemctl reload nginx 2>/dev/null || true
    elif command -v systemctl &>/dev/null; then
        systemctl reload nginx 2>/dev/null || true
    fi

    echo "=== Frontend built locally ==="
fi
