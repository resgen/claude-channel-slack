---
name: threads
description: |
  Dispatch Slack channel events to per-thread subagents for isolated, persistent conversations.
  Use whenever a <channel source="slack"> event arrives. Each unique Slack thread_ts gets its
  own subagent that persists across Claude Code session restarts. This keeps unrelated
  conversations from polluting each other's context.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(mkdir *)
  - Bash(cat *)
  - Agent
  - SendMessage
---

# /slack-channel:threads — Per-thread subagent dispatcher

## What this skill does

When a Slack message arrives as a `<channel source="slack" ...>` event, route it to a dedicated subagent scoped to that Slack thread. This gives each Slack conversation its own isolated context window and persistent memory across Claude Code session restarts.

**Why this matters:** Without per-thread dispatch, every Slack message lands in the same shared context. Unrelated threads pollute each other, long threads push short ones out of view, and Claude can mix up which conversation it's in. With this skill, each thread is its own continuous conversation with its own subagent.

## State file

Thread-to-agent mappings live in `~/.claude/channels/slack/threads.json`:

```json
{
  "1718400000.000100": {
    "agent_id": "agent-a3f2c1",
    "channel_id": "C0ASQSQCGCB",
    "last_activity_ms": 1718500000000,
    "topic": "GA CCNS disaster recovery questions"
  }
}
```

The file survives Claude Code restarts. Subagent context is stored separately by Claude Code itself (in `~/.claude/projects/*/subagents/`), so resuming a subagent by ID restores its full conversation history.

## Key value: thread_ts

Every Slack conversation has a `thread_ts` that identifies it uniquely within a channel. In the inbound `<channel>` tag:

- **Channel top-level message**: `thread_ts = message_id` (the message that starts a thread)
- **Thread reply**: `thread_ts = original thread's message_id`
- **DM**: `thread_ts = message_id` (DMs are conceptually each its own "thread")

Always use the exact `thread_ts` attribute from the event as the lookup key. Don't normalize, don't slice — it's a timestamp string like `1718400000.000100`.

## Dispatch algorithm

When a `<channel source="slack" chat_id="..." message_id="..." thread_ts="..." user="..." ...>` event arrives:

### Step 1: Load thread state

Read `~/.claude/channels/slack/threads.json`. If the file doesn't exist, treat it as `{}`. Handle JSON parse errors by treating as `{}` and logging (don't crash — an empty mapping just means all threads are "new").

```
mkdir -p ~/.claude/channels/slack
```

### Step 2: Look up the thread

Check if `threads[thread_ts]` exists.

### Step 3a: New thread → spawn a subagent

If no entry exists for this `thread_ts`:

1. Use the `Agent` tool to spawn a subagent with:
   - **subagent_type**: `general-purpose`
   - **description**: `Slack thread <thread_ts short>` (e.g. `Slack thread 1718400000`)
   - **prompt**: The full subagent prompt template below (see "Subagent prompt template")

2. After the Agent tool returns, capture the `agentId` from the result. Claude Code exposes this when an agent is spawned.

3. Write the mapping to `threads.json`:

```json
{
  "<thread_ts>": {
    "agent_id": "<agentId>",
    "channel_id": "<chat_id from event>",
    "last_activity_ms": <now>,
    "topic": "<first ~60 chars of the user's message>"
  }
}
```

Use atomic write: write to `threads.json.tmp`, then rename to `threads.json`. Always Read the file first before Write to preserve other threads' entries.

### Step 3b: Existing thread → resume the subagent

If `threads[thread_ts]` exists:

1. Use the `SendMessage` tool:
   - **to**: `<agent_id from threads.json>`
   - **message**: The inbound event, formatted per the "Follow-up message template" below.

2. Update `last_activity_ms` in `threads.json` to the current timestamp.

Claude Code automatically resumes stopped subagents when they receive a SendMessage. The subagent picks up with its full prior context intact.

### Step 4: Do not reply as the main session

The subagent is responsible for calling the `reply` tool to respond to Slack. The main session's job is only to dispatch. Don't post to Slack from the main session — that would bypass the isolation and mix contexts.

## Subagent prompt template

When spawning a new subagent for a Slack thread, use this prompt (fill in the values from the event):

```
You are a dedicated Slack thread handler for the slack-channel plugin.

## Your scope

You handle exactly ONE Slack thread. Every message you'll receive in this session
comes from the same `thread_ts`. Keep your responses relevant to this thread only.

## Slack context

- **channel_id**: <chat_id>
- **thread_ts**: <thread_ts>
- **channel_type**: <"DM" if chat_id starts with "D", else "channel">
- **user**: <user> (Slack user ID)

## How to respond

Use the `reply` tool from the slack-channel MCP server to post messages back to
Slack. Always pass:
- `chat_id: "<chat_id>"`
- `thread_ts: "<thread_ts>"` (this keeps your response in the right thread)

For acknowledgments or progress signals on slow operations, use `react` or
`edit_message`. For uploading artifacts, use `reply` with the `files` array.

## First message

The user said (in Slack):

"<content from the <channel> event>"

Do the work they requested and reply via the `reply` tool. You have access to the
full project context — CLAUDE.md, any repo files, all MCP tools available to the
parent session. Any tool call you make is scoped to this thread's subagent session.

## Persistence

This subagent's state persists across parent Claude Code restarts. When the user
sends a follow-up in this same thread, you'll receive it and pick up where you
left off. Treat the thread as an ongoing conversation.

## Boundaries

- Don't respond to messages from other threads (you won't see them).
- Don't @mention other users unless explicitly asked.
- Don't post outside this thread.
- If the user asks you to do something that doesn't fit this thread's topic,
  ask them to start a new thread rather than switching context mid-conversation.
```

## Follow-up message template

When forwarding a follow-up to an existing subagent via SendMessage, format the message as:

```
New message in the same Slack thread:

Channel: <chat_id>
Thread: <thread_ts>
User: <user>
Timestamp: <ts>

Content:
"<content>"

Respond via the `reply` tool. Use chat_id and thread_ts above.
```

## Cleanup (run occasionally)

When invoked by the user with `--cleanup` or when the threads.json file exceeds
~100 entries, prune stale threads:

1. Read `threads.json`
2. Compute `cutoff = now - 30 * 24 * 60 * 60 * 1000` (30 days in ms)
3. Delete entries where `last_activity_ms < cutoff`
4. Write back

This doesn't delete the subagent's transcript (Claude Code manages that separately),
but it removes our mapping so the thread is treated as new if it ever reawakens.

## Edge cases

**Missing subagent**: If `SendMessage` fails with "agent not found" (e.g., someone
wiped `.claude/projects/`), fall back to the new-thread path: spawn a fresh
subagent, warn the user in Slack that the prior conversation history is lost, and
update `threads.json` with the new agent ID.

**Concurrent messages in the same thread**: Claude Code processes channel events
sequentially, so two messages arriving close together will dispatch one after the
other. No locking needed.

**Multiple threads from the same user**: Treat as independent. Each `thread_ts`
gets its own subagent even if it's the same user.

**DMs**: Each DM message is conceptually a thread. Use the message's own `ts` as
`thread_ts`. But in practice the Slack event's `thread_ts` attribute already
handles this.

**Events without thread_ts**: Shouldn't happen — the slack-channel plugin always
sets thread_ts on outbound notifications. If it does happen, use `message_id` as
the thread key.
