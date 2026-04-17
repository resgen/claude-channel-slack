# Runbook: Health checks

When the user DMs "are you healthy?" or "status check", run through these checks and report results concisely (Slack-friendly formatting).

## Level 1: Is the plugin connected?

If you received the DM at all, the plugin IS connected. Say: `✅ Plugin connected (received this DM via slack-channel MCP).`

Optional deeper check: the dispatcher session's `/mcp` panel would show `slack-channel · ✓ connected`. You can't run `/mcp` via tool from DM, so skip unless asked to.

## Level 2: Tokens and state files

Check file presence and permissions:

- `~/.claude/channels/slack/.env` exists? Expected chmod `0600`.
- `~/.claude/channels/slack/access.json` parseable JSON?
- `~/.claude/channels/slack/routes.json` parseable JSON?
- `~/.claude/channels/slack/threads.json` parseable JSON (if present)?

Report any anomalies (missing file, bad permissions, malformed JSON).

## Level 3: Configuration summary

Summarize the current runtime state:

- **DM policy**: (from `access.json` → `dmPolicy`)
- **Allowed DM users**: count, optionally list user IDs
- **Opted-in channels**: count, optionally list channel IDs
- **Routed channels**: count (from `routes.json`), list projects
- **Active threads**: count (from `threads.json`), breakdown by project label

## Level 4: Subagent vitals

For each thread in `threads.json`:
- `last_activity_ms` → compute "X hours/days ago"
- Flag any threads idle > 7 days (candidates for cleanup)

## Report template

A clean Slack response might look like:

```
:white_check_mark: Health check

• Plugin: connected
• Tokens: set (bot + app), chmod 600
• State: 3 files valid
• DM policy: pairing
• Allowlisted DM users: 1
• Opted-in channels: 2
• Routed projects: 2 (RFP Knowledge, SDLC Transformation)
• Active threads: 4 (2 RFP, 1 SDLC, 1 unrouted)
• Stale threads: 0

All systems nominal.
```

If anything's wrong, surface the first issue clearly and suggest a fix (point at the troubleshooting runbook if appropriate).
