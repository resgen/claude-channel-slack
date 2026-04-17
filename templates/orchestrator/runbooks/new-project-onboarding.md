# Runbook: Onboarding a new project to the orchestrator

When you want to add a new repo (and its Slack channel) into the orchestrator's routing, follow this checklist. This is something you can walk the user through over DM, or execute yourself with their confirmation at each step.

## Prerequisites

- The project has its own Slack channel (exists, bot can be invited)
- The project has a local repo on this machine
- The repo has a CLAUDE.md at its root (or we're about to add one)

## Steps

### 1. Capture the channel ID

In Slack, right-click the channel → **View channel details** → scroll to the bottom for "Channel ID" (looks like `C...`).

### 2. Capture the repo path

The absolute filesystem path to the project's root directory (where its CLAUDE.md lives). Example: `/Users/you/projects/new-project`.

### 3. Pick a label

A short human-readable name for the project. Used in subagent descriptions and in logs. Example: `"New Project"` or `"Platform Docs"`.

### 4. Add to routes.json

Read `~/.claude/channels/slack/routes.json`, add a new entry, write back atomically:

```json
{
  "<existing entries>": "...",
  "<new-channel-id>": {
    "repo_path": "<absolute-path>",
    "label": "<project-label>"
  }
}
```

Always Read before Write to preserve other entries.

### 5. Opt the channel into access control

The user runs at their terminal:
```
/slack-channel:access channel add <new-channel-id>
```

(This is an access mutation — the orchestrator can't do this from DM. Tell the user to run it themselves.)

### 6. Invite the bot to the Slack channel

The user (or anyone with invite privileges) runs in Slack:
```
/invite @<YourBotName>
```

in the new channel.

### 7. Smoke test

The user @mentions the bot in the new channel with a trivial request (e.g. "ping" or "what's in your CLAUDE.md?"). Watch:

- Dispatcher receives the `<channel>` event
- Invokes `/slack-channel:threads`, which looks up the channel in `routes.json`
- Spawns a subagent with the new repo as context
- Subagent reads `<repo>/CLAUDE.md` and responds in-thread

If the subagent responds with content that clearly came from the new repo's CLAUDE.md, onboarding is successful.

### 8. Update reference/projects.md

Add a short entry to the orchestrator's `reference/projects.md` so the human-readable overview stays in sync with `routes.json`.

## If something goes wrong

- **No response from bot**: check `/mcp` for `slack-channel · ✓ connected`, check `access.json` has the channel, check `routes.json` syntax.
- **Subagent loads wrong CLAUDE.md**: verify `repo_path` in `routes.json` is absolute and points to the repo root.
- **Bot not in channel**: confirm step 6 completed.
