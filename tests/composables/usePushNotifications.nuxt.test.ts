// usePushNotifications: registers the Android device for push (FCM) once the staff member allows it, tells the backend
// the token, and routes a tapped notification to the orders board. Capacitor's push plugin, the GraphQL transport and the
// router are the boundaries.
// Run: `vp test run tests/composables/usePushNotifications.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useNuxtApp } from '#imports'

type Listener = (payload: unknown) => unknown

const platform = vi.hoisted(() => ({ isCapacitor: true }))
const push = vi.hoisted(() => ({
  checkPermissions: vi.fn<() => Promise<{ receive: string }>>(),
  requestPermissions: vi.fn<() => Promise<{ receive: string }>>(),
  addListener: vi.fn<(event: string, listener: Listener) => Promise<void>>(),
  register: vi.fn<() => Promise<void>>(),
  removeAllListeners: vi.fn<() => Promise<void>>(),
}))
const gqlFetch = vi.hoisted(() => vi.fn())
const listeners = vi.hoisted(() => ({}) as Record<string, Listener>)

vi.mock('~/composables/usePlatform', () => ({ usePlatform: () => platform }))
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: push }))
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})

const { usePushNotifications } = await import('~/composables/usePushNotifications')

const TOKEN_KEY = 'push_device_token'
let routerPush: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  for (const key of Object.keys(listeners)) delete listeners[key]
  platform.isCapacitor = true
  routerPush = vi.spyOn(useNuxtApp().$router, 'push').mockResolvedValue(undefined)
  push.checkPermissions.mockResolvedValue({ receive: 'granted' })
  push.requestPermissions.mockResolvedValue({ receive: 'granted' })
  push.addListener.mockImplementation((event, listener) => {
    listeners[event] = listener
    return Promise.resolve()
  })
  push.register.mockResolvedValue()
  push.removeAllListeners.mockResolvedValue()
  gqlFetch.mockResolvedValue({})
})

describe('register', () => {
  it('does nothing in a browser', async () => {
    platform.isCapacitor = false
    await usePushNotifications().register()
    expect(push.checkPermissions).not.toHaveBeenCalled()
    expect(push.register).not.toHaveBeenCalled()
  })

  it('registers with FCM, after the listeners are in place, when permission is already granted', async () => {
    await usePushNotifications().register()
    expect(push.requestPermissions).not.toHaveBeenCalled()
    expect(push.addListener.mock.calls.map(([event]) => event)).toEqual([
      'registration',
      'registrationError',
      'pushNotificationActionPerformed',
    ])
    expect(push.register).toHaveBeenCalledOnce()
    expect(push.register.mock.invocationCallOrder[0]).toBeGreaterThan(
      push.addListener.mock.invocationCallOrder.at(-1)!,
    )
  })

  it('does not register, nor ask again, when the staff member denied permission', async () => {
    push.checkPermissions.mockResolvedValue({ receive: 'denied' })
    await usePushNotifications().register()
    expect(push.requestPermissions).not.toHaveBeenCalled()
    expect(push.addListener).not.toHaveBeenCalled()
    expect(push.register).not.toHaveBeenCalled()
  })

  it('asks for permission when it was not decided yet, and registers if it is granted', async () => {
    push.checkPermissions.mockResolvedValue({ receive: 'prompt' })
    await usePushNotifications().register()
    expect(push.requestPermissions).toHaveBeenCalledOnce()
    expect(push.register).toHaveBeenCalledOnce()
  })

  it('does not register when the prompt is refused', async () => {
    push.checkPermissions.mockResolvedValue({ receive: 'prompt' })
    push.requestPermissions.mockResolvedValue({ receive: 'denied' })
    await usePushNotifications().register()
    expect(push.addListener).not.toHaveBeenCalled()
    expect(push.register).not.toHaveBeenCalled()
  })

  describe('when FCM hands out a token', () => {
    const tokenArrives = async (value: string) => {
      await usePushNotifications().register()
      await listeners.registration!({ value })
    }

    it('tells the backend and remembers it', async () => {
      await tokenArrives('fcm-1')
      expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('registerDeviceToken'),
        {
          variables: { deviceToken: 'fcm-1', platform: 'android' },
        },
      )
      expect(localStorage.getItem(TOKEN_KEY)).toBe('fcm-1')
    })

    it('does not tell the backend again about a token it already registered', async () => {
      localStorage.setItem(TOKEN_KEY, 'fcm-1')
      await tokenArrives('fcm-1')
      expect(gqlFetch).not.toHaveBeenCalled()
    })

    it('registers a rotated token and replaces the remembered one', async () => {
      localStorage.setItem(TOKEN_KEY, 'fcm-old')
      await tokenArrives('fcm-2')
      expect(gqlFetch).toHaveBeenCalledOnce()
      expect(localStorage.getItem(TOKEN_KEY)).toBe('fcm-2')
    })

    it('does not remember a token the backend did not accept, so the next start retries', async () => {
      gqlFetch.mockRejectedValue(new Error('network'))
      await expect(tokenArrives('fcm-1')).resolves.toBeUndefined()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })
  })

  it('ignores a registration error (the app still works through its WebSocket subscriptions)', async () => {
    await usePushNotifications().register()
    expect(() => listeners.registrationError!({ error: 'SERVICE_NOT_AVAILABLE' })).not.toThrow()
  })

  it('opens the orders board in the current language when a notification is tapped', async () => {
    await usePushNotifications().register()
    listeners.pushNotificationActionPerformed!({ notification: { data: { orderId: 'o-1' } } })
    const { $localePath } = useNuxtApp()
    expect(routerPush).toHaveBeenCalledExactlyOnceWith($localePath('/orders'))
    expect($localePath('/orders')).toMatch(/\/orders$/u)
  })
})

describe('unregister', () => {
  it('does nothing in a browser', async () => {
    platform.isCapacitor = false
    localStorage.setItem(TOKEN_KEY, 'fcm-1')
    await usePushNotifications().unregister()
    expect(gqlFetch).not.toHaveBeenCalled()
    expect(push.removeAllListeners).not.toHaveBeenCalled()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fcm-1')
  })

  it('tells the backend to forget the token, forgets it locally and stops listening', async () => {
    localStorage.setItem(TOKEN_KEY, 'fcm-1')
    await usePushNotifications().unregister()
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('unregisterDeviceToken'),
      {
        variables: { deviceToken: 'fcm-1' },
      },
    )
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(push.removeAllListeners).toHaveBeenCalledOnce()
  })

  it('still forgets the token locally when the backend call fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'fcm-1')
    gqlFetch.mockRejectedValue(new Error('offline'))
    await usePushNotifications().unregister()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(push.removeAllListeners).toHaveBeenCalledOnce()
  })

  it('has no token to unregister: only the listeners are removed', async () => {
    await usePushNotifications().unregister()
    expect(gqlFetch).not.toHaveBeenCalled()
    expect(push.removeAllListeners).toHaveBeenCalledOnce()
  })

  it('swallows a failure to remove the listeners', async () => {
    push.removeAllListeners.mockRejectedValue(new Error('plugin missing'))
    await expect(usePushNotifications().unregister()).resolves.toBeUndefined()
  })
})
