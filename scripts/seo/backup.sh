#!/bin/bash
# Sync SEO research artifacts to the first100-seo-artifacts private repo.
# Run after a research pass (new run, re-expand, re-cluster, etc.) to back up state.
#
# Assumes ../first100-seo-artifacts/ is a sibling checkout of github.com/drkwjr/first100-seo-artifacts.
# Clone it there if missing:
#   gh repo clone drkwjr/first100-seo-artifacts ../first100-seo-artifacts

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ARTIFACTS_REPO="${REPO_ROOT}/../first100-seo-artifacts"

if [ ! -d "$ARTIFACTS_REPO" ]; then
  echo "ERROR: $ARTIFACTS_REPO not found."
  echo "Clone it with: gh repo clone drkwjr/first100-seo-artifacts $ARTIFACTS_REPO"
  exit 1
fi

echo "Syncing artifacts to $ARTIFACTS_REPO..."

# Ensure the repo is up to date
cd "$ARTIFACTS_REPO"
git pull --rebase --quiet origin main

# Mirror the local data/ and output/ directories
rsync -a --delete "$REPO_ROOT/scripts/seo/data/" "$ARTIFACTS_REPO/data/"
rsync -a --delete "$REPO_ROOT/scripts/seo/output/" "$ARTIFACTS_REPO/output/"

# Commit if there are changes
cd "$ARTIFACTS_REPO"
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to back up."
  exit 0
fi

TIMESTAMP="$(date +%Y-%m-%d\ %H:%M)"
git add -A
git commit -m "backup: snapshot $TIMESTAMP" --quiet
git push origin main --quiet
echo "Backup complete: $TIMESTAMP"
