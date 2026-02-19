// composables/useGqlSubscription.ts
import { ref, onScopeDispose } from 'vue'
import { print, type DocumentNode } from 'graphql'
import { useRuntimeConfig, useCookie } from '#imports'
import type { Client } from 'graphql-ws'

let wsClient: Client | null = null
let wsClientPromise: Promise<Client> | null = null

async function getWsClient(): Promise<Client> {
    if (wsClient) return wsClient
    if (!wsClientPromise) {
        wsClientPromise = import('graphql-ws').then(({ createClient }) => {
            const cfg = useRuntimeConfig()
            const client = createClient({
                url:              cfg.public.graphqlWs as string,
                connectionParams: () => {
                    const token = useCookie('access_token').value
                    return token ? { Authorization: `Bearer ${token}` } : {}
                },
                retryAttempts:    Infinity,
            })
            wsClient = client
            return client
        })
    }
    return wsClientPromise
}

export function useGqlSubscription<T = any>(
    rawSub: string | DocumentNode,
    variables: Record<string, unknown> = {}
) {
    const data      = ref<T>()
    const error     = ref<Error | null>(null)
    let stop: () => void = () => {}

    // --------------------------------------------------
    // track if we’ve genuinely gone offline
    let wentOffline = false

    function handleOffline() {
        wentOffline = true
        error.value  = new Error('Lost internet connection')
        stop()
    }

    function handleOnline() {
        if (!wentOffline) return
        // only reload if we truly were offline
        window.location.reload()
    }
    // --------------------------------------------------

    if (import.meta.client) {
        // initial subscription
        getWsClient()
            .then(client => {
                stop = client.subscribe(
                    {
                        query:     typeof rawSub === 'string' ? rawSub : print(rawSub),
                        variables,
                    },
                    {
                        next:    msg => {
                            if (msg.data !== undefined) data.value = msg.data as T
                        },
                        error:   e => {
                            error.value = e instanceof Error ? e : new Error(String(e))
                        },
                        complete: () => {},
                    }
                )
            })
            .catch(e => {
                error.value = e instanceof Error ? e : new Error(String(e))
            })

        // listen for real offline/online transitions
        window.addEventListener('offline', handleOffline)
        window.addEventListener('online',  handleOnline)
    }

    onScopeDispose(() => {
        stop()
        window.removeEventListener('offline', handleOffline)
        window.removeEventListener('online',  handleOnline)
    })

    function closeAll() {
        wsClient?.dispose()
        wsClient = null
        wsClientPromise = null
    }

    return {
        data,
        error,
        stop,
        closeAll,
    }
}
