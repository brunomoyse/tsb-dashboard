import type { Order } from '@/types'
import { defineStore } from 'pinia'

export const useOrdersStore = defineStore('orders', {
    state: () => ({
        orders: [] as Order[],
        acknowledgedOrderIds: new Set<string>(),
    }),
    getters: {
        unacknowledgedPendingCount(state): number {
            return state.orders.filter(
                o => o.status === 'PENDING' && !state.acknowledgedOrderIds.has(o.id)
            ).length
        },
    },
    actions: {
        setOrders(orders: Order[]) {
            this.orders = orders
            // Mark all initially loaded orders as acknowledged
            orders.forEach(o => this.acknowledgedOrderIds.add(o.id))
        },
        updateOrder(order: Partial<Order>) {
            const index = this.orders.findIndex(o => o.id === order.id)
            if (index !== -1) {
                this.orders[index] = { ...this.orders[index], ...order }
            }
        },
        addOrder(order: Order) {
            // Prepend to array — NOT acknowledged (new from subscription)
            this.orders.unshift(order)
        },
        acknowledgeOrder(orderId: string) {
            this.acknowledgedOrderIds.add(orderId)
        }
    },
})
