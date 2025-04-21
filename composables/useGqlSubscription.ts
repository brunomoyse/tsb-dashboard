// composables/useGqlSubscription.ts
import { ref, onScopeDispose } from 'vue'
import { print } from 'graphql'
import { useRuntimeConfig, useCookie } from '#imports'
import type { Client, createClient } from 'graphql-ws'

let wsClient: Client | null = null
let wsClientPromise: Promise<Client> | null = null

async function getWsClient(): Promise<Client> {
    if (wsClient) return wsClient
    if (!wsClientPromise) {
        wsClientPromise = import('graphql-ws').then(({ createClient }) => {
            const cfg = useRuntimeConfig()
            const client = createClient({
                url: cfg.public.graphqlWs as string,
                connectionParams: {
                    Authorization: useCookie('access_token').value
                        ? `Bearer ${useCookie('access_token').value}`
                        : undefined,
                },
                retryAttempts: Infinity,
            })
            wsClient = client
            return client
        })
    }
    return wsClientPromise
}

export function useGqlSubscription<T = any>(
    rawSub: string | import('graphql').DocumentNode,
    variables: Record<string, unknown> = {}
) {
    const data  = ref<T>()
    const error = ref<any>(null)

    let stop: () => void = () => {}

    // when the component/composable scope is torn down:
    onScopeDispose(() => {
        stop()
        // note: we do not dispose() here, so other subs stay alive
    })

    if (import.meta.client) {
        ;(async () => {
            try {
                const client = await getWsClient()
                stop = client.subscribe(
                    {
                        query: typeof rawSub === 'string' ? rawSub : print(rawSub),
                        variables,
                    },
                    {
                        next: (msg)   => msg.data   !== undefined && (data.value = msg.data as T),
                        error: (e)   => (error.value = e),
                        complete: () => {},
                    }
                )
            } catch (e: any) {
                error.value = e
            }
        })()
    }

    return {
        data,
        error,
        stop,
        /** to fully tear down the socket: */
        closeAll: () => {
            wsClient?.dispose()
            wsClient = null
            wsClientPromise = null
        },
    }
}
