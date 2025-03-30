import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useNuxtApp } from '#imports'
import type { Order } from '@/types'

export const useOrdersStore = defineStore('orders', {
    state: () => ({
        orders: [] as Order[],
    }),
    actions: {
        setOrders(orders: Order[]) {
            // Sort orders by updatedAt descending
            this.orders = orders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        },
        async fetchOrderById(orderId: string, currentLocale: string) {
            const { $api } = useNuxtApp()
            try {
                // Adjust the endpoint as needed.
                const order: Order = await $api(`/admin/orders/${orderId}`, {
                    headers: { 'Accept-Language': currentLocale }
                })
                const idx = this.orders.findIndex(o => o.id === orderId)
                if (idx !== -1) {
                    this.orders[idx] = order
                } else {
                    this.orders.push(order)
                }
                // Re-sort orders by createdAt descending after the update.
                this.orders.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
            } catch (error) {
                console.error(`Failed to fetch order ${orderId}:`, error)
            }
        },
        initSseListener(currentLocale: string) {
            const { $sse } = useNuxtApp()
            if (!$sse) {
                console.error('$sse is undefined; make sure the SSE plugin is properly registered on the client.')
                return
            }
            // Watch the reactive SSE events array and update orders when a new event is detected.
            watch(
                () => $sse.events.value,
                (events) => {
                    events.forEach((ev) => {
                        if (ev.orderID) {
                            // For orderCreated or orderUpdated events, fetch the order details.
                            this.fetchOrderById(ev.orderID, currentLocale)
                        }
                    })
                },
                { deep: true }
            )
        }
    },
})
