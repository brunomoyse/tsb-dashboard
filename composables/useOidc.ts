import {
  ErrorResponse,
  type User as OidcUser,
  UserManager,
  WebStorageStateStore,
} from 'oidc-client-ts'
import { SilentRenewUnavailableError, isSilentRenewUnavailable } from '~/utils/silentRenewError'
import { type Ref, ref } from 'vue'
import { useRuntimeConfig } from '#imports'

let userManager: UserManager | null = null
const oidcUser: Ref<OidcUser | null> = ref(null)

// Simple token storage for Capacitor (bypasses oidc-client-ts complexity)
const CAPACITOR_TOKEN_KEY = 'capacitor_oidc_tokens'

// In-memory cache — avoids any localStorage timing issues in WKWebView
let capacitorTokenCache: CapacitorTokens | null = null

/*
 * Module-scope coalescer for silent renewal. Every caller (middleware, plugins,
 * getAccessToken, accessTokenExpired event) routes through the same in-flight
 * promise. Zitadel rotates the refresh token on first use, so two concurrent
 * renews would race and the loser would be logged out mid-session.
 */
let silentRenewPromise: Promise<OidcUser | null> | null = null

interface CapacitorTokens {
  access_token: string
  refresh_token?: string
  expires_at: number
}

/*
 * OAuth error codes of a token endpoint that say "try again later", not "this refresh token is no good": the session
 * is kept. Every other `ErrorResponse` (invalid_grant: expired, revoked or already used refresh token, login_required,
 * invalid_client...) is a definitive refusal.
 */
const TRANSIENT_OAUTH_ERRORS = new Set(['server_error', 'temporarily_unavailable'])

/** Did Zitadel itself answer that this session cannot be renewed? (Not: we could not reach it.) */
const isRefusal = (err: unknown): boolean =>
  err instanceof ErrorResponse && !TRANSIENT_OAUTH_ERRORS.has(String(err.error))

/**
 * Did the backend's token-exchange answer that this refresh token is refused? A client error (400, 401, 403...) is a
 * refusal; no answer at all (offline, a timeout), a server error, a timeout (408) or a rate limit (429) is not.
 */
const isTokenExchangeRefusal = (err: unknown): boolean => {
  const status = (err as { status?: number; statusCode?: number } | null)?.status
  const code = status ?? (err as { statusCode?: number } | null)?.statusCode
  return typeof code === 'number' && code >= 400 && code < 500 && code !== 408 && code !== 429
}

/**
 * Provides OIDC Authorization Code + PKCE flow via oidc-client-ts.
 * On Capacitor, token storage/retrieval uses a simple localStorage key
 * instead of oidc-client-ts's UserManager (which has complex validation).
 */
