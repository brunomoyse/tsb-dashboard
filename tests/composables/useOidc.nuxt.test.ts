// useOidc: the OIDC (Authorization Code + PKCE) client of the dashboard on top of oidc-client-ts, in its two shells:
// the web (UserManager keeps the session) and the Capacitor Android app (tokens in a plain localStorage key, exchanged
// through the backend proxy). Covers sign in/out, the callbacks, the access token and the silent renewal whose single
// in-flight promise protects Zitadel's rotating refresh token.
// oidc-client-ts's UserManager (which talks to Zitadel) and $fetch are the boundaries, replaced by a fake.
// Run: `vp test run tests/composables/useOidc.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'
import { ErrorResponse, fakeUserManagers } from '../helpers/fakeOidc'
import { isSilentRenewUnavailable } from '~/utils/silentRenewError'

/** Zitadel's token endpoint refusing the refresh token (expired, revoked or already rotated). */
/** What ofetch throws for an HTTP error status of the backend. */
const httpError = (status: number) =>
  Object.assign(new Error(`${status} error`), { name: 'FetchError', status })

const refused = () => new ErrorResponse({ error: 'invalid_grant' })

interface FakeUser {
  access_token: string
  expired: boolean
}

const $fetchMock = vi.hoisted(() => vi.fn())

vi.mock('oidc-client-ts', async () => (await import('../helpers/fakeOidc')).oidcClientTsFake())
mockNuxtImport('$fetch', () => $fetchMock)

const TOKENS_KEY = 'capacitor_oidc_tokens'
const NOW_MS = Date.UTC(2026, 9, 4, 12, 0, 0)
const NOW_S = Math.floor(NOW_MS / 1000)

const user = (overrides: Partial<FakeUser> = {}): FakeUser => ({
  access_token: 'access-1',
  expired: false,
  ...overrides,
})

/** A fresh copy of the module (its user manager, token cache and in-flight renewal are module state). */
async function load() {
  vi.resetModules()
  const { useOidc } = await import('~/composables/useOidc')
  const oidc = useOidc()
  const manager = () => {
    const [created] = fakeUserManagers()
    if (!created) throw new Error('no user manager was created')
    return created
  }
  return { useOidc, oidc, manager }
}

const goTo = (path: string) => {
  window.history.replaceState({}, '', path)
}

const storedTokens = () => JSON.parse(localStorage.getItem(TOKENS_KEY) ?? 'null')
const storeTokens = (tokens: Record<string, unknown>) => {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

/** Switches the runtime config to the Android build for one test. */
const asCapacitor = () => {
  useRuntimeConfig().public.appBuild = 'capacitor'
}

beforeEach(() => {
  vi.resetAllMocks()
  fakeUserManagers().length = 0
  localStorage.clear()
  goTo('/fr/orders')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW_MS)
})

afterEach(() => {
  vi.useRealTimers()
  useRuntimeConfig().public.appBuild = 'web'
})

