/*
 * Telegram assistant (tsb-agent) connection, as served by the
 * assistantConnection / assistantLink GraphQL fields.
 */

export type AssistantState = 'READY' | 'NO_ACCOUNTS' | 'TOKEN_REJECTED' | 'CONFLICT' | 'UNAVAILABLE'

export type AssistantLinkStatus = 'WAIT' | 'LINKED' | 'EXPIRED' | 'REFUSED_FULL'

export interface AssistantAccount {
  id: string
  name: string
  username: string | null
  linkedAt: string
}

export interface AssistantConnection {
  enabled: boolean
  state: AssistantState
  botUsername: string | null
  accounts: AssistantAccount[]
  maxAccounts: number
  problemSince: string | null
}

export interface AssistantLink {
  id: string
  status: AssistantLinkStatus
  url: string
  expiresAt: string
  account: AssistantAccount | null
}

/** A link that will not change any more. */
export const isLinkFinished = (status: AssistantLinkStatus): boolean => status !== 'WAIT'

/*
 * The banner only warns when Telegram refuses the bot token: nothing works
 * until the developer fixes it. It is hidden on the assistant page itself,
 * which shows the state.
 */
export const showAssistantBanner = (c: AssistantConnection | null, path: string): boolean =>
  c !== null && c.enabled && c.state === 'TOKEN_REJECTED' && !path.includes('/assistant')

/** A new account can be linked: a free place, and a bot that answers. */
export const canLinkAccount = (c: AssistantConnection): boolean =>
  c.enabled &&
  c.accounts.length < c.maxAccounts &&
  c.state !== 'UNAVAILABLE' &&
  c.state !== 'TOKEN_REJECTED'

/** Public t.me page of the bot, or null when its username is unknown. */
export const botUrl = (c: AssistantConnection): string | null =>
  c.botUsername !== null && c.botUsername !== '' ? `https://t.me/${c.botUsername}` : null

const STATE_KEYS: Record<AssistantState, string> = {
  READY: 'ready',
  NO_ACCOUNTS: 'noAccounts',
  TOKEN_REJECTED: 'tokenRejected',
  CONFLICT: 'conflict',
  UNAVAILABLE: 'unavailable',
}

/** I18n key of a connection state. */
export const stateKey = (c: AssistantConnection | null): string => {
  if (!c) return 'assistant.state.loading'
  if (!c.enabled) return 'assistant.state.notConfigured'
  return `assistant.state.${STATE_KEYS[c.state] ?? 'unavailable'}`
}

const ERROR_KEYS: Partial<Record<string, string>> = {
  ASSISTANT_DISABLED: 'assistant.errors.disabled',
  ASSISTANT_UNAVAILABLE: 'assistant.errors.unavailable',
  ASSISTANT_LIMIT_REACHED: 'assistant.errors.limitReached',
  NOT_FOUND: 'assistant.errors.notFound',
}

/** I18n key of the first known GraphQL error code, else `fallback`. */
export const errorKey = (codes: string[], fallback: string): string => {
  for (const code of codes) {
    const key = ERROR_KEYS[code]
    if (key !== undefined) return key
  }
  return fallback
}
