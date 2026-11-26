#!/usr/bin/env bash
# One-command undo for the redesign. Run: npm run undo-redesign
set -euo pipefail
TAG="pre-redesign-backup"
BRANCH="redesign/human-ui"
STAMP="$(date +%Y%m%d-%H%M%S)"

git rev-parse -q --verify "refs/tags/$TAG" >/dev/null || { echo "Backup tag '$TAG' not found. Stopping."; exit 1; }

# Save any unfinished work so nothing is lost
git stash push -u -m "undo-redesign-autosave-$STAMP" >/dev/null 2>&1 || true

git switch main

# Keep the redesign work under a new name (do not delete it)
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git branch -m "$BRANCH" "redesign/archived-$STAMP"
fi

# If main still equals the backup, nothing else to do. Otherwise restore files with ONE new commit.
if [ "$(git rev-parse main)" != "$(git rev-parse "$TAG")" ]; then
  git rm -r -q --ignore-unmatch .
  git checkout "$TAG" -- .
  git commit -q -m "Undo redesign: restore files from $TAG"
fi

echo "DONE. The site files are back to the version before the redesign (local only)."
echo "The redesign is saved in branch: redesign/archived-$STAMP (you can bring it back later)."
echo "To make it live again on Vercel: ask your assistant to push, or use Instant Rollback in the Vercel dashboard."