describe('the user manager (web)', () => {
  it('is configured for Zitadel with the code flow, offline access and no background renewal', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const { options } = manager()
    const config = useRuntimeConfig().public
    expect(options).toMatchObject({
      authority: config.zitadelAuthority,
      client_id: config.zitadelClientId,
      redirect_uri: `${config.dashboardBaseUrl}/fr/auth/callback`,
      post_logout_redirect_uri: `${config.dashboardBaseUrl}/fr`,
      response_type: 'code',
      automaticSilentRenew: false,
    })
    expect(String(options.scope).split(' ')).toEqual([
      'openid',
      'profile',
      'email',
      'offline_access',
      'urn:zitadel:iam:org:project:roles',
    ])
    // Tokens and the login state survive closing the browser: both stores are localStorage.
    expect(options.userStore).toMatchObject({ options: { store: localStorage } })
    expect(options.stateStore).toMatchObject({ options: { store: localStorage } })
  })

  it('returns to the callback page in the language of the page the staff member is on', async () => {
    goTo('/nl/orders')
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().options.redirect_uri).toMatch(/\/nl\/auth\/callback$/u)
    expect(manager().options.post_logout_redirect_uri).toMatch(/\/nl$/u)
  })

  it('defaults to French on a path without a language', async () => {
    goTo('/')
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().options.redirect_uri).toMatch(/\/fr\/auth\/callback$/u)
  })

  it('defaults to French where there is no window', async () => {
    const { oidc, manager } = await load()
    vi.stubGlobal('window', undefined)
    await oidc.signIn()
    vi.unstubAllGlobals()
    expect(manager().options.redirect_uri).toMatch(/\/fr\/auth\/callback$/u)
  })

  it('ignores trailing slashes of the configured base URL', async () => {
    const config = useRuntimeConfig().public
    const original = config.dashboardBaseUrl
    config.dashboardBaseUrl = 'https://dash.example///'
    try {
      const { oidc, manager } = await load()
      await oidc.signIn()
      expect(manager().options.redirect_uri).toBe('https://dash.example/fr/auth/callback')
      expect(manager().options.post_logout_redirect_uri).toBe('https://dash.example/fr')
    } finally {
      config.dashboardBaseUrl = original
    }
  })

  // NOTE: the manager is a singleton built on first use, so its redirect_uri keeps the language of the page where that
  // happened: switching language afterwards still comes back from Zitadel on the first language's callback page.
  it('NOTE: is built once; the language of the first page sticks to its redirect URI', async () => {
    goTo('/nl/orders')
    const { oidc, manager } = await load()
    await oidc.signIn()
    goTo('/en/orders')
    await oidc.signIn()
    expect(fakeUserManagers()).toHaveLength(1)
    expect(manager().options.redirect_uri).toMatch(/\/nl\/auth\/callback$/u)
  })

  it('is shared by every useOidc() call of the page', async () => {
    const { useOidc, oidc } = await load()
    await oidc.signIn()
    await useOidc().signIn()
    expect(fakeUserManagers()).toHaveLength(1)
  })
})

describe('the user manager (Capacitor)', () => {
  it('uses the native client id and the app origin for its redirects', async () => {
    asCapacitor()
    const { oidc, manager } = await load()
    await oidc.signIn()
    const config = useRuntimeConfig().public
    expect(manager().options).toMatchObject({
      authority: config.zitadelAuthority,
      client_id: config.zitadelNativeClientId,
      redirect_uri: `${window.location.origin}/fr/auth/callback`,
      post_logout_redirect_uri: `${window.location.origin}/fr`,
      response_type: 'code',
      automaticSilentRenew: false,
    })
    expect(manager().options.userStore).toMatchObject({ options: { store: localStorage } })
    expect(manager().options.stateStore).toMatchObject({ options: { store: localStorage } })
  })

  it('takes the language of the page for the redirects too', async () => {
    asCapacitor()
    goTo('/zh/orders')
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().options.redirect_uri).toMatch(/\/zh\/auth\/callback$/u)
  })
})

describe('the manager events', () => {
  it('publishes the loaded user, and clears it when the user is unloaded', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(oidc.oidcUser.value).toBeNull()

    const loaded = user()
    manager().listeners.loaded?.(loaded)
    expect(oidc.oidcUser.value).toEqual(loaded)

    manager().listeners.unloaded?.()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it('renews silently when the access token expires', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const renewed = user({ access_token: 'access-2' })
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockResolvedValue(renewed)

    await manager().listeners.expired?.()

    expect(manager().signinSilent).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toEqual(renewed)
  })

  it('keeps the session when the access token expires while Zitadel cannot be reached', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(manager().listeners.expired?.()).resolves.toBeUndefined()

    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  it('does not swallow an unexpected failure of the renewal when the access token expires', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockRejectedValue(new Error('storage unreadable'))
    await expect(manager().listeners.expired?.()).rejects.toThrow('storage unreadable')
  })

  it('has no silent-renew-error handler: a lost refresh-token race must not wipe a session another caller renewed', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().events.addSilentRenewError).not.toHaveBeenCalled()
  })
})

describe('signIn', () => {
  it('starts the authorize redirect, without extra parameters by default', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().signinRedirect).toHaveBeenCalledExactlyOnceWith({
      extraQueryParams: undefined,
    })
  })

  it('passes extra query parameters (e.g. a login hint) to the authorize URL', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn({ login_hint: 'chef@example.com' })
    expect(manager().signinRedirect).toHaveBeenCalledExactlyOnceWith({
      extraQueryParams: { login_hint: 'chef@example.com' },
    })
  })

  it('surfaces a failure of the redirect', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().signinRedirect.mockRejectedValue(new Error('metadata unreachable'))
    await expect(oidc.signIn()).rejects.toThrow('metadata unreachable')
  })
})

