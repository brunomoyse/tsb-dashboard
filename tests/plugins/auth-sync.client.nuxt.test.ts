// Auth-sync plugin: at app start, checks that the staff user persisted in Pinia still has an OIDC session behind it
// (tokens persist in localStorage and the refresh token has an idle expiry), and signs the stale user out otherwise.
// The OIDC client is the boundary; the auth store (real Pinia) is the state that is checked.
// Run: `vp test run tests/plugins/auth-sync.client.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { makeUser } from '../fixtures/dashboard'

const oidc = vi.hoisted(() => ({
  isAuthenticated: vi.fn<() => Promise<boolean>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
  removeUser: vi.fn<() => Promise<void>>(),
}))
vi.mock('~/composables/useOidc', () => ({ useOidc: () => oidc }))

const { default: plugin } = await import('~/plugins/auth-sync.client')
const { useAuthStore } = await import('~/stores/auth')

const sync = () => (plugin as unknown as () => Promise<void>)()

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  oidc.isAuthenticated.mockResolvedValue(false)
  oidc.silentRenew.mockResolvedValue(null)
  oidc.removeUser.mockResolvedValue()
})

describe('without a persisted user', () => {
  it('has nothing to reconcile and does not touch the OIDC client', async () => {
    await sync()
    expect(oidc.isAuthenticated).not.toHaveBeenCalled()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(oidc.removeUser).not.toHaveBeenCalled()
  })
})

describe('with a persisted user', () => {
  beforeEach(() => {
    useAuthStore().setUser(makeUser())
  })

  it('keeps the user while the OIDC session is valid', async () => {
    oidc.isAuthenticated.mockResolvedValue(true)
    await sync()
    expect(useAuthStore().user).toEqual(makeUser())
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(oidc.removeUser).not.toHaveBeenCalled()
  })

  it('keeps the user when the session had expired but the refresh token still works', async () => {
    oidc.silentRenew.mockResolvedValue({ access_token: 'new' })
    await sync()
    expect(useAuthStore().user).toEqual(makeUser())
    expect(oidc.removeUser).not.toHaveBeenCalled()
  })

  it('wipes the stale OIDC session AND the user when Zitadel rejects the refresh token', async () => {
    await sync()
    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect(oidc.removeUser).toHaveBeenCalledOnce()
    expect(useAuthStore().user).toBeNull()
  })

  it('clears the user only after the OIDC session is removed', async () => {
    let userWhenRemoved: unknown = 'unset'
    oidc.removeUser.mockImplementation(() => {
      userWhenRemoved = useAuthStore().user
      return Promise.resolve()
    })
    await sync()
    expect(userWhenRemoved).toEqual(makeUser())
    expect(useAuthStore().user).toBeNull()
  })

  it('leaves the user in place when the cleanup fails (the error surfaces to Nuxt, which logs it)', async () => {
    oidc.removeUser.mockRejectedValue(new Error('storage full'))
    await expect(sync()).rejects.toThrow('storage full')
    expect(useAuthStore().user).toEqual(makeUser())
  })
})
