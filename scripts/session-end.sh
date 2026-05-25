#!/usr/bin/env bash
set -euo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root"

git diff --quiet && git diff --cached --quiet && exit 0

branch=$(git rev-parse --abbrev-ref HEAD)

git add -A
git commit -m "auto: session changes" --no-gpg-sign 2>/dev/null || true
git push origin "$branch" 2>/dev/null || true

if [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
  gh pr view "$branch" --json number &>/dev/null ||
    gh pr create --title "$branch" --body "Automated PR from OpenCode session." --base main 2>/dev/null || true
fi
