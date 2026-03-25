// Middleware: auth.global.ts — OIDC session management via Zitadel
import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useLocalePath } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
    // Public pages skip auth check
    if (to.meta.public === true) return

    const localePath = useLocalePath()

    // Server-side: cannot check OIDC session (managed client-side by oidc-client-ts).
    // Let SSR pass through — client-side will handle auth check on hydration.
    if (import.meta.server) return

    // Client-side: check OIDC session
    const { useOidc } = await import('~/composables/useOidc')
    const { isAuthenticated, silentRenew, signIn } = useOidc()

    // 1. Check if user has a valid OIDC session
    if (await isAuthenticated()) return

    // 2. Attempt silent renewal
    const renewed = await silentRenew()
    if (renewed) return

    // 3. No valid session — redirect to Zitadel login via OIDC authorize
    try {
        await signIn({ ui_locales: to.path.split('/')[1] || 'fr' })
    } catch {
        // Fallback: navigate to login page directly
        return navigateTo(localePath('auth-login'))
    }
})
