import type { Order, OrderStatus, OrderType } from '~/types'

export const getAllowedStatuses = (current: OrderStatus, deliveryOption: OrderType): OrderStatus[] => {
    let allowed: OrderStatus[]
    switch (current) {
        case 'PENDING': allowed = ['CONFIRMED','PREPARING']; break
        case 'CONFIRMED': allowed = ['PREPARING']; break
        case 'PREPARING': allowed = ['AWAITING_PICK_UP']; break
        case 'AWAITING_PICK_UP':
            allowed = deliveryOption === 'DELIVERY'
                ? ['OUT_FOR_DELIVERY']
                : ['PICKED_UP','FAILED']
            break
        case 'OUT_FOR_DELIVERY': allowed = ['DELIVERED','FAILED']; break
        default: allowed = []
    }
    if (current !== 'CANCELLED') allowed.push('CANCELLED')
    return allowed
}

export const getStatusIcon = (status: OrderStatus): string => {
    const map: Record<OrderStatus,string> = {
        PENDING: 'Clock',
        CONFIRMED: 'CheckCircle',
        PREPARING: 'Coffee',
        AWAITING_PICK_UP: 'Package',
        OUT_FOR_DELIVERY: 'Truck',
        DELIVERED: 'PackageCheck',
        PICKED_UP: 'ShoppingCart',
        FAILED: 'AlertCircle',
        CANCELLED: 'XCircle',
    }
    return map[status] ? map[status] + 'Icon' : 'HelpCircleIcon'
}

export const formatOrderSummary = (order: Partial<Order>): string => {
    if (!order.address) return ''
    return order.type === 'DELIVERY'
        ? `${order.address.streetName} ${order.address.houseNumber}`
        : 'Pickup'
}

export const formatTimeOnly = (iso: string): string => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '--:--'
    return d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})
}
