/**
 * Pure access-policy helpers for the Slack channel plugin.
 *
 * Extracted from server.ts so the policy decisions can be unit-tested
 * without spinning up the Slack/MCP runtime. server.ts imports these.
 */

export type ChannelPolicy = {
  requireMention: boolean
  allowFrom: string[]
}

/**
 * Decide whether a channel message passes the channel-level access policy.
 *
 * Two senders are distinguished:
 *
 *   - Humans (Slack user ids, "U…") are default-allow. An empty `allowFrom`
 *     permits any sender; a populated `allowFrom` restricts to listed ids.
 *
 *   - Bots (Slack bot ids, "B…") are default-deny. The bot's id must be
 *     explicitly listed in `allowFrom` for delivery. Empty `allowFrom`
 *     blocks all bots, populated `allowFrom` blocks any bot whose id is
 *     not on the list.
 *
 * Both senders still respect `requireMention`.
 */
export function decideChannelPolicy(
  policy: ChannelPolicy | undefined,
  senderId: string,
  isMention: boolean,
  isBot: boolean,
): 'deliver' | 'drop' {
  if (!policy) return 'drop'
  const allowFrom = policy.allowFrom ?? []
  if (isBot) {
    if (!allowFrom.includes(senderId)) return 'drop'
  } else if (allowFrom.length > 0 && !allowFrom.includes(senderId)) {
    return 'drop'
  }
  if (policy.requireMention && !isMention) return 'drop'
  return 'deliver'
}

/**
 * Bots may only reach the bot through opted-in channels. Bot DMs are
 * unconditionally dropped; the access skill cannot opt a bot into DMs.
 */
export function isBotDMBlocked(channelType: 'im' | 'channel', isBot: boolean): boolean {
  return isBot && channelType === 'im'
}
