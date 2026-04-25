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
 * Dashboard-specific: only includes login-related methods.
 */
export function useZitadelApi() {
    const config = useRuntimeConfig()
    const apiUrl = config.public.api as string

    /** Detect current locale from URL path (safe outside Vue setup context). */
    function getLang(): string {
        if (typeof window !== 'undefined') {
            return window.location.pathname.split('/')[1] || 'fr'
        }
        return 'fr'
    }

    /** Step 1: request an OTP — creates a Zitadel session and emails a 6-digit code. */
    function requestOtpLogin(loginName: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/session/otp/request`, {
            method: 'POST',
            body: { loginName, lang: getLang() },
        })
    }

    /** Step 2: verify the OTP code; returns a fresh sessionToken with otpEmail check fulfilled. */
    function verifyOtpLogin(sessionId: string, sessionToken: string, code: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/session/otp/verify`, {
            method: 'POST',
            body: { sessionId, sessionToken, code },
        })
    }

    /** Re-issue a fresh OTP code for an existing pending session. */
    function resendOtpLogin(sessionId: string, sessionToken: string): Promise<{ success: true }> {
        return $fetch<{ success: true }>(`${apiUrl}/auth/session/otp/resend`, {
            method: 'POST',
            body: { sessionId, sessionToken, lang: getLang() },
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
        requestOtpLogin,
        verifyOtpLogin,
        resendOtpLogin,
        finalizeOidcAuth,
    }
}
