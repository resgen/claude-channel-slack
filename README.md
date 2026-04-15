# Slack Channel Plugin for Claude Code

A Claude Code plugin that bridges your Slack workspace into a running Claude Code session. Once installed, Claude receives DMs and @mentions directly as channel messages — you can ask Claude questions, share files, and approve tool permissions without leaving Slack. Access is fully gated: DM pairing with code exchange, explicit allowlists, and per-channel opt-in policies keep the bot from responding to anyone you haven't authorized.

---

## Prerequisites

- [Bun](https://bun.sh) (runtime)
- Claude Code v2.1.80 or later
- A Slack workspace where you can create apps

---

## Slack App Setup

### 1. Create the app

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click **Create New App → From scratch**.
2. Give it a name (e.g. "Claude") and pick your workspace.

### 2. Enable Socket Mode

1. In the sidebar go to **Settings → Socket Mode** and toggle it **On**.
2. When prompted, create an **App-Level Token**:
   - Name it anything (e.g. "socket-token")
   - Add the scope `connections:write`
   - Click **Generate** and copy the token — it starts with `xapp-`

### 3. Subscribe to events

1. Go to **Features → Event Subscriptions** and toggle **Enable Events** on.
2. Under **Subscribe to bot events** add:
   - `app_mention`
   - `message.im`
   - `message.channels`

### 4. Set bot token scopes

Go to **Features → OAuth & Permissions → Scopes → Bot Token Scopes** and add:

| Scope | Purpose |
|---|---|
| `app_mentions:read` | Receive @mentions |
| `channels:history` | Read channel messages |
| `channels:read` | Look up channel info |
| `chat:write` | Post messages |
| `files:read` | Download shared files |
| `files:write` | Upload file attachments |
| `groups:history` | Read private channel messages |
| `im:history` | Read DM messages |
| `im:read` | Look up DM info |
| `im:write` | Open DMs to users |
| `reactions:write` | Add emoji reactions |
| `users:read` | Resolve user names |

### 5. Install to workspace

1. Go to **OAuth & Permissions → Install to Workspace**.
2. Authorize the requested permissions.
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`).
4. You already have the App-Level Token from step 2 (starts with `xapp-`).

---

## Plugin Installation

### Development (clone and load locally)

```bash
git clone https://github.com/your-org/claude-channel-slack
```

Add the plugin to your `.mcp.json` (project-level or user-level):

```json
{
  "mcpServers": {
    "slack": {
      "command": "bun",
      "args": ["run", "--cwd", "/path/to/claude-channel-slack", "--shell=bun", "--silent", "start"]
    }
  }
}
```

Start Claude Code with the plugin loaded:

```bash
claude --dangerously-load-development-channels server:slack
```

### Configure tokens

Once Claude Code is running, save your Slack tokens:

```
/slack:configure <xoxb-bot-token> <xapp-app-token>
```

Tokens are written to `~/.claude/channels/slack/.env` with permissions `600`. The server reads this file at startup — restart Claude Code after saving tokens for the first time.

---

## Quick Start

### Pair your Slack account

1. Open a DM with your bot in Slack and send any message.
2. The bot replies with a pairing command — copy it.
3. Run it in Claude Code:
   ```
   /slack:access pair <code>
   ```
4. Lock down DM access to approved users only:
   ```
   /slack:access policy allowlist
   ```

### Enable a channel

To let Claude respond to @mentions in a channel:

```
/slack:access channel add <channel-id>
```

Find the channel ID by right-clicking the channel name in Slack → **Copy link** — the ID is the `C...` segment at the end.

---

## Tool Reference

These MCP tools are available to Claude once the plugin is running:

| Tool | Description |
|---|---|
| `reply` | Post a message to a channel or thread |
| `react` | Add an emoji reaction to a message |
| `edit_message` | Edit a message the bot previously sent |
| `download_attachment` | Download a Slack file to the local inbox |
| `fetch_messages` | Pull channel or thread history |

---

## Note on Channel Support

Channel support (responding to @mentions in public/private channels, not just DMs) is currently in **research preview** and requires signing in at [claude.ai](https://claude.ai) to use `--dangerously-load-development-channels`.

---

## License

Apache-2.0 — see [LICENSE](LICENSE).
