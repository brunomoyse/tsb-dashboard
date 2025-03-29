<template>
    <v-container class="pa-0">
        <!-- Toolbar / Search -->
        <v-toolbar density="compact" class="elevation-2 mb-4">
            <v-text-field
                v-model="searchQuery"
                :label="t('orders.search')"
                prepend-inner-icon="mdi-magnify"
                single-line
                hide-details
                density="compact"
            ></v-text-field>
            <v-btn icon>
                <v-icon>mdi-filter-variant</v-icon>
            </v-btn>
        </v-toolbar>

        <!-- Order List -->
        <div v-if="ordersWithTotal.length">
            <div
                v-for="order in filteredOrders"
                :key="order.id"
                class="order-item"
                @touchstart="touchStart($event, order)"
                @touchend="touchEnd($event, order)"
            >
                <v-card
                    class="ma-2 rounded-lg"
                    elevation="2"
                    :style="cardStyle(order)"
                    @click="openBottomSheet(order)"
                >
                    <v-card-text class="d-flex align-center">
                        <!-- Status Indicator -->
                        <v-icon
                            large
                            :color="getStatusColor(order.status as OrderStatus)"
                            class="mr-3"
                        >
                            {{ getStatusIcon(order.status as OrderStatus) }}
                        </v-icon>

                        <!-- Order Info -->
                        <div class="flex-grow-1">
                            <div class="d-flex justify-space-between">
                                <div>
                                    <div class="text-body-1 font-weight-bold">
                                        {{ order.deliveryOption === 'delivery' ? order.address : t('orders.pickup') }}
                                    </div>
                                    <div class="text-caption text-medium-emphasis">
                                        {{ formatDate(order.createdAt) }}
                                    </div>
                                </div>
                                <v-chip
                                    :color="getPaymentStatusColor(order.paymentStatus)"
                                    size="small"
                                >
                                    {{ belPriceFormat.format((order.total)) }}
                                </v-chip>
                            </div>

                            <v-divider class="my-2" />

                            <div class="d-flex justify-space-between align-center">
                                <div>
                                    <div class="d-flex align-center gap-2">
                                        <v-icon small class="mr-1">mdi-credit-card-outline</v-icon>
                                        {{ t(`orders.paymentMethod.${order.paymentMode.toLowerCase()}`) }}
                                    </div>
                                    <div class="d-flex align-center gap-2 mt-1">
                                        <v-icon small class="mr-1">mdi-truck-delivery-outline</v-icon>
                                        {{ t(`orders.deliveryOption.${order.deliveryOption?.toLowerCase()}`) }}
                                    </div>
                                </div>
                                <v-chip
                                    :color="getStatusColor(order.status as OrderStatus)"
                                    size="small"
                                >
                                    {{ t(`orders.status.${order.status?.toLowerCase()}`) }}
                                </v-chip>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </div>
        </div>

        <!-- Empty State -->
        <v-card v-else class="ma-4 text-center pa-6">
            <v-icon size="64" class="mb-2">mdi-package-variant-closed</v-icon>
            <div class="text-h6">{{ t('orders.noOrders') }}</div>
        </v-card>

        <!-- Bottom Sheet for Updating Order Status -->
        <v-bottom-sheet v-model="showBottomSheet" inset>
            <v-card class="rounded-t-xl pa-4">
                <v-card-title class="d-flex justify-space-between align-center">
                    <div>
                        <span class="text-h6">{{ t('orders.updateStatus') }}</span>
                        <div class="text-caption">
                            {{
                                selectedOrder
                                    ? formatDate(selectedOrder.createdAt) +
                                    ' - ' +
                                    (selectedOrder.deliveryOption === 'delivery'
                                        ? selectedOrder.address
                                        : t('orders.pickup'))
                                    : ''
                            }}
                        </div>
                    </div>
                    <v-btn icon @click="showBottomSheet = false">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-card-title>

                <v-divider class="my-2"></v-divider>

                <v-card-text class="pt-2">
                    <v-row class="justify-center" align="stretch" dense>
                        <v-col
                            v-for="status in availableStatuses"
                            :key="status"
                            cols="6"
                            sm="4"
                            class="d-flex"
                        >
                            <v-btn
                                block
                                large
                                variant="tonal"
                                :color="getStatusColor(status)"
                                class="mx-auto my-2"
                                @click="handleStatusButton(status)"
                                style="min-height: 56px;"
                            >
                                <v-icon left class="mr-1">{{ getStatusIcon(status) }}</v-icon>
                                <span class="text-subtitle-2">
                                  {{ t(`orders.status.${status.toLowerCase()}`) }}
                                </span>
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </v-bottom-sheet>

        <!-- Confirmation Dialog for Cancellation -->
        <v-dialog v-model="showCancelDialog" persistent max-width="400">
            <v-card>
                <v-card-title class="headline">
                    {{ t('orders.confirmCancelTitle', 'Confirm Cancellation') }}
                </v-card-title>
                <v-card-text>
                    <div>
                        {{ t('orders.confirmCancelMessage', 'Are you sure you want to cancel this order?') }}
                    </div>
                    <!-- Display current order info -->
                    <div v-if="selectedOrder" class="mt-2 grey--text text-caption">
                        {{ formatDate(selectedOrder.createdAt) }} -
                        {{ selectedOrder.deliveryOption === 'delivery' ? selectedOrder.address : t('orders.pickup') }}
                    </div>
                    <div v-if="selectedOrder && selectedOrder.paymentMode === 'ONLINE'" class="mt-2 red--text">
                        {{ t('orders.refundNotice', 'A refund will be processed for online payments.') }}
                    </div>
                    <div class="mt-2" v-if="confirmDisabled">
                        {{ t('orders.waitMessage', { seconds: cancelDelay }) }}
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="cancelCancellation">
                        {{ t('orders.back', 'Back') }}
                    </v-btn>
                    <v-btn color="red" @click="confirmCancellation" :disabled="confirmDisabled">
                        {{ t('orders.confirm', 'Confirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Order, OrderProductLine, OrderStatus } from '~/types'

const { t, locale } = useI18n()
const { $api } = useNuxtApp()

// State
const searchQuery = ref('')
const orders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null)
const showBottomSheet = ref(false)
const touchStartX = ref(0)

// For cancellation confirmation dialog
const showCancelDialog = ref(false)
const cancelDelay = ref(5)
const confirmDisabled = computed(() => cancelDelay.value > 0)
let cancelTimer: number | undefined = undefined

// Define allowed transitions based on current status and delivery option
const getAllowedStatuses = (current: OrderStatus, deliveryOption: string): OrderStatus[] => {
    let allowed: OrderStatus[] = []
    switch (current) {
        case 'PENDING':
            allowed = ['CONFIRMED', 'PREPARING']
            break
        case 'CONFIRMED':
            allowed = ['PREPARING']
            break
        case 'PREPARING':
            allowed = ['AWAITING_PICK_UP']
            break
        case 'AWAITING_PICK_UP':
            if (deliveryOption === 'delivery') {
                allowed = ['OUT_FOR_DELIVERY']
            } else if (deliveryOption === 'pickup') {
                allowed = ['PICKED_UP', 'FAILED']
            }
            break
        case 'OUT_FOR_DELIVERY':
            allowed = ['DELIVERED', 'FAILED']
            break
        default:
            allowed = []
            break
    }
    // "CANCELLED" can be chosen from any state except if already cancelled.
    if (current !== 'CANCELLED') {
        allowed.push('CANCELLED')
    }
    return allowed
}

const availableStatuses = computed(() => {
    if (!selectedOrder.value) return []
    return getAllowedStatuses(selectedOrder.value.status as OrderStatus, selectedOrder.value.deliveryOption)
})

// Status icon mapping
const statusIcons: Record<string, string> = {
    PENDING: 'mdi-clock-outline',
    CONFIRMED: 'mdi-check-circle-outline',
    PREPARING: 'mdi-chef-hat',
    AWAITING_PICK_UP: 'mdi-timer-sand',
    OUT_FOR_DELIVERY: 'mdi-moped',
    DELIVERED: 'mdi-package-variant-closed-check',
    PICKED_UP: 'mdi-check-decagram',
    FAILED: 'mdi-alert-circle-outline',
    CANCELLED: 'mdi-cancel'
}

const getStatusIcon = (status: OrderStatus): string => statusIcons[status] || 'mdi-help-circle'

// Status color mapping
const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<string, string> = {
        PENDING: 'orange',
        CONFIRMED: 'blue',
        PREPARING: 'cyan',
        AWAITING_PICK_UP: 'amber',
        OUT_FOR_DELIVERY: 'purple',
        DELIVERED: 'green',
        PICKED_UP: 'green',
        FAILED: 'red',
        CANCELLED: 'red'
    }
    return colors[status] || 'primary'
}

const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        PENDING: 'orange',
        CONFIRMED: 'green',
        CANCELLED: 'red'
    }
    return colors[status?.toUpperCase() as keyof typeof colors] || 'grey'
}

