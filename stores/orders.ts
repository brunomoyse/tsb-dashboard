import { defineStore } from 'pinia'
import type {Order} from '@/types'

export const useOrdersStore = defineStore('orders', {
    state: () => ({
        orders: [] as Order[],
    }),
    actions: {
        setOrders(orders: Order[]) {
            this.orders = orders
        },
        updateOrder(order: Partial<Order>) {
            // Only update the fields that are present in the order object
            const index = this.orders.findIndex(o => o.id === order.id)
            if (index !== -1) {
                this.orders[index] = { ...this.orders[index], ...order }
            }
        },
        addOrder(order: Order) {
            // Push the order first in the array
            this.orders.unshift(order)
        }
    },
})
