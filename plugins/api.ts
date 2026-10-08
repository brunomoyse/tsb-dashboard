// Plugins/api.ts: OIDC Bearer token authentication via Zitadel
import {
  defineNuxtPlugin,
  navigateTo,
  useCookie,
  useLocalePath,
  useRequestEvent,
  useRuntimeConfig,
} from '#imports'
import type { NitroFetchOptions } from 'nitropack/types'
import { rememberCurrentPage } from '~/utils/authReturn'
import { isSilentRenewUnavailable } from '~/utils/silentRenewError'
import { hasText, isRecord } from '~/utils/guards'

export type ApiFetch = <T>(request: string, options?: NitroFetchOptions<string>) => Promise<T>

// Explicit injection type: inferring it from the body is circular (the body's
// Types depend on NuxtApp, which includes this plugin's injection).
export default defineNuxtPlugin<{ api: ApiFetch }>(() => {
  const config = useRuntimeConfig()
  const apiUrl: string = config.public.api
  const userLocale = useCookie('i18n_redirected').value ?? 'fr'
  const localePath = useLocalePath()

  /** Get access token from OIDC client (client-side only: the callers only ask for it in the browser). */
  const getOidcToken = async (): Promise<string | null> => {
    const { useOidc } = await import('~/composables/useOidc')
    const { getAccessToken } = useOidc()
    return getAccessToken()
  }

  /** Attempt silent OIDC token renewal (coalesced inside useOidc). */
  const refreshAuth = async (): Promise<boolean> => {
    const { useOidc } = await import('~/composables/useOidc')
    const { silentRenew } = useOidc()
    const user = await silentRenew()
    return Boolean(user)
  }

  const baseApi = $fetch.create<unknown, string>({
    baseURL: apiUrl,
    credentials: 'omit', // No cookies, we use Bearer tokens
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Language': userLocale,
    },
    async onRequest({ options }) {
      // A multipart body needs the boundary the runtime generates for it: the default JSON Content-Type above would
      // make the server read an upload (product image) as JSON.
      if (options.body instanceof FormData) options.headers.delete('Content-Type')

      if (import.meta.server) {
        // SSR: forward cookies for Accept-Language if available
        const event = useRequestEvent()
        const serverLocale = useCookie('i18n_redirected').value ?? 'fr'
        const cookies = event?.node.req.headers.cookie

        if (hasText(cookies)) {
          options.headers.set('cookie', cookies)
          options.headers.set('Accept-Language', serverLocale)
        }
      } else {
        // Client-side: attach Bearer token from OIDC
        const token = await getOidcToken()
        if (hasText(token)) {
          options.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    },
  })

  // Wrapper that handles 401 retry externally (onResponseError return values are ignored by ofetch)
  const api: ApiFetch = async <T>(
    request: string,
    options?: NitroFetchOptions<string>,
  ): Promise<T> => {
    try {
      return await baseApi<T, string>(request, options)
    } catch (err: unknown) {
      if (!import.meta.server && isRecord(err) && err.status === 401) {
        let ok: boolean
        try {
          ok = await refreshAuth()
        } catch (renewErr: unknown) {
          // Zitadel could not be reached: the session is kept, no login redirect, this request fails and the next one
          // renews again.
          if (isSilentRenewUnavailable(renewErr)) throw err
          throw renewErr
        }
        if (ok) return baseApi<T, string>(request, options)
        rememberCurrentPage()
        void navigateTo(`${localePath('auth-login')}?session=expired`)
      }
      throw err
    }
  }

  return { provide: { api } }
})