export function useOidc() {
  const config = useRuntimeConfig()
  const isCapacitor = config.public.appBuild === 'capacitor'

  function getUserManager(): UserManager {
    if (userManager) return userManager

    const locale =
      typeof window === 'undefined' ? 'fr' : window.location.pathname.split('/')[1] || 'fr'

    if (isCapacitor) {
      const { origin } = window.location
      userManager = new UserManager({
        authority: config.public.zitadelAuthority as string,
        client_id: config.public.zitadelNativeClientId as string,
        redirect_uri: `${origin}/${locale}/auth/callback`,
        post_logout_redirect_uri: `${origin}/${locale}`,
        response_type: 'code',
        scope: 'openid profile email offline_access urn:zitadel:iam:org:project:roles',
        automaticSilentRenew: false,
        userStore: new WebStorageStateStore({ store: localStorage }),
        stateStore: new WebStorageStateStore({ store: localStorage }),
      })
    } else {
      const baseUrl = (config.public.dashboardBaseUrl as string).replace(/\/+$/, '')
      userManager = new UserManager({
        authority: config.public.zitadelAuthority as string,
        client_id: config.public.zitadelClientId as string,
        redirect_uri: `${baseUrl}/${locale}/auth/callback`,
        post_logout_redirect_uri: `${baseUrl}/${locale}`,
        response_type: 'code',
        scope: 'openid profile email offline_access urn:zitadel:iam:org:project:roles',
        // Off: the background renewal raced with middleware/plugin calls on the same refresh token; Zitadel's rotation logged the loser out mid-session. Renew lazily on navigation and on 401 instead.
        automaticSilentRenew: false,
        // Persist tokens across browser close; Zitadel enforces the 30-day idle / 90-day absolute refresh-token TTL.
        userStore: new WebStorageStateStore({ store: localStorage }),
        stateStore: new WebStorageStateStore({ store: localStorage }),
      })
    }

    userManager.events.addUserLoaded((user) => {
      oidcUser.value = user
    })
    userManager.events.addUserUnloaded(() => {
      oidcUser.value = null
    })

    userManager.events.addAccessTokenExpired(async () => {
      /*
       * Route through the module-level coalescer so this event-driven
       * renewal cannot race with a concurrent silentRenew() call from
       * middleware/plugins on the same refresh token.
       */
      try {
        await silentRenew()
      } catch (err) {
        // No network right now: the session is kept, the next request renews it.
        if (!isSilentRenewUnavailable(err)) throw err
      }
    })

    /*
     * Note: addSilentRenewError intentionally has no handler. A losing race
     * (Zitadel rejected an already-rotated refresh token) would otherwise
     * call removeUser() and wipe a session another caller had just renewed.
     * Real session termination is handled by the callers checking the
     * silentRenew() return value.
     */

    return userManager
  }

  /** Start the OIDC authorize redirect (web only). */
  async function signIn(extraParams?: Record<string, string>) {
    const mgr = getUserManager()
    await mgr.signinRedirect({ extraQueryParams: extraParams })
  }

  /**
   * Capacitor: get authRequestID from Zitadel without navigating away.
   * Creates the OIDC authorize URL, sends it to the backend proxy which follows
   * the redirect and extracts the authRequestID.
   */
  async function getAuthRequestId(): Promise<string> {
    const mgr = getUserManager()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (mgr as any)._client
    const signinRequest = await client.createSigninRequest({})

    const apiUrl = config.public.api as string
    const response = await $fetch<{ authRequestId: string }>(`${apiUrl}/auth/authorize-proxy`, {
      method: 'POST',
      body: { authorizeUrl: signinRequest.url },
    })

    if (!response.authRequestId) {
      throw new Error('Failed to obtain authRequestID from Zitadel')
    }
    return response.authRequestId
  }

  /**
   * Capacitor: exchange authorization code for tokens via backend proxy.
   * Stores tokens in a simple localStorage key (not via oidc-client-ts).
   */
  async function exchangeCodeForTokens(code: string): Promise<void> {
    const mgr = getUserManager()
    const { settings } = mgr

    // Retrieve PKCE code_verifier from the stored state
    const { stateStore } = settings
    const keys = await stateStore.getAllKeys()
    let codeVerifier = ''
    for (const key of keys) {
      const stateStr = await stateStore.get(key)
      if (stateStr) {
        try {
          const stateData = JSON.parse(stateStr)
          if (stateData.code_verifier) {
            codeVerifier = stateData.code_verifier
            await stateStore.remove(key)
            break
          }
        } catch {
          /* Skip invalid entries */
        }
      }
    }

    // Exchange code via backend proxy (avoids CORS with Zitadel token endpoint)
    const apiUrl = config.public.api as string
    const tokens = await $fetch<{
      access_token: string
      expires_in: number
      refresh_token?: string
    }>(`${apiUrl}/auth/token-exchange`, {
      method: 'POST',
      body: {
        code,
        redirectUri: settings.redirect_uri || '',
        clientId: settings.client_id,
        codeVerifier,
      },
    })

    // Store tokens in simple localStorage key
    const tokenData: CapacitorTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
    }
    // Store in both memory and localStorage
    capacitorTokenCache = tokenData
    localStorage.setItem(CAPACITOR_TOKEN_KEY, JSON.stringify(tokenData))
  }

  /** Complete the OIDC callback (web only — exchange code for tokens). */
  async function handleCallback(): Promise<OidcUser> {
    const mgr = getUserManager()
    const user = await mgr.signinRedirectCallback()
    oidcUser.value = user
    return user
  }

  /** Capacitor: process deep link callback URL. */
  async function handleDeepLinkCallback(url: string): Promise<OidcUser> {
    const mgr = getUserManager()
    const user = await mgr.signinRedirectCallback(url)
    oidcUser.value = user
    return user
  }

  /** Get the current access token (or null if not authenticated). */
  async function getAccessToken(): Promise<string | null> {
    // Check in-memory cache first (fastest, no async)
    const now = Math.floor(Date.now() / 1000)
    if (capacitorTokenCache && capacitorTokenCache.expires_at > now) {
      return capacitorTokenCache.access_token
    }

    // Then check localStorage (survives app restart)
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(CAPACITOR_TOKEN_KEY)
      if (stored) {
        try {
          const data: CapacitorTokens = JSON.parse(stored)
          if (data.expires_at > now) {
            capacitorTokenCache = data
            return data.access_token
          }
        } catch {
          /* Invalid data */
        }
      }
    }

    try {
      // Capacitor: token expired, attempt refresh
      if (isCapacitor) {
        const renewed = await silentRenew()
        return renewed ? (capacitorTokenCache?.access_token ?? null) : null
      }
      // Web: use oidc-client-ts UserManager
      const mgr = getUserManager()
      const user = await mgr.getUser()
      if (user && !user.expired) return user.access_token
      if (!user) return null // No session — nothing to renew

      /*
       * Token expired — route through the coalesced silentRenew so concurrent
       * callers share one refresh-token use (Zitadel rotates on first use).
       */
      const renewed = await silentRenew()
      return renewed?.access_token ?? null
    } catch (err) {
      // The renewal could not be made now (offline): no token for this request, the session stays for the next one.
      if (isSilentRenewUnavailable(err)) return null
      throw err
    }
  }

  /**
   * Attempt silent token renewal. All callers (middleware, plugins, the
   * accessTokenExpired event, getAccessToken) share a single in-flight
   * promise so we never use the same refresh token twice in parallel —
   * Zitadel rotates on first use and would log the loser out.
   *
   * Resolves the renewed user, or `null` when the session is over (nothing to
   * renew, or Zitadel refused the refresh token: the stale user is wiped).
   * Rejects with `SilentRenewUnavailableError` when Zitadel could not be
   * reached (offline, timeout, 5xx): the session is NOT touched, the caller
   * keeps the staff member signed in and does not send them to the login page.
   */
  function silentRenew(): Promise<OidcUser | null> {
    silentRenewPromise ??= doSilentRenew().finally(() => {
      silentRenewPromise = null
    })
    return silentRenewPromise
  }

  async function doSilentRenew(): Promise<OidcUser | null> {
    if (isCapacitor) {
      // Read stored refresh token
      const stored = localStorage.getItem(CAPACITOR_TOKEN_KEY)
      if (!stored) return null
      let data: CapacitorTokens
      try {
        data = JSON.parse(stored)
      } catch {
        return null
      }
      if (!data.refresh_token) return null

      // Exchange refresh token via backend proxy
      const apiUrl = config.public.api as string
      let tokens: { access_token: string; expires_in: number; refresh_token?: string }
      try {
        tokens = await $fetch<{
          access_token: string
          expires_in: number
          refresh_token?: string
        }>(`${apiUrl}/auth/token-exchange`, {
          method: 'POST',
          body: {
            refreshToken: data.refresh_token,
            clientId: config.public.zitadelNativeClientId as string,
          },
        })
      } catch (err) {
        // A refused refresh token ends the session; an unreachable backend does not.
        if (isTokenExchangeRefusal(err)) return null
        throw new SilentRenewUnavailableError({ cause: err })
      }

      // Update stored tokens (use new refresh_token if rotated, else keep old)
      const tokenData: CapacitorTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
      }
      try {
        capacitorTokenCache = tokenData
        localStorage.setItem(CAPACITOR_TOKEN_KEY, JSON.stringify(tokenData))
      } catch {
        return null
      }

      return tokenData as unknown as OidcUser
    }
    const mgr = getUserManager()
    const existing = await mgr.getUser()
    if (!existing) return null // No session to renew
    try {
      const user = await mgr.signinSilent()
      oidcUser.value = user
      return user
    } catch (err) {
      if (!isRefusal(err)) throw new SilentRenewUnavailableError({ cause: err })
      /*
       * Zitadel refused the refresh token: wipe the stale user so subsequent getAccessToken() calls return null
       * instead of triggering an iframe storm against Zitadel.
       */
      try {
        await mgr.removeUser()
      } catch {
        /* Best-effort cleanup */
      }
      oidcUser.value = null
      return null
    }
  }

  /** Sign out via OIDC end-session endpoint (web only). */
  async function signOut() {
    const mgr = getUserManager()
    await mgr.signoutRedirect()
  }

  /** Capacitor: clear local tokens without browser redirect. */
  function logoutCapacitor() {
    capacitorTokenCache = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CAPACITOR_TOKEN_KEY)
    }
    oidcUser.value = null
  }

  /** Check if the user has a valid (non-expired) session. */
  async function isAuthenticated(): Promise<boolean> {
    if (isCapacitor) {
      const token = await getAccessToken()
      return token !== null
    }
    const mgr = getUserManager()
    const user = await mgr.getUser()
    return user !== null && !user.expired
  }

  /** Get the current OIDC user (from cache). */
  function getUser(): Promise<OidcUser | null> {
    const mgr = getUserManager()
    return mgr.getUser()
  }

  /** Clear stale OIDC session from storage (prevents automaticSilentRenew loops). */
  async function removeUser(): Promise<void> {
    const mgr = getUserManager()
    await mgr.removeUser()
  }

  return {
    oidcUser,
    signIn,
    getAuthRequestId,
    exchangeCodeForTokens,
    handleCallback,
    handleDeepLinkCallback,
    getAccessToken,
    silentRenew,
    signOut,
    logoutCapacitor,
    isAuthenticated,
    getUser,
    removeUser,
  }
}
