import { describe, expect, it } from 'vite-plus/test'
import {
  type AssistantConnection,
  botUrl,
  canLinkAccount,
  errorKey,
  isLinkFinished,
  showAssistantBanner,
  stateKey,
} from '~/utils/assistant'

const account = (id: string) => ({
  id,
  name: `User ${id}`,
  username: null,
  linkedAt: '2026-10-04T10:00:00Z',
})

const conn = (over: Partial<AssistantConnection> = {}): AssistantConnection => ({
  enabled: true,
  state: 'READY',
  botUsername: 'pili_assistant_bot',
  accounts: [account('1')],
  maxAccounts: 3,
  problemSince: null,
  ...over,
})

describe('assistant banner', () => {
  it('warns when Telegram refuses the bot token', () => {
    expect(showAssistantBanner(conn({ state: 'TOKEN_REJECTED' }), '/zh/orders')).toBe(true)
  })

  it('stays quiet otherwise', () => {
    expect(showAssistantBanner(null, '/zh/orders')).toBe(false)
    expect(showAssistantBanner(conn(), '/zh/orders')).toBe(false)
    expect(showAssistantBanner(conn({ state: 'NO_ACCOUNTS' }), '/zh/orders')).toBe(false)
    expect(showAssistantBanner(conn({ state: 'CONFLICT' }), '/zh/orders')).toBe(false)
    expect(showAssistantBanner(conn({ state: 'UNAVAILABLE' }), '/zh/orders')).toBe(false)
    expect(
      showAssistantBanner(conn({ state: 'TOKEN_REJECTED', enabled: false }), '/zh/orders'),
    ).toBe(false)
    // The assistant page shows the state itself.
    expect(showAssistantBanner(conn({ state: 'TOKEN_REJECTED' }), '/zh/assistant')).toBe(false)
  })
})

describe('assistant link', () => {
  it('knows which statuses are final', () => {
    expect(isLinkFinished('WAIT')).toBe(false)
    for (const s of ['LINKED', 'EXPIRED', 'REFUSED_FULL'] as const) {
      expect(isLinkFinished(s)).toBe(true)
    }
  })

  it('allows a new account only with a free place and a bot that answers', () => {
    expect(canLinkAccount(conn())).toBe(true)
    expect(canLinkAccount(conn({ state: 'NO_ACCOUNTS', accounts: [] }))).toBe(true)
    expect(canLinkAccount(conn({ state: 'CONFLICT' }))).toBe(true)
    expect(canLinkAccount(conn({ accounts: [account('1'), account('2'), account('3')] }))).toBe(
      false,
    )
    expect(canLinkAccount(conn({ state: 'UNAVAILABLE' }))).toBe(false)
    expect(canLinkAccount(conn({ state: 'TOKEN_REJECTED' }))).toBe(false)
    expect(canLinkAccount(conn({ enabled: false }))).toBe(false)
  })

  it('builds the bot page only when the username is known', () => {
    expect(botUrl(conn())).toBe('https://t.me/pili_assistant_bot')
    expect(botUrl(conn({ botUsername: null }))).toBeNull()
  })
})

describe('assistant i18n keys', () => {
  it('maps states to i18n keys', () => {
    expect(stateKey(null)).toBe('assistant.state.loading')
    expect(stateKey(conn({ enabled: false }))).toBe('assistant.state.notConfigured')
    expect(stateKey(conn())).toBe('assistant.state.ready')
    expect(stateKey(conn({ state: 'NO_ACCOUNTS' }))).toBe('assistant.state.noAccounts')
    expect(stateKey(conn({ state: 'TOKEN_REJECTED' }))).toBe('assistant.state.tokenRejected')
    expect(stateKey(conn({ state: 'CONFLICT' }))).toBe('assistant.state.conflict')
    expect(stateKey(conn({ state: 'UNAVAILABLE' }))).toBe('assistant.state.unavailable')
    // A state this dashboard does not know yet (newer backend) reads as unavailable.
    expect(stateKey(conn({ state: 'NEW' as never }))).toBe('assistant.state.unavailable')
  })

  it('maps API error codes, with a fallback', () => {
    expect(errorKey(['ASSISTANT_LIMIT_REACHED'], 'x')).toBe('assistant.errors.limitReached')
    expect(errorKey(['OTHER', 'ASSISTANT_UNAVAILABLE'], 'x')).toBe('assistant.errors.unavailable')
    expect(errorKey(['ASSISTANT_DISABLED'], 'x')).toBe('assistant.errors.disabled')
    expect(errorKey(['NOT_FOUND'], 'x')).toBe('assistant.errors.notFound')
    expect(errorKey(['OTHER'], 'x')).toBe('x')
    expect(errorKey([], 'x')).toBe('x')
  })
})
