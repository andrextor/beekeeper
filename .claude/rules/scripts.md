---
paths:
  - "scripts/**"
---

# Shell scripts

- `#!/usr/bin/env bash` + `set -euo pipefail`; usage line in Spanish when an argument is missing.
- Required environment variables are checked with `: "${VAR:?Falta VAR}"` before any request.
- `curl -sS --fail-with-body` (never `-sf`): the error and the response body must reach the operator. Wrap the call and print a Spanish message with the body on failure.
- Parse JSON defensively: check the shape (`isinstance`) and exit with a clear message on anything unexpected, never let a `KeyError` become a wrong answer.
- Secrets (passwords, keys) are read without echo (`read -rs`) and passed through the environment, never as command-line arguments (they show up in `ps`).
