import {
  ErrorResponse,
  type User as OidcUser,
  UserManager,
  WebStorageStateStore,
} from 'oidc-client-ts'
import { SilentRenewUnavailableError, isSilentRenewUnavailable } from '~/utils/silentRenewError'
import { hasText, isRecord } from '~/utils/guards'
import { type Ref, ref } from 'vue'
import { useRuntimeConfig } from '#imports'

let userManager: UserManager | null = null
const oidcUser: Ref<OidcUser | null> = ref(null)

// Simple token storage for Capacitor (bypasses oidc-client-ts complexity)
const CAPACITOR_TOKEN_KEY = 'capacitor_oidc_tokens'

// In-memory cache: avoids any localStorage timing issues in WKWebView
let capacitorTokenCache: CapacitorTokens | null = null

/*
 * Module-scope coalescer for silent renewal. Every caller (middleware, plugins,
 * getAccessToken, accessTokenExpired event) routes through the same in-flight
 * promise. Zitadel rotates the refresh token on first use, so two concurrent
 * renews would race and the loser would be logged out mid-session.
 */
let silentRenewPromise: Promise<RenewedSession | null> | null = null

interface CapacitorTokens {
  access_token: string
  refresh_token?: string
  expires_at: number
}

/** What a renewal resolves with: the OIDC user on the web, the stored tokens on Capacitor. Callers read the token. */
interface RenewedSession {
  access_token: string
}

/** The part of oidc-client-ts's internal client that `getAuthRequestId` calls (not part of its public typings). */
interface SigninClient {
  createSigninRequest: (args: Record<string, never>) => Promise<{ url: string }>
}

const isSigninClient = (value: unknown): value is SigninClient =>
  isRecord(value) && typeof value.createSigninRequest === 'function'

const isCapacitorTokens = (value: unknown): value is CapacitorTokens =>
  isRecord(value) &&
  typeof value.access_token === 'string' &&
  typeof value.expires_at === 'number' &&
  (value.refresh_token === undefined || typeof value.refresh_token === 'string')

/** The Capacitor tokens kept in localStorage, or null when absent, unreadable or not a token record. */
const parseCapacitorTokens = (stored: string): CapacitorTokens | null => {
  try {
    const data: unknown = JSON.parse(stored)
    return isCapacitorTokens(data) ? data : null
  } catch {
    return null
  }
}

/*
 * OAuth error codes of a token endpoint that say "try again later", not "this refresh token is no good".
 */
const TRANSIENT_OAUTH_ERRORS = new Set(['server_error', 'temporarily_unavailable'])

/** oidc-client-ts words a non-2xx answer without an OAuth body as `Error("<statusText> (<status>): <body>")`. */
const TRANSIENT_HTTP_STATUS = /\((?:408|429|5\d\d)\)/u

const isOffline = (): boolean => typeof navigator !== 'undefined' && !navigator.onLine

/*
 * Could not get an answer from Zitadel, or it said "later": the session is kept (the refresh token may well be good)
 * and the renewal is not attempted again before the cooldown below is over. ONLY these are transient: a dropped
 * connection (fetch rejects with a TypeError), oidc-client-ts's `ErrorTimeout`, HTTP 408/429/5xx, the OAuth
 * `server_error` / `temporarily_unavailable`, and any failure while the browser reports being offline. Everything else
 * is definitive, because it will fail the same way next time and keeping the session would leave the staff member
 * "signed in" for ever with every request failing: Zitadel's refusals (invalid_grant...), oidc-client-ts's validation
 * errors (sub mismatch...), "No silent_redirect_uri configured" (a user without refresh token), an invalid
 * Content-Type and a 4xx without an OAuth body (a WAF 403, a misrouted 404).
 */
const isTransient = (err: unknown): boolean => {
  if (isOffline()) return true
  if (err instanceof ErrorResponse) return TRANSIENT_OAUTH_ERRORS.has(String(err.error))
  if (err instanceof TypeError) return true
  if (!(err instanceof Error)) return false
  return err.name === 'ErrorTimeout' || TRANSIENT_HTTP_STATUS.test(err.message)
}

