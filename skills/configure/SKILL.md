---
name: configure
description: Set up the Slack channel — save bot and app tokens and review access policy. Use when the user pastes Slack tokens, asks to configure Slack, or wants to check channel status.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(chmod *)
---

# /slack:configure — Slack Channel Setup

This skill manages Slack token setup and channel status. It writes tokens to `~/.claude/channels/slack/.env` and orients the user on the current access policy.

Arguments passed: `$ARGUMENTS`

---

## Dispatch on Arguments

### No arguments → Status

Check the current configuration state and show a concrete next step.

Steps:
1. Read `~/.claude/channels/slack/.env` (handle ENOENT gracefully — file may not exist yet)
2. Read `~/.claude/channels/slack/access.json` (handle ENOENT)
3. Report:
   - Whether `SLACK_BOT_TOKEN` is set (show masked value like `xoxb-****-****-<last4>`)
   - Whether `SLACK_APP_TOKEN` is set (show masked value like `xapp-****-<last4>`)
   - Current `dmPolicy` from access.json (or "not set" if missing)
   - Count of entries in `allowFrom`
   - Count of pending pairing codes
4. Show a concrete next step — e.g., if tokens are missing, prompt to run `/slack:configure <bot-token> <app-token>`. If dmPolicy is still `pairing`, note that pairing is a temporary mode and nudge toward lockdown (`allowlist` or `disabled`).

> Push toward lockdown: `pairing` mode is convenient during initial setup but should be tightened once the intended users have been approved.

---

### `<bot-token> <app-token>` → Save tokens

Save or update the Slack bot and app tokens.

Validation:
- First argument must start with `xoxb-` (bot token)
- Second argument must start with `xapp-` (app token)
- If either fails validation, print a clear error and stop — do not write anything

Steps:
1. `mkdir -p ~/.claude/channels/slack`
2. Read existing `~/.claude/channels/slack/.env` (empty string if ENOENT)
3. Update or add `SLACK_BOT_TOKEN=<value>` and `SLACK_APP_TOKEN=<value>` lines — do not wrap values in quotes
4. Write the updated content back to `~/.claude/channels/slack/.env`
5. `chmod 600 ~/.claude/channels/slack/.env`
6. Confirm success, then run the status display (same as no-args mode) so the user can verify
7. Note that the server reads `.env` at boot — a restart is required for token changes to take effect

---

### `clear` → Remove tokens

Remove token lines from `.env` without deleting the file.

Steps:
1. Read `~/.claude/channels/slack/.env` (ENOENT → nothing to clear, say so)
2. Filter out lines starting with `SLACK_BOT_TOKEN=` and `SLACK_APP_TOKEN=`
3. Write remaining lines back
4. Confirm what was removed

---

## Implementation Notes

- The `~/.claude/channels/slack/` directory may not exist — always `mkdir -p` before writing
- The server reads `.env` once at boot; token changes require a server restart to take effect
- `access.json` is re-read on every incoming message, so policy changes (dmPolicy, allowFrom, etc.) take effect immediately without a restart
- Never write token values with surrounding quotes in `.env` — bare values only
- Always `chmod 600` the `.env` file after writing to protect token values