describe('getAuthRequestId (Capacitor in-app login)', () => {
  it('turns the authorize URL into a Zitadel auth request id through the backend proxy', async () => {
    asCapacitor()
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager()._client.createSigninRequest.mockResolvedValue({
      url: 'https://auth.test/authorize?x=1',
    })
    $fetchMock.mockResolvedValue({ authRequestId: 'V2_123' })

    await expect(oidc.getAuthRequestId()).resolves.toBe('V2_123')

    expect(manager()._client.createSigninRequest).toHaveBeenCalledExactlyOnceWith({})
    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${useRuntimeConfig().public.api}/auth/authorize-proxy`,
      { method: 'POST', body: { authorizeUrl: 'https://auth.test/authorize?x=1' } },
    )
  })

  it('fails when the proxy did not find a request id', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager()._client.createSigninRequest.mockResolvedValue({ url: 'https://auth.test/authorize' })
    $fetchMock.mockResolvedValue({})
    await expect(oidc.getAuthRequestId()).rejects.toThrow(
      'Failed to obtain authRequestID from Zitadel',
    )
  })

  it('surfaces a proxy failure', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager()._client.createSigninRequest.mockResolvedValue({ url: 'https://auth.test/authorize' })
    $fetchMock.mockRejectedValue(new Error('502'))
    await expect(oidc.getAuthRequestId()).rejects.toThrow('502')
  })
})

describe('exchangeCodeForTokens (Capacitor)', () => {
  const api = () => useRuntimeConfig().public.api

  async function prepare(entries: Record<string, string | null>) {
    asCapacitor()
    const loaded = await load()
    await loaded.oidc.signIn()
    const { stateStore } = loaded.manager().settings
    stateStore.getAllKeys.mockResolvedValue(Object.keys(entries))
    stateStore.get.mockImplementation((key: string) => Promise.resolve(entries[key]))
    return { ...loaded, stateStore }
  }

  it('sends the code with the PKCE verifier saved at sign-in, then forgets that state entry', async () => {
    const { oidc, manager, stateStore } = await prepare({
      'oidc.other': JSON.stringify({ id: 'x' }),
      'oidc.state-1': JSON.stringify({ id: 'state-1', code_verifier: 'verifier-1' }),
      'oidc.state-2': JSON.stringify({ id: 'state-2', code_verifier: 'verifier-2' }),
    })
    $fetchMock.mockResolvedValue({ access_token: 'a', refresh_token: 'r', expires_in: 600 })

    await oidc.exchangeCodeForTokens('code-1')

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/token-exchange`, {
      method: 'POST',
      body: {
        code: 'code-1',
        redirectUri: manager().options.redirect_uri,
        clientId: useRuntimeConfig().public.zitadelNativeClientId,
        codeVerifier: 'verifier-1',
      },
    })
    // Only the matching entry is consumed (the first one holding a verifier).
    expect(stateStore.remove).toHaveBeenCalledExactlyOnceWith('oidc.state-1')
  })

  it('skips entries that are empty or not JSON, and sends an empty verifier when none is found', async () => {
    const { oidc, stateStore } = await prepare({
      empty: null,
      broken: '{not json',
      noVerifier: JSON.stringify({ id: 'y' }),
    })
    $fetchMock.mockResolvedValue({ access_token: 'a', expires_in: 600 })

    await oidc.exchangeCodeForTokens('code-1')

    expect($fetchMock.mock.calls[0]?.[1].body.codeVerifier).toBe('')
    expect(stateStore.remove).not.toHaveBeenCalled()
  })

  it('finds a verifier that follows unusable entries', async () => {
    const { oidc } = await prepare({
      broken: '{not json',
      good: JSON.stringify({ code_verifier: 'verifier-ok' }),
    })
    $fetchMock.mockResolvedValue({ access_token: 'a', expires_in: 600 })
    await oidc.exchangeCodeForTokens('code-1')
    expect($fetchMock.mock.calls[0]?.[1].body.codeVerifier).toBe('verifier-ok')
  })

  it('sends an empty redirect URI when the manager has none', async () => {
    const { oidc, manager } = await prepare({})
    manager().settings.redirect_uri = undefined
    $fetchMock.mockResolvedValue({ access_token: 'a', expires_in: 600 })
    await oidc.exchangeCodeForTokens('code-1')
    expect($fetchMock.mock.calls[0]?.[1].body.redirectUri).toBe('')
  })

  it('stores the tokens with an absolute expiry, in memory and in localStorage', async () => {
    const { oidc } = await prepare({})
    $fetchMock.mockResolvedValue({
      access_token: 'access-9',
      refresh_token: 'refresh-9',
      expires_in: 600,
    })

    await oidc.exchangeCodeForTokens('code-1')

    expect(storedTokens()).toEqual({
      access_token: 'access-9',
      refresh_token: 'refresh-9',
      expires_at: NOW_S + 600,
    })
    // The cache answers without touching storage again.
    localStorage.clear()
    await expect(oidc.getAccessToken()).resolves.toBe('access-9')
  })

  it('assumes a one-hour lifetime when the server does not say', async () => {
    const { oidc } = await prepare({})
    $fetchMock.mockResolvedValue({ access_token: 'access-9' })
    await oidc.exchangeCodeForTokens('code-1')
    expect(storedTokens()).toEqual({ access_token: 'access-9', expires_at: NOW_S + 3600 })
  })

  it('stores nothing when the exchange fails', async () => {
    const { oidc } = await prepare({})
    $fetchMock.mockRejectedValue(new Error('invalid_grant'))
    await expect(oidc.exchangeCodeForTokens('code-1')).rejects.toThrow('invalid_grant')
    expect(localStorage.getItem(TOKENS_KEY)).toBeNull()
  })
})

