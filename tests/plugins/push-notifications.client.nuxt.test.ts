// push-notifications.client plugin: in the Android app, registers the device for push once the staff user is known.
// Capacitor's platform check and the push composable are the boundaries; the auth store is real.
// Run: `vp test run tests/plugins/push-notifications.client.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { makeUser } from '../fixtures/dashboard'

const native = vi.hoisted(() => ({ isNativePlatform: vi.fn<() => boolean>() }))
const push = vi.hoisted(() => ({ register: vi.fn<() => Promise<void>>() }))

vi.mock('@capacitor/core', () => ({ Capacitor: native }))
vi.mock('~/composables/usePushNotifications', () => ({
  usePushNotifications: () => ({ register: push.register }),
}))

const { default: plugin } = await import('~/plugins/push-notifications.client')
const { useAuthStore } = await import('~/stores/auth')
const run = () => (plugin as unknown as () => Promise<void>)()

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  native.isNativePlatform.mockReturnValue(true)
  push.register.mockResolvedValue()
})

describe('push registration at start', () => {
  it('does nothing in a browser, even for a signed-in user', async () => {
    native.isNativePlatform.mockReturnValue(false)
    useAuthStore().setUser(makeUser())
    await run()
    expect(push.register).not.toHaveBeenCalled()
  })

  it('waits for a signed-in user in the Android app', async () => {
    await run()
    expect(push.register).not.toHaveBeenCalled()
  })

  it('registers the device when a user is signed in in the Android app', async () => {
    useAuthStore().setUser(makeUser())
    await run()
    expect(push.register).toHaveBeenCalledOnce()
  })

  it('surfaces a registration failure to Nuxt', async () => {
    useAuthStore().setUser(makeUser())
    push.register.mockRejectedValue(new Error('no play services'))
    await expect(run()).rejects.toThrow('no play services')
  })
})
