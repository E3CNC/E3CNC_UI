#!/usr/bin/env bash
# Post-update hook for Moonraker's update_manager.
# Runs after `git pull` on the E3CNC_UI monorepo.
#
# Delegates to the Ansible redeploy playbook, which handles:
#   - Frontend rebuild + deploy
#   - CNC agent re-vendor
#   - Metadata extractor re-deploy
#   - WCS Klipper plugin + macros re-deploy
#   - Moonraker restart
#
# Usage:
#   ./scripts/post_update.sh
#
# Add to moonraker.conf:
#   [update_manager E3CNC_UI]
#   post_update_script: ~/E3CNC_UI/scripts/post_update.sh

set -euo pipefail

# Ensure local install paths are on PATH (bun, ansible, etc.)
export PATH="$HOME/.local/bin:$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== E3CNC_UI post-update ==="
echo "  Repo: $REPO_ROOT"
echo "  Delegating to Ansible redeploy playbook..."
echo ""

cd "$REPO_ROOT/ansible"
ansible-playbook \
  -i inventory/local.yml \
  playbooks/redeploy.yml \
  --diff

echo ""
echo "=== post-update complete ==="