describe('the callbacks (web)', () => {
  it('handleCallback completes the redirect login and publishes the user', async () => {
    const { oidc, manager } = await load()
    const signedIn = user()
    await oidc.signIn()
    manager().signinRedirectCallback.mockResolvedValue(signedIn)

    await expect(oidc.handleCallback()).resolves.toBe(signedIn)

    expect(manager().signinRedirectCallback).toHaveBeenCalledExactlyOnceWith()
    expect(oidc.oidcUser.value).toEqual(signedIn)
  })

  it('handleDeepLinkCallback completes the login from the deep link URL', async () => {
    const { oidc, manager } = await load()
    const signedIn = user()
    await oidc.signIn()
    manager().signinRedirectCallback.mockResolvedValue(signedIn)

    await expect(
      oidc.handleDeepLinkCallback('https://dash.test/fr/auth/callback?code=c&state=s'),
    ).resolves.toBe(signedIn)

    expect(manager().signinRedirectCallback).toHaveBeenCalledExactlyOnceWith(
      'https://dash.test/fr/auth/callback?code=c&state=s',
    )
    expect(oidc.oidcUser.value).toEqual(signedIn)
  })

  it('surface a rejected callback and publish no user', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().signinRedirectCallback.mockRejectedValue(new Error('No matching state found'))
    await expect(oidc.handleCallback()).rejects.toThrow('No matching state found')
    await expect(oidc.handleDeepLinkCallback('x')).rejects.toThrow('No matching state found')
    expect(oidc.oidcUser.value).toBeNull()
  })
})

describe('getAccessToken (web)', () => {
  it('returns the token of a valid session', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ access_token: 'access-7' }))
    await expect(oidc.getAccessToken()).resolves.toBe('access-7')
    expect(manager().signinSilent).not.toHaveBeenCalled()
  })

  it('is null without a session, and does not try to renew one that does not exist', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(null)
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect(manager().signinSilent).not.toHaveBeenCalled()
  })

  it('renews an expired session and returns the fresh token', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ access_token: 'old', expired: true }))
    manager().signinSilent.mockResolvedValue(user({ access_token: 'access-8' }))
    await expect(oidc.getAccessToken()).resolves.toBe('access-8')
  })

  it('is null when the renewal is refused (the session is over)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(refused())
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect(manager().removeUser).toHaveBeenCalledOnce()
  })

  it('is null for this request, and keeps the session, when Zitadel cannot be reached (offline)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  it('does not hide an unexpected failure of the renewal', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValueOnce(user({ expired: true }))
    manager().getUser.mockRejectedValueOnce(new Error('storage unreadable'))
    await expect(oidc.getAccessToken()).rejects.toThrow('storage unreadable')
  })

  it('is not fooled by an expired or unreadable Capacitor token key', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ access_token: 'access-7' }))
    storeTokens({ access_token: 'stale', expires_at: NOW_S })
    await expect(oidc.getAccessToken()).resolves.toBe('access-7')
    localStorage.setItem(TOKENS_KEY, '{not json')
    await expect(oidc.getAccessToken()).resolves.toBe('access-7')
  })

  it('works where localStorage does not exist', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ access_token: 'access-7' }))
    vi.stubGlobal('localStorage', undefined)
    await expect(oidc.getAccessToken()).resolves.toBe('access-7')
  })
})

