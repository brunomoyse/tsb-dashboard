// Middleware: auth.global.ts — OIDC session management via Zitadel
import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useLocalePath } from '#imports'
import { rememberReturnTo } from '~/utils/authReturn'
import { isSilentRenewUnavailable } from '~/utils/silentRenewError'

export default defineNuxtRouteMiddleware(async (to) => {
  // Public pages skip auth check
  if (to.meta.public === true) return

  const localePath = useLocalePath()

  // Server-side: cannot check OIDC session (managed client-side by oidc-client-ts).
  // Let SSR pass through — client-side will handle auth check on hydration.
  if (import.meta.server) return

  // Client-side: check OIDC session
  const { useOidc } = await import('~/composables/useOidc')
  const { isAuthenticated, silentRenew } = useOidc()

  // 1. Check if user has a valid OIDC session
  if (await isAuthenticated()) return

  // 2. Attempt silent renewal
  try {
    const renewed = await silentRenew()
    if (renewed) return
  } catch (err) {
    // Zitadel could not be reached (offline): the session is intact, only its token is expired. Let the staff member
    // through rather than to the login page: the page's own requests renew it as soon as the network is back.
    if (isSilentRenewUnavailable(err)) return
    throw err
  }

  // 3. No valid session — redirect to dashboard's own login page.
  //    (Don't call signIn() which would redirect to Zitadel's custom login URI on the core app domain.)
  rememberReturnTo(to.fullPath)
  return navigateTo(localePath('auth-login'))
})
