import { useRuntimeConfig } from '#imports'

interface SessionResponse {
    sessionId: string
    sessionToken: string
}

/**
 * Wraps Zitadel's Session API for custom login pages.
 * These calls go directly to the Zitadel instance (not through tsb-service).
 * Dashboard-specific: only includes login-related methods (no registration, password reset, etc.)
 */
export function useZitadelApi() {
    const config = useRuntimeConfig()
    const authority = config.public.zitadelAuthority as string

    /** Create a session with email + password (login). */
    async function createSession(loginName: string, password: string): Promise<SessionResponse> {
        const res = await $fetch<{
            sessionId: string
            sessionToken: string
        }>(`${authority}/v2/sessions`, {
            method: 'POST',
            body: {
                checks: {
                    user: { loginName },
                    password: { password },
                },
            },
        })
        return { sessionId: res.sessionId, sessionToken: res.sessionToken }
    }

    /** Finalize the OIDC auth request after successful session creation. */
    async function finalizeOidcAuth(authRequestId: string, sessionId: string, sessionToken: string): Promise<{ callbackUrl: string }> {
        const res = await $fetch<{ callbackUrl: string }>(`${authority}/v2/oidc/authorize`, {
            method: 'POST',
            body: {
                authRequestId,
                session: {
                    sessionId,
                    sessionToken,
                },
            },
        })
        return res
    }

    return {
        createSession,
        finalizeOidcAuth,
    }
}