// Data Fetching
const { data } = await useAsyncData<Order[]>('orders', () =>
    $api('/admin/orders', { headers: { 'Accept-Language': locale.value } })
)
watch(data, (newData) => {
    if (newData) orders.value = newData
}, { immediate: true })

// Computed orders with total price
const ordersWithTotal = computed(() =>
    orders.value.map(order => ({
        ...order,
        total: order.products.reduce((sum: number, pl: OrderProductLine) => sum + pl.totalPrice, 0)
    }))
)

// Filtered orders for search
const filteredOrders = computed(() =>
    ordersWithTotal.value.filter(order =>
        Object.values(order).some(value =>
            String(value)?.toLowerCase().includes(searchQuery.value?.toLowerCase())
        )
    )
)

// Formatting utilities
const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(locale.value, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
    currency: "EUR",
})

// Touch events for swipe to change status
const touchStart = (e: TouchEvent, order: Order) => {
    touchStartX.value = e.touches[0].clientX
}
const touchEnd = (e: TouchEvent, order: Order) => {
    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartX.value
    if (Math.abs(deltaX) > 50) {
        // For swipe, simulate moving one step in allowed statuses if possible
        const allowed = getAllowedStatuses(order.status as OrderStatus, order.deliveryOption)
        if (allowed.length) {
            const currentIndex = allowed.indexOf(order.status as OrderStatus)
            const newStatus = deltaX > 0
                ? allowed[Math.max(currentIndex - 1, 0)]
                : allowed[Math.min(currentIndex + 1, allowed.length - 1)]
            handleStatusButton(newStatus)
            vibrate()
        }
    }
}

