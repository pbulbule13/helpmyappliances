# Prompt Persistence Rules

## Purpose

Save every user prompt in this project for audit, learning, and replay.

## Rules

- Whenever a user sends a prompt in this project, append it to `prompts/prompt-history.md`
- Create the `prompts/` directory if it doesn't exist
- Each entry must include:
  - **Timestamp:** ISO 8601 UTC (e.g. `2025-03-08T14:30:00Z`)
  - **Prompt:** The user's exact message text

## Format

```markdown
### YYYY-MM-DD HH:MM UTC
[Timestamp: ISO8601]
[Prompt:]
<user's message>
---
```

## Implementation

```python
import os
from datetime import datetime

def save_prompt(prompt: str):
    os.makedirs("prompts", exist_ok=True)

    timestamp = datetime.utcnow().isoformat() + "Z"
    date_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    entry = f"""
### {date_str}
[Timestamp: {timestamp}]
[Prompt:]
{prompt}
---
"""

    with open("prompts/prompt-history.md", "a") as f:
        f.write(entry)
```

## Do Not

- Skip saving because the prompt seems short or trivial
- Save secrets, tokens, or passwords — redact those and save the rest
- Overwrite or delete existing entries — only append
