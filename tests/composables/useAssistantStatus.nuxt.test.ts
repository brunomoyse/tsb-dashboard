// useAssistantStatus: the WeChat assistant's connection, shared by the layout banner and the assistant page: loaded on
// mount, kept live by a subscription. The GraphQL transport and the subscription are the boundaries; the shared state
// (useState) is real.
// Run: `vp test run tests/composables/useAssistantStatus.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#imports'
import type { AssistantConnection } from '~/utils/assistant'
import { mountComposable } from '../helpers/mountComposable'
import { settle } from '../helpers/settle'

const gqlFetch = vi.hoisted(() => vi.fn())
const subscription = vi.hoisted(() => ({
  data: null as null | { value: unknown },
  calls: [] as unknown[][],
}))

mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
mockNuxtImport('useGqlSubscription', () => (...args: unknown[]) => {
  subscription.calls.push(args)
  return { data: subscription.data }
})

const { useAssistantStatus } = await import('~/composables/useAssistantStatus')

const connection = (overrides: Partial<AssistantConnection> = {}): AssistantConnection => ({
  enabled: true,
  state: 'CONNECTED',
  account: 'o@im.wechat',
  since: '2026-10-04T10:00:00Z',
  expiredAt: null,
  everConnected: true,
  loginInProgress: false,
  ...overrides,
})

const mountStatus = async () => {
  const mounted = mountComposable(() => useAssistantStatus())
  await settle()
  return mounted
}

beforeEach(() => {
  vi.resetAllMocks()
  subscription.calls.length = 0
  subscription.data = ref<unknown>(undefined)
  clearNuxtState('pili-assistant-connection') // the composable's own initial value (null) applies
  gqlFetch.mockResolvedValue({ assistantConnection: connection() })
})

describe('loading', () => {
  it('stays null until the first answer', () => {
    gqlFetch.mockReturnValue(new Promise(() => {}))
    const { result } = mountComposable(() => useAssistantStatus())
    expect(result.connection.value).toBeNull()
  })

  it('loads the connection when mounted, asking for every field the banner and the page use', async () => {
    const { result } = await mountStatus()
    expect(result.connection.value).toEqual(connection())
    const [query] = gqlFetch.mock.calls[0]!
    for (const field of [
      'enabled',
      'state',
      'account',
      'since',
      'expiredAt',
      'everConnected',
      'loginInProgress',
    ]) {
      expect(query).toMatch(new RegExp(`\\b${field}\\b`, 'u'))
    }
  })

  it('reload asks again', async () => {
    const { result } = await mountStatus()
    gqlFetch.mockResolvedValue({ assistantConnection: connection({ state: 'EXPIRED' }) })
    await result.reload()
    expect(result.connection.value?.state).toBe('EXPIRED')
  })

  it('keeps the previous connection when the answer is empty', async () => {
    const { result } = await mountStatus()
    gqlFetch.mockResolvedValue(null)
    await result.reload()
    expect(result.connection.value).toEqual(connection())
  })

  it('shows no banner and no error when the query fails (not an admin, or the API is down)', async () => {
    gqlFetch.mockRejectedValue(new Error('forbidden'))
    const { result } = await mountStatus()
    await expect(result.reload()).resolves.toBeUndefined()
    expect(result.connection.value).toBeNull()
  })

  it('shares the connection between the layout and the page', async () => {
    await mountStatus()
    // A second user of the composable sees the loaded connection at once, before its own request answers.
    gqlFetch.mockReturnValue(new Promise(() => {}))
    const second = mountComposable(() => useAssistantStatus()).result
    expect(second.connection.value).toEqual(connection())
  })
})

describe('live updates', () => {
  it('subscribes to connection changes', async () => {
    await mountStatus()
    expect(subscription.calls).toHaveLength(1)
    expect(subscription.calls[0]![0]).toEqual(expect.stringContaining('assistantConnectionUpdated'))
  })

  it('shows the new state as soon as the server pushes it (e.g. the session expired)', async () => {
    const { result } = await mountStatus()
    const expired = connection({ state: 'EXPIRED', expiredAt: '2026-10-04T11:00:00Z' })
    subscription.data!.value = { assistantConnectionUpdated: expired }
    await nextTick()
    expect(result.connection.value).toEqual(expired)
  })

  it('ignores a payload without the connection', async () => {
    const { result } = await mountStatus()
    subscription.data!.value = {}
    await nextTick()
    expect(result.connection.value).toEqual(connection())
  })
})