describe('getAccessToken (Capacitor)', () => {
  beforeEach(() => {
    asCapacitor()
  })

  it('reads a valid token from localStorage (it survives an app restart) and caches it', async () => {
    storeTokens({ access_token: 'stored', refresh_token: 'r', expires_at: NOW_S + 60 })
    const { oidc } = await load()
    await expect(oidc.getAccessToken()).resolves.toBe('stored')
    localStorage.clear()
    await expect(oidc.getAccessToken()).resolves.toBe('stored')
  })

  it('treats a token that expires this very second as expired', async () => {
    storeTokens({ access_token: 'stored', expires_at: NOW_S })
    const { oidc } = await load()
    await expect(oidc.getAccessToken()).resolves.toBeNull()
  })

  it('refreshes an expired token through the backend proxy and returns the new one', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 10 })
    const { oidc } = await load()
    $fetchMock.mockResolvedValue({
      access_token: 'new',
      refresh_token: 'refresh-2',
      expires_in: 300,
    })

    await expect(oidc.getAccessToken()).resolves.toBe('new')

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${useRuntimeConfig().public.api}/auth/token-exchange`,
      {
        method: 'POST',
        body: {
          refreshToken: 'refresh-1',
          clientId: useRuntimeConfig().public.zitadelNativeClientId,
        },
      },
    )
  })

  it('is null when there is nothing stored', async () => {
    const { oidc } = await load()
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect($fetchMock).not.toHaveBeenCalled()
  })

  it('is null when the stored value is unreadable (and does not renew from garbage)', async () => {
    localStorage.setItem(TOKENS_KEY, '{not json')
    const { oidc } = await load()
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect($fetchMock).not.toHaveBeenCalled()
  })

  it('is null when the backend refuses the refresh token', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 10 })
    const { oidc } = await load()
    $fetchMock.mockRejectedValue(httpError(401))
    await expect(oidc.getAccessToken()).resolves.toBeNull()
  })

  it('is null for this request, and keeps the stored tokens, when the backend cannot be reached', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 10 })
    const { oidc } = await load()
    $fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect(storedTokens()).toMatchObject({ refresh_token: 'refresh-1' })
  })
})

describe('silentRenew (web)', () => {
  it('renews with the refresh token and publishes the new user', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const renewed = user({ access_token: 'access-2' })
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockResolvedValue(renewed)

    await expect(oidc.silentRenew()).resolves.toBe(renewed)
    expect(oidc.oidcUser.value).toEqual(renewed)
  })

  it('does nothing without a session', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(null)
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect(manager().signinSilent).not.toHaveBeenCalled()
  })

  it('wipes the stale session when Zitadel refuses, so nothing keeps retrying', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(refused())
    manager().listeners.loaded?.(user())

    await expect(oidc.silentRenew()).resolves.toBeNull()

    expect(manager().removeUser).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it.each([
    ['no network', new TypeError('Failed to fetch')],
    ['a timeout', new Error('Network timed out')],
    ['a server error', new Error('Bad Gateway (502)')],
    ['Zitadel answering server_error', new ErrorResponse({ error: 'server_error' })],
    [
      'Zitadel answering temporarily_unavailable',
      new ErrorResponse({ error: 'temporarily_unavailable' }),
    ],
  ])(
    'keeps the session and rejects as "unavailable" when Zitadel cannot be reached (%s)',
    async (_name, failure) => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager().getUser.mockResolvedValue(user({ expired: true }))
      manager().signinSilent.mockRejectedValue(failure)
      manager().listeners.loaded?.(user())

      const outcome = await oidc.silentRenew().catch((err: unknown) => err)

      expect(isSilentRenewUnavailable(outcome)).toBe(true)
      expect((outcome as Error).cause).toBe(failure)
      expect(manager().removeUser).not.toHaveBeenCalled()
      expect(oidc.oidcUser.value).not.toBeNull()
    },
  )

  it.each(['invalid_grant', 'login_required', 'invalid_client'])(
    'ends the session when Zitadel answers %s',
    async (error) => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager().getUser.mockResolvedValue(user({ expired: true }))
      manager().signinSilent.mockRejectedValue(new ErrorResponse({ error }))
      await expect(oidc.silentRenew()).resolves.toBeNull()
      expect(manager().removeUser).toHaveBeenCalledOnce()
    },
  )

  it('still reports the end of the session when the cleanup itself fails', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(refused())
    manager().removeUser.mockRejectedValue(new Error('storage full'))
    manager().listeners.loaded?.(user())

    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it('shares ONE renewal between concurrent callers (Zitadel rotates the refresh token on first use)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const renewed = user({ access_token: 'access-2' })
    let finish: (value: FakeUser) => void = () => {}
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockReturnValue(
      new Promise<FakeUser>((resolve) => {
        finish = resolve
      }),
    )

    const first = oidc.silentRenew()
    const second = oidc.silentRenew()
    const event = manager().listeners.expired?.()
    expect(second).toBe(first)

    finish(renewed)
    await expect(first).resolves.toBe(renewed)
    await event
    expect(manager().signinSilent).toHaveBeenCalledOnce()
  })

  it('shares the renewal across separate useOidc() instances', async () => {
    const { useOidc, oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockResolvedValue(user())
    const first = oidc.silentRenew()
    const second = useOidc().silentRenew()
    expect(second).toBe(first)
    await first
    expect(manager().signinSilent).toHaveBeenCalledOnce()
  })

  it('allows a new renewal once the previous one has finished (also after a failure)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValueOnce(new Error('network'))
    manager().signinSilent.mockResolvedValueOnce(user({ access_token: 'access-3' }))

    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    await expect(oidc.silentRenew()).resolves.toMatchObject({ access_token: 'access-3' })
    expect(manager().signinSilent).toHaveBeenCalledTimes(2)
  })
})

describe('silentRenew (Capacitor)', () => {
  beforeEach(() => {
    asCapacitor()
  })

  const api = () => useRuntimeConfig().public.api

  it('is null without stored tokens', async () => {
    const { oidc } = await load()
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect($fetchMock).not.toHaveBeenCalled()
  })

  it('is null when the stored tokens carry no refresh token', async () => {
    storeTokens({ access_token: 'a', expires_at: NOW_S - 1 })
    const { oidc } = await load()
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect($fetchMock).not.toHaveBeenCalled()
  })

  it('exchanges the refresh token and stores the rotated one with a new expiry', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 1 })
    const { oidc } = await load()
    $fetchMock.mockResolvedValue({
      access_token: 'new',
      refresh_token: 'refresh-2',
      expires_in: 300,
    })

    const renewed = await oidc.silentRenew()

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/token-exchange`, {
      method: 'POST',
      body: {
        refreshToken: 'refresh-1',
        clientId: useRuntimeConfig().public.zitadelNativeClientId,
      },
    })
    expect(renewed).toMatchObject({ access_token: 'new', refresh_token: 'refresh-2' })
    expect(storedTokens()).toEqual({
      access_token: 'new',
      refresh_token: 'refresh-2',
      expires_at: NOW_S + 300,
    })
  })

  it('keeps the old refresh token when the server did not rotate it, and assumes one hour', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 1 })
    const { oidc } = await load()
    $fetchMock.mockResolvedValue({ access_token: 'new' })

    await oidc.silentRenew()

    expect(storedTokens()).toEqual({
      access_token: 'new',
      refresh_token: 'refresh-1',
      expires_at: NOW_S + 3600,
    })
  })

  it.each([400, 401, 403])(
    'reports no session when the backend refuses the refresh token (%d)',
    async (status) => {
      storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 1 })
      const { oidc } = await load()
      $fetchMock.mockRejectedValue(httpError(status))
      await expect(oidc.silentRenew()).resolves.toBeNull()
      expect(storedTokens()).toMatchObject({ refresh_token: 'refresh-1' })
    },
  )

  it.each([
    ['offline', new TypeError('Failed to fetch')],
    ['a server error', httpError(502)],
    ['a gateway timeout', httpError(504)],
    ['a request timeout', httpError(408)],
    ['a rate limit', httpError(429)],
    ['an error with a statusCode only', Object.assign(new Error('x'), { statusCode: 503 })],
  ])(
    'rejects as "unavailable" and keeps the tokens when the backend cannot answer (%s)',
    async (_name, failure) => {
      storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 1 })
      const { oidc } = await load()
      $fetchMock.mockRejectedValue(failure)

      const outcome = await oidc.silentRenew().catch((err: unknown) => err)

      expect(isSilentRenewUnavailable(outcome)).toBe(true)
      expect(storedTokens()).toMatchObject({ refresh_token: 'refresh-1' })
    },
  )

  it('refuses on a statusCode-only client error too', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 1 })
    const { oidc } = await load()
    $fetchMock.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 401 }))
    await expect(oidc.silentRenew()).resolves.toBeNull()
  })

  it('reports no session when the renewed tokens cannot be stored (storage full)', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 1 })
    const { oidc } = await load()
    $fetchMock.mockResolvedValue({
      access_token: 'new',
      refresh_token: 'refresh-2',
      expires_in: 300,
    })
    const stored = localStorage.getItem(TOKENS_KEY)
    vi.stubGlobal('localStorage', {
      getItem: () => stored,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
    })
    await expect(oidc.silentRenew()).resolves.toBeNull()
  })

  it('is null for unreadable stored tokens', async () => {
    localStorage.setItem(TOKENS_KEY, '{not json')
    const { oidc } = await load()
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect($fetchMock).not.toHaveBeenCalled()
  })

  it('shares one exchange between concurrent callers', async () => {
    storeTokens({ access_token: 'old', refresh_token: 'refresh-1', expires_at: NOW_S - 1 })
    const { oidc } = await load()
    $fetchMock.mockResolvedValue({
      access_token: 'new',
      refresh_token: 'refresh-2',
      expires_in: 300,
    })
    const [a, b, c] = await Promise.all([
      oidc.silentRenew(),
      oidc.silentRenew(),
      oidc.getAccessToken(),
    ])
    expect(a).toBe(b)
    expect(c).toBe('new')
    expect($fetchMock).toHaveBeenCalledOnce()
  })
})

