// useOrderingStatus: whether online ordering is open or paused ("en ligne" / "en pause"), shared by the mobile orders
// header and the Plus page: loaded on mount, toggled by staff, kept live by a subscription. The GraphQL transport and
// the subscription are the boundaries; the shared state (useState) is real.
// Run: `vp test run tests/composables/useOrderingStatus.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#imports'
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

const { useOrderingStatus } = await import('~/composables/useOrderingStatus')

const mountStatus = async () => {
  const mounted = mountComposable(() => useOrderingStatus())
  await settle()
  return mounted
}

beforeEach(() => {
  vi.resetAllMocks()
  subscription.calls.length = 0
  subscription.data = ref(undefined)
  clearNuxtState('pili-ordering-enabled') // the composable's own initial value (null) applies
  gqlFetch.mockResolvedValue({ restaurantConfig: { orderingEnabled: true } })
})

describe('loading', () => {
  it('stays null (neither open nor paused) until the first answer, so the UI does not flash "paused"', async () => {
    let answer: (value: unknown) => void = () => {}
    gqlFetch.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      }),
    )
    const { result } = mountComposable(() => useOrderingStatus())
    expect(result.enabled.value).toBeNull()

    answer({ restaurantConfig: { orderingEnabled: false } })
    await settle()
    expect(result.enabled.value).toBe(false)
  })

  it('loads the current setting when mounted', async () => {
    const { result } = await mountStatus()
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('orderingEnabled'))
    expect(result.enabled.value).toBe(true)
  })

  it('reload asks again', async () => {
    const { result } = await mountStatus()
    gqlFetch.mockResolvedValue({ restaurantConfig: { orderingEnabled: false } })
    await result.reload()
    expect(result.enabled.value).toBe(false)
  })

  it('keeps the previous value when the answer is empty', async () => {
    const { result } = await mountStatus()
    gqlFetch.mockResolvedValue(null)
    await result.reload()
    expect(result.enabled.value).toBe(true)
  })

  it('lets a failure reach the caller of reload', async () => {
    const { result } = await mountStatus()
    gqlFetch.mockRejectedValue(new Error('network'))
    await expect(result.reload()).rejects.toThrow('network')
    expect(result.enabled.value).toBe(true)
  })

  it('shares its state between users of the composable (header and Plus page)', async () => {
    await mountStatus()
    // A second user of the composable sees the loaded value at once, before its own request answers.
    gqlFetch.mockReturnValue(new Promise(() => {}))
    const second = mountComposable(() => useOrderingStatus()).result
    expect(second.enabled.value).toBe(true)
  })
})

describe('setEnabled', () => {
  it('sends the new value, then shows it', async () => {
    const { result } = await mountStatus()
    gqlFetch.mockResolvedValue({ updateOrderingEnabled: { orderingEnabled: false } })

    await result.setEnabled(false)

    expect(gqlFetch).toHaveBeenLastCalledWith(expect.stringContaining('updateOrderingEnabled'), {
      variables: { enabled: false },
    })
    expect(result.enabled.value).toBe(false)
    expect(result.updating.value).toBe(false)
  })

  it('is "updating" while the request is in flight', async () => {
    const { result } = await mountStatus()
    let answer: (value: unknown) => void = () => {}
    gqlFetch.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      }),
    )
    const pending = result.setEnabled(false)
    expect(result.updating.value).toBe(true)
    expect(result.enabled.value).toBe(true) // not optimistic: the shop is still open until the server agrees

    answer({})
    await pending
    expect(result.updating.value).toBe(false)
  })

  it('keeps the old value, stops updating and surfaces the error when the request fails', async () => {
    const { result } = await mountStatus()
    gqlFetch.mockRejectedValue(new Error('forbidden'))
    await expect(result.setEnabled(false)).rejects.toThrow('forbidden')
    expect(result.enabled.value).toBe(true)
    expect(result.updating.value).toBe(false)
  })
})

describe('live updates', () => {
  it('subscribes to config changes', async () => {
    await mountStatus()
    expect(subscription.calls).toHaveLength(1)
    expect(subscription.calls[0]![0]).toEqual(expect.stringContaining('restaurantConfigUpdated'))
  })

  it("follows another device's change", async () => {
    const { result } = await mountStatus()
    subscription.data!.value = { restaurantConfigUpdated: { orderingEnabled: false } }
    await nextTick()
    expect(result.enabled.value).toBe(false)
  })

  it('ignores a payload without the config', async () => {
    const { result } = await mountStatus()
    subscription.data!.value = {}
    await nextTick()
    expect(result.enabled.value).toBe(true)
  })
})
