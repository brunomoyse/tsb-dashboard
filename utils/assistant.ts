/*
 * WeChat assistant (tsb-agent) connection, as served by the
 * assistantConnection / assistantLogin GraphQL fields.
 */

export type AssistantState = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'UNAVAILABLE'

export type AssistantLoginStatus =
  | 'WAIT'
  | 'SCANNED'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'REFUSED_OTHER_ACCOUNT'
  | 'FAILED'
  | 'CANCELLED'

export interface AssistantConnection {
  enabled: boolean
  state: AssistantState
  account: string | null
  since: string | null
  expiredAt: string | null
  everConnected: boolean
  loginInProgress: boolean
}

export interface AssistantLogin {
  id: string
  status: AssistantLoginStatus
  qrContent: string
  expiresAt: string
}

/** A login that will not change any more. */
export const isLoginFinished = (status: AssistantLoginStatus): boolean =>
  status !== 'WAIT' && status !== 'SCANNED'

/*
 * The banner only warns about a session that ended by itself (expiry), not
 * about a deliberate disconnect, and never before the first connection. It
 * is hidden on the assistant page itself.
 */
export const showAssistantBanner = (c: AssistantConnection | null, path: string): boolean =>
  c !== null &&
  c.enabled &&
  c.everConnected &&
  c.state === 'EXPIRED' &&
  !path.includes('/assistant')

/*
 * The QR code holds a WeChat link. A link can also be copied and opened
 * inside WeChat, which is the only way on the phone that shows the code.
 */
export const isWeChatLink = (content: string): boolean => /^https?:\/\//iu.test(content)

/** I18n key of a connection state. */
export const stateKey = (c: AssistantConnection | null): string => {
  if (!c) return 'assistant.state.loading'
  if (!c.enabled) return 'assistant.state.notConfigured'
  return `assistant.state.${c.state.toLowerCase()}`
}