describe('signOut', () => {
  it('redirects to the OIDC end-session endpoint', async () => {
    const { oidc, manager } = await load()
    await oidc.signOut()
    expect(manager().signoutRedirect).toHaveBeenCalledOnce()
  })
})

describe('logoutCapacitor', () => {
  it('forgets the tokens everywhere: memory, storage and the published user', async () => {
    asCapacitor()
    storeTokens({ access_token: 'a', refresh_token: 'r', expires_at: NOW_S + 600 })
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().listeners.loaded?.(user())
    await expect(oidc.getAccessToken()).resolves.toBe('a')

    oidc.logoutCapacitor()

    expect(localStorage.getItem(TOKENS_KEY)).toBeNull()
    expect(oidc.oidcUser.value).toBeNull()
    // Neither the cache nor the storage answers any more, and there is no refresh token left to renew with.
    await expect(oidc.getAccessToken()).resolves.toBeNull()
  })

  it('works where localStorage does not exist', async () => {
    const { oidc } = await load()
    vi.stubGlobal('localStorage', undefined)
    expect(() => {
      oidc.logoutCapacitor()
    }).not.toThrow()
    expect(oidc.oidcUser.value).toBeNull()
  })
})

describe('isAuthenticated', () => {
  it('web: true for a live session, false for none or an expired one', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValueOnce(user())
    await expect(oidc.isAuthenticated()).resolves.toBe(true)
    manager().getUser.mockResolvedValueOnce(user({ expired: true }))
    await expect(oidc.isAuthenticated()).resolves.toBe(false)
    manager().getUser.mockResolvedValueOnce(null)
    await expect(oidc.isAuthenticated()).resolves.toBe(false)
  })

  it('Capacitor: true when a usable token exists, false otherwise', async () => {
    asCapacitor()
    storeTokens({ access_token: 'a', expires_at: NOW_S + 600 })
    const { oidc } = await load()
    await expect(oidc.isAuthenticated()).resolves.toBe(true)
    oidc.logoutCapacitor()
    await expect(oidc.isAuthenticated()).resolves.toBe(false)
  })
})

describe('getUser and removeUser', () => {
  it('getUser answers with the manager’s user', async () => {
    const { oidc, manager } = await load()
    const current = user()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(current)
    await expect(oidc.getUser()).resolves.toBe(current)
  })

  it('removeUser clears the stored OIDC session', async () => {
    const { oidc, manager } = await load()
    await oidc.removeUser()
    expect(manager().removeUser).toHaveBeenCalledOnce()
  })
})
