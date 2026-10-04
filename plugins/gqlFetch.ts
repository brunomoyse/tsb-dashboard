// Plugins: gqlFetch.ts — OIDC Bearer token authentication via Zitadel
import { type DocumentNode, print } from 'graphql'
import {
  defineNuxtPlugin,
  navigateTo,
  useCookie,
  useLocalePath,
  useRequestEvent,
  useRuntimeConfig,
} from '#imports'
import { rememberCurrentPage } from '~/utils/authReturn'
import { isSilentRenewUnavailable } from '~/utils/silentRenewError'

interface GqlOptions {
  variables?: Record<string, unknown>
  signal?: AbortSignal
}

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig()
  const httpURL = cfg.public.graphqlHttp
  const localePath = useLocalePath()

  /** Get access token from OIDC client (client-side only) */
  const getOidcToken = async (): Promise<string | null> => {
    if (import.meta.server) return null
    const { useOidc } = await import('~/composables/useOidc')
    const { getAccessToken } = useOidc()
    return getAccessToken()
  }

  /** Typed helper: POST /graphql with Bearer token */
  const gqlFetch = async <T = unknown>(
    query: string | DocumentNode,
    { variables = {}, signal }: GqlOptions = {},
  ): Promise<T> => {
    const body = {
      query: typeof query === 'string' ? query : print(query),
      variables,
    }

    let res: { data?: unknown; errors?: { extensions?: { code?: string }; message?: string }[] }

    // 1) Try the HTTP-level fetch (and 401→refresh→retry)
    try {
      res = await doFetch(body, signal)
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 401
      ) {
        const ok = await attemptRefresh()
        if (ok) {
          res = await doFetch(body, signal)
        } else {
          throw err
        }
      } else {
        throw err
      }
    }

    // 2) Handle GraphQL-level errors
    if (res.errors?.length) {
      const unauth = res.errors.find((e) => e.extensions?.code === 'UNAUTHENTICATED')
      if (unauth) {
        const ok = await attemptRefresh()
        if (ok) {
          res = await doFetch(body, signal)
          if (res.errors?.length) {
            throw res.errors
          }
          return res.data as T
        }
      }
      throw res.errors
    }

    return res.data as T
  }

  /** Low-level POST that returns the raw { data, errors } */
  const doFetch = async (
    body: { query: string; variables: Record<string, unknown> },
    signal?: AbortSignal,
  ): Promise<{
    data?: unknown
    errors?: { extensions?: { code?: string }; message?: string }[]
  }> => {
    const userLocale = useCookie('i18n_redirected').value ?? 'fr'
    return $fetch<
      { data?: unknown; errors?: { extensions?: { code?: string }; message?: string }[] },
      string
    >(httpURL, {
      method: 'POST',
      body,
      credentials: 'omit',
      signal,
      headers: await buildHeaders(userLocale),
    })
  }

  /** Build the JSON headers + attach Bearer token or forward cookies for SSR */
  const buildHeaders = async (locale: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': locale,
    }
    if (import.meta.server) {
      // SSR: forward cookies if available (for Accept-Language, session context)
      const ev = useRequestEvent()
      const cook = ev?.node.req.headers.cookie
      if (cook) headers.cookie = cook
    } else {
      // Client-side: attach OIDC Bearer token
      const token = await getOidcToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }
    return headers
  }

  /**
   * Attempt OIDC silent renewal (coalesced inside useOidc). `silentRenew` does not reject for a dead session: it wipes
   * it and resolves `null`, which is the usual way a session ends: the staff member is sent back to log in (as `$api`
   * does), the page they were on being kept as the return path. When Zitadel cannot be reached (offline) it rejects
   * with `SilentRenewUnavailableError` instead: the session is kept, the staff member stays where they are, this
   * request fails, and the next one renews again.
   */
  const attemptRefresh = async (): Promise<boolean> => {
    if (import.meta.server) return false
    try {
      const { useOidc } = await import('~/composables/useOidc')
      const { silentRenew } = useOidc()
      if (await silentRenew()) return true
    } catch (err: unknown) {
      if (isSilentRenewUnavailable(err)) return false
      // An unexpected failure of the renewal is treated as a dead session too.
    }
    rememberCurrentPage()
    void navigateTo(`${localePath('auth-login')}?session=expired`)
    return false
  }

  return { provide: { gqlFetch } }
})