// Intercept status button clicks
const handleStatusButton = (newStatus: OrderStatus) => {
    if (newStatus === 'CANCELLED') {
        openCancelDialog()
    } else {
        updateOrderStatus(newStatus)
    }
}

// Update order status (non-cancellation)
const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!selectedOrder.value) return

    try {
        await $api(`/admin/orders/${selectedOrder.value.id}`, {
            method: 'PATCH',
            body: { status: newStatus, orderID: selectedOrder.value.id },
            headers: { 'Content-Type': 'application/json' }
        })
        orders.value = orders.value.map(order =>
            order.id === selectedOrder.value?.id ? { ...order, status: newStatus } : order
        )
        printReceipt()
        vibrate()
        showBottomSheet.value = false
    } catch (error) {
        console.error('Status update failed:', error)
    }
}

const printReceipt = () => {
    if (typeof window !== 'undefined' && 'PrintHandler' in window) {
        // PrintHandler is injected from Android (Sunmi V2s)
        // Send the full ticket text to print
        (window as any).PrintHandler.print(
        `Tokyo Sushi Bar
        --------------------------
        Order #A-102
        2x California Roll - €10.00
        1x Miso Soup       - €3.50

        Total:             €13.50
        Thank you!`)
    } else {
        console.error('🖨️ PrintHandler not available (are you in the WebView on Sunmi V2s?)')
    }
}

// Cancellation confirmation dialog
const openCancelDialog = () => {
    // Reset the countdown
    cancelDelay.value = 5
    showCancelDialog.value = true
    // Start countdown timer
    cancelTimer = window.setInterval(() => {
        if (cancelDelay.value > 0) {
            cancelDelay.value -= 1
        } else {
            clearInterval(cancelTimer)
            cancelTimer = undefined
        }
    }, 1000)
}

const confirmCancellation = async () => {
    // Proceed with cancellation once confirmed
    await updateOrderStatus('CANCELLED')
    showCancelDialog.value = false
}

const cancelCancellation = () => {
    showCancelDialog.value = false
    if (cancelTimer) {
        clearInterval(cancelTimer)
        cancelTimer = undefined
    }
}

// Bottom Sheet and Card handlers
const openBottomSheet = (order: Order) => {
    selectedOrder.value = order
    showBottomSheet.value = true
}

const vibrate = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50)
    }
}

const cardStyle = (order: Order) => {
    if (order.status === 'PENDING') {
        return {
            transform: 'scale(1.02)',
            transition: 'transform 0.2s',
            border: '3px solid #ff0000',
            boxShadow: '0 0 15px rgba(255, 0, 0, 0.5)'
        }
    } else {
        return {
            transform: order?.id === selectedOrder.value?.id ? 'scale(0.98)' : 'none',
            transition: 'transform 0.2s'
        }
    }
}
</script>

<style scoped>
.order-item {
    touch-action: pan-y;
    user-select: none;
}

.fab {
    position: fixed;
    z-index: 999;
}

.v-btn {
    text-transform: none;
}
</style>
