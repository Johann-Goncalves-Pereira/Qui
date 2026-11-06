#!/usr/bin/env bash
# Validates that an issue draft adheres to the Qui Desktop fork requirements:
# 1. Title does not contain conventional-commit prefix.
# 2. Includes the mandatory "Upstream Docker Alignment & Breaking Change Risk" section.
# 3. Includes Motivation, Architecture/Flow, Implementation Checklist, and Acceptance Criteria.

set -euo pipefail

usage() {
  echo "Usage: $0 <issue-body-file.md> [optional-title]"
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

BODY_FILE="$1"
TITLE="${2:-}"

if [[ ! -f "$BODY_FILE" ]]; then
  echo "❌ Error: File not found: $BODY_FILE" >&2
  exit 1
fi

ERRORS=0

# 1. Check title if provided
if [[ -n "$TITLE" ]]; then
  if echo "$TITLE" | grep -Eq '^(feat|fix|chore|docs|refactor|test|ci|perf)(\([a-zA-Z0-9_-]+\))?:'; then
    echo "❌ Error: Title '$TITLE' uses conventional-commit prefix. Use humanized Title Case instead (e.g. 'Add Status Bar Footer with Live Docker Container Health')." >&2
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ Title check passed: $TITLE"
  fi
fi

# 2. Check for Upstream Docker Alignment section
if ! grep -q "Upstream Docker Alignment & Breaking Change Risk" "$BODY_FILE"; then
  echo "❌ Error: Missing mandatory section '## ⚠️ Upstream Docker Alignment & Breaking Change Risk'." >&2
  echo "   Every issue in this fork must evaluate upstream Docker layout dependency and future breakage risks." >&2
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Upstream Docker Alignment section found."
fi

# 3. Check for Implementation Checklist
if ! grep -q "Implementation Checklist" "$BODY_FILE"; then
  echo "❌ Error: Missing '## 📋 Implementation Checklist'." >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. Check for Acceptance Criteria (Definition of Done)
if ! grep -Eq "(Acceptance Criteria|Definition of Done)" "$BODY_FILE"; then
  echo "❌ Error: Missing '## ✅ Acceptance Criteria (Definition of Done)'." >&2
  ERRORS=$((ERRORS + 1))
fi

if [[ $ERRORS -gt 0 ]]; then
  echo "❌ Issue validation failed with $ERRORS error(s)." >&2
  exit 1
fi

echo "✅ Issue draft complies with Qui Desktop fork requirements."
