# Runbook: Troubleshooting common issues

## Bot doesn't respond to a channel message

Possible causes:
1. **Channel not opted in.** Check `~/.claude/channels/slack/access.json` → `channels` map. If the channel ID isn't there, run `/slack-channel:access channel add <channel-id>` at the terminal.
2. **No @mention** (in a channel with `requireMention: true`). The default channel policy requires the bot to be @mentioned. Bare channel messages drop silently.
3. **Channel not in routes.json.** The channel might be in access.json (gate allows it) but not in routes.json (no repo mapping). In that case, subagents fall back to the dispatcher's cwd — which is this orchestrator folder. That's fine for a one-off, but usually you want to add it to routes.json.
4. **Plugin server not connected.** Run `/mcp` — should show `slack-channel · ✓ connected`. If it shows failed or not present, restart Claude Code with `--debug` and check the log.
5. **Socket Mode conflict.** Only one process can consume Socket Mode for a bot token. If a Python bot or another dispatcher session is running with the same tokens, the new one gets 409'd. Kill the old one.

## Bot doesn't respond to a DM

1. **User not in allowlist.** Check `access.json` → `allowFrom`. DMs from users not on the list get pairing codes in `pairing` mode, or silent drops in `allowlist` mode, or nothing in `disabled` mode.
2. **Messages Tab disabled on Slack app.** Go to Slack API dashboard → App Home → verify Messages Tab is ON and "Allow users to send Slash commands and messages from the messages tab" is checked. Fully quit Slack (Cmd+Q) after changing — Slack caches the state.
3. **`message.im` not subscribed.** Check Event Subscriptions → Subscribe to bot events → must include `message.im`.

## Subagent replied once, then went silent on a follow-up

1. **Thread mapping lost.** If `threads.json` got edited or deleted, the follow-up won't resolve to the right subagent. Check the file.
2. **Subagent transcript missing.** If `~/.claude/projects/*/subagents/` got cleared, the subagent can't resume. The dispatcher should fall back to spawning a fresh subagent — if it doesn't, restart the dispatcher.
3. **Dispatcher crashed.** Check the terminal where the dispatcher is running. Long-running sessions can hit context limits or other issues. Restart.

## "1 MCP server failed" in /mcp

Start Claude Code with `--debug` and tail the debug log. Filter for `slack-channel`. Common causes:
- Missing tokens (`.env` file empty or in wrong location)
- Wrong `cwd` in MCP config (can't find the plugin directory)
- MCP server name collision (use `slack-channel`, not `slack`, to avoid the official Slack MCP)
- `bun install` failing (network, registry issues)

## Access control changes aren't taking effect

- `access.json` is re-read on every inbound message. Changes should apply within seconds.
- `.env` token changes require a dispatcher session restart.
- `routes.json` changes apply to *new* threads only. Existing threads keep their original routing.

## Bot posting in wrong threads

Check the subagent's prompt (in its transcript file under `~/.claude/projects/*/subagents/`). It should have the correct `thread_ts` baked in. If it's posting outside its thread, the subagent is ignoring instructions — add a firmer reminder to the threads skill's prompt template.

## Too many stale threads in threads.json

Run the `/slack-channel:threads` skill with `--cleanup` (or edit `threads.json` manually to remove entries with `last_activity_ms` older than ~30 days). Doesn't delete subagent transcripts — Claude Code manages those separately.

## Org policy blocks channels on startup

> `--dangerously-load-development-channels blocked by org policy`

Team/Enterprise plans have channels off by default. An admin must enable **Allow channel notifications** in claude.ai → Admin settings → Claude Code → Channels.

## Slack app credential expired / rotated

- Bot tokens (`xoxb-`) don't expire, but can be revoked if the app is uninstalled
- App-level tokens (`xapp-`) don't expire by default
- If either was rotated: update `~/.claude/channels/slack/.env` and restart the dispatcher
