import { type User as OidcUser, UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { type Ref, ref } from 'vue'
import { useRuntimeConfig } from '#imports'

let userManager: UserManager | null = null
const oidcUser: Ref<OidcUser | null> = ref(null)

// Simple token storage for Capacitor (bypasses oidc-client-ts UserManager complexity)
const CAPACITOR_TOKEN_KEY = 'capacitor_oidc_tokens'

// In-memory cache — avoids any localStorage timing issues in WebView
let capacitorTokenCache: CapacitorTokens | null = null

interface CapacitorTokens {
    access_token: string
    refresh_token?: string
    expires_at: number
}

/**
 * Provides OIDC Authorization Code + PKCE flow via oidc-client-ts.
 * On Capacitor (Android/iOS), token storage/retrieval uses a simple localStorage key
 * instead of oidc-client-ts's UserManager (which has complex validation unsuited to
 * the Session API + authorize-proxy flow used here).
 */
export function useOidc() {
    const config = useRuntimeConfig()
    const isCapacitor = config.public.appBuild === 'capacitor'

    function getUserManager(): UserManager {
        if (userManager) return userManager

        const locale = typeof window === 'undefined'
            ? 'fr'
            : window.location.pathname.split('/')[1] || 'fr'

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
                automaticSilentRenew: true,
                silentRequestTimeoutInSeconds: 5,
                // Persist tokens across tabs and browser close; Zitadel enforces the 7-day idle expiry.
                userStore: new WebStorageStateStore({ store: localStorage }),
                stateStore: new WebStorageStateStore({ store: localStorage }),
            })
        }

        userManager.events.addUserLoaded((user) => { oidcUser.value = user })
        userManager.events.addUserUnloaded(() => { oidcUser.value = null })

        userManager.events.addAccessTokenExpired(async () => {
            try {
                await userManager!.signinSilent()
            } catch {
                const { useAuthStore } = await import('~/stores/auth')
                useAuthStore().clearUser()
                window.location.href = `/${locale}/auth/login?session=expired`
            }
        })

        userManager.events.addSilentRenewError(async () => {
            const { useAuthStore } = await import('~/stores/auth')
            useAuthStore().clearUser()
            window.location.href = `/${locale}/auth/login?session=expired`
        })

        return userManager
    }

    /** Start the OIDC authorize redirect (web only — goes to Zitadel). */
    async function signIn(extraParams?: Record<string, string>) {
        const mgr = getUserManager()
        await mgr.signinRedirect({ extraQueryParams: extraParams })
    }

    /**
     * Get authRequestID from Zitadel without a browser redirect.
     * Creates the OIDC authorize URL, sends it to the backend proxy which follows
     * the redirect server-side and extracts the authRequestID.
     */
    async function getAuthRequestId(): Promise<string> {
        const mgr = getUserManager()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = (mgr as any)._client
        const signinRequest = await client.createSigninRequest({})

        const apiUrl = config.public.api as string
        const response = await $fetch<{ authRequestId: string }>(
            `${apiUrl}/auth/authorize-proxy`,
            { method: 'POST', body: { authorizeUrl: signinRequest.url } },
        )

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
                } catch { /* Skip invalid entries */ }
            }
        }

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

        const tokenData: CapacitorTokens = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
        }
        capacitorTokenCache = tokenData
        localStorage.setItem(CAPACITOR_TOKEN_KEY, JSON.stringify(tokenData))
    }

    /** Complete the OIDC callback (web — exchange code via oidc-client-ts). */
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

    /** Try to load a valid token from localStorage into capacitorTokenCache. Returns the token if found. */
    function loadCachedCapacitorToken(now: number): string | null {
        if (typeof localStorage === 'undefined') return null
        const stored = localStorage.getItem(CAPACITOR_TOKEN_KEY)
        if (!stored) return null
        try {
            const data: CapacitorTokens = JSON.parse(stored)
            if (data.expires_at > now) {
                capacitorTokenCache = data
                return data.access_token
            }
        } catch { /* Invalid data */ }
        return null
    }

    /** Get the current access token (or null if not authenticated). */
    async function getAccessToken(): Promise<string | null> {
        if (isCapacitor) {
            const now = Math.floor(Date.now() / 1000)
            if (capacitorTokenCache && capacitorTokenCache.expires_at > now) {
                return capacitorTokenCache.access_token
            }

            const cached = loadCachedCapacitorToken(now)
            if (cached) return cached

            const renewed = await silentRenew()
            return renewed ? capacitorTokenCache?.access_token ?? null : null
        }

        const mgr = getUserManager()
        const user = await mgr.getUser()
        if (user && !user.expired) return user.access_token
        if (!user) return null

        try {
            const renewed = await mgr.signinSilent()
            if (renewed) {
                oidcUser.value = renewed
                return renewed.access_token
            }
        } catch { /* Silent renew failed */ }
        return null
    }

    /** Attempt silent token renewal. */
    async function silentRenew(): Promise<OidcUser | null> {
        if (isCapacitor) {
            const stored = typeof localStorage === 'undefined'
                ? null
                : localStorage.getItem(CAPACITOR_TOKEN_KEY)
            if (!stored) return null
            try {
                const data: CapacitorTokens = JSON.parse(stored)
                if (!data.refresh_token) return null

                const apiUrl = config.public.api as string
                const tokens = await $fetch<{
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

                const tokenData: CapacitorTokens = {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token ?? data.refresh_token,
                    expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
                }
                capacitorTokenCache = tokenData
                localStorage.setItem(CAPACITOR_TOKEN_KEY, JSON.stringify(tokenData))

                return tokenData as unknown as OidcUser
            } catch {
                return null
            }
        }

        const mgr = getUserManager()
        const existing = await mgr.getUser()
        if (!existing) return null
        try {
            const user = await mgr.signinSilent()
            oidcUser.value = user
            return user
        } catch {
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

    /** Get the current OIDC user (web — from oidc-client-ts cache). */
    function getUser(): Promise<OidcUser | null> {
        const mgr = getUserManager()
        return mgr.getUser()
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
    }
}
