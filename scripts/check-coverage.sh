#!/usr/bin/env bash
set -u

OUT=$(bun test --coverage --coverage-reporter lcov --coverage-reporter text 2>&1) || true
echo "$OUT"

ALL_LINE=$(echo "$OUT" | awk -F'|' '/^All files/{print $0}')
if [ -z "$ALL_LINE" ]; then
  echo "ERROR: could not find 'All files' in coverage output" >&2
  exit 1
fi

FUNCS=$(echo "$ALL_LINE" | awk -F'|' '{gsub(/ /,"",$2); print $2}')
LINES=$(echo "$ALL_LINE" | awk -F'|' '{gsub(/ /,"",$3); print $3}')

FAIL=0
if (( $(echo "$FUNCS < 90" | bc -l) )); then
  echo "FAIL: aggregate function coverage ${FUNCS}% < 90%"
  FAIL=1
fi
if (( $(echo "$LINES < 90" | bc -l) )); then
  echo "FAIL: aggregate line coverage ${LINES}% < 90%"
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi

echo "OK: aggregate coverage >= 90% (funcs=${FUNCS}%, lines=${LINES}%)"
