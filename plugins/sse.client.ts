// plugins/sse.client.ts
import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { ref, onMounted } from 'vue'

interface EventData {
    event: string
    orderID: string
    timestamp: string
    newStatus: string
}

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()
    const sseUrl = (config.public.sseUrl as string) || 'http://localhost:8080/api/v1/sse'
    const events = ref<EventData[]>([]) // This reactive ref will hold an array of events.

    let eventSource: EventSource | null = null

    nuxtApp.hook('app:mounted', () => {
        console.log('SSE: App mounted, connecting to', sseUrl)
        eventSource = new EventSource(sseUrl, { withCredentials: true })
        eventSource.onmessage = (ev) => {
            try {
                const data: EventData = JSON.parse(ev.data)
                events.value.push(data)
            } catch (err) {
                console.error('Error parsing SSE message:', err)
            }
        }
        eventSource.onerror = (err) => {
            console.error('SSE error:', err)
        }
    })

    // Use a global window event listener to clean up the connection.
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            if (eventSource) {
                eventSource.close()
                eventSource = null
            }
        })
    }

    return {
        provide: {
            sse: {
                events // Expose the reactive events array as $sse.events.
            }
        }
    }
})
