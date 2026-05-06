import { describe, expect, test } from 'bun:test'
import { decideChannelPolicy, isBotDMBlocked, type ChannelPolicy } from './gate.ts'

const HUMAN = 'U012ABCDE'
const BOT = 'B0123ABCD'
const OTHER_USER = 'U999ZZZZZ'
const OTHER_BOT = 'B999ZZZZZ'

const policy = (over: Partial<ChannelPolicy> = {}): ChannelPolicy => ({
  requireMention: false,
  allowFrom: [],
  ...over,
})

describe('decideChannelPolicy — humans (default-allow)', () => {
  test('drops when channel has no policy at all', () => {
    expect(decideChannelPolicy(undefined, HUMAN, true, false)).toBe('drop')
  })

  test('delivers with empty allowFrom (default-allow humans)', () => {
    expect(decideChannelPolicy(policy(), HUMAN, true, false)).toBe('deliver')
  })

  test('delivers when human is on populated allowFrom', () => {
    expect(decideChannelPolicy(policy({ allowFrom: [HUMAN] }), HUMAN, true, false)).toBe('deliver')
  })

  test('drops human not on a populated allowFrom', () => {
    expect(decideChannelPolicy(policy({ allowFrom: [OTHER_USER] }), HUMAN, true, false)).toBe('drop')
  })

  test('drops when requireMention=true and isMention=false (even if listed)', () => {
    expect(decideChannelPolicy(policy({ requireMention: true, allowFrom: [HUMAN] }), HUMAN, false, false)).toBe('drop')
  })

  test('delivers when requireMention=true and isMention=true', () => {
    expect(decideChannelPolicy(policy({ requireMention: true }), HUMAN, true, false)).toBe('deliver')
  })
})

describe('decideChannelPolicy — bots (default-deny)', () => {
  test('drops bot when channel has no policy', () => {
    expect(decideChannelPolicy(undefined, BOT, false, true)).toBe('drop')
  })

  test('drops bot with empty allowFrom (this is the headline behavior change)', () => {
    expect(decideChannelPolicy(policy(), BOT, false, true)).toBe('drop')
  })

  test('drops bot whose id is not on a populated allowFrom', () => {
    expect(decideChannelPolicy(policy({ allowFrom: [HUMAN, OTHER_BOT] }), BOT, false, true)).toBe('drop')
  })

  test('delivers bot when its id is explicitly listed in allowFrom', () => {
    expect(decideChannelPolicy(policy({ allowFrom: [BOT] }), BOT, false, true)).toBe('deliver')
  })

  test('delivers bot listed alongside humans in allowFrom', () => {
    expect(decideChannelPolicy(policy({ allowFrom: [HUMAN, BOT] }), BOT, false, true)).toBe('deliver')
  })

  test('drops listed bot when requireMention=true and isMention=false', () => {
    expect(decideChannelPolicy(policy({ requireMention: true, allowFrom: [BOT] }), BOT, false, true)).toBe('drop')
  })

  test('delivers listed bot when requireMention=true and isMention=true', () => {
    expect(decideChannelPolicy(policy({ requireMention: true, allowFrom: [BOT] }), BOT, true, true)).toBe('deliver')
  })

  test('a populated allowFrom containing only humans does not implicitly admit any bot', () => {
    expect(decideChannelPolicy(policy({ allowFrom: [HUMAN] }), BOT, false, true)).toBe('drop')
  })

  test('drops humans not on a populated allowFrom even when the list contains only bot ids', () => {
    // A populated allowFrom narrows humans to its listed ids — regardless of
    // whether those ids are users or bots. Consequence: if you opt a bot in
    // via allowFrom, you must also list every human you want to keep able to
    // trigger Claude in that channel. (Same rule as upstream's pre-patch
    // human allowlist; surfaced here because the bot path makes it new.)
    expect(decideChannelPolicy(policy({ allowFrom: [BOT] }), HUMAN, true, false)).toBe('drop')
  })
})

describe('isBotDMBlocked', () => {
  test('blocks bot DMs', () => {
    expect(isBotDMBlocked('im', true)).toBe(true)
  })

  test('does not block bot channel posts', () => {
    expect(isBotDMBlocked('channel', true)).toBe(false)
  })

  test('does not block human DMs', () => {
    expect(isBotDMBlocked('im', false)).toBe(false)
  })

  test('does not block human channel posts', () => {
    expect(isBotDMBlocked('channel', false)).toBe(false)
  })
})
