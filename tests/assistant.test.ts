import { describe, expect, it } from 'vitest'
import {
  type AssistantConnection,
  isLoginFinished,
  isWeChatLink,
  showAssistantBanner,
  stateKey,
} from '~/utils/assistant'

const conn = (over: Partial<AssistantConnection> = {}): AssistantConnection => ({
  enabled: true,
  state: 'CONNECTED',
  account: 'o@im.wechat',
  since: null,
  expiredAt: null,
  everConnected: true,
  loginInProgress: false,
  ...over,
})

describe('assistant banner', () => {
  it('warns when a connected session expired', () => {
    expect(showAssistantBanner(conn({ state: 'EXPIRED' }), '/zh/orders')).toBe(true)
  })

  it('stays quiet otherwise', () => {
    expect(showAssistantBanner(null, '/zh/orders')).toBe(false)
    expect(showAssistantBanner(conn(), '/zh/orders')).toBe(false)
    // A deliberate disconnect is not an incident.
    expect(showAssistantBanner(conn({ state: 'DISCONNECTED' }), '/zh/orders')).toBe(false)
    // Never connected yet: nothing to warn about.
    expect(
      showAssistantBanner(conn({ state: 'EXPIRED', everConnected: false }), '/zh/orders'),
    ).toBe(false)
    expect(showAssistantBanner(conn({ state: 'EXPIRED', enabled: false }), '/zh/orders')).toBe(
      false,
    )
    // The assistant page shows the state itself.
    expect(showAssistantBanner(conn({ state: 'EXPIRED' }), '/zh/assistant')).toBe(false)
  })
})

describe('assistant login', () => {
  it('knows which statuses are final', () => {
    expect(isLoginFinished('WAIT')).toBe(false)
    expect(isLoginFinished('SCANNED')).toBe(false)
    for (const s of [
      'CONFIRMED',
      'EXPIRED',
      'REFUSED_OTHER_ACCOUNT',
      'FAILED',
      'CANCELLED',
    ] as const) {
      expect(isLoginFinished(s)).toBe(true)
    }
  })

  it('offers the link only when the QR code holds one', () => {
    expect(isWeChatLink('https://liteapp.weixin.qq.com/q/x?qrcode=a&bot_type=3')).toBe(true)
    expect(isWeChatLink('iVBORw0KGgo')).toBe(false)
  })

  it('maps states to i18n keys', () => {
    expect(stateKey(null)).toBe('assistant.state.loading')
    expect(stateKey(conn({ enabled: false }))).toBe('assistant.state.notConfigured')
    expect(stateKey(conn({ state: 'UNAVAILABLE' }))).toBe('assistant.state.unavailable')
  })
})