/**
 * Did the backend's token-exchange answer that this refresh token is refused? A client error (400, 401, 403...) is a
 * refusal; no answer at all (offline, a timeout), a server error, a timeout (408) or a rate limit (429) is not.
 */
const isTokenExchangeRefusal = (err: unknown): boolean => {
  if (isOffline()) return false
  const status = isRecord(err) ? err.status : undefined
  const code = status ?? (isRecord(err) ? err.statusCode : undefined)
  return typeof code === 'number' && code >= 400 && code < 500 && code !== 408 && code !== 429
}

/*
 * Cooldown: after a transient failure no new renewal is attempted for this long. Every authenticated request renews
 * once on its token and once more on the 401 that follows, the assistant page polls every 2 s and on Capacitor each
 * renewal is a POST to the rate-limited `/auth/token-exchange` (per IP, shared by all the tablets of a restaurant), so
 * during an outage they would hammer Zitadel / the backend and keep it from recovering. Requests fail fast with the
 * same "unavailable" error instead. Fixed 30 s (the same as tsb-core), ended early when the browser comes back online.
 */
const RENEW_COOLDOWN_MS = 30_000
let renewBlockedUntil = 0
// Why the last renewal could not be made, until a renewal succeeds or ends the session (NOT cleared by the cooldown).
let renewBlockedBy: unknown = null
let onlineListenerAdded = false

function blockRenewals(cause: unknown): SilentRenewUnavailableError {
  renewBlockedUntil = Date.now() + RENEW_COOLDOWN_MS
  renewBlockedBy = cause
  // The network is back: no reason to wait out the cooldown.
  if (!onlineListenerAdded && typeof window !== 'undefined') {
    onlineListenerAdded = true
    window.addEventListener('online', () => {
      renewBlockedUntil = 0
    })
  }
  return new SilentRenewUnavailableError({ cause })
}

/** A new session starts or the session was dropped on purpose: nothing from the previous one is held against it. */
function forgetRenewalFailure() {
  renewBlockedUntil = 0
  renewBlockedBy = null
}

