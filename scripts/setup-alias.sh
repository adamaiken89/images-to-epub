#!/usr/bin/env bash
set -euo pipefail

ALIAS_NAME="${1:-img2epub}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ALIAS_LINE="alias $ALIAS_NAME='cd \"$PROJECT_DIR\" && bun start'"
ZSHRC="$HOME/.zshrc"

if grep -q "alias $ALIAS_NAME=" "$ZSHRC" 2>/dev/null; then
  echo "Alias '$ALIAS_NAME' already exists in $ZSHRC"
  exit 0
fi

{
  echo ""
  echo "# Added by images_to_epub/setup-alias.sh"
  echo "$ALIAS_LINE"
} >> "$ZSHRC"

echo "Added alias '$ALIAS_NAME' -> $PROJECT_DIR"
echo "Run: source $ZSHRC"