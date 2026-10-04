// Auth store: the signed-in staff user (persisted), and the logout that clears it before the OIDC redirect. The OIDC
// client is the boundary; Pinia and the persistence plugin are real.
// Run: `vp test run tests/stores/auth.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { setFlags } from '../support/flags'
import { makeUser } from '../fixtures/dashboard'

const oidc = vi.hoisted(() => ({ signOut: vi.fn<() => Promise<void>>() }))
vi.mock('~/composables/useOidc', () => ({ useOidc: () => oidc }))

const { useAuthStore } = await import('~/stores/auth')

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  oidc.signOut.mockResolvedValue()
  setActivePinia(createPinia())
})

describe('the user', () => {
  it('starts signed out', () => {
    expect(useAuthStore().user).toBeNull()
  })

  it('setUser stores the user, clearUser forgets it', () => {
    const store = useAuthStore()
    store.setUser(makeUser())
    expect(store.user).toEqual(makeUser())
    store.clearUser()
    expect(store.user).toBeNull()
  })

  it('updateUser merges the given fields into the signed-in user', () => {
    const store = useAuthStore()
    store.setUser(makeUser({ firstName: 'Ada', phoneNumber: null }))
    store.updateUser({ phoneNumber: '+32470000000' })
    expect(store.user).toEqual(makeUser({ firstName: 'Ada', phoneNumber: '+32470000000' }))
  })

  it('updateUser does nothing while signed out (no half-built user)', () => {
    const store = useAuthStore()
    store.updateUser({ firstName: 'Grace' })
    expect(store.user).toBeNull()
  })
})

describe('persistence', () => {
  /** A store the way the app builds it: the persistence plugin on a Pinia attached to an app. */
  function persisted() {
    const pinia = createPinia()
    pinia.use(createPersistedState())
    createApp({}).use(pinia)
    setActivePinia(pinia)
    return useAuthStore()
  }

  it('writes the user to localStorage under "auth", and restores it on the next visit', async () => {
    const store = persisted()
    await nextTick()
    store.setUser(makeUser({ firstName: 'Persisted' }))
    await nextTick()
    expect(JSON.parse(localStorage.getItem('auth') ?? 'null')).toEqual({
      user: makeUser({ firstName: 'Persisted' }),
    })

    // A new page load: a new Pinia reads the saved record.
    expect(persisted().user).toEqual(makeUser({ firstName: 'Persisted' }))
  })
})

describe('logout', () => {
  it('clears the user, the saved record, then ends the OIDC session', async () => {
    const store = useAuthStore()
    store.setUser(makeUser())
    localStorage.setItem('auth', JSON.stringify({ user: makeUser() }))
    let userDuringSignOut: unknown = 'unset'
    let savedDuringSignOut: unknown = 'unset'
    oidc.signOut.mockImplementation(() => {
      // The redirect starts here: the state must already be gone.
      userDuringSignOut = store.user
      savedDuringSignOut = localStorage.getItem('auth')
      return Promise.resolve()
    })

    await store.logout()

    expect(oidc.signOut).toHaveBeenCalledOnce()
    expect(userDuringSignOut).toBeNull()
    expect(savedDuringSignOut).toBeNull()
  })

  it('does not touch localStorage when it is not running in the browser', async () => {
    setFlags({ server: true })
    const store = useAuthStore()
    store.setUser(makeUser())
    localStorage.setItem('auth', 'kept')

    await store.logout()

    expect(store.user).toBeNull()
    expect(localStorage.getItem('auth')).toBe('kept')
  })

  it('swallows a failing sign-out (the local state is cleared anyway), logging only in dev', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useAuthStore()
    store.setUser(makeUser())
    oidc.signOut.mockRejectedValue(new Error('end-session unreachable'))

    await expect(store.logout()).resolves.toBeUndefined()
    expect(store.user).toBeNull()
    expect(error).not.toHaveBeenCalled()

    setFlags({ dev: true })
    await store.logout()
    expect(error).toHaveBeenCalledExactlyOnceWith('Logout error:', expect.any(Error))
  })
})
