import { defineNuxtPlugin, navigateTo, useCookie, useLocalePath, useRequestEvent, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig();
    const localePath = useLocalePath()
    const apiUrl: string = config.public.api as string;
    const userLocale = useCookie('i18n_redirected').value ?? 'fr';

    const api = $fetch.create({
        baseURL: apiUrl,
        credentials: 'include',
        retry: 1,
        retryStatusCodes: [401],
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': userLocale
        },
        onRequest({ options }) {
            // Server-side cookie forwarding
            if (import.meta.server) {
                const event = useRequestEvent()
                const cookies = event?.node.req.headers.cookie
                const serverLocale = useCookie('i18n_redirected').value ?? 'fr'

                if (cookies) {
                    options.headers = {
                        ...options.headers,
                        // @ts-expect-error spreading HeadersInit may cause type issues with modifying headers
                        cookie: cookies,
                        'Accept-Language': serverLocale
                    }
                }
            }
        },
        async onResponseError({ response, request, options }) {
            if (response.status === 401 &&
                !request.toString().includes('/tokens/refresh') &&
                !request.toString().includes('login')) {
                try {
                    if (!import.meta.server) {
                        // Client-side handling
                        await $fetch(`${apiUrl}/tokens/refresh`, {
                            method: 'POST',
                            credentials: 'include'
                        })
                        // @ts-expect-error request and options have incompatible types
                        return $fetch(request, options)
                    }
                } catch {
                    try {
                        await $fetch(`${apiUrl}/logout`, {
                            method: 'POST',
                            credentials: 'include'
                        })
                    } catch { /* Ignore logout errors */ }
                    navigateTo(localePath('login'))
                }
            }
        }
    })

    return { provide: { api } }
})
