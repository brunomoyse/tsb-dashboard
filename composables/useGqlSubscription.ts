// Composables/useGqlSubscription.ts
import { type DocumentNode, print } from 'graphql'
import { onScopeDispose, ref } from 'vue'
import type { Client } from 'graphql-ws'
import { useRuntimeConfig } from '#imports'

let wsClient: Client | null = null
let wsClientPromise: Promise<Client> | null = null

/*
 * Dispose the shared client without scheduling reconnects. Called from a
 * `pagehide` handler so the server sees a clean WS close frame on tab close
 * or navigation, instead of an abrupt TCP close that cancels in-flight
 * resolvers and produces lib/pq "canceling statement" errors.
 */
const disposeSharedClient = () => {
    wsClient?.dispose()
    wsClient = null
    wsClientPromise = null
}

let globalListenersBound = false
const ensureGlobalListeners = () => {
    if (globalListenersBound || !import.meta.client) return
    globalListenersBound = true
    window.addEventListener('pagehide', disposeSharedClient)
}

const getWsClient = (): Promise<Client> => {
    if (wsClient) return Promise.resolve(wsClient)
    if (!wsClientPromise) {
        wsClientPromise = Promise.all([
            import('graphql-ws'),
            import('~/composables/useOidc'),
        ]).then(([{ createClient }, { useOidc }]) => {
            const cfg = useRuntimeConfig()
            const { getAccessToken } = useOidc()

            /*
             * `keepAlive` only schedules pings — detection of a dead server
             * requires our own pong watchdog. Track the active socket so we
             * can force-close it when the server stops responding.
             */
            let activeSocket: WebSocket | null = null
            let pongTimer: ReturnType<typeof setTimeout> | null = null

            const client = createClient({
                url: cfg.public.graphqlWs as string,
                connectionParams: async () => {
                    const token = await getAccessToken()
                    return token ? { Authorization: `Bearer ${token}` } : {}
                },
                /*
                 * Ping every 12s; with the pong watchdog below, dropped
                 * connections (network blip, proxy idle timeout) surface
                 * within ~17s instead of waiting for the next outbound msg.
                 */
                keepAlive: 12_000,
                on: {
                    connected: (socket) => { activeSocket = socket as WebSocket },
                    closed: () => {
                        if (pongTimer) { clearTimeout(pongTimer); pongTimer = null }
                        activeSocket = null
                    },
                    ping: (received) => {
                        if (received) return
                        if (pongTimer) clearTimeout(pongTimer)
                        pongTimer = setTimeout(() => {
                            if (activeSocket?.readyState === WebSocket.OPEN) {
                                activeSocket.close(4408, 'Pong timeout')
                            }
                        }, 5_000)
                    },
                    pong: (received) => {
                        if (received && pongTimer) {
                            clearTimeout(pongTimer)
                            pongTimer = null
                        }
                    },
                },
                retryAttempts: Infinity,
                retryWait: async (retries) => {
                    const delay = Math.min(1000 * 2 ** retries, 30_000)
                    await new Promise<void>(resolve => { setTimeout(resolve, delay) })
                    // If no valid token after refresh attempt, stop retrying
                    const token = await getAccessToken()
                    if (!token) throw new Error('No valid auth token')
                },
            })
            wsClient = client
            return client
        })
    }
    return wsClientPromise
}

export function useGqlSubscription<T = unknown>(
    rawSub: string | DocumentNode,
    variables: Record<string, unknown> = {}
) {
    const data      = ref<T>()
    const error     = ref<Error | null>(null)
    let stop: () => void = () => {}

    // Track if we've genuinely gone offline
    let wentOffline = false

    const startSubscription = () => {
        getWsClient()
            .then((client) => {
                stop = client.subscribe(
                    {
                        query: typeof rawSub === 'string' ? rawSub : print(rawSub),
                        variables,
                    },
                    {
                        next: (msg) => {
                            if (msg.data !== undefined) data.value = msg.data as T
                        },
                        error: (e) => {
                            error.value = e instanceof Error ? e : new Error(String(e))
                        },
                        complete: () => {},
                    }
                )
            })
            .catch((e) => {
                error.value = e instanceof Error ? e : new Error(String(e))
            })
    }

    const handleOffline = () => {
        wentOffline = true
        error.value = new Error('Lost internet connection')
    }

    const handleOnline = () => {
        if (!wentOffline) return
        wentOffline = false
        error.value = null
        // Re-establish subscription (graphql-ws auto-reconnects the WebSocket)
        stop()
        startSubscription()
    }

    if (import.meta.client) {
        ensureGlobalListeners()
        startSubscription()

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
    }

    onScopeDispose(() => {
        stop()
        if (import.meta.client) {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    })

    const closeAll = () => {
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
