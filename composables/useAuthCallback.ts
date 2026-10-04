import { navigateTo, useLocalePath, useNuxtApp } from '#imports'
import type { User } from '@/types'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useAuthStore } from '@/stores/auth'
import { useOidc } from '~/composables/useOidc'
import { consumeReturnTo } from '~/utils/authReturn'

const ME = gql`
  query {
    me {
      id
      email
      firstName
      lastName
      phoneNumber
      isAdmin
      address {
        id
        streetName
        houseNumber
        municipalityName
        postcode
        distance
      }
    }
  }
`

/**
 * Shared post-login steps used by both pages/auth/login.vue (Capacitor direct
 * exchange) and pages/auth/callback.vue (web + Capacitor deep-link).
 * Fetches the current user, enforces the admin gate, stores it, and navigates
 * to the dashboard home.
 */
export function useAuthCallback() {
  const authStore = useAuthStore()
  const localePath = useLocalePath()
  const { $gqlFetch } = useNuxtApp() as unknown as {
    $gqlFetch: <T>(query: string) => Promise<T>
  }

  async function processCallback(): Promise<{ ok: boolean; reason?: 'not_admin' }> {
    // Ensure the access token is loaded before hitting the API
    const { getAccessToken } = useOidc()
    await getAccessToken()

    // Read once, whatever the outcome below: a stale path must not send the next login somewhere unexpected.
    const returnTo = consumeReturnTo()

    const data = await $gqlFetch<{ me: User }>(print(ME))
    if (!data?.me) {
      return { ok: false }
    }

    if (!data.me.isAdmin) {
      authStore.clearUser()
      return { ok: false, reason: 'not_admin' }
    }

    authStore.setUser(data.me)
    // Back to the page the session ended on (kept by the middleware / the API plugins), else the orders board.
    await navigateTo(returnTo ?? localePath('orders'))
    return { ok: true }
  }

  return { processCallback }
}
