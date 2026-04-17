# Slack Channel Orchestrator Template

This template is the starting point for a **dispatcher session** of the [slack-channel plugin](https://github.com/retrodigio/claude-channel-slack). It gives Claude a consistent, role-aware starting context whenever you launch a dispatcher.

## What this is

When you run the plugin as a channel (`claude --dangerously-load-development-channels server:slack-channel`), Claude Code's session becomes the dispatcher. It receives all Slack events and routes channel messages to per-thread subagents. DMs land directly in the dispatcher session.

Without a dedicated orchestrator context, the dispatcher has no project memory, no role instructions, and has to re-derive its behavior from the plugin's system-prompt string each session. With this template, you get:

- A CLAUDE.md that defines the orchestrator's role (dispatcher + DM handler + system steward)
- Runbooks for common operational tasks (onboarding projects, troubleshooting, health checks)
- Reference docs for your specific deployment (which projects, which channels, conventions)
- A stable home directory for orchestrator-specific memory and learnings

## How to use

1. Copy this `templates/orchestrator/` directory to your preferred location, outside this plugin repo:

```bash
cp -r templates/orchestrator ~/Development/repositories/personal/claude-slack-orchestrator
cd ~/Development/repositories/personal/claude-slack-orchestrator
git init
```

2. Customize:
   - In `CLAUDE.md`, replace `<BOT_NAME>` with your Slack bot's display name
   - Fill in `reference/projects.md` with your routed projects
   - Fill in `reference/slack-workspace.md` with your workspace conventions
   - Add any other runbooks specific to your setup

3. Commit and (optionally) push to your own GitHub:
```bash
git add .
git commit -m "initial orchestrator setup"
```

4. Run the dispatcher from this directory:
```bash
cd ~/Development/repositories/personal/claude-slack-orchestrator
claude --dangerously-load-development-channels server:slack-channel
```

Claude auto-loads `CLAUDE.md` from its cwd, so your orchestrator role is in effect from session start.

## File layout

```
claude-slack-orchestrator/
├── CLAUDE.md                 # orchestrator role + behavior rules
├── README.md                 # this file (how to use the template)
├── runbooks/
│   ├── new-project-onboarding.md
│   ├── troubleshooting.md
│   └── health-checks.md
└── reference/
    ├── projects.md           # which projects you're routing (fill in)
    └── slack-workspace.md    # workspace conventions (fill in)
```

## Staying synced with template updates

When the plugin repo's template gets improvements, you can cherry-pick them into your customized version. Diff against the upstream template:

```bash
diff -r ~/Development/repositories/personal/claude-slack-orchestrator \
       /path/to/claude-channel-slack/templates/orchestrator
```

Apply whatever changes you want. Your customized files always win.

## Alternative: run without an orchestrator

You can still run `claude --dangerously-load-development-channels server:slack-channel` from any directory without this template. The plugin's system-prompt instructions will guide Claude to dispatch correctly. But you lose the persistent role, DM personality, runbooks, and project awareness. For anything beyond a one-off demo, the orchestrator folder is the right investment.
