import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useNuxtApp } from '#imports'
import type {Order, OrderResponse} from '@/types'

export const useOrdersStore = defineStore('orders', {
    state: () => ({
        orders: [] as OrderResponse[],
    }),
    actions: {
        setOrders(orders: OrderResponse[]) {
            // Filter orders: if an order has a payment, then its status must be "paid".
            // If there's no payment, then include the order.
            this.orders = orders
                .filter(orderResponse => {
                    const payment = orderResponse.payment;
                    return !payment || payment.status === 'paid';
                })
                // Then sort orders by updatedAt descending.
                .sort((a, b) => new Date(b.order.updatedAt).getTime() - new Date(a.order.updatedAt).getTime());
        },
        updateOrderStatus(order: OrderResponse, newStatus: string) {
            const idx = this.orders.findIndex(o => o.order.id === order.order.id)
            if (idx !== -1) {
                // Update existing order
                this.orders[idx] = order
            } else {
                // New order
                this.orders.push(order)
            }
            // Re-sort orders by updatedAt descending after the update.
            this.orders.sort(
                (a, b) => new Date(b.order.updatedAt).getTime() - new Date(a.order.updatedAt).getTime()
            )
        },
        async fetchOrderById(orderId: string, currentLocale: string) {
            const { $api } = useNuxtApp()
            try {
                // Adjust the endpoint as needed.
                const order: OrderResponse = await $api(`/admin/orders/${orderId}`, {
                    headers: { 'Accept-Language': currentLocale }
                })
                const idx = this.orders.findIndex(o => o.order.id === orderId)
                if (idx !== -1) {
                    // Update existing order
                    this.orders[idx] = order
                } else {
                    // New order
                    this.orders.push(order)

                    // Make sound notification on device.
                    if (typeof window !== 'undefined' && 'SoundHandler' in window) {
                        // SoundHandler is injected from Android (Sunmi V2s)
                        (window as any).SoundHandler.playNotificationSound();
                    } else {
                        console.error('🔊 SoundHandler not available (are you in the WebView on Sunmi V2s?)');
                    }
                }
                // Re-sort orders by createdAt descending after the update.
                this.orders.sort(
                    (a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
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
