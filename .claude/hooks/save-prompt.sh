#!/bin/bash
# Save user prompts to prompt history
# Called by Claude Code hook on UserPromptSubmit

PROMPT="$1"
HISTORY_FILE="prompts/prompt-history.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_HEADER=$(date -u +"%Y-%m-%d %H:%M UTC")

# Create prompts directory if it doesn't exist
mkdir -p prompts

# Skip if prompt is empty or too short
if [ -z "$PROMPT" ] || [ ${#PROMPT} -lt 3 ]; then
    exit 0
fi

# Redact potential secrets (basic patterns)
SAFE_PROMPT=$(echo "$PROMPT" | sed -E \
    -e 's/[A-Za-z0-9_-]{32,}/[REDACTED_KEY]/g' \
    -e 's/password[=:][^ ]*/password=[REDACTED]/gi' \
    -e 's/secret[=:][^ ]*/secret=[REDACTED]/gi' \
    -e 's/token[=:][^ ]*/token=[REDACTED]/gi' \
    -e 's/api[_-]?key[=:][^ ]*/api_key=[REDACTED]/gi')

# Append to history file
cat >> "$HISTORY_FILE" << EOF

### ${DATE_HEADER}
[Timestamp: ${TIMESTAMP}]
[Prompt:]
${SAFE_PROMPT}

---
EOF

exit 0