function assertRenewalsAllowed() {
  if (Date.now() < renewBlockedUntil) {
    throw new SilentRenewUnavailableError({ cause: renewBlockedBy })
  }
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

    const localeSegment =
      typeof window === 'undefined' ? undefined : window.location.pathname.split('/')[1]
    const locale = hasText(localeSegment) ? localeSegment : 'fr'

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
      const baseUrl = (config.public.dashboardBaseUrl as string).replace(/\/+$/u, '')
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
    // `_client` is internal to oidc-client-ts: read it by name and check its shape instead of casting.
    const client: unknown = Reflect.get(mgr, '_client')
    if (!isSigninClient(client)) throw new Error('oidc-client-ts has no signin client')
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
      if (hasText(stateStr)) {
        try {
          const stateData: unknown = JSON.parse(stateStr)
          const verifier = isRecord(stateData) ? stateData.code_verifier : undefined
          if (typeof verifier === 'string' && verifier !== '') {
            codeVerifier = verifier
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
    forgetRenewalFailure()
  }

  /** Complete the OIDC callback (web only: exchange code for tokens). */
  async function handleCallback(): Promise<OidcUser> {
    const mgr = getUserManager()
    const user = await mgr.signinRedirectCallback()
    forgetRenewalFailure()
    oidcUser.value = user
    return user
  }

  /** Capacitor: process deep link callback URL. */
  async function handleDeepLinkCallback(url: string): Promise<OidcUser> {
    const mgr = getUserManager()
    const user = await mgr.signinRedirectCallback(url)
    forgetRenewalFailure()
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
      if (hasText(stored)) {
        // Invalid data is skipped.
        const data = parseCapacitorTokens(stored)
        if (data !== null && data.expires_at > now) {
          capacitorTokenCache = data
          return data.access_token
        }
      }
    }

    try {
      // Capacitor: token expired, attempt refresh
      if (isCapacitor) {
        const renewed = await silentRenew()
        return renewed?.access_token ?? null
      }
      // Web: use oidc-client-ts UserManager
      const mgr = getUserManager()
      const user = await mgr.getUser()
      if (user && user.expired !== true) return user.access_token
      if (!user) return null // No session, nothing to renew

      /*
       * Token expired, so route through the coalesced silentRenew so concurrent
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
   * promise so we never use the same refresh token twice in parallel,
   * Zitadel rotates on first use and would log the loser out.
   *
   * Resolves the renewed user, or `null` when the session is over (nothing to
   * renew, or Zitadel refused the refresh token: the stale user is wiped).
   * Rejects with `SilentRenewUnavailableError` when Zitadel could not be
   * reached (offline, timeout, 408/429/5xx): the session is NOT touched, the
   * caller keeps the staff member signed in and does not send them to the login page.
   * For 30 s after such a failure it rejects at once, without a call.
   */
  function silentRenew(): Promise<RenewedSession | null> {
    silentRenewPromise ??= doSilentRenew().finally(() => {
      silentRenewPromise = null
    })
    return silentRenewPromise
  }

  async function doSilentRenew(): Promise<RenewedSession | null> {
    const outcome = await attemptRenewal()
    // Renewed, or the session is over: whatever kept the renewal from being made is behind us.
    renewBlockedBy = null
    return outcome
  }

  /**
   * True while the session is kept but could not be renewed because Zitadel / the backend is unreachable (until a
   * renewal succeeds or ends the session). For callers that must tell "no token because the session is over" from "no
   * token right now" (the live-updates WebSocket keeps retrying in the second case only).
   */
  function isRenewalUnavailable(): boolean {
    return renewBlockedBy !== null
  }

  async function attemptRenewal(): Promise<RenewedSession | null> {
    if (isCapacitor) {
      // Read stored refresh token
      const stored = localStorage.getItem(CAPACITOR_TOKEN_KEY)
      if (!hasText(stored)) return null
      const data = parseCapacitorTokens(stored)
      if (data === null) return null
      const { refresh_token: refreshToken } = data
      if (!hasText(refreshToken)) return null
      assertRenewalsAllowed()

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
            refreshToken,
            clientId: config.public.zitadelNativeClientId as string,
          },
        })
      } catch (err) {
        // A refused refresh token ends the session; an unreachable backend does not.
        if (isTokenExchangeRefusal(err)) return null
        throw blockRenewals(err)
      }

      // Update stored tokens (use new refresh_token if rotated, else keep old)
      const tokenData: CapacitorTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
      }
      try {
        capacitorTokenCache = tokenData
        localStorage.setItem(CAPACITOR_TOKEN_KEY, JSON.stringify(tokenData))
      } catch {
        return null
      }

      return tokenData
    }
    const mgr = getUserManager()
    const existing = await mgr.getUser()
    if (!existing) return null // No session to renew
    // Without a refresh token oidc-client-ts would try a hidden iframe, which this app does not configure: no way back.
    if (!hasText(existing.refresh_token)) return endSession(mgr)
    assertRenewalsAllowed()
    try {
      const user = await mgr.signinSilent()
      oidcUser.value = user
      return user
    } catch (err) {
      if (isTransient(err)) throw blockRenewals(err)
      return endSession(mgr)
    }
  }

  /*
   * The session cannot be renewed any more: wipe the stale user so subsequent getAccessToken() calls return null
   * instead of triggering an iframe storm against Zitadel.
   */
  async function endSession(mgr: UserManager): Promise<null> {
    try {
      await mgr.removeUser()
    } catch {
      /* Best-effort cleanup */
    }
    oidcUser.value = null
    return null
  }

  /** Sign out via OIDC end-session endpoint (web only). */
  async function signOut() {
    forgetRenewalFailure()
    const mgr = getUserManager()
    await mgr.signoutRedirect()
  }

  /** Capacitor: clear local tokens without browser redirect. */
  function logoutCapacitor() {
    forgetRenewalFailure()
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
    return user !== null && user.expired !== true
  }

  /** Get the current OIDC user (from cache). */
  function getUser(): Promise<OidcUser | null> {
    const mgr = getUserManager()
    return mgr.getUser()
  }

  /** Clear stale OIDC session from storage (prevents automaticSilentRenew loops). */
  async function removeUser(): Promise<void> {
    forgetRenewalFailure()
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
    isRenewalUnavailable,
    signOut,
    logoutCapacitor,
    isAuthenticated,
    getUser,
    removeUser,
  }
}
