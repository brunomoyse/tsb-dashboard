import { useRuntimeConfig } from '#imports'

interface SessionResponse {
    sessionId: string
    sessionToken: string
}

interface FinalizeResponse {
    callbackUrl: string
}

/**
 * Calls tsb-service auth proxy endpoints which forward to Zitadel's Session API.
 * The proxy adds the service account PAT — the frontend never touches Zitadel directly.
 * Dashboard-specific: only includes login-related methods (no registration, password reset, etc.)
 */
export function useZitadelApi() {
    const config = useRuntimeConfig()
    const apiUrl = config.public.api as string

    /** Create a session with email + password (login via proxy). */
    function createSession(loginName: string, password: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/session`, {
            method: 'POST',
            body: { loginName, password },
        })
    }

    /** Finalize the OIDC auth request after successful session creation (via proxy). */
    function finalizeOidcAuth(authRequestId: string, sessionId: string, sessionToken: string): Promise<FinalizeResponse> {
        return $fetch<FinalizeResponse>(`${apiUrl}/auth/finalize`, {
            method: 'POST',
            body: { authRequestId, sessionId, sessionToken },
        })
    }

    return {
        createSession,
        finalizeOidcAuth,
    }
}
