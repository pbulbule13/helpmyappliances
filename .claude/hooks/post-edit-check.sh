#!/bin/bash
#===============================================================================
# POST-EDIT-CHECK HOOK
# Runs after file edits to validate code quality
#
# CHANGE FOR NEW PROJECTS:
# - Update linter commands based on your tech stack
# - Add/remove file type checks as needed
#===============================================================================

# Get the edited file from environment (if available)
EDITED_FILE="${CLAUDE_EDITED_FILE:-}"

# Exit early if no file specified
if [ -z "$EDITED_FILE" ]; then
    exit 0
fi

# Get file extension
EXT="${EDITED_FILE##*.}"

#===============================================================================
# PYTHON FILES
# CHANGE: Update for your Python setup (black, ruff, flake8, etc.)
#===============================================================================
if [ "$EXT" = "py" ]; then
    # Check if ruff is available
    if command -v ruff &> /dev/null; then
        ruff check "$EDITED_FILE" --fix --quiet 2>/dev/null || true
    fi
    # Check if black is available
    if command -v black &> /dev/null; then
        black "$EDITED_FILE" --quiet 2>/dev/null || true
    fi
fi

#===============================================================================
# JAVASCRIPT/TYPESCRIPT FILES
# CHANGE: Update for your JS/TS setup (eslint, prettier, biome, etc.)
#===============================================================================
if [ "$EXT" = "js" ] || [ "$EXT" = "jsx" ] || [ "$EXT" = "ts" ] || [ "$EXT" = "tsx" ]; then
    # Check if prettier is available
    if command -v prettier &> /dev/null; then
        prettier --write "$EDITED_FILE" --log-level silent 2>/dev/null || true
    fi
    # Check if eslint is available
    if command -v eslint &> /dev/null; then
        eslint --fix "$EDITED_FILE" --quiet 2>/dev/null || true
    fi
fi

#===============================================================================
# JSON FILES
# CHANGE: Add validation for config files
#===============================================================================
if [ "$EXT" = "json" ]; then
    # Validate JSON syntax
    if command -v python3 &> /dev/null; then
        python3 -m json.tool "$EDITED_FILE" > /dev/null 2>&1 || echo "Warning: Invalid JSON in $EDITED_FILE"
    fi
fi

#===============================================================================
# YAML FILES
# CHANGE: Add validation for YAML configs
#===============================================================================
if [ "$EXT" = "yaml" ] || [ "$EXT" = "yml" ]; then
    if command -v yamllint &> /dev/null; then
        yamllint -q "$EDITED_FILE" 2>/dev/null || true
    fi
fi

#===============================================================================
# SQL FILES
# CHANGE: Add SQL linting if needed
#===============================================================================
if [ "$EXT" = "sql" ]; then
    if command -v sqlfluff &> /dev/null; then
        sqlfluff fix "$EDITED_FILE" --quiet 2>/dev/null || true
    fi
fi

exit 0
